from pathlib import Path

from worker.visualization import (
    AnnotationSpec,
    Function2dSpec,
    ImplicitCurveSpec,
    ParametricCurveSpec,
    PolarCurveSpec,
    Spec,
    SurfaceSpec,
    VectorFieldSpec,
    compile_expression,
    parse_visualization_spec,
)

SCENE_MAP = {
    "function-2d": ("scenes/function_2d.py", "Function2DScene"),
    "parametric-curve": ("scenes/parametric_curve.py", "ParametricCurveScene"),
    "polar-curve": ("scenes/polar_curve.py", "PolarCurveScene"),
    "implicit-curve": ("scenes/implicit_curve.py", "ImplicitCurveScene"),
    "vector-field": ("scenes/vector_field.py", "VectorFieldScene"),
    "surface": ("scenes/surface.py", "SurfaceScene"),
    "geometry": ("scenes/geometry.py", "GeometryScene"),
    "annotation": ("scenes/annotation.py", "AnnotationScene"),
}


def load_spec(path: str) -> Spec:
    import json

    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    return parse_visualization_spec(payload)


def scene_for_kind(kind: str) -> tuple[str, str]:
    if kind not in SCENE_MAP:
        raise ValueError("Unsupported visualization kind")
    return SCENE_MAP[kind]


def function_evaluator(spec: Function2dSpec | AnnotationSpec):
    fn = compile_expression(spec.expression, {"x", *spec.parameters})
    return lambda x: fn({"x": float(x), **spec.parameters})


def parametric_evaluator(spec: ParametricCurveSpec):
    fx = compile_expression(spec.expression_x, {"t", *spec.parameters})
    fy = compile_expression(spec.expression_y, {"t", *spec.parameters})
    return (
        lambda t: fx({"t": float(t), **spec.parameters}),
        lambda t: fy({"t": float(t), **spec.parameters}),
    )


def polar_evaluator(spec: PolarCurveSpec):
    fr = compile_expression(spec.expression, {"t", *spec.parameters})
    return lambda t: fr({"t": float(t), **spec.parameters})


def implicit_evaluator(spec: ImplicitCurveSpec | SurfaceSpec):
    fn = compile_expression(spec.expression, {"x", "y", *spec.parameters})
    return lambda x, y: fn({"x": float(x), "y": float(y), **spec.parameters})


def vector_evaluator(spec: VectorFieldSpec):
    fx = compile_expression(spec.expression_x, {"x", "y", *spec.parameters})
    fy = compile_expression(spec.expression_y, {"x", "y", *spec.parameters})
    return (
        lambda x, y: fx({"x": float(x), "y": float(y), **spec.parameters}),
        lambda x, y: fy({"x": float(x), "y": float(y), **spec.parameters}),
    )
