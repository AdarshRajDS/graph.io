from __future__ import annotations

import hashlib
import json
import math
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Literal

ALLOWED_FUNCTIONS = {
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "asin": math.asin,
    "acos": math.acos,
    "atan": math.atan,
    "sinh": math.sinh,
    "cosh": math.cosh,
    "exp": math.exp,
    "log": math.log10,
    "ln": math.log,
    "sqrt": math.sqrt,
    "abs": abs,
}
ALLOWED_CONSTANTS = {"pi": math.pi, "e": math.e}
MAX_EXPRESSION_LENGTH = 120
MAX_AST_DEPTH = 32
PARAM_MIN = -50.0
PARAM_MAX = 50.0
NAME_RE = re.compile(r"^[a-z]$")
NUMBER_RE = re.compile(r"\d+(\.\d+)?|\.\d+")
IDENT_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


class ExpressionSyntaxError(ValueError):
    pass


type AstNode = dict[str, Any]


def parse_expression(source: str, allowed_names: set[str]) -> AstNode:
    if not source or len(source) > MAX_EXPRESSION_LENGTH:
        raise ExpressionSyntaxError("Expression length is invalid")
    parser = _Parser(source, allowed_names)
    node = parser.parse_expr()
    if parser.index != len(parser.tokens):
        raise ExpressionSyntaxError("Unexpected trailing input")
    _assert_depth(node, 0)
    return node


def evaluate_ast(node: AstNode, scope: dict[str, float]) -> float:
    kind = node["type"]
    if kind == "number":
        return float(node["value"])
    if kind == "name":
        name = node["name"]
        if name in ALLOWED_CONSTANTS:
            return ALLOWED_CONSTANTS[name]
        return float(scope[name])
    if kind == "unary":
        return -evaluate_ast(node["argument"], scope)
    if kind == "binary":
        left = evaluate_ast(node["left"], scope)
        right = evaluate_ast(node["right"], scope)
        op = node["op"]
        if op == "+":
            return left + right
        if op == "-":
            return left - right
        if op == "*":
            return left * right
        if op == "/":
            return math.nan if right == 0 else left / right
        if op == "^":
            return left**right
    if kind == "call":
        func = ALLOWED_FUNCTIONS[node["name"]]
        return float(func(evaluate_ast(node["argument"], scope)))
    return math.nan


def compile_expression(source: str, allowed_names: set[str]) -> Callable[[dict[str, float]], float]:
    tree = parse_expression(source, allowed_names)
    return lambda scope: evaluate_ast(tree, scope)


