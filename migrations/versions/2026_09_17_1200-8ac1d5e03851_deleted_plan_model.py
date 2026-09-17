"""deleted plan model

Revision ID: 8ac1d5e03851
Revises: d2a701098fa6
Create Date: 2026-09-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ac1d5e03851'
down_revision: Union[str, Sequence[str], None] = 'd2a701098fa6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(op.f('category_plan_id_fkey'), 'category', type_='foreignkey')
    op.drop_column('category', 'plan_id')
    op.drop_table('plan')


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table('plan',
    sa.Column('percent', sa.Numeric(), nullable=True),
    sa.Column('plan_sum', sa.Numeric(), nullable=False),
    sa.Column('date', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.add_column('category', sa.Column('plan_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.create_foreign_key(op.f('category_plan_id_fkey'), 'category', 'plan', ['plan_id'], ['id'], ondelete='CASCADE')
