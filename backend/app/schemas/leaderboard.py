from datetime import datetime

from pydantic import BaseModel


class LeaderboardEntryResponse(BaseModel):
    id: int
    name: str | None
    messages_needed: int
    image_url: str
    created_at: datetime

    model_config = {"from_attributes": True}
