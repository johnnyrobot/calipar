"""
Data endpoints for enrollment, success, SLO, and course data.
"""

from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models.enrollment import EnrollmentSnapshot
from models.course import Course, SLOAssessment, GEPattern
from models.user import User
from routers.auth import get_current_user

router = APIRouter()


class TermInfo(BaseModel):
    """Term information."""
    term: str
    snapshot_date: str


class EnrollmentData(BaseModel):
    """Enrollment data response."""
    term: str
    total_enrollment: int
    sections: int
    fill_rate: float
    by_mode: dict
    by_term_length: dict


class EnrollmentComparison(BaseModel):
    """Year-over-year comparison."""
    term1: EnrollmentData
    term2: EnrollmentData
    changes: dict


class SuccessData(BaseModel):
    """Success and retention data."""
    discipline: str
    success_rate: float
    retention_rate: float
    by_demographics: dict


class CSLOData(BaseModel):
    """Course SLO data."""
    course: str
    cslos: List[dict]
    achievement_rate: float
    by_outcome: List[dict]


@router.get("/terms", response_model=List[TermInfo])
async def get_available_terms(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get list of available terms with enrollment data."""
    snapshots = session.exec(
        select(EnrollmentSnapshot).order_by(EnrollmentSnapshot.snapshot_date.desc())
    ).all()

    return [
        TermInfo(
            term=s.term,
            snapshot_date=s.snapshot_date.isoformat() if s.snapshot_date else "",
        )
        for s in snapshots
    ]


@router.get("/enrollment", response_model=EnrollmentData)
async def get_enrollment(
    term: str = Query(..., description="Term, e.g., 'Fall 2024'"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get enrollment data for a specific term."""
    # Query actual enrollment data from database
    snapshot = session.exec(
        select(EnrollmentSnapshot).where(EnrollmentSnapshot.term == term)
    ).first()

    if snapshot and snapshot.data:
        data = snapshot.data
        return EnrollmentData(
            term=term,
            total_enrollment=data.get("total_enrollment", 0),
            sections=data.get("sections", 0),
            fill_rate=data.get("fill_rate", 0) / 100,  # Convert percentage to decimal
            by_mode=data.get("by_mode", {}),
            by_term_length=data.get("by_term_length", {}),
        )

    # Fallback to mock data if no database record found
    return EnrollmentData(
        term=term,
        total_enrollment=12500,
        sections=850,
        fill_rate=0.72,
        by_mode={
            "in_person": 4500,
            "hybrid": 2800,
            "hyflex": 1200,
            "online": 4000,
        },
        by_term_length={
            "full_term": 8500,
            "session_a": 1800,
            "session_b": 1500,
            "short_term": 700,
        },
    )


def _get_enrollment_data_for_term(session: Session, term: str) -> EnrollmentData:
    """Helper function to get enrollment data for a term."""
    snapshot = session.exec(
        select(EnrollmentSnapshot).where(EnrollmentSnapshot.term == term)
    ).first()

    if snapshot and snapshot.data:
        data = snapshot.data
        return EnrollmentData(
            term=term,
            total_enrollment=data.get("total_enrollment", 0),
            sections=data.get("sections", 0),
            fill_rate=data.get("fill_rate", 0) / 100,
            by_mode=data.get("by_mode", {}),
            by_term_length=data.get("by_term_length", {}),
        )

    # Fallback mock data
    return EnrollmentData(
        term=term,
        total_enrollment=12500,
        sections=850,
        fill_rate=0.72,
        by_mode={"in_person": 4500, "hybrid": 2800, "hyflex": 1200, "online": 4000},
        by_term_length={"full_term": 8500, "session_a": 1800, "session_b": 1500, "short_term": 700},
    )


@router.get("/enrollment/compare", response_model=EnrollmentComparison)
async def compare_enrollment(
    term1: str = Query(..., description="First term for comparison"),
    term2: str = Query(..., description="Second term for comparison"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Compare enrollment between two terms."""
    # Query actual data from database
    term1_data = _get_enrollment_data_for_term(session, term1)
    term2_data = _get_enrollment_data_for_term(session, term2)

    # Calculate changes
    enrollment_change = term2_data.total_enrollment - term1_data.total_enrollment
    enrollment_change_pct = (
        (enrollment_change / term1_data.total_enrollment * 100)
        if term1_data.total_enrollment > 0
        else 0
    )
    fill_rate_change = term2_data.fill_rate - term1_data.fill_rate

    return EnrollmentComparison(
        term1=term1_data,
        term2=term2_data,
        changes={
            "enrollment_change": enrollment_change,
            "enrollment_change_pct": round(enrollment_change_pct, 1),
            "fill_rate_change": round(fill_rate_change, 3),
        },
    )


@router.get("/success", response_model=SuccessData)
async def get_success_data(
    discipline: str = Query(..., description="Discipline code"),
    term: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get success and retention data by discipline."""
    # TODO: Query actual data
    return SuccessData(
        discipline=discipline,
        success_rate=0.68,
        retention_rate=0.82,
        by_demographics={
            "hispanic": {"success_rate": 0.67, "retention_rate": 0.81},
            "african_american": {"success_rate": 0.62, "retention_rate": 0.78},
            "white": {"success_rate": 0.72, "retention_rate": 0.85},
            "asian": {"success_rate": 0.75, "retention_rate": 0.88},
        },
    )


@router.get("/cslo", response_model=CSLOData)
async def get_cslo_data(
    course: str = Query(..., description="Course code, e.g., 'MATH 125'"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get CSLO assessment data for a course."""
    # Query actual SLO data from database
    course_record = session.exec(
        select(Course).where(Course.course_id == course)
    ).first()

    if course_record:
        # Get SLO assessments for this course
        assessments = session.exec(
            select(SLOAssessment)
            .where(SLOAssessment.course_id == course_record.id)
            .order_by(SLOAssessment.slo_number)
        ).all()

        if assessments:
            # Calculate overall achievement rate
            total_students = sum(a.students_assessed for a in assessments)
            total_meeting = sum(a.students_meeting_criteria for a in assessments)
            overall_rate = total_meeting / total_students if total_students > 0 else 0

            return CSLOData(
                course=course,
                cslos=[
                    {"id": f"CSLO{a.slo_number}", "description": a.slo_description or ""}
                    for a in assessments
                ],
                achievement_rate=overall_rate,
                by_outcome=[
                    {
                        "cslo": f"CSLO{a.slo_number}",
                        "achievement_rate": a.achievement_percentage / 100,
                        "n_assessed": a.students_assessed,
                    }
                    for a in assessments
                ],
            )

    # Fallback to mock data if no database record found
    return CSLOData(
        course=course,
        cslos=[
            {"id": "CSLO1", "description": "Apply mathematical concepts"},
            {"id": "CSLO2", "description": "Solve problems using algebra"},
            {"id": "CSLO3", "description": "Communicate mathematical reasoning"},
        ],
        achievement_rate=0.72,
        by_outcome=[
            {"cslo": "CSLO1", "achievement_rate": 0.75, "n_assessed": 450},
            {"cslo": "CSLO2", "achievement_rate": 0.68, "n_assessed": 450},
            {"cslo": "CSLO3", "achievement_rate": 0.73, "n_assessed": 420},
        ],
    )


# =============================================================================
# Course Data Endpoints
# =============================================================================

class CourseInfo(BaseModel):
    """Course information response model."""
    id: str
    course_id: str
    subject: str
    number: str
    title: str
    discipline: str
    min_units: float
    max_units: float
    ge_pattern: Optional[str]
    ge_area: Optional[str]
    is_ge_approved: bool
    is_csu_transferable: bool
    is_uc_transferable: bool
    is_active: bool


class CourseListResponse(BaseModel):
    """List of courses response."""
    courses: List[CourseInfo]
    total: int
    page: int
    page_size: int


class DisciplineInfo(BaseModel):
    """Discipline summary information."""
    discipline: str
    course_count: int


@router.get("/courses", response_model=CourseListResponse)
async def list_courses(
    discipline: Optional[str] = Query(None, description="Filter by discipline"),
    subject: Optional[str] = Query(None, description="Filter by subject code"),
    ge_approved: Optional[bool] = Query(None, description="Filter by GE approval status"),
    search: Optional[str] = Query(None, description="Search course title or ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    List courses with optional filtering and pagination.
    """
    # Build query
    query = select(Course).where(Course.is_active == True)

    if discipline:
        query = query.where(Course.discipline == discipline)

    if subject:
        query = query.where(Course.subject == subject)

    if ge_approved is not None:
        query = query.where(Course.is_ge_approved == ge_approved)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (Course.course_id.ilike(search_term)) |
            (Course.title.ilike(search_term))
        )

    # Get total count
    count_query = select(Course).where(Course.is_active == True)
    if discipline:
        count_query = count_query.where(Course.discipline == discipline)
    if subject:
        count_query = count_query.where(Course.subject == subject)
    if ge_approved is not None:
        count_query = count_query.where(Course.is_ge_approved == ge_approved)
    if search:
        search_term = f"%{search}%"
        count_query = count_query.where(
            (Course.course_id.ilike(search_term)) |
            (Course.title.ilike(search_term))
        )

    total = len(session.exec(count_query).all())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Course.course_id).offset(offset).limit(page_size)

    courses = session.exec(query).all()

    return CourseListResponse(
        courses=[
            CourseInfo(
                id=str(c.id),
                course_id=c.course_id,
                subject=c.subject,
                number=c.number,
                title=c.title,
                discipline=c.discipline,
                min_units=c.min_units,
                max_units=c.max_units,
                ge_pattern=c.ge_pattern.value if c.ge_pattern else None,
                ge_area=c.ge_area,
                is_ge_approved=c.is_ge_approved,
                is_csu_transferable=c.is_csu_transferable,
                is_uc_transferable=c.is_uc_transferable,
                is_active=c.is_active,
            )
            for c in courses
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/courses/{course_id}", response_model=CourseInfo)
async def get_course(
    course_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get a single course by its course_id (e.g., 'MATH 101').
    """
    course = session.exec(
        select(Course).where(Course.course_id == course_id)
    ).first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return CourseInfo(
        id=str(course.id),
        course_id=course.course_id,
        subject=course.subject,
        number=course.number,
        title=course.title,
        discipline=course.discipline,
        min_units=course.min_units,
        max_units=course.max_units,
        ge_pattern=course.ge_pattern.value if course.ge_pattern else None,
        ge_area=course.ge_area,
        is_ge_approved=course.is_ge_approved,
        is_csu_transferable=course.is_csu_transferable,
        is_uc_transferable=course.is_uc_transferable,
        is_active=course.is_active,
    )


@router.get("/disciplines", response_model=List[DisciplineInfo])
async def list_disciplines(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of all disciplines with course counts.
    """
    courses = session.exec(
        select(Course).where(Course.is_active == True)
    ).all()

    # Group by discipline
    discipline_counts: dict = {}
    for course in courses:
        if course.discipline not in discipline_counts:
            discipline_counts[course.discipline] = 0
        discipline_counts[course.discipline] += 1

    # Sort by discipline name
    result = [
        DisciplineInfo(discipline=disc, course_count=count)
        for disc, count in sorted(discipline_counts.items())
    ]

    return result


@router.get("/subjects", response_model=List[str])
async def list_subjects(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of all unique course subject codes.
    """
    courses = session.exec(
        select(Course).where(Course.is_active == True)
    ).all()

    # Get unique subjects
    subjects = sorted(set(c.subject for c in courses))

    return subjects
