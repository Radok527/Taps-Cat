from pydantic import BaseModel


class StateResponse(BaseModel):
    hunger: int
    happy: int
    last_action: str
    messages_left: int
    images_left: int
