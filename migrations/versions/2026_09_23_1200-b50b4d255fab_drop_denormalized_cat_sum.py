"""drop denormalized cat_sum

Revision ID: b50b4d255fab
Revises: 6a7614e6f390
Create Date: 2026-09-23 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b50b4d255fab"
down_revision: Union[str, Sequence[str], None] = "6a7614e6f390"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Денормализованная сумма писалась при каждой операции, но при чтении не
    # использовалась: /categories и /statistic считают суммы запросом
    op.drop_column("category", "cat_sum")
    op.drop_column("category", "date_upd_cat_sum")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "category", sa.Column("date_upd_cat_sum", sa.DateTime(), nullable=True)
    )
    op.add_column("category", sa.Column("cat_sum", sa.Numeric(), nullable=True))
