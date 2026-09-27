from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.auth.models import User
    from src.operation.models import Operation


# Имя индекса нужно сервису: по нему нарушение уникальности отличается от других ошибок
CATEGORY_NAME_UNIQUE_INDEX = "uq_category_user_kind_lower_name"


class Category(Base):
    __tablename__ = "category"

    name: Mapped[str] = mapped_column(String(80))
    is_profit: Mapped[bool] = mapped_column()
    image_url: Mapped[str] = mapped_column(nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"))
    date_create: Mapped[datetime] = mapped_column(nullable=True)

    user: Mapped["User"] = relationship(back_populates="category", lazy="raise")
    operation: Mapped[list["Operation"]] = relationship(
        back_populates="category",
        lazy="raise",
        # Операции удаляет сама БД по ON DELETE CASCADE, ORM их даже не загружает
        cascade="all, delete",
        passive_deletes=True,
    )

    __table_args__ = (
        # Одно имя на пользователя и тип: «Кафе» и «кафе» среди расходов — дубль,
        # а «Подарки» в расходах и в доходах — нет. Без индекса дубли затирали
        # друг друга в cats_sum (словарь по имени). Проверка в БД, а не SELECT
        # перед INSERT: так два одновременных запроса не создадут оба
        Index(
            CATEGORY_NAME_UNIQUE_INDEX,
            "user_id",
            "is_profit",
            func.lower(name),
            unique=True,
        ),
    )

    def __str__(self):
        return self.name
