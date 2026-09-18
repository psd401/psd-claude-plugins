# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Build the EDS Enrollment (P223) upload file from the two PowerSchool state files plus the audit CSVs.

Why: PowerSchool's WA_P223 export (checked 2026-09-15 against the OSPI 2026-27 User Guide, section M)
never emits TK (fields 223-225) or Open Doors (218-220), and writes zeros for Running Start (163-167).
It also has one FTE window per run, so elementary must come from the 1-day run and secondary from the
5-day run. This script merges the right run per school and fills the omitted fields from the audit CSVs,
marks expected-ALE schools' K-12 enrollment in the ALE fields (30-57, 76-77), and writes a correctly
named 80-column fixed-width file. K-12 totals are asserted against the form (p223_totals.json).

Usage:
  uv run eds_txt.py --folder ~/Enrollment/P223-September-2026 --date 20260908 --month "September 2026" \
      [--expected-ale HBHS] [--out <path>]
"""
import argparse, csv, json, re
from datetime import datetime
from pathlib import Path

CODE = {"3299":"AES","4080":"DES","3055":"EES","2944":"HHES","4189":"MCES","5631":"PIE","3685":"PES","5685":"SWES",
        "3056":"VES","4307":"VOY","2294":"GMS","4387":"HRMS","4156":"KPMS","4219":"Kopa","4081":"GHHS","2681":"PHS","1516":"HBHS"}
ES = {"AES","DES","EES","HHES","MCES","PIE","PES","SWES","VES","VOY"}
# EDS field numbers (User Guide §M "Field Number Details")
K12 = {"K":("000121","000122"),"1":("000096","000097"),"2":("000104","000105"),"3":("000106","000107"),"4":("000108","000109"),
       "5":("000111","000112"),"6":("000113","000114"),"7":("000115","000116"),"8":("000117","000118"),"9":("000119","000120"),
       "10":("000098","000099"),"11":("000100","000101"),"12":("000102","000103")}          # (FTE, HC)
ALE = {"K":("000055","000056"),"1":("000030","000031"),"2":("000038","000039"),"3":("000040","000041"),"4":("000042","000043"),
       "5":("000045","000046"),"6":("000047","000048"),"7":("000049","000050"),"8":("000051","000052"),"9":("000053","000054"),
       "10":("000032","000033"),"11":("000034","000035"),"12":("000036","000037")}
RS_HC, RS_ONLY, RS_NV, RS_V = "000163", "000164", "000165", "000167"
OD_HC, OD_NV, OD_V = "000218", "000219", "000220"
TK_HC, TK_FTE, TBIP_TK = "000223", "000224", "000225"
VOC78, VOC912, VALE78, VALE912 = "000079", "000080", "000076", "000077"
INT_FIELDS = {h for _, h in K12.values()} | {h for _, h in ALE.values()} | {RS_HC, RS_ONLY, OD_HC, TK_HC, TBIP_TK, "000081", "000216", "000217"}

def f(v):
    try: return float(v or 0)
    except ValueError: return 0.0
def yes(v): return (v or "").strip().lower() in ("y","yes","1","true")

def read_state(p):
    rec = {}
    for l in open(p):
        if len(l) < 72: continue
        rec[(l[28:32], l[35:40], l[50:56])] = (l[:2], l[3:12], l[13:15], l[18:23], float(l[57:72]))
    return rec

def fmt(rectype, year, month, district, school, resident, field, amount):
    amt = f"{amount:015.2f}"  # 12 int digits + '.' + 2
    line = f"{rectype} {year} {month}   {district}     {school}   {resident}          {field} {amt}        "
    assert len(line) == 80, len(line); return line

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--folder", required=True); ap.add_argument("--date", required=True); ap.add_argument("--month", required=True)
    ap.add_argument("--expected-ale", default="HBHS"); ap.add_argument("--out")
    ap.add_argument("--tk-folder", help="folder of a separate P223 pass run on TK's own count date; TK fields (223-225) come from its audit CSVs")
    ap.add_argument("--tk-date", help="YYYYMMDD of that TK pass")
    a = ap.parse_args(); F = Path(a.folder).expanduser(); D = F / "_district"
    expected_ale = {s.strip() for s in a.expected_ale.split(",") if s.strip()}
    month_name = a.month.split()[0]; september = month_name == "September"
    A = read_state(D / f"P223_RunA_1Day_State_{a.date}.txt"); B = read_state(D / f"P223_RunB_5Day_State_{a.date}.txt")
    p223 = json.load(open(D / "p223_totals.json"))
    merged, changes = {}, []
    for (school, resident, field), val in list(A.items()) + list(B.items()):
        abbr = CODE.get(school)
        if not abbr: continue
        src = A if abbr in ES else B
        if (school, resident, field) in src: merged[(school, resident, field)] = src[(school, resident, field)]
    meta = next(iter(merged.values()))[:4]  # rectype, year, month, district
    def setf(school, field, amount, why):
        resident = meta[3]
        key = (school, resident, field); old = merged.get(key, (None,)*5)[4]
        if old is None or abs(old - amount) > 0.004:
            merged[key] = (*meta, amount); changes.append((CODE[school], field, old, round(amount, 2), why))
    for school, abbr in CODE.items():
        rd = list(csv.DictReader(open(F / f"{abbr}_P223Audit_{a.date}.csv")))
        inc = [r for r in rd if yes(r["Include In Headcount"])]
        # Running Start (October-June only)
        rs = [r for r in rd if f(r["Non-Vocational Running Start FTE"]) + f(r["Vocational Running Start FTE"]) > 0]
        if september: rs = []
        setf(school, RS_HC, len(rs), "RS headcount (zero in September by rule)" if september else "RS headcount from audit")
        setf(school, RS_ONLY, len([r for r in rs if f(r["Total FTE"]) == 0]), "RS-only headcount")
        setf(school, RS_NV, sum(f(r["Non-Vocational Running Start FTE"]) for r in rs), "RS non-voc FTE")
        setf(school, RS_V, sum(f(r["Vocational Running Start FTE"]) for r in rs), "RS voc FTE")
        # Open Doors
        od = [r for r in rd if f(r["Open Doors FTE"]) + f(r["Open Doors Voc FTE"]) > 0]
        setf(school, OD_HC, len(od), "Open Doors headcount"); setf(school, OD_NV, sum(f(r["Open Doors FTE"]) for r in od), "Open Doors non-voc FTE")
        setf(school, OD_V, sum(f(r["Open Doors Voc FTE"]) for r in od), "Open Doors voc FTE")
        # TK — from the TK pass when the program counts on its own date (Handbook 4.A), else from this run
        tk_src = rd
        if a.tk_folder:
            tk_path = Path(a.tk_folder).expanduser() / f"{abbr}_P223Audit_{a.tk_date}.csv"
            tk_src = list(csv.DictReader(open(tk_path))) if tk_path.exists() else []
        tk = [r for r in tk_src if (r.get("Grade") or "").strip() == "TK"]
        setf(school, TK_HC, len(tk), "TK headcount" + (f" (from TK pass {a.tk_date})" if a.tk_folder else "")); setf(school, TK_FTE, sum(f(r["Total FTE"]) for r in tk), "TK FTE")
        setf(school, TBIP_TK, len([r for r in tk if yes(r["Count As Bilingual"])]), "TBIP TK headcount")
        # expected all-ALE schools: ALE fields mirror K-12 by grade
        if abbr in expected_ale:
            for g, (ffte, fhc) in K12.items():
                afte, ahc = ALE[g]
                setf(school, afte, merged.get((school, meta[3], ffte), (0,0,0,0,0.0))[4], f"ALE FTE gr {g} = K-12 (all-ALE school)")
                setf(school, ahc, merged.get((school, meta[3], fhc), (0,0,0,0,0.0))[4], f"ALE HC gr {g} = K-12 (all-ALE school)")
            setf(school, VALE78, merged.get((school, meta[3], VOC78), (0,0,0,0,0.0))[4], "Voc ALE 7-8 = Voc 7-8")
            setf(school, VALE912, merged.get((school, meta[3], VOC912), (0,0,0,0,0.0))[4], "Voc ALE 9-12 = Voc 9-12")
        # assert K-12 totals against the form page
        hc = sum(round(merged.get((school, meta[3], h), (0,0,0,0,0.0))[4]) for _, h in K12.values())
        fte = round(sum(merged.get((school, meta[3], t), (0,0,0,0,0.0))[4] for t, _ in K12.values()), 2)
        form = p223[abbr]["totals"]
        assert hc == form["hc"] and abs(fte - form["fte"]) < 0.02, f"{abbr}: file K-12 {hc}/{fte} != form {form}"
    ts = datetime.now(); mm = meta[2]
    out = Path(a.out) if a.out else D / f"P223_09_{meta[1]}_{mm}_{meta[3]}_{ts:%Y-%m-%d}_{ts:%H-%M-%S}.txt"
    lines = [fmt(*merged[k][:4], k[0], k[1], k[2], merged[k][4]) for k in sorted(merged)]
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    log = [f"# EDS file changes vs PowerSchool export — {a.month}", "", f"File: `{out.name}` ({len(lines)} records, 17 schools). "
           "Elementary from the 1-day run, secondary from the 5-day run. Fields below were added or changed; everything else is PowerSchool's value.", "",
           "| School | Field | PowerSchool | Written | Why |", "|---|---|---|---|---|"]
    log += [f"| {s} | {fld} | {'absent' if o is None else o} | {n} | {why} |" for s, fld, o, n, why in changes if n != 0 or o not in (None, 0.0)]
    (D / "eds_txt_changes.md").write_text("\n".join(log) + "\n")
    print(out); print("records:", len(lines), "| changed/added nonzero:", len([c for c in changes if c[3] != 0 or c[2] not in (None, 0.0)]))

if __name__ == "__main__":
    main()
