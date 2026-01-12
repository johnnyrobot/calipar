"""
Seed script for initial data.
Run with: python seed.py
"""

from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4
from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models.user import User, UserRole
from models.organization import Organization, OrganizationType
from models.strategic_initiative import StrategicInitiative
from models.enrollment import EnrollmentSnapshot
from models.program_review import ProgramReview, ReviewSection, ReviewStatus, ReviewType, SectionStatus
from models.action_plan import ActionPlan, ActionPlanMapping, ActionPlanStatus
from models.resource_request import ResourceRequest


def seed_organizations(session: Session):
    """Seed organizational hierarchy."""
    # Check if already seeded
    existing = session.exec(select(Organization)).first()
    if existing:
        print("Organizations already seeded, skipping...")
        return

    # Create college
    college = Organization(
        id=uuid4(),
        name="Community College",
        type=OrganizationType.COLLEGE,
    )
    session.add(college)
    session.commit()
    session.refresh(college)

    # Create divisions
    divisions = [
        ("Academic Affairs", college.id),
        ("Student Services", college.id),
        ("Administrative Services", college.id),
    ]

    div_map = {}
    for name, parent_id in divisions:
        div = Organization(
            id=uuid4(),
            name=name,
            type=OrganizationType.DIVISION,
            parent_id=parent_id,
        )
        session.add(div)
        div_map[name] = div

    session.commit()

    # Create departments
    departments = [
        ("Mathematics", "Academic Affairs"),
        ("English", "Academic Affairs"),
        ("Biology", "Academic Affairs"),
        ("Computer Science & IT", "Academic Affairs"),
        ("Business", "Academic Affairs"),
        ("Nursing", "Academic Affairs"),
        ("Counseling", "Student Services"),
        ("Financial Aid", "Student Services"),
        ("Admissions & Records", "Student Services"),
    ]

    for name, div_name in departments:
        dept = Organization(
            id=uuid4(),
            name=name,
            type=OrganizationType.DEPARTMENT,
            parent_id=div_map[div_name].id,
        )
        session.add(dept)

    session.commit()
    print(f"Created {len(divisions)} divisions and {len(departments)} departments")


def seed_users(session: Session):
    """Seed demo users."""
    existing = session.exec(select(User)).first()
    if existing:
        print("Users already seeded, skipping...")
        return

    # Get math department
    math_dept = session.exec(
        select(Organization).where(Organization.name == "Mathematics")
    ).first()

    users = [
        {
            "firebase_uid": "demo-faculty-001",
            "email": "faculty@ccc.edu",
            "full_name": "Maria Garcia",
            "role": UserRole.FACULTY,
            "department_id": math_dept.id if math_dept else None,
        },
        {
            "firebase_uid": "demo-chair-001",
            "email": "chair@ccc.edu",
            "full_name": "David Chen",
            "role": UserRole.CHAIR,
            "department_id": math_dept.id if math_dept else None,
        },
        {
            "firebase_uid": "demo-dean-001",
            "email": "dean@ccc.edu",
            "full_name": "Sarah Johnson",
            "role": UserRole.DEAN,
        },
        {
            "firebase_uid": "demo-admin-001",
            "email": "admin@ccc.edu",
            "full_name": "Michael Williams",
            "role": UserRole.ADMIN,
        },
        {
            "firebase_uid": "demo-proc-001",
            "email": "proc@ccc.edu",
            "full_name": "Jennifer Lee",
            "role": UserRole.PROC,
        },
    ]

    for user_data in users:
        user = User(**user_data)
        session.add(user)

    session.commit()
    print(f"Created {len(users)} demo users")


