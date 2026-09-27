"""unique category name per user and kind

Revision ID: 240792155a36
Revises: b50b4d255fab
Create Date: 2026-09-27 14:40:29.092765

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '240792155a36'
down_revision: Union[str, Sequence[str], None] = 'b50b4d255fab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Дубли, созданные до индекса, иначе не дали бы его построить. Первая
    # категория (с меньшим id) остаётся как есть, к остальным дописывается id:
    # «Кафе (17)». left(..., 60): имя вместе с суффиксом влезает в String(80)
    op.execute(
        """
        UPDATE category
        SET name = left(category.name, 60) || ' (' || category.id || ')'
        FROM (
            SELECT id,
                   row_number() OVER (
                       PARTITION BY user_id, is_profit, lower(name) ORDER BY id
                   ) AS position
            FROM category
        ) AS ranked
        WHERE category.id = ranked.id AND ranked.position > 1
        """
    )
    op.create_index('uq_category_user_kind_lower_name', 'category', ['user_id', 'is_profit', sa.literal_column('lower(name)')], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Переименованные дубли остаются с суффиксом: прежние имена не сохранялись
    op.drop_index('uq_category_user_kind_lower_name', table_name='category')
