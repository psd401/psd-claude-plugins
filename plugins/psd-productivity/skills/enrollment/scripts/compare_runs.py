# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Compare two collection runs of the same month (original vs rerun).

Usage:
  uv run compare_runs.py --before <orig>/_district --after <rerun>/_district [--output deltas.md]

Each directory must hold p223_totals.json and validation.json as written by the
run's Phase 1/3 steps. Prints (and optionally writes) a markdown table of per-school
deltas in headcount, FTE, Running Start count, over-1.20 count and zero-FTE count,
plus a district line. Non-zero deltas are what the rerun's findings doc must explain.
"""
import argparse, json, pathlib

def load(d):
    d = pathlib.Path(d)
    tot = json.load(open(d / "p223_totals.json"))
    val = {r["school"]: r for r in json.load(open(d / "validation.json"))["rows"]}
    return tot, val

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--before", required=True); ap.add_argument("--after", required=True)
    ap.add_argument("--output")
    a = ap.parse_args()
    tb, vb = load(a.before); ta, va = load(a.after)
    schools = sorted(set(tb) | set(ta))
    lines = ["| School | HC before | HC after | Δ HC | FTE before | FTE after | Δ FTE | RS before | RS after | Over 1.20 before→after | Zero-FTE before→after |",
             "|---|---|---|---|---|---|---|---|---|---|---|"]
    T = dict(hcb=0, hca=0, fb=0.0, fa=0.0)
    for s in schools:
        b = tb.get(s, {}).get("totals") or {}; af = ta.get(s, {}).get("totals") or {}
        hb, ha = b.get("hc", 0), af.get("hc", 0); fb, fa = b.get("fte", 0.0), af.get("fte", 0.0)
        rb, ra = vb.get(s, {}).get("rs", 0), va.get(s, {}).get("rs", 0)
        ob, oa = vb.get(s, {}).get("over120", 0), va.get(s, {}).get("over120", 0)
        zb, za = vb.get(s, {}).get("zeroFTE", 0), va.get(s, {}).get("zeroFTE", 0)
        mark = "**" if (hb != ha or abs(fb - fa) > 0.005 or rb != ra) else ""
        lines.append(f"| {mark}{s}{mark} | {hb} | {ha} | {ha-hb:+d} | {fb:.2f} | {fa:.2f} | {fa-fb:+.2f} | {rb} | {ra} | {ob}→{oa} | {zb}→{za} |")
        T["hcb"] += hb; T["hca"] += ha; T["fb"] += fb; T["fa"] += fa
    lines.append(f"| **District** | {T['hcb']} | {T['hca']} | {T['hca']-T['hcb']:+d} | {T['fb']:.2f} | {T['fa']:.2f} | {T['fa']-T['fb']:+.2f} | | | | |")
    out = "\n".join(lines)
    print(out)
    if a.output: pathlib.Path(a.output).write_text(out + "\n")

if __name__ == "__main__":
    main()
