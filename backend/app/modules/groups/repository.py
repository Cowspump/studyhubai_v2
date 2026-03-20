from __future__ import annotations

import secrets
import string

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.groups.models import Group

CHARS = string.ascii_uppercase + string.digits


def generate_invite_code(length: int = 6) -> str:
    return "".join(secrets.choice(CHARS) for _ in range(length))


async def get_groups_by_teacher(session: AsyncSession, teacher_id: int) -> list[Group]:
    result = await session.execute(
        select(Group).where(Group.teacher_id == teacher_id).order_by(Group.created_at)
    )
    return list(result.scalars().all())


async def get_all_groups(session: AsyncSession) -> list[Group]:
    result = await session.execute(select(Group).order_by(Group.created_at))
    return list(result.scalars().all())


async def get_group_by_id(session: AsyncSession, group_id: int) -> Group | None:
    result = await session.execute(select(Group).where(Group.id == group_id))
    return result.scalar_one_or_none()


async def get_group_by_invite_code(session: AsyncSession, invite_code: str) -> Group | None:
    result = await session.execute(
        select(Group).where(Group.invite_code == invite_code.upper())
    )
    return result.scalar_one_or_none()


async def create_group(session: AsyncSession, name: str, teacher_id: int) -> Group:
    for _ in range(10):
        code = generate_invite_code()
        existing = await get_group_by_invite_code(session, code)
        if not existing:
            break
    group = Group(name=name, teacher_id=teacher_id, invite_code=code)
    session.add(group)
    await session.flush()
    return group


async def delete_group(session: AsyncSession, group_id: int) -> None:
    await session.execute(delete(Group).where(Group.id == group_id))
