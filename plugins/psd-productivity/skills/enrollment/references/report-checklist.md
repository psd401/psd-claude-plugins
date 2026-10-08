# Report Checklist — Monthly P223 Enrollment

> Complete checklist organized by role: Building Level, then District Level.
> PowerSchool navigation paths included for browser automation.

## Building Level — Count Day Checklist

### Pre-Count (Before Count Day)

- [ ] Clean up data in PowerSchool
  - [ ] All attending students enrolled and assigned to classes
  - [ ] All withdrawn students exited
  - [ ] Section Enrollment Audit: System Reports > Membership and Enrollment > Section Enrollment Audit — direct URL `/admin/tech/checkclassdates.html` (renders immediately for the current school, no submit; save with the page serializer as `<SCHOOL>_SectionEnrollmentAudit_<date>`)
  - [ ] (ES) Class Roster check: System Reports > Student/Staff Listings > Class Rosters (PDF)
- [ ] Check previous month for revisions
  - [ ] Re-run previous month Enrollment Summary with previous count date
  - [ ] Compare to saved report — if different, revision needed
- [ ] Follow up on previous part-time students for FTE changes
- [ ] (HS) Verify Running Start categorization and FTE overrides
- [ ] (HS) Verify Fresh Start Track=C and Program 40

### Count Day Reports

> **Browser (since 2026-10-08):** everything below runs through the **Claude in Chrome** extension in the operator's own Chrome — `tabs_context_mcp` first, then `navigate` + `javascript_tool` in that tab. The rules that matter: return small JSON (never hrefs — URL-like results come back as `[BLOCKED: Cookie/query string data]`), keep one call under ~40 s and never across a navigation (trigger the navigation last, `computer` `wait` 3–5 s, then poll `document.readyState === 'complete'` plus the element you need), and never `read_page`/screenshot inside the loop. Details in the browser-control skill.
>
> **Pre-flight (once per machine — persists in Chrome):** `chrome://settings/downloads` → "Ask where to save each file before downloading" **off**; `chrome://settings/content/automaticDownloads` → the PowerSchool host under "Allowed to automatically download multiple files" (otherwise Chrome silently drops every scripted download after the first one). Verify both before the first run on a new machine.
>
> **Save pattern**: there is no print-to-PDF. Rendered report pages (Enrollment Summary, Entry/Exit, Consecutive Absence result, Section Enrollment Audit, Student Schedule Report) are saved with the **page serializer** below: in-page JavaScript that strips the PowerSchool chrome and hidden elements, inlines a small stylesheet, and downloads a self-contained `<name>.html` to `~/Downloads`; then `mv` it into `<folder>` (= the local staging folder `~/Enrollment/P223-<Month>-<Year>/`). On upload, those `.html` files become **Google Docs** (`mimeType: application/vnd.google-apps.document`, `--upload-content-type text/html`, name without the extension) so the building reads them in Drive — Drive previews a raw `.html` as source code. This includes the Student Schedule Report: a 3.4 MB, 509-table page converted with every table intact (validated 2026-10-08). The only PDFs are PowerSchool's own: the P223 form page and the Class Attendance Audit.
>
> ```javascript
> // javascript_tool — SAVE PAGE: serialize the rendered report and download it as <name>.html (validated 2026-10-08)
> await (async (name) => {
>   const root = document.querySelector('#content-main') || document.body;
>   const hidden = [];
>   for (const el of root.querySelectorAll('*')) { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') { el.setAttribute('data-psd-hide', ''); hidden.push(el); } }
>   const clone = root.cloneNode(true); hidden.forEach(el => el.removeAttribute('data-psd-hide'));
>   clone.querySelectorAll('[data-psd-hide], script, noscript, iframe, style, link, svg, img, button').forEach(e => e.remove());
>   clone.querySelectorAll('input, select, textarea').forEach(e => { const s = document.createElement('span'); if (e.tagName === 'SELECT') s.textContent = e.selectedOptions[0]?.text ?? ''; else if (e.type === 'checkbox' || e.type === 'radio') s.textContent = e.checked ? '[x]' : '[ ]'; else if (['submit', 'button', 'hidden'].includes(e.type)) s.textContent = ''; else s.textContent = e.value; e.replaceWith(s); });
>   const school = document.getElementById('school_picker_adminSchoolPicker_toggle_btn')?.textContent.trim().replace(/\s+/g, ' ') ?? '';
>   const css = 'body{font:10pt Arial,Helvetica,sans-serif;margin:24px} h2{font-size:14pt;margin:0 0 4px} .psd-meta{color:#555;font-size:9pt;margin:0 0 12px} table{border-collapse:collapse;margin:6px 0} td,th{border:1px solid #999;padding:2px 5px;vertical-align:top} th{background:#eee}';
>   const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + name + '</title><style>' + css + '</style></head><body><h2>' + name + '</h2><p class="psd-meta">' + school + ' — ' + document.title + ' — ' + location.pathname + ' — saved ' + new Date().toISOString() + '</p>' + clone.innerHTML + '</body></html>';
>   const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], {type: 'text/html'})); a.download = name + '.html'; document.body.appendChild(a); a.click(); a.remove();
>   return JSON.stringify({name, bytes: html.length, tables: clone.querySelectorAll('table').length});
> })('<SCHOOL>_<Report>_<date>')
> ```
> Then `mv ~/Downloads/<SCHOOL>_<Report>_<date>.html <folder>/`. Upload (shared drive, converted to a Google Doc):
> ```bash
> gws drive files create --params '{"supportsAllDrives":true,"fields":"id"}' \
>   --json '{"name":"<SCHOOL>_<Report>_<date>","mimeType":"application/vnd.google-apps.document","parents":["<school folder id>"]}' \
>   --upload <folder>/<SCHOOL>_<Report>_<date>.html --upload-content-type text/html
> ```

