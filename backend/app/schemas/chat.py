from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    name: str | None = None  # accepted now, used in Phase 5 leaderboard


class ChatResponse(BaseModel):
    message: str
    messages_left: int
    daily_images_left: int
    challenge_success: bool = False
    image_url: str | None = None
    leaderboard_id: int | None = None
