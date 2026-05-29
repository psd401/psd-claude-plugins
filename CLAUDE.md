# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **PSD Plugin Marketplace** — a multi-plugin marketplace for Claude Code and Claude Cowork, maintained by Peninsula School District.

**Version**: 2.14.0
**Status**: Production-Ready

### Plugins

| Plugin | Purpose | Skills | Agents |
|--------|---------|--------|--------|
| `psd-coding-system` | AI-assisted development workflows | 21 | 44 |
| `psd-productivity` | Productivity workflows (Cowork-friendly) | 34 | 1 |

### Key Changes in v2.0.0

- **Marketplace rebranded** from `psd-claude-coding-system` to `psd-claude-plugins`
- **Coding plugin renamed** from `psd-claude-coding-system` to `psd-coding-system`
- **New plugin** `psd-productivity` scaffolded with `/enrollment` and `/chief-of-staff` placeholder skills
- **All `subagent_type` references** updated from `psd-claude-coding-system:` to `psd-coding-system:`
- **Multi-plugin architecture** — plugins are independently installable

## Architecture

### Multi-Plugin Marketplace Structure

```
psd-claude-plugins/                           # repo root
  .claude-plugin/
    marketplace.json                          # lists both plugins
  plugins/
    psd-coding-system/                        # development workflows
      .claude-plugin/
        plugin.json                           # name: "psd-coding-system"
      skills/                                 # 21 user-invocable skills
      agents/                                 # 44 specialized agents
        review/                               # 16 code review specialists
        domain/                               # 7 domain specialists
        quality/                              # 3 quality assurance
        research/                             # 6 research agents
        workflow/                             # 4 workflow agents
        external/                             # 2 external AI providers
        meta/                                 # 1 meta-reviewer
        validation/                           # 5 validators
      hooks/
      scripts/
      docs/
        learnings/                            # project learnings (gitignored)
        patterns/                             # universal patterns
    psd-productivity/                         # productivity workflows (Cowork-friendly)
      .claude-plugin/
        plugin.json                           # name: "psd-productivity"
      skills/                                 # 34 user-invocable skills
        freshservice-manager/                 # Freshservice ticket management
        redrover-manager/                     # Red Rover absence data
        legislative-tracker/                  # WA State K-12 legislation
        writer/                               # Content generation
        docx/                                 # Document creation/editing
        pptx/                                 # Presentation creation/editing
        pdf/                                  # PDF manipulation
        pdf-builder/                          # Branded PDF generation with Documenso field mapping
        pdf-to-markdown/                      # PDF to Markdown conversion
        xlsx/                                 # Spreadsheet creation/editing
        presentation-master/                  # World-class presentations
        browser-control/                      # Browser automation (Chrome DevTools MCP)
        assistant-architect/                  # AI Studio assistant JSON
        sop-creator/                          # PSD SOP generation
        research/                             # Multi-LLM research
        multi-model-research/                 # LLM Council research
        strategic-planning-manager/           # K-12 strategic planning
        elevenlabs-tts/                       # ElevenLabs text-to-speech
        local-tts/                            # Local MLX text-to-speech
        image-gen/                            # Image generation
        seven-advisors/                       # Decision council
        skill-creator/                        # Skill creation/benchmarking
        psd-athletics/                        # GHHS/PHS athletics schedules
        psd-brand-guidelines/                 # PSD brand assets
        psd-instructional-vision/             # PSD instructional framework
        enrollment/                           # PSD enrollment workflow
        slides-to-site/                       # Google Slides → psd401.ai pages
        google-workspace-cli/                  # Google Workspace CLI (Drive, Sheets, Gmail, Calendar)
        n8n-manager/                          # n8n workflow automation management
        docusign-manager/                     # DocuSign migration and export
        documenso-manager/                    # Document signing (Documenso)
        board-policy-formatter/               # Reformat docs into PSD board policy/procedure template
        html-artifact/                        # Beautiful anti-slop single-page HTML artifacts
        chief-of-staff/                       # Executive support
      agents/                                 # workflow-specific agents
        powerschool-navigator.md              # Chrome DevTools MCP PS report automation
        enrollment-validator.md               # P223 data validation checks
  CLAUDE.md                                   # THIS FILE
  CHANGELOG.md
  README.md
```

### Skills vs Agents Pattern (Claude Code 2.1.x)

