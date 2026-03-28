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


def upgrade() -> None:
    # --- Materials indexes ---
    # Index for teacher queries
    op.create_index("idx_materials_teacher_id", "materials", ["teacher_id"])
    
    # Index for group queries with GIN (for ARRAY types)
    op.create_index(
        "idx_materials_group_ids_gin", 
        "materials", 
        ["group_ids"],
        postgresql_using="gin"
    )
    
    # Combined index for teacher + created_at (useful for ordering)
    op.create_index(
        "idx_materials_teacher_created", 
        "materials", 
        ["teacher_id", "created_at"]
    )

    # --- Tests indexes ---
    # Index for teacher queries
    op.create_index("idx_tests_teacher_id", "tests", ["teacher_id"])
    
    # Index for group queries with GIN
    op.create_index(
        "idx_tests_group_ids_gin", 
        "tests", 
        ["group_ids"],
        postgresql_using="gin"
    )
    
    # Combined index for teacher + created_at
    op.create_index(
        "idx_tests_teacher_created", 
        "tests", 
        ["teacher_id", "created_at"]
    )

    # --- TestResults indexes (improve result lookups) ---
    # Index for user queries
    op.create_index("idx_test_results_user_id", "test_results", ["user_id"])
    
    # Index for test queries
    op.create_index("idx_test_results_test_id", "test_results", ["test_id"])
    
    # Combined index for user + created_at (for ordering)
    op.create_index(
        "idx_test_results_user_created", 
        "test_results", 
        ["user_id", "created_at"]
    )
    
    # Combined index for test + created_at
    op.create_index(
        "idx_test_results_test_created", 
        "test_results", 
        ["test_id", "created_at"]
    )

    # --- Users indexes ---
    # Index for group_id lookups (to find students in a group)
    op.create_index("idx_users_group_id", "users", ["group_id"])
    
    # Index for teacher lookups
    op.create_index("idx_users_role_teacher", "users", ["role"], where="role='teacher'")


def downgrade() -> None:
    op.drop_index("idx_users_role_teacher", table_name="users")
    op.drop_index("idx_users_group_id", table_name="users")
    op.drop_index("idx_test_results_test_created", table_name="test_results")
    op.drop_index("idx_test_results_user_created", table_name="test_results")
    op.drop_index("idx_test_results_test_id", table_name="test_results")
    op.drop_index("idx_test_results_user_id", table_name="test_results")
    op.drop_index("idx_tests_teacher_created", table_name="tests")
    op.drop_index("idx_tests_group_ids_gin", table_name="tests")
    op.drop_index("idx_tests_teacher_id", table_name="tests")
    op.drop_index("idx_materials_teacher_created", table_name="materials")
    op.drop_index("idx_materials_group_ids_gin", table_name="materials")
    op.drop_index("idx_materials_teacher_id", table_name="materials")

