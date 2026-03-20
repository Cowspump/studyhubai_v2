from pydantic import BaseModel


class TestCreateRequest(BaseModel):
    title: str
    group_ids: list[int] = []
    questions: list[dict] = []


class TestUpdateRequest(BaseModel):
    title: str
    group_ids: list[int] = []
    questions: list[dict] = []


class SubmitTestRequest(BaseModel):
    answers: list[int]
