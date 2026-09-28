from typing import Annotated, Any, Literal

from pydantic import ConfigDict, Field, StringConstraints, model_validator

from src.schemas import BaseSchema, reject_explicit_nulls

# Длина совпадает с колонкой category.name: без ограничения длинное имя
# доходило до БД и падало с 500 вместо 422
CategoryName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
]
# Ключ иконки: какие иконки есть, знает фронт, бэк проверяет только формат.
# Неизвестный фронту ключ он покажет иконкой по умолчанию
CategoryIcon = Annotated[str, StringConstraints(pattern=r"^[a-z0-9-]{1,40}$")]


class CategoryView(BaseSchema):
    id: int
    name: str
    cat_sum: float | None = None
    is_profit: bool
    icon: str | None = None
    user_id: int


class CategoriesPage(BaseSchema):
    cats: list[CategoryView]
    total: float | None = 0.0
    operation: str
    cats_sum: dict[str, float]


class CategoryPageResponse(BaseSchema):
    data: CategoriesPage


class CreateCategoryRequest(BaseSchema):
    name: CategoryName
    icon: CategoryIcon | None = None
    # Literal, а не str: любое значение, кроме "profit", раньше молча давало расход
    operation: Literal["profit", "spending"] = Field(exclude=True)
    is_profit: bool | None = None

    @model_validator(mode="after")
    def set_is_profit(self) -> "CreateCategoryRequest":
        self.is_profit = self.operation == "profit"
        return self


class UpdateCategoryRequest(BaseSchema):
    # Владельца и тип категории менять нельзя, поэтому user_id и operation здесь нет.
    # extra="forbid": лишние поля вернут 422, а не будут молча проигнорированы
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    name: CategoryName | None = None
    # null можно: так иконку сбрасывают, и фронт подберёт её по названию
    icon: CategoryIcon | None = None

    @model_validator(mode="before")
    @classmethod
    def check_nulls(cls, data: Any) -> Any:
        return reject_explicit_nulls(data, ("name",))
