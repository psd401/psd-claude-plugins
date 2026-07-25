---
name: n8n-manager
description: "Build, deploy, and manage n8n workflow automations on PSD's internal server. Use when: creating workflows, checking n8n status, managing executions, building automations, connecting PSD systems (Freshservice, PowerSchool, Google Workspace, Red Rover) via n8n. Triggers on: n8n, workflow automation, webhook, n8n build, n8n status, n8n workflows, n8n form."
argument-hint: "[command] [args...] — e.g., 'build ...', 'list', 'status', 'show 42', 'activate 42'"
model: claude-opus-5
effort: high
paths:
  - scripts/
  - references/
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
extended-thinking: true
---

# n8n Manager

## Configuration

- **Server**: Read from `N8N_HOST` environment variable (never hardcoded)
- **API Auth**: `X-N8N-API-KEY` header via `N8N_API_KEY` env var
- **Instance MCP**: Native n8n MCP at `N8N_HOST/mcp-server/http` (bearer token from `N8N_MCP_TOKEN`)
- **Docs MCP**: czlonkowski/n8n-mcp for node documentation and templates
- **Version**: n8n Community Edition v2.14.x
- **Scripts**: `plugins/psd-productivity/skills/n8n-manager/scripts/`

All scripts use `bun` and read credentials from `secrets.js` (env vars → Geoffrey .env).

## Community Edition Limitations

PSD runs n8n Community Edition. These features are **not available**:

- **No Settings → Variables** — environment variables are enterprise/pro only. All config values (API keys, URLs, folder IDs) must be hardcoded directly in workflow node parameters.
- **No instance-level error workflow** — must set `errorWorkflow` in each workflow's `settings` object individually.
- **Credentials API returns 403** — credential listing/reading is restricted. Get credential IDs from the user via the n8n UI.
- **No source control / Git integration** — workflows must be managed via API or UI exports.

## Command Reference

### Workflow Management

| Command | Script | Description |
|---------|--------|-------------|
| `/n8n status` | `bun health_check.js` | Server health, version, workflow count |
| `/n8n list` | `bun list_workflows.js` | List all workflows |
| `/n8n list '{"active":true}'` | `bun list_workflows.js '{"active":true}'` | Filter by status |
| `/n8n list '{"tag":"psd-production"}'` | `bun list_workflows.js '{"tag":"psd-production"}'` | Filter by tag |
| `/n8n show <id>` | `bun get_workflow.js <id>` | Get full workflow JSON |
| `/n8n activate <id>` | `bun activate_workflow.js <id>` | Activate workflow |
| `/n8n deactivate <id>` | `bun deactivate_workflow.js <id>` | Deactivate workflow |
| `/n8n delete <id>` | `bun delete_workflow.js <id>` | Delete workflow (**confirm first**) |

### Workflow Builder

| Command | Description |
|---------|-------------|
| `/n8n build "<description>"` | Build workflow from natural language (see protocol below) |
| `/n8n deploy '<json>'` | `bun deploy_workflow.js '<json>'` — validate + create |
| `/n8n trigger <url> [data]` | `bun trigger_workflow.js <url> '<json>'` — trigger via webhook |

### Executions

| Command | Script | Description |
|---------|--------|-------------|
| `/n8n executions` | `bun list_executions.js` | Recent executions |
| `/n8n executions '{"status":"error"}'` | `bun list_executions.js '{"status":"error"}'` | Failed only |
| `/n8n execution <id>` | `bun get_execution.js <id>` | Execution details |
| `/n8n execution <id> --full` | `bun get_execution.js <id> --full` | With node data |
| `/n8n retry <id>` | `bun retry_execution.js <id>` | Retry failed execution |

### Credentials & Configuration

| Command | Script | Description |
|---------|--------|-------------|
| `/n8n creds` | `bun list_credentials.js` | List credentials (metadata only) |
| `/n8n cred-schema <type>` | `bun get_credential_schema.js <type>` | Schema for credential type |
| `/n8n cred-create '<json>'` | `bun create_credential.js '<json>'` | Create credential |
| `/n8n tags` | `bun list_tags.js` | List all tags |
| `/n8n tag-create <name>` | `bun create_tag.js <name>` | Create tag |
| `/n8n vars` | `bun list_variables.js` | List variables |
| `/n8n var-create <key> <val>` | `bun create_variable.js <key> <val>` | Create variable |
| `/n8n audit` | `bun run_audit.js` | Security audit |
| `/n8n rotate-documenso-key <old> <new>` | `bun rotate_documenso_key.js <old> <new>` | Rotate the Documenso API key across every workflow that uses it. Add `--dry-run` first to preview. |

