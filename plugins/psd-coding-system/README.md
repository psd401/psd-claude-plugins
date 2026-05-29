# PSD Coding System

**Comprehensive AI-assisted development system for Peninsula School District**

Version: 2.4.0
Status: Production-Ready Workflows + Memory-Based Learning
Author: Kris Hagel (hagelk@psd401.net)

---

## What Is This?

A unified Claude Code plugin combining **battle-tested development workflows** with **memory-based learning** and **knowledge compounding**. Get immediate productivity gains from proven commands while the system captures learnings and compounds knowledge over time.

**One plugin. Three superpowers.**

1. **Workflow Automation** - 21 skills + 44 specialized agents
2. **Memory-Based Learning** - Automatic learning capture via `/work`, `/test`, `/review-pr`, `/lfg`, `/debug`
3. **Knowledge Evolution** - `/evolve` auto-analyzes learnings, checks releases, compares plugins, contributes patterns

---

## Quick Start

```bash
# Install the marketplace
/plugin marketplace add psd401/psd-claude-plugins

# Install this plugin
/plugin install psd-coding-system

# Start using workflow commands immediately
/work 347              # Implement an issue
/test                  # Run comprehensive tests
/review-pr 123         # Handle PR feedback
/evolve               # Auto-evolve the plugin
```

---

## Workflow Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/work` | Implement solutions with auto reviews | `/work 347` or `/work "add logging"` |
| `/lfg` | Autonomous end-to-end: implement → test → review → fix → learn | `/lfg 347` or `/lfg "add caching"` |
| `/debug` | Structured root-cause analysis: reproduce → hypothesize → test → verify → fix | `/debug 347` or `/debug "TypeError in auth flow"` |
| `/architect` | System architecture via architect-specialist | `/architect 347` |
| `/test` | Comprehensive testing with coverage validation | `/test auth` |
| `/review-pr` | Iterative PR feedback (incremental on rounds 2+) | `/review-pr 123` |
| `/security-audit` | Manual security audit (auto in /work) | `/security-audit 123` |
| `/issue` | AI-validated issues with spec flow analysis | `/issue "add caching"` |
| `/triage` | FreshService ticket to GitHub issue | `/triage 12345` |
| `/product-manager` | Validated specs to auto sub-issues | `/product-manager "dashboard"` |
| `/evolve` | Auto-evolve: analyze learnings, check releases, compare plugins | `/evolve` |
| `/optimize` | Metric-driven iterative optimization | `/optimize "reduce API latency"` |
| `/clean-branch` | Cleanup + auto learning extraction | `/clean-branch` |

---

## AI Agents (44 total)

### Review Specialists (`agents/review/`)

| Agent | Purpose |
|-------|---------|
| `security-analyst` | Security vulnerability analysis |
| `security-analyst-specialist` | Comprehensive security review |
| `deployment-verification-agent` | Go/No-Go deployment checklists |
| `data-migration-expert` | ID mappings, foreign key validation |
| `agent-native-reviewer` | AI architecture parity checks |
| `architecture-strategist` | SOLID compliance, anti-pattern detection |
| `code-simplicity-reviewer` | YAGNI enforcement, complexity scoring |
| `pattern-recognition-specialist` | Code duplication detection |
| `correctness-reviewer` | Logic errors, edge cases, off-by-one, state bugs |
| `adversarial-reviewer` | Failure scenarios across component boundaries |
| `schema-drift-detector` | ORM vs migration schema drift detection |
| `data-integrity-guardian` | PII/FERPA/GDPR compliance scanning |
| `typescript-reviewer` | TypeScript/JavaScript code review |
| `python-reviewer` | Python code review |
| `swift-reviewer` | Swift code review |
| `sql-reviewer` | SQL code review |

### Domain Specialists (`agents/domain/`)

| Agent | Purpose |
|-------|---------|
| `backend-specialist` | APIs, server logic, system integration |
| `frontend-specialist` | React, UI components, UX |
| `database-specialist` | Schema design, query optimization |
| `llm-specialist` | AI integration, prompt engineering |
| `ux-specialist` | 68 usability heuristics, accessibility |
| `architect-specialist` | Architecture design |
| `shell-devops-specialist` | Shell scripting, DevOps |

### Quality Assurance (`agents/quality/`)

