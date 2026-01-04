"""
Program Review models.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Any
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship, Column
from sqlalchemy import JSON


class ReviewStatus(str, Enum):
    """Program review workflow statuses."""
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    VALIDATED = "validated"
    APPROVED = "approved"


class ReviewType(str, Enum):
    """Types of program reviews."""
    COMPREHENSIVE = "comprehensive"
    ANNUAL = "annual"


class ProgramReview(SQLModel, table=True):
    """Main program review document."""

    __tablename__ = "program_reviews"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    org_id: UUID = Field(foreign_key="organizations.id", index=True)
    author_id: UUID = Field(foreign_key="users.id", index=True)
    cycle_year: str = Field(description="e.g., '2025-2026'")
    review_type: ReviewType = Field(default=ReviewType.ANNUAL)
    status: ReviewStatus = Field(default=ReviewStatus.DRAFT)
    content: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    organization: Optional["Organization"] = Relationship(back_populates="program_reviews")
    author: Optional["User"] = Relationship(back_populates="authored_reviews")
    sections: List["ReviewSection"] = Relationship(back_populates="review")
    action_plans: List["ActionPlan"] = Relationship(back_populates="review")
    validation_scores: List["ValidationScore"] = Relationship(back_populates="review")


class SectionStatus(str, Enum):
    """Section completion status."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ReviewSection(SQLModel, table=True):
    """Individual sections within a program review."""

    __tablename__ = "review_sections"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    review_id: UUID = Field(foreign_key="program_reviews.id", index=True)
    section_key: str = Field(description="Flexible section identifier")
    status: SectionStatus = Field(default=SectionStatus.NOT_STARTED)
    content: Optional[str] = Field(default=None, description="Narrative response")
    ai_drafts: dict = Field(default_factory=dict, sa_column=Column(JSON))
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    review: Optional[ProgramReview] = Relationship(back_populates="sections")


# Avoid circular imports
from models.organization import Organization
from models.user import User
from models.action_plan import ActionPlan
from models.validation import ValidationScore
