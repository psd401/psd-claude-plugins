---
name: docusign-manager
description: "Export and archive DocuSign envelopes, templates, and documents for migration to Documenso. Read-only — no creating or modifying content. Use when: downloading signed documents, exporting templates, bulk archiving, querying envelope status, migrating to Documenso. Triggers on: docusign, export, archive, migration, signed documents, bulk download."
argument-hint: "[command] [args...] — e.g., 'status', 'list-templates', 'bulk-download', 'export-templates'"
model: claude-opus-4-8
effort: high
paths:
  - scripts/
  - references/
  - ~/Downloads/
  - ~/.docusign-export/
  - ~/DocuSign-Export/
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
extended-thinking: true
---

# DocuSign Manager

Read-only export and archive skill for migrating from DocuSign to Documenso + n8n.

## Configuration

- **API**: DocuSign eSignature REST API v2.1
- **Auth**: JWT Grant (RSA-signed assertion → access token, 1-hour expiry, auto-refresh)
- **Base URI**: Auto-discovered via `/oauth/userinfo` (varies by account: na1, na2, na3, eu, au)
- **Rate Limits**: 3,000 calls/hour, 500 per 30 seconds
- **Scripts**: `plugins/psd-productivity/skills/docusign-manager/scripts/`

All scripts use `bun` and read credentials from `secrets.js` (env vars → Geoffrey .env).

### Required Secrets

| Secret | Description |
|--------|-------------|
| `DOCUSIGN_INTEGRATION_KEY` | Integration key (client ID) from DocuSign admin |
| `DOCUSIGN_USER_ID` | User ID (GUID) of the API user |
| `DOCUSIGN_ACCOUNT_ID` | Account ID (GUID) |
| `DOCUSIGN_RSA_KEY_PATH` | Path to RSA private key file (PEM format) |
| `DOCUSIGN_ENVIRONMENT` | `production` or `demo` (default: `production`) |

See `references/docusign-jwt-setup.md` for credential setup instructions.

## Command Reference

### Account

| Command | Script | Description |
|---------|--------|-------------|
| `/docusign status` | `bun health_check.js` | Test JWT auth, show account info |

### Templates

| Command | Script | Description |
|---------|--------|-------------|
| `/docusign list-templates` | `bun list_templates.js` | List all templates |
| `/docusign list-templates '{"search":"permission"}'` | `bun list_templates.js '{"search":"permission"}'` | Search templates |
| `/docusign get-template <id>` | `bun get_template.js <id>` | Full template with fields/recipients |
| `/docusign export-template <id>` | `bun export_template.js <id>` | Export as Documenso-compatible JSON |
| `/docusign export-templates` | `bun export_all_templates.js` | Export ALL templates with manifest |
| `/docusign download-template <id>` | `bun download_template.js <id>` | Download template PDF(s) + Documenso field mapping |

### PowerForms

| Command | Script | Description |
|---------|--------|-------------|
| `/docusign list-powerforms` | `bun list_powerforms.js` | List all PowerForms (self-service links) |
| `/docusign get-powerform <id>` | `bun get_powerform.js <id>` | PowerForm details with migration hints |

### Account Inventory

| Command | Script | Description |
|---------|--------|-------------|
| `/docusign export-account` | `bun export_account.js` | Full account inventory (templates, PowerForms, groups, envelope stats by year) |

### Envelopes

| Command | Script | Description |
|---------|--------|-------------|
| `/docusign list-envelopes` | `bun list_envelopes.js` | List recent envelopes |
| `/docusign list-envelopes '{"status":"completed","from_date":"2024-01-01"}'` | `bun list_envelopes.js '...'` | Filter by status/date |
| `/docusign get-envelope <id>` | `bun get_envelope.js <id>` | Full envelope details |
| `/docusign download <id>` | `bun download_document.js <id>` | Download signed PDF |
| `/docusign download-audit <id>` | `bun download_audit.js <id>` | Download audit trail JSON |
| `/docusign download-audit <id> certificate` | `bun download_audit.js <id> certificate` | Download Certificate of Completion PDF |

### Bulk Operations

