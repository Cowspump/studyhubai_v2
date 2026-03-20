from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.models import User
from app.modules.auth.models import EmailVerificationToken


async def find_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()


async def create_user(
    session: AsyncSession,
    name: str,
    email: str,
    password_hash: str,
    role: str,
    group_id: int | None,
) -> User:
    user = User(
        name=name,
        email=email,
        password_hash=password_hash,
        role=role,
        group_id=group_id,
    )
    session.add(user)
    await session.flush()
    return user


async def store_verification_code(session: AsyncSession, user_id: int, code: str) -> None:
    token = EmailVerificationToken(
        user_id=user_id,
        token=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )
    session.add(token)
    await session.flush()


async def find_active_verification_code(
    session: AsyncSession, user_id: int, code: str
) -> EmailVerificationToken | None:
    now = datetime.now(timezone.utc)
    result = await session.execute(
        select(EmailVerificationToken)
        .where(
            EmailVerificationToken.user_id == user_id,
            EmailVerificationToken.token == code,
            EmailVerificationToken.used == False,
            EmailVerificationToken.expires_at > now,
        )
        .order_by(EmailVerificationToken.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def mark_user_verified(session: AsyncSession, user_id: int) -> None:
    now = datetime.now(timezone.utc)
    await session.execute(
        update(User)
        .where(User.id == user_id)
        .values(is_verified=True, email_verified_at=now)
    )
    await session.execute(
        update(EmailVerificationToken)
        .where(
            EmailVerificationToken.user_id == user_id,
            EmailVerificationToken.used == False,
        )
        .values(used=True)
    )
