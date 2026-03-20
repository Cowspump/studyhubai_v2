from pydantic import BaseModel


class MaterialCreateRequest(BaseModel):
    topic: str
    title: str
    type: str = "pdf"
    url: str
    group_ids: list[int] = []
    file_name: str | None = None
