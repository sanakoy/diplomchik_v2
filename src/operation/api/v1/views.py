from typing import Annotated

from fastapi import APIRouter, Depends, Query

from src.auth.authorization import get_current_user_by_access_token
from src.auth.schemas import UserToken
from src.operation.schemas import (
    CreateOperationRequest,
    OperationListParams,
    OperationsPage,
    PeriodParams,
    PeriodTotalsResponse,
    UpdateOperationRequest,
)
from src.operation.service import OperationService, get_operation_service

operation = APIRouter()


@operation.get("", summary="Список операций с фильтрами")
async def get_operations(
    params: Annotated[OperationListParams, Query()],
    service: OperationService = Depends(get_operation_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
) -> OperationsPage:
    return await service.get_operations(auth_user, params)


@operation.get("/totals", summary="Доходы и расходы за период по категориям и дням")
async def get_period_totals(
    params: Annotated[PeriodParams, Query()],
    service: OperationService = Depends(get_operation_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
) -> PeriodTotalsResponse:
    return await service.get_period_totals(auth_user, params)


@operation.post("/create", summary="Создание операции")
async def create_operation(
    data: CreateOperationRequest,
    service: OperationService = Depends(get_operation_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    await service.create_operation(data, auth_user)
    return {"message": "Операция успешно создана"}


@operation.patch("/update/{operation_id}", summary="Обновление операции")
async def update_operation(
    operation_id: int,
    data: UpdateOperationRequest,
    service: OperationService = Depends(get_operation_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    await service.update_operation(operation_id, data, auth_user)
    return {"message": "Операция успешно обновлена"}


@operation.delete("/delete/{operation_id}", summary="Удаление операции")
async def delete_operation(
    operation_id: int,
    service: OperationService = Depends(get_operation_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    await service.delete_operation(operation_id, auth_user)
    return {"message": "Операция успешно удалена"}
