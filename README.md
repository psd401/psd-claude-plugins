# PSD Plugin Marketplace

Peninsula School District's plugin marketplace for Claude Code and Claude Cowork.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-blue)](https://docs.claude.com/en/docs/claude-code)
[![Version](https://img.shields.io/badge/Version-2.28.2-green)]()

## Overview

**Two independently installable plugins** — one for software development workflows, one for general productivity.

**Version**: 2.28.2

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
| **Content & Docs** (15) | `/writer` · `/docx` · `/pptx` · `/pdf` · `/pdf-builder` · `/pdf-to-markdown` · `/xlsx` · `/presentation-master` · `/assistant-architect` · `/sop-creator` · `/tech-writing` · `/html-artifact` · `/board-policy-formatter` · `/slides-to-site` · `/psd-atrium` |
| **Communications** (2) | `/parentsquare` · `/class-intercom` |
| **E-Signature** (2) | `/documenso-manager` · `/docusign-manager` |
| **Automation** (2) | `/n8n-manager` · `/browser-control` |
| **Research** (3) | `/research` · `/multi-model-research` · `/strategic-planning-manager` |
| **Audio & Media** (3) | `/elevenlabs-tts` · `/local-tts` · `/image-gen` |
| **Planning** (2) | `/seven-advisors` · `/skill-creator` |
| **PSD-Specific** (3) | `/psd-athletics` · `/psd-brand-guidelines` · `/psd-instructional-vision` |
| **Operations** (2) | `/enrollment` · `/chief-of-staff` |

[Full documentation →](./plugins/psd-productivity/README.md)

---

## Quick Start

```bash
# Add the marketplace
/plugin marketplace add psd401/psd-claude-plugins

# Install the plugin(s) you want
/plugin install psd-coding-system        # Development workflows
/plugin install psd-productivity          # Productivity workflows

# Verify
/plugin list
```

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
│   └── marketplace.json           # Lists both plugins
├── plugins/
│   ├── psd-coding-system/         # Development workflows
│   │   ├── skills/                # 7 user-invocable skills
│   │   ├── agents/                # 44 specialized agents
│   │   ├── hooks/                 # PostToolUse syntax validation
│   │   ├── scripts/               # Hook scripts
│   │   └── docs/                  # Learnings + patterns
│   └── psd-productivity/          # Productivity workflows
│       ├── skills/                # 38 productivity skills
│       └── agents/                # enrollment-validator
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
