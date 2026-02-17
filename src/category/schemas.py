from decimal import Decimal
from uuid import UUID
from src.schemas import BaseSchema


class CategoryView(BaseSchema):
    id: UUID
    name: str
    cat_sum: Decimal | None = None
    parent_id: UUID | None = None
    is_profit: bool
    image_url: str | None = None
    plan_id: UUID | None = None
    user_id: UUID
    precent: Decimal | None = None
    plan_sum: Decimal | None = None


class CategoriesPage(BaseSchema):
    cats: list[CategoryView]
    total: Decimal
    operation: str
    cats_sum: dict[str, Decimal]
