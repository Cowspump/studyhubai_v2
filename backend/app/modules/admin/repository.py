from __future__ import annotations

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.groups.models import Group
from app.modules.users.models import User


async def get_all_teachers(session: AsyncSession) -> list[User]:
    result = await session.execute(
        select(User).where(User.role == "teacher").order_by(User.created_at.desc())
    )
    return list(result.scalars().all())


async def get_teacher_by_id(session: AsyncSession, teacher_id: int) -> User | None:
    result = await session.execute(
        select(User).where(User.id == teacher_id, User.role == "teacher")
    )
    return result.scalar_one_or_none()


async def create_teacher(
    session: AsyncSession,
    name: str,
    email: str,
    password_hash: str,
) -> User:
    user = User(
        name=name,
        email=email,
        password_hash=password_hash,
        role="teacher",
        is_verified=True,
    )
    session.add(user)
    await session.flush()
    return user


async def update_teacher(
    session: AsyncSession,
    teacher_id: int,
    **fields: str | None,
) -> None:
    clean = {k: v for k, v in fields.items() if v is not None}
    if not clean:
        return
    await session.execute(
        update(User).where(User.id == teacher_id, User.role == "teacher").values(**clean)
    )


async def delete_teacher(session: AsyncSession, teacher_id: int) -> None:
    await session.execute(
        delete(User).where(User.id == teacher_id, User.role == "teacher")
    )


async def get_platform_stats(session: AsyncSession) -> dict:
    teacher_count = await session.scalar(
        select(func.count()).select_from(User).where(User.role == "teacher")
    )
    student_count = await session.scalar(
        select(func.count()).select_from(User).where(User.role == "student")
    )
    verified_count = await session.scalar(
        select(func.count()).select_from(User).where(User.is_verified == True)
    )
    total_count = await session.scalar(
        select(func.count()).select_from(User)
    )
    return {
        "total_users": total_count or 0,
        "teachers": teacher_count or 0,
        "students": student_count or 0,
        "verified": verified_count or 0,
    }


async def get_groups_with_teachers(session: AsyncSession) -> list[tuple[Group, User]]:
    result = await session.execute(
        select(Group, User)
        .join(User, User.id == Group.teacher_id)
        .order_by(User.name.asc(), Group.created_at.asc())
    )
    return list(result.all())


async def get_group_with_teacher_by_id(
    session: AsyncSession, group_id: int
) -> tuple[Group, User] | None:
    result = await session.execute(
        select(Group, User)
        .join(User, User.id == Group.teacher_id)
        .where(Group.id == group_id)
    )
    row = result.first()
    if not row:
        return None
    return row[0], row[1]
