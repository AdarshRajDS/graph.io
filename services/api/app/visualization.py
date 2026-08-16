from __future__ import annotations

import hashlib
import json
import math
import re
from collections.abc import Callable
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

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
        self.tokens = _tokenize(source)
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


class Function2dSpec(BaseModel):
    version: Literal[1]
    kind: Literal["function-2d"]
    expression: str
    domain: tuple[float, float] = (-10.0, 10.0)
    parameters: dict[str, float] = Field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, value: dict[str, float]) -> dict[str, float]:
        return _check_parameters(value)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: tuple[float, float]) -> tuple[float, float]:
        return _check_domain(value)

    @model_validator(mode="after")
    def validate_expression(self) -> Function2dSpec:
        parse_expression(self.expression, {"x", *self.parameters})
        return self


class ParametricCurveSpec(BaseModel):
    version: Literal[1]
    kind: Literal["parametric-curve"]
    expression_x: str = Field(alias="expressionX")
    expression_y: str = Field(alias="expressionY")
    domain: tuple[float, float] = (0.0, 2 * math.pi)
    parameters: dict[str, float] = Field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"

    model_config = {"populate_by_name": True}

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, value: dict[str, float]) -> dict[str, float]:
        return _check_parameters(value)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: tuple[float, float]) -> tuple[float, float]:
        return _check_domain(value)

    @model_validator(mode="after")
    def validate_expressions(self) -> ParametricCurveSpec:
        allowed = {"t", *self.parameters}
        parse_expression(self.expression_x, allowed)
        parse_expression(self.expression_y, allowed)
        return self


class VectorFieldSpec(BaseModel):
    version: Literal[1]
    kind: Literal["vector-field"]
    expression_x: str = Field(alias="expressionX")
    expression_y: str = Field(alias="expressionY")
    domain: tuple[float, float] = (-4.0, 4.0)
    parameters: dict[str, float] = Field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"

    model_config = {"populate_by_name": True}

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, value: dict[str, float]) -> dict[str, float]:
        return _check_parameters(value)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: tuple[float, float]) -> tuple[float, float]:
        return _check_domain(value)

    @model_validator(mode="after")
    def validate_expressions(self) -> VectorFieldSpec:
        allowed = {"x", "y", *self.parameters}
        parse_expression(self.expression_x, allowed)
        parse_expression(self.expression_y, allowed)
        return self


class PolarCurveSpec(BaseModel):
    version: Literal[1]
    kind: Literal["polar-curve"]
    expression: str
    domain: tuple[float, float] = (0.0, 2 * math.pi)
    parameters: dict[str, float] = Field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, value: dict[str, float]) -> dict[str, float]:
        return _check_parameters(value)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: tuple[float, float]) -> tuple[float, float]:
        return _check_domain(value)

    @model_validator(mode="after")
    def validate_expression(self) -> PolarCurveSpec:
        parse_expression(self.expression, {"t", *self.parameters})
        return self


class ImplicitCurveSpec(BaseModel):
    version: Literal[1]
    kind: Literal["implicit-curve"]
    expression: str
    domain: tuple[float, float] = (-4.0, 4.0)
    parameters: dict[str, float] = Field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, value: dict[str, float]) -> dict[str, float]:
        return _check_parameters(value)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: tuple[float, float]) -> tuple[float, float]:
        return _check_domain(value)

    @model_validator(mode="after")
    def validate_expression(self) -> ImplicitCurveSpec:
        parse_expression(self.expression, {"x", "y", *self.parameters})
        return self


class SurfaceSpec(BaseModel):
    version: Literal[1]
    kind: Literal["surface"]
    expression: str
    domain: tuple[float, float] = (-3.0, 3.0)
    parameters: dict[str, float] = Field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, value: dict[str, float]) -> dict[str, float]:
        return _check_parameters(value)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: tuple[float, float]) -> tuple[float, float]:
        return _check_domain(value)

    @model_validator(mode="after")
    def validate_expression(self) -> SurfaceSpec:
        parse_expression(self.expression, {"x", "y", *self.parameters})
        return self


class GeometrySpec(BaseModel):
    version: Literal[1]
    kind: Literal["geometry"]
    shape: Literal[
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
    ]
    domain: tuple[float, float] = (-5.0, 5.0)
    parameters: dict[str, float] = Field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, value: dict[str, float]) -> dict[str, float]:
        return _check_parameters(value)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: tuple[float, float]) -> tuple[float, float]:
        return _check_domain(value)


class AnnotationSpec(BaseModel):
    version: Literal[1]
    kind: Literal["annotation"]
    expression: str
    domain: tuple[float, float] = (-10.0, 10.0)
    parameters: dict[str, float] = Field(default_factory=dict)
    theme: Literal["dark", "light"] = "dark"

    @field_validator("parameters")
    @classmethod
    def validate_parameters(cls, value: dict[str, float]) -> dict[str, float]:
        return _check_parameters(value)

    @field_validator("domain")
    @classmethod
    def validate_domain(cls, value: tuple[float, float]) -> tuple[float, float]:
        return _check_domain(value)

    @model_validator(mode="after")
    def validate_expression(self) -> AnnotationSpec:
        parse_expression(self.expression, {"x", *self.parameters})
        return self


VisualizationSpec = (
    Function2dSpec
    | ParametricCurveSpec
    | PolarCurveSpec
    | ImplicitCurveSpec
    | VectorFieldSpec
    | SurfaceSpec
    | GeometrySpec
    | AnnotationSpec
)


def parse_visualization_spec(payload: dict[str, Any]) -> VisualizationSpec:
    if "layers" in payload:
        layers = payload.get("layers")
        if not isinstance(layers, list) or not 1 <= len(layers) <= 8:
            raise ValueError("Invalid layer count")
        parsed = [parse_visualization_spec(layer) for layer in layers]
        return parsed[0]
    kind = payload.get("kind")
    if kind == "function-2d":
        return Function2dSpec.model_validate(payload)
    if kind == "parametric-curve":
        return ParametricCurveSpec.model_validate(payload)
    if kind == "polar-curve":
        return PolarCurveSpec.model_validate(payload)
    if kind == "implicit-curve":
        return ImplicitCurveSpec.model_validate(payload)
    if kind == "vector-field":
        return VectorFieldSpec.model_validate(payload)
    if kind == "surface":
        return SurfaceSpec.model_validate(payload)
    if kind == "geometry":
        return GeometrySpec.model_validate(payload)
    if kind == "annotation":
        return AnnotationSpec.model_validate(payload)
    raise ValueError("Unsupported visualization kind")


def spec_to_canonical_json(spec: VisualizationSpec) -> str:
    return json.dumps(
        spec.model_dump(by_alias=True, mode="json"),
        sort_keys=True,
        separators=(",", ":"),
    )


def content_hash(spec: VisualizationSpec) -> str:
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


def _check_domain(value: tuple[float, float]) -> tuple[float, float]:
    start, end = value
    if not math.isfinite(start) or not math.isfinite(end) or start >= end or end - start > 40:
        raise ValueError("Invalid domain")
    return value