**Skills** are user-facing workflows invoked with `/skill-name`:
- Located in `skills/<name>/SKILL.md` directory structure
- Contain YAML frontmatter: name, description, argument-hint, model, context, agent, allowed-tools, extended-thinking
- Include bash scripts and structured workflows
- May invoke agents via the Task tool for specialized work
- Support hot-reload (changes apply without session restart)

**Agents** are specialized AI assistants invoked by skills or other Claude Code instances:
- Located in `agents/<category>/<name>.md`
- Contain YAML frontmatter: name, description, tools, model, extended-thinking, color, memory
- `memory: project` gives agents persistent cross-session knowledge
- Run autonomously with specific tool access

### Plugin Independence

- Plugins **cannot declare dependencies** on each other
- Skills **cannot invoke other skills** — workflows chain via Task tool delegation
- Each plugin ships its own agents
- `enabledPlugins` in `.claude/settings.json` allows selective enabling/disabling

### psd-coding-system Skills (21 total)

| Skill | Description |
|-------|-------------|
| `/work` | Implement solutions with auto reviews + learning capture |
| `/lfg` | Autonomous end-to-end: implement → test → review → fix → learn |
| `/debug` | Structured root-cause analysis: reproduce → hypothesize → test → verify → fix → learn |
| `/test` | Comprehensive testing with self-healing retry loop + learning capture |
| `/review-pr` | Iterative PR feedback (rounds 2+ process only new comments) + learning capture |
| `/architect` | Architecture design |
| `/brainstorm` | Collaborative requirements exploration |
| `/changelog` | Auto-generate Keep-a-Changelog entries from git history |
| `/deepen-plan` | Enhance plans with parallel per-section research |
| `/setup` | Configure per-project review agent activation |
| `/issue` | GitHub issue creation |
| `/product-manager` | Product specifications |
| `/security-audit` | Security review |
| `/scope` | Scope classification and tiered planning on-ramp |
| `/evolve` | Auto-evolve: analyze learnings, check releases, compare plugins |
| `/worktree` | Git worktree management for parallel development |
| `/swarm` | Parallel agent team orchestration |
| `/bump-version` | Automate version bump ritual |
| `/optimize` | Metric-driven iterative optimization loops |
| `/clean-branch` | Post-merge cleanup |
| `/triage` | FreshService ticket triage |

### psd-coding-system Agents (44 total)

**Review Agents** (16) — `agents/review/`:
- **Security**: security-analyst, security-analyst-specialist
- **Deployment**: deployment-verification-agent, data-migration-expert
- **Architecture**: agent-native-reviewer, architecture-strategist
- **Code Quality**: code-simplicity-reviewer, pattern-recognition-specialist
- **Correctness**: correctness-reviewer, adversarial-reviewer
- **Schema & Data**: schema-drift-detector, data-integrity-guardian
- **Language-Specific**: typescript-reviewer, python-reviewer, swift-reviewer, sql-reviewer

**Domain Specialists** (7) — `agents/domain/`:
- backend-specialist, frontend-specialist, database-specialist, llm-specialist
- ux-specialist, architect-specialist, shell-devops-specialist

**Quality Agents** (3) — `agents/quality/`:
- test-specialist (`memory: project`), performance-optimizer, documentation-writer

**Research Agents** (6) — `agents/research/`:
- learnings-researcher (`memory: project`), spec-flow-analyzer, best-practices-researcher
- framework-docs-researcher, git-history-analyzer, repo-research-analyst

**Workflow Agents** (4) — `agents/workflow/`:
- bug-reproduction-validator, work-researcher (`memory: project`)
- work-validator, learning-writer (`memory: project`)

**External AI** (2) — `agents/external/`:
- gpt-5-codex (GPT-5.3-Codex), gemini-3-pro (Gemini 3.1 Pro)

**Meta Agent** (1) — `agents/meta/`:
- meta-reviewer (`memory: project`)

**Validator Agents** (5) — `agents/validation/`:
- plan-validator, document-validator, configuration-validator
- breaking-change-validator, telemetry-data-specialist

### psd-productivity Skills (34 total)

