import asyncio
import logging
import time

from redis.asyncio import Redis
from redis.exceptions import WatchError

logger = logging.getLogger(__name__)

CAT_STATE_KEY = "cat:state"
HUNGER_MIN = 5
HUNGER_MAX = 100
HAPPY_MIN = 5
HAPPY_MAX = 100
_MAX_RETRIES = 5


async def get_cat_state(redis: Redis) -> dict:
    """Return the current cat state, atomically initialising defaults if absent."""
    await _ensure_cat_state(redis)
    raw = await redis.hgetall(CAT_STATE_KEY)
    return _parse_raw(raw)


async def apply_delta(
    redis: Redis,
    hunger_delta: int,
    happy_delta: int,
    action: str,
    ip_hash: str = "",
) -> dict:
    """
    Atomically update cat state using WATCH/MULTI/EXEC.

    Retries up to _MAX_RETRIES times on WatchError (optimistic concurrency).
    Non-WatchError exceptions get linear backoff before retry, then re-raise.
    """
    for attempt in range(_MAX_RETRIES):
        try:
            async with redis.pipeline(transaction=True) as pipe:
                await pipe.watch(CAT_STATE_KEY)
                raw = await pipe.hgetall(CAT_STATE_KEY)
                if not raw:
                    raw = {"hunger": "70", "happy": "70"}

                hunger = _clamp(int(raw.get("hunger", 70)) + hunger_delta, HUNGER_MIN, HUNGER_MAX)
                happy = _clamp(int(raw.get("happy", 70)) + happy_delta, HAPPY_MIN, HAPPY_MAX)
                now = int(time.time())

                pipe.multi()
                await pipe.hset(
                    CAT_STATE_KEY,
                    mapping={
                        "hunger": hunger,
                        "happy": happy,
                        "last_action": action,
                        "last_actor_ip": ip_hash,
                        "updated_at": now,
                    },
                )
                await pipe.execute()

            state = {
                "hunger": hunger,
                "happy": happy,
                "last_action": action,
                "last_actor_ip": ip_hash,
                "updated_at": now,
            }

            # Publish broadcast so WS clients receive the update (Phase 2 wires the subscriber).
            from app.services.broadcast import publish_state  # local import avoids circular dep
            await publish_state(redis, state)

            return state

        except WatchError:
            # Key was modified by another writer — retry immediately (no sleep needed).
            logger.debug("apply_delta WatchError on attempt %d, retrying", attempt + 1)
            continue
        except Exception as exc:
            logger.warning("apply_delta attempt %d failed: %s", attempt + 1, exc)
            if attempt < _MAX_RETRIES - 1:
                await asyncio.sleep(0.1 * (attempt + 1))
                continue
            raise

    raise RuntimeError(f"apply_delta failed after {_MAX_RETRIES} attempts")


async def _ensure_cat_state(redis: Redis) -> None:
    """
    Atomically set default values for any fields not yet present.
    HSETNX only writes a field if it does not already exist, so concurrent
    calls are safe — the first writer wins and subsequent calls are no-ops.
    """
    now = int(time.time())
    async with redis.pipeline() as pipe:
        pipe.hsetnx(CAT_STATE_KEY, "hunger", 70)
        pipe.hsetnx(CAT_STATE_KEY, "happy", 70)
        pipe.hsetnx(CAT_STATE_KEY, "last_action", "idle")
        pipe.hsetnx(CAT_STATE_KEY, "last_actor_ip", "")
        pipe.hsetnx(CAT_STATE_KEY, "updated_at", now)
        await pipe.execute()


def _parse_raw(raw: dict) -> dict:
    return {
        "hunger": int(raw.get("hunger", 70)),
        "happy": int(raw.get("happy", 70)),
        "last_action": raw.get("last_action", "idle"),
        "last_actor_ip": raw.get("last_actor_ip", ""),
        "updated_at": int(raw.get("updated_at", 0)),
    }


def _clamp(value: int, min_val: int, max_val: int) -> int:
    return max(min_val, min(max_val, value))
