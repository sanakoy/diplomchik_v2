from decimal import Decimal
from fastapi import Depends
from src.category.models import Category
from src.plan.models import Plan
from src.plan.schemas import CreatePlanRequest, UpdatePlanRequest, UpdatePlanRequest
from src.service import BaseService
from src.database import get_session
from sqlalchemy.ext.asyncio import AsyncSession


class PlanService(BaseService):
    model = Plan

    async def create_plan(self, create_data: CreatePlanRequest):
        category_obj: Category = await self.get_obj_by_id(
            id=create_data.category_id, model=Category
        )

        create_data_dict: dict = create_data.model_dump(
            exclude_unset=True, exclude={"category_id"}
        )
        cat_sum: Decimal = category_obj.cat_sum
        if cat_sum is not None:
            percent: Decimal = Decimal(cat_sum / Decimal(create_data.plan_sum) * 100)
            create_data_dict.update({"percent": round(percent, 1)})

        new_plan_obj: Plan = await self.create_obj(create_data_dict)

        category_obj.plan_id = new_plan_obj.id
        await self.session.commit()

        return new_plan_obj

    async def update_plan(
        self,
        plan_id: int,
        update_data: UpdatePlanRequest,
    ):
        category_obj: Category = await self.get_obj_by_id(
            id=update_data.category_id, model=Category
        )

        update_data_dict: dict = update_data.model_dump(
            exclude_unset=True, exclude={"category_id"}
        )
        cat_sum: Decimal = category_obj.cat_sum
        if cat_sum is not None:
            percent: Decimal = Decimal(cat_sum / Decimal(update_data.plan_sum) * 100)
            update_data_dict.update({"percent": round(percent, 1)})

        updated_plan_obj: Plan = await self.update_obj(plan_id, update_data_dict)

        return updated_plan_obj

    async def delete_plan(self, plan_id: int):
        deleted_plan_obj: Plan = await self.delete_obj(plan_id)

        return deleted_plan_obj


async def get_plan_service(
    session: AsyncSession = Depends(get_session),
) -> PlanService:
    return PlanService(session=session)
