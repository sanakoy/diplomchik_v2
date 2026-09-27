from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory

import src  # noqa: F401 — регистрирует все модели в Base.metadata
from src.category.models import Category
from src.database import Base
from tests.utils import TEST_ENGINE, get_obj, run_alembic


def get_revisions() -> list[str]:
    script = ScriptDirectory.from_config(Config("alembic.ini"))
    # walk_revisions идёт от head к base, нам нужен обратный порядок
    return [revision.revision for revision in reversed(list(script.walk_revisions()))]


async def test_models_match_migrations():
    # БД уже на head (фикстура prepare_database). Пустой diff значит,
    # что после изменения моделей не забыли сгенерировать миграцию
    async with TEST_ENGINE.connect() as conn:
        diff = await conn.run_sync(
            lambda sync_conn: compare_metadata(
                MigrationContext.configure(sync_conn), Base.metadata
            )
        )

    assert diff == []


async def test_migrations_stairway():
    # Каждую миграцию применяем, откатываем и применяем снова:
    # ловит ошибки в downgrade и миграции, которые нельзя повторить после отката
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(run_alembic, command.downgrade, "base")

    for revision in get_revisions():
        for alembic_command, target in [
            (command.upgrade, revision),
            (command.downgrade, "-1"),
            (command.upgrade, revision),
        ]:
            async with TEST_ENGINE.begin() as conn:
                await conn.run_sync(run_alembic, alembic_command, target)


async def test_unique_category_name_migration_renames_duplicates(
    create_user, create_category
):
    # Схема до индекса уникальности: дубли там ещё можно создать
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(run_alembic, command.downgrade, "b50b4d255fab")
    try:
        user = await create_user()
        first = await create_category(user, name="Кафе")
        duplicate = await create_category(user, name="кафе")
        long_duplicate_base = await create_category(user, name="к" * 80)
        long_duplicate = await create_category(user, name="К" * 80)
        # Не дубли: другой тип и другой пользователь
        profit = await create_category(user, name="Кафе", is_profit=True)
        other_user = await create_category(await create_user(), name="Кафе")
    finally:
        async with TEST_ENGINE.begin() as conn:
            await conn.run_sync(run_alembic, command.upgrade, "head")

    assert (await get_obj(Category, first.id)).name == "Кафе"
    assert (await get_obj(Category, duplicate.id)).name == f"кафе ({duplicate.id})"
    assert (await get_obj(Category, long_duplicate_base.id)).name == "к" * 80
    renamed = (await get_obj(Category, long_duplicate.id)).name
    # Суффикс не выводит имя за пределы колонки String(80)
    assert renamed == "К" * 60 + f" ({long_duplicate.id})"
    assert (await get_obj(Category, profit.id)).name == "Кафе"
    assert (await get_obj(Category, other_user.id)).name == "Кафе"
