"""
CALIPAR Backend - FastAPI Application
AI-Enhanced Program Review and Integrated Planning Platform
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables
from routers import auth, reviews, ai, data, planning, resources, validation


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Create database tables
    create_db_and_tables()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="CALIPAR API",
    description="AI-Enhanced Program Review and Integrated Planning Platform for California Community Colleges",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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
    """Health check endpoint."""
    return {"status": "healthy", "service": "calipar-backend"}
