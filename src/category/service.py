from datetime import datetime

from fastapi import Depends, HTTPException
from sqlalchemy import and_, extract, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.schemas import UserToken
from src.category.models import CATEGORY_NAME_UNIQUE_INDEX, Category
from src.category.schemas import (
    CategoriesPage,
    CategoryView,
    CreateCategoryRequest,
    UpdateCategoryRequest,
)
from src.database import get_session
from src.operation.models import Operation
from src.schemas import MonthFilter


def violates_unique_name(error: IntegrityError) -> bool:
    """Нарушен ли именно индекс уникальности имени, а не другое ограничение.

    asyncpg кладёт исходную ошибку в __cause__, у неё есть имя ограничения.
    """
    cause = error.orig.__cause__ if error.orig is not None else None
    return getattr(cause, "constraint_name", None) == CATEGORY_NAME_UNIQUE_INDEX


class CategoryService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_categories(
        self, auth_user: UserToken, is_profit: bool, period: MonthFilter
    ):
        # cat_sum считается за переданный месяц, без параметров — за текущий
        now = datetime.now()
        year = period.year if period.year is not None else now.year
        month = period.month if period.month is not None else now.month
        query = (
            select(Category, func.sum(Operation.sum).label("cat_sum"))
            .outerjoin(
                Operation,
                and_(
                    Operation.category_id == Category.id,
                    extract("year", Operation.date) == year,
                    extract("month", Operation.date) == month,
                ),
            )
            .filter(
                Category.user_id == auth_user.id,
                Category.is_profit == is_profit,
            )
            .group_by(Category.id)
            .order_by(Category.date_create)
        )
        rows = (await self.session.execute(query)).all()

        serialized_cats = []
        cats_sum_dict = {}
        total = 0.0

        for cat_obj, cat_sum in rows:
            sum_val = float(cat_sum) if cat_sum else 0.0
            cats_sum_dict[cat_obj.name] = sum_val
            total += sum_val

            serialized_cats.append(
                CategoryView(
                    id=cat_obj.id,
                    name=cat_obj.name,
                    cat_sum=sum_val,
                    is_profit=cat_obj.is_profit,
                    icon=cat_obj.icon,
                    user_id=cat_obj.user_id,
                )
            )

        return CategoriesPage(
            cats=serialized_cats,
            total=total,
            operation="profit" if is_profit else "spending",
            cats_sum=cats_sum_dict,
        )

    async def create_category(
        self, create_data: CreateCategoryRequest, auth_user: UserToken
    ) -> Category:
        category = Category(
            **create_data.model_dump(exclude_unset=True), user_id=auth_user.id
        )
        self.session.add(category)
        await self.commit_name_change()
        return category

    async def commit_name_change(self) -> None:
        """commit, где дубль имени превращается в 409 вместо 500."""
        try:
            await self.session.commit()
        except IntegrityError as error:
            await self.session.rollback()
            if violates_unique_name(error):
                raise HTTPException(
                    status_code=409, detail="Категория с таким названием уже есть"
                ) from error
            raise

    async def get_own_category(
        self, category_id: int, auth_user: UserToken
    ) -> Category:
        """Категория пользователя или 404.

        Чужая категория и несуществующая дают одинаковый ответ: иначе по коду ответа
        можно перебором узнать, какие id заняты.
        """
        category = await self.session.scalar(
            select(Category).filter(
                Category.id == category_id,
                Category.user_id == auth_user.id,
            )
        )
        if category is None:
            raise HTTPException(status_code=404, detail="Категория не найдена")
        return category

    async def update_category(
        self, category_id: int, update_data: UpdateCategoryRequest, auth_user: UserToken
    ) -> Category:
        category = await self.get_own_category(category_id, auth_user)

        for field, value in update_data.model_dump(exclude_unset=True).items():
            setattr(category, field, value)
        await self.commit_name_change()
        return category

    async def delete_category(self, category_id: int, auth_user: UserToken) -> Category:
        category = await self.get_own_category(category_id, auth_user)

        await self.session.delete(category)
        await self.session.commit()
        return category


async def get_category_service(
    session: AsyncSession = Depends(get_session),
) -> CategoryService:
    return CategoryService(session=session)
