# Documenso API v2 Reference

## Authentication

- **Header**: `Authorization: api_xxxxxxxxxxxxxxxx`
- **NOT Bearer** — the `api_` prefix is part of the key itself
- **Base URL**: `http://${DOCUMENSO_HOST}/api/v2`
- **Rate limit**: 100 requests/minute (cloud; self-hosted has no cloud limits)

## Envelope Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/envelope/create` | Create envelope + upload PDFs (multipart/form-data) |
| GET | `/envelope` | List/search envelopes |
| GET | `/envelope/{envelopeId}` | Get envelope details |
| POST | `/envelope/update` | Update envelope metadata |
| POST | `/envelope/distribute` | Send to recipients (DRAFT → PENDING) — body `{envelopeId}` |
| POST | `/envelope/redistribute` | Resend to recipients |
| POST | `/envelope/delete` | Delete envelope |
| POST | `/envelope/duplicate` | Duplicate an envelope |
| POST | `/envelope/use` | Create envelope from template |
| GET | `/envelope/{envelopeId}/audit-log` | Retrieve audit log |

### POST /envelope/create — required payload shape

`type: 'DOCUMENT'` is REQUIRED. Omitting it returns HTTP 400 with `expected: 'DOCUMENT' | 'TEMPLATE', received: undefined`. From n8n's HTTP Request node with multipart-form-data, this 400 surfaces as a misleading `ECONNREFUSED` error.

```json
{
  "type": "DOCUMENT",
  "title": "MV Intake - Doe (TECH SUPPORT) - 2026-04-22",
  "recipients": [
    { "email": "...", "name": "...", "role": "SIGNER", "signingOrder": 1, "fields": [...] },
    { "email": "...", "name": "...", "role": "CC",     "signingOrder": 2, "fields": [] }
  ],
  "meta": {
    "subject": "...",
    "message": "...",
    "timezone": "America/Los_Angeles",
    "dateFormat": "MM/dd/yyyy",
    "distributionMethod": "EMAIL",
    "signingOrder": "SEQUENTIAL",
    "typedSignatureEnabled": true,
    "drawSignatureEnabled": true
  }
}
```

Multipart upload: send the JSON above as a `payload` form field plus the PDF as `files` binary form field.

### POST /envelope/distribute — endpoint shape

The distribute endpoint is `/api/v2/envelope/distribute` with body `{"envelopeId":"envelope_xxx"}`. **NOT** `/api/v2/envelope/{id}/distribute` — that path returns 404. Common porting mistake from other signing-service patterns.

```bash
curl -X POST https://$DOCUMENSO_HOST/api/v2/envelope/distribute \
  -H "Authorization: api_xxx" \
  -H "Content-Type: application/json" \
  -d '{"envelopeId":"envelope_abc123"}'
```

### Envelope ID forms (canonicalize to string)

Two ID forms exist and they are NOT interchangeable:

| Form | Where it appears | Example |
|------|------------------|---------|
| Numeric integer | Webhook payload `payload.id`, internal `documentId` | `104` |
| String | Top-level API responses, search results, all path params | `envelope_abc123xyz` |

**Rule:** always canonicalize to the string form for cross-system matching (sheet rows, Drive metadata, audit logs, downstream node lookups). When a webhook fires with a numeric id, resolve it via search:

```
GET /envelope?query={title}
→ data[0].id  (the string form)
```

### Search Parameters (GET /envelope)

| Param | Values |
|-------|--------|
| `status` | DRAFT, PENDING, COMPLETED, REJECTED |
| `query` | Free text search |
| `page` | Page number (1-based) |
| `perPage` | Items per page |
| `source` | DOCUMENT, TEMPLATE, TEMPLATE_DIRECT_LINK |
| `folderId` | Filter by folder |
| `orderByColumn` | createdAt, updatedAt, title |
| `orderByDirection` | asc, desc |

## Envelope Item Endpoints (PDFs within envelope)

**CRITICAL**: In the envelope GET response, the items array field is called `envelopeItems` (NOT `items`). Item IDs are string format: `envelope_item_xxxxx`.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/envelope/item/create-many` | Add documents to envelope |
| POST | `/envelope/item/update-many` | Update document metadata |
| POST | `/envelope/item/delete` | Remove a document |
| GET | `/envelope/item/{itemId}/download` | Download PDF (`?version=original\|signed`) |

## Recipient Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/envelope/recipient/{recipientId}` | Get recipient |
| POST | `/envelope/recipient/create-many` | Add recipients |
| POST | `/envelope/recipient/update-many` | Update recipients |
| POST | `/envelope/recipient/delete` | Remove recipient |

### Recipient Roles

| Role | Description |
|------|-------------|
| `SIGNER` | Must sign; blocks completion |
| `APPROVER` | Must approve; blocks completion |
| `CC` | Receives completed document, no action |
| `VIEWER` | View-only access |
| `ASSISTANT` | Can help fill fields but not sign |

