# Report Checklist — Monthly P223 Enrollment

> Complete checklist organized by role: Building Level, then District Level.
> PowerSchool navigation paths included for browser automation.

## Building Level — Count Day Checklist

### Pre-Count (Before Count Day)

- [ ] Clean up data in PowerSchool
  - [ ] All attending students enrolled and assigned to classes
  - [ ] All withdrawn students exited
  - [ ] Section Enrollment Audit: System Reports > Membership and Enrollment > Section Enrollment Audit
  - [ ] (ES) Class Roster check: System Reports > Student/Staff Listings > Class Rosters (PDF)
- [ ] Check previous month for revisions
  - [ ] Re-run previous month Enrollment Summary with previous count date
  - [ ] Compare to saved report — if different, revision needed
- [ ] Follow up on previous part-time students for FTE changes
- [ ] (HS) Verify Running Start categorization and FTE overrides
- [ ] (HS) Verify Fresh Start Track=C and Program 40

### Count Day Reports

> **Pre-flight (once per machine — persists in the debug profile):** Disable "Ask where to save each file before downloading" at `brave://settings/downloads` — otherwise Student List Export triggers a native OS dialog on every school. Verify it's off before the first run on a new machine.
>
> **Save script**: `save_pdf.js` ships with the skill at `scripts/save_pdf.js` (relative to the skill directory). `<folder>` below = the local staging folder `~/Enrollment/P223-<Month>-<Year>/`. Every `bun .../save_pdf.js` reference below means the skill's copy — never a Desktop or per-month copy.

> **Session health check (before first report):** Verify the PS session is active. If `getStudents.txt` or any XHR returns HTTP 302 → `/admin/pw.html`, the session has expired and you must log back in before proceeding. Quick check:
> ```javascript
> // In evaluate_script — returns true if session is alive
> const r = await fetch('/admin/tech/notifications/json/activenotificationOther.json.html');
> return r.ok && !r.redirected; // false = session expired, must re-login
> ```

