---
name: documenso-manager
description: "Manage document signing with Documenso — create envelopes, add recipients/fields, distribute for signature, download signed PDFs, manage templates. Use when: sending documents for signature, creating signing workflows, checking document status, managing templates, building e-signature automations. Triggers on: documenso, sign, signature, envelope, signing, document signing, e-sign."
argument-hint: "[command] [args...] — e.g., 'status', 'list', 'create <pdf>', 'send <id>', 'templates'"
model: claude-opus-5
effort: high
paths:
  - scripts/
  - references/
  - ~/Downloads/
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
extended-thinking: true
---

# Documenso Manager

## Configuration

- **Server**: Read from `DOCUMENSO_HOST` environment variable (never hardcoded)
- **API Auth**: `Authorization: api_xxxxxxxx` header (NOT Bearer — literal key value)
- **API Version**: v2 only (v1 is deprecated)
- **MCP**: Official Documenso SDK MCP server for document/template discovery
- **Scripts**: `plugins/psd-productivity/skills/documenso-manager/scripts/`

All scripts use `bun` and read credentials from `secrets.js` (env vars → Geoffrey .env).

## Command Reference

### Envelope Management

| Command | Script | Description |
|---------|--------|-------------|
| `/documenso status` | `bun health_check.js` | Server health, envelope count |
| `/documenso list` | `bun list_envelopes.js` | List all envelopes |
| `/documenso list '{"status":"PENDING"}'` | `bun list_envelopes.js '{"status":"PENDING"}'` | Filter by status |
| `/documenso show <id>` | `bun get_envelope.js <id>` | Envelope details (recipients, fields, items) |
| `/documenso create <pdf> [options]` | `bun create_envelope.js <pdf> '<json>'` | Create envelope with PDF |
| `/documenso update '<json>'` | `bun update_envelope.js '<json>'` | Update envelope metadata |
| `/documenso delete <id>` | `bun delete_envelope.js <id>` | Delete envelope (**confirm first**) |
| `/documenso duplicate <id>` | `bun duplicate_envelope.js <id>` | Clone an envelope |

### Distribution & Download

| Command | Script | Description |
|---------|--------|-------------|
| `/documenso send <id>` | `bun distribute_envelope.js <id>` | Send for signing (DRAFT → PENDING) |
| `/documenso resend <id>` | `bun redistribute_envelope.js <id>` | Resend signing emails |
| `/documenso download <item-id>` | `bun download_document.js <item-id> signed` | Download signed PDF |
| `/documenso download <item-id> original` | `bun download_document.js <item-id> original` | Download original PDF |
| `/documenso audit <id>` | `bun get_audit_log.js <id>` | Audit trail |

### Recipients & Fields

| Command | Script | Description |
|---------|--------|-------------|
| `/documenso add-recipients <id> '<json>'` | `bun add_recipients.js <id> '<json>'` | Add recipients (SIGNER/APPROVER/CC/VIEWER/ASSISTANT) |
| `/documenso update-recipients <id> '<json>'` | `bun update_recipients.js <id> '<json>'` | Update recipients |
| `/documenso remove-recipient <id> <rid>` | `bun remove_recipient.js <id> <rid>` | Remove recipient |
| `/documenso add-fields <id> '<json>'` | `bun add_fields.js <id> '<json>'` | Add fields (SIGNATURE/DATE/TEXT/etc.) |
| `/documenso update-fields <id> '<json>'` | `bun update_fields.js <id> '<json>'` | Update field positions |
| `/documenso remove-field <id> <fid>` | `bun remove_field.js <id> <fid>` | Remove field |

### Templates & Folders

| Command | Script | Description |
|---------|--------|-------------|
| `/documenso templates` | `bun list_templates.js` | List templates |
| `/documenso template <id>` | `bun get_template.js <id>` | Template details |
| `/documenso use-template <id> [options]` | `bun use_template.js <id> '<json>'` | Create envelope from template |
| `/documenso folders` | `bun list_folders.js` | List folders |
| `/documenso create-folder <name>` | `bun create_folder.js <name>` | Create folder |

## Envelope Builder Protocol

When building a signing workflow from natural language:

