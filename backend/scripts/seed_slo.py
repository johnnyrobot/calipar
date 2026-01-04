"""
SLO Data Seed Script

Seeds sample CSLO and PSLO assessment data for demonstration and testing.

Usage:
    python scripts/seed_slo.py
"""

import sys
import random
from datetime import datetime
from uuid import uuid4
from typing import List, Optional
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, create_engine, select
from models.course import Course, SLOAssessment, PSLOAssessment
from models.organization import Organization, OrganizationType
from config import get_settings


# Sample SLO descriptions by discipline
CSLO_TEMPLATES = {
    "Mathematics": [
        "Apply mathematical concepts to solve real-world problems",
        "Use algebraic methods to analyze and solve equations",
        "Demonstrate proficiency in mathematical reasoning and proof",
        "Interpret and analyze graphical representations of functions",
    ],
    "English": [
        "Write clear, well-organized essays with thesis statements",
        "Analyze literary texts using appropriate critical frameworks",
        "Demonstrate mastery of grammar, syntax, and mechanics",
        "Conduct research and integrate sources effectively",
    ],
    "Psychology": [
        "Apply psychological theories to understand human behavior",
        "Analyze research methods used in psychological studies",
        "Evaluate the biological and environmental factors affecting behavior",
        "Demonstrate understanding of psychological disorders and treatments",
    ],
    "Biology": [
        "Explain fundamental biological concepts and processes",
        "Apply the scientific method to biological investigations",
        "Analyze the relationship between structure and function in living systems",
        "Evaluate the impact of human activities on ecosystems",
    ],
    "default": [
        "Demonstrate understanding of foundational concepts",
        "Apply critical thinking skills to analyze problems",
        "Communicate effectively in written and oral formats",
    ],
}

PSLO_TEMPLATES = {
    "Mathematics": [
        "Demonstrate mathematical reasoning skills applicable to transfer-level courses",
        "Apply quantitative analysis to solve problems in academic and professional contexts",
        "Communicate mathematical ideas clearly using appropriate notation and terminology",
    ],
    "English": [
        "Produce clear, effective written communication for academic and professional audiences",
        "Critically analyze and interpret diverse texts from multiple perspectives",
        "Demonstrate information literacy skills including research and source evaluation",
    ],
    "Psychology": [
        "Apply psychological principles to understand individual and group behavior",
        "Evaluate psychological research and its applications",
        "Demonstrate ethical awareness in the study and application of psychology",
    ],
    "default": [
        "Demonstrate mastery of program learning outcomes",
        "Apply knowledge and skills to real-world situations",
        "Communicate effectively within the discipline",
    ],
}


def get_cslo_descriptions(discipline: str) -> List[str]:
    """Get CSLO descriptions for a discipline."""
    return CSLO_TEMPLATES.get(discipline, CSLO_TEMPLATES["default"])


def get_pslo_descriptions(discipline: str) -> List[str]:
    """Get PSLO descriptions for a discipline."""
    return PSLO_TEMPLATES.get(discipline, PSLO_TEMPLATES["default"])


def generate_assessment_data(target: float = 70.0) -> dict:
    """Generate realistic assessment data."""
    # Generate realistic numbers
    students_assessed = random.randint(50, 300)

    # Achievement percentage varies around the target
    # Some above, some below
    achievement = target + random.uniform(-15, 20)
    achievement = max(40, min(95, achievement))  # Clamp between 40-95%

    students_meeting = int(students_assessed * (achievement / 100))
    meets_target = achievement >= target

    return {
        "students_assessed": students_assessed,
        "students_meeting_criteria": students_meeting,
        "achievement_percentage": round(achievement, 1),
        "target_percentage": target,
        "meets_target": meets_target,
    }