| Command | Script | Description |
|---------|--------|-------------|
| `/docusign bulk-download` | `bun bulk_download.js` | Download ALL completed envelopes (with checkpointing) |
| `/docusign bulk-download --status` | `bun bulk_download.js --status` | Show bulk download progress |
| `/docusign bulk-download --retry-failed` | `bun bulk_download.js --retry-failed` | Retry previously failed downloads |
| `/docusign bulk-download --from 2024-01-01` | `bun bulk_download.js --from 2024-01-01` | Download from specific date |
| `/docusign bulk-download --reset` | `bun bulk_download.js --reset` | Clear checkpoint and start fresh |

## Bulk Download Details

The `bulk-download` command is designed for large-scale export (50,000+ envelopes):

**Two phases:**
1. **Enumerate** — paginate through all completed envelopes, collect IDs (~30 seconds)
2. **Download** — download each envelope's combined PDF with rate limiting

**Checkpointing:** Progress saved to `~/.docusign-export/checkpoint.json` every 50 downloads. Safe to stop (Ctrl+C) and resume later — picks up where it left off. Already-downloaded files are skipped.

**Output structure:**
```
~/DocuSign-Export/envelopes/
  2024/
    01/
      Permission-Slip-abc12345.pdf
      Employment-Agreement-def67890.pdf
    02/
      ...
  2025/
    ...
```

**Time estimate:** 50,000 envelopes at 3,000 API calls/hour = **~17 hours**. Designed for overnight runs.

## Migration Plan (20 Days)

See `references/docusign-migration-guide.md` for the full 20-day migration plan.

| Days | Phase | Key Commands |
|------|-------|-------------|
| 1-2 | Inventory & Archive | `export-account`, `bulk-download` (runs ~18hrs) |
| 3-5 | Template Triage | `export-templates`, `download-template` for each |
| 6-12 | Template Migration | Upload PDFs to Documenso, map fields from exported JSON |
| 13-17 | PowerForm Migration | `list-powerforms`, `get-powerform`, rebuild as n8n workflows |
| 18-19 | Testing & Cutover | Test all workflows, redirect users |
| 20 | Decommission | Disable PowerForms, notify users |

**Account stats**: 655 named templates, 50 PowerForms, 55,068 completed envelopes (2020-2026)

## Template Export for Documenso Migration

The `export-template` command transforms DocuSign templates into Documenso-compatible JSON:

- **Tab type mapping**: `signHereTabs` → `SIGNATURE`, `textTabs` → `TEXT`, `dateSignedTabs` → `DATE`, etc.
- **Coordinate conversion**: DocuSign absolute pixels (72 DPI) → Documenso percentages (0-100)
- **Recipient role mapping**: DocuSign roles → Documenso roles (SIGNER, CC)
- **Unmapped tabs**: Tabs with no Documenso equivalent are logged (e.g., `formulaTabs`, `notarizeTabs`)

See `references/docusign-migration-guide.md` for the complete mapping table.

## Safety Notes

This is a **read-only** skill. No operations create, modify, or delete content in DocuSign.

### Always confirm before:
- **Bulk downloads** — communicate the ~17 hour time estimate upfront
- **Export-all-templates** — may generate many files

## Key Technical Warnings

- **JWT consent is required once** — first-time auth needs a one-time browser-based consent grant. Cannot be automated. See `references/docusign-jwt-setup.md`.
- **`from_date` is REQUIRED** — the envelopes list endpoint silently defaults to 30 days ago if `from_date` is omitted. All scripts pass this explicitly.
- **Base URI varies by account** — DocuSign accounts live on different regional servers. The client auto-discovers via `/oauth/userinfo`.
- **Rate limits: 3,000 calls/hour** — the client implements a token bucket rate limiter (480 tokens, 16/sec refill). Bulk downloads respect this automatically.
- **No npm dependencies** — uses native `crypto.createSign` for JWT signing, native `fetch` for HTTP. Matches the existing skill pattern.

## Reference Documents

| Document | Contents |
|----------|----------|
| `references/docusign-jwt-setup.md` | Step-by-step JWT credential setup for DocuSign admin |
| `references/docusign-api-reference.md` | API endpoints, pagination, rate limits, auth flow |
| `references/docusign-migration-guide.md` | DocuSign → Documenso concept mapping, field types, coordinates |
