from worker.celery_app import celery_app


@celery_app.task(name="health.ping")
def ping() -> str:
    return "pong"


@celery_app.task(name="renders.execute", bind=True, time_limit=120, soft_time_limit=110)
def execute(self, render_id: str, spec_payload: dict) -> str:
    from worker.job import execute_render

    execute_render(render_id, spec_payload)
    return render_id
