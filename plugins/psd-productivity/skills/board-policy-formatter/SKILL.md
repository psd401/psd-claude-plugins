---
name: board-policy-formatter
description: "Reformat a Google Doc, PDF, or Word document into the official PSD school board policy/procedure template with zero text modification. Use when publishing board-approved policies or procedures. Triggers on: board policy, format policy, policy template, procedure template, school board document, reformat policy."
argument-hint: "[source file path or Google Doc URL]"
model: claude-opus-5
effort: high
extended-thinking: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - AskUserQuestion
paths:
  - scripts/
  - references/
  - ~/Downloads/
  - ~/Documents/
  - ~/Desktop/
---

# Board Policy Formatter

Reformat a source document (Google Doc, PDF, or `.docx`) into the official Peninsula School District board policy/procedure Word template. Enforces a **zero text modification** rule — board-approved text is legally binding and cannot be changed.

## Critical rule: zero text modification

The skill **must not** rewrite, summarize, correct, or alter the source text in any way. Every word, comma, and capitalization must survive the round-trip exactly. The verification step diffs the regenerated `.docx` against the source and aborts on any non-whitespace difference.

**Do not let the LLM rewrite content at any stage.** The Python scripts handle extraction, formatting, and verification deterministically. The LLM's only job is collecting metadata (policy number, dates, etc.) and reporting verification results.

## Format specification

Confirmed against `Policy 1000 Legal Status and Operation` (Google Drive `19zjVtZbEfN_ndEZjEtXhJYDLCR5FjOc_`).

| Element | Specification |
|---------|---------------|
| Page | US Letter, 1" margins on all sides |
| Header (Word header band) | Right-aligned, two tight lines (space_before/after = 0): `Policy {number}` then `{Series}` (e.g., `Board of Directors`). Times New Roman 12pt. |
| Emblem | Centered at top of body. `psd_logo-2color-square.png` from `psd-brand-guidelines/assets/`. ~1.5" tall. |
| Title | Centered, Times New Roman **16pt bold**. |
| Body | Times New Roman 12pt regular. **1.15 line spacing, 8pt space after each paragraph.** |
| Section headings | Bold inline labels on their own line. Same 12pt Times New Roman. No auto-numbering. |
| Cross References / Legal References | Header line bold (`Cross References:` / `Legal References:`), then each ref on its own line. |
| Adopted / Revised | Rendered in body **after** Cross/Legal References. Bold label (`Adopted:` / `Revised:`) + regular value, same 12pt Times New Roman. |
| Footer (Word footer band) | Centered `Page {PAGE} of {NUMPAGES}` Word field codes. Times New Roman 12pt. |

## Usage

```bash
uv run scripts/format_policy.py \
  --source "<file-path-or-drive-url>" \
  --policy-number 1000 \
  --series "Board of Directors" \
  --title "Legal Status and Operation of the Board" \
  --adopted 07/28/2022 \
  --revised ""
```

- Multiple revised dates: `--revised "07/28/2022, 03/14/2025"`.
- **Procedure** (vs policy): add `--procedure`. Filename will get a lowercase `p` suffix: `1000p - Title.docx`.
- **Output**: omit `--output` to derive `{number}[p] - {title}.docx` in the current directory. Pass a directory to keep the derived name but control the destination. Pass an explicit `.docx` path to override entirely.

### Input formats

| Format | Detection | Extractor |
|--------|-----------|-----------|
| Google Doc URL | URL contains `docs.google.com` or `drive.google.com` | `gws drive files export` (or `get --params alt=media`) → temp `.docx` → python-docx |
| `.docx` | extension | python-docx paragraph walk |
| `.pdf` | extension | pdfplumber. Aborts if text < 100 chars or high replacement-char ratio (likely scanned). |

## Workflow

1. **Gather metadata** (use `AskUserQuestion` for any missing inputs): source path/URL, policy number, series, title, adopted date, revised dates, output path.

2. **Extract** — call `scripts/extract_text.py` with the source. It writes a JSON file with `paragraphs: [{text, style_hint}]` to stdout. Style hints: `body`, `heading`, `list_item`.

3. **Build** — call `scripts/build_docx.py` with the extracted JSON and metadata. Writes the output `.docx`.

4. **Verify** — call `scripts/verify_fidelity.py` with source path and output path. Returns exit 0 with diff summary or non-zero with the diff hunks. If any non-whitespace difference is detected anywhere (body, header, footer, title), surface the diff to the user via `AskUserQuestion`:
   - **Abort** — delete the output and stop.
   - **Save anyway** — keep the output, warn the user.
   - **Fix and retry** — user edits source, rerun.

5. **Report** — final output path.

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/format_policy.py` | Orchestrator. Extract → Build → Verify → PDF. |
| `scripts/extract_text.py` | Format-specific text extraction. Outputs JSON. |
| `scripts/build_docx.py` | python-docx generator. Emits the final `.docx`. |
| `scripts/verify_fidelity.py` | Normalized character-level diff between source and output. |
| `scripts/convert_pdf.py` | Drives Microsoft Word via AppleScript (`docx2pdf`) to render the matching `.pdf`. |

The orchestrator produces both `{number}[p] - {title}.docx` and `{number}[p] - {title}.pdf` (same stem, side-by-side). Pass `--no-pdf` to skip the PDF step. PDF only runs if fidelity verification passed.

**Requirement**: macOS with Microsoft Word.app installed.

**Runtime**: All scripts use PEP 723 inline dependencies. Run with `uv run`.

## Verification rule (re-stated)

After build, the skill **must** run `verify_fidelity.py` and surface any diff before declaring success. Never claim "formatted successfully" without showing the verification summary. If the diff is empty, report `Fidelity check: 0 differences`.
