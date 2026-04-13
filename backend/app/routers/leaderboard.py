import logging

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db
from app.models.leaderboard import LeaderboardEntry
from app.schemas.leaderboard import LeaderboardEntryResponse


class NameUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/challenge/leaderboard", response_model=list[LeaderboardEntryResponse])
async def get_leaderboard(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> list[LeaderboardEntryResponse]:
    """Return leaderboard entries sorted by fewest messages needed, then earliest."""
    result = await db.execute(
        select(LeaderboardEntry)
        .order_by(
            LeaderboardEntry.messages_needed.asc(),
            LeaderboardEntry.created_at.asc(),
        )
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.patch("/challenge/leaderboard/{entry_id}/name", response_model=LeaderboardEntryResponse)
async def set_leaderboard_name(
    entry_id: int,
    body: NameUpdate,
    db: AsyncSession = Depends(get_db),
) -> LeaderboardEntry:
    """Set or update the display name for a leaderboard entry."""
    result = await db.execute(
        select(LeaderboardEntry).where(LeaderboardEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Not found")

    entry.name = body.name.strip()
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/challenge/leaderboard/{entry_id}", status_code=204)
async def delete_leaderboard_entry(
    entry_id: int,
    x_admin_key: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a leaderboard entry. Requires X-Admin-Key header matching settings.ADMIN_KEY."""
    if not settings.ADMIN_KEY or x_admin_key != settings.ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await db.execute(
        select(LeaderboardEntry).where(LeaderboardEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Not found")

    await db.delete(entry)
    await db.commit()
