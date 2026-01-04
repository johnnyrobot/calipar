# Demo Mode Guide

CALIPAR Platform includes a **Demo Mode** that allows prospective users to explore the full application without affecting production data. Demo mode provides a sandbox environment that resets daily.

## What is Demo Mode?

Demo mode creates an isolated environment for users with "demo" in their email address. These users can:

- Explore all features of CALIPAR
- Create program reviews, action plans, and resource requests
- Use AI-powered features like Mission-Bot
- Make changes without affecting real data

**Key features:**
- Separate demo database (isolated from production)
- Automatic daily reset at midnight (configurable)
- Pre-seeded demo data for exploration
- Visual indicator showing demo mode is active

---

## Quick Start

### Option 1: Enable Demo Mode (Recommended for Testing)

Edit your `.env` file:

```bash
# Enable demo mode
DEMO_MODE_ENABLED=true

# Demo database (separate from production)
DEMO_DATABASE_URL=sqlite:///./calipar_demo.db

# Reset at midnight PST (7 AM UTC)
DEMO_RESET_HOUR_UTC=7

# Users with "demo" in email are demo users
DEMO_USER_PREFIX=demo
```

### Option 2: Disable Demo Mode (Production)

```bash
# Disable demo mode
DEMO_MODE_ENABLED=false
DEMO_DATABASE_URL=
```

---

## Demo User Accounts

The following demo accounts are automatically created when demo mode is enabled:

| Email | Role | Department |
|-------|------|------------|
| `demo-faculty@lamc.edu` | Faculty | Mathematics |
| `demo-chair@lamc.edu` | Chair | Mathematics |
| `demo-dean@lamc.edu` | Dean | - |
| `demo-admin@lamc.edu` | Admin | - |
| `demo-proc@lamc.edu` | PROC | - |

**To use demo mode:**
1. Any user with "demo" in their email is automatically a demo user
2. Use Firebase Auth to create these accounts in your Firebase project
3. Or use development mode quick-login buttons

---

## Running Demo Mode Locally

### Using Docker (Recommended)

```bash
# In generations/calipar_app/

# 1. Set up .env with demo mode enabled
cp .env.example .env
# Edit .env: set DEMO_MODE_ENABLED=true and DEMO_DATABASE_URL

# 2. Start services
docker-compose up -d

# 3. Seed demo database
docker-compose exec backend python seed_demo.py

# 4. Access the app
open http://localhost:3000
```

### Without Docker

```bash
# In generations/calipar_app/

# 1. Create Python virtual environment
cd backend
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up .env with demo mode enabled
# Edit: DEMO_MODE_ENABLED=true, DEMO_DATABASE_URL=sqlite:///./calipar_demo.db

# 4. Seed demo database
python seed_demo.py

# 5. Start backend
uvicorn main:app --reload

# 6. In another terminal, start frontend
cd ../frontend
npm install
npm run dev
```

---

## Demo Data Overview

The demo database includes:

- **5 Demo Users** - Faculty, Chair, Dean, Admin, PROC
- **4 Organizations** - College → Division → 2 Departments
- **5 ISMP Strategic Initiatives** - Institutional strategic planning goals
- **4 Program Reviews** - One in each status (DRAFT, IN_REVIEW, VALIDATED, APPROVED)
- **3 Action Plans** - With Golden Thread mappings to ISMP goals
- **4 Resource Requests** - Covering different object codes (1000-5000)
- **2 Validation Scores** - PROC rubric scores
- **10 Audit Trail Entries** - Showing complete workflow

---

## Daily Reset

Demo data automatically resets every day at midnight PST (7 AM UTC).

### What Gets Reset:
- All demo database tables are dropped and recreated
- Demo data is re-seeded to initial state
- Demo user changes are discarded

### What Doesn't Reset:
- Production database is never affected
- Firebase user accounts remain
- Configuration settings persist

### Manual Reset

To manually trigger a demo reset:

```bash
# Using Docker
docker-compose exec backend python /app/scripts/reset_demo.py

# Without Docker
cd backend
python ../scripts/reset_demo.py
```

---

## Demo Mode Indicator

When demo mode is active for a user, they will see:

1. **Banner at top of page** - Shows "Demo Mode" with countdown to next reset
2. **Badge in header** - Small "Demo" badge next to user info
3. **Reset button** - "Reset Now" button to manually reset

---

## API Endpoints

### Check Demo Status

```bash
GET /api/auth/demo-status
```

Response:
```json
{
  "demo_mode_enabled": true,
  "demo_user_prefix": "demo",
  "demo_reset_hour_utc": 7,
  "last_reset": "2025-01-03T07:00:00Z",
  "next_reset": "2025-01-04T07:00:00Z"
}
```

### Get Demo User Accounts

```bash
GET /api/auth/demo-accounts
```

Response:
```json
{
  "demo_mode_enabled": true,
  "demo_user_prefix": "demo",
  "accounts": [
    {
      "firebase_uid": "demo-faculty-001",
      "email": "demo-faculty@lamc.edu",
      "full_name": "Demo Faculty User",
      "role": "FACULTY",
      "department": "Mathematics"
    },
    ...
  ]
}
```

---

## Configuration Options

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `DEMO_MODE_ENABLED` | Enable/disable demo mode | `false` |
| `DEMO_DATABASE_URL` | Demo database connection string | (empty) |
| `DEMO_RESET_HOUR_UTC` | Hour to reset (UTC, 0-23) | `7` |
| `DEMO_USER_PREFIX` | Email prefix for demo users | `demo` |

### Timezone Examples

| Reset Time (Local) | `DEMO_RESET_HOUR_UTC` |
|--------------------|----------------------|
| Midnight PST | `7` |
| Midnight EST | `5` |
| Midnight UTC | `0` |
| 6 AM UTC | `6` |

---

## Troubleshooting

### Demo mode not working

1. Check `.env` has `DEMO_MODE_ENABLED=true`
2. Check `DEMO_DATABASE_URL` is set
3. Restart backend after changing `.env`

### Demo users see production data

1. Verify user's email contains "demo"
2. Check `/api/auth/me` returns `"is_demo_user": true`
3. Verify demo database is seeded

### Reset not running

1. Check cron job is configured correctly
2. Check reset logs: `tail -f /var/log/calipar_demo_reset.log`
3. Manually run reset script to test

---

## Security Considerations

1. **Isolation**: Demo users have separate database, never access production data
2. **Reset**: All demo data is discarded daily - no persistent changes
3. **Firebase**: Demo users are still Firebase users (create separate project for demo if needed)
4. **API Keys**: Consider limiting AI features for demo users (rate limiting)

---

## Production Deployment

For production deployment with demo mode:

1. **Separate Firebase Project** - Use different Firebase project for demo
2. **Limit Features** - Consider restricting AI API calls for demo users
3. **Monitor Resources** - Demo database can grow; monitor disk usage
4. **Cron Job** - Set up systemd timer instead of cron for better reliability

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production deployment guide.

---

## Development vs Demo Mode

| Feature | Development Mode | Demo Mode |
|---------|------------------|-----------|
| Purpose | Local development | User sandbox |
| Users | Quick-login buttons | Firebase Auth required |
| Database | Shared | Isolated |
| Reset | Manual | Automatic (daily) |
| Production Impact | None | None |

Both modes are safe and isolated from production data.
