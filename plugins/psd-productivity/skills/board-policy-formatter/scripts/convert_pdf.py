#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Convert a .docx to .pdf with the same base name.

Prefers LibreOffice headless (`soffice --headless --convert-to pdf`) because
it has no GUI and no macOS sandbox prompts. Looks in:
  - $PATH (`soffice`)
  - /Applications/LibreOffice.app/Contents/MacOS/soffice

Install once on macOS:
    brew install --cask libreoffice

Falls back to nothing (errors out) if LibreOffice is not found. The old
docx2pdf / Microsoft Word path is removed because Word.app is sandboxed
and prompts the user for permission on every file — unworkable for batches.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


SOFFICE_CANDIDATES = [
    "soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/opt/homebrew/bin/soffice",
    "/usr/local/bin/soffice",
]


def find_soffice() -> str | None:
    for c in SOFFICE_CANDIDATES:
        if shutil.which(c) or Path(c).exists():
            return c
    return None


def convert_with_libreoffice(docx: Path, pdf_dir: Path) -> Path:
    soffice = find_soffice()
    if not soffice:
        raise SystemExit(
            "LibreOffice not found. Install with: brew install --cask libreoffice"
        )
    pdf_dir.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(
        [soffice, "--headless", "--convert-to", "pdf", "--outdir", str(pdf_dir), str(docx)],
        capture_output=True, text=True, timeout=120,
    )
    if proc.returncode != 0:
        raise SystemExit(f"soffice failed: {proc.stderr.strip() or proc.stdout.strip()}")
    pdf_path = pdf_dir / (docx.stem + ".pdf")
    if not pdf_path.exists():
        raise SystemExit(f"PDF not produced at {pdf_path}: {proc.stdout}")
    return pdf_path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--docx", required=True, type=Path)
    ap.add_argument("--pdf-dir", help="Directory to write the PDF into; defaults alongside the .docx")
    args = ap.parse_args()

    if not args.docx.exists():
        raise SystemExit(f"docx not found: {args.docx}")

    pdf_dir = Path(args.pdf_dir) if args.pdf_dir else args.docx.parent
    pdf_path = convert_with_libreoffice(args.docx, pdf_dir)

    print(json.dumps({"docx": str(args.docx), "pdf": str(pdf_path)}))


if __name__ == "__main__":
    main()
