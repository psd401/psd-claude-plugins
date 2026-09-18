# /// script
# requires-python = ">=3.11"
# dependencies = ["markdown"]
# ///
"""Write the monthly findings doc (markdown + styled HTML) from a collected month folder.

Usage:
  uv run findings_doc.py --folder ~/Enrollment/P223-September-2026 --date 20260908 --month "September 2026" \
      --due-date 2026-09-22 --run-date 2026-09-09 --run-folder-url <drive url> --tracking-url <sheet url> \
      [--correction correction.md] [--deltas deltas.md --original-run-date 2026-09-09] [--title "..."]
Reads _district/{validation.json, schools.json, p223_totals.json, eds_txt_changes.md, section_audit.json,
collection_gaps.json, summary_hc.json}. Writes _district/<Month><Year>_Findings.md and .html.
"""
import argparse, json, datetime
from pathlib import Path
import markdown

NAME = {"AES":"Artondale ES","DES":"Discovery ES","EES":"Evergreen ES","HHES":"Harbor Heights ES","MCES":"Minter Creek ES",
 "PIE":"Pioneer ES","PES":"Purdy ES","SWES":"Swift Water ES","VES":"Vaughn ES","VOY":"Voyager ES","GMS":"Goodman MS",
 "HRMS":"Harbor Ridge MS","KPMS":"Key Peninsula MS","Kopa":"Kopachuck MS","GHHS":"Gig Harbor HS","PHS":"Peninsula HS","HBHS":"Henderson Bay HS"}
CSS = """body{font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.45;max-width:1000px;margin:24px auto;padding:0 18px;color:#1f2937}
h1{font-size:24px;border-bottom:2px solid #1d4ed8;padding-bottom:6px}h2{font-size:19px;margin-top:30px;border-bottom:1px solid #d1d5db;padding-bottom:4px}h3{font-size:16px;margin-top:20px}
table{border-collapse:collapse;margin:10px 0}th,td{border:1px solid #cbd5e1;padding:4px 7px;text-align:left;vertical-align:top;font-size:13px}th{background:#eef2ff}
code{background:#f3f4f6;padding:1px 4px;border-radius:3px}.corr{border-left:5px solid #b91c1c;background:#fef2f2;padding:8px 14px;margin:14px 0}"""

