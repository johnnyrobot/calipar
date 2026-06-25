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

    # CORS — comma-separated list of browser origins allowed to call the API.
    # Dev default covers the Next.js dev server. In production the API is served
    # cross-origin (separate api subdomain), so set CORS_ALLOW_ORIGINS to the
    # app's public origin(s), e.g. "https://app.your-domain.com".
    cors_allow_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

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