> **School switching (validated 2026-09-09):** the header school picker is an Angular widget. Open it with `document.getElementById('school_picker_adminSchoolPicker_toggle_btn').click()`, then click the school's `<li role="menuitem">` inside `#school_choices` (match by name text). The page reloads in the new school context (session-wide — every tab follows). Verify with the picker label text before running reports.
>
> **Report-engine result files (validated 2026-09-09, re-validated through the extension 2026-10-08):** the System queue is `/admin/reportqueue/home.html` (ReportWorks is `prhome.html`). Before submitting, record the baseline = the highest `report_batch_jobID` on the queue page; after submitting, poll with an in-page `fetch` + `DOMParser` for rows whose job id is above the baseline **and** whose text carries this report's name and this school's 3-char code (otherwise you download the previous school's report). Result URLs are `/admin/reportqueue/ClassAttendanceAudit.pdf?ac=report_batch_getresult&report_batch_jobID=<id>` (PDF) and `/admin/reportqueue/PSPRE_ConsecAbsences.html?ac=report_batch_getresult&report_batch_jobID=<id>` (HTML) — build them from the job id; never return the href. For PDF results, do NOT navigate (Chrome opens its viewer) — `fetch` the URL in-page, wrap it in a Blob, and click an `<a download="<SCHOOL>_<Report>_<date>.pdf">`; the file lands in `~/Downloads`, then `mv` it. For HTML results, navigate the tab to the URL and run the page serializer.
> ```javascript
> // javascript_tool — BASELINE (before submit)
> await fetch('/admin/reportqueue/home.html', {credentials: 'same-origin'}).then(r => r.text()).then(t => JSON.stringify({baseline: Math.max(0, ...[...t.matchAll(/report_batch_jobID=(\d+)/g)].map(m => +m[1]))}))
> // javascript_tool — POLL (one call ≤ 40 s; repeat until done:true, then pick the row for this report + school code)
> await (async (baseline) => { for (let i = 0; i < 6; i++) { const t = await (await fetch('/admin/reportqueue/home.html', {credentials: 'same-origin'})).text(); const doc = new DOMParser().parseFromString(t, 'text/html'); const rows = [...doc.querySelectorAll('tr')].map(tr => { const a = [...tr.querySelectorAll('a')].find(a => /report_batch_jobID=(\d+)/.test(a.href)); return a ? {id: +a.href.match(/report_batch_jobID=(\d+)/)[1], text: tr.textContent.replace(/\s+/g, ' ').trim().slice(0, 120)} : null; }).filter(r => r && r.id > baseline); if (rows.length && rows.every(r => !/Pending|Running|Queued/i.test(r.text))) return JSON.stringify({done: true, rows}); await new Promise(r => setTimeout(r, 5000)); } return JSON.stringify({done: false}); })(<baseline>)
> ```
>
> **Session health check (before first report):** Verify the PS session is active. If any XHR returns HTTP 302 → `/admin/pw.html`, the session has expired and a person must log back in before proceeding — the automation never logs in. Quick check:
> ```javascript
> // javascript_tool — true if the session is alive, false = expired (a person logs in)
> await fetch('/admin/tech/notifications/json/activenotificationOther.json.html').then(r => r.ok && !r.redirected)
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
- **Queue polling** — never a page snapshot: poll ReportWorks with an in-page fetch loop (validated 2026-08-31; one call ≤ 40 s, repeat until `done`):
  ```javascript
  // javascript_tool — before submit, record the newest ReportWorks id (baseline)
  await fetch('/admin/reportqueue/prhome.html', {credentials: 'same-origin'}).then(r => r.text()).then(t => JSON.stringify({baseline: Math.max(0, ...[...t.matchAll(/prdetails\.html\?reportId=(\d+)/g)].map(m => +m[1]))}))
  // javascript_tool — poll (repeat the call until done:true and newest > baseline)
  await (async () => { for (let i = 0; i < 3; i++) { const t = await (await fetch('/admin/reportqueue/prhome.html', {credentials: 'same-origin'})).text(); if (!/Pending|Running/.test(t)) return JSON.stringify({done: true, newest: Math.max(0, ...[...t.matchAll(/prdetails\.html\?reportId=(\d+)/g)].map(m => +m[1]))}); await new Promise(r => setTimeout(r, 10000)); } return JSON.stringify({done: false}); })()
  // javascript_tool — download: the zip link is URL-like, so navigate from inside the script instead of returning it (validated 2026-10-08)
  await (async (id) => { const det = await (await fetch('/admin/reportqueue/prdetails.html?reportId=' + id, {credentials: 'same-origin'})).text(); const m = det.match(/prreport\.html\?[^"']*repType=zip[^"']*/); if (!m) return JSON.stringify({zip: false}); setTimeout(() => { window.location.href = '/admin/reportqueue/' + m[0].replace(/&amp;/g, '&'); }, 300); return JSON.stringify({zip: true}); })(<newest>)
  ```
  The ZIP lands as `~/Downloads/WA_P223.zip` (the tab stays where it is). The queue page's rendered DOM goes stale — always re-fetch, never trust the last render.
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
- **Readiness**: after `navigate`, poll until `window.jQuery(document.querySelector('input.psDateWidget')).data('datepicker')` exists before running the snippet above (the datepicker initializes after load; validated 2026-10-08). Then poll `document.body.innerText.includes('Total In Grade')` — that text only appears in the loaded data table.
- **Save**: page serializer → `<SCHOOL>_EnrollmentSummary_<date>` (`.html` locally, Google Doc in Drive)

#### Report 2: Student List Export
- **Path**: Start Page > select All students > lower-right dropdown > Export Using Template > Students
- **Template**: `(Dist) Enrollment - Monthly Backup Student List`
- **Parameters**: "The selected N students" radio
- **Automation path (validated 2026-09-09)**: on the Start Page (school context set) click the Angular "All" link (`[...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'All').click()`) → selection count appears → click `#selectedFunctionButtonStudent` (the split button whose current function is "Export Using Template"; falls through to `/admin/importexport/exportusingtemplate/home.html`) → set `#filenum` to `1` (Students) and dispatch `change` (navigates to `export.html`) → set `#utableid` to `351` ("(Dist) Enrollment-Monthly Backup Student List") → **click** `input[name="DOTHISFOR"][value="selected"]` (the default radio is a single student, not the selection!) → `document.getElementById('btnSubmit').click()`. Other useful template ids: `352` = "(Dist) Enrollment-MonthlyWithdraw List".
- **JS submit**: `document.getElementById('btnSubmit').click()`
- **Save**: File auto-downloads to `~/Downloads/student.export.text` → `mv ~/Downloads/student.export.text <folder>/<SCHOOL>_StudentListExport_<date>.txt`
- **Note**: No save dialog if "Ask where to save" is disabled in Chrome settings (pre-flight step above)

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
- **Poll**: BASELINE before submit, then the POLL snippet (top of this section) until the row for "Class Attendance Audit" + this school's code is complete; take its job id
- **Save** (PDF — fetch in-page, never navigate):
  ```javascript
  // javascript_tool
  await (async (job, name) => { const b = await (await fetch('/admin/reportqueue/ClassAttendanceAudit.pdf?ac=report_batch_getresult&report_batch_jobID=' + job, {credentials: 'same-origin'})).blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); return JSON.stringify({bytes: b.size}); })(<job>, '<SCHOOL>_ClassAttendanceAudit_<date>.pdf')
  ```
  then `mv ~/Downloads/<SCHOOL>_ClassAttendanceAudit_<date>.pdf <folder>/`

#### Report 4: Entry/Exit Report (run twice — previous month then current month)
- **URL**: `/admin/reports/CRB/enrollment/EntryExitReport.html`
- **JS parameters** (revalidated 2026-09-09 — the page's inline script keeps an internal pause flag `p=1` that only the checkbox's OWN change handler flips; setting `.checked` by property leaves results hidden forever):
  ```javascript
  const pause = document.getElementById('pause'), showN = document.getElementById('showN'), showX = document.getElementById('showX'), m = document.getElementById('m');
  m.value = '9'; m.dispatchEvent(new Event('change', {bubbles: true}));            // 9=Sep, 10=Oct … 6=Jun
  pause.checked = true;  pause.dispatchEvent(new Event('change', {bubbles: true}));
  showN.checked = true;  showN.dispatchEvent(new Event('change', {bubbles: true})); // Show Enrolled
  showX.checked = true;  showX.dispatchEvent(new Event('change', {bubbles: true})); // Show Exited
  pause.checked = false; pause.dispatchEvent(new Event('change', {bubbles: true})); // un-pausing fires loadResults()
  // then poll: document.getElementById('results').querySelectorAll('tr').length > 1
  // header row reads "Students Enrolled at <School> in <Month> of the 2026-2027 school year" — check the year
  ```
- **Save**: page serializer → `<SCHOOL>_EntryExit_<MonthYear>_<date>` (`.html` locally, Google Doc in Drive)
- **Run twice**: Once for previous month, once for current month
- **Validation**: Previous HC + Entries − Exits = Current HC per grade

#### Report 5: Consecutive Absence Report
- **URL**: `/admin/reports_engine/report_w_param.html?ac=reports_get_using_ID;repo_ID=PSPRE_ConsecAbsences`
- **Attendance codes (enrollment officer, 2026-10-08)**: every code **except the partial-day codes TDY, TDX, LU, LVE, LBR and OTH** — those mark a student who was in the building for part of the day, and with "ALL CODES" the report listed them as absent. `Param_Att_Codes` is a `<select multiple>`; "ALL CODES" is one option whose value is the comma-joined list of every code id, and each code is its own option (`<id>|<CODE> (<description>)`), so select every option that is not ALL CODES and not on the exclusion list. The form only renders the code list in a **school** context (empty at District Office). Validated live at AES on the October window: the result header read `Code(s): ACT,AES,CUT,EXC,EXDN,EXP,HDE,HMBD,HOS,IHS,ILL,INX,P,SUS,UNV,UNX,VAC`.
- **JS parameters** (after `navigate`, poll until `select[name="Param_Att_Codes"]` exists):
  ```javascript
  // javascript_tool
  (() => {
    const EXCLUDE = ['TDY', 'TDX', 'LU', 'LVE', 'LBR', 'OTH'];
    const sel = document.querySelector('select[name="Param_Att_Codes"]');
    const picked = [];
    [...sel.options].forEach(o => { const code = o.text.trim().split(/\s+/)[0].toUpperCase(); o.selected = !/ALL CODES/i.test(o.text) && !EXCLUDE.includes(code); if (o.selected) picked.push(code); });
    document.querySelector('input[name="param_startdate"]').value = '09/02/2026'; // first day of school
    document.querySelector('input[name="param_enddate"]').value = '10/01/2026';   // count date
    document.querySelector('input[name="daysToScan"]').value = '20';              // CRITICAL — see below
    setTimeout(() => document.getElementById('btnSubmit').click(), 200);
    return JSON.stringify({picked, excluded: EXCLUDE});
  })()
  ```
  `picked` must list every code except the six (and never `ALL`). Record the BASELINE before this call.
- **CRITICAL**: The `daysToScan` field defaults to 3 (not 20) in some school contexts. ALWAYS explicitly set it to 20 via JS. After running, verify the report header says "Occurrences of 20 consecutive absences" not "Occurrences of 3 consecutive absences", and that its `Code(s):` list contains none of TDY, TDX, LU, LVE, LBR, OTH. If wrong, re-run with the explicit JS override.
- **Begin date**: the first day of school (2026-27: 09/02/2026) so the scan covers every school day through the count date.
- **Poll**: the POLL snippet (top of this section) until the "Consecutive Absences" row for this school's code is complete; take its job id
- **Read + save**: navigate the tab to `/admin/reportqueue/PSPRE_ConsecAbsences.html?ac=report_batch_getresult&report_batch_jobID=<job>`, then
  ```javascript
  // javascript_tool — student numbers only (never return names); secondary lists one row per section, so dedupe
  (() => { const t = document.body.innerText.replace(/\s+/g, ' '); const after = t.split('Last Date #')[1] || ''; return JSON.stringify({header: (t.match(/Occurrences of \d+ consecutive absences/) || [''])[0], codes: (t.match(/Code\(s\): ([A-Z,]+)/) || ['', ''])[1], ids: [...new Set(after.match(/\b\d{7}\b/g) || [])]}); })()
  ```
  then the page serializer → `<SCHOOL>_ConsecutiveAbsence_<date>` (`.html` locally, Google Doc in Drive). Per listed student, append `{id, grade, first, last, days}` to `_district/consec_abs.json` under the school code (grade/dates from the row text, read by id).
- **Note (MS/HS)**: Run in two parts at term break (report is by class)

#### Report 6: Student Schedule Report (Secondary Only)
- **Privilege**: granted to the PSD Enrollment account 2026-10-08 (it was blocked at all 7 secondary schools for September and October). Validated live at GMS the same day: 509 students, 3.8 MB of HTML, ~10 s to render.
- **URL**: `/admin/reports/studschedmatrixprefs.html` (school context set). "Students to scan" is fixed to all currently enrolled students — no Start Page selection needed.
- **JS parameters** (after `navigate`, poll until `document.forms[0]` has `btnSubmit`; field names are `UF-…` ids, so address them by their labels' order):
  ```javascript
  // javascript_tool — the form posts to studschedmatrix.html with target=_blank; force it into this tab
  (() => { const f = document.forms[0]; const el = n => [...f.elements].filter(e => e.name === n);
    el('UF-0090022787')[0].value = '<SCHOOL> Student Schedule Report <Month YYYY>';   // Report Title
    el('UF-0090022788')[0].value = '3';                                               // Max Students per Page
    el('UF-0090022789').find(r => r.value.startsWith('lastfirst')).checked = true;    // Sort Order = Last Name
    el('UF-0090022786')[0].value = '<MM/DD/YYYY count date>';                         // Include Active Enrollments As Of
    el('UF-0090022792').find(r => r.value === 'none').checked = true;                 // Color Sections By: none
    f.target = '_self'; setTimeout(() => f.querySelector('#btnSubmit').click(), 200); return JSON.stringify({submitting: true}); })()
  ```
  Leave "Show Dropped Enrollments in Separate List" and "Bell Schedule" at their defaults. If the `UF-…` names differ on a page, map them by the label in the same table row (Report Title, Max Students per Page, Sort Order, Include Active Enrollments As Of, Color Sections By).
- **Readiness**: `computer` `wait` 10 s, then poll `location.pathname.includes('studschedmatrix.html') && document.readyState === 'complete'` (≤ 35 s per call). Sanity: `new Set(document.body.innerText.match(/\b\d{7}\b/g)).size` ≈ the school's enrollment.
- **Save**: page serializer → `<SCHOOL>_StudentSchedule_<date>` (`.html` locally, Google Doc in Drive — a 509-student page converts with all tables).

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
- [ ] Verify RS + ALE combined FTE ≤ 1.30
- [ ] Extract CTE ALE sections (OCT135, OPE901)
- [ ] Send CTE ALE FTE report to CTE program
- [ ] Enter ALE into EDS application
- [ ] Enter ALE into internal P223 and internal ALE spreadsheet

### Running Start Reconciliation
- [ ] Compare TCC RS report against HS adjustment lists
- [ ] Verify combined district + RS FTE ≤ 1.30 (high school share ≤ 1.00; none in September)
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
- [ ] Internal "count submitted" confirmation to the enrollment notification list (automated via the n8n webhook; no other groups are emailed — Hagel, 2026-09-09)
