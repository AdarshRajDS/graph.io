# Preview vs export parity (Phase 0)

Same JSON documents are evaluated by:

- TypeScript `compileExpression` / `sampleExplicitSurface` for the browser.
- Python `compile_expression` / Manim CE scene templates for export.

## Numeric

Shared fixture: `packages/visualization-schema/fixtures/parity-surface.json` (`sin(x) * cos(y)`).

TypeScript and Python must agree to 1e-10 on the listed sample points. Mesh sampling is a separate geometric approximation (24×24) and is not required to match Manim’s tessellation.

## Visual

| Kind | Browser | Manim CE export | Expected difference |
| --- | --- | --- | --- |
| Explicit 2D | Mafs stroke | `Create` of axes + graph | line weight, font, easing |
| Implicit | marching squares | contour/implicit adapter | sample density |
| Surface | Three.js mesh (WebGL) or contour fallback | `Surface` in `ThreeDScene` | camera, lighting, resolution |

Pixel identity is not a v1 goal. See ADR 0001: export remains Manim CE.

## Security

Invalid formula text is rejected by the allowlisted parser. Fixtures such as `invalid-python.json` must fail in both validators. The worker never receives Python source from the document.
