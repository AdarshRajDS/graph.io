import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.visualization import compile_expression, parse_expression, parse_visualization_spec

FIXTURES = Path(__file__).resolve().parents[3] / "packages" / "visualization-schema" / "fixtures"


def test_compile_power_and_sinh() -> None:
    fn = compile_expression("sinh(x) + a ** 2", {"x", "a"})
    assert fn({"x": 0, "a": 3}) == pytest.approx(9)
    fn = compile_expression("a * sin(b * x)", {"x", "a", "b"})
    assert fn({"x": 0, "a": 2, "b": 1}) == pytest.approx(0)


@pytest.mark.parametrize(
    "source",
    [
        "__import__('os').system('id')",
        "eval(x)",
        "os.system('id')",
        "a" * 200,
    ],
)
def test_rejects_malicious_or_oversized_expressions(source: str) -> None:
    with pytest.raises((ValueError, ValidationError)):
        parse_expression(source, {"x"})


def test_golden_function_fixture() -> None:
    payload = json.loads((FIXTURES / "function-2d.json").read_text(encoding="utf-8"))
    spec = parse_visualization_spec(payload)
    assert spec.kind == "function-2d"


def test_rejects_python_fixture() -> None:
    payload = json.loads((FIXTURES / "invalid-python.json").read_text(encoding="utf-8"))
    with pytest.raises(Exception):
        parse_visualization_spec(payload)


def test_stacked_layers_validate_each_expression() -> None:
    payload = {
        "version": 1,
        "layers": [
            {
                "version": 1,
                "kind": "function-2d",
                "expression": "sin(x)",
                "domain": [-10, 10],
                "parameters": {},
                "theme": "dark",
            },
            {
                "version": 1,
                "kind": "polar-curve",
                "expression": "cos(t)",
                "domain": [0, 6.283185307179586],
                "parameters": {},
                "theme": "dark",
            },
        ],
    }
    spec = parse_visualization_spec(payload)
    assert spec.kind == "function-2d"
    with pytest.raises(Exception):
        parse_visualization_spec(
            {
                "version": 1,
                "layers": [
                    {
                        "version": 1,
                        "kind": "function-2d",
                        "expression": "eval(x)",
                        "domain": [-10, 10],
                        "parameters": {},
                        "theme": "dark",
                    }
                ],
            }
        )


def test_surface_numeric_parity_fixture() -> None:
    payload = json.loads((FIXTURES / "parity-surface.json").read_text(encoding="utf-8"))
    fn = compile_expression(payload["expression"], set(payload["allowedNames"]))
    for sample in payload["samples"]:
        assert fn(sample["scope"]) == pytest.approx(sample["value"])
