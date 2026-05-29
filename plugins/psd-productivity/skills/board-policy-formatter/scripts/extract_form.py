#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "python-docx>=1.2.0",
#   "pdfplumber>=0.11.0",
# ]
# ///
"""Form-aware extractor.

Wraps extract_text.py with extra structural detection for forms:

  * `tables`         — bordered tables detected by pdfplumber.extract_tables
  * `field_rows`     — `Label: ___________` patterns (single + multi-column)
  * `checkboxes`     — `☐ Label` / `[ ] Label` patterns
  * `revision_date`  — footer revision marker (e.g., 'Revised 06-30-2010')

Output JSON shape:
  {
    "title": str,                  # detected (or empty if undetectable)
    "subtitle": str,               # optional second-line title (e.g., "Please print legibly")
    "revision_date": str,
    "blocks": [                    # ordered render list
      {"type": "paragraph", "text": str, "style_hint": "body|heading|bold"},
      {"type": "field_row", "fields": [{"label": str}, ...]},
      {"type": "checkbox_group", "label": str, "options": [str, ...]},
      {"type": "table", "rows": [[str, ...], ...]},
      ...
    ],
    "source_format": "pdf|docx|gdoc",
    "detected_dates": {"adopted": "", "revised": ""}   # forms usually don't have these
  }
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# Reuse the policy extractor's download/extract logic
sys.path.insert(0, str(Path(__file__).parent))
from extract_text import (  # noqa: E402
    detect_format,
    download_anonymous,
    download_gdoc,
    download_http,
    extract_docx,
    extract_pdf,
    detect_dates,
)


# Patterns ------------------------------------------------------------------

CHECKBOX_RE = re.compile(r"☐\s*([^☐\n]+?)(?=\s+☐|\s+__FIELDLINE__|$)", re.U)
ANY_CHECKBOX = re.compile(r"☐")
# Strict: word-boundary-anchored capital label, then colon + fieldline.
# Labels may include commas (e.g., "Principal, Program Manager or Designee Approval").
FIELD_PATTERN = re.compile(r"(?<![A-Za-z])([A-Z][A-Za-z'/\-,]*(?:\s+[A-Za-z'/\-(),]+){0,7})\s*:\s*(?:_+|__FIELDLINE__)", re.U)
LABEL_COLON_PATTERN = re.compile(r"(?<![A-Za-z])([A-Z][A-Za-z'/\-,]*(?:\s+[A-Za-z'/\-(),]+){0,7})\s*:\s+", re.U)
# Section-banner prefix: SHORT ALL-CAPS string followed by colon at the very start
SECTION_PREFIX = re.compile(r"^\s*([A-Z][A-Z0-9 /'&\-]{2,40})\s*:\s+(.+)$")
TRAILING_FIELDLINE = re.compile(r"\s*__FIELDLINE__\s*$")
REVISION_RE = re.compile(
    r"\b(?:rev(?:ised|\.)?|revision)\s*[:]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[-/.]\d{4}|\d{1,2}[-/.]\d{2}|[A-Za-z]+\s+\d{4})",
    re.I,
)
FORM_FOOTER_RE = re.compile(r"\bForm\s+([0-9]+[A-Za-z]?[0-9]*)\b", re.I)


def detect_revision_date(paragraphs: list[dict]) -> str:
    for p in paragraphs[-10:]:  # look near end of doc
        m = REVISION_RE.search(p["text"])
        if m:
            return m.group(1)
    for p in paragraphs:
        m = REVISION_RE.search(p["text"])
        if m:
            return m.group(1)
    return ""


FORM_ID_RE = re.compile(r"^\s*\d{3,5}\s*[Ff]\d*\s*$")
ADDRESS_RE = re.compile(r"\d+(?:st|nd|rd|th)?\s+\S+\s+(?:Ave|St|Street|Avenue|Road|Way|NW|SE|NE|SW)", re.I)


def is_skip_for_title(text: str) -> bool:
    t = text.strip()
    if not t:
        return True
    low = t.lower()
    if low.startswith("peninsula school district"):
        return True
    if FORM_ID_RE.match(t):
        return True
    if "__FIELDLINE__" in t or "☐" in t:
        return True
    if low.startswith(("rev ", "rev.", "revised", "revision")):
        return True
    if ADDRESS_RE.search(t):
        return True
    if re.match(r"^\d", t):  # starts with digits (address numbers, dates)
        return True
    if low in ("please print legibly", "please print legibly or type"):
        return True
    return False


CAPS_TITLE_RE = re.compile(
    r"\b([A-Z][A-Z0-9 /'\-&()]{2,100}(?:FORM|REQUEST|REPORT|STATEMENT|NOTICE|AGREEMENT|APPLICATION|WAIVER|AUTHORIZATION|CONSENT|RECORD|CHECKLIST|LETTER|PLAN|ORDER|IMPROVEMENTS|DONATION|POLICY|PROCEDURE|GUIDELINE|CHECKLIST|CONTRACT|AGREEMENT|RESPONSE|REGISTRATION|EVALUATION|REPORT))\b"
)
BAD_TITLE_RE = re.compile(r"^\s*(?:\d+\.|[a-z]\)|sincerely|regards|dear |cc:|enclosures?\b)", re.I)


ADDRESS_PREFIX_RE = re.compile(
    # Anchored: 4-5 digit street #, then arbitrary intervening text, then ZIP, then
    # optional phone(s) / fax / web. Greedy enough to consume the full letterhead line.
    r"^\s*\d{4,5}\s+.{5,80}?\b\d{5}(?:[-\s]\d{4})?(?:\s+\d{3}[\s.\-]\d{3}[\s.\-]\d{4})?(?:\s+Fax:?\s*\d{3}[\s.\-]\d{3}[\s.\-]\d{4})?(?:\s+\d{3}[\s.\-]\d{3}[\s.\-]\d{4}\s+fax)?(?:\s+(?:www\.\S+))?",
    re.I,
)


def _strip_address_prefix(text: str) -> str:
    """Remove a leading district letterhead address from a paragraph."""
    m = ADDRESS_PREFIX_RE.match(text)
    if m:
        return text[m.end():].strip(" ,-")
    # Also handle short phone-only prefix
    m2 = re.match(r"^\s*\d{3}[\s.\-]\d{3}[\s.\-]\d{4}(?:\s+Fax:?\s+\d{3}[\s.\-]\d{3}[\s.\-]\d{4})?", text)
    if m2:
        return text[m2.end():].strip(" ,-")
    return text


def detect_title(paragraphs: list[dict]) -> tuple[str, str]:
    """Find the title (and optional subtitle) of the form.

    Strategies:
      1) Walk paragraphs in order; strip address/branding prefixes from each.
      2) Skip field-label lines (text with `:` followed by `_+` or `__FIELDLINE__`).
      3) Take the first heading-like paragraph that contains a form-word OR is
         mostly title-case under 100 chars.
    """
    if not paragraphs:
        return "", ""
    title = ""
    subtitle = ""

    # Walk paragraphs in order; preprocess address/branding prefix
    for p in paragraphs[:10]:
        raw = p["text"].strip()
        text = _strip_address_prefix(raw)
        # Strip Peninsula School District branding prefix
        low = text.lower()
        if low.startswith("peninsula school district"):
            text = text[len("peninsula school district"):].strip(" -:")
        # Strip leading FIELDLINE marker (some forms have one above the title)
        text = re.sub(r"^\s*__FIELDLINE__\s+", "", text)
        if not text:
            continue
        if text.lower() in ("please print legibly", "please print legibly or type"):
            continue
        if FORM_ID_RE.match(text) or re.match(r"^\s*page\s+\d+\s+of", text, re.I):
            continue

        # If text contains a form-word title (CAPS_TITLE_RE), extract it even if
        # the paragraph also has fieldlines or extra content trailing.
        m = CAPS_TITLE_RE.search(text)
        if m:
            title = m.group(1).strip()
            # If the matched title is short, also try to extend with adjacent caps
            # words (e.g., "STATEMENT FOR LAW ENFORCEMENT" continues after "STATEMENT")
            after = text[m.end():].strip()
            extra_words = []
            for word in after.split():
                if word.upper() == word and word.isalpha() and len(word) > 1:
                    extra_words.append(word)
                else:
                    break
            if extra_words:
                title = title + " " + " ".join(extra_words)
            break

        # No CAPS title found. Skip clear field-row paragraphs.
        if "__FIELDLINE__" in text or re.search(r":\s*_+", text):
            continue
        # Skip body sentences (long, ends with period)
        if len(text) > 100 and text.rstrip().endswith("."):
            continue
        # Reject obvious non-titles (list items, letter sign-offs)
        if BAD_TITLE_RE.match(text):
            continue
        # Accept short heading-style or title-case lines
        is_heading = p.get("style_hint") == "heading"
        is_short = len(text) < 100
        if is_heading or is_short:
            title = text
            break

    # Strip trailing "Form NNNN" or similar form-id from detected title
    if title:
        title = re.sub(r"\s+Form\s+\d+[A-Za-z]?\d*\s*$", "", title, flags=re.I).strip()
        title = re.sub(r"\s+\d+[Ff]\d*\s*$", "", title).strip()

    return title, subtitle


def parse_checkbox_group(text: str) -> dict | None:
    """If text contains one or more checkboxes, return a checkbox_group block."""
    if not ANY_CHECKBOX.search(text):
        return None
    # Strip fieldline markers to clean checkbox label parsing
    cleaned = text.replace("__FIELDLINE__", "").strip()
    head_split = re.split(r"☐", cleaned, maxsplit=1)
    label = head_split[0].strip().rstrip(":")
    options: list[str] = []
    # Parse options as the text following each ☐, terminated by next ☐ or end
    parts = re.split(r"☐", cleaned)
    for part in parts[1:]:  # skip pre-checkbox label
        opt = re.sub(r"\s+", " ", part).strip().rstrip(",;")
        # Truncate if option is unreasonably long (likely sentence continuation)
        if len(opt) > 120:
            opt = opt.split(".")[0].strip()
        if opt:
            options.append(opt)
    if not options:
        return None
    return {"type": "checkbox_group", "label": label, "options": options}


def _residual_after_fields(text: str, matches: list) -> str:
    """Remove all matched field-label spans + FIELDLINE/underscore markers,
    return what's left. Used to decide if a paragraph is mostly fields or mostly prose."""
    spans = sorted([(m.start(), m.end()) for m in matches])
    out = []
    cursor = 0
    for s, e in spans:
        if s > cursor:
            out.append(text[cursor:s])
        cursor = e
    out.append(text[cursor:])
    residual = "".join(out)
    residual = re.sub(r"__FIELDLINE__", "", residual)
    residual = re.sub(r"_+", "", residual)
    return re.sub(r"\s+", " ", residual).strip()


