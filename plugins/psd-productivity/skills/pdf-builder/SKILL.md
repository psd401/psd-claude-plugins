---
name: pdf-builder
description: "Generate branded PSD PDF documents with letterhead, clean fonts, and Documenso-ready field coordinates. Use when: creating forms, permission slips, agreements, contracts, waivers, board resolutions, or any document needing PSD branding and/or digital signing. Triggers on: create pdf, build pdf, branded pdf, generate form, pdf builder, letterhead document, signable document."
argument-hint: "[template or description] — e.g., 'permission-slip', 'leave-request', 'create a new vendor agreement'"
model: claude-opus-4-8
effort: high
paths:
  - scripts/
  - references/
  - ~/Downloads/
  - ~/Desktop/
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
extended-thinking: true
---

# PDF Builder — PSD Branded Document Generator

Generate professional PDFs with Peninsula School District letterhead, Inter/Josefin Sans fonts, and Documenso-ready field manifests for digital signing workflows.

## Quick Start

### Using a Built-in Template

```bash
uv run generate_pdf.py --template <template-name> --data '<json>' --output ~/Downloads/doc.pdf
```

### Using a Custom JSON Spec

```bash
uv run generate_pdf.py --json '<spec>' --output ~/Downloads/doc.pdf
# or
uv run generate_pdf.py --spec spec.json --output ~/Downloads/doc.pdf
```

> **Note**: Output paths must be within the skill's `paths:` scope (`scripts/`, `references/`, `~/Downloads/`, `~/Desktop/`).

### Output

Every invocation produces:
1. **PDF file** at the `--output` path
2. **Field manifest** at `{output}.fields.json` — Documenso-ready percentage coordinates
3. **Stdout JSON**: `{"pdf": "...", "manifest": "...", "pages": N, "fields": N}`

## Scripts

All scripts live in `plugins/psd-productivity/skills/pdf-builder/scripts/`.

| Script | Purpose |
|--------|---------|
| `generate_pdf.py` | Core PDF generator — takes JSON spec or template name |
| `letterhead.py` | Letterhead module — logo, colors, footer, continuation pages |
| `install_fonts.py` | One-time font setup — downloads Inter + Josefin Sans |

**Runtime**: All scripts use PEP 723 inline dependencies. Run with `uv run`.

### First-Time Setup

Before first use, install fonts:

```bash
cd plugins/psd-productivity/skills/pdf-builder/scripts
uv run install_fonts.py
```

Fonts are stored in `scripts/fonts/` (checked into repo). This only needs to run once.

## Built-in Templates

| Template | Description | Signers |
|----------|-------------|---------|
| `permission-slip` | Student activity permission | 1 (parent) |
| `employment-agreement` | HR hiring document | 2 (employee + HR) |
| `contractor-agreement` | Vendor/contractor MOU | 2 (contractor + district) |
| `policy-acknowledgment` | Staff policy receipt | 1 (employee) |
| `field-trip-waiver` | Liability waiver + emergency info | 1 (parent) |
| `board-resolution` | Board action item | 2 (chair + secretary) |
| `leave-request` | Staff leave form | 3 (employee + supervisor + HR) |
| `generic-form` | Blank letterhead + title | Configurable |

### Template Data Variables

Pass data to templates via `--data` JSON. Each template accepts different variables.

**permission-slip**: `student_name`, `event`, `date`, `school`, `grade`, `title`, `body`
**employment-agreement**: `employee_name`, `position`, `department`, `location`, `terms`
**contractor-agreement**: `terms`
**policy-acknowledgment**: `title`, `body`
**board-resolution**: `resolution_number`, `subject`, `body`, `resolution_text`
**field-trip-waiver**: `student_name`, `destination`, `title`, `body`
**leave-request**: *(no data variables — all fields are fillable)*
**generic-form**: `title`, `body`

## Custom Document Spec

For documents that don't fit a template, build a JSON spec with sections:

```json
{
  "title": "Document Title",
  "department": "Technology Department",
  "data": {
    "name": "Jane Doe"
  },
  "sections": [
    {"type": "heading", "text": "Section Title", "level": 1},
    {"type": "paragraph", "text": "Hello {{name}}, this is body text."},
    {"type": "field_row", "fields": [
      {"label": "Full Name", "type": "TEXT", "width": 0.5},
      {"label": "Date", "type": "DATE", "width": 0.5}
    ]},
    {"type": "checkbox_group", "label": "Options", "items": [
      {"label": "Option A"},
      {"label": "Option B", "checked": true}
    ]},
    {"type": "table", "headers": ["Col1", "Col2"], "rows": [["A", "B"]]},
    {"type": "divider"},
    {"type": "spacer", "height": 20},
    {"type": "signature_block", "signers": [
      {"role": "Employee", "fields": ["SIGNATURE", "DATE"]},
      {"role": "Supervisor", "fields": ["SIGNATURE", "DATE", "NAME"]}
    ]}
  ]
}
```

