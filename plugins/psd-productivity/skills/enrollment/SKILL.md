---
name: enrollment
description: P223 monthly enrollment automation for Peninsula School District — report generation, FTE validation, and compliance checking
argument-hint: "[action] [school?] [date?]"
model: claude-opus-5
effort: medium
paths:
  - scripts/
  - references/
  - ~/Downloads/
  - ~/Enrollment/
  - ./
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - WebFetch
  - WebSearch
  - mcp__plugin_psd-productivity_chrome-devtools__navigate_page
  - mcp__plugin_psd-productivity_chrome-devtools__click
  - mcp__plugin_psd-productivity_chrome-devtools__hover
  - mcp__plugin_psd-productivity_chrome-devtools__fill
  - mcp__plugin_psd-productivity_chrome-devtools__type_text
  - mcp__plugin_psd-productivity_chrome-devtools__fill_form
  - mcp__plugin_psd-productivity_chrome-devtools__press_key
  - mcp__plugin_psd-productivity_chrome-devtools__take_screenshot
  - mcp__plugin_psd-productivity_chrome-devtools__take_snapshot
  - mcp__plugin_psd-productivity_chrome-devtools__wait_for
  - mcp__plugin_psd-productivity_chrome-devtools__evaluate_script
  - mcp__plugin_psd-productivity_chrome-devtools__list_console_messages
  - mcp__plugin_psd-productivity_chrome-devtools__list_pages
  - mcp__plugin_psd-productivity_chrome-devtools__select_page
  - mcp__plugin_psd-productivity_chrome-devtools__new_page
  - mcp__plugin_psd-productivity_chrome-devtools__handle_dialog
  - mcp__plugin_psd-productivity_chrome-devtools__upload_file
  - mcp__chrome-devtools__navigate_page
  - mcp__chrome-devtools__click
  - mcp__chrome-devtools__hover
  - mcp__chrome-devtools__fill
  - mcp__chrome-devtools__type_text
  - mcp__chrome-devtools__fill_form
  - mcp__chrome-devtools__press_key
  - mcp__chrome-devtools__take_screenshot
  - mcp__chrome-devtools__take_snapshot
  - mcp__chrome-devtools__wait_for
  - mcp__chrome-devtools__evaluate_script
  - mcp__chrome-devtools__list_console_messages
  - mcp__chrome-devtools__list_pages
  - mcp__chrome-devtools__select_page
  - mcp__chrome-devtools__new_page
  - mcp__chrome-devtools__handle_dialog
  - mcp__chrome-devtools__upload_file
extended-thinking: true
---

# P223 Enrollment Automation

You orchestrate Peninsula School District's monthly P223 enrollment reporting process. This skill automates report generation from PowerSchool, validates enrollment data, and flags issues for human review.

**Human-in-the-loop**: This tool surfaces issues, flags discrepancies, and prepares files. Humans make judgment calls and submit to EDS.

## Portability Rules — READ FIRST

This skill runs on **multiple machines** (Hagel's laptop, the office Mac mini on a schedule, and potentially another user's machine in the future). Every action must be machine-agnostic:

1. **All skill files are referenced relative to THIS skill's directory** (the directory containing this SKILL.md). Never use repo-relative paths like `plugins/psd-productivity/...` — on an installed machine the plugin lives under `~/.claude/plugins/marketplaces/`, not in a checkout.
2. **Local staging directory**: `~/Enrollment/P223-<Month>-<Year>/` (e.g. `~/Enrollment/P223-September-2026/`). Never use `~/Desktop`.
3. **Google Drive is the home of record.** Local files are staging only — every report must be uploaded to the Drive BACKUP folder before the month is DONE. A run finished on the mini must be fully retrievable from any other machine.
4. **Shared state lives in the tracking sheet**, not on any one machine:
   - **P223 Enrollment Tracking 2026-2027**: `1t10gPECTUd2s9kMrm2jsOIvMHKnRpTcbhJGq-hO7Yg0`
   - Tabs: `Calendar` (count dates), `SchoolStatus` (per school per month), `DistrictStatus` (per month phases)
   - Read/write via `gws` CLI, `valueInputOption=RAW` always
