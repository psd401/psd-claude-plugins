# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **PSD Plugin Marketplace** — a multi-plugin marketplace for Claude Code and Claude Cowork, maintained by Peninsula School District.

**Version**: 2.27.0
**Status**: Production-Ready

### Plugins

| Plugin | Purpose | Skills | Agents |
|--------|---------|--------|--------|
| `psd-coding-system` | AI-assisted development workflows | 9 | 44 |
| `psd-productivity` | Productivity workflows (Cowork-friendly) | 38 | 1 |

## Architecture

### Multi-Plugin Marketplace Structure

```
psd-claude-plugins/
  .claude-plugin/marketplace.json   # lists both plugins — see CRITICAL RULES below
  plugins/
    psd-coding-system/              # skills/ (9), agents/ (44 in 8 category dirs), hooks/, scripts/, workflows/, docs/patterns/
    psd-productivity/               # skills/ (38), agents/ (enrollment-validator)
  docs/learnings/                   # canonical learnings location (see Learning Data below)
```

Explore with `ls` — the tree is not duplicated here.

### Plugin Independence

- Plugins **cannot declare dependencies** on each other
- Skills **cannot invoke other skills** — workflows chain via Task tool delegation
- Each plugin ships its own agents
- `enabledPlugins` in `.claude/settings.json` allows selective enabling/disabling

### psd-coding-system Skills (9 total)

**v3.0.0 consolidated 21 overlapping skills into 3 disciplined surfaces + utilities.** "Done" is a machine-checkable Definition of Done (`docs/patterns/definition-of-done.md`), enforced by a verify gate + Stop hook, not agent goodwill.

