from decimal import Decimal

from pydantic import Field, model_validator
from src.schemas import BaseSchema
from datetime import datetime


class CategoryView(BaseSchema):
    id: int
    name: str
    cat_sum: float | None = None
    is_profit: bool
    image_url: str | None = None
    plan_id: int | None = None
    user_id: int
    percent: float | None = None
    plan_sum: float | None = None


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
    month: int | None = None
    year: int | None = None
    current_month: int | None = datetime.now().month
    current_year: int | None = datetime.now().year
    cats_sum: dict[str, float | None] | None = None
    total: float | None = 0
    months_year: dict[str | None, list[int | None] | None] | None = None


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
    name: str | None = None
    image_url: str | None = None
