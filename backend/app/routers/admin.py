import logging

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from redis.asyncio import Redis

from app.config import settings
from app.dependencies import get_redis
from app.services.broadcast import publish_state
from app.services.cat_state import get_cat_state

MAINTENANCE_KEY = "maintenance:enabled"

router = APIRouter()
logger = logging.getLogger(__name__)


class MaintenanceRequest(BaseModel):
    enabled: bool


class MaintenanceResponse(BaseModel):
    maintenance_mode: bool


@router.post("/admin/maintenance", response_model=MaintenanceResponse)
async def set_maintenance(
    body: MaintenanceRequest,
    x_admin_key: str | None = Header(default=None),
    redis: Redis = Depends(get_redis),
) -> MaintenanceResponse:
    """Toggle maintenance mode. Requires X-Admin-Key header matching settings.ADMIN_KEY."""
    if not settings.ADMIN_KEY or x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    if body.enabled:
        await redis.set(MAINTENANCE_KEY, "1")
    else:
        await redis.delete(MAINTENANCE_KEY)

    cat = await get_cat_state(redis)
    await publish_state(redis, cat)

    logger.info("Maintenance mode set to %s", body.enabled)
    return MaintenanceResponse(maintenance_mode=body.enabled)
