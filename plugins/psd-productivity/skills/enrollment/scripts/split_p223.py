# /// script
# requires-python = ">=3.11"
# dependencies = ["pdfplumber", "pypdf"]
# ///
"""Split the two district-level P223 runs into one form page + one audit CSV per school,
and write _district/p223_totals.json (per-school grades, totals, TK, RS as printed on the form).

Usage:
  uv run split_p223.py --folder ~/Enrollment/P223-September-2026 --date 20260908
Expects in <folder>/_district: P223_RunA_1Day_Form_<date>.pdf / _Audit_<date>.csv (elementary)
                             P223_RunB_5Day_Form_<date>.pdf / _Audit_<date>.csv (secondary)
"""
import argparse, csv, json, re
from pathlib import Path
import pdfplumber
from pypdf import PdfReader, PdfWriter

CODE = {"3299":"AES","4080":"DES","3055":"EES","2944":"HHES","4189":"MCES","5631":"PIE","3685":"PES",
        "5685":"SWES","3056":"VES","4307":"VOY","2294":"GMS","4387":"HRMS","4156":"KPMS","4219":"Kopa",
        "4081":"GHHS","2681":"PHS","1516":"HBHS"}
AUDIT3 = {"AES":"AES","DES":"DES","EES":"EES","GHH":"GHHS","GMS":"GMS","HBH":"HBHS","HHE":"HHES","HRM":"HRMS",
          "KMS":"Kopa","KPM":"KPMS","MES":"MCES","PES":"PES","PHS":"PHS","PIE":"PIE","SWE":"SWES","VES":"VES","VGE":"VOY"}
ES = {"AES","DES","EES","HHES","MCES","PIE","PES","SWES","VES","VOY"}
GRADES = ["Kindergarten","First Grade","Second Grade","Third Grade","Fourth Grade","Fifth Grade","Sixth Grade",
          "Seventh Grade","Eighth Grade","Ninth Grade","Tenth Grade","Eleventh Grade","Twelfth Grade"]

def parse_page(txt):
    m = re.search(r"Peninsula School District(\d{4})", txt)
    code = m.group(1) if m else None
    grades = {}
    for g in GRADES:
        mm = re.search(re.escape(g) + r"\s+(\d+)\s+([\d.]+)\s+(\d+)\s+([\d.]+)", txt)
        if mm: grades[g] = {"hc": int(mm[1]), "fte": float(mm[2]), "aleHc": int(mm[3]), "aleFte": float(mm[4])}
    t = re.search(r"Totals\s+(\d+)\s+([\d.]+)\s+(\d+)\s+([\d.]+)", txt)
    totals = {"hc": int(t[1]), "fte": float(t[2]), "aleHc": int(t[3]), "aleFte": float(t[4])} if t else None
    # line after "Headcount 4 Headcount 5 RS FTE 6 RS FTE 6": TK HC, TK FTE, RS HC, RS-only HC, RS nonvoc, RS voc
    tk = {}
    mm = re.search(r"Headcount 4 Headcount 5 RS FTE 6 RS FTE 6\s*\n\s*(\d+)\s+([\d.]+)\s+(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)", txt)
    if mm:
        tk = {"tkHc": int(mm[1]), "tkFte": float(mm[2]), "rsHc": int(mm[3]), "rsOnlyHc": int(mm[4]),
              "rsNonvocFte": float(mm[5]), "rsVocFte": float(mm[6])}
    return code, grades, totals, tk

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--folder", required=True); ap.add_argument("--date", required=True)
    a = ap.parse_args(); F = Path(a.folder).expanduser(); D = F / "_district"
    out = {}
    for tag, keep in (("RunA_1Day", ES), ("RunB_5Day", set(CODE.values()) - ES)):
        pdf_path = D / f"P223_{tag}_Form_{a.date}.pdf"; csv_path = D / f"P223_{tag}_Audit_{a.date}.csv"
        reader = PdfReader(str(pdf_path))
        with pdfplumber.open(str(pdf_path)) as pdf:
            for i, pg in enumerate(pdf.pages):
                code, grades, totals, tk = parse_page(pg.extract_text() or "")
                abbr = CODE.get(code)
                if not abbr or abbr not in keep: continue
                w = PdfWriter(); w.add_page(reader.pages[i])
                with open(F / f"{abbr}_P223Form_{a.date}.pdf", "wb") as fh: w.write(fh)
                out[abbr] = {"src": tag, "page": i, "code": code, "totals": totals, "grades": grades, "form": tk}
        rows = list(csv.reader(open(csv_path))); hdr, body = rows[0], rows[1:]
        for c3, abbr in AUDIT3.items():
            if abbr not in keep: continue
            with open(F / f"{abbr}_P223Audit_{a.date}.csv", "w", newline="") as fh:
                wr = csv.writer(fh); wr.writerow(hdr); wr.writerows(r for r in body if r and r[0] == c3)
    D.mkdir(exist_ok=True); (D / "p223_totals.json").write_text(json.dumps(out, indent=1))
    missing = sorted(set(CODE.values()) - set(out)); print("schools split:", len(out), "missing:", missing or "none")
    print("district HC:", sum(v["totals"]["hc"] for v in out.values()), "FTE:", round(sum(v["totals"]["fte"] for v in out.values()), 2))
    if missing: raise SystemExit(1)

if __name__ == "__main__":
    main()