## Field Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/envelope/field/{fieldId}` | Get field |
| POST | `/envelope/field/create-many` | Add fields |
| POST | `/envelope/field/update-many` | Update fields |
| POST | `/envelope/field/delete` | Remove field |

### Field Types

| Type | Description |
|------|-------------|
| `SIGNATURE` | Drawn/typed/uploaded signature |
| `FREE_SIGNATURE` | Unconstrained signature |
| `INITIALS` | Initials only |
| `NAME` | Auto-filled full name |
| `EMAIL` | Auto-filled email address |
| `DATE` | Date field (format configurable) |
| `TEXT` | Free-form text input |
| `NUMBER` | Numeric input |
| `RADIO` | Radio button group |
| `CHECKBOX` | Single checkbox |
| `DROPDOWN` | Select from options |

### Field Positioning

**CRITICAL**: All coordinates are **percentages (0-100)**, NOT pixels.

| Parameter | Meaning | Example |
|-----------|---------|---------|
| `positionX` | Horizontal (0=left, 100=right) | 55 = 55% from left |
| `positionY` | Vertical (0=top, 100=bottom) | 85 = near bottom |
| `width` | Width as % of page | 40 = 40% page width |
| `height` | Height as % of page | 5 = ~1 line |
| `page` | 1-based page number | 1 = first page |
| `identifier` | 0-based file index or filename | 0 = first PDF |

### fieldMeta Properties

**CRITICAL**: `fieldMeta.type` must be **lowercase** (e.g., `"signature"`, `"date"`, `"text"`) — this is separate from the outer `type` field which is UPPERCASE.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | **Yes** | Lowercase field type: `"signature"`, `"date"`, `"text"`, etc. |
| `label` | string | No | Display label |
| `placeholder` | string | **Yes** | Placeholder text (can be empty string `""`) |
| `required` | boolean | No | Must be filled |
| `readOnly` | boolean | No | Cannot be edited by signer. Use with `text` to create pre-filled display fields. |
| `fontSize` | number | No | Font size for rendered text |
| `textAlign` | string | No | Text alignment (`"left"`, `"center"`, `"right"`) |
| `text` | string | No | **Pre-fill value** — sets the field's text content when creating. Signer sees this value. Combine with `readOnly: true` for display-only fields. |

## Template Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/template` | List templates |
| GET | `/template/{templateId}` | Get template |
| POST | `/template/use` | Create envelope from template |
| POST | `/template/update` | Update template |
| POST | `/template/duplicate` | Duplicate template |
| POST | `/template/delete` | Delete template |

## Folder Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/folder` | List folders |
| POST | `/folder/create` | Create folder |

## Attachment Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/envelope/attachment` | Find attachments |
| POST | `/envelope/attachment/create` | Add attachment |
| POST | `/envelope/attachment/update` | Update attachment |
| POST | `/envelope/attachment/delete` | Remove attachment |

## Embedding Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/embedding/create-presign-token` | Get token for embedded authoring |

## Webhook Events

Configure in Documenso Settings > Webhooks. Secret sent in `X-Documenso-Secret` header.

**CRITICAL**: Webhook management is **UI only** — there is no API endpoint to programmatically create, list, or delete webhooks.

**CRITICAL — Webhook ID Mismatch**: The webhook payload `id` field is a **numeric** internal documentId (e.g., `123`). The API endpoints require the **string** format `envelope_xxxxx`. Calling `GET /envelope/123` returns 400. Bridge the gap by searching: `GET /envelope?query={title}` to find the string ID.

| Event | When |
|-------|------|
| `DOCUMENT_CREATED` | Envelope created |
| `DOCUMENT_SENT` | Distributed to recipients |
| `DOCUMENT_OPENED` | Recipient opened signing link |
| `DOCUMENT_SIGNED` | Individual signature completed |
| `DOCUMENT_COMPLETED` | All signatories finished |
| `DOCUMENT_REJECTED` | Recipient declined |
| `DOCUMENT_CANCELLED` | Owner cancelled |
| `RECIPIENT_EXPIRED` | Signing link expired |
| `TEMPLATE_CREATED` | Template created |
| `TEMPLATE_UPDATED` | Template modified |
| `TEMPLATE_DELETED` | Template removed |
| `TEMPLATE_USED` | Template used to generate envelope |

### Webhook Payload Format

```json
{
  "event": "DOCUMENT_COMPLETED",
  "payload": {
    "id": 123,
    "title": "Contract",
    "status": "COMPLETED",
    "completedAt": "2024-01-15T10:30:00.000Z",
    "recipients": [
      {
        "email": "signer@psd401.net",
        "name": "Jane Doe",
        "role": "SIGNER",
        "signingStatus": "SIGNED",
        "signedAt": "2024-01-15T10:29:00.000Z"
      }
    ]
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "webhookEndpoint": "https://your-endpoint.com/webhook"
}
```
