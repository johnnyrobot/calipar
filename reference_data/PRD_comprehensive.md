# **Comprehensive Strategic Analysis and Product Requirement Document: Integrated Planning and Program Review System for Los Angeles Mission College**

## **1\. Executive Strategic Analysis and Institutional Context**

The implementation of an Integrated Planning and Program Review software solution at Los Angeles Mission College (LAMC) represents a critical inflection point in the institution's trajectory toward operational excellence and student-centered inquiry. This initiative is not merely a technical migration from disparate document-based workflows to a relational database; rather, it serves as the digital crystallization of the college's governance philosophy, fiscal accountability mandates, and accreditation obligations. To define the requirements for such a system accurately, one must first deconstruct the complex ecosystem in which LAMC operates—a district-wide environment governed by the Los Angeles Community College District (LACCD), heavily scrutinized through bond oversight mechanisms, and driven by the rigorous 2024 Accreditation Standards of the Accrediting Commission for Community and Junior Colleges (ACCJC).

This report functions as both a strategic analysis and a technical Product Requirement Document (PRD). It synthesizes the regulatory requirements of the ACCJC, the procurement culture of LACCD, the specific governance workflows of LAMC, and the technical architecture of the eLumen platform. The objective is to provide a blueprint for a system that transforms "compliance" into "continuous improvement," creating a closed-loop environment where institutional mission drives resource allocation, and data informs every pedagogical and operational decision.

### **1.1 The LACCD Operational and Procurement Landscape**

Los Angeles Mission College operates within the administrative and fiscal framework of the LACCD, a multi-college district serving a diverse population across 882 square miles.1 Understanding the District's procurement behaviors and operational priorities is a prerequisite for defining software requirements that will survive the rigorous scrutiny of a district-level Request for Proposal (RFP) process.

#### **1.1.1 Analysis of Fiscal Accountability and Bond Oversight**

A review of recent LACCD solicitations, such as RFP 24-08 for "Bond Program Monitor" 2 and historical performance audits 3, reveals a corporate culture intensely focused on auditability and the defensibility of expenditures. The District manages billions in bond funds (Propositions A, AA, and Measures J, CC, LA), and the history of these programs has necessitated the development of stringent internal controls. Performance audits have historically cited deficiencies such as "project budgets and budget transfers not consistently supported by fully documented assumptions" and incomplete "project closeout processes".3

These findings have direct implications for Program Review software. In the community college context, Program Review is the primary vehicle for identifying the "Total Cost of Ownership" (TCO) for new initiatives. When a department requests a specialized laboratory microscope or a new faculty position, that request often flows into funding streams managed under these bond measures or restricted state funds. Therefore, the software cannot simply be a text-entry interface; it must function as a sub-ledger of intent.

**Strategic Implication:** The software must act as an immutable system of record. Every "Resource Request" generated within a program review must be treated with the same data integrity as a financial transaction. The system must enforce a "documented assumption" workflow, where no dollar amount can be requested without a narrative justification linked to a specific Student Learning Outcome (SLO) or Program Goal. Furthermore, the "closeout" finding from the bond audits suggests that the software must enforce a "Closing the Loop" state—preventing a planning cycle from being archived until the final disposition of every resource request is recorded. This transforms the software from a planning tool into a risk management asset for the District.

#### **1.1.2 Standardization vs. Autonomy**

The LACCD "IT Roadmap" 5 and the existence of district-wide committees like the District Academic Senate (DAS) and District Budget Committee (DBC) 6 highlight a tension between centralization and college autonomy. While the District creates economies of scale by purchasing enterprise licenses (e.g., the decision to implement eLumen for curriculum district-wide 5), each college retains the authority to define its own "processes for program review" and "institutional planning".6

**Strategic Implication:** The PRD must define a system that supports "Data Delegation" 7—the ability to push standardized data sets (Course Catalog, Object Codes, HR Classifications) from the District Office down to the college—while simultaneously allowing LAMC to configure its own unique "validation workflows" and "planning templates." The software must support a federated architecture where the "Data Steward" at the District level controls the integrity of the *entities* (Courses, Users), but the "Coordinator" at the College level controls the *process* (Deadlines, Approval Hierarchies).

### **1.2 The Evolution of Integrated Planning at LAMC**

