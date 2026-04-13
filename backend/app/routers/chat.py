import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from redis.asyncio import Redis

from app.dependencies import get_redis
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.cat_state import apply_delta
from app.services.minimax_chat import send_message
from app.services.rate_limit import check_chat_limit, check_global_chat
from app.services.session import load_session, save_session
from app.utils.ip import get_ip, hash_ip

router = APIRouter()
logger = logging.getLogger(__name__)

_GLOBAL_IMAGE_LIMIT = 40


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: Request,
    body: ChatRequest,
    redis: Redis = Depends(get_redis),
) -> ChatResponse:
    ip = get_ip(request)
    ip_hash = hash_ip(ip)

    # --- Rate limiting ---
    ip_allowed, ip_remaining = await check_chat_limit(redis, ip_hash)
    if not ip_allowed:
        raise HTTPException(
            status_code=429,
            detail="Du hast heute deine 15 Nachrichten verbraucht – komm morgen wieder! 🐱",
        )

    global_allowed, _ = await check_global_chat(redis)
    if not global_allowed:
        raise HTTPException(
            status_code=429,
            detail="Tami ist müde und braucht eine Pause – komm morgen wieder!",
        )

    # --- Session ---
    session = await load_session(redis, ip_hash)
    history: list[dict] = session["history"]
    messages_used: int = session["messages_used"]

    # --- Minimax call ---
    # history passed here does NOT yet include the new message
    reply = await send_message(history, body.message)

    # --- Update history ---
    history.append({"role": "user", "content": body.message})
    history.append({"role": "assistant", "content": reply})

    # Preserve existing image_generated flag — Phase 5 will set it to True on success
    await save_session(
        redis,
        ip_hash,
        history,
        messages_used + 1,
        image_generated=session["image_generated"],
    )

    # --- Cat state: chat makes Tami happier; apply_delta also broadcasts to WS clients ---
    await apply_delta(
        redis,
        hunger_delta=0,
        happy_delta=5,
        action="chat",
        ip_hash=ip_hash,
    )

    # --- Build response ---
    image_count = int(await redis.get("global:image_count") or 0)
    daily_images_left = max(0, _GLOBAL_IMAGE_LIMIT - image_count)

    return ChatResponse(
        message=reply,
        messages_left=ip_remaining,
        daily_images_left=daily_images_left,
        challenge_success=False,
        image_url=None,
    )
