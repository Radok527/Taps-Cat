import json
import logging

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

BROADCAST_CHANNEL = "tami:broadcast"


async def publish_state(redis: Redis, state: dict) -> None:
    """
    Publish current cat state to the Redis pub/sub channel.

    Reads ws:visitor_count and global:image_count from Redis so every
    broadcast carries accurate live values without callers needing to pass them.
    Calling this when no subscribers exist is a no-op — Redis drops the message silently.
    """
    try:
        visitor_count = max(0, int(await redis.get("ws:visitor_count") or 0))
        image_count = int(await redis.get("global:image_count") or 0)
        message = json.dumps(
            {
                "hunger": state["hunger"],
                "happy": state["happy"],
                "last_action": state["last_action"],
                "visitor_count": visitor_count,
                "daily_images_left": max(0, 40 - image_count),
            }
        )
        await redis.publish(BROADCAST_CHANNEL, message)
    except Exception:
        # Never let a publish failure break the interaction endpoint.
        logger.exception("Failed to publish state broadcast")
