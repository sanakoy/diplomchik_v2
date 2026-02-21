from datetime import datetime
from uuid import UUID
from src.schemas import BaseSchema


class CreateOperationRequest(BaseSchema):
    sum: float
    comment: str | None = None
    category_id: UUID


class UpdateOperationRequest(BaseSchema):
    sum: float | None = None
    comment: str | None = None
    category_id: UUID | None = None
    created_at: datetime | None = None
