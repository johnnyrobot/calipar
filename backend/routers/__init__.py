"""
API routers for CALIPAR platform.
"""

from routers import auth, reviews, ai, data, planning, resources, validation

# Export RBAC utilities from auth module for easy access
from routers.auth import (
    get_current_user,
    require_role,
    require_any_role,
    require_minimum_role,
    require_admin,
    require_dean,
    require_chair,
    require_proc,
    require_faculty,
    ROLE_HIERARCHY,
    get_role_level,
    has_role_permission,
)

__all__ = [
    # Router modules
    "auth",
    "reviews",
    "ai",
    "data",
    "planning",
    "resources",
    "validation",
    # RBAC utilities
    "get_current_user",
    "require_role",
    "require_any_role",
    "require_minimum_role",
    "require_admin",
    "require_dean",
    "require_chair",
    "require_proc",
    "require_faculty",
    "ROLE_HIERARCHY",
    "get_role_level",
    "has_role_permission",
]
