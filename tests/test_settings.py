import pytest
from alembic.config import Config
from sqlalchemy.engine import make_url

from src.settings import Settings

# Символы, которые в URL имеют особый смысл: @ отделяет хост, : — порт,
# / — базу, % начинает экранированный символ, # — фрагмент
TRICKY_PASSWORDS = ["pa@ss", "pa:ss", "pa/ss", "pa%ss", "pa#ss", "смените-меня"]


def make_settings(password: str) -> Settings:
    return Settings(
        _env_file=None,
        DB_USER="user",
        DB_PASSWORD=password,
        DB_HOST="127.0.0.1",
        DB_PORT=5435,
        DB_NAME="db",
        SECRET_TOKEN_KEY="secret",
        ALGORITHM="HS256",
        ACCESS_TOKEN_EXPIRE_MINUTES=15,
        REFRESH_TOKEN_EXPIRE_DAYS=30,
        SERVICE_URL="http://localhost:8000",
    )


@pytest.mark.parametrize("password", TRICKY_PASSWORDS)
def test_db_url_keeps_password_with_special_chars(password):
    url = make_settings(password).get_db_url

    # URL, собранный в строку и разобранный обратно, должен дать тот же пароль и хост
    parsed = make_url(url.render_as_string(hide_password=False))

    assert parsed.password == password
    assert (parsed.host, parsed.port, parsed.database) == ("127.0.0.1", 5435, "db")


@pytest.mark.parametrize("password", TRICKY_PASSWORDS)
def test_alembic_config_keeps_password_with_special_chars(password):
    # Тот же путь, что в migrations/env.py: configparser внутри Alembic
    # трактует % как подстановку, поэтому % нужно удваивать
    url = make_settings(password).get_db_url
    config = Config()
    config.set_main_option(
        "sqlalchemy.url",
        url.render_as_string(hide_password=False).replace("%", "%%"),
    )

    assert make_url(config.get_main_option("sqlalchemy.url")).password == password
