# **Product Requirement Document (PRD): "Luminous" – Next-Gen Integrated Planning & Accreditation Platform**

Version: 2.0  
Status: Strategic Definition  
Target Institution: Los Angeles Mission College (LAMC) / LACCD  
Primary Objective: To develop an intuitive, AI-enhanced overlay application that streamlines the Program Review process, integrating with eLumen as the system of record while providing a superior User Experience (UX) and leveraging Google Gemini AI for content analysis and generation.

## ---

**1\. Executive Summary & RFP Landscape Analysis**

### **1.1 Strategic Intent**

Current market solutions, including the incumbent eLumen, often function effectively as data repositories but struggle with user engagement and narrative cohesion. Faculty often view Program Review as a "compliance exercise" rather than a planning tool.

This PRD outlines **"Luminous,"** a modern web application designed to be the "System of Engagement" that sits on top of the "System of Record" (eLumen/PeopleSoft). It prioritizes **User Experience (UX)** and **AI Assistance** to reduce the cognitive load of data analysis and report writing.

### **1.2 RFP & Procurement Landscape (LACCD Context)**

Research into LACCD procurement 1 indicates a rigorous focus on fiscal accountability, bond oversight, and data security. While a specific active RFP for a *new* Program Review software to replace eLumen was not found (LACCD is currently in an implementation/optimization phase with eLumen 4), this PRD is designed to meet the **"Gap Analysis"** requirements often cited in district technology roadmaps:

* **Gap:** "Establish Artificial Intelligence/Robotic Process Automation Capabilities" (LACCD IT Roadmap Item 2.5 4).

* **Gap:** "Strategic Data, Reporting and Analytics Capabilities" (Item 1.4 4).

**RFP-Aligned Constraint:** This application must not create a "data silo." It must bi-directionally sync with the District's enterprise architecture (eLumen/PeopleSoft) to ensure the "Golden Record" of curriculum and SLOs remains intact.4

## ---

**2\. Product Vision & User Experience**

**Core Philosophy:** "The software should do the heavy lifting. The faculty member provides the wisdom; the AI provides the labor."

### **2.1 User Roles & Pain Points**

* **Faculty (The Author):** *Pain Point:* "I spend hours formatting charts and digging for data." \-\> *Solution:* AI-generated data summaries and "Smart Drafting."  
* **Department Chair (The Reviewer):** *Pain Point:* "I have to read 20 reviews and they all miss the equity prompt." \-\> *Solution:* AI-driven "Rubric Pre-Check" to flag missing requirements before submission.  
* **PROC Member (The Validator):** *Pain Point:* "It's hard to validate if the resource request matches the goal." \-\> *Solution:* Visual "Thread Logic" checking (Goal \-\> Request \-\> Mission).

## ---

**3\. Functional Requirements: AI & Smart Features**

This application will utilize **Google Gemini Pro** via API for text generation/analysis and **Google Vertex AI Search** (formerly Enterprise Search) for retrieving institutional documents.

### **3.1 Feature: "Smart Context" Editor**

Instead of a blank text box, the narrative fields are "Context-Aware."

* **Requirement \[AI-01\]:** When a user opens the "Student Success Analysis" section, the system must query the database for the specific program's success rates.  
* **AI Action:** Gemini generates a *draft bulleted list* summarizing the data trends (e.g., "Success rates for Latinx students increased by 3% in 2024").  
* **User Action:** Faculty reviews the bullets, adds their qualitative context (e.g., "We hired a bilingual tutor"), and clicks "Expand to Narrative." Gemini rewrites the bullets into a formal academic paragraph.

### **3.2 Feature: The "Equity Lens" Assistant**

To address the critique of "race-neutral" templates 6, the app embeds an equity guardian.

* **Requirement \[AI-02\]:** Before submission, the user clicks "Equity Check."  
* **AI Action:** The system analyzes the text against ACCJC Standard 2.2 and 1.3. If the user discusses "student success" without mentioning specific demographic gaps shown in the data, the AI suggests: *"I notice a 5% gap in completion for African American students in your data, but your narrative doesn't address this. Would you like to add a goal related to this?"*

### **3.3 Feature: SLO & Assessment Synthesis**

* **Requirement \[AI-03\]:** The system must ingest raw SLO assessment data (from eLumen via API).  
* **AI Action:** Instead of showing a raw table of numbers, the system uses Generative AI to identify outliers. *"Course BIO-003 is meeting expectations, but SLO \#2 (Critical Thinking) is trending down across all sections. Is this a curriculum alignment issue?"*  
* **Constraint:** The AI provides the *insight*, but the Faculty determines the *Action Plan*.

