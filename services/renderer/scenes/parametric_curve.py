import os

from manim import BLUE, Axes, Create, FadeIn, ParametricFunction, Scene

from worker.axis_config import AXIS_CONFIG
from worker.scene_builder import load_spec, parametric_evaluator


class ParametricCurveScene(Scene):
    def construct(self) -> None:
        spec = load_spec(os.environ["JOB_SPEC_PATH"])
        fx, fy = parametric_evaluator(spec)
        t_min, t_max = spec.domain
        axes = Axes(
            x_range=[-5, 5, 1],
            y_range=[-5, 5, 1],
            x_length=8,
            y_length=8,
            axis_config=AXIS_CONFIG,
        )
        curve = ParametricFunction(
            lambda t: axes.c2p(fx(t), fy(t)),
            t_range=[t_min, t_max],
            color=BLUE,
        )
        self.play(FadeIn(axes), run_time=0.2)
        self.play(Create(curve), run_time=0.5)
        self.wait(0.1)
