from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, String
from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from src.auth.models import User
    from src.operation.models import Operation
    from src.plan.models import Plan


class Category(Base):
    __tablename__ = "category"

    name: Mapped[str] = mapped_column(String(80))
    is_profit: Mapped[bool] = mapped_column()
    image_url: Mapped[str] = mapped_column(nullable=True)
    cat_sum: Mapped[Decimal] = mapped_column(nullable=True, default=0)
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("plan.id", ondelete="CASCADE"), nullable=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"))
    date_create: Mapped[datetime] = mapped_column(nullable=True)
    date_upd_cat_sum: Mapped[datetime] = mapped_column(nullable=True)

    plan: Mapped["Plan"] = relationship(back_populates="category", lazy="raise")
    user: Mapped["User"] = relationship(back_populates="category", lazy="raise")
    operation: Mapped[list["Operation"]] = relationship(
        back_populates="category", lazy="raise"
    )

    def __str__(self):
        return self.name
