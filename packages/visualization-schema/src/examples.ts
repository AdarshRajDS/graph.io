import {
  cloneVisualizationSpec,
  defaultSpecForKind,
  parseVisualizationSpec,
  type VisualizationKind,
  type VisualizationSpec,
} from "./spec";

export type ExampleItem = {
  id: string;
  name: string;
  kind: VisualizationKind;
  spec: VisualizationSpec;
};

const RAW_EXAMPLES: Array<{ id: string; name: string; spec: unknown }> = [
  { id: "linear", name: "Linear", spec: { version: 1, kind: "function-2d", expression: "m * x + c", domain: [-10, 10], parameters: { m: 1, c: 0 }, theme: "dark" } },
  { id: "quadratic", name: "Quadratic", spec: { version: 1, kind: "function-2d", expression: "a * x^2 + b * x + c", domain: [-6, 6], parameters: { a: 0.3, b: 0, c: 0 }, theme: "dark" } },
  { id: "cubic", name: "Cubic", spec: { version: 1, kind: "function-2d", expression: "a * x^3 + b * x", domain: [-4, 4], parameters: { a: 0.15, b: -1 }, theme: "dark" } },
  { id: "reciprocal", name: "Reciprocal", spec: { version: 1, kind: "function-2d", expression: "a / x", domain: [-8, 8], parameters: { a: 1 }, theme: "dark" } },
  { id: "sqrt", name: "Square root", spec: { version: 1, kind: "function-2d", expression: "a * sqrt(abs(x))", domain: [-2, 10], parameters: { a: 1 }, theme: "dark" } },
  { id: "abs", name: "Absolute value", spec: { version: 1, kind: "function-2d", expression: "a * abs(x)", domain: [-6, 6], parameters: { a: 1 }, theme: "dark" } },
  { id: "exp", name: "Exponential", spec: { version: 1, kind: "function-2d", expression: "a * exp(b * x)", domain: [-4, 4], parameters: { a: 1, b: 0.5 }, theme: "dark" } },
  { id: "log", name: "Logarithm", spec: { version: 1, kind: "function-2d", expression: "a * log(abs(x) + 0.1)", domain: [-8, 8], parameters: { a: 1 }, theme: "dark" } },
  { id: "sine", name: "Sine", spec: { version: 1, kind: "function-2d", expression: "a * sin(b * x + c)", domain: [-10, 10], parameters: { a: 1, b: 1, c: 0 }, theme: "dark" } },
  { id: "cosine", name: "Cosine", spec: { version: 1, kind: "function-2d", expression: "a * cos(b * x + c)", domain: [-10, 10], parameters: { a: 1, b: 1, c: 0 }, theme: "dark" } },
  { id: "tangent", name: "Tangent", spec: { version: 1, kind: "function-2d", expression: "a * tan(b * x)", domain: [-4, 4], parameters: { a: 1, b: 1 }, theme: "dark" } },
  { id: "gaussian", name: "Gaussian", spec: { version: 1, kind: "function-2d", expression: "a * exp(-((x - m)^2) / (2 * s^2))", domain: [-8, 8], parameters: { a: 2, m: 0, s: 1 }, theme: "dark" } },
  { id: "sigmoid", name: "Sigmoid", spec: { version: 1, kind: "function-2d", expression: "1 / (1 + exp(-k * x))", domain: [-8, 8], parameters: { k: 1 }, theme: "dark" } },
  { id: "damped", name: "Damped wave", spec: { version: 1, kind: "function-2d", expression: "exp(-a * abs(x)) * sin(b * x)", domain: [-10, 10], parameters: { a: 0.3, b: 3 }, theme: "dark" } },
  { id: "circle", name: "Circle", spec: { version: 1, kind: "parametric-curve", expressionX: "a * cos(t)", expressionY: "a * sin(t)", domain: [0, 6.283185307179586], parameters: { a: 2 }, theme: "dark" } },
  { id: "ellipse", name: "Ellipse", spec: { version: 1, kind: "parametric-curve", expressionX: "a * cos(t)", expressionY: "b * sin(t)", domain: [0, 6.283185307179586], parameters: { a: 3, b: 1.5 }, theme: "dark" } },
  { id: "parabola", name: "Parabola", spec: { version: 1, kind: "parametric-curve", expressionX: "t", expressionY: "a * t^2", domain: [-2.5, 2.5], parameters: { a: 0.6 }, theme: "dark" } },
  { id: "hyperbola", name: "Hyperbola", spec: { version: 1, kind: "parametric-curve", expressionX: "a * cosh(t)", expressionY: "b * sinh(t)", domain: [-1.8, 1.8], parameters: { a: 1, b: 1 }, theme: "dark" } },
  { id: "spiral", name: "Spiral", spec: { version: 1, kind: "parametric-curve", expressionX: "(a + b * t) * cos(t)", expressionY: "(a + b * t) * sin(t)", domain: [0, 18], parameters: { a: 0.2, b: 0.15 }, theme: "dark" } },
  { id: "log-spiral", name: "Log spiral", spec: { version: 1, kind: "parametric-curve", expressionX: "a * exp(b * t) * cos(t)", expressionY: "a * exp(b * t) * sin(t)", domain: [0, 12], parameters: { a: 0.2, b: 0.15 }, theme: "dark" } },
  { id: "lissajous", name: "Lissajous", spec: { version: 1, kind: "parametric-curve", expressionX: "a * sin(m * t)", expressionY: "b * sin(n * t)", domain: [0, 6.283185307179586], parameters: { a: 2, b: 2, m: 3, n: 2 }, theme: "dark" } },
  { id: "cycloid", name: "Cycloid", spec: { version: 1, kind: "parametric-curve", expressionX: "r * (t - sin(t))", expressionY: "r * (1 - cos(t))", domain: [0, 18.84], parameters: { r: 0.6 }, theme: "dark" } },
  { id: "lemniscate", name: "Lemniscate", spec: { version: 1, kind: "parametric-curve", expressionX: "a * cos(t) / (1 + sin(t)^2)", expressionY: "a * sin(t) * cos(t) / (1 + sin(t)^2)", domain: [0, 6.283185307179586], parameters: { a: 3 }, theme: "dark" } },
  { id: "cardioid", name: "Cardioid", spec: { version: 1, kind: "polar-curve", expression: "a * (1 - cos(t))", domain: [0, 6.283185307179586], parameters: { a: 1.5 }, theme: "dark" } },
  { id: "rose", name: "Rose curve", spec: { version: 1, kind: "polar-curve", expression: "a * cos(k * t)", domain: [0, 6.283185307179586], parameters: { a: 2, k: 3 }, theme: "dark" } },
  { id: "polar-spiral", name: "Polar spiral", spec: { version: 1, kind: "polar-curve", expression: "a + b * t", domain: [0, 18], parameters: { a: 0.2, b: 0.12 }, theme: "dark" } },
  { id: "implicit-circle", name: "Circle", spec: { version: 1, kind: "implicit-curve", expression: "x^2 + y^2 - r^2", domain: [-4, 4], parameters: { r: 2 }, theme: "dark" } },
  { id: "implicit-ellipse", name: "Ellipse", spec: { version: 1, kind: "implicit-curve", expression: "x^2 / a^2 + y^2 / b^2 - 1", domain: [-5, 5], parameters: { a: 3, b: 2 }, theme: "dark" } },
  { id: "implicit-hyperbola", name: "Hyperbola", spec: { version: 1, kind: "implicit-curve", expression: "x^2 / a^2 - y^2 / b^2 - 1", domain: [-5, 5], parameters: { a: 1.5, b: 1.5 }, theme: "dark" } },
  { id: "implicit-parabola", name: "Parabola", spec: { version: 1, kind: "implicit-curve", expression: "y - a * x^2", domain: [-4, 4], parameters: { a: 0.4 }, theme: "dark" } },
  { id: "heart", name: "Heart", spec: { version: 1, kind: "implicit-curve", expression: "(x^2 + y^2 - 1)^3 - x^2 * y^3", domain: [-2, 2], parameters: {}, theme: "dark" } },
  { id: "folium", name: "Folium", spec: { version: 1, kind: "implicit-curve", expression: "x^3 + y^3 - 3 * a * x * y", domain: [-4, 4], parameters: { a: 1 }, theme: "dark" } },
  { id: "radial", name: "Radial", spec: { version: 1, kind: "vector-field", expressionX: "x", expressionY: "y", domain: [-4, 4], parameters: {}, theme: "dark" } },
  { id: "inward", name: "Inward radial", spec: { version: 1, kind: "vector-field", expressionX: "-x", expressionY: "-y", domain: [-4, 4], parameters: {}, theme: "dark" } },
  { id: "rotation", name: "Rotation", spec: { version: 1, kind: "vector-field", expressionX: "-y", expressionY: "x", domain: [-4, 4], parameters: {}, theme: "dark" } },
  { id: "saddle-field", name: "Saddle", spec: { version: 1, kind: "vector-field", expressionX: "x", expressionY: "-y", domain: [-4, 4], parameters: {}, theme: "dark" } },
  { id: "spiral-field", name: "Spiral field", spec: { version: 1, kind: "vector-field", expressionX: "x - y", expressionY: "x + y", domain: [-4, 4], parameters: {}, theme: "dark" } },
  { id: "wave-field", name: "Wave field", spec: { version: 1, kind: "vector-field", expressionX: "sin(y)", expressionY: "cos(x)", domain: [-4, 4], parameters: {}, theme: "dark" } },
  { id: "paraboloid", name: "Paraboloid", spec: { version: 1, kind: "surface", expression: "x^2 + y^2", domain: [-2.5, 2.5], parameters: {}, theme: "dark" } },
  { id: "saddle-surface", name: "Saddle", spec: { version: 1, kind: "surface", expression: "x^2 - y^2", domain: [-2.5, 2.5], parameters: {}, theme: "dark" } },
  { id: "gaussian-surface", name: "Gaussian bump", spec: { version: 1, kind: "surface", expression: "exp(-(x^2 + y^2))", domain: [-3, 3], parameters: {}, theme: "dark" } },
  { id: "wave-surface", name: "Wave", spec: { version: 1, kind: "surface", expression: "sin(x) * cos(y)", domain: [-6, 6], parameters: {}, theme: "dark" } },
  { id: "ripple", name: "Ripple", spec: { version: 1, kind: "surface", expression: "sin(sqrt(x^2 + y^2))", domain: [-8, 8], parameters: {}, theme: "dark" } },
  { id: "geo-circle", name: "Circle", spec: { version: 1, kind: "geometry", shape: "circle", domain: [-5, 5], parameters: { r: 2 }, theme: "dark" } },
  { id: "geo-ellipse", name: "Ellipse", spec: { version: 1, kind: "geometry", shape: "ellipse", domain: [-5, 5], parameters: { a: 3, b: 1.5 }, theme: "dark" } },
  { id: "geo-square", name: "Square", spec: { version: 1, kind: "geometry", shape: "square", domain: [-5, 5], parameters: { a: 2 }, theme: "dark" } },
  { id: "geo-rect", name: "Rectangle", spec: { version: 1, kind: "geometry", shape: "rectangle", domain: [-5, 5], parameters: { a: 3, b: 1.5 }, theme: "dark" } },
  { id: "geo-triangle", name: "Triangle", spec: { version: 1, kind: "geometry", shape: "triangle", domain: [-5, 5], parameters: { a: 2 }, theme: "dark" } },
  { id: "geo-polygon", name: "Regular polygon", spec: { version: 1, kind: "geometry", shape: "polygon", domain: [-5, 5], parameters: { a: 2, n: 6 }, theme: "dark" } },
  { id: "geo-line", name: "Line", spec: { version: 1, kind: "geometry", shape: "line", domain: [-5, 5], parameters: { a: 3 }, theme: "dark" } },
  { id: "geo-arc", name: "Arc", spec: { version: 1, kind: "geometry", shape: "arc", domain: [-5, 5], parameters: { r: 2 }, theme: "dark" } },
  { id: "geo-annulus", name: "Annulus", spec: { version: 1, kind: "geometry", shape: "annulus", domain: [-5, 5], parameters: { a: 1, b: 2.4 }, theme: "dark" } },
  { id: "geo-dot", name: "Dot", spec: { version: 1, kind: "geometry", shape: "dot", domain: [-5, 5], parameters: {}, theme: "dark" } },
  { id: "eq-sine", name: "y = sin(x)", spec: { version: 1, kind: "annotation", expression: "sin(x)", domain: [-10, 10], parameters: {}, theme: "dark" } },
  { id: "eq-quad", name: "y = x^2", spec: { version: 1, kind: "annotation", expression: "x^2", domain: [-4, 4], parameters: {}, theme: "dark" } },
  { id: "eq-exp", name: "y = exp(x)", spec: { version: 1, kind: "annotation", expression: "exp(x)", domain: [-3, 3], parameters: {}, theme: "dark" } },
];

