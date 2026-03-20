from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Header

from app.shared.core.config import settings


async def get_current_user(authorization: Annotated[str, Header()] = "") -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    return payload


def require_role(role: str):
    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") != role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user

    return _check
