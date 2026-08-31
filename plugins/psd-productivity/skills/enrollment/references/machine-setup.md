# Machine Setup — Running /enrollment on a New Machine

> The enrollment skill is designed to run on any Mac with Claude Code — Hagel's laptop,
> the office Mac mini (scheduled), or a future operator's machine. This is the complete
> setup checklist. Everything here is one-time per machine.

## 1. Prerequisites

| Tool | Install | Why |
|------|---------|-----|
| Claude Code + psd-productivity plugin | `/plugin marketplace add psd401/psd-claude-plugins` then `/plugin install psd-productivity` | The skill itself |
| Brave Browser Nightly | https://brave.com/download-nightly/ | Debug browser for PowerSchool automation (bypasses district MDM restrictions on Chrome remote debugging) |
| bun | `curl -fsSL https://bun.sh/install | bash` | `save_pdf.js`, gws CLI runtime |
| uv | `curl -LsSf https://astral.sh/uv/install.sh | sh` | Python reconciliation scripts (PEP 723 inline deps) |
| gws CLI | see google-workspace-cli skill's SKILL.md | Drive/Sheets/Gmail access |

## 2. Debug Browser (one-time)

1. Launch it: `bash <plugin>/skills/browser-control/scripts/launch-chrome.sh`
   - Creates the persistent profile at `~/.psd-browser-automation`, debug port 9222
2. In the launched browser window, **log into PowerSchool admin** with the operator's account. The persistent profile keeps the session across restarts — but PowerSchool sessions do expire server-side, which is why `daily-check` probes session health and alerts when a re-login is needed.
3. Open `brave://settings/downloads` and turn **OFF** "Ask where to save each file before downloading" (persists in the profile).
4. Verify: `bash .../launch-chrome.sh --status` → `running`, and the session probe in `report-checklist.md` returns `true`.

## 3. Google Workspace auth (one-time)

Authenticate `gws` per the google-workspace-cli skill with an account that can:
- Read/write the tracking sheet `1t10gPECTUd2s9kMrm2jsOIvMHKnRpTcbhJGq-hO7Yg0`
- Write the Drive BACKUP folder (Shared Google Drive > ESC Business Services > Enrollment)

Verify: `gws sheets +read --spreadsheet 1t10gPECTUd2s9kMrm2jsOIvMHKnRpTcbhJGq-hO7Yg0 --range 'Calendar!A1:B3'`

## 4. Notification webhook token (one-time)

The EDS-confirmation step calls the n8n `BUS - Enrollment Notifications` webhook, authenticated by a shared token. Set it in the operator's shell profile:

```bash
export ENROLLMENT_NOTIFY_TOKEN="<get value from Hagel — not committed anywhere>"
```

The token value lives only in the deployed n8n workflow and in each runner machine's env. The webhook degrades safely: without the token the skill reports the failure and updates the tracking sheet directly instead.

## 5. Local staging directory

```bash
mkdir -p ~/Enrollment
```
Month folders (`~/Enrollment/P223-<Month>-<Year>/`) are created by the skill as needed. Local files are staging only — Drive is the home of record.

## 6. Scheduled operation (Mac mini)

Create a Claude Code scheduled task on the machine (local schedule, NOT a cloud routine — the browser runs on this machine):

- **Task**: run `/enrollment daily-check` weekday mornings (e.g. 06:30)
- The check reads the tracking sheet's `Calendar` tab, and:
  - normal day → probes PowerSchool session health, alerts by email if a re-login is needed, exits
  - T-1 → readiness summary (session + Drive folder)
  - count day → runs the full `/enrollment run`
- Keep the machine awake for the window (System Settings → Energy → prevent sleep, or `caffeinate`), and leave the debug browser running (the launch script is idempotent — `daily-check` may call it safely).

## 7. Unattended operation — running with nobody at the computer

The only human dependency in the whole pipeline is the **PowerSchool session** — everything else (calendar, reminders, folders, uploads, tracking, notifications) already runs without a person. Treat it as four layers, adopted in order:

**Layer 1 — machine always ready** (do this once on the mini):
- macOS auto-login for the operator account (requires FileVault off on this machine — district decision), Screen Sharing enabled
- Prevent sleep: `sudo pmset -a sleep 0 displaysleep 10` (or Energy settings)
- Launch the debug browser at login (Login Item or LaunchAgent running `launch-chrome.sh`) — the script opens the PowerSchool login page on fresh starts, so any human touch is just "type password, walk away"

**Layer 2 — detection (already built)**: `daily-check` probes the session every weekday morning and emails when it's dead. Worst case, someone spends 30 seconds in Screen Sharing the day before count day. The T-1 reminder doubles as the prompt.

**Layer 3 — keep-alive (recommended next step)**: PowerSchool expires sessions on inactivity; the probe request itself counts as activity. Schedule the probe frequently (e.g., every 15 minutes during business hours via a second scheduled task or launchd job) and the session may stay alive indefinitely between server restarts. Measure the real lifetime for a week before trusting it — if PS enforces an absolute expiry, Layer 2 still catches it.

**Layer 4 — automated login (deliberate CIO decision, not built)**: a dedicated PowerSchool service account (reports-only role, password login, exempt from SSO/2FA) with credentials in the mini's Keychain and a login script driven over CDP. This removes the last human touch entirely, at the cost of a stored credential on an office machine — weigh audit and security implications before asking for it. Never store the credential in a repo, sheet, or env file.

**Long-term exit**: PowerSchool plugin API / ODBC access (both exist for PSD) would remove the browser for backup data entirely — surfaced through psd-data-mcp. The P223 form itself still comes from the PS report engine, so the browser path never fully disappears until OSPI/EDS accepts data another way.

## 8. Handoff to a new operator

1. New operator installs the plugin and follows steps 1–4 with **their own** PowerSchool + Google accounts
2. Share the tracking sheet and the Drive Enrollment folder with them
3. The `UpdatedBy` column on SchoolStatus rows identifies which machine/person ran what
4. Nothing else moves — no scripts, no config files, no Desktop folders

## Known machine-specific failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Browser tools error "connection refused 9222" | Debug browser not running / crashed | `launch-chrome.sh` (idempotent); kill orphan Brave processes if stuck |
| Reports run but every XHR 302s to `pw.html` | PowerSchool session expired | Human logs in once in the debug browser window |
| `gws` errors about auth/keyring | gws not authenticated on this machine | Re-run google-workspace-cli auth setup |
| Downloads prompt for location each time | Profile setting not applied | `brave://settings/downloads`, disable ask-where-to-save |
| n8n API calls 403 with `server: Caddy` | Machine's egress IP not in the n8n allowlist | Needs PSD network/VPN — but the skill only needs the tracking sheet (Google), not the n8n API |
