---
name: freshservice-tickets
description: Read, triage, and act on Freshservice tickets via the freshservice MCP server — ticket lookup, replies/notes/closing, requester history, similar-ticket search, and KB articles; use for individual ticket work, not team-wide reporting.
triggers:
  - "look up ticket 12345"
  - "what's the context on this ticket"
  - "find similar tickets"
  - "requester history for this person"
  - "sync the ticket cache"
  - "reply to this ticket"
  - "close this ticket"
  - "search the knowledge base for"
  - "what's on my freshservice queue"
  - "who else has hit this issue before"
allowed-tools: Read, Bash
version: 0.1.0
---

# Freshservice Tickets Skill

## What this covers

The `freshservice` MCP server talks to Freshservice for individual ticket work: reading and acting on tickets, checking your queue, and searching a local ticket cache for requester history and similar past tickets. psd-productivity ships a separate `freshservice-manager` skill that calls the Freshservice REST API through bash scripts for team-wide reporting (daily/weekly summaries, approvals, agent lookups across workspaces). This skill covers the MCP server's tools instead — they're richer for single-ticket triage (`freshservice_get_ticket_context`, `freshservice_find_similar_tickets`, `freshservice_requester_history`, `freshservice_sync_cache`). When both plugins are installed, prefer these MCP tools for ticket-level work and reach for `freshservice-manager` for cross-workspace reporting.

## Available tools

### Your queue & watchlist
| Tool | Purpose |
|---|---|
| `freshservice_my_tickets` | List tickets assigned to you, optionally filtered by status (open/pending/resolved/closed) |
| `freshservice_my_watchlist` | List tickets where you're mentioned in a private note but not the assigned agent |

### Ticket detail & history
| Tool | Purpose |
|---|---|
| `freshservice_get_ticket` | Fetch a ticket by ID with its full conversation thread and inline images |
| `freshservice_get_ticket_activities` | Get a ticket's activity log — status changes, assignments, and other events |

### Ticket actions (mutating)
| Tool | Purpose |
|---|---|
| `freshservice_create_ticket` | Create a new ticket (subject, description, requester email, optional priority/status/category) |
| `freshservice_update_ticket` | Update status, priority, assigned agent, group, or category on an existing ticket |
| `freshservice_reply_to_ticket` | Send a public reply to the requester |
| `freshservice_add_note` | Add a note to a ticket (private by default) |
| `freshservice_close_ticket` | Resolve a ticket and add a resolution note in one call |

### Context & search (backed by the local ticket cache)
| Tool | Purpose |
|---|---|
| `freshservice_get_ticket_context` | One-shot bundle for a ticket ID: current ticket, requester profile, requester's ticket history, and similar past tickets |
| `freshservice_find_similar_tickets` | Search the local cache by keyword for tickets similar to a query |
| `freshservice_requester_history` | Get a requester's recent ticket history by email |
| `freshservice_sync_cache` | Trigger an incremental sync of the local ticket cache from Freshservice |

### Knowledge base
| Tool | Purpose |
|---|---|
| `freshservice_search_articles` | Search Freshservice knowledge base articles by keyword |
| `freshservice_get_article` | Retrieve a specific KB article by ID |

## Common workflows

1. **Triage an incoming ticket.** `freshservice_get_ticket_context` with the ticket ID to see the ticket, requester profile, their ticket history, and similar resolved tickets in one call → if a similar ticket shows a known fix, `freshservice_reply_to_ticket` or `freshservice_add_note` → `freshservice_close_ticket` to resolve with a note.

2. **Check your queue at the start of a shift.** `freshservice_my_tickets` (filtered to `open`) for your active tickets → `freshservice_my_watchlist` for tickets you're mentioned in but not assigned → `freshservice_get_ticket` on any that need a full read.

3. **Chase down a recurring issue.** `freshservice_find_similar_tickets` with keywords from the current ticket → `freshservice_get_ticket` on the closest matches to read the full resolution → `freshservice_reply_to_ticket` or `freshservice_add_note` referencing the known fix.

4. **Research a requester before responding.** `freshservice_requester_history` with their email to see recent tickets → `freshservice_get_ticket_activities` on a specific past ticket if you need the exact timeline of what changed and when.

5. **Check the knowledge base before opening a new ticket.** `freshservice_search_articles` with the topic → `freshservice_get_article` on the best match → if nothing resolves it, `freshservice_create_ticket`.

Run `freshservice_sync_cache` when cache-backed results look stale — e.g., `freshservice_find_similar_tickets` is missing a ticket you know exists, or a just-created ticket doesn't show up in `freshservice_my_watchlist`.

## Pitfalls & limits

- `freshservice_sync_cache` only refreshes ticket metadata (status, priority, subject, resolution notes). It does not backfill conversation text for new tickets — that happens once in the background when the MCP server starts. If a cache-backed result is missing a "last agent reply" line, that's why; re-running `freshservice_sync_cache` won't fix it.
- `freshservice_find_similar_tickets` and the similar-tickets section of `freshservice_get_ticket_context` only search the local cache, never live Freshservice — a ticket created moments ago won't appear until a sync (and, for its conversation text, the background backfill) has caught up.
- `freshservice_get_ticket_context` has an internal ~30-second budget across its sub-lookups. If it runs long, it returns what it has with `[PARTIAL RESULT]` appended rather than hanging.
- `freshservice_create_ticket`, `freshservice_update_ticket`, `freshservice_reply_to_ticket`, and `freshservice_add_note` write to Freshservice immediately — there's no built-in confirmation step, so confirm details before calling them.
- `freshservice_close_ticket` sets status to Resolved and adds the resolution note as two separate calls. If the note fails after the status update succeeds, the tool still reports both outcomes — read the returned text rather than assuming both succeeded.
- `freshservice_reply_to_ticket` and `freshservice_add_note` convert plain text to HTML (newlines become `<br>`). Don't pass pre-formatted HTML — it will be escaped, not rendered.
- `freshservice_my_tickets` and `freshservice_my_watchlist` are scoped to the agent identity the server authenticated as (`FRESHSERVICE_AGENT_EMAIL`), not necessarily the person driving the session — check who that account is if results look off.
- Right after the MCP server starts, cache-backed tools (`freshservice_my_watchlist`, `freshservice_find_similar_tickets`, the history/similar sections of `freshservice_get_ticket_context`) may return sparse or empty results until the initial background sync finishes.

## Setup

See `../../SECRETS-SETUP.md` for credential setup. This server needs `FRESHSERVICE_API_KEY`, `FRESHSERVICE_DOMAIN`, and `FRESHSERVICE_AGENT_EMAIL`.
