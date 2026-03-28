from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import User
from app.modules.groups.models import Group


async def get_user_by_id(session: AsyncSession, user_id: int) -> User | None:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()



async def get_users_by_role(session: AsyncSession, role: str) -> list[User]:
    result = await session.execute(
        select(User).where(User.role == role).order_by(User.created_at)
    )
    return list(result.scalars().all())


async def get_students_by_group(session: AsyncSession, group_id: int) -> list[User]:
    result = await session.execute(
        select(User).where(User.role == "student", User.group_id == group_id).order_by(User.name)
    )
    return list(result.scalars().all())


async def update_user_profile(session: AsyncSession, user_id: int, **fields) -> None:
    clean = {k: v for k, v in fields.items() if v is not None}
    if not clean:
        return
    await session.execute(update(User).where(User.id == user_id).values(**clean))



async def get_students_by_teacher(session: AsyncSession, teacher_id: int) -> list[tuple[User, str]]:
    """Get all students for a teacher with group name, via JOIN. Returns list of (User, group_name)."""
    result = await session.execute(
        select(User, Group.name)
        .join(Group, User.group_id == Group.id)
        .where(Group.teacher_id == teacher_id, User.role == "student")
        .order_by(User.name)
    )
    return list(result.all())


async def get_users_by_ids(session: AsyncSession, user_ids: list[int]) -> dict[int, User]:
    """Batch fetch users by IDs. Returns dict {user_id: User}."""
    if not user_ids:
        return {}
    result = await session.execute(
        select(User).where(User.id.in_(user_ids))
    )
    return {u.id: u for u in result.scalars().all()}


async def get_teacher_for_student(session: AsyncSession, group_id: int) -> User | None:
    result = await session.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        return None
    result2 = await session.execute(select(User).where(User.id == group.teacher_id))
    return result2.scalar_one_or_none()
