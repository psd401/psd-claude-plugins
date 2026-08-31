# P223 Enrollment Automation — Build Plan

> Living document tracking the phased build of `/enrollment`

## Current Status: Phases 1-5 Complete; Phase 8 (portability + n8n split) landed 2026-08-31

## Build Phases

### Phase 1: Reference Knowledge Base + Browser Automation Foundation — COMPLETE
- Reference docs: p223-process.md, fte-rules.md, school-config.md, report-checklist.md, cant-automate.md
- PowerSchool navigator agent for Claude-in-Chrome report automation
- Enrollment validator agent for data validation
- SKILL.md rewritten with Phase 1 commands

### Phase 2: FTE Calculator + Validation Engine — COMPLETE
- `scripts/fte_calculator.py` — FTE calculation engine (ES minutes-based, MS/HS period-based, GVA split-school)
- `scripts/enrollment_validator.py` — 9 validation checks (HC consistency, FTE calc, 20-day absence, entry/exit balance, RS cap, teacher assignment, FTE override, program compliance)
- `scripts/month_comparison.py` — Month-over-month diff with backdated exit detection
- `scripts/entry_exit_balancer.py` — Entry/Exit reconciliation per grade per school

### Phase 3: Google Workspace CLI Integration — COMPLETE
- Shared skill: `google-workspace-cli` in psd-productivity/skills/
- Based on `gws` CLI (npm @googleworkspace/cli)
- Supports multiple auth accounts via env vars or config directories
- Operations: Drive file list/upload/download, Sheets read/write/append, Gmail send, Calendar events
- Setup instructions included in skill

### Phase 4: District Reconciliation Automation — COMPLETE
- `scripts/ale_reconciler.py` — ALE FTE reconciliation:
  - Assigns FTE per section based on paired school rules
  - Verifies combined ALE + RS FTE ≤ 1.20
  - Extracts CTE ALE sections (OCT135, OPE901)
  - Generates CTE report for CTE program
  - Splits in-district vs out-of-district
- `scripts/rs_reconciler.py` — Running Start reconciliation:
  - Compares TCC RS report vs PowerSchool data
  - Identifies full-time vs part-time RS
  - Generates RSCNTRL spreadsheet data
  - Flags January SQEAF requirements
  - Detects mismatches (TCC-only, PS-only students)

### Phase 5: Validation Report + EDS Import Generation — COMPLETE
- `scripts/validation_report.py` — Comprehensive district report:
  - Aggregates all school data (HC, FTE, ALE, RS, TBIP, CTE, Open Doors)
  - Runs validation checks across all schools
  - Generates markdown validation report with human review checklist
  - Generates EDS-ready import JSON

### Phase 6: End-to-End Orchestration — SKILL.MD READY, NEEDS LIVE TESTING
- `/enrollment run [month]` — Full monthly workflow defined in SKILL.md
- `/enrollment status` — Dashboard command defined
- Requires live PowerSchool session + Google Workspace auth to test end-to-end
- Email generation for Board/Cabinet notification handled by SKILL.md orchestration

### Phase 7: Speed & Reliability Improvements — IN PROGRESS (March 2026)

**Problem**: March 2026 run completed 10/17 schools, stopped mid-run, skipped P223 entirely, daysToScan defaulted to 3.

**Root causes addressed**:
1. **Mid-run stops**: Context window pressure from 50KB+ `take_snapshot`/`wait_for` results. Fixed with context management rules — use `evaluate_script` for data extraction, `take_screenshot` with `filePath` for archival.
2. **P223 skipped**: Report order was advisory, not enforced. Fixed with strict numbered ordering and "DO NOT SKIP" language.
3. **daysToScan=3**: Field defaults vary by school context. Fixed with explicit JS override (`input[name="daysToScan"].value = '20'`) and post-run verification.
4. **Completion model**: Replaced linear step list with completion-driven loop (Ralph-Loop pattern) — defines DONE and loops until achieved.

**District-level batching (needs live validation)**:
- P223 Form and Audit can potentially run at District Office level with "Separate form per school" → one ZIP for all schools
- Enrollment Summary and Consecutive Absence may also work at district level
- If validated, eliminates ~50% of per-school work (from ~2 hours to ~45-60 minutes)
- SKILL.md updated with Phase 1 (district batch) → Phase 2 (per-school loop) → Phase 3 (post-reports) structure

**Still needs live testing**:
- [ ] Does P223 at District Office with "Separate form per school" produce individual school P223s?
- [ ] Does Enrollment Summary at District Office show per-school breakdown?
- [ ] Does Consecutive Absence at District Office run across all schools?
- [ ] Multi-tab parallelization within Phase 2 (secondary optimization)

### Phase 8: Multi-Machine Portability + n8n Split — LANDED 2026-08-31 (needs live smoke test)

