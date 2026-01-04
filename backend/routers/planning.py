"""
Integrated Planning endpoints - Action Plans and Strategic Initiatives.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.action_plan import ActionPlan, ActionPlanMapping, ActionPlanStatus
from models.strategic_initiative import StrategicInitiative
from models.user import User
from routers.auth import get_current_user

router = APIRouter()


class InitiativeResponse(BaseModel):
    """Strategic initiative response."""
    id: UUID
    goal_number: int
    code: str
    title: str
    description: str
    performance_measure: Optional[str]
    baseline_value: Optional[str]
    target_value: Optional[str]


class ActionPlanCreate(BaseModel):
    """Create action plan request."""
    review_id: UUID
    title: str
    description: str
    addresses_equity_gap: bool = False
    justification: Optional[str] = None


class ActionPlanUpdate(BaseModel):
    """Update action plan request."""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ActionPlanStatus] = None
    addresses_equity_gap: Optional[bool] = None
    justification: Optional[str] = None


class ActionPlanResponse(BaseModel):
    """Action plan response."""
    id: UUID
    review_id: UUID
    title: str
    description: str
    status: ActionPlanStatus
    addresses_equity_gap: bool
    justification: Optional[str]
    created_at: datetime
    updated_at: datetime
    initiatives: List[InitiativeResponse] = []


class MappingRequest(BaseModel):
    """Map action plan to initiative."""
    initiative_id: UUID


@router.get("/initiatives", response_model=List[InitiativeResponse])
async def list_initiatives(
    goal_number: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all strategic initiatives (ISMP goals and objectives)."""
    query = select(StrategicInitiative).where(StrategicInitiative.is_active == True)

    if goal_number:
        query = query.where(StrategicInitiative.goal_number == goal_number)

    initiatives = session.exec(query.order_by(StrategicInitiative.code)).all()
    return initiatives


@router.post("/action-plans", response_model=ActionPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_action_plan(
    plan_data: ActionPlanCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new action plan."""
    # Validate equity gap justification
    if plan_data.addresses_equity_gap and not plan_data.justification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Justification required when addressing equity gap",
        )

    plan = ActionPlan(**plan_data.model_dump())
    session.add(plan)
    session.commit()
    session.refresh(plan)

    return ActionPlanResponse(
        **plan.model_dump(),
        initiatives=[],
    )


@router.get("/action-plans/{plan_id}", response_model=ActionPlanResponse)
async def get_action_plan(
    plan_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get an action plan with its mapped initiatives."""
    plan = session.get(ActionPlan, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action plan not found",
        )

    # Get mapped initiatives
    mappings = session.exec(
        select(ActionPlanMapping).where(ActionPlanMapping.action_plan_id == plan_id)
    ).all()

    initiative_ids = [m.initiative_id for m in mappings]
    initiatives = []
    if initiative_ids:
        initiatives = session.exec(
            select(StrategicInitiative).where(StrategicInitiative.id.in_(initiative_ids))
        ).all()

    return ActionPlanResponse(
        **plan.model_dump(),
        initiatives=[InitiativeResponse(**i.model_dump()) for i in initiatives],
    )


@router.patch("/action-plans/{plan_id}", response_model=ActionPlanResponse)
async def update_action_plan(
    plan_id: UUID,
    plan_data: ActionPlanUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update an action plan."""
    plan = session.get(ActionPlan, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action plan not found",
        )

    # Update fields
    update_data = plan_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plan, key, value)

    plan.updated_at = datetime.utcnow()
    session.add(plan)
    session.commit()
    session.refresh(plan)

    # Get initiatives
    mappings = session.exec(
        select(ActionPlanMapping).where(ActionPlanMapping.action_plan_id == plan_id)
    ).all()
    initiative_ids = [m.initiative_id for m in mappings]
    initiatives = []
    if initiative_ids:
        initiatives = session.exec(
            select(StrategicInitiative).where(StrategicInitiative.id.in_(initiative_ids))
        ).all()

    return ActionPlanResponse(
        **plan.model_dump(),
        initiatives=[InitiativeResponse(**i.model_dump()) for i in initiatives],
    )


@router.post("/action-plans/{plan_id}/map-initiative", response_model=ActionPlanResponse)
async def map_initiative(
    plan_id: UUID,
    mapping_data: MappingRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Map an action plan to a strategic initiative (The Golden Thread)."""
    plan = session.get(ActionPlan, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action plan not found",
        )

    initiative = session.get(StrategicInitiative, mapping_data.initiative_id)
    if not initiative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategic initiative not found",
        )

    # Check if mapping already exists
    existing = session.exec(
        select(ActionPlanMapping).where(
            ActionPlanMapping.action_plan_id == plan_id,
            ActionPlanMapping.initiative_id == mapping_data.initiative_id,
        )
    ).first()

    if not existing:
        mapping = ActionPlanMapping(
            action_plan_id=plan_id,
            initiative_id=mapping_data.initiative_id,
        )
        session.add(mapping)
        session.commit()

    # Return updated plan with initiatives
    return await get_action_plan(plan_id, session, current_user)
