from pydantic_settings import BaseSettings, SettingsConfigDict

from src.settings import ENV_PATH


class TestSettings(BaseSettings):
    """Настройки тестовой БД и Redis.

    Живут в tests/, а не в src/: приложению они не нужны, и без них
    продакшн не должен падать на импорте.
    """

    TEST_DB_USER: str
    TEST_DB_PASSWORD: str
    TEST_DB_HOST: str
    TEST_DB_PORT: int
    TEST_DB_NAME: str
    # Та же инстанция Redis, но другая логическая БД: тесты очищают её целиком
    TEST_REDIS_URL: str = "redis://127.0.0.1:6379/1"

    @property
    def get_db_test_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.TEST_DB_USER}:{self.TEST_DB_PASSWORD}@"
            f"{self.TEST_DB_HOST}:{self.TEST_DB_PORT}/{self.TEST_DB_NAME}"
        )

    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore",
    )


test_settings = TestSettings()
