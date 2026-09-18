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
   - Tabs: `Calendar` (count dates, `ReminderDate`, and `RerunDate` — a date in `RerunDate` makes the next `daily-check` on that day run the month in rerun mode), `SchoolStatus` (per school per month), `DistrictStatus` (per month phases; cols I/J written by the `eds_submitted` webhook event, cols L/M `FindingsDoc` / `CompletionEmailSent` written by the `collection_complete` event). Notification addresses live ONLY in the live n8n workflow — never in this skill, the sheet, or any committed file
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
| Internal "count submitted" confirmation after EDS | n8n `BUS - Enrollment Notifications` (triggered when a human confirms EDS upload; recipients = the enrollment notification list, maintained in the live workflow) |
| TCC Running Start report arrival watch | n8n watcher (Gmail trigger) |

If n8n or the tracking sheet is unreachable, continue the run and note the failure — local work is never blocked on the tracking layer.

## Commands

### `/enrollment daily-check`

Lightweight scheduled entry point — designed to run every weekday morning on the Mac mini via a Claude Code scheduled task.

**Workflow**:
1. Read the `Calendar` tab of the tracking sheet (`gws sheets +read`)
2. Determine today's role: count day, T-1 (last school day before count), **rerun day** (today equals a month's `RerunDate`), or nothing
3. **Rerun day** → run `/enrollment run <that month> rerun` end to end (see the `rerun` section under `/enrollment run`). A human requests a rerun by typing the date into the `Calendar` tab's `RerunDate` column for that month — no machine config, no code change. Clear the cell (or leave it in the past) afterwards; the check only fires on an exact date match, so a stale value cannot re-trigger.
4. **Nothing** → verify PowerSchool session health (probe below) and exit silently. If the session is expired, alert (email `hagelk@psd401.net` via `gws gmail` or the n8n error channel) so a human can re-login before count day
5. **T-1** → session health probe + confirm the Drive BACKUP folder for the month exists + report readiness summary
6. **Count day** → run `/enrollment run [month]` end to end

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
   - Running Start combined FTE ≤ 1.30 (October–June; September must be zero)
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
   - Verify combined ALE + RS FTE ≤ 1.30 per student
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
   - Verify combined district + RS FTE ≤ 1.30 (high school share ≤ 1.00)
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
5. After the human confirms EDS submission, trigger the n8n notification workflow (one internal "count submitted" confirmation email to the enrollment notification list; it also marks `EDSSubmitted`/`NotificationsSent` on the `DistrictStatus` tab):
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

(Add `rerun` after the month to re-collect a month already collected — see the `rerun` section below.)

Full monthly workflow with human checkpoints. Orchestrates all steps.

**CRITICAL — NEVER STOP**: When running the full monthly workflow, you MUST process every school without pausing, stopping, or asking for confirmation between schools. If you encounter an error at one school, log it and continue to the next school. Report all errors at the end. The only acceptable reason to stop is if the PowerSchool session expires (HTTP 302 to pw.html) — and on an unattended machine, that means alerting a human, not silently dying.

After completing each school, immediately output a one-line status, append the school's `SchoolStatus` row, and proceed to the next school. Do not summarize, do not ask if the user wants to continue, do not pause for any reason.

**Context management** (prevents mid-run stops from context window pressure):
- Do NOT take full page snapshots (`take_snapshot`) unless actively debugging a failure. Use `evaluate_script` to extract only the data needed (headcount numbers, student names, report status).
- Use `take_screenshot` with `filePath` for archival — screenshots don't consume context.
- Do NOT use `wait_for` at all in the run loop — chrome-devtools-mcp ≥1.8 attaches a full page snapshot to every `wait_for` result, which floods the context window. Poll with in-page `fetch` loops inside `evaluate_script` (`waitForStableDom: false`) returning tiny JSON — patterns in report-checklist.md.
- When a report result is predictable (e.g., Entry/Exit with 0 rows), save screenshot and move on without inspecting the DOM.

**Execution model — completion loop, not step list**:

This workflow uses a completion-driven loop. It does NOT run a list of steps and hope to finish. It defines DONE and loops until DONE is achieved.

DONE = every school in SCHOOLS has all required reports saved to the local staging folder, uploaded to the Drive BACKUP folder, and recorded on the `SchoolStatus` tab.

SCHOOLS = [AES, DES, EES, HHES, MCES, PIE, PES, SWES, VES, VOY, GMS, HRMS, KPMS, Kopa, GHHS, PHS, HBHS]