def seed_cslo_assessments(session: Session) -> int:
    """Seed CSLO assessments for existing courses."""
    # Get sample courses (limit for demo)
    courses = session.exec(
        select(Course).where(Course.is_active == True).limit(50)
    ).all()

    if not courses:
        print("No courses found. Run seed_courses.py first.")
        return 0

    terms = ["Fall 2023", "Spring 2024", "Fall 2024"]
    created_count = 0

    for course in courses:
        # Skip if course already has assessments
        existing = session.exec(
            select(SLOAssessment).where(SLOAssessment.course_id == course.id)
        ).first()
        if existing:
            continue

        # Get SLO descriptions for this discipline
        slo_descriptions = get_cslo_descriptions(course.discipline)

        # Create assessments for the most recent term
        term = random.choice(terms)
        academic_year = "2023-2024" if "2023" in term or (term == "Spring 2024") else "2024-2025"

        for i, description in enumerate(slo_descriptions[:3], 1):  # Max 3 SLOs
            data = generate_assessment_data()

            assessment = SLOAssessment(
                id=uuid4(),
                course_id=course.id,
                term=term,
                academic_year=academic_year,
                slo_number=i,
                slo_description=description,
                students_assessed=data["students_assessed"],
                students_meeting_criteria=data["students_meeting_criteria"],
                achievement_percentage=data["achievement_percentage"],
                target_percentage=data["target_percentage"],
                meets_target=data["meets_target"],
                action_taken="Continue current teaching strategies" if data["meets_target"] else "Implement additional support interventions",
                created_at=datetime.utcnow(),
            )
            session.add(assessment)
            created_count += 1

    session.commit()
    return created_count


def seed_pslo_assessments(session: Session) -> int:
    """Seed PSLO assessments for programs."""
    # Get departments (programs)
    departments = session.exec(
        select(Organization).where(Organization.type == OrganizationType.DEPARTMENT)
    ).all()

    if not departments:
        print("No departments found. Run seed.py first to create organizations.")
        return 0

    # Sample program data
    award_types = ["AA-T", "AS-T", "AA", "AS", "Certificate"]
    terms = ["Fall 2023", "Spring 2024", "Fall 2024"]
    created_count = 0

    for dept in departments[:20]:  # Limit for demo
        # Skip if already has assessments
        existing = session.exec(
            select(PSLOAssessment).where(PSLOAssessment.program_id == dept.id)
        ).first()
        if existing:
            continue

        # Determine discipline from department name
        discipline = "default"
        dept_lower = dept.name.lower()
        if "math" in dept_lower:
            discipline = "Mathematics"
        elif "english" in dept_lower:
            discipline = "English"
        elif "psych" in dept_lower:
            discipline = "Psychology"
        elif "bio" in dept_lower:
            discipline = "Biology"

        pslo_descriptions = get_pslo_descriptions(discipline)

        # Create program name
        award = random.choice(award_types)
        program_name = f"{dept.name} {award}"

        # Create assessments
        term = random.choice(terms)
        academic_year = "2023-2024" if "2023" in term or (term == "Spring 2024") else "2024-2025"

        # Get courses in this discipline for mapping
        courses = session.exec(
            select(Course).where(Course.discipline == dept.name).limit(5)
        ).all()
        mapped_course_ids = ",".join([c.course_id for c in courses]) if courses else None

        for i, description in enumerate(pslo_descriptions, 1):
            data = generate_assessment_data()

            assessment = PSLOAssessment(
                id=uuid4(),
                program_id=dept.id,
                program_name=program_name,
                award_type=award,
                term=term,
                academic_year=academic_year,
                pslo_number=i,
                pslo_description=description,
                students_assessed=data["students_assessed"],
                students_meeting_criteria=data["students_meeting_criteria"],
                achievement_percentage=data["achievement_percentage"],
                target_percentage=data["target_percentage"],
                meets_target=data["meets_target"],
                mapped_courses=mapped_course_ids,
                action_taken="Program outcomes are being met effectively" if data["meets_target"] else "Review curriculum mapping and assessment methods",
                created_at=datetime.utcnow(),
            )
            session.add(assessment)
            created_count += 1

    session.commit()
    return created_count


def main():
    """Main entry point."""
    settings = get_settings()

    print("=" * 60)
    print("CALIPAR SLO Data Seed Script")
    print("=" * 60)
    print(f"Database: {settings.database_url[:50]}...")
    print()

    # Create engine
    engine = create_engine(settings.database_url)

    with Session(engine) as session:
        # Seed CSLO assessments
        print("Seeding CSLO assessments...")
        cslo_count = seed_cslo_assessments(session)
        print(f"  Created {cslo_count} CSLO assessment records")

        # Seed PSLO assessments
        print("Seeding PSLO assessments...")
        pslo_count = seed_pslo_assessments(session)
        print(f"  Created {pslo_count} PSLO assessment records")

    print()
    print(f"Done! Total SLO records: {cslo_count + pslo_count}")


if __name__ == "__main__":
    main()