def seed_strategic_initiatives(session: Session):
    """Seed ISMP Strategic Goals and Objectives."""
    existing = session.exec(select(StrategicInitiative)).first()
    if existing:
        print("Strategic initiatives already seeded, skipping...")
        return

    initiatives = [
        # Goal 1: Expand Access
        {
            "goal_number": 1,
            "code": "1",
            "title": "Expand Access",
            "description": "Expand access to educational programs and services.",
        },
        {
            "goal_number": 1,
            "code": "1.1",
            "title": "Increase Community Awareness",
            "description": "Increase awareness of CCC in the community.",
        },
        {
            "goal_number": 1,
            "code": "1.2",
            "title": "Improve Accessibility",
            "description": "Improve accessibility to classes and services.",
        },
        {
            "goal_number": 1,
            "code": "1.3",
            "title": "Expand CTE Enrollment",
            "description": "Expand enrollment in Career and Technical Education.",
        },
        {
            "goal_number": 1,
            "code": "1.4",
            "title": "Community Partnerships",
            "description": "Expand community-based outreach and partnerships.",
        },
        # Goal 2: Student-Centered Institution
        {
            "goal_number": 2,
            "code": "2",
            "title": "Student-Centered Institution",
            "description": "Be a student-centered institution that supports students achieving their educational and career goals.",
        },
        {
            "goal_number": 2,
            "code": "2.1",
            "title": "Student Engagement",
            "description": "Increase student engagement.",
        },
        {
            "goal_number": 2,
            "code": "2.2",
            "title": "Support Services Use",
            "description": "Increase students' use of support services.",
        },
        {
            "goal_number": 2,
            "code": "2.3",
            "title": "Educational Pathways",
            "description": "Expand educational pathways and student success programs.",
        },
        {
            "goal_number": 2,
            "code": "2.4",
            "title": "Facilities & Technology",
            "description": "Continuously improve campus facilities and technology.",
        },
        # Goal 3: Student Success and Equity
        {
            "goal_number": 3,
            "code": "3",
            "title": "Student Success and Equity",
            "description": "Increase student success and equity.",
        },
        {
            "goal_number": 3,
            "code": "3.1",
            "title": "Success & Retention",
            "description": "Increase course success and retention rates.",
            "performance_measure": "Course completion rate",
            "baseline_value": "66.5%",
            "target_value": "67%",
        },
        {
            "goal_number": 3,
            "code": "3.2",
            "title": "Goal Achievement",
            "description": "Increase the number of students achieving their educational goals.",
        },
        {
            "goal_number": 3,
            "code": "3.3",
            "title": "Reduce Equity Gaps",
            "description": "Reduce equity gaps for disproportionately impacted students.",
        },
        {
            "goal_number": 3,
            "code": "3.4",
            "title": "SLO Assessment",
            "description": "Support student learning through SLO assessment.",
        },
        # Goal 4: Organizational Effectiveness
        {
            "goal_number": 4,
            "code": "4",
            "title": "Organizational Effectiveness",
            "description": "Enhance organizational effectiveness.",
        },
        {
            "goal_number": 4,
            "code": "4.1",
            "title": "Governance & Communication",
            "description": "Improve participatory governance and communication.",
        },
        {
            "goal_number": 4,
            "code": "4.2",
            "title": "Continuous Improvement",
            "description": "Continuously improve through assessment and evaluation.",
        },
        {
            "goal_number": 4,
            "code": "4.3",
            "title": "Professional Development",
            "description": "Invest in professional development for all employees.",
        },
        {
            "goal_number": 4,
            "code": "4.4",
            "title": "Campus Culture",
            "description": "Promote a diverse, inclusive, and equitable campus culture.",
        },
        # Goal 5: Financial Stability
        {
            "goal_number": 5,
            "code": "5",
            "title": "Financial Stability",
            "description": "Improve financial stability.",
        },
        {
            "goal_number": 5,
            "code": "5.1",
            "title": "Alternative Revenue",
            "description": "Develop alternative revenue streams.",
        },
        {
            "goal_number": 5,
            "code": "5.2",
            "title": "Resource Alignment",
            "description": "Align resource allocation with institutional priorities.",
        },
        {
            "goal_number": 5,
            "code": "5.3",
            "title": "Operational Efficiency",
            "description": "Increase operational efficiency.",
        },
    ]

    for init_data in initiatives:
        initiative = StrategicInitiative(**init_data)
        session.add(initiative)

    session.commit()
    print(f"Created {len(initiatives)} strategic initiatives")