| Agent | Purpose |
|-------|---------|
| `test-specialist` | Test coverage, automation, QA |
| `performance-optimizer` | Web vitals, API latency, Big O analysis, N+1 detection |
| `documentation-writer` | API docs, user guides |

### Research (`agents/research/`)

| Agent | Purpose |
|-------|---------|
| `spec-flow-analyzer` | Gap analysis, user flow mapping |
| `learnings-researcher` | Knowledge base search |
| `best-practices-researcher` | Two-phase knowledge lookup with deprecation validation |
| `framework-docs-researcher` | Framework/API deprecation checking |
| `git-history-analyzer` | Git archaeology, hot files, churn patterns |
| `repo-research-analyst` | Codebase onboarding and deep research |

### Workflow (`agents/workflow/`)

| Agent | Purpose |
|-------|---------|
| `bug-reproduction-validator` | Documented bug reproduction with evidence |
| `work-researcher` | Pre-implementation research orchestrator |
| `work-validator` | Post-implementation validation orchestrator |
| `learning-writer` | Automatic lightweight learning capture |

### External AI (`agents/external/`)

| Agent | Purpose |
|-------|---------|
| `gpt-5-codex` | GPT-5.3-Codex for second opinions |
| `gemini-3-pro` | Gemini 3.1 Pro for multimodal analysis |

### Meta (`agents/meta/`)

| Agent | Purpose |
|-------|---------|
| `meta-reviewer` | Analyzes learnings + agent memory for patterns |

### Validators (`agents/validation/`)

| Agent | Purpose |
|-------|---------|
| `plan-validator` | GPT-5 powered plan validation |
| `document-validator` | Data validation at boundaries |
| `configuration-validator` | Multi-file consistency |
| `breaking-change-validator` | Dependency analysis |
| `telemetry-data-specialist` | Data pipeline correctness |

---

## Knowledge Compounding System

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE CAPTURE SYSTEM                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Session Event           AI Synthesis                           │
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │ Error detected    │  │ learning-writer   │                  │
│  │ Rework observed   │  │ - Auto-capture    │                  │
│  │ User frustration  │──▶ - Deduplicate     │                  │
│  │ Discovery made    │  │ - Generate doc    │                  │
│  └───────────────────┘  └─────────┬─────────┘                  │
│                                   │                             │
│                                   ▼                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    KNOWLEDGE STORES                        │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  Project-Specific           Plugin-Wide (Shared)          │ │
│  │  ./docs/learnings/          plugin/docs/patterns/         │ │
│  │  - Project patterns         - Common anti-patterns        │ │
│  │  - Domain knowledge         - Framework gotchas           │ │
│  │  - Team conventions         - Security patterns           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Capturing Learnings

Learnings are captured automatically by `/work`, `/test`, `/review-pr`, `/lfg`, and `/debug` via the learning-writer agent.

To analyze accumulated learnings and improve the plugin:

```bash
/evolve
```

The system will auto-pick the highest-value action based on current state.

### Learning Document Format

```yaml
---
title: Short descriptive title
category: build-errors | test-failures | runtime-errors | performance | security | database | ui | integration | logic
tags: [framework, feature, pattern]
severity: critical | high | medium | low
date: YYYY-MM-DD
applicable_to: project | universal
---

## Summary
Brief description of what was learned.

## Problem
What went wrong or what was discovered.

## Solution
How it was resolved or what the insight means.

## Prevention
How to avoid this in the future.
```

### Sharing Universal Patterns

`/evolve` automatically detects universal learnings ready for contribution and offers to create a PR to the plugin repository.

---

## Language-Specific Reviews

The plugin automatically detects languages and invokes appropriate reviewers.

### Detection

Using `scripts/language-detector.sh`:

```bash
./scripts/language-detector.sh
# Output: typescript python sql migration
```

### Dual-Phase Review

**Light Mode** (in `/work` before PR):
- Quick critical checks only
- Blocks on security issues
- Fast turnaround

**Full Mode** (in `/review-pr`):
- Comprehensive deep analysis
- Style and best practices
- Performance considerations

### Supported Languages

| Language | Extensions | Focus Areas |
|----------|------------|-------------|
| TypeScript | `.ts`, `.tsx`, `.js`, `.jsx` | Types, null safety, async patterns, React |
| Python | `.py` | Type hints, async, security, imports |
| Swift | `.swift` | Optionals, memory, SwiftUI, concurrency |
| SQL | `.sql`, `*migration*` | Injection, performance, constraints |

