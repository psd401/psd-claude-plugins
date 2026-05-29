#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "python-docx>=1.2.0",
#   "pdfplumber>=0.11.0",
# ]
# ///
"""One-shot orchestrator: extract → build → verify.

Calls the three peer scripts in sequence. Each step is also independently
runnable. The verification result is printed at the end. Non-zero exit
indicates either a build failure or a fidelity miss.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kwargs)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="File path or Google Doc URL")
    ap.add_argument("--policy-number", required=True)
    ap.add_argument("--series", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--adopted", default=None, help="MM/DD/YYYY; auto-detected from source if omitted")
    ap.add_argument("--revised", default=None, help="Comma-separated MM/DD/YYYY list; auto-detected if omitted")
    ap.add_argument("--procedure", action="store_true", help="Render as procedure (filename gets 'p' suffix)")
    ap.add_argument("--output", help="Explicit output .docx path; auto-derived if omitted")
    ap.add_argument("--docx-dir", help="Directory to drop the .docx into (auto-derived filename)")
    ap.add_argument("--pdf-dir", help="Directory to drop the .pdf into (default: alongside the .docx)")
    ap.add_argument("--no-pdf", action="store_true", help="Skip the PDF export step")
    args = ap.parse_args()

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
        extract_json_path = Path(tf.name)

    # 1. Extract
    extract = run(
        [
            "uv",
            "run",
            str(SCRIPTS_DIR / "extract_text.py"),
            "--source",
            args.source,
        ]
    )
    extract_json_path.write_text(extract.stdout)

    # Resolve dates: explicit args win, else fall back to extract_text's detected_dates
    extract_data = json.loads(extract.stdout)
    detected = extract_data.get("detected_dates") or {}
    adopted = args.adopted if args.adopted is not None else detected.get("adopted", "")
    revised = args.revised if args.revised is not None else detected.get("revised", "")

    # 2. Build
    build_cmd = [
        "uv",
        "run",
        str(SCRIPTS_DIR / "build_docx.py"),
        "--input",
        str(extract_json_path),
        "--policy-number",
        args.policy_number,
        "--series",
        args.series,
        "--title",
        args.title,
        "--adopted",
        adopted,
        "--revised",
        revised,
    ]
    if args.procedure:
        build_cmd.append("--procedure")
    if args.output:
        build_cmd += ["--output", args.output]
    elif args.docx_dir:
        build_cmd += ["--output", args.docx_dir]
    build = run(build_cmd)
    build_result = json.loads(build.stdout.strip())
    final_output = build_result["output"]

    # 3. Verify
    verify_cmd = [
        "uv",
        "run",
        str(SCRIPTS_DIR / "verify_fidelity.py"),
        "--source-json",
        str(extract_json_path),
        "--output-docx",
        final_output,
        "--policy-number",
        args.policy_number,
        "--series",
        args.series,
        "--title",
        args.title,
        "--adopted",
        adopted,
        "--revised",
        revised,
    ]
    verify = subprocess.run(verify_cmd, capture_output=True, text=True)
    verify_result = json.loads(verify.stdout) if verify.stdout.strip() else {"pass": False, "error": verify.stderr}

    summary = {
        "output": final_output,
        "extract_json": str(extract_json_path),
        "build": build_result,
        "verify": verify_result,
    }

    # 4. Convert to PDF (only if fidelity passed; PDF mirrors the .docx)
    if verify_result.get("pass") and not args.no_pdf:
        pdf_cmd = [
            "uv", "run",
            str(SCRIPTS_DIR / "build_pdf.py"),
            "--input", str(extract_json_path),
            "--policy-number", args.policy_number,
            "--series", args.series,
            "--title", args.title,
            "--adopted", adopted,
            "--revised", revised,
        ]
        if args.procedure:
            pdf_cmd.append("--procedure")
        if args.pdf_dir:
            pdf_cmd += ["--output", args.pdf_dir]
        try:
            pdf_proc = subprocess.run(pdf_cmd, capture_output=True, text=True, check=True)
            summary["pdf"] = json.loads(pdf_proc.stdout.strip())["output"]
        except subprocess.CalledProcessError as e:
            summary["pdf_error"] = (e.stderr.strip() or e.stdout.strip())[-400:]

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    sys.exit(0 if verify_result.get("pass") else 1)


if __name__ == "__main__":
    main()
