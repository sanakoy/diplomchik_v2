from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.category.models import Category
from src.operation.models import Operation
from src.utils import update_obj_by_id


async def update_cat_sum(
    session: AsyncSession, category_id: int, sum_diff: Decimal
) -> None:
    query = select(func.sum(Operation.sum)).filter(Operation.category_id == category_id)
    cat_sum: Decimal = (await session.execute(query)).scalar() or 0

    await update_obj_by_id(
        id=category_id,
        session=session,
        model=Category,
        data={"cat_sum": cat_sum},
    )