### Step 1: Research
- Read `references/psd-signing-templates.md` for matching PSD patterns
- Read `references/documenso-envelope-lifecycle.md` for field positioning
- Check existing templates via `list_templates.js`

### Naming Convention

Envelope titles follow the pattern: `{Document Type} - {Person Name} - {Year}`

Examples:
- `Performance Evaluation - Jane Smith - 2025-2026`
- `Central Leadership Evaluation - John Doe - 2025-2026`
- `Leave Request - Jane Smith - 2025-2026`

This pattern is critical — the Document Completion Router uses the title prefix to dispatch to the correct handler workflow.

### Step 2: Design
Present the envelope to the user:
- Document: PDF source and title
- Recipients: roles (SIGNER/APPROVER/CC), signing order
- Fields: types and positions on each page
Get user approval before creating.

### Step 3: Create
```bash
bun plugins/psd-productivity/skills/documenso-manager/scripts/create_envelope.js <pdf-path> '<options>'
```

### Step 4: Add Recipients & Fields (if not in create payload)
```bash
bun add_recipients.js <id> '<recipients>'
bun add_fields.js <id> '<fields>'
```

### Step 5: Review
Show envelope summary and link: `http://${DOCUMENSO_HOST}/documents/<id>`

### Step 6: Send (only after user confirms)
```bash
bun distribute_envelope.js <id>
```

### Step 7: Track
Check status and download signed PDF when complete.

## Field Pre-filling (ReadOnly Fields)

Pre-fill TEXT fields with values via the API so signers see data without needing to type it:

