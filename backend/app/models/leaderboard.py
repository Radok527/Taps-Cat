from datetime import datetime

from sqlalchemy import String, Integer, Text, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LeaderboardEntry(Base):
    __tablename__ = "leaderboard_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ip_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str | None] = mapped_column(String(80))
    messages_needed: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    image_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
