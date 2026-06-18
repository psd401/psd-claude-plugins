# Classintercom CLI

Discovered API spec for classintercom

Learn more at [Classintercom](https://app.classintercom.com).

Created by [@krishagel](https://github.com/krishagel) (Kris Hagel).

## Install

The recommended path installs both the `classintercom-pp-cli` binary and the `pp-classintercom` agent skill (Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, and other agents supported by the upstream [`skills`](https://github.com/vercel-labs/skills) CLI) in one shot:

```bash
npx -y @mvanhorn/printing-press-library install classintercom
```

For CLI only (no skill):

```bash
npx -y @mvanhorn/printing-press-library install classintercom --cli-only
```

For skill only — installs the skill into the same agents as the default command above, but skips the CLI binary (use this to update or reinstall just the skill):

```bash
npx -y @mvanhorn/printing-press-library install classintercom --skill-only
```

To constrain the skill install to one or more specific agents (repeatable — agent names match the [`skills`](https://github.com/vercel-labs/skills) CLI):

```bash
npx -y @mvanhorn/printing-press-library install classintercom --agent claude-code
npx -y @mvanhorn/printing-press-library install classintercom --agent claude-code --agent codex
```

### Without Node

The generated install path is category-agnostic until this CLI is published. If `npx` is not available before publish, install Node or use the category-specific Go fallback from the public-library entry after publish.

### Pre-built binary

Download a pre-built binary for your platform from the [latest release](https://github.com/mvanhorn/printing-press-library/releases/tag/classintercom-current). On macOS, clear the Gatekeeper quarantine: `xattr -d com.apple.quarantine <binary>`. On Unix, mark it executable: `chmod +x <binary>`.

<!-- pp-hermes-install-anchor -->
## Install for Hermes

Install the CLI binary first. The installer writes binaries to a per-user managed bin directory by default: `$HOME/.local/bin` on macOS/Linux and `%LOCALAPPDATA%\Programs\PrintingPress\bin` on Windows.

```bash
npx -y @mvanhorn/printing-press-library install classintercom --cli-only
```

Then install the focused Hermes skill.

From the Hermes CLI:

```bash
hermes skills install mvanhorn/printing-press-library/cli-skills/pp-classintercom --force
```

Inside a Hermes chat session:

```bash
/skills install mvanhorn/printing-press-library/cli-skills/pp-classintercom --force
```

Restart the Hermes session or gateway if the newly installed skill is not visible immediately.

## Install for OpenClaw
Install both the CLI binary and the focused OpenClaw skill. The installer defaults binaries to a per-user bin directory (`$HOME/.local/bin` on macOS/Linux, `%LOCALAPPDATA%\Programs\PrintingPress\bin` on Windows):

```bash
npx -y @mvanhorn/printing-press-library install classintercom --agent openclaw
```

Restart the OpenClaw session or gateway if the newly installed skill is not visible immediately.

## Use with Claude Desktop

This CLI ships an [MCPB](https://github.com/modelcontextprotocol/mcpb) bundle — Claude Desktop's standard format for one-click MCP extension installs (no JSON config required).

The bundle reuses your local browser session — set it up first if you haven't:

```bash
classintercom-pp-cli auth login --chrome
```

To install:

1. Download the `.mcpb` for your platform from the [latest release](https://github.com/mvanhorn/printing-press-library/releases/tag/classintercom-current).
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
    "classintercom": {
      "command": "classintercom-pp-mcp"
    }
  }
}
```

</details>

## Quick Start

### 1. Install

See [Install](#install) above.

### 2. Authenticate

This CLI uses your browser session for authentication. Log in to app.classintercom.com in Chrome, then:

```bash
classintercom-pp-cli auth login --chrome
```

Requires a cookie extraction tool. Install one:

```bash
pip install pycookiecheat          # Python (recommended)
brew install barnardb/cookies/cookies  # Homebrew
```

When your session expires, run `auth login --chrome` again.

### 3. Verify Setup

```bash
classintercom-pp-cli doctor
```

This checks your configuration and credentials.

### 4. Try Your First Command

```bash
classintercom-pp-cli binder
```

## Usage

Run `classintercom-pp-cli --help` for the full command reference and flag list.

## Commands

### binder

Operations on filters_config

- **`classintercom-pp-cli binder`** - GET /api/binder/filters_config

### channels

Operations on channels

- **`classintercom-pp-cli channels`** - GET /api/channels

### content

Operations on holidays

- **`classintercom-pp-cli content list-content`** - GET /api/content
- **`classintercom-pp-cli content list-failed-count`** - GET /api/content/failed_count
- **`classintercom-pp-cli content list-filters-config`** - GET /api/content/filters_config
- **`classintercom-pp-cli content list-holidays`** - GET /api/content/holidays
- **`classintercom-pp-cli content list-tasks`** - GET /api/content/tasks

### libraries

Operations on filters_config

- **`classintercom-pp-cli libraries list-filters-config`** - GET /api/libraries/filters_config
- **`classintercom-pp-cli libraries list-libraries`** - GET /api/libraries

### moderation

Operations on moderation

- **`classintercom-pp-cli moderation list-filters-config`** - GET /api/moderation/filters_config
- **`classintercom-pp-cli moderation list-moderation`** - GET /api/moderation

### reports

Operations on reports

- **`classintercom-pp-cli reports list-filters-config`** - GET /api/reports/filters_config
- **`classintercom-pp-cli reports list-reports`** - GET /api/reports

### social

Operations on filters_config

- **`classintercom-pp-cli social list-feed`** - GET /api/social/feed
- **`classintercom-pp-cli social list-filters-config`** - GET /api/social/filters_config

### tasks

Operations on assignables

- **`classintercom-pp-cli tasks list-assignables`** - GET /api/tasks/assignables
- **`classintercom-pp-cli tasks list-filters-config`** - GET /api/tasks/filters_config
- **`classintercom-pp-cli tasks list-tasks`** - GET /api/tasks


## Output Formats

```bash
# Human-readable table (default in terminal, JSON when piped)
classintercom-pp-cli binder

# JSON for scripting and agents
classintercom-pp-cli binder --json

# Filter to specific fields
classintercom-pp-cli binder --json --select id,name,status

# Dry run — show the request without sending
classintercom-pp-cli binder --dry-run

# Agent mode — JSON + compact + no prompts in one flag
classintercom-pp-cli binder --agent
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
classintercom-pp-cli doctor
```

Verifies configuration, credentials, and connectivity to the API.

## Configuration

Config file: `~/.config/classintercom-pp-cli/config.toml`

Static request headers can be configured under `headers`; per-command header overrides take precedence.

Environment variables:

| Name | Kind | Required | Description |
| --- | --- | --- | --- |
| `CLASSINTERCOM_COOKIES` | per_call | Yes | Set to your API credential. |

### agentcookie (optional)

If you use agentcookie to sync secrets across machines, this CLI auto-adopts agentcookie-managed credentials with no extra setup. When the daemon writes to this CLI's config, `classintercom-pp-cli doctor` reports `agentcookie: detected` and `auth-status` labels the source as `agentcookie`. Skip this section if you don't use agentcookie - the CLI works the same as any other.

## Troubleshooting
**Authentication errors (exit code 4)**
- Run `classintercom-pp-cli doctor` to check credentials
- Verify the environment variable is set: `echo $CLASSINTERCOM_COOKIES`
**Not found errors (exit code 3)**
- Check the resource ID is correct
- Run the `list` command to see available items

## HTTP Transport

This CLI uses Chrome-compatible HTTP transport for browser-facing endpoints. It does not require a resident browser process for normal API calls.

## Discovery Signals

This CLI was generated with browser-captured traffic analysis.
- Target observed: https://app.classintercom.com/api/channels
- Capture coverage: 18 API entries from 18 total network entries
- Reachability: browser_clearance_http (82% confidence)
- Protocols: rest_json (75% confidence)
- Auth signals: cookie — cookies: REDACTED
- Generation hints: browser_clearance_required, requires_browser_auth
- Candidate command ideas: list_assignables — Derived from observed GET /api/tasks/assignables traffic.; list_channels — Derived from observed GET /api/channels traffic.; list_content — Derived from observed GET /api/content traffic.; list_failed_count — Derived from observed GET /api/content/failed_count traffic.; list_feed — Derived from observed GET /api/social/feed traffic.; list_filters_config — Derived from observed GET /api/binder/filters_config traffic.; list_holidays — Derived from observed GET /api/content/holidays traffic.; list_libraries — Derived from observed GET /api/libraries traffic.

---

Generated by [CLI Printing Press](https://github.com/mvanhorn/cli-printing-press)
