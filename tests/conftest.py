from datetime import datetime
from itertools import count

import pytest
from alembic import command
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from src.auth.models import User
from src.auth.password_hashing import get_hashed_password
from src.category.models import Category
from src.database import get_session
from src.main import app
from src.operation.models import Operation
from tests.utils import (
    add_obj,
    current_month_date,
    reset_schema,
    run_alembic,
    TEST_ENGINE,
    TEST_SESSION_MAKER,
)


@pytest.fixture(scope="session")
async def prepare_database():
    # Схема строится миграциями, а не create_all: тесты проверяют ту же БД, что будет на проде
    async with TEST_ENGINE.begin() as conn:
        await reset_schema(conn)
        await conn.run_sync(run_alembic, command.upgrade, "head")
    yield
    # Схему не удаляем: после прогона в БД можно посмотреть данные упавшего теста,
    # чистоту гарантирует reset_schema перед следующим прогоном
    await TEST_ENGINE.dispose()


@pytest.fixture(autouse=True)
async def clean_tables(prepare_database):
    async with TEST_ENGINE.begin() as conn:
        await conn.execute(
            text(
                'TRUNCATE operation, category, refresh_token, "user" '
                "RESTART IDENTITY CASCADE"
            )
        )


async def override_get_session():
    async with TEST_SESSION_MAKER() as session:
        yield session


@pytest.fixture
async def client():
    app.dependency_overrides[get_session] = override_get_session
    try:
        # raise_app_exceptions=False: необработанная ошибка приходит как 500, как у живого сервера
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        # https: httpx, как и браузер, не отправляет Secure-cookie по http
        async with AsyncClient(transport=transport, base_url="https://test") as ac:
            yield ac
    finally:
        # Снимаем только свою подмену: другие тесты могут подменять свои зависимости
        app.dependency_overrides.pop(get_session, None)


# Счётчики общие на весь прогон: имена уникальны, даже если объекты создаются в разных тестах
user_counter = count(1)
category_counter = count(1)
operation_counter = count(1)


@pytest.fixture
def create_user():
    async def _create_user(
        email: str | None = None, password: str | None = None
    ) -> User:
        return await add_obj(
            User(
                email=email or f"user_{next(user_counter)}@example.com",
                # bcrypt медленный, поэтому настоящий хеш считаем, только когда
                # тесту нужен вход по паролю
                hashed_password=get_hashed_password(password) if password else "hash",
            )
        )

    return _create_user


@pytest.fixture
def create_category():
    async def _create_category(
        user: User,
        name: str | None = None,
        is_profit: bool = False,
        image_url: str | None = "/static/img/food.png",
    ) -> Category:
        return await add_obj(
            Category(
                name=name or f"category_{next(category_counter)}",
                is_profit=is_profit,
                image_url=image_url,
                user_id=user.id,
            )
        )

    return _create_category


@pytest.fixture
def create_operation():
    async def _create_operation(
        category: Category,
        sum: float = 100,
        date: datetime | None = None,
        comment: str | None = None,
    ) -> Operation:
        return await add_obj(
            Operation(
                sum=sum,
                date=date or current_month_date(),
                comment=comment or f"operation_{next(operation_counter)}",
                category_id=category.id,
            )
        )

    return _create_operation
