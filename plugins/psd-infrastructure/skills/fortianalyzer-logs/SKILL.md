---
name: fortianalyzer-logs
description: Search FortiAnalyzer traffic/event/security logs, check alerts, audit managed devices, and run or retrieve reports for network incident investigation; use when tracing firewall traffic, chasing a security alert, or pulling a compliance report.
triggers:
  - "search fortianalyzer logs"
  - "check firewall logs"
  - "what alerts fired today"
  - "pull logs for this incident"
  - "check FAZ alerts"
  - "download the security report"
  - "run the weekly traffic report"
  - "check device firmware in fortianalyzer"
  - "trace traffic for this IP"
  - "fortianalyzer"
allowed-tools: Read, Bash
version: 0.1.0
---

# FortiAnalyzer Logs Skill

## What this covers

The `fortianalyzer` MCP server talks to FortiAnalyzer for log search, alerts, reports, managed device/ADOM inventory, and system status. Use it to trace firewall/security events, follow up on alerts, audit device compliance, and generate or retrieve reports. For anything not covered by a dedicated tool, `faz_api_call` makes a raw API call.

## Available tools

### Log search & archives
| Tool | Purpose |
|---|---|
| `search_logs` | Search traffic/event/utm/virus/webfilter/ips/dlp/app-ctrl/siem logs with a filter and time window (async — polls until done) |
| `get_log_fields` | List filterable field names for a log type; use before writing a `search_logs` filter |
| `list_log_files` | List archived log files (.zst) by device/vdom/time coverage, for windows that have aged out of live search |
| `download_log_file` | Download a raw archived log file found via `list_log_files` |

### Alerts
| Tool | Purpose |
|---|---|
| `get_alerts` | List alert events with severity, source, and acknowledgement status |
| `acknowledge_alert` | Mark an alert acknowledged (mutating) |

### Reports
| Tool | Purpose |
|---|---|
| `list_reports` | List available report templates/layouts and their IDs |
| `run_report` | Trigger a report by layout ID and wait for it to finish |
| `get_report_data` | Fetch results of a report that already ran (no re-run) |
| `list_generated_reports` | List previously generated report artifacts, including ones older than current log retention |
| `download_report` | Download a generated report artifact (pdf/csv/json/xml/html) |

### Devices & ADOMs
| Tool | Purpose |
|---|---|
| `list_devices` | List managed devices in an ADOM (name, IP, serial, firmware, status) |
| `get_device` | Full detail on one managed device |
| `add_device` | Add a device to FAZ management (mutating) |
| `delete_device` | Remove a device from FAZ management (mutating, does not factory-reset) |
| `list_adoms` | List ADOMs (administrative domains) |
| `get_adom` | Detail on one ADOM |

### System, tasks & policy
| Tool | Purpose |
|---|---|
| `get_system_status` | FAZ hostname, firmware, serial, uptime |
| `get_ha_status` | HA cluster mode and sync state |
| `get_task_list` | List background tasks (log fetches, report runs, device syncs) |
| `get_task_detail` | Status/progress of one background task by ID |
| `list_policy_packages` | List firewall policy packages in an ADOM |
| `get_policy_package` | Detail on one policy package |
| `get_fortiguard_status` | FortiGuard license and signature database status |

### Escalation
| Tool | Purpose |
|---|---|
| `faz_api_call` | Raw JSON-RPC call for anything the dedicated tools don't cover. Set `apiver: 3` for `/logview`, `/report`, `/eventmgmt` URLs. |

## Common workflows

1. **Chase an alert to root cause.** `get_alerts` to find the triggered alert and its source/time → `search_logs` with a time window around the alert and a filter on the relevant IP/device → `acknowledge_alert` once you've confirmed the cause.

2. **Build a targeted log query.** `get_log_fields` for the log type to see what's filterable → `search_logs` with `filter` and `time_range` (or `start_time`/`end_time` for an absolute window). Narrow the filter or time window if the search times out.

3. **Recover logs that have aged out of search.** `list_log_files` with `since`/`until` to find archives covering the window → `download_log_file` to pull the archive for offline analysis.

4. **Run and retrieve a report.** `list_reports` to find the layout ID → `run_report` to trigger it and wait for completion → `download_report` for the artifact. For a report already run (yours or scheduled), skip straight to `get_report_data` or find it in `list_generated_reports`.

5. **Audit device or firmware posture.** `list_adoms` → `list_devices` per ADOM → `get_device` for detail on a specific unit → `get_fortiguard_status` to confirm signature databases are current.

## Pitfalls & limits

- `search_logs` is async under the hood; it polls up to `timeout_seconds` (default 120s) before giving up. Narrow the time window or add a filter if it times out on a broad query.
- `search_logs` count fields (`total_count`, `scanned_logs`) are only reliable when a `filter` is set — unfiltered searches under-report how much was actually scanned.
- Live search only covers what's still on disk. If a window predates retention, use `list_log_files`/`download_log_file` for raw archives, or `list_generated_reports` for a report that already captured that data.
- `add_device`, `delete_device`, and `acknowledge_alert` are mutating — confirm before running them.
- `faz_api_call` needs `apiver: 3` for `/logview`, `/report`, and `/eventmgmt` URLs; omitting it on those namespaces returns an invalid-request error, not a helpful one.
- `download_log_file` and `download_report` write files to local disk (temp directory by default) — clean up afterward since log/report contents can include sensitive traffic data.

## Setup

See `../../SECRETS-SETUP.md` for credential setup. This server needs `FAZ_HOST`, `FAZ_USERNAME`, `FAZ_PASSWORD` (optional: `FAZ_ADOM`, defaults to `root`).
