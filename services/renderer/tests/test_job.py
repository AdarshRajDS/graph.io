from pathlib import Path

from worker.job import manim_command, should_encode_webm


def test_manim_command_uses_preview_fps_and_skips_cache() -> None:
    command = manim_command("scenes/function_2d.py", "Function2DScene", Path("/tmp/media"))
    assert command[0] == "manim"
    assert "-ql" in command
    assert command[command.index("--fps") + 1] == "15"
    assert "--disable_caching" in command


def test_webm_is_opt_in() -> None:
    assert should_encode_webm({}) is False
    assert should_encode_webm({"RENDER_WEBM": "1"}) is True
