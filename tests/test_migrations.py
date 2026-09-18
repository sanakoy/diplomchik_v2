from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory

import src  # noqa: F401 — регистрирует все модели в Base.metadata
from src.database import Base
from tests.utils import TEST_ENGINE, run_alembic


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
