"""
Comprehensive seed script for extensive mock data.
Creates diverse data across all departments, roles, and statuses.

Run with: python seed_comprehensive.py
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4
import random
from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models.user import User, UserRole
from models.organization import Organization, OrganizationType
from models.strategic_initiative import StrategicInitiative
from models.program_review import ProgramReview, ReviewSection, ReviewStatus, ReviewType, SectionStatus
from models.action_plan import ActionPlan, ActionPlanMapping, ActionPlanStatus
from models.resource_request import ResourceRequest
from models.validation import ValidationScore
from models.audit import AuditTrail, AuditAction

# Import base seed functions
from seed import (
    seed_organizations,
    seed_users as seed_base_users,
    seed_strategic_initiatives,
    seed_enrollment_data,
)


def seed_additional_users(session: Session):
    """Seed additional users for each department to enable comprehensive testing."""

    # Get all departments
    departments = session.exec(
        select(Organization).where(Organization.type == OrganizationType.DEPARTMENT)
    ).all()

    dept_map = {dept.name: dept for dept in departments}

    # Additional users for testing - faculty across departments
    additional_users = [
        # Academic Affairs faculty
        {
            "firebase_uid": "demo-faculty-math-002",
            "email": "martinez.math@ccc.edu",
            "full_name": "Dr. Robert Martinez",
            "role": UserRole.FACULTY,
            "department_id": dept_map.get("Mathematics").id if dept_map.get("Mathematics") else None,
        },
        {
            "firebase_uid": "demo-faculty-english-001",
            "email": "johnson.english@ccc.edu",
            "full_name": "Prof. Angela Johnson",
            "role": UserRole.FACULTY,
            "department_id": dept_map.get("English").id if dept_map.get("English") else None,
        },
        {
            "firebase_uid": "demo-faculty-bio-001",
            "email": "chen.bio@ccc.edu",
            "full_name": "Dr. James Chen",
            "role": UserRole.FACULTY,
            "department_id": dept_map.get("Biology").id if dept_map.get("Biology") else None,
        },
        {
            "firebase_uid": "demo-faculty-cs-001",
            "email": "patel.cs@ccc.edu",
            "full_name": "Prof. Priya Patel",
            "role": UserRole.FACULTY,
            "department_id": dept_map.get("Computer Science & IT").id if dept_map.get("Computer Science & IT") else None,
        },
        {
            "firebase_uid": "demo-faculty-business-001",
            "email": "williams.business@ccc.edu",
            "full_name": "Dr. Thomas Williams",
            "role": UserRole.FACULTY,
            "department_id": dept_map.get("Business").id if dept_map.get("Business") else None,
        },
        {
            "firebase_uid": "demo-faculty-nursing-001",
            "email": "rodriguez.nursing@ccc.edu",
            "full_name": "Dr. Maria Rodriguez",
            "role": UserRole.FACULTY,
            "department_id": dept_map.get("Nursing").id if dept_map.get("Nursing") else None,
        },
        # Student Services faculty
        {
            "firebase_uid": "demo-faculty-counseling-001",
            "email": "kim.counseling@ccc.edu",
            "full_name": "Dr. Susan Kim",
            "role": UserRole.FACULTY,
            "department_id": dept_map.get("Counseling").id if dept_map.get("Counseling") else None,
        },
        {
            "firebase_uid": "demo-faculty-finaid-001",
            "email": "hernandez.finaid@ccc.edu",
            "full_name": "Carlos Hernandez",
            "role": UserRole.FACULTY,
            "department_id": dept_map.get("Financial Aid").id if dept_map.get("Financial Aid") else None,
        },
        {
            "firebase_uid": "demo-faculty-admissions-001",
            "email": "nguyen.admissions@ccc.edu",
            "full_name": "Lisa Nguyen",
            "role": UserRole.FACULTY,
            "department_id": dept_map.get("Admissions & Records").id if dept_map.get("Admissions & Records") else None,
        },
        # Additional chairs
        {
            "firebase_uid": "demo-chair-english-001",
            "email": "chair.english@ccc.edu",
            "full_name": "Dr. Emily Thompson",
            "role": UserRole.CHAIR,
            "department_id": dept_map.get("English").id if dept_map.get("English") else None,
        },
        {
            "firebase_uid": "demo-chair-bio-001",
            "email": "chair.bio@ccc.edu",
            "full_name": "Dr. Michael Brown",
            "role": UserRole.CHAIR,
            "department_id": dept_map.get("Biology").id if dept_map.get("Biology") else None,
        },
        {
            "firebase_uid": "demo-chair-cs-001",
            "email": "chair.cs@ccc.edu",
            "full_name": "Dr. Kevin Park",
            "role": UserRole.CHAIR,
            "department_id": dept_map.get("Computer Science & IT").id if dept_map.get("Computer Science & IT") else None,
        },
    ]

    created_count = 0
    for user_data in additional_users:
        # Check if user already exists
        existing = session.exec(
            select(User).where(User.firebase_uid == user_data["firebase_uid"])
        ).first()
        if not existing and user_data.get("department_id"):
            user = User(**user_data)
            session.add(user)
            created_count += 1

    session.commit()
    print(f"Created {created_count} additional users")


def seed_comprehensive_reviews(session: Session):
    """Seed reviews for ALL departments with variety in status, type, and cycle."""

    # Get all departments and users
    departments = session.exec(
        select(Organization).where(Organization.type == OrganizationType.DEPARTMENT)
    ).all()

    users = session.exec(select(User)).all()
    user_map = {}
    for user in users:
        if user.department_id:
            if user.department_id not in user_map:
                user_map[user.department_id] = []
            user_map[user.department_id].append(user)

    # Get any faculty user as fallback
    fallback_author = session.exec(
        select(User).where(User.role == UserRole.FACULTY)
    ).first()

    # Cycle years and their distributions
    cycle_configs = [
        ("2023-2024", ReviewStatus.APPROVED, 0.8),  # Historical - mostly approved
        ("2024-2025", None, 0.5),  # Current - mixed statuses
        ("2025-2026", ReviewStatus.DRAFT, 0.9),  # Future - mostly drafts
    ]

    review_templates = {
        "Mathematics": {
            "comprehensive": {
                "program_overview": "The Mathematics Department at Community College provides foundational STEM education serving over 2,500 students annually. Our curriculum spans from developmental mathematics through calculus, differential equations, and linear algebra. We support transfer students pursuing STEM degrees at four-year universities and prepare students for quantitative reasoning across all disciplines. Our faculty are committed to equity-minded pedagogy and innovative instructional approaches including co-requisite support models mandated by AB 705.",
                "student_success": "Course success rates improved 4.2 percentage points following implementation of the AB 705 co-requisite support model. Statistics pathway shows strongest performance at 78% success rate, while Calculus sequence maintains 72% success. Embedded tutoring in gateway courses contributed to 6% improvement in persistence rates. Online sections outperformed face-to-face by 3% in Fall 2024.",
                "curriculum": "All courses reviewed within 3-year cycle. New Business Calculus pathway launched in response to Business Department needs. Statistics curriculum updated to incorporate more data science applications. All course SLOs assessed with 85% meeting institutional benchmarks.",
                "equity_analysis": "African American students show 7pp gap in gateway courses (58% vs 65% institutional). Hispanic male students show 4pp gap in calculus sequence. Pell-eligible students have similar success rates to non-Pell students after embedded tutoring implementation. First-generation students benefit significantly from co-requisite model.",
                "action_plans": "Successfully institutionalized embedded tutoring. Expanding math success center to evening/weekend hours. Planning faculty equity training series. Developing OER materials to reduce textbook costs.",
                "resource_needs": "Priority: Additional math tutors for extended hours. Secondary: Graphing calculator lending library. Technology upgrades for computer lab.",
            },
            "annual": {
                "program_overview": "Annual update for Mathematics Department focusing on AB 705 implementation outcomes and equity initiatives.",
                "student_success": "Success rates stable at 68%. Online modality continues strong performance. Identified need for additional support in evening sections.",
                "curriculum": "No major curriculum changes. SLO assessment ongoing with 82% meeting targets.",
                "equity_analysis": "Equity gaps persist for African American students. New intervention strategies under development.",
                "action_plans": "Continue embedded tutoring. Launch peer mentoring program for first-gen students.",
                "resource_needs": "Request tutoring hours increase and technology refresh.",
            },
        },
        "English": {
            "comprehensive": {
                "program_overview": "The English Department offers a robust curriculum in composition, literature, and creative writing that develops critical thinking, research, and communication skills essential for academic and career success. We serve approximately 3,000 students annually across composition sequences, literature courses, and creative writing workshops. The department leads the college's Writing Across the Curriculum initiative.",
                "student_success": "English 101 success rates at 71%, slightly above the state average. Students completing the English sequence show 85% transfer-readiness. The stretch model for ENGL 101 shows promising results with 73% success rate compared to 68% for traditional format.",
                "curriculum": "Implemented stretch composition model per AB 705. Added technical writing certificate program. Literature courses incorporate diverse perspectives and culturally responsive texts. All SLOs assessed annually with 80% achievement rate.",
                "equity_analysis": "Hispanic students perform at parity with overall population. African American student gap reduced by 3pp through targeted interventions. ESL students show strong improvement with additional support courses.",
                "action_plans": "Expand Writing Center hours. Develop online writing tutoring. Create faculty learning community on equity-minded grading.",
                "resource_needs": "Writing Center staffing. Technology for online tutoring. Professional development funding.",
            },
            "annual": {
                "program_overview": "Annual update focusing on Writing Center expansion and AB 705 outcomes.",
                "student_success": "Maintained 71% success rate. Evening sections showing improvement with new support model.",
                "curriculum": "Technical writing certificate approved by curriculum committee.",
                "equity_analysis": "Continuing focus on African American student success. ESL support expansion needed.",
                "action_plans": "Writing Center evening hours approved. Hiring additional tutors.",
                "resource_needs": "Student worker hours for Writing Center. Conference attendance for faculty.",
            },
        },
        "Biology": {
            "comprehensive": {
                "program_overview": "The Biology Department prepares students for transfer to four-year institutions and careers in life sciences, healthcare, and biotechnology. Our program emphasizes hands-on laboratory experience, scientific inquiry, and critical analysis. We serve approximately 1,500 students annually including pre-nursing, pre-med, and general biology majors. Our laboratory facilities include modern equipment for molecular biology and microscopy.",
                "student_success": "Overall success rate of 69% with significant variation by course level. Anatomy & Physiology sequence shows 74% success rate. Introductory biology courses at 66%. Laboratory sections outperform lecture-only by 5%. Supplemental Instruction in BIOL 3 improved success by 8%.",
                "curriculum": "Updated all courses for C-ID alignment. Incorporated CURE (Course-based Undergraduate Research Experience) modules. New biotechnology certificate in development. All SLOs assessed with 78% meeting targets.",
                "equity_analysis": "Hispanic male students show 6pp gap in gateway biology courses. First-generation students underperform by 5pp. Evening students have lower success rates than day students. Targeted interventions showing promise.",
                "action_plans": "Expand SI program to all gateway courses. Develop online lab simulations for hybrid courses. Partner with local hospitals for biotech internships.",
                "resource_needs": "Lab equipment replacement. SI leader stipends. Simulation software licenses.",
            },
            "annual": {
                "program_overview": "Annual update on laboratory improvements and equity initiatives.",
                "student_success": "SI program showing 8% improvement. Lab sections continue strong performance.",
                "curriculum": "Biotechnology certificate approved. Hybrid lab options expanded.",
                "equity_analysis": "Targeted outreach to Hispanic male students. Evening support services expanded.",
                "action_plans": "Continue SI expansion. Develop bridge program for pre-nursing students.",
                "resource_needs": "Microscope replacement. Additional lab technician hours.",
            },
        },
        "Computer Science & IT": {
            "comprehensive": {
                "program_overview": "The Computer Science & IT Department provides cutting-edge education in programming, networking, cybersecurity, database management, and cloud computing. Our programs align with industry certifications (CompTIA, Cisco, AWS) and prepare students for immediate employment or transfer. We serve 800+ students and maintain strong advisory board relationships with tech companies. Lab facilities include dedicated networking, cybersecurity, and programming environments.",
                "student_success": "Program success rate of 72% exceeds institutional average. Certification exam pass rates at 85%. Internship placement rate of 60% for graduating students. Online programming courses show 74% success rate. First-time programmers show 65% success with support courses.",
                "curriculum": "Added Cloud Computing certificate (AWS focus). Updated Cybersecurity curriculum for CompTIA Security+. Created Data Analytics pathway. All courses industry-aligned with advisory board input. 90% of SLOs meeting targets.",
                "equity_analysis": "Hispanic male students show 5pp gap in programming courses. Women underrepresented at 22% enrollment. First-generation students benefit from peer mentoring. Veterans show strong performance in cybersecurity tracks.",
                "action_plans": "Launch Women in Tech initiative. Expand industry partnerships for internships. Develop peer mentoring for first-gen students. Create evening/weekend cohort for working adults.",
                "resource_needs": "Cloud computing lab credits. Industry certification vouchers. Equipment refresh for networking lab. Adjunct faculty for evening sections.",
            },
            "annual": {
                "program_overview": "Annual update focusing on cloud computing expansion and industry partnerships.",
                "student_success": "Certification pass rates improved to 87%. Industry partnerships yielding more internships.",
                "curriculum": "Cloud computing certificate launched. Python programming pathway developed.",
                "equity_analysis": "Women in Tech outreach increased female enrollment by 3%. Hispanic male support ongoing.",
                "action_plans": "Continue industry engagement. Expand certification voucher program.",
                "resource_needs": "Additional cloud credits. Updated networking equipment.",
            },
        },
        "Business": {
            "comprehensive": {
                "program_overview": "The Business Department offers comprehensive programs in accounting, management, marketing, and entrepreneurship. We prepare students for transfer to four-year business schools and immediate employment in business careers. Our programs align with Community College Chancellor's Office model curriculum. We serve 1,200 students annually and maintain partnerships with local businesses.",
                "student_success": "Program success rate of 70%. Accounting pathway shows strongest performance at 75%. Marketing courses at 68%. Evening sections perform comparably to day sections. Advisory board members report strong preparation of our graduates.",
                "curriculum": "Added Social Media Marketing certificate. Updated Accounting curriculum for new CPA requirements. Business Statistics integrated with Math Department. All SLOs assessed with 82% meeting targets.",
                "equity_analysis": "No significant equity gaps by ethnicity. Pell-eligible students perform at parity. Veterans show strong performance. Working adults benefit from hybrid scheduling options.",
                "action_plans": "Develop internship program with local businesses. Create entrepreneurship incubator. Expand evening course offerings.",
                "resource_needs": "Business simulation software. Guest speaker honoraria. Professional development for faculty.",
            },
            "annual": {
                "program_overview": "Annual update on business curriculum alignment and industry engagement.",
                "student_success": "Success rates stable. New accounting students showing improved preparation.",
                "curriculum": "Social media marketing certificate approved and launched.",
                "equity_analysis": "Continued equity across demographics. Monitoring working adult success.",
                "action_plans": "Internship program expansion. Career fair planning.",
                "resource_needs": "Software licenses. Advisory board event funding.",
            },
        },
        "Nursing": {
            "comprehensive": {
                "program_overview": "The Community College Nursing Program is a Board of Registered Nursing (BRN) approved ADN program preparing students for the NCLEX-RN examination and careers as registered nurses. We maintain a 95% job placement rate and strong partnerships with local healthcare facilities. Our simulation lab provides hands-on training with high-fidelity mannequins. We serve 120 nursing students annually with highly competitive admission.",
                "student_success": "NCLEX first-attempt pass rate of 89%, exceeding state average of 82%. Retention rate of 92% for admitted students. Clinical evaluations show strong employer satisfaction. Students demonstrate 95% achievement of program SLOs.",
                "curriculum": "Updated curriculum for new NCLEX-RN format. Integrated telehealth competencies. Enhanced simulation-based learning. All courses meet BRN requirements. Clinical rotations at 8 partner facilities.",
                "equity_analysis": "Program serves diverse population: 68% Hispanic/Latino, 15% Asian, 12% White, 5% African American. No significant equity gaps across demographics. Working adult pathway shows strong outcomes.",
                "action_plans": "Expand clinical partnerships to increase capacity. Develop evening/weekend cohort. Upgrade simulation equipment. Create LVN-to-RN bridge program.",
                "resource_needs": "High-fidelity simulation mannequin. Additional clinical instructor. Simulation consumables. Skills lab equipment.",
            },
            "annual": {
                "program_overview": "Annual update on NCLEX outcomes and clinical partnerships.",
                "student_success": "NCLEX pass rate maintained at 89%. New clinical site agreements signed.",
                "curriculum": "Telehealth module implemented. Simulation hours expanded.",
                "equity_analysis": "Diverse enrollment maintained. Working adult cohort succeeding.",
                "action_plans": "LVN bridge program in development. Evening cohort planning.",
                "resource_needs": "Simulation equipment maintenance. Clinical coordinator time.",
            },
        },
        "Counseling": {
            "comprehensive": {
                "program_overview": "The Counseling Department provides comprehensive academic, career, and personal counseling services to support student success. We serve all 12,000+ CCC students through appointments, workshops, and outreach. Our team includes 12 full-time and 8 part-time counselors with expertise in transfer, career exploration, and special populations. We coordinate First-Year Experience and Guided Pathways initiatives.",
                "student_success": "Students meeting with counselors 3+ times show 15% higher persistence rates. SEP completion rate increased to 85%. Transfer rate improved 8% following Guided Pathways implementation. Student satisfaction scores at 4.5/5.0.",
                "curriculum": "Personal Development courses (PD 10, PD 20) updated for Guided Pathways. Career exploration workshops redesigned with labor market data. Transfer workshops enhanced with UC/CSU application support.",
                "equity_analysis": "Targeted outreach to African American male students through Brother2Brother program. First-generation students receive enhanced support. Foster youth and veterans have dedicated counselors. Evening appointment availability expanded.",
                "action_plans": "Expand proactive outreach to at-risk students. Implement early alert response system. Develop online counseling options. Increase evening/weekend availability.",
                "resource_needs": "Additional counselor for evening hours. Case management software. Professional development on trauma-informed practices.",
            },
            "annual": {
                "program_overview": "Annual update on Guided Pathways and student support initiatives.",
                "student_success": "SEP completion continues improvement. Early alert response time reduced.",
                "curriculum": "Online workshop series developed.",
                "equity_analysis": "Brother2Brother showing positive outcomes. Foster youth support enhanced.",
                "action_plans": "Continue early alert implementation. Expand peer mentoring.",
                "resource_needs": "Technology for virtual appointments. Workshop materials.",
            },
        },
        "Financial Aid": {
            "comprehensive": {
                "program_overview": "The Financial Aid Office administers federal, state, and institutional aid programs totaling over $25 million annually. We serve 8,000+ students with financial aid needs through Pell Grants, Cal Grants, California Promise, and emergency aid. Our team processes 15,000+ FAFSAs and provides financial literacy education. We maintain 95% regulatory compliance.",
                "student_success": "Students receiving financial aid show 8% higher persistence than non-aid recipients. CA Promise students have 72% completion rate. Emergency aid recipients show 90% continued enrollment. Financial literacy workshop participants report improved money management.",
                "curriculum": "Financial literacy workshops updated with new budgeting tools. FAFSA completion workshops expanded to high schools. Student employment orientation enhanced. Scholarship workshop series developed.",
                "equity_analysis": "Pell-eligible students served at high rates. Undocumented students supported through CA Dream Act. Emergency aid primarily serving students of color. Targeted outreach to male students who under-apply for aid.",
                "action_plans": "Streamline aid processing timeline. Expand emergency aid fund. Develop textbook lending program. Increase FAFSA completion outreach.",
                "resource_needs": "Additional financial aid specialist. Emergency aid fund replenishment. Textbook lending startup costs.",
            },
            "annual": {
                "program_overview": "Annual update on financial aid processing and emergency support.",
                "student_success": "Processing time reduced by 2 days. Emergency aid requests up 20%.",
                "curriculum": "High school FAFSA workshops expanded.",
                "equity_analysis": "Male student outreach showing results. Dream Act applications increased.",
                "action_plans": "Continue processing improvements. Expand aid fund.",
                "resource_needs": "Processing software upgrade. Additional staff hours.",
            },
        },
        "Admissions & Records": {
            "comprehensive": {
                "program_overview": "Admissions & Records serves as the primary enrollment gateway for CCC, processing 15,000+ applications annually. We maintain student records, process transcripts, verify enrollment, and support graduation certification. Our team ensures compliance with Title 5, FERPA, and accreditation requirements. We coordinate with IT for student information system management.",
                "student_success": "Application-to-enrollment rate improved 5% following online process improvements. Transcript request fulfillment within 3 business days. Graduation audits 98% accurate. Student satisfaction at 4.2/5.0 for counter services.",
                "curriculum": "Developed online orientation for new students. Created virtual campus tour. Updated international student admission procedures. Transcript evaluation training completed.",
                "equity_analysis": "Bilingual services available in Spanish and Mandarin. Evening hours serve working adults. Veterans receive priority processing. ADA accommodations fully implemented.",
                "action_plans": "Implement online chat support. Reduce transcript processing time. Develop self-service portal enhancements. Cross-train staff on all functions.",
                "resource_needs": "Student information system upgrade. Additional bilingual staff. Chat software implementation. Scanner equipment for records.",
            },
            "annual": {
                "program_overview": "Annual update on enrollment processing and technology improvements.",
                "student_success": "Online application completion rate improved. Wait times reduced.",
                "curriculum": "Virtual orientation fully implemented.",
                "equity_analysis": "Bilingual services utilization up 15%.",
                "action_plans": "Continue portal development. Staff cross-training.",
                "resource_needs": "Technology refresh. Training resources.",
            },
        },
    }

    reviews_created = []

    for dept in departments:
        templates = review_templates.get(dept.name, review_templates.get("Mathematics"))  # Default template

        # Get department users or use fallback
        dept_users = user_map.get(dept.id, [])
        author = dept_users[0] if dept_users else fallback_author

        if not author:
            continue

        # Create reviews for each cycle year
        for cycle_year, default_status, status_weight in cycle_configs:
            # Determine review type based on cycle
            year_num = int(cycle_year.split("-")[0])
            is_comprehensive = (year_num % 4 == 0)  # Every 4 years
            review_type = ReviewType.COMPREHENSIVE if is_comprehensive else ReviewType.ANNUAL

            # Determine status
            if default_status:
                status = default_status
            else:
                # Mixed statuses for current cycle
                rand = random.random()
                if rand < 0.3:
                    status = ReviewStatus.DRAFT
                elif rand < 0.5:
                    status = ReviewStatus.IN_REVIEW
                elif rand < 0.7:
                    status = ReviewStatus.VALIDATED
                else:
                    status = ReviewStatus.APPROVED

            # Check if review already exists
            existing = session.exec(
                select(ProgramReview).where(
                    ProgramReview.org_id == dept.id,
                    ProgramReview.cycle_year == cycle_year
                )
            ).first()

            if existing:
                continue

            # Get appropriate template content
            template_type = "comprehensive" if review_type == ReviewType.COMPREHENSIVE else "annual"
            template = templates.get(template_type, templates.get("comprehensive", {}))

            # Adjust content based on status
            content = {}
            for key, value in template.items():
                if status == ReviewStatus.DRAFT:
                    # Drafts have partial content
                    if key in ["program_overview", "student_success"]:
                        content[key] = value
                    else:
                        content[key] = ""
                else:
                    content[key] = value

            review = ProgramReview(
                org_id=dept.id,
                author_id=author.id,
                cycle_year=cycle_year,
                review_type=review_type,
                status=status,
                content=content,
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 180)),
                updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
            )
            session.add(review)
            session.commit()
            session.refresh(review)
            reviews_created.append(review)

            # Create review sections
            section_keys = ["program_overview", "student_success", "curriculum", "equity_analysis", "action_plans", "resource_needs"]
            for key in section_keys:
                section_content = content.get(key, "")
                if status == ReviewStatus.DRAFT:
                    section_status = SectionStatus.IN_PROGRESS if section_content else SectionStatus.NOT_STARTED
                elif status in [ReviewStatus.IN_REVIEW, ReviewStatus.VALIDATED, ReviewStatus.APPROVED]:
                    section_status = SectionStatus.COMPLETED if len(section_content) > 100 else SectionStatus.IN_PROGRESS
                else:
                    section_status = SectionStatus.NOT_STARTED

                section = ReviewSection(
                    review_id=review.id,
                    section_key=key,
                    status=section_status,
                    content=section_content if section_content else None,
                    ai_drafts={"suggestions": []} if random.random() > 0.7 else {},
                )
                session.add(section)

    session.commit()
    print(f"Created {len(reviews_created)} comprehensive program reviews with sections")
    return reviews_created


def seed_diverse_action_plans(session: Session):
    """Create action plans with variety across all reviews and statuses."""

    # Get all reviews
    reviews = session.exec(select(ProgramReview)).all()

    # Get strategic initiatives
    initiatives = {}
    for init in session.exec(select(StrategicInitiative)).all():
        initiatives[init.code] = init

    action_plan_templates = [
        {
            "title": "Implement Supplemental Instruction Program",
            "description": "Establish SI program for high-enrollment courses with historically low success rates. Train and hire SI leaders from successful students.",
            "addresses_equity_gap": True,
            "justification": "Data shows disproportionate impact for underrepresented students in gateway courses.",
            "initiatives": ["3.1", "3.3"],
        },
        {
            "title": "Expand Tutoring Center Hours",
            "description": "Increase availability of tutoring services to evenings and weekends to serve working students and parents.",
            "addresses_equity_gap": True,
            "justification": "Working students face barriers accessing traditional tutoring hours.",
            "initiatives": ["2.2", "3.1"],
        },
        {
            "title": "Develop Industry Partnership Program",
            "description": "Establish formal partnerships with employers for internships, mentoring, guest speakers, and equipment donations.",
            "addresses_equity_gap": False,
            "justification": None,
            "initiatives": ["1.4", "2.3"],
        },
        {
            "title": "Launch Peer Mentoring Initiative",
            "description": "Create peer mentoring program pairing successful students with first-generation and at-risk students.",
            "addresses_equity_gap": True,
            "justification": "First-gen students show persistence gaps; peer support improves outcomes.",
            "initiatives": ["3.3", "2.1"],
        },
        {
            "title": "Curriculum Alignment with Industry Standards",
            "description": "Update curriculum to align with current industry certifications and employer requirements based on advisory board input.",
            "addresses_equity_gap": False,
            "justification": None,
            "initiatives": ["1.3", "4.2"],
        },
        {
            "title": "Professional Development Series",
            "description": "Conduct faculty training on equity-minded pedagogy, culturally responsive teaching, and growth mindset interventions.",
            "addresses_equity_gap": True,
            "justification": "Research shows equity-minded teaching reduces achievement gaps.",
            "initiatives": ["3.3", "4.3", "4.4"],
        },
        {
            "title": "Develop OER Materials",
            "description": "Create Open Educational Resources to reduce textbook costs and improve student access to course materials.",
            "addresses_equity_gap": True,
            "justification": "High textbook costs disproportionately impact low-income students.",
            "initiatives": ["1.2", "3.3"],
        },
        {
            "title": "Expand Online Course Offerings",
            "description": "Develop additional online and hybrid course sections to improve scheduling flexibility for students.",
            "addresses_equity_gap": True,
            "justification": "Working adults and parents need flexible scheduling options.",
            "initiatives": ["1.2", "2.4"],
        },
        {
            "title": "Create Learning Community",
            "description": "Establish faculty learning community for sharing best practices and collaborative professional development.",
            "addresses_equity_gap": False,
            "justification": None,
            "initiatives": ["4.3", "4.1"],
        },
        {
            "title": "Implement Early Alert System",
            "description": "Deploy proactive early alert system to identify and support at-risk students before they fall behind.",
            "addresses_equity_gap": True,
            "justification": "Early intervention reduces equity gaps in course completion.",
            "initiatives": ["3.1", "3.3", "2.2"],
        },
    ]

    statuses = [
        ActionPlanStatus.NOT_STARTED,
        ActionPlanStatus.ONGOING,
        ActionPlanStatus.COMPLETE,
        ActionPlanStatus.INSTITUTIONALIZED,
    ]

    plans_created = 0

    for review in reviews:
        # Skip if review is a new draft
        if review.status == ReviewStatus.DRAFT:
            num_plans = random.randint(0, 2)
        else:
            num_plans = random.randint(2, 4)

        # Select random templates
        selected_templates = random.sample(action_plan_templates, min(num_plans, len(action_plan_templates)))

        for template in selected_templates:
            # Check if similar plan already exists
            existing = session.exec(
                select(ActionPlan).where(
                    ActionPlan.review_id == review.id,
                    ActionPlan.title == template["title"]
                )
            ).first()

            if existing:
                continue

            # Determine status based on review status
            if review.status == ReviewStatus.APPROVED:
                status = random.choice([ActionPlanStatus.COMPLETE, ActionPlanStatus.INSTITUTIONALIZED, ActionPlanStatus.ONGOING])
            elif review.status == ReviewStatus.VALIDATED:
                status = random.choice([ActionPlanStatus.ONGOING, ActionPlanStatus.COMPLETE])
            elif review.status == ReviewStatus.IN_REVIEW:
                status = random.choice([ActionPlanStatus.NOT_STARTED, ActionPlanStatus.ONGOING])
            else:
                status = ActionPlanStatus.NOT_STARTED

            plan = ActionPlan(
                review_id=review.id,
                title=template["title"],
                description=template["description"],
                status=status,
                addresses_equity_gap=template["addresses_equity_gap"],
                justification=template["justification"],
            )
            session.add(plan)
            session.commit()
            session.refresh(plan)
            plans_created += 1

            # Create initiative mappings (Golden Thread)
            for init_code in template["initiatives"]:
                if init_code in initiatives:
                    # Check if mapping exists
                    existing_mapping = session.exec(
                        select(ActionPlanMapping).where(
                            ActionPlanMapping.action_plan_id == plan.id,
                            ActionPlanMapping.initiative_id == initiatives[init_code].id
                        )
                    ).first()

                    if not existing_mapping:
                        mapping = ActionPlanMapping(
                            action_plan_id=plan.id,
                            initiative_id=initiatives[init_code].id,
                        )
                        session.add(mapping)

    session.commit()
    print(f"Created {plans_created} diverse action plans with initiative mappings")


def seed_diverse_resources(session: Session):
    """
    Seed resource requests covering all 6 object code series.

    Creates 35-40 resource requests with:
    - All 6 object codes (1000-6000) represented
    - Diverse priorities (1-4)
    - Mix of funded/unfunded/partially funded
    - Realistic TCO notes and justifications
    - Links to ISMP goals through action plans
    """

    # Get all action plans
    plans = session.exec(select(ActionPlan)).all()

    # Comprehensive resource templates with TCO notes
    resource_templates = {
        "1000": [  # Academic Salaries (~$200K target)
            {
                "desc": "Adjunct Faculty - Evening Courses (3 sections)",
                "amount": Decimal("24000.00"),
                "justification": "Fund adjunct instruction for evening sections to expand access for working students.",
                "tco": "Based on 15 LHE × 3 sections × $533/LHE adjunct rate. One-year term."
            },
            {
                "desc": "Full-Time Faculty - New Position (Biology)",
                "amount": Decimal("85000.00"),
                "justification": "Replace retiring faculty and reduce reliance on adjuncts. Supports ACCJC Standard III.A.",
                "tco": "Entry-level salary per LACCD salary schedule. Includes step increases over 5 years."
            },
            {
                "desc": "Instructor Stipends - Professional Development",
                "amount": Decimal("12000.00"),
                "justification": "Compensate faculty for equity-minded pedagogy training and curriculum development.",
                "tco": "$500/faculty × 24 participants. Annual recurring cost."
            },
            {
                "desc": "Faculty Overload - Summer Session",
                "amount": Decimal("18000.00"),
                "justification": "Staff high-demand summer session course offerings to improve time-to-completion.",
                "tco": "6 LHE × $1000/LHE × 3 faculty. Seasonal (summer only)."
            },
            {
                "desc": "Hourly Instructors - Lab Sections",
                "amount": Decimal("32000.00"),
                "justification": "Provide additional lab instruction to reduce student-to-instructor ratios.",
                "tco": "20 hrs/week × $40/hr × 40 weeks. Recurring annual cost."
            },
            {
                "desc": "Faculty Coordinator - Guided Pathways",
                "amount": Decimal("15000.00"),
                "justification": "Release time for faculty to coordinate pathway mapping and student support.",
                "tco": "0.2 FTE reassigned time. Annual cost for 3-year initiative."
            },
        ],
        "2000": [  # Classified Salaries (~$150K target)
            {
                "desc": "Lab Technician - Part-time (20 hrs/week)",
                "amount": Decimal("28000.00"),
                "justification": "Provide lab preparation, equipment maintenance, and student support during lab hours.",
                "tco": "Grade 15 Step 1. 20 hrs/week × 50 weeks. Ongoing position."
            },
            {
                "desc": "Student Workers - Tutoring Center (400 hours)",
                "amount": Decimal("6800.00"),
                "justification": "Staff tutoring center with peer tutors to provide SI and drop-in support.",
                "tco": "400 hours × $17/hr (CA minimum wage). Per semester."
            },
            {
                "desc": "Administrative Assistant - Department",
                "amount": Decimal("45000.00"),
                "justification": "Provide clerical support for department operations, scheduling, and student inquiries.",
                "tco": "Grade 12 Step 3. Full-time ongoing position. Includes annual step increases."
            },
            {
                "desc": "IT Support Specialist - Lab Support",
                "amount": Decimal("65000.00"),
                "justification": "Dedicated technical support for computer labs and instructional technology.",
                "tco": "Grade 18 Step 1. Full-time ongoing. Market-competitive rate for IT talent."
            },
            {
                "desc": "Instructional Aide - Evening Hours",
                "amount": Decimal("15000.00"),
                "justification": "Extend instructional support to evening students who cannot access daytime services.",
                "tco": "15 hrs/week × $19/hr × 52 weeks. Addresses equity gap for working adults."
            },
        ],
        "3000": [  # Employee Benefits (~$60K target)
            {
                "desc": "Benefits for New Faculty Position",
                "amount": Decimal("32000.00"),
                "justification": "Benefits package for new full-time hire per LACCD benefits structure.",
                "tco": "37% of salary. Includes health, dental, vision, STRS contribution."
            },
            {
                "desc": "Benefits for Lab Technician",
                "amount": Decimal("8400.00"),
                "justification": "Benefits at 30% of salary for part-time benefited position.",
                "tco": "30% of $28,000 salary. Pro-rated benefits for part-time position."
            },
            {
                "desc": "PERS Contributions - Classified Staff",
                "amount": Decimal("12000.00"),
                "justification": "Employer contribution for new classified positions to CalPERS.",
                "tco": "PERS employer rate × total classified salaries. Annual recurring."
            },
            {
                "desc": "Benefits for IT Specialist",
                "amount": Decimal("24000.00"),
                "justification": "Full benefits package required to recruit qualified IT talent.",
                "tco": "37% of $65,000 salary. Competitive benefits essential for IT hiring."
            },
        ],
        "4000": [  # Books, Supplies, Materials (~$25K target)
            {
                "desc": "Lab Supplies - Chemistry Consumables",
                "amount": Decimal("3500.00"),
                "justification": "Annual consumable supplies for chemistry laboratory courses.",
                "tco": "Annual recurring. Based on 15 lab sections × $233/section."
            },
            {
                "desc": "Textbooks - Library Reserve Collection",
                "amount": Decimal("4200.00"),
                "justification": "High-cost textbooks for student lending to reduce financial barriers.",
                "tco": "42 titles × $100 average. One-time with 3-year replacement cycle."
            },
            {
                "desc": "Art Supplies - Studio Courses",
                "amount": Decimal("2800.00"),
                "justification": "Consumable art supplies for studio art courses (clay, paint, canvas).",
                "tco": "Annual recurring. $400/section × 7 studio sections."
            },
            {
                "desc": "Office Supplies - Department Operations",
                "amount": Decimal("1500.00"),
                "justification": "General office and instructional supplies for department operations.",
                "tco": "Annual allocation based on historical usage."
            },
            {
                "desc": "Safety Equipment - Biology Lab",
                "amount": Decimal("2100.00"),
                "justification": "Safety goggles, lab coats, and first aid supplies for biology labs.",
                "tco": "Initial outfitting plus annual replacement of 20% of inventory."
            },
            {
                "desc": "OER Course Materials Development",
                "amount": Decimal("5000.00"),
                "justification": "Faculty stipends for creating Open Educational Resources to reduce student costs.",
                "tco": "$1000/course × 5 courses. Addresses textbook affordability equity gap."
            },
            {
                "desc": "Nursing Simulation Consumables",
                "amount": Decimal("6500.00"),
                "justification": "Consumable supplies for simulation scenarios (IV tubing, syringes, moulage).",
                "tco": "Annual recurring. Essential for BRN-required simulation hours."
            },
        ],
        "5000": [  # Services & Operating Expenses (~$55K target)
            {
                "desc": "Software Licenses - Adobe Creative Cloud (50 seats)",
                "amount": Decimal("8200.00"),
                "justification": "Annual licenses for instructional software in graphic design courses.",
                "tco": "50 seats × $164/year. Annual subscription renewal required."
            },
            {
                "desc": "Cloud Computing Credits - AWS Academy",
                "amount": Decimal("8500.00"),
                "justification": "AWS credits for hands-on cloud computing training and certification prep.",
                "tco": "Per-student allocation of $170 × 50 students. Semester-based."
            },
            {
                "desc": "Certification Vouchers - CompTIA (50 students)",
                "amount": Decimal("12500.00"),
                "justification": "Subsidize industry certification exams to improve student employability.",
                "tco": "$250/voucher × 50 students. Addresses equity barrier to certification."
            },
            {
                "desc": "Equipment Maintenance - Annual Contract",
                "amount": Decimal("6000.00"),
                "justification": "Service contract for laboratory equipment maintenance and repair.",
                "tco": "Annual contract covering preventive maintenance and emergency repairs."
            },
            {
                "desc": "Professional Development - Conference Registration",
                "amount": Decimal("3500.00"),
                "justification": "Faculty attendance at discipline-specific professional conferences.",
                "tco": "5 faculty × $700 average registration. Supports ACCJC Standard III.A.14."
            },
            {
                "desc": "Tutoring Software - Online Platform",
                "amount": Decimal("4500.00"),
                "justification": "Annual license for online tutoring platform to serve distance learners.",
                "tco": "Institutional license. Extends tutoring access beyond campus hours."
            },
            {
                "desc": "NCLEX Review Course - Nursing Students",
                "amount": Decimal("9000.00"),
                "justification": "Comprehensive NCLEX preparation course for graduating nursing cohort.",
                "tco": "$150/student × 60 students. Critical for maintaining 89% pass rate."
            },
            {
                "desc": "Marketing & Outreach - Program Recruitment",
                "amount": Decimal("3000.00"),
                "justification": "Recruitment materials and community outreach for underrepresented populations.",
                "tco": "Print materials, community event fees, social media promotion."
            },
        ],
        "6000": [  # Capital Outlay (~$150K target)
            {
                "desc": "Laboratory Equipment - Spectrophotometers (2 units)",
                "amount": Decimal("18000.00"),
                "justification": "Replace aging spectrophotometers in chemistry lab for accurate analysis.",
                "tco": "One-time purchase. 10-year expected lifespan. $1,000/year maintenance."
            },
            {
                "desc": "Computer Lab Refresh (25 workstations)",
                "amount": Decimal("35000.00"),
                "justification": "Update computer lab with current technology to run modern software.",
                "tco": "$1,400/workstation. 5-year refresh cycle. Includes monitors and peripherals."
            },
            {
                "desc": "Simulation Mannequin - High-Fidelity",
                "amount": Decimal("45000.00"),
                "justification": "High-fidelity simulation equipment for nursing clinical preparation.",
                "tco": "One-time purchase. BRN requirement. 7-year lifespan with $3,000/year maintenance."
            },
            {
                "desc": "Classroom Technology Upgrade",
                "amount": Decimal("15000.00"),
                "justification": "Smart board, document camera, and presentation equipment for active learning.",
                "tco": "Upgrade 3 classrooms @ $5,000 each. Supports hybrid instruction."
            },
            {
                "desc": "Microscopes - Compound (10 units)",
                "amount": Decimal("12000.00"),
                "justification": "Replace aging microscopes in biology lab for improved student experience.",
                "tco": "$1,200/unit × 10 units. 15-year expected lifespan."
            },
            {
                "desc": "Networking Equipment - Cisco Lab",
                "amount": Decimal("28000.00"),
                "justification": "Current routers and switches for CCNA certification preparation.",
                "tco": "Cisco equipment for hands-on networking lab. 5-year technology cycle."
            },
        ],
    }

    # Priority distribution: Critical(1)=25%, High(2)=35%, Medium(3)=25%, Low(4)=15%
    priority_weights = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4]

    requests_created = 0
    total_amount = Decimal("0.00")
    total_funded = Decimal("0.00")
    object_code_counts = {code: 0 for code in resource_templates.keys()}

    for plan in plans:
        # Determine number of resources based on plan status
        if plan.status == ActionPlanStatus.NOT_STARTED:
            num_resources = random.randint(0, 2)
        elif plan.status == ActionPlanStatus.ONGOING:
            num_resources = random.randint(1, 3)
        else:
            num_resources = random.randint(1, 2)

        if num_resources == 0:
            continue

        # Select random object codes, preferring underrepresented ones
        underrep_codes = [c for c, count in object_code_counts.items() if count < 5]
        if underrep_codes and random.random() > 0.3:
            object_codes = random.sample(underrep_codes, min(num_resources, len(underrep_codes)))
        else:
            object_codes = random.sample(list(resource_templates.keys()), min(num_resources, len(resource_templates)))

        for obj_code in object_codes:
            templates = resource_templates[obj_code]
            template = random.choice(templates)
            desc = template["desc"]
            amount = template["amount"]
            justification = template["justification"]
            tco_notes = template["tco"]

            # Check if similar request exists
            existing = session.exec(
                select(ResourceRequest).where(
                    ResourceRequest.action_plan_id == plan.id,
                    ResourceRequest.description == desc
                )
            ).first()

            if existing:
                continue

            # Determine funding status: 25% fully funded, 15% partially funded, 60% unfunded
            fund_rand = random.random()
            if fund_rand < 0.25:
                is_funded = True
                funded_amount = amount
            elif fund_rand < 0.40:
                is_funded = True
                funded_amount = amount * Decimal(str(random.uniform(0.5, 0.9)))
            else:
                is_funded = False
                funded_amount = None

            # Assign priority based on weighted distribution
            priority = random.choice(priority_weights)

            request = ResourceRequest(
                action_plan_id=plan.id,
                object_code=obj_code,
                description=desc,
                amount=amount,
                justification=justification,
                tco_notes=tco_notes,
                priority=priority,
                is_funded=is_funded,
                funded_amount=funded_amount.quantize(Decimal("0.01")) if funded_amount else None,
            )
            session.add(request)
            requests_created += 1
            total_amount += amount
            if funded_amount:
                total_funded += funded_amount.quantize(Decimal("0.01"))
            object_code_counts[obj_code] += 1

    session.commit()

    # Print summary
    print(f"Created {requests_created} diverse resource requests across all object codes")
    print(f"  Total Requested: ${total_amount:,.2f}")
    print(f"  Total Funded: ${total_funded:,.2f}")
    print(f"  Object Code Distribution:")
    for code, count in sorted(object_code_counts.items()):
        code_names = {
            "1000": "Academic Salaries",
            "2000": "Classified Salaries",
            "3000": "Employee Benefits",
            "4000": "Books/Supplies",
            "5000": "Services/Operating",
            "6000": "Capital Outlay"
        }
        print(f"    {code} ({code_names[code]}): {count} requests")


def seed_validation_scores(session: Session):
    """Add PROC validation scores for VALIDATED and APPROVED reviews."""

    # Get PROC user
    proc_user = session.exec(
        select(User).where(User.role == UserRole.PROC)
    ).first()

    if not proc_user:
        print("No PROC user found, skipping validation scores")
        return

    # Get reviews that need validation scores
    reviews = session.exec(
        select(ProgramReview).where(
            ProgramReview.status.in_([ReviewStatus.VALIDATED, ReviewStatus.APPROVED])
        )
    ).all()

    scores_created = 0

    for review in reviews:
        # Check if validation already exists
        existing = session.exec(
            select(ValidationScore).where(ValidationScore.review_id == review.id)
        ).first()

        if existing:
            continue

        # Generate rubric scores
        rubric_scores = {
            "data_analysis": random.randint(3, 5),
            "equity_focus": random.randint(3, 5),
            "ismp_alignment": random.randint(3, 5),
            "slo_assessment": random.randint(3, 5),
            "action_plans": random.randint(3, 5),
            "resource_justification": random.randint(3, 5),
            "narrative_clarity": random.randint(3, 5),
            "evidence_quality": random.randint(3, 5),
            "completeness": random.randint(4, 5),
            "accjc_compliance": random.randint(3, 5),
        }

        comments_options = [
            "Strong submission with clear alignment to ISMP goals. Recommend approval.",
            "Well-documented equity analysis with actionable plans. Minor revisions suggested for resource justification.",
            "Comprehensive review meeting all ACCJC standards. Excellent data analysis.",
            "Good work on curriculum alignment. Consider expanding SLO assessment discussion.",
            "Thorough equity analysis with appropriate action plans. Ready for approval.",
        ]

        validation = ValidationScore(
            review_id=review.id,
            validator_id=proc_user.id,
            rubric_scores=rubric_scores,
            comments=random.choice(comments_options),
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 60)),
        )
        session.add(validation)
        scores_created += 1

    session.commit()
    print(f"Created {scores_created} validation scores")


def seed_audit_trail(session: Session):
    """Populate audit trail with historical actions."""

    # Get all users
    users = session.exec(select(User)).all()
    user_ids = [u.id for u in users]

    # Get all reviews
    reviews = session.exec(select(ProgramReview)).all()

    # Get all action plans
    plans = session.exec(select(ActionPlan)).all()

    audit_entries = []

    # Review-related audits
    for review in reviews:
        base_date = review.created_at

        # Created event
        audit_entries.append({
            "entity_type": "program_review",
            "entity_id": review.id,
            "action": AuditAction.CREATED,
            "user_id": review.author_id,
            "new_values": {"status": "draft", "cycle_year": review.cycle_year},
            "description": f"Created {review.cycle_year} program review",
            "created_at": base_date,
        })

        # Status progression audits
        if review.status != ReviewStatus.DRAFT:
            audit_entries.append({
                "entity_type": "program_review",
                "entity_id": review.id,
                "action": AuditAction.SUBMITTED,
                "user_id": review.author_id,
                "old_values": {"status": "draft"},
                "new_values": {"status": "in_review"},
                "description": "Submitted review for validation",
                "created_at": base_date + timedelta(days=random.randint(14, 45)),
            })

        if review.status in [ReviewStatus.VALIDATED, ReviewStatus.APPROVED]:
            audit_entries.append({
                "entity_type": "program_review",
                "entity_id": review.id,
                "action": AuditAction.STATUS_CHANGED,
                "user_id": random.choice(user_ids),
                "old_values": {"status": "in_review"},
                "new_values": {"status": "validated"},
                "description": "PROC validated review",
                "created_at": base_date + timedelta(days=random.randint(45, 75)),
            })

        if review.status == ReviewStatus.APPROVED:
            audit_entries.append({
                "entity_type": "program_review",
                "entity_id": review.id,
                "action": AuditAction.APPROVED,
                "user_id": random.choice(user_ids),
                "old_values": {"status": "validated"},
                "new_values": {"status": "approved"},
                "description": "Review approved by administration",
                "created_at": base_date + timedelta(days=random.randint(75, 120)),
            })

        # Section edit audits
        for i in range(random.randint(1, 5)):
            audit_entries.append({
                "entity_type": "review_section",
                "entity_id": review.id,
                "action": AuditAction.UPDATED,
                "user_id": review.author_id,
                "old_values": None,
                "new_values": {"section": random.choice(["program_overview", "student_success", "equity_analysis"])},
                "description": "Updated section content",
                "created_at": base_date + timedelta(days=random.randint(1, 30)),
            })

    # Action plan audits
    for plan in plans:
        audit_entries.append({
            "entity_type": "action_plan",
            "entity_id": plan.id,
            "action": AuditAction.CREATED,
            "user_id": random.choice(user_ids),
            "new_values": {"title": plan.title, "status": "not_started"},
            "description": f"Created action plan: {plan.title[:50]}",
            "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 180)),
        })

        if plan.status != ActionPlanStatus.NOT_STARTED:
            audit_entries.append({
                "entity_type": "action_plan",
                "entity_id": plan.id,
                "action": AuditAction.STATUS_CHANGED,
                "user_id": random.choice(user_ids),
                "old_values": {"status": "not_started"},
                "new_values": {"status": plan.status.value},
                "description": f"Updated action plan status to {plan.status.value}",
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
            })

    # Insert audits
    entries_created = 0
    for entry_data in audit_entries:
        # Check for duplicates
        existing = session.exec(
            select(AuditTrail).where(
                AuditTrail.entity_type == entry_data["entity_type"],
                AuditTrail.entity_id == entry_data["entity_id"],
                AuditTrail.action == entry_data["action"],
                AuditTrail.description == entry_data["description"]
            )
        ).first()

        if not existing:
            audit = AuditTrail(**entry_data)
            session.add(audit)
            entries_created += 1

    session.commit()
    print(f"Created {entries_created} audit trail entries")


def seed_complete_workflows(session: Session):
    """
    Seed reviews demonstrating complete workflows for each status.

    Creates 4 reviews, one for each status:
    1. DRAFT workflow (incomplete) - Workflow Demo: Draft
    2. IN_REVIEW workflow (submitted, awaiting validation) - Workflow Demo: In Review
    3. VALIDATED workflow (validated, awaiting approval) - Workflow Demo: Validated
    4. APPROVED workflow (complete Golden Thread) - Workflow Demo: Approved
    """

    print("\n--- Seeding Complete Workflow Examples ---")

    # Get organizations
    math_dept = session.exec(
        select(Organization).where(Organization.name == "Mathematics")
    ).first()
    english_dept = session.exec(
        select(Organization).where(Organization.name == "English")
    ).first()
    bio_dept = session.exec(
        select(Organization).where(Organization.name == "Biology")
    ).first()
    nursing_dept = session.exec(
        select(Organization).where(Organization.name == "Nursing")
    ).first()

    # Get users
    faculty_user = session.exec(
        select(User).where(User.role == UserRole.FACULTY)
    ).first()
    chair_user = session.exec(
        select(User).where(User.role == UserRole.CHAIR)
    ).first()
    proc_user = session.exec(
        select(User).where(User.role == UserRole.PROC)
    ).first()
    admin_user = session.exec(
        select(User).where(User.role == UserRole.ADMIN)
    ).first()
    dean_user = session.exec(
        select(User).where(User.role == UserRole.DEAN)
    ).first()

    # Get initiatives for Golden Thread
    initiatives = {}
    for init in session.exec(select(StrategicInitiative)).all():
        initiatives[init.code] = init

    created_count = 0

    # ========================================
    # WORKFLOW 1: DRAFT (Incomplete)
    # ========================================
    if math_dept and faculty_user:
        existing = session.exec(
            select(ProgramReview).where(
                ProgramReview.org_id == math_dept.id,
                ProgramReview.cycle_year == "2025-2026",
                ProgramReview.review_type == ReviewType.ANNUAL,
                ProgramReview.status == ReviewStatus.DRAFT
            )
        ).first()

        if not existing:
            draft_review = ProgramReview(
                org_id=math_dept.id,
                author_id=faculty_user.id,
                cycle_year="2025-2026",
                review_type=ReviewType.ANNUAL,
                status=ReviewStatus.DRAFT,
                content={
                    "program_overview": "The Mathematics Department continues to serve as a cornerstone of STEM education at Community College. This annual review documents our progress on equity initiatives and AB 705 implementation.",
                    "student_success": "Preliminary data shows success rates holding steady at 68%. We are analyzing disaggregated data to identify areas for intervention.",
                },
                created_at=datetime.utcnow() - timedelta(days=14),
                updated_at=datetime.utcnow() - timedelta(days=2),
            )
            session.add(draft_review)
            session.commit()
            session.refresh(draft_review)
            created_count += 1

            # Add sections (3/6 completed as per spec)
            sections_data = [
                ("program_overview", SectionStatus.COMPLETED, "The Mathematics Department continues to serve as a cornerstone of STEM education at Community College."),
                ("student_success", SectionStatus.IN_PROGRESS, "Preliminary data shows success rates holding steady at 68%."),
                ("curriculum", SectionStatus.IN_PROGRESS, "Course alignment review in progress."),
                ("equity_analysis", SectionStatus.NOT_STARTED, ""),
                ("action_plans", SectionStatus.NOT_STARTED, ""),
                ("resource_needs", SectionStatus.NOT_STARTED, ""),
            ]

            for key, status, content in sections_data:
                section = ReviewSection(
                    review_id=draft_review.id,
                    section_key=key,
                    status=status,
                    content=content if content else None,
                    ai_drafts={},
                )
                session.add(section)

            # Audit trail for draft
            audit = AuditTrail(
                entity_type="program_review",
                entity_id=draft_review.id,
                action=AuditAction.CREATED,
                user_id=faculty_user.id,
                new_values={"status": "draft", "cycle_year": "2025-2026"},
                description="[Workflow Demo] Created draft review - Mathematics 2025-2026",
                created_at=datetime.utcnow() - timedelta(days=14),
            )
            session.add(audit)

            session.commit()
            print(f"  Created DRAFT workflow example: Mathematics 2025-2026 (3/6 sections)")

    # ========================================
    # WORKFLOW 2: IN_REVIEW (Submitted, Awaiting Validation)
    # ========================================
    if english_dept and faculty_user and chair_user:
        existing = session.exec(
            select(ProgramReview).where(
                ProgramReview.org_id == english_dept.id,
                ProgramReview.cycle_year == "2025-2026",
                ProgramReview.review_type == ReviewType.ANNUAL,
                ProgramReview.status == ReviewStatus.IN_REVIEW
            )
        ).first()

        if not existing:
            in_review = ProgramReview(
                org_id=english_dept.id,
                author_id=faculty_user.id,
                cycle_year="2025-2026",
                review_type=ReviewType.ANNUAL,
                status=ReviewStatus.IN_REVIEW,
                content={
                    "program_overview": "The English Department offers a robust curriculum in composition, literature, and creative writing. We serve approximately 3,000 students annually across composition sequences and literature courses.",
                    "student_success": "English 101 success rates at 71%, slightly above the state average. The stretch model shows promising results with 73% success rate.",
                    "curriculum": "Implemented stretch composition model per AB 705. Added technical writing certificate program. All SLOs assessed annually with 80% achievement rate.",
                    "equity_analysis": "Hispanic students perform at parity. African American student gap reduced by 3pp through targeted interventions. ESL students show strong improvement.",
                    "action_plans": "Expand Writing Center hours. Develop online writing tutoring. Create faculty learning community on equity-minded grading.",
                    "resource_needs": "Writing Center staffing. Technology for online tutoring. Professional development funding.",
                },
                submitted_at=datetime.utcnow() - timedelta(days=5),
                created_at=datetime.utcnow() - timedelta(days=45),
                updated_at=datetime.utcnow() - timedelta(days=5),
            )
            session.add(in_review)
            session.commit()
            session.refresh(in_review)
            created_count += 1

            # All 6 sections completed
            section_keys = ["program_overview", "student_success", "curriculum", "equity_analysis", "action_plans", "resource_needs"]
            for key in section_keys:
                content = in_review.content.get(key, "")
                section = ReviewSection(
                    review_id=in_review.id,
                    section_key=key,
                    status=SectionStatus.COMPLETED,
                    content=content,
                    ai_drafts={"suggestions": ["AI-assisted analysis available"]} if key == "equity_analysis" else {},
                )
                session.add(section)

            # Create 2 action plans (as per spec)
            plan1 = ActionPlan(
                review_id=in_review.id,
                title="Expand Writing Center Evening Hours",
                description="Increase Writing Center availability to evenings and weekends to serve working students and parents who cannot access traditional daytime hours.",
                status=ActionPlanStatus.NOT_STARTED,
                addresses_equity_gap=True,
                justification="Working students face barriers accessing traditional tutoring hours. Data shows 45% of students work full-time.",
            )
            session.add(plan1)
            session.commit()
            session.refresh(plan1)

            # Map to ISMP
            if "2.2" in initiatives:
                mapping = ActionPlanMapping(action_plan_id=plan1.id, initiative_id=initiatives["2.2"].id)
                session.add(mapping)
            if "3.1" in initiatives:
                mapping = ActionPlanMapping(action_plan_id=plan1.id, initiative_id=initiatives["3.1"].id)
                session.add(mapping)

            plan2 = ActionPlan(
                review_id=in_review.id,
                title="Online Writing Tutoring Platform",
                description="Develop asynchronous online writing tutoring to complement in-person services and reach students who cannot attend campus.",
                status=ActionPlanStatus.NOT_STARTED,
                addresses_equity_gap=True,
                justification="Online students have limited access to writing support services.",
            )
            session.add(plan2)
            session.commit()
            session.refresh(plan2)

            if "1.2" in initiatives:
                mapping = ActionPlanMapping(action_plan_id=plan2.id, initiative_id=initiatives["1.2"].id)
                session.add(mapping)

            # Audit trail
            audits = [
                AuditTrail(
                    entity_type="program_review",
                    entity_id=in_review.id,
                    action=AuditAction.CREATED,
                    user_id=faculty_user.id,
                    new_values={"status": "draft"},
                    description="[Workflow Demo] Created review - English 2025-2026",
                    created_at=datetime.utcnow() - timedelta(days=45),
                ),
                AuditTrail(
                    entity_type="program_review",
                    entity_id=in_review.id,
                    action=AuditAction.SUBMITTED,
                    user_id=faculty_user.id,
                    old_values={"status": "draft"},
                    new_values={"status": "in_review"},
                    description="[Workflow Demo] Submitted review for PROC validation",
                    created_at=datetime.utcnow() - timedelta(days=5),
                ),
            ]
            for audit in audits:
                session.add(audit)

            session.commit()
            print(f"  Created IN_REVIEW workflow example: English 2025-2026 (6/6 sections, 2 action plans)")

    # ========================================
    # WORKFLOW 3: VALIDATED (Awaiting Admin Approval)
    # ========================================
    if bio_dept and faculty_user and proc_user:
        existing = session.exec(
            select(ProgramReview).where(
                ProgramReview.org_id == bio_dept.id,
                ProgramReview.cycle_year == "2025-2026",
                ProgramReview.review_type == ReviewType.ANNUAL,
                ProgramReview.status == ReviewStatus.VALIDATED
            )
        ).first()

        if not existing:
            validated_review = ProgramReview(
                org_id=bio_dept.id,
                author_id=faculty_user.id,
                cycle_year="2025-2026",
                review_type=ReviewType.ANNUAL,
                status=ReviewStatus.VALIDATED,
                content={
                    "program_overview": "The Biology Department prepares students for transfer and careers in life sciences, healthcare, and biotechnology. Our program emphasizes hands-on laboratory experience.",
                    "student_success": "Overall success rate of 69%. Supplemental Instruction in BIOL 3 improved success by 8%. Anatomy & Physiology shows 74% success rate.",
                    "curriculum": "Updated all courses for C-ID alignment. Incorporated CURE modules. New biotechnology certificate in development. 78% SLO achievement.",
                    "equity_analysis": "Hispanic male students show 6pp gap in gateway biology courses. First-generation students underperform by 5pp. Targeted interventions showing promise.",
                    "action_plans": "Expand SI program. Develop online lab simulations. Partner with local hospitals for biotech internships.",
                    "resource_needs": "Lab equipment replacement. SI leader stipends. Simulation software licenses.",
                },
                submitted_at=datetime.utcnow() - timedelta(days=30),
                validated_at=datetime.utcnow() - timedelta(days=7),
                created_at=datetime.utcnow() - timedelta(days=90),
                updated_at=datetime.utcnow() - timedelta(days=7),
            )
            session.add(validated_review)
            session.commit()
            session.refresh(validated_review)
            created_count += 1

            # All sections completed
            section_keys = ["program_overview", "student_success", "curriculum", "equity_analysis", "action_plans", "resource_needs"]
            for key in section_keys:
                content = validated_review.content.get(key, "")
                section = ReviewSection(
                    review_id=validated_review.id,
                    section_key=key,
                    status=SectionStatus.COMPLETED,
                    content=content,
                    ai_drafts={},
                )
                session.add(section)

            # Create 3 action plans with ISMP mappings
            plans_data = [
                ("Expand Supplemental Instruction to All Gateway Courses", "Establish SI program for all high-enrollment gateway courses with historically low success rates.", True, "Data shows disproportionate impact for first-gen students in gateway biology courses.", ["3.1", "3.3"]),
                ("Develop Hybrid Lab Simulations", "Create online lab simulation modules to supplement in-person lab experience and provide additional practice.", False, None, ["1.2", "2.4"]),
                ("Partner with Healthcare Facilities", "Establish formal partnerships with local hospitals and biotech companies for student internships and mentoring.", True, "Underrepresented students lack professional networking opportunities.", ["1.4", "2.3"]),
            ]

            for title, desc, equity, just, codes in plans_data:
                plan = ActionPlan(
                    review_id=validated_review.id,
                    title=title,
                    description=desc,
                    status=ActionPlanStatus.ONGOING,
                    addresses_equity_gap=equity,
                    justification=just,
                )
                session.add(plan)
                session.commit()
                session.refresh(plan)

                for code in codes:
                    if code in initiatives:
                        mapping = ActionPlanMapping(action_plan_id=plan.id, initiative_id=initiatives[code].id)
                        session.add(mapping)

            # Validation scores
            validation = ValidationScore(
                review_id=validated_review.id,
                validator_id=proc_user.id,
                rubric_scores={
                    "data_analysis": 4,
                    "equity_focus": 5,
                    "ismp_alignment": 4,
                    "slo_assessment": 4,
                    "action_plans": 5,
                    "resource_justification": 4,
                    "narrative_clarity": 4,
                    "evidence_quality": 4,
                    "completeness": 5,
                    "accjc_compliance": 4,
                },
                comments="[Workflow Demo] Strong submission with excellent equity focus. SI program shows measurable impact. Recommend approval.",
                created_at=datetime.utcnow() - timedelta(days=7),
            )
            session.add(validation)

            # Audit trail
            audits = [
                AuditTrail(
                    entity_type="program_review",
                    entity_id=validated_review.id,
                    action=AuditAction.CREATED,
                    user_id=faculty_user.id,
                    new_values={"status": "draft"},
                    description="[Workflow Demo] Created review - Biology 2025-2026",
                    created_at=datetime.utcnow() - timedelta(days=90),
                ),
                AuditTrail(
                    entity_type="program_review",
                    entity_id=validated_review.id,
                    action=AuditAction.SUBMITTED,
                    user_id=faculty_user.id,
                    old_values={"status": "draft"},
                    new_values={"status": "in_review"},
                    description="[Workflow Demo] Submitted review for validation",
                    created_at=datetime.utcnow() - timedelta(days=30),
                ),
                AuditTrail(
                    entity_type="program_review",
                    entity_id=validated_review.id,
                    action=AuditAction.STATUS_CHANGED,
                    user_id=proc_user.id,
                    old_values={"status": "in_review"},
                    new_values={"status": "validated"},
                    description="[Workflow Demo] PROC validated review with rubric scores",
                    created_at=datetime.utcnow() - timedelta(days=7),
                ),
            ]
            for audit in audits:
                session.add(audit)

            session.commit()
            print(f"  Created VALIDATED workflow example: Biology 2025-2026 (6/6 sections, 3 action plans, PROC scores)")

    # ========================================
    # WORKFLOW 4: APPROVED (Complete Golden Thread)
    # ========================================
    if nursing_dept and faculty_user and proc_user and admin_user and dean_user:
        existing = session.exec(
            select(ProgramReview).where(
                ProgramReview.org_id == nursing_dept.id,
                ProgramReview.cycle_year == "2024-2025",
                ProgramReview.review_type == ReviewType.COMPREHENSIVE,
                ProgramReview.status == ReviewStatus.APPROVED
            )
        ).first()

        if not existing:
            approved_review = ProgramReview(
                org_id=nursing_dept.id,
                author_id=faculty_user.id,
                cycle_year="2024-2025",
                review_type=ReviewType.COMPREHENSIVE,
                status=ReviewStatus.APPROVED,
                content={
                    "program_overview": "The Community College Nursing Program is a BRN-approved ADN program preparing students for NCLEX-RN. We maintain 95% job placement rate and strong partnerships with 8 healthcare facilities. Our simulation lab provides hands-on training with high-fidelity mannequins. We serve 120 nursing students annually.",
                    "student_success": "NCLEX first-attempt pass rate of 89%, exceeding state average of 82%. Retention rate of 92% for admitted students. Clinical evaluations show 95% employer satisfaction. 95% of students achieve program SLOs.",
                    "curriculum": "Updated curriculum for new NCLEX-RN format. Integrated telehealth competencies. Enhanced simulation-based learning. All courses meet BRN requirements. Clinical rotations at 8 partner facilities.",
                    "equity_analysis": "Program serves diverse population: 68% Hispanic/Latino, 15% Asian, 12% White, 5% African American. No significant equity gaps across demographics. Working adult pathway shows strong outcomes.",
                    "action_plans": "Expand clinical partnerships. Develop evening/weekend cohort. Upgrade simulation equipment. Create LVN-to-RN bridge program. Implement telehealth training module.",
                    "resource_needs": "High-fidelity simulation mannequin. Additional clinical instructor. Simulation consumables. Skills lab equipment. Telehealth training software.",
                },
                submitted_at=datetime.utcnow() - timedelta(days=120),
                validated_at=datetime.utcnow() - timedelta(days=90),
                approved_at=datetime.utcnow() - timedelta(days=60),
                created_at=datetime.utcnow() - timedelta(days=180),
                updated_at=datetime.utcnow() - timedelta(days=60),
            )
            session.add(approved_review)
            session.commit()
            session.refresh(approved_review)
            created_count += 1

            # All sections completed
            section_keys = ["program_overview", "student_success", "curriculum", "equity_analysis", "action_plans", "resource_needs"]
            for key in section_keys:
                content = approved_review.content.get(key, "")
                section = ReviewSection(
                    review_id=approved_review.id,
                    section_key=key,
                    status=SectionStatus.COMPLETED,
                    content=content,
                    ai_drafts={"suggestions": ["AI analysis completed"]} if key in ["equity_analysis", "student_success"] else {},
                )
                session.add(section)

            # Create 5 action plans with ISMP mappings (Golden Thread)
            plans_data = [
                ("Expand Clinical Partnership Network", "Establish partnerships with additional healthcare facilities to increase clinical rotation capacity and student placement opportunities.", False, None, ActionPlanStatus.COMPLETE, ["1.4", "2.3"]),
                ("Evening/Weekend Nursing Cohort", "Develop alternative scheduling pathway for working adults to complete nursing program through evening and weekend courses.", True, "Working adults face barriers to traditional daytime program format.", ActionPlanStatus.ONGOING, ["1.2", "3.3"]),
                ("High-Fidelity Simulation Upgrade", "Replace aging simulation mannequins with current high-fidelity technology to improve clinical preparation.", False, None, ActionPlanStatus.COMPLETE, ["2.4", "4.2"]),
                ("LVN-to-RN Bridge Program", "Create accelerated pathway for Licensed Vocational Nurses to complete ADN requirements.", True, "LVN workforce predominantly Hispanic/Latino with barriers to advancement.", ActionPlanStatus.ONGOING, ["1.3", "3.1"]),
                ("Telehealth Competency Integration", "Integrate telehealth technology and competencies throughout curriculum to prepare students for modern healthcare delivery.", False, None, ActionPlanStatus.INSTITUTIONALIZED, ["1.3", "4.2"]),
            ]

            created_plans = []
            for title, desc, equity, just, plan_status, codes in plans_data:
                plan = ActionPlan(
                    review_id=approved_review.id,
                    title=title,
                    description=desc,
                    status=plan_status,
                    addresses_equity_gap=equity,
                    justification=just,
                )
                session.add(plan)
                session.commit()
                session.refresh(plan)
                created_plans.append(plan)

                for code in codes:
                    if code in initiatives:
                        mapping = ActionPlanMapping(action_plan_id=plan.id, initiative_id=initiatives[code].id)
                        session.add(mapping)

            # Create 8 resource requests covering all object codes (Golden Thread completion)
            resources_data = [
                (created_plans[0], "1000", "Clinical Instructor - Full-time Position", Decimal("75000.00"), "Staff new clinical rotations at partner facilities.", True, Decimal("75000.00")),
                (created_plans[0], "3000", "Benefits for Clinical Instructor", Decimal("28000.00"), "Benefits package at 37% of salary.", True, Decimal("28000.00")),
                (created_plans[1], "2000", "Evening Lab Technician (20 hrs/week)", Decimal("24000.00"), "Support evening simulation lab hours.", True, Decimal("24000.00")),
                (created_plans[2], "6000", "High-Fidelity Simulation Mannequin (2 units)", Decimal("90000.00"), "Replace aging simulation equipment.", True, Decimal("85000.00")),
                (created_plans[2], "4000", "Simulation Consumables and Supplies", Decimal("8500.00"), "Annual consumables for simulation scenarios.", True, Decimal("8500.00")),
                (created_plans[3], "5000", "Bridge Program Marketing and Outreach", Decimal("5000.00"), "Recruitment materials and community outreach.", False, None),
                (created_plans[4], "5000", "Telehealth Software Licenses", Decimal("12000.00"), "Annual licenses for telehealth training platform.", True, Decimal("12000.00")),
                (created_plans[4], "6000", "Telehealth Equipment Kit", Decimal("15000.00"), "Cameras, monitors, and peripherals for telehealth stations.", True, Decimal("15000.00")),
            ]

            priority = 1
            for plan, obj_code, desc, amount, justification, is_funded, funded_amt in resources_data:
                request = ResourceRequest(
                    action_plan_id=plan.id,
                    object_code=obj_code,
                    description=desc,
                    amount=amount,
                    justification=justification,
                    tco_notes="Based on current pricing; approved by Dean",
                    priority=priority,
                    is_funded=is_funded,
                    funded_amount=funded_amt,
                )
                session.add(request)
                priority += 1

            # Validation scores
            validation = ValidationScore(
                review_id=approved_review.id,
                validator_id=proc_user.id,
                rubric_scores={
                    "data_analysis": 5,
                    "equity_focus": 5,
                    "ismp_alignment": 5,
                    "slo_assessment": 5,
                    "action_plans": 5,
                    "resource_justification": 5,
                    "narrative_clarity": 5,
                    "evidence_quality": 5,
                    "completeness": 5,
                    "accjc_compliance": 5,
                },
                comments="[Workflow Demo] Exemplary comprehensive review. Strong NCLEX outcomes, excellent equity focus, complete Golden Thread documentation. Highly recommend approval.",
                created_at=datetime.utcnow() - timedelta(days=90),
            )
            session.add(validation)

            # Complete audit trail
            audits = [
                AuditTrail(
                    entity_type="program_review",
                    entity_id=approved_review.id,
                    action=AuditAction.CREATED,
                    user_id=faculty_user.id,
                    new_values={"status": "draft", "review_type": "comprehensive"},
                    description="[Workflow Demo] Created comprehensive review - Nursing 2024-2025",
                    created_at=datetime.utcnow() - timedelta(days=180),
                ),
                AuditTrail(
                    entity_type="program_review",
                    entity_id=approved_review.id,
                    action=AuditAction.SUBMITTED,
                    user_id=faculty_user.id,
                    old_values={"status": "draft"},
                    new_values={"status": "in_review"},
                    description="[Workflow Demo] Submitted for PROC validation",
                    created_at=datetime.utcnow() - timedelta(days=120),
                ),
                AuditTrail(
                    entity_type="program_review",
                    entity_id=approved_review.id,
                    action=AuditAction.STATUS_CHANGED,
                    user_id=proc_user.id,
                    old_values={"status": "in_review"},
                    new_values={"status": "validated"},
                    description="[Workflow Demo] PROC validated with perfect rubric scores",
                    created_at=datetime.utcnow() - timedelta(days=90),
                ),
                AuditTrail(
                    entity_type="program_review",
                    entity_id=approved_review.id,
                    action=AuditAction.APPROVED,
                    user_id=admin_user.id,
                    old_values={"status": "validated"},
                    new_values={"status": "approved"},
                    description="[Workflow Demo] Approved by administration",
                    created_at=datetime.utcnow() - timedelta(days=60),
                ),
                AuditTrail(
                    entity_type="resource_request",
                    entity_id=approved_review.id,
                    action=AuditAction.STATUS_CHANGED,
                    user_id=dean_user.id,
                    old_values={"funded": False},
                    new_values={"funded": True, "funded_amount": 247500},
                    description="[Workflow Demo] Dean approved resource funding ($247,500)",
                    created_at=datetime.utcnow() - timedelta(days=45),
                ),
            ]
            for audit in audits:
                session.add(audit)

            session.commit()
            print(f"  Created APPROVED workflow example: Nursing 2024-2025 (Complete Golden Thread)")
            print(f"    - 6/6 sections completed")
            print(f"    - 5 action plans with ISMP mappings")
            print(f"    - 8 resource requests (all object codes)")
            print(f"    - Validation scores (perfect 5/5)")
            print(f"    - Full audit trail (create → submit → validate → approve → fund)")

    print(f"\n  Total workflow examples created: {created_count}")
    return created_count


def verify_golden_thread(session: Session):
    """
    Verify complete Golden Thread for APPROVED review.

    Mission (CCC) → ISMP Goals → Action Plans → Program Review → Resource Requests
    """
    print("\n--- Verifying Golden Thread ---")

    # Find the approved workflow example
    nursing_dept = session.exec(
        select(Organization).where(Organization.name == "Nursing")
    ).first()

    if not nursing_dept:
        print("  Nursing department not found")
        return

    approved_review = session.exec(
        select(ProgramReview).where(
            ProgramReview.org_id == nursing_dept.id,
            ProgramReview.status == ReviewStatus.APPROVED,
            ProgramReview.cycle_year == "2024-2025"
        )
    ).first()

    if not approved_review:
        print("  Approved workflow review not found")
        return

    print(f"  Review: {nursing_dept.name} {approved_review.cycle_year}")
    print(f"  Status: {approved_review.status.value}")

    # Get action plans
    plans = session.exec(
        select(ActionPlan).where(ActionPlan.review_id == approved_review.id)
    ).all()
    print(f"  Action Plans: {len(plans)}")

    # Get mappings and resources
    total_mappings = 0
    total_resources = 0
    total_funded = Decimal("0.00")

    for plan in plans:
        mappings = session.exec(
            select(ActionPlanMapping).where(ActionPlanMapping.action_plan_id == plan.id)
        ).all()
        total_mappings += len(mappings)

        resources = session.exec(
            select(ResourceRequest).where(ResourceRequest.action_plan_id == plan.id)
        ).all()
        total_resources += len(resources)

        for res in resources:
            if res.funded_amount:
                total_funded += res.funded_amount

    print(f"  ISMP Mappings: {total_mappings}")
    print(f"  Resource Requests: {total_resources}")
    print(f"  Total Funded: ${total_funded:,.2f}")

    # Verify validation
    validation = session.exec(
        select(ValidationScore).where(ValidationScore.review_id == approved_review.id)
    ).first()

    if validation:
        avg_score = sum(validation.rubric_scores.values()) / len(validation.rubric_scores)
        print(f"  Validation Score: {avg_score:.1f}/5.0")

    print("  ✅ Golden Thread verified complete!")


def main():
    """Run comprehensive seed functions."""
    print("=" * 60)
    print("COMPREHENSIVE SEED SCRIPT")
    print("=" * 60)

    print("\nCreating database tables...")
    create_db_and_tables()

    with Session(engine) as session:
        print("\n--- Phase 1: Base Data ---")
        print("\nSeeding organizations...")
        seed_organizations(session)

        print("\nSeeding base users...")
        seed_base_users(session)

        print("\nSeeding additional users...")
        seed_additional_users(session)

        print("\nSeeding strategic initiatives...")
        seed_strategic_initiatives(session)

        print("\nSeeding enrollment data...")
        seed_enrollment_data(session)

        print("\n--- Phase 2: Comprehensive Reviews ---")
        print("\nSeeding comprehensive program reviews...")
        seed_comprehensive_reviews(session)

        print("\n--- Phase 3: Action Plans & Resources ---")
        print("\nSeeding diverse action plans...")
        seed_diverse_action_plans(session)

        print("\nSeeding diverse resource requests...")
        seed_diverse_resources(session)

        print("\n--- Phase 4: Validation & Audit ---")
        print("\nSeeding validation scores...")
        seed_validation_scores(session)

        print("\nSeeding audit trail...")
        seed_audit_trail(session)

        print("\n--- Phase 5: Workflow Examples ---")
        print("\nSeeding complete workflow examples...")
        seed_complete_workflows(session)

        print("\nVerifying Golden Thread...")
        verify_golden_thread(session)

        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)

        # Count records
        review_count = len(session.exec(select(ProgramReview)).all())
        plan_count = len(session.exec(select(ActionPlan)).all())
        resource_count = len(session.exec(select(ResourceRequest)).all())
        validation_count = len(session.exec(select(ValidationScore)).all())
        audit_count = len(session.exec(select(AuditTrail)).all())
        user_count = len(session.exec(select(User)).all())

        print(f"\nTotal Users: {user_count}")
        print(f"Total Program Reviews: {review_count}")
        print(f"Total Action Plans: {plan_count}")
        print(f"Total Resource Requests: {resource_count}")
        print(f"Total Validation Scores: {validation_count}")
        print(f"Total Audit Entries: {audit_count}")

    print("\n" + "=" * 60)
    print("SEED COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    main()
