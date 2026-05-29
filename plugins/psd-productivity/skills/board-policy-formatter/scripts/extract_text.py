#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "python-docx>=1.2.0",
#   "pdfplumber>=0.11.0",
# ]
# ///
"""Extract policy text from a source file or Google Doc URL.

Outputs JSON to stdout with shape:
    {
      "paragraphs": [{"text": "...", "style_hint": "body|heading|list_item"}, ...],
      "source_format": "docx|pdf|gdoc",
      "source_path": "/path/used"
    }

The extracted text is the ground truth for the fidelity check. Do not modify
it after extraction — pass it straight to build_docx.py.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path


GOOGLE_DOC_RE = re.compile(r"docs\.google\.com|drive\.google\.com")
DRIVE_FILE_ID_RE = re.compile(r"/(?:file/d/|document/d/|open\?id=)([a-zA-Z0-9_-]+)")


def detect_format(source: str) -> str:
    if GOOGLE_DOC_RE.search(source):
        return "gdoc"
    if source.startswith(("http://", "https://")):
        # Direct HTTP(S) — sniff by URL suffix
        path = source.split("?", 1)[0].lower()
        if path.endswith(".pdf"):
            return "http_pdf"
        if path.endswith(".docx"):
            return "http_docx"
        # Fall back to PDF assumption (most policy hosts serve PDFs)
        return "http_pdf"
    suffix = Path(source).suffix.lower()
    if suffix == ".docx":
        return "docx"
    if suffix == ".pdf":
        return "pdf"
    raise SystemExit(f"Unsupported source: {source}")


def download_http(url: str) -> Path:
    """Download a PDF or .docx directly from any HTTP(S) host (S3, etc.)."""
    import urllib.request

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".bin")
    tmp.close()
    urllib.request.urlretrieve(url, tmp.name)
    with open(tmp.name, "rb") as fh:
        head = fh.read(8)
    out = Path(tmp.name)
    if head.startswith(b"%PDF"):
        out = out.with_suffix(".pdf")
        Path(tmp.name).rename(out)
    elif head.startswith(b"PK"):
        out = out.with_suffix(".docx")
        Path(tmp.name).rename(out)
    else:
        raise SystemExit(f"Downloaded {url} but content is not PDF or DOCX (head={head!r})")
    return out


def download_anonymous(file_id: str, *, prefer_gdoc_export: bool = False) -> Path:
    """Fallback for 'anyone with link' shares not visible to authenticated gws account.

    For native Google Docs (/document/d/), use the export endpoint to get .docx.
    For Drive-hosted files (/file/d/), use the uc?export=download endpoint.
    Tries both if the first fails.
    """
    import urllib.request

    candidates = []
    if prefer_gdoc_export:
        candidates.append(f"https://docs.google.com/document/d/{file_id}/export?format=docx")
        candidates.append(f"https://drive.google.com/uc?export=download&id={file_id}")
    else:
        candidates.append(f"https://drive.google.com/uc?export=download&id={file_id}")
        candidates.append(f"https://docs.google.com/document/d/{file_id}/export?format=docx")

    last_error = None
    for url in candidates:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".bin")
        tmp.close()
        try:
            urllib.request.urlretrieve(url, tmp.name)
        except Exception as e:
            last_error = f"{url}: {e}"
            Path(tmp.name).unlink(missing_ok=True)
            continue
        with open(tmp.name, "rb") as fh:
            head = fh.read(8)
        out = Path(tmp.name)
        if head.startswith(b"%PDF"):
            out = out.with_suffix(".pdf")
            Path(tmp.name).rename(out)
            return out
        if head.startswith(b"PK"):
            out = out.with_suffix(".docx")
            Path(tmp.name).rename(out)
            return out
        last_error = f"{url}: unknown content head={head!r}"
        Path(tmp.name).unlink(missing_ok=True)

    raise SystemExit(f"Could not anonymously download file_id={file_id}. Last: {last_error}")


GDOC_URL_RE = re.compile(r"docs\.google\.com/document/d/")


def download_gdoc(url: str) -> Path:
    """Download a Google Doc or PDF from Drive via the `gws` CLI, falling back to anonymous share."""
    m = DRIVE_FILE_ID_RE.search(url)
    if not m:
        raise SystemExit(f"Could not extract Drive file ID from URL: {url}")
    file_id = m.group(1)

    meta_proc = subprocess.run(
        [
            "gws",
            "drive",
            "files",
            "get",
            "--params",
            json.dumps({"fileId": file_id, "fields": "id,name,mimeType"}),
        ],
        capture_output=True,
        text=True,
    )
    if meta_proc.returncode != 0 or "notFound" in meta_proc.stdout or "notFound" in meta_proc.stderr:
        # File not accessible to authenticated gws account; try anonymous link share
        is_gdoc = bool(GDOC_URL_RE.search(url))
        return download_anonymous(file_id, prefer_gdoc_export=is_gdoc)
    # gws prints a header line then JSON; isolate the JSON object
    meta_json = meta_proc.stdout[meta_proc.stdout.index("{") : meta_proc.stdout.rindex("}") + 1]
    meta = json.loads(meta_json)
    mime = meta["mimeType"]

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".docx" if "document" in mime or mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" else ".pdf")
    tmp.close()

    if mime == "application/vnd.google-apps.document":
        # Google Doc — export as .docx
        subprocess.run(
            [
                "gws",
                "drive",
                "files",
                "export",
                "--params",
                json.dumps(
                    {
                        "fileId": file_id,
                        "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    }
                ),
                "--output",
                tmp.name,
            ],
            check=True,
            capture_output=True,
        )
    else:
        # Native .pdf or .docx already in Drive — fetch raw bytes
        subprocess.run(
            [
                "gws",
                "drive",
                "files",
                "get",
                "--params",
                json.dumps({"fileId": file_id, "alt": "media"}),
                "--output",
                tmp.name,
            ],
            check=True,
            capture_output=True,
        )

    return Path(tmp.name)


def extract_docx(path: Path) -> list[dict]:
    import docx  # python-docx

    doc = docx.Document(str(path))
    out: list[dict] = []
    for p in doc.paragraphs:
        text = p.text
        if not text.strip():
            continue
        style_name = (p.style.name or "").lower() if p.style else ""
        if "heading" in style_name or "title" in style_name:
            hint = "heading"
        elif "list" in style_name or p.style and p.style.name and "List" in p.style.name:
            hint = "list_item"
        else:
            # Bold-only paragraph treated as inline heading (matches PSD format)
            runs_text = "".join(r.text for r in p.runs).strip()
            if runs_text and p.runs and all(r.bold for r in p.runs if r.text.strip()):
                hint = "heading"
            else:
                hint = "body"
        out.append({"text": text, "style_hint": hint})
    return out


def extract_pdf(path: Path) -> list[dict]:
    """Extract paragraphs from a PDF using line-position gaps to detect breaks.

    pdfplumber's extract_text() collapses paragraph breaks. We use extract_words()
    to group words into lines, then group lines into paragraphs by Y-coordinate gap.
    """
    import pdfplumber

    all_text_for_validation = ""
    raw_lines: list[tuple[float, float, str]] = []  # (top, height, text)

    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            all_text_for_validation += (page.extract_text() or "") + "\n"
            words = page.extract_words(use_text_flow=True, keep_blank_chars=False)
            if not words:
                continue
            # Group into lines by similar top coordinate (tolerance 2pt)
            lines: list[list[dict]] = []
            for w in sorted(words, key=lambda w: (round(w["top"], 0), w["x0"])):
                if lines and abs(lines[-1][0]["top"] - w["top"]) < 3:
                    lines[-1].append(w)
                else:
                    lines.append([w])
            for line_words in lines:
                line_words.sort(key=lambda w: w["x0"])
                top = line_words[0]["top"]
                height = line_words[0]["bottom"] - line_words[0]["top"]
                text = " ".join(w["text"] for w in line_words)
                raw_lines.append((top, height, text))
            # Inject a page boundary marker (large gap)
            raw_lines.append((float("inf"), 0, ""))

    if len(all_text_for_validation.strip()) < 100:
        raise SystemExit(
            "PDF extracted < 100 chars — likely scanned/image-only. Provide a text-based PDF or .docx."
        )
    replacement_ratio = all_text_for_validation.count("�") / max(len(all_text_for_validation), 1)
    if replacement_ratio > 0.01:
        raise SystemExit(
            f"PDF has high replacement-character ratio ({replacement_ratio:.2%}) — aborting."
        )

    # Group lines into paragraphs by Y-gap > 0.9x line height OR list-item start
    LIST_ITEM = re.compile(r"^\s*(?:[A-Z]\.|\d+\.)\s+\S")
    paragraphs: list[dict] = []
    buffer: list[str] = []
    prev_bottom: float | None = None
    typical_height = 12.0

    def flush() -> None:
        nonlocal buffer
        if not buffer:
            return
        text = " ".join(buffer).strip()
        text = re.sub(r"\s+", " ", text)
        if text:
            is_short = len(text) < 60
            ends_with_punct = text.rstrip().endswith((".", "?", "!", ":", ";", ",", '"', ")", "—"))
            hint = "heading" if (is_short and not ends_with_punct) else "body"
            paragraphs.append({"text": text, "style_hint": hint})
        buffer = []

    for top, height, text in raw_lines:
        if top == float("inf"):
            flush()
            prev_bottom = None
            continue
        if height > 0:
            typical_height = (typical_height + height) / 2
        new_para_by_gap = prev_bottom is not None and (top - prev_bottom) > typical_height * 0.9
        new_para_by_list = LIST_ITEM.match(text)
        if new_para_by_gap or new_para_by_list:
            flush()
        buffer.append(text)
        prev_bottom = top + height
    flush()

    return paragraphs


DATE_TOKEN_RE = re.compile(
    r"\b(adoption\s+date|adoption|adopted|revised|updated|date)\s*[:]\s*([^A-Za-z]+?)(?=\s+(?:adoption|adopted|revised|updated|date)\s*[:]|$)",
    re.I,
)


def detect_dates(paragraphs: list[dict]) -> dict:
    """Best-effort scrape of Adopted / Revised dates from extracted paragraphs.

    Returns {"adopted": str, "revised": str}. Handles inline labels like
    "Adopted: 09/2000 Revised: 04/08/04 Updated: 01/08/09" by tokenizing.
    Combines Adopted/Adoption/Date → adopted.
    Combines Revised/Updated → revised (comma-joined).
    """
    adopted = ""
    revised_parts: list[str] = []
    for p in paragraphs:
        for m in DATE_TOKEN_RE.finditer(p["text"]):
            label = m.group(1).lower()
            value = m.group(2).strip().rstrip(",.;")
            if not value:
                continue
            if label.startswith("adoption") or label == "adopted" or label == "date":
                if not adopted:
                    adopted = value
            elif label in ("revised", "updated"):
                revised_parts.append(value)
    revised = ", ".join(revised_parts)
    return {"adopted": adopted, "revised": revised}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="File path or Google Doc/Drive URL")
    args = ap.parse_args()

    fmt = detect_format(args.source)
    if fmt == "gdoc":
        local_path = download_gdoc(args.source)
        if local_path.suffix == ".docx":
            paragraphs = extract_docx(local_path)
        else:
            paragraphs = extract_pdf(local_path)
        source_path = str(local_path)
    elif fmt in ("http_pdf", "http_docx"):
        local_path = download_http(args.source)
        if local_path.suffix == ".docx":
            paragraphs = extract_docx(local_path)
        else:
            paragraphs = extract_pdf(local_path)
        source_path = str(local_path)
    elif fmt == "docx":
        paragraphs = extract_docx(Path(args.source))
        source_path = args.source
    else:
        paragraphs = extract_pdf(Path(args.source))
        source_path = args.source

    dates = detect_dates(paragraphs)
    json.dump(
        {
            "paragraphs": paragraphs,
            "source_format": fmt,
            "source_path": source_path,
            "detected_dates": dates,
        },
        sys.stdout,
        ensure_ascii=False,
        indent=2,
    )
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
