# ADR 0001 — Keep Manim Community Edition for export

Date: 2026-08-16
Status: accepted

## Context

The product plan targets 3b1b/manim (ManimGL) for high-quality PNG and video export. This repository already has a working isolated renderer based on `manimcommunity/manim:v0.21.0` (Manim Community Edition): non-root image, no-network Compose network, read-only rootfs, tmpfs, CPU/memory limits, Celery queue, content-hash cache, and signed MinIO URLs.

Architecture rules forbid replacing working infrastructure without a documented reason.

## Decision

Keep Manim CE as the production export engine. Map validated JSON visualization specs to **internal scene templates** in `services/renderer/scenes`. Treat that mapping as the renderer adapter. Do not install or execute ManimGL in the worker until a later phase explicitly swaps the adapter.

Browser previews remain independent of Manim: Mafs for 2D, Three.js for explicit 3D surfaces.

## Consequences

- Preview and export will not be pixel-identical. That is an accepted v1 limitation.
- Numeric parity is tested by evaluating the same allowlisted AST in TypeScript and Python.
- A future ManimGL worker can reuse the same JSON document and compiler boundary.
- Pin and catalog extraction for ManimGL classes can proceed from mapping files without importing ManimGL.

## Go / no-go (Phase 0)

Go for continuing on Manim CE. No-go for replacing the worker image with ManimGL in this phase: OpenGL/Pango/FFmpeg differences, a different Python API, and a working CE pipeline already meet the isolated-MP4 exit criterion.
