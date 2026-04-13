import logging
import math

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from redis.asyncio import Redis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db, get_redis
from app.models.guestbook import GuestbookEntry
from app.schemas.guestbook import (
    GuestbookEntryCreate,
    GuestbookEntryResponse,
    GuestbookListResponse,
)
from app.services.rate_limit import check_guestbook_limit
from app.utils.ip import get_ip, hash_ip

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/guestbook", response_model=GuestbookListResponse)
async def get_guestbook(
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
) -> GuestbookListResponse:
    """Return paginated guestbook entries, newest first."""
    limit = min(limit, 50)
    page = max(page, 1)
    offset = (page - 1) * limit

    total_result = await db.execute(select(func.count()).select_from(GuestbookEntry))
    total: int = total_result.scalar_one()

    entries_result = await db.execute(
        select(GuestbookEntry)
        .order_by(GuestbookEntry.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    entries = entries_result.scalars().all()

    pages = math.ceil(total / limit) if total > 0 else 1

    return GuestbookListResponse(
        entries=list(entries),
        total=total,
        page=page,
        pages=pages,
    )


@router.post("/guestbook", response_model=GuestbookEntryResponse, status_code=201)
async def post_guestbook(
    body: GuestbookEntryCreate,
    request: Request,
    redis: Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
) -> GuestbookEntryResponse:
    """Submit a new guestbook entry. Rate-limited to 2 per IP per day."""
    ip = get_ip(request)
    ip_hash = hash_ip(ip)

    allowed, _ = await check_guestbook_limit(redis, ip_hash)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Du hast heute deine 2 Gästebuch-Einträge verbraucht – komm morgen wieder!",
        )

    entry = GuestbookEntry(
        ip_hash=ip_hash,
        name=body.name,
        message=body.message,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    feed_text = f"{body.name or 'Anonym'} hat eine Nachricht hinterlassen"
    pipe = redis.pipeline()
    pipe.lpush("feed:recent", feed_text)
    pipe.ltrim("feed:recent", 0, 19)
    await pipe.execute()

    logger.info("Guestbook entry created: id=%d ip_hash=%.8s…", entry.id, ip_hash)
    return entry


@router.delete("/guestbook/{entry_id}", status_code=204)
async def delete_guestbook_entry(
    entry_id: int,
    x_admin_key: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a guestbook entry. Requires X-Admin-Key header matching settings.ADMIN_KEY."""
    if not settings.ADMIN_KEY or x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(
        select(GuestbookEntry).where(GuestbookEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Not found")

    await db.delete(entry)
    await db.commit()
