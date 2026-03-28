from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.materials.models import Material


async def get_materials_by_teacher(session: AsyncSession, teacher_id: int, skip: int = 0, limit: int = 100) -> tuple[list[Material], int]:
    """Get materials with pagination and return total count"""
    # Get total count efficiently
    count_result = await session.execute(
        select(func.count(Material.id)).where(Material.teacher_id == teacher_id)
    )
    total = count_result.scalar() or 0
    
    # Get paginated results
    result = await session.execute(
        select(Material)
        .where(Material.teacher_id == teacher_id)
        .order_by(Material.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()), total


async def get_materials_by_group(session: AsyncSession, group_id: int, skip: int = 0, limit: int = 100) -> tuple[list[Material], int]:
    """Get materials by group with pagination"""
    # Get total count efficiently
    count_result = await session.execute(
        select(func.count(Material.id)).where(Material.group_ids.any(group_id))
    )
    total = count_result.scalar() or 0
    
    # Get paginated results
    result = await session.execute(
        select(Material)
        .where(Material.group_ids.any(group_id))
        .order_by(Material.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()), total


async def get_material_by_id(session: AsyncSession, material_id: int) -> Material | None:
    result = await session.execute(select(Material).where(Material.id == material_id))
    return result.scalar_one_or_none()


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
