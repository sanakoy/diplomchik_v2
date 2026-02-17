from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, String
from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from src.auth.models import User


class Plan(Base):
    __tablename__ = "plan"

    precent: Mapped[Decimal] = mapped_column()
    is_global: Mapped[bool] = mapped_column()
    date: Mapped[datetime] = mapped_column()
    plan_sum: Mapped[Decimal] = mapped_column()

    category: Mapped[list["Category"]] = relationship(
        back_populates="plan", lazy="selectin"
    )

    def __str__(self):
        return str(self.plan_sum)


class Category(Base):
    __tablename__ = "category"

    name: Mapped[str] = mapped_column(String(80))
    is_profit: Mapped[bool] = mapped_column()
    image_url: Mapped[str] = mapped_column(nullable=True)
    parent_id: Mapped[str] = mapped_column(
        ForeignKey("category.id", ondelete="CASCADE"), nullable=True
    )
    plan_id: Mapped[str] = mapped_column(
        ForeignKey("plan.id", ondelete="CASCADE"), nullable=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("user.id", ondelete="CASCADE"))

    plan: Mapped["Plan"] = relationship(back_populates="category", lazy="joined")
    user: Mapped["User"] = relationship(back_populates="category", lazy="joined")
    operation: Mapped[list["Operation"]] = relationship(
        back_populates="category", lazy="selectin"
    )

    def __str__(self):
        return self.name


class Operation(Base):
    __tablename__ = "operation"

    sum: Mapped[Decimal] = mapped_column(default=0)
    comment: Mapped[str] = mapped_column(String(100), nullable=True, default="")
    date: Mapped[datetime] = mapped_column(nullable=True)
    category_id: Mapped[str] = mapped_column(
        ForeignKey("category.id", ondelete="CASCADE")
    )

    category: Mapped["Category"] = relationship(
        back_populates="operation", lazy="joined"
    )

    def __str__(self):
        if self.comment == None:
            return str(self.sum)
        return str(self.sum) + " " + self.comment
