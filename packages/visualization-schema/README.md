# Visualization schema

Versioned JSON documents shared by the browser and Manim renderer.

Supported `kind` values:

- `function-2d` — explicit \(y=f(x)\)
- `parametric-curve` — \((x(t), y(t))\)
- `polar-curve` — \(r=f(t)\) with \(t=\theta\)
- `implicit-curve` — \(F(x,y)=0\)
- `vector-field` — \(\vec F(x,y)\)
- `surface` — \(z=f(x,y)\) (live contours)
- `geometry` — circle, ellipse, polygon, and related shapes
- `annotation` — displayed equation plus a graph

Expressions are parsed with an allowlisted grammar (`+ - * / ^ **`, `sin/cos/sinh/...`). User-supplied Python is never executed.