### Folder & Organization (MCP-based)

| Command | Script | Description |
|---------|--------|-------------|
| `/n8n folders` | `bun manage_folders.js list` | List all folders |
| `/n8n folders search <query>` | `bun manage_folders.js search <query>` | Search folders by name |
| `/n8n folders map` | `bun manage_folders.js map` | Map workflows to suggested folders |
| `/n8n folders organize` | `bun manage_folders.js organize` | Full organization report |
| `/n8n folders ensure-tags` | `bun manage_folders.js ensure-tags` | Create standard PSD tags |
| `/n8n folders tag <wfId> <tagId>` | `bun manage_folders.js tag <wfId> <tagId>` | Add tag to workflow |

**Note:** Folder creation must be done in the n8n UI. The public API does not support it. Use `manage_folders.js organize` to see which folders need to be created. New workflows can be placed in folders automatically via the MCP `create_workflow_from_code` tool with `folderId`.

## Workflow Builder Protocol

When building a workflow from a natural language description:

### Step 1: Research
- Read `references/n8n-node-catalog.md` for available node types and JSON snippets
- Read `references/psd-integration-map.md` if PSD systems are involved
- Read `references/psd-workflow-templates.md` for similar pre-built patterns
- Use n8n-docs MCP tools if available: `search_nodes` for node discovery, `get_node_details` for parameter schemas

### Step 2: Design
Present the workflow to the user as a numbered list:
```
1. [Trigger] Schedule - Every 5 Minutes (scheduleTrigger)
2. [Action] Fetch Tickets from Freshservice (httpRequest)
3. [Logic] Filter High Priority Only (if)
4. [Action] Send Slack Alert (slack)
```
Get user approval before generating JSON.

### Step 3: Generate
- Read `references/n8n-workflow-json-spec.md` for the exact JSON format
- Use unique, descriptive node names (NEVER default names like "HTTP Request")
- Space nodes ~250px apart horizontally
- Wire connections using exact node names

### Step 4: Validate
```bash
bun plugins/psd-productivity/skills/n8n-manager/scripts/validate_workflow.js '<json>'
```
Fix any errors before deploying.

### Step 5: Deploy
```bash
bun plugins/psd-productivity/skills/n8n-manager/scripts/deploy_workflow.js '<json>'
```
Returns the workflow ID and editor URL.

### Step 6: Test & Activate
- If webhook trigger: offer to send test data via `trigger_workflow.js`
- Check execution result via `list_executions.js`
- After successful test, activate with `activate_workflow.js`
- Suggest tagging with `psd-production`

## Safety Guardrails

### Always confirm before:
- **Deleting** a workflow (show name and active status first)
- **Deactivating** an active workflow (warn: webhook listeners will stop)
- **Overwriting** a workflow (show what changed)
- **Deleting** credentials (warn: workflows using them will break)

### Naming conventions:

- Node names must be **unique and descriptive** — e.g., "Fetch Freshservice Tickets" not "HTTP Request"
- Connections use node **NAMES as keys, NOT IDs** — duplicate names break wiring silently

| Type | Pattern | Example |
|------|---------|---------|
| Department workflows | `{Dept} - {Document Type}` | `ESS - Classified Performance Evaluation` |
| Infrastructure workflows | `PSD - {Service Name}` | `PSD - Logo Server`, `PSD - Template Server` |
| Router workflows | `{System} - {Function} Router` | `Documenso - Document Completion Router` |
| Documenso envelopes | `{Document Type} - {Name} - {Year}` | `Central Leadership Evaluation - Jane Smith - 2025-2026` |
| PDF templates (server) | `{type-slug}` | `classified-evaluation`, `central-leadership` |
| Google Drive files | `{Document Type} - {Name} - {Year}.pdf` | Matches envelope title |

### Folder structure:

| n8n Folder | Contains |
|------------|----------|
| ESS Evaluations | Employee evaluation workflows |
| ESS Timesheets | Centralized timesheet workflows (no per-department timesheets) |
| ESS Compliance | COI disclosures, attestations, policy acknowledgments |
| PSD Infrastructure | Router, completion handlers, error handler |
| PSD Servers | Template server, logo server |

- Every workflow must be in a folder, never root
- Workflow name prefix must match folder category (`ESS -`, `PSD -`, `Documenso -`)
- Create folders in the UI before placing workflows in them

### Standard tags:

