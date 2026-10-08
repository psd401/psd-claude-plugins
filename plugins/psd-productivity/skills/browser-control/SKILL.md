---
name: browser-control
description: "Browser automation for authenticated web apps using the Claude in Chrome extension. Use when navigating PowerSchool, filling forms, downloading reports, or automating any browser task requiring login. Triggers on: browser control, navigate website, PowerSchool, fill form, download report, automate browser."
argument-hint: "[url-or-task]"
model: claude-opus-5-5
effort: high
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - Agent
  - mcp__claude-in-chrome__tabs_context_mcp
  - mcp__claude-in-chrome__tabs_create_mcp
  - mcp__claude-in-chrome__tabs_close_mcp
  - mcp__claude-in-chrome__navigate
  - mcp__claude-in-chrome__javascript_tool
  - mcp__claude-in-chrome__browser_batch
  - mcp__claude-in-chrome__computer
  - mcp__claude-in-chrome__read_page
  - mcp__claude-in-chrome__find
  - mcp__claude-in-chrome__form_input
  - mcp__claude-in-chrome__get_page_text
  - mcp__claude-in-chrome__read_console_messages
  - mcp__claude-in-chrome__read_network_requests
  - mcp__claude-in-chrome__file_upload
  - mcp__claude-in-chrome__resize_window
  - mcp__claude-in-chrome__list_connected_browsers
  - mcp__claude-in-chrome__select_browser
  - mcp__claude-in-chrome__switch_browser
extended-thinking: true
---

# Browser Control — Claude in Chrome

You automate browser interactions for authenticated web applications through the **Claude in Chrome** extension. It acts inside the person's own Google Chrome, in a tab group of its own, with the sign-ins that browser already holds. There is no separate debug browser, no remote-debugging port, and nothing to launch from a script: if Chrome is running with the extension connected, the `mcp__claude-in-chrome__*` tools work.

## Setup (once per machine)

1. Google Chrome (the district-managed install is fine — no special flags).
2. The Claude in Chrome extension, signed in to the same Claude account as the Claude desktop app, and connected (the Claude app shows it under its browser settings; `list_connected_browsers` lists it).
3. The person allows each site the first time the extension touches it (Chrome prompts; the tool call waits or is refused until they do).
4. `chrome://settings/downloads` → "Ask where to save each file before downloading" **off**, so scripted downloads land in `~/Downloads` without a dialog.
5. The person logs into the site themselves, in Chrome. **Automation never types credentials and never retries a login** — a failed attempt is recorded by the target system, and a lockout is the worst available failure.

Full per-machine checklist for the enrollment work: `../enrollment/references/machine-setup.md` (sibling skill).

## Session workflow

1. `tabs_context_mcp` (with `createIfEmpty: true`) — always first; it returns the tab ids this session may use. Never reuse a tab id remembered from another session.
2. Work in the tab the context returned, or `tabs_create_mcp` a fresh one. Close tabs you created (`tabs_close_mcp`) when done, unless the person wants them open.
3. `navigate` to the page; it returns when navigation commits, not necessarily when the page is ready — poll `document.readyState === 'complete'` (and the element you need) in `javascript_tool` before touching the page.
4. Do the work with `javascript_tool`; verify with small JSON results, not screenshots.
5. Batch predictable sequences in one `browser_batch` call (navigate → poll → act → read). The batch stops at the first error, so put the risky step last.

**Tool naming note:** the tools are `mcp__claude-in-chrome__<name>`; inside `browser_batch` they are referenced by bare `<name>` (`navigate`, `javascript_tool`, `computer`, …) and every item needs an explicit `tabId`.

## Tool reference

| Tool | Use |
|------|-----|
| `tabs_context_mcp` / `tabs_create_mcp` / `tabs_close_mcp` | Tab group management — context first, every session |
| `navigate` | Go to a URL, or `back` / `forward` |
| `javascript_tool` | Run JavaScript in the page (the workhorse — see rules below) |
| `browser_batch` | Several tool calls in one round trip, sequential, stop on first error |
| `computer` | Screenshot, click, type, key, scroll, `wait` (≤ 10 s) |
| `read_page` / `find` | Accessibility tree / natural-language element lookup → `ref_N` for `computer` and `form_input` |
| `form_input` | Set a form element by `ref` |
| `get_page_text` | Plain text of the page |
| `read_console_messages` / `read_network_requests` | Debugging (always pass a `pattern` / `urlPattern`) |
| `file_upload` | Upload a local file into a file input |

