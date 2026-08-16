from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import boto3
from botocore.client import Config
from redis import Redis
from sqlalchemy import create_engine, text

from worker.scene_builder import scene_for_kind
from worker.visualization import parse_visualization_spec, spec_to_dict

RENDER_TIMEOUT_SECONDS = 90
FFMPEG_TIMEOUT_SECONDS = 30
MANIM_FPS = 15


def manim_command(scene_file: str, scene_class: str, media_dir: Path) -> list[str]:
    return [
        "manim",
        "-ql",
        "--fps",
        str(MANIM_FPS),
        "--format=mp4",
        "--disable_caching",
        "--media_dir",
        str(media_dir),
        scene_file,
        scene_class,
    ]


def should_encode_webm(env: dict[str, str] | None = None) -> bool:
    source = env if env is not None else os.environ
    return source.get("RENDER_WEBM", "0") == "1"


def _engine():
    return create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)


def _redis() -> Redis:
    return Redis.from_url(os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0"))


def _s3():
    return boto3.client(
        "s3",
        endpoint_url=os.environ.get("S3_ENDPOINT_URL", "http://minio:9000"),
        aws_access_key_id=os.environ.get("S3_ACCESS_KEY", "mathvis_minio"),
        aws_secret_access_key=os.environ.get("S3_SECRET_KEY", "mathvis_minio_dev"),
        region_name=os.environ.get("S3_REGION", "us-east-1"),
        config=Config(signature_version="s3v4"),
    )


ALLOWED_COLUMNS = {
    "status",
    "progress",
    "error",
    "video_mp4_key",
    "video_webm_key",
    "thumbnail_key",
}


def _update(render_id: str, **fields: object) -> None:
    if any(key not in ALLOWED_COLUMNS for key in fields):
        raise ValueError("Invalid render column")
    assignments = ", ".join(f"{key} = :{key}" for key in fields)
    params = {"id": render_id, **fields}
    with _engine().begin() as connection:
        connection.execute(
            text(f"UPDATE renders SET {assignments}, updated_at = NOW() WHERE id = :id"),
            params,
        )


def _cancelled(render_id: str) -> bool:
    return _redis().get(f"render:cancel:{render_id}") is not None


def _run(
    command: list[str],
    timeout: int,
    env: dict[str, str] | None = None,
    cwd: str | None = None,
) -> None:
    subprocess.run(command, check=True, timeout=timeout, env=env, cwd=cwd, shell=False)


def execute_render(render_id: str, spec_payload: dict) -> None:
    if _cancelled(render_id):
        _update(render_id, status="cancelled", error="Cancelled by user")
        return
    spec = parse_visualization_spec(spec_payload)
    scene_file, scene_class = scene_for_kind(spec.kind)
    job_dir = Path(tempfile.mkdtemp(prefix="mathvis-"))
    spec_path = job_dir / "spec.json"
    spec_path.write_text(json.dumps(spec_to_dict(spec)), encoding="utf-8")
    media_dir = job_dir / "media"
    try:
        _update(render_id, status="rendering", progress=15)
        env = os.environ.copy()
        env["JOB_SPEC_PATH"] = str(spec_path)
        env["PYTHONPATH"] = "/app"
        _run(
            manim_command(scene_file, scene_class, media_dir),
            timeout=RENDER_TIMEOUT_SECONDS,
            env=env,
            cwd="/app",
        )
        if _cancelled(render_id):
            _update(render_id, status="cancelled", error="Cancelled by user")
            return
        mp4 = next(media_dir.rglob("*.mp4"))
        thumb = job_dir / "thumb.png"
        pngs = list(media_dir.rglob("*.png"))
        if pngs:
            shutil.copy(pngs[-1], thumb)
        elif shutil.which("ffmpeg"):
            _run(
                ["ffmpeg", "-y", "-i", str(mp4), "-frames:v", "1", str(thumb)],
                timeout=FFMPEG_TIMEOUT_SECONDS,
            )
        else:
            thumb = None
        webm = None
        if should_encode_webm(env) and shutil.which("ffmpeg"):
            webm = job_dir / "video.webm"
            try:
                _run(
                    [
                        "ffmpeg",
                        "-y",
                        "-i",
                        str(mp4),
                        "-c:v",
                        "libvpx-vp9",
                        "-deadline",
                        "realtime",
                        "-cpu-used",
                        "8",
                        str(webm),
                    ],
                    timeout=FFMPEG_TIMEOUT_SECONDS,
                )
            except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
                webm = None
        _update(render_id, status="uploading", progress=75)
        bucket = os.environ.get("S3_BUCKET", "math-vis")
        prefix = f"renders/{render_id}"
        client = _s3()
        mp4_key = f"{prefix}/video.mp4"
        client.upload_file(str(mp4), bucket, mp4_key)
        thumb_key = None
        if thumb and thumb.exists():
            thumb_key = f"{prefix}/thumb.png"
            client.upload_file(str(thumb), bucket, thumb_key)
        webm_key = None
        if webm and webm.exists():
            webm_key = f"{prefix}/video.webm"
            client.upload_file(str(webm), bucket, webm_key)
        _update(
            render_id,
            status="completed",
            progress=100,
            video_mp4_key=mp4_key,
            video_webm_key=webm_key,
            thumbnail_key=thumb_key,
            error=None,
        )
    except Exception as exc:
        _update(render_id, status="failed", error=str(exc)[:1000], progress=0)
        raise
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)
