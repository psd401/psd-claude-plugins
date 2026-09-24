# Routine B — lfg

Takes a GitHub issue you've labeled `lfg-ready`, implements the fix end to end (research → implement → test → validate → security audit), and opens a PR. One issue per fire across the three target repos.

This is the autonomous workhorse. It runs while you're asleep.

## One-time setup

### 1. Cloud env

Use the same `psd-automation` environment created for Routine A. No changes needed.

### 2. Create the routine

At <https://claude.ai/code/routines> → New routine:

- **Name**: `psd-lfg`
- **Prompt**: paste [`routine-prompt.md`](./routine-prompt.md)
- **Repositories**: same three as triage
  - `psd401/aistudio`
  - `psd401/psd-workflow-automation`
  - `psd401/psd-claude-plugins`
- **Environment**: `psd-automation`
- **Trigger**: Schedule → Daily preset (closest), then `/schedule update` in CLI → cron `41 */6 * * *` (every 6 hours at :41)
- **Permissions** → **Allow unrestricted branch pushes**: **NO**. The routine uses `claude/` prefix branches by design, which require no extra permission.

### 3. Pre-create lfg labels in each target repo

```bash
for repo in psd401/aistudio psd401/psd-workflow-automation psd401/psd-claude-plugins; do
  gh label create lfg-ready       --repo "$repo" --description "Ready for the lfg routine to pick up"        --color "0e8a16" 2>/dev/null || true
  gh label create lfg-in-progress --repo "$repo" --description "lfg routine is actively working on this"     --color "fbca04" 2>/dev/null || true
  gh label create lfg-pr-open     --repo "$repo" --description "lfg routine opened a PR for this issue"      --color "1d76db" 2>/dev/null || true
  gh label create lfg-blocked     --repo "$repo" --description "lfg routine gave up — human attention needed" --color "b60205" 2>/dev/null || true
  gh label create lfg-skip        --repo "$repo" --description "Do not let the lfg routine touch this issue" --color "5319e7" 2>/dev/null || true
done
```

## Daily workflow (yours)

- **From GitHub mobile or web**: open an issue you want auto-implemented, tap "Add label" → `lfg-ready`. Walk away.
- The routine picks it up within 6 hours, comments on the issue when it starts and again when the PR is ready.
- Review the PR like any other PR. Merge or request changes.
- If the routine got stuck: it adds `lfg-blocked` + a comment. Read the reason, fix the underlying problem, remove `lfg-blocked`, re-add `lfg-ready`.

## First-run testing

Before turning on the 6-hour schedule:

1. Find an easy issue in one of the target repos (something with a clear fix — typo, README update, small refactor)
2. Apply the `lfg-ready` label
3. **Run now** on the routine
4. Watch the session transcript:
   - Step 1 passes agent inventory + repo cloning + gh auth
   - Step 2 picks up your test issue
   - Step 3 swaps labels and comments
   - Steps 5–8 do research, implement, test, validate
   - Step 9 opens a PR
   - Step 10 runs the security audit
   - Step 12 swaps `lfg-in-progress` → `lfg-pr-open`
5. Verify: PR exists with both attestations, issue has the right final label, PR comment has the security audit summary

If anything goes sideways, the routine should hit Step 11 (block out) cleanly, not leave a half-pushed branch or stuck labels.

## State-machine quick reference

```
        ┌─────────────┐
        │ (no label)  │
        └──────┬──────┘
               │  human adds lfg-ready
               ▼
        ┌─────────────┐
        │  lfg-ready  │ ◄──────────────────────┐
        └──────┬──────┘                        │
               │  routine claims                │
               ▼                                │
        ┌─────────────────┐                    │
        │ lfg-in-progress │                    │
        └──────┬──────────┘                    │
       success │     │ failure                 │
               ▼     ▼                         │
   ┌──────────────┐  ┌──────────────┐          │
   │ lfg-pr-open  │  │ lfg-blocked  │ ── human ┘
   └──────────────┘  └──────────────┘   un-blocks
```

## What this routine intentionally does NOT do

- Pick up issues without `lfg-ready`. You decide what gets auto-implemented.
- Merge its own PR. Humans always merge.
- Work issues marked `lfg-skip`. That label is your hard opt-out.
- Try the same issue twice in a row. After `lfg-blocked`, only a human removing the label re-queues it.
- Modify `main` directly. Always branches.

## Operational notes

- Daily routine cap (per claude.ai/code) may throttle if you queue many issues at once. The routine self-limits to 1/fire, so peak throughput is ~4 issues/day (6h fires).
- A single fire can take a long time — implementation + tests + audit is multi-step. Watch the daily routine cap if you also have triage + future routines running.
