import pytest
from pydantic import ValidationError

from app.config import Settings


def test_settings_require_database_and_redis(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)
    with pytest.raises(ValidationError):
        Settings()


def test_settings_load_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://mathvis:mathvis_dev@localhost:5432/mathvis")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    loaded = Settings(_env_file=None)
    assert loaded.api_port == 8000
    assert str(loaded.redis_url) == "redis://localhost:6379/0"
