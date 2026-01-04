#!/usr/bin/env python3
"""
Demo Database Reset Script

This script resets the demo database to its initial state.
It should be run daily via cron job.

Usage:
    python scripts/reset_demo.py

Cron setup (runs at 7 AM UTC = midnight PST):
    0 7 * * * cd /path/to/calipar_app/backend && python /path/to/calipar_app/scripts/reset_demo.py >> /var/log/calipar_demo_reset.log 2>&1
"""

import asyncio
import sys
import logging
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from services.demo_mode import should_reset_demo, reset_demo_database
from config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Main entry point for the reset script."""

    logger.info("=" * 60)
    logger.info("CALIPAR Demo Database Reset Script")
    logger.info("=" * 60)

    settings = get_settings()

    if not settings.demo_mode_enabled:
        logger.info("Demo mode is disabled. Exiting.")
        return

    logger.info(f"Demo mode enabled: {settings.demo_mode_enabled}")
    logger.info(f"Demo user prefix: {settings.demo_user_prefix}")
    logger.info(f"Reset hour (UTC): {settings.demo_reset_hour_utc}")

    # Check if reset is needed
    if not should_reset_demo():
        logger.info("Reset not needed at this time. Exiting.")
        return

    logger.info("Reset condition met. Proceeding with reset...")

    try:
        await reset_demo_database()
        logger.info("Demo database reset completed successfully!")
        logger.info("=" * 60)
    except Exception as e:
        logger.error(f"Failed to reset demo database: {e}")
        logger.info("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