## ---

**4\. Technical Architecture & Integration Strategy**

### **4.1 Data Architecture (Hybrid Approach)**

We will not clone the rigid SQL structure of eLumen. We will use a **NoSQL Document Store (Firebase Firestore)** for the Program Review documents to allow for flexible, changing templates year-over-year without database migrations.

* **Frontend:** React.js or Next.js (for speed and SEO).  
* **Backend:** Node.js / Google Cloud Functions.  
* **Database:**  
  * *Primary:* Google Firestore (Stores the Program Review Narratives, AI Drafts, Review Comments).  
  * *Reference:* eLumen API / Data Lake (Read-only source for Courses, SLOs, Success Data).  
* **AI Layer:** Google Vertex AI (Gemini Pro model).

### **4.2 Integration Points (eLumen & PeopleSoft)**

To satisfy LACCD IT standards 4, the app must connect to the existing ecosystem.

| Data Entity | Source System | Integration Method | Frequency |
| :---- | :---- | :---- | :---- |
| **Course Catalog** | eLumen | REST API (GET /courses) | Nightly Sync |
| **SLO Results** | eLumen | REST API / CSV Export | On Demand |
| **Enrollment Data** | PeopleSoft / DEC | SQL Replica / Data Warehouse | Nightly Sync |
| **Faculty Users** | LACCD SSO (Azure AD) | SAML 2.0 | Real-time |

### **4.3 Google File Search API Strategy**

* **Use Case:** A faculty member wants to reference the "2019 Educational Master Plan" while writing their goal.  
* **Implementation:** All institutional PDF planning documents are indexed using Google Vertex AI Search.  
* **Feature:** A sidebar chatbot ("Mission-Bot") allows users to ask, "What is Goal 1 of the EMP?" The system retrieves the exact text from the indexed PDF and displays it without the user leaving the editor.

## ---

**5\. Detailed Module Specifications**

### **5.1 Module: The Dashboard (The "Pulse")**

* **Visuals:** High-level cards showing "Days until Due," "SLO Assessment Completion %," and "Budget Request Status."  
* **AI Insight:** "Your department is 10% below the Institution-Set Standard for Course Completion. Click here to draft an Improvement Plan.".

### **5.2 Module: The Review Builder**

* **Section 1: Mission Alignment**  
  * *Input:* User selects checkboxes for EMP goals.  
  * *AI Assist:* "Based on your selection of Goal 2 (Equity), here are 3 suggested action verbs for your department goal."  
* **Section 2: Curriculum & SLOs**  
  * *Display:* Visual heatmap of Course SLO performance (Green/Yellow/Red).  
  * *Action:* Clicking a Red tile opens a "Create Action Plan" modal.  
* **Section 3: Resource Requests (The "Amazon Cart" Experience)**  
  * *Interface:* Users "shop" for resources.  
  * *Validation:* You cannot add an item to the cart unless it is linked to a specific Action Plan defined in Section 2\.  
  * *Total Cost of Ownership (TCO):* If a user adds "Tablets," the system automatically adds a line item for "IT Support/Maintenance" based on district TCO formulas.

### **5.3 Module: The Validator's Cockpit (For PROC/Deans)**

* **Split Screen View:** Left side \= Program Review Draft. Right side \= Validation Rubric.  
* **AI Pre-Score:** The AI scans the draft and offers a *suggested* rubric score (e.g., "Developing \- Data Analysis is present but lacks demographic disaggregation"). The Human Validator accepts or overrides.

## ---

**6\. Implementation Roadmap**

**Phase 1: Foundation (Months 1-3)**

* Establish Firebase environment.  
* Build eLumen Data Connectors (One-way sync).  
* Train Gemini Model on previous "Exemplary" Program Reviews (Fine-tuning).

**Phase 2: The "Smart" Prototype (Months 4-6)**

* Release "Luminous Alpha" to 3 pilot departments.  
* Test "Smart Drafting" features.  
* Refine prompts to ensure AI doesn't hallucinate data.

**Phase 3: Integration & Rollout (Months 7-12)**

* Full SSO integration.  
* Link Resource Requests to SAP/Budgeting export formats.  
* District-wide demo.

## **7\. Strategic Question for Next Step**

*To ensure the AI "Equity Lens" is calibrated correctly, do you have a specific rubric or "Equity Framework" document (e.g., from the Center for Urban Education or local Academic Senate) that defines exactly how LAMC measures "equity-mindedness" in text?*