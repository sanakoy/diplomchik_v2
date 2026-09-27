from fastapi import APIRouter, Depends, HTTPException
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_session
from src.redis_client import get_redis

health = APIRouter()


@health.get("/health", summary="Жив ли процесс")
async def liveness() -> dict[str, str]:
    """Проверка без обращения к БД и Redis.

    По ней оркестратор решает, не завис ли процесс и не пора ли его перезапустить.
    Если бы она ходила в БД, недоступная база приводила бы к бесконечным
    перезапускам приложения, которое само по себе исправно.
    """
    return {"status": "ok"}


@health.get(
    "/ready",
    summary="Готов ли обслуживать запросы",
    responses={503: {"description": "Зависимости недоступны"}},
)
async def readiness(
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> dict[str, str]:
    """Проверка зависимостей: БД и Redis.

    По ней балансировщик решает, слать ли на этот экземпляр трафик.
    """
    try:
        await session.execute(text("SELECT 1"))
        await redis.ping()
    except Exception as err:
        raise HTTPException(status_code=503, detail="Зависимости недоступны") from err

    return {"status": "ready"}
