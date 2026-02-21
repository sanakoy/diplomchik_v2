from decimal import Decimal
from uuid import UUID
from src.schemas import BaseSchema
from datetime import datetime


class CategoryView(BaseSchema):
    id: UUID
    name: str
    cat_sum: float | None = None
    parent_id: UUID | None = None
    is_profit: bool
    image_url: str | None = None
    plan_id: UUID | None = None
    user_id: UUID
    percent: float | None = None
    plan_sum: float | None = None


class CategoriesPage(BaseSchema):
    cats: list[CategoryView]
    total: float
    operation: str
    cats_sum: dict[str, float]


class CategoryPageResponse(BaseSchema):
    data: CategoriesPage


class OperationInGroup(BaseSchema):
    id: UUID
    sum: float
    comment: str | None = None
    cat_name: str
    image_url: str | None


class GroupedOperationResponse(BaseSchema):
    grouped_operations: dict[str, list[OperationInGroup]]
    operation: str
    month: int
    year: int
    current_month: int | None = datetime.now().month
    current_year: int | None = datetime.now().year
    cats_sum: dict[str, float | None] | None = None
    total: float | None = 0
    months_year: dict[str, list[int]] | None = None
