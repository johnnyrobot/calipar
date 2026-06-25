"""
Application configuration using Pydantic Settings.
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database - defaults to SQLite for local development
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./calipar_dev.db"
    )
    # Demo database URL (separate schema/database for demo users)
    demo_database_url: str = os.getenv(
        "DEMO_DATABASE_URL",
        ""  # Empty means demo mode disabled
    )

    # Demo Mode Settings
    demo_mode_enabled: bool = os.getenv("DEMO_MODE_ENABLED", "false").lower() == "true"
    demo_reset_hour_utc: int = int(os.getenv("DEMO_RESET_HOUR_UTC", "7"))  # 7 AM UTC = midnight PST
    demo_user_prefix: str = os.getenv("DEMO_USER_PREFIX", "demo")

    # Google AI
    google_api_key: str = ""
    gemini_file_search_store_name: str = ""

    # Firebase
    firebase_project_id: str = ""
    firebase_enabled: bool = False  # Set to True only when Firebase is properly configured

    # App settings
    debug: bool = False

    # CORS — comma-separated list of browser origins allowed to call the API.
    # Dev default covers the Next.js dev server. In production the API is served
    # cross-origin (separate api subdomain), so set CORS_ALLOW_ORIGINS to the
    # app's public origin(s), e.g. "https://app.your-domain.com".
    cors_allow_origins: str = os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )

    class Config:
        env_file = ".env"
        extra = "ignore"

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
