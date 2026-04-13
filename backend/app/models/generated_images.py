from datetime import datetime

from sqlalchemy import String, Integer, Text, ForeignKey, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class GeneratedImage(Base):
    __tablename__ = "generated_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ip_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    filename: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    leaderboard_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("leaderboard_entries.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
