# n8n Node Catalog — Common Nodes

For full node documentation, use the n8n-docs MCP: `search_nodes` and `get_node_details`.
This catalog covers the nodes most frequently used in PSD workflows.

## Trigger Nodes

### Webhook (`n8n-nodes-base.webhook`)
Receives HTTP requests. Use for external service integrations and programmatic triggers.

```json
{
  "name": "Webhook - Receive Request",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "position": [250, 300],
  "parameters": {
    "path": "my-endpoint",
    "httpMethod": "POST",
    "authentication": "headerAuth",
    "responseMode": "responseNode"
  }
}
```

**Key params**: `path` (URL path), `httpMethod` (GET/POST/etc.), `authentication` (none/basicAuth/headerAuth), `responseMode` (lastNode/responseNode)

### Form Trigger (`n8n-nodes-base.formTrigger`)
Creates a web form. n8n hosts the form page automatically.

```json
{
  "name": "Request Form",
  "type": "n8n-nodes-base.formTrigger",
  "typeVersion": 2,
  "position": [250, 300],
  "parameters": {
    "formTitle": "IT Equipment Request",
    "formDescription": "Submit a request for new equipment",
    "formFields": {
      "values": [
        { "fieldLabel": "Your Name", "fieldType": "text", "requiredField": true },
        { "fieldLabel": "Equipment Type", "fieldType": "dropdown", "fieldOptions": { "values": [{ "option": "Laptop" }, { "option": "Monitor" }, { "option": "Keyboard" }] } },
        { "fieldLabel": "Estimated Cost", "fieldType": "number" },
        { "fieldLabel": "Justification", "fieldType": "textarea" }
      ]
    },
    "respondWith": "text",
    "formSubmittedText": "Request submitted successfully!"
  }
}
```

**Field types**: text, textarea, number, email, password, date, dropdown, checkbox, hidden, file

#### Multi-Page Forms: Data is NOT Merged

Each Form page node has its own separate output. `$('Form Trigger Name').first().json` only contains page 1 data. Ratings or fields from pages 2+ are in their respective Form node outputs.

**You must explicitly merge data from all pages** in downstream Code nodes:
```javascript
var page1 = $('Evaluation Form').first().json;
var page2 = $('Criteria 1-3 Ratings').first().json;
var page3 = $('Criteria 4-6 Ratings').first().json;
var form = {};
var pages = [page1, page2, page3];
for (var p = 0; p < pages.length; p++) {
  for (var key in pages[p]) {
    if (pages[p].hasOwnProperty(key)) form[key] = pages[p][key];
  }
}
```

#### Form Trigger Branding & Customization

