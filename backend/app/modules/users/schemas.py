from pydantic import BaseModel


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    position: str | None = None
    phone: str | None = None
    telegram: str | None = None
    bio: str | None = None
    photo: str | None = None


class ApiKeyUpdateRequest(BaseModel):
    openai_key: str | None = None
