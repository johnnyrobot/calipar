"""
Course model for curriculum data.
Stores course information from the course master and GE requirements.
"""

from datetime import datetime, date
from enum import Enum
from typing import Optional, List
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship


class GEPattern(str, Enum):
    """General Education pattern types."""
    IGETC = "IGETC"
    CSU_GE = "CSU-GE"
    CAL_GETC = "Cal-GETC"
    LOCAL_GE = "Local-GE"
    NONE = "None"


class Course(SQLModel, table=True):
    """
    Course model for community college curriculum.

    Stores course metadata including:
    - Basic course info (subject, number, title, units)
    - GE designations
    - Curriculum currency (last approval date)
    - Discipline/department association
    """

    __tablename__ = "courses"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Course identification
    subject: str = Field(index=True, description="Course subject code, e.g., 'MATH', 'ENGLISH'")
    number: str = Field(description="Course number, e.g., '101', '001'")
    course_id: str = Field(index=True, unique=True, description="Combined subject + number, e.g., 'MATH 101'")

    # Course details
    title: str = Field(description="Full course title")
    description: Optional[str] = Field(default=None, description="Course description")

    # Units
    min_units: float = Field(default=0.0, description="Minimum units")
    max_units: float = Field(default=0.0, description="Maximum units")

    # Discipline/Department
    discipline: str = Field(index=True, description="Academic discipline, e.g., 'Mathematics', 'English'")
    department_id: Optional[UUID] = Field(default=None, foreign_key="organizations.id")

    # GE Designations
    ge_pattern: GEPattern = Field(default=GEPattern.NONE, description="Primary GE pattern")
    ge_area: Optional[str] = Field(default=None, description="GE area, e.g., 'A1', 'B4'")
    ge_sub_area: Optional[str] = Field(default=None, description="GE sub-area if applicable")
    is_ge_approved: bool = Field(default=False, description="Whether course is GE approved")

    # CSU/UC Transferability
    is_csu_transferable: bool = Field(default=False)
    is_uc_transferable: bool = Field(default=False)
    c_id_number: Optional[str] = Field(default=None, description="C-ID articulation number")

    # Curriculum Currency (for accreditation tracking)
    last_approved_date: Optional[date] = Field(default=None, description="Date of last curriculum approval")
    next_review_date: Optional[date] = Field(default=None, description="Date for next curriculum review")
    is_active: bool = Field(default=True, description="Whether course is currently offered")

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    department: Optional["Organization"] = Relationship()
    slo_assessments: List["SLOAssessment"] = Relationship(back_populates="course")


class SLOAssessment(SQLModel, table=True):
    """
    Course Student Learning Outcome (CSLO) assessment results.

    Tracks CSLO achievement data for individual courses.
    """

    __tablename__ = "slo_assessments"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Link to course
    course_id: UUID = Field(foreign_key="courses.id", index=True)

    # Assessment period
    term: str = Field(description="Academic term, e.g., 'Fall 2024'")
    academic_year: str = Field(description="Academic year, e.g., '2024-2025'")

    # SLO details
    slo_number: int = Field(description="SLO number (1, 2, 3, etc.)")
    slo_description: Optional[str] = Field(default=None, description="SLO text")

    # Assessment results
    students_assessed: int = Field(default=0, description="Number of students assessed")
    students_meeting_criteria: int = Field(default=0, description="Number meeting success criteria")
    achievement_percentage: float = Field(default=0.0, description="Percentage of students meeting SLO")
    target_percentage: float = Field(default=70.0, description="Target achievement percentage")

    # Status
    meets_target: bool = Field(default=False, description="Whether achievement meets target")

    # Action taken based on results
    action_taken: Optional[str] = Field(default=None, description="Actions taken based on assessment")

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    course: Optional["Course"] = Relationship(back_populates="slo_assessments")


class PSLOAssessment(SQLModel, table=True):
    """
    Program Student Learning Outcome (PSLO) assessment results.

    Tracks PSLO achievement data for academic programs/departments.
    Links to organizations (departments) rather than individual courses.
    """

    __tablename__ = "pslo_assessments"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Link to program/department
    program_id: UUID = Field(foreign_key="organizations.id", index=True)

    # Program identification
    program_name: str = Field(description="Program name, e.g., 'Mathematics AA-T'")
    award_type: Optional[str] = Field(default=None, description="Award type: AA, AS, AA-T, AS-T, Certificate")

    # Assessment period
    term: str = Field(description="Academic term, e.g., 'Fall 2024'")
    academic_year: str = Field(description="Academic year, e.g., '2024-2025'")

    # PSLO details
    pslo_number: int = Field(description="PSLO number (1, 2, 3, etc.)")
    pslo_description: Optional[str] = Field(default=None, description="PSLO text")

    # Assessment results
    students_assessed: int = Field(default=0, description="Number of students assessed")
    students_meeting_criteria: int = Field(default=0, description="Number meeting success criteria")
    achievement_percentage: float = Field(default=0.0, description="Percentage of students meeting PSLO")
    target_percentage: float = Field(default=70.0, description="Target achievement percentage")

    # Status
    meets_target: bool = Field(default=False, description="Whether achievement meets target")

    # Mapping to courses that support this PSLO
    mapped_courses: Optional[str] = Field(default=None, description="Comma-separated course IDs that map to this PSLO")

    # Action taken based on results
    action_taken: Optional[str] = Field(default=None, description="Actions taken based on assessment")

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    program: Optional["Organization"] = Relationship()


# Import at bottom to avoid circular imports
from models.organization import Organization
