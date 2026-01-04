"""
Program Review endpoints.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.program_review import ProgramReview, ReviewSection, ReviewStatus, ReviewType, SectionStatus
from models.organization import Organization
from models.user import User
from routers.auth import get_current_user

router = APIRouter()


class ReviewCreate(BaseModel):
    """Create program review request."""
    org_id: UUID
    cycle_year: str
    review_type: ReviewType = ReviewType.ANNUAL


class ReviewUpdate(BaseModel):
    """Update program review request."""
    content: Optional[dict] = None
    status: Optional[ReviewStatus] = None


class ReviewResponse(BaseModel):
    """Program review response."""
    id: UUID
    org_id: UUID
    org_name: Optional[str] = None
    author_id: UUID
    author_name: Optional[str] = None
    cycle_year: str
    review_type: ReviewType
    status: ReviewStatus
    content: dict
    created_at: datetime
    updated_at: datetime


class SectionUpdate(BaseModel):
    """Update section request."""
    content: Optional[str] = None
    status: Optional[SectionStatus] = None
    ai_drafts: Optional[dict] = None


class SectionResponse(BaseModel):
    """Section response."""
    id: UUID
    review_id: UUID
    section_key: str
    status: SectionStatus
    content: Optional[str]
    ai_drafts: dict
    updated_at: datetime


def _enrich_review(review: ProgramReview, session: Session) -> ReviewResponse:
    """Helper to enrich a review with org_name and author_name."""
    org = session.get(Organization, review.org_id)
    org_name = org.name if org else None

    author = session.get(User, review.author_id)
    author_name = author.full_name if author else None

    return ReviewResponse(
        id=review.id,
        org_id=review.org_id,
        org_name=org_name,
        author_id=review.author_id,
        author_name=author_name,
        cycle_year=review.cycle_year,
        review_type=review.review_type,
        status=review.status,
        content=review.content,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.get("", response_model=List[ReviewResponse])
async def list_reviews(
    org_id: Optional[UUID] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List program reviews, optionally filtered by organization."""
    query = select(ProgramReview)

    if org_id:
        query = query.where(ProgramReview.org_id == org_id)

    # Faculty can only see their department's reviews
    if current_user.role == "faculty" and current_user.department_id:
        query = query.where(ProgramReview.org_id == current_user.department_id)

    reviews = session.exec(query.order_by(ProgramReview.updated_at.desc())).all()

    # Enrich reviews with org_name and author_name
    return [_enrich_review(review, session) for review in reviews]


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new program review."""
    review = ProgramReview(
        **review_data.model_dump(),
        author_id=current_user.id,
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return _enrich_review(review, session)


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a specific program review."""
    review = session.get(ProgramReview, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )
    return _enrich_review(review, session)


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: UUID,
    review_data: ReviewUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a program review."""
    review = session.get(ProgramReview, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    # Update fields
    update_data = review_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(review, key, value)

    review.updated_at = datetime.utcnow()
    session.add(review)
    session.commit()
    session.refresh(review)
    return _enrich_review(review, session)


@router.post("/{review_id}/submit", response_model=ReviewResponse)
async def submit_review(
    review_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Submit a program review for approval."""
    review = session.get(ProgramReview, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    if review.status != ReviewStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft reviews can be submitted",
        )

    review.status = ReviewStatus.IN_REVIEW
    review.updated_at = datetime.utcnow()
    session.add(review)
    session.commit()
    session.refresh(review)
    return _enrich_review(review, session)


@router.get("/{review_id}/sections", response_model=List[SectionResponse])
async def list_sections(
    review_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all sections for a program review."""
    sections = session.exec(
        select(ReviewSection).where(ReviewSection.review_id == review_id)
    ).all()
    return sections


@router.patch("/{review_id}/sections/{section_key}", response_model=SectionResponse)
async def update_section(
    review_id: UUID,
    section_key: str,
    section_data: SectionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update or create a review section."""
    # Check review exists
    review = session.get(ProgramReview, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    # Find or create section
    section = session.exec(
        select(ReviewSection).where(
            ReviewSection.review_id == review_id,
            ReviewSection.section_key == section_key,
        )
    ).first()

    if not section:
        section = ReviewSection(review_id=review_id, section_key=section_key)

    # Update fields
    update_data = section_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(section, key, value)

    section.updated_at = datetime.utcnow()
    session.add(section)
    session.commit()
    session.refresh(section)
    return section
