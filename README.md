# CALIPAR Platform

AI-Enhanced Program Review and Integrated Planning Platform for California Community Colleges.

![CALIPAR](https://img.shields.io/badge/CALIPAR-v1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)

## Overview

CALIPAR is a comprehensive platform for program review, strategic planning, and resource management. It features:

- **Smart Context Editor** - AI-assisted program review writing with data injection
- **Golden Thread** - Mission → ISMP Goals → Program Goals → Action Plans → Resource Requests
- **Data Analytics** - Enrollment metrics, success rates, equity analysis
- **Resource Requests** - Budget planning with TCO and Amazon Cart UX
- **Mission-Bot** - AI compliance copilot for ACCJC/ISMP guidance
- **Demo Mode** - Sandbox environment for prospective users

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/calipar.git
cd calipar

# Copy environment template
cp .env.example .env

# Edit .env with your configuration (see Configuration section)
nano .env

# Start all services
docker-compose up -d

# Access the app
open http://localhost:3000
```

### Without Docker

**Backend:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Set DATABASE_URL in .env
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Configuration

Create a `.env` file from `.env.example`:

```bash
# Database (Docker defaults)
DATABASE_URL=postgresql://calipar:calipar_dev_password@db:5432/calipar

# Demo Mode (optional)
DEMO_MODE_ENABLED=true
DEMO_DATABASE_URL=sqlite:///./calipar_demo.db

# Google AI (for AI features)
GOOGLE_API_KEY=your_api_key_here

# Firebase (for authentication)
FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
# ... (see .env.example for full list)
```

See [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) for detailed Firebase setup.

## Demo Mode

Enable demo mode to let users explore the app without affecting production data:

```bash
# In .env
DEMO_MODE_ENABLED=true
DEMO_USER_PREFIX=demo
```

Demo users (with "demo" in email) get:
- Separate demo database
- Automatic daily reset at midnight
- Pre-seeded demo data

See [docs/DEMO_MODE.md](docs/DEMO_MODE.md) for details.

## Development

**Login with demo accounts:**
- Faculty: `demo-faculty@lamc.edu`
- Chair: `demo-chair@lamc.edu`
- Dean: `demo-dean@lamc.edu`
- Admin: `demo-admin@lamc.edu`
- PROC: `demo-proc@lamc.edu`

**API Documentation:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Deployment

For production deployment on VPS (Hetzner, AWS, DigitalOcean):

```bash
# See full deployment guide
cat docs/DEPLOYMENT.md
```

## Documentation

- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - VPS deployment guide
- [DEMO_MODE.md](docs/DEMO_MODE.md) - Demo mode configuration
- [FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) - Firebase authentication setup

## Tech Stack

**Frontend:**
- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- Firebase SDK

**Backend:**
- Python FastAPI
- SQLModel / SQLAlchemy
- PostgreSQL 16
- Firebase Admin SDK

**Infrastructure:**
- Docker Compose
- Nginx (production)

## License

Copyright © 2025 California Community Colleges. All rights reserved.

## Support

For issues or questions, please open a GitHub issue.
