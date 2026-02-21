from datetime import datetime
from fastapi import Depends
from sqlalchemy import UUID, extract, func, select, text
from src.auth.schemas import UserToken
from src.category.schemas import (
    CategoriesPage,
    CategoryView,
    GroupedOperationResponse,
    OperationInGroup,
)
from src.database import get_session
from src.category.models import Category
from src.operation.models import Operation
from src.service import BaseService
from sqlalchemy.ext.asyncio import AsyncSession


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
        cat_objs: list[Category] = (await self.session.execute(query)).scalars().all()
        serialized_cat_objs: list[CategoryView] = []
        for cat_obj in cat_objs:
            serialized_cat_objs.append(
                CategoryView(
                    id=cat_obj.id,
                    name=cat_obj.name,
                    cat_sum=None,
                    parent_id=cat_obj.parent_id,
                    is_profit=cat_obj.is_profit,
                    image_url=cat_obj.image_url,
                    plan_id=cat_obj.plan_id,
                    user_id=cat_obj.user_id,
                    percent=(
                        float(cat_obj.plan.percent if cat_obj.plan.percent else 0)
                        if cat_obj.plan
                        else None
                    ),
                    plan_sum=float(cat_obj.plan.plan_sum) if cat_obj.plan else None,
                )
            )

        category_page_data: CategoriesPage = CategoriesPage(
            cats=serialized_cat_objs,
            total=total[0] if total else 0,
            operation="profit" if is_profit else "spending",
            cats_sum=cats_sum_dict,
        )
        return category_page_data

    async def get_statistic(
        self, auth_user: UserToken, operation: str, year: int, month: int
    ):
        is_profit = operation == "profit"
        operations_query = self.get_operations_query(
            user_id=auth_user.id, is_profit=is_profit, year=year, month=month
        )

        grouped_operations: dict[str, list[OperationInGroup]] = (
            await self.get_grouped_operations(operations_query)
        )

        operations_subquery = operations_query.subquery()
        cats_sum_dict = await self.get_cats_sum(operations_subquery)
        total = await self.get_total(operations_subquery)

        months_year = await self.get_months_year(
            user_id=auth_user.id, is_profit=is_profit
        )

        return GroupedOperationResponse(
            grouped_operations=grouped_operations,
            operation=operation,
            month=month,
            year=year,
            cats_sum=cats_sum_dict,
            total=total,
            months_year=months_year,
        )

    async def get_grouped_operations(
        self, operations_query
    ) -> dict[str, list[OperationInGroup]]:

        result = await self.session.execute(operations_query)
        operations: list[Operation] = result.scalars().all()

        grouped_operations: dict[str, list[OperationInGroup]] = {}
        for op in operations:
            # Форматируем дату как "18 February"
            # day_key = op.date.strftime("%-d %B")  # Linux/Mac
            day_key = op.date.strftime("%#d %B")  # Windows

            if day_key not in grouped_operations:
                grouped_operations[day_key] = []

            grouped_operations[day_key].append(
                OperationInGroup(
                    id=op.id,
                    sum=op.sum,
                    comment=op.comment,
                    cat_name=op.category.name,
                    image_url=op.category.image_url,
                )
            )
        return grouped_operations

    def get_operations_query(
        self, user_id: UUID, is_profit: bool, year: int, month: int
    ):
        return (
            select(Operation)
            .join(Category, Operation.category_id == Category.id)
            .filter(
                Category.user_id == user_id,
                Category.is_profit == is_profit,
                extract("year", Operation.date) == year,
                extract("month", Operation.date) == month,
            )
            .order_by(Operation.date.desc())
        )

    async def get_cats_sum(self, operations_subquery) -> dict[str, float]:
        cats_sum_query = (
            select(Category.name, func.sum(operations_subquery.c.sum))
            .join(Category, operations_subquery.c.category_id == Category.id)
            .group_by(Category.id, Category.name)
        )
        cats_sum = (await self.session.execute(cats_sum_query)).mappings().all()
        cats_sum_dict: dict[str, float] = {}
        for cat in cats_sum:
            cats_sum_dict[cat.get("name")] = cat.get("sum")

        return cats_sum_dict

    async def get_total(self, operations_subquery) -> float:
        total_query = select(func.sum(operations_subquery.c.sum))
        total = (await self.session.execute(total_query)).one_or_none()
        return total[0] if total else 0.0

    async def get_months_year(
        self, user_id: UUID, is_profit: bool
    ) -> dict[str, list[int]]:
        months_query = (
            select(
                extract("year", Operation.date).label("year"),
                extract("month", Operation.date).label("month"),
            )
            .join(Category, Operation.category_id == Category.id)
            .filter(Category.user_id == user_id, Category.is_profit == is_profit)
            .distinct()
            .order_by(text("year DESC, month DESC"))
        )
        result = (await self.session.execute(months_query)).mappings().all()

        months_year: dict[str, list[int]] = {}
        for row in result:
            year = str(int(row["year"]))
            month = int(row["month"])
            if year not in months_year:
                months_year[year] = []
            months_year[year].append(month)

        return months_year


async def get_category_service(
    session: AsyncSession = Depends(get_session),
) -> CategoryService:
    return CategoryService(session=session)
