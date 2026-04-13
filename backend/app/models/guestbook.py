from datetime import datetime

from sqlalchemy import String, Integer, TIMESTAMP, text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class GuestbookEntry(Base):
    __tablename__ = "guestbook_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ip_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str | None] = mapped_column(String(80))
    message: Mapped[str] = mapped_column(String(300), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
