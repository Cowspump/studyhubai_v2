from __future__ import annotations

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.messages.models import Message


async def get_conversation(
    session: AsyncSession, user_a: int, user_b: int
) -> list[Message]:
    result = await session.execute(
        select(Message)
        .where(
            or_(
                and_(Message.from_id == user_a, Message.to_id == user_b),
                and_(Message.from_id == user_b, Message.to_id == user_a),
            )
        )
        .order_by(Message.created_at)
    )
    return list(result.scalars().all())


async def get_conversations_for_user(session: AsyncSession, user_id: int) -> list[dict]:
    result = await session.execute(
        select(Message)
        .where(or_(Message.from_id == user_id, Message.to_id == user_id))
        .order_by(Message.created_at.desc())
    )
    messages = list(result.scalars().all())

    partners: dict[int, dict] = {}
    for msg in messages:
        partner_id = msg.to_id if msg.from_id == user_id else msg.from_id
        if partner_id not in partners:
            partners[partner_id] = {
                "partner_id": partner_id,
                "last_message": msg.text,
                "last_date": msg.created_at.isoformat(),
                "unread": 0,
            }
        if msg.to_id == user_id and not msg.is_read:
            partners[partner_id]["unread"] += 1

    return list(partners.values())


async def send_message(
    session: AsyncSession, from_id: int, to_id: int, text: str
) -> Message:
    msg = Message(from_id=from_id, to_id=to_id, text=text)
    session.add(msg)
    await session.flush()
    return msg


async def mark_read(session: AsyncSession, from_id: int, to_id: int) -> None:
    await session.execute(
        update(Message)
        .where(Message.from_id == from_id, Message.to_id == to_id, Message.is_read == False)
        .values(is_read=True)
    )


async def get_unread_count(session: AsyncSession, user_id: int) -> int:
    result = await session.scalar(
        select(func.count())
        .select_from(Message)
        .where(Message.to_id == user_id, Message.is_read == False)
    )
    return result or 0