def seed_enrollment_data(session: Session):
    """Seed enrollment snapshots with realistic CCC data."""
    existing = session.exec(select(EnrollmentSnapshot)).first()
    if existing:
        print("Enrollment data already seeded, skipping...")
        return

    # Realistic enrollment data based on CCC enrollment files
    enrollment_snapshots = [
        {
            "term": "Fall 2024",
            "snapshot_date": date(2024, 11, 13),
            "data": {
                "total_enrollment": 12450,
                "sections": 845,
                "seats": 15900,
                "fill_rate": 78.3,
                "by_mode": {
                    "in_person": 5200,
                    "hybrid": 2100,
                    "hyflex": 1150,
                    "online": 4000,
                },
                "by_term_length": {
                    "full_term": 8500,
                    "session_a": 1800,
                    "session_b": 1450,
                    "short_term": 700,
                },
                "credit_vs_noncredit": {
                    "credit": 11800,
                    "noncredit": 650,
                },
            },
        },
        {
            "term": "Spring 2025",
            "snapshot_date": date(2025, 5, 7),
            "data": {
                "total_enrollment": 11800,
                "sections": 820,
                "seats": 15200,
                "fill_rate": 77.6,
                "by_mode": {
                    "in_person": 4900,
                    "hybrid": 2050,
                    "hyflex": 1100,
                    "online": 3750,
                },
                "by_term_length": {
                    "full_term": 8100,
                    "session_a": 1700,
                    "session_b": 1350,
                    "short_term": 650,
                },
                "credit_vs_noncredit": {
                    "credit": 11200,
                    "noncredit": 600,
                },
            },
        },
        {
            "term": "Fall 2023",
            "snapshot_date": date(2023, 11, 15),
            "data": {
                "total_enrollment": 11200,
                "sections": 790,
                "seats": 14800,
                "fill_rate": 75.7,
                "by_mode": {
                    "in_person": 5500,
                    "hybrid": 1900,
                    "hyflex": 800,
                    "online": 3000,
                },
                "by_term_length": {
                    "full_term": 7800,
                    "session_a": 1600,
                    "session_b": 1250,
                    "short_term": 550,
                },
                "credit_vs_noncredit": {
                    "credit": 10600,
                    "noncredit": 600,
                },
            },
        },
        {
            "term": "Spring 2024",
            "snapshot_date": date(2024, 5, 10),
            "data": {
                "total_enrollment": 10800,
                "sections": 760,
                "seats": 14200,
                "fill_rate": 76.1,
                "by_mode": {
                    "in_person": 5200,
                    "hybrid": 1850,
                    "hyflex": 750,
                    "online": 3000,
                },
                "by_term_length": {
                    "full_term": 7500,
                    "session_a": 1550,
                    "session_b": 1200,
                    "short_term": 550,
                },
                "credit_vs_noncredit": {
                    "credit": 10200,
                    "noncredit": 600,
                },
            },
        },
        {
            "term": "Summer 2024",
            "snapshot_date": date(2024, 7, 24),
            "data": {
                "total_enrollment": 5200,
                "sections": 320,
                "seats": 6800,
                "fill_rate": 76.5,
                "by_mode": {
                    "in_person": 1800,
                    "hybrid": 800,
                    "hyflex": 400,
                    "online": 2200,
                },
                "by_term_length": {
                    "full_term": 2100,
                    "session_a": 1400,
                    "session_b": 1200,
                    "short_term": 500,
                },
                "credit_vs_noncredit": {
                    "credit": 4900,
                    "noncredit": 300,
                },
            },
        },
        {
            "term": "Winter 2025",
            "snapshot_date": date(2025, 1, 15),
            "data": {
                "total_enrollment": 3800,
                "sections": 180,
                "seats": 4800,
                "fill_rate": 79.2,
                "by_mode": {
                    "in_person": 1200,
                    "hybrid": 600,
                    "hyflex": 300,
                    "online": 1700,
                },
                "by_term_length": {
                    "full_term": 0,
                    "session_a": 0,
                    "session_b": 0,
                    "short_term": 3800,
                },
                "credit_vs_noncredit": {
                    "credit": 3600,
                    "noncredit": 200,
                },
            },
        },
    ]

    for snapshot_data in enrollment_snapshots:
        snapshot = EnrollmentSnapshot(**snapshot_data)
        session.add(snapshot)

    session.commit()
    print(f"Created {len(enrollment_snapshots)} enrollment snapshots")


