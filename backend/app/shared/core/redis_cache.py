from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from app.shared.core.config import settings

try:
    import redis.asyncio as redis_async  # type: ignore  # pylint: disable=import-error
except (ImportError, ModuleNotFoundError):  # pragma: no cover
    redis_async = None


class _InMemoryTTLCache:
    def __init__(self) -> None:
        self._data: dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            item = self._data.get(key)
            if item is None:
                return None
            expires_at, value = item
            if expires_at <= time.time():
                self._data.pop(key, None)
                return None
            return value

    async def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        async with self._lock:
            expires_at = time.time() + ttl_seconds
            self._data[key] = (expires_at, value)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._data.pop(key, None)


_memory_cache = _InMemoryTTLCache()
_redis_client: Any | None = None
_redis_lock = asyncio.Lock()


async def _get_redis_client():
    global _redis_client  # pylint: disable=global-statement
    if redis_async is None:
        return None
    if not settings.redis_url:
        return None
    async with _redis_lock:
        if _redis_client is None:
            _redis_client = redis_async.from_url(settings.redis_url, decode_responses=True)
        return _redis_client


async def get_cached_json(key: str) -> Any | None:
    redis_client = await _get_redis_client()
    if redis_client is not None:
        raw = await redis_client.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    return await _memory_cache.get(key)


async def set_cached_json(key: str, value: Any, ttl_seconds: int | None = None) -> None:
    ttl = ttl_seconds if ttl_seconds is not None else settings.cache_ttl_seconds
    redis_client = await _get_redis_client()
    if redis_client is not None:
        await redis_client.set(key, json.dumps(value, ensure_ascii=False), ex=ttl)
        return
    await _memory_cache.set(key, value, ttl)


async def invalidate_key(key: str) -> None:
    redis_client = await _get_redis_client()
    if redis_client is not None:
        await redis_client.delete(key)
        return
    await _memory_cache.delete(key)


def teacher_stats_cache_key(teacher_id: int) -> str:
    return f"teacher:stats:{teacher_id}"


def teacher_rating_cache_key(teacher_id: int) -> str:
    return f"teacher:rating:{teacher_id}"


def student_me_cache_key(student_id: int) -> str:
    return f"student:me:{student_id}"


async def invalidate_teacher_stats_and_rating(teacher_id: int) -> None:
    await asyncio.gather(
        invalidate_key(teacher_stats_cache_key(teacher_id)),
        invalidate_key(teacher_rating_cache_key(teacher_id)),
    )


async def invalidate_student_me(student_id: int) -> None:
    await invalidate_key(student_me_cache_key(student_id))