5. **PDF saving**: `bun <skill-dir>/scripts/save_pdf.js <path> [title_filter]` (env `CDP_PORT` overrides the default 9222). The script ships with the skill — never copy it to month folders or the Desktop.
6. **New machine?** Follow `references/machine-setup.md` — Brave Nightly, debug profile, one-time PowerSchool login, `gws` auth, bun/uv.

## Reference Knowledge

Before acting, read the relevant reference documents from this skill's `references/` directory:

```
references/
  p223-process.md       # Step-by-step P223 procedure by school level
  fte-rules.md          # FTE calculation rules (ES/MS/HS/GVA/RS)
  school-config.md      # School list, programs, report parameters, 2026-27 count dates
  report-checklist.md   # Required reports per school level per month
  cant-automate.md      # Items requiring human judgment
  machine-setup.md      # Setting up a new machine to run this skill
  BUILD-PLAN.md         # Build plan and phase status
```

## Count Dates (2026-27)

Full verified table in `references/school-config.md`. Key facts: September count is **Tuesday 2026-09-08** (4th school day — school starts Wed 9/2, Labor Day 9/7; also the first day of kindergarten). October–June counts are the 1st school day of each month. The `Calendar` tab of the tracking sheet carries the same table for n8n and cross-machine use.

## Division of Labor with n8n (psd-workflow-automation)

n8n owns the **schedule-driven and notification** layer; this skill owns **browser collection and computation**:

| Responsibility | Owner |
|---|---|
| Count-day calendar, T-1 reminders, count-day kickoff email | n8n `BUS - Enrollment Count Scheduler` |
| Monthly Drive BACKUP folder creation | n8n scheduler |
| PowerSchool report generation (browser) | This skill, on whichever machine runs it |
| FTE/validation/reconciliation computation (Python) | This skill (`scripts/*.py` via `uv run`) |
| Progress state | Tracking sheet (skill writes via `gws`, n8n + humans read) |
| Board/Cabinet + Sodexo notification emails after EDS | n8n `BUS - Enrollment Notifications` (triggered when a human confirms EDS upload) |
| TCC Running Start report arrival watch | n8n watcher (Gmail trigger) |

If n8n or the tracking sheet is unreachable, continue the run and note the failure — local work is never blocked on the tracking layer.

## Commands

### `/enrollment daily-check`

Lightweight scheduled entry point — designed to run every weekday morning on the Mac mini via a Claude Code scheduled task.

**Workflow**:
1. Read the `Calendar` tab of the tracking sheet (`gws sheets +read`)
2. Determine today's role: count day, T-1 (last school day before count), or nothing
3. **Nothing** → verify PowerSchool session health (probe below) and exit silently. If the session is expired, alert (email `hagelk@psd401.net` via `gws gmail` or the n8n error channel) so a human can re-login before count day
4. **T-1** → session health probe + confirm the Drive BACKUP folder for the month exists + report readiness summary
5. **Count day** → run `/enrollment run [month]` end to end

**Session health probe** (in `evaluate_script`):
```javascript
const r = await fetch('/admin/tech/notifications/json/activenotificationOther.json.html');
return r.ok && !r.redirected; // false = session expired, human must re-login
```

### `/enrollment reports [school] [date]`

Run all required backup reports for a school on a count date using Chrome DevTools MCP browser automation.

**Prerequisites**: The debug browser must be running. Launch it with the browser-control skill's script (sibling skill directory):
```bash
bash "$(dirname <skill-dir>)/browser-control/scripts/launch-chrome.sh"
```
The user must be logged into PowerSchool in the debug browser (persistent profile keeps the session across restarts; verify with the session health probe rather than assuming).

**Pre-flight (verify once per machine, not per session)**:
1. `brave://settings/downloads` — "Ask where to save each file before downloading" must be OFF (persists in the debug profile once set)
2. Session health probe passes

