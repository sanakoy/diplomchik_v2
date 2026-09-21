import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.category.models import Category


class User(Base):
    __tablename__ = "user"

    email: Mapped[str] = mapped_column(unique=True)
    hashed_password: Mapped[str] = mapped_column()

    category: Mapped[list["Category"]] = relationship(
        back_populates="user", lazy="raise"
    )


class RefreshToken(Base):
    """Выданный refresh-токен. Сам токен не храним, только его хеш.

    Все токены одного входа образуют цепочку с общим family_id: при ротации старый
    токен отзывается, новый получает тот же family_id. Повторное использование
    отозванного токена значит, что его украли, и тогда отзывается вся цепочка.
    """

    __tablename__ = "refresh_token"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    family_id: Mapped[uuid.UUID] = mapped_column(index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
