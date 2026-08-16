from functools import lru_cache

from pydantic import Field, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    database_url: str = Field(min_length=1)
    redis_url: RedisDsn
    api_host: str = "0.0.0.0"
    api_port: int = Field(default=8000, ge=1, le=65535)
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None
    cors_origins: str = "http://localhost:3100"
    s3_endpoint_url: str = "http://minio:9000"
    s3_public_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "mathvis_minio"
    s3_secret_key: str = "mathvis_minio_dev"
    s3_bucket: str = "math-vis"
    s3_region: str = "us-east-1"
    render_rate_limit_per_minute: int = 10
    signed_url_ttl_seconds: int = 3600

    def broker_url(self) -> str:
        return self.celery_broker_url or str(self.redis_url)

    def result_backend(self) -> str:
        return self.celery_result_backend or str(self.redis_url)

    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
