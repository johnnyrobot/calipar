"""Add ai_usage and rate_limit_config tables

These two tables back AI usage tracking and configurable rate limiting
(models/ai_usage.py). Their models existed but no migration created them, so a
database built purely from `alembic upgrade head` was missing them. This
migration closes that gap.

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rate_limit_config",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("target_type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("target_value", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("requests_per_minute", sa.Integer(), nullable=False),
        sa.Column("requests_per_hour", sa.Integer(), nullable=False),
        sa.Column("requests_per_day", sa.Integer(), nullable=False),
        sa.Column("max_tokens_per_request", sa.Integer(), nullable=True),
        sa.Column("max_tokens_per_day", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_rate_limit_config_target_type"),
        "rate_limit_config",
        ["target_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_rate_limit_config_target_value"),
        "rate_limit_config",
        ["target_value"],
        unique=False,
    )

    op.create_table(
        "ai_usage",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "endpoint",
            sa.Enum(
                "ANALYZE",
                "EXPAND",
                "EQUITY_CHECK",
                "CHAT",
                "CHAT_STREAM",
                "SOCRATIC",
                name="aiendpoint",
            ),
            nullable=False,
        ),
        sa.Column("request_timestamp", sa.DateTime(), nullable=False),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),
        sa.Column("completion_tokens", sa.Integer(), nullable=True),
        sa.Column("total_tokens", sa.Integer(), nullable=True),
        sa.Column("model_name", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("response_time_ms", sa.Integer(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("error_message", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("estimated_cost_microdollars", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_usage_endpoint"), "ai_usage", ["endpoint"], unique=False)
    op.create_index(
        op.f("ix_ai_usage_request_timestamp"),
        "ai_usage",
        ["request_timestamp"],
        unique=False,
    )
    op.create_index(op.f("ix_ai_usage_user_id"), "ai_usage", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_usage_user_id"), table_name="ai_usage")
    op.drop_index(op.f("ix_ai_usage_request_timestamp"), table_name="ai_usage")
    op.drop_index(op.f("ix_ai_usage_endpoint"), table_name="ai_usage")
    op.drop_table("ai_usage")
    op.drop_index(
        op.f("ix_rate_limit_config_target_value"), table_name="rate_limit_config"
    )
    op.drop_index(
        op.f("ix_rate_limit_config_target_type"), table_name="rate_limit_config"
    )
    op.drop_table("rate_limit_config")
    # The aiendpoint enum type (created implicitly with ai_usage) is dropped with
    # the table on SQLite; on PostgreSQL drop it explicitly so re-upgrade is clean.
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        sa.Enum(name="aiendpoint").drop(bind, checkfirst=True)
