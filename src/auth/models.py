from src.database import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.category.models import Category

class User(Base):
    __tablename__ = "user"

    username: Mapped[str] = mapped_column(unique=True)
    hashed_password: Mapped[str] = mapped_column()

    category: Mapped[list["Category"]] = relationship(back_populates="user", lazy="selectin")