"""email login and refresh tokens

Revision ID: 6a7614e6f390
Revises: 8ac1d5e03851
Create Date: 2026-09-21 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6a7614e6f390"
down_revision: Union[str, Sequence[str], None] = "8ac1d5e03851"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Переименование, а не drop + add: autogenerate сделал бы именно так и потерял данные
    op.alter_column("user", "username", new_column_name="email")
    op.execute(
        'ALTER TABLE "user" RENAME CONSTRAINT user_username_key TO user_email_key'
    )

    op.create_table(
        "refresh_token",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("family_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        op.f("ix_refresh_token_family_id"), "refresh_token", ["family_id"], unique=False
    )
    op.create_index(
        op.f("ix_refresh_token_user_id"), "refresh_token", ["user_id"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_refresh_token_user_id"), table_name="refresh_token")
    op.drop_index(op.f("ix_refresh_token_family_id"), table_name="refresh_token")
    op.drop_table("refresh_token")

    op.execute(
        'ALTER TABLE "user" RENAME CONSTRAINT user_email_key TO user_username_key'
    )
    op.alter_column("user", "email", new_column_name="username")