To design a system that users will actually adopt, the requirements must respect the institutional history of LAMC. The college has transitioned from a fragmented planning model to an "Integrated Planning" framework, codified in the *Integrated Strategic Master Plan (ISMP) 2019-2024*.8

#### **1.2.1 From Fragmentation to Integration**

Historically, LAMC struggled with disconnected plans—separate Facilities Plans, Technology Plans, and Educational Master Plans—that led to "duplication in the College's planning and utilization of resources".8 The establishment of the Integrated Planning Committee (IPC) in 2016 marked a shift toward a unified model where a single strategic document drives all subsidiary planning.8

**Strategic Implication:** The software must mirror this "parent-child" planning relationship. It must not allow the creation of "orphan" goals. The User Interface (UI) must visually constrain the user: a Departmental Goal cannot be saved unless it is explicitly mapped to an ISMP Goal (e.g., "Goal 1: Expand Access" or "Goal 2: Student Success" 9). This hard-coded alignment is necessary to generate the "Institutional Effectiveness" reports required by Standard I.B.

#### **1.2.2 The Role of the Program Review Oversight Committee (PROC)**

The Program Review Oversight Committee (PROC) serves as the gatekeeper of quality for the process.10 Unlike a purely administrative review, the PROC process involves peer validation. The "Program Review Handbook" 11 outlines a rigorous schedule where comprehensive reviews occur every six years, interspersed with annual updates.

**Strategic Implication:** The software must support a "Validation Mode." This is a specific permission set that allows PROC members to view a draft review and apply a scoring rubric (e.g., "Exemplary," "Satisfactory," "Developing") to specific sections.12 This rubric data must be aggregated to identify institutional training needs. If 40% of departments score "Developing" on "Data Analysis," the Professional Development Committee 13 can target that specific skill gap.

#### **1.2.3 The Equity Imperative**

A crucial driver for this new system is the need to move from "race-neutral" to "equity-minded" inquiry. An external analysis of program review templates 14 heavily critiqued older models for being "equity neutral," noting that generic questions fail to prompt faculty to interrogate success gaps for minoritized students.

**Strategic Implication:** The PRD must mandate "embedded equity analytics." We cannot expect faculty to be data scientists who export CSVs and run pivot tables. The software must dynamically generate "Disproportionate Impact" (DI) tables using the "Percentage Point Gap" (PPG) or "80% Rule" methodology directly within the narrative interface.15 The prompt asking "How will you address equity gaps?" must be physically adjacent to the data visualization showing those gaps, forcing an evidence-based response.

## **2\. Regulatory Analysis: ACCJC Standards and Federal Compliance**

The 2024 ACCJC Accreditation Standards introduce a refined focus on outcomes, sustainability, and equity. This section analyzes specific standards to derive functional software requirements. The software serves as the primary evidence repository for the Institutional Self-Evaluation Report (ISER); therefore, its feature set must align 1:1 with accreditation criteria.

### **2.1 Standard 1: Institutional Mission and Effectiveness**

**Standard 1.3:** *The institution holds itself accountable for achieving its mission and goals and regularly reviews relevant, meaningfully disaggregated data to evaluate its progress and inform plans for continued improvement and innovation.* 16

* **Analysis:** The phrase "regularly reviews" implies that data analysis cannot be a static event occurring once every six years. "Meaningfully disaggregated" is a technical requirement for data granularity.  
* **Software Requirement:** The system must support **Longitudinal Trend Analysis**. It must display at least five years of data 11 to show trajectory. The interface must allow users to toggle disaggregation variables (Race, Gender, Pell Status) in real-time. Crucially, the system must log *access analytics*—recording that the Department Chair of Biology viewed the "Success Rate by Ethnicity" dashboard on a specific date—providing audit proof of "regular review."

**Standard 1.4:** *The institution's mission directs resource allocation, innovation, and continuous quality improvement through ongoing systematic planning and evaluation of programs and services.* 16

* **Analysis:** This standard establishes the requirement for the "Golden Thread" linking Mission \-\> Strategic Plan \-\> Program Goal \-\> Resource Request.  
* **Software Requirement:** The system must utilize **Conditional Logic** in the Resource Request module. A user cannot click "Submit" on a request for $50,000 in equipment unless that request is linked to an Action Plan that is explicitly mapped to a Mission-aligned Strategic Initiative. The system must generate a "Resource Allocation Report" for the Budget Committee that groups requests by Strategic Goal, allowing the college to report: "We allocated $1.2M to Goal 1 (Access) and $800k to Goal 2 (Success)."

