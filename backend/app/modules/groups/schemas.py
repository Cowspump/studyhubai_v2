from pydantic import BaseModel, EmailStr


class GroupCreateRequest(BaseModel):
    name: str


class BulkStudentsRequest(BaseModel):
    group_id: int
    students: list[dict]  # [{name, email, password}]


class StudentAssignByEmailRequest(BaseModel):
    email: EmailStr
