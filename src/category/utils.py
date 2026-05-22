from decimal import Decimal
from sqlalchemy import select
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from src.category.models import Category
from src.operation.models import Operation
from src.plan.utils import update_plan_percent
from src.utils import update_obj_by_id


async def update_cat_sum(
    session: AsyncSession, category_id: int, sum_diff: Decimal
) -> None:
    query = select(func.sum(Operation.sum)).filter(Operation.category_id == category_id)
    cat_sum: Decimal = (await session.execute(query)).scalar() or 0

    updated_category_obj: Category = await update_obj_by_id(
        id=category_id,
        session=session,
        model=Category,
        data={"cat_sum": cat_sum},
    )

    await update_plan_percent(
        session=session,
        plan_id=updated_category_obj.plan_id,
        cat_sum=updated_category_obj.cat_sum,
    )