class _Parser:
    def __init__(self, source: str, allowed_names: set[str]) -> None:
        self.tokens = _insert_implicit_multiplication(_tokenize(source))
        self.index = 0
        self.allowed_names = allowed_names

    def peek(self) -> dict[str, Any] | None:
        if self.index >= len(self.tokens):
            return None
        return self.tokens[self.index]

    def consume(self) -> dict[str, Any]:
        token = self.peek()
        if token is None:
            raise ExpressionSyntaxError("Unexpected end of expression")
        self.index += 1
        return token

    def parse_expr(self) -> AstNode:
        node = self.parse_term()
        while self.peek() and self.peek()["kind"] == "op" and self.peek()["value"] in {"+", "-"}:
            op = self.consume()["value"]
            node = {"type": "binary", "op": op, "left": node, "right": self.parse_term()}
        return node

    def parse_term(self) -> AstNode:
        node = self.parse_power()
        while self.peek() and self.peek()["kind"] == "op" and self.peek()["value"] in {"*", "/"}:
            op = self.consume()["value"]
            node = {"type": "binary", "op": op, "left": node, "right": self.parse_power()}
        return node

    def parse_power(self) -> AstNode:
        left = self.parse_unary()
        if self.peek() and self.peek()["kind"] == "op" and self.peek()["value"] == "^":
            self.consume()
            return {"type": "binary", "op": "^", "left": left, "right": self.parse_power()}
        return left

    def parse_unary(self) -> AstNode:
        if self.peek() and self.peek()["kind"] == "op" and self.peek()["value"] == "-":
            self.consume()
            return {"type": "unary", "op": "-", "argument": self.parse_unary()}
        return self.parse_primary()

    def parse_primary(self) -> AstNode:
        token = self.peek()
        if token is None:
            raise ExpressionSyntaxError("Unexpected end of expression")
        if token["kind"] == "number":
            self.consume()
            return {"type": "number", "value": token["value"]}
        if token["kind"] == "name":
            self.consume()
            nxt = self.peek()
            if nxt and nxt["kind"] == "op" and nxt["value"] == "(":
                if token["value"] not in ALLOWED_FUNCTIONS:
                    raise ExpressionSyntaxError(f"Function is not allowed: {token['value']}")
                self.consume()
                argument = self.parse_expr()
                close = self.consume()
                if close["kind"] != "op" or close["value"] != ")":
                    raise ExpressionSyntaxError("Expected closing parenthesis")
                return {"type": "call", "name": token["value"], "argument": argument}
            if token["value"] not in self.allowed_names and token["value"] not in ALLOWED_CONSTANTS:
                raise ExpressionSyntaxError(f"Name is not allowed: {token['value']}")
            return {"type": "name", "name": token["value"]}
        if token["kind"] == "op" and token["value"] == "(":
            self.consume()
            inner = self.parse_expr()
            close = self.consume()
            if close["kind"] != "op" or close["value"] != ")":
                raise ExpressionSyntaxError("Expected closing parenthesis")
            return inner
        raise ExpressionSyntaxError("Unexpected token")


def _tokenize(source: str) -> list[dict[str, Any]]:
    tokens: list[dict[str, Any]] = []
    i = 0
    while i < len(source):
        ch = source[i]
        if ch in " \t\n":
            i += 1
            continue
        if ch.isdigit() or ch == ".":
            match = NUMBER_RE.match(source, i)
            if not match:
                raise ExpressionSyntaxError(f"Invalid number at position {i}")
            tokens.append({"kind": "number", "value": float(match.group(0))})
            i = match.end()
            continue
        if ch.isalpha() or ch == "_":
            match = IDENT_RE.match(source, i)
            if not match:
                raise ExpressionSyntaxError(f"Invalid name at position {i}")
            tokens.append({"kind": "name", "value": match.group(0)})
            i = match.end()
            continue
        if ch in "+-*/^(),":
            if ch == "*" and i + 1 < len(source) and source[i + 1] == "*":
                tokens.append({"kind": "op", "value": "^"})
                i += 2
                continue
            tokens.append({"kind": "op", "value": ch})
            i += 1
            continue
        raise ExpressionSyntaxError(f"Unexpected character {ch!r}")
    return tokens


def _insert_implicit_multiplication(tokens: list[dict[str, Any]]) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for current in tokens:
        if output and _should_multiply(output[-1], current):
            output.append({"kind": "op", "value": "*"})
        output.append(current)
    return output


def _is_value_end(token: dict[str, Any]) -> bool:
    return token["kind"] in {"number", "name"} or (token["kind"] == "op" and token["value"] == ")")


def _is_value_start(token: dict[str, Any]) -> bool:
    return token["kind"] in {"number", "name"} or (token["kind"] == "op" and token["value"] == "(")


def _should_multiply(left: dict[str, Any], right: dict[str, Any]) -> bool:
    if left["kind"] == "name" and right["kind"] == "op" and right["value"] == "(":
        return False
    return _is_value_end(left) and _is_value_start(right)


def _assert_depth(node: AstNode, depth: int) -> None:
    if depth > MAX_AST_DEPTH:
        raise ExpressionSyntaxError("Expression is too deeply nested")
    if node["type"] == "unary":
        _assert_depth(node["argument"], depth + 1)
    elif node["type"] == "binary":
        _assert_depth(node["left"], depth + 1)
        _assert_depth(node["right"], depth + 1)
    elif node["type"] == "call":
        _assert_depth(node["argument"], depth + 1)


