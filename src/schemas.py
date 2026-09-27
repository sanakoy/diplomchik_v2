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