**Form URL**: The production form URL is `/form/{webhookId}` — NOT `/form/{path}`. The custom `path` parameter does not control the form URL. Get the `webhookId` from the workflow API response (it's on the node object).

**Logo/Images**: n8n's HTML sanitizer strips `src` from `<img>` tags, `data:` URIs, and CSS `url()`. The workaround is:
1. Serve images via a webhook workflow (e.g., PSD - Logo Server)
2. Embed in Custom HTML fields using `<iframe src="https://host/webhook/logo" width="320" height="120" frameborder="0" scrolling="no"></iframe>`
3. `frameborder="0"` attribute works (CSS `border:none` gets stripped)

**Custom CSS**: Set via `parameters.options.customCss` on the form trigger node. Key variables:
- `:root { --container-width: 900px !important; }` — controls form width (default 448px)
- `.container { width: 900px !important; max-width: 95% !important; }` — backup selector
- **CRITICAL**: CSS changes require workflow deactivate/reactivate to take effect (n8n caches the form template)

**Hidden fields**: Do NOT auto-populate from URL query parameters. Data from `?key=value` is available in `$json.formQueryParameters`, not in the hidden field value. Use fallback: `form['Field'] || form.formQueryParameters.fieldName || ''`

**Attribution**: Set `parameters.appendAttribution = false` to remove "Form automated with n8n" label

### Schedule Trigger (`n8n-nodes-base.scheduleTrigger`)
Runs on a schedule (cron-style).

```json
{
  "name": "Daily 6:30 AM",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.2,
  "position": [250, 300],
  "parameters": {
    "rule": {
      "interval": [{ "field": "cronExpression", "expression": "30 6 * * *" }]
    }
  }
}
```

**Timezone**: Set in workflow settings, not the node. Default: instance timezone.

## Action Nodes

### HTTP Request (`n8n-nodes-base.httpRequest`)
Call any REST API. The workhorse node for custom integrations.

```json
{
  "name": "Fetch Freshservice Tickets",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [500, 300],
  "parameters": {
    "url": "https://<your-domain>.freshservice.com/api/v2/tickets",
    "method": "GET",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "httpHeaderAuth",
    "sendQuery": true,
    "queryParameters": {
      "parameters": [
        { "name": "per_page", "value": "30" },
        { "name": "workspace_id", "value": "2" }
      ]
    }
  },
  "credentials": {
    "httpHeaderAuth": { "id": "cred-id", "name": "Freshservice API" }
  }
}
```

### Code (`n8n-nodes-base.code`)
Run JavaScript or Python. JavaScript is native; Python uses Pyodide (WebAssembly — limited libraries).

```json
{
  "name": "Process Data",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [500, 300],
  "parameters": {
    "jsCode": "const items = $input.all();\nreturn items.map(item => {\n  return { json: { ...item.json, processed: true } };\n});"
  }
}
```

**CRITICAL**: Code node must return `[{ json: {...} }]` format. Missing this causes silent failures.

#### Code Node Sandbox Restrictions

The Code node runs in an isolated task runner VM. Many standard JavaScript globals are **not available**:

**Not available:**
- `fetch()` — use HTTP Request node instead
- `URLSearchParams` — use `encodeURIComponent()` + manual string concatenation
- `$http` — does not exist (not a real n8n built-in)
- `require()` — blocked by default (configurable via `NODE_FUNCTION_ALLOW_BUILTIN`)
- `import` — not supported
- `process`, `eval()`, `new Function()`, `__proto__` — blocked for security
- Optional chaining `?.` — causes `Unexpected token '.'` in some versions. Use `|| {}` fallback pattern.

**Available:**
- `$input.first().json` — current node input data
- `$('Node Name').first().json` — reference another node's output
- `encodeURIComponent()` — URL encoding
- `JSON.stringify()` / `JSON.parse()` — JSON operations
- `Math`, `Date`, `String`, `Array`, `Object` — standard JS built-ins
- `Buffer.from()` — binary data handling (zero-filled by default)
- `console.log()` — only if `CODE_ENABLE_STDOUT` is enabled on the server

### Set (`n8n-nodes-base.set`)
Set or modify data fields.

```json
{
  "name": "Add Metadata",
  "type": "n8n-nodes-base.set",
  "typeVersion": 3.4,
  "position": [500, 300],
  "parameters": {
    "mode": "manual",
    "fields": {
      "values": [
        { "name": "source", "stringValue": "n8n-automation" },
        { "name": "timestamp", "stringValue": "={{ $now.toISO() }}" }
      ]
    }
  }
}
```

## Logic Nodes

### IF (`n8n-nodes-base.if`)
Conditional branching. Output 0 = true, Output 1 = false.

```json
{
  "name": "Check Priority",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "position": [500, 300],
  "parameters": {
    "conditions": {
      "options": { "caseSensitive": true, "leftValue": "" },
      "conditions": [
        {
          "leftValue": "={{ $json.priority }}",
          "rightValue": 3,
          "operator": { "type": "number", "operation": "lte" }
        }
      ]
    }
  }
}
```

### Switch (`n8n-nodes-base.switch`) — v3.2
Multi-branch routing based on a value. **Every rule MUST include the full structure below.** Missing `options.typeValidation`, `options.version`, `combinator`, or `operator.name` causes n8n to silently route all inputs to output 0 regardless of the value being tested.

```json
{
  "name": "Route by Category",
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3.2,
  "position": [500, 300],
  "parameters": {
    "rules": {
      "values": [
        {
          "conditions": {
            "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict", "version": 2 },
            "conditions": [{
              "id": "<uuid-v4>",
              "leftValue": "={{ $json.category }}",
              "rightValue": "hardware",
              "operator": { "type": "string", "operation": "equals", "name": "filter.operator.equals" }
            }],
            "combinator": "and"
          },
          "renameOutput": false
        },
        {
          "conditions": {
            "options": { "caseSensitive": true, "leftValue": "", "typeValidation": "strict", "version": 2 },
            "conditions": [{
              "id": "<uuid-v4>",
              "leftValue": "={{ $json.category }}",
              "rightValue": "software",
              "operator": { "type": "string", "operation": "equals", "name": "filter.operator.equals" }
            }],
            "combinator": "and"
          },
          "renameOutput": false
        }
      ]
    },
    "options": { "fallbackOutput": "extra" }
  }
}
```

**`fallbackOutput: "extra"`** — adds a final output for inputs that match no rule. Connect a fallback/log node to the last switch output.

### Execute Workflow (`n8n-nodes-base.executeWorkflow`) — v1.2
Calls a sub-workflow by ID. **Always use `typeVersion: 1.2`.** Version 1.0 throws `Workflow does not exist` at runtime even when the target is active.

```json
{
  "name": "Handle Completion",
  "type": "n8n-nodes-base.executeWorkflow",
  "typeVersion": 1.2,
  "position": [1050, 300],
  "parameters": {
    "workflowId": { "__rl": true, "value": "jyfv4zdobvpbmcCo", "mode": "id" },
    "options": {}
  }
}
```

**Activation order:** the sub-workflow must be active BEFORE the parent is saved with the reference, otherwise deploy fails with `Cannot publish workflow: Node X references workflow Y which is not published`.

### Merge (`n8n-nodes-base.merge`)
Combine data from multiple branches.

```json
{
  "name": "Combine Results",
  "type": "n8n-nodes-base.merge",
  "typeVersion": 3,
  "position": [750, 300],
  "parameters": {
    "mode": "append"
  }
}
```

**Modes**: append, combine (by field), chooseBranch, multiplex

## Communication Nodes

### Slack (`n8n-nodes-base.slack`)
Send messages to Slack channels.

```json
{
  "name": "Alert Slack Channel",
  "type": "n8n-nodes-base.slack",
  "typeVersion": 2.2,
  "position": [750, 300],
  "parameters": {
    "resource": "message",
    "operation": "post",
    "channel": { "__rl": true, "value": "#it-alerts", "mode": "name" },
    "text": "={{ '🚨 High priority ticket: ' + $json.subject }}"
  },
  "credentials": {
    "slackOAuth2Api": { "id": "cred-id", "name": "PSD Slack" }
  }
}
```

### Send Email (`n8n-nodes-base.emailSend`)
Send email via SMTP.

```json
{
  "name": "Send Notification Email",
  "type": "n8n-nodes-base.emailSend",
  "typeVersion": 2.1,
  "position": [750, 300],
  "parameters": {
    "fromEmail": "n8n@psd401.net",
    "toEmail": "={{ $json.email }}",
    "subject": "Your request has been submitted",
    "emailType": "text",
    "message": "Hello {{ $json.name }}, your request #{{ $json.ticketId }} has been received."
  },
  "credentials": {
    "smtp": { "id": "cred-id", "name": "PSD SMTP" }
  }
}
```

## Google Workspace Nodes

### Google Sheets (`n8n-nodes-base.googleSheets`)

```json
{
  "name": "Log to Sheet",
  "type": "n8n-nodes-base.googleSheets",
  "typeVersion": 4.5,
  "position": [750, 300],
  "parameters": {
    "operation": "append",
    "documentId": { "__rl": true, "value": "spreadsheet-id", "mode": "id" },
    "sheetName": { "__rl": true, "value": "Sheet1", "mode": "name" },
    "columns": {
      "mappingMode": "defineBelow",
      "value": {
        "Date": "={{ $now.toISO() }}",
        "Name": "={{ $json.name }}",
        "Status": "={{ $json.status }}"
      }
    }
  },
  "credentials": {
    "googleSheetsOAuth2Api": { "id": "cred-id", "name": "PSD Google" }
  }
}
```

#### Google Sheets Gotchas

- **`autoMapInputData` creates duplicate columns** if JSON keys don't match sheet headers exactly (whitespace, encoding differences). Always use a Code node before the Sheets node to format JSON keys matching headers precisely.
- **`defineBelow` mode** requires a full `schema` array with `id`, `displayName`, `type`, and boolean flags alongside the `value` object. Missing schema causes "Could not get parameter" errors.
- **"Column names were updated after the node's setup"** error means headers have trailing spaces or were modified. Re-type headers in the sheet to remove hidden characters.
- **Update operation (v4.5)** uses `matchingColumns` array in the `columns` parameter, not the old `lookupColumn`/`lookupValue` pattern.
- **Update returns empty output** on successful write. Downstream nodes receive zero items and do not execute. Set `"alwaysOutputData": true` on any Update node whose output feeds the next step. Example:
  ```json
  {
    "name": "Update Sheet Row",
    "type": "n8n-nodes-base.googleSheets",
    "typeVersion": 4.5,
    "alwaysOutputData": true,
    "parameters": { "operation": "update", ... }
  }
  ```
- **Filtered read unreliability** — `filtersUI` with `lookupColumn`/`lookupValue` sometimes silently returns zero rows even when the row exists. Reproduced with `sheetName.mode='name' value='Sheet1'`. When this happens, switch to a direct HTTP Request to the Sheets API and filter client-side:
  ```json
  {
    "name": "Read Intake Row",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "parameters": {
      "method": "GET",
      "url": "https://sheets.googleapis.com/v4/spreadsheets/<sheetId>/values/Sheet1",
      "authentication": "predefinedCredentialType",
      "nodeCredentialType": "googleSheetsOAuth2Api"
    },
    "credentials": { "googleSheetsOAuth2Api": { "id": "<cred>", "name": "Google Sheets" } }
  }
  ```
  Then in a Code node downstream: `var headers = $json.values[0]; var rows = $json.values.slice(1).map(r => Object.fromEntries(headers.map((h,i)=>[h,r[i]])));`
- **sheetName mode mismatch across sheets** — Employee Directory (`16iyRqjWoeeXLrrcyP6EOGWL8JKutd-rMBuDzvkNtK38`) requires `{mode: 'id', value: 'gid=0'}`. Most other sheets work with `{mode: 'name', value: 'Sheet1'}`. If one mode fails with "Sheet with name X not found", try the other before blaming anything else.
- **Best practice**: Use a Code node to format data with exact column header keys, then use `autoMapInputData` mode.

### Google Drive Known Issues

- **v3 download operation calls the export API**, not `files.get`. This causes `"Export only supports Docs Editors files"` errors for uploaded binary files (PDFs, images).
- **Workaround**: Don't use the Google Drive download node for binary files. Serve templates via a webhook "template server" pattern (base64-embedded in a Code node), or use an HTTP Request node with `?alt=media&supportsAllDrives=true`.
- **Shared drives** require `supportsAllDrives=true` parameter and `driveId` in the options object. Without these, shared drive files return 403.

### Gmail (`n8n-nodes-base.gmail`) — v2.1
**Canonical PSD-branded config.** Always include `options.appendAttribution: false`. Never set `options.senderName` unless a Google Workspace send-as alias is configured on the credentialed account (otherwise Gmail accepts the message with a SENT label but silently drops delivery).

```json
{
  "name": "Send Notification",
  "type": "n8n-nodes-base.gmail",
  "typeVersion": 2.1,
  "position": [750, 300],
  "parameters": {
    "sendTo": "={{ $json.recipients }}",
    "subject": "={{ $json.subject }}",
    "emailType": "html",
    "message": "={{ $json.emailHtml }}",
    "options": { "appendAttribution": false }
  },
  "credentials": {
    "gmailOAuth2": { "id": "cred-id", "name": "PSD Gmail" }
  }
}
```

**Multiple recipients:** `sendTo` accepts a comma-separated string (e.g. `"a@x.com, b@x.com"`). No `cc`/`bcc` field on v2.1 — all recipients go in `sendTo`.

### HTTP Request — Documenso envelope create (multipart)
Canonical shape for creating a Documenso envelope from n8n. The `type: 'DOCUMENT'` field in the payload is REQUIRED; omitting it causes n8n to report `ECONNREFUSED` (n8n misreports Documenso's 400 validation errors with multipart-form-data as TCP connection refused).

```json
{
  "name": "Create Documenso Envelope",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "parameters": {
    "method": "POST",
    "url": "=https://<your-documenso-host>/api/v2/envelope/create",
    "sendHeaders": true,
    "headerParameters": { "parameters": [
      { "name": "Authorization", "value": "=api_xxxxxxxxxxxxxxx" }
    ]},
    "sendBody": true,
    "contentType": "multipart-form-data",
    "bodyParameters": { "parameters": [
      { "name": "payload", "value": "={{ $json.payload }}" },
      { "parameterType": "formBinaryData", "name": "files", "inputDataFieldName": "data" }
    ]},
    "options": {}
  }
}
```

Payload shape built by the upstream Code node:
```js
var payload = {
  type: 'DOCUMENT',  // REQUIRED — omitting this causes 400 masked as ECONNREFUSED
  title: envelopeTitle,
  recipients: [
    { email: counselorEmail, name: counselorName, role: 'SIGNER', signingOrder: 1, fields: prefilled.concat(sigFields) },
    { email: 'cc@psd401.net', name: 'CC Name', role: 'CC', signingOrder: 2, fields: [] }
  ],
  meta: {
    subject: envelopeTitle,
    message: '...',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/dd/yyyy',
    distributionMethod: 'EMAIL',
    signingOrder: 'SEQUENTIAL',
    typedSignatureEnabled: true,
    drawSignatureEnabled: true
  }
};
return [{ json: { payload: JSON.stringify(payload) }, binary: $input.first().binary }];
```

### HTTP Request — Documenso envelope distribute (raw JSON)
```json
{
  "name": "Distribute Envelope",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "parameters": {
    "method": "POST",
    "url": "https://<your-documenso-host>/api/v2/envelope/distribute",
    "sendHeaders": true,
    "headerParameters": { "parameters": [
      { "name": "Authorization", "value": "api_xxxxxxxxxxxxxxx" },
      { "name": "Content-Type", "value": "application/json" }
    ]},
    "sendBody": true,
    "contentType": "raw",
    "rawContentType": "application/json",
    "body": "={\"envelopeId\":\"{{ $json.id }}\"}",
    "options": {}
  }
}
```

The distribute endpoint is `/api/v2/envelope/distribute` (not `/envelope/{id}/distribute` — that path returns 404).

## Response Nodes

### Respond to Webhook (`n8n-nodes-base.respondToWebhook`)
Send a response back to the webhook caller.

```json
{
  "name": "Return Success",
  "type": "n8n-nodes-base.respondToWebhook",
  "typeVersion": 1.1,
  "position": [750, 300],
  "parameters": {
    "respondWith": "json",
    "responseBody": "={{ { success: true, id: $json.id } }}"
  }
}
```

## Error Handling

### Error Trigger (`n8n-nodes-base.errorTrigger`)
Fires when another workflow fails. Set as the instance error workflow in Settings.

### Stop and Error (`n8n-nodes-base.stopAndError`)
Explicitly fail the workflow with a custom message.

```json
{
  "name": "Fail - Missing Data",
  "type": "n8n-nodes-base.stopAndError",
  "typeVersion": 1,
  "position": [750, 400],
  "parameters": {
    "errorMessage": "Required field 'email' is missing from input data"
  }
}
```

## n8n Expression Syntax

- Access incoming data: `{{ $json.fieldName }}`
- Access specific node output: `{{ $('Node Name').item.json.field }}`
- Current timestamp: `{{ $now.toISO() }}`
- Environment variables: `{{ $env.VARIABLE_NAME }}`
- Previous node data: `{{ $input.first().json.field }}`
- All items: `{{ $input.all() }}`
