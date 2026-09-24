# PSD Systems → n8n Integration Map

## System Credentials

| System | n8n Node/Method | Credential Type | Auth Method | Base URL |
|--------|----------------|-----------------|-------------|----------|
| Freshservice | HTTP Request | httpHeaderAuth | API Key in Authorization header | `https://<your-domain>.freshservice.com/api/v2` |
| PowerSchool | HTTP Request | httpHeaderAuth | Plugin OAuth → Bearer token | `https://<ps-host>/ws/v1` |
| Google Sheets | Google Sheets node | googleSheetsOAuth2Api | OAuth2 | Built-in |
| Gmail | Gmail node | gmailOAuth2 | OAuth2 | Built-in |
| Google Calendar | Google Calendar node | googleCalendarOAuth2Api | OAuth2 | Built-in |
| Google Drive | Google Drive node | googleDriveOAuth2Api | OAuth2 | Built-in |
| Red Rover | HTTP Request | httpBasicAuth | Basic Auth (username:password) | `https://connect.redroverk12.com/api/v1` |
| Slack | Slack node | slackOAuth2Api | OAuth2 Bot Token | Built-in |
| Email (SMTP) | Send Email node | smtp | SMTP credentials | PSD SMTP server |
| Documenso | HTTP Request (or community node `documenso/n8n-node`) | httpHeaderAuth | `Authorization: api_xxx` (NOT Bearer) | `http://${DOCUMENSO_HOST}/api/v2` |
| n8n Forms | Form Trigger | (none) | Built-in, no auth needed | Self-hosted form pages |

## Freshservice Integration

### Authentication
```
Header: Authorization: Basic <base64(apiKey:X)>
```
Note the `:X` suffix — Freshservice uses the API key as username with `X` as password in Basic auth.

### Common Endpoints
| Operation | Method | Path |
|-----------|--------|------|
| List tickets | GET | `/tickets?workspace_id=2` |
| Get ticket | GET | `/tickets/{id}` |
| Create ticket | POST | `/tickets` |
| Update ticket | PUT | `/tickets/{id}` |
| Add note | POST | `/tickets/{id}/notes` |
| List agents | GET | `/agents` |

### Workspace IDs
| ID | Name |
|----|------|
| 2 | Technology (primary) |
| 3 | Employee Support Services |
| 4 | Business Services |
| 5 | Teaching & Learning |
| 6 | Maintenance |
| 8 | Investigations |
| 9 | Transportation |
| 10 | Safety & Security |
| 11 | Communications |
| 13 | Software Development |

## Red Rover Integration

### Authentication
```
Header: Authorization: Basic <base64(username:password)>
```

### Common Endpoints
| Operation | Method | Path |
|-----------|--------|------|
| Get organization | GET | `/organization` |
| Get absences | GET | `/absences?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` |

## Google Workspace

All Google integrations use OAuth2 credentials configured in the n8n UI. The credential setup requires:
1. Google Cloud Console project with APIs enabled
2. OAuth2 consent screen configured
3. Client ID and Client Secret

### Google Drive Download Bug

The Google Drive v3 node's "download" operation calls the **export** API, not `files.get`. This causes `"Export only supports Docs Editors files"` errors for uploaded binary files like PDFs. **Workaround**: Serve files via a webhook "template server" pattern (base64-embedded in a Code node) or use an HTTP Request node with `?alt=media&supportsAllDrives=true`. Shared drives also require `supportsAllDrives=true` and `driveId` in options.

## n8n Forms (No External System)

Forms are self-hosted by n8n. Use the Form Trigger node to create forms and the Form node for multi-page forms.

- **Test URL**: Available during development (visible in node settings)
- **Production URL**: Active when workflow is published
- **Hidden fields**: Do NOT auto-populate from URL query parameters. Data is in `formQueryParameters` object instead.
- **File uploads**: Supported via the File field type

## Documenso Integration

### Authentication
```
Header: Authorization: api_xxxxxxxxxxxxxxxx
```
**NOT Bearer** — the `api_` prefix is part of the key itself. Do not add `Bearer` prefix.

### Common Endpoints (for n8n HTTP Request nodes)
| Operation | Method | Path |
|-----------|--------|------|
| List envelopes | GET | `/envelope?page=1&perPage=20&status=PENDING` |
| Get envelope | GET | `/envelope/{envelopeId}` |
| Create envelope | POST | `/envelope/create` (multipart/form-data) |
| Distribute | POST | `/envelope/distribute` |
| Download signed PDF | GET | `/envelope/item/{itemId}/download?version=signed` |
| Use template | POST | `/envelope/use` |

### Webhook Events (for n8n Webhook Trigger)
Configure in Documenso Settings > Webhooks:
- `DOCUMENT_COMPLETED` — all signatories finished
- `DOCUMENT_SIGNED` — individual signature completed
- `DOCUMENT_SENT` — distributed to recipients
- `DOCUMENT_REJECTED` — recipient declined

Secret sent in `X-Documenso-Secret` header for verification.

**CRITICAL**: Webhook management is **UI only** — no API endpoint to create/list/delete webhooks.

### Webhook ID Mismatch

Documenso webhooks send a **numeric** `id` (e.g., `13`) which is the internal `documentId`. The API endpoints require the **string** format `envelope_xxxxx`. Calling `GET /envelope/13` returns 400.

**Workaround**: Search by title using `GET /envelope?query={title}` to find the string ID, then use that for subsequent API calls.

Also: the items array in the envelope response is `envelopeItems` (not `items`). Item IDs are string format: `envelope_item_xxxxx`.

### Community Node
Official n8n community node: `documenso/n8n-node` (GitHub). 7 resources, 35 operations, 7 trigger events. Install via n8n Settings > Community Nodes.

### Key n8n Workflow Pattern
HR template → Documenso distribute → webhook on DOCUMENT_COMPLETED → n8n downloads signed PDF → stores to Google Drive → closes Freshservice ticket.

## Credential Setup Checklist

When connecting a new system:

1. Identify the auth method from the table above
2. Get the credential schema: `bun get_credential_schema.js <credType>`
3. Create the credential: `bun create_credential.js '<json>'`
4. Test with a simple read operation before building full workflows
5. Name credentials with environment prefix: `prod-freshservice-api`, `staging-google-sheets`
