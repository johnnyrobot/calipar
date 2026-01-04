"""
Action Plan models for integrated planning.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship


class ActionPlanStatus(str, Enum):
    """Status of action plans."""
    NOT_STARTED = "not_started"
    ONGOING = "ongoing"
    COMPLETE = "complete"
    INSTITUTIONALIZED = "institutionalized"


class ActionPlan(SQLModel, table=True):
    """Action plan linked to program reviews."""

    __tablename__ = "action_plans"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    review_id: UUID = Field(foreign_key="program_reviews.id", index=True)
    title: str
    description: str
    status: ActionPlanStatus = Field(default=ActionPlanStatus.NOT_STARTED)
    addresses_equity_gap: bool = Field(default=False)
    justification: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    review: Optional["ProgramReview"] = Relationship(back_populates="action_plans")
    initiative_mappings: List["ActionPlanMapping"] = Relationship(back_populates="action_plan")
    resource_requests: List["ResourceRequest"] = Relationship(back_populates="action_plan")


class ActionPlanMapping(SQLModel, table=True):
    """Maps action plans to strategic initiatives (The Golden Thread)."""

    __tablename__ = "action_plan_mappings"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    action_plan_id: UUID = Field(foreign_key="action_plans.id", index=True)
    initiative_id: UUID = Field(foreign_key="strategic_initiatives.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    action_plan: Optional[ActionPlan] = Relationship(back_populates="initiative_mappings")
    initiative: Optional["StrategicInitiative"] = Relationship(back_populates="action_plan_mappings")


from models.program_review import ProgramReview
from models.resource_request import ResourceRequest
from models.strategic_initiative import StrategicInitiative
