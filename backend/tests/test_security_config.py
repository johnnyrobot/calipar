"""Tests for the production auth-hardening (demo-mode / Firebase enforcement)."""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./ci_seccfg.db")
os.environ.setdefault("DEMO_MODE_ENABLED", "false")

import pytest
from fastapi.testclient import TestClient

from config import Settings, assert_production_auth_secure, get_settings
from main import app


def _prod(**overrides) -> Settings:
    base = dict(environment="production", firebase_enabled=True, demo_mode_enabled=False)
    base.update(overrides)
    return Settings(**base)


# --- assert_production_auth_secure ------------------------------------------

def test_development_never_raises():
    # even a wide-open dev config is allowed
    s = Settings(environment="development", firebase_enabled=False, demo_mode_enabled=True)
    assert_production_auth_secure(s, firebase_available=False)  # no raise


def test_production_requires_firebase_enabled():
    with pytest.raises(RuntimeError):
        assert_production_auth_secure(_prod(firebase_enabled=False), firebase_available=False)


def test_production_requires_firebase_actually_available():
    # configured on but the Admin SDK failed to initialise -> still refuse
    with pytest.raises(RuntimeError):
        assert_production_auth_secure(_prod(firebase_enabled=True), firebase_available=False)


def test_production_rejects_demo_mode():
    with pytest.raises(RuntimeError):
        assert_production_auth_secure(_prod(demo_mode_enabled=True), firebase_available=True)


def test_production_secure_config_passes():
    assert_production_auth_secure(_prod(), firebase_available=True)  # no raise


def test_is_production_property():
    assert _prod().is_production is True
    assert Settings(environment="development").is_production is False
    assert Settings(environment="PRODUCTION").is_production is True


# --- /api/auth/seed is hard-disabled in production --------------------------

def test_seed_blocked_in_production(monkeypatch):
    # App boots with the module-level (development) settings, so startup is fine;
    # the seed endpoint re-reads settings, which we flip to production here.
    with TestClient(app) as client:
        # sanity: works in development
        ok = client.post("/api/auth/seed", json={
            "firebase_uid": f"dev-seed", "email": "devseed@e.edu",
            "full_name": "Dev Seed", "role": "faculty",
        })
        assert ok.status_code == 200

        monkeypatch.setenv("ENVIRONMENT", "production")
        get_settings.cache_clear()
        try:
            blocked = client.post("/api/auth/seed", json={
                "firebase_uid": "attacker", "email": "attacker@e.edu",
                "full_name": "Attacker", "role": "admin",
            })
            assert blocked.status_code == 404
        finally:
            monkeypatch.delenv("ENVIRONMENT", raising=False)
            get_settings.cache_clear()
