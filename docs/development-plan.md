# Interactive visualization website — development plan

Plan date: 2026-08-16.

This is the product roadmap for math-vis. The current repository already has an interactive Next.js studio, a shared visualization spec, FastAPI, and an isolated **Manim Community Edition** export worker. New work follows this plan **one phase at a time**. Do not replace the working Manim CE worker; see [ADR 0001](decisions/0001-export-engine.md).

## Executive decision

Hybrid rendering:

- Interactive 2D and 3D previews in the browser (`apps/web`).
- Isolated Manim workers for PNG and video export (`services/renderer`).
- Typed, versioned JSON documents (`packages/visualization-schema`).
- Restricted mathematical expressions only — never arbitrary Python.
- A renderer adapter so ManimGL can be added later without rewriting the product.

ManimGL (`3b1b/manim`) is MIT-licensed and is the long-term export target. This repository currently exports with Manim CE (`manimcommunity/manim:v0.21.0`) because that pipeline is working. The compiler maps validated JSON nodes to known scene templates, not user-supplied Python.

## Product experiences

1. Gallery — browse, search, and open templates.
2. Studio — edit formulas, parameters, domains, styles, and animation with a live preview.
3. Player — play, pause, scrub, reset, zoom, pan, rotate.
4. Export and sharing — save, share, duplicate, PNG/SVG/MP4/WebM.

## Scope

**In public v1:** the visualization taxonomy below, curated templates, formula validation, desktop/tablet/usable mobile player, anonymous exploration, authenticated save/share (later phases), PNG/SVG where the browser supports it, MP4/WebM, accessibility.

**Excluded from public v1:** user-supplied Python, shell, extra LaTeX packages, shaders, arbitrary JavaScript, user-selected Python dependencies, simultaneous multi-user editing, a full clone of every Manim scene API, pixel-identical preview vs export.

## Visualization types (v1 registry)

| Type | Browser | Export mapping (current CE adapter) | Priority |
| --- | --- | --- | ---: |
| Explicit 2D function | Mafs | `Axes.plot` / parametric function | P0 |
| Parametric 2D curve | Mafs | `ParametricFunction` | P0 |
| Polar curve | Parametric adapter | `ParametricFunction` | P0 |
| Implicit 2D curve | Marching squares | implicit / contour adapter | P0 |
| Time-varying expression | Timeline-evaluated AST | updater-driven graph | P0 |
| Explicit 3D surface | Three.js mesh | `Surface` + `ThreeDScene` | P0 |
| Vector field | Mafs | `ArrowVectorField` | P1 |
| Geometry primitives | SVG/Mafs | geometry mobjects | P1 |
| Annotations / TeX labels | KaTeX | `MathTex` | P1 |
| Parametric 3D curve, parametric surface, streamlines, charts | planned | adapter TBD | P1–P2 |

## Architecture

```text
Next.js Studio --> shared visualization document
                --> browser 2D (Mafs) and 3D (Three.js)
                --> FastAPI --> PostgreSQL / object storage
                            --> Redis --> isolated Manim worker
```

Non-negotiable constraints:

- Never execute arbitrary user Python, JavaScript, shell, TeX commands, imports, URLs, or file paths.
- Never use `eval`, `exec`, `shell=True`, or raw untrusted `sympify`.
- Validate the same spec in the browser and on the server.
- Register each visualization type in the capability registry.

## Safe expression language

Allowlisted numbers, `+ - * / ^ **`, unary minus, names, and functions (`sin`, `cos`, `tan`, inverse/hyperbolic trig, `exp`, `log`, `ln`, `sqrt`, `abs`). Constants `pi` and `e`. Declared single-letter parameters. Length, AST depth, domain, and parameter-count limits are enforced on every boundary.

## Phased roadmap (execute one phase at a time)

| Phase | Focus | Status in this repo |
| --- | --- | --- |
| 0 | Spike: 2D explicit, implicit, 3D surface, isolated MP4, parity notes | In progress (CE export already exists; 3D preview and catalog are the remaining spike) |
| 1 | Foundation: monorepo, CI, schema, expression AST, shells | Largely complete |
| 2 | Core 2D plotting, parameters, templates | Largely complete |
| 3 | Geometry, annotations, timeline polish | Partial |
| 4 | Calculus helpers, fields, charts | Partial (fields exist) |
| 5 | Full 3D curves, primitives, camera tracks | After Phase 0 3D surface |
| 6 | Production export hardening | Worker exists (Manim CE) |
| 7 | Accounts, projects, sharing, catalog completion | Not started |
| 8 | Hardening and launch | Not started |

Do not start a later phase until the current phase exit criteria pass.

## Definition of done for a visualization type

Typed node and schema; editor properties; browser renderer or explicit export-only badge; Manim compiler; reviewed template; numeric/contract test; browser visual coverage; invalid/worst-case tests; accessibility text; capability-report status; documented example and limitations.

## Immediate execution

1. Keep this file as the product plan.
2. Keep Manim CE as the export engine until an adapter swap is explicitly approved ([ADR 0001](decisions/0001-export-engine.md)).
3. Finish Phase 0: live 3D surface, capability registry, catalog extractor, numeric parity notes.
4. Then Phase 1 remaining work: layered multi-node documents — only after Phase 0 exit criteria pass.
