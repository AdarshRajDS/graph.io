import os

from manim import BLUE, Create, FadeIn, Surface, ThreeDAxes, ThreeDScene

from worker.axis_config import AXIS_CONFIG
from worker.scene_builder import implicit_evaluator, load_spec


class SurfaceScene(ThreeDScene):
    def construct(self) -> None:
        spec = load_spec(os.environ["JOB_SPEC_PATH"])
        fn = implicit_evaluator(spec)
        lo, hi = spec.domain
        axes = ThreeDAxes(
            x_range=[lo, hi, 1],
            y_range=[lo, hi, 1],
            z_range=[-4, 4, 1],
            axis_config=AXIS_CONFIG,
        )
        surface = Surface(
            lambda u, v: axes.c2p(u, v, fn(u, v)),
            u_range=[lo, hi],
            v_range=[lo, hi],
            resolution=(16, 16),
        )
        surface.set_color(BLUE)
        self.set_camera_orientation(phi=1.2, theta=-0.6)
        self.play(FadeIn(axes), run_time=0.2)
        self.play(Create(surface), run_time=0.6)
        self.wait(0.1)
