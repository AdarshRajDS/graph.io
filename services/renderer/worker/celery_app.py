import os

from celery import Celery


def create_celery() -> Celery:
    broker = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
    backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
    application = Celery(
        "math-vis-renderer",
        broker=broker,
        backend=backend,
        include=["worker.tasks"],
    )
    application.conf.update(
        task_default_queue="renders",
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        worker_hijack_root_logger=False,
    )
    return application


celery_app = create_celery()
