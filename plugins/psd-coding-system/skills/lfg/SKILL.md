---
name: lfg
description: Autonomous build-to-done — implement, verify the full Definition of Done (build/lint/typecheck/full suite/Playwright + screenshots), open a PR with visual evidence, then watch CI and the AI reviewers and fix every round until 100% clean. Does not stop until done.
argument-hint: "[issue number OR description of work]"
model: claude-opus-5
effort: medium
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
  - EnterWorktree
  - ExitWorktree
extended-thinking: true
---

# LFG — Autonomous Build-to-Done

You implement a change and drive it all the way to a clean, fully-reviewed PR: implement → verify the Definition of Done → open a PR with screenshots → watch CI and the AI reviewers and fix every finding, round after round, until everything is green. **You do not stop at "ready for review." You stop when the PR is 100% clean.**

This skill absorbs the old `/work`, `/test`, `/debug`, `/optimize`, `/review-pr`, and `/security-audit`.

**Target:** $ARGUMENTS

Contracts: `docs/patterns/definition-of-done.md`, `docs/patterns/issue-contract.md`.

## No deferral

Fix everything now. A failing test, a lint warning, a reviewer finding — each gets fixed in this session, not deferred to a TODO or follow-up issue, and never suppressed with `eslint-disable` / `# noqa` / `@ts-ignore`. Finish the whole task, not just the easy part of it — report completion only when the DoD is fully green. The one exception: a fix genuinely blocked by an external constraint (an API you don't control, a separate deploy pipeline) — surface that with AskUserQuestion instead of working around it.

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

## Phase 2: Branch — auto-isolated worktree (parallel-safe)

By default `/lfg` runs each issue in its **own git worktree** and switches this session into it, so you can open several Claude windows in the same repo, run `/lfg <issue>` in each, and they never collide. Opt out with `auto_worktree: false` in `.psd/verify.json` (branch in place instead). Auto-worktree is skipped automatically when the session is already inside a worktree.

```bash
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo main)
# PSD convention: base off dev when it exists, else the default branch
if git ls-remote --exit-code --heads origin dev >/dev/null 2>&1; then BASE=dev; else BASE="$DEFAULT_BRANCH"; fi

# Branch + worktree names
if [ "$WORK_TYPE" = "issue" ]; then
  T=$(gh issue view "$ISSUE_NUMBER" --json title --jq '.title' 2>/dev/null | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g;s/--*/-/g' | cut -c1-40)
  BR="feature/${ISSUE_NUMBER}-${T:-work}"; WT_NAME="feature-${ISSUE_NUMBER}-${T:-work}"
else
  T=$(echo "$ARGUMENTS" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g;s/--*/-/g' | cut -c1-50)
  BR="fix/${T}"; WT_NAME="fix-${T}"
fi

AUTO_WT=$(jq -r '.auto_worktree // true' .psd/verify.json 2>/dev/null || echo true)
[ -f .git ] && ALREADY_WT=1 || ALREADY_WT=0   # a linked worktree's .git is a FILE; the main checkout's is a DIR

if [ "$AUTO_WT" = "true" ] && [ "$ALREADY_WT" = "0" ]; then
  git fetch origin "$BASE" --quiet 2>/dev/null || true
  grep -qxF '.claude/worktrees/' .git/info/exclude 2>/dev/null || echo '.claude/worktrees/' >> .git/info/exclude
  WT_PATH=".claude/worktrees/${WT_NAME}"
  git worktree add -b "$BR" "$WT_PATH" "origin/$BASE"
  git worktree list | tail -1
  echo "ENTER_WORKTREE=$WT_PATH"
else
  git checkout "$BASE" && git pull origin "$BASE"
  git checkout -b "$BR"
  git branch --show-current
  echo "ENTER_WORKTREE="
fi
```

**If the output printed `ENTER_WORKTREE=<path>` (non-empty), call the `EnterWorktree` tool now** with `path` set to that worktree path (use the exact path from `git worktree list` if the relative one is rejected). That moves this whole session into the isolated worktree on branch `$BR`; every later phase runs there. If `ENTER_WORKTREE=` is empty, you are already isolated — continue in place.

### Bootstrap a fresh worktree
A brand-new worktree has **no installed dependencies**, so the verify gate (build/test/Playwright) would fail. If the project uses a package manager and this worktree has no installed deps, install them before Phase 5 — `npm ci` (or `npm install`), `pnpm install`, `yarn`, `pip install -e .`, `uv sync`, `bundle install`, etc., matching the project. The `WorktreeCreate` hook already symlinks `.env` into the worktree.

For manual control you can still create a worktree yourself with `/worktree <issue>`; see `docs/patterns/worktrees-explained.md`.

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

Dispatch the applicable agents in parallel via Task, once — the configured reviewers plus the Phase 5 gate are the whole verification surface, so don't spawn additional ad-hoc review or double-check subagents beyond them. Fix **all** findings (P1/P2/P3), commit, then re-run Phase 5 so the gate is green again after fixes. (Work-validator already runs the language/deployment subset + runtime-verifier; this phase is the broader self-review.)

## Phase 7: Open PR with visual evidence

A PR body is just markdown, and **GitHub only renders images from URLs it hosts — local PNG paths and relative links do NOT embed, and `gh`/the API has no stable endpoint for the drag-drop attachment CDN.** The reliable way: commit the screenshots to the branch, then reference each by a **commit-SHA-pinned** GitHub blob URL (durable even after the branch is squash-merged or deleted). Build the Evidence block from the files that are *actually committed* — never from a placeholder.

```bash
git push -u origin HEAD

# 1. Commit the captured screenshots. Force-add in case screenshot_dir is gitignored.
#    Point screenshot_dir (in .psd/verify.json) at the repo's convention if it has one
#    (e.g. "docs/verification"); default is ".verification".
SHOT_DIR=$(jq -r '.screenshot_dir // ".verification"' .psd/verify.json 2>/dev/null || echo ".verification")
git add -f "$SHOT_DIR" 2>/dev/null || true
if ! git diff --cached --quiet 2>/dev/null; then
  git commit -m "test(verify): visual evidence for #$ISSUE_NUMBER"
  git push
fi

# 2. Build the Evidence markdown from the committed image files, pinned to the current SHA.
REPO_SLUG=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
SHA=$(git rev-parse HEAD)
EVIDENCE=""
for f in $(git ls-files "$SHOT_DIR" | grep -iE '\.(png|jpe?g|gif|webp)$'); do
  ALT=$(basename "$f" | sed 's/\.[^.]*$//')
  EVIDENCE="${EVIDENCE}"$'\n'"![${ALT}](https://github.com/${REPO_SLUG}/blob/${SHA}/${f}?raw=true)"
done
[ -z "$EVIDENCE" ] && EVIDENCE="_N/A — no UI surface._"
printf '%s\n' "$EVIDENCE"   # use these exact lines in the PR body
```

Then open the PR, pasting the printed `$EVIDENCE` lines verbatim into the Evidence section:

```bash
gh pr create --assignee "@me" --title "<type>: #$ISSUE_NUMBER - <title>" --body "$(cat <<EOF
## Summary
Implements #$ISSUE_NUMBER

## Changes
- <key change>

## Verification (all green before opening)
- Build: ✅   Lint (zero-warning): ✅   Typecheck: ✅
- Tests: ✅ <X passed> (full suite)
- E2E: ✅ flows \`<names>\`

## Evidence
$EVIDENCE

Closes #$ISSUE_NUMBER
EOF
)"
PR_NUMBER=$(gh pr view --json number --jq '.number')
```

**Hard rules — no false evidence:**
- The Evidence section must contain a **rendered image link for every screenshot the verifier captured**, or the literal text `N/A — no UI surface`. **Never** write prose that implies screenshots are attached when there is no image link — that is a misleading claim, not evidence.
- Use the `https://github.com/<owner>/<repo>/blob/<SHA>/<path>?raw=true` form. Do **not** use `raw.githubusercontent.com` (does not render for private repos) and do **not** use relative paths (GitHub ignores them in PR bodies).
- No empty checkboxes; every claim in the body is backed by the Phase 5 gate result.

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
