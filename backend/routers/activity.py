"""
Activity feed endpoints.

Surfaces the audit trail as a human-friendly recent-activity stream for the
dashboard. Backed by the existing audit_trail table (models/audit.py).
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.audit import AuditTrail
from models.user import User
from routers.auth import get_current_user

router = APIRouter()


class ActivityResponse(BaseModel):
    """A single activity-feed entry derived from an audit record."""

    id: UUID
    type: str  # the audit action, e.g. "updated", "status_changed", "created"
    entity_type: str
    entity_id: UUID
    title: str
    description: Optional[str] = None
    user: Optional[str] = None  # display name of the actor, or None for system
    timestamp: datetime


_ACTION_VERB = {
    "created": "created",
    "updated": "updated",
    "deleted": "deleted",
    "status_changed": "status changed for",
    "submitted": "submitted",
    "approved": "approved",
    "rejected": "rejected",
    "comment_added": "commented on",
}


def _humanize_entity(entity_type: str) -> str:
    return entity_type.replace("_", " ")


@router.get("", response_model=List[ActivityResponse])
async def list_activity(
    limit: int = Query(20, ge=1, le=100),
    entity_type: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Return the most recent activity, newest first.

    Optionally filter by entity_type (e.g. "program_review", "resource_request").
    """
    query = select(AuditTrail)
    if entity_type:
        query = query.where(AuditTrail.entity_type == entity_type)
    query = query.order_by(AuditTrail.created_at.desc()).limit(limit)

    entries = session.exec(query).all()

    activity: List[ActivityResponse] = []
    for entry in entries:
        actor = session.get(User, entry.user_id) if entry.user_id else None
        verb = _ACTION_VERB.get(
            entry.action.value if hasattr(entry.action, "value") else str(entry.action),
            str(entry.action),
        )
        title = f"{_humanize_entity(entry.entity_type)} {verb}".strip().capitalize()
        activity.append(
            ActivityResponse(
                id=entry.id,
                type=entry.action.value if hasattr(entry.action, "value") else str(entry.action),
                entity_type=entry.entity_type,
                entity_id=entry.entity_id,
                title=title,
                description=entry.description,
                user=actor.full_name if actor else None,
                timestamp=entry.created_at,
            )
        )
    return activity
