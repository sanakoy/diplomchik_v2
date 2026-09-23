from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env.local"


class Settings(BaseSettings):
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str

    MODE: str = "DEV"
    SECRET_TOKEN_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    # Secure-cookie браузер шлёт только по HTTPS (для localhost делает исключение).
    # False нужен, только если фронт открывают по http с другого хоста
    REFRESH_COOKIE_SECURE: bool = True

    SERVICE_URL: str

    # 127.0.0.1, а не localhost: на Windows localhost сначала пробует IPv6 (::1),
    # а Redis в docker-compose слушает только IPv4 — каждое подключение ждало бы ~2 с
    REDIS_URL: str = "redis://127.0.0.1:6379/0"

    # Ограничение попыток входа (POST /auth/login)
    # По email: защита конкретного аккаунта от перебора пароля
    LOGIN_MAX_ATTEMPTS_PER_EMAIL: int = 5
    LOGIN_EMAIL_WINDOW_SECONDS: int = 15 * 60
    # По IP: защита от перебора одного пароля по многим аккаунтам (password spraying)
    LOGIN_MAX_ATTEMPTS_PER_IP: int = 20
    LOGIN_IP_WINDOW_SECONDS: int = 5 * 60

    # В .env.local задаётся JSON-списком: CORS_ORIGINS='["http://localhost:5173"]'
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def get_db_url(self):
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@"
            f"{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()
