from datetime import datetime

from sqlalchemy import String, Integer, JSON, ForeignKey, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ChallengeSession(Base):
    __tablename__ = "challenge_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ip_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    leaderboard_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("leaderboard_entries.id", ondelete="SET NULL"), nullable=True
    )
    history: Mapped[list] = mapped_column(JSON, nullable=False)
    messages_count: Mapped[int] = mapped_column(Integer, nullable=False)
    solved_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