def parse_field_row(text: str) -> dict | None:
    """Detect a field row. Conservative: only convert when matched labels
    cover most of the paragraph. Otherwise the paragraph is body prose and
    must be preserved character-for-character (rendered as a paragraph)."""
    cleaned = re.sub(r"^\s*__FIELDLINE__\s+", "", text)
    has_field = "__FIELDLINE__" in cleaned or "_" * 3 in cleaned

    # Pure label-only paragraph (e.g., "Date:") — render with an underline even
    # without an explicit fieldline marker, so it doesn't sit naked.
    pure = cleaned.strip()
    if pure.endswith(":") and 2 < len(pure) <= 60 and not re.search(r"[.?!,]", pure):
        # Multiple labels on one line like "Today's Date: Site:" — split into
        # separate fields so each gets its own fill line.
        inner_labels = [seg.strip() for seg in re.split(r":\s+", pure.rstrip(":")) if seg.strip()]
        # Each segment must look like a real label (starts with a capital letter)
        if all(re.match(r"^[A-Z]", lbl) for lbl in inner_labels) and len(inner_labels) >= 1:
            return {"type": "field_row", "fields": [{"label": lbl} for lbl in inner_labels]}

    if not has_field:
        return None

    # Strict matches first (label + immediate fieldline)
    strict = list(FIELD_PATTERN.finditer(cleaned))
    if strict:
        residual = _residual_after_fields(cleaned, strict)
        # Strict-match: residual must be tiny (e.g., a few connector words like "OR")
        if len(residual) <= 12 or len(residual) < 0.20 * len(cleaned):
            return {"type": "field_row", "fields": [{"label": m.group(1).strip()} for m in strict]}

    # Trailing-fieldline-only single label (e.g., "Today's Date:" with line below)
    if TRAILING_FIELDLINE.search(cleaned):
        stripped = TRAILING_FIELDLINE.sub("", cleaned).strip()
        if stripped.endswith(":") and len(stripped) <= 60 and not re.search(r"[.?!]\s", stripped):
            inner_labels = [seg.strip() for seg in re.split(r":\s+", stripped.rstrip(":")) if seg.strip()]
            if all(re.match(r"^[A-Z]", lbl) for lbl in inner_labels) and len(inner_labels) >= 1:
                return {"type": "field_row", "fields": [{"label": lbl} for lbl in inner_labels]}


    # Loose: full paragraph contains fieldline AND multiple Label: patterns,
    # AND collectively cover most of the paragraph
    loose = list(LABEL_COLON_PATTERN.finditer(cleaned))
    if len(loose) >= 2:
        residual = _residual_after_fields(cleaned, loose)
        if len(residual) <= 20 or len(residual) < 0.25 * len(cleaned):
            labels = [m.group(1).strip() for m in loose if len(m.group(1)) <= 35]
            if len(labels) >= 2:
                return {"type": "field_row", "fields": [{"label": lbl} for lbl in labels]}

    return None


