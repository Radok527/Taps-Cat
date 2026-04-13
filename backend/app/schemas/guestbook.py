from datetime import datetime

from pydantic import BaseModel, Field


class GuestbookEntryCreate(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    message: str = Field(min_length=1, max_length=300)


class GuestbookEntryResponse(BaseModel):
    id: int
    name: str | None
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GuestbookListResponse(BaseModel):
    entries: list[GuestbookEntryResponse]
    total: int
    page: int
    pages: int