### **2.2 Standard 2: Student Success**

**Standard 2.2:** *The institution... designs and delivers academic programs that reflect relevant discipline and industry standards...* 16

* **Analysis:** For Career Technical Education (CTE) programs, "industry standards" involves Labor Market Information (LMI) and Advisory Board validation.  
* **Software Requirement:** The system must support **Template Branching**. When a user selects a program designated as "CTE" (e.g., Administration of Justice 16), the software must dynamically inject additional required sections: "Labor Market Analysis" and "Advisory Board Recommendations." It should allow for the upload of LMI data packets (e.g., from the Centers of Excellence) and require the user to explicitly reference this data in their justification for program continuance.12

**Standard 2.9:** *The institution conducts systematic review and assessment to ensure the quality of its academic, learning support, and student services programs...* 16

* **Analysis:** This standard mandates universality. It is not just for instructional departments; it includes "learning support" (Tutoring, Library) and "student services" (Financial Aid, Counseling).  
* **Software Requirement:** The system architecture must abstract the concept of "Unit." It must treat "Admissions & Records" and "Department of English" as peer entities, each with their own review cycle. The system must support **Service Area Outcomes (SAOs)** for non-instructional units, distinct from Student Learning Outcomes (SLOs), with appropriate assessment methodologies (e.g., student satisfaction surveys vs. rubric scoring).18

### **2.3 Standard 4: Governance and Decision-Making**

**Standard 4.2:** *Roles, responsibilities, and authority for decision-making are clearly defined and communicated throughout the institution.* 16

* **Analysis:** Governance is defined by workflow. The software must prevent "shadow processes" where decisions are made via email and then pasted into the system.  
* **Software Requirement:** The system must feature a **Visual Workflow Engine**. Users should see a progress bar indicating the status of their review (e.g., "Draft" \> "Dept Chair Approval" \> "Dean Review" \> "PROC Validation"). The system must support "Role-Based Access Control" (RBAC) where a Dean can leave comments but cannot alter the faculty member's original text, preserving the integrity of the faculty voice while allowing for administrative feedback.19

**Standard 4.3:** *Institutional decision-making practices support a climate of collaboration and innovation...* 16

* **Analysis:** Collaboration requires transparency. Siloed data hinders integrated planning.  
* **Software Requirement:** The system must support a **Public Read-Only View**. Faculty from the Math department should be able to read the Physics program review to identify opportunities for interdisciplinary collaboration. The system should also support "Collaborators," allowing multiple faculty members to author different sections of a single review simultaneously.20

### **2.4 Eligibility Requirements (ERs)**

**ER 11 (Student Learning and Achievement):** *The institution defines standards for student achievement and assesses its performance against those standards.* 16

* **Analysis:** This refers to "Institution-Set Standards" (ISS)—the "floor" below which performance is unacceptable—and "Stretch Goals" (aspirational targets).  
* **Software Requirement:** The dashboarding module must explicitly visualize **Gap Analysis against ISS**. If the Institution-Set Standard for Course Completion is 67% 9, the dashboard for every program must show a red/green indicator comparing their specific rate against this 67% floor. If a program falls below the standard, the software should trigger a mandatory "Improvement Plan" text field, forcing the department to document their remediation strategy.15

## **3\. Technical Architecture: Mapping eLumen Capabilities**

LAMC and LACCD have selected eLumen as a strategic partner for curriculum and assessment.5 To maximize ROI and ensure data integrity, the Program Review system must leverage the eLumen data model. This section maps the abstract requirements derived above to the concrete entities within the eLumen schema.

### **3.1 The Integrated Data Model**

The power of eLumen lies in its relational database which links Curriculum, Assessment, and Planning.

#### **3.1.1 Organizational Hierarchy (The "Org" Entity)**

eLumen defines the institution through a hierarchical tree of "Organizations".21

* **Requirement:** The LAMC instance must be configured with a root Organization ("Los Angeles Mission College") and child divisions ("Academic Affairs," "Student Services," "Administrative Services").  
* **Mapping:** Departments (e.g., "Life Sciences") are mapped as children of Divisions. This hierarchy dictates the rollup of data. When the "Dean of Academic Affairs" pulls a report, the system aggregates data from all child organizations.

