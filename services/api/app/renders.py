from __future__ import annotations

import json
import secrets
from collections.abc import Callable
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.celery_client import create_celery
from app.config import Settings
from app.models import Render
from app.storage import presign
from app.visualization import content_hash, parse_visualization_spec

TERMINAL = {"completed", "failed", "cancelled"}


class RenderCreateRequest(BaseModel):
    spec: dict[str, Any] = Field(min_length=1)


class RenderResponse(BaseModel):
    renderId: str
    status: str
    progress: int = 0
    error: str | None = None
    videoMp4Url: str | None = None
    videoWebmUrl: str | None = None
    thumbnailUrl: str | None = None
    cached: bool = False


def build_renders_router(
    settings: Settings,
    session_factory: Callable[[], Session],
    redis_factory: Callable,
) -> APIRouter:
    router = APIRouter(prefix="/v1/renders", tags=["renders"])
    celery = create_celery(settings)

    def db_session() -> Session:
        session = session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def to_response(row: Render, cached: bool = False) -> RenderResponse:
        return RenderResponse(
            renderId=row.id,
            status=row.status,
            progress=row.progress,
            error=row.error,
            videoMp4Url=presign(settings, row.video_mp4_key),
            videoWebmUrl=presign(settings, row.video_webm_key),
            thumbnailUrl=presign(settings, row.thumbnail_key),
            cached=cached,
        )

    def enforce_rate_limit(request: Request) -> None:
        redis = redis_factory()
        host = request.client.host if request.client else "unknown"
        key = f"rl:renders:{host}"
        count = redis.incr(key)
        if count == 1:
            redis.expire(key, 60)
        if int(count) > settings.render_rate_limit_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
            )

    @router.post("", status_code=status.HTTP_202_ACCEPTED)
    def create_render(
        payload: RenderCreateRequest,
        request: Request,
        session: Session = Depends(db_session),
    ) -> RenderResponse:
        try:
            spec = parse_visualization_spec(payload.spec)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        enforce_rate_limit(request)
        digest = content_hash(spec)
        existing = session.scalar(select(Render).where(Render.content_hash == digest))
        if existing and existing.status != "cancelled":
            body = to_response(existing, cached=True)
            code = (
                status.HTTP_200_OK if existing.status == "completed" else status.HTTP_202_ACCEPTED
            )
            return JSONResponse(body.model_dump(), status_code=code)
        render_id = f"rnd_{secrets.token_hex(8)}"
        row = Render(
            id=render_id,
            content_hash=digest,
            spec=spec.model_dump(by_alias=True, mode="json"),
            status="queued",
            progress=0,
        )
        session.add(row)
        session.flush()
        async_result = celery.send_task(
            "renders.execute",
            args=[render_id, row.spec],
            queue="renders",
        )
        row.celery_task_id = async_result.id
        session.add(row)
        return to_response(row)

    @router.get("/{render_id}")
    def get_render(render_id: str, session: Session = Depends(db_session)) -> RenderResponse:
        row = session.get(Render, render_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Render not found")
        return to_response(row)

    @router.get("/{render_id}/events")
    def render_events(render_id: str) -> StreamingResponse:
        def event_stream():
            session = session_factory()
            try:
                while True:
                    row = session.get(Render, render_id)
                    session.expire_all()
                    if row is None:
                        yield f"event: error\ndata: {json.dumps({'error': 'not_found'})}\n\n"
                        return
                    payload = to_response(row).model_dump()
                    yield f"data: {json.dumps(payload)}\n\n"
                    if row.status in TERMINAL:
                        return
                    import time

                    time.sleep(0.7)
                    session.expire_all()
            finally:
                session.close()

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    @router.delete("/{render_id}")
    def cancel_render(render_id: str, session: Session = Depends(db_session)) -> RenderResponse:
        row = session.get(Render, render_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Render not found")
        if row.status in TERMINAL:
            return to_response(row)
        if row.celery_task_id:
            celery.control.revoke(row.celery_task_id, terminate=True)
        row.status = "cancelled"
        row.error = "Cancelled by user"
        redis = redis_factory()
        redis.set(f"render:cancel:{render_id}", "1", ex=600)
        return to_response(row)

    return router
