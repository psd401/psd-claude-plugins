# PSD Plugin Marketplace

Peninsula School District's plugin marketplace for Claude Code and Claude Cowork.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-blue)](https://docs.claude.com/en/docs/claude-code)
[![Version](https://img.shields.io/badge/Version-2.21.5-green)]()

## Overview

**Two independently installable plugins** — one for software development workflows, one for general productivity.

**Version**: 2.21.5

---

## Plugins

### psd-coding-system

AI-assisted development system with 21 skills, 44 specialized agents, memory-based learning, and Context7 framework docs.

```bash
/plugin install psd-coding-system
```

| Skill | Description |
|-------|-------------|
| `/work` | Implement solutions with auto reviews + learning capture |
| `/lfg` | Autonomous end-to-end: implement → test → review → fix → learn |
| `/debug` | Structured root-cause analysis: reproduce → hypothesize → test → verify → fix → learn |
| `/architect` | System architecture design |
| `/test` | Comprehensive testing with self-healing + learning capture |
| `/review-pr` | Iterative PR feedback (rounds 2+ process only new comments) |
| `/issue` | AI-validated GitHub issues |
| `/product-manager` | Product specs to sub-issues |
| `/security-audit` | Security analysis |
| `/scope` | Scope classification + tiered planning |
| `/evolve` | Auto-evolve: analyze learnings, check releases, compare plugins |
| `/brainstorm` | Collaborative requirements exploration |
| `/changelog` | Auto-generate changelog entries |
| `/deepen-plan` | Parallel per-section plan research |
| `/setup` | Per-project review agent configuration |
| `/worktree` | Git worktree management |
| `/swarm` | Parallel agent orchestration |
| `/optimize` | Metric-driven iterative optimization loops |
| `/bump-version` | Automate version bump ritual |
| `/clean-branch` | Post-merge cleanup |
| `/triage` | FreshService ticket triage |

[Full documentation →](./plugins/psd-coding-system/README.md)

### psd-productivity

32 productivity workflows for district operations, document generation, research, and media. Works in both Claude Code and Claude Cowork.

```bash
/plugin install psd-productivity
```

| Category | Skills |
|----------|--------|
| **Productivity** (3) | `/freshservice-manager` · `/redrover-manager` · `/legislative-tracker` |
| **Content & Docs** (10) | `/writer` · `/docx` · `/pptx` · `/pdf` · `/pdf-builder` · `/pdf-to-markdown` · `/xlsx` · `/presentation-master` · `/assistant-architect` · `/sop-creator` |
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

### Review Specialists (16 agents)
`security-analyst` · `security-analyst-specialist` · `deployment-verification-agent` · `data-migration-expert` · `agent-native-reviewer` · `architecture-strategist` · `code-simplicity-reviewer` · `pattern-recognition-specialist` · `correctness-reviewer` · `adversarial-reviewer` · `schema-drift-detector` · `data-integrity-guardian` · `typescript-reviewer` · `python-reviewer` · `swift-reviewer` · `sql-reviewer`

### Domain Specialists (7 agents)
`backend-specialist` · `frontend-specialist` · `database-specialist` · `llm-specialist` · `ux-specialist` · `architect-specialist` · `shell-devops-specialist`

### Quality (3 agents)
`test-specialist` · `performance-optimizer` · `documentation-writer`

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
│   │   ├── skills/                # 21 user-invocable skills
│   │   ├── agents/                # 44 specialized agents
│   │   ├── hooks/                 # PostToolUse syntax validation
│   │   ├── scripts/               # Hook scripts
│   │   └── docs/                  # Learnings + patterns
│   └── psd-productivity/          # Productivity workflows
│       ├── skills/                # 32 productivity skills
│       └── agents/                # Workflow-specific agents (TBD)
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