| Skill | Description |
|-------|-------------|
| `/plan` | Clarify → research (parallel) → design → emit tasks + a machine-checkable Definition of Done (+ contract-compliant issues). Absorbs architect/brainstorm/scope/product-manager/deepen-plan/issue |
| `/lfg` | Autonomous build-to-done: implement → verify the full DoD (build/lint-zero-warning/typecheck/**full** suite/Playwright + screenshots) → open PR with visual evidence → watch CI + the project's AI reviewers and fix every round until **100% clean**. Absorbs work/test/debug/optimize/review-pr/security-audit |
| `/evolve` | Compound learnings into CLAUDE.md/patterns/agents then **prune** them; release tracking; competitor compare |
| `/setup` | Write `.psd/verify.json` — the per-project verification gate (commands, E2E flows, strictness, AI-reviewer logins, commit-learnings, active review agents) |
| `/worktree` | Git worktree management + multi-window parallel how-to + `clean` post-merge hygiene (prune worktrees, delete merged local/remote branches, close orphaned issues — restores `/clean-branch`) |
| `/bump-version` | Version bump ritual (absorbs `/changelog`) — three independent tracks |
| `/psd-sign` | Sign, notarize, and package a macOS `.app` into a `.pkg` for PSD Jamf Self Service — full Apple Developer ID pipeline (salvaged from PR #39 in v3.4.0) |
| `/chad-review` | Strip the showing-off from an artifact (docs, prose, skills, landing pages) — Chad ↔ defender review loop on a **clone**, N rounds, unresolved tensions to the human. Vendored from [nityeshaga/claude-code-essentials](https://github.com/nityeshaga/claude-code-essentials/tree/main/plugins/chad-review) (v0.5.0, no upstream license) in v3.6.0. Workflow-tool path is agent-expensive — see the PSD notes in its SKILL.md |
| `/hallmark` | Anti-AI-slop **visual design** surface — picks a macrostructure for the brief, dresses it in one of 21 OKLCH themes, runs 57 slop-test gates + a pre-emit self-critique. Four verbs: default (design) · `audit` (score, no edits) · `redesign` (keep copy/IA/brand, rebuild the visual layer) · `study` (extract a design's DNA from a screenshot/URL, never pixel-clones). Vendored from [nutlope/hallmark](https://github.com/nutlope/hallmark) (v1.1.0, **MIT** — `LICENSE.upstream` travels with it) in v3.7.0. Styles; does not ship — `/lfg` still owns the verify gate. Upstream `site/css/tokens.css` is vendored to `references/tokens.css` because 16 of the 21 themes live only there |

**Removed/folded in v3.0.0:** work, test, debug, optimize, review-pr, security-audit, architect, brainstorm, scope, product-manager, deepen-plan, issue, changelog, clean-branch, swarm, triage (triage intake now lives only in the cloud routine). Contracts: `docs/patterns/{definition-of-done,issue-contract,worktrees-explained}.md`.

### psd-coding-system Agents (44 total)

Categories under `agents/`: review (15), domain (7), quality (4), research (6), workflow (4), external (2), meta (1), validation (5). See `plugins/psd-coding-system/docs/agent-manifest.md` for the full skill→agent dispatch map, or `ls` the category dirs.

Non-derivable notes: **runtime-verifier is the only agent that executes the app** (build/lint/typecheck/full-suite/Playwright + screenshot evidence); six agents carry `memory: project` for cross-session knowledge (runtime-verifier, test-specialist, learnings-researcher, work-researcher, learning-writer, meta-reviewer — the canonical list is their frontmatter); security-reviewer is the v3.0.0 merge of the two former security agents.

### psd-productivity Skills (38 total)

Each skill's `SKILL.md` frontmatter description is the source of truth — the session skill listing carries them all; `ls plugins/psd-productivity/skills/` for the roster. Two carry vendored Go CLIs whose binaries are **not committed** (fetched per-platform from a GitHub Release by `scripts/ensure-binary.sh`): `parentsquare` and `class-intercom` — both create only unsent drafts, never publish/notify.

### Memory-Based Learning System

`/lfg` always dispatches the learning-writer agent (dedupes against `docs/learnings/`, writes `docs/learnings/{category}/{date}-{slug}.md`). Six agents carry `memory: project` for cross-session knowledge. `/evolve` is the on-demand compounding surface — zero-argument, auto-picks its highest-value action (see `skills/evolve/SKILL.md` for the priority ladder).

### Context7 MCP Server

The `psd-coding-system` plugin configures a Context7 MCP server providing live framework documentation. No API key required.

### Hooks

**PostToolUse Hook — Syntax Validation** (`scripts/post-edit-validate.sh`):
- Runs after Edit or Write tool calls (matcher: `Edit|Write`)
- `if` conditional (v2.1.85): only fires for `.py/.json` files — skips `.ts`, `.tsx`, `.md`, `.sh`, `.yaml`, etc.
- Fast single-file syntax check: `.py` (py_compile), `.json` (jq)
- **No `.ts/.tsx` branch** (removed in v3.3.1, issue #77): a per-edit `tsc --noEmit` is a whole-project typecheck (~4s/edit), not a single-file check. TS type coverage moves to the Definition-of-Done gate (`verify-gate.sh` / Stop hook), which runs a full typecheck before a turn finishes **for repos opted into the gate (`.psd/verify.json` with a `typecheck` command) driven through `/lfg`**; repos/sessions outside that envelope rely on CI/PR review. Accepted trade — ~60% of the old per-edit runs were cancelled and discarded anyway
- **Feedback on failure, never blocking** (v3.4.1, issue #63): a syntax error emits `{"decision":"block","reason":...}` + exit 2, and the hooks.json entry sets `continueOnBlock: true` (v2.1.139) so the error text reaches the model as same-turn feedback without undoing the edit or halting; clean/unknown/malformed-stdin paths exit 0. 10s timeout
- Invoked via the `args` exec form (v2.1.139): `"command": "bash", "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/..."]` — no shell tokenization of the script path

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
/plan
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

**The full location list and release workflow live in the `/bump-version` skill — run it rather than enumerating locations by hand.** Two non-negotiables regardless of path: always `claude plugin validate .` before tagging, and tag with plain `git tag -a vX.Y.Z` — **never** `claude plugin tag` (it creates per-plugin `{name}--v{version}` tags from a plugin path, which doesn't match this repo's marketplace-wide `vX.Y.Z` convention).

### Git Workflow
- Branch from `dev`, not `main`
- Branch naming: `feature/[issue-number]-brief-description` or `fix/brief-description`
- Detailed commit messages required

### Learning Data & Privacy
- Project learnings stored in `docs/learnings/` at the **repo root** (committed in this repo — this is the canonical location the learning-writer and `/evolve` use; the plugin-internal `plugins/psd-coding-system/docs/learnings/` is gitignored)
- Learnings auto-deleted after 90 days by `/evolve` TTL cleanup
- Agent memory stored locally in `.claude/agent-memory/`
- No telemetry collection
- PostToolUse hooks run automatically (syntax validation + secret redaction)
- PreCompact hook preserves branch/task context during compaction

### Model Selection Strategy
- **claude-sonnet-5**: Default for agents and lightweight coding tasks
- **claude-opus-5**: Default for all skills that specify `model:` in frontmatter
- **claude-fable-5**: `/plan` only — the deep-design surface gets the most capable model
- **effort: high**: Default for most skills/agents
- **effort: xhigh**: `/plan`, `/evolve`, and the meta-reviewer agent
- **effort: medium**: `/lfg` — Opus 5 stays strong at medium, the cost/latency sweet spot for the build loop
- **extended-thinking: true**: Enabled on all skills/agents
- **memory: project**: Enabled on 5 key agents

### Model Selection Rules for Skills

**Rule**: Skills that specify `model:` use `claude-opus-5` with `effort: high` (`xhigh` for /evolve). Exceptions: `/plan` runs `claude-fable-5` at `xhigh`; `/lfg` runs `claude-opus-5` at `medium`. Agents run `claude-sonnet-5` (the four heavy agents — architect-specialist, meta-reviewer, runtime-verifier, plan-validator — run `claude-opus-5`).

**Why**: `claude-opus-5` is a drop-in upgrade at Opus 4.8 pricing with a higher ceiling; on Opus 5, `medium` effort delivers near-`xhigh` quality at a fraction of the tokens, which is why `/lfg` runs there. `claude-fable-5` (2× Opus pricing, always-on thinking) is reserved for `/plan`, where design depth pays for itself. All three Claude 5 models support the full effort ladder (`low`/`medium`/`high`/`xhigh`/`max`). Use bare aliases only — never date-suffixed IDs.

**Skills without `model:`** inherit the session default and are safe.

**If you want Sonnet in a skill**: set `model: claude-sonnet-5` explicitly; the project default for model-pinned skills remains `claude-opus-5`.

### Adopted Claude Code Features

| Feature | Version | Adopted On | Scope |
|---------|---------|------------|-------|
| `effort:` frontmatter | v2.1.68 | All skills/agents | `high` default, `xhigh` on plan/evolve/meta-reviewer, `medium` on lfg |
| `initialPrompt:` agent auto-submit | v2.1.83 | 4 agents | learning-writer, work-researcher, meta-reviewer, work-validator |
| `paths:` file access scoping | v2.1.84 | 5 skills | enrollment, pdf-builder, documenso, docusign, n8n |
| `if` hook conditionals | v2.1.85 | PostToolUse hook | Only fires for .py/.json files (ts/tsx dropped in v3.3.1, issue #77) |
| `keep-coding-instructions:` | v2.1.94 | 10 skills/agents | 7 skills + work-researcher, learning-writer, test-specialist |
| `PreCompact` hook | v2.1.105 | hooks.json | Preserves branch, commits, active issue before compaction |
| `effort: xhigh` | v2.1.111 | 3 skills/agents | plan, evolve, meta-reviewer (lfg moved to `medium` on Opus 5 in v2.23.0) |
| Agent `mcpServers` frontmatter | v2.1.117 | 3 agents | framework-docs-researcher, best-practices-researcher, repo-research-analyst |
| `claude plugin tag` | v2.1.118 | **Reverted in 2.21.2** | CLI now creates per-plugin `{name}--v{version}` tags from a plugin path — incompatible with the repo's marketplace-wide `vX.Y.Z` tags. Release workflow uses `claude plugin validate` + plain `git tag -a` |
| `$schema` in plugin.json | v2.1.120 | Both plugins | Enables `claude plugin validate` |
| PostToolUse `outputReplace` | v2.1.121 | hooks.json | Auto-redacts secrets from Bash output |
| Hooks `args` exec form | v2.1.139 | 4 script hooks | PostToolUse ×2, Stop, PreCompact — `command: "bash"` + `args: [script]`, no shell tokenization. Worktree hooks stay shell-form: they need compound shell logic and `${worktree_path}` delivery in exec form is undocumented |
| PostToolUse `continueOnBlock` | v2.1.139 | syntax-validation hook | Syntax errors feed back to the model as same-turn rejection reasons (decision:block + exit 2) without undoing the edit |
| Agent `disallowed-tools` | v2.1.152 | **Evaluated, not adopted** | Officially redundant when `tools:` allowlist is set — all 15 read-only agents already have allowlists (issue #63) |
