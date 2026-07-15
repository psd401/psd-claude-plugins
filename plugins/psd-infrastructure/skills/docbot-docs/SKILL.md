---
name: docbot-docs
description: Audit and maintain PSD's BookStack documentation and Freshservice knowledge base articles for broken links, outdated content, security exposures, and accessibility issues, and manage the propose/approve/apply change workflow for fixes; use when auditing docs, fixing a stale or broken KB article, or reviewing a proposed documentation change.
triggers:
  - "audit our documentation"
  - "check bookstack for broken links"
  - "audit the freshservice kb"
  - "find outdated docs"
  - "propose a fix for this page"
  - "what changes are pending review"
  - "approve this doc change"
  - "show audit trends"
  - "check page health"
  - "docbot"
allowed-tools: Read, Bash
version: 0.1.0
---

# DocBot Docs Skill

## What this covers

The `docbot` MCP server audits BookStack documentation and Freshservice Solutions KB articles using 13 parallel checkers (broken links, outdated content, accessibility, security, SEO, spelling, and more), and tracks issues over time in a local SQLite database with fingerprint-based deduplication. Fixes to BookStack pages go through a propose → approve → apply workflow so nothing is written without review; Freshservice audits are read-only through this server today. It can also capture and embed page screenshots, and spot-check version/product claims against live search results.

## Available tools

### Audit — BookStack
| Tool | Purpose |
|---|---|
| `docbot_audit_all` | Audit every BookStack page across all books |
| `docbot_audit_book` | Audit all pages in one book |
| `docbot_audit_page` | Audit a single page in detail |

### Audit — Freshservice
| Tool | Purpose |
|---|---|
| `docbot_fs_audit_all` | Audit every Freshservice solution article |
| `docbot_fs_audit_category` | Audit all articles in a Freshservice category |
| `docbot_fs_audit_folder` | Audit all articles in a Freshservice folder |
| `docbot_fs_audit_article` | Audit one Freshservice article in detail |

### Browse & search
| Tool | Purpose |
|---|---|
| `docbot_search` | Search BookStack documentation by query |
| `docbot_get_page` | Retrieve a BookStack page (HTML or Markdown) |
| `docbot_get_page_markdown` | Retrieve a page as clean Markdown — use this before proposing a change |
| `docbot_list_books` | List all BookStack books |
| `docbot_fs_search` | Search Freshservice solutions by query |
| `docbot_fs_get_article` | Retrieve a Freshservice article's content |
| `docbot_fs_list_categories` | List Freshservice solution categories and folders |

### Change workflow (BookStack only)
| Tool | Purpose |
|---|---|
| `docbot_propose_change` | Submit a proposed change (original + proposed Markdown, issue types, explanation, sources) for review |
| `docbot_list_pending_changes` | List proposed changes, filterable by status |
| `docbot_get_change` | View a proposed change's full diff and details |
| `docbot_approve_change` | Manually approve a proposed change |
| `docbot_reject_change` | Reject a proposed change with a reason |
| `docbot_apply_change` | Push an approved change to BookStack |

### Screenshots
| Tool | Purpose |
|---|---|
| `docbot_capture_screenshot` | Capture a screenshot of a web page via headless Chromium |
| `docbot_embed_screenshot` | Capture a screenshot and embed it in a BookStack page |

### Validation
| Tool | Purpose |
|---|---|
| `docbot_check_validity` | Check a page's version/product references against live search results |
| `docbot_validate_term` | Check whether a specific term, version, or product is outdated |

### History & health
| Tool | Purpose |
|---|---|
| `docbot_issue_history` | View issue history across audit runs, filterable by page or type |
| `docbot_dismiss_issue` | Mark an issue as a false positive (by fingerprint) |
| `docbot_undismiss_issue` | Remove a dismissal so the issue reappears in future audits |
| `docbot_list_dismissed` | List all currently dismissed issues |
| `docbot_audit_trends` | Show audit run and issue trends over time |
| `docbot_page_health` | Show open/resolved issue summary for a page or all pages |

## Common workflows

1. **Audit a book and fix a broken link.** `docbot_audit_book` to find issues → `docbot_get_page_markdown` to pull the exact current content → `docbot_propose_change` with the original and proposed Markdown, issue types, explanation, and sources → `docbot_approve_change` → `docbot_apply_change` to push the fix to BookStack.

2. **Full documentation health sweep.** `docbot_audit_all` for a baseline → `docbot_audit_trends` to see whether issue counts are climbing or shrinking → `docbot_page_health` on any page that keeps resurfacing to see its open/resolved history.

3. **Clean up a Freshservice KB category.** `docbot_fs_list_categories` to see categories and folders → `docbot_fs_audit_category` (or `docbot_fs_audit_folder` for a narrower scope) → `docbot_fs_get_article` to pull the flagged article's content for hand-editing in Freshservice.

4. **Review pending changes before they ship.** `docbot_list_pending_changes` with `status: "pending"` → `docbot_get_change` on each to read the full diff, sources, and confidence score → `docbot_approve_change` or `docbot_reject_change` with a reason.

5. **Suppress a known false positive.** `docbot_issue_history` to find the issue's fingerprint → `docbot_dismiss_issue` with a reason → `docbot_undismiss_issue` later if the content changes and the issue should be re-flagged; `docbot_list_dismissed` shows what's currently suppressed.

## Pitfalls & limits

- The propose → approve → apply workflow only writes to BookStack. Freshservice audits (`docbot_fs_audit_*`) are read-only through this server — fix flagged KB articles by hand in Freshservice.
- `docbot_apply_change` conflict-checks the live page against the original Markdown the change was proposed against; if someone else edited the page in the meantime it returns a conflict instead of applying. Only pass `force: true` after confirming the newer content is safe to overwrite.
- `docbot_approve_change` is a manual override, not a second opinion — it bypasses automated review. Read the diff with `docbot_get_change` before approving.
- `docbot_dismiss_issue` and `docbot_undismiss_issue` key off an issue's fingerprint, not a numeric ID — get the fingerprint from `docbot_issue_history` or an audit report first.
- `docbot_audit_all` walks every book and can take a while on a large doc set; scope to `docbot_audit_book` or `docbot_audit_page` when you already know where the problem is.
- `docbot_check_validity` / `docbot_validate_term` need web search credentials configured and are disabled by default — they'll say so plainly if not set up.
- `docbot_capture_screenshot` / `docbot_embed_screenshot` only accept HTTP/HTTPS URLs and need headless Chromium available on the machine running the server.
- DocBot's local SQLite database is created automatically on first run under each user's own copy of the server — audit history, dismissals, and trends are local to whoever ran the audit unless the database path is pointed at a shared location.

## Setup

See `../../SECRETS-SETUP.md` for credential setup. This server needs `BOOKSTACK_URL`, `BOOKSTACK_TOKEN_ID`, `BOOKSTACK_TOKEN_SECRET` (required); Freshservice tools additionally need `FRESHSERVICE_DOMAIN`, `FRESHSERVICE_API_KEY`; `GEMINI_API_KEY` and web-search credentials enable optional AI-assisted and validity-check features.
