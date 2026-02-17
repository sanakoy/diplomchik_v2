from sqlalchemy import select
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from src.database import get_session
from src.auth.models import User
from src.auth.schemas import UserToken
from src.auth.jwt_utils import jwt_decode
from sqlalchemy.ext.asyncio import AsyncSession

http_bearer = HTTPBearer()


def get_current_token_payload(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
) -> UserToken:
    token = credentials.credentials
    return jwt_decode(token)


async def get_current_user_by_access_token(
    session: AsyncSession = Depends(get_session),
    payload: dict = Depends(get_current_token_payload),
) -> UserToken:
    validate_token_type(payload, "access")
    user_obj = await get_user_by_id(user_id=payload.get("sub"), session=session)

    return UserToken.model_validate(user_obj)


async def get_current_auth_user_by_refresh_token(
    session: AsyncSession = Depends(get_session),
    payload: dict = Depends(get_current_token_payload),
) -> UserToken:
    validate_token_type(payload, "refresh")
    user_obj = await get_user_by_id(user_id=payload.get("sub"), session=session)

    return UserToken.model_validate(user_obj)


async def get_user_by_id(
    user_id: int,
    session: AsyncSession = Depends(get_session),
) -> User | None:
    user_obj = (
        await session.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
    return user_obj


def validate_token_type(payload: dict, expected_token_type: str):
    token_type_in_payload = payload.get("type")
    if token_type_in_payload == expected_token_type:
        return True
    raise HTTPException(status_code=401, detail="Invalid token type")
