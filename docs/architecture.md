# Architecture

Hybrid interactive mathematical visualization: the browser handles real-time interaction; Manim Community Edition produces polished export videos. Manim is never imported into the web app.

Product roadmap: `docs/development-plan.md`. Export-engine decision: `docs/decisions/0001-export-engine.md`.

This project uses Manim CE (`manimcommunity/manim:v0.21.0`), MIT-licensed. Keep copyright and license notices if you redistribute Manim. Do not replace this worker with ManimGL while the CE pipeline is the accepted adapter.

The API image and local `uv` environments use Python 3.12. The renderer image uses the CPython that tag ships (currently 3.14). Renderer `pip` installs must use prebuilt wheels only so the compiler-free Manim image never builds native extensions.

## Split of responsibilities

| Layer | Location | Role |
| --- | --- | --- |
| Live 2D interaction | `apps/web` | Instant parameter updates, pan/zoom, play/pause. No network round-trip for sliders. |
| Live 3D surfaces | `apps/web` | Explicit `z = f(x, y)` meshes via Three.js, with contour fallback when WebGL is unavailable. |
| Equations | `apps/web` | KaTeX |
| HTTP API | `services/api` | Validate specs, persist jobs, enqueue renders, signed URLs |
| Render worker | `services/renderer` | Internal Manim templates, MP4/WebM/thumbnail |
| Broker | Redis | Celery |
| Metadata | PostgreSQL | Render jobs |
| Assets | MinIO / S3 | Videos and thumbnails |

## Data flow

```text
Browser --live--> Next.js (Mafs / Three.js)
Browser --export--> FastAPI --> PostgreSQL
                      | Redis/Celery
                      v
                 Renderer (Manim) --> MinIO
Browser <-- SSE/poll -- FastAPI
Browser <-- signed URL -- MinIO
```

## Shared specification

The shared visualization spec covers eight diagram categories: `function-2d`, `parametric-curve`, `polar-curve`, `implicit-curve`, `vector-field`, `surface`, `geometry`, and `annotation`. A scene may stack up to eight layers of those kinds on one canvas. Live preview is 2D in the browser except a lone explicit surface, which uses a Three.js mesh (contour fallback without WebGL, and contours when mixed with other layers). Export uses Manim Community Edition templates through a scene adapter, not arbitrary Python. Support status lives in the capability registry and `docs/capability-report.md`.

Expressions use an allowlisted grammar (numbers, `+ - * / ^ **`, `sin/cos/sinh/...`, parameter names). User-supplied Python is never executed. Shell commands are never built from user strings.

## Security invariants

- Accept visualization data, not Python source.
- Validate specs at every service boundary.
- Renderer: non-root, cap-drop ALL, no-new-privileges, read-only rootfs, tmpfs, CPU/memory limits, isolated Compose network (no internet).
- Rate-limit render creation.
- Signed, expiring download URLs.
- Temporary job directories are deleted after each render.