---

## Enhanced Workflow Phases

### `/work` (v1.21.0 — Slim Orchestrator)

| Phase | Description |
|-------|-------------|
| 1 | Determine work type |
| **2** | **Create branch [REQUIRED]** (auto-detects default branch) |
| 3 | Research via work-researcher agent |
| 4 | Implementation + incremental commits + testing |
| 5 | Validation via work-validator agent |
| **6** | **Commit & Create PR [REQUIRED]** |
| 7 | Learning capture (conditional — 3+ errors, novel solution, etc.) |

### `/review-pr` (v1.25.1)

Supports **iterative reviews** — run multiple times on the same PR. Rounds 2+ only process new feedback since last run via PR comment markers.

| Phase | Description |
|-------|-------------|
| **0.5** | **Incremental detection** — find last round marker, set `INCREMENTAL` mode |
| 1 | Fetch PR details + inline comments (filtered on incremental runs) |
| 2 | Parallel agent analysis (always-on agents skipped on rounds 2+) |
| 2.5 | Language-specific deep review |
| 2.6 | Deployment verification (if migrations) |
| 3 | Severity classification (P1/P2/P3) + fix |
| 4 | Update PR with round marker (`<!-- review-pr:round:N:timestamp:T:sha:S -->`) |
| 5 | Quality checks |
| 6 | Learning capture (with round context) |

**Usage:** `/review-pr 123` (auto-detects round), `/review-pr 123 --full` (force full re-review)

### `/test` (v1.21.0)

| Phase | Description |
|-------|-------------|
| 1 | Test analysis |
| 2 | Test execution |
| 3 | Write missing tests |
| 3.5 | UX testing validation (if UI components) |
| 4 | Quality gates |
| 4.5 | Self-healing retry loop (max 3 iterations) |
| 5 | Test documentation |
| 6 | Learning capture (conditional — self-healing activated, investigation needed) |

---

## Hooks

The plugin uses a single PostToolUse hook for automatic syntax validation:

| Hook | Trigger | What It Does |
|------|---------|--------------|
| `post-edit-validate.sh` | After Edit/Write | Validates `.ts/.tsx` (tsc), `.py` (py_compile), `.json` (jq) |

Non-blocking with 10s timeout. Exits cleanly for unknown file types.

---

## Typical Usage Flow

### Week 1-2: Learn the Commands

```bash
/work 347              # Implement feature
/test                  # Run tests
/review-pr 123         # Handle feedback
/clean-branch          # Cleanup
```

### Ongoing: Evolve the Plugin

```bash
# Auto-picks highest-value action based on current state
/evolve
```

---

## Installation

### From GitHub

```bash
/plugin marketplace add psd401/psd-claude-plugins
/plugin install psd-coding-system
```

### Verify

```bash
/plugin list
# Should show: psd-coding-system (v2.0.0)
```

### Configure FreshService (Optional)

```bash
cp ~/.claude/plugins/marketplaces/psd-claude-plugins/plugins/psd-coding-system/.freshservice.env.example ~/.claude/freshservice.env
# Edit with your credentials
/triage 12345
```

---

## Troubleshooting

### Commands Not Working

```bash
/plugin uninstall psd-coding-system
/plugin install psd-coding-system
```

### Plugin Not Found

```bash
cd ~/.claude/plugins/marketplaces/psd-claude-plugins
git pull origin main
/plugin install psd-coding-system
```

---

## Privacy & Security

- Project learnings stored in `docs/learnings/` (local only, gitignored — auto-deleted after 90 days by `/evolve`)
- Agent memory stored locally by Claude Code in `.claude/agent-memory/`
- No telemetry collection — removed in v1.21.0
- Only hook is PostToolUse syntax validation (no data collection)
- No external network requests

---

## Compound Engineering Principles

Every interaction creates improvement opportunities:

- Every bug → prevention system
- Every manual process → automation candidate
- Every solution → template for similar problems
- Every workflow → data for meta-learning

Use `/evolve` to analyze and improve.

---

## Support

- **Issues**: https://github.com/psd401/psd-claude-plugins/issues
- **Email**: hagelk@psd401.net

---

## License

MIT License - Peninsula School District
