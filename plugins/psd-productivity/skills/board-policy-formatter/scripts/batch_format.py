#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Process every policy/procedure listed in a markdown manifest.

Manifest format (the output of WebFetch on the PSD policies index page):

  ## NNNN Series - Series Name

  | Number | Title | URL |
  |--------|-------|-----|
  | 1000 | Legal Status and Operation of the Board | https://drive.google.com/... |
  | 1115P | Vacancies | https://drive.google.com/... |

For each row, this driver:
  * Identifies the series (from the most recent `## ... Series - {Name}` header).
  * Detects procedure (`P`/`p` suffix) → passes --procedure.
  * Skips `f`/`F` suffixes (form documents) and S3-hosted oddballs.
  * Calls format_policy.py with --docx-dir / --pdf-dir, letting auto-date
    detection populate Adopted/Revised.
  * Logs each result to a CSV (`number, title, url, status, output_docx,
    output_pdf, missing_words, error`).

Run:
  uv run batch_format.py --manifest <path-to-md> \
                         --docx-dir <out>/docx \
                         --pdf-dir <out>/pdf \
                         --log <out>/results.csv \
                         [--limit 30] [--series 1000] [--no-pdf]
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
ORCHESTRATOR = SCRIPTS_DIR / "format_policy.py"

SERIES_HEADER_RE = re.compile(r"^##\s*(\d+)\s+Series\s*-\s*(.+?)\s*$")
ROW_RE = re.compile(r"^\|\s*([0-9]+[A-Za-z]?[0-9]*)\s*\|\s*(.+?)\s*\|\s*(\S+?)\s*\|\s*$")


def parse_manifest(text: str) -> list[dict]:
    rows: list[dict] = []
    current_series: str | None = None
    current_series_num: str | None = None
    for line in text.splitlines():
        m = SERIES_HEADER_RE.match(line)
        if m:
            current_series_num = m.group(1)
            current_series = m.group(2).strip()
            continue
        m = ROW_RE.match(line)
        if not m:
            continue
        number, title, url = m.group(1), m.group(2), m.group(3)
        if number.lower() == "number":  # table header
            continue
        rows.append(
            {
                "series_num": current_series_num,
                "series": current_series,
                "number": number,
                "title": title,
                "url": url,
            }
        )
    return rows


def classify(number: str) -> tuple[str, bool] | None:
    """Return (base_number, is_procedure) or None if this entry should be skipped.

    Skips form/exhibit suffixes (e.g., 2029f1, 2125F).
    """
    m = re.match(r"^(\d+)([A-Za-z]?\d*)$", number)
    if not m:
        return None
    base = m.group(1)
    suffix = m.group(2)
    if not suffix:
        return base, False
    if suffix.lower() == "p":
        return base, True
    # Anything else (f, F, f1, f2, etc.) → skip
    return None


def is_processable_url(url: str) -> bool:
    if "docs.google.com" in url or "drive.google.com" in url:
        return True
    if url.startswith(("http://", "https://")):
        path = url.split("?", 1)[0].lower()
        return path.endswith(".pdf") or path.endswith(".docx")
    return False


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True, type=Path)
    ap.add_argument("--docx-dir", required=True, type=Path)
    ap.add_argument("--pdf-dir", required=True, type=Path)
    ap.add_argument("--log", required=True, type=Path)
    ap.add_argument("--limit", type=int, help="Only process the first N items")
    ap.add_argument("--series", help="Only process this series number (e.g., 1000)")
    ap.add_argument("--no-pdf", action="store_true")
    ap.add_argument("--start-after", help="Skip rows until after this number is seen (resume)")
    args = ap.parse_args()

    args.docx_dir.mkdir(parents=True, exist_ok=True)
    args.pdf_dir.mkdir(parents=True, exist_ok=True)
    args.log.parent.mkdir(parents=True, exist_ok=True)

    rows = parse_manifest(args.manifest.read_text())
    print(f"Parsed {len(rows)} rows from manifest", file=sys.stderr)

    if args.series:
        rows = [r for r in rows if r["series_num"] == args.series]
        print(f"  filtered to series {args.series}: {len(rows)}", file=sys.stderr)

    if args.start_after:
        idx = next((i for i, r in enumerate(rows) if r["number"] == args.start_after), None)
        if idx is not None:
            rows = rows[idx + 1 :]
            print(f"  resuming after {args.start_after}: {len(rows)} remaining", file=sys.stderr)

    if args.limit:
        rows = rows[: args.limit]

    log_path = args.log
    write_header = not log_path.exists()
    with log_path.open("a", newline="") as fh:
        writer = csv.writer(fh)
        if write_header:
            writer.writerow([
                "series_num", "series", "number", "title", "url",
                "status", "output_docx", "output_pdf",
                "missing_words", "error",
            ])

        total = len(rows)
        for i, row in enumerate(rows, 1):
            cls = classify(row["number"])
            if cls is None or not is_processable_url(row["url"]):
                writer.writerow([
                    row["series_num"], row["series"], row["number"], row["title"], row["url"],
                    "skipped", "", "", "", "non-policy or unsupported URL",
                ])
                fh.flush()
                print(f"[{i}/{total}] SKIP {row['number']} ({row['url'][:50]}...)", file=sys.stderr)
                continue
            base, is_proc = cls

            cmd = [
                "uv", "run", str(ORCHESTRATOR),
                "--source", row["url"],
                "--policy-number", base,
                "--series", row["series"],
                "--title", row["title"],
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
                if proc.stdout.strip():
                    try:
                        result = json.loads(proc.stdout)
                    except json.JSONDecodeError:
                        result = {}
                else:
                    result = {}
                verify = (result.get("verify") or {})
                status = "ok" if proc.returncode == 0 and verify.get("pass") else "fail"
                docx_out = result.get("output", "")
                pdf_out = result.get("pdf", "")
                missing = verify.get("body_missing_word_count", "")
                err = ""
                if status == "fail":
                    err = (proc.stderr or "").strip()[-400:] or json.dumps(verify)[:400]
            except subprocess.TimeoutExpired:
                status = "timeout"
                docx_out = pdf_out = ""
                missing = ""
                err = "180s timeout"
                dur = 180
            except Exception as e:
                status = "error"
                docx_out = pdf_out = ""
                missing = ""
                err = str(e)[:400]
                dur = time.time() - t0

            writer.writerow([
                row["series_num"], row["series"], row["number"], row["title"], row["url"],
                status, docx_out, pdf_out, missing, err,
            ])
            fh.flush()
            tag = {"ok": "OK  ", "fail": "FAIL", "timeout": "TOUT", "error": "ERR ", "skipped": "SKIP"}[status]
            print(f"[{i}/{total}] {tag} {row['number']} ({dur:4.1f}s) {row['title'][:60]}", file=sys.stderr)


if __name__ == "__main__":
    main()
