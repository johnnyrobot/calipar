This is a comprehensive Product Requirement Document (PRD) for **"Luminous,"** a proposed AI-enhanced Program Review application designed specifically for Los Angeles Mission College (LAMC).

This document integrates your requirement for Google Gemini/Vertex AI, respects the constraints of the LACCD technology landscape (eLumen/PeopleSoft), and directly addresses ACCJC accreditation standards.

# ---

**Product Requirement Document: Luminous**

**Next-Generation Integrated Planning & Program Review Platform**

| Project Name | Luminous |
| :---- | :---- |
| **Target Institution** | Los Angeles Mission College (LAMC) / LACCD |
| **Primary Stakeholder** | Vice President of Academic Affairs / Program Review Oversight Committee (PROC) |
| **Version** | 1.0 (Draft) |
| **Date** | December 11, 2025 |

## ---

**1\. Executive Summary**

**Luminous** is a "System of Engagement" designed to overlay existing "Systems of Record" (eLumen, PeopleSoft/SIS). While eLumen excels at curriculum inventory and rigid assessment data tracking, it lacks the intuitive user experience and narrative flexibility required for meaningful self-evaluation.

**Core Value Proposition:**

1. **Drastically Reduced Friction:** Replaces clunky legacy forms with a modern, reactive web interface (React/Next.js).  
2. **AI as a Force Multiplier:** Utilizes **Google Gemini Pro** to assist faculty in analyzing complex data sets and **Google Vertex AI Search** to retrieve compliance information instantly from institutional PDFs.  
3. **Accreditation Safety:** Hard-codes ACCJC Standards (1.3, 2.9) into the workflow, ensuring no review is submitted without addressing critical compliance metrics like Disproportionate Impact (DI).

## ---

**2\. Strategic Alignment & Market Needs**

### **2.1 LACCD IT Roadmap Alignment**

Research into the LACCD Technology Strategic Plan identifies specific gaps that Luminous fills:

* **Gap 2.5 (AI/Robotic Process Automation):** Luminous directly addresses the district's goal to "Establish Artificial Intelligence capabilities" by automating the mundane aspects of report generation.  
* **Gap 1.4 (Strategic Data Analytics):** Luminous moves beyond static PDFs by visualizing live data streams for decision-making.

### **2.2 Accreditation (ACCJC) Requirements**

Luminous is architected to satisfy specific 2024 Accreditation Standards:

* **Standard 1.3 (Data-Informed):** The system prevents submission if data fields are left unanalyzed.  
* **Standard 2.9 (systematic Review):** The system enforces the "3-Year Comprehensive / 1-Year Update" cycle managed by the LAMC Program Review Oversight Committee (PROC).

## ---

**3\. Functional Requirements: The "Luminous" Experience**

### **3.1 Module A: The "Context-Aware" Editor**

This is the core workspace for Faculty writers. It is not a standard text box; it is an AI-assisted canvas.

* **Requirement A.1 (Data Injection):** When a user navigates to the "Student Success" section, Luminous must fetch live success/retention data from the data warehouse (or eLumen export) and visualize it immediately above the text editor.  
* **Requirement A.2 (Gemini Analysis Assistant):**  
  * *User Action:* Click "Analyze Trends."  
  * *System Action:* Sends the data JSON to **Google Gemini 1.5 Pro** with a system prompt: *"Identify 3 key trends in this data, specifically looking for disproportionate impact in Latinx and Black student populations compared to the institution-set standard of 67%."*  
  * *Output:* Gemini returns a bulleted summary. The user can drag-and-drop these insights into their narrative.  
* **Requirement A.3 (Evidence Locker):** Users can upload evidence (meeting minutes, advisory board agendas).

### **3.2 Module B: The "Compliance Copilot" (Vertex AI Search)**

Faculty often struggle to recall specific goals from the *Educational Master Plan* (EMP) or the *Strategic Master Plan* (SMP).

* **Requirement B.1 (RAG Implementation):** Luminous will utilize **Google Vertex AI Search** (formerly Enterprise Search). We will ingest LAMC’s core PDF documents (ISMP 2019-2024, Governance Handbook, Catalog) into a Vertex Data Store.  
* **Requirement B.2 (Sidebar Chat):**  
  * *User Query:* "Which strategic goal relates to dual enrollment?"  
  * *System Action:* Vertex AI retrieves the exact text from "Goal 1.1" of the ISMP and cites the page number.  
  * *Benefit:* Ensures Program Goals are authentically aligned with the College Mission (ACCJC Standard 1.1).

### **3.3 Module C: The Integration Engine (eLumen & SIS)**

