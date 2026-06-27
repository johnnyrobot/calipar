"""
Admin endpoints — user management.

All routes require the ADMIN role. Provides CRUD over platform users for the
admin user-directory UI.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

from database import get_session
from models.user import User, UserRole
from routers.auth import get_current_user, require_role

router = APIRouter()


def _other_active_admins_exist(session: Session, exclude_id: UUID) -> bool:
    """True if at least one active admin other than `exclude_id` exists."""
    return session.exec(
        select(User).where(
            User.role == UserRole.ADMIN,
            User.is_active == True,  # noqa: E712 - SQL boolean comparison
            User.id != exclude_id,
        )
    ).first() is not None


class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.FACULTY
    department_id: Optional[UUID] = None
    is_active: bool = True
    # Optional: when an admin pre-creates an account before the user signs in
    # via Firebase, the firebase_uid may not exist yet. A placeholder is
    # generated and later reconciled at first login.
    firebase_uid: Optional[str] = None


class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    department_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class AdminUserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: UserRole
    department_id: Optional[UUID]
    is_active: bool
    created_at: datetime
    updated_at: datetime


@router.get("/users", response_model=List[AdminUserResponse])
async def list_users(
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    department_id: Optional[UUID] = None,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """List all users, optionally filtered by role, active status, or department."""
    query = select(User)
    if role is not None:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if department_id is not None:
        query = query.where(User.department_id == department_id)
    return session.exec(query.order_by(User.created_at.desc())).all()


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: AdminUserCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """Create a new user."""
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email {data.email} already exists.",
        )
    user = User(
        email=data.email,
        full_name=data.full_name,
        role=data.role,
        department_id=data.department_id,
        is_active=data.is_active,
        firebase_uid=data.firebase_uid or f"pending-{uuid4()}",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: UUID,
    data: AdminUserUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role(UserRole.ADMIN)),
):
    """Update a user's profile, role, department, or active status."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    updates = data.model_dump(exclude_unset=True)

    # Prevent locking the platform out of admin access: refuse to demote or
    # deactivate the last remaining active admin (covers an admin editing their
    # own account as well as the final other admin).
    demoting = "role" in updates and updates["role"] != UserRole.ADMIN
    deactivating = updates.get("is_active") is False
    if user.role == UserRole.ADMIN and (demoting or deactivating):
        if not _other_active_admins_exist(session, user.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote or deactivate the last active admin.",
            )

    for field, value in updates.items():
        setattr(user, field, value)
    user.updated_at = datetime.utcnow()

    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Delete a user. An admin cannot delete their own account."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )
    if user.role == UserRole.ADMIN and not _other_active_admins_exist(session, user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the last active admin.",
        )
    session.delete(user)
    session.commit()
    return None
