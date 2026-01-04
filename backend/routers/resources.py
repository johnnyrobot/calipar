"""
Resource Request endpoints.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.resource_request import ResourceRequest
from models.action_plan import ActionPlan
from models.user import User
from routers.auth import get_current_user

router = APIRouter()


class ResourceCreate(BaseModel):
    """Create resource request."""
    action_plan_id: UUID
    object_code: str
    description: str
    amount: Decimal
    justification: str
    tco_notes: Optional[str] = None
    priority: int = 1


class ResourceUpdate(BaseModel):
    """Update resource request."""
    object_code: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    justification: Optional[str] = None
    tco_notes: Optional[str] = None


class ResourceResponse(BaseModel):
    """Resource request response."""
    id: UUID
    action_plan_id: UUID
    object_code: str
    description: str
    amount: Decimal
    justification: str
    tco_notes: Optional[str]
    priority: int
    is_funded: bool
    funded_amount: Optional[Decimal]
    created_at: datetime
    updated_at: datetime


class ResourceSummary(BaseModel):
    """Budget committee summary view."""
    total_requested: Decimal
    total_funded: Decimal
    by_object_code: List[dict]
    by_priority: List[dict]


class PriorityUpdate(BaseModel):
    """Update resource priority."""
    priority: int


class FundingUpdate(BaseModel):
    """Update funding status."""
    is_funded: bool
    funded_amount: Optional[Decimal] = None


# Valid LACCD object codes (1000-6000 series)
VALID_OBJECT_CODES = {
    "1000": "Academic Salaries",
    "2000": "Classified Salaries",
    "3000": "Employee Benefits",
    "4000": "Books, Supplies, Materials",
    "5000": "Services & Operating Expenses",
    "6000": "Capital Outlay",
}


@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    resource_data: ResourceCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new resource request.
    Must be linked to an action plan (The Golden Thread).
    """
    # Validate action plan exists
    action_plan = session.get(ActionPlan, resource_data.action_plan_id)
    if not action_plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resource must be linked to a valid action plan",
        )

    # Validate object code
    code_prefix = resource_data.object_code[:4]
    if code_prefix not in VALID_OBJECT_CODES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid object code. Must be in {list(VALID_OBJECT_CODES.keys())} series",
        )

    resource = ResourceRequest(**resource_data.model_dump())
    session.add(resource)
    session.commit()
    session.refresh(resource)
    return resource


@router.get("", response_model=List[ResourceResponse])
async def list_resources(
    action_plan_id: Optional[UUID] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List resource requests."""
    query = select(ResourceRequest)

    if action_plan_id:
        query = query.where(ResourceRequest.action_plan_id == action_plan_id)

    resources = session.exec(query.order_by(ResourceRequest.priority)).all()
    return resources


@router.get("/summary", response_model=ResourceSummary)
async def get_resource_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get budget committee summary view of all resource requests."""
    resources = session.exec(select(ResourceRequest)).all()

    total_requested = sum(r.amount for r in resources)
    total_funded = sum(r.funded_amount or 0 for r in resources if r.is_funded)

    # Group by object code
    by_object_code = {}
    for r in resources:
        code = r.object_code[:4]
        if code not in by_object_code:
            by_object_code[code] = {
                "code": code,
                "name": VALID_OBJECT_CODES.get(code, "Unknown"),
                "requested": Decimal(0),
                "funded": Decimal(0),
                "count": 0,
            }
        by_object_code[code]["requested"] += r.amount
        by_object_code[code]["funded"] += r.funded_amount or 0
        by_object_code[code]["count"] += 1

    # Group by priority
    by_priority = {}
    for r in resources:
        p = r.priority
        if p not in by_priority:
            by_priority[p] = {
                "priority": p,
                "requested": Decimal(0),
                "funded": Decimal(0),
                "count": 0,
            }
        by_priority[p]["requested"] += r.amount
        by_priority[p]["funded"] += r.funded_amount or 0
        by_priority[p]["count"] += 1

    return ResourceSummary(
        total_requested=total_requested,
        total_funded=total_funded,
        by_object_code=list(by_object_code.values()),
        by_priority=sorted(by_priority.values(), key=lambda x: x["priority"]),
    )


@router.patch("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: UUID,
    resource_data: ResourceUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a resource request."""
    resource = session.get(ResourceRequest, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource request not found",
        )

    # Update fields
    update_data = resource_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(resource, key, value)

    resource.updated_at = datetime.utcnow()
    session.add(resource)
    session.commit()
    session.refresh(resource)
    return resource


@router.patch("/{resource_id}/priority", response_model=ResourceResponse)
async def update_priority(
    resource_id: UUID,
    priority_data: PriorityUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update resource priority (for drag-and-drop reordering)."""
    resource = session.get(ResourceRequest, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource request not found",
        )

    resource.priority = priority_data.priority
    resource.updated_at = datetime.utcnow()
    session.add(resource)
    session.commit()
    session.refresh(resource)
    return resource


@router.patch("/{resource_id}/fund", response_model=ResourceResponse)
async def update_funding(
    resource_id: UUID,
    funding_data: FundingUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark a resource as funded (Admin only in production)."""
    resource = session.get(ResourceRequest, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource request not found",
        )

    resource.is_funded = funding_data.is_funded
    resource.funded_amount = funding_data.funded_amount
    resource.updated_at = datetime.utcnow()
    session.add(resource)
    session.commit()
    session.refresh(resource)
    return resource
