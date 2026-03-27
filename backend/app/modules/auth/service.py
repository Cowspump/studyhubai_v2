from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.core.exceptions import ApiError
from app.shared.core.mailer import send_verification_email
from app.shared.core.security import create_jwt, generate_verification_code, hash_password, verify_password
from app.modules.auth import repository as auth_repo


async def register_user(
    session: AsyncSession,
    name: str,
    email: str,
    password: str,
    role: str,
    group_id: int | None,
):
    if not name or not password:
        raise ApiError(status_code=400, detail="name, email, password are required")

    existing = await auth_repo.find_user_by_email(session, email)
    if existing:
        raise ApiError(status_code=409, detail="Email already registered")

    user = await auth_repo.create_user(
        session,
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        group_id=group_id,
    )
    code = generate_verification_code()
    await auth_repo.store_verification_code(session, user_id=user.id, code=code)
    await session.commit()

    await send_verification_email(to_email=email, verification_code=code)

    return {
        "message": "User created. Verification email sent.",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "group_id": user.group_id,
            "is_verified": user.is_verified,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
    }


async def verify_email_code(session: AsyncSession, email: str, code: str):
    normalized_code = code.strip()
    if not normalized_code:
        raise ApiError(status_code=400, detail="Verification code is required")

    user = await auth_repo.find_user_by_email(session, email)
    if not user:
        raise ApiError(status_code=404, detail="User not found")

    token_row = await auth_repo.find_active_verification_code(
        session, user_id=user.id, code=normalized_code
    )
    if not token_row:
        raise ApiError(status_code=400, detail="Invalid or expired verification code")

    await auth_repo.mark_user_verified(session, user_id=token_row.user_id)
    await session.commit()

    token = create_jwt(user_id=user.id, email=user.email, role=user.role)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "group_id": user.group_id,
        },
    }


async def login_user(session: AsyncSession, email: str, password: str):
    user = await auth_repo.find_user_by_email(session, email)
    if not user:
        raise ApiError(status_code=401, detail="Invalid credentials")

    if not verify_password(password, user.password_hash):
        raise ApiError(status_code=401, detail="Invalid credentials")

    if not user.is_verified:
        raise ApiError(status_code=403, detail="Email is not verified yet")

    token = create_jwt(user_id=user.id, email=user.email, role=user.role)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "group_id": user.group_id,
        },
    }
