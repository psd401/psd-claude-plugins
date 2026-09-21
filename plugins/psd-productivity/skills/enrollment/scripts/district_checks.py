# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""District-wide validation over a month's collected folder.

Usage:
  uv run district_checks.py --folder ~/Enrollment/P223-September-2026 --date 20260908 \
      --month "September 2026" [--rs-cap 1.30] [--expected-ale HBHS]

Reads <folder>/<ABBR>_P223Audit_<date>.csv, <ABBR>_StudentListExport_<date>.txt,
_district/p223_totals.json, _district/summary_hc.json ({"AES": 394, ...}, written by the run),
and the two PowerSchool state files. Writes _district/validation.json and _district/schools.json
(the input for validation_report.py, with every check attached).

Rules (2026-27 OSPI Enrollment Handbook): Running Start is reported October-June only, so any RS
FTE in September FAILS; combined district+RS FTE <= 1.30 (FAIL, or WARN in December/January);
the high school share <= 1.00; expected-ALE schools must show ALE HC == K-12 HC.
"""
import argparse, csv, json, re
from collections import Counter, defaultdict
from pathlib import Path

NAME = {"AES":("Artondale ES","ES"),"DES":("Discovery ES","ES"),"EES":("Evergreen ES","ES"),"HHES":("Harbor Heights ES","ES"),
 "MCES":("Minter Creek ES","ES"),"PIE":("Pioneer ES","ES"),"PES":("Purdy ES","ES"),"SWES":("Swift Water ES","ES"),
 "VES":("Vaughn ES","ES"),"VOY":("Voyager ES","ES"),"GMS":("Goodman MS","MS"),"HRMS":("Harbor Ridge MS","MS"),
 "KPMS":("Key Peninsula MS","MS"),"Kopa":("Kopachuck MS","MS"),"GHHS":("Gig Harbor HS","HS"),"PHS":("Peninsula HS","HS"),
 "HBHS":("Henderson Bay HS","HS")}
GMAP = {"Kindergarten":"K","First Grade":"1","Second Grade":"2","Third Grade":"3","Fourth Grade":"4","Fifth Grade":"5",
        "Sixth Grade":"6","Seventh Grade":"7","Eighth Grade":"8","Ninth Grade":"9","Tenth Grade":"10","Eleventh Grade":"11","Twelfth Grade":"12"}
PK = {"-1","-2","-3","PK","PK3","PK4","P3","P4"}

def f(v):
    try: return float(v or 0)
    except ValueError: return 0.0
def yes(v): return (v or "").strip().lower() in ("y","yes","1","true")
def mdy(s):
    m = re.match(r"(\d{2})/(\d{2})/(\d{4})", s or ""); return f"{m[3]}-{m[1]}-{m[2]}" if m else None

def read_export(p):
    rows = []
    txt = p.read_text(errors="replace").replace("\r\n","\n").replace("\r","\n")
    for r in csv.DictReader(txt.splitlines(), delimiter="\t"):
        rows.append({k.strip(): (v or "").strip() for k, v in r.items()})
    return rows

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--folder", required=True); ap.add_argument("--date", required=True); ap.add_argument("--month", required=True)
    ap.add_argument("--rs-cap", type=float, default=1.30); ap.add_argument("--expected-ale", default="HBHS")
    ap.add_argument("--known-exclusions", default=None, help="CSV of student numbers to skip in the gap lists (default: references/known-exclusions.csv)")
    a = ap.parse_args(); F = Path(a.folder).expanduser(); D = F / "_district"
    kx_path = Path(a.known_exclusions) if a.known_exclusions else Path(__file__).resolve().parent.parent / "references" / "known-exclusions.csv"
    known = {}
    if kx_path.exists():
        for kr in csv.DictReader(open(kx_path, newline="", encoding="utf-8")):
            ksid = (kr.get("student_number") or "").strip()
            if ksid and not ksid.startswith("#"): known[ksid] = (kr.get("reason") or "").strip()
    month_name = a.month.split()[0]; iso_date = f"{a.date[:4]}-{a.date[4:6]}-{a.date[6:]}"
    expected_ale = {s.strip() for s in a.expected_ale.split(",") if s.strip()}
    p223 = json.load(open(D / "p223_totals.json"))
    summary = json.load(open(D / "summary_hc.json")) if (D / "summary_hc.json").exists() else {}
    rows, schools, detail = [], [], {}
    for c, (name, lvl) in NAME.items():
        rd = list(csv.DictReader(open(F / f"{c}_P223Audit_{a.date}.csv")))
        inc = [r for r in rd if yes(r["Include In Headcount"])]
        inc_ids = {r["Student Number"] for r in inc}
        form = p223[c]["totals"]; grades = p223[c]["grades"]; formtk = p223[c].get("form", {})
        hc, fte = form["hc"], form["fte"]
        checks = []
        def add(name_, status, msg, details=None):
            checks.append({"school": c, "name": name_, "status": status, "message": msg, "details": details or []})
        # 1 integrity
        afte = round(sum(f(r["Total FTE"]) for r in inc), 2)
        add("P223 form vs audit CSV integrity", "PASS" if len(inc) == hc and abs(afte - fte) < 0.05 else "FAIL",
            f"audit headcount {len(inc)} vs form {hc}; audit FTE {afte:.2f} vs form {fte:.2f}")
        # 2 gap students (export minus P223 headcount)
        gap = []; skipped = []
        exp_path = F / f"{c}_StudentListExport_{a.date}.txt"
        if exp_path.exists():
            audit_by_id = {r["Student Number"]: r for r in rd}
            for e in read_export(exp_path):
                sid = e.get("Student ID", ""); start = mdy(e.get("StartDate")); exit_ = mdy(e.get("ExitDate"))
                if not sid or (start and start > iso_date) or (exit_ and exit_ <= iso_date): continue
                if sid in inc_ids: continue
                if sid in known: skipped.append(sid); continue  # demo/test accounts (references/known-exclusions.csv)
                r = audit_by_id.get(sid); g = e.get("Grade", "")
                if r is None: reason = "not in P223 audit"
                elif (r.get("Grade") or "").strip() == "TK": reason = "TK (reported in the TK fields)"
                elif (r.get("Grade") or "").strip() in PK or g in PK: reason = "pre-K (reported by Student Services)"
                else: reason = f"excluded: {r.get('Label') or r.get('Student Type') or 'n/a'}"
                gap.append({"id": sid, "grade": g, "reason": reason})
        shc = summary.get(c)
        delta = (shc - hc) if isinstance(shc, int) else None
        sk = f"; {len(skipped)} known test account(s) skipped" if skipped else ""
        add("Enrollment Summary vs P223 headcount", "PASS" if delta in (0, None) else "WARN",
            (f"Enrollment Summary {shc} vs P223 {hc} (gap {delta}); {len(gap)} students identified below{sk}"
             if delta is not None else f"no Enrollment Summary count recorded; {len(gap)} students outside the P223 headcount{sk}"),
            [f"{g['id']} (gr {g['grade']}) — {g['reason']}" for g in gap])
        # 3 Running Start rules
        rs = [r for r in rd if f(r["Non-Vocational Running Start FTE"]) + f(r["Vocational Running Start FTE"]) > 0]
        if month_name == "September":
            add("Running Start not reported in September", "PASS" if not rs else "FAIL",
                ("No Running Start FTE" if not rs else
                 f"{len(rs)} students carry Running Start FTE, but colleges report RS for October-June only (Handbook 6.F); September RS must be zero"),
                [f"{r['Student Number']} gr {r['Grade']}: RS {f(r['Non-Vocational Running Start FTE'])+f(r['Vocational Running Start FTE']):.2f}" for r in rs[:40]])
        else:
            over = [(r["Student Number"], r["Grade"], round(f(r["Total FTE"]) + f(r["Non-Vocational Running Start FTE"]) + f(r["Vocational Running Start FTE"]), 2))
                    for r in inc if f(r["Total FTE"]) + f(r["Non-Vocational Running Start FTE"]) + f(r["Vocational Running Start FTE"]) > a.rs_cap + 0.0001]
            soft = month_name in ("December", "January")
            add(f"Running Start combined FTE cap ({a.rs_cap:.2f})", "PASS" if not over else ("WARN" if soft else "FAIL"),
                (f"{len(over)} student(s) exceed {a.rs_cap:.2f} combined" + (" — allowed this month only when terms overlap (SQEAF)" if soft else "")) if over else "all at or under the cap",
                [f"{n} gr {g}: combined {v}" for n, g, v in over])
            hs_over = [(r["Student Number"], r["Grade"], round(f(r["Total FTE"]), 2)) for r in rs if f(r["Total FTE"]) > 1.0001]
            add("High school share of a Running Start student <= 1.00", "PASS" if not hs_over else "FAIL",
                f"{len(hs_over)} RS student(s) carry more than 1.00 district FTE" if hs_over else "ok", [f"{n} gr {g}: district FTE {v}" for n, g, v in hs_over])
        # 4 zero-FTE non-RS in headcount
        zero = [r for r in inc if f(r["Total FTE"]) == 0 and f(r["Non-Vocational Running Start FTE"]) + f(r["Vocational Running Start FTE"]) == 0]
        add("Zero-FTE students included in headcount", "PASS" if not zero else "WARN",
            f"{len(zero)} student(s) in headcount with 0.00 FTE and no Running Start FTE (usually no schedule on the count date)" if zero else "none",
            [f"{r['Student Number']} gr {r['Grade']}" for r in zero])
        # 5 expected ALE
        ale_rows = [r for r in rd if f(r["Total ALE FTE"]) > 0]
        if c in expected_ale:
            add("Expected all-ALE school", "PASS" if len(ale_rows) == hc and hc > 0 else "FAIL",
                f"{len(ale_rows)} of {hc} students carry ALE FTE in PowerSchool; reporting marks all {hc} as ALE (see school-config expected-ALE list)")
        # 6 TK
        tk = [r for r in rd if (r.get("Grade") or "").strip() == "TK"]
        tk0 = [r for r in tk if f(r["Total FTE"]) == 0]
        if tk:
            add("TK students without FTE", "PASS" if not tk0 else "WARN",
                f"{len(tk0)} of {len(tk)} TK students have 0.00 FTE (no section generating minutes on the count date)" if tk0 else f"all {len(tk)} TK students carry FTE",
                [r["Student Number"] for r in tk0])
        # school record for validation_report + findings
        voc78 = round(sum(f(r["Voc FTE"]) for r in inc if (r["Grade"] or "").strip() in ("7", "8")), 2)
        voc912 = round(sum(f(r["Voc FTE"]) for r in inc if (r["Grade"] or "").strip() in ("9", "10", "11", "12")), 2)
        bil = [r for r in rd if yes(r["Count As Bilingual"])]
        k5 = len([r for r in bil if (r["Grade"] or "").strip() in ("K", "0", "1", "2", "3", "4", "5", "6")])
        od = [r for r in rd if f(r["Open Doors FTE"]) + f(r["Open Doors Voc FTE"]) > 0]
        ale_hc = hc if c in expected_ale else len(ale_rows)
        ale_fte = fte if c in expected_ale else round(sum(f(r["Total ALE FTE"]) for r in ale_rows), 2)
        rs_sept_zero = month_name == "September"
        schools.append({"code": c, "name": name, "level": lvl,
            "headcount_by_grade": {GMAP[k]: v["hc"] for k, v in grades.items()},
            "fte_by_grade": {GMAP[k]: v["fte"] for k, v in grades.items()}, "adjustments_by_grade": {},
            "ale_hc": ale_hc, "ale_fte": ale_fte, "ale_marked_by_policy": c in expected_ale,
            "rs_hc_total": 0 if rs_sept_zero else len(rs), "rs_hc_fulltime": 0 if rs_sept_zero else len([r for r in rs if f(r["Total FTE"]) == 0]),
            "rs_nonvoc_fte": 0.0 if rs_sept_zero else round(sum(f(r["Non-Vocational Running Start FTE"]) for r in rs), 2),
            "rs_voc_fte": 0.0 if rs_sept_zero else round(sum(f(r["Vocational Running Start FTE"]) for r in rs), 2),
            "rs_in_powerschool": len(rs),
            "tbip_k5": k5, "tbip_7_12": len(bil) - k5, "tbip_exited": len([r for r in rd if yes(r["Count As Exited Bilingual Program"])]),
            "tbip_tk": len([r for r in tk if yes(r["Count As Bilingual"])]),
            "cte_fte": round(voc78 + voc912, 2), "cte_fte_7_8": voc78, "cte_fte_9_12": voc912, "cte_ale_fte": round(voc78 + voc912, 2) if c in expected_ale else 0.0,
            "open_doors_hc": len(od), "open_doors_nonvoc_fte": round(sum(f(r["Open Doors FTE"]) for r in od), 2),
            "open_doors_voc_fte": round(sum(f(r["Open Doors Voc FTE"]) for r in od), 2),
            "tk_hc": len(tk), "tk_fte": round(sum(f(r["Total FTE"]) for r in tk), 2), "tk_fte_zero": len(tk0),
            "validation_results": checks})
        rows.append({"school": c, "summaryHC": shc, "p223HC": hc, "p223FTE": fte, "auditHC": len(inc), "auditFTE": afte,
                     "rs": len(rs), "ale": ale_hc, "openDoors": len(od), "bilingual": len(bil), "tk": len(tk), "tkFte": round(sum(f(r["Total FTE"]) for r in tk), 2),
                     "cte78": voc78, "cte912": voc912, "zeroFTE": len(zero), "gap": len(gap),
                     "over120": len([x for x in checks if x["name"].startswith("Running Start combined") and x["status"] != "PASS"])})
        detail[c] = {"gap": gap, "known_skipped": skipped}
    # EDS file completeness (which required fields PowerSchool omitted / zeroed)
    eds = {}
    for tag in ("RunA_1Day", "RunB_5Day"):
        p = D / f"P223_{tag}_State_{a.date}.txt"
        if not p.exists(): continue
        fields = Counter(l[50:56] for l in open(p) if len(l) >= 72)
        eds[tag] = {"present": len(fields), "missing": [x for x in ("000163", "000164", "000165", "000167", "000218", "000219", "000220", "000223", "000224", "000225") if x not in fields]}
    tot = [x for s in schools for x in s["validation_results"]]
    out = {"month": a.month, "countDate": iso_date, "rsCap": a.rs_cap, "expectedAle": sorted(expected_ale), "rows": rows, "eds": eds,
           "counts": {"checks": len(tot), "fail": len([x for x in tot if x["status"] == "FAIL"]), "warn": len([x for x in tot if x["status"] == "WARN"]), "pass": len([x for x in tot if x["status"] == "PASS"])},
           "flags": [f"{x['school']}: {x['name']} — {x['message']}" for x in tot if x["status"] != "PASS"], "detail": detail}
    (D / "validation.json").write_text(json.dumps(out, indent=1)); (D / "schools.json").write_text(json.dumps({"schools": schools}, indent=1))
    print(json.dumps(out["counts"]), "| EDS:", eds); [print(" -", x) for x in out["flags"] if "FAIL" in x or True][:0]
    for x in tot:
        if x["status"] == "FAIL": print(" FAIL", x["school"], "|", x["name"], "|", x["message"][:120])

if __name__ == "__main__":
    main()