| Skill | Description |
|-------|-------------|
| `/freshservice-manager` | Manage Freshservice tickets, approvals, and team performance reports |
| `/redrover-manager` | Red Rover absence management data for PSD staff attendance |
| `/legislative-tracker` | Track WA State K-12 education legislation via SOAP API |
| `/writer` | Generate content in your authentic voice — emails, blogs, social, reports |
| `/docx` | Document creation, editing, tracked changes, comments |
| `/pptx` | Presentation creation, editing, layouts, speaker notes |
| `/pdf` | PDF manipulation — extract, create, merge/split, fill forms |
| `/pdf-builder` | Branded PSD PDF generation with Documenso field coordinate mapping |
| `/pdf-to-markdown` | Convert PDF to clean Markdown |
| `/xlsx` | Spreadsheet creation, editing, formulas, data analysis |
| `/presentation-master` | World-class presentations (Reynolds, Duarte, Kawasaki, TED) |
| `/assistant-architect` | Create AI Studio Assistant Architect JSON import files |
| `/sop-creator` | Generate PSD Standard Operating Procedures |
| `/research` | Multi-LLM parallel research with query decomposition |
| `/multi-model-research` | Orchestrate frontier LLMs with peer review and synthesis |
| `/strategic-planning-manager` | K-12 strategic planning (research-backed 4-stage process) |
| `/elevenlabs-tts` | High-quality audio generation via Eleven Labs API |
| `/local-tts` | Local text-to-speech using MLX and Kokoro |
| `/image-gen` | Image generation using Gemini 3.1 Flash Image |
| `/seven-advisors` | Multi-perspective decision council |
| `/skill-creator` | Create, modify, and benchmark skills |
| `/psd-athletics` | GHHS and PHS athletics schedules |
| `/psd-brand-guidelines` | Official PSD brand colors, typography, logos |
| `/psd-instructional-vision` | PSD instructional framework and pedagogical beliefs |
| `/enrollment` | P223 monthly enrollment automation — reports, FTE validation, reconciliation |
| `/google-workspace` | Google Drive, Sheets, Gmail, Calendar via gws CLI |
| `/browser-control` | Browser automation for authenticated web apps via Chrome DevTools MCP |
| `/slides-to-site` | Convert Google Slides to psd401.ai presentation pages |
| `/n8n` | Build, deploy, and manage n8n workflow automations — CRUD, executions, credentials, PSD integrations |
| `/docusign` | DocuSign migration and export — bulk envelope download, template export, PowerForm inventory |
| `/documenso` | Document signing — create envelopes, manage recipients/fields, distribute, download signed PDFs, templates |
| `/html-artifact` | Generate beautiful, self-contained single-page HTML artifacts with anti-slop design taste — documents, reports, code-review explainers, design explorations, interactive editors; optional PSD branding |
| `/board-policy-formatter` | Reformat a Google Doc, PDF, or Word document into the official PSD board policy/procedure template with zero text modification |
| `/chief-of-staff` | Daily briefings and priority management |

### Memory-Based Learning System

**Architecture**: Implement → Detect patterns → Capture learnings → Review → Improve

1. **Automatic Learning Capture** — `/work`, `/test`, `/review-pr`, `/lfg`, `/debug` always invoke learning-writer agent
2. **Cross-Session Memory** — 5 agents have `memory: project` for persistent knowledge
3. **On-Demand Analysis** — `/evolve` auto-picks highest-value action

**Data Flow**:
```
/work, /test, /review-pr, /lfg, /debug (always-run)
  └── learning-writer agent
        ├── Deduplicates against docs/learnings/
        └── Writes docs/learnings/{category}/{date}-{slug}.md

/evolve (on-demand, zero-argument auto-decision)
  ├── Priority 1: ≥8 unanalyzed learnings → meta-reviewer agent (opus)
  ├── Priority 2: Release check stale → fetch Claude Code changelog
  ├── Priority 3: Universal learnings not contributed → offer PR
  ├── Priority 4: Plugin comparison stale → compare vs Every's plugin
  ├── Priority 5: No recent learnings → extract automation concepts
  └── Priority 6: Everything current → show health dashboard
```

### Context7 MCP Server

The `psd-coding-system` plugin configures a Context7 MCP server providing live framework documentation. No API key required.

### Hooks

**PostToolUse Hook — Syntax Validation** (`scripts/post-edit-validate.sh`):
- Runs after Edit or Write tool calls (matcher: `Edit|Write`)
- `if` conditional (v2.1.85): only fires for `.ts/.tsx/.py/.json` files — skips `.md`, `.sh`, `.yaml`, etc.
- Validates file syntax: `.ts/.tsx` (tsc), `.py` (py_compile), `.json` (jq)
- Non-blocking, 10s timeout

