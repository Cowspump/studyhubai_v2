from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.shared.core.config import settings
from app.shared.db import engine

from app.modules.health.controller import router as health_router
from app.modules.auth.controller import router as auth_router
from app.modules.admin.controller import router as admin_router
from app.modules.teacher.controller import router as teacher_router
from app.modules.student.controller import router as student_router
from app.modules.groups.controller import router as public_router

uploads_path = Path(__file__).parent.parent / "uploads"
uploads_path.mkdir(exist_ok=True)

_cors_origins = settings.cors_origin.split(",") if settings.cors_origin != "*" else ["*"]


class CORSStaticFiles(StaticFiles):
    """StaticFiles wrapper that injects CORS headers (middleware doesn't reach mounted sub-apps)."""

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            origin = request.headers.get("origin", "")

            async def send_with_cors(message):
                if message["type"] == "http.response.start":
                    allow = "*" if "*" in _cors_origins else (origin if origin in _cors_origins else "")
                    if allow:
                        extra = [
                            (b"access-control-allow-origin", allow.encode()),
                            (b"access-control-allow-credentials", b"true"),
                        ]
                        message["headers"] = list(message.get("headers", [])) + extra
                await send(message)

            if request.method == "OPTIONS":
                resp = Response(
                    status_code=204,
                    headers={
                        "Access-Control-Allow-Origin": "*" if "*" in _cors_origins else origin,
                        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                        "Access-Control-Allow-Headers": "*",
                        "Access-Control-Max-Age": "86400",
                    },
                )
                await resp(scope, receive, send)
                return

            await super().__call__(scope, receive, send_with_cors)
        else:
            await super().__call__(scope, receive, send)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(teacher_router)
app.include_router(student_router)
app.include_router(public_router)

app.mount("/uploads", CORSStaticFiles(directory=uploads_path), name="uploads")