## `javascript_tool` rules (validated against PowerSchool 2026-10-08)

- **REPL semantics.** The value of the last expression is returned; top-level `await` works; a top-level `return` is a syntax error. Wrap multi-step work in `await (async () => { … return value; })()`.
- **Return small JSON** — `JSON.stringify({...})` with ids, counts, booleans. The extension's output filter replaces any result that looks like a query string, cookie, or URL with parameters (`a=1&b=2`, `?ac=…&id=…`) with `[BLOCKED: Cookie/query string data]`. Return numeric ids and build URLs on your side, or navigate from inside the script, rather than returning hrefs. Never return page text that contains student names.
- **One call must not span a navigation.** A navigation (page reload, form submit, `location.href = …`) inside a call ends it with "Inspected target navigated or closed". Trigger the navigation as the last thing in a call (or in a `setTimeout`), then `computer` `wait` 3–5 s and poll readiness in the next call.
- **Length.** Calls of 40 s have completed; keep polling loops under that and chain calls instead of one long sleep.
- **Downloads.** Two patterns, both land in `~/Downloads` with no prompt once "ask where to save" is off: (a) for content you have in the page or fetched in-page, `new Blob([data])` + `<a download="name.ext">` + `.click()`; (b) for a server-side file, `window.location.href = '<download URL>'` (the tab stays on its page). Chrome asks once per site to allow multiple automatic downloads — the person clicks Allow and it is remembered.
- **Synthetic events.** Setting `.value` or `.checked` does not run a page's handlers. Dispatch `new Event('change', {bubbles: true})` or call the page's own jQuery handlers (`$j('#x').trigger('change')`) — see the enrollment references for the per-page patterns.
- **Same-origin `fetch` works with the page's session** — poll queues and read result pages with `fetch` + `DOMParser` instead of navigating and snapshotting.
- **Context discipline.** No `read_page`, no `get_page_text`, no screenshots inside a loop; they put whole pages into the context window. Extract the few numbers you need.
- **Dialogs.** Never trigger `alert`/`confirm`/`prompt` or click controls that raise a native dialog; a modal blocks the extension until a human dismisses it.

## PowerSchool-specific knowledge

When automating PowerSchool reports, run all browser automation directly in the main session — do not delegate to a subagent (subagents cannot access MCP tools). Key patterns:
1. Verify the correct school is selected (the header picker `school_picker_adminSchoolPicker_toggle_btn`); the school context is session-wide
2. Use the navigation paths and JavaScript snippets in `plugins/psd-productivity/skills/enrollment/references/report-checklist.md`
3. Elementary uses the 1-Day FTE window; Middle/High use the 5-Day window
4. Save reports with consistent naming: `[SchoolAbbr]_[ReportName]_[CountDate]`
5. Rendered report pages are saved as self-contained HTML by the page serializer in the same reference (blob download), then uploaded to Drive; PDFs come only from PowerSchool's own PDF outputs

## Troubleshooting

- **"Claude in Chrome is not connected" / no response** — Chrome is not running, the extension is signed out, or it is disconnected from the app. Say so; do not retry in a loop
- **"Debugger is not attached to the tab"** — the tab was reloaded or closed under you. `tabs_context_mcp` again and re-run once
- **"Inspected target navigated or closed"** — the script spanned a navigation. Split the call (see rules above)
- **"Site not allowed" / the call waits** — the person has to allow the site in Chrome once
- **"Login required" (PowerSchool bounces to `pw.html`)** — the person logs in, in that Chrome window. Never automate it
- **`[BLOCKED: Cookie/query string data]`** — the script returned something URL-like. Return ids/counts instead
- **Page loads slowly** — poll `document.readyState` and the element you need; do not act on a `navigate` result alone
