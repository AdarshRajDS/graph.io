# Deployment

Do not run Manim inside a frontend serverless request. Rendering needs native system libraries and can exceed ordinary HTTP timeouts.

## Recommended split

| Component | Host |
| --- | --- |
| Next.js (`apps/web`) | Vercel or any Node host |
| FastAPI (`services/api`) | Container platform (Fly, ECS, Cloud Run with CPU) |
| Renderer (`services/renderer`) | Separate CPU-heavy worker service |
| Redis | Managed Redis |
| PostgreSQL | Managed PostgreSQL |
| Assets | S3-compatible bucket + CDN |
| Secrets | Platform secret store, never git |

Set `NEXT_PUBLIC_API_URL` to the public API origin at build time. Set `CORS_ORIGINS` on the API to the web origin. Point `S3_PUBLIC_ENDPOINT_URL` at the CDN or public bucket endpoint used for signed downloads.

## Production notes

- Run API and renderer as non-root.
- Keep the renderer on an isolated network without internet egress.
- Cap CPU, memory, and Celery `time_limit`.
- Use signed, expiring object URLs.
- Scale web and API independently from the renderer.

A Compose-shaped local analogue lives in `infrastructure/docker-compose.yml`.

## GitHub Pages (studio only)

The live **graph.io** studio is a static Next.js export on GitHub Pages. It does not run FastAPI, Redis, PostgreSQL, MinIO, or Manim. **Download video** records at least five seconds of the live plot, including axes and tick numbers (WebM or MP4, depending on the browser). The Manim **Export** button appears only when an API origin is configured.

Workflow: `.github/workflows/pages.yml`. Site: `https://adarshrajds.github.io/graph.io/`.

To attach a custom domain such as `graph.io`, add a Pages CNAME and DNS at the registrar. Do not add a CNAME until that domain is under your control.