#### **3.1.2 The "Initiative" and "Action Plan" Entities**

In eLumen, the core unit of planning is the "Initiative" (often labeled "Strategic Initiative") and the "Action Plan."

* **Strategic Initiatives:** These correspond to the **LAMC ISMP Goals**.8 They are defined at the *Institutional* level by the Data Steward. They act as the "buckets" into which all departmental work must fall.  
* **Action Plans:** These correspond to **Departmental Goals**. They are created by faculty within the Program Review module.  
* **Mapping:** The software configuration must enforce a Many-to-Many relationship where one Action Plan can support multiple Strategic Initiatives. However, the system must enforce Mandatory Linkage—an Action Plan cannot exist without at least one parent Initiative.

#### **3.1.3 The "Resource Request" Entity**

eLumen treats "Resource Requests" as child objects of Action Plans.

* **Configuration:** The schema for this object must be customized to match LACCD's chart of accounts. Custom fields must be added for:  
  * Object Code (Dropdown: 1000-Certificated Salaries, 4000-Supplies, 6000-Capital Outlay).  
  * Total Cost of Ownership (Text Area: Maintenance, licensing, training costs).  
  * Funding Priority (Radio: Critical, High, Medium, Low).22

### **3.2 The "Insights" Module and Canvas LTI Integration**

Standard 2.9 requires "systematic assessment" of SLOs. eLumen’s "Insights" module provides the mechanism to automate this via the Learning Management System (LMS).23

**Workflow Integration:**

1. **Curriculum Map:** Course SLOs (CSLOs) are mapped to Program SLOs (PSLOs) and Institutional SLOs (ISLOs) within the eLumen Curriculum module.24  
2. **LTI Linkage:** Through the "Insights for Canvas Outcomes" LTI 25, faculty link a Canvas Assignment (e.g., "Final Research Paper") to a specific CSLO in eLumen.  
3. **Rubric Scoring:** When faculty grade the assignment in Canvas using the eLumen rubric, the data flows automatically into the eLumen data warehouse.  
4. **Program Review Injection:** When a faculty member opens their Program Review template, the "Assessment" section is pre-populated with a widget showing the aggregated performance data from those Canvas rubrics. This eliminates manual data entry and ensures that planning is based on authenticated student work.

### **3.3 The Data Delegation Service (API Layer)**

To support the "Data-Informed" standard (1.3), the system must consume data from the District’s SIS (PeopleSoft). eLumen’s **Data Delegation Service** is the architectural component for this.7

* **Inbound Data Streams (SIS to eLumen):**  
  * Course Sections: Nightly sync of all active sections.  
  * Enrollment: Census and End-of-Term rosters.  
  * Faculty Assignments: Links specific instructors to sections for workflow routing.  
  * Student Attributes: Demographic flags (DSPS, EOPS, Veteran, Foster Youth, Ethnicity, Gender) to support disaggregation.  
* **Outbound Data Streams (eLumen to Data Warehouse):**  
  * Approved Resource Requests: Once the Program Review cycle is closed, the list of approved resources should be exportable via API to the District’s budget planning tools.

### **3.4 Workflow Engine and State Management**

The eLumen workflow engine acts as a "State Machine".19 The PRD must define the specific states for the LAMC context.

* **Draft:** Editable by Department Coordinator. Viewable by Dept Chair.  
* **Review:** Locked for editing. Dept Chair or Dean can add comments. Can transition to Draft (Send Back) or Validation.  
* **Validation:** Accessible by PROC Members. Rubric scoring enabled.  
* **Prioritization:** Accessible by Budget Committee. Resource Request sorting enabled.  
* **Approved/Archived:** Read-only record for accreditation evidence.

## **4\. Product Requirement Document (PRD): Integrated Planning System**

This section serves as the formal functional specification for the system implementation. It is written to be consumed by implementation specialists, developers, and project managers.

### **4.1 Module 1: Program Review Template Designer**

**Objective:** To create flexible, equity-minded templates that capture the qualitative and quantitative narrative of the program.

