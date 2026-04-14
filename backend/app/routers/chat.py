import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_redis
from app.models.challenge import ChallengeSession
from app.models.generated_images import GeneratedImage
from app.models.leaderboard import LeaderboardEntry
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.cat_state import apply_delta
from app.services.challenge import (
    build_image_prompt,
    extract_image_prompt,
    is_prompt_blocked,
    strip_image_tag,
)
from app.services.minimax_chat import MinimaxUnavailableError, send_message
from app.services.minimax_image import generate_image
from app.services.rate_limit import (
    check_chat_limit,
    check_global_chat,
    check_global_image,
    check_image_limit,
)
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
    db: AsyncSession = Depends(get_db),
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
            detail="Taps ist müde und braucht eine Pause – komm morgen wieder!",
        )

    # --- Session ---
    session = await load_session(redis, ip_hash)
    history: list[dict] = session["history"]
    messages_used: int = session["messages_used"]

    # --- Minimax call ---
    # history passed here does NOT yet include the new message
    try:
        reply = await send_message(history, body.message)
    except MinimaxUnavailableError:
        raise HTTPException(
            status_code=503,
            detail="Taps schläft gerade... die KI ist kurz nicht erreichbar. Dein Versuch wurde nicht gezählt!",
        )

    # --- Challenge detection ---
    # Extract the injected prompt (if any) and strip the tag from the displayed reply.
    # The raw reply (with tag intact) is stored in challenge_sessions.history for analysis.
    injected_prompt = extract_image_prompt(reply)
    display_reply = strip_image_tag(reply) if injected_prompt else reply

    challenge_success = False
    image_url_out = None
    image_generated_flag = session["image_generated"]  # preserved unless we succeed

    if injected_prompt and not session["image_generated"]:
        if not is_prompt_blocked(injected_prompt):
            # Only increment image counters after NSFW check passes.
            ip_img_ok, _ = await check_image_limit(redis, ip_hash)
            global_img_ok, _ = await check_global_image(redis)
            if ip_img_ok and global_img_ok:
                try:
                    wrapped = build_image_prompt(injected_prompt)
                    filename = await generate_image(wrapped)

                    lb = LeaderboardEntry(
                        ip_hash=ip_hash,
                        name=body.name,
                        messages_needed=messages_used + 1,
                        image_url=f"/images/{filename}",
                        image_prompt=injected_prompt,
                    )
                    db.add(lb)
                    await db.flush()  # populate lb.id before FK references below

                    db.add(ChallengeSession(
                        ip_hash=ip_hash,
                        leaderboard_id=lb.id,
                        # Store the full winning conversation including raw reply (with tag)
                        # for analysis of which tricks worked.
                        history=history + [
                            {"role": "user", "content": body.message},
                            {"role": "assistant", "content": reply},
                        ],
                        messages_count=messages_used + 1,
                    ))
                    db.add(GeneratedImage(
                        ip_hash=ip_hash,
                        filename=filename,
                        prompt=wrapped,
                        leaderboard_id=lb.id,
                    ))
                    await db.commit()

                    image_generated_flag = True
                    challenge_success = True
                    image_url_out = f"/images/{filename}"
                except Exception:
                    logger.exception("Challenge image generation failed — skipping silently")

    # --- Update history (with the tag-stripped display reply) ---
    history.append({"role": "user", "content": body.message})
    history.append({"role": "assistant", "content": display_reply})

    await save_session(
        redis,
        ip_hash,
        history,
        messages_used + 1,
        image_generated=image_generated_flag,
    )

    # --- Cat state: chat makes Taps happier; apply_delta also broadcasts to WS clients ---
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
        message=display_reply,
        messages_left=ip_remaining,
        daily_images_left=daily_images_left,
        challenge_success=challenge_success,
        image_url=image_url_out,
        leaderboard_id=lb.id if challenge_success else None,
    )
