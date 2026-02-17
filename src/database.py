from fastapi import Depends
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession
from typing import Annotated
from src.settings import settings, test_settings
from datetime import datetime
from uuid import UUID
from uuid import uuid4
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped


DATABASE_URL = settings.get_db_url
TEST_DATABASE_URL = test_settings.get_db_test_url

# Создаем асинхронный движок для работы с базой данных
engine = create_async_engine(url=DATABASE_URL)
test_engine = create_async_engine(url=TEST_DATABASE_URL)
# Создаем фабрику сессий для взаимодействия с базой данных
async_session = async_sessionmaker(engine, expire_on_commit=False)
test_async_session = async_sessionmaker(test_engine, expire_on_commit=False)


async def get_session():
    async with async_session() as session:
        yield session


async def get_test_session():
    async with test_async_session() as test_session:
        yield test_session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


class Base(AsyncAttrs, DeclarativeBase):
    __abstract__ = True

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )
