"""
Resource Request model for budget allocation.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship, Column
from sqlalchemy import Numeric


class ResourceRequest(SQLModel, table=True):
    """Resource requests linked to action plans."""

    __tablename__ = "resource_requests"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    action_plan_id: UUID = Field(foreign_key="action_plans.id", index=True)
    object_code: str = Field(description="LACCD chart of accounts code (1000-6000 series)")
    description: str
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    justification: str
    tco_notes: Optional[str] = Field(default=None, description="Total Cost of Ownership notes")
    priority: int = Field(default=1, ge=1)
    is_funded: bool = Field(default=False)
    funded_amount: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2), nullable=True))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    action_plan: Optional["ActionPlan"] = Relationship(back_populates="resource_requests")


from models.action_plan import ActionPlan
