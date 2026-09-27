from unittest.mock import AsyncMock

from src.main import app
from src.redis_client import get_redis


async def test_health_does_not_need_token(client):
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_ready_checks_dependencies(client):
    response = await client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


async def test_ready_returns_503_when_redis_is_down(client):
    # Redis, который падает на PING: так выглядит недоступная зависимость
    broken_redis = AsyncMock()
    broken_redis.ping.side_effect = ConnectionError("Redis недоступен")
    app.dependency_overrides[get_redis] = lambda: broken_redis

    try:
        response = await client.get("/ready")
    finally:
        app.dependency_overrides.pop(get_redis, None)

    assert response.status_code == 503
    assert response.json() == {"detail": "Зависимости недоступны"}
