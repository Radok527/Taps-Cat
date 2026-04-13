from fastapi import APIRouter, Depends, Request
from redis.asyncio import Redis

from app.dependencies import get_redis
from app.schemas.state import StateResponse
from app.services.cat_state import apply_delta
from app.utils.ip import get_ip, hash_ip

router = APIRouter()

GLOBAL_CHAT_LIMIT = 2000
PER_IP_CHAT_LIMIT = 15
GLOBAL_IMAGE_LIMIT = 40


async def _state_response(redis: Redis, cat: dict, ip_hash: str) -> StateResponse:
    global_chat_used = int(await redis.get("global:chat_count") or 0)
    image_used = int(await redis.get("global:image_count") or 0)
    global_messages_left = max(0, GLOBAL_CHAT_LIMIT - global_chat_used)

    ip_chat_used = int(await redis.get(f"ratelimit:chat:{ip_hash}") or 0)
    ip_messages_left = max(0, PER_IP_CHAT_LIMIT - ip_chat_used)

    return StateResponse(
        hunger=cat["hunger"],
        happy=cat["happy"],
        last_action=cat["last_action"],
        messages_left=min(ip_messages_left, global_messages_left),
        images_left=max(0, GLOBAL_IMAGE_LIMIT - image_used),
    )


@router.post("/feed", response_model=StateResponse)
async def feed(request: Request, redis: Redis = Depends(get_redis)) -> StateResponse:
    ip_hash = hash_ip(get_ip(request))
    cat = await apply_delta(redis, hunger_delta=20, happy_delta=0, action="feed", ip_hash=ip_hash)
    return await _state_response(redis, cat, ip_hash)


@router.post("/play", response_model=StateResponse)
async def play(request: Request, redis: Redis = Depends(get_redis)) -> StateResponse:
    ip_hash = hash_ip(get_ip(request))
    cat = await apply_delta(redis, hunger_delta=0, happy_delta=20, action="play", ip_hash=ip_hash)
    return await _state_response(redis, cat, ip_hash)


@router.post("/pet", response_model=StateResponse)
async def pet(request: Request, redis: Redis = Depends(get_redis)) -> StateResponse:
    ip_hash = hash_ip(get_ip(request))
    cat = await apply_delta(redis, hunger_delta=0, happy_delta=10, action="pet", ip_hash=ip_hash)
    return await _state_response(redis, cat, ip_hash)
