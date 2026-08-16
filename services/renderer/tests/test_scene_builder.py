from pathlib import Path

from worker.axis_config import AXIS_CONFIG
from worker.scene_builder import function_evaluator, implicit_evaluator, scene_for_kind
from worker.visualization import parse_visualization_spec


def test_export_axes_include_tick_numbers() -> None:
    assert AXIS_CONFIG["include_numbers"] is True
    scenes = Path(__file__).resolve().parents[1] / "scenes"
    for name in (
        "function_2d.py",
        "parametric_curve.py",
        "polar_curve.py",
        "implicit_curve.py",
        "vector_field.py",
        "annotation.py",
        "surface.py",
    ):
        source = (scenes / name).read_text(encoding="utf-8")
        assert "AXIS_CONFIG" in source
        assert "axis_config=AXIS_CONFIG" in source
        assert "FadeIn(axes)" in source


def test_scene_map() -> None:
    path, name = scene_for_kind("function-2d")
    assert path.endswith("function_2d.py")
    assert name == "Function2DScene"
    polar_path, polar_name = scene_for_kind("polar-curve")
    assert polar_path.endswith("polar_curve.py")
    assert polar_name == "PolarCurveScene"


def test_function_evaluator() -> None:
    spec = parse_visualization_spec(
        {
            "version": 1,
            "kind": "function-2d",
            "expression": "a * sin(b * x)",
            "domain": [-10, 10],
            "parameters": {"a": 2, "b": 1},
            "theme": "dark",
        }
    )
    fn = function_evaluator(spec)
    assert fn(0) == 0


def test_surface_evaluator_matches_parity_fixture() -> None:
    spec = parse_visualization_spec(
        {
            "version": 1,
            "kind": "surface",
            "expression": "sin(x) * cos(y)",
            "domain": [-3, 3],
            "parameters": {},
            "theme": "dark",
        }
    )
    fn = implicit_evaluator(spec)
    assert fn(0, 0) == 0
    assert abs(fn(1.5707963267948966, 0) - 1) < 1e-9
    path, name = scene_for_kind("surface")
    assert path.endswith("surface.py")
    assert name == "SurfaceScene"