REQUIRED_REPORTS_ES = [P223, EnrollmentSummary, EntryExitPrev, EntryExitCurr, ConsecutiveAbsence, ClassAttendanceAudit, StudentListExport, SectionEnrollmentAudit]

REQUIRED_REPORTS_MS_HS = REQUIRED_REPORTS_ES + [StudentScheduleReport]

**Phase 0: Ensure the Drive layout (run once, before anything)**
Every run gets its own folder and every school its own subfolder — nothing is ever overwritten, and a school's folder can be shared with that building (Hagel, 2026-09-15):
```
AUTOMATION BACKUP (P223) / <Month YYYY> / Run <YYYY-MM-DD> / {AES … HBHS, District}
```
`uv run <skill-dir>/scripts/drive_layout.py --month "<Month YYYY>" --run-date <today> --share` creates whatever is missing, grants each building's contact **commenter** access to that school's folder (contacts come from the tracking sheet's `Buildings` tab — School, Contact, Email — which the enrollment officer maintains; no notification email is sent, the follow-up email carries the link), and prints every folder id as JSON — save it to `_district/drive_layout.json` and upload each school's files to **its** folder, district files to `District`, and the findings Google Doc to the run folder root. Every run, including a re-collection, is `Run <date>`; the findings doc's deltas section says what changed. Sharing must run as a person's gws login (Content Manager of the shared drive); serv_automation cannot share. The month folder itself:
Check for the month folder under `AUTOMATION BACKUP (P223)` (`1p_i0btMW4Wvq32mhsBXiABP8eTwWrdHm`, shared drive `0AGPCnumGcrRLUk9PVA`); create it if missing — do not rely on n8n having created it:
```bash
gws drive files list --params '{"q":"'"'"'1p_i0btMW4Wvq32mhsBXiABP8eTwWrdHm'"'"' in parents and name = '"'"'<Month Year>'"'"' and trashed = false","fields":"files(id,name)","supportsAllDrives":true,"includeItemsFromAllDrives":true}'
# if empty:
gws drive files create --params '{"supportsAllDrives":true}' --json '{"name":"<Month Year>","mimeType":"application/vnd.google-apps.folder","parents":["1p_i0btMW4Wvq32mhsBXiABP8eTwWrdHm"]}'
```

**Phase 1: District-Level Batch (validated live 2026-08-31 — two runs, ~1 minute each)**
1. Switch to District Office context in PowerSchool
2. Run P223 Form and Audit at `allSchools` **twice** (the form has one FTE-window setting):
   - Run A: 1-Day window + FTE Calc Date = count date → covers the 10 elementary schools
   - Run B: 5-Day window + FTE Calc Date blank → covers the 7 MS/HS
3. Each ZIP: one 17-page `WA_P223_Form.pdf`, one all-school `WA_P223_Audit.csv`, one state-format `P223_*.txt`. Save them as `_district/P223_RunA_1Day_{Form,Audit,State}_<date>.*` and `_district/P223_RunB_5Day_…`, then `uv run <skill-dir>/scripts/split_p223.py --folder <month folder> --date <YYYYMMDD>` — it writes one form page + one audit CSV per school (elementary from Run A, secondary from Run B) and `_district/p223_totals.json` (grades, totals, TK and RS as printed on each page). Do not split by hand. The PowerSchool `P223_*.txt` is **not** the EDS upload file — see Phase 3
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
  8. After all reports for this school: upload the school's files to ITS folder from `_district/drive_layout.json`,
     append its SchoolStatus row, output one-line status:
     ✓ [SCHOOL] — HC: [N], Issues: [none/description] ([completed]/[total] schools done)
  9. GOTO step 1
```

This loop NEVER stops until step 3 is satisfied. There is no "pause and ask" between schools. There is no summary after each school. There is no stopping at natural boundaries. The only exit condition is DONE.

If a report fails: log the error, skip it, continue to next report.
If a school fails entirely: log it, continue to next school.
If the session expires: on an attended run, re-authenticate and resume from current school; on an unattended run, alert a human (email) and stop cleanly with state recorded so the next invocation resumes.
Failed reports/schools are retried in the next pass of the loop.

**Phase 3: Post-Reports** — script-driven; the scripts read the month folder and write everything into `_district/`
1. Write the inputs the run collected: `_district/summary_hc.json` (`{"AES": 394, …}` from each Enrollment Summary), `_district/section_audit.json` (one line per school with conflicts), `_district/collection_gaps.json` (a list of anything not collected and why)
2. `uv run <skill-dir>/scripts/district_checks.py --folder <month folder> --date <YYYYMMDD> --month "<Month YYYY>" --rs-cap 1.30 --expected-ale HBHS` → `validation.json` + `schools.json` (integrity, per-school gap-student lists from the Student List export, September-RS-zero / 1.30 cap / HS ≤ 1.00, zero-FTE, expected-ALE, TK-without-FTE, EDS-field completeness)
3. `uv run <skill-dir>/scripts/eds_txt.py --folder … --date … --month … --expected-ale HBHS` → the real EDS upload file `P223_09_<year>_<mm>_27401_<date>_<time>.txt` (elementary from Run A, secondary from Run B; TK 223-225, Open Doors 218-220, Running Start 163-167 (zero in September), and expected-ALE schools' ALE fields filled from the audit; K-12 asserted against the form) + `eds_txt_changes.md`
4. `uv run <skill-dir>/scripts/validation_report.py --school-data _district/schools.json …` → validation report + EDS import JSON (now carries TK and the CTE 7-8 / 9-12 split)
5. ALE (`/enrollment ale`) and RS (`/enrollment rs`, October–June) reconciliations when their inputs exist; update `DistrictStatus` (ValidationDone, ALEReconDone, RSReconDone)
6. Present results with human review checklist
7. **Findings doc + completion email — runs every month, never skipped.** This is how the enrollment officer learns the run is done and what needs fixing; it is not optional and does not wait for a human prompt. The email goes through the n8n `BUS - Enrollment Notifications` workflow (`event: collection_complete`), which owns the recipient list.
   a. `uv run <skill-dir>/scripts/findings_doc.py --folder … --date … --month … --due-date <Calendar!DueDate> --run-date <today> --run-folder-url <run folder> --tracking-url <sheet> [--correction <md>] [--deltas <md> --original-run-date <date>]` writes `_district/<Month><Year>_Findings.md` + `.html`. It already produces every section below; only add prose the data cannot know. The sections, for reference: summary + status line; district totals table; per-school table (Enrollment Summary HC, P223 HC, gap, FTE, RS, TBIP, zero-FTE, RS flags); **critical findings** with per-student tables (student numbers only, never names); warnings (zero-FTE-in-headcount list, Enrollment Summary vs P223 gaps explained, Section Enrollment Audit findings per school); scope gaps (GVA/Fresh Start/CTP under PAP 5707 are NOT in the district batch — say so every month; RS vs TCC; ALE); collection gaps with the reason (e.g. Student Schedule Report privilege); what was collected (file inventory); next-steps table with an owner per row; tracking-sheet state.
   b. Convert to a Google Doc **in the month's Drive folder** (HTML import works; markdown extraction alone does not):
      ```bash
      uv run - <<'EOF'   # md → html (PEP 723: markdown)
      # /// script
      # dependencies = ["markdown"]
      # ///
      import markdown,pathlib; d=pathlib.Path.home()/"Enrollment/P223-<Month>-<Year>/_district"
      md=(d/"<Month><Year>_Findings.md").read_text()
      (d/"<Month><Year>_Findings.html").write_text("<html><head><meta charset='utf-8'></head><body>"+markdown.markdown(md,extensions=["tables"])+"</body></html>")
      EOF
      gws drive files create --params '{"supportsAllDrives":true,"fields":"id,webViewLink"}' \
        --json '{"name":"P223 <Month> <Year> - Findings and Review","mimeType":"application/vnd.google-apps.document","parents":["<month-folder-id>"]}' \
        --upload <path>/<Month><Year>_Findings.html --upload-content-type text/html
      ```
      Also upload the `.md` itself to the folder. Verify the doc rendered (`gws docs documents get` → headings + table count) before emailing a link to it.
   c. Fire the n8n notifications webhook with `event: collection_complete` — the same endpoint and token step 9 uses. n8n holds the recipient list, sends the email, and writes `FindingsDoc` (col L) + `CompletionEmailSent` (col M) on the month's `DistrictStatus` row. The skill never sends mail itself and never touches columns I/J here.
      ```bash
      curl -sf -X POST "https://n8n.psd401.net/webhook/enrollment-notify" \
        -H "X-Enrollment-Token: $ENROLLMENT_NOTIFY_TOKEN" -H "Content-Type: application/json" \
        -d '{"event":"collection_complete","month":"<Month YYYY>","countDate":"<YYYY-MM-DD>",
             "totals":{"headcount":<HC>,"fte":<FTE>},
             "findingsDocUrl":"<doc url>","folderUrl":"<month folder url>",
             "blockers":["<each finding that blocks EDS>"],
             "attention":["<each item needing review but not blocking>"],
             "runBy":"<machine/user>"}'
      ```
      Expect `{"success":true,"sheetUpdated":true}`. A 400 names the missing field. `findingsDocUrl` is required for this event; omitting `event` means `eds_submitted` and would mark the count as submitted — never do that here.
   d. Resolve the token in this order, in a script that never prints it: the `ENROLLMENT_NOTIFY_TOKEN` env var → the login Keychain (`security find-generic-password -a "$USER" -s ENROLLMENT_NOTIFY_TOKEN -w`; this is how operator machines hold it, see `references/machine-setup.md`) → the live workflow's `Validate Token and Payload` node via the n8n-manager `get_workflow.js` (admin machines only — needs `N8N_API_KEY`). If none resolves or the call fails, say so, leave column M blank, and hand the user the payload — never fake the send and never fall back to `gws gmail`.
   e. Verify `DistrictStatus!L<row>:M<row>` came back populated (URL + ISO timestamp with recipient count). First done live for September 2026 on 2026-09-09.
   f. **Building follow-ups (every run).** `findings_doc.py` also writes `_district/building_followups.json` (per school: folder link, students outside the P223 headcount with reasons, zero-FTE students, TK without FTE, Section Enrollment Audit conflicts). POST it to the same webhook with `event: building_followups` (add `month`, `countDate`, `totals`, `dueDate`, `runDate`, `findingsDocUrl`): n8n looks each school's contact up on the `Buildings` tab, sends one email per school (reply-to the enrollment officer, CC the internal list), then one summary to the internal list, and stamps `DistrictStatus!N` (`BuildingFollowupsSent`). Schools with no contact on the tab are named in the summary.
8. **STOP — Human reviews, signs, uploads to EDS**
9. After confirmation: trigger the same webhook with `event: eds_submitted` (or omit `event`) — marks `EDSSubmitted`/`NotificationsSent` (cols I/J) and emails the internal notification list — then update internal spreadsheets (ANNAVG, CNTRL, One Pager)

### `/enrollment run [month] rerun`

Re-collect a month that has already been collected — typically because corrections were entered after count day (missing Running Start overrides, unscheduled students) and the state numbers must be regenerated. **The original run is a retained audit record. Never overwrite or delete it.** A rerun is a second, parallel collection that lives beside the first.

- **RUN_LABEL** = `<Month YYYY> (run YYYY-MM-DD)` using today's date, e.g. `September 2026 (run 2026-09-18)`. It is the `Month` value on every tracker row the rerun writes, and the `month` field in the webhook payload, so n8n finds the rerun's own `DistrictStatus` row and the email subject carries the run date. No n8n change is needed.
- **Local staging**: `~/Enrollment/P223-<Month>-<Year>-run-<YYYYMMDD>/` (fresh folder).
- **Drive**: `drive_layout.py --month "<Month YYYY>" --run-date <today> --share` → `<Month YYYY>/Run <today>/{schools…, District}` — the same `Run <date>` convention as every run, so the month folder simply holds one `Run` folder per pull. Every upload in the rerun targets those folders; the original run's folder is untouched.
- **Tracker**: append a new `DistrictStatus` row with `Month` = RUN_LABEL and `CountDate` = the original count date before Phase 1; `SchoolStatus` rows use `Month` = RUN_LABEL. The Phase 2 DONE check counts only rows whose `Month` equals RUN_LABEL, so all 17 schools re-collect even though the original rows say complete.
- **Report parameters are identical to the original run** — same count date, same FTE windows, same report set. The P223 form is static and reflects the overrides as they stand today, which is the point of the rerun.
- **TK on its own count date** (Handbook §4.A lets a program's calendar set its count day; September 2026: K-12 on 9/8, TK on 9/22): run one extra district P223 pass with the TK date as Report Date + FTE Calculation Date, split it into its own folder (`~/Enrollment/P223-<Month>-<Year>-tk-<YYYYMMDD>/`), and give `eds_txt.py --tk-folder <that folder> --tk-date <YYYYMMDD>` so fields 223-225 come from it. Say so in the findings doc; the per-school form pages still show TK as of the K-12 date.
- **Phase 3 additions**: pull the original run's `_district/p223_totals.json` and `validation.json` from the month folder if they are not local, then run
  ```bash
  uv run <skill-dir>/scripts/compare_runs.py --before <orig>/_district --after <rerun>/_district --output <rerun>/_district/<Month><Year>_RerunDeltas.md
  ```
  and put its table in the findings doc under a section titled **"What changed since the <original date> run"** — every school with a bold row needs a one-line explanation. The doc title is `P223 <Month> <Year> - Findings and Review (Run <YYYY-MM-DD>)` and it lives in the run's folder root. Fire the completion webhook exactly as in step 7, with `month` = RUN_LABEL and the rerun subfolder as `folderUrl`.
- **Before starting**, state in one line why the rerun is happening and what is expected to change (e.g. "PHS Running Start overrides entered 9/17; expect PHS RS count > 0 and district FTE to move"). If the rerun's numbers do not move where expected, say so in the findings doc rather than silently reporting the new totals.

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
| `compare_runs.py` | rerun | Per-school deltas between an original run and a rerun of the same month (`_district` dirs) |

## Google Workspace Integration

Drive and Sheets access is provided by the shared `google-workspace-cli` skill (sibling skill — see its SKILL.md for per-machine auth setup).

Common operations used by enrollment:
```bash
# Read tracking sheet calendar
gws sheets +read --spreadsheet "1t10gPECTUd2s9kMrm2jsOIvMHKnRpTcbhJGq-hO7Yg0" --range 'Calendar!A1:G12'