**Workflow**:
1. Read `references/school-config.md` to determine school level (ES/MS/HS) and P223 parameters
2. Read `references/report-checklist.md` for direct URLs and JS patterns for each report
3. Use `evaluate_script` for all form interactions — UID-based clicks are unreliable (UIDs change between renders)
4. Reports to generate — **IN THIS ORDER, DO NOT SKIP ANY**:
   **STEP 1 [REQUIRED]**: P223 Form and Audit ⚑ PRIMARY DELIVERABLE
   - This is the report submitted to EDS. It MUST be generated first.
   - Navigate to state reports page, find P223 link via JS, set parameters per school level
   - If P223 fails, STOP and report the error. Do not continue to other reports.
   **STEP 2**: Enrollment Summary (all)
   **STEP 3**: Entry/Exit Report — previous month then current month (all)
   **STEP 4**: Consecutive Absence Report (all) — ALWAYS verify daysToScan=20
   **STEP 5**: Class Attendance Audit (all — Period 1 for ES, Periods 1-6 for MS/HS)
   **STEP 6**: Student List Export (all) — downloads to `~/Downloads/student.export.text`, move immediately
   **STEP 7**: Section Enrollment Audit (all)
   **STEP 8** (MS/HS only): Student Schedule Report
5. Save all PDFs using: `bun <skill-dir>/scripts/save_pdf.js <path> <title_filter>` into `~/Enrollment/P223-<Month>-<Year>/`
6. Upload the school's files to the month's Drive BACKUP folder (`gws drive +upload`)
7. Append the school's row to the `SchoolStatus` tab (Month, School, Level, ReportsComplete=Y, Headcount, Issues, UpdatedAt ISO timestamp, UpdatedBy = machine/user)
8. Report back what was generated and flag any issues

**Key automation patterns** (see report-checklist.md for full JS snippets):
- Report engine forms: `document.getElementById('btnSubmit').click()`
- Report queue: submit → navigate to `detail.html?frn=<id>` → `wait_for(["Result File"])` → save PDF
- Entry/Exit: change `#m` value → dispatch `change` event → auto-refreshes (no submit)
- Enrollment Summary: set date input → press Tab → auto-reloads

**Browser automation must run in the main session** — subagents cannot access MCP tools; never delegate browser steps to an agent.

**Parameters by level** (from school-config.md):
- **Elementary**: 1-Day FTE window, FTE Calc Date = count date
- **Middle/High**: 5-Day FTE window, FTE Calc Date = blank

### `/enrollment checklist [month]`

Show what's done and remaining for a monthly enrollment count.

**Workflow**:
1. Read `references/report-checklist.md`
2. Read `SchoolStatus` + `DistrictStatus` tabs for the month from the tracking sheet
3. Display the full checklist organized by:
   - Building Level tasks (pre-count, count day, post-count)
   - District Level tasks (pre-count, count day, reconciliation, submission)
4. If month provided, get the count date from `references/school-config.md` (or the `Calendar` tab)
5. Show status as a markdown checklist

### `/enrollment help`

Explain the P223 process and what's automated.

**Workflow**:
1. Read `references/p223-process.md` and `references/cant-automate.md`
2. Provide a concise overview:
   - What P223 is and why it matters (funding)
   - Monthly cadence (Sept 4th school day; Oct–Jun 1st school day)
   - What this tool automates vs what requires human judgment
   - Available commands
   - Current build phase status

### `/enrollment fte [school] [schedule-info]`

Calculate FTE for a student at a given school based on their schedule.

**Workflow**:
1. Read `references/fte-rules.md`
2. Determine school level and FTE rules
3. Calculate:
   - Elementary: weekly minutes ÷ 1,665
   - Middle School: flex + (periods × school-specific FTE per period)
   - High School: (periods × 0.17) + homeroom (0.02) + optional zero hour (0.17)
   - Henderson Bay: advisory (0.14) + (periods × 0.21)
   - GVA: varies by full-time/part-time and paired school
4. Show calculation breakdown and resulting FTE
5. Calculate adjustment (1.0 - FTE) if less than full-time

### `/enrollment validate [school]`

Run validation checks against downloaded enrollment data.

**Workflow**:
1. Delegate to the `enrollment-validator` agent. When validating multiple schools, dispatch validators for several schools **concurrently** (one Agent call per school, batched) — schools are independent.
2. Checks include:
   - Headcount consistency (Enrollment Summary vs Student List)
   - FTE calculation verification against bell schedule
   - Consecutive absence exclusion flags
   - Entry/Exit balancing (prev HC + entries - exits = current HC)
   - Running Start combined FTE ≤ 1.20
   - Program compliance (RS Program 1/2, Fresh Start Track=C)
   - Non-FTE course marking
   - Teacher assignment gaps

