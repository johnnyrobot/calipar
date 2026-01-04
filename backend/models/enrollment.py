"""
Enrollment data snapshot model.
"""

from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON


class EnrollmentSnapshot(SQLModel, table=True):
    """Stores enrollment data snapshots by term."""

    __tablename__ = "enrollment_snapshots"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    term: str = Field(index=True, description="e.g., 'Fall 2024', 'Spring 2025'")
    snapshot_date: date
    data: dict = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
