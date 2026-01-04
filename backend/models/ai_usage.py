"""
AI Usage tracking model for rate limiting and usage statistics.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class AIEndpoint(str, Enum):
    """AI endpoint types."""
    ANALYZE = "analyze"
    EXPAND = "expand"
    EQUITY_CHECK = "equity_check"
    CHAT = "chat"
    CHAT_STREAM = "chat_stream"
    SOCRATIC = "socratic"


class AIUsage(SQLModel, table=True):
    """
    Tracks individual AI API calls for usage monitoring and rate limiting.

    Used to:
    - Enforce per-user rate limits
    - Track token usage for cost monitoring
    - Generate usage reports for administrators
    """
    __tablename__ = "ai_usage"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)

    # Request details
    endpoint: AIEndpoint = Field(index=True)
    request_timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Token usage (if available from API response)
    prompt_tokens: Optional[int] = Field(default=None)
    completion_tokens: Optional[int] = Field(default=None)
    total_tokens: Optional[int] = Field(default=None)

    # Request metadata
    model_name: Optional[str] = Field(default=None)
    response_time_ms: Optional[int] = Field(default=None)
    success: bool = Field(default=True)
    error_message: Optional[str] = Field(default=None)

    # Cost tracking (in microdollars for precision)
    estimated_cost_microdollars: Optional[int] = Field(default=None)


class RateLimitConfig(SQLModel, table=True):
    """
    Configurable rate limits per role or user.

    Allows administrators to set different rate limits for different user types.
    """
    __tablename__ = "rate_limit_config"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Target can be a role (Faculty, Chair, etc.) or a specific user_id
    target_type: str = Field(index=True)  # "role" or "user"
    target_value: str = Field(index=True)  # Role name or user_id

    # Rate limit settings
    requests_per_minute: int = Field(default=10)
    requests_per_hour: int = Field(default=100)
    requests_per_day: int = Field(default=500)

    # Token limits (optional)
    max_tokens_per_request: Optional[int] = Field(default=None)
    max_tokens_per_day: Optional[int] = Field(default=None)

    # Override defaults
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Default rate limits by role
DEFAULT_RATE_LIMITS = {
    "Faculty": {
        "requests_per_minute": 5,
        "requests_per_hour": 50,
        "requests_per_day": 200,
    },
    "Chair": {
        "requests_per_minute": 10,
        "requests_per_hour": 100,
        "requests_per_day": 500,
    },
    "Dean": {
        "requests_per_minute": 15,
        "requests_per_hour": 150,
        "requests_per_day": 750,
    },
    "Admin": {
        "requests_per_minute": 30,
        "requests_per_hour": 300,
        "requests_per_day": 1500,
    },
    "PROC": {
        "requests_per_minute": 10,
        "requests_per_hour": 100,
        "requests_per_day": 500,
    },
}