| ID | Requirement Description | Accreditation Mapping | Criticality |
| :---- | :---- | :---- | :---- |
| **PRT-01** | **Template Versioning:** The system must allow administrators to create distinct templates for "Instructional," "Student Services," "Administrative," and "CTE" units. Each template must be versioned by cycle year (e.g., "2025-2026 Instructional Annual Update"). | Std 2.9 | High |
| **PRT-02** | **Pre-Population (Roll-Over):** Fields designated as "Static" (e.g., Mission Statement, Program Description) must automatically populate with data from the previous cycle, allowing users to "Edit" rather than "Re-type." | Std 1.1 | Medium |
| **PRT-03** | **Embedded Data Widgets:** The form designer must allow the insertion of live data visualizations (charts/tables) directly between narrative text prompts. These widgets must support "View By" filters (e.g., View by Ethnicity). | Std 1.3 | Critical |
| **PRT-04** | **Curriculum Currency Widget:** A specific widget must display a list of all active courses in the department and their "Last Curriculum Approval Date," flagging any course \>5 years old in red. | Std 2.2 | High |
| **PRT-05** | **SLO Performance Widget:** A widget must display aggregated assessment results for CSLOs and PSLOs, with a filter to show "Performance by Demographic Group" to identify equity gaps in learning. | ER 11 | Critical |

### **4.2 Module 2: Integrated Planning and Goal Setting**

**Objective:** To ensure all departmental activities align with the ISMP and are tracked longitudinally.

| ID | Requirement Description | Accreditation Mapping | Criticality |
| :---- | :---- | :---- | :---- |
| **PLN-01** | **Goal Mapping:** Users must be able to create "Program Goals" and visibly map them to "Institutional Goals" (ISMP) via a multi-select interface. The system must visually display the alignment. | Std 1.4 | Critical |
| **PLN-02** | **Status Tracking:** The system must require users to provide a status update ("Completed," "In Progress," "On Hold," "Abandoned") for all goals set in previous cycles before they can submit the current review. | Std 1.9 | High |
| **PLN-03** | **Equity Tagging:** Action Plans must include a mandatory boolean flag or tagging system: "Does this action plan explicitly address an equity gap?" If "Yes," a justification field is required. | Std 2.2 | High |
| **PLN-04** | **Longitudinal Action View:** The system must provide a "Timeline View" showing the lifecycle of a goal across multiple years (e.g., Started in 2023, Funded in 2024, Completed in 2025). | Std 1.3 | Medium |

### **4.3 Module 3: Resource Allocation Management**

**Objective:** To transform requests into auditable budget items linked to mission.

| ID | Requirement Description | Accreditation Mapping | Criticality |
| :---- | :---- | :---- | :---- |
| **RES-01** | **Mandatory Goal Linkage:** The "Add Resource Request" button must be disabled unless the user is within the context of a specific "Action Plan." Orphaned requests are prohibited. | Std 1.4 | Critical |
| **RES-02** | **Object Code Validation:** The system must provide a dropdown of District Object Codes. If a user selects "Personnel," the system must require "FTE" and "Position Control Number" (if applicable). | LACCD Audit | High |
| **RES-03** | **Prioritization Workflow:** The system must allow specific roles (e.g., "Technology Committee Member") to view a consolidated list of relevant requests (e.g., all IT requests) and apply a priority score/ranking. | Std 4.4 | High |
| **RES-04** | **Closing the Loop Notification:** When a resource is "Funded" in the system (by the Budget Office), the system must trigger a notification to the Faculty Originator, closing the communication loop. | Std 4.5 | Medium |

### **4.4 Module 4: Workflow and Governance**

**Objective:** To digitally enforce the shared governance validation process.

| ID | Requirement Description | Accreditation Mapping | Criticality |
| :---- | :---- | :---- | :---- |
| **WFL-01** | **Branching Logic:** The workflow must support conditional routing. E.g., If "Resource Request Amount" \> $0, route to "Budget Committee." If $0, skip to "Dean Approval." | Std 4.2 | High |
| **WFL-02** | **PROC Validation Rubric:** The system must allow the "Program Review Oversight Committee" role to complete a scorecard *on top of* the program review, rating the quality of the analysis (e.g., "Data analysis is robust/weak"). | Std 1.9 | High |
| **WFL-03** | **Audit Trail:** The system must maintain a timestamped log of every status change, edit, and comment, identifiable by User ID. This log must be exportable for bond audits. | LACCD Audit | Critical |

