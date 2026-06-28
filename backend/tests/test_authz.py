"""Authorization tests for the pre-existing API surface (audit remediation).

Covers cross-tenant (IDOR) scoping on reviews / resources / validation, role
gates on privileged operations, and the workflow-bypass fix. Uses an isolated
SQLite DB with get_session / get_current_user overridden.
"""
import os
from decimal import Decimal
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "sqlite:///./ci_authz.db")
os.environ.setdefault("DEMO_MODE_ENABLED", "false")

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from main import app
from database import get_session
from routers.auth import get_current_user
from models.user import User, UserRole
from models.organization import Organization, OrganizationType
from models.program_review import ProgramReview, ReviewStatus
from models.action_plan import ActionPlan
from models.resource_request import ResourceRequest

_engine = create_engine(
    "sqlite:///./_test_authz.db", connect_args={"check_same_thread": False}
)


def _session_override():
    with Session(_engine) as session:
        yield session


@pytest.fixture(autouse=True)
def _fresh_db():
    SQLModel.metadata.drop_all(_engine)
    SQLModel.metadata.create_all(_engine)
    app.dependency_overrides[get_session] = _session_override
    yield
    app.dependency_overrides.clear()


def _client_as(user: User) -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


class World:
    """Two departments, a faculty in dept A, a chair, and dept-B review/plan/resource."""
    def __init__(self):
        with Session(_engine) as s:
            self.dept_a = Organization(name="Dept A", type=OrganizationType.DEPARTMENT)
            self.dept_b = Organization(name="Dept B", type=OrganizationType.DEPARTMENT)
            s.add(self.dept_a); s.add(self.dept_b); s.commit()
            s.refresh(self.dept_a); s.refresh(self.dept_b)
            self.fac_a = User(email=f"faca_{uuid4()}@e.edu", full_name="Fac A",
                              role=UserRole.FACULTY, department_id=self.dept_a.id,
                              firebase_uid=f"u{uuid4()}")
            self.chair = User(email=f"chair_{uuid4()}@e.edu", full_name="Chair",
                              role=UserRole.CHAIR, firebase_uid=f"u{uuid4()}")
            s.add(self.fac_a); s.add(self.chair); s.commit()
            s.refresh(self.fac_a); s.refresh(self.chair)
            # a review/plan/resource that live in dept B (out of fac_a's department)
            rb = ProgramReview(org_id=self.dept_b.id, author_id=self.chair.id, cycle_year="2025-2026")
            s.add(rb); s.commit(); s.refresh(rb)
            plan = ActionPlan(review_id=rb.id, title="B plan", description="d")
            s.add(plan); s.commit(); s.refresh(plan)
            res = ResourceRequest(action_plan_id=plan.id, object_code="4000-x",
                                  description="d", amount=Decimal("100"), justification="j")
            s.add(res); s.commit(); s.refresh(res)
            self.review_b_id = rb.id
            self.resource_b_id = res.id
            self.plan_b_id = plan.id
            # Reload the objects so their attributes aren't expired/detached when
            # used after this session closes (later commits expire them otherwise).
            for obj in (self.dept_a, self.dept_b, self.fac_a, self.chair):
                s.refresh(obj)


# --------------------------- reviews IDOR -----------------------------------

def test_faculty_cannot_read_or_write_out_of_dept_review():
    w = World()
    c = _client_as(w.fac_a)
    rid = w.review_b_id
    assert c.get(f"/api/reviews/{rid}").status_code == 403
    assert c.get(f"/api/reviews/{rid}/sections").status_code == 403
    assert c.patch(f"/api/reviews/{rid}", json={"content": {"x": 1}}).status_code == 403
    assert c.patch(f"/api/reviews/{rid}/sections/intro", json={"content": "hi"}).status_code == 403
    assert c.post(f"/api/reviews/{rid}/submit").status_code == 403


def test_chair_can_read_out_of_dept_review():
    w = World()
    assert _client_as(w.chair).get(f"/api/reviews/{w.review_b_id}").status_code == 200


def test_faculty_cannot_create_review_for_other_dept():
    w = World()
    resp = _client_as(w.fac_a).post("/api/reviews", json={
        "org_id": str(w.dept_b.id), "cycle_year": "2025-2026",
    })
    assert resp.status_code == 403


def test_review_patch_cannot_set_status():
    # status is no longer accepted by the PATCH schema; a draft stays draft.
    w = World()
    with Session(_engine) as s:
        review = ProgramReview(org_id=w.dept_a.id, author_id=w.fac_a.id,
                               cycle_year="2025-2026", status=ReviewStatus.DRAFT)
        s.add(review); s.commit(); s.refresh(review)
        rid = review.id
    resp = _client_as(w.fac_a).patch(f"/api/reviews/{rid}",
                                     json={"content": {"a": 1}, "status": "approved"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "draft"  # status change ignored


# --------------------------- resources --------------------------------------

def test_faculty_cannot_touch_out_of_dept_resource():
    w = World()
    c = _client_as(w.fac_a)
    rid = w.resource_b_id
    assert c.patch(f"/api/resources/{rid}", json={"amount": "5"}).status_code == 403
    assert c.patch(f"/api/resources/{rid}/priority", json={"priority": 2}).status_code == 403


def test_funding_requires_budget_authority():
    w = World()
    rid = w.resource_b_id
    # faculty denied even for their own dept (funding is PROC/ADMIN only)
    assert _client_as(w.fac_a).patch(f"/api/resources/{rid}/fund",
                                     json={"is_funded": True}).status_code == 403
    # chair is not budget authority either
    assert _client_as(w.chair).patch(f"/api/resources/{rid}/fund",
                                     json={"is_funded": True}).status_code == 403
    # a PROC user can fund
    with Session(_engine) as s:
        proc = User(email=f"proc_{uuid4()}@e.edu", full_name="Proc", role=UserRole.PROC,
                    firebase_uid=f"u{uuid4()}")
        s.add(proc); s.commit(); s.refresh(proc)
    assert _client_as(proc).patch(f"/api/resources/{rid}/fund",
                                  json={"is_funded": True, "funded_amount": "100"}).status_code == 200


def test_resource_summary_requires_chair_plus():
    w = World()
    assert _client_as(w.fac_a).get("/api/resources/summary").status_code == 403
    assert _client_as(w.chair).get("/api/resources/summary").status_code == 200


def test_faculty_resource_list_scoped_to_department():
    w = World()  # the only resource lives in dept B
    body = _client_as(w.fac_a).get("/api/resources")
    assert body.status_code == 200
    assert body.json() == []  # fac_a (dept A) sees none of dept B's resources
    assert len(_client_as(w.chair).get("/api/resources").json()) == 1


# --------------------------- ai status auth ---------------------------------

def test_ai_status_requires_auth():
    # no get_current_user override + no auth header -> 401
    app.dependency_overrides.pop(get_current_user, None)
    assert TestClient(app).get("/api/ai/status").status_code == 401
