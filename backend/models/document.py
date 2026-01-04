"""
Document model for uploaded files and RAG documents.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Document(SQLModel, table=True):
    """Uploaded documents for evidence locker and RAG."""

    __tablename__ = "documents"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    filename: str
    original_filename: str
    content_type: str
    file_size: int
    gemini_file_uri: Optional[str] = Field(default=None, description="URI in Google Gen AI")
    review_id: Optional[UUID] = Field(default=None, foreign_key="program_reviews.id", index=True)
    section_key: Optional[str] = Field(default=None)
    uploaded_by_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
