import math
import os

from manim import BLUE, Axes, Create, FadeIn, ParametricFunction, Scene

from worker.axis_config import AXIS_CONFIG
from worker.scene_builder import load_spec, polar_evaluator


class PolarCurveScene(Scene):
    def construct(self) -> None:
        spec = load_spec(os.environ["JOB_SPEC_PATH"])
        radius = polar_evaluator(spec)
        t_min, t_max = spec.domain
        axes = Axes(
            x_range=[-5, 5, 1],
            y_range=[-5, 5, 1],
            x_length=8,
            y_length=8,
            axis_config=AXIS_CONFIG,
        )

        def point(t: float):
            r = radius(t)
            return axes.c2p(r * math.cos(t), r * math.sin(t))

        curve = ParametricFunction(point, t_range=[t_min, t_max], color=BLUE)
        self.play(FadeIn(axes), run_time=0.2)
        self.play(Create(curve), run_time=0.5)
        self.wait(0.1)
