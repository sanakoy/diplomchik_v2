from datetime import datetime
from decimal import Decimal
from src.category.models import Category
from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Plan(Base):
    __tablename__ = "plan"

    percent: Mapped[Decimal] = mapped_column(nullable=True, default=0)
    date: Mapped[datetime] = mapped_column()
    plan_sum: Mapped[Decimal] = mapped_column()

    category: Mapped[list["Category"]] = relationship(
        back_populates="plan", lazy="selectin"
    )

    def __str__(self):
        return str(self.plan_sum)
