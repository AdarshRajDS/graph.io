from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.celery_client import create_celery
from app.config import Settings, get_settings
from app.database import build_session_factory
from app.db import create_db_engine, database_is_ready
from app.redis_client import create_redis_client, redis_is_ready
from app.renders import build_renders_router
from app.storage import ensure_bucket

_app: FastAPI | None = None


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or get_settings()
    application = FastAPI(title="math-vis API", version="0.2.0")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origin_list(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    session_factory = build_session_factory(resolved)
    application.include_router(
        build_renders_router(
            resolved,
            session_factory,
            lambda: create_redis_client(resolved),
        )
    )

    @application.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @application.get("/health/ready")
    def ready() -> JSONResponse:
        engine = create_db_engine(resolved)
        redis = create_redis_client(resolved)
        database_ok = database_is_ready(engine)
        redis_ok = redis_is_ready(redis)
        payload = {
            "status": "ok" if database_ok and redis_ok else "not_ready",
            "database": database_ok,
            "redis": redis_ok,
        }
        if not database_ok or not redis_ok:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=payload)
        return JSONResponse(payload)

    @application.on_event("startup")
    def startup() -> None:
        try:
            ensure_bucket(resolved)
        except Exception:
            # MinIO may not be available in unit tests.
            pass
        create_celery(resolved)

    return application


async def app(scope: dict, receive, send) -> None:
    global _app
    if _app is None:
        _app = create_app()
    await _app(scope, receive, send)
