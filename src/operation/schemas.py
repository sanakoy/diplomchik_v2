from datetime import datetime
from src.schemas import BaseSchema


class CreateOperationRequest(BaseSchema):
    sum: float
    comment: str | None = None
    category_id: int
    date: datetime


class UpdateOperationRequest(BaseSchema):
    sum: float | None = None
    comment: str | None = None
    category_id: int | None = None
    date: datetime | None = None
