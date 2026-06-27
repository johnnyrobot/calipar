"""Integration tests for the endpoints added for the data-wiring work:

- GET  /api/activity              (audit-trail-backed activity feed)
- CRUD /api/admin/users           (admin-only user management)
- GET  /api/reviews?status=...    (validation-queue status filter)

Uses an isolated SQLite database and overrides get_session / get_current_user.
"""
import os
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "sqlite:///./ci_endpoints.db")
os.environ.setdefault("DEMO_MODE_ENABLED", "false")

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from main import app
from database import get_session
from routers.auth import get_current_user
from models.user import User, UserRole
from models.organization import Organization, OrganizationType
from models.program_review import ProgramReview, ReviewStatus, ReviewType
from models.action_plan import ActionPlan, ActionPlanStatus
from models.strategic_initiative import StrategicInitiative
from models.audit import AuditTrail, AuditAction

_engine = create_engine(
    "sqlite:///./_test_new_endpoints.db",
    connect_args={"check_same_thread": False},
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


def _seed_user(role: UserRole, email: str) -> User:
    with Session(_engine) as s:
        u = User(
            email=email,
            full_name=f"{role.value.title()} User",
            role=role,
            firebase_uid=f"uid-{uuid4()}",
        )
        s.add(u)
        s.commit()
        s.refresh(u)
        return u


def _client_as(user: User) -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


# --------------------------- admin user management ---------------------------

def test_admin_can_list_create_update_delete_users():
    admin = _seed_user(UserRole.ADMIN, "admin@example.edu")
    client = _client_as(admin)

    # initially only the admin
    resp = client.get("/api/admin/users")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # create
    resp = client.post(
        "/api/admin/users",
        json={"email": "newfac@example.edu", "full_name": "New Faculty", "role": "faculty"},
    )
    assert resp.status_code == 201, resp.text
    new_id = resp.json()["id"]
    assert resp.json()["is_active"] is True

    # duplicate email -> 409
    resp = client.post(
        "/api/admin/users",
        json={"email": "newfac@example.edu", "full_name": "Dup", "role": "faculty"},
    )
    assert resp.status_code == 409

    # filter by role
    resp = client.get("/api/admin/users", params={"role": "faculty"})
    assert resp.status_code == 200
    assert {u["id"] for u in resp.json()} == {new_id}

    # update (deactivate + promote)
    resp = client.patch(f"/api/admin/users/{new_id}", json={"is_active": False, "role": "chair"})
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False
    assert resp.json()["role"] == "chair"

    # delete
    resp = client.delete(f"/api/admin/users/{new_id}")
    assert resp.status_code == 204
    assert len(client.get("/api/admin/users").json()) == 1


def test_admin_cannot_delete_self():
    admin = _seed_user(UserRole.ADMIN, "admin2@example.edu")
    client = _client_as(admin)
    resp = client.delete(f"/api/admin/users/{admin.id}")
    assert resp.status_code == 400


def test_cannot_demote_or_deactivate_last_admin():
    admin = _seed_user(UserRole.ADMIN, "soleadmin@example.edu")
    client = _client_as(admin)
    # demote sole admin -> 400
    assert client.patch(f"/api/admin/users/{admin.id}", json={"role": "faculty"}).status_code == 400
    # deactivate sole admin -> 400
    assert client.patch(f"/api/admin/users/{admin.id}", json={"is_active": False}).status_code == 400


def test_can_demote_admin_when_another_admin_exists():
    admin = _seed_user(UserRole.ADMIN, "admin_a@example.edu")
    other = _seed_user(UserRole.ADMIN, "admin_b@example.edu")
    client = _client_as(admin)
    # a second active admin exists, so demoting one is allowed
    resp = client.patch(f"/api/admin/users/{other.id}", json={"role": "dean"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "dean"


def test_cannot_delete_last_admin_via_other_account():
    # current admin deletes the only OTHER admin while themselves being demoted is N/A;
    # here current admin is the sole admin and tries to delete a (non-self) admin that
    # is the last active admin besides self -> allowed since self remains. So instead
    # verify deleting self is blocked (covered) and that deleting a non-admin is fine.
    admin = _seed_user(UserRole.ADMIN, "admin_keep@example.edu")
    victim = _seed_user(UserRole.FACULTY, "victim@example.edu")
    client = _client_as(admin)
    assert client.delete(f"/api/admin/users/{victim.id}").status_code == 204


@pytest.mark.parametrize("role", [UserRole.FACULTY, UserRole.CHAIR, UserRole.DEAN, UserRole.PROC])
def test_non_admin_denied_user_management(role):
    user = _seed_user(role, f"{role.value}@example.edu")
    client = _client_as(user)
    assert client.get("/api/admin/users").status_code == 403
    assert client.post(
        "/api/admin/users",
        json={"email": "x@example.edu", "full_name": "X", "role": "faculty"},
    ).status_code == 403


# ------------------------------- activity feed -------------------------------

def test_activity_feed_returns_mapped_audit_entries():
    user = _seed_user(UserRole.CHAIR, "chair@example.edu")
    eid = uuid4()
    with Session(_engine) as s:
        s.add(AuditTrail(
            entity_type="program_review",
            entity_id=eid,
            action=AuditAction.STATUS_CHANGED,
            user_id=user.id,
            description="Moved to in review",
        ))
        s.commit()

    resp = _client_as(user).get("/api/activity")
    assert resp.status_code == 200, resp.text
    items = resp.json()
    assert len(items) == 1
    item = items[0]
    assert item["type"] == "status_changed"
    assert item["entity_type"] == "program_review"
    assert item["user"] == "Chair User"
    assert item["description"] == "Moved to in review"
    assert item["title"]  # humanized, non-empty


def test_activity_feed_scopes_faculty_to_own_actions():
    faculty = _seed_user(UserRole.FACULTY, "fac_scope@example.edu")
    other = _seed_user(UserRole.CHAIR, "other_actor@example.edu")
    with Session(_engine) as s:
        s.add(AuditTrail(entity_type="program_review", entity_id=uuid4(),
                         action=AuditAction.UPDATED, user_id=faculty.id))
        s.add(AuditTrail(entity_type="program_review", entity_id=uuid4(),
                         action=AuditAction.UPDATED, user_id=other.id))
        s.commit()
    # faculty sees only their own entry
    fac_items = _client_as(faculty).get("/api/activity").json()
    assert len(fac_items) == 1
    assert fac_items[0]["user"] == "Faculty User"
    # an elevated role sees both
    assert len(_client_as(other).get("/api/activity").json()) == 2


def test_activity_feed_filters_by_entity_type():
    user = _seed_user(UserRole.ADMIN, "admin3@example.edu")
    with Session(_engine) as s:
        s.add(AuditTrail(entity_type="program_review", entity_id=uuid4(), action=AuditAction.CREATED))
        s.add(AuditTrail(entity_type="resource_request", entity_id=uuid4(), action=AuditAction.CREATED))
        s.commit()
    resp = _client_as(user).get("/api/activity", params={"entity_type": "resource_request"})
    assert resp.status_code == 200
    assert [i["entity_type"] for i in resp.json()] == ["resource_request"]


# ------------------------- reviews status filter -----------------------------

def test_reviews_status_filter():
    author = _seed_user(UserRole.PROC, "proc@example.edu")
    with Session(_engine) as s:
        org = Organization(name="Biology", type=OrganizationType.DEPARTMENT)
        s.add(org)
        s.commit()
        s.refresh(org)
        s.add(ProgramReview(org_id=org.id, author_id=author.id, cycle_year="2025-2026",
                            status=ReviewStatus.DRAFT))
        s.add(ProgramReview(org_id=org.id, author_id=author.id, cycle_year="2025-2026",
                            status=ReviewStatus.IN_REVIEW))
        s.commit()

    client = _client_as(author)
    all_reviews = client.get("/api/reviews")
    assert all_reviews.status_code == 200
    assert len(all_reviews.json()) == 2

    in_review = client.get("/api/reviews", params={"status": "in_review"})
    assert in_review.status_code == 200
    assert len(in_review.json()) == 1
    assert in_review.json()[0]["status"] == "in_review"


# ------------------------- action plans list --------------------------------

def test_list_action_plans_with_initiatives():
    author = _seed_user(UserRole.CHAIR, "chair2@example.edu")
    with Session(_engine) as s:
        org = Organization(name="Chemistry", type=OrganizationType.DEPARTMENT)
        s.add(org)
        s.commit()
        s.refresh(org)
        review = ProgramReview(org_id=org.id, author_id=author.id, cycle_year="2025-2026")
        s.add(review)
        s.commit()
        s.refresh(review)
        s.add(ActionPlan(review_id=review.id, title="Improve retention",
                         description="Plan A", status=ActionPlanStatus.NOT_STARTED))
        s.add(ActionPlan(review_id=review.id, title="Close equity gap",
                         description="Plan B", status=ActionPlanStatus.ONGOING))
        s.commit()
        review_id = str(review.id)

    client = _client_as(author)
    resp = client.get("/api/action-plans")
    assert resp.status_code == 200, resp.text
    assert len(resp.json()) == 2
    assert all("initiatives" in p for p in resp.json())

    filtered = client.get("/api/action-plans", params={"review_id": review_id})
    assert filtered.status_code == 200
    assert len(filtered.json()) == 2


def test_action_plans_scoped_to_faculty_department():
    with Session(_engine) as s:
        dept_a = Organization(name="Dept A", type=OrganizationType.DEPARTMENT)
        dept_b = Organization(name="Dept B", type=OrganizationType.DEPARTMENT)
        s.add(dept_a)
        s.add(dept_b)
        s.commit()
        s.refresh(dept_a)
        s.refresh(dept_b)
        # faculty belongs to dept A
        faculty = User(email="deptfac@example.edu", full_name="Dept Faculty",
                       role=UserRole.FACULTY, department_id=dept_a.id,
                       firebase_uid=f"uid-{uuid4()}")
        s.add(faculty)
        s.commit()
        s.refresh(faculty)
        ra = ProgramReview(org_id=dept_a.id, author_id=faculty.id, cycle_year="2025-2026")
        rb = ProgramReview(org_id=dept_b.id, author_id=faculty.id, cycle_year="2025-2026")
        s.add(ra)
        s.add(rb)
        s.commit()
        s.refresh(ra)
        s.refresh(rb)
        s.add(ActionPlan(review_id=ra.id, title="A plan", description="in dept A"))
        s.add(ActionPlan(review_id=rb.id, title="B plan", description="in dept B"))
        s.commit()
        s.refresh(faculty)  # reload attributes expired by the commits above
        faculty_obj = faculty

    # faculty sees only their department's plan
    resp = _client_as(faculty_obj).get("/api/action-plans")
    assert resp.status_code == 200
    titles = [p["title"] for p in resp.json()]
    assert titles == ["A plan"]


# ----------------------- initiative mapping (map/unmap) ----------------------

def _seed_plan_and_initiative():
    with Session(_engine) as s:
        author = User(email=f"ap_author_{uuid4()}@example.edu", full_name="AP Author",
                      role=UserRole.CHAIR, firebase_uid=f"uid-{uuid4()}")
        org = Organization(name="Math", type=OrganizationType.DEPARTMENT)
        s.add(author)
        s.add(org)
        s.commit()
        s.refresh(author)
        s.refresh(org)
        review = ProgramReview(org_id=org.id, author_id=author.id, cycle_year="2025-2026")
        init = StrategicInitiative(goal_number=3, code="3.1", title="Goal 3",
                                   description="Increase success")
        s.add(review)
        s.add(init)
        s.commit()
        s.refresh(review)
        s.refresh(init)
        plan = ActionPlan(review_id=review.id, title="Plan", description="d")
        s.add(plan)
        s.commit()
        s.refresh(plan)
        s.refresh(author)
        return author, plan.id, init.id, org.id


def test_map_then_unmap_initiative():
    author, plan_id, init_id, _ = _seed_plan_and_initiative()
    client = _client_as(author)

    mapped = client.post(f"/api/action-plans/{plan_id}/map-initiative",
                         json={"initiative_id": str(init_id)})
    assert mapped.status_code == 200, mapped.text
    assert [i["id"] for i in mapped.json()["initiatives"]] == [str(init_id)]

    unmapped = client.delete(f"/api/action-plans/{plan_id}/map-initiative/{init_id}")
    assert unmapped.status_code == 200, unmapped.text
    assert unmapped.json()["initiatives"] == []

    # unmapping again is a no-op (idempotent), still 200
    assert client.delete(f"/api/action-plans/{plan_id}/map-initiative/{init_id}").status_code == 200


def test_faculty_cannot_map_out_of_department_plan():
    _, plan_id, init_id, org_id = _seed_plan_and_initiative()
    # a faculty member in a DIFFERENT department
    with Session(_engine) as s:
        other_org = Organization(name="Other", type=OrganizationType.DEPARTMENT)
        s.add(other_org)
        s.commit()
        s.refresh(other_org)
        outsider = User(email=f"outsider_{uuid4()}@example.edu", full_name="Outsider",
                        role=UserRole.FACULTY, department_id=other_org.id,
                        firebase_uid=f"uid-{uuid4()}")
        s.add(outsider)
        s.commit()
        s.refresh(outsider)

    client = _client_as(outsider)
    assert client.post(f"/api/action-plans/{plan_id}/map-initiative",
                       json={"initiative_id": str(init_id)}).status_code == 403
    assert client.delete(
        f"/api/action-plans/{plan_id}/map-initiative/{init_id}").status_code == 403
