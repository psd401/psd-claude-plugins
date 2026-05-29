#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Form orchestrator: extract → build_form_docx → build_form_pdf.

Mirrors format_policy.py but for forms. Doesn't gate PDF on a verify step —
form fidelity is content-equivalence, not character-equivalence (PDF underscore
lines and checkbox glyphs don't survive text extraction in either direction).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--form-number", required=True)
    ap.add_argument("--series", required=True)
    ap.add_argument("--title", default=None, help="Override detected title")
    ap.add_argument("--docx-dir", help="Output directory for .docx (auto-derived filename)")
    ap.add_argument("--pdf-dir", help="Output directory for .pdf (auto-derived filename)")
    ap.add_argument("--no-pdf", action="store_true")
    args = ap.parse_args()

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
        extract_json_path = Path(tf.name)

    extract = run(["uv", "run", str(SCRIPTS_DIR / "extract_form.py"), "--source", args.source])
    extract_json_path.write_text(extract.stdout)

    docx_cmd = ["uv", "run", str(SCRIPTS_DIR / "build_form_docx.py"),
                "--input", str(extract_json_path),
                "--form-number", args.form_number,
                "--series", args.series]
    if args.title is not None:
        docx_cmd += ["--title", args.title]
    if args.docx_dir:
        docx_cmd += ["--output", args.docx_dir]
    docx = run(docx_cmd)
    docx_result = json.loads(docx.stdout.strip())

    summary = {"docx": docx_result["output"], "block_count": docx_result["block_count"]}

    if not args.no_pdf:
        pdf_cmd = ["uv", "run", str(SCRIPTS_DIR / "build_form_pdf.py"),
                   "--input", str(extract_json_path),
                   "--form-number", args.form_number,
                   "--series", args.series]
        if args.title is not None:
            pdf_cmd += ["--title", args.title]
        if args.pdf_dir:
            pdf_cmd += ["--output", args.pdf_dir]
        try:
            pdf = run(pdf_cmd)
            summary["pdf"] = json.loads(pdf.stdout.strip())["output"]
        except subprocess.CalledProcessError as e:
            summary["pdf_error"] = (e.stderr or e.stdout)[-300:]

    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
