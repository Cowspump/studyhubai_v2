"""registration_flow

Revision ID: c3d4e5f6a7b8
Revises: b2f3a4c5d6e7
Create Date: 2026-03-19 18:00:00.000000

"""
import secrets
import string
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2f3a4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CHARS = string.ascii_uppercase + string.digits


def _random_code(length: int = 6) -> str:
    return "".join(secrets.choice(CHARS) for _ in range(length))


def upgrade() -> None:
    # 1. Add invite_code to groups (nullable first for backfill)
    op.add_column("groups", sa.Column("invite_code", sa.Text, nullable=True))

    # Backfill existing groups with unique codes
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id FROM groups")).fetchall()
    used_codes: set[str] = set()
    for row in rows:
        code = _random_code()
        while code in used_codes:
            code = _random_code()
        used_codes.add(code)
        conn.execute(
            sa.text("UPDATE groups SET invite_code = :code WHERE id = :id"),
            {"code": code, "id": row[0]},
        )

    # Make not null + unique
    op.alter_column("groups", "invite_code", nullable=False)
    op.create_unique_constraint("uq_groups_invite_code", "groups", ["invite_code"])

    # 2. Add plan to users
    op.add_column("users", sa.Column("plan", sa.Text, nullable=False, server_default="basic"))


def downgrade() -> None:
    op.drop_column("users", "plan")
    op.drop_constraint("uq_groups_invite_code", "groups", type_="unique")
    op.drop_column("groups", "invite_code")
