import json
import logging

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

BROADCAST_CHANNEL = "tami:broadcast"


async def publish_state(
    redis: Redis,
    state: dict,
    visitor_count: int = 0,
    daily_images_left: int = 40,
) -> None:
    """
    Publish current cat state to the Redis pub/sub channel.

    All WebSocket handlers subscribe to this channel and forward the payload
    to connected browser clients (implemented in Phase 2). Calling this when
    no subscribers exist is a no-op — Redis drops the message silently.
    """
    message = json.dumps(
        {
            "hunger": state["hunger"],
            "happy": state["happy"],
            "last_action": state["last_action"],
            "visitor_count": visitor_count,
            "daily_images_left": daily_images_left,
        }
    )
    try:
        await redis.publish(BROADCAST_CHANNEL, message)
    except Exception:
        # Never let a publish failure break the interaction endpoint.
        logger.exception("Failed to publish state broadcast")
