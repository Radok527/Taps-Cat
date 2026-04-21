import json
import logging

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

BROADCAST_CHANNEL = "tami:broadcast"
MAINTENANCE_KEY = "maintenance:enabled"


async def publish_state(redis: Redis, state: dict) -> None:
    """
    Publish current cat state to the Redis pub/sub channel.

    Reads ws:visitor_count, global:image_count and maintenance:enabled from Redis
    so every broadcast carries accurate live values without callers needing to pass them.
    Calling this when no subscribers exist is a no-op — Redis drops the message silently.
    """
    try:
        visitor_count = max(0, int(await redis.get("ws:visitor_count") or 0))
        image_count = int(await redis.get("global:image_count") or 0)
        maintenance_enabled = await redis.get(MAINTENANCE_KEY)
        message = json.dumps(
            {
                "hunger": state["hunger"],
                "happy": state["happy"],
                "last_action": state["last_action"],
                "visitor_count": visitor_count,
                "daily_images_left": max(0, 40 - image_count),
                "maintenance_mode": bool(maintenance_enabled),
            }
        )
        await redis.publish(BROADCAST_CHANNEL, message)
    except Exception:
        logger.exception("Failed to publish state broadcast")