export const KIND_LABELS: Record<VisualizationKind, string> = {
  "function-2d": "Function",
  "parametric-curve": "Parametric",
  "polar-curve": "Polar",
  "implicit-curve": "Implicit",
  "vector-field": "Vector field",
  surface: "Surface contours",
  geometry: "Geometry",
  annotation: "Formula label",
};

export const KIND_BLURBS: Record<VisualizationKind, string> = {
  "function-2d": "plot y = f(x)",
  "parametric-curve": "plot x(t), y(t)",
  "polar-curve": "plot r(θ)",
  "implicit-curve": "plot F(x, y) = 0",
  "vector-field": "plot a 2D field",
  surface: "2D contour preview of z = f(x, y)",
  geometry: "circles, polygons, and lines",
  annotation: "plot a labeled formula",
};

export const KIND_GROUPS: Array<{ name: string; kinds: VisualizationKind[] }> = [
  { name: "Curves", kinds: ["function-2d", "parametric-curve", "polar-curve", "implicit-curve"] },
  { name: "Fields", kinds: ["vector-field"] },
  { name: "3D", kinds: ["surface"] },
  { name: "Geometry", kinds: ["geometry"] },
  { name: "Labels", kinds: ["annotation"] },
];

export const EXAMPLES: ExampleItem[] = RAW_EXAMPLES.map((item) => {
  const spec = parseVisualizationSpec(item.spec);
  return { id: item.id, name: item.name, kind: spec.kind, spec };
});

export function examplesForKind(kind: VisualizationKind): ExampleItem[] {
  return EXAMPLES.filter((item) => item.kind === kind);
}

export function exampleById(id: string): ExampleItem | undefined {
  return EXAMPLES.find((item) => item.id === id);
}

export function starterForKind(kind: VisualizationKind): VisualizationSpec {
  const spec = examplesForKind(kind)[0]?.spec ?? defaultSpecForKind(kind);
  return cloneVisualizationSpec(spec);
}
