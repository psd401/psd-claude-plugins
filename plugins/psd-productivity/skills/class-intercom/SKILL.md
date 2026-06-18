---
name: class-intercom
description: "Query Peninsula School District's Class Intercom data and draft social posts via a self-contained CLI. Pull the content/activity feed, social channels, the social feed, libraries, moderation queue, reports, tasks, holidays, and filter configs; create unsent draft posts (never publishes or schedules). Use when: looking up Class Intercom content/activities, social channels, the moderation queue, reports/tasks, or drafting a Class Intercom social post. Triggers on: class intercom, classintercom, social channels, social feed, content feed, moderation queue, class intercom draft, classintercom draft, draft social post."
argument-hint: "[command] [args...] — e.g. 'channels', 'content list-content', 'create-draft --channel <uuid> --message \"...\"'"
model: claude-opus-4-8
effort: high
extended-thinking: true
allowed-tools:
  - Bash
  - Read
paths:
  - scripts/
  - cli/
---

# Class Intercom CLI

A self-contained CLI for Peninsula School District's Class Intercom (social media / school comms platform), generated with Printing Press from the live web app and hand-extended for PSD. **Read-focused** (content feed, channels, social feed, moderation, reports, tasks); the only write is `create-draft`, which can **only** create an unsent draft.

> Built for PSD's Class Intercom workspace. Auth is your own browser session, so it works for whatever the authenticated account can access.

## Setup (one-time)

### 1. Resolve the binary

The binary is **not** committed to the repo. Resolve it once — this downloads the prebuilt binary for your platform from the repo's GitHub Release (or builds it from `cli/` if you have Go and no network):

```bash
BIN="$(bash scripts/ensure-binary.sh)"   # run from this skill's directory
"$BIN" --version
```

Use `"$BIN"` for every command below. It caches under `~/.cache/classintercom-pp-cli/`, so this is a one-time cost.

### 2. Authenticate (Chrome cookie)

Auth is a Class Intercom **session cookie** read from Chrome. Install the cookie extractor once, then log in:

```bash
uv tool install pycookiecheat          # one-time; the CLI shells out to it
# Be logged into app.classintercom.com in Chrome, then:
"$BIN" auth login --chrome              # approve the macOS Keychain prompt if shown
"$BIN" auth status                      # should print "Authenticated"
```

Re-run `auth login --chrome` if the session expires.

## Global flags

Every command supports `--json`, `--csv`, `--compact`, `--agent` (all agent-friendly defaults), `--dry-run`, and `--select <fields>`. Framework commands `sync` (mirror to local SQLite), `search`, and `api` (browse all endpoints) are also available.

## Read commands

### Channels

```bash
"$BIN" channels --json          # social channels with their UUIDs (value), network, label
```
The `value` field is the channel UUID you pass to `create-draft --channel`.

### Content / activities (`content <cmd>`)

| Command | Returns |
|---------|---------|
| `content list-content` | Content/activity feed (posts, drafts, scheduled) with pagination |
| `content list-tasks` | Content tasks |
| `content list-failed-count` | Count of failed content |
| `content list-holidays --date-start 2026-01-01 --date-end 2026-12-31` | Holidays in a date range (**both dates required** — the endpoint 500s without them) |
| `content list-filters-config` | Available content filters |

### Social, libraries, moderation, reports, tasks

| Command | Returns |
|---------|---------|
| `social list-feed` | Social feed |
| `libraries list-libraries` | Content libraries |
| `moderation list-moderation` | Moderation queue |
| `reports list-reports` | Reports |
| `tasks list-tasks` | Tasks |
| `tasks list-assignables` | Users/roles a task can be assigned to |
| `binder` | Binder filter config |

Each resource also has a `list-filters-config` subcommand describing its available filters.

## Write command (drafts only)

`create-draft` creates an **unsent** draft social post. It hard-forces `state="save_draft"` (never `publish` or `schedule`), so it **cannot post or notify anyone** — the draft sits in Class Intercom for a human to review and post. There is intentionally no "publish" path. **Dry-run by default**; pass `--confirm` to actually create the draft.

```bash
# get a channel UUID first
"$BIN" channels --json
# dry-run preview (prints the exact POST body, creates nothing):
"$BIN" create-draft --channel 4d53b616-... --message "Photo day is Friday!"
# create the draft:
"$BIN" create-draft --channel 4d53b616-... --message "Photo day is Friday!" --confirm
# multiple channels: repeat --channel
"$BIN" create-draft --channel 4d53b616-... --channel fc90e4d4-... --message "Go Seahawks!" --confirm
```

On success it returns `{success, activity_id, state:"draft"}`. The command:
- generates a fresh `assignment_id` (v4 UUID) per draft, the way the composer does;
- fetches the Rails CSRF token from an app page and sends it as `X-CSRF-Token` (required for the write);
- posts to `/api/compose-v2/submit_new` with `state=save_draft`.

## Notes

- **Read-only by design** apart from `create-draft`. The CLI never posts or schedules.
- `create-draft` requires at least one `--channel` (a UUID from `channels`) and a `--message`.
- `content list-holidays` requires `--date-start` and `--date-end`; without them the server returns 500.
- Auth uses your own Chrome session; nothing is uploaded anywhere. Captured data stays local.
