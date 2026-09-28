from datetime import datetime, time, timedelta
from decimal import Decimal

from fastapi import Depends, HTTPException
from sqlalchemy import Date, cast, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import contains_eager

from src.auth.schemas import UserToken
from src.category.models import Category
from src.database import get_session
from src.operation.models import Operation
from src.operation.schemas import (
    CategoryTotal,
    CreateOperationRequest,
    DayCategoryTotal,
    OperationListParams,
    OperationsPage,
    OperationView,
    PeriodParams,
    PeriodTotalsResponse,
    UpdateOperationRequest,
)


class OperationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_operations(
        self, auth_user: UserToken, params: OperationListParams
    ) -> OperationsPage:
        filters = [Category.user_id == auth_user.id]
        if params.year is not None:
            filters.append(extract("year", Operation.date) == params.year)
            filters.append(extract("month", Operation.date) == params.month)
        if params.category_id:
            filters.append(Operation.category_id == params.category_id)
        if params.operation:
            filters.append(Category.is_profit == (params.operation == "profit"))

        operations_query = (
            select(Operation)
            .join(Category, Operation.category_id == Category.id)
            .options(contains_eager(Operation.category))
            .filter(*filters)
            .order_by(Operation.date.desc().nulls_last(), Operation.id.desc())
        )
        operations = (await self.session.execute(operations_query)).scalars().all()

        return OperationsPage(
            data=[
                OperationView(
                    id=op.id,
                    sum=float(op.sum),
                    comment=op.comment,
                    date=op.date,
                    category_id=op.category_id,
                    cat_name=op.category.name,
                    icon=op.category.icon,
                    is_profit=op.category.is_profit,
                )
                for op in operations
            ],
        )

    async def get_period_totals(
        self, auth_user: UserToken, params: PeriodParams
    ) -> PeriodTotalsResponse:
        # Диапазон по самой колонке, а не extract()/cast в WHERE: так условие
        # сможет использовать индекс по operation.date, если он появится.
        # Конец — начало следующего дня: последний день входит целиком
        date_from = datetime.combine(params.date_from, time.min)
        date_to = datetime.combine(params.date_to + timedelta(days=1), time.min)

        day = cast(Operation.date, Date)
        totals_query = (
            select(
                day,
                Category.id,
                Category.name,
                Category.is_profit,
                func.sum(Operation.sum),
            )
            .join(Category, Operation.category_id == Category.id)
            .filter(
                Category.user_id == auth_user.id,
                Operation.date >= date_from,
                Operation.date < date_to,
            )
            .group_by(day, Category.id, Category.name, Category.is_profit)
            .order_by(day, Category.id)
        )
        rows = (await self.session.execute(totals_query)).all()

        # Суммы копим в Decimal, как они хранятся в БД: во float сумма
        # многих дробных значений накапливает ошибку
        category_sums: dict[int, Decimal] = {}
        category_info: dict[int, tuple[str, bool]] = {}
        income = expense = Decimal(0)
        days = []
        for row_day, category_id, name, is_profit, total in rows:
            days.append(
                DayCategoryTotal(day=row_day, category_id=category_id, sum=float(total))
            )
            category_sums[category_id] = (
                category_sums.get(category_id, Decimal(0)) + total
            )
            category_info[category_id] = (name, is_profit)
            if is_profit:
                income += total
            else:
                expense += total

        categories = [
            CategoryTotal(
                category_id=category_id,
                name=category_info[category_id][0],
                is_profit=category_info[category_id][1],
                sum=float(total),
            )
            for category_id, total in category_sums.items()
        ]
        categories.sort(key=lambda category: (-category.sum, category.name))

        return PeriodTotalsResponse(
            income=float(income),
            expense=float(expense),
            categories=categories,
            days=days,
        )

    async def get_own_operation(
        self, operation_id: int, auth_user: UserToken
    ) -> Operation:
        """Операция пользователя или 404.

        Чужая операция и несуществующая дают одинаковый ответ: иначе по коду ответа
        можно перебором узнать, какие id заняты.
        """
        operation = await self.session.scalar(
            select(Operation)
            .join(Category, Operation.category_id == Category.id)
            .filter(Operation.id == operation_id, Category.user_id == auth_user.id)
        )
        if operation is None:
            raise HTTPException(status_code=404, detail="Операция не найдена")
        return operation

    async def check_own_category(self, category_id: int, auth_user: UserToken) -> None:
        """Бросает 404, если категории нет или она принадлежит другому пользователю."""
        query = select(Category.id).filter(
            Category.id == category_id,
            Category.user_id == auth_user.id,
        )
        if await self.session.scalar(query) is None:
            raise HTTPException(status_code=404, detail="Категория не найдена")

    async def create_operation(
        self, create_data: CreateOperationRequest, auth_user: UserToken
    ) -> Operation:
        await self.check_own_category(create_data.category_id, auth_user)

        operation = Operation(**create_data.model_dump(exclude_unset=True))
        self.session.add(operation)
        await self.session.commit()
        return operation

    async def update_operation(
        self,
        operation_id: int,
        update_data: UpdateOperationRequest,
        auth_user: UserToken,
    ) -> Operation:
        operation = await self.get_own_operation(operation_id, auth_user)

        for field, value in update_data.model_dump(exclude_unset=True).items():
            setattr(operation, field, value)
        await self.session.commit()
        return operation

    async def delete_operation(
        self, operation_id: int, auth_user: UserToken
    ) -> Operation:
        operation = await self.get_own_operation(operation_id, auth_user)

        await self.session.delete(operation)
        await self.session.commit()
        return operation


async def get_operation_service(
    session: AsyncSession = Depends(get_session),
) -> OperationService:
    return OperationService(session=session)
