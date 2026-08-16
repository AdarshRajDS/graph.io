import os

from manim import BLUE, Axes, Create, FadeIn, Scene

from worker.axis_config import AXIS_CONFIG
from worker.scene_builder import function_evaluator, load_spec


class Function2DScene(Scene):
    def construct(self) -> None:
        spec = load_spec(os.environ["JOB_SPEC_PATH"])
        fn = function_evaluator(spec)
        x_min, x_max = spec.domain
        axes = Axes(
            x_range=[x_min, x_max, max(1, (x_max - x_min) / 10)],
            y_range=[-5, 5, 1],
            x_length=10,
            y_length=6,
            axis_config=AXIS_CONFIG,
        )
        graph = axes.plot(lambda x: fn(x), x_range=[x_min, x_max], color=BLUE)
        self.play(FadeIn(axes), run_time=0.2)
        self.play(Create(graph), run_time=0.5)
        self.wait(0.1)
