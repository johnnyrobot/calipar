"""Initial schema - All CALIPAR tables

Revision ID: 0001
Revises:
Create Date: 2024-12-12

This migration creates all initial tables for the CALIPAR platform:
- users: User accounts with Firebase UID and roles
- organizations: College hierarchy (College -> Division -> Department)
- strategic_initiatives: ISMP Goals 1-5 with objectives
- program_reviews: Main review documents
- review_sections: Individual sections within reviews
- action_plans: Integrated planning goals
- action_plan_mappings: Links action plans to strategic initiatives (Golden Thread)
- resource_requests: Budget requests linked to action plans
- enrollment_snapshots: Parsed enrollment data
- documents: Uploaded files with Gemini File URIs
- validation_scores: PROC rubric scores
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Organizations table (self-referential hierarchy)
    op.create_table(
        'organizations',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('type', sa.Enum('COLLEGE', 'DIVISION', 'DEPARTMENT', name='organizationtype'), nullable=False),
        sa.Column('parent_id', sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organizations_parent_id'), 'organizations', ['parent_id'], unique=False)

    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('firebase_uid', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('full_name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('role', sa.Enum('FACULTY', 'CHAIR', 'DEAN', 'ADMIN', 'PROC', name='userrole'), nullable=False),
        sa.Column('department_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_firebase_uid'), 'users', ['firebase_uid'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)
    op.create_index(op.f('ix_users_department_id'), 'users', ['department_id'], unique=False)

    # Strategic Initiatives table (ISMP Goals)
    op.create_table(
        'strategic_initiatives',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('goal_number', sa.Integer(), nullable=False),
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('performance_measure', sa.Text(), nullable=True),
        sa.Column('baseline_value', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('target_value', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False, default=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_strategic_initiatives_goal_number'), 'strategic_initiatives', ['goal_number'], unique=False)
    op.create_index(op.f('ix_strategic_initiatives_code'), 'strategic_initiatives', ['code'], unique=True)

    # Program Reviews table
    op.create_table(
        'program_reviews',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('org_id', sa.Uuid(), nullable=False),
        sa.Column('author_id', sa.Uuid(), nullable=False),
        sa.Column('cycle_year', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('review_type', sa.Enum('COMPREHENSIVE', 'ANNUAL', name='reviewtype'), nullable=False),
        sa.Column('status', sa.Enum('DRAFT', 'IN_REVIEW', 'VALIDATED', 'APPROVED', name='reviewstatus'), nullable=False),
        sa.Column('content', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_program_reviews_org_id'), 'program_reviews', ['org_id'], unique=False)
    op.create_index(op.f('ix_program_reviews_author_id'), 'program_reviews', ['author_id'], unique=False)

    # Review Sections table
    op.create_table(
        'review_sections',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('review_id', sa.Uuid(), nullable=False),
        sa.Column('section_key', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('status', sa.Enum('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', name='sectionstatus'), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('ai_drafts', sa.JSON(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['review_id'], ['program_reviews.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_review_sections_review_id'), 'review_sections', ['review_id'], unique=False)

    # Action Plans table
    op.create_table(
        'action_plans',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('review_id', sa.Uuid(), nullable=False),
        sa.Column('title', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('NOT_STARTED', 'ONGOING', 'COMPLETE', 'INSTITUTIONALIZED', name='actionplanstatus'), nullable=False),
        sa.Column('addresses_equity_gap', sa.Boolean(), nullable=False, default=False),
        sa.Column('justification', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['review_id'], ['program_reviews.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_action_plans_review_id'), 'action_plans', ['review_id'], unique=False)

    # Action Plan Mappings table (Golden Thread junction)
    op.create_table(
        'action_plan_mappings',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('action_plan_id', sa.Uuid(), nullable=False),
        sa.Column('initiative_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['action_plan_id'], ['action_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['initiative_id'], ['strategic_initiatives.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('action_plan_id', 'initiative_id', name='uq_action_plan_initiative')
    )
    op.create_index(op.f('ix_action_plan_mappings_action_plan_id'), 'action_plan_mappings', ['action_plan_id'], unique=False)
    op.create_index(op.f('ix_action_plan_mappings_initiative_id'), 'action_plan_mappings', ['initiative_id'], unique=False)

    # Resource Requests table
    op.create_table(
        'resource_requests',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('action_plan_id', sa.Uuid(), nullable=False),
        sa.Column('object_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('justification', sa.Text(), nullable=True),
        sa.Column('tco_notes', sa.Text(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False, default=1),
        sa.Column('is_funded', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['action_plan_id'], ['action_plans.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resource_requests_action_plan_id'), 'resource_requests', ['action_plan_id'], unique=False)

    # Enrollment Snapshots table
    op.create_table(
        'enrollment_snapshots',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('term', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('snapshot_date', sa.Date(), nullable=False),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_enrollment_snapshots_term'), 'enrollment_snapshots', ['term'], unique=False)

    # Documents table
    op.create_table(
        'documents',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('filename', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('gemini_file_uri', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('review_id', sa.Uuid(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['review_id'], ['program_reviews.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_documents_review_id'), 'documents', ['review_id'], unique=False)

    # Validation Scores table
    op.create_table(
        'validation_scores',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('review_id', sa.Uuid(), nullable=False),
        sa.Column('validator_id', sa.Uuid(), nullable=False),
        sa.Column('rubric_scores', sa.JSON(), nullable=True),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['review_id'], ['program_reviews.id'], ),
        sa.ForeignKeyConstraint(['validator_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_validation_scores_review_id'), 'validation_scores', ['review_id'], unique=False)
    op.create_index(op.f('ix_validation_scores_validator_id'), 'validation_scores', ['validator_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign key constraints)
    op.drop_table('validation_scores')
    op.drop_table('documents')
    op.drop_table('enrollment_snapshots')
    op.drop_table('resource_requests')
    op.drop_table('action_plan_mappings')
    op.drop_table('action_plans')
    op.drop_table('review_sections')
    op.drop_table('program_reviews')
    op.drop_table('strategic_initiatives')
    op.drop_table('users')
    op.drop_table('organizations')

    # Drop enum types
    op.execute('DROP TYPE IF EXISTS organizationtype')
    op.execute('DROP TYPE IF EXISTS userrole')
    op.execute('DROP TYPE IF EXISTS reviewtype')
    op.execute('DROP TYPE IF EXISTS reviewstatus')
    op.execute('DROP TYPE IF EXISTS sectionstatus')
    op.execute('DROP TYPE IF EXISTS actionplanstatus')