| Tag | Purpose |
|-----|---------|
| `psd-production` | All active production workflows |
| `psd-ess` | ESS workflows |
| `psd-google` | Uses Google credentials |
| `psd-infrastructure` | Router, handlers, servers |
| `psd-evaluations` | Employee evaluations |
| `psd-timesheets` | Timesheet workflows |
| `psd-compliance` | Compliance and disclosures |
| `psd-documenso` | Uses Documenso for signing |

### Production safety:
- Never edit an active production workflow directly
- Clone first → modify clone → test → swap
- Tag convention: `psd-production`, `psd-staging`, `psd-template`, `psd-[system]`
- Webhook triggers should always include authentication (headerAuth minimum)

## Key Technical Warnings

- **No "run workflow" API endpoint** — workflows must have a Webhook/Schedule/Form trigger to execute. Use `trigger_workflow.js` to POST to webhook URLs.
- **Python in Code nodes uses Pyodide** (WebAssembly CPython) — not native Python. Standard library only, slower performance.
- **5-minute timeout** on native instance MCP executions.
- **Credential IDs are instance-specific** — workflows from other instances need credential re-mapping.
- **Code node sandbox restrictions** — no `fetch()`, `URLSearchParams`, `$http`, optional chaining `?.`, or `require()`. Use HTTP Request node for HTTP calls. Use `encodeURIComponent()` for URL encoding. See `references/n8n-node-catalog.md` for the complete list.
- **Form Trigger URLs use `webhookId` UUID** — not the custom `path` parameter. The URL is `/form/{webhookId}`, not `/form/{path}`. Get the `webhookId` from the workflow API response.
- **Form hidden fields don't populate from query params** — data is available in `$json.formQueryParameters`, not the hidden field value. Use fallback: `form['Field'] || form.formQueryParameters.fieldName || ''`.
- **Form custom CSS requires deactivate/reactivate** — n8n caches the form template. Changes to `customCss` in options won't appear until the workflow is toggled off then on.
- **Form width** — controlled by CSS variable `--container-width` (default 448px). Override in custom CSS: `:root { --container-width: 900px !important; }`.
- **Form branding** — `<img>` tags are sanitized (src stripped). Use `<iframe frameborder="0">` with a webhook-served image instead. CSS `url()` is also stripped.
- **Webhook paths don't support route parameters** — `path: "template/:name"` returns 404. Use query parameters instead: `path: "psd-template"` with `?name=value`.
- **Google Drive v3 download bug** — the download operation calls the export API, causing "Export only supports Docs Editors files" for uploaded PDFs. Use the template server pattern or HTTP Request with `?alt=media&supportsAllDrives=true`.
- **Google Sheets auto-map pitfall** — `autoMapInputData` creates duplicate columns if JSON keys don't match headers exactly (including whitespace). Use a Code node to format keys before the Sheets node.
- **Google Sheets Update returns empty output** — the `update` operation on `n8n-nodes-base.googleSheets` v4.5 normally emits zero items on success, which breaks downstream chains silently. Set `"alwaysOutputData": true` on every Update node whose output is consumed by a later node (Read, Email, etc.).
- **Google Sheets filtered-read can silently return zero rows** — `filtersUI` with `lookupColumn`/`lookupValue` intermittently returns empty even when the row exists; seen with `sheetName.mode='name' value='Sheet1'`. Fallback is a direct HTTP Request to `https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}` via `predefinedCredentialType: googleSheetsOAuth2Api`, then filter client-side in a Code node. Reliable.
- **Google Sheets sheetName mode mismatch** — some sheets work with `{mode: 'name', value: 'Sheet1'}` and others only with `{mode: 'id', value: 'gid=0'}`. When a Sheets node "Sheet with name X not found," try the other form. Employee Directory (`16iyRqjWoeeXLrrcyP6EOGWL8JKutd-rMBuDzvkNtK38`) requires `gid=0`.
- **Switch node v3.2 silently routes to output 0** if rules are missing full structure. Every rule's `conditions` object MUST include `options.typeValidation: 'strict'`, `options.version: 2`, `combinator: 'and'`, and each condition needs `operator.name` (e.g. `'filter.operator.equals'`) in addition to `type`/`operation`. Rules built with only the minimal `{leftValue, rightValue, operator: {type, operation}}` match the first rule on every input.
- **Switch fallback output requires `options.fallbackOutput: 'extra'`** — without it, unmatched inputs are silently dropped. With it, an additional output is added at the end of the rules array for "no rule matched" traffic.
- **executeWorkflow typeVersion 1.0 is broken** — throws `Workflow does not exist` at runtime even when the sub-workflow exists and is active. Always deploy `n8n-nodes-base.executeWorkflow` with `typeVersion: 1.2`. Sub-workflow resolution in v1.0 is effectively dead.
- **Sub-workflows must be activated before the caller is saved** — deploying a parent workflow that calls an inactive sub-workflow fails with `Cannot publish workflow: Node X references workflow Y which is not published`. Activate the sub-workflow first, THEN deploy the parent.
- **Gmail node `senderName` silently drops messages** — setting `options.senderName` without a matching Google Workspace send-as alias causes Gmail to accept the message, return a valid message ID with SENT label, and never deliver. Omit `senderName` unless a Workspace alias is configured for the credentialed account.
- **Gmail node default footer leaks** — `options.appendAttribution` defaults to `true`, appending "Automated with n8n" to branded emails. Always explicitly set `options.appendAttribution: false` on every Gmail node.
- **Stale snapshot regressions** — `update_workflow.js` is a full PUT. If a script rebuilds a workflow from a snapshot taken before another fix was deployed, the earlier fix silently reverts. Every modify MUST be preceded by a `get_workflow.js` call in the same script run; never re-use an older snapshot even minutes later.
- **HTTP Request `=` prefix on literal fields** — fields built by the n8n UI store string literals as `=value` (expression-mode with no interpolation). Build scripts that write `"value": "plain"` work for most cases but can trigger subtle bugs in multipart body encoding. Prefer `"=plain"` to match UI-built shape.
- **n8n masks Documenso 400 errors as ECONNREFUSED** — when `POST /api/v2/envelope/create` returns HTTP 400 with a JSON validation error (e.g. missing `type: 'DOCUMENT'`), the n8n HTTP Request node with multipart-form-data reports it as `The service refused the connection - perhaps it is offline` / `ECONNREFUSED`. Always replay a failing Documenso payload via `curl` from the host to see the real error body.

