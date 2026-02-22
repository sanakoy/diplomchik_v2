from uuid import UUID
from fastapi import APIRouter, Depends

from src.auth.authorization import get_current_user_by_access_token
from src.auth.schemas import UserToken
from src.operation.schemas import CreateOperationRequest, UpdateOperationRequest
from src.operation.service import OperationService, get_operation_service
from src.operation.service import OperationService


operation = APIRouter()


@operation.post("/create")
async def create_operation(
    data: CreateOperationRequest,
    service: OperationService = Depends(get_operation_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    await service.create_operation(data)
    return {"message": "Операция успешно создана"}


@operation.patch("/update/{operation_id}")
async def update_operation(
    operation_id: UUID,
    data: UpdateOperationRequest,
    service: OperationService = Depends(get_operation_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    await service.update_operation(operation_id, data)
    return {"message": "Операция успешно обновлена"}


@operation.delete("/delete/{operation_id}")
async def delete_operation(
    operation_id: UUID,
    service: OperationService = Depends(get_operation_service),
    auth_user: UserToken = Depends(get_current_user_by_access_token),
):
    deleted_operation_obj = await service.delete_operation(operation_id)
    return {"message": ("Операция успешно удалена")}
