from fastapi import APIRouter, Depends

from src.auth.authorization import get_current_user_by_access_token
from src.auth.schemas import UserToken
from src.category.schemas import (
    CategoriesPage,
    CategoryPageResponse,
    CreateCategoryRequest,
    GroupedOperationResponse,
    UpdateCategoryRequest,
)
from src.category.service import CategoryService, get_category_service


category = APIRouter()


@category.get("/spending", summary="Вывод категорий расходов")
async def get_spending_categories(
    service: CategoryService = Depends(get_category_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    category_page_data: CategoriesPage = await service.get_categories(
        auth_user=auth_user, is_profit=False
    )
    return CategoryPageResponse(data=category_page_data)


@category.get("/profit", summary="Вывод категорий доходов")
async def get_profit_categories(
    service: CategoryService = Depends(get_category_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    category_page_data: CategoriesPage = await service.get_categories(
        auth_user=auth_user, is_profit=True
    )
    return CategoryPageResponse(data=category_page_data)


@category.get("/statistic")
async def get_statistic(
    operation: str,
    year: int,
    month: int,
    service: CategoryService = Depends(get_category_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
) -> GroupedOperationResponse:
    return await service.get_statistic(auth_user, operation, year, month)


@category.post("/create", summary="Создание категории")
async def create_category(
    create_data: CreateCategoryRequest,
    service: CategoryService = Depends(get_category_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    new_category_obj = await service.create_category(create_data, auth_user)
    return {"message": "Категория успешно создана",
            "cr_category_id": new_category_obj.id}


@category.patch("/update/{category_id}", summary="Обновление категории")
async def update_category(
    category_id: int,
    update_data: UpdateCategoryRequest,
    service: CategoryService = Depends(get_category_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    updated_category_obj = await service.update_category(category_id, update_data)
    return {"message": "Категория успешно обновлена", "upd_category_id": updated_category_obj.id}


@category.delete("/delete/{category_id}", summary="Удаление категории")
async def delete_category(  
    category_id: int,
    service: CategoryService = Depends(get_category_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    deleted_category_obj = await service.delete_category(category_id)
    return {"message": "Категория успешно удалена", "del_category_id": deleted_category_obj.id}
