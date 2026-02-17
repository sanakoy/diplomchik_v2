from fastapi import APIRouter, Depends

from src.auth.authorization import get_current_user_by_access_token
from src.auth.schemas import UserToken
from src.category.schemas import CategoriesPage
from src.category.service import CategoryService, get_category_service


category = APIRouter()


@category.get("/spending", summary="Вывод категорий расходов")
async def get_spending_categories(
    service: CategoryService = Depends(get_category_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    data = await service.get_categories(auth_user=auth_user, is_profit=False)
    return {"data": CategoriesPage(**data)}
