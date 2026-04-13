import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from redis.asyncio import Redis

from app.services.cat_state import apply_delta

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None
_redis: Redis | None = None


async def _drain_stats() -> None:
    if _redis is None:
        logger.warning("Scheduler fired but Redis not available")
        return
    try:
        state = await apply_delta(
            _redis,
            hunger_delta=-3,
            happy_delta=-2,
            action="scheduler",
        )
        logger.info("Scheduler drain: hunger=%d happy=%d", state["hunger"], state["happy"])
    except Exception:
        logger.exception("Scheduler drain_stats failed")


def start_scheduler(redis: Redis) -> None:
    global _scheduler, _redis
    _redis = redis
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _drain_stats,
        trigger="interval",
        hours=1,
        id="drain_stats",
        coalesce=True,
        misfire_grace_time=60,
    )
    _scheduler.start()
    logger.info("APScheduler started (hourly drain job)")


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("APScheduler stopped")


def get_scheduler() -> AsyncIOScheduler | None:
    return _scheduler
