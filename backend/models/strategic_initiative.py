"""
Strategic Initiative model for ISMP goals and objectives.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship


class StrategicInitiative(SQLModel, table=True):
    """
    Strategic initiatives from CCC's ISMP (2019-2024).
    Represents the 5 strategic goals and their objectives.
    """

    __tablename__ = "strategic_initiatives"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    goal_number: int = Field(ge=1, le=5, description="ISMP goal number (1-5)")
    code: str = Field(index=True, description="e.g., '1.1', '3.3'")
    title: str = Field(description="Goal title, e.g., 'Expand Access'")
    description: str = Field(description="Full objective text from ISMP")
    performance_measure: Optional[str] = Field(default=None)
    baseline_value: Optional[str] = Field(default=None, description="e.g., '66.5%'")
    target_value: Optional[str] = Field(default=None, description="e.g., '67%'")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    action_plan_mappings: List["ActionPlanMapping"] = Relationship(back_populates="initiative")


from models.action_plan import ActionPlanMapping