def extract_pdf_with_tables(path: Path) -> tuple[list[dict], list[dict]]:
    """Extract structurally-aware paragraphs + tables.

    Reconstructs paragraphs from positioned words AND injects structure markers:
      `__FIELDLINE__`  — placeholder for a horizontal rule under text (field fill line)
      `☐`              — checkbox glyph injected based on small-square rectangles

    Returns (paragraphs, tables) where each paragraph dict has the same shape
    as extract_pdf returns: {text, style_hint}.
    """
    import pdfplumber

    paragraphs: list[dict] = []
    tables: list[dict] = []

    with pdfplumber.open(str(path)) as pdf:
        for page_no, page in enumerate(pdf.pages, 1):
            words = page.extract_words(use_text_flow=True, keep_blank_chars=False) or []
            # Geometric primitives — use `top`/`bottom` (page-top coords) to match `words`.
            # Field underlines must be wider than checkboxes (>30pt) to avoid double-counting.
            h_lines: list[tuple[float, float, float]] = []  # (top, x0, x1)
            for ln in (page.lines or []):
                if abs(ln["top"] - ln["bottom"]) < 1.5:
                    w = abs(ln["x1"] - ln["x0"])
                    if 30 < w < 600:
                        h_lines.append((ln["top"], min(ln["x0"], ln["x1"]), max(ln["x0"], ln["x1"])))
            for r in (page.rects or []):
                rw = abs(r["x1"] - r["x0"])
                rh = abs(r["bottom"] - r["top"])
                if rh < 2 and 30 < rw < 600:  # very thin → treat as line
                    h_lines.append((r["top"], min(r["x0"], r["x1"]), max(r["x0"], r["x1"])))
            checkboxes: list[tuple[float, float]] = []  # (x, top) of box
            # 1) checkboxes drawn as a single rect
            for r in (page.rects or []):
                rw = abs(r["x1"] - r["x0"])
                rh = abs(r["bottom"] - r["top"])
                if 6 < rw < 25 and 6 < rh < 25 and abs(rw - rh) < 8:
                    cx = (r["x0"] + r["x1"]) / 2
                    cy_top = (r["top"] + r["bottom"]) / 2
                    checkboxes.append((cx, cy_top))
            # 2) checkboxes drawn as 4 line segments (top + bottom + 2 sides)
            #    Detect by pairing two short horizontal lines with matching X range
            short_h = []
            for ln in (page.lines or []):
                if abs(ln["top"] - ln["bottom"]) < 1.5:
                    w = abs(ln["x1"] - ln["x0"])
                    if 8 < w < 30:
                        short_h.append((ln["top"], min(ln["x0"], ln["x1"]), max(ln["x0"], ln["x1"])))
            short_h.sort()
            for i, (t, x0, x1) in enumerate(short_h):
                for t2, x0_2, x1_2 in short_h[i + 1 : i + 6]:
                    dy = abs(t2 - t)
                    if 6 < dy < 25 and abs(x0_2 - x0) < 3 and abs(x1_2 - x1) < 3:
                        cx = (x0 + x1) / 2
                        cy = (t + t2) / 2
                        checkboxes.append((cx, cy))
                        break

            # Group words into lines by top coordinate
            if not words:
                continue
            lines: list[list[dict]] = []
            for w in sorted(words, key=lambda w: (round(w["top"], 0), w["x0"])):
                if lines and abs(lines[-1][0]["top"] - w["top"]) < 3:
                    lines[-1].append(w)
                else:
                    lines.append([w])

            # For each line, compose text with structure markers
            line_records: list[tuple[float, float, str]] = []  # (top, height, text)
            for line_words in lines:
                line_words.sort(key=lambda w: w["x0"])
                top = line_words[0]["top"]
                bottom = line_words[0]["bottom"]
                line_h = bottom - top

                # Inject checkboxes that sit on this line (cy close to line center, top coords)
                cy_line = (top + bottom) / 2
                line_cbs = sorted([cb for cb in checkboxes if abs(cb[1] - cy_line) < max(line_h, 12) * 1.2], key=lambda c: c[0])

                # Build a list of (x, token) — words and checkboxes interleaved
                tokens: list[tuple[float, str]] = []
                for w in line_words:
                    tokens.append((w["x0"], w["text"]))
                for cb in line_cbs:
                    tokens.append((cb[0], "☐"))
                tokens.sort(key=lambda t: t[0])
                text = " ".join(t[1] for t in tokens)

                # Inject FIELDLINE markers for horizontal rules near this line.
                # Three patterns to detect (top-of-page coordinates: smaller = higher):
                #   (a) inline fill: rule's top within ±line_h of the text bottom (label
                #       on same line as the line). e.g., `CASE NUMBER: ___`
                #   (b) caption-below: rule sits ABOVE the text (line_h above), text is
                #       the caption (e.g., `DATE` underneath a signature line).
                #   (c) line-above: rule just BELOW current text (multi-line response area
                #       continuation). Rare for single line forms; skipped here.
                inline = [hl for hl in h_lines if abs(hl[0] - bottom) < line_h * 0.8]
                caption_above = [hl for hl in h_lines if 0 < top - hl[0] < line_h * 1.5]
                # Detect inline gaps inside the text — multiple short rules at different X
                # imply column layout (e.g., 3 signature lines in a row)
                if inline:
                    text = text + " __FIELDLINE__"
                elif caption_above:
                    # Caption text below a line — prefix with a marker so the renderer
                    # can pair it as `Label: _____` style
                    text = "__FIELDLINE__ " + text

                line_records.append((top, line_h, text))

            # Group lines into paragraphs by Y-gap
            LIST_ITEM = re.compile(r"^\s*(?:[A-Z]\.|\d+\.)\s+\S")
            buffer: list[str] = []
            prev_bottom = None
            typical_height = 12.0
            page_paragraphs: list[dict] = []

            def flush():
                nonlocal buffer
                if not buffer:
                    return
                t = " ".join(buffer).strip()
                t = re.sub(r"\s+", " ", t)
                if t:
                    is_short = len(t) < 60
                    has_field = "__FIELDLINE__" in t
                    has_cb = "☐" in t
                    ends_punct = t.rstrip().endswith((".", "?", "!", ":", ";", ",", '"', ")", "—"))
                    hint = "heading" if (is_short and not ends_punct and not has_field and not has_cb) else "body"
                    page_paragraphs.append({"text": t, "style_hint": hint})
                buffer = []

            for top, height, text in line_records:
                if height > 0:
                    typical_height = (typical_height + height) / 2
                new_para_by_gap = prev_bottom is not None and (top - prev_bottom) > typical_height * 0.9
                new_para_by_list = bool(LIST_ITEM.match(text))
                if new_para_by_gap or new_para_by_list:
                    flush()
                buffer.append(text)
                prev_bottom = top + height
            flush()
            paragraphs.extend(page_paragraphs)

            # Tables (pdfplumber)
            for raw in (page.extract_tables() or []):
                rows: list[list[str]] = []
                for r in raw:
                    cells = [re.sub(r"\s+", " ", (c or "").strip()) for c in r]
                    if any(cells):
                        rows.append(cells)
                if rows:
                    tables.append({"page": page_no, "rows": rows})

    return paragraphs, tables