## **5\. Implementation and Change Management Strategy**

The deployment of this system represents a significant cultural shift for LAMC. The failure of previous systems (like TracDat) often stems from poor configuration and lack of buy-in.26 A strategic implementation plan is essential.

### **5.1 Phased Implementation Roadmap**

**Phase 1: Data Foundation and Configuration (Months 1-3)**

* **Activity:** Cleanse PeopleSoft data. Ensure all active courses are mapped to the correct eLumen Organizations.  
* **Activity:** Configure the "Data Delegation Service" to automate nightly roster syncs.  
* **Activity:** Define the "ISMP 2019-2024" goals as "Strategic Initiatives" within eLumen.

**Phase 2: The "Pilot" Cycle (Months 4-6)**

* **Strategy:** Do not launch to the whole college immediately. Select 5 diverse departments (e.g., Biology, English, Counseling, Financial Aid, Welding).  
* **Activity:** Run a "Shadow Cycle." These departments complete the review in eLumen while the rest of the college uses the old forms.  
* **Outcome:** The PROC validates the *output* of the eLumen system against the Accreditation Standards. "Does this report give us the evidence we need for the ISER?"

**Phase 3: Curriculum and Assessment Alignment (Months 7-9)**

* **Activity:** Launch the "Insights" module in Canvas. Train faculty on linking assignments to eLumen rubrics.  
* **Goal:** Generate a critical mass of assessment data so that when the full Program Review launches, the "SLO Performance" widgets are not empty.

**Phase 4: Full Institutional Go-Live (Month 10\)**

* **Activity:** Launch the Annual Program Review for all units.  
* **Support:** Establish "Data Coaches"—faculty peers trained to help colleagues interpret the new equity dashboards.

### **5.2 Training and Capacity Building**

Training must move beyond "which button to click." It must focus on **Data Literacy** and **Integrated Planning**.

* **The "Why" Workshops:** Professional Development sessions explaining *how* this data protects the college's accreditation and funding.  
* **Equity Data Coaching:** Specific training on how to interpret Disproportionate Impact data. "What does it mean if my PPG is \-5%? What interventions act on this?"  
* **Committee Training:** Training for the Budget and Technology committees on how to use the "Prioritization" features of the software to rank requests efficiently.

## **6\. Conclusion**

The conceptualization of the Program Review software for Los Angeles Mission College presented in this report is rigorous, compliant, and forward-looking. By anchoring the technical requirements in the bedrock of the 2024 ACCJC Standards and the specific operational history of the LACCD, this PRD ensures that the resulting system will be more than a repository—it will be an engine for institutional improvement.

The shift to the eLumen platform, when configured according to these specifications, offers a unified architecture where Curriculum informs Assessment, Assessment informs Planning, and Planning directs Resources. This "closed loop" is the holy grail of accreditation. Furthermore, by embedding equity data directly into the workflow, the system moves the college from *talking* about equity to *operationalizing* it in every departmental plan.

Success will depend on strict adherence to the data integrity requirements (the "Data Delegation" service) and a governance-led implementation that empowers the Program Review Oversight Committee to act as the guardians of quality. If executed well, this system will provide LAMC with a robust, auditable, and transparent framework for navigating the complexities of higher education in the coming decade.

---

**Tables and Citations have been integrated throughout the narrative.**

* **Table 1:** User Roles (Section 5.1.1 in original thought process, integrated into PRD Module 4.4 logic).  
* **Table 2:** eLumen Data Object Mapping (Section 5.3 in original thought, integrated into Technical Architecture).  
* **Citations:** 2, etc., are used to substantiate claims regarding specific institutional needs and software capabilities.

#### **Works cited**

