from datetime import date, datetime
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


# Длиннее года статистика по дням не нужна, а запрос остаётся ограниченным
PERIOD_MAX_DAYS = 366


class PeriodParams(BaseSchema):
    """Период статистики: с date_from по date_to включительно."""

    date_from: date
    date_to: date

    @model_validator(mode="after")
    def check_period(self) -> "PeriodParams":
        if self.date_from > self.date_to:
            raise ValueError("date_from позже date_to")
        if (self.date_to - self.date_from).days + 1 > PERIOD_MAX_DAYS:
            raise ValueError(f"период длиннее {PERIOD_MAX_DAYS} дней")
        return self


class CategoryTotal(BaseSchema):
    category_id: int
    name: str
    is_profit: bool
    sum: float


class DayCategoryTotal(BaseSchema):
    day: date
    category_id: int
    sum: float


class PeriodTotalsResponse(BaseSchema):
    income: float
    expense: float
    # Категории с операциями за период, от большей суммы к меньшей
    categories: list[CategoryTotal]
    # Суммы категорий по дням для графика: только дни с операциями, по порядку
    days: list[DayCategoryTotal]


class OperationView(BaseSchema):
    id: int
    sum: float
    comment: str | None = None
    date: datetime | None = None
    category_id: int
    cat_name: str
    icon: str | None = None
    is_profit: bool


class OperationsPage(BaseSchema):
    data: list[OperationView]
