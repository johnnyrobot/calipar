"""
Authentication endpoints and RBAC utilities.

Supports both Firebase authentication (production) and development mode.
Firebase Admin SDK is used for token verification when available.
"""

import logging
from typing import Optional, List, Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

from database import get_session
from models.user import User, UserRole
from services.firebase import get_firebase_service, FirebaseService
from services.demo_mode import is_demo_user, get_demo_status, DEMO_USER_ACCOUNTS

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Authentication Functions (must be defined first, before RBAC)
# =============================================================================

class LoginRequest(BaseModel):
    """Firebase token verification request."""
    id_token: str


class LoginResponse(BaseModel):
    """Login response with user profile."""
    id: UUID
    email: str
    full_name: str
    role: UserRole
    department_id: Optional[UUID] = None
    is_demo_user: bool = False


class UserCreate(BaseModel):
    """User creation for seeding."""
    firebase_uid: str
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.FACULTY
    department_id: Optional[UUID] = None


async def get_current_user(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
    firebase: FirebaseService = Depends(get_firebase_service),
) -> User:
    """
    Dependency to get current authenticated user.

    When Firebase is available:
    - Verifies the Firebase ID token
    - Looks up user by Firebase UID

    In development mode (Firebase not configured):
    - Accepts user ID or firebase_uid directly in Authorization header
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected: Bearer <token>",
        )

    token = authorization[7:]
    firebase_uid = None

    # Try Firebase token verification if available
    if firebase.is_available:
        try:
            decoded_token = await firebase.verify_token(token)
            if decoded_token:
                firebase_uid = decoded_token.get("uid")
                logger.debug(f"Firebase token verified for UID: {firebase_uid}")
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e),
            )
    else:
        # Development mode: token IS the firebase_uid or user_id
        firebase_uid = token
        logger.debug(f"Development mode: using token as identifier: {firebase_uid}")

    # Look up user in database
    if firebase_uid:
        # Try by firebase_uid first
        user = session.exec(
            select(User).where(User.firebase_uid == firebase_uid)
        ).first()

        if user:
            return user

        # Try by user ID (for development convenience)
        if len(firebase_uid) == 36:  # UUID length
            try:
                user = session.exec(
                    select(User).where(User.id == firebase_uid)
                ).first()
                if user:
                    return user
            except Exception:
                pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    session: Session = Depends(get_session),
    firebase: FirebaseService = Depends(get_firebase_service),
):
    """
    Verify Firebase token and return user profile.

    When Firebase is available:
    - Verifies the ID token with Firebase Admin SDK
    - Looks up user by verified Firebase UID

    In development mode:
    - Accepts firebase_uid directly (no verification)
    """
    firebase_uid = None

    # Try Firebase token verification if available
    if firebase.is_available:
        try:
            decoded_token = await firebase.verify_token(request.id_token)
            if decoded_token:
                firebase_uid = decoded_token.get("uid")
                logger.info(f"User logged in via Firebase: {decoded_token.get('email', firebase_uid)}")
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e),
            )
    else:
        # Development mode: token IS the firebase_uid
        firebase_uid = request.id_token
        logger.info(f"Development login: {firebase_uid}")

    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    # Look up user in database
    user = session.exec(
        select(User).where(User.firebase_uid == firebase_uid)
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. Please contact administrator.",
        )

    # Check if this is a demo user
    demo_user = is_demo_user(user.email, user.firebase_uid)

    return LoginResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department_id=user.department_id,
        is_demo_user=demo_user,
    )


@router.post("/seed", response_model=LoginResponse)
async def seed_user(
    user_data: UserCreate,
    session: Session = Depends(get_session),
):
    """
    Seed a user for development.
    This endpoint should be disabled in production.
    """
    # Check if user already exists
    existing = session.exec(
        select(User).where(
            (User.firebase_uid == user_data.firebase_uid) | (User.email == user_data.email)
        )
    ).first()

    if existing:
        return LoginResponse(
            id=existing.id,
            email=existing.email,
            full_name=existing.full_name,
            role=existing.role,
            department_id=existing.department_id,
        )

    # Create new user
    user = User(**user_data.model_dump())
    session.add(user)
    session.commit()
    session.refresh(user)

    return LoginResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department_id=user.department_id,
    )


@router.get("/me", response_model=LoginResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    demo_user = is_demo_user(current_user.email, current_user.firebase_uid)
    return LoginResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        department_id=current_user.department_id,
        is_demo_user=demo_user,
    )


class AuthStatusResponse(BaseModel):
    """Authentication system status."""
    firebase_enabled: bool
    development_mode: bool
    demo_mode_enabled: bool = False
    demo_user_prefix: str = "demo"


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status(
    firebase: FirebaseService = Depends(get_firebase_service),
):
    """
    Get authentication system status.

    Returns whether Firebase is configured, if development mode is active,
    and demo mode settings. Useful for frontend to determine login behavior.
    """
    from config import get_settings
    settings = get_settings()

    return AuthStatusResponse(
        firebase_enabled=firebase.is_available,
        development_mode=not firebase.is_available,
        demo_mode_enabled=settings.demo_mode_enabled,
        demo_user_prefix=settings.demo_user_prefix,
    )


@router.get("/demo-status")
async def get_demo_mode_status():
    """
    Get detailed demo mode status including reset schedule.

    Returns information about demo mode configuration and when the next
    data reset will occur.
    """
    return get_demo_status()


# Demo mode user accounts endpoint (for login page)
@router.get("/demo-accounts")
async def get_demo_accounts():
    """
    Get list of available demo user accounts.

    Returns the predefined demo user accounts that can be used for
    testing and demonstrations.
    """
    from config import get_settings
    settings = get_settings()

    if not settings.demo_mode_enabled:
        return {"accounts": [], "demo_mode_enabled": False}

    return {
        "demo_mode_enabled": True,
        "demo_user_prefix": settings.demo_user_prefix,
        "accounts": DEMO_USER_ACCOUNTS,
    }


# =============================================================================
# Role-Based Access Control (RBAC)
# =============================================================================

# Role hierarchy: Higher index = more permissions
# Admin has the highest level, can do everything
# PROC is a special role for Program Review Oversight Committee
ROLE_HIERARCHY = {
    UserRole.FACULTY: 1,
    UserRole.CHAIR: 2,
    UserRole.PROC: 2,  # PROC is parallel to Chair, not higher
    UserRole.DEAN: 3,
    UserRole.ADMIN: 4,
}


def get_role_level(role: UserRole) -> int:
    """Get the hierarchy level of a role."""
    return ROLE_HIERARCHY.get(role, 0)


def has_role_permission(user_role: UserRole, required_role: UserRole) -> bool:
    """
    Check if a user role has permission based on hierarchy.
    Higher roles can access lower role endpoints.
    PROC is treated specially - it's parallel to Chair.
    """
    # PROC is a special case - only PROC and Admin can access PROC-specific endpoints
    if required_role == UserRole.PROC:
        return user_role in (UserRole.PROC, UserRole.ADMIN)

    # For other roles, use hierarchy
    return get_role_level(user_role) >= get_role_level(required_role)


def require_role(*allowed_roles: UserRole) -> Callable:
    """
    Dependency factory that creates a role-checking dependency.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user: User = Depends(require_role(UserRole.ADMIN))):
            ...

        @router.get("/manager-access")
        async def manager_endpoint(user: User = Depends(require_role(UserRole.CHAIR, UserRole.DEAN))):
            ...

    Args:
        *allowed_roles: One or more roles that are allowed to access the endpoint.
                       If multiple roles are specified, user must have at least one of them.
                       Role hierarchy is also respected (Admin can access all endpoints).

    Returns:
        A FastAPI dependency that validates the user's role.

    Raises:
        HTTPException 403: If the user doesn't have the required role.
    """
    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        # Admin always has access to everything
        if current_user.role == UserRole.ADMIN:
            return current_user

        # Check if user has any of the allowed roles (exact match or hierarchy)
        for required_role in allowed_roles:
            if has_role_permission(current_user.role, required_role):
                return current_user

        # Build error message with allowed roles
        role_names = [role.value for role in allowed_roles]
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role(s): {', '.join(role_names)}. Your role: {current_user.role.value}",
        )

    return role_checker


def require_any_role(*allowed_roles: UserRole) -> Callable:
    """
    Alias for require_role that makes the intent clearer when multiple roles are allowed.
    """
    return require_role(*allowed_roles)


def require_minimum_role(minimum_role: UserRole) -> Callable:
    """
    Dependency factory that requires a minimum role level.
    Uses role hierarchy - any role at or above the minimum level is allowed.

    Usage:
        @router.get("/chair-and-above")
        async def endpoint(user: User = Depends(require_minimum_role(UserRole.CHAIR))):
            # Faculty cannot access, but Chair, Dean, Admin can
            ...

    Args:
        minimum_role: The minimum role required to access the endpoint.

    Returns:
        A FastAPI dependency that validates the user's role level.
    """
    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if has_role_permission(current_user.role, minimum_role):
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Minimum required role: {minimum_role.value}. Your role: {current_user.role.value}",
        )

    return role_checker


# Convenience dependencies for common role requirements
require_admin = require_role(UserRole.ADMIN)
require_dean = require_minimum_role(UserRole.DEAN)
require_chair = require_minimum_role(UserRole.CHAIR)
require_proc = require_role(UserRole.PROC, UserRole.ADMIN)
require_faculty = require_minimum_role(UserRole.FACULTY)  # Any authenticated user
