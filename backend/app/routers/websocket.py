import asyncio
import json
import logging

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from redis.asyncio import Redis

from app.dependencies import get_redis
from app.services.broadcast import BROADCAST_CHANNEL, publish_state
from app.services.cat_state import get_cat_state

router = APIRouter()
logger = logging.getLogger(__name__)

_GLOBAL_IMAGE_LIMIT = 40


async def _listen(pubsub, websocket: WebSocket) -> None:
    """Forward Redis pub/sub messages to the WebSocket client.

    Runs as an independent asyncio task.  CancelledError must NOT be caught here
    so that task.cancel() in the disconnect handler works correctly.
    """
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except asyncio.CancelledError:
        raise  # propagate so the task is properly cancelled
    except Exception:
        logger.exception("pubsub listener error")


@router.websocket("/ws")
async def ws_endpoint(
    websocket: WebSocket,
    redis: Redis = Depends(get_redis),
) -> None:
    """
    WebSocket endpoint — real-time cat state fan-out.

    Lifecycle:
      connect  → INCR ws:visitor_count, seed client, notify others, subscribe pubsub
      running  → forward tami:broadcast messages to this client
      disconnect → cancel listener task, DECR ws:visitor_count, publish updated count
    """
    await websocket.accept()

    # --- Connect phase ---
    visitor_count = await redis.incr("ws:visitor_count")
    logger.info("WS connected; visitor_count=%d", visitor_count)

    # Seed this client with the current state immediately.
    state = await get_cat_state(redis)
    image_count = int(await redis.get("global:image_count") or 0)
    await websocket.send_text(
        json.dumps(
            {
                "hunger": state["hunger"],
                "happy": state["happy"],
                "last_action": state["last_action"],
                "visitor_count": visitor_count,
                "daily_images_left": max(0, _GLOBAL_IMAGE_LIMIT - image_count),
            }
        )
    )

    # Notify *existing* clients that visitor count changed.
    await publish_state(redis, state)

    # Subscribe to the broadcast channel.
    pubsub = redis.pubsub()
    await pubsub.subscribe(BROADCAST_CHANNEL)

    # Start the forwarding task.
    listen_task = asyncio.create_task(_listen(pubsub, websocket))

    # --- Main loop: stay alive until the client disconnects ---
    try:
        while True:
            # receive() blocks until the client sends a frame or closes the connection.
            await websocket.receive()
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        # --- Disconnect phase ---
        listen_task.cancel()
        try:
            await listen_task
        except asyncio.CancelledError:
            pass

        await pubsub.unsubscribe(BROADCAST_CHANNEL)
        await pubsub.aclose()

        new_count = max(0, await redis.decr("ws:visitor_count"))
        logger.info("WS disconnected; visitor_count=%d", new_count)

        # Publish so remaining clients see the updated visitor count.
        updated_state = await get_cat_state(redis)
        await publish_state(redis, updated_state)
