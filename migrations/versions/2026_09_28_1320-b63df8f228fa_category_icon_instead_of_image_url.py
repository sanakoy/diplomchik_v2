"""category icon instead of image_url

Revision ID: b63df8f228fa
Revises: 240792155a36
Create Date: 2026-09-28 13:20:44.930019

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b63df8f228fa'
down_revision: Union[str, Sequence[str], None] = '240792155a36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # В image_url лежали пути к картинкам старого фронта («/static/img/food.png»).
    # Ключом иконки они не являются: обнуляем, фронт подберёт иконку по названию.
    # До смены типа: иначе длинное значение не влезло бы в VARCHAR(40)
    op.execute(
        "UPDATE category SET image_url = NULL WHERE image_url !~ '^[a-z0-9-]{1,40}$'"
    )
    # Переименование, а не drop + add, как предложил бы autogenerate:
    # подходящие значения сохраняются
    op.alter_column(
        'category',
        'image_url',
        new_column_name='icon',
        existing_type=sa.VARCHAR(),
        type_=sa.String(length=40),
        existing_nullable=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Обнулённые пути к картинкам не восстанавливаются: их больше нигде нет
    op.alter_column(
        'category',
        'icon',
        new_column_name='image_url',
        existing_type=sa.String(length=40),
        type_=sa.VARCHAR(),
        existing_nullable=True,
    )
