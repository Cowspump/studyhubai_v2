"""add_performance_indexes

Revision ID: a1b2c3d4e5f6
Revises: 56be76d3ff65
Create Date: 2026-03-28 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "56be76d3ff65"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _create_index_safe(name, table, columns, **kw):
    """Create index only if it doesn't already exist."""
    try:
        op.create_index(name, table, columns, **kw)
    except Exception:
        pass


def upgrade() -> None:
    _create_index_safe("idx_materials_teacher_id", "materials", ["teacher_id"])
    _create_index_safe(
        "idx_materials_group_ids_gin", "materials", ["group_ids"],
        postgresql_using="gin",
    )
    _create_index_safe("idx_materials_teacher_created", "materials", ["teacher_id", "created_at"])

    _create_index_safe("idx_tests_teacher_id", "tests", ["teacher_id"])
    _create_index_safe(
        "idx_tests_group_ids_gin", "tests", ["group_ids"],
        postgresql_using="gin",
    )
    _create_index_safe("idx_tests_teacher_created", "tests", ["teacher_id", "created_at"])

    _create_index_safe("idx_test_results_user_id", "test_results", ["user_id"])
    _create_index_safe("idx_test_results_test_id", "test_results", ["test_id"])
    _create_index_safe("idx_test_results_user_created", "test_results", ["user_id", "created_at"])
    _create_index_safe("idx_test_results_test_created", "test_results", ["test_id", "created_at"])

    _create_index_safe("idx_users_group_id", "users", ["group_id"])
    _create_index_safe(
        "idx_users_role_teacher", "users", ["role"],
        postgresql_where=sa.text("role = 'teacher'"),
    )


def downgrade() -> None:
    for name, table in [
        ("idx_users_role_teacher", "users"),
        ("idx_users_group_id", "users"),
        ("idx_test_results_test_created", "test_results"),
        ("idx_test_results_user_created", "test_results"),
        ("idx_test_results_test_id", "test_results"),
        ("idx_test_results_user_id", "test_results"),
        ("idx_tests_teacher_created", "tests"),
        ("idx_tests_group_ids_gin", "tests"),
        ("idx_tests_teacher_id", "tests"),
        ("idx_materials_teacher_created", "materials"),
        ("idx_materials_group_ids_gin", "materials"),
        ("idx_materials_teacher_id", "materials"),
    ]:
        try:
            op.drop_index(name, table_name=table)
        except Exception:
            pass
