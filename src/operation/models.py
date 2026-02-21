from datetime import datetime
from decimal import Decimal
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from src.category.models import Category
from src.database import Base


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
