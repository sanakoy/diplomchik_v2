from datetime import datetime
from fastapi import Depends
from sqlalchemy import extract, func, select
from src.auth.models import User
from src.auth.schemas import UserToken
from src.database import get_session
from src.category.models import Category, Operation
from src.service import BaseService
from sqlalchemy.ext.asyncio import AsyncSession

from src.utils import get_objs_query


class CategoryService(BaseService):
    model = Category

    async def get_categories(self, auth_user: UserToken, is_profit: bool):
        subquery = (
            select(Category.name, func.sum(Operation.sum))
            .join(Category, Operation.category_id == Category.id)
            .filter(
                Category.is_profit == is_profit,
                Category.user_id == auth_user.id,
                extract("year", Operation.date) == datetime.now().year,
                extract("month", Operation.date) == datetime.now().month,
            )
            .group_by(Category.id, Category.name)
        ).subquery()

        query = select(subquery)
        cats_sum = (await self.session.execute(query)).mappings().all()
        cats_sum_dict = {}
        for cat in cats_sum:
            cats_sum_dict[cat.get("name")] = cat.get("_no_label")

        query = select(func.sum(subquery.c.sum))
        total = (await self.session.execute(query)).one_or_none()

        query = (
            select(Category)
            .filter(Category.user_id == auth_user.id, is_profit == is_profit)
            .order_by("created_at")
        )
        cat_objs: Category = (await self.session.execute(query)).scalars().all()

        return {
            "cats": cat_objs,
            "total": total[0],
            "operation": "profit" if is_profit else "spending",
            "cats_sum": cats_sum_dict,
        }


async def get_category_service(
    session: AsyncSession = Depends(get_session),
) -> CategoryService:
    return CategoryService(session=session)
