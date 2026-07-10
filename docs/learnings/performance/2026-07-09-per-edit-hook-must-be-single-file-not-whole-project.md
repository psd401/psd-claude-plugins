---
title: Per-edit PostToolUse hooks must be single-file and sub-second, not whole-project checks
category: performance
tags:
  - hooks
  - PostToolUse
  - typescript
  - shell
  - telemetry
  - lfg
severity: medium
date: 2026-07-09
source: auto — /lfg
applicable_to: project
---

## What Happened

Issue #77 → PR #78: `plugins/psd-coding-system/scripts/post-edit-validate.sh` ran `npx tsc --noEmit` (a whole-project typecheck) after every `.ts/.tsx` Edit/Write. Telemetry over 6 weeks: 844 firings, ~4s median (max 7.8s), ~60% cancelled mid-run and discarded, ≈56 min of blocked agent-loop time.

## Root Cause

A PostToolUse hook was implemented as a full-project command instead of a single-file syntax check. Every edit paid the cost of type-checking the entire project, and most of that work was thrown away because the agent moved on before the check finished.

## Solution

- Dropped the ts/tsx branch from `post-edit-validate.sh` entirely; whole-project typecheck now only happens once per turn in the opt-in DoD gate (`.psd/verify.json`), not per edit.
- Narrowed the `hooks.json` PostToolUse `if` matcher from `\.(?:ts|tsx|py|json)$` to `\.(?:py|json)$` so the hook no longer spawns a process for `.ts/.tsx` at all. Kept cheap single-file checks: `py_compile` for `.py`, `jq` for `.json`.
- Fixed two related shell bugs surfaced during review before merge:
  - Under `set -euo pipefail`, `FILE_PATH=$(echo "$INPUT" | jq ...)` propagated the pipeline's non-zero exit on malformed stdin, turning a non-blocking hook into a hard failure — guarded with `|| exit 0`.
  - `INPUT=$(cat)` piped into `echo "$INPUT" | jq` is unsafe (`echo` mangles backslashes and can interpret a leading `-n`/`-e` as its own flag) — fixed by streaming stdin directly into `jq`, removing the intermediate variable.
- Corrected an overstated CLAUDE.md/CHANGELOG claim: the DoD gate is not an unconditional typecheck safety net — it only runs when a repo opts in via `.psd/verify.json` with a typecheck command, and only when work goes through `/lfg`. Documented as a real coverage trade-off, not redundancy.

## Prevention

- Any PostToolUse hook that fires on every edit must stay single-file and sub-second (syntax-only: `py_compile`, `jq`, `tsc --noEmit <file>` with a lightweight config, etc.). Whole-project/whole-suite checks belong in a once-per-turn gate, never per-edit.
- In shell hooks run under `set -euo pipefail`, guard any command-substitution assignment that reads a pipeline (`X=$(cmd | jq ...)`) with `|| exit 0` so malformed/empty stdin can't turn a non-blocking hook into a blocking failure.
- Never pipe through `echo "$VAR" | jq`; use `jq ... <<<"$VAR"` or stream stdin directly into `jq` to avoid `echo` mangling backslashes or eating leading `-n`/`-e`.
- When documenting a removed safety net, state the coverage trade-off precisely (opt-in/conditional vs. unconditional) rather than implying full replacement.
