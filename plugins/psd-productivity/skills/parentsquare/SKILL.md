---
name: parentsquare
description: "Query Peninsula School District's ParentSquare data and draft posts via a self-contained CLI. Pull student/staff rosters, school directories, class lists, calendars, user search, attendance contacts, data-health/sync/totals, and notification-activity stats (per school/staff/recipient, with drill-in); create unsent draft posts (never notifies). Use when: looking up ParentSquare rosters/directories, notification analytics, district data-health, or drafting a ParentSquare post. Triggers on: parentsquare, parent square, district roster, school directory, class roster, notification activity, notification analytics, parentsquare draft, parentsquare data."
argument-hint: "[command] [args...] — e.g. 'schools get-directory 11671', 'notification-activity 998 --section school-usage'"
model: claude-opus-5
effort: high
extended-thinking: true
allowed-tools:
  - Bash
  - Read
paths:
  - scripts/
  - cli/
---

# ParentSquare CLI

A self-contained CLI for ParentSquare district/school data, generated with Printing Press from the live ParentSquare web app and hand-extended for PSD. **Read-focused** (rosters, directories, calendars, notification analytics); the only write is `create-draft`, which can **only** create an unsent draft.

> Built for Peninsula School District (district `998`), but every command takes a district/school/section ID, so it works for any district the authenticated account can access.

## Setup (one-time)

### 1. Resolve the binary

The binary is **not** committed to the repo. Resolve it once — this downloads the prebuilt binary for your platform from the repo's GitHub Release (or builds it from `cli/` if you have Go and no network):

```bash
BIN="$(bash scripts/ensure-binary.sh)"   # run from this skill's directory
"$BIN" --version
```

Use `"$BIN"` for every command below. It caches under `~/.cache/parentsquare-pp-cli/`, so this is a one-time cost.

### 2. Authenticate (Chrome cookie)

Auth is a ParentSquare **session cookie** read from Chrome. Install the cookie extractor once, then log in:

```bash
uv tool install pycookiecheat          # one-time; the CLI shells out to it
# Be logged into www.parentsquare.com in Chrome, then:
"$BIN" auth login --chrome              # approve the macOS Keychain prompt if shown
"$BIN" auth status                      # should print "Authenticated"
```

Re-run `auth login --chrome` if the session expires.

## Global flags

Every command supports `--json`, `--csv`, `--compact`, `--agent` (all agent-friendly defaults), `--dry-run`, and `--select <fields>`. Framework commands `sync` (mirror to local SQLite), `search`, and `analytics` are also available.

## Read commands

### District (`districts <cmd> <district_id>`, PSD = 998)

| Command | Returns |
|---------|---------|
| `get-students.json 998` | District student roster |
| `get-staff.json 998` | District staff roster |
| `get-autocomplete 998 --query smith` | User search |
| `get-district-events 998` / `get-school-events` / `get-group-events` / `get-class-events` | Calendars |
| `get-data-health-stats 998` | Data-quality stats |
| `get-sync-info 998` | SIS sync detail |
| `get-totals 998` | District counts (students/staff/parents/sections) |

### School (`schools <cmd> <school_id>`)

| Command | Returns |
|---------|---------|
| `get-directory 11671` | School directory |
| `get-report-email-users 11671` | Attendance report contacts |
| `get-school-events 11671` | School calendar |

### Section / class (`sections <cmd> <section_id>`)

| Command | Returns |
|---------|---------|
| `get-students 35204961` | Class roster |
| `get-staff 35204961` | Class staff |

### Notification activity

ParentSquare's Notifications Activity report (per-school / per-staff / per-recipient message counts), with district→school drill-in:

```bash
"$BIN" notification-activity 998 --section school-usage --json     # per-school: posts, DMs, alerts, auto-notices, secure docs
"$BIN" notification-activity 998 --section staff-usage             # per-staff authoring
"$BIN" notification-activity 998 --section recipients              # per-recipient reach (app/email/text/voice)
"$BIN" notification-activity 12078 --scope school --section staff-usage   # drill into one school
# filters: --resource posts|direct-messages|alerts|auto-notices|secure-documents  --start-date YYYY-MM-DD  --end-date YYYY-MM-DD
```

## Write command (drafts only)

`create-draft` creates an **unsent** draft post. It hard-forces `publish_option=DRAFT` and zeroes all recipient includes, so it **cannot notify anyone** — the draft sits in ParentSquare → Drafts for a human to review and post. There is intentionally no "send" path. **Dry-run by default**; pass `--confirm` to actually create the draft.

```bash
"$BIN" create-draft 998 --subject "Photo day" --message "<p>Friday is photo day.</p>"            # dry-run preview
"$BIN" create-draft 998 --subject "Photo day" --message "<p>Friday is photo day.</p>" --confirm   # creates the draft
```

## Notes

- **Read-only by design** apart from `create-draft`. The CLI never sends notifications.
- Notification activity, sync history, and analytics are scraped from server-rendered HTML (ParentSquare exposes no JSON API for them); other commands hit real JSON endpoints.
- IDs in the tables above are PSD examples (district 998, Artondale 11671, Swift Water 12078, a sample section). Find school/section IDs via `get-directory`, the events listings, or the ParentSquare URL bar.
- Auth uses your own Chrome session; nothing is uploaded anywhere. Captured data stays local.