- **`fieldMeta.text`** — set this property when creating fields to pre-fill the value
- **`fieldMeta.readOnly: true`** — prevents signers from editing the pre-filled value. Also works around Documenso bug #2512 where clicking a pre-filled field clears its value.
- **`fieldMeta.fontSize`** — controls rendered text size (e.g., `9` for smaller text)
- Pre-filled fields are assigned to a specific recipient but visible to all signers
- **Known bug (#2669)**: In the signing preview, pre-filled text may overflow the field border due to a CSS `25cqw` font-sizing issue. The final signed PDF renders correctly (uses Konva path which respects field width). Workaround: accept the preview overflow and keep the PDF box border for clean appearance.

### Example: Pre-filled readOnly TEXT field

```json
{
  "type": "TEXT",
  "identifier": 0,
  "page": 1,
  "positionX": 8.82,
  "positionY": 15.84,
  "width": 23.53,
  "height": 2.78,
  "fieldMeta": {
    "type": "text",
    "label": "Employee Name",
    "text": "Jane Smith",
    "readOnly": true,
    "required": false,
    "fontSize": 9,
    "placeholder": ""
  }
}
```

## Safety Guardrails

### Always confirm before:
- **Distributing** an envelope — sends real emails, cannot be undone
- **Deleting** an envelope — show title and status first
- **Removing** a recipient from an active (PENDING) envelope

### Field validation:
- All coordinates must be percentages 0-100 (NOT pixels)
- `add_fields.js` rejects coordinates > 100
- Warn if fields overlap or extend off-page

### Status-aware:
- Cannot add fields to COMPLETED envelopes
- Warn before deleting PENDING envelopes (recipients already notified)

## Key Technical Warnings

- **Auth is NOT Bearer** — header is `Authorization: api_xxxxxxxx` (literal key value)
- **Field coordinates are percentages (0-100)**, not pixels
- **API v2 only** — v1 is deprecated
- **Envelope ≠ Document** — an envelope can contain multiple PDFs
- **PDF upload requires multipart/form-data** — not JSON body
- **`DOCUMENSO_HOST` will change** — never hardcode the URL
- **Webhook management is UI only** — no API endpoint to create/list/delete webhooks. Must configure in Documenso Settings → Webhooks.
- **Webhook ID mismatch** — webhook payload `id` is numeric (internal documentId). API endpoints require string format `envelope_xxxxx`. Bridge via search: `GET /envelope?query={title}`.
- **Items array is `envelopeItems`** — not `items`. Item IDs are string format: `envelope_item_xxxxx`.
- **Same email for multiple recipients** may cause Documenso to skip sending signing emails (deduplication). Use different emails for testing.
- **Distribute endpoint** — use raw JSON body with explicit `Content-Type: application/json` header. The n8n HTTP Request node's keypair body mode can produce malformed JSON.
- **Distribute endpoint shape is `POST /api/v2/envelope/distribute`** with body `{"envelopeId":"envelope_xxx"}` — NOT path-based `/envelope/{id}/distribute` (that returns 404). Easy mistake when porting from other signing-service patterns.
- **Envelope create payload requires `type: 'DOCUMENT'`** — missing this field causes HTTP 400 with `expected: 'DOCUMENT' | 'TEMPLATE', received: undefined`. When sent via n8n HTTP Request node with multipart-form-data, the 400 is misreported as `ECONNREFUSED`. Always include `type: 'DOCUMENT'` at the top of the payload object.
- **Self-hosted Documenso respects `NEXT_PUBLIC_FEATURE_BILLING_ENABLED`** — when this env var is `true`, the instance applies free-plan limits (5 documents/month per user). Two fixes: (a) set the env var to `false` and rebuild (client-side bundle bakes it in), or (b) create a Team inside Documenso and issue API keys scoped to the team. Team-scoped keys bypass the per-user cap.
- **API keys are team-scoped** — a key issued from a personal user account hits that user's quota. A key issued from a team has the team's (higher) limits. When rotating keys, verify the source context. Personal keys also cannot see team envelopes and vice versa.
- **Webhooks are per-team, UI-only** — switching to a new team (or creating one) requires recreating the webhook subscription. No API to do this. Path: Documenso UI → team → Settings → Webhooks. URL: `https://n8n.psd401.net/webhook/documenso-completed`, event: `DOCUMENT_COMPLETED` or `ENVELOPE_COMPLETED` depending on version.
- **Envelope `id` canonicalization** — two forms exist and are NOT interchangeable: (1) numeric integer in webhook payload (`payload.id: 104`, the internal `documentId`), and (2) string form from the API (`envelope_abc123`). Always canonicalize to the string form for cross-system matching (sheet rows, Drive metadata, audit logs). To resolve numeric → string: `GET /api/v2/envelope?query={title}` and read `.data[0].id`.
- **Envelope email delivery depends on Documenso SMTP** — if SMTP config is broken, envelopes reach PENDING status with `sendStatus: SENT` in the API but signers never get emails. Bypass by giving signers their direct signing URL: `https://{DOCUMENSO_HOST}/sign/{recipient.token}`. The `token` is on each recipient in the envelope fetch response.
- **Envelope fields come from `recipients[].fields`** — the top-level envelope GET response does NOT surface field metadata directly. To see what was pre-filled, inspect the signer's `fields` array inside recipients. Empty `fields: []` on a completed envelope means no pre-fill was submitted, not that data was lost.
- **Always use `role: 'CC'` with empty `fields: []`** for read-only copy recipients. CC recipients count as "signed" automatically on envelope creation (their `signingStatus` is `SIGNED` even before anyone signs). They do not block completion.

## Recipient Roles Quick Reference

| Role | Signs? | Blocks Completion? | Receives Copy? |
|------|--------|-------------------|----------------|
| SIGNER | Yes | Yes | Yes |
| APPROVER | Reviews | Yes | Yes |
| CC | No | No | Yes |
| VIEWER | No | No | View only |
| ASSISTANT | Fills fields | No | No |

## Reference Documents

| Document | Contents |
|----------|----------|
| `references/documenso-api-reference.md` | Full v2 API endpoints, field types (11), recipient roles (5), webhook events (13) |
| `references/documenso-envelope-lifecycle.md` | DRAFT→PENDING→COMPLETED flow, field positioning guide, signing order, email settings |
| `references/documenso-self-hosting-ops.md` | Self-hosted ops: billing-enabled mode, teams + API keys, webhook setup per-team, SMTP delivery, error→cause cheatsheet |
| `references/psd-signing-templates.md` | 8 pre-built PSD template patterns with field positions |
| `references/psd-signing-workflows.md` | End-to-end workflows for HR, board, student, vendor + n8n integration |
