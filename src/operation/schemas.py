from datetime import datetime
from typing import Literal

from pydantic import ConfigDict, Field, model_validator

from src.schemas import BaseSchema


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


class OperationListParams(BaseSchema):
    year: int | None = Field(default=None, ge=1900, le=9999)
    month: int | None = Field(default=None, ge=1, le=12)
    category_id: int | None = None
    operation: Literal["profit", "spending"] | None = None

    @model_validator(mode="after")
    def check_year_month(self) -> "OperationListParams":
        if (self.year is None) != (self.month is None):
            raise ValueError("year и month передаются только вместе")
        return self


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