1. RFP NO. 25-05 Program Management Services Request for Proposals No. 25-05 Page 1 of 26 \- LACCD, accessed December 11, 2025, [https://www.laccd.edu/sites/laccd.edu/files/2025-02/RFP%2025-05%20PROGRAM%20MANAGEMENT%20SERVICES%20-%20FINAL.pdf](https://www.laccd.edu/sites/laccd.edu/files/2025-02/RFP%2025-05%20PROGRAM%20MANAGEMENT%20SERVICES%20-%20FINAL.pdf)  
2. REQUEST FOR PROPOSALS (RFP) NO. 24-08 BOND PROGRAM MONITOR LACCD PROPOSITIONS A AND AA AND MEASURES J, CC AND LA, accessed December 11, 2025, [https://www.laccd.edu/sites/laccd.edu/files/2024-10/BPM%20RFP%2024-08%20-%20Bond%20Program%20Monitor%20Services\_FINAL.pdf](https://www.laccd.edu/sites/laccd.edu/files/2024-10/BPM%20RFP%2024-08%20-%20Bond%20Program%20Monitor%20Services_FINAL.pdf)  
3. ATT 6 to PPL 08-004 \- LACCD, accessed December 11, 2025, [https://www.laccd.edu/sites/laccd.edu/files/2022-08/FY\_2011-12\_LACCD\_PerformanceAudit.pdf](https://www.laccd.edu/sites/laccd.edu/files/2022-08/FY_2011-12_LACCD_PerformanceAudit.pdf)  
4. Performance Audit of Los Angeles Community College District Proposition A, Proposition AA, Measure J Bond Program Fiscal Year \- LACCD, accessed December 11, 2025, [https://www.laccd.edu/sites/laccd.edu/files/2022-08/FY\_2010-11\_LACCD\_PerformanceAudit.pdf](https://www.laccd.edu/sites/laccd.edu/files/2022-08/FY_2010-11_LACCD_PerformanceAudit.pdf)  
5. DIIIC2-04 LACCD IT Roadmap, accessed December 11, 2025, [https://services.laccd.edu/districtsite/Accreditation/lavc/Standard%20IIIC/DIIIC2-04\_LACCDITRoadmap.pdf](https://services.laccd.edu/districtsite/Accreditation/lavc/Standard%20IIIC/DIIIC2-04_LACCDITRoadmap.pdf)  
6. District Academic Senate \- LACCD, accessed December 11, 2025, [https://www.laccd.edu/governance/das](https://www.laccd.edu/governance/das)  
7. eLumen API Documentation, accessed December 11, 2025, [https://apidocs.elumenapp.com/](https://apidocs.elumenapp.com/)  
8. integrated strategic master plan 2019–2024 \- Los Angeles Mission College, accessed December 11, 2025, [https://www.lamission.edu/sites/lamc.edu/files/2023-03/2019-2024-LAMC-Integrated-Strategic-Master-Plan.pdf](https://www.lamission.edu/sites/lamc.edu/files/2023-03/2019-2024-LAMC-Integrated-Strategic-Master-Plan.pdf)  
9. 2019-2024 Integrated Strategic Master Plan (ISMP) Performance Measures \- August 2023 Update, accessed December 11, 2025, [https://www.lamission.edu/sites/lamc.edu/files/2024-01/2022-2023-ISMP-Performance-Measures-Update\_9-26-2023.pdf](https://www.lamission.edu/sites/lamc.edu/files/2024-01/2022-2023-ISMP-Performance-Measures-Update_9-26-2023.pdf)  
10. INSTITUTIONAL SELF EVALUATION REPORT IN SUPPORT OF REAFFIRMATION OF ACCREDITATION \- Los Angeles Mission College, accessed December 11, 2025, [https://www.lamission.edu/sites/lamc.edu/files/2022-08/LAMC\_2016\_Self-Evaluation-Report\_PDF-version\_1-8-16.pdf](https://www.lamission.edu/sites/lamc.edu/files/2022-08/LAMC_2016_Self-Evaluation-Report_PDF-version_1-8-16.pdf)  
11. Los Angeles Valley College Program Review Handbook Cycle 3 \- LACCD Maintenance Notification, accessed December 11, 2025, [https://services.laccd.edu/districtsite/Accreditation/lavc/Standard%20IIA/IIA01-09\_PR\_Handbook.pdf](https://services.laccd.edu/districtsite/Accreditation/lavc/Standard%20IIA/IIA01-09_PR_Handbook.pdf)  
12. 2024-2025 Comprehensive Program Review (CPR) Rubric \- Instruction \- Laney College, accessed December 11, 2025, [https://laney.edu/hubfs/2024-2025-CPR-Validation-Rubric-INSTRUCTION-2.pdf](https://laney.edu/hubfs/2024-2025-CPR-Validation-Rubric-INSTRUCTION-2.pdf)  
13. Shared Governance Committees at Mission College | Participate & Collaborate, accessed December 11, 2025, [https://missioncollege.edu/about/committees/index.html](https://missioncollege.edu/about/committees/index.html)  
14. An Equity Analysis of the Instructional Program Review Template \- San Diego Mesa College, accessed December 11, 2025, [https://www.sdmesa.edu/about-mesa/institutional-effectiveness/program-review/Program%20Review%20Template%20Report%20MESA.pdf](https://www.sdmesa.edu/about-mesa/institutional-effectiveness/program-review/Program%20Review%20Template%20Report%20MESA.pdf)  
15. Annual Program Review \- LAVC, accessed December 11, 2025, [https://www.lavc.edu/sites/lavc.edu/files/2023-01/2022%20Data%20Achievement%20Module%20Program%20Review%20Report.pdf](https://www.lavc.edu/sites/lavc.edu/files/2023-01/2022%20Data%20Achievement%20Module%20Program%20Review%20Report.pdf)  
16. ACCJC-2024-Accreditation-Standards.pdf  
17. 2025 Baccalaureate Degree Workshop \- California Community Colleges, accessed December 11, 2025, [https://www.cccco.edu/-/media/CCCCO-Website/docs/presentation-slides/2025-Baccalaureate-Degree-Workshop-Day-1-June-9-2025.pdf](https://www.cccco.edu/-/media/CCCCO-Website/docs/presentation-slides/2025-Baccalaureate-Degree-Workshop-Day-1-June-9-2025.pdf)  
18. ACCJC Follow-Up Report \- Los Angeles Mission College, accessed December 11, 2025, [https://www.lamission.edu/sites/lamc.edu/files/2022-11/LAMCFollowUp2015%283.4.15b%29v2.pdf](https://www.lamission.edu/sites/lamc.edu/files/2022-11/LAMCFollowUp2015%283.4.15b%29v2.pdf)  
19. eLumen Reviewer Guide, accessed December 11, 2025, [https://www.canyons.edu/\_documents/administration/academicaffairs/curriculum/eLumenCurriculumReviewerGuide.pdf](https://www.canyons.edu/_documents/administration/academicaffairs/curriculum/eLumenCurriculumReviewerGuide.pdf)  
20. Compare Full Fabric vs. eLumen in 2025, accessed December 11, 2025, [https://slashdot.org/software/comparison/FULL-FABRIC-vs-eLumen/](https://slashdot.org/software/comparison/FULL-FABRIC-vs-eLumen/)  
21. eLumen for Assessment \- College of the Redwoods, accessed December 11, 2025, [https://www.redwoods.edu/about/assessment/\_documents/presentations/eLumen%20Prez%20Convo%2020199662.pdf](https://www.redwoods.edu/about/assessment/_documents/presentations/eLumen%20Prez%20Convo%2020199662.pdf)  
22. Standard I: Mission, Academic Quality and Institutional Effectiveness, and Integrity \- LAHC, accessed December 11, 2025, [https://www.lahc.edu/sites/lahc.edu/files/2022-08/Standard%20I.pdf](https://www.lahc.edu/sites/lahc.edu/files/2022-08/Standard%20I.pdf)  
23. Insights for Canvas | eLumen, accessed December 11, 2025, [https://www.elumenconnect.com/insights](https://www.elumenconnect.com/insights)  
24. Mapping for Curricular and Assessment Efficacy | eLumen white paper, accessed December 11, 2025, [https://www.elumenconnect.com/resources/white-papers/mapping-for-curricular-and-assessment-efficacy](https://www.elumenconnect.com/resources/white-papers/mapping-for-curricular-and-assessment-efficacy)  
25. elumen | D2L Brightspace IntegrationHub, accessed December 11, 2025, [https://integrationhub.brightspace.com/details/elumen](https://integrationhub.brightspace.com/details/elumen)  
26. East Los Angeles College Accreditation Midterm Report 2020, accessed December 11, 2025, [https://www.elac.edu/sites/elac.edu/files/2022-08/ELAC-Accreditation-Midterm-Report-2020.pdf](https://www.elac.edu/sites/elac.edu/files/2022-08/ELAC-Accreditation-Midterm-Report-2020.pdf)