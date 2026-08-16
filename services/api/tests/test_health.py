from unittest.mock import MagicMock

from fastapi.testclient import TestClient


def test_health_ok(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_ok_when_dependencies_respond(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr("app.main.database_is_ready", lambda engine: True)
    monkeypatch.setattr("app.main.redis_is_ready", lambda redis: True)
    monkeypatch.setattr("app.main.create_db_engine", lambda settings: MagicMock())
    monkeypatch.setattr("app.main.create_redis_client", lambda settings: MagicMock())
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": True, "redis": True}


def test_ready_unavailable_when_database_down(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr("app.main.database_is_ready", lambda engine: False)
    monkeypatch.setattr("app.main.redis_is_ready", lambda redis: True)
    monkeypatch.setattr("app.main.create_db_engine", lambda settings: MagicMock())
    monkeypatch.setattr("app.main.create_redis_client", lambda settings: MagicMock())
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["detail"]["database"] is False
