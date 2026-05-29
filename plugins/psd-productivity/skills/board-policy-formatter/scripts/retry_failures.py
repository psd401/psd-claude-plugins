#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "pandas>=2.0",
# ]
# ///
"""Re-run only the rows from a results.csv whose status is fail/timeout/error.

Usage:
  uv run retry_failures.py \
    --results <results.csv> \
    --docx-dir <out>/docx --pdf-dir <out>/pdf \
    [--manifest <manifest.md>]    # only needed if you want to re-derive series

Appends to a sibling CSV `retry_results.csv` so you can compare before/after.
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

import pandas as pd

SCRIPTS_DIR = Path(__file__).parent
ORCHESTRATOR = SCRIPTS_DIR / "format_policy.py"


def classify(number: str) -> tuple[str, bool] | None:
    m = re.match(r"^(\d+)([A-Za-z]?\d*)$", number)
    if not m:
        return None
    base = m.group(1)
    suffix = m.group(2)
    if not suffix:
        return base, False
    if suffix.lower() == "p":
        return base, True
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True, type=Path)
    ap.add_argument("--docx-dir", required=True, type=Path)
    ap.add_argument("--pdf-dir", required=True, type=Path)
    ap.add_argument("--out", default=None, help="Output CSV (default: retry_results.csv next to --results)")
    ap.add_argument("--no-pdf", action="store_true")
    args = ap.parse_args()

    out_path = Path(args.out) if args.out else args.results.parent / "retry_results.csv"

    df = pd.read_csv(args.results)
    failures = df[df["status"].isin(["fail", "timeout", "error"])].copy()
    print(f"Found {len(failures)} failures to retry", file=sys.stderr)

    args.docx_dir.mkdir(parents=True, exist_ok=True)
    args.pdf_dir.mkdir(parents=True, exist_ok=True)

    write_header = not out_path.exists()
    with out_path.open("a", newline="") as fh:
        writer = csv.writer(fh)
        if write_header:
            writer.writerow([
                "series_num", "series", "number", "title", "url",
                "status", "output_docx", "output_pdf",
                "missing_words", "error",
            ])

        total = len(failures)
        for i, row in enumerate(failures.itertuples(index=False), 1):
            cls = classify(str(row.number))
            if cls is None:
                writer.writerow([row.series_num, row.series, row.number, row.title, row.url,
                                 "skipped", "", "", "", "non-policy"])
                fh.flush()
                continue
            base, is_proc = cls
            cmd = [
                "uv", "run", str(ORCHESTRATOR),
                "--source", row.url,
                "--policy-number", base,
                "--series", row.series,
                "--title", row.title,
                "--docx-dir", str(args.docx_dir),
                "--pdf-dir", str(args.pdf_dir),
            ]
            if is_proc:
                cmd.append("--procedure")
            if args.no_pdf:
                cmd.append("--no-pdf")

            t0 = time.time()
            try:
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
                dur = time.time() - t0
                result = json.loads(proc.stdout) if proc.stdout.strip() else {}
                verify = result.get("verify") or {}
                status = "ok" if proc.returncode == 0 and verify.get("pass") else "fail"
                docx_out = result.get("output", "")
                pdf_out = result.get("pdf", "")
                missing = verify.get("body_missing_word_count", "")
                err = "" if status == "ok" else (proc.stderr or "").strip()[-400:] or json.dumps(verify)[:400]
            except subprocess.TimeoutExpired:
                status, docx_out, pdf_out, missing, err, dur = "timeout", "", "", "", "180s", 180
            except Exception as e:
                status, docx_out, pdf_out, missing, err, dur = "error", "", "", "", str(e)[:400], time.time() - t0

            writer.writerow([row.series_num, row.series, row.number, row.title, row.url,
                             status, docx_out, pdf_out, missing, err])
            fh.flush()
            tag = {"ok": "OK  ", "fail": "FAIL", "timeout": "TOUT", "error": "ERR ", "skipped": "SKIP"}[status]
            print(f"[{i}/{total}] {tag} {row.number} ({dur:4.1f}s) {row.title[:60]}", file=sys.stderr)


if __name__ == "__main__":
    main()
