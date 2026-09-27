from datetime import datetime
from typing import Literal

from pydantic import ConfigDict

from src.schemas import BaseSchema, MonthFilter


class CreateOperationRequest(BaseSchema):
    sum: float
    comment: str | None = None
    category_id: int
    date: datetime


class UpdateOperationRequest(BaseSchema):
    # Категорию операции менять нельзя: вместе с ней сменился бы и владелец операции.
    # extra="forbid": попытка прислать category_id вернёт 422, а не будет молча проигнорирована
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    sum: float | None = None
    comment: str | None = None
    date: datetime | None = None


class OperationListParams(MonthFilter):
    category_id: int | None = None
    operation: Literal["profit", "spending"] | None = None


class OperationView(BaseSchema):
    id: int
    sum: float
    comment: str | None = None
    date: datetime | None = None
    category_id: int
    cat_name: str
    image_url: str | None = None
    is_profit: bool


class OperationsPage(BaseSchema):
    data: list[OperationView]
