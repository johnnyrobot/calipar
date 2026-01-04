# CALIPAR Platform - VPS Deployment Guide

Complete guide for deploying the CALIPAR platform on a VPS (Hetzner, AWS, DigitalOcean, etc.).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Application Setup](#application-setup)
4. [Firebase Configuration](#firebase-configuration)
5. [Demo Mode Setup](#demo-mode-setup)
6. [SSL Certificate with Let's Encrypt](#ssl-certificate)
7. [Systemd Services](#systemd-services)
8. [Cron Job for Demo Reset](#cron-job-for-demo-reset)
9. [Monitoring and Logs](#monitoring-and-logs)
10. [Security Hardening](#security-hardening)

---

## Prerequisites

- VPS with at least 4GB RAM (8GB recommended)
- Ubuntu 22.04 LTS or Debian 12
- Domain name pointed to your VPS IP
- Basic familiarity with Linux command line

---

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Set timezone (important for demo reset timing)
sudo timedatectl set-timezone America/Los_Angeles

# Create application user
sudo useradd -m -s /bin/bash calipar
sudo usermod -aG sudo calipar

# Switch to calipar user
sudo su - calipar
```

### 2. Install Dependencies

```bash
# Install Python 3.11+, pip, and PostgreSQL
sudo apt install -y python3.11 python3.11-venv python3-pip postgresql postgresql-contrib nginx git

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker calipar
```

---

## Application Setup

### 1. Clone Repository

```bash
# Clone your repository
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/calipar.git
sudo chown -R calipar:calipar calipar
cd calipar/generations/calipar_app
```

### 2. Configure Environment Variables

```bash
# Copy example .env
cp .env.example .env

# Edit with your values
nano .env
```

**Required variables:**

```bash
# Production Database (using Docker PostgreSQL)
DATABASE_URL=postgresql://calipar:STRONG_PASSWORD_HERE@db:5432/calipar

# Demo Database (optional - for demo mode)
DEMO_DATABASE_URL=postgresql://calipar:STRONG_PASSWORD_HERE@db:5432/calipar_demo

# Demo Mode Settings
DEMO_MODE_ENABLED=true
DEMO_RESET_HOUR_UTC=7
DEMO_USER_PREFIX=demo

# Google AI (optional - for AI features)
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_FILE_SEARCH_STORE_NAME=

# Firebase (see section below)
FIREBASE_PROJECT_ID=your_firebase_project_id

# Production Settings
DEBUG=false
SECRET_KEY=CHANGE_THIS_TO_A_RANDOM_STRING_MIN_32_CHARS
NEXT_PUBLIC_API_URL=https://your-domain.com
```

### 3. Set Up Firebase Service Account

```bash
# Create directory for service account
mkdir -p backend/secrets

# Upload your Firebase serviceAccountKey.json
# (Download from Firebase Console > Project Settings > Service Accounts)
# Place it at: backend/secrets/serviceAccountKey.json

# Set proper permissions
chmod 600 backend/secrets/serviceAccountKey.json
```

Update `.env` to point to the service account:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./backend/secrets/serviceAccountKey.json
```

---

## Firebase Configuration

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project: "CALIPAR Production"
3. Enable Authentication → Sign-in method → Email/Password

### 2. Get Web App Configuration

1. Firebase Console → Project Settings → Your apps → Add Web app
2. Copy the config values to your `.env`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123
```

### 3. Get Service Account Key

1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `serviceAccountKey.json`
4. Upload to server at `backend/secrets/serviceAccountKey.json`

---

## Demo Mode Setup

Demo mode allows users with "demo" in their email to access a sandbox environment that resets daily.

### 1. Enable Demo Mode

In your `.env` file:

```bash
# Enable demo mode
DEMO_MODE_ENABLED=true

# Demo database (separate from production)
DEMO_DATABASE_URL=postgresql://calipar:PASSWORD@db:5432/calipar_demo

# Reset at midnight PST (7 AM UTC)
DEMO_RESET_HOUR_UTC=7

# Demo user identifier
DEMO_USER_PREFIX=demo
```

### 2. Create Demo Database

```bash
# Start services
docker-compose up -d db

# Create demo database
docker exec -it calipar-db psql -U calipar -c "CREATE DATABASE calipar_demo;"

# Run demo seed
cd backend
python -c "from services.demo_mode import create_demo_db_and_tables; create_demo_db_and_tables()"
python seed_demo.py
```

### 3. Demo User Accounts

These demo accounts will be created automatically:

| Email | Role | Department |
|-------|------|------------|
| demo-faculty@lamc.edu | Faculty | Mathematics |
| demo-chair@lamc.edu | Chair | Mathematics |
| demo-dean@lamc.edu | Dean | - |
| demo-admin@lamc.edu | Admin | - |
| demo-proc@lamc.edu | PROC | - |

Users can log in with these credentials using Firebase Auth (you'll need to create these users in Firebase Console).

---

## SSL Certificate with Let's Encrypt

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain Certificate

```bash
# Replace with your actual domain
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot will automatically configure nginx with SSL.

### 3. Auto-Renewal

Certbot sets up auto-renewal by default. Verify:

```bash
sudo certbot renew --dry-run
```

---

## Systemd Services

Create systemd services for automatic startup.

### 1. Backend Service

```bash
sudo nano /etc/systemd/system/calipar-backend.service
```

```ini
[Unit]
Description=CALIPAR Backend API
After=network.target docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/calipar/generations/calipar_app
ExecStart=/usr/bin/docker-compose up -d backend
ExecStop=/usr/bin/docker-compose stop backend
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### 2. Frontend Service

```bash
sudo nano /etc/systemd/system/calipar-frontend.service
```

```ini
[Unit]
Description=CALIPAR Frontend
After=network.target docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/calipar/generations/calipar_app
ExecStart=/usr/bin/docker-compose up -d frontend
ExecStop=/usr/bin/docker-compose stop frontend
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### 3. Enable Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable calipar-backend calipar-frontend
sudo systemctl start calipar-backend calipar-frontend
```

---

## Cron Job for Demo Reset

Set up automatic daily reset of demo database.

```bash
# Edit crontab
crontab -e
```

Add this line (resets at 7 AM UTC = midnight PST):

```cron
0 7 * * * cd /opt/calipar/generations/calipar_app && /usr/bin/docker-compose exec -T backend python /app/scripts/reset_demo.py >> /var/log/calipar_demo_reset.log 2>&1
```

---

## Monitoring and Logs

### View Logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Database logs
docker-compose logs -f db

# Demo reset logs
tail -f /var/log/calipar_demo_reset.log
```

### Health Check Endpoint

```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{"status": "healthy", "service": "calipar-backend"}
```

---

## Security Hardening

### 1. Firewall Configuration

```bash
# Install UFW
sudo apt install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 2. Fail2Ban for SSH

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. PostgreSQL Security

Edit `docker-compose.yml` to use stronger passwords:

```yaml
db:
  environment:
    POSTGRES_PASSWORD:_CHANGE_THIS_STRONG_PASSWORD_
```

### 4. Regular Backups

```bash
# Create backup script
sudo nano /usr/local/bin/backup-calipar.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/calipar"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup production database
docker exec calipar-db pg_dump -U calipar calipar | gzip > "$BACKUP_DIR/calipar_$DATE.sql.gz"

# Backup demo database
docker exec calipar-db pg_dump -U calipar calipar_demo | gzip > "$BACKUP_DIR/calipar_demo_$DATE.sql.gz"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
```

```bash
# Make executable and add to crontab
sudo chmod +x /usr/local/bin/backup-calipar.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-calipar.sh" | crontab -
```

---

## Troubleshooting

### Services not starting

```bash
# Check service status
sudo systemctl status calipar-backend

# View logs
journalctl -u calipar-backend -n 50
```

### Database connection issues

```bash
# Check database is running
docker-compose ps db

# Enter database
docker exec -it calipar-db psql -U calipar

# Check databases
\l

# Connect to production database
\c calipar

# Check tables
\dt
```

### Demo mode not working

```bash
# Check demo status
curl https://your-domain.com/api/auth/demo-status

# Manually trigger reset
cd /opt/calipar/generations/calipar_app
docker-compose exec -T backend python /app/scripts/reset_demo.py
```

---

## Quick Start Checklist

- [ ] Server updated and configured
- [ ] Dependencies installed (Python, Node.js, Docker, PostgreSQL)
- [ ] Repository cloned and configured
- [ ] `.env` file created with all required variables
- [ ] Firebase project created and configured
- [ ] Service account key uploaded
- [ ] SSL certificate obtained
- [ ] Systemd services enabled and started
- [ ] Cron job for demo reset configured
- [ ] Firewall configured
- [ ] Backup script configured

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/YOUR_USERNAME/calipar/issues
- Documentation: `/docs` folder in repository