# Append a school status row — use the raw API form: the +append helper has no
# tab/range flag and would append to the FIRST tab (Calendar), not SchoolStatus
gws sheets spreadsheets values append \
  --params '{"spreadsheetId":"1t10gPECTUd2s9kMrm2jsOIvMHKnRpTcbhJGq-hO7Yg0","range":"SchoolStatus!A1","valueInputOption":"RAW","insertDataOption":"INSERT_ROWS"}' \
  --json '{"values":[["September 2026","GHHS","HS","Y","1420","none","2026-09-08T14:02:11Z","mac-mini"]]}'

# Upload enrollment backup into the month folder (shared drive — the +upload helper
# cannot see shared-drive parents; use files create with supportsAllDrives)
gws drive files create --params '{"supportsAllDrives":true}' \
  --json '{"name":"GHHS_EnrollmentSummary_20260908.pdf","parents":["<month folder id>"]}' \
  --upload ./GHHS_EnrollmentSummary_20260908.pdf

# Create the monthly findings Google Doc in the month folder from HTML
gws drive files create --params '{"supportsAllDrives":true,"fields":"id,webViewLink"}' \
  --json '{"name":"P223 <Month> <Year> - Findings and Review","mimeType":"application/vnd.google-apps.document","parents":["<month folder id>"]}' \
  --upload ./<Month><Year>_Findings.html --upload-content-type text/html

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
- **Running Start rules (2026-27 OSPI Enrollment Handbook, read 2026-09-15)**: colleges report RS for **October–June only, so September RS is reported as zero** (any September RS FTE in PowerSchool is a FAIL); combined district+RS FTE ≤ **1.30** (FAIL; December/January WARN only, SQEAF); the high school's own share ≤ 1.00. `district_checks.py` and `eds_txt.py` enforce all of this
- **Expected-ALE schools** (`references/school-config.md`): HBHS is all-ALE for 2026-27. `district_checks.py` fails if PowerSchool disagrees and `eds_txt.py` marks the school's K-12 enrollment in the ALE fields regardless (Hagel, 2026-09-15: report them, fix PowerSchool later)
- **PowerSchool's EDS export is incomplete** — never upload `P223_*.txt` straight from PowerSchool. `eds_txt.py` rebuilds it (see Phase 3)
- **Bell schedules change yearly** — always pull live from PowerSchool, never hardcode. 2026-27: no bell schedule changes; the values in fte-rules.md stand (verified 2026-08-31).
- **P223 is static** — does not hold historical data. Running for a previous month requires restoring FTE overrides from backup.
- **Retain reports 4 years** after submission (OSPI audit requirement)
- **Never auto-submit to EDS** — always generate file + validation report for human review
- **Student List Export**: Always downloads as `~/Downloads/student.export.text` — move and rename immediately after each school
- **evaluate_script over UID clicks**: Use `evaluate_script` + `querySelector`/`getElementById` for all form interactions — snapshot UIDs are unreliable
- **Browser automation runs in the main session only** — subagents cannot access MCP tools
