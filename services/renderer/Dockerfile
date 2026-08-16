FROM manimcommunity/manim:v0.21.0

USER root

WORKDIR /app

# Install ffmpeg before copying app files so scene/worker edits keep this layer cached.
RUN apt-get update \
    && apt-get install --no-install-recommends -y ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml /app/pyproject.toml
COPY worker /app/worker
COPY scenes /app/scenes

# manimcommunity/manim:v0.21.0 currently ships CPython 3.14 and no C compiler.
# Wheels-only install prevents pip from compiling packages such as pydantic-core.
RUN pip install --no-cache-dir --only-binary=:all: \
        celery[redis]==5.4.0 \
        redis==5.2.1 \
        boto3==1.36.16 \
        sqlalchemy==2.0.37 \
        "psycopg[binary]==3.2.13" \
    && chown -R manimuser:manimuser /app

USER manimuser

CMD ["celery", "-A", "worker.celery_app:celery_app", "worker", "--loglevel=INFO", "-Q", "renders"]
