from pydantic import BaseModel


class GroupCreateRequest(BaseModel):
    name: str


class BulkStudentsRequest(BaseModel):
    group_id: int
    students: list[dict]  # [{name, email, password}]