def seed_program_reviews(session: Session):
    """Seed program reviews with realistic content."""
    existing = session.exec(select(ProgramReview)).first()
    if existing:
        print("Program reviews already seeded, skipping...")
        return

    # Get departments and users
    biology = session.exec(select(Organization).where(Organization.name == "Biology")).first()
    math = session.exec(select(Organization).where(Organization.name == "Mathematics")).first()
    cs = session.exec(select(Organization).where(Organization.name == "Computer Science & IT")).first()
    nursing = session.exec(select(Organization).where(Organization.name == "Nursing")).first()
    english = session.exec(select(Organization).where(Organization.name == "English")).first()

    faculty = session.exec(select(User).where(User.role == UserRole.FACULTY)).first()

    reviews_data = [
        {
            "org_id": biology.id if biology else None,
            "org_name": "Biology Department",
            "author_id": faculty.id if faculty else None,
            "cycle_year": "2024-2025",
            "review_type": ReviewType.COMPREHENSIVE,
            "status": ReviewStatus.DRAFT,
            "content": {
                "program_overview": "The Biology Department offers a comprehensive curriculum designed to prepare students for transfer to four-year institutions and careers in the life sciences. Our program emphasizes hands-on laboratory experience and critical thinking skills. We serve approximately 1,200 students annually across our course offerings.",
                "student_success": "",
                "curriculum": "",
                "equity_analysis": "",
                "action_plans": "",
                "resource_needs": "",
            },
        },
        {
            "org_id": cs.id if cs else None,
            "org_name": "Computer Science & IT",
            "author_id": faculty.id if faculty else None,
            "cycle_year": "2024-2025",
            "review_type": ReviewType.ANNUAL,
            "status": ReviewStatus.IN_REVIEW,
            "content": {
                "program_overview": "The Computer Science & IT Department provides cutting-edge education in programming, networking, cybersecurity, and database management. Our programs align with industry certifications and prepare students for immediate employment or transfer to four-year institutions.",
                "student_success": "Our program achieved a 72% success rate in Fall 2024, exceeding the institutional average. Online course sections showed particularly strong performance with an 8% increase in completion rates.",
                "curriculum": "All courses have been reviewed within the past 3 years. We introduced two new certificates in Cloud Computing and Data Analytics in response to labor market demand.",
                "equity_analysis": "Analysis reveals a 5% equity gap for Hispanic male students in programming courses. We have implemented peer tutoring and supplemental instruction to address this disparity.",
                "action_plans": "",
                "resource_needs": "",
            },
        },
        {
            "org_id": nursing.id if nursing else None,
            "org_name": "Nursing Program",
            "author_id": faculty.id if faculty else None,
            "cycle_year": "2024-2025",
            "review_type": ReviewType.COMPREHENSIVE,
            "status": ReviewStatus.VALIDATED,
            "content": {
                "program_overview": "The Nursing Program is a Board of Registered Nursing (BRN) approved program preparing students for the NCLEX-RN examination. Our program maintains strong partnerships with local healthcare facilities for clinical rotations.",
                "student_success": "NCLEX pass rates remain at 89%, above the state average of 82%. First-attempt pass rates improved 3% from the previous year through enhanced test preparation support.",
                "curriculum": "Curriculum was updated to incorporate simulation-based learning and telehealth competencies. All course SLOs achieved above 70% mastery rates.",
                "equity_analysis": "The program serves a diverse student population with 68% Hispanic/Latino enrollment. No significant equity gaps identified across demographic groups.",
                "action_plans": "Completed action plan to expand clinical partnerships. In progress: develop evening/weekend cohort to serve working students.",
                "resource_needs": "Priority request for high-fidelity simulation mannequins to enhance hands-on training capabilities.",
            },
        },
        {
            "org_id": math.id if math else None,
            "org_name": "Mathematics Department",
            "author_id": faculty.id if faculty else None,
            "cycle_year": "2024-2025",
            "review_type": ReviewType.ANNUAL,
            "status": ReviewStatus.APPROVED,
            "content": {
                "program_overview": "The Mathematics Department serves as a foundational pillar for STEM education at CCC. We offer courses ranging from basic mathematics through calculus and statistics, supporting student transfer and career goals.",
                "student_success": "Success rates in gateway math courses improved 4% following implementation of co-requisite support model. Statistics pathway shows strongest performance at 78% success rate.",
                "curriculum": "AB 705 compliance achieved. Developed new Business Calculus pathway for business majors. All courses incorporate equity-minded pedagogical practices.",
                "equity_analysis": "Implemented targeted interventions resulting in 3% reduction in equity gaps for African American students. Continued focus needed on Pell-eligible student support.",
                "action_plans": "Successfully institutionalized embedded tutoring in all gateway courses. Expanding math success center hours to evenings and weekends.",
                "resource_needs": "Request funded for graphing calculators lending library. Pending: Additional math tutoring staff.",
            },
        },
        {
            "org_id": english.id if english else None,
            "org_name": "English Department",
            "author_id": faculty.id if faculty else None,
            "cycle_year": "2024-2025",
            "review_type": ReviewType.COMPREHENSIVE,
            "status": ReviewStatus.DRAFT,
            "content": {
                "program_overview": "The English Department offers composition, literature, and creative writing courses that develop critical thinking and communication skills essential for academic and career success.",
                "student_success": "",
                "curriculum": "",
                "equity_analysis": "",
                "action_plans": "",
                "resource_needs": "",
            },
        },
    ]

    review_map = {}
    for review_data in reviews_data:
        if review_data["org_id"]:
            review = ProgramReview(
                org_id=review_data["org_id"],
                author_id=review_data["author_id"],
                cycle_year=review_data["cycle_year"],
                review_type=review_data["review_type"],
                status=review_data["status"],
                content=review_data["content"],
            )
            session.add(review)
            session.commit()
            session.refresh(review)
            review_map[review_data["org_name"]] = review

            # Create review sections
            section_keys = ["program_overview", "student_success", "curriculum", "equity_analysis", "action_plans", "resource_needs"]
            for key in section_keys:
                content = review_data["content"].get(key, "")
                status = SectionStatus.COMPLETED if len(content) > 200 else (SectionStatus.IN_PROGRESS if content else SectionStatus.NOT_STARTED)
                section = ReviewSection(
                    review_id=review.id,
                    section_key=key,
                    status=status,
                    content=content if content else None,
                )
                session.add(section)

    session.commit()
    print(f"Created {len(review_map)} program reviews with sections")
    return review_map


