from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Response, status

from src.auth.authorization import get_current_user_by_access_token
from src.auth.schemas import (
    AccessTokenResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
    UserToken,
)
from src.auth.service import AuthService, get_auth_service
from src.settings import settings

auth = APIRouter()

REFRESH_COOKIE_NAME = "refresh_token"
# Браузер отправляет cookie только на ручки авторизации, а не на каждый запрос к API.
# Должен совпадать с префиксом роутера в src/main.py
REFRESH_COOKIE_PATH = "/api/v1/auth"


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
        # JavaScript не видит cookie: XSS не сможет унести токен
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        # Браузер не приложит cookie к запросу, пришедшему с чужого сайта (защита от CSRF)
        samesite="strict",
    )


def delete_refresh_cookie(response: Response) -> None:
    # Атрибуты должны совпадать с set_cookie, иначе браузер не сочтёт cookie той же
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite="strict",
    )


RefreshTokenCookie = Annotated[str | None, Cookie(alias=REFRESH_COOKIE_NAME)]


@auth.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация по email и паролю",
)
async def register(
    data: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    user = await service.register(data)
    return UserResponse.model_validate(user)


@auth.post(
    "/login",
    summary="Вход: access-токен в теле ответа, refresh-токен в httpOnly cookie",
)
async def login(
    data: LoginRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
) -> AccessTokenResponse:
    tokens = await service.login(data)
    set_refresh_cookie(response, tokens.refresh_token)
    return AccessTokenResponse(access_token=tokens.access_token)


@auth.post(
    "/refresh",
    summary="Новый access-токен по refresh-токену из cookie, refresh ротируется",
)
async def refresh(
    response: Response,
    refresh_token: RefreshTokenCookie = None,
    service: AuthService = Depends(get_auth_service),
) -> AccessTokenResponse:
    tokens = await service.refresh(refresh_token)
    set_refresh_cookie(response, tokens.refresh_token)
    return AccessTokenResponse(access_token=tokens.access_token)


@auth.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Выход: refresh-токен отзывается, cookie удаляется",
)
async def logout(
    response: Response,
    refresh_token: RefreshTokenCookie = None,
    service: AuthService = Depends(get_auth_service),
) -> None:
    await service.logout(refresh_token)
    delete_refresh_cookie(response)


@auth.get("/me", summary="Текущий пользователь")
async def me(
    auth_user: UserToken = Depends(get_current_user_by_access_token),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    user = await service.get_user(auth_user.id)
    return UserResponse.model_validate(user)
