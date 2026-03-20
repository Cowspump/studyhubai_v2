from pydantic import BaseModel


class SendMessageRequest(BaseModel):
    to_id: int
    text: str
