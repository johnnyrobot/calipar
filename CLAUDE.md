# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Luminous** is an AI-enhanced Program Review and Integrated Planning platform for Los Angeles Mission College (LAMC). This repository contains an autonomous coding agent that builds Luminous using the Claude Agent SDK.

## Running the Agent

```bash
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

## Running Tests

```bash
python test_security.py
```

## Architecture

### Two-Agent Pattern
- **Session 1 (Initializer)**: Reads `prompts/app_spec.txt`, creates Linear project with 50 issues, sets up project structure
- **Sessions 2+ (Coding Agent)**: Queries Linear for Todo issues, implements features, marks them Done

### Key Files
- `autonomous_agent_demo.py` - CLI entry point, argument parsing
- `agent.py` - Session loop using `ClaudeSDKClient`, handles `run_agent_session()` and `run_autonomous_agent()`
- `client.py` - SDK client configuration with security settings and MCP servers (Puppeteer, Linear)
- `linear_config.py` - Linear configuration constants
- `security.py` - Bash command allowlist and validation hooks
- `progress.py` - Progress tracking utilities, Linear state detection
- `prompts.py` - Prompt loading utilities

### Prompts
- `prompts/app_spec.txt` - Full Luminous application specification
- `prompts/initializer_prompt.md` - First session prompt (creates Linear issues)
- `prompts/coding_prompt.md` - Continuation prompt (works Linear issues)

### Reference Data
- `ACCJC/` - Accreditation standards PDFs and CSV exports
- `reference_data/` - Course data, PRD documents
- `course_data/` - Excel/CSV files for LA Mission College courses

### Security Model (Defense in Depth)
1. **OS-level sandbox**: Bash commands isolated via `sandbox.enabled`
2. **Filesystem restrictions**: Ops restricted to project directory via relative paths
3. **Bash allowlist** (`security.py`): `ls`, `cat`, `head`, `tail`, `wc`, `grep`, `cp`, `mkdir`, `chmod`, `pwd`, `npm`, `node`, `git`, `ps`, `lsof`, `sleep`, `pkill`
4. **Extra validation**: `pkill` only for dev processes (node, npm, vite), `chmod` only with `+x` mode, only `./init.sh` scripts

### MCP Servers
- **Puppeteer** (stdio): Browser automation for UI testing
- **Linear** (HTTP at mcp.linear.app): Project management - issues, status, comments

## Luminous Application Being Built

### Tech Stack
- **Frontend**: Next.js (React) + Tailwind CSS, Chart.js/Recharts
- **Backend**: Python FastAPI
- **Database**: Google Firestore (NoSQL)
- **AI**: Google Vertex AI (Gemini 1.5 Pro), RAG via Vertex AI Agent Builder
- **Auth**: SAML 2.0 / LACCD SSO

### Core Features
- Program Review Template Designer with embedded data widgets
- Context-Aware Editor with AI-assisted narrative writing
- Equity Lens Assistant for ACCJC compliance
- SLO Assessment Synthesis with eLumen data
- Integrated Planning with ISMP strategic initiative mapping
- Resource Allocation with TCO calculator
- Compliance Copilot (Mission-Bot) RAG chatbot
- Workflow Engine with RBAC and audit trail

## Customization

- **Change app spec**: Edit `prompts/app_spec.txt`
- **Reduce features**: Edit `prompts/initializer_prompt.md` (default: 50 issues)
- **Add commands**: Update `ALLOWED_COMMANDS` in `security.py`
