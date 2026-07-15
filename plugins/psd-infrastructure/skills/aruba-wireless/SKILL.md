---
name: aruba-wireless
description: Query the Aruba wireless Mobility Conductor for AP status, connected clients, running config, system logs, and wireless configuration objects (SSID/VAP/AP-group/role) for read-only network troubleshooting; use when an AP is down, a user can't connect to wifi, or you need to review wireless configuration.
triggers:
  - "check aruba"
  - "AP is down"
  - "wireless AP offline"
  - "check wifi clients"
  - "who's connected to this SSID"
  - "check wireless config"
  - "aruba controller status"
  - "check AP group"
  - "wireless troubleshooting"
allowed-tools: Read, Bash
version: 0.1.0
---

# Aruba Wireless Skill

## What this covers

The `aruba` MCP server talks to PSD's Aruba Mobility Conductor for read-only wireless monitoring and config review: AP status, connected clients, running config, system logs, and AOS 8 hierarchical configuration objects (SSID/VAP/AP-group/role). Use it for wireless troubleshooting and config auditing — there is no tool to change config, reboot an AP, or kick a client. All queries run against the conductor; it does not reliably reach through to individual managed devices (see Pitfalls).

## Available tools

| Tool | Purpose |
|---|---|
| `aruba_show` | Run any `show ...` AOS CLI command and return the JSON result |
| `aruba_get_aps` | Query the AP database, optionally filtered by group name or up/down status |
| `aruba_get_clients` | Query connected clients/users, optionally filtered by SSID substring |
| `aruba_get_config` | Retrieve running-config, full or a single section by keyword |
| `aruba_get_logs` | Retrieve system logs by category (system/security/wireless/etc), default 50 entries |
| `aruba_get_node_config` | Query AOS 8 hierarchical configuration objects (SSID/VAP/AP-group/role) for a specific config path |

## Common workflows

1. **AP is reported down.** `aruba_get_aps` with `status="down"` (optionally `group="<group-name>"`) to confirm and scope the outage → `aruba_get_logs` with `category="wireless"` to check for recent flap/reboot events around that time → `aruba_show` with a targeted command like `show ap debug system-status ap-name <ap-name>` for detail on that specific AP.

2. **User can't connect to a specific SSID.** `aruba_get_clients` with `network="<ssid-substring>"` to see who's currently associated on that network → `aruba_get_logs` with `category="security"` to check for recent auth rejects → `aruba_show` with `command="show aaa authentication dot1x default"` (or the relevant dot1x profile) to check EAP/termination settings.

3. **Review a group's wireless profile configuration.** `aruba_get_aps` with `group="<group-name>"` to confirm the AP group exists and see its membership → `aruba_get_node_config` with `config_path="/md/<group-name>"` and one specific `object_type` (e.g. `"ssid_prof"`) to pull just that profile type for the group. Never omit `object_type` or loop this across every object type for the group — see Pitfalls.

4. **Config doesn't show up in running-config.** `aruba_get_config` with a `section` keyword first → if that section comes back empty, fall back to `aruba_get_node_config` with the matching `object_type` — SSID/VAP/role config pushed from the conductor to managed devices often isn't visible via `running-config` at all.

5. **Ad hoc diagnostic command.** `aruba_show` with any `show ...` command for one-off checks (`show version`, `show ap database long`, etc). Treat the result as conductor-scoped even if you pass `node` — see Pitfalls.

## Pitfalls & limits

- **Never call `aruba_get_node_config` with only a group-level `config_path` and no narrow `object_type`, and never loop it across every object type for a group.** An unscoped group-level pull (e.g. `/md/<group-name>`) can return 90KB+ of JSON in a single response and will blow the context window. Always pass one specific `object_type` (`ssid_prof`, `virtual_ap`, `ap_group`, `role`, etc.) per call, and prefer the smallest group scope that answers the question.
- `aruba_get_node_config` only accepts group-level `config_path` values (e.g. `/md`, `/md/<group-name>`). A leaf-level path pointing at an individual managed device returns `{"Error": "Invalid config path"}` — don't target a specific controller hostname in `config_path`.
- The `node` parameter on `aruba_show` is unreliable — targeting a specific managed device can silently return the conductor's own result instead of erroring. Don't trust `aruba_show` output as device-specific just because `node` was set; confirm against an obviously device-specific field (model, uptime) before relying on it.
- `aruba_show` commands must start with `show ` (validated server-side) — other AOS CLI syntax is rejected.
- This server is read-only against a production wireless controller — there is no create/update/delete tool of any kind.
- Failed or empty API calls come back as `{"_error": "..."}` or `{"_raw": "..."}` inside the JSON rather than raising — check for those keys before treating a result as structured data.
- SSID/VAP/role configuration pushed from the conductor to managed devices frequently doesn't appear via `aruba_get_config`'s running-config section search — use `aruba_get_node_config` for those object types instead.
- The server authenticates with a single shared read-only service account — there's no per-user credential, so don't ask IT staff for their own controller login.

## Setup

See `../../SECRETS-SETUP.md` for credential setup. This server needs `ARUBA_HOST`, `ARUBA_USERNAME`, `ARUBA_PASSWORD` (optional: `ARUBA_PORT`, defaults to `4343`; `ARUBA_VERIFY_SSL`, defaults to `false`).
