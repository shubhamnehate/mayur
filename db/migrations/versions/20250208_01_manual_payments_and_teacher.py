"""Add teacher role, manual payment support, and payment order tracking."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20250208_01"
down_revision = "20250206_01"
branch_labels = None
depends_on = None

ROLE_VALUES = ("student", "teacher", "instructor", "admin")
PAYMENT_METHOD_VALUES = ("razorpay", "manual")
PAYMENT_ORDER_STATUS_VALUES = ("created", "paid", "failed")


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect != "sqlite":
        op.drop_constraint("ck_users_role_valid", "users", type_="check")
        op.create_check_constraint(
            "ck_users_role_valid",
            "users",
            f"role IN ({', '.join(f"'{v}'" for v in ROLE_VALUES)})",
        )

    inspector = sa.inspect(bind)
    if not inspector.has_table("payment_orders"):
        op.create_table(
            "payment_orders",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("provider_order_id", sa.String(length=255), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("currency", sa.String(length=10), nullable=False, server_default="INR"),
            sa.Column(
                "status",
                sa.String(length=50),
                nullable=False,
                server_default=PAYMENT_ORDER_STATUS_VALUES[0],
            ),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_payment_orders_user_id_users"),
            sa.ForeignKeyConstraint(
                ["course_id"], ["courses.id"], name="fk_payment_orders_course_id_courses"
            ),
            sa.UniqueConstraint("provider_order_id", name="uq_payment_orders_provider_order"),
            sa.CheckConstraint(
                f"status IN ({', '.join(f"'{v}'" for v in PAYMENT_ORDER_STATUS_VALUES)})",
                name="ck_payment_orders_status_valid",
            ),
        )
        op.create_index("ix_payment_orders_user_id", "payment_orders", ["user_id"], unique=False)
        op.create_index("ix_payment_orders_course_id", "payment_orders", ["course_id"], unique=False)

    op.add_column(
        "payments",
        sa.Column("method", sa.String(length=50), nullable=False, server_default=PAYMENT_METHOD_VALUES[0]),
    )
    op.add_column("payments", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column("payments", sa.Column("recorded_by_user_id", sa.Integer(), nullable=True))
    op.add_column("payments", sa.Column("order_id", sa.Integer(), nullable=True))

    if dialect != "sqlite":
        op.create_check_constraint(
            "ck_payments_method_valid",
            "payments",
            f"method IN ({', '.join(f"'{v}'" for v in PAYMENT_METHOD_VALUES)})",
        )

    op.create_index("ix_payments_order_id", "payments", ["order_id"], unique=False)
    op.create_foreign_key(
        "fk_payments_recorded_by_user_id_users",
        "payments",
        "users",
        ["recorded_by_user_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_payments_order_id_payment_orders",
        "payments",
        "payment_orders",
        ["order_id"],
        ["id"],
    )

    # ensure teacher role exists in roles lookup table if populated
    roles_table = sa.table(
        "roles",
        sa.column("name", sa.String),
        sa.column("description", sa.String),
        sa.column("created_at", sa.DateTime),
        sa.column("updated_at", sa.DateTime),
    )
    op.execute(
        roles_table.insert()
        .prefix_with("OR IGNORE" if dialect == "sqlite" else "")
        .values(name="teacher", description="Instructor/teacher access")
    )


def downgrade() -> None:
    op.drop_constraint("fk_payments_order_id_payment_orders", "payments", type_="foreignkey")
    op.drop_constraint("fk_payments_recorded_by_user_id_users", "payments", type_="foreignkey")
    op.drop_index("ix_payments_order_id", table_name="payments")

    if op.get_bind().dialect.name != "sqlite":
        op.drop_constraint("ck_payments_method_valid", "payments", type_="check")
        op.drop_constraint("ck_users_role_valid", "users", type_="check")
        op.create_check_constraint(
            "ck_users_role_valid",
            "users",
            "role IN ('student', 'instructor', 'admin')",
        )

    op.drop_column("payments", "order_id")
    op.drop_column("payments", "recorded_by_user_id")
    op.drop_column("payments", "notes")
    op.drop_column("payments", "method")

    op.drop_index("ix_payment_orders_course_id", table_name="payment_orders")
    op.drop_index("ix_payment_orders_user_id", table_name="payment_orders")
    op.drop_table("payment_orders")