### Section Types

| Type | Description | Key Properties |
|------|-------------|----------------|
| `heading` | Josefin Sans Bold title | `text`, `level` (1=18pt, 2=14pt, 3=11pt) |
| `paragraph` | Inter Regular body text (auto-wrapped) | `text`, `fontSize`, `lineHeight` |
| `field_row` | Horizontal row of labeled input boxes | `fields[]` with `label`, `type`, `width` (0-1 fraction), `value`, `height` (points, default 22). Section-level options: `showLabels` (bool, default `true`), `gap` (int, default ~9pt — horizontal gap between cells), `rowGap` (int, default ~9pt — vertical gap after the row) |
| `checkbox_group` | Vertical checkbox list | `label`, `items[]` with `label`, `checked`, `required` |
| `table` | Data table with alternating rows | `headers[]`, `rows[][]` |
| `signature_block` | Signing zone with role labels | `signers[]` with `role`, `fields[]`, `anchor` ("flow" or "bottom") |
| `spacer` | Vertical whitespace | `height` (points) |
| `divider` | Horizontal line | `color`, `weight` |

**CRITICAL — Duplicate field labels**: Field labels are slugified to create manifest field names. Two fields with the same label (e.g., both "Position") produce the same slug, causing the manifest `positions` object to only keep the last one. Use unique labels (e.g., "Team Member Position", "Evaluator Position") or deduplicate manually in downstream code.

**Spacer for page breaks**: A spacer of ~80pt after a signature block reliably pushes the next section to a new page. Use this to separate reference appendices from the evaluation content.

### Building a tight table of form fields

Use `showLabels: false`, `gap: 0`, `rowGap: 0` on stacked `field_row` sections to render a proper table of fillable cells (one header row with labels, many flush data rows below). Each cell still needs a unique label for slug uniqueness — compact names like `S2 First` / `S2 Last` work well.

```json
{ "type": "field_row", "gap": 0, "rowGap": 0, "fields": [
    { "label": "First Name", "type": "TEXT", "width": 0.18, "height": 14 },
    { "label": "Last Name",  "type": "TEXT", "width": 0.18, "height": 14 },
    { "label": "Student ID", "type": "TEXT", "width": 0.13, "height": 14 },
    { "label": "DOB",        "type": "TEXT", "width": 0.15, "height": 14 },
    { "label": "Grade",      "type": "TEXT", "width": 0.10, "height": 14 },
    { "label": "School",     "type": "TEXT", "width": 0.26, "height": 14 }
]},
{ "type": "field_row", "showLabels": false, "gap": 0, "rowGap": 0, "fields": [
    { "label": "S2 First", "type": "TEXT", "width": 0.18, "height": 14 },
    { "label": "S2 Last",  "type": "TEXT", "width": 0.18, "height": 14 },
    { "label": "S2 ID",    "type": "TEXT", "width": 0.13, "height": 14 },
    { "label": "S2 DOB",   "type": "TEXT", "width": 0.15, "height": 14 },
    { "label": "S2 Grade", "type": "TEXT", "width": 0.10, "height": 14 },
    { "label": "S2 School","type": "TEXT", "width": 0.26, "height": 14 }
]},
...
```

Reference implementation: `workflows/ssd-mv-intake/template-spec.json` in the `psd-workflow-automation` repo (6-student McKinney-Vento intake table).

### Page 1 title rendering

The letterhead module only renders the spec's top-level `title` in the **continuation header** on pages 2+. Page 1 has the logo block and letterhead but no title bar. To show the document title on page 1, add an explicit `heading` section at the top of `sections`:

```json
{ "type": "spacer", "height": 4 },
{ "type": "heading", "text": "Annual McKinney-Vento Intake Form", "level": 1 },
{ "type": "spacer", "height": 6 },
```

### Field Types for `field_row` and `signature_block`

| Type | Documenso Mapping | Use |
|------|------------------|-----|
| `TEXT` | TEXT/text | General text input |
| `DATE` | DATE/date | Date fields |
| `NAME` | NAME/name | Full name |
| `EMAIL` | EMAIL/email | Email address |
| `NUMBER` | TEXT/number | Numeric input |
| `SIGNATURE` | SIGNATURE/signature | Signature line |
| `INITIALS` | INITIALS/initials | Initials box |
| `CHECKBOX` | CHECKBOX/checkbox | Checkboxes |
| `DROPDOWN` | DROPDOWN/dropdown | Dropdown (provide `options`) |

## Documenso Integration

