"""
Audit Trail model for compliance logging.

Tracks all changes to program reviews and related entities
for ACCJC accreditation compliance.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, Any
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship, Column
from sqlalchemy import JSON, Text


class AuditAction(str, Enum):
    """Types of auditable actions."""
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    STATUS_CHANGED = "status_changed"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMMENT_ADDED = "comment_added"


class AuditTrail(SQLModel, table=True):
    """
    Audit trail for tracking all changes to entities.

    Provides compliance-ready logging for ACCJC accreditation,
    tracking who changed what, when, and the before/after values.
    """

    __tablename__ = "audit_trail"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # What was changed
    entity_type: str = Field(
        index=True,
        description="Type of entity (program_review, action_plan, resource_request, etc.)"
    )
    entity_id: UUID = Field(
        index=True,
        description="ID of the entity that was changed"
    )

    # What action was performed
    action: AuditAction = Field(
        description="Type of action performed"
    )

    # Who made the change
    user_id: Optional[UUID] = Field(
        default=None,
        foreign_key="users.id",
        index=True,
        description="User who performed the action (null for system actions)"
    )

    # What changed
    old_values: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Previous values before change (for updates)"
    )
    new_values: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON),
        description="New values after change"
    )

    # Additional context
    description: Optional[str] = Field(
        default=None,
        sa_column=Column(Text),
        description="Human-readable description of the change"
    )
    ip_address: Optional[str] = Field(
        default=None,
        description="IP address of the client making the change"
    )
    user_agent: Optional[str] = Field(
        default=None,
        description="User agent string of the client"
    )

    # Timestamp
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True,
        description="When the action occurred"
    )

    # Relationships
    user: Optional["User"] = Relationship()


# Import at end to avoid circular imports
from models.user import User
