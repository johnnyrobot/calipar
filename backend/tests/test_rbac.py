"""RBAC tests — lock down the role/permission rules, especially the PROC path.

These exercise the real auth dependencies (require_role / require_proc /
require_minimum_role) end-to-end through HTTP by mounting them on throwaway
routes and overriding get_current_user per role. No DB/Firebase needed.

The subtle invariant under test: PROC and CHAIR share hierarchy level 2 and DEAN
is higher (level 3), yet PROC-specific endpoints must admit ONLY proc + admin —
chair and dean must be denied. Conversely, PROC (level 2) may reach
chair-minimum endpoints via the hierarchy.
"""
import os
from types import SimpleNamespace

os.environ.setdefault("DATABASE_URL", "sqlite:///./ci_rbac.db")
os.environ.setdefault("DEMO_MODE_ENABLED", "false")

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from models.user import UserRole
from routers.auth import (
    get_current_user,
    has_role_permission,
    require_minimum_role,
    require_proc,
    require_role,
)

ALL_ROLES = [
    UserRole.FACULTY,
    UserRole.CHAIR,
    UserRole.PROC,
    UserRole.DEAN,
    UserRole.ADMIN,
]


def _build_app() -> FastAPI:
    app = FastAPI()

    @app.get("/proc-only")
    async def proc_only(user=Depends(require_proc)):
        return {"role": user.role.value}

    @app.get("/admin-only")
    async def admin_only(user=Depends(require_role(UserRole.ADMIN))):
        return {"role": user.role.value}

    @app.get("/chair-min")
    async def chair_min(user=Depends(require_minimum_role(UserRole.CHAIR))):
        return {"role": user.role.value}

    return app


def _client_as(role: UserRole) -> TestClient:
    app = _build_app()
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role=role)
    return TestClient(app)


# --- has_role_permission: the permission matrix -----------------------------

@pytest.mark.parametrize(
    "user_role,expected",
    [
        (UserRole.PROC, True),
        (UserRole.ADMIN, True),
        (UserRole.CHAIR, False),   # same level as PROC, but must NOT pass
        (UserRole.DEAN, False),    # higher level, but must NOT pass
        (UserRole.FACULTY, False),
    ],
)
def test_proc_endpoint_permission_matrix(user_role, expected):
    assert has_role_permission(user_role, UserRole.PROC) is expected


@pytest.mark.parametrize(
    "user_role,expected",
    [
        (UserRole.FACULTY, False),
        (UserRole.CHAIR, True),
        (UserRole.PROC, True),     # level 2 == chair level -> reaches chair-min
        (UserRole.DEAN, True),
        (UserRole.ADMIN, True),
    ],
)
def test_chair_minimum_permission_matrix(user_role, expected):
    assert has_role_permission(user_role, UserRole.CHAIR) is expected


def test_admin_satisfies_every_role():
    for required in ALL_ROLES:
        assert has_role_permission(UserRole.ADMIN, required) is True


# --- through HTTP via the real dependencies ---------------------------------

@pytest.mark.parametrize(
    "role,status",
    [
        (UserRole.PROC, 200),
        (UserRole.ADMIN, 200),
        (UserRole.CHAIR, 403),
        (UserRole.DEAN, 403),
        (UserRole.FACULTY, 403),
    ],
)
def test_proc_only_route(role, status):
    resp = _client_as(role).get("/proc-only")
    assert resp.status_code == status


@pytest.mark.parametrize(
    "role,status",
    [
        (UserRole.ADMIN, 200),
        (UserRole.DEAN, 403),
        (UserRole.PROC, 403),
        (UserRole.CHAIR, 403),
        (UserRole.FACULTY, 403),
    ],
)
def test_admin_only_route(role, status):
    resp = _client_as(role).get("/admin-only")
    assert resp.status_code == status


@pytest.mark.parametrize(
    "role,status",
    [
        (UserRole.FACULTY, 403),
        (UserRole.CHAIR, 200),
        (UserRole.PROC, 200),
        (UserRole.DEAN, 200),
        (UserRole.ADMIN, 200),
    ],
)
def test_chair_minimum_route(role, status):
    resp = _client_as(role).get("/chair-min")
    assert resp.status_code == status
