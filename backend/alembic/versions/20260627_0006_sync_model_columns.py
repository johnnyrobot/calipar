"""Sync model→DB column drift

The models accumulated columns that the initial migrations (0001–0004) never
added, so a database built purely from migrations was missing them. This
migration adds those columns (additive only), backfills/renames where needed,
and adds the indexes/foreign key the models declare.

Intentionally NOT included (to keep this safe and additive):
- TEXT()→AutoString() "type changes": SQLModel renders str as AutoString while
  the early migrations used Text(); on both SQLite and PostgreSQL these are the
  same affinity, so the diff is cosmetic noise.
- NOT NULL tightening on pre-existing columns (e.g. resource_requests.object_code),
  which could fail against existing NULL rows; left for a dedicated data cleanup.

NOT NULL columns are added with server defaults so the migration is safe on
populated databases as well as fresh ones.

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NOW = sa.text("CURRENT_TIMESTAMP")


def upgrade() -> None:
    # --- action_plan_mappings ---
    op.add_column(
        "action_plan_mappings",
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_NOW),
    )

    # --- documents: 5 new columns + uploaded_by_id FK ---
    op.add_column(
        "documents",
        sa.Column(
            "original_filename",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default="",
        ),
    )
    op.add_column(
        "documents",
        sa.Column(
            "content_type",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default="",
        ),
    )
    op.add_column(
        "documents",
        sa.Column("file_size", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "documents",
        sa.Column("section_key", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("uploaded_by_id", sa.Uuid(), nullable=True),
    )
    with op.batch_alter_table("documents") as batch:
        batch.create_foreign_key(
            "fk_documents_uploaded_by_id_users",
            "users",
            ["uploaded_by_id"],
            ["id"],
        )

    # --- enrollment_snapshots ---
    op.add_column(
        "enrollment_snapshots",
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_NOW),
    )

    # --- organizations ---
    op.add_column(
        "organizations",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "organizations",
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_NOW),
    )
    op.create_index(
        op.f("ix_organizations_name"), "organizations", ["name"], unique=False
    )

    # --- resource_requests ---
    op.add_column(
        "resource_requests",
        sa.Column("funded_amount", sa.Numeric(precision=12, scale=2), nullable=True),
    )
    op.add_column(
        "resource_requests",
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=_NOW),
    )

    # --- strategic_initiatives: add is_active/created_at, rename active→is_active ---
    op.add_column(
        "strategic_initiatives",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "strategic_initiatives",
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=_NOW),
    )
    # carry the old flag forward, then drop the legacy column
    op.execute("UPDATE strategic_initiatives SET is_active = active")
    with op.batch_alter_table("strategic_initiatives") as batch:
        batch.drop_column("active")

    # --- users: add is_active, enforce unique email ---
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.drop_index("ix_users_email", table_name="users")
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.drop_column("users", "is_active")

    op.add_column(
        "strategic_initiatives",
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.execute("UPDATE strategic_initiatives SET active = is_active")
    with op.batch_alter_table("strategic_initiatives") as batch:
        batch.drop_column("created_at")
        batch.drop_column("is_active")

    op.drop_column("resource_requests", "updated_at")
    op.drop_column("resource_requests", "funded_amount")

    op.drop_index(op.f("ix_organizations_name"), table_name="organizations")
    op.drop_column("organizations", "created_at")
    op.drop_column("organizations", "is_active")

    op.drop_column("enrollment_snapshots", "created_at")

    with op.batch_alter_table("documents") as batch:
        batch.drop_constraint("fk_documents_uploaded_by_id_users", type_="foreignkey")
    op.drop_column("documents", "uploaded_by_id")
    op.drop_column("documents", "section_key")
    op.drop_column("documents", "file_size")
    op.drop_column("documents", "content_type")
    op.drop_column("documents", "original_filename")

    op.drop_column("action_plan_mappings", "created_at")
