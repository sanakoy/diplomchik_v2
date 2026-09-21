from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from jwt import InvalidTokenError, decode, encode
from pydantic import ValidationError

from src.auth.schemas import AccessTokenPayload
from src.settings import settings

ACCESS_TOKEN_TYPE = "access"


def create_access_token(user_id: int) -> str:
    return jwt_encode(
        # По стандарту JWT sub — строка
        payload={"sub": str(user_id)},
        token_type=ACCESS_TOKEN_TYPE,
        time_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def jwt_encode(payload: dict, token_type: str, time_delta: timedelta) -> str:
    now = datetime.now(UTC)
    return encode(
        payload | {"exp": now + time_delta, "iat": now, "type": token_type},
        settings.SECRET_TOKEN_KEY,
        algorithm=settings.ALGORITHM,
    )


def jwt_decode(token: str) -> AccessTokenPayload:
    """Проверяет подпись и срок токена, затем форму payload.

    Всё, что не является валидным access-токеном, даёт 401: битая подпись,
    истёкший срок, другой type, отсутствующий или нечисловой sub.
    """
    try:
        payload = decode(
            token, settings.SECRET_TOKEN_KEY, algorithms=[settings.ALGORITHM]
        )
        return AccessTokenPayload.model_validate(payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(status_code=401, detail="Недействительный токен")
