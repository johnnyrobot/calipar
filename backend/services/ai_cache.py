"""
AI Response Caching Service

Implements caching for AI responses to reduce API costs and improve latency
for repeated or similar queries.

Features:
- In-memory LRU cache with TTL
- Cache key generation based on prompt hash
- Cache statistics and metrics
- Cache bypass option
- Configurable TTL per endpoint type
"""

import hashlib
import json
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional, TypeVar, Generic
from collections import OrderedDict
import threading

# Type for cached values
T = TypeVar('T')


@dataclass
class CacheEntry(Generic[T]):
    """A single cache entry with metadata."""
    value: T
    created_at: float
    expires_at: float
    hit_count: int = 0
    last_accessed: float = field(default_factory=time.time)

    def is_expired(self) -> bool:
        """Check if this cache entry has expired."""
        return time.time() > self.expires_at


@dataclass
class CacheStats:
    """Statistics about cache performance."""
    hits: int = 0
    misses: int = 0
    evictions: int = 0
    current_size: int = 0
    max_size: int = 0

    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate."""
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    @property
    def estimated_cost_savings(self) -> float:
        """
        Estimate cost savings from cache hits.
        Assumes average cost of $0.001 per request.
        """
        return self.hits * 0.001

    def to_dict(self) -> Dict[str, Any]:
        """Convert stats to dictionary."""
        return {
            "hits": self.hits,
            "misses": self.misses,
            "evictions": self.evictions,
            "current_size": self.current_size,
            "max_size": self.max_size,
            "hit_rate": round(self.hit_rate, 4),
            "estimated_cost_savings_usd": round(self.estimated_cost_savings, 4),
        }


class AICache:
    """
    In-memory LRU cache for AI responses.

    Thread-safe implementation with:
    - Configurable max size (number of entries)
    - TTL-based expiration
    - LRU eviction policy
    - Cache statistics
    """

    # Default TTL values (in seconds) per endpoint type
    DEFAULT_TTLS = {
        "analyze": 3600,      # 1 hour - data analysis results change rarely
        "expand": 1800,       # 30 minutes - narrative expansion
        "equity_check": 3600, # 1 hour - equity analysis
        "chat": 300,          # 5 minutes - chat responses (more dynamic)
        "socratic": 600,      # 10 minutes - socratic questions
        "default": 1800,      # 30 minutes default
    }

    def __init__(self, max_size: int = 1000):
        """
        Initialize the cache.

        Args:
            max_size: Maximum number of entries to store
        """
        self.max_size = max_size
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        self._stats = CacheStats(max_size=max_size)

    def _generate_key(
        self,
        endpoint: str,
        prompt_data: Any,
        user_id: Optional[str] = None,
    ) -> str:
        """
        Generate a cache key from the request parameters.

        The key is a hash of the endpoint, prompt data, and optionally user_id.
        Using SHA-256 for collision resistance.
        """
        key_parts = {
            "endpoint": endpoint,
            "data": prompt_data,
        }

        # Include user_id for user-specific caching if needed
        if user_id:
            key_parts["user_id"] = user_id

        # Serialize to JSON and hash
        serialized = json.dumps(key_parts, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode()).hexdigest()

    def get(
        self,
        endpoint: str,
        prompt_data: Any,
        user_id: Optional[str] = None,
    ) -> Optional[Any]:
        """
        Get a value from the cache.

        Args:
            endpoint: The AI endpoint (analyze, expand, etc.)
            prompt_data: The request data
            user_id: Optional user ID for user-specific caching

        Returns:
            The cached value if found and not expired, None otherwise
        """
        key = self._generate_key(endpoint, prompt_data, user_id)

        with self._lock:
            if key not in self._cache:
                self._stats.misses += 1
                return None

            entry = self._cache[key]

            # Check expiration
            if entry.is_expired():
                del self._cache[key]
                self._stats.current_size -= 1
                self._stats.misses += 1
                return None

            # Update access metadata
            entry.hit_count += 1
            entry.last_accessed = time.time()

            # Move to end (most recently used)
            self._cache.move_to_end(key)

            self._stats.hits += 1
            return entry.value

    def set(
        self,
        endpoint: str,
        prompt_data: Any,
        value: Any,
        ttl: Optional[int] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """
        Store a value in the cache.

        Args:
            endpoint: The AI endpoint
            prompt_data: The request data
            value: The response to cache
            ttl: Time-to-live in seconds (uses default if not specified)
            user_id: Optional user ID

        Returns:
            The cache key
        """
        key = self._generate_key(endpoint, prompt_data, user_id)

        # Use default TTL for endpoint if not specified
        if ttl is None:
            ttl = self.DEFAULT_TTLS.get(endpoint, self.DEFAULT_TTLS["default"])

        now = time.time()
        entry = CacheEntry(
            value=value,
            created_at=now,
            expires_at=now + ttl,
            last_accessed=now,
        )

        with self._lock:
            # If key exists, update it
            if key in self._cache:
                self._cache[key] = entry
                self._cache.move_to_end(key)
                return key

            # Evict oldest entries if at capacity
            while len(self._cache) >= self.max_size:
                self._evict_oldest()

            # Add new entry
            self._cache[key] = entry
            self._stats.current_size = len(self._cache)

        return key

    def _evict_oldest(self) -> None:
        """Evict the oldest entry (LRU policy)."""
        if self._cache:
            self._cache.popitem(last=False)
            self._stats.evictions += 1
            self._stats.current_size = len(self._cache)

    def invalidate(
        self,
        endpoint: str,
        prompt_data: Any,
        user_id: Optional[str] = None,
    ) -> bool:
        """
        Invalidate a specific cache entry.

        Returns:
            True if entry was found and removed, False otherwise
        """
        key = self._generate_key(endpoint, prompt_data, user_id)

        with self._lock:
            if key in self._cache:
                del self._cache[key]
                self._stats.current_size = len(self._cache)
                return True
            return False

    def invalidate_by_endpoint(self, endpoint: str) -> int:
        """
        Invalidate all cache entries for a specific endpoint.

        Returns:
            Number of entries invalidated
        """
        count = 0
        with self._lock:
            keys_to_remove = [
                key for key, entry in self._cache.items()
                if entry.value.get("_endpoint") == endpoint
            ]
            for key in keys_to_remove:
                del self._cache[key]
                count += 1
            self._stats.current_size = len(self._cache)
        return count

    def clear(self) -> int:
        """
        Clear all cache entries.

        Returns:
            Number of entries cleared
        """
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
            self._stats.current_size = 0
            return count

    def cleanup_expired(self) -> int:
        """
        Remove all expired entries.

        Returns:
            Number of entries removed
        """
        count = 0
        with self._lock:
            now = time.time()
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry.expires_at < now
            ]
            for key in expired_keys:
                del self._cache[key]
                count += 1
            self._stats.current_size = len(self._cache)
        return count

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            self._stats.current_size = len(self._cache)
            return self._stats.to_dict()

    def reset_stats(self) -> None:
        """Reset cache statistics (but keep entries)."""
        with self._lock:
            self._stats = CacheStats(
                max_size=self.max_size,
                current_size=len(self._cache),
            )


# Global cache instance
ai_cache = AICache(max_size=1000)


# Decorator for caching AI function responses
def cached_ai_response(
    endpoint: str,
    ttl: Optional[int] = None,
    include_user: bool = False,
):
    """
    Decorator to cache AI response functions.

    Usage:
        @cached_ai_response("analyze", ttl=3600)
        async def analyze_data(data: dict, user_id: str):
            ...

    Args:
        endpoint: The endpoint name for the cache key
        ttl: Optional TTL override
        include_user: Whether to include user_id in cache key
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract prompt data for cache key
            prompt_data = kwargs.get("data") or kwargs.get("prompt") or args[0] if args else None
            user_id = kwargs.get("user_id") if include_user else None

            # Check bypass flag
            bypass_cache = kwargs.pop("bypass_cache", False)

            if not bypass_cache:
                # Try to get from cache
                cached = ai_cache.get(endpoint, prompt_data, user_id)
                if cached is not None:
                    return cached

            # Call the actual function
            result = await func(*args, **kwargs)

            # Cache the result
            if not bypass_cache:
                ai_cache.set(endpoint, prompt_data, result, ttl, user_id)

            return result

        return wrapper
    return decorator
