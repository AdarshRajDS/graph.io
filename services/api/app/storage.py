from datetime import timedelta

import boto3
from botocore.client import BaseClient, Config

from app.config import Settings


def create_s3_client(settings: Settings, public: bool = False) -> BaseClient:
    endpoint = settings.s3_public_endpoint_url if public else settings.s3_endpoint_url
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(
            signature_version="s3v4",
            connect_timeout=1,
            read_timeout=3,
            retries={"max_attempts": 1},
        ),
    )


def ensure_bucket(settings: Settings) -> None:
    client = create_s3_client(settings)
    buckets = {item["Name"] for item in client.list_buckets().get("Buckets", [])}
    if settings.s3_bucket not in buckets:
        client.create_bucket(Bucket=settings.s3_bucket)


def presign(settings: Settings, key: str | None) -> str | None:
    if not key:
        return None
    client = create_s3_client(settings, public=True)
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": key},
        ExpiresIn=settings.signed_url_ttl_seconds,
    )


def presign_ttl(settings: Settings) -> timedelta:
    return timedelta(seconds=settings.signed_url_ttl_seconds)
