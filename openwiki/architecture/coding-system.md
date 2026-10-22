---
type: Architecture
title: psd-coding-system plugin (skills, agents, hooks)
description: "Structure of the psd-coding-system plugin: the nine skills, the 44 agents by category and who dispatches them, the hook set (syntax check, secret redaction, Stop gate, PreCompact, worktree) and the scripts behind them."
tags: [psd-coding-system, skills, agents, hooks, claude-code]
openwiki:
  roles: [architecture]
  change_kinds: [skill, agent, hook]
  source_paths:
    - plugins/psd-coding-system/.claude-plugin/plugin.json
    - plugins/psd-coding-system/hooks/hooks.json
    - plugins/psd-coding-system/scripts/
    - plugins/psd-coding-system/skills/
    - plugins/psd-coding-system/agents/
    - plugins/psd-coding-system/docs/agent-manifest.md
  invariants:
    - Hooks are wrapped in a hooks array per event; script hooks use the command bash plus args exec form.
    - The post-edit hook only fires for .py and .json files and never undoes an edit.
    - Skills cannot invoke skills; orchestration happens through Task-dispatched agents.
  validation_commands:
    - "claude plugin validate ."
    - "shellcheck --severity=error plugins/psd-coding-system/scripts/*.sh"
---

# psd-coding-system plugin

Version 3.8.11. v3.0.0 consolidated 21 overlapping skills into **three disciplined surfaces** (`/plan`, `/lfg`, `/evolve`) plus utilities. "Done" is a machine-checkable [Definition of Done](../workflows/definition-of-done-gate.md), not agent goodwill. The end-to-end loop is in [plan → lfg → evolve](../workflows/plan-lfg-evolve.md). Registration and versioning rules are in [marketplace structure](./marketplace-structure.md).

## Layout

```
plugins/psd-coding-system/
  .claude-plugin/{plugin.json,settings.json}   # Context7 MCP (http), allow-listed gh/git commands
  skills/<name>/SKILL.md                       # 9 skills
  agents/<category>/<name>.md                  # 44 agents, 8 category dirs
  hooks/hooks.json   scripts/*.sh              # hook wiring and implementations
  workflows/chad-review.js                     # vendored workflow-tool script
  docs/{patterns,agent-manifest.md,how-to-use.md}
```

## Skills