**PostToolUse Hook — Secret Redaction** (`scripts/redact-secrets.sh`):
- Runs after Bash tool calls (matcher: `Bash`)
- Uses `outputReplace: true` (v2.1.121) to replace output before Claude sees it
- Redacts: API keys (sk-*, ghp_*, AKIA*), Bearer tokens, Google/Slack keys, password/secret assignments
- Non-blocking, 5s timeout

**PreCompact Hook** (`scripts/pre-compact-context.sh`):
- Runs before context compaction (v2.1.105)
- Outputs current branch, uncommitted changes, recent commits, and active issue number
- Output is injected into compacted conversation to preserve task context

**WorktreeCreate/Remove Hooks** (v2.1.50+):
- Auto-symlinks `.env` into worktrees; logs cleanup on removal

## Marketplace Structure & Critical Files

### marketplace.json (CRITICAL)

Located at `.claude-plugin/marketplace.json`. Lists all independently installable plugins.

**CRITICAL RULES:**
1. `plugins[]` must match actual directory structure
2. Each entry's `source` must point to an existing plugin directory
3. Version numbers should match plugin.json in each plugin
4. When changing plugin structure: update marketplace.json FIRST, then commit

### hooks.json Format (CRITICAL)

Hook definitions must be wrapped in a `"hooks"` array inside each event entry. The `if` field (v2.1.85) adds conditional execution:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "if": "tool_input.file_path matches '\\.(?:ts|tsx|py|json)$'",
        "hooks": [
          { "type": "command", "command": "...", "timeout": 10 }
        ]
      }
    ]
  }
}
```

## Development Commands

### Testing the Marketplace

```bash
# Install locally for testing
/plugin marketplace add ~/non-ic-code/psd-claude-plugins
/plugin install psd-coding-system
/plugin install psd-productivity
/plugin list

# Verify command availability
/work 1
/enrollment

# Check hooks installed
ls ~/.claude/plugins/marketplaces/psd-claude-plugins/plugins/psd-coding-system/hooks/

# Uninstall for clean testing
/plugin uninstall psd-coding-system
/plugin uninstall psd-productivity
/plugin marketplace remove psd-claude-plugins
```

### Publishing to GitHub

```bash
git status
git add .
git commit -m "Detailed message"
git push origin main

