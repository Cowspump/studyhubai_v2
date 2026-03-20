from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "student"
    group_id: int | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str
