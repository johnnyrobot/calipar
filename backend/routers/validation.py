"""
Validation endpoints for PROC review and scoring.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.validation import ValidationScore
from models.program_review import ProgramReview, ReviewStatus
from models.user import User, UserRole
from routers.auth import get_current_user

router = APIRouter()


class ValidationCreate(BaseModel):
    """PROC validation request."""
    rubric_scores: dict
    comments: Optional[str] = None


class ValidationResponse(BaseModel):
    """Validation score response."""
    id: UUID
    review_id: UUID
    validator_id: UUID
    rubric_scores: dict
    comments: Optional[str]
    created_at: datetime


@router.post("/reviews/{review_id}/validate", response_model=ValidationResponse)
async def validate_review(
    review_id: UUID,
    validation_data: ValidationCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Submit PROC validation scoring for a review.
    Only PROC and Admin roles can validate.
    """
    # Check role permissions
    if current_user.role not in [UserRole.PROC, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only PROC or Admin can validate reviews",
        )

    # Check review exists and is in correct status
    review = session.get(ProgramReview, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    if review.status != ReviewStatus.IN_REVIEW:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review must be in 'In Review' status to validate",
        )

    # Create validation score
    validation = ValidationScore(
        review_id=review_id,
        validator_id=current_user.id,
        rubric_scores=validation_data.rubric_scores,
        comments=validation_data.comments,
    )
    session.add(validation)

    # Update review status to validated
    review.status = ReviewStatus.VALIDATED
    review.updated_at = datetime.utcnow()
    session.add(review)

    session.commit()
    session.refresh(validation)

    return ValidationResponse(
        id=validation.id,
        review_id=validation.review_id,
        validator_id=validation.validator_id,
        rubric_scores=validation.rubric_scores,
        comments=validation.comments,
        created_at=validation.created_at,
    )


@router.get("/reviews/{review_id}/validation-scores", response_model=List[ValidationResponse])
async def get_validation_scores(
    review_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all validation scores for a review."""
    scores = session.exec(
        select(ValidationScore).where(ValidationScore.review_id == review_id)
    ).all()

    return [
        ValidationResponse(
            id=s.id,
            review_id=s.review_id,
            validator_id=s.validator_id,
            rubric_scores=s.rubric_scores,
            comments=s.comments,
            created_at=s.created_at,
        )
        for s in scores
    ]


@router.post("/reviews/{review_id}/approve", response_model=dict)
async def approve_review(
    review_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Final approval of a validated review.
    Only Admin can approve.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can approve reviews",
        )

    review = session.get(ProgramReview, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    if review.status != ReviewStatus.VALIDATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review must be validated before approval",
        )

    review.status = ReviewStatus.APPROVED
    review.updated_at = datetime.utcnow()
    session.add(review)
    session.commit()

    return {"message": "Review approved", "review_id": str(review_id)}
