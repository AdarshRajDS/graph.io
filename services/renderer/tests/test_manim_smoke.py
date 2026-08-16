import pytest

from worker.visualization import parse_visualization_spec

pytest.importorskip("manim")


def test_manim_importable() -> None:
    spec = parse_visualization_spec(
        {
            "version": 1,
            "kind": "function-2d",
            "expression": "sin(x)",
            "domain": [-3, 3],
            "parameters": {},
            "theme": "dark",
        }
    )
    assert spec.kind == "function-2d"
