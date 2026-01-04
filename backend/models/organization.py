"""
Organization model for departments and divisions.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship


class OrganizationType(str, Enum):
    """Types of organizational units."""
    COLLEGE = "college"
    DIVISION = "division"
    DEPARTMENT = "department"


class Organization(SQLModel, table=True):
    """Organization model for hierarchical structure."""

    __tablename__ = "organizations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True)
    type: OrganizationType
    parent_id: Optional[UUID] = Field(default=None, foreign_key="organizations.id")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Self-referential relationship for hierarchy
    children: List["Organization"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={"foreign_keys": "[Organization.parent_id]"}
    )
    parent: Optional["Organization"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"foreign_keys": "[Organization.parent_id]", "remote_side": "[Organization.id]"}
    )

    # Users in this organization
    users: List["User"] = Relationship(back_populates="department")

    # Program reviews for this organization
    program_reviews: List["ProgramReview"] = Relationship(back_populates="organization")


# Import at bottom to avoid circular imports
from models.user import User
from models.program_review import ProgramReview
