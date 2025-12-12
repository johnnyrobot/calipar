# Luminous Autonomous Coding Agent

## Project Overview

This project is an **Autonomous Coding Agent** harness demonstrating long-running software development using the Claude Agent SDK. The agent is designed to autonomously build **Luminous**, an AI-enhanced Program Review and Integrated Planning platform for Los Angeles Mission College (LAMC).

The system uses **Linear** for project management, allowing the agent to create issues, track progress, and update tasks in real-time.

## Architecture

The project employs a **Two-Agent Pattern**:

1.  **Initializer Agent (Session 1):**
    *   Reads the application specification (`prompts/app_spec.txt`).
    *   Creates a new project in Linear.
    *   Generates ~50 detailed implementation issues (User Stories/Tasks).
    *   Sets up the initial project structure and git repository.

2.  **Coding Agent (Sessions 2+):**
    *   Queries Linear for the highest-priority "Todo" issue.
    *   Claims the issue (sets status to "In Progress").
    *   Implements the feature and runs tests (including UI testing via Puppeteer).
    *   Updates the issue with implementation notes.
    *   Marks the issue as "Done".

## Setup & Usage

### Prerequisites

*   Python 3.x
*   Node.js & npm (for Claude Code CLI)
*   Claude Code CLI: `npm install -g @anthropic-ai/claude-code`

### Environment Variables

Required variables to run the agent:

*   `CLAUDE_CODE_OAUTH_TOKEN`: Your Claude OAuth token (generate via `claude setup-token`).
*   `LINEAR_API_KEY`: API key for Linear (from Workspace Settings > API).

### Installation

```bash
pip install -r requirements.txt
```

### Running the Agent

To start the autonomous process (creates project `luminous_app` by default):

```bash
python autonomous_agent_demo.py --project-dir ./luminous_app
```

**Options:**
*   `--project-dir <path>`: Directory for the generated application.
*   `--max-iterations <N>`: Limit the number of agent loops (useful for testing).
*   `--model <model_id>`: Specify the Claude model to use.

## Key Files & Structure

*   `autonomous_agent_demo.py`: Main CLI entry point.
*   `agent.py`: Core agent logic, handling the session loop and state.
*   `client.py`: Configures the Claude SDK client, including MCP servers (Linear, Puppeteer) and security tools.
*   `security.py`: Implements a "defense-in-depth" security model with a bash command allowlist and sandboxing.
*   `prompts/`:
    *   `app_spec.txt`: The detailed specification for the Luminous application.
    *   `initializer_prompt.md`: Instructions for the first session (project setup).
    *   `coding_prompt.md`: Instructions for subsequent sessions (feature implementation).
*   `ACCJC/` & `reference_data/`: Context files (PDFs, CSVs) used by the agent to understand domain requirements (accreditation standards, course data).

## Luminous Application Stack

The agent is instructed to build the Luminous platform using:

*   **Frontend:** Next.js (React), Tailwind CSS, Chart.js/Recharts.
*   **Backend:** Python FastAPI.
*   **Database:** Google Firestore (NoSQL).
*   **AI:** Google Vertex AI (Gemini 1.5 Pro) with RAG.
*   **Auth:** SAML 2.0 / LACCD SSO.

## Security Model

The agent runs with strict security constraints:
*   **Sandbox:** Bash commands are isolated.
*   **Filesystem:** Operations restricted to the project directory.
*   **Allowlist:** Only specific commands (e.g., `npm`, `git`, `ls`, `grep`) are permitted.
