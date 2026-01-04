"""Add courses and SLO assessment tables

Revision ID: 0003
Revises: 0002
Create Date: 2024-12-12

This migration adds:
- courses: Course catalog with GE designations and curriculum currency
- slo_assessments: Student Learning Outcome assessment results (CSLO data)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create GE Pattern enum
    ge_pattern_enum = sa.Enum(
        'IGETC', 'CSU_GE', 'Cal_GETC', 'Local_GE', 'None',
        name='gepattern'
    )

    # Courses table
    op.create_table(
        'courses',
        sa.Column('id', sa.Uuid(), nullable=False),

        # Course identification
        sa.Column('subject', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('number', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('course_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # Course details
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),

        # Units
        sa.Column('min_units', sa.Float(), nullable=False, default=0.0),
        sa.Column('max_units', sa.Float(), nullable=False, default=0.0),

        # Discipline/Department
        sa.Column('discipline', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('department_id', sa.Uuid(), nullable=True),

        # GE Designations
        sa.Column('ge_pattern', ge_pattern_enum, nullable=False, default='None'),
        sa.Column('ge_area', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('ge_sub_area', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('is_ge_approved', sa.Boolean(), nullable=False, default=False),

        # Transferability
        sa.Column('is_csu_transferable', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_uc_transferable', sa.Boolean(), nullable=False, default=False),
        sa.Column('c_id_number', sqlmodel.sql.sqltypes.AutoString(), nullable=True),

        # Curriculum Currency
        sa.Column('last_approved_date', sa.Date(), nullable=True),
        sa.Column('next_review_date', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        # Constraints
        sa.ForeignKeyConstraint(['department_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_courses_subject'), 'courses', ['subject'], unique=False)
    op.create_index(op.f('ix_courses_course_id'), 'courses', ['course_id'], unique=True)
    op.create_index(op.f('ix_courses_discipline'), 'courses', ['discipline'], unique=False)

    # SLO Assessments table
    op.create_table(
        'slo_assessments',
        sa.Column('id', sa.Uuid(), nullable=False),

        # Link to course
        sa.Column('course_id', sa.Uuid(), nullable=False),

        # Assessment period
        sa.Column('term', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('academic_year', sqlmodel.sql.sqltypes.AutoString(), nullable=False),

        # SLO details
        sa.Column('slo_number', sa.Integer(), nullable=False),
        sa.Column('slo_description', sa.Text(), nullable=True),

        # Assessment results
        sa.Column('students_assessed', sa.Integer(), nullable=False, default=0),
        sa.Column('students_meeting_criteria', sa.Integer(), nullable=False, default=0),
        sa.Column('achievement_percentage', sa.Float(), nullable=False, default=0.0),
        sa.Column('target_percentage', sa.Float(), nullable=False, default=70.0),

        # Status
        sa.Column('meets_target', sa.Boolean(), nullable=False, default=False),

        # Action taken
        sa.Column('action_taken', sa.Text(), nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(), nullable=False),

        # Constraints
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_slo_assessments_course_id'), 'slo_assessments', ['course_id'], unique=False)
    op.create_index(op.f('ix_slo_assessments_term'), 'slo_assessments', ['term'], unique=False)


def downgrade() -> None:
    # Drop tables
    op.drop_table('slo_assessments')
    op.drop_table('courses')

    # Drop enum type
    op.execute('DROP TYPE IF EXISTS gepattern')
