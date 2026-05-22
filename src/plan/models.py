from datetime import datetime
from decimal import Decimal
from sqlalchemy import func
from src.category.models import Category
from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Plan(Base):
    __tablename__ = "plan"

    percent: Mapped[Decimal] = mapped_column(nullable=True, default=0)
    plan_sum: Mapped[Decimal] = mapped_column()
    date: Mapped[datetime] = mapped_column(server_default=func.now())

    category: Mapped[list["Category"]] = relationship(
        back_populates="plan", lazy="raise"
    )

    def __str__(self):
        return str(self.plan_sum)
