from redis import Redis

from app.config import Settings


def create_redis_client(settings: Settings) -> Redis:
    return Redis.from_url(str(settings.redis_url), decode_responses=True)


def redis_is_ready(client: Redis) -> bool:
    try:
        return client.ping() is True
    except Exception:
        return False
