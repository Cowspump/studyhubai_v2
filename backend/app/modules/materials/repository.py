from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.materials.models import Material


async def get_materials_by_teacher(session: AsyncSession, teacher_id: int) -> list[Material]:
    result = await session.execute(
        select(Material).where(Material.teacher_id == teacher_id).order_by(Material.created_at)
    )
    return list(result.scalars().all())


async def get_materials_by_group(session: AsyncSession, group_id: int) -> list[Material]:
    result = await session.execute(
        select(Material).where(Material.group_ids.any(group_id)).order_by(Material.created_at)
    )
    return list(result.scalars().all())


async def create_material(
    session: AsyncSession,
    topic: str,
    title: str,
    type_: str,
    url: str,
    teacher_id: int,
    group_ids: list[int],
    file_name: str | None = None,
) -> Material:
    mat = Material(
        topic=topic,
        title=title,
        type=type_,
        url=url,
        teacher_id=teacher_id,
        group_ids=group_ids,
        file_name=file_name,
    )
    session.add(mat)
    await session.flush()
    return mat


async def delete_material(session: AsyncSession, material_id: int) -> None:
    await session.execute(delete(Material).where(Material.id == material_id))
