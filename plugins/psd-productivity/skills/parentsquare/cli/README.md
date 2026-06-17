# Parentsquare CLI

Discovered API spec for parentsquare

Learn more at [Parentsquare](https://www.parentsquare.com).

Created by [@krishagel](https://github.com/krishagel) (Kris Hagel).

## Install

The recommended path installs both the `parentsquare-pp-cli` binary and the `pp-parentsquare` agent skill (Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, and other agents supported by the upstream [`skills`](https://github.com/vercel-labs/skills) CLI) in one shot:

```bash
npx -y @mvanhorn/printing-press-library install parentsquare
```

For CLI only (no skill):

```bash
npx -y @mvanhorn/printing-press-library install parentsquare --cli-only
```

For skill only — installs the skill into the same agents as the default command above, but skips the CLI binary (use this to update or reinstall just the skill):

```bash
npx -y @mvanhorn/printing-press-library install parentsquare --skill-only
```

To constrain the skill install to one or more specific agents (repeatable — agent names match the [`skills`](https://github.com/vercel-labs/skills) CLI):

```bash
npx -y @mvanhorn/printing-press-library install parentsquare --agent claude-code
npx -y @mvanhorn/printing-press-library install parentsquare --agent claude-code --agent codex
```

### Without Node

The generated install path is category-agnostic until this CLI is published. If `npx` is not available before publish, install Node or use the category-specific Go fallback from the public-library entry after publish.

### Pre-built binary

Download a pre-built binary for your platform from the [latest release](https://github.com/mvanhorn/printing-press-library/releases/tag/parentsquare-current). On macOS, clear the Gatekeeper quarantine: `xattr -d com.apple.quarantine <binary>`. On Unix, mark it executable: `chmod +x <binary>`.

<!-- pp-hermes-install-anchor -->
## Install for Hermes

Install the CLI binary first. The installer writes binaries to a per-user managed bin directory by default: `$HOME/.local/bin` on macOS/Linux and `%LOCALAPPDATA%\Programs\PrintingPress\bin` on Windows.

```bash
npx -y @mvanhorn/printing-press-library install parentsquare --cli-only
```

Then install the focused Hermes skill.

From the Hermes CLI:

```bash
hermes skills install mvanhorn/printing-press-library/cli-skills/pp-parentsquare --force
```

Inside a Hermes chat session:

```bash
/skills install mvanhorn/printing-press-library/cli-skills/pp-parentsquare --force
```

Restart the Hermes session or gateway if the newly installed skill is not visible immediately.

## Install for OpenClaw
Install both the CLI binary and the focused OpenClaw skill. The installer defaults binaries to a per-user bin directory (`$HOME/.local/bin` on macOS/Linux, `%LOCALAPPDATA%\Programs\PrintingPress\bin` on Windows):

```bash
npx -y @mvanhorn/printing-press-library install parentsquare --agent openclaw
```

Restart the OpenClaw session or gateway if the newly installed skill is not visible immediately.

## Use with Claude Desktop

This CLI ships an [MCPB](https://github.com/modelcontextprotocol/mcpb) bundle — Claude Desktop's standard format for one-click MCP extension installs (no JSON config required).

The bundle reuses your local browser session — set it up first if you haven't:

```bash
parentsquare-pp-cli auth login --chrome
```

To install:

1. Download the `.mcpb` for your platform from the [latest release](https://github.com/mvanhorn/printing-press-library/releases/tag/parentsquare-current).
2. Double-click the `.mcpb` file. Claude Desktop opens and walks you through the install.

Requires Claude Desktop 1.0.0 or later. Pre-built bundles ship for macOS Apple Silicon (`darwin-arm64`) and Windows (`amd64`, `arm64`); for other platforms, use the manual config below.

<details>
<summary>Manual JSON config (advanced)</summary>

If you can't use the MCPB bundle (older Claude Desktop, unsupported platform), install the MCP binary and configure it manually.


Install the MCP binary from this CLI's published public-library entry or pre-built release.

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "parentsquare": {
      "command": "parentsquare-pp-mcp"
    }
  }
}
```

</details>

## Quick Start

### 1. Install

See [Install](#install) above.

### 2. Authenticate

This CLI uses your browser session for authentication. Log in to www.parentsquare.com in Chrome, then:

```bash
parentsquare-pp-cli auth login --chrome
```

Requires a cookie extraction tool. Install one:

```bash
pip install pycookiecheat          # Python (recommended)
brew install barnardb/cookies/cookies  # Homebrew
```

When your session expires, run `auth login --chrome` again.

### 3. Verify Setup

```bash
parentsquare-pp-cli doctor
```

This checks your configuration and credentials.

### 4. Try Your First Command

```bash
parentsquare-pp-cli districts get-autocomplete mock-value
```

## Usage

Run `parentsquare-pp-cli --help` for the full command reference and flag list.

## Commands

### districts

Operations on students.json

- **`parentsquare-pp-cli districts get-autocomplete`** - GET /districts/{district_id}/users/autocomplete
- **`parentsquare-pp-cli districts get-class-events`** - GET /districts/{district_id}/class-events
- **`parentsquare-pp-cli districts get-data-health-stats`** - GET /api/v2/districts/{district_id}/data_health_stats
- **`parentsquare-pp-cli districts get-district-events`** - GET /districts/{district_id}/district-events
- **`parentsquare-pp-cli districts get-group-events`** - GET /districts/{district_id}/group-events
- **`parentsquare-pp-cli districts get-school-events`** - GET /districts/{district_id}/school-events
- **`parentsquare-pp-cli districts get-staff.json`** - GET /districts/{district_id}/dashboard/staff.json
- **`parentsquare-pp-cli districts get-students.json`** - GET /districts/{district_id}/dashboard/students.json
- **`parentsquare-pp-cli districts get-sync-info`** - GET /api/v2/districts/{district_id}/sync_info
- **`parentsquare-pp-cli districts get-totals`** - GET /api/v2/districts/{district_id}/totals

### schools

Operations on directory

- **`parentsquare-pp-cli schools get-directory`** - GET /api/v2/schools/{school_id}/directory
- **`parentsquare-pp-cli schools get-report-email-users`** - GET /schools/{school_id}/attendance_settings/report_email_users
- **`parentsquare-pp-cli schools get-school-events`** - GET /schools/{school_id}/school-events

### sections

Operations on students

- **`parentsquare-pp-cli sections get-staff`** - GET /api/v2/sections/{section_id}/staff
- **`parentsquare-pp-cli sections get-students`** - GET /api/v2/sections/{section_id}/students


## Output Formats

```bash
# Human-readable table (default in terminal, JSON when piped)
parentsquare-pp-cli districts get-autocomplete mock-value

# JSON for scripting and agents
parentsquare-pp-cli districts get-autocomplete mock-value --json

# Filter to specific fields
parentsquare-pp-cli districts get-autocomplete mock-value --json --select id,name,status

# Dry run — show the request without sending
parentsquare-pp-cli districts get-autocomplete mock-value --dry-run

# Agent mode — JSON + compact + no prompts in one flag
parentsquare-pp-cli districts get-autocomplete mock-value --agent
```

## Agent Usage

This CLI is designed for AI agent consumption:

- **Non-interactive** - never prompts, every input is a flag
- **Pipeable** - `--json` output to stdout, errors to stderr
- **Filterable** - `--select id,name` returns only fields you need
- **Previewable** - `--dry-run` shows the request without sending
- **Read-only by default** - this CLI does not create, update, delete, publish, send, or mutate remote resources
- **Offline-friendly** - sync/search commands can use the local SQLite store when available
- **Agent-safe by default** - no colors or formatting unless `--human-friendly` is set

Exit codes: `0` success, `2` usage error, `3` not found, `4` auth error, `5` API error, `7` rate limited, `10` config error.

## Health Check

```bash
parentsquare-pp-cli doctor
```

Verifies configuration, credentials, and connectivity to the API.

## Configuration

Config file: `~/.config/parentsquare-pp-cli/config.toml`

Static request headers can be configured under `headers`; per-command header overrides take precedence.

Environment variables:

| Name | Kind | Required | Description |
| --- | --- | --- | --- |
| `PARENTSQUARE_COOKIES` | per_call | Yes | Set to your API credential. |

### agentcookie (optional)

If you use agentcookie to sync secrets across machines, this CLI auto-adopts agentcookie-managed credentials with no extra setup. When the daemon writes to this CLI's config, `parentsquare-pp-cli doctor` reports `agentcookie: detected` and `auth-status` labels the source as `agentcookie`. Skip this section if you don't use agentcookie - the CLI works the same as any other.

## Troubleshooting
**Authentication errors (exit code 4)**
- Run `parentsquare-pp-cli doctor` to check credentials
- Verify the environment variable is set: `echo $PARENTSQUARE_COOKIES`
**Not found errors (exit code 3)**
- Check the resource ID is correct
- Run the `list` command to see available items

## HTTP Transport

This CLI uses Chrome-compatible HTTP transport for browser-facing endpoints. It does not require a resident browser process for normal API calls.

## Discovery Signals

This CLI was generated with browser-captured traffic analysis.
- Target observed: https://www.parentsquare.com/districts/998/dashboard/students.json
- Capture coverage: 15 API entries from 15 total network entries
- Reachability: browser_clearance_http (82% confidence)
- Protocols: rest_json (75% confidence)
- Auth signals: cookie — cookies: REDACTED
- Generation hints: browser_clearance_required, requires_browser_auth
- Candidate command ideas: get_autocomplete — Derived from observed GET /districts/{district_id}/users/autocomplete traffic.; get_class_events — Derived from observed GET /districts/{district_id}/class-events traffic.; get_data_health_stats — Derived from observed GET /api/v2/districts/{district_id}/data_health_stats traffic.; get_directory — Derived from observed GET /api/v2/schools/{school_id}/directory traffic.; get_district_events — Derived from observed GET /districts/{district_id}/district-events traffic.; get_group_events — Derived from observed GET /districts/{district_id}/group-events traffic.; get_report_email_users — Derived from observed GET /schools/{school_id}/attendance_settings/report_email_users traffic.; get_school_events — Derived from observed GET /districts/{district_id}/school-events traffic.

---

Generated by [CLI Printing Press](https://github.com/mvanhorn/cli-printing-press)
