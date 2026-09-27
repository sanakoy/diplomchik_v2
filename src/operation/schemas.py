from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import ConfigDict, Field, StringConstraints, model_validator

from src.schemas import BaseSchema, MonthFilter, reject_explicit_nulls

# Сумма всегда положительная: доход это или расход, решает тип категории
OperationSum = Annotated[float, Field(gt=0)]
# Длина совпадает с колонкой operation.comment
OperationComment = Annotated[str, StringConstraints(max_length=100)]


class CreateOperationRequest(BaseSchema):
    sum: OperationSum
    comment: OperationComment | None = None
    category_id: int
    date: datetime


class UpdateOperationRequest(BaseSchema):
    # Категорию операции менять нельзя: вместе с ней сменился бы и владелец операции.
    # extra="forbid": попытка прислать category_id вернёт 422, а не будет молча проигнорирована
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    sum: OperationSum | None = None
    comment: OperationComment | None = None
    date: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def check_nulls(cls, data: Any) -> Any:
        return reject_explicit_nulls(data, ("sum",))


class OperationListParams(MonthFilter):
    category_id: int | None = None
    operation: Literal["profit", "spending"] | None = None


class MonthlyTotalsParams(MonthFilter):
    """Период для статистики: months месяцев, последний — year/month (по умолчанию текущий)."""

    months: int = Field(default=12, ge=1, le=36)


class CategoryTotal(BaseSchema):
    category_id: int
    name: str
    is_profit: bool
    sum: float


class MonthlyTotal(BaseSchema):
    year: int
    month: int
    income: float
    expense: float
    # Категории с операциями в этом месяце, от большей суммы к меньшей
    categories: list[CategoryTotal]


class MonthlyTotalsResponse(BaseSchema):
    # От старых месяцев к новым; месяцы без операций тоже есть, с нулями
    data: list[MonthlyTotal]


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
