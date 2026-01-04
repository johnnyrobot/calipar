"""
Demo mode seed script.

Creates a fresh set of demo data that is reset daily.
This script is called by the demo mode reset mechanism.
"""

from datetime import datetime, timedelta
from decimal import Decimal
from sqlmodel import Session, select

from database import engine
from services.demo_mode import get_demo_engine
from models.user import User, UserRole
from models.organization import Organization, OrganizationType
from models.strategic_initiative import StrategicInitiative
from models.program_review import ProgramReview, ReviewSection, ReviewStatus, ReviewType, SectionStatus
from models.action_plan import ActionPlan, ActionPlanMapping, ActionPlanStatus
from models.resource_request import ResourceRequest
from models.validation import ValidationScore
from models.audit import AuditTrail, AuditAction


def seed_demo_data():
    """
    Seed the demo database with fresh demo data.

    This creates a complete, self-contained demo environment with:
    - 5 demo users (Faculty, Chair, Dean, Admin, PROC)
    - 1 organization hierarchy (College -> Division -> Department)
    - 5 ISMP strategic initiatives
    - 4 program reviews (one for each status: DRAFT, IN_REVIEW, VALIDATED, APPROVED)
    - Action plans with ISMP mappings (Golden Thread)
    - Resource requests
    - Validation scores
    - Audit trail
    """

    # Get the demo engine
    demo_engine = get_demo_engine()

    if not demo_engine:
        print("Demo mode not enabled, skipping demo data seed")
        return

    with Session(demo_engine) as session:
        print("\n=== Seeding Demo Data ===")

        # ========================================
        # 1. Create Organizations
        # ========================================
        print("\nCreating organizations...")

        college = Organization(
            name="Community College",
            type=OrganizationType.COLLEGE,
            parent_id=None,
        )
        session.add(college)
        session.commit()
        session.refresh(college)

        academic_affairs = Organization(
            name="Academic Affairs",
            type=OrganizationType.DIVISION,
            parent_id=college.id,
        )
        session.add(academic_affairs)
        session.commit()
        session.refresh(academic_affairs)

        mathematics = Organization(
            name="Mathematics",
            type=OrganizationType.DEPARTMENT,
            parent_id=academic_affairs.id,
        )
        session.add(mathematics)
        session.commit()
        session.refresh(mathematics)

        english = Organization(
            name="English",
            type=OrganizationType.DEPARTMENT,
            parent_id=academic_affairs.id,
        )
        session.add(english)
        session.commit()

        print(f"  Created 4 organizations")

        # ========================================
        # 2. Create Demo Users
        # ========================================
        print("\nCreating demo users...")

        demo_users = [
            {
                "firebase_uid": "demo-faculty-001",
                "email": "demo-faculty@ccc.edu",
                "full_name": "Demo Faculty User",
                "role": UserRole.FACULTY,
                "department_id": mathematics.id,
            },
            {
                "firebase_uid": "demo-chair-001",
                "email": "demo-chair@ccc.edu",
                "full_name": "Demo Chair User",
                "role": UserRole.CHAIR,
                "department_id": mathematics.id,
            },
            {
                "firebase_uid": "demo-dean-001",
                "email": "demo-dean@ccc.edu",
                "full_name": "Demo Dean User",
                "role": UserRole.DEAN,
                "department_id": None,
            },
            {
                "firebase_uid": "demo-admin-001",
                "email": "demo-admin@ccc.edu",
                "full_name": "Demo Admin User",
                "role": UserRole.ADMIN,
                "department_id": None,
            },
            {
                "firebase_uid": "demo-proc-001",
                "email": "demo-proc@ccc.edu",
                "full_name": "Demo PROC User",
                "role": UserRole.PROC,
                "department_id": None,
            },
        ]

        users_map = {}
        for user_data in demo_users:
            user = User(**user_data)
            session.add(user)
            session.commit()
            session.refresh(user)
            users_map[user.role] = user

        print(f"  Created {len(demo_users)} demo users")

        # ========================================
        # 3. Create ISMP Strategic Initiatives
        # ========================================
        print("\nCreating strategic initiatives...")

        ismp_goals = [
            {
                "code": "1.0",
                "name": "Expand Access",
                "description": "Increase enrollment, outreach, and CTE programs to serve more students.",
                "objective": "Increase total enrollment by 5% annually through strategic outreach and program expansion.",
            },
            {
                "code": "2.0",
                "name": "Student-Centered Institution",
                "description": "Enhance student engagement, services, and pathways.",
                "objective": "Improve student engagement metrics and increase completion of Student Education Plans.",
            },
            {
                "code": "3.0",
                "name": "Student Success and Equity",
                "description": "Close achievement gaps and improve overall success rates.",
                "objective": "Reduce equity gaps in course success rates by 50% across all demographic groups.",
            },
            {
                "code": "4.0",
                "name": "Organizational Effectiveness",
                "description": "Strengthen governance, assessment, and professional development.",
                "objective": "Achieve 90% staff participation in professional development activities.",
            },
            {
                "code": "5.0",
                "name": "Financial Stability",
                "description": "Ensure revenue growth and efficient resource allocation.",
                "objective": "Maintain balanced budget while increasing reserves to 5% of operating costs.",
            },
        ]

        initiatives_map = {}
        for goal_data in ismp_goals:
            initiative = StrategicInitiative(**goal_data)
            session.add(initiative)
            session.commit()
            session.refresh(initiative)
            initiatives_map[initiative.code] = initiative

        print(f"  Created {len(ismp_goals)} strategic initiatives")

        # ========================================
        # 4. Create Demo Program Reviews
        # ========================================
        print("\nCreating demo program reviews...")

        faculty = users_map[UserRole.FACULTY]
        proc = users_map[UserRole.PROC]
        admin = users_map[UserRole.ADMIN]

        # Review 1: DRAFT (Mathematics)
        draft_review = ProgramReview(
            org_id=mathematics.id,
            author_id=faculty.id,
            cycle_year="2025-2026",
            review_type=ReviewType.ANNUAL,
            status=ReviewStatus.DRAFT,
            content={
                "program_overview": "The Mathematics Department provides foundational STEM education serving over 2,500 students annually.",
                "student_success": "Success rates improved following AB 705 implementation. Statistics pathway shows strongest performance.",
            },
            created_at=datetime.utcnow() - timedelta(days=7),
            updated_at=datetime.utcnow() - timedelta(days=1),
        )
        session.add(draft_review)
        session.commit()
        session.refresh(draft_review)

        # Draft sections (partial completion)
        for key, status, content in [
            ("program_overview", SectionStatus.COMPLETED, "The Mathematics Department provides foundational STEM education serving over 2,500 students annually."),
            ("student_success", SectionStatus.IN_PROGRESS, "Success rates improved following AB 705 implementation."),
            ("curriculum", SectionStatus.NOT_STARTED, ""),
            ("equity_analysis", SectionStatus.NOT_STARTED, ""),
            ("action_plans", SectionStatus.NOT_STARTED, ""),
            ("resource_needs", SectionStatus.NOT_STARTED, ""),
        ]:
            section = ReviewSection(
                review_id=draft_review.id,
                section_key=key,
                status=status,
                content=content if content else None,
            )
            session.add(section)

        # Review 2: IN_REVIEW (Mathematics)
        in_review = ProgramReview(
            org_id=mathematics.id,
            author_id=faculty.id,
            cycle_year="2024-2025",
            review_type=ReviewType.ANNUAL,
            status=ReviewStatus.IN_REVIEW,
            content={
                "program_overview": "The Mathematics Department continues to lead in STEM education with innovative teaching methods.",
                "student_success": "AB 705 implementation has shown positive results. Success rates at 68% overall.",
                "curriculum": "Updated Statistics pathway. New Business Calculus course approved.",
                "equity_analysis": "Hispanic students perform at parity. African American students show 5pp gap in gateway courses.",
                "action_plans": "Expand embedded tutoring. Develop peer mentoring program.",
                "resource_needs": "Additional tutors for Math Success Center. Technology upgrades.",
            },
            created_at=datetime.utcnow() - timedelta(days=45),
            updated_at=datetime.utcnow() - timedelta(days=3),
            submitted_at=datetime.utcnow() - timedelta(days=3),
        )
        session.add(in_review)
        session.commit()
        session.refresh(in_review)

        # All sections completed
        for key in ["program_overview", "student_success", "curriculum", "equity_analysis", "action_plans", "resource_needs"]:
            section = ReviewSection(
                review_id=in_review.id,
                section_key=key,
                status=SectionStatus.COMPLETED,
                content=in_review.content.get(key, ""),
            )
            session.add(section)

        # Review 3: VALIDATED (English)
        validated_review = ProgramReview(
            org_id=english.id,
            author_id=faculty.id,
            cycle_year="2024-2025",
            review_type=ReviewType.ANNUAL,
            status=ReviewStatus.VALIDATED,
            content={
                "program_overview": "The English Department offers comprehensive composition and literature programs.",
                "student_success": "English 101 success rate at 71%. Stretch composition model showing 73% success.",
                "curriculum": "Implemented stretch composition per AB 705. Added technical writing certificate.",
                "equity_analysis": "All student groups performing at parity. Targeted interventions successful.",
                "action_plans": "Expand Writing Center hours. Develop online tutoring.",
                "resource_needs": "Writing Center staffing. Professional development funding.",
            },
            created_at=datetime.utcnow() - timedelta(days=90),
            updated_at=datetime.utcnow() - timedelta(days=7),
            submitted_at=datetime.utcnow() - timedelta(days=30),
            validated_at=datetime.utcnow() - timedelta(days=7),
        )
        session.add(validated_review)
        session.commit()
        session.refresh(validated_review)

        for key in ["program_overview", "student_success", "curriculum", "equity_analysis", "action_plans", "resource_needs"]:
            section = ReviewSection(
                review_id=validated_review.id,
                section_key=key,
                status=SectionStatus.COMPLETED,
                content=validated_review.content.get(key, ""),
            )
            session.add(section)

        # Validation score
        validation = ValidationScore(
            review_id=validated_review.id,
            validator_id=proc.id,
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
            comments="Strong submission with excellent equity focus. Recommend approval.",
        )
        session.add(validation)

        # Review 4: APPROVED (Mathematics) - Complete Golden Thread
        approved_review = ProgramReview(
            org_id=mathematics.id,
            author_id=faculty.id,
            cycle_year="2023-2024",
            review_type=ReviewType.COMPREHENSIVE,
            status=ReviewStatus.APPROVED,
            content={
                "program_overview": "The Mathematics Department serves as the cornerstone of STEM education at CCC.",
                "student_success": "Overall success rate of 68%. NCLEX preparation shows 89% pass rate for allied health math.",
                "curriculum": "All courses aligned with C-ID. New pathways for Business and STEM majors.",
                "equity_analysis": "Embedded tutoring reduced equity gaps by 40%. First-gen students showing strong outcomes.",
                "action_plans": "Institutionalize embedded tutoring. Expand Math Success Center. Develop OER materials.",
                "resource_needs": "Tutor funding. Technology refresh. Calculator lending library.",
            },
            created_at=datetime.utcnow() - timedelta(days=180),
            updated_at=datetime.utcnow() - timedelta(days=60),
            submitted_at=datetime.utcnow() - timedelta(days=120),
            validated_at=datetime.utcnow() - timedelta(days=90),
            approved_at=datetime.utcnow() - timedelta(days=60),
        )
        session.add(approved_review)
        session.commit()
        session.refresh(approved_review)

        for key in ["program_overview", "student_success", "curriculum", "equity_analysis", "action_plans", "resource_needs"]:
            section = ReviewSection(
                review_id=approved_review.id,
                section_key=key,
                status=SectionStatus.COMPLETED,
                content=approved_review.content.get(key, ""),
            )
            session.add(section)

        # Validation score for approved
        validation_approved = ValidationScore(
            review_id=approved_review.id,
            validator_id=proc.id,
            rubric_scores={k: 5 for k in ["data_analysis", "equity_focus", "ismp_alignment", "slo_assessment",
                                           "action_plans", "resource_justification", "narrative_clarity",
                                           "evidence_quality", "completeness", "accjc_compliance"]},
            comments="Exemplary comprehensive review. Perfect alignment with ISMP goals.",
        )
        session.add(validation_approved)

        print(f"  Created 4 demo program reviews")

        # ========================================
        # 5. Create Action Plans (Golden Thread)
        # ========================================
        print("\nCreating action plans...")

        # Action plans for approved review (demonstrating complete Golden Thread)
        action_plans_data = [
            {
                "review_id": approved_review.id,
                "title": "Institutionalize Embedded Tutoring Program",
                "description": "Expand embedded tutoring to all high-enrollment gateway courses based on successful pilot.",
                "status": ActionPlanStatus.INSTITUTIONALIZED,
                "addresses_equity_gap": True,
                "justification": "40% reduction in equity gaps demonstrates effectiveness.",
                "initiatives": ["3.0", "2.0"],
            },
            {
                "review_id": approved_review.id,
                "title": "Expand Math Success Center Hours",
                "description": "Add evening and weekend hours to serve working students.",
                "status": ActionPlanStatus.COMPLETE,
                "addresses_equity_gap": True,
                "justification": "Working students cannot access traditional hours.",
                "initiatives": ["2.0", "1.0"],
            },
            {
                "review_id": approved_review.id,
                "title": "Develop OER Mathematics Materials",
                "description": "Create Open Educational Resources to reduce textbook costs.",
                "status": ActionPlanStatus.ONGOING,
                "addresses_equity_gap": True,
                "justification": "High textbook costs are a barrier for low-income students.",
                "initiatives": ["3.0", "5.0"],
            },
        ]

        created_plans = []
        for plan_data in action_plans_data:
            initiatives = plan_data.pop("initiatives", [])
            plan = ActionPlan(**plan_data)
            session.add(plan)
            session.commit()
            session.refresh(plan)
            created_plans.append(plan)

            # Create ISMP mappings (Golden Thread)
            for code in initiatives:
                if code in initiatives_map:
                    mapping = ActionPlanMapping(
                        action_plan_id=plan.id,
                        initiative_id=initiatives_map[code].id,
                    )
                    session.add(mapping)

        print(f"  Created {len(created_plans)} action plans with ISMP mappings")

        # ========================================
        # 6. Create Resource Requests
        # ========================================
        print("\nCreating resource requests...")

        resource_templates = [
            {
                "plan_id": created_plans[0].id,
                "object_code": "1000",
                "description": "Embedded Tutor Coordinator (0.5 FTE)",
                "amount": Decimal("30000.00"),
                "justification": "Coordinate embedded tutoring across all gateway courses.",
                "tco_notes": "Salary + benefits for 0.5 FTE coordinator position.",
                "priority": 1,
                "is_funded": True,
                "funded_amount": Decimal("30000.00"),
            },
            {
                "plan_id": created_plans[1].id,
                "object_code": "2000",
                "description": "Math Success Center Student Workers (500 hrs)",
                "amount": Decimal("8500.00"),
                "justification": "Staff evening and weekend hours.",
                "tco_notes": "500 hours x $17/hr (CA minimum wage). Per semester.",
                "priority": 2,
                "is_funded": True,
                "funded_amount": Decimal("8500.00"),
            },
            {
                "plan_id": created_plans[2].id,
                "object_code": "4000",
                "description": "OER Development Stipends",
                "amount": Decimal("5000.00"),
                "justification": "Faculty stipends for creating OER materials.",
                "tco_notes": "$1,000 per faculty x 5 faculty. One-time development cost.",
                "priority": 3,
                "is_funded": False,
                "funded_amount": None,
            },
            {
                "plan_id": created_plans[0].id,
                "object_code": "5000",
                "description": "Tutor Training Program",
                "amount": Decimal("3500.00"),
                "justification": "Professional development for embedded tutors.",
                "tco_notes": "Annual training program for 20 tutors.",
                "priority": 4,
                "is_funded": True,
                "funded_amount": Decimal("3500.00"),
            },
        ]

        for resource_data in resource_templates:
            resource = ResourceRequest(**resource_data)
            session.add(resource)

        print(f"  Created {len(resource_templates)} resource requests")

        # ========================================
        # 7. Create Audit Trail
        # ========================================
        print("\nCreating audit trail...")

        audit_entries = [
            # Draft review
            AuditTrail(
                entity_type="program_review",
                entity_id=draft_review.id,
                action=AuditAction.CREATED,
                user_id=faculty.id,
                new_values={"status": "draft"},
                description="Created draft review - Mathematics 2025-2026",
            ),
            # In review
            AuditTrail(
                entity_type="program_review",
                entity_id=in_review.id,
                action=AuditAction.CREATED,
                user_id=faculty.id,
                new_values={"status": "draft"},
                description="Created review - Mathematics 2024-2025",
                created_at=datetime.utcnow() - timedelta(days=45),
            ),
            AuditTrail(
                entity_type="program_review",
                entity_id=in_review.id,
                action=AuditAction.SUBMITTED,
                user_id=faculty.id,
                old_values={"status": "draft"},
                new_values={"status": "in_review"},
                description="Submitted review for PROC validation",
                created_at=datetime.utcnow() - timedelta(days=3),
            ),
            # Validated
            AuditTrail(
                entity_type="program_review",
                entity_id=validated_review.id,
                action=AuditAction.CREATED,
                user_id=faculty.id,
                new_values={"status": "draft"},
                description="Created review - English 2024-2025",
                created_at=datetime.utcnow() - timedelta(days=90),
            ),
            AuditTrail(
                entity_type="program_review",
                entity_id=validated_review.id,
                action=AuditAction.STATUS_CHANGED,
                user_id=faculty.id,
                old_values={"status": "draft"},
                new_values={"status": "in_review"},
                description="Submitted for validation",
                created_at=datetime.utcnow() - timedelta(days=30),
            ),
            AuditTrail(
                entity_type="program_review",
                entity_id=validated_review.id,
                action=AuditAction.STATUS_CHANGED,
                user_id=proc.id,
                old_values={"status": "in_review"},
                new_values={"status": "validated"},
                description="PROC validated review",
                created_at=datetime.utcnow() - timedelta(days=7),
            ),
            # Approved (complete workflow)
            AuditTrail(
                entity_type="program_review",
                entity_id=approved_review.id,
                action=AuditAction.CREATED,
                user_id=faculty.id,
                new_values={"status": "draft", "review_type": "comprehensive"},
                description="Created comprehensive review - Mathematics 2023-2024",
                created_at=datetime.utcnow() - timedelta(days=180),
            ),
            AuditTrail(
                entity_type="program_review",
                entity_id=approved_review.id,
                action=AuditAction.SUBMITTED,
                user_id=faculty.id,
                old_values={"status": "draft"},
                new_values={"status": "in_review"},
                description="Submitted for PROC validation",
                created_at=datetime.utcnow() - timedelta(days=120),
            ),
            AuditTrail(
                entity_type="program_review",
                entity_id=approved_review.id,
                action=AuditAction.STATUS_CHANGED,
                user_id=proc.id,
                old_values={"status": "in_review"},
                new_values={"status": "validated"},
                description="PROC validated with perfect scores",
                created_at=datetime.utcnow() - timedelta(days=90),
            ),
            AuditTrail(
                entity_type="program_review",
                entity_id=approved_review.id,
                action=AuditAction.APPROVED,
                user_id=admin.id,
                old_values={"status": "validated"},
                new_values={"status": "approved"},
                description="Approved by administration",
                created_at=datetime.utcnow() - timedelta(days=60),
            ),
        ]

        for audit in audit_entries:
            session.add(audit)

        print(f"  Created {len(audit_entries)} audit entries")

        # Commit everything
        session.commit()

        # ========================================
        # Summary
        # ========================================
        print("\n=== Demo Data Seed Summary ===")
        print(f"Organizations: 4")
        print(f"Demo Users: 5 (Faculty, Chair, Dean, Admin, PROC)")
        print(f"ISMP Initiatives: 5")
        print(f"Program Reviews: 4 (DRAFT, IN_REVIEW, VALIDATED, APPROVED)")
        print(f"Action Plans: 3 (with Golden Thread to ISMP)")
        print(f"Resource Requests: 4 (covering object codes 1000-5000)")
        print(f"Validation Scores: 2")
        print(f"Audit Trail Entries: 10")
        print("\n=== Demo Data Ready ===\n")


if __name__ == "__main__":
    """Run demo seed directly for testing."""
    seed_demo_data()
