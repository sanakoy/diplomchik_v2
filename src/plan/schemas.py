from src.schemas import BaseSchema


class CreatePlanRequest(BaseSchema):
    plan_sum: float
    category_id: int


class UpdatePlanRequest(BaseSchema):
    plan_sum: float
    category_id: int
