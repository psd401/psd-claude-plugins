#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Iterate over forms (the ones the policy batch skipped) and build them.

Reads results.csv produced by batch_format.py — picks the rows with
status=skipped (excluding the 4040R signed resolution and any non-form S3
oddballs), routes each to format_form.py.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
import time
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
ORCH = SCRIPTS_DIR / "format_form.py"

EXCLUDE_NUMBERS = {"4040R"}  # signed resolution


def is_form(num: str) -> bool:
    if num in EXCLUDE_NUMBERS:
        return False
    # Form: number with f/F suffix (with or without trailing digits)
    return bool(re.match(r"^\d+[fF]\d*$", num))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True, type=Path, help="results.csv from policy batch")
    ap.add_argument("--docx-dir", required=True, type=Path)
    ap.add_argument("--pdf-dir", required=True, type=Path)
    ap.add_argument("--log", required=True, type=Path)
    ap.add_argument("--limit", type=int)
    args = ap.parse_args()

    args.docx_dir.mkdir(parents=True, exist_ok=True)
    args.pdf_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    with args.results.open() as fh:
        for row in csv.DictReader(fh):
            if row["status"] != "skipped":
                continue
            if not is_form(row["number"]):
                continue
            rows.append(row)
    print(f"Processing {len(rows)} forms", file=sys.stderr)
    if args.limit:
        rows = rows[: args.limit]

    write_header = not args.log.exists()
    with args.log.open("a", newline="") as fh:
        w = csv.writer(fh)
        if write_header:
            w.writerow(["series_num", "series", "number", "title", "url",
                        "status", "docx", "pdf", "error"])
        total = len(rows)
        for i, row in enumerate(rows, 1):
            cmd = ["uv", "run", str(ORCH),
                   "--source", row["url"],
                   "--form-number", row["number"],
                   "--series", row["series"],
                   "--title", row["title"],   # manifest title is always reliable
                   "--docx-dir", str(args.docx_dir),
                   "--pdf-dir", str(args.pdf_dir)]
            t0 = time.time()
            try:
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                dur = time.time() - t0
                if proc.returncode == 0:
                    res = json.loads(proc.stdout)
                    status = "ok" if "pdf" in res and "pdf_error" not in res else "fail"
                    docx = res.get("docx", "")
                    pdf = res.get("pdf", "")
                    err = res.get("pdf_error", "") if status == "fail" else ""
                else:
                    status = "fail"
                    docx = pdf = ""
                    err = (proc.stderr or proc.stdout)[-300:]
            except subprocess.TimeoutExpired:
                status, docx, pdf, err, dur = "timeout", "", "", "120s", 120
            except Exception as e:
                status, docx, pdf, err, dur = "error", "", "", str(e)[:300], time.time() - t0

            w.writerow([row["series_num"], row["series"], row["number"], row["title"], row["url"],
                        status, docx, pdf, err])
            fh.flush()
            tag = {"ok": "OK  ", "fail": "FAIL", "timeout": "TOUT", "error": "ERR "}[status]
            print(f"[{i}/{total}] {tag} {row['number']} ({dur:4.1f}s) {row['title'][:55]}", file=sys.stderr)


if __name__ == "__main__":
    main()
