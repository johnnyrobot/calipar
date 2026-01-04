"""
Audit Service for logging changes to entities.

Provides a simple API for recording audit trail entries
throughout the application.
"""

from typing import Optional, Any
from uuid import UUID

from sqlmodel import Session

from models.audit import AuditTrail, AuditAction


class AuditService:
    """Service for recording audit trail entries."""

    def __init__(self, session: Session):
        self.session = session

    def log(
        self,
        entity_type: str,
        entity_id: UUID,
        action: AuditAction,
        user_id: Optional[UUID] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        description: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> AuditTrail:
        """
        Record an audit trail entry.

        Args:
            entity_type: Type of entity (e.g., "program_review", "action_plan")
            entity_id: UUID of the entity
            action: The action performed
            user_id: ID of the user who performed the action
            old_values: Previous values before change
            new_values: New values after change
            description: Human-readable description
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            The created AuditTrail entry
        """
        entry = AuditTrail(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.session.add(entry)
        self.session.commit()
        self.session.refresh(entry)
        return entry

    def log_create(
        self,
        entity_type: str,
        entity_id: UUID,
        new_values: dict,
        user_id: Optional[UUID] = None,
        description: Optional[str] = None,
        **kwargs,
    ) -> AuditTrail:
        """Convenience method for logging creation events."""
        return self.log(
            entity_type=entity_type,
            entity_id=entity_id,
            action=AuditAction.CREATED,
            user_id=user_id,
            new_values=new_values,
            description=description or f"Created {entity_type}",
            **kwargs,
        )

    def log_update(
        self,
        entity_type: str,
        entity_id: UUID,
        old_values: dict,
        new_values: dict,
        user_id: Optional[UUID] = None,
        description: Optional[str] = None,
        **kwargs,
    ) -> AuditTrail:
        """Convenience method for logging update events."""
        return self.log(
            entity_type=entity_type,
            entity_id=entity_id,
            action=AuditAction.UPDATED,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            description=description or f"Updated {entity_type}",
            **kwargs,
        )

    def log_delete(
        self,
        entity_type: str,
        entity_id: UUID,
        old_values: dict,
        user_id: Optional[UUID] = None,
        description: Optional[str] = None,
        **kwargs,
    ) -> AuditTrail:
        """Convenience method for logging deletion events."""
        return self.log(
            entity_type=entity_type,
            entity_id=entity_id,
            action=AuditAction.DELETED,
            user_id=user_id,
            old_values=old_values,
            description=description or f"Deleted {entity_type}",
            **kwargs,
        )

    def log_status_change(
        self,
        entity_type: str,
        entity_id: UUID,
        old_status: str,
        new_status: str,
        user_id: Optional[UUID] = None,
        description: Optional[str] = None,
        **kwargs,
    ) -> AuditTrail:
        """Convenience method for logging status changes."""
        return self.log(
            entity_type=entity_type,
            entity_id=entity_id,
            action=AuditAction.STATUS_CHANGED,
            user_id=user_id,
            old_values={"status": old_status},
            new_values={"status": new_status},
            description=description or f"Changed {entity_type} status from {old_status} to {new_status}",
            **kwargs,
        )


def get_audit_service(session: Session) -> AuditService:
    """Dependency to get audit service instance."""
    return AuditService(session)
