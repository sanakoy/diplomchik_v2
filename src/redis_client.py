from redis.asyncio import Redis

from src.settings import settings

# Один клиент на всё приложение: внутри него пул соединений.
# Подключение ленивое — первое реальное соединение откроется при первой команде
redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis() -> Redis:
    return redis_client
