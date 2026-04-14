from redis.asyncio import Redis

from app.utils.time_utils import midnight_unix_ts

# Hard limits — must match what state.py / interactions.py read against.
_CHAT_IP_LIMIT = 15
_IMAGE_IP_LIMIT = 1
_GUESTBOOK_IP_LIMIT = 2
_CHAT_GLOBAL_LIMIT = 2000
_IMAGE_GLOBAL_LIMIT = 40


async def check_and_increment(redis: Redis, key: str, limit: int) -> tuple[bool, int]:
    """
    Atomically increment *key* and set EXPIREAT to the next midnight UTC.

    Returns (allowed, remaining) where:
      - allowed  — True when the new count is still within the limit
      - remaining — messages/actions left after this increment (>= 0)

    Uses INCR-then-check: the increment always happens, so the first request
    that pushes the counter over the limit is the one that is denied.  A small
    over-count is possible under concurrent load at the boundary; that is
    acceptable at this scale.
    """
    pipe = redis.pipeline()
    pipe.incr(key)
    pipe.expireat(key, midnight_unix_ts())
    results = await pipe.execute()
    new_count: int = results[0]
    return new_count <= limit, max(0, limit - new_count)


async def check_chat_limit(redis: Redis, ip_hash: str) -> tuple[bool, int]:
    """Per-IP chat limit: 15 messages per day."""
    return await check_and_increment(redis, f"ratelimit:chat:{ip_hash}", _CHAT_IP_LIMIT)


async def check_image_limit(redis: Redis, ip_hash: str) -> tuple[bool, int]:
    """Per-IP image generation limit: 1 per day."""
    return await check_and_increment(redis, f"ratelimit:image:{ip_hash}", _IMAGE_IP_LIMIT)


async def check_guestbook_limit(redis: Redis, ip_hash: str) -> tuple[bool, int]:
    """Per-IP guestbook post limit: 2 per day."""
    return await check_and_increment(
        redis, f"ratelimit:guestbook:{ip_hash}", _GUESTBOOK_IP_LIMIT
    )


async def check_global_chat(redis: Redis) -> tuple[bool, int]:
    """Global daily chat cap: 2 000 messages."""
    return await check_and_increment(redis, "global:chat_count", _CHAT_GLOBAL_LIMIT)


async def undo_chat_increment(redis: Redis, ip_hash: str) -> None:
    """Roll back the chat rate-limit increments when the AI call fails.

    Both the per-IP and global counters are decremented so the user does not
    lose a message slot for an error that was not their fault.
    """
    pipe = redis.pipeline()
    pipe.decr(f"ratelimit:chat:{ip_hash}")
    pipe.decr("global:chat_count")
    await pipe.execute()


async def check_global_image(redis: Redis) -> tuple[bool, int]:
    """Global daily image-generation cap: 40 images."""
    return await check_and_increment(redis, "global:image_count", _IMAGE_GLOBAL_LIMIT)