**Goal**: Run on any machine with Claude Code (laptop, office Mac mini on a schedule, future operator's machine), with n8n owning the schedule/notification layer.

- **Portability**: all paths skill-relative; `save_pdf.js` moved into `scripts/` (was hand-copied to Desktop month folders); local staging at `~/Enrollment/P223-<Month>-<Year>/`; Drive is home of record; `references/machine-setup.md` documents new-machine setup
- **Shared state**: tracking sheet `P223 Enrollment Tracking 2026-2027` (`1t10gPECTUd2s9kMrm2jsOIvMHKnRpTcbhJGq-hO7Yg0`) — `Calendar` / `SchoolStatus` / `DistrictStatus` tabs; skill writes via gws, n8n + humans read
- **Scheduled operation**: new `/enrollment daily-check` command for a weekday scheduled task on the mini (session health probe → alert on expiry; count day → full run)
- **allowed-tools fix**: chrome-devtools MCP tools are namespaced `mcp__plugin_psd-productivity_chrome-devtools__*` in current Claude Code; both old and new names listed for cross-version compatibility; dropped `click_at` (no longer exists in chrome-devtools-mcp)
- **effort: medium** (from high) — long mechanical loop, same rationale as /lfg; March failure mode was context pressure, not reasoning depth
- **2026-27 refresh**: count-date table (Sept = Tue 2026-09-08) in school-config.md + Calendar tab; RS cap validated at 1.20; bell schedules unchanged (confirmed 2026-08-31)
- **n8n side** (psd-workflow-automation repo): `BUS - Enrollment Count Scheduler` (T-1 reminders, count-day kickoff, Drive folder creation), `BUS - Enrollment Notifications` (Board/Cabinet + Sodexo after EDS), TCC report watcher (pending mailbox address)

**Still needs**:
- [ ] Live smoke test: one school end-to-end with the plugin-prefixed tool names
- [ ] Phase 7 district-batch validation (carried over — dry-run before count day 9/8)
- [ ] TCC watcher mailbox address from Hagel
- [ ] Mac mini setup per machine-setup.md

## What's Ready to Test

| Command | Requires | Status |
|---------|----------|--------|
| `/enrollment help` | Nothing | Ready |
| `/enrollment checklist [month]` | Nothing | Ready |
| `/enrollment fte [school] [schedule]` | Nothing (uses fte_calculator.py) | Ready — tested |
| `/enrollment validate [school]` | CSV data files from PS | Ready — needs data |
| `/enrollment compare [m1] [m2]` | Enrollment summary CSVs | Ready — needs data |
| `/enrollment ale [csv]` | GVA ALE report CSV | Ready — needs data |
| `/enrollment rs [tcc] [ps]` | TCC report + PS export CSVs | Ready — needs data |
| `/enrollment report [month]` | School data JSON | Ready — needs data |
| `/enrollment reports [school] [date]` | PowerSchool + Chrome | Ready — needs live PS |
| `/enrollment run [month]` | Everything above | Ready — needs live testing |

## File Inventory

```
enrollment/
  SKILL.md                              # Main orchestrator (13 commands)
  references/
    BUILD-PLAN.md                       # This file
    p223-process.md                     # Step-by-step procedure
    fte-rules.md                        # FTE calculation rules
    school-config.md                    # School list and config
    report-checklist.md                 # Required reports checklist
    cant-automate.md                    # Human judgment items
  scripts/
    fte_calculator.py                   # Phase 2: FTE engine
    enrollment_validator.py             # Phase 2: 9 validation checks
    month_comparison.py                 # Phase 2: Month-over-month diff
    entry_exit_balancer.py              # Phase 2: Entry/Exit balance
    ale_reconciler.py                   # Phase 4: ALE FTE reconciliation
    rs_reconciler.py                    # Phase 4: Running Start reconciliation
    validation_report.py                # Phase 5: District report + EDS import

agents/ (in psd-productivity/)
  enrollment-validator.md               # Phase 1: Validation agent
  (powerschool-navigator was removed — browser automation runs in the main session; subagents cannot access MCP tools)

skills/ (in psd-productivity/)
  google-workspace-cli/SKILL.md         # Phase 3: Shared GWS CLI skill
```

## Unresolved Questions
- 1.2 Part Time spreadsheet exact Google Drive path?
- 1.3 Internal P223 spreadsheet — Google Sheet or Excel?
- 1.6 TCC RS report arrival mailbox (needed to activate the n8n watcher)

## Resolved
- 1.1 RS FTE cap → **1.20 for 2026-27** (Hagel, 2026-08-31)
- 1.4 State handbook changes → none affecting rules; bell schedules unchanged for 2026-27 (Hagel, 2026-08-31)
- 1.5 PowerSchool API access → **both plugin API and ODBC exist**, but the built-in reports (P223 form) aren't exposed there — direct access would mean building our own reporting, potentially surfaced through psd-data-mcp. Deliberate future track, not part of the browser pipeline (Hagel, 2026-08-31)
