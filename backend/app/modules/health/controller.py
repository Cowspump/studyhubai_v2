from fastapi import APIRouter, HTTPException

from app.shared.db import check_db_health

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    try:
        await check_db_health()
        return {"ok": True, "service": "studyhubai-backend-fastapi"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Database is not reachable") from exc
