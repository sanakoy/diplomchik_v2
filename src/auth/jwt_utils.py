from fastapi import HTTPException
from src.settings import settings
from jwt import encode, decode, InvalidTokenError
from datetime import datetime, timedelta

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def create_access_token(user_id: str):
    return jwt_encode(
        payload={"sub": user_id},
        token_type=ACCESS_TOKEN_TYPE,
        time_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: str):
    return jwt_encode(
        payload={"sub": user_id},
        token_type=REFRESH_TOKEN_TYPE,
        time_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def jwt_encode(
    payload: dict,
    token_type: str,
    time_delta: timedelta,
    secret_key: str = settings.SECRET_TOKEN_KEY,
    algorithm: str = settings.ALGORITHM,
) -> str:
    payload_with_exp = payload.copy()
    payload_with_exp.update(
        {
            "exp": datetime.utcnow() + time_delta,
            "iat": datetime.utcnow(),
            "type": token_type,
        }
    )
    encoded_jwt = encode(payload_with_exp, secret_key, algorithm=algorithm)
    return encoded_jwt


def jwt_decode(
    token: str,
    secret_key: str = settings.SECRET_TOKEN_KEY,
    algorithms: list = [settings.ALGORITHM],
) -> dict:
    try:
        decoded_payload = decode(token, secret_key, algorithms=algorithms)
        return decoded_payload
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