### `/enrollment compare [month1] [month2]`

Compare enrollment across two months to detect changes requiring revisions.

**Workflow**:
1. Compare Enrollment Summary reports from both months
2. Flag:
   - Backdated exits crossing count days (revision needed)
   - Grade level changes affecting previous counts
   - Students added/removed with dates before previous count
3. Output revision list with specific students and recommended actions

**Script**: `scripts/month_comparison.py`
```bash
uv run <skill-dir>/scripts/month_comparison.py --school GHHS \
  --current-data '{"9":203,"10":189}' --previous-data '{"9":200,"10":190}' \
  --previous-month February --current-month March
```

### `/enrollment ale [ale-report-csv]`

Run ALE FTE reconciliation from the GVA ALE report.

**Workflow**:
1. Read `references/fte-rules.md` for ALE FTE rates by paired school
2. Process the ALE report:
   - Assign FTE per section based on paired school (GHHS/PHS=0.15/0.17, HBHS=0.21, MS=0.16, ES=0.20)
   - Verify combined ALE + RS FTE ≤ 1.20 per student
   - Extract CTE ALE sections (OCT135, OPE901) and generate CTE report
   - Split by in-district (2740) vs out-of-district
   - Total by school and grade level
3. Output: ALE reconciliation report + CTE report for CTE program

**Script**: `scripts/ale_reconciler.py`
```bash
uv run <skill-dir>/scripts/ale_reconciler.py --ale-data report.csv --school GVA --count-date 10/01/2026 \
  --output ale_report.md --cte-output cte_ale.csv
```

### `/enrollment rs [tcc-report] [ps-export]`

Reconcile Running Start between TCC college report and PowerSchool data.

**Workflow**:
1. Compare TCC RS report against PS RS export
2. For each student:
   - Verify combined district + RS FTE ≤ 1.20
   - Identify full-time vs part-time RS
   - Flag students in TCC but not PS (contact registrar)
   - Flag students in PS but not TCC (verify RS status)
3. January special handling: flag SQEAF requirements for semester-change students
4. Generate RSCNTRL data (Academic/Vocational FTE by school, HC by grade)
5. Output: RS reconciliation report + RSCNTRL spreadsheet data

**Script**: `scripts/rs_reconciler.py`
```bash
uv run <skill-dir>/scripts/rs_reconciler.py --tcc-report tcc.csv --ps-report ps_rs.csv \
  --count-month October --count-date 10/01/2026 --output rs_report.md --rscntrl-output rscntrl.json
```

### `/enrollment report [month]`

Generate comprehensive validation report + EDS import data for the entire district.

**Workflow**:
1. Aggregate all school data (HC, FTE, ALE, RS, TBIP, CTE, Open Doors per school)
2. Run all validation checks across all schools
3. Generate:
   - Comprehensive markdown validation report with pass/fail per school
   - EDS-ready import JSON with all data structured for state submission
   - Human review checklist
4. **Human reviews report and uploads to EDS**
5. After the human confirms EDS submission, trigger the n8n notification workflow (Board/Cabinet + Sodexo emails; it also marks `EDSSubmitted`/`NotificationsSent` on the `DistrictStatus` tab):
```bash
curl -sf -X POST "https://n8n.psd401.net/webhook/enrollment-notify" \
  -H "X-Enrollment-Token: $ENROLLMENT_NOTIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"month":"<Month YYYY>","countDate":"<YYYY-MM-DD>","totals":{"headcount":<HC>,"fte":<FTE>},"highlights":"<one-paragraph summary>","confirmedBy":"<name>"}'
```
`ENROLLMENT_NOTIFY_TOKEN` is a per-machine env var (see `references/machine-setup.md`). If it is unset or the call fails, say so and fall back to updating `DistrictStatus` directly via `gws` — never fake the notification step.

**Script**: `scripts/validation_report.py`
```bash
uv run <skill-dir>/scripts/validation_report.py --school-data schools.json \
  --count-date 10/01/2026 --count-month October \
  --output validation_report.md --eds-output eds_import.json
```

### `/enrollment run [month]`

Full monthly workflow with human checkpoints. Orchestrates all steps.

