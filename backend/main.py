"""
CALIPAR Backend - FastAPI Application
AI-Enhanced Program Review and Integrated Planning Platform
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from database import create_db_and_tables, engine
from routers import auth, reviews, ai, data, planning, resources, validation, activity, admin
from config import get_settings, assert_production_auth_secure

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Fail closed on an insecure production configuration before serving any
    # request: in production we must verify Firebase tokens rather than trust the
    # dev-auth header fallback (see routers/auth.get_current_user).
    from services.firebase import get_firebase_service
    assert_production_auth_secure(settings, get_firebase_service().is_available)

    # Startup: create tables directly from the SQLModel metadata.
    # The Alembic chain (now through 0006) covers every model and applies cleanly,
    # but create_all stays the startup mechanism so a fresh dev/SQLite DB boots
    # without running migrations; production should run `alembic upgrade head`.
    create_db_and_tables()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="CALIPAR API",
    description="AI-Enhanced Program Review and Integrated Planning Platform for Educational Institutions",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS — origins come from the CORS_ALLOW_ORIGINS env var
# (comma-separated). See config.Settings.cors_origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Program Reviews"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Services"])
app.include_router(data.router, prefix="/api/data", tags=["Data"])
app.include_router(planning.router, prefix="/api", tags=["Planning"])
app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])
app.include_router(validation.router, prefix="/api", tags=["Validation"])
app.include_router(activity.router, prefix="/api/activity", tags=["Activity"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to CALIPAR API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/api/health")
async def health_check():
    """Health check — confirms the API is up and the database is reachable.

    Returns 503 (and ``status: unhealthy``) if the DB can't be reached, so
    container orchestrators / load balancers stop routing to a broken instance.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        database = "ok"
    except Exception:
        database = "unreachable"

    payload = {
        "status": "healthy" if database == "ok" else "unhealthy",
        "service": "calipar-backend",
        "database": database,
    }
    if database != "ok":
        return JSONResponse(status_code=503, content=payload)
    return payload
