from datetime import datetime
from fastapi import Depends
from sqlalchemy import and_, extract, func, select, text
from sqlalchemy.orm import joinedload
from src.auth.schemas import UserToken
from src.category.schemas import (
    CategoriesPage,
    CategoryView,
    CreateCategoryRequest,
    GroupedOperationResponse,
    OperationInGroup,
    UpdateCategoryRequest,
)
from src.database import get_session
from src.category.models import Category
from src.operation.models import Operation
from src.service import BaseService
from sqlalchemy.ext.asyncio import AsyncSession


class CategoryService(BaseService):
    model = Category

    async def get_categories(self, auth_user: UserToken, is_profit: bool):
        query = (
            select(
                Category,
                func.sum(Operation.sum).label("cat_sum")
            )
            .outerjoin(
                Operation,
                and_(
                    Operation.category_id == Category.id,
                    extract("year", Operation.date) == datetime.now().year,
                    extract("month", Operation.date) == datetime.now().month,
                )
            )
            .filter(
                Category.user_id == auth_user.id,
                Category.is_profit == is_profit,
            )
            .group_by(Category.id)
            .order_by(Category.date_create)
        )
        rows = (await self.session.execute(query)).all()

        # Запрос 2 — подгружаем планы отдельно через selectinload
        cat_ids = [cat_obj.id for cat_obj, _ in rows]
        plans_query = (
            select(Category)
            .options(joinedload(Category.plan))
            .filter(Category.id.in_(cat_ids))
        )
        cats_with_plans = (await self.session.execute(plans_query)).scalars().all()
        plans_map = {cat.id: cat.plan for cat in cats_with_plans}

        serialized_cats = []
        cats_sum_dict = {}
        total = 0.0

        for cat_obj, cat_sum in rows:
            sum_val = float(cat_sum) if cat_sum else 0.0
            cats_sum_dict[cat_obj.name] = sum_val
            total += sum_val
            plan = plans_map.get(cat_obj.id)

            serialized_cats.append(
                CategoryView(
                    id=cat_obj.id,
                    name=cat_obj.name,
                    cat_sum=sum_val,
                    is_profit=cat_obj.is_profit,
                    image_url=cat_obj.image_url,
                    plan_id=cat_obj.plan_id,
                    user_id=cat_obj.user_id,
                    percent=float(plan.percent or 0) if plan else None,
                    plan_sum=float(plan.plan_sum) if plan else None,
                )
            )

        return CategoriesPage(
            cats=serialized_cats,
            total=total,
            operation="profit" if is_profit else "spending",
            cats_sum=cats_sum_dict,
        )


    async def get_statistic(
        self, auth_user: UserToken, operation: str, year: int, month: int
    ):
        is_profit = operation == "profit"
        
        # 1. Запрос к операциям (тянет операции + категории одним запросом)
        operations_query = self.get_operations_query(
            user_id=auth_user.id, is_profit=is_profit, year=year, month=month
        )
        result = await self.session.execute(operations_query)
        operations: list[Operation] = result.scalars().all()

        # 2. Агрегация данных в памяти (Заменяет get_grouped_operations, get_cats_sum и get_total)
        grouped_operations: dict[str, list[OperationInGroup]] = {}
        cats_sum_dict: dict[str, float] = {}
        total = 0.0

        for op in operations:
            # Кроссплатформенный формат "18 May" (без ведущих нулей, работает и на Linux, и на Windows)
            day_key = f"{op.date.day} {op.date.strftime('%B')}"
            
            op_sum = float(op.sum) if op.sum else 0.0
            total += op_sum
            
            # Считаем сумму по категориям
            cat_name = op.category.name
            cats_sum_dict[cat_name] = cats_sum_dict.get(cat_name, 0.0) + op_sum

            # Группируем по дням
            if day_key not in grouped_operations:
                grouped_operations[day_key] = []

            grouped_operations[day_key].append(
                OperationInGroup(
                    id=op.id,
                    sum=op_sum,
                    comment=op.comment,
                    cat_name=cat_name,
                    image_url=op.category.image_url,
                )
            )

        # 3. Запрос для фильтров (история месяцев и лет) — его оставляем в БД
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

    def get_operations_query(
        self, user_id: int, is_profit: bool, year: int, month: int
    ):
        return (
            select(Operation)
            .join(Category, Operation.category_id == Category.id)
            .options(joinedload(Operation.category))
            .filter(
                Category.user_id == user_id,
                Category.is_profit == is_profit,
                extract("year", Operation.date) == year,
                extract("month", Operation.date) == month,
            )
            .order_by(Operation.date.desc())
        )

    async def get_months_year(
        self, user_id: int, is_profit: bool
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
            if row["year"] is not None and row["month"] is not None:
                year_str = str(int(row["year"]))
                month_int = int(row["month"])
                if year_str not in months_year:
                    months_year[year_str] = []
                months_year[year_str].append(month_int)

        return months_year

    async def create_category(
        self, create_data: CreateCategoryRequest, auth_user: UserToken
    ):
        create_data_dict: dict = create_data.model_dump(exclude_unset=True)
        create_data_dict.update({"user_id": auth_user.id})
        new_category_obj: Category = await self.create_obj(create_data_dict)

        return new_category_obj

    async def update_category(
        self, category_id: int, update_data: UpdateCategoryRequest
    ):
        update_data_dict: dict = update_data.model_dump(exclude_unset=True)
        updated_category_obj: Category = await self.update_obj(
            category_id, update_data_dict
        )

        return updated_category_obj

    async def delete_category(self, category_id: int):
        deleted_category_obj: Category = await self.delete_obj(category_id)
        return deleted_category_obj


async def get_category_service(
    session: AsyncSession = Depends(get_session),
) -> CategoryService:
    return CategoryService(session=session)
