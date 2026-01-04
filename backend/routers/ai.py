"""
AI Service endpoints for Gemini integration.

Features:
- Rate limiting per user with role-based defaults
- Usage tracking for cost monitoring
- Admin endpoints for usage statistics
"""

import time
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session

from database import get_session
from models.user import User, UserRole
from models.ai_usage import AIEndpoint
from routers.auth import get_current_user, require_role
from services.gemini import gemini_service
from services.rate_limiter import rate_limiter, RateLimitExceeded
from services.ai_cache import ai_cache

router = APIRouter()


async def check_rate_limit_dependency(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    FastAPI dependency to check rate limits before AI endpoints.
    Raises HTTPException 429 if rate limit exceeded.
    """
    try:
        # Note: endpoint will be set by the actual route
        await rate_limiter.check_rate_limit(session, current_user, AIEndpoint.CHAT)
        return current_user
    except RateLimitExceeded as e:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limit_exceeded",
                "message": str(e),
                "limit_type": e.limit_type,
                "current_count": e.current_count,
                "limit": e.limit,
                "reset_time": e.reset_time.isoformat(),
            },
            headers={
                "X-RateLimit-Limit": str(e.limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": e.reset_time.isoformat(),
                "Retry-After": str(int((e.reset_time - datetime.utcnow()).total_seconds())),
            },
        )


class AnalyzeRequest(BaseModel):
    """Data trend analysis request."""
    data: dict
    context: Optional[str] = None
    focus_areas: Optional[List[str]] = None


class AnalyzeResponse(BaseModel):
    """Data analysis response."""
    insights: List[str]
    trends: List[dict]
    recommendations: List[str]


class ExpandRequest(BaseModel):
    """Bullet to narrative expansion request."""
    bullets: List[str]
    context: Optional[str] = None
    tone: str = "academic"


class ExpandResponse(BaseModel):
    """Expanded narrative response."""
    narrative: str
    word_count: int


class EquityCheckRequest(BaseModel):
    """Equity lens analysis request."""
    review_id: UUID
    section_content: dict
    program_data: Optional[dict] = None


class EquityCheckResponse(BaseModel):
    """Equity analysis response."""
    gaps_detected: List[dict]
    suggestions: List[str]
    ismp_alignments: List[dict]
    accjc_references: List[str]


class ChatRequest(BaseModel):
    """Compliance Copilot chat request."""
    message: str
    conversation_history: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    """Chat response with citations."""
    response: str
    citations: List[dict]
    rag_enabled: bool = False


class SocraticRequest(BaseModel):
    """Socratic questioning request."""
    section_key: str
    current_content: Optional[str] = None
    data_context: Optional[dict] = None


class SocraticResponse(BaseModel):
    """Socratic questioning response."""
    question: str
    follow_up_prompts: List[str]
    suggested_data_exploration: Optional[str] = None


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_trends(
    request: AnalyzeRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Analyze data trends using Gemini.
    Returns insights, trends, and recommendations.
    """
    # Check rate limit
    try:
        await rate_limiter.check_rate_limit(session, current_user, AIEndpoint.ANALYZE)
    except RateLimitExceeded as e:
        raise HTTPException(
            status_code=429,
            detail={"error": "rate_limit_exceeded", "message": str(e)},
        )

    start_time = time.time()
    success = True
    error_msg = None

    try:
        result = await gemini_service.analyze_trends(
            data=request.data,
            context=request.context,
            focus_areas=request.focus_areas,
        )
        return AnalyzeResponse(
            insights=result.get("insights", []),
            trends=result.get("trends", []),
            recommendations=result.get("recommendations", []),
        )
    except Exception as e:
        success = False
        error_msg = str(e)
        raise
    finally:
        # Record usage
        response_time_ms = int((time.time() - start_time) * 1000)
        await rate_limiter.record_usage(
            session=session,
            user=current_user,
            endpoint=AIEndpoint.ANALYZE,
            model_name=gemini_service.model_name if gemini_service.is_available else "mock",
            response_time_ms=response_time_ms,
            success=success,
            error_message=error_msg,
        )


@router.post("/expand", response_model=ExpandResponse)
async def expand_narrative(
    request: ExpandRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Expand bullet points into formal academic narrative.
    """
    result = await gemini_service.expand_narrative(
        bullets=request.bullets,
        context=request.context,
        tone=request.tone,
    )
    return ExpandResponse(
        narrative=result.get("narrative", ""),
        word_count=result.get("word_count", 0),
    )


@router.post("/equity-check", response_model=EquityCheckResponse)
async def equity_check(
    request: EquityCheckRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Run equity lens analysis on review content.
    Identifies gaps and suggests ISMP Goal 3 alignments.
    """
    result = await gemini_service.equity_check(
        section_content=request.section_content,
        program_data=request.program_data,
    )
    return EquityCheckResponse(
        gaps_detected=result.get("gaps_detected", []),
        suggestions=result.get("suggestions", []),
        ismp_alignments=result.get("ismp_alignments", []),
        accjc_references=result.get("accjc_references", []),
    )


@router.post("/chat", response_model=ChatResponse)
async def compliance_chat(
    request: ChatRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Compliance Copilot (Mission-Bot) RAG chat.
    Retrieves information from ACCJC standards and ISMP documents.
    """
    result = await gemini_service.chat(
        message=request.message,
        conversation_history=request.conversation_history,
    )
    return ChatResponse(
        response=result.get("response", ""),
        citations=result.get("citations", []),
        rag_enabled=result.get("rag_enabled", False),
    )


@router.post("/chat/stream")
async def compliance_chat_stream(
    request: ChatRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Streaming version of Compliance Copilot chat.

    Returns Server-Sent Events (SSE) stream of text chunks
    for real-time display in the frontend.

    Usage:
        const eventSource = new EventSource('/api/ai/chat/stream', {
            method: 'POST',
            body: JSON.stringify({ message: 'your question' })
        });
        eventSource.onmessage = (event) => {
            // Append event.data to response display
        };
    """
    async def generate():
        """Generate SSE events from chat stream."""
        try:
            async for chunk in gemini_service.chat_stream(
                message=request.message,
                conversation_history=request.conversation_history,
            ):
                # Format as SSE event
                yield f"data: {chunk}\n\n"
            # Send completion event
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.post("/socratic", response_model=SocraticResponse)
async def socratic_guidance(
    request: SocraticRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Socratic questioning mode for guided reflection.
    """
    result = await gemini_service.socratic_guidance(
        section_key=request.section_key,
        current_content=request.current_content,
        data_context=request.data_context,
    )
    return SocraticResponse(
        question=result.get("question", ""),
        follow_up_prompts=result.get("follow_up_prompts", []),
        suggested_data_exploration=result.get("suggested_data_exploration"),
    )


@router.get("/status")
async def ai_status():
    """
    Check AI service availability.
    Returns whether Gemini API is configured and available.
    """
    return {
        "gemini_available": gemini_service.is_available,
        "model": gemini_service.model_name if gemini_service.is_available else None,
        "rag_enabled": bool(gemini_service.file_search_store),
        "file_search_store": gemini_service.file_search_store if gemini_service.is_available else None,
        "features": {
            "analyze_trends": True,
            "expand_narrative": True,
            "equity_check": True,
            "chat": True,
            "chat_streaming": True,
            "socratic": True,
            "rag_file_search": bool(gemini_service.file_search_store),
        },
    }


# ========== Admin Endpoints for Usage Statistics ==========


@router.get("/usage/quota")
async def get_my_quota(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get the current user's remaining AI request quota.
    """
    quota = await rate_limiter.get_user_remaining_quota(session, current_user)
    return {
        "user_id": str(current_user.id),
        "role": current_user.role.value,
        "quota": quota,
    }


@router.get("/usage/stats")
async def get_usage_stats(
    user_id: Optional[UUID] = Query(None, description="Filter by user ID (admin only)"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI usage statistics.

    - Regular users can only see their own stats
    - Admins can see all users or filter by user_id
    """
    # Non-admins can only see their own stats
    if current_user.role != UserRole.ADMIN:
        user_id = current_user.id

    # Default to last 30 days if no date range specified
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    stats = await rate_limiter.get_usage_stats(
        session=session,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
    )

    return {
        "filter": {
            "user_id": str(user_id) if user_id else "all",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "stats": stats,
    }


@router.get("/usage/admin/summary")
async def get_admin_usage_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Admin-only endpoint for overall AI usage summary.

    Returns aggregate statistics across all users.
    """
    # Get stats for different time periods
    now = datetime.utcnow()

    today_stats = await rate_limiter.get_usage_stats(
        session=session,
        start_date=now - timedelta(days=1),
        end_date=now,
    )

    week_stats = await rate_limiter.get_usage_stats(
        session=session,
        start_date=now - timedelta(days=7),
        end_date=now,
    )

    month_stats = await rate_limiter.get_usage_stats(
        session=session,
        start_date=now - timedelta(days=30),
        end_date=now,
    )

    return {
        "generated_at": now.isoformat(),
        "periods": {
            "last_24_hours": today_stats,
            "last_7_days": week_stats,
            "last_30_days": month_stats,
        },
    }


# ========== Cache Management Endpoints ==========


@router.get("/cache/stats")
async def get_cache_stats(
    current_user: User = Depends(get_current_user),
):
    """
    Get AI response cache statistics.

    Available to all authenticated users to view cache performance.
    """
    stats = ai_cache.get_stats()
    return {
        "cache_stats": stats,
        "ttl_config": ai_cache.DEFAULT_TTLS,
    }


@router.post("/cache/cleanup")
async def cleanup_cache(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Admin-only: Clean up expired cache entries.

    This is also done automatically, but can be triggered manually.
    """
    removed_count = ai_cache.cleanup_expired()
    return {
        "message": f"Cleaned up {removed_count} expired cache entries",
        "removed_count": removed_count,
        "current_stats": ai_cache.get_stats(),
    }


@router.delete("/cache/clear")
async def clear_cache(
    endpoint: Optional[str] = Query(None, description="Specific endpoint to clear (or all if not specified)"),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Admin-only: Clear the AI response cache.

    Can clear all entries or entries for a specific endpoint.
    """
    if endpoint:
        removed_count = ai_cache.invalidate_by_endpoint(endpoint)
        message = f"Cleared {removed_count} cache entries for endpoint '{endpoint}'"
    else:
        removed_count = ai_cache.clear()
        message = f"Cleared all {removed_count} cache entries"

    return {
        "message": message,
        "removed_count": removed_count,
        "current_stats": ai_cache.get_stats(),
    }


@router.post("/cache/reset-stats")
async def reset_cache_stats(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Admin-only: Reset cache statistics counters.

    Does not clear cached entries, only resets hit/miss counters.
    """
    ai_cache.reset_stats()
    return {
        "message": "Cache statistics reset",
        "current_stats": ai_cache.get_stats(),
    }
