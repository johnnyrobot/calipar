"""
Validation Score model for PROC review.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship, Column
from sqlalchemy import JSON


class ValidationScore(SQLModel, table=True):
    """PROC validation rubric scores for program reviews."""

    __tablename__ = "validation_scores"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    review_id: UUID = Field(foreign_key="program_reviews.id", index=True)
    validator_id: UUID = Field(foreign_key="users.id", index=True)
    rubric_scores: dict = Field(default_factory=dict, sa_column=Column(JSON))
    comments: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    review: Optional["ProgramReview"] = Relationship(back_populates="validation_scores")
    validator: Optional["User"] = Relationship(back_populates="validation_scores")


from models.program_review import ProgramReview
from models.user import User
