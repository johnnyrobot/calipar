"""Add PSLO assessments table

Revision ID: 0004
Revises: 0003
Create Date: 2024-12-12

This migration adds:
- pslo_assessments: Program Student Learning Outcome assessment results
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PSLO Assessments table
    op.create_table(
        'pslo_assessments',
        sa.Column('id', sa.Uuid(), nullable=False),

        # Link to program/department
        sa.Column('program_id', sa.Uuid(), nullable=False),

        # Program identification
        sa.Column('program_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('award_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Assessment period
        sa.Column('term', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('academic_year', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # PSLO details
        sa.Column('pslo_number', sa.Integer(), nullable=False),
        sa.Column('pslo_description', sa.Text(), nullable=True),

        # Assessment results
        sa.Column('students_assessed', sa.Integer(), nullable=False, default=0),
        sa.Column('students_meeting_criteria', sa.Integer(), nullable=False, default=0),
        sa.Column('achievement_percentage', sa.Float(), nullable=False, default=0.0),
        sa.Column('target_percentage', sa.Float(), nullable=False, default=70.0),

        # Status
        sa.Column('meets_target', sa.Boolean(), nullable=False, default=False),

        # Mapping to courses
        sa.Column('mapped_courses', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Action taken
        sa.Column('action_taken', sa.Text(), nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(), nullable=False),

        # Constraints
        sa.ForeignKeyConstraint(['program_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pslo_assessments_program_id'), 'pslo_assessments', ['program_id'], unique=False)
    op.create_index(op.f('ix_pslo_assessments_term'), 'pslo_assessments', ['term'], unique=False)


def downgrade() -> None:
    op.drop_table('pslo_assessments')
