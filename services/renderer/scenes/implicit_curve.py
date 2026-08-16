import os

from manim import BLUE, Axes, Create, FadeIn, Scene

from worker.axis_config import AXIS_CONFIG
from worker.scene_builder import implicit_evaluator, load_spec


class ImplicitCurveScene(Scene):
    def construct(self) -> None:
        spec = load_spec(os.environ["JOB_SPEC_PATH"])
        fn = implicit_evaluator(spec)
        lo, hi = spec.domain
        axes = Axes(
            x_range=[lo, hi, 1],
            y_range=[lo, hi, 1],
            x_length=8,
            y_length=8,
            axis_config=AXIS_CONFIG,
        )
        graph = axes.plot_implicit_curve(lambda x, y: fn(x, y), color=BLUE)
        self.play(FadeIn(axes), run_time=0.2)
        self.play(Create(graph), run_time=0.5)
        self.wait(0.1)
