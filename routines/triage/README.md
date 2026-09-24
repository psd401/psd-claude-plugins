# Routine A — Triage

Polls FreshService for untriaged bug tickets, diagnoses each one with the full Phase-1.5 agent fan-out (`repo-research-analyst` + `git-history-analyzer` + `bug-reproduction-validator`), files a GitHub issue against the correct target repo, and posts a private note + public reply to FreshService.

Runs twice daily. One fire processes up to 5 untriaged tickets. Idempotency comes from a `[claude-routine-triaged]` marker in the FreshService private note.

## One-time setup

### 1. Create the cloud environment

Visit <https://claude.ai/code/routines> → New routine → Environment dropdown → **Create new environment**.

- **Name**: `psd-automation`
- **Network access**: Custom
  - Check "Also include default list of common package managers"
  - **Allowed domains**: add `<your-domain>.freshservice.com`
- **Environment variables**:
  - `FRESHSERVICE_API_KEY` = your FreshService API key
  - `FRESHSERVICE_DOMAIN` = your Freshservice subdomain
  - `FRESHSERVICE_WORKSPACE_ID` = the Software Development workspace ID (see step 4)
- **Setup script**: paste the contents of [`routines/shared/env-setup.sh`](../shared/env-setup.sh)
- Save

### 2. Create the routine

Same page, fill the routine form:

- **Name**: `psd-triage`
- **Prompt**: paste the contents of [`routine-prompt.md`](./routine-prompt.md)
- **Repositories**:
  - `psd401/aistudio`
  - `psd401/psd-workflow-automation`
  - `psd401/psd-claude-plugins`
- **Environment**: `psd-automation` (from step 1)
- **Trigger**: Schedule → daily, cron `0 10 * * *` (or pick whatever cadence — the routine self-throttles to 5 tickets per fire)
- **Permissions** → enable **Allow unrestricted branch pushes**: NO (triage only files issues, never pushes)
- Save

### 3. Pre-create labels in target repos

```bash
for repo in psd401/aistudio psd401/psd-workflow-automation psd401/psd-claude-plugins; do
  gh label create triaged-from-freshservice --repo "$repo" \
    --description "Auto-created by FreshService triage routine" --color "1d76db" 2>/dev/null || true
done
```

### 4. FreshService workspace ID

The prompt reads the Software Development workspace ID from `FRESHSERVICE_WORKSPACE_ID` in the routine env (kept out of this public repo). Look it up, or re-check it if FreshService is ever reorganized:

```bash
curl -u "$FRESHSERVICE_API_KEY:X" \
  "https://${FRESHSERVICE_DOMAIN}.freshservice.com/api/v2/workspaces" | jq '.workspaces[] | {id, name}'
```

Then update `FRESHSERVICE_WORKSPACE_ID` in the routine env config.

## First-run testing

Before enabling the daily schedule:

1. Run the routine with **Run now** while having at least one untriaged ticket in FreshService
2. Watch the session transcript — Step 1 should pass agent inventory, Step 2 should return tickets
3. After completion, verify:
   - One new GitHub issue in the chosen target repo
   - One private note + one public reply on the FreshService ticket
   - The private note contains `[claude-routine-triaged]`
   - The ticket status moved to Open
4. **Run now** a second time. Verify the previously-triaged ticket is skipped (because of the marker) and a different ticket is picked up (or the run reports "0 tickets to process").

If both runs behave as expected, enable the schedule.

## Operational notes

- **Per-fire cap is 5 tickets**. Edit Step 2 of the routine prompt to change.
- **Errors don't post the marker**, so errored tickets are re-tried on the next fire. If a ticket errors persistently, look at the run transcript in <https://claude.ai/code/routines>.
- **Adding a 4th target repo**: edit the "Target repositories" table in the prompt AND add the repo to the routine's repository list in the web UI.

## Maintenance

- Agents and skills are pulled fresh from `main` of psd-claude-plugins on every fire. Changes to `plugins/psd-coding-system/agents/research/*.md` apply on the next routine run with no extra work.
- Cloning is shallow (`--depth 1`). If you need git history in a diagnosis agent, change `--depth 1` in `routines/shared/env-setup.sh` to a deeper depth or remove the flag.

## What this routine intentionally does NOT do

- Implement fixes — that's Routine B (lfg)
- Respond to PR review comments — that's Routine C (pr-fix)
- Close tickets after a fix ships — humans still do that manually
