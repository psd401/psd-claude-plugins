# Routine C — pr-fix

Scans open pull requests across the three target repos, picks one with unaddressed review feedback or failing CI, and resolves what it can. Adds labels to communicate state.

Runs the same watch-until-clean logic as `/lfg` Phase 8 (the interactive skill reuses this routine's `gh` machinery) — uses the same round-marker comment convention so interactive `/lfg` runs and routine runs can interleave on the same PR without re-processing the same comments.

## One-time setup

### 1. Cloud env

Use the existing `psd-automation` environment.

### 2. Create the routine

At <https://claude.ai/code/routines> → New routine:

- **Name**: `psd-pr-fix`
- **Prompt**: paste [`routine-prompt.md`](./routine-prompt.md)
- **Repositories**: same three as the other routines
- **Environment**: `psd-automation`
- **Trigger**: Schedule → Daily preset, then `/schedule update` → cron `30 */4 * * *` (every 4 hours at :30, staggered from lfg's `:00`)
- **Permissions** → **Allow unrestricted branch pushes**: **YES** for this one. Unlike lfg (which only opens new claude/-prefix branches), pr-fix pushes to existing PR branches, which can have any name.

### 3. Pre-create labels

```bash
for repo in psd401/aistudio psd401/psd-workflow-automation psd401/psd-claude-plugins; do
  gh label create pr-fix-stuck --repo "$repo" --description "pr-fix routine gave up — human attention needed" --color "b60205" 2>/dev/null || true
  gh label create pr-fix-done  --repo "$repo" --description "pr-fix routine processed and PR is clean"        --color "0e8a16" 2>/dev/null || true
  gh label create pr-fix-skip  --repo "$repo" --description "Do not let the pr-fix routine touch this PR"     --color "5319e7" 2>/dev/null || true
done
```

## Daily workflow (yours)

- **Review a PR, leave comments**. Routine picks it up within 4 hours.
- **You see `pr-fix-stuck` on a PR**: read the routine's comment. Either remove the label (re-queues) or do the work yourself.
- **You want to opt a PR out entirely**: add `pr-fix-skip`. Routine never touches it.

## Concurrency notes

- Stagger from lfg (cron `0 */6 * * *`) by using `:30` and a different interval. Cron `30 */4 * * *` runs at xx:30 every 4 hours so two routines never start the same minute.
- If lfg just opened a PR, this routine will see it on its next fire. That's fine — the PR has no comments yet so the filter excludes it.
- Branch pushes are allowed (see Permissions setting above). The routine only pushes to the PR's existing head branch, never main/dev.

## What this routine intentionally does NOT do

- Open new PRs. That's Routine B (lfg).
- Process its own past round-markers as actionable feedback. The marker convention is matched and skipped.
- Auto-merge PRs. Even a `pr-fix-done` PR still needs a human to hit Merge.
- Touch PRs labeled `pr-fix-skip`. Hard opt-out, no exceptions.
