# PSD Plugin Marketplace

Peninsula School District's plugin marketplace for Claude Code and Claude Cowork.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-blue)](https://docs.claude.com/en/docs/claude-code)
[![Version](https://img.shields.io/badge/Version-2.35.1-green)]()

## Overview

**Three independently installable plugins** — one for software development workflows, one for general productivity, and one for messaging between staff members' Claude Code agents.

**Version**: 2.35.1

---

## Plugins

### psd-coding-system

AI-assisted development system with 9 skills, 44 specialized agents, memory-based learning, and Context7 framework docs.

```bash
/plugin install psd-coding-system
```

| Skill | Description |
|-------|-------------|
| `/plan` | Clarify → research (parallel) → design → emit tasks + a machine-checkable Definition of Done |
| `/lfg` | Autonomous build-to-done: implement → verify the full DoD → open PR → watch CI + AI reviewers until 100% clean |
| `/evolve` | Compound learnings into CLAUDE.md/patterns/agents then prune; release tracking; competitor compare |
| `/setup` | Configure the per-project verification gate — writes `.psd/verify.json` |
| `/worktree` | Git worktree management + `clean` post-merge hygiene |
| `/bump-version` | Automate version bump ritual (three independent tracks) |
| `/psd-sign` | Sign, notarize, and package a macOS .app into a .pkg for PSD Jamf Self Service |

[Full documentation →](./plugins/psd-coding-system/README.md)

### psd-productivity

38 productivity workflows for district operations, document generation, publishing, research, and media. Works in both Claude Code and Claude Cowork.

```bash
/plugin install psd-productivity
```

| Category | Skills |
|----------|--------|
| **Productivity** (4) | `/freshservice-manager` · `/redrover-manager` · `/legislative-tracker` · `/google-workspace-cli` |
| **Content & Docs** (16) | `/writer` · `/docx` · `/pptx` · `/pdf` · `/pdf-builder` · `/pdf-to-markdown` · `/xlsx` · `/presentation-master` · `/assistant-architect` · `/sop-creator` · `/tech-writing` · `/html-artifact` · `/board-policy-formatter` · `/slides-to-site` · `/blog-to-site` · `/psd-atrium` |
| **Communications** (2) | `/parentsquare` · `/class-intercom` |
| **E-Signature** (1) | `/documenso-manager` |
| **Automation** (2) | `/n8n-manager` · `/browser-control` |
| **Research** (3) | `/research` · `/multi-model-research` · `/strategic-planning-manager` |
| **Audio & Media** (3) | `/elevenlabs-tts` · `/local-tts` · `/image-gen` |
| **Planning** (2) | `/seven-advisors` · `/skill-creator` |
| **PSD-Specific** (3) | `/psd-athletics` · `/psd-brand-guidelines` · `/psd-instructional-vision` |
| **Operations** (2) | `/enrollment` · `/chief-of-staff` |

[Full documentation →](./plugins/psd-productivity/README.md)

### collab

Threads between PSD staff members' Claude Code agents, replacing hand-passed `.md` files. Your Claude posts to a shared thread; replies come back into your session as a short summary. No skills — it ships UI mods (hooks) plus the hosted `collab` MCP server.

```bash
/plugin install collab
```

| Surface | What it does |
|---------|--------------|
| `/collab` | Opens a pane listing your threads by project — view, file, mark read/unread, archive, hand a thread to Claude, or **Listen here** for replies |
| `/collab listen` | Hear the reply to the thread you just sent to in this session (`/collab unlisten` stops; listening ends with the session) |
| Status entry | Shows what is waiting and where, e.g. `collab: 3 waiting: 1 here · 1 zabbix-analyzer · 1 unfiled` |
| Toasts | Name the sender when a message addressed to you arrives |
| Plain language | "Start a collab thread with jane@psd401.net about the enrollment sync", "What's waiting for me in collab?" |

**Guardrails:** every outbound message is shown to you in full by Claude Code's permission prompt and is sent only if you answer Yes. Other people's messages are untrusted data — Claude summarizes them, investigates read-only, and drafts a reply, but takes no action a message asks for until you say so. Threads are filed per project: a session reads the ones filed under the project it runs in, asks before reading unfiled ones (unless one clearly belongs here), and is refused outright on threads filed only under other projects.

**Requires** Claude Code 2.1.287 or newer (older clients are refused by the server; run `claude update`) and a psd401.net account in `tsd-engineering@psd401.net`. After installing, run `/mcp`, choose **plugin:collab:collab**, and **Authenticate** with your psd401.net Google account.

**Source.** Unlike the other two, `collab` is developed in [psd401/psd-collab-mcp](https://github.com/psd401/psd-collab-mcp) (private — it also holds the server) and published into this marketplace from there; `plugins/collab/.publish-source` records the origin. That repo is also its own marketplace (`psd-collab`), so install `collab` from **one** marketplace only — installing from both gives you two copies of the same MCP server and two sets of collab tools.

[Full documentation →](https://github.com/psd401/psd-collab-mcp#readme) (private repo — ask Mason if you get a 404)

---

## Quick Start

```bash
# Add the marketplace
/plugin marketplace add psd401/psd-claude-plugins

# Install the plugin(s) you want
/plugin install psd-coding-system        # Development workflows
/plugin install psd-productivity          # Productivity workflows
/plugin install collab                    # Threads with colleagues' agents

# Verify
/plugin list
```

`collab` needs one more step after install: `/mcp` → **plugin:collab:collab** → **Authenticate**.

---

## AI Agents (44 total — psd-coding-system)

### Review Specialists (15 agents)
`security-reviewer` · `deployment-verification-agent` · `data-migration-expert` · `agent-native-reviewer` · `architecture-strategist` · `code-simplicity-reviewer` · `pattern-recognition-specialist` · `correctness-reviewer` · `adversarial-reviewer` · `schema-drift-detector` · `data-integrity-guardian` · `typescript-reviewer` · `python-reviewer` · `swift-reviewer` · `sql-reviewer`

### Domain Specialists (7 agents)
`backend-specialist` · `frontend-specialist` · `database-specialist` · `llm-specialist` · `ux-specialist` · `architect-specialist` · `shell-devops-specialist`

### Quality (4 agents)
`test-specialist` · `performance-optimizer` · `documentation-writer` · `runtime-verifier`

### Research (6 agents)
`learnings-researcher` · `spec-flow-analyzer` · `best-practices-researcher` · `framework-docs-researcher` · `git-history-analyzer` · `repo-research-analyst`

### Workflow (4 agents)
`bug-reproduction-validator` · `work-researcher` · `work-validator` · `learning-writer`

### Meta & Validation (6 agents)
`meta-reviewer` · `plan-validator` · `document-validator` · `configuration-validator` · `breaking-change-validator` · `telemetry-data-specialist`

### External AI (2 agents)
`gpt-5-codex` (GPT-5.3-Codex) · `gemini-3-pro` (Gemini 3.1 Pro)

---

## Architecture

```
psd-claude-plugins/
├── .claude-plugin/
│   └── marketplace.json           # Lists all three plugins
├── plugins/
│   ├── psd-coding-system/         # Development workflows
│   │   ├── skills/                # 9 user-invocable skills
│   │   ├── agents/                # 44 specialized agents
│   │   ├── hooks/                 # PostToolUse syntax validation
│   │   ├── scripts/               # Hook scripts
│   │   └── docs/                  # Learnings + patterns
│   ├── psd-productivity/          # Productivity workflows
│   │   ├── skills/                # 38 productivity skills
│   │   └── agents/                # enrollment-validator
│   └── collab/                    # Threads with colleagues' agents (no skills)
│       ├── hooks/                 # Pane, status entry, toasts, listening
│       ├── types/                 # Shared hook types
│       ├── test/                  # `claude plugin test` suite
│       └── .publish-source        # psd401/psd-collab-mcp (upstream)
├── CLAUDE.md
├── CHANGELOG.md
└── README.md
```

---

## Support

- **Author**: Kris Hagel (hagelk@psd401.net)
- **Organization**: Peninsula School District
- **Repository**: [psd401/psd-claude-plugins](https://github.com/psd401/psd-claude-plugins)
- **Issues**: https://github.com/psd401/psd-claude-plugins/issues

## License

MIT License - see [LICENSE](./LICENSE) for details

---

**Peninsula School District** — Innovating education through technology