# Users install via GitHub
/plugin marketplace add psd401/psd-claude-plugins
/plugin install psd-coding-system
/plugin install psd-productivity
```

### Modifying Skills or Agents

1. Edit the relevant file:
   - Skills: `plugins/[plugin]/skills/<name>/SKILL.md`
   - Agents: `plugins/[plugin]/agents/<category>/<name>.md`
2. Skills support hot-reload — changes apply without reinstalling
3. No build step required — Claude Code reads markdown directly

### Troubleshooting Plugin Installation

**Problem: "Plugin not found in any marketplace"**
1. Verify: `cat .claude-plugin/marketplace.json | jq '.plugins[].name'`
2. Verify plugin directory exists
3. Update marketplace.json and push
4. Run `/reload-plugins` or force refresh

**Problem: Old plugins still showing up**
1. Exit Claude Code
2. `mv ~/.claude/plugins ~/.claude/plugins.backup`
3. Restart and re-add marketplace

## Important Notes

### Version Management

**CRITICAL**: There are THREE independent version tracks. Never mix them.

| Track | Files | When to bump |
|-------|-------|--------------|
| **Marketplace** | `.claude-plugin/marketplace.json` → `metadata.version`; `CLAUDE.md` → `**Version**`; `README.md` badge + text | Every release |
| **psd-coding-system** | `plugins/psd-coding-system/.claude-plugin/plugin.json` → `"version"`; `marketplace.json` → `plugins[name=psd-coding-system].version`; `plugins/psd-coding-system/README.md` → `Version:` | Only when psd-coding-system skills/agents change |
| **psd-productivity** | Same pattern for psd-productivity files | Only when psd-productivity skills/agents change |

Each plugin version tracks breaking changes for users of *that specific plugin* independently. Do not copy the marketplace version into a plugin's version field.

**Version bumping locations per release:**
1. `.claude-plugin/marketplace.json` — `metadata.version` — **always**
2. `CLAUDE.md` — `**Version**: X.Y.Z` — **always** (marketplace version)
3. `README.md` — badge + `**Version**: X.Y.Z` — **always** (marketplace version)
4. `CHANGELOG.md` — Add new version section at top — **always**
5. `plugins/psd-coding-system/.claude-plugin/plugin.json` — **only if coding system changed**
6. `marketplace.json` → `plugins[name=psd-coding-system].version` — **only if coding system changed**
7. `plugins/psd-coding-system/README.md` — `Version:` — **only if coding system changed**
8. Same 3 files for psd-productivity — **only if productivity plugin changed**

**Complete release workflow:**
1. Update all applicable version locations (ask which plugins changed)
2. Add CHANGELOG.md entry
3. Commit: `git commit -m "chore: Bump version to X.Y.Z ([reason])"`
4. Push: `git push origin main`
5. Tag: `claude plugin tag vX.Y.Z` (v2.1.118 — validates version consistency before tagging)
6. Push tag: `git push origin vX.Y.Z`

### Git Workflow
- Branch from `dev`, not `main`
- Branch naming: `feature/[issue-number]-brief-description` or `fix/brief-description`
- Detailed commit messages required

### Learning Data & Privacy
- Project learnings stored in `docs/learnings/` (local only, gitignored)
- Learnings auto-deleted after 90 days by `/evolve` TTL cleanup
- Agent memory stored locally in `.claude/agent-memory/`
- No telemetry collection
- PostToolUse hooks run automatically (syntax validation + secret redaction)
- PreCompact hook preserves branch/task context during compaction

### Model Selection Strategy
- **sonnet-4-6**: Default for agents and lightweight coding tasks
- **opus-4-8**: All skills that specify `model:` in frontmatter
- **effort: high**: Default for most skills/agents
- **effort: xhigh**: Heavy-lifting skills: `/architect`, `/product-manager`, `/lfg`, `/evolve`, meta-reviewer agent (v2.1.111)
- **extended-thinking: true**: Enabled on all skills/agents
- **memory: project**: Enabled on 5 key agents

### Model Selection Rules for Skills

**Rule**: If a skill specifies `model:` in frontmatter, use `claude-opus-4-8` with `effort: high` (or `xhigh` for heavy-lifting skills). Never specify `model: claude-sonnet-4-6` in skill frontmatter while the Claude Code default is Opus 4.8.

**Why**: Claude Code v2.1.68+ unconditionally sends the effort parameter to all model invocations. Opus 4.8 supports effort; Sonnet 4.6 does not. Skills specifying sonnet receive this unsupported parameter → API error. GitHub issue #30795 (open as of 2026-03-15).

**Lightweight skills** (changelog, triage, bump-version, etc.) that don't specify a model inherit the default (currently Opus 4.8) and are safe.

**If you want to use Sonnet in a skill**: Remove the `model:` field entirely and let it inherit the default. Do NOT explicitly specify `model: claude-sonnet-4-6` until issue #30795 is resolved.

### Adopted Claude Code Features

| Feature | Version | Adopted On | Scope |
|---------|---------|------------|-------|
| `effort:` frontmatter | v2.1.68 | All skills/agents | `high` default, `xhigh` on 5 heavy-lifters |
| `initialPrompt:` agent auto-submit | v2.1.83 | 4 agents | learning-writer, work-researcher, meta-reviewer, work-validator |
| `paths:` file access scoping | v2.1.84 | 5 skills | enrollment, pdf-builder, documenso, docusign, n8n |
| `if` hook conditionals | v2.1.85 | PostToolUse hook | Only fires for .ts/.tsx/.py/.json files |
| `keep-coding-instructions:` | v2.1.94 | 10 skills/agents | 7 skills + work-researcher, learning-writer, test-specialist |
| `PreCompact` hook | v2.1.105 | hooks.json | Preserves branch, commits, active issue before compaction |
| `effort: xhigh` | v2.1.111 | 5 skills/agents | architect, product-manager, lfg, evolve, meta-reviewer |
| Agent `mcpServers` frontmatter | v2.1.117 | 3 agents | framework-docs-researcher, best-practices-researcher, repo-research-analyst |
| `claude plugin tag` | v2.1.118 | bump-version skill | Replaces manual git tag in release workflow |
| `$schema` in plugin.json | v2.1.120 | Both plugins | Enables `claude plugin validate` |
| PostToolUse `outputReplace` | v2.1.121 | hooks.json | Auto-redacts secrets from Bash output |