**CRITICAL — NEVER STOP**: When running the full monthly workflow, you MUST process every school without pausing, stopping, or asking for confirmation between schools. If you encounter an error at one school, log it and continue to the next school. Report all errors at the end. The only acceptable reason to stop is if the PowerSchool session expires (HTTP 302 to pw.html) — and on an unattended machine, that means alerting a human, not silently dying.

After completing each school, immediately output a one-line status, append the school's `SchoolStatus` row, and proceed to the next school. Do not summarize, do not ask if the user wants to continue, do not pause for any reason.

**Context management** (prevents mid-run stops from context window pressure):
- Do NOT take full page snapshots (`take_snapshot`) unless actively debugging a failure. Use `evaluate_script` to extract only the data needed (headcount numbers, student names, report status).
- Use `take_screenshot` with `filePath` for archival — screenshots don't consume context.
- Avoid reading full `wait_for` snapshot results — they are 50KB+ and fill the context window. Only check the returned status, not the DOM content.
- When a report result is predictable (e.g., Entry/Exit with 0 rows), save screenshot and move on without inspecting the DOM.

**Execution model — completion loop, not step list**:

This workflow uses a completion-driven loop. It does NOT run a list of steps and hope to finish. It defines DONE and loops until DONE is achieved.

DONE = every school in SCHOOLS has all required reports saved to the local staging folder, uploaded to the Drive BACKUP folder, and recorded on the `SchoolStatus` tab.

SCHOOLS = [AES, DES, EES, HHES, MCES, PIE, PES, SWES, VES, VOY, GMS, HRMS, KPMS, Kopa, GHHS, PHS, HBHS]

REQUIRED_REPORTS_ES = [P223, EnrollmentSummary, EntryExitPrev, EntryExitCurr, ConsecutiveAbsence, ClassAttendanceAudit, StudentListExport, SectionEnrollmentAudit]

REQUIRED_REPORTS_MS_HS = REQUIRED_REPORTS_ES + [StudentScheduleReport]

**Phase 1: District-Level Batch (run once)**
1. Switch to District Office context in PowerSchool
2. Run P223 Form and Audit with "Separate form per school" checked → one ZIP for all schools
3. Extract and rename per-school PDFs/CSVs from the ZIP
4. Test: Run Enrollment Summary at district level (if per-school breakdown available, use it; otherwise fall back to per-school in Phase 2)
5. Test: Run Consecutive Absence at district level (if it covers all schools, use it; otherwise fall back to per-school in Phase 2)
6. Record `DistrictBatchDone` on the `DistrictStatus` tab

**Phase 2: Per-School Reports (completion loop)**
```
Loop:
  1. Check staging folder + SchoolStatus tab — which schools have all required reports?
  2. Build REMAINING = SCHOOLS minus completed schools
  3. If REMAINING is empty → DONE. Go to Phase 3.
  4. Pick next school from REMAINING
  5. Switch to that school in PowerSchool
  6. Run all MISSING reports for that school (skip any already saved from Phase 1)
  7. After each report, save to staging folder
  8. After all reports for this school: upload the school's files to Drive,
     append its SchoolStatus row, output one-line status:
     ✓ [SCHOOL] — HC: [N], Issues: [none/description] ([completed]/[total] schools done)
  9. GOTO step 1
```

This loop NEVER stops until step 3 is satisfied. There is no "pause and ask" between schools. There is no summary after each school. There is no stopping at natural boundaries. The only exit condition is DONE.

If a report fails: log the error, skip it, continue to next report.
If a school fails entirely: log it, continue to next school.
If the session expires: on an attended run, re-authenticate and resume from current school; on an unattended run, alert a human (email) and stop cleanly with state recorded so the next invocation resumes.
Failed reports/schools are retried in the next pass of the loop.

**Phase 3: Post-Reports**
1. Run validation checks on downloaded data — dispatch enrollment-validator agents for multiple schools concurrently
2. Run ALE reconciliation
3. Run RS reconciliation
4. Generate comprehensive validation report + EDS import
5. Update `DistrictStatus` (ValidationDone, ALEReconDone, RSReconDone)
6. Present results with human review checklist
7. **STOP — Human reviews, signs, uploads to EDS**
8. After confirmation: mark `EDSSubmitted`, trigger n8n notifications (Board/Cabinet email + Sodexo CNTRL), update internal spreadsheets (ANNAVG, CNTRL, One Pager)

