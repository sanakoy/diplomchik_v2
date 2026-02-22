from uuid import UUID
from src.schemas import BaseSchema


class CreatePlanRequest(BaseSchema):
    plan_sum: float
    category_id: UUID


class UpdatePlanRequest(BaseSchema):
    plan_sum: float
    category_id: UUID
