---
name: enrollment
description: P223 monthly enrollment automation for Peninsula School District — report generation, FTE validation, and compliance checking
argument-hint: "[action] [school?] [date?]"
model: claude-opus-5
effort: high
paths:
  - scripts/
  - references/
  - ~/Downloads/
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
  - mcp__chrome-devtools__navigate_page
  - mcp__chrome-devtools__click
  - mcp__chrome-devtools__click_at
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

## Reference Knowledge

Before acting, read the relevant reference documents:

```
plugins/psd-productivity/skills/enrollment/references/
  p223-process.md       # Step-by-step P223 procedure by school level
  fte-rules.md          # FTE calculation rules (ES/MS/HS/GVA/RS)
  school-config.md      # School list, programs, report parameters
  report-checklist.md   # Required reports per school level per month
  cant-automate.md      # Items requiring human judgment
  BUILD-PLAN.md         # Build plan and phase status
```

## Commands

### `/enrollment reports [school] [date]`

Run all required backup reports for a school on a count date using Chrome DevTools MCP browser automation.

**Prerequisites**: The debug browser must be running. Launch it with:
```bash
bash plugins/psd-productivity/skills/browser-control/scripts/launch-chrome.sh
```
The user must be logged into PowerSchool in the debug browser before running reports.

**Pre-flight (once per browser session)**:
1. Open `brave://settings/downloads` — disable "Ask where to save each file before downloading"
2. Verify user is logged into PowerSchool in the debug browser

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
5. Save all PDFs using: `bun ~/Desktop/P223-<Month>-<Year>/save_pdf.js <path> <title_filter>`
6. Report back what was generated and flag any issues

**Key automation patterns** (see report-checklist.md for full JS snippets):
- Report engine forms: `document.getElementById('btnSubmit').click()`
- Report queue: submit → navigate to `detail.html?frn=<id>` → `wait_for(["Result File"])` → save PDF
- Entry/Exit: change `#m` value → dispatch `change` event → auto-refreshes (no submit)
- Enrollment Summary: set date input → press Tab → auto-reloads

**Do NOT delegate to powerschool-navigator agent** — it cannot access Chrome DevTools MCP tools. All browser automation runs in the main session.

**Parameters by level** (from school-config.md):
- **Elementary**: 1-Day FTE window, FTE Calc Date = count date
- **Middle/High**: 5-Day FTE window, FTE Calc Date = blank

### `/enrollment checklist [month]`

Show what's done and remaining for a monthly enrollment count.

**Workflow**:
1. Read `references/report-checklist.md`
2. Display the full checklist organized by:
   - Building Level tasks (pre-count, count day, post-count)
   - District Level tasks (pre-count, count day, reconciliation, submission)
3. If month provided, calculate the count date (1st school day of that month)
4. Show status as a markdown checklist

### `/enrollment help`

Explain the P223 process and what's automated.

**Workflow**:
1. Read `references/p223-process.md` and `references/cant-automate.md`
2. Provide a concise overview:
   - What P223 is and why it matters (funding)
   - Monthly cadence (Oct–Jun, 1st school day)
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
1. Delegate to the `enrollment-validator` agent
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
uv run scripts/month_comparison.py --school GHHS \
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
uv run scripts/ale_reconciler.py --ale-data report.csv --school GVA --count-date 03/02/2026 \
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
uv run scripts/rs_reconciler.py --tcc-report tcc.csv --ps-report ps_rs.csv \
  --count-month March --count-date 03/02/2026 --output rs_report.md --rscntrl-output rscntrl.json
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

**Script**: `scripts/validation_report.py`
```bash
uv run scripts/validation_report.py --school-data schools.json \
  --count-date 03/02/2026 --count-month March \
  --output validation_report.md --eds-output eds_import.json
```

### `/enrollment run [month]`

Full monthly workflow with human checkpoints. Orchestrates all steps.

**CRITICAL — NEVER STOP**: When running the full monthly workflow, you MUST process every school without pausing, stopping, or asking for confirmation between schools. If you encounter an error at one school, log it and continue to the next school. Report all errors at the end. The only acceptable reason to stop is if the PowerSchool session expires (HTTP 302 to pw.html).

After completing each school, immediately output a one-line status and proceed to the next school. Do not summarize, do not ask if the user wants to continue, do not pause for any reason.

**Context management** (prevents mid-run stops from context window pressure):
- Do NOT take full page snapshots (`take_snapshot`) unless actively debugging a failure. Use `evaluate_script` to extract only the data needed (headcount numbers, student names, report status).
- Use `take_screenshot` with `filePath` for archival — screenshots don't consume context.
- Avoid reading full `wait_for` snapshot results — they are 50KB+ and fill the context window. Only check the returned status, not the DOM content.
- When a report result is predictable (e.g., Entry/Exit with 0 rows), save screenshot and move on without inspecting the DOM.

**Execution model — completion loop, not step list**:

This workflow uses a completion-driven loop. It does NOT run a list of steps and hope to finish. It defines DONE and loops until DONE is achieved.