@dataclass(frozen=True)
class Function2dSpec:
    version: Literal[1]
    kind: Literal["function-2d"]
    expression: str
    domain: tuple[float, float] = (-10.0, 10.0)
    parameters: dict[str, float] = field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"


@dataclass(frozen=True)
class ParametricCurveSpec:
    version: Literal[1]
    kind: Literal["parametric-curve"]
    expression_x: str
    expression_y: str
    domain: tuple[float, float] = (0.0, 2 * math.pi)
    parameters: dict[str, float] = field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"


@dataclass(frozen=True)
class VectorFieldSpec:
    version: Literal[1]
    kind: Literal["vector-field"]
    expression_x: str
    expression_y: str
    domain: tuple[float, float] = (-4.0, 4.0)
    parameters: dict[str, float] = field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"


@dataclass(frozen=True)
class PolarCurveSpec:
    version: Literal[1]
    kind: Literal["polar-curve"]
    expression: str
    domain: tuple[float, float] = (0.0, 2 * math.pi)
    parameters: dict[str, float] = field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"


@dataclass(frozen=True)
class ImplicitCurveSpec:
    version: Literal[1]
    kind: Literal["implicit-curve"]
    expression: str
    domain: tuple[float, float] = (-4.0, 4.0)
    parameters: dict[str, float] = field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"


@dataclass(frozen=True)
class SurfaceSpec:
    version: Literal[1]
    kind: Literal["surface"]
    expression: str
    domain: tuple[float, float] = (-3.0, 3.0)
    parameters: dict[str, float] = field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"


@dataclass(frozen=True)
class GeometrySpec:
    version: Literal[1]
    kind: Literal["geometry"]
    shape: str
    domain: tuple[float, float] = (-5.0, 5.0)
    parameters: dict[str, float] = field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"


@dataclass(frozen=True)
class AnnotationSpec:
    version: Literal[1]
    kind: Literal["annotation"]
    expression: str
    domain: tuple[float, float] = (-10.0, 10.0)
    parameters: dict[str, float] = field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"


Spec = (
    Function2dSpec
    | ParametricCurveSpec
    | PolarCurveSpec
    | ImplicitCurveSpec
    | VectorFieldSpec
    | SurfaceSpec
    | GeometrySpec
    | AnnotationSpec
)


def _xy_expressions(payload: dict[str, Any]) -> tuple[str, str]:
    expr_x = payload.get("expressionX", payload.get("expression_x"))
    expr_y = payload.get("expressionY", payload.get("expression_y"))
    if not isinstance(expr_x, str) or not isinstance(expr_y, str):
        raise ValueError("Missing parametric expressions")
    return expr_x, expr_y


def _theme(payload: dict[str, Any]) -> Literal["dark", "light"]:
    theme = payload.get("theme", "dark")
    if theme not in ("dark", "light"):
        raise ValueError("Invalid theme")
    return theme


