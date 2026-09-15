# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Resolve (and create if missing) the Drive folder layout for a run, printing folder ids as JSON.

Layout (shared drive, all ids returned):
  AUTOMATION BACKUP (P223) / <Month YYYY> / Run <YYYY-MM-DD> / {AES, DES, ..., HBHS, District}

Every run gets its own "Run <date>" folder — nothing is ever overwritten — and every school gets its
own subfolder so a single school folder can be shared with that building.

Usage:
  uv run drive_layout.py --month "September 2026" --run-date 2026-09-09 [--label "Rerun"]
Requires the gws CLI to be authenticated. Uses supportsAllDrives everywhere.
"""
import argparse, json, subprocess
ROOT = "1p_i0btMW4Wvq32mhsBXiABP8eTwWrdHm"
SCHOOLS = ["AES","DES","EES","HHES","MCES","PIE","PES","SWES","VES","VOY","GMS","HRMS","KPMS","Kopa","GHHS","PHS","HBHS","District"]

def gws(*args):
    r = subprocess.run(["gws", *args], capture_output=True, text=True)
    out = "\n".join(l for l in r.stdout.splitlines() if not l.startswith("Using keyring"))
    return json.loads(out) if out.strip().startswith("{") else {}

def ensure(parent, name):
    q = f"'{parent}' in parents and name = '{name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    res = gws("drive", "files", "list", "--params", json.dumps({"q": q, "fields": "files(id,name)", "supportsAllDrives": True, "includeItemsFromAllDrives": True}))
    if res.get("files"): return res["files"][0]["id"]
    made = gws("drive", "files", "create", "--params", json.dumps({"supportsAllDrives": True, "fields": "id"}),
               "--json", json.dumps({"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent]}))
    return made["id"]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--month", required=True); ap.add_argument("--run-date", required=True); ap.add_argument("--label", default="Run")
    a = ap.parse_args()
    month = ensure(ROOT, a.month); run = ensure(month, f"{a.label} {a.run_date}")
    ids = {"month": month, "run": run, "folders": {s: ensure(run, s) for s in SCHOOLS}}
    print(json.dumps(ids, indent=1))

if __name__ == "__main__":
    main()
