from decimal import Decimal
from fastapi import Depends
from src.category.utils import update_cat_sum
from src.operation.models import Operation
from src.operation.schemas import CreateOperationRequest, UpdateOperationRequest
from src.service import BaseService
from src.database import get_session
from sqlalchemy.ext.asyncio import AsyncSession


class OperationService(BaseService):
    model = Operation

    async def create_operation(self, create_data: CreateOperationRequest):
        create_data_dict: dict = create_data.model_dump(exclude_unset=True)
        new_operation_obj: Operation = await self.create_obj(create_data_dict)

        await update_cat_sum(
            session=self.session,
            category_id=new_operation_obj.category_id,
            sum_diff=Decimal(new_operation_obj.sum),
        )
        return new_operation_obj

    async def update_operation(
        self,
        operation_id: int,
        update_data: UpdateOperationRequest,
    ):
        update_data_dict: dict = update_data.model_dump(exclude_unset=True)
        updated_operation_obj: Operation = await self.update_obj(
            operation_id, update_data_dict
        )

        if update_data.category_id or update_data.sum:
            await update_cat_sum(
                session=self.session,
                category_id=updated_operation_obj.category_id,
                sum_diff=Decimal(updated_operation_obj.sum),
            )

    async def delete_operation(self, operation_id: int):
        deleted_operation_obj: Operation = await self.delete_obj(operation_id)

        await update_cat_sum(
            session=self.session,
            category_id=deleted_operation_obj.category_id,
            sum_diff=-Decimal(deleted_operation_obj.sum),
        )
        return deleted_operation_obj


async def get_operation_service(
    session: AsyncSession = Depends(get_session),
) -> OperationService:
    return OperationService(session=session)
