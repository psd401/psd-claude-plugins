# Machine Setup — Running /enrollment on a New Machine

> The enrollment skill is designed to run on any Mac with Claude Code — Hagel's laptop,
> the office Mac mini, or the enrollment officer's machine. This is the complete setup
> checklist. Everything here is one-time per machine.

## 1. Prerequisites

| Tool | Install | Why |
|------|---------|-----|
| Claude desktop app (Code tab) + psd-productivity plugin | `/plugin marketplace add psd401/psd-claude-plugins` then `/plugin install psd-productivity` | The skill itself |
| Google Chrome | The district-managed install is fine; no flags, no special profile | The browser the skill drives |
| Claude in Chrome extension | Chrome Web Store → "Claude in Chrome"; sign in with the same Claude account as the desktop app | Lets the skill act in that Chrome (its tools are `mcp__claude-in-chrome__*`) |
| bun | `curl -fsSL https://bun.sh/install \| bash` | gws CLI runtime, n8n-manager scripts |
| uv | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | Python scripts (PEP 723 inline deps) |
| gws CLI | see google-workspace-cli skill's SKILL.md | Drive/Sheets access |

Brave Nightly, the debug profile and port 9222 are gone (2026-10-08). Nothing is launched by script any more.

## 2. Chrome + Claude in Chrome (one-time)

1. Open Chrome, install the Claude in Chrome extension, sign in to it with the operator's Claude account, and connect it to the Claude desktop app (the app's browser setting lists it; in a session, `list_connected_browsers` shows it).
2. In Chrome, **log into PowerSchool admin** as the operator's PowerSchool account (the PSD Enrollment service account on an operator machine). PowerSchool sessions expire server-side; the skill probes session health and tells you when a re-login is needed. **The automation never types a password and never retries a login.**
3. `chrome://settings/downloads` → "Ask where to save each file before downloading" **off**.
4. `chrome://settings/content/automaticDownloads` → add the PowerSchool host under "Allowed to automatically download multiple files". Without this Chrome silently drops every scripted download after the first one from a page (seen 2026-10-08). If a run's first download works and the rest never appear, this is why — the address-bar icon on the PowerSchool tab also offers "Always allow".
5. The first time the skill touches a site, Chrome/the extension asks the person to allow it (PowerSchool, drive.google.com if used). Allow once.
6. Verify: in a session, `tabs_context_mcp` lists a tab, and the session probe in `report-checklist.md` returns `true`.

## 3. Google Workspace auth (one-time)

Authenticate `gws` per the google-workspace-cli skill with an account that can:
- Read/write the tracking sheet `1t10gPECTUd2s9kMrm2jsOIvMHKnRpTcbhJGq-hO7Yg0`
- Write the Drive BACKUP folder (Shared Google Drive > ESC Business Services > Enrollment)
- Share folders (Content Manager of the shared drive) if this machine runs Phase 0 with `--share`

Verify: `gws sheets +read --spreadsheet 1t10gPECTUd2s9kMrm2jsOIvMHKnRpTcbhJGq-hO7Yg0 --range 'Calendar!A1:B3'`

## 4. Webhook token (one-time)

The monthly completion email, the building follow-ups and the post-EDS confirmation all go
through the n8n `BUS - Enrollment Notifications` webhook, which needs `ENROLLMENT_NOTIFY_TOKEN`
and the webhook URL (`ENROLLMENT_NOTIFY_URL`, never committed — this repo is public). There are
two machine profiles; pick one.

**Operator machine** (enrollment officer's computer, the office Mac mini) — holds only
the webhook token and URL, in the login Keychain:
```bash
security add-generic-password -a "$USER" -s ENROLLMENT_NOTIFY_TOKEN -w   # prompts for the value
security add-generic-password -a "$USER" -s ENROLLMENT_NOTIFY_URL -w     # full https://…/webhook/enrollment-notify URL
```
Get both values from the CIO. Those are the only secrets an operator machine needs.

**Admin machine** (the CIO's laptop) — also manages the n8n workflows, so it holds the
n8n API key in the Keychain and the skill reads the webhook token from the live
workflow instead of storing it:
```bash
security add-generic-password -a "$USER" -s N8N_HOST -w      # e.g. n8n.example.org
read -s KEY && security add-generic-password -a "$USER" -s N8N_API_KEY -w "$KEY" && unset KEY
```
The API key is longer than 128 characters, and the interactive `security … -w` prompt silently truncates at 128 (verified 2026-10-09: sent 267, stored 128). `read -s` takes the paste without echo and without shell history; verify with `security find-generic-password -a "$USER" -s N8N_API_KEY -w | tr -d '\n' | wc -c`. The webhook token and URL are short enough for the prompt. Never put either value in a committed file, the sheet, or an email.

## 5. Local staging directory

```bash
mkdir -p ~/Enrollment
```
Month folders (`~/Enrollment/P223-<Month>-<Year>/`) are created by the skill as needed. Local files are staging only — Drive is the home of record.

## 6. Running it

The count is an attended run: the operator opens the Claude desktop app, makes sure Chrome is open with the extension connected and PowerSchool logged in, and types `/enrollment run <month>`. The skill drives the browser in a tab of its own; the operator can watch.

**Scheduled / unattended operation is not validated with Claude in Chrome.** `daily-check` and the count-day kickoff were designed for a scheduled task on a Mac mini driving a debug browser; with the extension, a scheduled session needs the desktop app running, Chrome open, the extension connected and PowerSchool logged in, and none of that has been tested unattended. Until it is, treat `daily-check` as something a person starts. The one human dependency that never goes away is the PowerSchool login: sessions expire, and **automation must never retry logins** — a failed attempt is recorded, and a lockout before a count day is the worst available failure. Long-term exit: PowerSchool plugin API / ODBC access for backup data, and PowerSchool's own report scheduler for the P223 runs.

## 7. Handoff to a new operator

1. New operator installs the plugin and follows steps 1–4 with **their own** Claude, PowerSchool and Google accounts
2. Share the tracking sheet and the Drive Enrollment folder with them
3. The `UpdatedBy` column on SchoolStatus rows identifies which machine/person ran what
4. Nothing else moves — no scripts, no config files, no Desktop folders

## Known machine-specific failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Browser tools say the extension is not connected / no response | Chrome closed, extension signed out, or not connected to the app | Open Chrome, check the extension, retry once; never loop |
| Reports run but every XHR 302s to `pw.html` | PowerSchool session expired | Human logs in once in Chrome |
| First download of a run works, later ones never appear | Chrome blocked multiple automatic downloads from the site | Step 2.4 above |
| Downloads prompt for location each time | Chrome setting not applied | `chrome://settings/downloads`, disable ask-where-to-save |
| `javascript_tool` result shows `[BLOCKED: Cookie/query string data]` | The script returned a URL-like string | Return ids and counts; navigate from inside the script |
| `gws` errors about auth/keyring | gws not authenticated on this machine | Re-run google-workspace-cli auth setup |
| n8n API calls 403 with `server: Caddy` | Machine's egress IP not in the n8n allowlist | Needs PSD network/VPN — but the skill only needs the tracking sheet (Google), not the n8n API |
