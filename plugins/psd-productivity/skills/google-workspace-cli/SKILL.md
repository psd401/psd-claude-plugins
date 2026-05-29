---
name: google-workspace
description: Unified Google Workspace integration for managing email, calendar, files, and communication across multiple accounts
argument-hint: "[service] [action] [args...]"
model: claude-opus-4-8
effort: high
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Agent
extended-thinking: true
---

# Google Workspace CLI Integration

Shared skill providing Google Drive, Sheets, Gmail, and Calendar access via the [`gws` CLI](https://github.com/googleworkspace/cli). Usable by any psd-productivity workflow.

## Prerequisites

### Install `gws`

```bash
bun install -g @googleworkspace/cli
```

Verify installation:
```bash
gws --version
```

### First-Time Auth Setup

**Option A — With `gcloud` installed** (fastest):
```bash
gws auth setup     # Creates GCP project, enables APIs, logs you in
```

**Option B — Manual setup** (no gcloud needed):
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. **Enable APIs** — Go to APIs & Services > Library and enable:
   - Google Drive API
   - Google Sheets API
   - Gmail API
   - Google Calendar API
   - Google Chat API
   - Google Docs API
   - (Optional) Google Admin SDK API — for directory/user lookups
4. Go to APIs & Services > **OAuth consent screen**
   - Choose **External**, click Create
   - Fill in app name (e.g., "PSD GWS CLI"), your email for support
   - Click through to **Test users** > **Add your Google account email**
5. Go to APIs & Services > **Credentials** > Create Credentials > **OAuth client ID**
   - **IMPORTANT**: Application type must be **Desktop app** (NOT "Web application")
   - A "Web application" type produces a JSON with `"web":{...}` — this will NOT work
   - A "Desktop app" type produces a JSON with `"installed":{...}` — this is correct
6. Download the client JSON and verify it starts with `{"installed":{...}}`
7. Save it:
```bash
mkdir -p ~/.config/gws
mv ~/Downloads/client_secret_XXXX.json ~/.config/gws/client_secret.json
```
8. Run:
```bash
gws auth login -s drive,sheets,gmail,calendar,chat,docs
```
This opens a browser for OAuth consent. If you see "Google hasn't verified this app", click Advanced > Go to app (unsafe). Select all scopes and approve.

### Subsequent Logins

```bash
gws auth login -s drive,sheets    # Only request scopes you need
```

**Scope selection**: Only request what you need to stay under the 25-scope limit for unverified apps:

| Scopes flag | Access |
|------------|--------|
| `drive` | Google Drive files |
| `sheets` | Google Sheets read/write |
| `gmail` | Gmail send/read |
| `calendar` | Calendar events |
| `drive,sheets` | Drive + Sheets (most common for enrollment) |

### Multiple Accounts

`gws` doesn't have built-in account switching, but supports multiple auth contexts via config directories or env vars. Each "account" is just a separate set of encrypted credentials.

#### Method 1 — Separate Config Directories (recommended for named accounts)

Each config dir holds its own `client_secret.json` and encrypted credentials independently. This is the cleanest way to manage multiple accounts.

**Initial setup — one time per account**:
```bash
# 1. Create a config dir for the account
mkdir -p ~/.config/gws-enrollment

# 2. Copy the client_secret.json (same OAuth app works for multiple accounts)
cp ~/.config/gws/client_secret.json ~/.config/gws-enrollment/client_secret.json

# 3. Login with the enrollment account (opens browser — sign in as the enrollment user)
GOOGLE_WORKSPACE_CLI_CONFIG_DIR=~/.config/gws-enrollment \
  gws auth login -s drive,sheets,gmail,calendar,chat,docs
```

**Using a specific account**:
```bash
# Prefix any gws command with the config dir
GOOGLE_WORKSPACE_CLI_CONFIG_DIR=~/.config/gws-enrollment \
  gws drive files list --params '{"pageSize": 5}'

GOOGLE_WORKSPACE_CLI_CONFIG_DIR=~/.config/gws-enrollment \
  gws sheets +read --spreadsheet "SPREADSHEET_ID" --range 'Sheet1!A1:Z100'
```

**Shell alias for convenience** (add to `~/.zshrc`):
```bash
alias gws-enrollment='GOOGLE_WORKSPACE_CLI_CONFIG_DIR=~/.config/gws-enrollment gws'
alias gws-personal='GOOGLE_WORKSPACE_CLI_CONFIG_DIR=~/.config/gws gws'

# Then just use:
gws-enrollment drive files list --params '{"pageSize": 5}'
gws-personal gmail +triage
```

**Suggested account names**:
| Config Dir | Account | Use Case |
|-----------|---------|----------|
| `~/.config/gws` | Your daily @psd401.net account | Default for everything |
| `~/.config/gws-enrollment` | Enrollment-specific account | P223 data, Part Time sheets, internal P223 |
| `~/.config/gws-cfo` | CFO office account | If enrollment data lives under CFO's Drive |

#### Method 2 — Export/Import Credentials (for CI or sharing)

Export credentials from an authenticated machine for use elsewhere:
```bash
# On the authenticated machine
gws auth export --unmasked > ~/enrollment-creds.json

# On another machine (or in a script)
GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE=~/enrollment-creds.json \
  gws drive files list --params '{"pageSize": 5}'
```

**Warning**: Exported credentials are unencrypted. Store securely.

#### Method 3 — Service Account (server-to-server, no browser needed)

If you have a Google service account JSON key:
```bash
export GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE=/path/to/service-account.json
gws drive files list
```

No `gws auth login` needed — service accounts authenticate directly.

#### Checking Which Account Is Active

```bash
# Default account
gws auth export 2>/dev/null | head -1 && echo "Default: authenticated" || echo "Default: not authenticated"

# Named account
GOOGLE_WORKSPACE_CLI_CONFIG_DIR=~/.config/gws-enrollment \
  gws auth export 2>/dev/null | head -1 && echo "Enrollment: authenticated" || echo "Enrollment: not authenticated"
```

#### Auth Precedence

When multiple auth sources exist, `gws` uses this priority:
1. `GOOGLE_WORKSPACE_CLI_TOKEN` env var (pre-obtained access token)
2. `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` env var (JSON file path)
3. Encrypted credentials from `gws auth login` (in the active config dir)
4. Plaintext `~/.config/gws/credentials.json`

## Commands

### `/google-workspace drive [action]`

Manage Google Drive files.

```bash
# List recent files
gws drive files list --params '{"pageSize": 10}'

# Search for files by name
gws drive files list --params '{"q": "name contains '\''enrollment'\''", "pageSize": 20}'

# Upload a file
gws drive +upload ./report.pdf --name "March 2026 P223 Report"

# Upload to a specific folder
gws drive files create \
  --json '{"name": "report.pdf", "parents": ["FOLDER_ID"]}' \
  --upload ./report.pdf

# Download a file (use file export for Google Docs/Sheets)
gws drive files get --params '{"fileId": "FILE_ID", "alt": "media"}' > output.pdf

# Create a folder
gws drive files create \
  --json '{"name": "March 2026", "mimeType": "application/vnd.google-apps.folder", "parents": ["PARENT_FOLDER_ID"]}'
```

### `/google-workspace sheets [action]`

Read and write Google Sheets.

```bash
# Read a range
gws sheets +read --spreadsheet SPREADSHEET_ID --range 'Sheet1!A1:Z100'

# Read with raw API
gws sheets spreadsheets values get \
  --params '{"spreadsheetId": "ID", "range": "Sheet1!A1:C10"}'

# Write/append rows
gws sheets +append --spreadsheet SPREADSHEET_ID --values "Alice,95,Grade A"

# Write to specific range
gws sheets spreadsheets values append \
  --params '{"spreadsheetId": "ID", "range": "Sheet1!A1", "valueInputOption": "USER_ENTERED"}' \
  --json '{"values": [["Name", "Score"], ["Alice", 95]]}'

# Update specific cells
gws sheets spreadsheets values update \
  --params '{"spreadsheetId": "ID", "range": "Sheet1!B2", "valueInputOption": "USER_ENTERED"}' \
  --json '{"values": [[42]]}'

# Create a new spreadsheet
gws sheets spreadsheets create --json '{"properties": {"title": "P223 March 2026"}}'
```

### `/google-workspace gmail [action]`

Send and read email.

```bash
# Send email
gws gmail +send --to user@example.com --subject "March Count Complete" --body "See attached."

# Check inbox
gws gmail +triage

# Reply to a message
gws gmail +reply --message-id MSG_ID --body "Thanks, confirmed."
```

### `/google-workspace calendar [action]`

Manage calendar events.

```bash
# Today's agenda
gws calendar +agenda

# Create an event
gws calendar +insert --summary "April Count Day" --start "2026-04-01T08:00:00" --end "2026-04-01T17:00:00"
```

## Usage from Other Skills

Other psd-productivity skills (like `/enrollment`) invoke Google Workspace operations by running `gws` commands via the Bash tool. Example:

```bash
# Read the Part Time spreadsheet
gws sheets +read --spreadsheet "SPREADSHEET_ID" --range 'PartTime!A1:Z500'

# Upload enrollment backup
gws drive +upload ./backup.pdf --name "GHHS_EnrollmentSummary_20260302"

# Create monthly backup folder
gws drive files create \
  --json '{"name": "March 2026", "mimeType": "application/vnd.google-apps.folder", "parents": ["BACKUP_FOLDER_ID"]}'
```

## Troubleshooting

### "Access blocked" during login
Your account isn't listed as a test user. Go to GCP Console > OAuth consent screen > Test users > Add your email.

### "Google hasn't verified this app"
Expected for testing mode. Click Advanced > Go to app (unsafe). Safe for personal/org use.

### Too many scopes error
Use `-s` flag to limit: `gws auth login -s drive,sheets`

### API not enabled
`gws` will print the enable URL. Click it, enable the API, wait 10 seconds, retry.

### Check auth status
```bash
gws auth export 2>/dev/null && echo "Authenticated" || echo "Not authenticated"
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GOOGLE_WORKSPACE_CLI_TOKEN` | Pre-obtained OAuth token (highest priority) |
| `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` | Path to credentials JSON |
| `GOOGLE_WORKSPACE_CLI_CONFIG_DIR` | Override config dir (default: `~/.config/gws`) |
| `GOOGLE_WORKSPACE_CLI_LOG` | Debug logging (e.g., `gws=debug`) |

Can be set in a `.env` file in the working directory.
