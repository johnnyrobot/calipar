"""
Course Data Seed Script

Parses course data from the California Community College PPM Export CSV file
and seeds the courses table in the database.

Usage:
    python scripts/seed_courses.py

Data source:
    reference_data/la_mission_PPM_Published_Map_Export_2025-2026_10-15-2025.csv
"""

import csv
import os
import sys
import re
from datetime import datetime
from uuid import uuid4
from typing import Dict, Set, Optional, Tuple
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, create_engine, select
from models.course import Course, GEPattern
from config import get_settings


# Path to reference data (relative to project root)
CSV_PATH = Path(__file__).parent.parent.parent.parent / "reference_data" / "la_mission_PPM_Published_Map_Export_2025-2026_10-15-2025.csv"


def parse_course_id(course_str: str) -> Tuple[str, str]:
    """
    Parse course subject and number from combined string.

    Examples:
        'MATH 101' -> ('MATH', '101')
        'ENGLISH 101X' -> ('ENGLISH', '101X')
        'CH DEV 001' -> ('CH DEV', '001')
        'ADM JUS 001' -> ('ADM JUS', '001')
    """
    if not course_str:
        return ('', '')

    # Match pattern: subject (letters/spaces) followed by number (alphanumeric)
    # Handle multi-word subjects like "ADM JUS", "CH DEV", "POL SCI"
    match = re.match(r'^([A-Z][A-Z\s]+?)\s+(\d+[A-Z]*)$', course_str.strip())
    if match:
        return (match.group(1).strip(), match.group(2))

    # Fallback: split on last space
    parts = course_str.strip().rsplit(' ', 1)
    if len(parts) == 2:
        return (parts[0], parts[1])

    return (course_str, '')


def map_discipline(subject: str) -> str:
    """
    Map course subject code to discipline name.
    """
    discipline_map = {
        'ACCTG': 'Accounting',
        'ADM JUS': 'Administration of Justice',
        'AFRO AM': 'African American Studies',
        'ANTHRO': 'Anthropology',
        'ART': 'Art',
        'ARTHIST': 'Art History',
        'BIOLOGY': 'Biological Sciences',
        'BUS': 'Business',
        'CHEM': 'Chemistry',
        'CH DEV': 'Child Development',
        'CHICANO': 'Chicano Studies',
        'COMM': 'Communication Studies',
        'COMPUTER': 'Computer Science & IT',
        'CIS': 'Computer Science & IT',
        'CS': 'Computer Science & IT',
        'COSMET': 'Cosmetology',
        'COUNSEL': 'Counseling',
        'ECON': 'Economics',
        'ENGLISH': 'English',
        'ESL': 'English as a Second Language',
        'FAM CS': 'Family & Consumer Studies',
        'FRENCH': 'French',
        'GEOG': 'Geography',
        'GEOLOGY': 'Geology',
        'HEALTH': 'Health Sciences',
        'HISTORY': 'History',
        'HUMAN': 'Humanities',
        'JOURNAL': 'Journalism',
        'KIN': 'Kinesiology',
        'KINES': 'Kinesiology',
        'LAW': 'Law',
        'LIB SCI': 'Library Science',
        'LING': 'Linguistics',
        'MATH': 'Mathematics',
        'MUSIC': 'Music',
        'NURSING': 'Nursing',
        'PHILOS': 'Philosophy',
        'PHOTO': 'Photography',
        'PHYSICS': 'Physics',
        'POL SCI': 'Political Science',
        'POLS': 'Political Science',
        'PSYCH': 'Psychology',
        'PSYC': 'Psychology',
        'SOC': 'Sociology',
        'SPANISH': 'Spanish',
        'THEATER': 'Theater Arts',
        'THTR': 'Theater Arts',
    }

    # Try exact match first
    if subject in discipline_map:
        return discipline_map[subject]

    # Try prefix match
    for prefix, discipline in discipline_map.items():
        if subject.startswith(prefix):
            return discipline

    # Default: capitalize subject
    return subject.title()