Luminous does not try to recreate the heavy lifting of curriculum management. It connects to eLumen.

* **Requirement C.1 (eLumen Curriculum Sync):**  
  * *Frequency:* Nightly.  
  * *Action:* Call eLumen Public API (GET /fullcourses) to retrieve active courses.  
  * *Display:* In the Program Review "Curriculum" tab, Luminous displays a read-only table of courses. It flags courses not offered in \>2 years (Viability Check).  
* **Requirement C.2 (SLO Performance Import):**  
  * *Action:* Ingest CSV exports or API data from eLumen’s "Insights" module.  
  * *Visualization:* Heatmap showing which CSLOs (Course Student Learning Outcomes) are meeting targets vs. those that are failing.

## ---

**4\. Technical Architecture**

### **4.1 Tech Stack**

* **Frontend:** **Next.js** (React) for a fast, responsive UI. hosted on **Google Cloud Run**.  
* **Backend:** **Python (FastAPI)** to handle orchestration between the frontend and Google AI services.  
* **Database:** **Google Firestore** (NoSQL).  
  * *Why?* Program Review templates change every year. NoSQL allows us to change the "Form Schema" (questions asked) without migrating a SQL database schema.  
* **AI Layer:**  
  * **Vertex AI API:** For Gemini 1.5 Pro text generation.  
  * **Vertex AI Agent Builder:** For the RAG (Retrieval Augmented Generation) search of PDF documents.

### **4.2 Data Flow Diagram**

1. **Input:** eLumen (Curriculum/SLO Data) \+ PeopleSoft (Enrollment Data) \-\> **BigQuery Data Lake**.  
2. **Processing:** Luminous queries BigQuery for specific department data.  
3. **Interaction:** Faculty user views data, uses **Gemini AI** to draft narrative.  
4. **Storage:** Drafts saved to **Firestore**.  
5. **Output:** Final PDF Report generated for Accreditation Evidence; Resource Requests exported to SAP/Excel for Budget Committee.

## ---

**5\. User Roles & Workflows**

### **5.1 Faculty (Writer)**

* **Goal:** Complete the Annual Update in under 2 hours.  
* **AI Feature:** Uses "Rewrite for Tone" to make rough notes sound like professional academic prose.  
* **Workflow:** Login (SSO) \-\> Dashboard \-\> Select "2025 Annual Update" \-\> Review Auto-Populated Data \-\> Write Narratives \-\> Submit to Chair.

### **5.2 Department Chair (Reviewer)**

* **Goal:** Validate 15 different program reviews for quality.  
* **AI Feature:** "Completeness Check." The system scans the draft and flags sections where the word count is low or where specific keywords (e.g., "Equity," "Closing the Loop") are missing.  
* **Workflow:** Receive Alert \-\> View Dashboard of all Dept Programs \-\> Add Comments \-\> "Approve & Forward to Dean."

### **5.3 PROC Member (Oversight Committee)**

* **Goal:** Validate alignment with college mission.  
* **Feature:** "Rubric Mode." A split screen where the Review is on the left, and the PROC validation rubric is on the right. Scores are saved directly to the database.

## ---

**6\. Implementation Roadmap**

### **Phase 1: MVP (Months 1-3)**

* **Setup:** Configure Google Cloud Project, Firestore, and Vertex AI.  
* **Ingestion:** Index the LAMC Program Review Handbook and ISMP into Vertex AI Search.  
* **Form Builder:** Build the dynamic form engine in Next.js to replicate the current PDF template.

### **Phase 2: Integration (Months 4-6)**

* **eLumen Connection:** Build Python scripts to fetch/clean eLumen SLO data and cache it in Firestore.  
* **Dashboarding:** Build the data visualization widgets (Chart.js or Recharts) for success/retention rates.

### **Phase 3: Pilot (Month 7\)**

* **Select Group:** Roll out to 3 diverse departments (e.g., English, Culinary Arts, Counseling).  
* **Tuning:** Refine Gemini prompts based on faculty feedback (e.g., ensuring the AI doesn't "hallucinate" data that isn't there).

## ---

**7\. Next Steps for the User**

To finalize the "Compliance Copilot" (Module B), we need to gather the "Knowledge Base" for the AI.

Immediate Action Item:  
Please locate the following digital documents to feed into the Vertex AI Search engine:

1. The **LAMC Integrated Strategic Master Plan (ISMP) 2019-2024**.  
2. The **2024 Program Review Handbook** (or the most recent version managed by PROC).  
3. Any **Rubrics** currently used by the committee to score reviews.

*Once provided, I can generate the specific system prompts required to make the AI answer questions accurately based on these documents.*