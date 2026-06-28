"""
Application configuration using Pydantic Settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    Each field is populated from the matching upper-cased environment variable
    (e.g. ``database_url`` <- ``DATABASE_URL``) or the ``.env`` file; the values
    below are the fallback defaults. Types are coerced by pydantic-settings.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database - defaults to SQLite for local development
    database_url: str = "sqlite:///./calipar_dev.db"
    # Demo database URL (separate schema/database for demo users); empty disables demo mode
    demo_database_url: str = ""

    # Demo Mode Settings
    demo_mode_enabled: bool = False
    demo_reset_hour_utc: int = 7  # 7 AM UTC = midnight PST
    demo_user_prefix: str = "demo"

    # Google AI
    google_api_key: str = ""
    gemini_file_search_store_name: str = ""

    # Firebase
    firebase_project_id: str = ""
    firebase_enabled: bool = False  # Set to True only when Firebase is properly configured

    # App settings
    debug: bool = False
    # Deployment environment. Set ENVIRONMENT=production for any public deployment;
    # this turns the unverified dev-auth fallback into a hard failure (see
    # assert_production_auth_secure below and routers/auth.get_current_user).
    environment: str = "development"

    # CORS — comma-separated list of browser origins allowed to call the API.
    # Dev default covers the Next.js dev server. In production the API is served
    # cross-origin (separate api subdomain), so set CORS_ALLOW_ORIGINS to the
    # app's public origin(s), e.g. "https://app.your-domain.com".
    cors_allow_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def is_production(self) -> bool:
        """True for a production deployment (ENVIRONMENT=production)."""
        return self.environment.strip().lower() == "production"

    @property
    def cors_origins(self) -> list[str]:
        """Allowed CORS origins, parsed from the comma-separated setting.

        Each entry is whitespace-trimmed and stripped of a trailing slash so it
        matches the browser ``Origin`` header (which carries no path or trailing
        slash). Values are operator-supplied trusted config and CORSMiddleware
        matches exactly, so a malformed entry fails closed rather than widening access.
        """
        return [
            o
            for o in (raw.strip().rstrip("/") for raw in self.cors_allow_origins.split(","))
            if o
        ]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


def assert_production_auth_secure(settings: "Settings", firebase_available: bool) -> None:
    """Fail closed on an insecure production auth configuration.

    The dev-auth fallback in ``routers/auth`` trusts the Authorization header as
    the caller's identity *without verifying a Firebase token* whenever Firebase
    is unavailable. That path must be unreachable in production — otherwise any
    client could impersonate any user. This is called at startup so the app
    refuses to boot with such a configuration.

    Raises:
        RuntimeError: if running in production with demo mode on or without a
        working Firebase Admin SDK.
    """
    if not settings.is_production:
        return
    problems = []
    if settings.demo_mode_enabled:
        problems.append("DEMO_MODE_ENABLED must be false in production")
    if not (settings.firebase_enabled and firebase_available):
        problems.append(
            "Firebase token verification is required in production: set "
            "FIREBASE_ENABLED=true with a valid service account so the API never "
            "trusts unverified Authorization headers"
        )
    if problems:
        raise RuntimeError(
            "Refusing to start — insecure production auth configuration: "
            + "; ".join(problems)
        )
