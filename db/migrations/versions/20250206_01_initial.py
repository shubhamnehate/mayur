"""Initial schema for users, roles, courses, enrollments, and payments."""

import os
from datetime import datetime
from hashlib import sha256
from typing import Iterable, Optional

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20250206_01"
down_revision = None
branch_labels = None
depends_on = None

ROLE_VALUES: Iterable[str] = ("student", "instructor", "admin")
ENROLLMENT_STATUS_VALUES: Iterable[str] = ("active", "completed", "cancelled")
PAYMENT_STATUS_VALUES: Iterable[str] = ("pending", "completed", "failed", "refunded")


def _enum_clause(values: Iterable[str]) -> str:
    return ", ".join(f"'{value}'" for value in values)


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_roles_name"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.String(length=50),
            nullable=False,
            server_default="student",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint(
            f"role IN ({_enum_clause(ROLE_VALUES)})", name="ck_users_role_valid"
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "price",
            sa.Numeric(10, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column("instructor_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["instructor_id"], ["users.id"], name="fk_courses_instructor_id_users"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_courses_instructor_id", "courses", ["instructor_id"], unique=False)

    op.create_table(
        "enrollments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "enrolled_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["course_id"], ["courses.id"], name="fk_enrollments_course_id_courses"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_enrollments_user_id_users"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "course_id",
            name="uq_enrollments_user_course",
        ),
        sa.CheckConstraint(
            f"status IN ({_enum_clause(ENROLLMENT_STATUS_VALUES)})",
            name="ck_enrollments_status_valid",
        ),
    )
    op.create_index("ix_enrollments_user_id", "enrollments", ["user_id"], unique=False)
    op.create_index("ix_enrollments_course_id", "enrollments", ["course_id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("provider_payment_id", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["course_id"], ["courses.id"], name="fk_payments_course_id_courses"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_payments_user_id_users"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            f"status IN ({_enum_clause(PAYMENT_STATUS_VALUES)})",
            name="ck_payments_status_valid",
        ),
    )
    op.create_index("ix_payments_user_id", "payments", ["user_id"], unique=False)
    op.create_index("ix_payments_course_id", "payments", ["course_id"], unique=False)
    op.create_index(
        "ix_payments_provider_payment_id",
        "payments",
        ["provider_payment_id"],
        unique=False,
    )

    _seed_roles_and_admin()


def downgrade() -> None:
    op.drop_index("ix_payments_provider_payment_id", table_name="payments")
    op.drop_index("ix_payments_course_id", table_name="payments")
    op.drop_index("ix_payments_user_id", table_name="payments")
    op.drop_table("payments")
    op.drop_index("ix_enrollments_course_id", table_name="enrollments")
    op.drop_index("ix_enrollments_user_id", table_name="enrollments")
    op.drop_table("enrollments")
    op.drop_index("ix_courses_instructor_id", table_name="courses")
    op.drop_table("courses")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("roles")


def _seed_roles_and_admin() -> None:
    bind = op.get_bind()
    now = datetime.utcnow()

    roles_table = sa.table(
        "roles",
        sa.column("name", sa.String()),
        sa.column("description", sa.String()),
        sa.column("created_at", sa.DateTime()),
        sa.column("updated_at", sa.DateTime()),
    )
    op.bulk_insert(
        roles_table,
        [
            {
                "name": "student",
                "description": "Default role for learners",
                "created_at": now,
                "updated_at": now,
            },
            {
                "name": "instructor",
                "description": "Course instructors",
                "created_at": now,
                "updated_at": now,
            },
            {
                "name": "admin",
                "description": "Platform administrators",
                "created_at": now,
                "updated_at": now,
            },
        ],
    )

    if not _should_seed_admin():
        return

    password_hash = _admin_password_hash()
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_name = os.getenv("ADMIN_NAME", "Admin User")

    if not password_hash:
        return

    existing_admin = bind.execute(
        sa.text("SELECT 1 FROM users WHERE email = :email LIMIT 1"),
        {"email": admin_email},
    ).scalar()

    if not existing_admin:
        bind.execute(
            sa.text(
                """
                INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
                VALUES (:name, :email, :password_hash, :role, :created_at, :updated_at)
                """
            ),
            {
                "name": admin_name,
                "email": admin_email,
                "password_hash": password_hash,
                "role": "admin",
                "created_at": now,
                "updated_at": now,
            },
        )


def _should_seed_admin() -> bool:
    return os.getenv("SEED_ADMIN_USER", "false").lower() in {"1", "true", "yes"}


def _admin_password_hash() -> Optional[str]:
    explicit_hash = os.getenv("ADMIN_PASSWORD_HASH")
    if explicit_hash:
        return explicit_hash

    password = os.getenv("ADMIN_PASSWORD")
    if not password:
        return None

    return sha256(password.encode("utf-8")).hexdigest()
