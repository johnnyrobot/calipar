#!/bin/bash

# CALIPAR Platform - Docker Compose Startup Script
# This script initializes and starts the CALIPAR development environment

set -e

echo "=========================================="
echo "    CALIPAR Platform - Starting Up"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if docker-compose exists
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}docker-compose not found, trying 'docker compose'...${NC}"
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo -e "${YELLOW}Stopping any existing containers...${NC}"
$COMPOSE_CMD down --remove-orphans 2>/dev/null || true

echo -e "${YELLOW}Building and starting containers...${NC}"
$COMPOSE_CMD up --build -d

echo -e "${YELLOW}Waiting for services to be ready...${NC}"

# Wait for database
echo -n "Waiting for database..."
for i in {1..30}; do
    if $COMPOSE_CMD exec -T db pg_isready -U calipar -d calipar > /dev/null 2>&1; then
        echo -e " ${GREEN}Ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for backend
echo -n "Waiting for backend API..."
for i in {1..30}; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo -e " ${GREEN}Ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for frontend
echo -n "Waiting for frontend..."
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e " ${GREEN}Ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "=========================================="
echo -e "${GREEN}    CALIPAR Platform is Ready!${NC}"
echo "=========================================="
echo ""
echo "Services:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo "  Database:  localhost:5432 (calipar/calipar_dev_password)"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose logs -f"
echo "  Stop:          docker-compose down"
echo "  Restart:       docker-compose restart"
echo ""

# Show container status
$COMPOSE_CMD ps
