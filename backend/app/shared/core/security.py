import secrets
import string
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.shared.core.config import settings


def hash_password(raw_password: str) -> str:
    return bcrypt.hashpw(raw_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(raw_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(raw_password.encode("utf-8"), hashed_password.encode("utf-8"))


def generate_verification_code(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def create_jwt(user_id: int, email: str, role: str) -> str:
    expires_raw = settings.jwt_expires
    expires_days = 7
    if expires_raw.endswith("d"):
        expires_days = int(expires_raw[:-1] or "7")

    payload = {
        "userId": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=expires_days),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
