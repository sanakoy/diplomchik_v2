from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MonthFilter(BaseSchema):
    """Фильтр по месяцу в query-параметрах: год и месяц передаются только вместе."""

    year: int | None = Field(default=None, ge=1900, le=9999)
    month: int | None = Field(default=None, ge=1, le=12)

    @model_validator(mode="after")
    def check_year_month(self) -> "MonthFilter":
        if (self.year is None) != (self.month is None):
            raise ValueError("year и month передаются только вместе")
        return self


def reject_explicit_nulls(data: Any, fields: tuple[str, ...]) -> Any:
    """Для PATCH: поле можно не передавать, но нельзя передать null.

    Иначе {"sum": null} записал бы NULL в NOT NULL колонку и упал бы с 500.
    """
    if isinstance(data, dict):
        nulls = [field for field in fields if field in data and data[field] is None]
        if nulls:
            raise ValueError(f"поля {', '.join(nulls)} не могут быть null")
    return data
