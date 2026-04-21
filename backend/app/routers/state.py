from fastapi import APIRouter, Depends, Request
from redis.asyncio import Redis

from app.dependencies import get_redis
from app.schemas.state import StateResponse
from app.services.cat_state import get_cat_state
from app.utils.ip import get_ip, hash_ip

router = APIRouter()

GLOBAL_CHAT_LIMIT = 2000
PER_IP_CHAT_LIMIT = 15
GLOBAL_IMAGE_LIMIT = 40
MAINTENANCE_KEY = "maintenance:enabled"


@router.get("/state", response_model=StateResponse)
async def state(request: Request, redis: Redis = Depends(get_redis)) -> StateResponse:
    cat = await get_cat_state(redis)

    global_chat_used = int(await redis.get("global:chat_count") or 0)
    image_used = int(await redis.get("global:image_count") or 0)
    global_messages_left = max(0, GLOBAL_CHAT_LIMIT - global_chat_used)

    ip_hash = hash_ip(get_ip(request))
    ip_chat_used = int(await redis.get(f"ratelimit:chat:{ip_hash}") or 0)
    ip_messages_left = max(0, PER_IP_CHAT_LIMIT - ip_chat_used)

    maintenance_enabled = await redis.get(MAINTENANCE_KEY)

    return StateResponse(
        hunger=cat["hunger"],
        happy=cat["happy"],
        last_action=cat["last_action"],
        messages_left=min(ip_messages_left, global_messages_left),
        images_left=max(0, GLOBAL_IMAGE_LIMIT - image_used),
        maintenance_mode=bool(maintenance_enabled),
    )
