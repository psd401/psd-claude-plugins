"""PSD design system — brand colors, fonts, and reusable docx/pdf helpers.

Used by build_form_docx.py, build_form_pdf.py, build_docx.py, build_pdf.py.
"""

from __future__ import annotations

# PSD brand colors -------------------------------------------------------
PACIFIC = "25424C"       # primary dark blue — headers, titles
SEA_GLASS = "6CA18A"     # primary green — accents
DRIFTWOOD = "D7CDBE"     # neutral tan — soft backgrounds
CEDAR = "466857"         # dark green
WHULGE = "346780"        # medium blue — links, secondary
SEA_FOAM = "EEEBE4"      # light background — alternating rows
MEADOW = "5D9068"        # green accent
OCEAN = "7396A9"         # light blue
SKYLIGHT = "FFFAEC"      # cream — text on dark

WHITE = "FFFFFF"
DARK_TEXT = "1A1A1A"
BODY_GRAY = "333333"
MUTED_GRAY = "707070"

# Typography — Times New Roman throughout to match the policy look
SERIF = "Times New Roman"
HEADER_FONT = SERIF
BODY_FONT = SERIF
LABEL_FONT = SERIF

# Sizes (pt) — matches policy template; sprinkle accents elsewhere
SIZE_TITLE = 16          # same as policies
SIZE_SUBTITLE = 12
SIZE_SECTION = 12        # banner text — same body size, bold + caps
SIZE_BODY = 12           # same as policies
SIZE_LABEL = 12
SIZE_FOOTER = 12         # match policy footer

# Spacing (pt) — tighter, more professional cadence
SPACE_AFTER_TITLE = 4
SPACE_AFTER_SUBTITLE = 8
SPACE_AFTER_SECTION = 4
SPACE_AFTER_PARA = 6
SPACE_AFTER_FIELD_ROW = 4


# DOCX helpers -----------------------------------------------------------
def docx_color_run(run, hex_color: str) -> None:
    from docx.shared import RGBColor
    run.font.color.rgb = RGBColor.from_string(hex_color)


def docx_set_cell_shading(cell, hex_color: str) -> None:
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def docx_set_cell_borders(cell, *, top=None, bottom=None, left=None, right=None,
                           color: str = PACIFIC, width: str = "8") -> None:
    """Set per-edge borders on a cell. Pass each edge as None (none),
    "single", "double", or any valid OOXML border type. Width in eighths-of-pt."""
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for edge, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        b = OxmlElement(f"w:{edge}")
        b.set(qn("w:val"), val if val else "nil")
        b.set(qn("w:sz"), width)
        b.set(qn("w:color"), color)
        tcBorders.append(b)
    tcPr.append(tcBorders)


def docx_remove_cell_borders(cell) -> None:
    docx_set_cell_borders(cell, top=None, bottom=None, left=None, right=None)


def docx_set_cell_margins(cell, *, top=80, bottom=80, left=120, right=120) -> None:
    """Cell margins in twentieths of a pt (e.g., 80 = 4pt)."""
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for edge, val in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        m = OxmlElement(f"w:{edge}")
        m.set(qn("w:w"), str(val))
        m.set(qn("w:type"), "dxa")
        tcMar.append(m)
    tcPr.append(tcMar)


def docx_set_run_font(run, *, font: str = BODY_FONT, size: int = SIZE_BODY,
                      bold: bool = False, italic: bool = False, color: str | None = None) -> None:
    from docx.shared import Pt
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    run.font.name = font
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        docx_color_run(run, color)
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = rpr.makeelement(qn("w:rFonts"), {})
        rpr.append(rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(attr), font)
