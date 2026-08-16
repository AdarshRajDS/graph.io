# graph.io

Interactive math visualizations in the browser, with optional Manim Community Edition (MIT) MP4/WebM export.

Live studio (GitHub Pages): https://adarshrajds.github.io/graph.io/

GitHub Pages hosts the browser studio. **Download video** records the live plot in your browser. Film export with Manim still needs the local API and renderer.

Read `docs/architecture.md`, `docs/implementation-plan.md`, `docs/development-plan.md`, and `docs/deployment.md` before changing the stack.

## Requirements (macOS)

- Docker Desktop with Compose v2
- Optional for host-side checks: Node.js 20, [pnpm](https://pnpm.io/) 9, [uv](https://docs.astral.sh/uv/)

## Start the local system

Published host ports are **3100** (web) and **8100** (API). If they are taken, change `WEB_PORT` and `API_HOST_PORT` in `.env`.

```bash
cp .env.example .env
docker compose -f infrastructure/docker-compose.yml --env-file .env up --build
```

| Service | URL |
| --- | --- |
| Web | http://localhost:3100 |
| Web health | http://localhost:3100/api/health |
| API health | http://localhost:8100/health |
| API ready | http://localhost:8100/health/ready |
| MinIO console | http://localhost:9001 |

Share a graph with query parameters, for example `http://localhost:3100/?a=1&b=2`. Sliders update immediately (no render request). **Export** queues a Manim job.

Stop with Ctrl+C, then `docker compose -f infrastructure/docker-compose.yml --env-file .env down`.

`.env` is gitignored. Only `.env.example` is committed.

## Host-side checks (optional)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test

cd services/api && uv sync --extra dev && uv run pytest
cd services/renderer && uv sync --extra dev && uv run pytest
```

Playwright (needs the web app running): `pnpm --filter @math-vis/web test:e2e`

## License notes

Manim Community Edition is MIT-licensed. Keep copyright and license notices if you redistribute Manim. This repo does not vendor Manim source; the renderer image pulls `manimcommunity/manim:v0.21.0`.
