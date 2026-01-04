"""
Database configuration and session management.
"""

from sqlmodel import SQLModel, create_engine, Session
from config import get_settings

settings = get_settings()

# Create engine with appropriate settings based on database type
if settings.database_url.startswith("sqlite"):
    # SQLite needs check_same_thread=False for FastAPI
    engine = create_engine(
        settings.database_url,
        echo=settings.debug,
        connect_args={"check_same_thread": False},
    )
else:
    # PostgreSQL with connection pooling
    engine = create_engine(
        settings.database_url,
        echo=settings.debug,
        pool_pre_ping=True,
    )


def create_db_and_tables():
    """Create all database tables."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Dependency to get database session."""
    with Session(engine) as session:
        yield session
