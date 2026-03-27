from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.core.deps import require_role
from app.shared.core.exceptions import ApiError
from app.shared.core.security import create_jwt
from app.shared.db import get_session
from app.modules.admin.schemas import AdminLoginRequest, TeacherCreateRequest, TeacherUpdateRequest
from app.modules.admin import service as admin_service

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_CREDENTIALS = {"username": "admin2077", "password": "RusAli2077"}

superadmin = require_role("superadmin")


@router.post("/login")
async def admin_login(payload: AdminLoginRequest) -> dict:
    if payload.username != ADMIN_CREDENTIALS["username"] or payload.password != ADMIN_CREDENTIALS["password"]:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    token = create_jwt(user_id=0, email="admin@studyhubai.kz", role="superadmin")
    return {
        "token": token,
        "user": {
            "id": "admin-1",
            "name": "Super Admin",
            "role": "superadmin",
            "email": "admin@studyhubai.kz",
        },
    }


@router.get("/teachers")
async def list_teachers(
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(superadmin),
) -> list[dict]:
    return await admin_service.list_teachers(session)


@router.post("/teachers", status_code=201)
async def create_teacher(
    payload: TeacherCreateRequest,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(superadmin),
) -> dict:
    try:
        return await admin_service.create_teacher(
            session, name=payload.name, email=str(payload.email), password=payload.password
        )
    except ApiError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.put("/teachers/{teacher_id}")
async def update_teacher(
    teacher_id: int,
    payload: TeacherUpdateRequest,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(superadmin),
) -> dict:
    try:
        return await admin_service.update_teacher(
            session,
            teacher_id=teacher_id,
            name=payload.name,
            email=str(payload.email) if payload.email else None,
        )
    except ApiError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.delete("/teachers/{teacher_id}", status_code=204)
async def delete_teacher(
    teacher_id: int,
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(superadmin),
) -> None:
    try:
        await admin_service.remove_teacher(session, teacher_id=teacher_id)
    except ApiError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/stats")
async def platform_stats(
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(superadmin),
) -> dict:
    return await admin_service.get_stats(session)


@router.get("/groups")
async def list_groups(
    session: AsyncSession = Depends(get_session),
    _user: dict = Depends(superadmin),
) -> list[dict]:
    return await admin_service.list_teacher_groups(session)


