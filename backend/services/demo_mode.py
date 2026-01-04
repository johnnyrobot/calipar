"""
Demo Mode Service

Manages demo user sessions, data isolation, and daily resets.
Demo users have "demo" in their username or email and work in a separate
database/schema that resets every day at midnight.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, create_engine, Session

from config import get_settings

logger = logging.getLogger(__name__)

# Global demo engine (initialized only when demo mode is enabled)
_demo_engine = None


def get_demo_engine():
    """Get or create the demo database engine."""
    global _demo_engine

    settings = get_settings()

    if not settings.demo_mode_enabled:
        return None

    if _demo_engine is None:
        demo_db_url = settings.demo_database_url

        if not demo_db_url:
            # Use same database but with schema prefix if not specified
            # For PostgreSQL: schema "demo_schema"
            # For SQLite: separate database file
            if settings.database_url.startswith("postgresql"):
                # Add schema parameter for PostgreSQL
                demo_db_url = settings.database_url + "?options=-c%20search_path=demo"
            elif settings.database_url.startswith("sqlite"):
                # Separate file for demo
                demo_db_url = settings.database_url.replace("calipar_dev.db", "calipar_demo.db")
            else:
                demo_db_url = settings.database_url

        # Create engine with appropriate settings
        if demo_db_url.startswith("sqlite"):
            _demo_engine = create_engine(
                demo_db_url,
                echo=settings.debug,
                connect_args={"check_same_thread": False},
            )
        else:
            _demo_engine = create_engine(
                demo_db_url,
                echo=settings.debug,
                pool_pre_ping=True,
            )

        logger.info(f"Demo mode engine created: {demo_db_url}")

    return _demo_engine


def create_demo_db_and_tables():
    """Create demo database tables."""
    engine = get_demo_engine()
    if engine:
        SQLModel.metadata.create_all(engine)
        logger.info("Demo database tables created")


def get_demo_session():
    """Get a demo database session."""
    engine = get_demo_engine()
    if engine:
        with Session(engine) as session:
            yield session


def is_demo_user(email: Optional[str], firebase_uid: Optional[str] = None) -> bool:
    """
    Check if a user is a demo user.

    A user is considered a demo user if:
    1. Their email contains "demo" (case-insensitive)
    2. Their firebase_uid contains "demo" (case-insensitive)

    Args:
        email: User's email address
        firebase_uid: User's Firebase UID

    Returns:
        True if the user is a demo user, False otherwise
    """
    settings = get_settings()

    if not settings.demo_mode_enabled:
        return False

    prefix = settings.demo_user_prefix.lower()

    if email and prefix in email.lower():
        return True

    if firebase_uid and prefix in firebase_uid.lower():
        return True

    return False


def get_last_reset_time() -> Optional[datetime]:
    """
    Get the last demo database reset time from a marker file.

    Returns:
        datetime of last reset, or None if never reset
    """
    import os

    marker_file = "/tmp/calipar_demo_reset.txt"

    if os.path.exists(marker_file):
        try:
            with open(marker_file, "r") as f:
                timestamp_str = f.read().strip()
                return datetime.fromisoformat(timestamp_str)
        except Exception as e:
            logger.warning(f"Could not read reset marker file: {e}")

    return None


def set_last_reset_time(reset_time: datetime):
    """Write the last reset time to a marker file."""
    import os

    marker_file = "/tmp/calipar_demo_reset.txt"

    try:
        with open(marker_file, "w") as f:
            f.write(reset_time.isoformat())
        logger.info(f"Reset marker updated: {reset_time.isoformat()}")
    except Exception as e:
        logger.error(f"Could not write reset marker file: {e}")


def should_reset_demo() -> bool:
    """
    Check if the demo database should be reset based on the configured hour.

    Returns:
        True if demo should be reset, False otherwise
    """
    settings = get_settings()

    if not settings.demo_mode_enabled:
        return False

    now = datetime.now(timezone.utc)
    target_hour = settings.demo_reset_hour_utc

    # Check if we've passed the target hour today
    today_reset_time = now.replace(hour=target_hour, minute=0, second=0, microsecond=0)

    last_reset = get_last_reset_time()

    if last_reset is None:
        # Never reset, should reset now
        return True

    # If last reset was before today's target time, we should reset
    if last_reset < today_reset_time and now >= today_reset_time:
        return True

    return False


async def reset_demo_database():
    """
    Reset the demo database to initial state.

    This function:
    1. Drops all demo tables
    2. Recreates demo tables
    3. Seeds demo data
    4. Updates the reset marker

    Should be called daily via cron job.
    """
    logger.info("Starting demo database reset...")

    engine = get_demo_engine()

    if not engine:
        logger.warning("Demo engine not available, skipping reset")
        return

    try:
        # Drop all tables
        SQLModel.metadata.drop_all(engine)
        logger.info("Dropped demo database tables")

        # Recreate tables
        SQLModel.metadata.create_all(engine)
        logger.info("Created demo database tables")

        # Seed demo data
        from seed_demo import seed_demo_data
        seed_demo_data()
        logger.info("Seeded demo data")

        # Update reset marker
        set_last_reset_time(datetime.now(timezone.utc))

        logger.info("Demo database reset completed successfully")

    except Exception as e:
        logger.error(f"Error resetting demo database: {e}")
        raise


def get_demo_status() -> dict:
    """
    Get the current status of demo mode.

    Returns:
        dict with demo mode status information
    """
    settings = get_settings()

    last_reset = get_last_reset_time()
    now = datetime.now(timezone.utc)

    next_reset = None
    if settings.demo_mode_enabled:
        target_hour = settings.demo_reset_hour_utc
        today_reset = now.replace(hour=target_hour, minute=0, second=0, microsecond=0)

        if now < today_reset:
            next_reset = today_reset
        else:
            # Next reset is tomorrow
            from datetime import timedelta
            next_reset = (today_reset + timedelta(days=1))

    return {
        "demo_mode_enabled": settings.demo_mode_enabled,
        "demo_user_prefix": settings.demo_user_prefix,
        "demo_reset_hour_utc": settings.demo_reset_hour_utc,
        "last_reset": last_reset.isoformat() if last_reset else None,
        "next_reset": next_reset.isoformat() if next_reset else None,
    }


class DemoModeMiddleware:
    """
    Middleware to identify demo users and route them to demo database.

    This middleware adds a flag to the request state indicating whether
    the current user is a demo user.
    """

    async def __call__(self, request, call_next):
        # Process request
        response = await call_next(request)

        # Add demo mode status to response headers (for debugging)
        settings = get_settings()
        if settings.demo_mode_enabled:
            response.headers["X-Demo-Mode-Enabled"] = "true"
            response.headers["X-Demo-User-Prefix"] = settings.demo_user_prefix

        return response


# Demo user accounts that should be available
DEMO_USER_ACCOUNTS = [
    {
        "firebase_uid": "demo-faculty-001",
        "email": "demo-faculty@ccc.edu",
        "full_name": "Demo Faculty User",
        "role": "FACULTY",
        "department": "Mathematics",
    },
    {
        "firebase_uid": "demo-chair-001",
        "email": "demo-chair@ccc.edu",
        "full_name": "Demo Chair User",
        "role": "CHAIR",
        "department": "Mathematics",
    },
    {
        "firebase_uid": "demo-dean-001",
        "email": "demo-dean@ccc.edu",
        "full_name": "Demo Dean User",
        "role": "DEAN",
        "department": None,
    },
    {
        "firebase_uid": "demo-admin-001",
        "email": "demo-admin@ccc.edu",
        "full_name": "Demo Admin User",
        "role": "ADMIN",
        "department": None,
    },
    {
        "firebase_uid": "demo-proc-001",
        "email": "demo-proc@ccc.edu",
        "full_name": "Demo PROC User",
        "role": "PROC",
        "department": None,
    },
]