| Skill | Role | Notes |
|---|---|---|
| `/plan` | clarify → parallel research → design → tasks + DoD, optionally files contract issues | `claude-fable-5-1`, `xhigh` |
| `/lfg` | implement → verify gate → self-review → PR with evidence → watch CI/reviewers to clean | `effort: medium`; arms the Stop gate |
| `/evolve` | zero-argument; picks one of six priorities (analyze learnings, release gap, pattern contribution, compare, concepts, health) then compounds and prunes | `xhigh` |
| `/setup` | writes `.psd/verify.json` | see [gate](../workflows/definition-of-done-gate.md) |
| `/worktree` | create/list/remove/prune/`clean` worktrees and merged branches | `docs/patterns/worktrees-explained.md` |
| `/bump-version` | release ritual | [marketplace](./marketplace-structure.md#version-tracks-never-mix) |
| `/psd-sign` | sign/notarize/package macOS `.app` → `.pkg` for Jamf Self Service | macOS only |
| `/chad-review` | Chad ↔ defender review loop on a clone; runs `workflows/chad-review.js` | vendored from nityeshaga/claude-code-essentials v0.5.0; script body unmodified, note divergences in its header |
| `/hallmark` | anti-AI-slop visual design (design / `audit` / `redesign` / `study`); 21 OKLCH themes | vendored from nutlope/hallmark v1.1.0 (MIT, `LICENSE.upstream`); `references/tokens.css` vendored because most themes live there |

Removed in v3.0.0 (do not resurrect without reason): work, test, debug, optimize, review-pr, security-audit, architect, brainstorm, scope, product-manager, deepen-plan, issue, changelog, clean-branch, swarm, triage (intake now lives only in the [cloud routine](../operations/cloud-routines.md)).

## Agents (44)

Categories: review 15, domain 7, quality 4, research 6, workflow 4, external 2, meta 1, validation 5. Dispatch is by frontmatter `name:` (note `external/gpt-5-codex.md` registers as `psd-coding-system:external:gpt-5`). Dispatch chains:

- `/plan` → research agents (learnings-researcher, repo-research-analyst, best-practices-researcher, framework-docs-researcher, spec-flow-analyzer), architect-specialist (large), plan-validator.
- `/lfg` → `work-researcher` (which fans out to domain specialists, test-specialist, git-history-analyzer, and uses `scripts/security-detector.sh`), `runtime-verifier` (the **only agent that executes the app**), `work-validator`, the self-review set chosen from `review_agents` in `.psd/verify.json`, and `learning-writer`.
- `/evolve` → `meta-reviewer` (≥8 unanalysed learnings), `learning-writer`.
- External second-opinion agents (`gpt-5-codex`, `gemini-3-pro`) are ad hoc only.

Six agents carry `memory: project` (runtime-verifier, test-specialist, learnings-researcher, work-researcher, learning-writer, meta-reviewer); the canonical list is their frontmatter. `security-reviewer` is the merge of the two former security agents. Review agents are read-only and return structured P1/P2/P3 findings; they never post comments. `docs/agent-manifest.md` is the dispatch map but its "Orphans" table is stale relative to `/lfg` Phase 6 and `/setup`'s `review_agents` block — check the skill text.

## Hooks

Defined in `hooks/hooks.json`; scripts run via `"command": "bash", "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/..."]` (no shell tokenization).

| Event | Script | Behaviour |
|---|---|---|
| PostToolUse `Edit\|Write` (`if` path matches `.py`/`.json`) | `post-edit-validate.sh` | `py_compile` / `jq` single-file check. On error emits `{"decision":"block"}` + exit 2; `continueOnBlock: true` makes it same-turn feedback, not an undo. Malformed stdin → exit 0. 10 s. **No `.ts/.tsx` branch** (a per-edit `tsc` is a whole-project typecheck; removed in v3.3.1, issue #77) |
| PostToolUse `Bash` | `redact-secrets.sh` | `outputReplace: true`; perl-redacts sk-/ghp_/AKIA/Bearer/Google keys and `password=`-style assignments. 5 s |
| Stop | `verify-gate-stop-hook.sh` | blocks finalize unless cached gate is green — see [gate](../workflows/definition-of-done-gate.md). 30 s |
| PreCompact | `pre-compact-context.sh` | prints branch, uncommitted files, branch commits, `feature/NNN` issue number into the compacted context |
| WorktreeCreate / Remove | inline shell | symlinks `.env` into new worktree; logs removal. Stay shell-form because they need compound logic |

`language-detector.sh` and `security-detector.sh` are helper scripts called from agents/skills, not registered hooks.

## Change navigation

- **Add/modify a skill or agent:** edit `skills/<name>/SKILL.md` or `agents/<category>/<name>.md`; keep explicit `model:`/`effort:`; update counts in `CLAUDE.md`, both READMEs, `plugin.json`, marketplace entry; update `docs/agent-manifest.md` if dispatch changes; bump per [version tracks](./marketplace-structure.md#version-tracks-never-mix).
- **Add a hook:** keep it single-file and sub-second if per-edit; add to `hooks.json` in the nested shape; shellcheck the script (CI lints all `*.sh` with `--severity=error`).
- **Validation:** `claude plugin validate .` (conditional: structure/frontmatter changes); `shellcheck --severity=error <script>` for scripts. There are no unit tests for this plugin — `plugins/psd-coding-system/tests/fixtures/` holds only a meta-compound fixture.
- **Do not** edit vendored `chad-review.js` or hallmark upstream files in place without recording the divergence.