### `/enrollment status`

Show dashboard of monthly process progress.

**Workflow**:
1. Read `SchoolStatus` + `DistrictStatus` tabs for the current month (source of truth — works from any machine)
2. Cross-check against the month's Drive BACKUP folder file list
3. Show which schools have complete reports, which reconciliations are done, what remains before EDS submission

## Scripts Reference

All scripts live in this skill's `scripts/` directory. Python via `uv run`, JS via `bun`.

| Script | Phase | Purpose |
|--------|-------|---------|
| `save_pdf.js` | Collection | Save active debug-browser tab as PDF via CDP printToPDF |
| `fte_calculator.py` | 2 | FTE calculation engine (ES/MS/HS/GVA) |
| `enrollment_validator.py` | 2 | Data validation suite (9 checks) |
| `month_comparison.py` | 2 | Month-over-month diff detector |
| `entry_exit_balancer.py` | 2 | Entry/Exit reconciliation per grade |
| `ale_reconciler.py` | 4 | ALE FTE reconciliation + CTE extraction |
| `rs_reconciler.py` | 4 | Running Start reconciliation vs TCC |
| `validation_report.py` | 5 | District validation report + EDS import |

## Google Workspace Integration

Drive and Sheets access is provided by the shared `google-workspace-cli` skill (sibling skill — see its SKILL.md for per-machine auth setup).

Common operations used by enrollment:
```bash
# Read tracking sheet calendar
gws sheets +read --spreadsheet "1t10gPECTUd2s9kMrm2jsOIvMHKnRpTcbhJGq-hO7Yg0" --range 'Calendar!A1:E12'

# Append a school status row
gws sheets +append --spreadsheet "1t10gPECTUd2s9kMrm2jsOIvMHKnRpTcbhJGq-hO7Yg0" \
  --range 'SchoolStatus!A1' --values '[["September 2026","GHHS","HS","Y","1420","none","2026-09-08T14:02:11","mac-mini"]]'

# Upload enrollment backup
gws drive +upload ./backup.pdf --name "GHHS_EnrollmentSummary_20260908"
```

## School Abbreviations

| Abbr | School | Level |
|------|--------|-------|
| AES | Artondale ES | ES |
| DES | Discovery ES | ES |
| EES | Evergreen ES | ES |
| HHES | Harbor Heights ES | ES |
| MCES | Minter Creek ES | ES |
| PIE | Pioneer ES | ES |
| PES | Purdy ES | ES |
| SWES | Swift Water ES | ES |
| VES | Vaughn ES | ES |
| VOY | Voyager ES | ES |
| GMS | Goodman MS | MS |
| HRMS | Harbor Ridge MS | MS |
| KPMS | Key Peninsula MS | MS |
| Kopa | Kopachuck MS | MS |
| GHHS | Gig Harbor HS | HS |
| PHS | Peninsula HS | HS |
| HBHS | Henderson Bay HS | HS |
| GVA | Global Virtual Academy | Alt |
| CTP | Community Transition | Alt |

## Important Notes

- **Count Day**: Sept = 4th school day (2026-09-08); Oct–Jun = 1st school day of each month. Full 2026-27 table in `references/school-config.md` and the tracking sheet's `Calendar` tab.
- **RS combined FTE cap**: validate against **1.20** for 2026-27 (confirmed by Hagel, 2026-08-31)
- **Bell schedules change yearly** — always pull live from PowerSchool, never hardcode. 2026-27: no bell schedule changes; the values in fte-rules.md stand (verified 2026-08-31).
- **P223 is static** — does not hold historical data. Running for a previous month requires restoring FTE overrides from backup.
- **Retain reports 4 years** after submission (OSPI audit requirement)
- **Never auto-submit to EDS** — always generate file + validation report for human review
- **Student List Export**: Always downloads as `~/Downloads/student.export.text` — move and rename immediately after each school
- **evaluate_script over UID clicks**: Use `evaluate_script` + `querySelector`/`getElementById` for all form interactions — snapshot UIDs are unreliable
- **Browser automation runs in the main session only** — subagents cannot access MCP tools
