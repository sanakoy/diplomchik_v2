import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from src.auth.models import RefreshToken
from src.main import app
from src.settings import settings
from tests.utils import TEST_REDIS, TEST_SESSION_MAKER

PASSWORD = "correct-horse-battery"


async def login(client, email: str, password: str = PASSWORD):
    return await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )


@pytest.fixture
def small_limits_for_email(monkeypatch):
    # Маленький лимит по email, чтобы не гонять bcrypt десятки раз
    monkeypatch.setattr(settings, "LOGIN_MAX_ATTEMPTS_PER_EMAIL", 3)
    # Лимит по IP фактически выключен: все тесты идут с одного адреса,
    # и он срабатывал бы раньше проверяемого лимита по email
    monkeypatch.setattr(settings, "LOGIN_MAX_ATTEMPTS_PER_IP", 10_000)


def assert_too_many_requests(response, window: int) -> None:
    assert response.status_code == 429
    assert response.json() == {
        "detail": "Слишком много попыток входа, попробуйте позже"
    }
    # Клиенту сказано, через сколько секунд пробовать снова
    assert 1 <= int(response.headers["retry-after"]) <= window
    assert "set-cookie" not in response.headers


# ---------- Лимит по email ----------


async def test_email_blocked_after_too_many_attempts(
    client, create_user, small_limits_for_email
):
    await create_user(email="user@example.com", password=PASSWORD)
    for _ in range(3):
        response = await login(client, "user@example.com", "wrong-password")
        assert response.status_code == 401

    # Даже верный пароль не пускает, пока окно не истекло
    response = await login(client, "user@example.com", PASSWORD)

    assert_too_many_requests(response, settings.LOGIN_EMAIL_WINDOW_SECONDS)
    # Ни одной сессии не создано: отказ случился до выдачи токенов
    async with TEST_SESSION_MAKER() as session:
        assert await session.scalar(select(func.count()).select_from(RefreshToken)) == 0


async def test_successful_login_resets_email_attempts(
    client, create_user, small_limits_for_email
):
    await create_user(email="user@example.com", password=PASSWORD)
    for _ in range(2):
        await login(client, "user@example.com", "wrong-password")
    assert (await login(client, "user@example.com")).status_code == 200

    # После успешного входа снова доступны все 3 попытки
    for _ in range(3):
        response = await login(client, "user@example.com", "wrong-password")
        assert response.status_code == 401
    response = await login(client, "user@example.com", "wrong-password")
    assert_too_many_requests(response, settings.LOGIN_EMAIL_WINDOW_SECONDS)


async def test_email_limit_does_not_affect_other_emails(
    client, create_user, small_limits_for_email
):
    await create_user(email="victim@example.com", password=PASSWORD)
    await create_user(email="other@example.com", password=PASSWORD)
    for _ in range(4):
        await login(client, "victim@example.com", "wrong-password")
    assert (await login(client, "victim@example.com")).status_code == 429

    # Другой аккаунт с того же IP входит как обычно
    response = await login(client, "other@example.com")

    assert response.status_code == 200


async def test_nonexistent_email_is_limited_the_same(client, small_limits_for_email):
    # Иначе по отсутствию 429 можно было бы понять, что email не зарегистрирован
    for _ in range(3):
        response = await login(client, "nobody@example.com")
        assert response.status_code == 401

    response = await login(client, "nobody@example.com")

    assert_too_many_requests(response, settings.LOGIN_EMAIL_WINDOW_SECONDS)


# ---------- Лимит по IP ----------


async def test_ip_blocked_after_too_many_attempts(client, create_user, monkeypatch):
    monkeypatch.setattr(settings, "LOGIN_MAX_ATTEMPTS_PER_IP", 3)
    await create_user(email="user@example.com", password=PASSWORD)
    # Перебор одного пароля по разным аккаунтам: лимит по email не срабатывает
    for i in range(3):
        response = await login(client, f"user_{i}@example.com")
        assert response.status_code == 401

    response = await login(client, "user@example.com")

    assert_too_many_requests(response, settings.LOGIN_IP_WINDOW_SECONDS)
    # С другого IP тот же пользователь входит как обычно
    transport = ASGITransport(
        app=app, raise_app_exceptions=False, client=("10.0.0.2", 12345)
    )
    async with AsyncClient(transport=transport, base_url="https://test") as other_ip:
        other_response = await login(other_ip, "user@example.com")
    assert other_response.status_code == 200


async def test_successful_logins_do_not_consume_ip_limit(
    client, create_user, monkeypatch
):
    # Считаются неудачные попытки: за общим IP (офис, мобильный оператор) обычные
    # удачные входы не должны приближать всех к блокировке
    monkeypatch.setattr(settings, "LOGIN_MAX_ATTEMPTS_PER_IP", 3)
    await create_user(email="user@example.com", password=PASSWORD)
    for _ in range(5):
        assert (await login(client, "user@example.com")).status_code == 200

    # Лимит по IP по-прежнему полный: три неудачи, четвёртая блокируется
    for i in range(3):
        assert (await login(client, f"user_{i}@example.com")).status_code == 401
    response = await login(client, "nobody@example.com")

    assert_too_many_requests(response, settings.LOGIN_IP_WINDOW_SECONDS)


# ---------- Окно ----------


async def test_counters_expire(client, small_limits_for_email):
    await login(client, "user@example.com", "wrong-password")

    # У счётчиков есть срок жизни, то есть блокировка не вечная
    email_ttl = await TEST_REDIS.ttl("login:email:user@example.com")
    assert 0 < email_ttl <= settings.LOGIN_EMAIL_WINDOW_SECONDS
    assert 0 < await TEST_REDIS.ttl("login:ip:127.0.0.1")


async def test_new_attempts_do_not_extend_window(client, small_limits_for_email):
    await login(client, "user@example.com", "wrong-password")
    # Будто с первой попытки прошло много времени и до конца окна осталось 100 с
    await TEST_REDIS.expire("login:email:user@example.com", 100)

    await login(client, "user@example.com", "wrong-password")

    # Окно отсчитывается от первой попытки: новая попытка не вернула TTL к 15 минутам.
    # Иначе каждая ошибка продлевала бы счётчик, и пользователь, ошибающийся
    # раз в 10 минут, копил бы попытки бесконечно и в итоге упёрся бы в блокировку
    assert await TEST_REDIS.ttl("login:email:user@example.com") <= 100


async def test_retry_after_is_readable_by_frontend(
    client, create_user, small_limits_for_email
):
    # CORS разрешает JS читать лишь несколько заголовков ответа, остальные нужно
    # перечислить в expose_headers — иначе фронт не узнает, когда можно повторить
    await create_user(email="user@example.com", password=PASSWORD)
    for _ in range(4):
        await login(client, "user@example.com", "wrong-password")

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": PASSWORD},
        headers={"Origin": settings.CORS_ORIGINS[0]},
    )

    assert response.status_code == 429
    exposed = response.headers["access-control-expose-headers"].lower()
    assert "retry-after" in exposed
