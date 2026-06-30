---
name: lfg
description: Autonomous build-to-done — implement, verify the full Definition of Done (build/lint/typecheck/full suite/Playwright + screenshots), open a PR with visual evidence, then watch CI and the AI reviewers and fix every round until 100% clean. Does not stop until done.
argument-hint: "[issue number OR description of work]"
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
  - Monitor
  - AskUserQuestion
extended-thinking: true
---

# LFG — Autonomous Build-to-Done

You implement a change and drive it all the way to a clean, fully-reviewed PR: implement → verify the Definition of Done → open a PR with screenshots → watch CI and the AI reviewers and fix every finding, round after round, until everything is green. **You do not stop at "ready for review." You stop when the PR is 100% clean.**

This skill absorbs the old `/work`, `/test`, `/debug`, `/optimize`, `/review-pr`, and `/security-audit`.

**Target:** $ARGUMENTS

Contracts: `docs/patterns/definition-of-done.md`, `docs/patterns/issue-contract.md`.

## ANTI-DEFERRAL MANDATE

**Fix everything now.** If a test fails, fix it. If lint warns, fix it. If a reviewer flags it, fix it. No deferral, no TODOs, no follow-up issues. The only exception: a fix genuinely blocked by an external constraint (an API you don't control, a separate deploy pipeline) — then stop and use AskUserQuestion. Never suppress with `eslint-disable` / `# noqa` / `@ts-ignore`.

## Phase 1: Work type + Definition of Done

```bash
if [[ "$ARGUMENTS" =~ ^[0-9]+$ ]]; then
  WORK_TYPE="issue"; ISSUE_NUMBER=$ARGUMENTS
  gh issue view $ISSUE_NUMBER
  gh issue view $ISSUE_NUMBER --comments
  ISSUE_BODY=$(gh issue view $ISSUE_NUMBER --json body --jq '.body')
else
  WORK_TYPE="quick-fix"; ISSUE_NUMBER=""; ISSUE_BODY="$ARGUMENTS"
fi
```

**Load the DoD** — extract the block between `<!-- dod:start -->` and `<!-- dod:end -->` from the issue body. If absent (quick fix or non-contract issue), generate a DoD from the canonical list in `definition-of-done.md` + the project's `.psd/verify.json`. This is your loop exit condition; restate it explicitly before coding.

## Phase 2: Branch (+ optional worktree)

```bash
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo main)
git checkout "$DEFAULT_BRANCH" && git pull origin "$DEFAULT_BRANCH"
if [ "$WORK_TYPE" = "issue" ]; then BR="feature/$ISSUE_NUMBER-brief-desc"; else
  BR="fix/$(echo "$ARGUMENTS" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g;s/--*/-/g' | cut -c1-50)"; fi
git checkout -b "$BR"; git branch --show-current
```

For parallel work across several issues, see `docs/patterns/worktrees-explained.md` and use `/worktree <issue>` to run multiple `/lfg` sessions side by side.

## Phase 3: Research (Task-delegated)

Invoke **work-researcher** (`psd-coding-system:workflow:work-researcher`) with `WORK_TYPE / ISSUE_NUMBER / ISSUE_BODY / ARGUMENTS` to gather knowledge, codebase, git-history, test-strategy, security and UX context. If it fails, proceed with what you have.

## Phase 4: Implement (TDD, atomic commits)

Follow the Research Brief, local CLAUDE.md, and the DoD. Write a failing test first where practical, then make it pass. Commit each atomic unit (builds, lints clean, deployable):

```bash
git add <specific files>
git commit -m "feat(scope): <atomic change>

- <detail>

Part of #$ISSUE_NUMBER"
```

When diagnosing a bug (the absorbed `/debug` path): reproduce → trace to root cause → fix the cause, not the symptom → add a regression test.

## Phase 5: Verify-loop — run the gate until GREEN

Run the **full** Definition-of-Done gate and the configured Playwright flows. Loop fix→verify until green. **No `|| true`. Whole app, not touched files.**

Dispatch **runtime-verifier** (`psd-coding-system:quality:runtime-verifier`):
- description: "Verify DoD for #$ISSUE_NUMBER"
- prompt: "MODE=gate CHANGED_FILES=<git diff --name-only $DEFAULT_BRANCH...HEAD> E2E_FLOWS=<flows from DoD>. Run build/lint(zero-warning)/typecheck/FULL test suite + Playwright for the named flows, capture screenshots to the configured screenshot_dir, return PASS/FAIL with failing steps, root causes, and evidence paths."

Handle the report:
- **FAIL** → fix every failing step (use the root causes), commit, re-dispatch. Repeat until PASS.
- It also writes `.psd/last-gate-result`; confirm GREEN at current HEAD before moving on.

If `.psd/verify.json` is absent, run the gate commands you can detect and tell the user the gate is unconfigured (recommend `/setup`).

## Phase 6: Self-review (parallel agents) → fix

Before opening the PR, run the internal reviewers configured in `.psd/verify.json` `review_agents`:
- **Always-on**: security-reviewer, correctness-reviewer, adversarial-reviewer, code-simplicity-reviewer, architecture-strategist, pattern-recognition-specialist.
- **Language reviewers** for the changed-file extensions (typescript/python/swift/sql).
- **Context-triggered** by changed-file patterns: migrations/schema → data-migration-expert, schema-drift-detector, deployment-verification-agent; PII/data → data-integrity-guardian; config/version files → configuration-validator; deletions → breaking-change-validator; data pipelines/metrics → telemetry-data-specialist; extraction/encoding → document-validator; agents/skills/prompts → agent-native-reviewer; UI → ux-specialist; perf-sensitive → performance-optimizer.

Dispatch the applicable agents in parallel via Task. Fix **all** findings (P1/P2/P3), commit, then re-run Phase 5 so the gate is green again after fixes. (Work-validator already runs the language/deployment subset + runtime-verifier; this phase is the broader self-review.)

## Phase 7: Open PR with visual evidence

```bash
git push -u origin HEAD
# Commit the captured evidence so it renders on the PR.
SHOT_DIR=$(jq -r '.screenshot_dir // ".verification"' .psd/verify.json 2>/dev/null || echo ".verification")
git add "$SHOT_DIR" 2>/dev/null && git commit -m "test: verification evidence for #$ISSUE_NUMBER" 2>/dev/null || true
git push
PR_URL=$(gh pr create --assignee "@me" --title "<type>: #$ISSUE_NUMBER - <title>" --body "$(cat <<'EOF'
## Summary
Implements #<ISSUE>

## Changes
- <key change>

## Verification (all green before opening)
- Build: ✅   Lint (zero-warning): ✅   Typecheck: ✅
- Tests: ✅ <X passed> (full suite)
- E2E: ✅ flows `<names>`

## Evidence
![<flow>](<raw-blob-or-asset-URL-of-committed-screenshot>)

Closes #<ISSUE>
EOF
)")
PR_NUMBER=$(gh pr view --json number --jq '.number')
```

**Screenshots must render on the GitHub PR page** — embed them with `![alt](url)` pointing at the committed evidence files (use the `https://github.com/<owner>/<repo>/blob/<branch>/<path>?raw=true` form, or upload as a gh asset). No empty checkboxes; every claim above is backed by Phase 5 evidence.

## Phase 8: Watch-until-clean — the core loop (cap 10)

Reuse the `pr-fix` machinery (`routines/pr-fix/routine-prompt.md`). Read the expected reviewer logins from `.psd/verify.json` `reviewers`. Repeat up to **10 rounds**:

1. **Wait for CI** (efficient, not busy-wait):
   ```bash
   timeout 30m gh pr checks "$PR_NUMBER" --watch --interval 30 || true
   ```
2. **Wait for the AI reviewers** to each post a review. Poll on a **~3-minute** interval using the **Monitor** tool (the sanctioned non-busy wait) until every login in `reviewers` appears in `gh api repos/{owner}/{repo}/pulls/$PR_NUMBER/reviews --jq '.[].user.login'` or the round times out.
3. **Read the verdict + findings:**
   ```bash
   gh pr view "$PR_NUMBER" --json reviewDecision,reviews,statusCheckRollup
   gh api "repos/{owner}/{repo}/pulls/$PR_NUMBER/comments" --paginate   # inline
   gh pr checks "$PR_NUMBER" --json name,state,bucket,link --jq '.[] | select(.state=="FAILURE" or .bucket=="fail")'
   ```
4. **Categorize** each comment (pr-fix rules): actionable (fix it) / discussion (reply) / already-addressed / stylistic. Fix every actionable finding and every failing check. Commit per fix, push.
5. **Re-run the verify-loop (Phase 5)** after fixes so local DoD stays green, then drop a round-marker comment and loop.
6. **Exit when clean:** `reviewDecision == APPROVED` (or no `CHANGES_REQUESTED` from any required reviewer) AND no failing required checks AND every actionable comment addressed.

If after 10 rounds it is still not clean (a reviewer never posts, a check is flaky, or feedback isn't actionable), **escalate** via AskUserQuestion with the specifics — do not silently stop.

## Phase 9: Finalize — gate, learnings, summary

```bash
# 1. Refresh the gate at current HEAD so the Stop hook can confirm green.
GATE="${CLAUDE_PLUGIN_ROOT:-}/scripts/verify-gate.sh"; [ -x "$GATE" ] || GATE=$(find / -maxdepth 6 -path "*/psd-coding-system/scripts/verify-gate.sh" 2>/dev/null | head -1)
[ -n "$GATE" ] && bash "$GATE" || true
```

Dispatch **learning-writer** (`psd-coding-system:workflow:learning-writer`) with a real session summary (fill the placeholders — implementation, errors, review findings, fixes). Then **commit the learnings** if the repo opts in:

```bash
COMMIT_LEARN=$(jq -r '.commit_learnings // true' .psd/verify.json 2>/dev/null || echo true)
if [ "$COMMIT_LEARN" = "true" ] && [ -n "$(git status --porcelain docs/learnings 2>/dev/null)" ]; then
  git add docs/learnings && git commit -m "chore(learnings): capture from #$ISSUE_NUMBER" && git push
fi
```

Now arm the finalize gate and print the summary:

```bash
mkdir -p .psd && touch .psd/finalizing   # Stop hook verifies the cached gate is GREEN at current HEAD + clean tree before allowing finish
echo "=== /lfg complete ==="
echo "PR: $PR_URL"
echo "Review: APPROVED + all checks green"
echo "Status: DONE (100% clean)"
```

The Stop hook will refuse to let you finish if the gate is not verifiably green at the current commit with a clean tree — so make sure Phases 5–8 actually landed before you summarize.