def seed_action_plans(session: Session, review_map: dict):
    """Seed action plans linked to reviews and strategic initiatives."""
    existing = session.exec(select(ActionPlan)).first()
    if existing:
        print("Action plans already seeded, skipping...")
        return

    # Get strategic initiatives for linking
    initiatives = {}
    for init in session.exec(select(StrategicInitiative)).all():
        initiatives[init.code] = init

    action_plans_data = [
        # Biology Action Plans
        {
            "review_name": "Biology Department",
            "title": "Implement Supplemental Instruction for Gateway Courses",
            "description": "Establish SI program for high-enrollment courses with historically low success rates including BIOL 3 and BIOL 6.",
            "status": ActionPlanStatus.ONGOING,
            "addresses_equity_gap": True,
            "justification": "Data shows African American and Hispanic male students have 7pp and 5pp gaps respectively in these courses.",
            "initiatives": ["3.1", "3.3"],
        },
        {
            "review_name": "Biology Department",
            "title": "Expand Online Tutoring Hours",
            "description": "Increase availability of online tutoring to serve evening and weekend students who cannot access on-campus services.",
            "status": ActionPlanStatus.COMPLETE,
            "addresses_equity_gap": True,
            "justification": "Working students and parents face barriers accessing traditional tutoring hours.",
            "initiatives": ["2.2", "3.1"],
        },
        # CS Action Plans
        {
            "review_name": "Computer Science & IT",
            "title": "Develop Industry Partnership Program",
            "description": "Establish formal partnerships with tech companies for internships, mentoring, and equipment donations.",
            "status": ActionPlanStatus.ONGOING,
            "addresses_equity_gap": False,
            "justification": None,
            "initiatives": ["1.4", "2.3"],
        },
        {
            "review_name": "Computer Science & IT",
            "title": "Launch Peer Mentoring for First-Gen Students",
            "description": "Create peer mentoring program pairing successful students with first-generation college students in CS.",
            "status": ActionPlanStatus.ONGOING,
            "addresses_equity_gap": True,
            "justification": "First-gen students show 8pp gap in persistence; peer support has been shown to improve outcomes.",
            "initiatives": ["3.3", "2.1"],
        },
        {
            "review_name": "Computer Science & IT",
            "title": "Update Cybersecurity Curriculum",
            "description": "Align curriculum with CompTIA Security+ and Cisco CyberOps certifications based on advisory board input.",
            "status": ActionPlanStatus.COMPLETE,
            "addresses_equity_gap": False,
            "justification": None,
            "initiatives": ["1.3", "4.2"],
        },
        # Nursing Action Plans
        {
            "review_name": "Nursing Program",
            "title": "Expand Clinical Partnerships",
            "description": "Establish 3 new clinical site agreements to increase capacity for hands-on training.",
            "status": ActionPlanStatus.INSTITUTIONALIZED,
            "addresses_equity_gap": False,
            "justification": None,
            "initiatives": ["1.4", "2.3"],
        },
        {
            "review_name": "Nursing Program",
            "title": "Develop Evening/Weekend Cohort",
            "description": "Create alternative scheduling pathway for working students to complete nursing prerequisites.",
            "status": ActionPlanStatus.ONGOING,
            "addresses_equity_gap": True,
            "justification": "Working adults constitute 35% of applicants but only 15% of admits due to scheduling barriers.",
            "initiatives": ["1.2", "3.3"],
        },
        # Math Action Plans
        {
            "review_name": "Mathematics Department",
            "title": "Implement Co-requisite Support Model",
            "description": "Offer concurrent support courses for students placed into transfer-level math per AB 705.",
            "status": ActionPlanStatus.INSTITUTIONALIZED,
            "addresses_equity_gap": True,
            "justification": "Eliminates remedial sequences that disproportionately impacted students of color.",
            "initiatives": ["3.1", "3.3", "4.2"],
        },
        {
            "review_name": "Mathematics Department",
            "title": "Expand Math Success Center Hours",
            "description": "Extend tutoring center operations to 7pm weekdays and add Saturday hours.",
            "status": ActionPlanStatus.ONGOING,
            "addresses_equity_gap": True,
            "justification": "Evening students and working parents need expanded access to support services.",
            "initiatives": ["2.2", "3.1"],
        },
        {
            "review_name": "Mathematics Department",
            "title": "Professional Development on Equity-Minded Practices",
            "description": "Conduct faculty training on culturally responsive pedagogy and growth mindset interventions.",
            "status": ActionPlanStatus.COMPLETE,
            "addresses_equity_gap": True,
            "justification": "Research shows equity-minded teaching reduces achievement gaps.",
            "initiatives": ["3.3", "4.3", "4.4"],
        },
    ]

    plan_map = {}
    for plan_data in action_plans_data:
        review = review_map.get(plan_data["review_name"])
        if review:
            plan = ActionPlan(
                review_id=review.id,
                title=plan_data["title"],
                description=plan_data["description"],
                status=plan_data["status"],
                addresses_equity_gap=plan_data["addresses_equity_gap"],
                justification=plan_data["justification"],
            )
            session.add(plan)
            session.commit()
            session.refresh(plan)
            plan_map[plan_data["title"]] = plan

            # Create initiative mappings (Golden Thread)
            for init_code in plan_data["initiatives"]:
                if init_code in initiatives:
                    mapping = ActionPlanMapping(
                        action_plan_id=plan.id,
                        initiative_id=initiatives[init_code].id,
                    )
                    session.add(mapping)

    session.commit()
    print(f"Created {len(plan_map)} action plans with initiative mappings")
    return plan_map