def map_ge_pattern(ge_area: str) -> GEPattern:
    """
    Map GE area string to GEPattern enum.
    """
    if not ge_area:
        return GEPattern.NONE

    ge_lower = ge_area.lower()

    if 'cal-getc' in ge_lower or 'calgetc' in ge_lower:
        return GEPattern.CAL_GETC
    elif 'csu' in ge_lower:
        return GEPattern.CSU_GE
    elif 'igetc' in ge_lower:
        return GEPattern.IGETC
    elif ge_area.strip():
        return GEPattern.LOCAL_GE

    return GEPattern.NONE


def load_courses_from_csv(filepath: Path) -> Dict[str, Dict]:
    """
    Load and deduplicate courses from CSV file.

    Returns:
        Dict mapping course_id -> course data dict
    """
    courses: Dict[str, Dict] = {}

    print(f"Loading courses from: {filepath}")

    if not filepath.exists():
        print(f"ERROR: File not found: {filepath}")
        return courses

    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            course_str = row.get('Course Subject and Number', '').strip()
            if not course_str:
                continue

            # Parse subject and number
            subject, number = parse_course_id(course_str)
            if not subject or not number:
                continue

            course_id = f"{subject} {number}"

            # Skip if already processed (deduplicate)
            if course_id in courses:
                # Update GE info if this row has it
                ge_area = row.get('Gen Ed Pattern Sub Area', '').strip()
                if ge_area and not courses[course_id].get('ge_area'):
                    courses[course_id]['ge_area'] = ge_area
                    courses[course_id]['ge_pattern'] = map_ge_pattern(ge_area)
                    courses[course_id]['is_ge_approved'] = True
                continue

            # Extract course data
            title = row.get('Course Name', '').strip()
            min_units = float(row.get('Course Min Units', 0) or 0)
            max_units = float(row.get('Course Max Units', 0) or 0)
            ge_area = row.get('Gen Ed Pattern Sub Area', '').strip()

            courses[course_id] = {
                'subject': subject,
                'number': number,
                'course_id': course_id,
                'title': title,
                'discipline': map_discipline(subject),
                'min_units': min_units,
                'max_units': max_units,
                'ge_pattern': map_ge_pattern(ge_area),
                'ge_area': ge_area if ge_area else None,
                'is_ge_approved': bool(ge_area),
                'is_active': True,
            }

    print(f"Loaded {len(courses)} unique courses from CSV")
    return courses


def seed_courses(engine) -> int:
    """
    Seed courses into the database.

    Returns:
        Number of courses created
    """
    courses_data = load_courses_from_csv(CSV_PATH)

    if not courses_data:
        print("No courses to seed")
        return 0

    created_count = 0
    updated_count = 0

    with Session(engine) as session:
        for course_id, data in courses_data.items():
            # Check if course already exists
            existing = session.exec(
                select(Course).where(Course.course_id == course_id)
            ).first()

            if existing:
                # Update existing course
                for key, value in data.items():
                    if hasattr(existing, key) and value is not None:
                        setattr(existing, key, value)
                existing.updated_at = datetime.utcnow()
                updated_count += 1
            else:
                # Create new course
                course = Course(
                    id=uuid4(),
                    subject=data['subject'],
                    number=data['number'],
                    course_id=data['course_id'],
                    title=data['title'],
                    discipline=data['discipline'],
                    min_units=data['min_units'],
                    max_units=data['max_units'],
                    ge_pattern=data['ge_pattern'],
                    ge_area=data['ge_area'],
                    is_ge_approved=data['is_ge_approved'],
                    is_active=data['is_active'],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                session.add(course)
                created_count += 1

        session.commit()

    print(f"Courses seeded: {created_count} created, {updated_count} updated")
    return created_count


def main():
    """Main entry point."""
    settings = get_settings()

    print("=" * 60)
    print("CALIPAR Course Data Seed Script")
    print("=" * 60)
    print(f"Database: {settings.database_url[:50]}...")
    print()

    # Create engine
    engine = create_engine(settings.database_url)

    # Seed courses
    count = seed_courses(engine)

    print()
    print(f"Done! Total courses in database: {count}")


if __name__ == "__main__":
    main()
