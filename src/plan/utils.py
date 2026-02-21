from src.plan.models import Plan
from src.utils import get_obj_by_id
from sqlalchemy.ext.asyncio import AsyncSession


async def update_plan_percent(
    session: AsyncSession,
    plan_id,
    cat_sum,
) -> None:
    plan_obj: Plan = await get_obj_by_id(id=plan_id, session=session, model=Plan)
    if plan_obj:
        plan_percent = cat_sum / plan_obj.plan_sum * 100 if plan_obj.plan_sum else 0
        plan_percent = round(plan_percent, 1)

        plan_obj.percent = plan_percent
        await session.commit()