The field manifest (`*.fields.json`) maps directly to Documenso's `add_fields.js` API.

### Coordinate System

- **PDF (reportlab)**: Points, origin bottom-left, y increases upward
- **Documenso**: Percentages (0-100), origin top-left, y increases downward
- **Conversion** is automatic — the manifest outputs Documenso-ready percentages

### Workflow: PDF Builder → Documenso

1. Generate PDF: `uv run generate_pdf.py --template permission-slip --data '...' -o /tmp/form.pdf`
2. Create envelope: `/documenso create /tmp/form.pdf`
3. Add recipients: `/documenso add-recipients <envelope-id> ...`
4. Add fields from manifest: Read `/tmp/form.pdf.fields.json` and pass to `/documenso add-fields`
5. Distribute: `/documenso send <envelope-id>`

### n8n Workflow Pattern

```
Webhook (receives form data)
  → Code Node (build PDF spec JSON)
  → Execute Command (uv run generate_pdf.py --json '...' -o /tmp/doc.pdf)
  → HTTP Request (POST /api/v2/envelope/create — multipart with PDF)
  → Code Node (read .fields.json, map recipients to fields)
  → HTTP Request (POST /api/v2/envelope/field/create-many)
  → HTTP Request (POST /api/v2/envelope/distribute)
```

### Template Server Pattern (Recommended for n8n)

Instead of running `uv run generate_pdf.py` on the n8n server (which requires Python + uv), generate the PDF locally once and serve it via an n8n webhook workflow:

1. **Generate locally**: `uv run generate_pdf.py --spec spec.json -o template.pdf`
2. **Base64 encode**: The PDF is embedded as a base64 string in an n8n Code node
3. **Serve via webhook**: `GET /webhook/psd-template?name=classified-evaluation`
4. **n8n workflow downloads it**: HTTP Request node fetches the template before creating Documenso envelope

**Why not Google Drive?** The n8n Google Drive v3 download node has a bug — it calls the export API instead of files.get, causing errors for uploaded PDFs. The template server pattern avoids this entirely.

**Multi-template support**: The Code node contains a `templates` object with named entries. Add new templates by adding entries. The query parameter `?name=` selects which template to serve.

**Custom field height example** (for large text areas like comments):
```json
{"type": "field_row", "fields": [
  {"label": "Comments", "type": "TEXT", "width": 1.0, "height": 160}
]}
```
The `height` property on individual fields defaults to 22pt. Set it higher for textarea-like boxes.

## Branding Details

### Fonts
- **Headings**: Josefin Sans Bold (PSD brand font)
- **Body/Forms**: Inter Regular + Bold (clean, highly legible at small sizes)
- **Font source**: Google Fonts CDN, stored in `scripts/fonts/`

### Colors
- **Pacific** (#25424C): Headers, text, color bar, signature lines
- **Sea Glass** (#6CA18A): Accent lines, footer rule
- **Light Gray** (#CCCCCC): Field box borders

### Letterhead
- **Page 1**: PSD horizontal logo (left), right-aligned contact block with vector icons (building, phone, globe), optional department line, Sea Glass accent line
- **Pages 2+**: Thin Pacific color bar, right-aligned "Peninsula School District | Document Title", footer
- **Footer**: District name (left), psd401.net (center), page number (right)
- **Icons**: Simple vector line-art drawn with canvas primitives (no font dependencies), rendered in Sea Glass (#6CA18A)

### Department (Optional)
- Add `"department": "Technology Department"` to the spec JSON
- Renders as a 4th line in the contact block with a people/org icon
- Omit the field entirely for general district documents

### Logo
- Uses `psd_logo-2color-horizontal.png` from `psd-brand-guidelines/assets/`
- 2-inch width, maintains aspect ratio

## Validating Manifests

After generating a PDF, validate its field manifest against the Documenso contract using the integration test harness:

```bash
bun plugins/psd-productivity/scripts/test_pipeline.js --suite manifest --manifest @/path/to/doc.pdf.fields.json
```

This catches coordinate out-of-bounds, type mismatches, duplicate field names, and page overflow before sending to Documenso.

## Workflow for Claude

When a user invokes `/pdf-builder`:

1. **Understand the request** — What document? Who signs? What data?
2. **Match to template** — If a built-in template fits, use it. Otherwise, build a custom spec.
3. **Gather data** — Ask for any required field values.
4. **Generate** — Run `generate_pdf.py` with the spec.
5. **Preview** — Show the user the generated PDF path and field count.
6. **Offer next steps**:
   - "Send to Documenso for signing?" → use the field manifest with `/documenso`
   - "Modify the layout?" → adjust the spec and regenerate
   - "Save as a reusable template?" → save the spec JSON for future use