def main():
    ap = argparse.ArgumentParser()
    for k in ("--folder","--date","--month","--due-date","--run-date","--run-folder-url","--tracking-url"): ap.add_argument(k, required=True)
    ap.add_argument("--correction"); ap.add_argument("--deltas"); ap.add_argument("--original-run-date"); ap.add_argument("--title")
    a = ap.parse_args(); F = Path(a.folder).expanduser(); D = F / "_district"
    V = json.load(open(D / "validation.json")); S = {s["code"]: s for s in json.load(open(D / "schools.json"))["schools"]}
    rows = {r["school"]: r for r in V["rows"]}; detail = V.get("detail", {})
    sec = json.load(open(D / "section_audit.json")) if (D / "section_audit.json").exists() else {}
    gaps = json.load(open(D / "collection_gaps.json")) if (D / "collection_gaps.json").exists() else []
    eds_changes = (D / "eds_txt_changes.md").read_text() if (D / "eds_txt_changes.md").exists() else ""
    checks = [c for s in S.values() for c in s["validation_results"]]
    fails = [c for c in checks if c["status"] == "FAIL"]; warns = [c for c in checks if c["status"] == "WARN"]
    cd = V["countDate"]; month = a.month; mon = month.split()[0]; yr = month.split()[1]
    T = lambda k: sum(S[c][k] for c in S)
    L = []; A = L.append
    A(f"# {a.title or f'P223 {month} — Findings and Review'}")
    A(""); A(f"**Count date:** {cd}  **Collected:** {a.run_date}  **State due date:** {a.due_date}  **Prepared:** {datetime.datetime.now():%Y-%m-%d %H:%M} Pacific  ")
    A(f"**Status:** {len(fails)} finding(s) block EDS submission; {len(warns)} warning(s). Nothing has been sent to EDS.")
    if a.correction:
        A(""); A('<div class="corr">'); A("**CORRECTION**"); A(""); A(Path(a.correction).read_text().strip()); A("</div>")
    A(""); A("## 1. Summary"); A("")
    A(f"All 17 schools were collected for the {cd} count. {V['counts']['checks']} automated checks ran: {V['counts']['pass']} passed, {V['counts']['warn']} warned, {V['counts']['fail']} failed.")
    if fails:
        A(""); A("Failures, in the order to work them:"); A("")
        for i, c in enumerate(fails, 1): A(f"{i}. **{NAME[c['school']]} — {c['name']}.** {c['message']}")
    A(""); A("## 2. District totals as collected"); A("")
    A("Sums of the 17 school P223 form pages. Global Virtual Academy, Fresh Start, and the Community Transition Program are under PAP 5707 and are not in the district batch (section 7)."); A("")
    A("| Metric | Value |"); A("|---|---|")
    A(f"| Total headcount (P223) | {sum(rows[c]['p223HC'] for c in S):,} |"); A(f"| Total FTE (P223) | {sum(rows[c]['p223FTE'] for c in S):,.2f} |")
    shc = [rows[c]['summaryHC'] for c in S if isinstance(rows[c]['summaryHC'], int)]
    A(f"| Enrollment Summary headcount ({len(shc)} schools) | {sum(shc):,} |")
    rs_ps = T("rs_in_powerschool"); rs_rep = T("rs_hc_total")
    A(f"| Running Start reported | {rs_rep} HC / {T('rs_nonvoc_fte'):.2f} non-voc / {T('rs_voc_fte'):.2f} voc" + (f" — PowerSchool holds RS FTE on {rs_ps} students; September RS is reported as zero by rule (Handbook 6.F)" if mon == "September" and rs_ps else "") + " |")
    A(f"| ALE | {T('ale_hc')} HC / {T('ale_fte'):.2f} FTE" + (f" — {', '.join(c for c in S if S[c].get('ale_marked_by_policy'))} marked all-ALE by district policy; PowerSchool sections are not yet flagged" if any(S[c].get('ale_marked_by_policy') for c in S) else "") + " |")
    A(f"| TK | {T('tk_hc')} HC / {T('tk_fte'):.2f} FTE ({T('tk_fte_zero')} TK students with 0.00 FTE) |")
    A(f"| CTE (vocational) FTE | {T('cte_fte'):.2f} total = {T('cte_fte_7_8'):.2f} grades 7-8 + {T('cte_fte_9_12'):.2f} grades 9-12 |")
    A(f"| TBIP | {T('tbip_k5')} K-6 / {T('tbip_7_12')} gr 7-12 / {T('tbip_exited')} exited / {T('tbip_tk')} TK |")
    A(f"| Open Doors | {T('open_doors_hc')} HC / {T('open_doors_nonvoc_fte'):.2f} non-voc / {T('open_doors_voc_fte'):.2f} voc |")
    A(""); A("## 3. Per-school results"); A("")
    A("Enrollment Summary counts every active student on the count date; the P223 headcount excludes pre-K and TK (TK is reported in its own fields). The students making up each gap are listed by school in section 5.1."); A("")
    A("| School | Enrollment Summary HC | P223 HC | Gap | P223 FTE | RS in PS | ALE HC | TK HC / FTE | CTE 7-8 | CTE 9-12 | TBIP | Zero-FTE in HC |"); A("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for c in S:
        r = rows[c]; s = S[c]; g = (r['summaryHC'] - r['p223HC']) if isinstance(r['summaryHC'], int) else ""
        A(f"| {NAME[c]} ({c}) | {r['summaryHC'] if r['summaryHC'] is not None else ''} | {r['p223HC']} | {g} | {r['p223FTE']:.2f} | {s['rs_in_powerschool']} | {s['ale_hc']} | {s['tk_hc']} / {s['tk_fte']:.2f} | {s['cte_fte_7_8']:.2f} | {s['cte_fte_9_12']:.2f} | {s['tbip_k5']+s['tbip_7_12']} | {r['zeroFTE']} |")
    A(""); A("Integrity check: at every school the audit rows flagged for headcount equal the form headcount and the audit FTE equals the form FTE to the cent."
      if all(c['status']=='PASS' for c in checks if c['name'].startswith('P223 form vs audit')) else "**Integrity check failed at one or more schools — see section 4.**")
    A(""); A("## 4. Critical findings"); A("")
    if not fails: A("None.")
    for i, c in enumerate(fails, 1):
        A(f"### 4.{i} {NAME[c['school']]}: {c['name']}"); A(""); A(c["message"]); 
        if c["details"]: A(""); [A(f"- {d}") for d in c["details"]]
        A("")
    A("## 5. Warnings and lists for the buildings"); A("")
    A("### 5.1 Students outside the P223 headcount, by school"); A("")
    A("These make up the gap between the Enrollment Summary and the P223 headcount. Send each school its own list. TK and pre-K are expected; \"not in P223 audit\" and \"excluded\" rows need a look."); A("")
    for c in S:
        gl = detail.get(c, {}).get("gap", [])
        if not gl: continue
        A(f"**{NAME[c]} ({len(gl)}):** " + "; ".join(f"{g['id']} (gr {g['grade']}, {g['reason']})" for g in gl)); A("")
    A("### 5.2 Other warnings"); A("")
    for c in warns:
        if c["name"].startswith("Enrollment Summary vs P223"): continue
        A(f"- **{NAME[c['school']]} — {c['name']}.** {c['message']}" + (" Students: " + ", ".join(c["details"]) if c["details"] else ""))
    A(""); A("### 5.3 Section Enrollment Audit findings"); A("")
    for c in S: A(f"- **{NAME[c]}:** {sec.get(c, 'no conflicts identified')}")
    A(""); A("## 6. EDS upload file"); A("")
    A("PowerSchool's own state-format export is incomplete (verified against the OSPI 2026-27 User Guide §M): it never emits TK (fields 223-225) or Open Doors (218-220) and writes zeros for Running Start (163-167), and each run carries one FTE window. "
      "The run builds the upload file from the two runs (elementary from the 1-day run, secondary from the 5-day run) and fills those fields from the audit extract. K-12 totals in the file are asserted against the form pages.")
    if eds_changes: A(""); A("\n".join(eds_changes.splitlines()[4:]))
    A(""); A("## 7. Scope gaps"); A("")
    A("- **GVA, Fresh Start, and CTP** live under PAP 5707, which is not in the PowerSchool school picker, so they are not in the district batch. Collect and reconcile them separately; ALE must also be restated in the SAFS ALE application by program and home district (User Guide, SAFS ALE section).")
    A("- **Running Start reconciliation** against the college's P-223RS report runs when the report arrives (`/enrollment rs`)." + (" Not applicable in September: RS is reported October-June." if mon == "September" else ""))
    for g in gaps: A(f"- {g}")
    A(""); A("## 8. What was collected"); A("")
    A(f"Drive: **{a.run_folder_url}** — one subfolder per school (share a school's folder with that building) plus `District` for the two P223 runs, the EDS file, this document's sources, and the validation JSON. Per school: P223 form page and audit extract, Enrollment Summary, Entry/Exit for the previous and current month, Consecutive Absence, Class Attendance Audit, Student List export, Section Enrollment Audit, and at secondary the Student Schedule Report when collected.")
    if a.deltas:
        A(""); A(f"## 9. What changed since the {a.original_run_date} run"); A(""); A(Path(a.deltas).read_text().strip())
    A(""); A("## Next steps"); A(""); A("| # | Action | Owner |"); A("|---|---|---|")
    n = 0
    for c in fails: n += 1; A(f"| {n} | {NAME[c['school']]}: {c['name']} — {c['message'][:90]} | Registrar / enrollment officer |")
    n += 1; A(f"| {n} | Send each building its section 5.1 list and its section 5.3 conflicts | Enrollment officer |")
    n += 1; A(f"| {n} | Collect GVA / Fresh Start / CTP; restate ALE in the SAFS ALE application | Enrollment officer |")
    n += 1; A(f"| {n} | Review the EDS file (section 6), upload by {a.due_date}, then tell Claude \"EDS is submitted for {month}\" | Enrollment officer |")
    A(""); A(f"## Tracking"); A(""); A(f"Tracking sheet: {a.tracking_url}. Rows for every school on `SchoolStatus`; the district row on `DistrictStatus` carries the findings doc link and the completion email timestamp.")
    md = "\n".join(L); base = D / f"{mon}{yr}_Findings"
    base.with_suffix(".md").write_text(md)
    html = f"<!doctype html><html><head><meta charset='utf-8'><title>{a.title or f'P223 {month} - Findings and Review'}</title><style>{CSS}</style></head><body>{markdown.markdown(md, extensions=['tables','md_in_html'])}</body></html>"
    base.with_suffix(".html").write_text(html); print(base.with_suffix(".md"), "|", len(L), "lines")
    # per-school follow-up payload for the n8n building_followups event (addresses are looked up by n8n)
    layout = json.load(open(D / "drive_layout.json")) if (D / "drive_layout.json").exists() else {"folders": {}}
    fol = []
    for c in S:
        s = S[c]; chk = {x["name"]: x for x in s["validation_results"]}
        gl = detail.get(c, {}).get("gap", [])
        zero = chk.get("Zero-FTE students included in headcount", {}).get("details", [])
        tk0 = chk.get("TK students without FTE", {}).get("details", [])
        items = []
        if gl: items.append({"title": "Students on your Enrollment Summary but outside the P223 headcount", "lines": [f"{g['id']} (gr {g['grade']}) — {g['reason']}" for g in gl], "ask": "TK and pre-K are expected. Students marked 'excluded' are Running Start (college-only) or Open Doors students that PowerSchool leaves out of the building headcount on purpose; for them, only confirm the Student Type is right. For any other student, confirm the enrollment and schedule are correct in PowerSchool."})
        if zero: items.append({"title": "Students in headcount with 0.00 FTE", "lines": zero, "ask": "Each of these has no section generating minutes on the count date. Add the schedule or confirm the student should not be enrolled."})
        if tk0: items.append({"title": "TK students with 0.00 FTE", "lines": tk0, "ask": "No TK section generated minutes on the count date."})
        if sec.get(c): items.append({"title": "Section Enrollment Audit", "lines": [sec[c]], "ask": "Fix in PowerSchool (students not in any class, or course dates that do not match the enrollment date)."})
        fol.append({"school": c, "schoolName": NAME[c], "folderUrl": ("https://drive.google.com/drive/folders/" + layout["folders"][c]) if c in layout.get("folders", {}) else a.run_folder_url, "items": items})
    (D / "building_followups.json").write_text(json.dumps({"month": month, "countDate": cd, "dueDate": a.due_date, "runDate": a.run_date, "findingsDocUrl": "", "schools": fol}, indent=1))
    print("building_followups.json:", len(fol), "schools,", sum(len(x["items"]) for x in fol), "items")

if __name__ == "__main__":
    main()
