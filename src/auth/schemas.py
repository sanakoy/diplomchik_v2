from typing import Literal

from pydantic import EmailStr, Field, field_validator

from src.schemas import BaseSchema

# bcrypt учитывает только первые 72 байта пароля, а bcrypt 5 на более длинном падает
PASSWORD_MAX_BYTES = 72


class RegisterRequest(BaseSchema):
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, email: str) -> str:
        # User@Mail.ru и user@mail.ru должны быть одним пользователем
        return email.lower()

    @field_validator("password")
    @classmethod
    def check_password_bytes(cls, password: str) -> str:
        # Считаем именно байты: кириллический символ в UTF-8 занимает два
        if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
            raise ValueError(f"Пароль длиннее {PASSWORD_MAX_BYTES} байт")
        return password


class LoginRequest(BaseSchema):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, email: str) -> str:
        return email.lower()


class IssuedTokens(BaseSchema):
    """Пара токенов, выданная при входе или ротации.

    Внутренняя схема между сервисом и ручкой: наружу access уходит в теле ответа,
    а refresh — только в cookie.
    """

    access_token: str
    refresh_token: str


class AccessTokenResponse(BaseSchema):
    access_token: str
    token_type: str = "Bearer"


class UserResponse(BaseSchema):
    id: int
    email: str


class AccessTokenPayload(BaseSchema):
    """Payload access-токена после проверки подписи и срока в jwt_decode."""

    # В токене sub — строка, Pydantic приводит "5" к 5 и отклоняет нечисловое значение
    sub: int
    # Refresh-токены не JWT, поэтому другого типа быть не должно
    type: Literal["access"]
    exp: int
    iat: int


class UserToken(BaseSchema):
    id: int
