"""
Rate Limiter Service for AI endpoints.

Implements per-user rate limiting with role-based defaults.
Uses an in-memory cache for fast lookups with database-backed usage tracking.
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from uuid import UUID
import asyncio

from sqlmodel import Session, select, func

from models.ai_usage import AIUsage, AIEndpoint, RateLimitConfig, DEFAULT_RATE_LIMITS
from models.user import User


class RateLimitExceeded(Exception):
    """Exception raised when rate limit is exceeded."""

    def __init__(
        self,
        message: str,
        limit_type: str,
        current_count: int,
        limit: int,
        reset_time: datetime,
    ):
        super().__init__(message)
        self.limit_type = limit_type
        self.current_count = current_count
        self.limit = limit
        self.reset_time = reset_time


class RateLimiterService:
    """
    Rate limiting service for AI endpoints.

    Features:
    - Per-user rate limits (minute, hour, day)
    - Role-based default limits
    - In-memory caching for performance
    - Database-backed usage tracking
    """

    def __init__(self):
        # In-memory cache for rate limit state
        # Structure: {user_id: {"minute": [(timestamp, count)], ...}}
        self._cache: Dict[str, Dict[str, list]] = {}
        self._cache_lock = asyncio.Lock()

        # Cache cleanup interval (seconds)
        self._cleanup_interval = 300  # 5 minutes

    async def check_rate_limit(
        self,
        session: Session,
        user: User,
        endpoint: AIEndpoint,
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if a user has exceeded their rate limit.

        Returns:
            Tuple of (is_allowed, error_message)
        """
        user_id_str = str(user.id)
        now = datetime.utcnow()

        # Get rate limits for this user
        limits = await self._get_rate_limits(session, user)

        # Check each time window
        for window_name, window_config in [
            ("minute", {"duration": timedelta(minutes=1), "limit_key": "requests_per_minute"}),
            ("hour", {"duration": timedelta(hours=1), "limit_key": "requests_per_hour"}),
            ("day", {"duration": timedelta(days=1), "limit_key": "requests_per_day"}),
        ]:
            limit = limits.get(window_config["limit_key"], 100)
            window_start = now - window_config["duration"]

            # Count requests in this window
            count = await self._count_requests(
                session, user.id, endpoint, window_start
            )

            if count >= limit:
                reset_time = window_start + window_config["duration"]
                raise RateLimitExceeded(
                    message=f"Rate limit exceeded: {count}/{limit} requests per {window_name}",
                    limit_type=window_name,
                    current_count=count,
                    limit=limit,
                    reset_time=reset_time,
                )

        return True, None

    async def _get_rate_limits(
        self,
        session: Session,
        user: User,
    ) -> Dict[str, int]:
        """
        Get rate limits for a user.

        Priority:
        1. User-specific override
        2. Role-based config in database
        3. Default limits by role
        """
        # Check for user-specific override
        user_config = session.exec(
            select(RateLimitConfig)
            .where(RateLimitConfig.target_type == "user")
            .where(RateLimitConfig.target_value == str(user.id))
            .where(RateLimitConfig.is_active == True)
        ).first()

        if user_config:
            return {
                "requests_per_minute": user_config.requests_per_minute,
                "requests_per_hour": user_config.requests_per_hour,
                "requests_per_day": user_config.requests_per_day,
            }

        # Check for role-based config in database
        role_config = session.exec(
            select(RateLimitConfig)
            .where(RateLimitConfig.target_type == "role")
            .where(RateLimitConfig.target_value == user.role.value)
            .where(RateLimitConfig.is_active == True)
        ).first()

        if role_config:
            return {
                "requests_per_minute": role_config.requests_per_minute,
                "requests_per_hour": role_config.requests_per_hour,
                "requests_per_day": role_config.requests_per_day,
            }

        # Fall back to default limits
        return DEFAULT_RATE_LIMITS.get(
            user.role.value,
            {
                "requests_per_minute": 10,
                "requests_per_hour": 100,
                "requests_per_day": 500,
            },
        )

    async def _count_requests(
        self,
        session: Session,
        user_id: UUID,
        endpoint: AIEndpoint,
        since: datetime,
    ) -> int:
        """Count AI requests for a user since a given time."""
        count = session.exec(
            select(func.count(AIUsage.id))
            .where(AIUsage.user_id == user_id)
            .where(AIUsage.request_timestamp >= since)
        ).one()
        return count or 0

    async def record_usage(
        self,
        session: Session,
        user: User,
        endpoint: AIEndpoint,
        prompt_tokens: Optional[int] = None,
        completion_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None,
        model_name: Optional[str] = None,
        response_time_ms: Optional[int] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> AIUsage:
        """
        Record an AI API usage event.

        This should be called after each AI request, regardless of success/failure.
        """
        # Calculate estimated cost (using Gemini 2.5 Flash pricing as baseline)
        # Input: $0.075 per 1M tokens, Output: $0.30 per 1M tokens
        estimated_cost = None
        if prompt_tokens is not None and completion_tokens is not None:
            # Convert to microdollars (millionths of a dollar) for precision
            input_cost = (prompt_tokens / 1_000_000) * 0.075 * 1_000_000
            output_cost = (completion_tokens / 1_000_000) * 0.30 * 1_000_000
            estimated_cost = int(input_cost + output_cost)

        usage = AIUsage(
            user_id=user.id,
            endpoint=endpoint,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens or ((prompt_tokens or 0) + (completion_tokens or 0)),
            model_name=model_name,
            response_time_ms=response_time_ms,
            success=success,
            error_message=error_message,
            estimated_cost_microdollars=estimated_cost,
        )

        session.add(usage)
        session.commit()
        session.refresh(usage)

        return usage

    async def get_usage_stats(
        self,
        session: Session,
        user_id: Optional[UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict:
        """
        Get usage statistics for reporting.

        Can be filtered by user and date range.
        """
        query = select(AIUsage)

        if user_id:
            query = query.where(AIUsage.user_id == user_id)
        if start_date:
            query = query.where(AIUsage.request_timestamp >= start_date)
        if end_date:
            query = query.where(AIUsage.request_timestamp <= end_date)

        usages = session.exec(query).all()

        # Aggregate statistics
        total_requests = len(usages)
        successful_requests = sum(1 for u in usages if u.success)
        total_tokens = sum(u.total_tokens or 0 for u in usages)
        total_cost = sum(u.estimated_cost_microdollars or 0 for u in usages)
        avg_response_time = (
            sum(u.response_time_ms or 0 for u in usages) / total_requests
            if total_requests > 0
            else 0
        )

        # Group by endpoint
        by_endpoint = {}
        for usage in usages:
            endpoint = usage.endpoint.value
            if endpoint not in by_endpoint:
                by_endpoint[endpoint] = {"count": 0, "tokens": 0, "cost_microdollars": 0}
            by_endpoint[endpoint]["count"] += 1
            by_endpoint[endpoint]["tokens"] += usage.total_tokens or 0
            by_endpoint[endpoint]["cost_microdollars"] += usage.estimated_cost_microdollars or 0

        return {
            "total_requests": total_requests,
            "successful_requests": successful_requests,
            "failed_requests": total_requests - successful_requests,
            "success_rate": successful_requests / total_requests if total_requests > 0 else 0,
            "total_tokens": total_tokens,
            "total_cost_dollars": total_cost / 1_000_000,  # Convert from microdollars
            "avg_response_time_ms": avg_response_time,
            "by_endpoint": by_endpoint,
        }

    async def get_user_remaining_quota(
        self,
        session: Session,
        user: User,
    ) -> Dict:
        """
        Get remaining quota for a user across all time windows.
        """
        now = datetime.utcnow()
        limits = await self._get_rate_limits(session, user)

        # Count usage in each window
        minute_count = await self._count_requests(
            session, user.id, None, now - timedelta(minutes=1)
        )
        hour_count = await self._count_requests(
            session, user.id, None, now - timedelta(hours=1)
        )
        day_count = await self._count_requests(
            session, user.id, None, now - timedelta(days=1)
        )

        return {
            "minute": {
                "used": minute_count,
                "limit": limits["requests_per_minute"],
                "remaining": max(0, limits["requests_per_minute"] - minute_count),
                "resets_at": (now + timedelta(minutes=1)).isoformat(),
            },
            "hour": {
                "used": hour_count,
                "limit": limits["requests_per_hour"],
                "remaining": max(0, limits["requests_per_hour"] - hour_count),
                "resets_at": (now + timedelta(hours=1)).isoformat(),
            },
            "day": {
                "used": day_count,
                "limit": limits["requests_per_day"],
                "remaining": max(0, limits["requests_per_day"] - day_count),
                "resets_at": (now + timedelta(days=1)).isoformat(),
            },
        }


# Global rate limiter instance
rate_limiter = RateLimiterService()
