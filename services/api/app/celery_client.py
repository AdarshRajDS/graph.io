from celery import Celery

from app.config import Settings


def create_celery(settings: Settings) -> Celery:
    application = Celery(
        "math-vis-api",
        broker=settings.broker_url(),
        backend=settings.result_backend(),
    )
    application.conf.update(
        task_default_queue="renders",
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
    )
    return application
