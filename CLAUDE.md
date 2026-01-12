# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CALIPAR** (California Integrated Planning & Review) is an AI-enhanced Program Review and Integrated Planning Platform for educational institutions. This is a full-stack web application with a Next.js 14 frontend, FastAPI backend, and PostgreSQL database.

**Core Purpose:** Streamline program review processes, strategic planning ("Golden Thread"), and resource allocation for educational institutions with AI-powered assistance.

## Running the Application

### Quick Start (Recommended)

```bash
# Copy environment template and configure
cp .env.example .env
nano .env  # Add your Firebase and Google AI keys

# Start all services
docker-compose up -d

# Access the application
open http://localhost:3000          # Frontend
open http://localhost:8000/docs      # Backend API docs
```

### Using the Init Script

```bash
./init.sh  # Automatically starts frontend, backend, and database
```

### Manual Development Setup

**Frontend:**
```bash
cd frontend && npm install
npm run dev  # Starts on http://localhost:3000
```

**Backend:**
```bash
cd backend && python3 -m venv .venv
source .venv/bin/activate && pip install -r requirements.txt
uvicorn main:app --reload  # Starts on http://localhost:8000
```

## Development Commands

### Frontend
```bash
npm run dev          # Start development server (port 3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run test:e2e     # Run all E2E tests
npm run test:e2e:faculty   # Run faculty-specific tests only
npm run test:e2e:chair     # Run chair-specific tests only
npm run test:e2e:dean      # Run dean-specific tests only
npm run test:e2e:admin     # Run admin-specific tests only
```

### Backend
```bash
uvicorn main:app --reload        # Start with auto-reload (port 8000)
pytest                           # Run all tests
alembic upgrade head              # Run database migrations
alembic revision --autogenerate -m "message"  # Create migration
```

### Docker
```bash
docker-compose up -d      # Start all services (detached)
docker-compose down       # Stop all services
docker-compose logs -f    # View logs
docker-compose restart    # Restart services
```

## Architecture Overview

### Full-Stack Flow

```
[Next.js Frontend :3000]
        ↓
    [FastAPI Backend :8000]
        ↓
    [PostgreSQL :5432]
```

### Key Architecture Patterns

**Authentication:**
- Firebase Auth handles user authentication
- Backend verifies Firebase ID tokens via `/api/auth/login`
- User profiles synced between Firebase and local database
- Demo mode bypasses Firebase for development (quick-login buttons)

**API Design:**
- RESTful endpoints with prefix `/api/{feature}`
- JWT token in Authorization header for protected routes
- Auto-generated OpenAPI docs at `/docs`
- CORS configured for `localhost:3000`

**Database:**
- SQLModel (SQLAlchemy wrapper) with type hints
- Alembic for migrations
- Session management via FastAPI dependency injection (`get_session`)
- Supports both PostgreSQL (production) and SQLite (development)

**State Management:**
- Frontend: Zustand for persistent auth/UI state
- Backend: FastAPI dependency injection for database sessions

## Directory Structure

```
calipar/
├── frontend/                    # Next.js 14 App Router
│   ├── app/                    # Pages and layouts
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── reviews/        # Program review pages
│   │   │   ├── planning/       # Golden Thread planning
│   │   │   ├── resources/      # Resource request pages
│   │   │   ├── data/           # Analytics dashboard
│   │   │   ├── chat/           # Mission-Bot AI chat
│   │   │   └── layout.tsx      # Dashboard shell with sidebar
│   │   ├── login/              # Login page
│   │   └── layout.tsx          # Root layout
│   ├── components/             # React components
│   │   ├── layout/             # Header, Sidebar, DemoModeBanner
│   │   ├── ui/                 # Reusable UI components
│   │   └── features/           # Feature-specific components
│   └── lib/                    # Utilities
│       ├── auth-context.tsx    # Auth state management
│       ├── api.ts              # HTTP client with interceptors
│       └── store.ts            # Zustand store
│
├── backend/                    # FastAPI Backend
│   ├── models/                 # SQLModel database models
│   │   ├── user.py             # User, UserRole enum
│   │   ├── program_review.py   # ProgramReview, ReviewSection, ReviewStatus
│   │   ├── action_plan.py      # ActionPlan, Golden Thread mappings
│   │   ├── resource_request.py # ResourceRequest with TCO
│   │   ├── strategic_initiative.py  # ISMP Goals
│   │   └── ...
│   ├── routers/                # API endpoints by feature
│   │   ├── auth.py             # /api/auth/* (login, me, demo-status)
│   │   ├── reviews.py          # /api/reviews/*
│   │   ├── ai.py               # /api/ai/* (Mission-Bot, content generation)
│   │   ├── planning.py         # /api/* (action plans)
│   │   └── ...
│   ├── services/               # Business logic
│   │   ├── firebase.py         # Firebase Admin SDK wrapper
│   │   ├── gemini.py           # Google Gemini AI integration
│   │   └── demo_mode.py        # Demo mode detection and database isolation
│   ├── alembic/                # Database migrations
│   ├── database.py             # Engine and session management
│   ├── config.py               # Environment variables (pydantic-settings)
│   ├── main.py                 # FastAPI app entry point
│   └── seed*.py                # Database seeding scripts
│
├── docs/                       # Documentation
│   ├── DEPLOYMENT.md           # VPS deployment guide
│   ├── DEMO_MODE.md            # Demo mode configuration
│   └── FIREBASE_SETUP.md       # Firebase authentication setup
│
├── .env.example                # Environment variables template
├── docker-compose.yml          # Development services
└── init.sh                     # Quick start script
```

