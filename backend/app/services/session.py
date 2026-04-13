import json

from redis.asyncio import Redis

from app.utils.time_utils import seconds_until_midnight_utc

_SESSION_PREFIX = "session:"

_DEFAULT_SESSION: dict = {
    "history": [],
    "messages_used": 0,
    "image_generated": False,
}


async def load_session(redis: Redis, ip_hash: str) -> dict:
    """
    Load per-IP session from Redis.

    Returns a dict with keys:
      - history        list[dict]  — [{role, content}, …] chat history
      - messages_used  int         — number of chat messages sent today
      - image_generated bool       — whether an image was already generated today

    Returns defaults if the key does not exist or any field is corrupt.
    """
    raw = await redis.hgetall(f"{_SESSION_PREFIX}{ip_hash}")
    if not raw:
        return dict(_DEFAULT_SESSION)

    try:
        history = json.loads(raw.get("history", "[]"))
        if not isinstance(history, list):
            history = []
    except Exception:
        history = []

    try:
        messages_used = int(raw.get("messages_used", 0) or 0)
    except (ValueError, TypeError):
        messages_used = 0

    return {
        "history": history,
        "messages_used": messages_used,
        "image_generated": raw.get("image_generated", "0") == "1",
    }


async def save_session(
    redis: Redis,
    ip_hash: str,
    history: list,
    messages_used: int,
    image_generated: bool = False,
) -> None:
    """
    Persist per-IP session to Redis.

    Uses a pipeline so the HSET and EXPIRE travel in a single round-trip.
    TTL is always reset to the next midnight UTC so the session expires at the
    end of the current day regardless of when it was first created.
    """
    key = f"{_SESSION_PREFIX}{ip_hash}"
    pipe = redis.pipeline()
    pipe.hset(
        key,
        mapping={
            "history": json.dumps(history),
            "messages_used": messages_used,
            "image_generated": "1" if image_generated else "0",
        },
    )
    pipe.expire(key, seconds_until_midnight_utc())
    await pipe.execute()