## PSD Systems Quick Reference

| System | Auth | How to Connect |
|--------|------|---------------|
| Freshservice | API Key (Basic auth with `:X`) | httpHeaderAuth credential + HTTP Request node |
| PowerSchool | Plugin OAuth → Bearer token | httpHeaderAuth credential + HTTP Request node |
| Google Workspace | OAuth2 | Native Google nodes (Sheets, Gmail, Calendar, Drive) |
| Red Rover | Basic Auth (username:password) | httpBasicAuth credential + HTTP Request node |
| Slack | OAuth2 Bot Token | Native Slack node |

See `references/psd-integration-map.md` for full details including workspace IDs and endpoints.

## Pipeline Smoke Test

Before deploying workflows that use the pdf-builder → documenso → n8n pipeline, run the integration test harness:

```bash
# Run all suites (manifest, documenso, n8n, snapshot)
bun plugins/psd-productivity/scripts/test_pipeline.js

# Validate a specific workflow JSON file
bun plugins/psd-productivity/scripts/test_pipeline.js --suite n8n --workflow @path/to/workflow.json

# Validate a specific field manifest
bun plugins/psd-productivity/scripts/test_pipeline.js --suite manifest --manifest @path/to/doc.pdf.fields.json
```

**What it catches** (no live API calls — all structural checks):
- Field manifest coordinates out of bounds or overflowing page edges
- Type mismatches between UPPERCASE outer type and lowercase fieldMeta.type
- Switch v3.2 nodes missing combinator/typeValidation/version/operator.name (silent route-to-0 bug)
- executeWorkflow nodes with broken typeVersion 1.0
- Gmail nodes missing `appendAttribution: false`
- Google Sheets Update nodes missing `alwaysOutputData: true` when downstream nodes consume output
- Documenso envelope/create HTTP requests missing `type: 'DOCUMENT'`
- Stale snapshot risks in deploy/update scripts

## Reference Documents

| Document | Contents |
|----------|----------|
| `references/n8n-workflow-json-spec.md` | Workflow JSON structure, connection model, expression syntax |
| `references/n8n-node-catalog.md` | Common nodes with JSON snippets (Webhook, Form, HTTP, Code, IF, Slack, Google) — includes the canonical Switch v3.2, executeWorkflow v1.2, Gmail v2.1, and Documenso multipart/distribute HTTP shapes |
| `references/psd-integration-map.md` | PSD systems → n8n nodes, credentials, auth methods, endpoints |
| `references/psd-workflow-templates.md` | 10 pre-built PSD workflow patterns with node configs |
| `references/documenso-n8n-patterns.md` | Submission + completion-handler + router patterns for the DocuSign→Documenso migration; title-prefix routing convention; debug flow when "nothing happens" |
