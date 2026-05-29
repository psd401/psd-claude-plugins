#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "reportlab>=4.0",
# ]
# ///
"""Build a PSD board policy .pdf from extracted paragraphs and metadata.

Mirrors build_docx.py exactly: same page setup, same fonts (Times-Roman /
Times-Bold built into PDF spec — no external font files), same scaffolding
strip, same Cross/Legal References splitting, same Adopted/Revised in body.

Pure-Python via reportlab — no Word, no LibreOffice. Runs headless on Linux.

Reads the JSON output of extract_text.py on stdin (or via --input).
Writes the .pdf to --output (or auto-derives from --policy-number + --title).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageTemplate,
    Paragraph,
    Spacer,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


EMBLEM_REL = Path(__file__).resolve().parents[2] / "psd-brand-guidelines" / "assets" / "psd_logo-2color-square.png"


# Mirror constants from build_docx.py for parity ----------------------------

CROSS_REF_SPLIT = re.compile(r"(?=\b(?:Board\s+Policy\s+\d{4,5}|(?<![.\d])(?<!Policy\s)(?<!Policy)\d{4,5}\s+[A-Z]))")
LEGAL_REF_SPLIT = re.compile(r"(?=\b(?:RCW|WAC|USC|CFR)\s+\S)")
SAFE_FILENAME = re.compile(r"[^A-Za-z0-9 .,'&_()\-]")


def normalize_for_compare(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def _split_with_header(text: str, header_pattern: str, splitter: re.Pattern) -> list[str] | None:
    m = re.match(rf"^(\s*{header_pattern}\s*:?)\s*(.*)$", text, re.I | re.S)
    if not m:
        return None
    header = m.group(1).strip()
    rest = m.group(2).strip()
    if not rest:
        return [header]
    parts = [p.strip() for p in splitter.split(rest) if p.strip()]
    if not parts:
        return [header, rest]
    return [header] + [re.sub(r"\s+", " ", p) for p in parts]


def split_cross_references(text: str) -> list[str] | None:
    return _split_with_header(text, r"cross\s+references?", CROSS_REF_SPLIT)


def split_legal_references(text: str) -> list[str] | None:
    return _split_with_header(text, r"legal\s+references", LEGAL_REF_SPLIT)


def strip_scaffolding(
    paragraphs: list[dict],
    policy_number: str,
    series: str,
    title: str,
) -> list[dict]:
    new_header = normalize_for_compare(f"Policy {policy_number} {series}")
    title_line = normalize_for_compare(title)
    pn = re.escape(policy_number) + r"[A-Za-z]?"
    old_title_block_pat = re.compile(
        rf"^\s*{re.escape(series)}\s*[–-]\s*series\s+\d+\s+{re.escape(title)}\s*[–-]\s*{pn}\s*$",
        re.I,
    )
    date_line_patterns = [
        re.compile(r"^\s*(adoption(?:\s+date)?|adopted|updated|date)\s*[:]", re.I),
        re.compile(r"^\s*revised\s*[:]", re.I),
    ]
    page_footer_pattern = re.compile(
        rf"^\s*page\s+\d+\s+of\s*\d+\s+policy\s+{pn}\s*$",
        re.I,
    )
    cleaned: list[dict] = []
    for p in paragraphs:
        text = p["text"]
        norm = normalize_for_compare(text)
        if norm in (new_header, title_line):
            continue
        if old_title_block_pat.match(text):
            continue
        if page_footer_pattern.match(text):
            continue
        if any(pat.match(text) for pat in date_line_patterns):
            continue
        cleaned.append(p)
    return cleaned


def derive_output_path(policy_number: str, title: str, *, procedure: bool, output: str | None) -> Path:
    number_token = f"{policy_number}p" if procedure else policy_number
    clean_title = SAFE_FILENAME.sub("", title).strip()
    derived_name = f"{number_token} - {clean_title}.pdf"
    if output is None:
        return Path(derived_name)
    p = Path(output)
    if p.is_dir() or output.endswith("/"):
        return p / derived_name
    if p.suffix == "":
        return p / derived_name
    return p


# ---------------------------------------------------------------------------


def make_styles():
    body = ParagraphStyle(
        "Body",
        fontName="Times-Roman",
        fontSize=12,
        leading=12 * 1.15,
        spaceAfter=8,
        spaceBefore=0,
        alignment=TA_LEFT,
    )
    bold_body = ParagraphStyle("BodyBold", parent=body, fontName="Times-Bold")
    title = ParagraphStyle(
        "Title",
        fontName="Times-Bold",
        fontSize=16,
        leading=16 * 1.15,
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    header = ParagraphStyle(
        "Header",
        fontName="Times-Roman",
        fontSize=12,
        leading=12,
        alignment=TA_RIGHT,
        spaceAfter=0,
        spaceBefore=0,
    )
    footer = ParagraphStyle(
        "Footer",
        fontName="Times-Roman",
        fontSize=12,
        leading=12,
        alignment=TA_CENTER,
    )
    return {"body": body, "bold_body": bold_body, "title": title, "header": header, "footer": footer}


def escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build(
    paragraphs: list[dict],
    *,
    policy_number: str,
    series: str,
    title: str,
    adopted: str,
    revised: str,
    output: Path,
) -> None:
    styles = make_styles()

    output.parent.mkdir(parents=True, exist_ok=True)

    margin = inch
    page_w, page_h = LETTER

    # Two frames stacked: header band at top (auto-shown via PageTemplate.onPage)
    # We use BaseDocTemplate so we can paint header/footer on every page.
    doc = BaseDocTemplate(
        str(output),
        pagesize=LETTER,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,
        bottomMargin=margin,
        title=f"Policy {policy_number} - {title}",
        author="Peninsula School District",
    )

    frame = Frame(
        margin,
        margin,
        page_w - 2 * margin,
        page_h - 2 * margin,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )

    # Chrome (header / footer / page numbers) is painted by NumberedCanvas at save time.
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame])])

    story: list = []

    # Centered emblem
    if EMBLEM_REL.exists():
        img = Image(str(EMBLEM_REL), width=1.5 * inch, height=1.5 * inch)
        img.hAlign = "CENTER"
        story.append(img)
        story.append(Spacer(1, 12))
    else:
        sys.stderr.write(f"WARNING: emblem not found at {EMBLEM_REL}\n")

    # Title
    story.append(Paragraph(escape(title), styles["title"]))

    # Body
    cleaned = strip_scaffolding(paragraphs, policy_number, series, title)
    for entry in cleaned:
        text = entry["text"]
        is_heading = entry.get("style_hint") == "heading"
        cross = split_cross_references(text)
        legal = split_legal_references(text)
        if cross:
            for idx, line in enumerate(cross):
                style = styles["bold_body"] if idx == 0 else styles["body"]
                story.append(Paragraph(escape(line), style))
        elif legal:
            for idx, line in enumerate(legal):
                style = styles["bold_body"] if idx == 0 else styles["body"]
                story.append(Paragraph(escape(line), style))
        else:
            style = styles["bold_body"] if is_heading else styles["body"]
            story.append(Paragraph(escape(text), style))

    # Adopted/Revised at end of body — bold label + regular value
    if adopted:
        story.append(Paragraph(f"<b>Adopted:</b> {escape(adopted)}", styles["body"]))
    if revised.strip():
        story.append(Paragraph(f"<b>Revised:</b> {escape(revised)}", styles["body"]))

    # First pass to count pages — reportlab needs this for accurate "Page X of Y"
    # We do a two-pass build: first to a /dev/null-ish to learn total pages,
    # then re-render with that constant. Simpler: use a NumberedCanvas.
    doc.build(story, canvasmaker=_make_numbered_canvas(policy_number, series, page_w, page_h, margin))


def _make_numbered_canvas(policy_number: str, series: str, page_w: float, page_h: float, margin: float):
    from reportlab.pdfgen import canvas as _canvas

    class NumberedCanvas(_canvas.Canvas):
        """Canvas subclass that records page count and stamps Page X of Y after the fact."""

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved_page_states: list[dict] = []

        def showPage(self):
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            total_pages = len(self._saved_page_states)
            for state in self._saved_page_states:
                self.__dict__.update(state)
                self._draw_chrome(total_pages)
                super().showPage()
            super().save()

        def _draw_chrome(self, total_pages: int):
            self.saveState()
            self.setFont("Times-Roman", 12)
            right_x = page_w - margin
            line1_y = page_h - margin + 24
            line2_y = page_h - margin + 12
            self.drawRightString(right_x, line1_y, f"Policy {policy_number}")
            self.drawRightString(right_x, line2_y, series)
            self.drawCentredString(page_w / 2, margin / 2, f"Page {self._pageNumber} of {total_pages}")
            self.restoreState()

    return NumberedCanvas


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", help="JSON file from extract_text.py; default stdin")
    ap.add_argument("--policy-number", required=True)
    ap.add_argument("--series", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--adopted", default=None)
    ap.add_argument("--revised", default=None)
    ap.add_argument("--procedure", action="store_true")
    ap.add_argument("--output", help="Explicit output .pdf path or directory")
    args = ap.parse_args()
    output_path = derive_output_path(args.policy_number, args.title, procedure=args.procedure, output=args.output)

    if args.input:
        data = json.loads(Path(args.input).read_text())
    else:
        data = json.loads(sys.stdin.read())

    detected = data.get("detected_dates") or {}
    adopted = args.adopted if args.adopted is not None else detected.get("adopted", "")
    revised = args.revised if args.revised is not None else detected.get("revised", "")

    build(
        data["paragraphs"],
        policy_number=args.policy_number,
        series=args.series,
        title=args.title,
        adopted=adopted,
        revised=revised,
        output=output_path,
    )

    print(json.dumps({"output": str(output_path), "paragraph_count": len(data["paragraphs"])}))


if __name__ == "__main__":
    main()
