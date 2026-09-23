from datetime import datetime

from pydantic import ConfigDict, Field, model_validator

from src.schemas import BaseSchema


class CategoryView(BaseSchema):
    id: int
    name: str
    cat_sum: float | None = None
    is_profit: bool
    image_url: str | None = None
    user_id: int


class CategoriesPage(BaseSchema):
    cats: list[CategoryView]
    total: float | None = 0.0
    operation: str
    cats_sum: dict[str, float]


class CategoryPageResponse(BaseSchema):
    data: CategoriesPage


class OperationInGroup(BaseSchema):
    id: int
    sum: float
    comment: str | None = None
    cat_name: str
    image_url: str | None


class GroupedOperationResponse(BaseSchema):
    grouped_operations: dict[str, list[OperationInGroup]]
    operation: str
    month: int
    year: int
    # default_factory, а не datetime.now().month: иначе значение вычислялось бы
    # один раз при импорте модуля и не менялось бы до перезапуска сервера
    current_month: int = Field(default_factory=lambda: datetime.now().month)
    current_year: int = Field(default_factory=lambda: datetime.now().year)
    cats_sum: dict[str, float]
    total: float
    months_year: dict[str, list[int]]


class CreateCategoryRequest(BaseSchema):
    name: str
    image_url: str | None = None
    operation: str = Field(exclude=True)
    is_profit: bool | None = None

    @model_validator(mode="after")
    def set_is_profit(self) -> "CreateCategoryRequest":
        self.is_profit = self.operation == "profit"
        return self


class UpdateCategoryRequest(BaseSchema):
    # Владельца и тип категории менять нельзя, поэтому user_id и operation здесь нет.
    # extra="forbid": лишние поля вернут 422, а не будут молча проигнорированы
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    name: str | None = None
    image_url: str | None = None
