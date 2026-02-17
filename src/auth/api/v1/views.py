from fastapi import APIRouter

from src.auth.jwt_utils import create_access_token


auth = APIRouter()


@auth.get("/access-token", summary="Получение access токена по id пользователя")
async def get_access_token(user_id: str) -> str:
    return create_access_token(user_id)