def parse_visualization_spec(payload: dict[str, Any]) -> Spec:
    kind = payload.get("kind")
    version = payload.get("version")
    if version != 1:
        raise ValueError("Unsupported visualization version")
    parameters = _check_parameters(dict(payload.get("parameters") or {}))
    theme = _theme(payload)
    if kind == "function-2d":
        expression = payload.get("expression")
        if not isinstance(expression, str):
            raise ValueError("Missing expression")
        domain = _check_domain(tuple(payload.get("domain", (-10.0, 10.0))))
        parse_expression(expression, {"x", *parameters})
        return Function2dSpec(1, "function-2d", expression, domain, parameters, theme)
    if kind == "parametric-curve":
        expression_x, expression_y = _xy_expressions(payload)
        domain = _check_domain(tuple(payload.get("domain", (0.0, 2 * math.pi))))
        allowed = {"t", *parameters}
        parse_expression(expression_x, allowed)
        parse_expression(expression_y, allowed)
        return ParametricCurveSpec(
            1, "parametric-curve", expression_x, expression_y, domain, parameters, theme
        )
    if kind == "polar-curve":
        expression = payload.get("expression")
        if not isinstance(expression, str):
            raise ValueError("Missing expression")
        domain = _check_domain(tuple(payload.get("domain", (0.0, 2 * math.pi))))
        parse_expression(expression, {"t", *parameters})
        return PolarCurveSpec(1, "polar-curve", expression, domain, parameters, theme)
    if kind == "implicit-curve":
        expression = payload.get("expression")
        if not isinstance(expression, str):
            raise ValueError("Missing expression")
        domain = _check_domain(tuple(payload.get("domain", (-4.0, 4.0))))
        parse_expression(expression, {"x", "y", *parameters})
        return ImplicitCurveSpec(1, "implicit-curve", expression, domain, parameters, theme)
    if kind == "vector-field":
        expression_x, expression_y = _xy_expressions(payload)
        domain = _check_domain(tuple(payload.get("domain", (-4.0, 4.0))))
        allowed = {"x", "y", *parameters}
        parse_expression(expression_x, allowed)
        parse_expression(expression_y, allowed)
        return VectorFieldSpec(
            1, "vector-field", expression_x, expression_y, domain, parameters, theme
        )
    if kind == "surface":
        expression = payload.get("expression")
        if not isinstance(expression, str):
            raise ValueError("Missing expression")
        domain = _check_domain(tuple(payload.get("domain", (-3.0, 3.0))))
        parse_expression(expression, {"x", "y", *parameters})
        return SurfaceSpec(1, "surface", expression, domain, parameters, theme)
    if kind == "geometry":
        shape = payload.get("shape")
        if shape not in {
            "circle",
            "ellipse",
            "square",
            "rectangle",
            "triangle",
            "polygon",
            "line",
            "arc",
            "annulus",
            "dot",
        }:
            raise ValueError("Unsupported geometry shape")
        domain = _check_domain(tuple(payload.get("domain", (-5.0, 5.0))))
        return GeometrySpec(1, "geometry", shape, domain, parameters, theme)
    if kind == "annotation":
        expression = payload.get("expression")
        if not isinstance(expression, str):
            raise ValueError("Missing expression")
        domain = _check_domain(tuple(payload.get("domain", (-10.0, 10.0))))
        parse_expression(expression, {"x", *parameters})
        return AnnotationSpec(1, "annotation", expression, domain, parameters, theme)
    raise ValueError("Unsupported visualization kind")


def spec_to_dict(spec: Spec) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "version": spec.version,
        "kind": spec.kind,
        "domain": list(spec.domain),
        "parameters": spec.parameters,
        "theme": spec.theme,
    }
    if isinstance(spec, GeometrySpec):
        payload["shape"] = spec.shape
        return payload
    if isinstance(spec, ParametricCurveSpec | VectorFieldSpec):
        payload["expressionX"] = spec.expression_x
        payload["expressionY"] = spec.expression_y
        return payload
    payload["expression"] = spec.expression
    return payload


def spec_to_canonical_json(spec: Spec) -> str:
    return json.dumps(spec_to_dict(spec), sort_keys=True, separators=(",", ":"))


def content_hash(spec: Spec) -> str:
    return hashlib.sha256(spec_to_canonical_json(spec).encode("utf-8")).hexdigest()


def _check_parameters(value: dict[str, float]) -> dict[str, float]:
    if len(value) > 8:
        raise ValueError("Too many parameters")
    checked: dict[str, float] = {}
    for key, raw in value.items():
        if not NAME_RE.match(key):
            raise ValueError("Parameter names must be a single lowercase letter")
        number = float(raw)
        if not math.isfinite(number) or number < PARAM_MIN or number > PARAM_MAX:
            raise ValueError("Parameter out of range")
        checked[key] = number
    return checked


def _check_domain(value: tuple[float, ...] | list[float]) -> tuple[float, float]:
    if len(value) != 2:
        raise ValueError("Invalid domain")
    start, end = float(value[0]), float(value[1])
    if not math.isfinite(start) or not math.isfinite(end) or start >= end or end - start > 40:
        raise ValueError("Invalid domain")
    return (start, end)