## Key Files and Patterns

### Authentication Flow

**Frontend (`lib/auth-context.tsx`):**
- Uses `useAuth()` hook for auth state
- Stores JWT token in localStorage
- Provides `login()`, `logout()`, `refreshUser()` functions

**Backend (`routers/auth.py`):**
- `POST /api/auth/login` - Verifies Firebase token, returns user profile
- `GET /api/auth/me` - Get current user from token
- Demo mode: accepts `firebase_uid` header directly for development

### Database Session Pattern

All API endpoints use dependency injection for database sessions:

```python
from database import get_session

@router.get("/api/reviews")
async def get_reviews(session: Session = Depends(get_session)):
    # session is automatically committed/rolled back
    reviews = session.exec(select(ProgramReview)).all()
    return reviews
```

### Role-Based Access Control

**Roles:** FACULTY, CHAIR, DEAN, ADMIN, PROC

**Usage in backend (`routers/auth.py`):**
```python
from routers.auth import Role, get_current_user

@router.post("/api/admin/users")
async def create_user(
    user: User = Depends(get_current_user),
    _: None = Depends(require_role(Role.ADMIN))
):
    # Only admins can access
```

**Usage in frontend (`components/auth/RoleGuard.tsx`):**
```tsx
<RoleGuard roles={[Role.ADMIN, Role.DEAN]}>
  <AdminOnlyContent />
</RoleGuard>
```

### Demo Mode

**Detection (`services/demo_mode.py`):**
- Users with email containing `demo_user_prefix` (default: "demo") are demo users
- `is_demo_user(email, firebase_uid)` - Check if user is demo user
- Demo users access separate `DEMO_DATABASE_URL` database

**Frontend (`components/layout/DemoModeBanner.tsx`):**
- Shows banner for demo users with countdown to daily reset
- `GET /api/auth/demo-status` - Returns reset schedule
- `GET /api/auth/demo-accounts` - Returns available demo accounts

## Environment Variables

Critical variables in `.env`:

```bash
# Database
DATABASE_URL=postgresql://calipar:calipar_dev_password@db:5432/calipar

# Demo Mode (optional)
DEMO_MODE_ENABLED=true
DEMO_DATABASE_URL=sqlite:///./calipar_demo.db
DEMO_RESET_HOUR_UTC=7
DEMO_USER_PREFIX=demo

# Google AI (for Mission-Bot and content generation)
GOOGLE_API_KEY=your_gemini_api_key
GEMINI_FILE_SEARCH_STORE_NAME=

# Firebase
FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

## Important Implementation Details

### "Golden Thread" Feature

The Golden Thread connects strategic planning to program reviews:

1. **Strategic Initiatives** (`models/strategic_initiative.py`) - ISMP Goals 1-5
2. **Action Plans** (`models/action_plan.py`) - Program goals
3. **Action Plan Mappings** - Links action plans to strategic initiatives
4. **Resource Requests** - Budget items linked to action plans

### Mission-Bot AI Chat

**Backend (`services/gemini.py`):**
- Uses Google Gemini API with file search
- RAG (Retrieval Augmented Generation) from ACCJC documents
- Provides ACCJC/ISMP compliance guidance

**Frontend (`app/(dashboard)/chat/page.tsx`):**
- Chat interface with streaming responses
- Displays citations from source documents

### Program Review Editor

**Smart Context Editor (`app/(dashboard)/reviews/[id]/page.tsx`):**
- Section-based editing with autosave
- Data Injection Panel for enrollment data
- Equity lens for disaggregated analysis
- AI assistance for content generation

## Testing

### E2E Tests (Frontend)

Located in `frontend/e2e/` (if present - may have been removed during cleanup):
- Framework: Jest + Puppeteer
- Role-specific test suites (faculty, chair, dean, admin)
- Run: `npm run test:e2e`

### Backend Tests

Located in `backend/tests/` (if present):
- Framework: Pytest
- Run: `pytest`

## Deployment

For VPS deployment (Hetzner, AWS, DigitalOcean), see `docs/DEPLOYMENT.md`:
- Nginx reverse proxy configuration
- Systemd services for auto-start
- SSL certificate setup with Let's Encrypt
- Environment variable management

## Common Issues

**Database connection errors:**
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL container is running: `docker-compose ps db`
- For SQLite, verify file path is accessible

**Firebase authentication not working:**
- Verify `NEXT_PUBLIC_FIREBASE_*` variables in `.env`
- Check Firebase project has Email/Password enabled
- For development, use quick-login buttons (demo mode)

**Port conflicts:**
- Frontend default: 3000
- Backend default: 8000
- Database default: 5432
- Change ports in `docker-compose.yml` if needed
