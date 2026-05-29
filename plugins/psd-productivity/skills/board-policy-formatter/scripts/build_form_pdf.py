#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "reportlab>=4.0",
# ]
# ///
"""Build a beautifully designed PSD-branded form .pdf from extract_form.py JSON.

Matches build_form_docx.py styling: same Times New Roman everywhere, same
header/footer/title structure as policies, with sprinkled visual elements:
  * Pacific-blue section banners
  * Branded data tables (Pacific header band + alternating SeaFoam rows)
  * Field rows as bordered tables
  * Sea Glass divider above page footer
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

sys.path.insert(0, str(Path(__file__).parent))
from design import (  # noqa: E402
    PACIFIC, SEA_GLASS, SEA_FOAM, WHULGE, MUTED_GRAY, BODY_GRAY, WHITE,
    SIZE_TITLE, SIZE_SUBTITLE, SIZE_SECTION, SIZE_BODY, SIZE_LABEL, SIZE_FOOTER,
)


EMBLEM_REL = Path(__file__).resolve().parents[2] / "psd-brand-guidelines" / "assets" / "psd_logo-2color-square.png"
SAFE_FILENAME = re.compile(r"[^A-Za-z0-9 .,'&_()\-]")
INLINE_FIELD_RE = re.compile(
    r"(?<![A-Za-z])([A-Z][A-Za-z'/\-]*(?:[,]?\s+[A-Za-z'/\-(),]+){0,8})\s*:\s*_+"
)
USABLE_WIDTH = 6.5 * inch


def hexcolor(s: str) -> colors.Color:
    return colors.HexColor("#" + s)


def make_styles():
    body = ParagraphStyle("Body", fontName="Times-Roman", fontSize=SIZE_BODY,
                          leading=SIZE_BODY * 1.3, spaceAfter=8, alignment=TA_LEFT,
                          textColor=hexcolor(BODY_GRAY))
    bold_body = ParagraphStyle("BodyBold", parent=body, fontName="Times-Bold")
    italic_body = ParagraphStyle("BodyItalic", parent=body, fontName="Times-Italic")
    title = ParagraphStyle("Title", fontName="Times-Bold", fontSize=SIZE_TITLE,
                           leading=SIZE_TITLE * 1.15, alignment=TA_CENTER, spaceAfter=6,
                           textColor=colors.black)
    subtitle = ParagraphStyle("Subtitle", fontName="Times-Italic", fontSize=SIZE_SUBTITLE,
                              leading=SIZE_SUBTITLE * 1.2, alignment=TA_CENTER, spaceAfter=14,
                              textColor=hexcolor(MUTED_GRAY))
    label = ParagraphStyle("Label", fontName="Times-Bold", fontSize=SIZE_LABEL,
                           leading=SIZE_LABEL * 1.2, alignment=TA_LEFT,
                           textColor=hexcolor(PACIFIC), spaceAfter=0)
    label_left = label
    section = ParagraphStyle("Section", fontName="Times-Bold", fontSize=SIZE_SECTION,
                             leading=SIZE_SECTION * 1.2, alignment=TA_LEFT,
                             textColor=hexcolor(WHITE), spaceAfter=0)
    return {"body": body, "bold_body": bold_body, "italic_body": italic_body,
            "title": title, "subtitle": subtitle, "label": label,
            "label_left": label_left, "section": section}


def escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def derive_output_path(form_number: str, title: str, *, output: str | None) -> Path:
    clean = SAFE_FILENAME.sub("", title or "Form").strip()
    name = f"{form_number} - {clean}.pdf"
    if output is None:
        return Path(name)
    p = Path(output)
    if p.is_dir() or output.endswith("/") or p.suffix == "":
        return p / name
    return p


def is_section_paragraph(text: str) -> bool:
    """A short ALL-CAPS line (with or without trailing colon) — likely a section header."""
    t = text.strip().rstrip(":").strip()
    if not t or len(t) > 60:
        return False
    if "☐" in t or "_" in t:
        return False
    # Reject if it has more than one inline colon (looks like multi-field row)
    if t.count(":") > 0:
        return False
    if not any(c.isalpha() for c in t):
        return False
    words = [w for w in t.split() if any(c.isalpha() for c in w)]
    if not words:
        return False
    # Most words must be all-caps
    caps_count = sum(1 for w in words if w == w.upper())
    return caps_count >= max(1, len(words) - 1)


def section_banner(text: str, styles) -> Table:
    """Full-width Pacific-blue band with white bold caps section title."""
    cell_para = Paragraph(escape(text.upper()), styles["section"])
    t = Table([[cell_para]], colWidths=[USABLE_WIDTH])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), hexcolor(PACIFIC)),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def _estimate_label_width(label: str) -> float:
    """Measure the actual width of the bold label rendered in 12pt Times.
    Uses reportlab.pdfbase.pdfmetrics for true font-metric measurement."""
    from reportlab.pdfbase import pdfmetrics
    text = f"{label.strip().rstrip(':')}:"
    w = pdfmetrics.stringWidth(text, "Times-Bold", SIZE_LABEL)
    # Add a tiny pad so the colon doesn't kiss the fill
    return max(36, min(220, w + 10))


def field_rows_split(labels: list[str], styles, max_per_row: int = 3) -> list:
    """If labels would overcrowd one line, split across multiple rows."""
    if not labels:
        return []
    needed = sum(_estimate_label_width(l) + 72 for l in labels) + 16 * (len(labels) - 1)
    if needed <= USABLE_WIDTH and len(labels) <= max_per_row:
        return [field_row(labels, styles), Spacer(1, 4)]
    chunks: list[list[str]] = []
    cur: list[str] = []
    cur_width = 0.0
    for lbl in labels:
        w = _estimate_label_width(lbl) + 72
        if cur and (cur_width + w + 16 > USABLE_WIDTH or len(cur) >= max_per_row):
            chunks.append(cur); cur = []; cur_width = 0
        cur.append(lbl)
        cur_width += w + (16 if cur_width else 0)
    if cur:
        chunks.append(cur)
    out = []
    for c in chunks:
        out.append(field_row(c, styles))
        out.append(Spacer(1, 4))
    return out


def field_row(labels: list[str], styles) -> Paragraph:
    """Render fields as a single inline Paragraph with bold labels + underlined
    fill runs. Avoids the column-collapse problem of multi-cell tables."""
    n = max(1, len(labels))
    # Distribute usable width across N fields. Subtract label widths to size fills.
    label_widths = [_estimate_label_width(lbl) for lbl in labels]
    total_label = sum(label_widths)
    fill_total = USABLE_WIDTH - total_label - 16 * (n - 1)
    fill_w = max(60, fill_total / n)
    # Approximate chars per fill: an underlined &nbsp; is roughly 4-5pt wide at 12pt Times
    chars_per_fill = int(fill_w / 3.2)
    parts = []
    for i, lbl in enumerate(labels):
        if i > 0:
            parts.append("&nbsp;&nbsp;&nbsp;")
        parts.append(f"<b><font color='#{PACIFIC}'>{escape(lbl.strip().rstrip(':'))}:</font></b>&nbsp;")
        parts.append(f"<u><font color='#{PACIFIC}'>{'&nbsp;' * chars_per_fill}</font></u>")
    return Paragraph("".join(parts), styles["body"])
    """1-row table with N×2 cells: compact bold label + wide bottom-bordered fill."""
    n = max(1, len(labels))
    label_widths = [_estimate_label_width(lbl) for lbl in labels]
    total_label = sum(label_widths)
    # Fill cells share remaining width equally, with right-side gutter
    gutter = 8  # pt between field pairs
    fill_total = USABLE_WIDTH - total_label - gutter * (n - 1)
    fill_w = max(60, fill_total / n)
    cells = []
    col_widths = []
    for i, label in enumerate(labels):
        cells.append(Paragraph(f"{escape(label.strip().rstrip(':'))}:", styles["label"]))
        cells.append(Paragraph("", styles["body"]))
        col_widths += [label_widths[i], fill_w]
    t = Table([cells], colWidths=col_widths)
    style_cmds = [
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]
    for i in range(n):
        fill_col = i * 2 + 1
        style_cmds.append(("LINEBELOW", (fill_col, 0), (fill_col, 0), 0.6, hexcolor(PACIFIC)))
        # No right-padding on the last fill cell of a row
        if i < n - 1:
            style_cmds.append(("RIGHTPADDING", (fill_col, 0), (fill_col, 0), 16))
    t.setStyle(TableStyle(style_cmds))
    return t


def response_area(prompt: str, styles, lines: int = 3) -> list:
    out = []
    if prompt:
        out.append(Paragraph(f"<b><font color='#{PACIFIC}'>{escape(prompt.strip())}</font></b>",
                             styles["body"]))
    rows = [[" "]] * lines
    line_h = 0.32 * inch
    t = Table(rows, colWidths=[USABLE_WIDTH], rowHeights=[line_h] * lines)
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, hexcolor(PACIFIC)),
        ("LINEABOVE", (0, 1), (-1, -1), 0.4, hexcolor(SEA_GLASS)),
    ]))
    out.append(t)
    out.append(Spacer(1, 8))
    return out


def checkbox_group(label: str, options: list[str], styles) -> list:
    out = []
    if label.strip():
        out.append(Paragraph(f"<b><font color='#{PACIFIC}'>{escape(label.strip().rstrip(':'))}:</font></b>",
                             styles["body"]))
    short = all(len(o) < 35 for o in options) and len(options) >= 2
    cols = 2 if short else 1
    rows = []
    cell_para = lambda txt: Paragraph(
        f"<font color='#{PACIFIC}'>[&nbsp;&nbsp;]</font>&nbsp;&nbsp;{escape(txt.strip())}",
        styles["body"],
    )
    if cols == 2:
        for i in range(0, len(options), 2):
            left = cell_para(options[i])
            right = cell_para(options[i + 1]) if i + 1 < len(options) else Paragraph("", styles["body"])
            rows.append([left, right])
        col_widths = [USABLE_WIDTH / 2, USABLE_WIDTH / 2]
    else:
        for opt in options:
            rows.append([cell_para(opt)])
        col_widths = [USABLE_WIDTH]
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    out.append(t)
    out.append(Spacer(1, 8))
    return out


def _is_form_layout_table(rows: list[list[str]]) -> bool:
    if not rows:
        return False
    cells = [c for row in rows for c in row]
    nonempty = [c.strip() for c in cells if c.strip()]
    if not nonempty:
        return False
    label_like = [c for c in nonempty if c.endswith(":") and len(c) <= 40]
    empty = sum(1 for c in cells if not c.strip())
    if empty == 0:
        return False
    return len(label_like) >= max(1, int(0.6 * len(nonempty)))


def form_layout_table(rows: list[list[str]], styles) -> Table:
    """Render a form-layout table: bold labels + empty fillable cells with
    bottom-border underline only."""
    cols = max(len(r) for r in rows)
    label_style = ParagraphStyle("FormLabel", parent=styles["body"], fontName="Times-Bold",
                                  textColor=hexcolor(PACIFIC))
    paragraphs = []
    for row in rows:
        line = []
        for i in range(cols):
            text = (row[i] if i < len(row) else "").strip()
            is_label = text.endswith(":") and len(text) <= 40
            style = label_style if is_label else styles["body"]
            line.append(Paragraph(escape(text), style) if text else Paragraph("&nbsp;", styles["body"]))
        paragraphs.append(line)
    col_w = USABLE_WIDTH / cols
    t = Table(paragraphs, colWidths=[col_w] * cols)
    style_cmds = [
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]
    # Bottom border on empty fill cells
    for r_idx, row in enumerate(rows):
        for c_idx in range(cols):
            text = (row[c_idx] if c_idx < len(row) else "").strip()
            if not text:
                style_cmds.append(("LINEBELOW", (c_idx, r_idx), (c_idx, r_idx), 0.8, hexcolor(PACIFIC)))
    t.setStyle(TableStyle(style_cmds))
    return t


def data_table(rows: list[list[str]], styles) -> Table:
    """Branded data table: Pacific header band, alternating SeaFoam rows.
    Routes form-layout tables (labels + empty fills) to form_layout_table."""
    if not rows:
        return Spacer(1, 0)
    if _is_form_layout_table(rows):
        return form_layout_table(rows, styles)
    cols = max(len(r) for r in rows)
    norm = [[(r[i] if i < len(r) else "") for i in range(cols)] for r in rows]
    body_para = ParagraphStyle("TableBody", parent=styles["body"], spaceAfter=0)
    header_para = ParagraphStyle("TableHeader", parent=body_para, fontName="Times-Bold",
                                 textColor=hexcolor(WHITE))
    paragraphs = []
    for r_idx, row in enumerate(norm):
        line = []
        for cell in row:
            line.append(Paragraph(escape(cell), header_para if r_idx == 0 else body_para))
        paragraphs.append(line)
    col_w = USABLE_WIDTH / cols
    t = Table(paragraphs, colWidths=[col_w] * cols, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), hexcolor(PACIFIC)),
        ("GRID", (0, 0), (-1, -1), 0.5, hexcolor(WHULGE)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for r_idx in range(1, len(norm)):
        if r_idx % 2 == 0:
            style_cmds.append(("BACKGROUND", (0, r_idx), (-1, r_idx), hexcolor(SEA_FOAM)))
    t.setStyle(TableStyle(style_cmds))
    return t


def render_paragraph_or_field(text: str, styles) -> list:
    """Render preserving every word. Inline fields become bold-label + underline
    fill spans within the paragraph, surrounded by the body text."""
    matches = list(INLINE_FIELD_RE.finditer(text))
    if matches:
        cursor = 0
        out_parts = []
        for m in matches:
            pre = text[cursor:m.start()]
            pre_clean = re.sub(r"_+", "", pre).rstrip()
            if pre_clean:
                out_parts.append(escape(pre_clean) + " ")
            label = escape(m.group(1).strip())
            out_parts.append(f"<b><font color='#{PACIFIC}'>{label}:</font></b> ")
            fill = "&nbsp;" * 24
            out_parts.append(f"<u><font color='#{PACIFIC}'>{fill}</font></u> ")
            cursor = m.end()
        rest = text[cursor:]
        rest_clean = re.sub(r"_+", "", rest).strip()
        if rest_clean:
            out_parts.append(escape(rest_clean))
        return [Paragraph("".join(out_parts), styles["body"])]
    cleaned = re.sub(r"_+", "", text).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        return []
    return [Paragraph(escape(cleaned), styles["body"])]


def _make_canvas(form_number: str, series: str, page_w: float, page_h: float, margin: float):
    from reportlab.pdfgen import canvas as _canvas

    class NumberedCanvas(_canvas.Canvas):
        def __init__(self, *a, **kw):
            super().__init__(*a, **kw)
            self._saved: list[dict] = []

        def showPage(self):
            self._saved.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            total = len(self._saved)
            for state in self._saved:
                self.__dict__.update(state)
                self._draw_chrome(total)
                super().showPage()
            super().save()

        def _draw_chrome(self, total_pages: int):
            self.saveState()
            # Header — match policies (right-aligned, black, Times)
            self.setFont("Times-Roman", SIZE_BODY)
            self.setFillColor(colors.black)
            right_x = page_w - margin
            line1_y = page_h - margin + 24
            line2_y = page_h - margin + 12
            self.drawRightString(right_x, line1_y, f"Form {form_number}")
            self.drawRightString(right_x, line2_y, series)
            # Footer — Sea Glass divider line then page-number text in Times
            divider_y = margin / 2 + 14
            self.setStrokeColor(hexcolor(SEA_GLASS))
            self.setLineWidth(0.8)
            self.line(margin, divider_y, page_w - margin, divider_y)
            self.setFillColor(colors.black)
            self.setFont("Times-Roman", SIZE_FOOTER)
            self.drawCentredString(page_w / 2, margin / 2 - 4,
                                   f"Page {self._pageNumber} of {total_pages}")
            self.restoreState()

    return NumberedCanvas


def build(data: dict, *, form_number: str, series: str, title: str, output: Path) -> None:
    styles = make_styles()
    output.parent.mkdir(parents=True, exist_ok=True)
    margin = inch
    page_w, page_h = LETTER

    doc = BaseDocTemplate(
        str(output),
        pagesize=LETTER,
        leftMargin=margin, rightMargin=margin, topMargin=margin, bottomMargin=margin,
        title=f"Form {form_number} - {title}",
        author="Peninsula School District",
    )
    frame = Frame(margin, margin, page_w - 2 * margin, page_h - 2 * margin,
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame])])

    story: list = []

    if EMBLEM_REL.exists():
        img = Image(str(EMBLEM_REL), width=1.2 * inch, height=1.2 * inch)
        img.hAlign = "CENTER"
        story.append(img)
        story.append(Spacer(1, 4))

    if title:
        story.append(Paragraph(escape(title), styles["title"]))
    if data.get("subtitle"):
        story.append(Paragraph(escape(data["subtitle"]), styles["subtitle"]))
    else:
        story.append(Spacer(1, 6))

    for block in data.get("blocks", []):
        t = block["type"]
        if t == "paragraph":
            text = block["text"]
            if is_section_paragraph(text):
                story.append(section_banner(text, styles))
                story.append(Spacer(1, 8))
                continue
            story.extend(render_paragraph_or_field(text, styles))
        elif t == "field_row":
            labels = [f["label"] for f in block.get("fields", [])]
            if labels:
                story.extend(field_rows_split(labels, styles))
        elif t == "checkbox_group":
            story.extend(checkbox_group(block.get("label", ""), block.get("options", []), styles))
        elif t == "table":
            story.append(data_table(block.get("rows", []), styles))
            story.append(Spacer(1, 8))

    rev = data.get("revision_date")
    if rev:
        story.append(Spacer(1, 8))
        story.append(Paragraph(
            f"<i><font color='#{MUTED_GRAY}' size='{SIZE_FOOTER}'>Revised {escape(rev)}</font></i>",
            styles["body"],
        ))

    doc.build(story, canvasmaker=_make_canvas(form_number, series, page_w, page_h, margin))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input")
    ap.add_argument("--form-number", required=True)
    ap.add_argument("--series", required=True)
    ap.add_argument("--title", default=None)
    ap.add_argument("--output", help="Path or directory")
    args = ap.parse_args()

    if args.input:
        data = json.loads(Path(args.input).read_text())
    else:
        data = json.loads(sys.stdin.read())
    detected = data.get("title", "").strip()
    rendered_title = detected if detected else (args.title or f"Form {args.form_number}")
    filename_title = args.title or detected or f"Form {args.form_number}"
    output_path = derive_output_path(args.form_number, filename_title, output=args.output)
    build(data, form_number=args.form_number, series=args.series, title=rendered_title, output=output_path)
    print(json.dumps({"output": str(output_path), "block_count": len(data.get("blocks", []))}))


if __name__ == "__main__":
    main()
