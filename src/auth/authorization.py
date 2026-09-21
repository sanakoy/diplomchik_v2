from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.jwt_utils import jwt_decode
from src.auth.models import User
from src.auth.schemas import AccessTokenPayload, UserToken
from src.database import get_session

http_bearer = HTTPBearer()


def get_current_token_payload(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
) -> AccessTokenPayload:
    return jwt_decode(credentials.credentials)


async def get_current_user_by_access_token(
    session: AsyncSession = Depends(get_session),
    payload: AccessTokenPayload = Depends(get_current_token_payload),
) -> UserToken:
    user_obj = await get_user_by_id(user_id=payload.sub, session=session)
    if user_obj is None:
        # Токен подписан верно, но пользователя уже нет: например, его удалили
        raise HTTPException(status_code=401, detail="Пользователь не найден")

    return UserToken.model_validate(user_obj)


async def get_user_by_id(user_id: int, session: AsyncSession) -> User | None:
    return (
        await session.execute(select(User).where(User.id == user_id))
    ).scalar_one_or_none()
