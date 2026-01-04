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
    debug: bool = True
    secret_key: str = "calipar-dev-secret-key-change-in-production"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