def extract_docx_with_tables(path: Path) -> tuple[list[dict], list[dict]]:
    import docx

    paragraphs = extract_docx(path)
    doc = docx.Document(str(path))
    tables: list[dict] = []
    for t in doc.tables:
        rows = []
        for row in t.rows:
            cells = [c.text.strip() for c in row.cells]
            cells = [re.sub(r"\s+", " ", c) for c in cells]
            if any(cells):
                rows.append(cells)
        if rows:
            tables.append({"page": 1, "rows": rows})
    return paragraphs, tables


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def build_blocks(paragraphs: list[dict], tables: list[dict], title: str, subtitle: str) -> list[dict]:
    """Convert paragraphs + tables into an ordered block list.

    Strategy: walk paragraphs; for each, classify as checkbox_group / field_row
    / paragraph. Tables are interleaved by best-effort heuristic — for now we
    insert them as standalone blocks at the end of the body (after paragraphs
    that LOOK like they introduce them). A future iteration can position them
    by page+y.
    """
    blocks: list[dict] = []
    title_norm = _norm(title) if title else ""
    subtitle_norm = _norm(subtitle) if subtitle else ""
    branded_title_norm = _norm(f"Peninsula School District {title}") if title else ""
    title_words = set(title_norm.split()) if title_norm else set()
    # Collect text strings already inside detected tables (so we can drop
    # paragraph copies of those cells)
    table_text_norm: set[str] = set()
    for t in tables:
        for row in t["rows"]:
            for cell in row:
                if cell.strip():
                    table_text_norm.add(cell.lower().strip())

    def paragraph_is_revision_footer(text: str) -> bool:
        return bool(REVISION_RE.match(text.strip())) or bool(re.match(r"^\s*page\s+\d+\s+of\s+\d+", text, re.I))

    # Reuse ADDRESS_PREFIX_RE plus phone-only and url-only filters
    phone_only_re = re.compile(r"^\s*\d{3}[\s.\-]\d{3}[\s.\-]\d{4}", re.I)
    url_only_re = re.compile(r"^\s*www\.\S+\s*$", re.I)

    for p in paragraphs:
        text = p["text"]
        norm = text.strip().lower()
        if not norm:
            continue
        # Skip title/subtitle (they're rendered separately)
        if norm == title_norm or norm == subtitle_norm:
            continue
        if branded_title_norm and norm == branded_title_norm:
            continue
        # If a paragraph BEGINS with the detected title, peel off the title and
        # keep the tail (subtitle / submit-instruction). Never drop content.
        # Only LSTRIP leading separators — preserve trailing punctuation in the tail.
        if title_norm and norm.startswith(title_norm):
            tail_text = text[len(title_norm):].lstrip(" :.-\n\t")
            if not tail_text:
                continue
            text = tail_text
            norm = text.strip().lower()
        # Skip the Peninsula School District branding
        if norm == "peninsula school district":
            continue
        # Skip pure dashed/decorative separator lines
        if re.match(r"^[\s\-_=*]{8,}$", text):
            continue
        # Skip a leading dashed separator followed by content — keep just the content
        m_dash = re.match(r"^[\s\-_=*]{8,}\s*(.+)$", text)
        if m_dash:
            text = m_dash.group(1).strip()
            norm = text.strip().lower()
            if not text:
                continue
        # Skip pure form-id / page-number footer lines
        if re.match(r"^\s*form\s+\d+", text, re.I) and len(text) < 30:
            continue
        if FORM_ID_RE.match(text):
            continue
        if re.match(r"^\s*page\s+\d+\s+of\s+\d+", text, re.I):
            continue
        # Skip a paragraph that's exactly one cell from a detected table
        if norm in table_text_norm and len(norm) < 80:
            continue
        # Skip plain "Revised XX/XX/XXXX" or "Rev MM/DD/YY" — captured as revision_date
        if paragraph_is_revision_footer(text):
            continue
        # Skip district address/phone letterhead lines (or peel them as a prefix)
        peeled = _strip_address_prefix(text)
        if peeled != text:
            if peeled.strip() and len(peeled.strip()) > 10:
                text = peeled.strip(" ,-")
                norm = text.strip().lower()
            else:
                continue
        elif phone_only_re.match(text) or url_only_re.match(text):
            continue

        # Section-banner prefix — peel off SHORT ALL-CAPS prefix as its own banner,
        # then process the remaining text as a separate block.
        m = SECTION_PREFIX.match(text)
        if m:
            section_text = m.group(1).strip()
            remainder = m.group(2).strip()
            # Only treat as banner if the prefix is genuinely all-caps + short
            words = [w for w in section_text.split() if any(c.isalpha() for c in w)]
            caps_words = [w for w in words if w == w.upper()]
            if words and len(caps_words) >= max(1, len(words) - 1):
                blocks.append({"type": "paragraph", "text": section_text, "style_hint": "heading"})
                # Recurse on remainder — re-detect its type
                if remainder:
                    text = remainder
                    norm = text.strip().lower()
                    # Re-skip checks would already have been performed
                else:
                    continue

        cb = parse_checkbox_group(text)
        if cb:
            blocks.append(cb)
            continue
        fr = parse_field_row(text)
        if fr:
            blocks.append(fr)
            continue
        # Strip remaining stray FIELDLINE markers that didn't pair into a field
        clean_text = TRAILING_FIELDLINE.sub("", text).replace("__FIELDLINE__", " ____ ").strip()
        clean_text = re.sub(r"\s+", " ", clean_text)
        blocks.append({"type": "paragraph", "text": clean_text, "style_hint": p.get("style_hint", "body")})

    # Append tables at the end (best-effort; layout fidelity for in-flow tables
    # would require positional reconciliation we skip in v1)
    for t in tables:
        blocks.append({"type": "table", "rows": t["rows"]})
    return blocks


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    args = ap.parse_args()

    fmt = detect_format(args.source)
    if fmt == "gdoc":
        local = download_gdoc(args.source)
        if local.suffix == ".docx":
            paragraphs, tables = extract_docx_with_tables(local)
        else:
            paragraphs, tables = extract_pdf_with_tables(local)
        source_path = str(local)
    elif fmt in ("http_pdf", "http_docx"):
        local = download_http(args.source)
        if local.suffix == ".docx":
            paragraphs, tables = extract_docx_with_tables(local)
        else:
            paragraphs, tables = extract_pdf_with_tables(local)
        source_path = str(local)
    elif fmt == "docx":
        paragraphs, tables = extract_docx_with_tables(Path(args.source))
        source_path = args.source
    else:
        paragraphs, tables = extract_pdf_with_tables(Path(args.source))
        source_path = args.source

    title, subtitle = detect_title(paragraphs)
    revision = detect_revision_date(paragraphs)
    blocks = build_blocks(paragraphs, tables, title, subtitle)

    out = {
        "title": title,
        "subtitle": subtitle,
        "revision_date": revision,
        "blocks": blocks,
        "raw_paragraphs": paragraphs,  # kept for verification
        "raw_tables": tables,
        "source_format": fmt,
        "source_path": source_path,
        "detected_dates": detect_dates(paragraphs),
    }
    json.dump(out, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
