from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.core.exceptions import ApiError
from app.shared.core.security import hash_password
from app.modules.admin import repository as admin_repo
from app.modules.auth import repository as auth_repo
from app.modules.users import repository as user_repo


async def list_teachers(session: AsyncSession) -> list[dict]:
    teachers = await admin_repo.get_all_teachers(session)
    return [
        {
            "id": t.id,
            "name": t.name,
            "email": t.email,
            "role": t.role,
            "is_verified": t.is_verified,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in teachers
    ]


async def create_teacher(session: AsyncSession, name: str, email: str, password: str) -> dict:
    existing = await auth_repo.find_user_by_email(session, email)
    if existing:
        raise ApiError(status_code=409, detail="Email already registered")

    teacher = await admin_repo.create_teacher(
        session,
        name=name,
        email=email,
        password_hash=hash_password(password),
    )
    await session.commit()
    return {
        "id": teacher.id,
        "name": teacher.name,
        "email": teacher.email,
        "role": teacher.role,
        "is_verified": teacher.is_verified,
        "created_at": teacher.created_at.isoformat() if teacher.created_at else None,
    }


async def update_teacher(
    session: AsyncSession, teacher_id: int, name: str | None, email: str | None
) -> dict:
    teacher = await admin_repo.get_teacher_by_id(session, teacher_id)
    if not teacher:
        raise ApiError(status_code=404, detail="Teacher not found")

    if email and email != teacher.email:
        existing = await auth_repo.find_user_by_email(session, email)
        if existing:
            raise ApiError(status_code=409, detail="Email already in use")

    await admin_repo.update_teacher(session, teacher_id, name=name, email=email)
    await session.commit()

    updated = await admin_repo.get_teacher_by_id(session, teacher_id)
    return {
        "id": updated.id,
        "name": updated.name,
        "email": updated.email,
        "role": updated.role,
        "is_verified": updated.is_verified,
        "created_at": updated.created_at.isoformat() if updated.created_at else None,
    }


async def remove_teacher(session: AsyncSession, teacher_id: int) -> None:
    teacher = await admin_repo.get_teacher_by_id(session, teacher_id)
    if not teacher:
        raise ApiError(status_code=404, detail="Teacher not found")

    await admin_repo.delete_teacher(session, teacher_id)
    await session.commit()


async def get_stats(session: AsyncSession) -> dict:
    return await admin_repo.get_platform_stats(session)


async def list_teacher_groups(session: AsyncSession) -> list[dict]:
    rows = await admin_repo.get_groups_with_teachers(session)
    return [
        {
            "id": group.id,
            "name": group.name,
            "teacher_id": teacher.id,
            "teacher_name": teacher.name,
            "created_at": group.created_at.isoformat() if group.created_at else None,
        }
        for group, teacher in rows
    ]


async def assign_student_to_group_by_email(
    session: AsyncSession, group_id: int, email: str
) -> dict:
    pair = await admin_repo.get_group_with_teacher_by_id(session, group_id)
    if not pair:
        raise ApiError(status_code=404, detail="Group not found")

    group, teacher = pair
    student = await auth_repo.find_user_by_email(session, email.strip().lower())
    if not student:
        raise ApiError(status_code=404, detail="Student not found")
    if student.role != "student":
        raise ApiError(status_code=400, detail="Provided email belongs to a non-student user")

    await user_repo.assign_student_to_group(session, student.id, group.id)
    await session.commit()

    updated = await user_repo.get_user_by_id(session, student.id)
    return {
        "id": updated.id,
        "name": updated.name,
        "email": updated.email,
        "role": updated.role,
        "group_id": updated.group_id,
        "group_name": group.name,
        "teacher_id": teacher.id,
        "teacher_name": teacher.name,
    }
