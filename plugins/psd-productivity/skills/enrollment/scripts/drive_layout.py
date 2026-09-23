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
  uv run drive_layout.py --month "September 2026" --run-date 2026-09-09 [--label "Run"] [--share] [--share-role fileOrganizer]
--share grants each building's contact (tracking sheet, `Buildings` tab: School, Contact, Email) commenter
access to that school's folder for this run, without a Drive notification email (the follow-up email carries
the link). Sharing must run as a Content Manager of the shared drive (a person's gws login), not serv_automation.
Requires the gws CLI to be authenticated. Uses supportsAllDrives everywhere.
"""
import argparse, json, subprocess
ROOT = "1p_i0btMW4Wvq32mhsBXiABP8eTwWrdHm"
SHEET = "1t10gPECTUd2s9kMrm2jsOIvMHKnRpTcbhJGq-hO7Yg0"
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

def roster():
    res = gws("sheets", "spreadsheets", "values", "get", "--params", json.dumps({"spreadsheetId": SHEET, "range": "Buildings!A2:C"}))
    return {r[0].strip(): {"contact": r[1].strip(), "email": r[2].strip()} for r in res.get("values", []) if len(r) >= 3 and r[2].strip()}

ROLE_RANK = {"reader": 0, "commenter": 1, "writer": 2, "fileOrganizer": 3, "organizer": 4}

def share(folder_id, email, role):
    """Grant `role` (default Content manager = fileOrganizer, so buildings can rename files after review).
    An existing direct grant with a lower role is upgraded in place; an equal/higher one is left alone."""
    existing = gws("drive", "permissions", "list", "--params", json.dumps({"fileId": folder_id, "supportsAllDrives": True, "fields": "permissions(id,emailAddress,role,permissionDetails)"}))
    for p in existing.get("permissions", []):
        if (p.get("emailAddress") or "").lower() != email.lower(): continue
        if ROLE_RANK.get(p.get("role"), 0) >= ROLE_RANK.get(role, 0): return f"already {p.get('role')}"
        if any(not d.get("inherited") for d in p.get("permissionDetails", [])):
            r = gws("drive", "permissions", "update", "--params", json.dumps({"fileId": folder_id, "permissionId": p["id"], "supportsAllDrives": True, "fields": "id,role"}),
                    "--json", json.dumps({"role": role}))
            return f"upgraded to {r.get('role')}" if r.get("role") else f"FAILED: {r}"
        break  # lower role is inherited only: add a direct grant below
    r = gws("drive", "permissions", "create", "--params", json.dumps({"fileId": folder_id, "supportsAllDrives": True, "sendNotificationEmail": False, "fields": "id,role"}),
            "--json", json.dumps({"type": "user", "role": role, "emailAddress": email}))
    return r.get("role") or f"FAILED: {r}"

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--month", required=True); ap.add_argument("--run-date", required=True); ap.add_argument("--label", default="Run")
    ap.add_argument("--share", action="store_true")
    ap.add_argument("--share-role", default="fileOrganizer", choices=["reader", "commenter", "writer", "fileOrganizer"], help="Drive role for the building contact (default fileOrganizer = Content manager)")
    a = ap.parse_args()
    month = ensure(ROOT, a.month); run = ensure(month, f"{a.label} {a.run_date}")
    ids = {"month": month, "run": run, "folders": {s: ensure(run, s) for s in SCHOOLS}}
    if a.share:
        ros = roster(); ids["shared"] = {}
        for s, f in ids["folders"].items():
            if s in ros: ids["shared"][s] = {"email": ros[s]["email"], "role": a.share_role, "result": share(f, ros[s]["email"], a.share_role)}
        ids["unshared"] = [s for s in ids["folders"] if s != "District" and s not in ros]
    print(json.dumps(ids, indent=1))

if __name__ == "__main__":
    main()
