import pytest

from src.auth.jwt_utils import create_access_token, create_refresh_token, jwt_decode
from tests.utils import auth_headers

PROTECTED_ENDPOINTS = [
    ("GET", "/api/v1/categories/spending"),
    ("GET", "/api/v1/categories/profit"),
    ("GET", "/api/v1/categories/statistic?operation=spending&year=2026&month=9"),
    ("POST", "/api/v1/categories/create"),
    ("PATCH", "/api/v1/categories/update/1"),
    ("DELETE", "/api/v1/categories/delete/1"),
    ("GET", "/api/v1/operations"),
    ("POST", "/api/v1/operations/create"),
    ("PATCH", "/api/v1/operations/update/1"),
    ("DELETE", "/api/v1/operations/delete/1"),
]


async def test_get_access_token(client):
    response = await client.get("/api/v1/auth/access-token", params={"user_id": 5})

    assert response.status_code == 200
    payload = jwt_decode(response.json())
    assert payload["sub"] == "5"
    assert payload["type"] == "access"


async def test_get_access_token_without_user_id(client):
    response = await client.get("/api/v1/auth/access-token")

    assert response.status_code == 422


@pytest.mark.parametrize("method, url", PROTECTED_ENDPOINTS)
async def test_protected_endpoint_without_token(client, method, url):
    response = await client.request(method, url)

    # Без заголовка Authorization HTTPBearer в текущей версии FastAPI отвечает 403
    assert response.status_code == 403


async def test_invalid_token(client):
    response = await client.get(
        "/api/v1/operations", headers={"Authorization": "Bearer not-a-jwt"}
    )

    assert response.status_code == 401


async def test_refresh_token_is_rejected(client, create_user):
    user = await create_user()
    headers = {"Authorization": f"Bearer {create_refresh_token(str(user.id))}"}

    response = await client.get("/api/v1/operations", headers=headers)

    assert response.status_code == 401


async def test_valid_token(client, create_user):
    user = await create_user()

    response = await client.get("/api/v1/operations", headers=auth_headers(user))

    assert response.status_code == 200


@pytest.mark.xfail(
    reason="get_current_user_by_access_token не проверяет, что пользователь найден: "
    "UserToken.model_validate(None) падает с 500"
)
async def test_token_of_nonexistent_user(client):
    headers = {"Authorization": f"Bearer {create_access_token('999')}"}

    response = await client.get("/api/v1/operations", headers=headers)

    assert response.status_code == 401
