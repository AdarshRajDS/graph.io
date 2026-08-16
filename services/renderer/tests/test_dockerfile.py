from pathlib import Path

DOCKERFILE = Path(__file__).resolve().parents[1] / "Dockerfile"


def test_renderer_image_installs_wheels_only() -> None:
    text = DOCKERFILE.read_text(encoding="utf-8")
    assert "FROM manimcommunity/manim:v0.21.0" in text
    assert "--only-binary=:all:" in text
    assert "pydantic==" not in text