def seed_resource_requests(session: Session, plan_map: dict):
    """Seed resource requests linked to action plans."""
    existing = session.exec(select(ResourceRequest)).first()
    if existing:
        print("Resource requests already seeded, skipping...")
        return

    requests_data = [
        # Biology Resources
        {
            "plan_title": "Implement Supplemental Instruction for Gateway Courses",
            "object_code": "2000",
            "description": "Part-time Lab Technician (20 hrs/week)",
            "amount": Decimal("28000.00"),
            "justification": "Provide lab preparation and student support for SI sessions in gateway biology courses.",
            "tco_notes": "Annual salary; includes benefits at 8%",
            "priority": 1,
            "is_funded": False,
        },
        {
            "plan_title": "Implement Supplemental Instruction for Gateway Courses",
            "object_code": "6000",
            "description": "Laboratory Equipment Upgrade - Microscopes (10 units)",
            "amount": Decimal("15000.00"),
            "justification": "Replace aging compound microscopes to support hands-on instruction in BIOL 3 and BIOL 6.",
            "tco_notes": "One-time purchase; 5-year warranty included",
            "priority": 2,
            "is_funded": True,
            "funded_amount": Decimal("12000.00"),
        },
        # CS Resources
        {
            "plan_title": "Develop Industry Partnership Program",
            "object_code": "5000",
            "description": "Cloud Computing Lab Environment - AWS/Azure Credits",
            "amount": Decimal("8500.00"),
            "justification": "Provide students hands-on experience with industry-standard cloud platforms.",
            "tco_notes": "Annual subscription; can be renewed based on usage",
            "priority": 1,
            "is_funded": True,
        },
        {
            "plan_title": "Launch Peer Mentoring for First-Gen Students",
            "object_code": "2000",
            "description": "Student Worker Hours - Peer Mentors (400 hours)",
            "amount": Decimal("6800.00"),
            "justification": "Fund peer mentors at $17/hour to support first-generation CS students.",
            "tco_notes": None,
            "priority": 2,
            "is_funded": False,
        },
        {
            "plan_title": "Update Cybersecurity Curriculum",
            "object_code": "5000",
            "description": "CompTIA and Cisco Certification Vouchers (50 students)",
            "amount": Decimal("12500.00"),
            "justification": "Subsidize certification exams to improve student employability.",
            "tco_notes": "Per-student cost approximately $250",
            "priority": 3,
            "is_funded": False,
        },
        # Nursing Resources
        {
            "plan_title": "Develop Evening/Weekend Cohort",
            "object_code": "1000",
            "description": "Adjunct Faculty - Evening Clinical Instructor",
            "amount": Decimal("35000.00"),
            "justification": "Staff evening clinical rotations for working student cohort.",
            "tco_notes": "Based on 15 LHE at adjunct rate; includes benefits",
            "priority": 1,
            "is_funded": False,
        },
        {
            "plan_title": "Expand Clinical Partnerships",
            "object_code": "6000",
            "description": "High-Fidelity Simulation Mannequin",
            "amount": Decimal("45000.00"),
            "justification": "Enhance simulation lab capabilities for complex patient scenarios.",
            "tco_notes": "5-year maintenance agreement included; TCO adds $5K/year for consumables",
            "priority": 1,
            "is_funded": False,
        },
        # Math Resources
        {
            "plan_title": "Expand Math Success Center Hours",
            "object_code": "2000",
            "description": "Math Tutors - Extended Hours (600 hours)",
            "amount": Decimal("10200.00"),
            "justification": "Staff evening and Saturday tutoring sessions at $17/hour.",
            "tco_notes": None,
            "priority": 1,
            "is_funded": True,
        },
        {
            "plan_title": "Implement Co-requisite Support Model",
            "object_code": "4000",
            "description": "Open Educational Resources (OER) Development",
            "amount": Decimal("5000.00"),
            "justification": "Develop OER materials for co-requisite support courses to reduce student costs.",
            "tco_notes": "One-time development; faculty stipend",
            "priority": 2,
            "is_funded": True,
        },
        {
            "plan_title": "Implement Co-requisite Support Model",
            "object_code": "6000",
            "description": "Graphing Calculators Lending Library (50 units)",
            "amount": Decimal("6250.00"),
            "justification": "Provide calculators for students who cannot afford to purchase their own.",
            "tco_notes": "TI-84 Plus CE at $125 each; 3-year replacement cycle",
            "priority": 3,
            "is_funded": True,
        },
        {
            "plan_title": "Professional Development on Equity-Minded Practices",
            "object_code": "5000",
            "description": "Professional Development Conference Registration (5 faculty)",
            "amount": Decimal("3500.00"),
            "justification": "Send faculty to AMATYC conference for equity-focused math pedagogy training.",
            "tco_notes": "Includes registration, travel, and lodging",
            "priority": 4,
            "is_funded": False,
        },
    ]

    for req_data in requests_data:
        plan = plan_map.get(req_data["plan_title"])
        if plan:
            request = ResourceRequest(
                action_plan_id=plan.id,
                object_code=req_data["object_code"],
                description=req_data["description"],
                amount=req_data["amount"],
                justification=req_data["justification"],
                tco_notes=req_data.get("tco_notes"),
                priority=req_data["priority"],
                is_funded=req_data["is_funded"],
                funded_amount=req_data.get("funded_amount"),
            )
            session.add(request)

    session.commit()
    print(f"Created {len(requests_data)} resource requests")


def main():
    """Run all seed functions."""
    print("Creating database tables...")
    create_db_and_tables()

    with Session(engine) as session:
        print("\nSeeding organizations...")
        seed_organizations(session)

        print("\nSeeding users...")
        seed_users(session)

        print("\nSeeding strategic initiatives...")
        seed_strategic_initiatives(session)

        print("\nSeeding enrollment data...")
        seed_enrollment_data(session)

        print("\nSeeding program reviews...")
        review_map = seed_program_reviews(session)

        if review_map:
            print("\nSeeding action plans...")
            plan_map = seed_action_plans(session, review_map)

            if plan_map:
                print("\nSeeding resource requests...")
                seed_resource_requests(session, plan_map)

    print("\n✅ Seed complete!")


if __name__ == "__main__":
    main()
