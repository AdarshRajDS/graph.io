# Implementation plan

Follow `docs/development-plan.md`. Work **one phase at a time**. Do not replace the Manim CE worker; see `docs/decisions/0001-export-engine.md`.

## Current phase: 1 — layered documents (in progress)

Phase 0 spike items are in the repository.

This phase adds:

- Multiple visualization layers on one canvas.
- Shared scene document (`layers`) validated in TypeScript and Python.
- Centered live expressions over the plot.

Exit criteria:

- Two different kinds can share one preview.
- URL state round-trips stacked layers.
- Invalid layer expressions are rejected on both validators.

## Later phases (do not start yet)

2. Remaining 2D polish (adaptive sampling budgets, more templates).
3. Timeline tracks, undo/redo, browser SVG/PNG export.
4. Calculus helpers, streamlines, charts.
5. Parametric 3D curves/surfaces, primitives, camera tracks.
6. Export hardening (ManimGL adapter only if ADR 0001 is superseded).
7. Accounts, projects, sharing, 40+ templates.
8. Launch hardening.
