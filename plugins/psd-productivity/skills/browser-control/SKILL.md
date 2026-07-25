---
name: browser-control
description: "Browser automation for authenticated web apps using Chrome DevTools MCP. Use when navigating PowerSchool, filling forms, downloading reports, or automating any browser task requiring login. Triggers on: browser control, navigate website, PowerSchool, fill form, download report, automate browser."
argument-hint: "[url-or-task]"
model: claude-opus-5
effort: high
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
  - Agent
  - mcp__chrome-devtools__navigate_page
  - mcp__chrome-devtools__click
  - mcp__chrome-devtools__click_at
  - mcp__chrome-devtools__hover
  - mcp__chrome-devtools__fill
  - mcp__chrome-devtools__type_text
  - mcp__chrome-devtools__fill_form
  - mcp__chrome-devtools__press_key
  - mcp__chrome-devtools__upload_file
  - mcp__chrome-devtools__drag
  - mcp__chrome-devtools__take_screenshot
  - mcp__chrome-devtools__take_snapshot
  - mcp__chrome-devtools__wait_for
  - mcp__chrome-devtools__evaluate_script
  - mcp__chrome-devtools__list_console_messages
  - mcp__chrome-devtools__get_console_message
  - mcp__chrome-devtools__list_network_requests
  - mcp__chrome-devtools__get_network_request
  - mcp__chrome-devtools__list_pages
  - mcp__chrome-devtools__select_page
  - mcp__chrome-devtools__close_page
  - mcp__chrome-devtools__new_page
  - mcp__chrome-devtools__resize_page
  - mcp__chrome-devtools__handle_dialog
  - mcp__chrome-devtools__get_tab_id
extended-thinking: true
---

# Browser Control — Chrome DevTools MCP

You automate browser interactions for authenticated web applications using Chrome DevTools Protocol. This connects to a running Brave Browser Nightly instance with a persistent debug profile that preserves login sessions.

## Setup — Launch Browser

Before any browser interaction, ensure the debug browser is running:

```bash
bash plugins/psd-productivity/skills/browser-control/scripts/launch-chrome.sh
```

If the script reports `already_running`, the browser is ready. If `started`, wait a moment for it to initialize.

**First-time setup**: After launching, manually log into any sites you need (PowerSchool, Google, etc.). The persistent profile at `~/.psd-browser-automation` saves cookies and sessions across restarts.

## Core Workflow

1. **Check browser status** — run launch script with `--status`
2. **Launch if needed** — run launch script (no args for visible window)
3. **Navigate** — use `navigate_page` to go to URLs
4. **Interact** — use `click`, `fill`, `fill_form`, `type_text`, `press_key`
5. **Verify** — use `take_screenshot` or `take_snapshot` to confirm state
6. **Wait** — use `wait_for` when pages are loading or processing

## Tool Reference

### Navigation & Pages
- `navigate_page` — go to a URL
- `list_pages` — list open tabs
- `select_page` — switch to a tab
- `new_page` — open new tab
- `close_page` — close a tab
- `resize_page` — change viewport size
- `handle_dialog` — accept/dismiss browser dialogs
- `get_tab_id` — get current tab identifier

### Input
- `click` — click an element by CSS selector or text
- `click_at` — click at x,y coordinates
- `hover` — hover over an element
- `fill` — fill an input field (clears first)
- `type_text` — type text character by character
- `fill_form` — fill multiple form fields at once
- `press_key` — press keyboard keys (Enter, Tab, Escape, etc.)
- `upload_file` — upload a file to a file input
- `drag` — drag from one element to another

### Observation
- `take_screenshot` — capture visible page as image
- `take_snapshot` — get accessibility tree (structured page content)
- `wait_for` — wait for an element, text, or network idle
- `evaluate_script` — run JavaScript in the page context

### Console & Network
- `list_console_messages` — view browser console output
- `get_console_message` — get details of a console message
- `list_network_requests` — view network activity
- `get_network_request` — get details of a network request

## Best Practices

1. **Always take_snapshot first** — before clicking or filling, get the page structure to identify correct selectors
2. **Use wait_for after navigation** — pages may not be fully loaded immediately
3. **Handle dialogs proactively** — PowerSchool shows confirm dialogs; use `handle_dialog` to accept/dismiss
4. **Use fill_form for multiple fields** — more efficient than individual fill calls
5. **Screenshot for verification** — take screenshots after important actions to confirm success
6. **Check for errors** — use `list_console_messages` if something seems wrong

## PowerSchool-Specific Knowledge

When automating PowerSchool reports, run all browser automation directly in the main session — do not delegate to a subagent (subagents cannot access MCP tools). Key patterns:
1. Verify the correct school is selected (top banner)
2. Use the navigation paths from `plugins/psd-productivity/skills/enrollment/references/`
3. Elementary uses 1-Day FTE window; Middle/High use 5-Day window
4. Save reports with consistent naming: `[SchoolAbbr]_[ReportName]_[CountDate]`

## Troubleshooting

- **"Browser not running"** — Run the launch script
- **"Connection refused on 9222"** — Browser crashed; kill orphan processes and relaunch
- **"Login required"** — Open the browser window, log in manually, then retry
- **"Element not found"** — Take a snapshot to see current page structure, adjust selector
- **Page loads slowly** — Use `wait_for` with appropriate timeout before interacting