#### Report 0: P223 Form and Audit ⚑ PRIMARY DELIVERABLE
- **This is the report submitted to EDS. Run it first.**
- **RUN AT DISTRICT LEVEL — validated live 2026-08-31.** From District Office context, ONE `allSchools` run covers all 17 schools in under a minute (March's per-school approach took ~2 hours). The form has a single FTE-window setting, so count day needs **two district runs**:
  - Run A (elementary): `fiveDayWindow=0` (1-Day), `FTECalcDate` = count date → use its output for the 10 ES
  - Run B (secondary): `fiveDayWindow=1` (5-Day), `FTECalcDate` blank → use its output for the 7 MS/HS
  - Each ZIP contains: `WA_P223_Form.pdf` (**one page per school** — split per school by page at post-processing), `WA_P223_Audit.csv` (all schools, one file — filter per school), and a fixed-width state-format `P223_*.txt` (candidate EDS upload file — verify with the enrollment officer)
  - **Audit CSV school codes are 3-char** (GHH, KMS, MES, VGE, HBH…) — map before feeding the validator scripts, which use 4-char abbreviations
- **Form gotchas (learned live)**:
  - `schoolNumberSetSelectSchools` (hidden text field) accepts `allSchools` or **ONE school number** — a comma list like `3299,3685` fails at submit (`For input string`). Selecting options in the multi-select via JS does NOT update this field (synthetic change events don't fire PS's handler) — set the hidden field directly.
  - Submit button: `document.getElementById('submitReportSDKRuntimeParams').click()`
- **Path**: Data and Reporting > Reports > Compliance > P223 Form and Audit
- **URL**: `/admin/reports/compliance/p223form.html` **404s — do not use.** Navigate to `/admin/reports/statereports.html?repType=state` instead, then find the link via JS:
  ```javascript
  const links = [...document.querySelectorAll('a')];
  const p223 = links.find(l => l.textContent.includes('WA P-223 Form and Audit'));
  return p223.href; // use this URL to navigate
  ```
- **Form scroll**: The parameters section is below the fold in a custom scroll container — `window.scrollTo` does nothing. Use:
  ```javascript
  document.getElementById('content-main').scrollTop = 1200;
  ```
- **Prerequisites**: FTE overrides must be set before running (RS, Fresh Start, ALE, part-time students)
- **Parameters (ES)**: Report Date = Count Date, FTE Window = 1 Day, FTE Calc Date = Count Date, Calculate Elementary FTE = checked, Separate form per school = checked
- **Parameters (MS/HS)**: Report Date = Count Date, FTE Window = 5 Day, FTE Calc Date = **blank**, Calculate Elementary FTE = checked, Separate form per school = checked
- **Output**: ZIP file downloaded to `~/Downloads/WA_P223.zip` containing `WA_P223_Form.pdf` + `WA_P223_Audit.csv` — extract and rename:
  ```bash
  unzip -o ~/Downloads/WA_P223.zip WA_P223_Form.pdf WA_P223_Audit.csv -d /tmp/p223 \
    && mv /tmp/p223/WA_P223_Form.pdf <folder>/<SCHOOL>_P223Form_<date>.pdf \
    && mv /tmp/p223/WA_P223_Audit.csv <folder>/<SCHOOL>_P223Audit_<date>.csv \
    && rm ~/Downloads/WA_P223.zip
  ```
- **Queue polling — do NOT use `wait_for`** (chrome-devtools-mcp ≥1.8 returns a full page snapshot with every `wait_for`, which floods the context window — and `"Completed"` matches the always-present "Completed Reports" heading). Poll with an in-page fetch loop instead (validated 2026-08-31):
  ```javascript
  // evaluate_script, waitForStableDom: false
  async () => {
    for (let i = 0; i < 10; i++) {
      const txt = await (await fetch('/admin/reportqueue/prhome.html', {credentials:'same-origin'})).text();
      if (!/Pending|Running/.test(txt)) return 'done';
      await new Promise(r => setTimeout(r, 15000));
    }
    return 'still pending';
  }
  ```
  Then: newest `prdetails.html?reportId=<max id>` → its `prreport.html?jobQueueCurrentId=<id>&repName=WA_P223&repType=zip` link → `window.location.href = <link>` triggers the download. The queue page's rendered DOM goes stale — always re-fetch, never trust the last render.
- **Note**: P223 is static — does not hold historical data. If running after count day, use "Selected Students Only" with count-day selection.

#### Report 1: Enrollment Summary
- **URL**: `/admin/reports/mbaEnhancedEnrollmentSummary.html`
- **Parameters**: Set date field to Count Date, Students = All Active
- **JS pattern**: Tab key does NOT reliably trigger reload. The datepicker has a `lastVal` guard — must clear it first:
  ```javascript
  const input = document.querySelector('input.psDateWidget');
  const data = window.jQuery(input).data('datepicker');
  data.lastVal = null; // REQUIRED — onSelect skips if date already equals lastVal
  input.value = '03/02/2026';
  data.settings.onSelect.call(input, '03/02/2026', data);
  ```
- **wait_for**: Use `["Total In Grade"]` — this text only appears in the loaded data table, not in empty/loading states.
- **Save**: `bun <skill-dir>/scripts/save_pdf.js <folder>/<SCHOOL>_EnrollmentSummary_<date>.pdf "enrollment summary"`

#### Report 2: Student List Export
- **Path**: Start Page > select All students > lower-right dropdown > Export Using Template > Students
- **Template**: `(Dist) Enrollment - Monthly Backup Student List`
- **Parameters**: "The selected N students" radio
- **JS submit**: `document.getElementById('btnSubmit').click()`
- **Save**: File auto-downloads to `~/Downloads/student.export.text` → `mv ~/Downloads/student.export.text <folder>/<SCHOOL>_StudentListExport_<date>.txt`
- **Note**: No save dialog if "Ask where to save" is disabled in Brave settings (pre-flight step above)

#### Report 3: Class Attendance Audit
- **URL**: `/admin/reports_engine/report_w_param.html?ac=reports_get_using_ID;repo_ID=PSPRE_CLASS_AUDIT`
- **JS parameters**:
  ```javascript
  document.querySelectorAll('input[type="radio"]')[1].click(); // custom date range
  document.querySelector('input[name="param_startdate"]').value = '03/02/2026';
  document.querySelector('input[name="param_enddate"]').value = '03/02/2026';
  document.querySelector('select[name="Param_Teachers"]').options[0].selected = true; // ALL TEACHERS
  document.querySelector('input[name="param_cb1;1"]').checked = true; // Period 1 (ES)
  // MS/HS: also check param_cb2;1 through param_cb6;1
  document.getElementById('btnSubmit').click();
  ```
- **Poll**: Navigate to report queue → `wait_for(["Download Completed", "Download Pdf"])` — NOT `"Result File"` or `"Completed Reports"` (causes false positives)
- **Save**: Navigate to result PDF URL → `bun <skill-dir>/scripts/save_pdf.js <folder>/<SCHOOL>_ClassAttendanceAudit_<date>.pdf`

#### Report 4: Entry/Exit Report (run twice — previous month then current month)
- **URL**: `/admin/reports/CRB/enrollment/EntryExitReport.html`
- **JS parameters**:
  ```javascript
  document.getElementById('pause').checked = false;
  document.getElementById('showN').checked = true;  // Show Enrolled
  document.getElementById('showX').checked = true;  // Show Exited
  document.getElementById('m').value = '2';          // 2=Feb, 3=Mar, etc.
  document.getElementById('m').dispatchEvent(new Event('change', {bubbles: true}));
  // Report auto-refreshes — no submit button needed
  ```
- **Save**: `bun <skill-dir>/scripts/save_pdf.js <folder>/<SCHOOL>_EntryExit_<MonthYear>_<date>.pdf "entry"`
- **Run twice**: Once for previous month, once for current month
- **Validation**: Previous HC + Entries − Exits = Current HC per grade

#### Report 5: Consecutive Absence Report
- **URL**: `/admin/reports_engine/report_w_param.html?ac=reports_get_using_ID;repo_ID=PSPRE_ConsecAbsences`
- **JS parameters**:
  ```javascript
  const codes = document.querySelector('select[name="Param_Att_Codes"]');
  [...codes.options].forEach(o => o.selected = o.text.includes('ALL CODES'));
  document.querySelector('input[name="param_startdate"]').value = '01/30/2026'; // ~21 school days before 03/02
  document.querySelector('input[name="param_enddate"]').value = '03/02/2026';
  // CRITICAL: daysToScan defaults to 3 in some school contexts, not 20.
  // ALWAYS explicitly set it to 20:
  document.querySelector('input[name="daysToScan"]').value = '20';
  document.getElementById('btnSubmit').click();
  ```
- **CRITICAL**: The `daysToScan` field defaults to 3 (not 20) in some school contexts. ALWAYS explicitly set it to 20 via JS. After running, verify the report header says "Occurrences of 20 consecutive absences" not "Occurrences of 3 consecutive absences". If wrong, re-run with the explicit JS override.
- **Begin date guide**: Count ~21 school days back from count date. For March 2 count: use Jan 30 (accounts for Presidents Day holiday).
- **Poll**: Navigate to report queue → `wait_for(["Download Completed", "Download Pdf"])` — NOT `"Result File"` or `"Completed Reports"` (causes false positives)
- **Save**: Result is HTML → navigate to it → `bun <skill-dir>/scripts/save_pdf.js <folder>/<SCHOOL>_ConsecutiveAbsence_<date>.pdf`
- **Note (MS/HS)**: Run in two parts at term break (report is by class)

#### Report 6: Student Schedule Report (Secondary Only)
- **Path**: Start Page > Select "All" or "Gr" > lower-right dropdown > Student Schedule Report
- **Parameters**: Title = "[Month] [Year]", 3 students/page, Date = Count Date, Sort = Last Name, No Coloring
- **Save**: Print to PDF → `bun <skill-dir>/scripts/save_pdf.js <folder>/<SCHOOL>_StudentSchedule_<date>.pdf`

### Post-Count

- [ ] Run P223 Form and Audit (see p223-process.md for parameters)
- [ ] Complete Enrollment Reporting Template
  - [ ] Column 1: Headcount from Enrollment Summary
  - [ ] Column 2: FTE adjustments by grade level
  - [ ] Column 3: Reported FTE (HC - adjustment)
- [ ] List all adjusted-FTE students on bottom of report (ES/MS) or adjustment spreadsheet (HS)
- [ ] Have principal sign enrollment report
- [ ] File in building enrollment folder (retain 4 years)
- [ ] Send to District: Enrollment Summary, Consecutive Absence, Student Lists, Entry/Exit, FTE adjustment list, signed report

---

## District Level — Monthly Checklist

### Pre-Count

- [ ] Create backup folder: SY Enrollment > BACKUP > [Month] > ES, MS, HS subfolders
- [ ] Update Part Time Spreadsheet
  - [ ] Copy previous month to new tab, lock previous
  - [ ] Merge with Student Services PK/Itinerant spreadsheet
  - [ ] Run 20 consecutive days report, flag exclusions
  - [ ] Follow up on "watch attendance" students
  - [ ] Merge IAES students from Part Time to IAES coordinator spreadsheet
  - [ ] Run MS "less than full schedule" search (Schedule Search > Find Schedule Holes)
  - [ ] Pull Interdistrict Agreement list from Choice Transfer
  - [ ] Send each school their adjustment list for reconciliation

### Count Day

- [ ] Send Enrollment Count Day email reminders
- [ ] Run district-level backup: All schools > Export to (Dist) Enrollment-Monthly Withdraw List

#### Elementary (run under each school)
- [ ] Class Roster (verify teacher matches home_room)
- [ ] Section Enrollment Audit
- [ ] Enrollment Summary for count date
- [ ] Student List export + pivot table for K-5 class sizes
- [ ] Entry/Exit for current and previous months

#### Middle/High Schools
- [ ] Enrollment Summary for count date + student list export
- [ ] Entry/Exit for current and previous months
- [ ] Student Schedule as of count day

#### CTP
- [ ] Update CTP running list (EA drive > CTP folder)
- [ ] Search Track=B > Export template "(Student Services) P223H"
- [ ] Reconcile with CTP teachers
- [ ] Enter HC, adjustments, FTE on internal P223 (PAP tab)

### K-3 Class Size
- [ ] Update K5 CLASS SIZE spreadsheet from pivot tables
- [ ] Email to CFO and ES Asst Super EA
- [ ] Enter K-3 data into EDS > "K-3 Class Size" application
- [ ] Print backup, file in K5 Class Size Binder

### Open Doors (Fresh Start)
- [ ] Receive enrollment report from Fresh Start Retention Specialist
- [ ] Split HC, Non-Voc and Voc FTE by grade level
- [ ] Save to Shared Enrollment Google > Fresh Start
- [ ] Update "A Fresh Start Running List"
- [ ] Compare Fresh Start list vs PowerSchool (PAP > Track A export)
- [ ] Enter on internal P223 under PAP tab

### ALE FTE Reconciliation
- [ ] Copy/paste school data to working tabs
- [ ] Note HC and FTE for comparison
- [ ] Highlight GVA students (yellow), non-instructional sections (pink), RS students (separate color)
- [ ] Verify 1 HC per student, correct FTE
- [ ] Apply split-school FTE rules (see fte-rules.md)
- [ ] Verify RS + ALE combined FTE ≤ 1.20
- [ ] Extract CTE ALE sections (OCT135, OPE901)
- [ ] Send CTE ALE FTE report to CTE program
- [ ] Enter ALE into EDS application
- [ ] Enter ALE into internal P223 and internal ALE spreadsheet

### Running Start Reconciliation
- [ ] Compare TCC RS report against HS adjustment lists
- [ ] Verify combined district + RS FTE ≤ 1.20
- [ ] Check full-time GVA students against RS FTE
- [ ] January: complete SQEAF for semester-change students
- [ ] Update RSCNTRL spreadsheet (Academic/Vocational FTE by school, HC by grade)
- [ ] Back out full-time RS from headcount on internal P223

### Reconciling School Reports
- [ ] ES/MS: Compare Enrollment Summary to previous month backup (backdated exit check)
- [ ] Compare building adjustment lists to Part Time spreadsheet
- [ ] Verify HC matches Enrollment Summary (minus demo students)
- [ ] Verify adjustment math: HC - adjusted FTE = reported FTE

### TBIP
- [ ] Receive EL report from Student Services
- [ ] Enter EL numbers into internal P223 by school

### CTE
- [ ] Receive CTE report from CTE program
- [ ] Verify ALE FTE matches what was sent
- [ ] Enter CTE into internal P223 for secondary schools

### Enter into Internal P223
- [ ] Building HC and FTE (CTP on PAP tab)
- [ ] ALE HC and FTE by school
- [ ] Running Start: total HC, full-time HC, Non-Voc FTE, Voc FTE
- [ ] TBIP by K-5 / 7-12 / exited
- [ ] CTE FTE by 9-12 / 7-8
- [ ] Open Doors (PAP tab)
- [ ] Verify district totals match sum of school tabs

### Submit to EDS
- [ ] Enter monthly enrollment from school tabs
- [ ] Verify EDS district totals match internal P223
- [ ] Enter any revisions to previous months

### Post-Submission
- [ ] File hard copies of enrollment reports
- [ ] Update internal spreadsheets:
  - [ ] SY ANNAVG
  - [ ] SY CNTRL
  - [ ] One Pager
  - [ ] SY Enrollment Summary (ESC Budget)
  - [ ] Ready_Building History (Enrollment Projections)
- [ ] Email Board/Cabinet: count submitted + summary numbers
- [ ] Email Sodexo: CNTRL sheet (Food Services tab)
