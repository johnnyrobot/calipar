"""
User model for CALIPAR platform.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship


class UserRole(str, Enum):
    """User roles in the system."""
    FACULTY = "faculty"
    CHAIR = "chair"
    DEAN = "dean"
    ADMIN = "admin"
    PROC = "proc"


class User(SQLModel, table=True):
    """User model representing platform users."""

    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    firebase_uid: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    full_name: str
    role: UserRole = Field(default=UserRole.FACULTY)
    department_id: Optional[UUID] = Field(default=None, foreign_key="organizations.id")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    department: Optional["Organization"] = Relationship(back_populates="users")
    authored_reviews: list["ProgramReview"] = Relationship(back_populates="author")
    validation_scores: list["ValidationScore"] = Relationship(back_populates="validator")


# Import at bottom to avoid circular imports
from models.organization import Organization
from models.program_review import ProgramReview
from models.validation import ValidationScore
