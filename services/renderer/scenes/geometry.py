import math
import os

from manim import (
    BLUE,
    Annulus,
    Arc,
    Circle,
    Create,
    Dot,
    Ellipse,
    Line,
    Rectangle,
    RegularPolygon,
    Scene,
    Square,
    Triangle,
)

from worker.scene_builder import load_spec
from worker.visualization import GeometrySpec


def _number(spec: GeometrySpec, name: str, fallback: float) -> float:
    value = spec.parameters.get(name, fallback)
    return fallback if value == 0 and name == "n" else value


class GeometryScene(Scene):
    def construct(self) -> None:
        spec = load_spec(os.environ["JOB_SPEC_PATH"])
        if not isinstance(spec, GeometrySpec):
            raise ValueError("Geometry scene requires a geometry spec")
        shape = spec.shape
        if shape == "circle":
            mob = Circle(radius=max(0.2, _number(spec, "r", 2)), color=BLUE)
        elif shape == "ellipse":
            mob = Ellipse(
                width=2 * max(0.2, _number(spec, "a", 3)),
                height=2 * max(0.2, _number(spec, "b", 1.5)),
                color=BLUE,
            )
        elif shape == "square":
            mob = Square(side_length=max(0.2, _number(spec, "a", 2)), color=BLUE)
        elif shape == "rectangle":
            mob = Rectangle(
                width=max(0.2, _number(spec, "a", 3)),
                height=max(0.2, _number(spec, "b", 1.5)),
                color=BLUE,
            )
        elif shape == "triangle":
            mob = Triangle().scale(max(0.2, _number(spec, "a", 2))).set_color(BLUE)
        elif shape == "polygon":
            sides = max(3, min(12, int(round(_number(spec, "n", 6)))))
            mob = RegularPolygon(n=sides, radius=max(0.2, _number(spec, "a", 2)), color=BLUE)
        elif shape == "line":
            half = max(0.2, _number(spec, "a", 3))
            mob = Line([-half, 0, 0], [half, 0, 0], color=BLUE)
        elif shape == "arc":
            mob = Arc(radius=max(0.2, _number(spec, "r", 2)), angle=math.pi, color=BLUE)
        elif shape == "annulus":
            inner = max(0.1, _number(spec, "a", 1))
            outer = max(inner + 0.1, _number(spec, "b", 2.4))
            mob = Annulus(inner_radius=inner, outer_radius=outer, color=BLUE)
        else:
            mob = Dot(color=BLUE)
        self.play(Create(mob), run_time=0.4)
        self.wait(0.1)
