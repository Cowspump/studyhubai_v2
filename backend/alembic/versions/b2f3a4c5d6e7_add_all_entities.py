"""add_all_entities

Revision ID: b2f3a4c5d6e7
Revises: e918d248ad26
Create Date: 2026-03-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB


revision: str = "b2f3a4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "e918d248ad26"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users: add profile columns ---
    op.add_column("users", sa.Column("position", sa.Text, nullable=True))
    op.add_column("users", sa.Column("phone", sa.Text, nullable=True))
    op.add_column("users", sa.Column("telegram", sa.Text, nullable=True))
    op.add_column("users", sa.Column("bio", sa.Text, nullable=True))
    op.add_column("users", sa.Column("photo", sa.Text, nullable=True))
    op.add_column("users", sa.Column("openai_key", sa.Text, nullable=True))

    # --- groups ---
    op.create_table(
        "groups",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("teacher_id", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # --- materials ---
    op.create_table(
        "materials",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("topic", sa.Text, nullable=False),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("type", sa.Text, nullable=False, server_default="pdf"),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("file_name", sa.Text, nullable=True),
        sa.Column("teacher_id", sa.Integer, nullable=False),
        sa.Column("group_ids", ARRAY(sa.Integer), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # --- tests ---
    op.create_table(
        "tests",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("title", sa.Text, nullable=False),
        sa.Column("teacher_id", sa.Integer, nullable=False),
        sa.Column("group_ids", ARRAY(sa.Integer), nullable=False, server_default="{}"),
        sa.Column("questions", JSONB, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # --- test_results ---
    op.create_table(
        "test_results",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("test_id", sa.Integer, nullable=False),
        sa.Column("user_id", sa.Integer, nullable=False),
        sa.Column("score", sa.Integer, nullable=False),
        sa.Column("total", sa.Integer, nullable=False),
        sa.Column("answers", JSONB, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_test_results_test_user", "test_results", ["test_id", "user_id"])

    # --- messages ---
    op.create_table(
        "messages",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("from_id", sa.Integer, nullable=False),
        sa.Column("to_id", sa.Integer, nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_messages_participants", "messages", ["from_id", "to_id"])


def downgrade() -> None:
    op.drop_index("idx_messages_participants", table_name="messages")
    op.drop_table("messages")
    op.drop_index("idx_test_results_test_user", table_name="test_results")
    op.drop_table("test_results")
    op.drop_table("tests")
    op.drop_table("materials")
    op.drop_table("groups")
    op.drop_column("users", "openai_key")
    op.drop_column("users", "photo")
    op.drop_column("users", "bio")
    op.drop_column("users", "telegram")
    op.drop_column("users", "phone")
    op.drop_column("users", "position")
