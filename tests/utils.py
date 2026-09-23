from collections.abc import Callable
from datetime import datetime, timedelta

from alembic.config import Config
from redis.asyncio import Redis
from sqlalchemy import Connection, text
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    async_sessionmaker,
    create_async_engine,
)

from src.auth.jwt_utils import create_access_token
from src.auth.models import User
from src.settings import settings
from tests.settings import test_settings

# Тесты удаляют схему БД целиком, поэтому основную БД трогать нельзя ни при каких настройках
if test_settings.get_db_test_url == settings.get_db_url:
    raise RuntimeError("TEST_DB_* указывает на основную БД")
# Тесты очищают Redis целиком (FLUSHDB), поэтому он тоже должен быть отдельным
if test_settings.TEST_REDIS_URL == settings.REDIS_URL:
    raise RuntimeError("TEST_REDIS_URL совпадает с REDIS_URL")

TEST_ENGINE = create_async_engine(test_settings.get_db_test_url)
TEST_SESSION_MAKER = async_sessionmaker(TEST_ENGINE, expire_on_commit=False)
TEST_REDIS = Redis.from_url(test_settings.TEST_REDIS_URL, decode_responses=True)


def run_alembic(
    connection: Connection,
    alembic_command: Callable[[Config, str], None],
    revision: str,
) -> None:
    config = Config("alembic.ini")
    # migrations/env.py возьмёт это подключение вместо URL основной БД из settings
    config.attributes["connection"] = connection
    alembic_command(config, revision)


async def reset_schema(connection: AsyncConnection) -> None:
    # В отличие от drop_all удаляет и alembic_version, и таблицы, которых уже нет в моделях
    await connection.execute(text("DROP SCHEMA public CASCADE"))
    await connection.execute(text("CREATE SCHEMA public"))


async def add_obj(obj):
    async with TEST_SESSION_MAKER() as session:
        session.add(obj)
        await session.commit()
        await session.refresh(obj)
    return obj


async def get_obj(model, obj_id: int):
    # Отдельная сессия на каждый вызов, чтобы не получить закэшированный объект
    async with TEST_SESSION_MAKER() as session:
        return await session.get(model, obj_id)


def auth_headers(user: User) -> dict:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def current_month_date(day: int = 10) -> datetime:
    now = datetime.now()
    return datetime(now.year, now.month, day, 12, 0)


def previous_month_date(day: int = 15) -> datetime:
    first_day = datetime.now().replace(
        day=1, hour=12, minute=0, second=0, microsecond=0
    )
    return (first_day - timedelta(days=1)).replace(day=day)
