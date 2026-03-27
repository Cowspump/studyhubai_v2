"""fix_group_id_type

Revision ID: 56be76d3ff65
Revises: c3d4e5f6a7b8
Create Date: 2026-03-27 22:56:12.505710

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '56be76d3ff65'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Convert group_id from TEXT to INTEGER using CAST
    op.execute("""
        ALTER TABLE users
        ALTER COLUMN group_id TYPE INTEGER
        USING CASE
            WHEN group_id ~ '^[0-9]+$' THEN group_id::INTEGER
            ELSE NULL
        END
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE users ALTER COLUMN group_id TYPE TEXT USING group_id::TEXT")
