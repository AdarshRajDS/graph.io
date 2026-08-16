# Capability report

Generated from `packages/visualization-schema/src/capabilities.json`.
Catalog extraction parses Python with `ast` only; Manim is never imported.

Extracted public classes: 0

| Type | Support | Browser 2D | Browser 3D | Export engine | CE target | ManimGL target |
| --- | --- | --- | --- | --- | --- | --- |
| function-2d | full | yes | no | manim-ce | Axes.plot | FunctionGraph |
| parametric-curve | full | yes | no | manim-ce | ParametricFunction | ParametricCurve |
| polar-curve | full | yes | no | manim-ce | ParametricFunction | ParametricCurve |
| implicit-curve | approximate | yes | no | manim-ce | implicit contour adapter | ImplicitFunction |
| vector-field | approximate | yes | no | manim-ce | ArrowVectorField | VectorField |
| surface | approximate | yes | yes | manim-ce | Surface | Surface |
| geometry | approximate | yes | no | manim-ce | Circle/Polygon/Arc adapters | geometry mobjects |
| annotation | approximate | yes | no | manim-ce | MathTex plus graph | Tex/MTex |

## Mapping notes

No Manim source tree was provided. Mapping is the source of truth until a reviewed commit is vendored.
