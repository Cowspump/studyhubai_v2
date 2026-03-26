from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class TeacherCreateRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class TeacherUpdateRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None


class TeacherResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_verified: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class PlatformStatsResponse(BaseModel):
    total_users: int
    teachers: int
    students: int
    verified: int


class StudentAssignByEmailRequest(BaseModel):
    email: EmailStr
