from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.core.exceptions import ApiError
from app.shared.db import get_session
from app.modules.auth.schemas import LoginRequest, RegisterRequest, VerifyCodeRequest
from app.modules.auth import service as auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    try:
        return await auth_service.register_user(
            session,
            name=payload.name,
            email=str(payload.email),
            password=payload.password,
            role=payload.role,
            group_id=payload.group_id,
        )
    except ApiError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/verify-email-code")
async def verify_email(
    payload: VerifyCodeRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    try:
        return await auth_service.verify_email_code(session, email=str(payload.email), code=payload.code)
    except ApiError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/login")
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    try:
        return await auth_service.login_user(session, email=str(payload.email), password=payload.password)
    except ApiError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
