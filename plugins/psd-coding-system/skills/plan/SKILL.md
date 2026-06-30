---
name: plan
description: Clarify intent, research in parallel, design the approach, and emit a task breakdown + a machine-checkable Definition of Done — optionally filing contract-compliant GitHub issues that /lfg can pick up and drive to done.
argument-hint: "[idea, feature, problem, or issue number to refine]"
model: claude-opus-4-8
effort: xhigh
context: fork
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Edit
  - Write
  - Task
  - AskUserQuestion
extended-thinking: true
---

# PLAN — clarify, research, design, define done

The single planning surface. It scales from a quick fix to a full feature. It absorbs the old `/architect`, `/brainstorm`, `/scope`, `/product-manager`, `/deepen-plan`, and `/issue`. Its output is always the same shape: a task breakdown plus a **machine-checkable Definition of Done** — the exact contract `/lfg` drives to.

**Target:** $ARGUMENTS

Contracts: `docs/patterns/definition-of-done.md`, `docs/patterns/issue-contract.md`.

## Phase 1: Clarify first (don't code the wrong thing)

Surface the unknowns before designing. Ask the sharp questions a senior engineer would — edge cases, failure modes, scope boundaries, who the user is, what "done" means. Use AskUserQuestion for the few decisions that genuinely change the design. Keep going until you could write a testable Definition of Done without guessing.

If `$ARGUMENTS` is an existing issue number, read it (`gh issue view N --comments`) and refine rather than restart.

## Phase 2: Size it

- **Small** (a fix, a contained change) → skip straight to a tight DoD + a short task list.
- **Medium** (a feature) → research + design + DoD + task breakdown.
- **Large** (a system / multi-surface effort) → add architecture and a short PRD section (problem, users, success metrics, risks), then decompose into several contract-compliant issues.

State which size you picked and why.

## Phase 3: Research (parallel)

Dispatch in parallel via Task (skip any that don't apply):
- **learnings-researcher** — prior learnings in this repo.
- **repo-research-analyst** — how this codebase does this today; conventions to follow.
- **best-practices-researcher** / **framework-docs-researcher** — external patterns, and confirm nothing recommended is deprecated.
- **spec-flow-analyzer** — user-flow permutations and edge cases.
- **architect-specialist** (large only) — architecture options and trade-offs.

Synthesize into a short brief. Reuse what exists — do not propose new code where a suitable implementation already exists.

## Phase 4: Design + write the Definition of Done

Produce the plan:
- **Approach** — the recommended design (one approach, not a survey), naming the files/functions to change and the existing utilities to reuse.
- **Task breakdown** — bite-sized tasks (roughly 2–5 minutes each), each with the exact file path and a verification step.
- **Definition of Done** — binary, testable items mapping to the verify gate (full suite green, zero lint warnings, typecheck clean, named E2E flows). Mark human-only items `(manual)`.
- **Named E2E flows** — the journeys Playwright must exercise + screenshot.
- **Out of scope / risks / rollback.**

Optionally run **plan-validator** to pressure-test the plan before emitting it.

## Phase 5: Emit (issues or hand-off)

Ask how to land the plan:

- **File issue(s)** — write GitHub issues using the **issue contract** verbatim (the `<!-- dod:start -->…<!-- dod:end -->` block is mandatory). Add `lfg-ready` to any issue meant for autonomous pickup.
  ```bash
  gh issue create --title "<title>" --body "<contract-compliant body>" --label lfg-ready
  ```
- **Hand off to `/lfg` now** — if the user wants to build immediately, summarize the DoD and tell them to run `/lfg <issue|description>`. For parallel work across multiple issues, point to `docs/patterns/worktrees-explained.md`.

## Output

Always end with:
1. The chosen size + one-line approach.
2. The Definition of Done (the exact block `/lfg` will check).
3. Either the created issue URLs or the `/lfg` hand-off command.
4. Any unresolved questions, extremely concise.
