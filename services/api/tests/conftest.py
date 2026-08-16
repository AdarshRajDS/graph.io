import pytest
from fastapi.testclient import TestClient

from app.config import Settings, clear_settings_cache
from app.main import create_app


@pytest.fixture
def settings() -> Settings:
    return Settings(
        database_url="postgresql+psycopg://mathvis:mathvis_dev@localhost:5432/mathvis",
        redis_url="redis://localhost:6379/0",
        api_host="127.0.0.1",
        api_port=8000,
    )


@pytest.fixture
def client(settings: Settings, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("DATABASE_URL", settings.database_url)
    monkeypatch.setenv("REDIS_URL", str(settings.redis_url))
    clear_settings_cache()
    return TestClient(create_app(settings))
