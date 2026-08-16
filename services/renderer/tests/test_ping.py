from worker.celery_app import celery_app
from worker.tasks import ping


def test_celery_app_queue() -> None:
    assert celery_app.conf.task_default_queue == "renders"


def test_ping_returns_pong() -> None:
    assert ping() == "pong"
