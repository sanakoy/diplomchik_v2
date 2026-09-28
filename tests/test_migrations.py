from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import text

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


async def insert_category(user_id: int, name: str, **columns) -> int:
    """Категория обычным SQL: модель описывает схему head, а тест работает
    со схемой до миграции, где колонок модели может ещё не быть."""
    values = {"name": name, "is_profit": False, "user_id": user_id, **columns}
    names = ", ".join(values)
    params = ", ".join(f":{key}" for key in values)
    async with TEST_ENGINE.begin() as conn:
        result = await conn.execute(
            text(f"INSERT INTO category ({names}) VALUES ({params}) RETURNING id"),
            values,
        )
        return result.scalar_one()


async def migrate_from(revision: str):
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(run_alembic, command.downgrade, revision)


async def migrate_to_head():
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(run_alembic, command.upgrade, "head")


async def test_unique_category_name_migration_renames_duplicates(create_user):
    user = await create_user()
    other_user = await create_user()
    # Схема до индекса уникальности: дубли там ещё можно создать
    await migrate_from("b50b4d255fab")
    try:
        first = await insert_category(user.id, "Кафе")
        duplicate = await insert_category(user.id, "кафе")
        long_duplicate_base = await insert_category(user.id, "к" * 80)
        long_duplicate = await insert_category(user.id, "К" * 80)
        # Не дубли: другой тип и другой пользователь
        profit = await insert_category(user.id, "Кафе", is_profit=True)
        other = await insert_category(other_user.id, "Кафе")
    finally:
        await migrate_to_head()

    assert (await get_obj(Category, first)).name == "Кафе"
    assert (await get_obj(Category, duplicate)).name == f"кафе ({duplicate})"
    assert (await get_obj(Category, long_duplicate_base)).name == "к" * 80
    renamed = (await get_obj(Category, long_duplicate)).name
    # Суффикс не выводит имя за пределы колонки String(80)
    assert renamed == "К" * 60 + f" ({long_duplicate})"
    assert (await get_obj(Category, profit)).name == "Кафе"
    assert (await get_obj(Category, other)).name == "Кафе"


async def test_icon_migration_keeps_icon_keys_and_drops_image_paths(create_user):
    user = await create_user()
    # Схема до переименования: колонка ещё называется image_url
    await migrate_from("240792155a36")
    try:
        old_path = await insert_category(
            user.id, "Продукты", image_url="/static/img/food.png"
        )
        icon_key = await insert_category(user.id, "Кафе", image_url="coffee")
        empty = await insert_category(user.id, "Связь", image_url=None)
    finally:
        await migrate_to_head()

    # Путь к картинке старого фронта — не ключ иконки: обнуляется
    assert (await get_obj(Category, old_path)).icon is None
    assert (await get_obj(Category, icon_key)).icon == "coffee"
    assert (await get_obj(Category, empty)).icon is None
