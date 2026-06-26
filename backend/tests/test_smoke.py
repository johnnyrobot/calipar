"""Smoke tests — minimal guardrails for CI.

No real DB/Firebase needed: uses SQLite and skips Firebase init. These assert the
app imports and boots under the pinned dependency set, the health endpoint works,
and the firebase-admin auth surface the code relies on is present.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./ci_smoke.db")
os.environ.setdefault("DEMO_MODE_ENABLED", "false")

from fastapi.testclient import TestClient

from main import app


def test_health_endpoint():
    with TestClient(app) as client:
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"


def test_settings_cors_defaults():
    from config import get_settings

    assert get_settings().cors_origins == [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def test_firebase_admin_auth_surface():
    from firebase_admin import auth

    for name in (
        "verify_id_token",
        "get_user",
        "get_user_by_email",
        "create_custom_token",
        "InvalidIdTokenError",
        "ExpiredIdTokenError",
        "RevokedIdTokenError",
        "CertificateFetchError",
        "UserNotFoundError",
    ):
        assert hasattr(auth, name), f"firebase_admin.auth missing {name}"
