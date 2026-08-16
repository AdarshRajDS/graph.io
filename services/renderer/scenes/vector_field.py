import os

import numpy as np
from manim import BLUE, Arrow, Axes, Create, FadeIn, Scene

from worker.axis_config import AXIS_CONFIG
from worker.scene_builder import load_spec, vector_evaluator


class VectorFieldScene(Scene):
    def construct(self) -> None:
        spec = load_spec(os.environ["JOB_SPEC_PATH"])
        fx, fy = vector_evaluator(spec)
        lo, hi = spec.domain
        axes = Axes(
            x_range=[lo, hi, 1],
            y_range=[lo, hi, 1],
            x_length=8,
            y_length=8,
            axis_config=AXIS_CONFIG,
        )
        self.play(FadeIn(axes), run_time=0.2)
        arrows = []
        for x in np.linspace(lo + 0.5, hi - 0.5, 8):
            for y in np.linspace(lo + 0.5, hi - 0.5, 8):
                vx, vy = fx(x, y), fy(x, y)
                start = axes.c2p(x, y)
                end = axes.c2p(x + 0.25 * vx, y + 0.25 * vy)
                arrows.append(
                    Arrow(
                        start,
                        end,
                        buff=0,
                        stroke_width=2,
                        color=BLUE,
                        max_tip_length_to_length_ratio=0.2,
                    )
                )
        self.play(*[Create(arrow) for arrow in arrows], run_time=0.5)
        self.wait(0.1)
