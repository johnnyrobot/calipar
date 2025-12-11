# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Luminous** is an AI-enhanced Program Review and Integrated Planning platform for Los Angeles Mission College (LAMC). The autonomous coding agent in `autonomous-coding/` is used to build this application.

## Luminous - The Application Being Built

### Tech Stack
- **Frontend**: Next.js (React) + Tailwind CSS, Chart.js/Recharts for visualizations
- **Backend**: Python FastAPI
- **Database**: Google Firestore (NoSQL)
- **AI**: Google Vertex AI (Gemini 1.5 Pro) for analysis, RAG via Vertex AI Agent Builder
- **Analytics**: Google BigQuery
- **Auth**: SAML 2.0 / LACCD SSO (mocked for demo)

### Core Features
- **Program Review Template Designer**: Versioned templates for Instructional/Student Services/Administrative/CTE units with embedded data widgets
- **Context-Aware Editor**: AI-assisted narrative writing with "Analyze Trends", "Expand to Narrative", "Rewrite for Tone"
- **Equity Lens Assistant**: Pre-submission equity check against ACCJC Standards, DI/PPG gap analysis
- **SLO Assessment Synthesis**: eLumen data ingestion, heatmaps, CSLO→PSLO→ISLO mapping
- **Integrated Planning**: Goal mapping to ISMP strategic initiatives ("Golden Thread"), mandatory linkage
- **Resource Allocation**: "Amazon Cart" experience, object code validation, TCO calculator, prioritization workflow
- **Compliance Copilot (Mission-Bot)**: RAG chatbot for institutional document queries with citations
- **Workflow Engine**: Visual progress (Draft→Chair→Dean→PROC→Approved), RBAC, audit trail

### Key Database Entities
`users`, `organizations`, `strategic_initiatives`, `program_reviews`, `review_sections`, `action_plans`, `resource_requests`, `slo_data`, `curriculum_data`, `validation_rubrics`, `audit_log`

### UI Layout
Three-column: sidebar (navigation) | main (review workspace) | panel (AI assistant/artifacts)

## Autonomous Coding Agent

The agent in `autonomous-coding/` builds Luminous using the spec in `prompts/app_spec.txt`.

### Running the Agent

```bash
cd autonomous-coding
pip install -r requirements.txt

# Set up Claude OAuth token (run 'claude setup-token' first if needed)
export CLAUDE_CODE_OAUTH_TOKEN='your-oauth-token'

# Set up Linear API key (from https://linear.app/YOUR-TEAM/settings/api)
export LINEAR_API_KEY='lin_api_xxxxxxxxxxxxx'

# Run (first session takes 10-20+ minutes creating 50 Linear issues)
python autonomous_agent_demo.py --project-dir ./luminous_app

# Test with limited iterations
python autonomous_agent_demo.py --project-dir ./luminous_app --max-iterations 3
```

Generated projects go to `generations/<project-dir>/`.

### Linear Integration

The agent uses Linear for project management instead of local files:
- **First session**: Creates a Linear project with 50 issues based on `app_spec.txt`
- **Subsequent sessions**: Queries Linear for Todo issues, works them, marks Done
- **Session handoff**: Via comments on a META issue in Linear
- **Real-time visibility**: Watch progress in your Linear workspace

### Two-Agent Pattern
- **Session 1 (Initializer)**: Reads `app_spec.txt`, creates Linear project with 50 issues, sets up project structure
- **Sessions 2+ (Coding Agent)**: Queries Linear for Todo issues, implements features, marks them Done in Linear

### Key Files
- `autonomous_agent_demo.py` - CLI entry point
- `agent.py` - Session loop using `ClaudeSDKClient`
- `client.py` - SDK client with security settings and MCP servers (Puppeteer, Linear)
- `linear_config.py` - Linear configuration constants
- `security.py` - Bash command allowlist and validation hooks
- `prompts/app_spec.txt` - Full Luminous specification
- `prompts/initializer_prompt.md` - First session prompt (creates Linear issues)
- `prompts/coding_prompt.md` - Continuation prompt (works Linear issues)

### Security Model (Defense in Depth)
1. **OS-level sandbox**: Bash commands isolated
2. **Filesystem restrictions**: Ops restricted to project directory
3. **Bash allowlist** (`security.py`): `ls`, `cat`, `head`, `tail`, `wc`, `grep`, `cp`, `mkdir`, `chmod`, `pwd`, `npm`, `node`, `git`, `ps`, `lsof`, `sleep`, `pkill`

### Customization
- **Change app spec**: Edit `prompts/app_spec.txt`
- **Reduce features**: Edit `prompts/initializer_prompt.md` (default: 200)
- **Add commands**: Update `ALLOWED_COMMANDS` in `security.py`
