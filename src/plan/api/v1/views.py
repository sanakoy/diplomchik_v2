from uuid import UUID
from fastapi import APIRouter, Depends
from fastapi.params import Depends
from src.plan.schemas import CreatePlanRequest, UpdatePlanRequest
from src.plan.service import PlanService, get_plan_service


plan = APIRouter()


@plan.post("/create", summary="Создание плана для категории")
async def create_plan(
    data: CreatePlanRequest, service: PlanService = Depends(get_plan_service)
):
    new_plan_obj = await service.create_plan(data)
    return {"message": "План успешно создан"}


@plan.patch("/update/{plan_id}", summary="Обновление плана для категории")
async def update_plan(
    plan_id: UUID,
    data: UpdatePlanRequest,
    service: PlanService = Depends(get_plan_service),
):
    updated_plan_obj = await service.update_plan(plan_id, data)
    return {"message": "План успешно обновлен"}


@plan.delete("/delete/{plan_id}")
async def delete_plan(
    plan_id: UUID,
    service: PlanService = Depends(get_plan_service),
):
    deleted_plan_obj = await service.delete_plan(plan_id)
    return {"message": ("План успешно удален")}