DONE = every school in SCHOOLS has all required reports saved to the backup folder.

SCHOOLS = [AES, DES, EES, HHES, MCES, PIE, PES, SWES, VES, VOY, GMS, HRMS, KPMS, Kopa, GHHS, PHS, HBHS]

REQUIRED_REPORTS_ES = [P223, EnrollmentSummary, EntryExitPrev, EntryExitCurr, ConsecutiveAbsence, ClassAttendanceAudit, StudentListExport, SectionEnrollmentAudit]

REQUIRED_REPORTS_MS_HS = REQUIRED_REPORTS_ES + [StudentScheduleReport]

**Phase 1: District-Level Batch (run once)**
1. Switch to District Office context in PowerSchool
2. Run P223 Form and Audit with "Separate form per school" checked → one ZIP for all schools
3. Extract and rename per-school PDFs/CSVs from the ZIP
4. Test: Run Enrollment Summary at district level (if per-school breakdown available, use it; otherwise fall back to per-school in Phase 2)
5. Test: Run Consecutive Absence at district level (if it covers all schools, use it; otherwise fall back to per-school in Phase 2)

**Phase 2: Per-School Reports (completion loop)**
```
Loop:
  1. Check backup folder — which schools have all required reports?
  2. Build REMAINING = SCHOOLS minus completed schools
  3. If REMAINING is empty → DONE. Go to Phase 3.
  4. Pick next school from REMAINING
  5. Switch to that school in PowerSchool
  6. Run all MISSING reports for that school (skip any already saved from Phase 1)
  7. After each report, save to backup folder
  8. After all reports for this school, output one-line status:
     ✓ [SCHOOL] — HC: [N], Issues: [none/description] ([completed]/[total] schools done)
  9. GOTO step 1
```

This loop NEVER stops until step 3 is satisfied. There is no "pause and ask" between schools. There is no summary after each school. There is no stopping at natural boundaries. The only exit condition is DONE.

If a report fails: log the error, skip it, continue to next report.
If a school fails entirely: log it, continue to next school.
If the session expires: re-authenticate and resume from current school.
Failed reports/schools are retried in the next pass of the loop.

**Phase 3: Post-Reports**
1. Run validation checks on downloaded data
2. Run ALE reconciliation
3. Run RS reconciliation
4. Generate comprehensive validation report + EDS import
5. Present results with human review checklist
6. **STOP — Human reviews, signs, uploads to EDS**
7. After confirmation: update internal spreadsheets (ANNAVG, CNTRL, One Pager)
8. Generate Board/Cabinet notification email

### `/enrollment status`

Show dashboard of monthly process progress.

**Workflow**:
1. Check what files exist for current month's backup folder
2. Show which schools have submitted reports
3. Show which reconciliations are complete
4. Show what's remaining before EDS submission

## Scripts Reference

All scripts live in `plugins/psd-productivity/skills/enrollment/scripts/` and use `uv run`.

| Script | Phase | Purpose |
|--------|-------|---------|
| `fte_calculator.py` | 2 | FTE calculation engine (ES/MS/HS/GVA) |
| `enrollment_validator.py` | 2 | Data validation suite (9 checks) |
| `month_comparison.py` | 2 | Month-over-month diff detector |
| `entry_exit_balancer.py` | 2 | Entry/Exit reconciliation per grade |
| `ale_reconciler.py` | 4 | ALE FTE reconciliation + CTE extraction |
| `rs_reconciler.py` | 4 | Running Start reconciliation vs TCC |
| `validation_report.py` | 5 | District validation report + EDS import |

## Google Workspace Integration

Drive and Sheets access is provided by the shared `/google-workspace` skill.
See `plugins/psd-productivity/skills/google-workspace-cli/SKILL.md` for setup.

Common operations used by enrollment:
```bash
# Read Part Time spreadsheet
gws sheets +read --spreadsheet "SPREADSHEET_ID" --range 'CurrentMonth!A1:Z500'

# Upload enrollment backup
gws drive +upload ./backup.pdf --name "GHHS_EnrollmentSummary_20260302"

# Create monthly backup folder
gws drive files create \
  --json '{"name": "March 2026", "mimeType": "application/vnd.google-apps.folder"}'
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

- **Count Day**: 1st school day of each month (Oct–Jun). September = 4th school day.
- **Bell schedules change yearly** — always pull live from PowerSchool, never hardcode
- **P223 is static** — does not hold historical data. Running for a previous month requires restoring FTE overrides from backup.
- **Retain reports 4 years** after submission (OSPI audit requirement)
- **Never auto-submit to EDS** — always generate file + validation report for human review
- **Browser setup**: Disable "Ask where to save each file before downloading" in `brave://settings/downloads` before first run each session
- **Student List Export**: Always downloads as `~/Downloads/student.export.text` — move and rename immediately after each school
- **evaluate_script over UID clicks**: Use `evaluate_script` + `querySelector`/`getElementById` for all form interactions — snapshot UIDs are unreliable
- **powerschool-navigator agent**: Cannot access MCP tools — do not delegate browser automation to it
