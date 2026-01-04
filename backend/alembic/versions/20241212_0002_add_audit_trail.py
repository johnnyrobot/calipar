"""Add audit_trail table for compliance logging

Revision ID: 0002
Revises: 0001
Create Date: 2024-12-12

This migration adds the audit_trail table for tracking
all changes to program reviews and related entities.
Required for ACCJC accreditation compliance.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create audit action enum
    op.execute("""
        CREATE TYPE auditaction AS ENUM (
            'created', 'updated', 'deleted', 'status_changed',
            'submitted', 'approved', 'rejected', 'comment_added'
        )
    """)

    # Create audit_trail table
    op.create_table(
        'audit_trail',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('entity_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('entity_id', sa.Uuid(), nullable=False),
        sa.Column('action', sa.Enum('CREATED', 'UPDATED', 'DELETED', 'STATUS_CHANGED',
                                     'SUBMITTED', 'APPROVED', 'REJECTED', 'COMMENT_ADDED',
                                     name='auditaction', create_type=False), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('ip_address', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('user_agent', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for efficient querying
    op.create_index(op.f('ix_audit_trail_entity_type'), 'audit_trail', ['entity_type'], unique=False)
    op.create_index(op.f('ix_audit_trail_entity_id'), 'audit_trail', ['entity_id'], unique=False)
    op.create_index(op.f('ix_audit_trail_user_id'), 'audit_trail', ['user_id'], unique=False)
    op.create_index(op.f('ix_audit_trail_created_at'), 'audit_trail', ['created_at'], unique=False)

    # Composite index for common query pattern: find all changes to an entity
    op.create_index(
        'ix_audit_trail_entity_lookup',
        'audit_trail',
        ['entity_type', 'entity_id', 'created_at'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_audit_trail_entity_lookup', table_name='audit_trail')
    op.drop_index(op.f('ix_audit_trail_created_at'), table_name='audit_trail')
    op.drop_index(op.f('ix_audit_trail_user_id'), table_name='audit_trail')
    op.drop_index(op.f('ix_audit_trail_entity_id'), table_name='audit_trail')
    op.drop_index(op.f('ix_audit_trail_entity_type'), table_name='audit_trail')
    op.drop_table('audit_trail')
    op.execute('DROP TYPE IF EXISTS auditaction')
