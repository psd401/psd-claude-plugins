# Documenso ↔ n8n Workflow Patterns (PSD)

Canonical patterns for the PSD DocuSign → Documenso migration. Every new signing workflow follows one of these shapes. Cross-references `documenso-manager` skill for API specifics.

---

## 1. Submission workflow (form → Documenso envelope)

The standard "user fills a form, system creates a Documenso envelope for them to sign" pattern.

### Node chain

```
Form Trigger (page 1 — email or login)
  → Lookup In Directory (Google Sheets read, gid=0 mode)
  → Build Page 2 Form Definition (Code → returns jsonOutput string)
  → Form (page 2 — defineForm: "json")
  → Read Template PDF (HTTP Request to template-server webhook)
  → Build Documenso Payload (Code — includes type:'DOCUMENT')
  → Create Documenso Envelope (HTTP multipart)
  → Distribute Envelope (HTTP raw JSON)
  → Prep Sheet Row (Code — sets envelope_id to STRING form)
  → Log Intake to Sheet (Sheets append)
```

### Required configurations (each step)

**Form Trigger (page 1):**
- First field MUST be the PSD logo iframe HTML (`<iframe src="https://<your-n8n-host>/webhook/psd-logo">`)
- Set `options.customCss` with the standard PSD CSS (--container-width: 900px, Pacific colors, etc.)
- Set `options.appendAttribution: false`
- After ANY change to `customCss`, deactivate + reactivate the workflow to bust the cached form HTML

**Form (page 2 — dynamic):**
- `defineForm: "json"`, `jsonOutput: "={{ $json.intakeFormDefinition }}"`
- First field of the JSON definition MUST be the same logo HTML block
- Same `options.customCss`, `appendAttribution: false`
- For multi-select-like UX, prefer multiple Yes/No dropdowns over checkbox_group (n8n form HTML strips inline classes anyway)

**Build Documenso Payload (Code):**
```js
var payload = {
  type: 'DOCUMENT',  // REQUIRED — without this, n8n reports ECONNREFUSED instead of the real 400
  title: '<doc-prefix> - <last-name> (<bldg>) - <YYYY-MM-DD>',  // prefix matches router detection
  recipients: [
    { email: signerEmail, name: signerName, role: 'SIGNER', signingOrder: 1, fields: prefilledFields.concat(sigFields) }
    // CC recipients omitted — completion handler sends branded email instead of letting Documenso send the default
  ],
  meta: {
    subject: '...',
    message: '...',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/dd/yyyy',
    distributionMethod: 'EMAIL',
    signingOrder: 'SEQUENTIAL',
    typedSignatureEnabled: true,
    drawSignatureEnabled: true
  }
};
return [{ json: { payload: JSON.stringify(payload), envelopeTitle: payload.title, rowFlat: rowFlat }, binary: $input.first().binary }];
```

**Create Documenso Envelope (HTTP):**
- See `n8n-node-catalog.md` → "HTTP Request — Documenso envelope create (multipart)"
- The payload JSON must be a `multipart-form-data` field named `payload` (NOT JSON body)
- The PDF binary is a `formBinaryData` field named `files`

**Distribute Envelope (HTTP):**
- See `n8n-node-catalog.md` → "HTTP Request — Documenso envelope distribute (raw JSON)"
- Endpoint is `/api/v2/envelope/distribute` (NOT path-based)
- Body: `{"envelopeId":"{{ $json.id }}"}` — the `id` from Create's response is already in string form

**Prep Sheet Row (Code):**
```js
var envelope = $input.first().json;  // Distribute response, includes id as envelope_xxx
var rowFlat = $('Build Documenso Payload').first().json.rowFlat;
rowFlat.envelope_id = envelope.id || '';  // STRING form — canonical
return [{ json: rowFlat }];
```

**Log Intake to Sheet (Google Sheets append):**
- `mappingMode: 'autoMapInputData'` — JSON keys must match sheet headers EXACTLY (no extra whitespace)
- Tab name: try `{mode: 'name', value: 'Sheet1'}` first; if "not found", try `{mode: 'id', value: 'gid=0'}`

### Why no CC recipients on the envelope

If you add `role: 'CC'` recipients to the Documenso payload, those people receive Documenso's default completion email (raw, unbranded, with the signed PDF attached). For PSD-quality UX, **send a branded HTML email from the completion handler instead** — see Pattern 2 below.

---

## 2. Completion handler (Documenso webhook → Drive + Sheet + Email)

Triggered by the document completion router (`Documenso - Document Completion Router`) which routes by envelope title prefix to per-document-type handlers.

### Node chain

```
Execute Workflow Trigger (typeVersion 1)
  → Extract Envelope Data (Code — from webhook payload)
  → Find Envelope String ID (HTTP search by title)
  → Extract String ID (Code — resolve numeric → envelope_xxx string)
  → Get Envelope Items (HTTP)
  → Build Download URL (Code)
  → Download Signed PDF (HTTP file response)
  → Upload to Drive (Google Drive)
  → Prep Sheet Update (Code — uses STRING envelope_id)
  → Update Sheet Row (Sheets — alwaysOutputData: true!)
  → Read Full Row (HTTP to Sheets API — bypasses filtersUI bug)
  → Build Notification Email (Code — branded HTML, finds row client-side)
  → Send Notification (Gmail — appendAttribution: false, no senderName)
```

### Required configurations

**Execute Workflow Trigger:** typeVersion `1` is correct here (this is the trigger node, not the executor in the parent). The PARENT'S `executeWorkflow` node must be `typeVersion: 1.2` to call this.

**Extract Envelope Data (Code):** the webhook payload's `id` is numeric. Save it but don't try to use it for downstream API calls. Pass `title` to the next step.

**Find Envelope String ID (HTTP):**
```
GET https://<your-documenso-host>/api/v2/envelope?query={{ $json.title }}
Authorization: api_xxx
```
Returns up to N envelopes matching the title. Filter for `status === 'COMPLETED'` in the next Code node.

**Extract String ID (Code):**
```js
var search = $input.first().json;
var prev = $('Extract Envelope Data').first().json;
var envelopes = search.data || [];
var env = envelopes.find(e => e.status === 'COMPLETED') || envelopes[0];
if (!env) throw new Error('No envelope for: ' + prev.title);
return [{ json: { envelopeStringId: env.id, /* ... */ } }];
```

**Update Sheet Row (Google Sheets):**
- `operation: 'update'`, `matchingColumns: ['envelope_id']`
- **Set `alwaysOutputData: true`** — without it, the chain dies after this node because Update returns zero items
- The `envelope_id` column value MUST be the STRING form (matches what intake wrote)

**Read Full Row (HTTP — NOT Google Sheets node):**
```json
{
  "method": "GET",
  "url": "https://sheets.googleapis.com/v4/spreadsheets/<id>/values/Sheet1",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "googleSheetsOAuth2Api"
}
```
Returns `{values: [[headers], [row1], [row2], ...]}`. Filter client-side in the next Code node — the n8n Sheets node's filtered read is unreliable (sometimes returns 0 rows for valid filters).

**Build Notification Email (Code):**
```js
var envelopeId = $('Prep Sheet Update').first().json.envelope_id;
var resp = $input.first().json;
var values = (resp && resp.values) || [];
var headers = values[0] || [];
var row = { envelope_id: envelopeId, /* fallback empties */ };
for (var i = 1; i < values.length; i++) {
  var rec = {};
  for (var c = 0; c < headers.length; c++) rec[headers[c]] = values[i][c];
  if (String(rec.envelope_id) === String(envelopeId)) { row = rec; break; }
}
// ...build branded HTML using row's fields...
return [{ json: { emailHtml, subject, recipients: 'a@x.com, b@x.com' } }];
```

**Send Notification (Gmail v2.1):**
- `options.appendAttribution: false` (mandatory — default is `true` and leaks "Automated with n8n" footer)
- Do NOT set `options.senderName` unless a Workspace alias is configured (silent delivery failure)
- `sendTo` accepts comma-separated string for multi-recipient

---

## 3. Document Completion Router

Single shared workflow that receives every Documenso `DOCUMENT_COMPLETED` webhook and dispatches to the appropriate per-type handler based on envelope title prefix.

### Node chain

```
Documenso Webhook (path: documenso-completed)
  → Extract Document Info (Code — title prefix → documentType)
  → Route by Document Type (Switch v3.2)
  → [output 0] Handle Evaluation     → Eval Completion Handler
  → [output 1] Handle File Only      → File-Only Completion Handler
  → [output 2] Handle Transfer       → Transfer Completion Handler
  → [output 3] Handle MV Intake      → MV Completion Handler
  → [output N] (fallback)            → Log Unknown Document
```

### Required configurations

**Switch v3.2:** see `n8n-node-catalog.md` for the full required rule structure. Without `combinator: 'and'` + `operator.name` + `options.typeValidation`, the switch silently routes everything to output 0.

**Switch fallback:** `options.fallbackOutput: 'extra'` adds a final output for unmatched inputs. Wire to a Log Unknown Document node so unknowns are visible in execution history.

**executeWorkflow nodes (Handle ...):** every one MUST be `typeVersion: 1.2`. Version 1.0 throws `Workflow does not exist` at runtime even when the target is active.

**Activation order:** every sub-workflow (handler) must be active BEFORE the router is saved with the reference. Otherwise deploy fails with `Cannot publish workflow: Node X references workflow Y which is not published`.

---

## 4. Title prefix routing convention

The router detects document type from the envelope title's prefix. Each new document type adds a clause to `Extract Document Info` and a switch rule + handler.

| Title prefix | documentType | Handler |
|--------------|--------------|---------|
| `Performance Evaluation` | `evaluation` | Eval Completion Handler |
| `Central Leadership Evaluation` | `evaluation` | Eval Completion Handler |
| `Counselor-ESA Evaluation` | `file-only` | File-Only Completion Handler |
| `TSD Certificated Timesheet` | `file-only` | File-Only Completion Handler |
| `COI Disclosure` | `file-only` | File-Only Completion Handler |
| `Within District Transfer` | `transfer` | Transfer Completion Handler |
| `Non-Resident Transfer` | `transfer` | Transfer Completion Handler |
| `MV Intake` | `mv-intake` | MV Completion Handler |
| _(everything else)_ | `unknown` | Log Unknown Document |

When adding a new document type:
1. Add the prefix → documentType branch in router's `Extract Document Info` Code node
2. Add a Switch rule with the new `documentType` value (full v3.2 structure!)
3. Build the new completion handler workflow following Pattern 2
4. Activate the handler
5. Add a `Handle <Type>` executeWorkflow node (typeVersion 1.2) wired from the new switch output
6. Save the router (deploy will fail if the handler isn't active first)

---

## 5. Self-hosted billing trap

If `LIMIT_EXCEEDED` errors start appearing on `POST /envelope/create` after exactly 5 envelopes/month, the Documenso instance has billing enabled and the API key is scoped to a personal user (free plan).

**Quick fix:** issue a new API key from inside a Documenso Team (UI → team settings) and use the rotation script:

```bash
bun rotate_documenso_key.js api_oldkey api_newteamkey
```

**Permanent fix:** disable `NEXT_PUBLIC_FEATURE_BILLING_ENABLED` on the Documenso server and rebuild.

See `documenso-manager/references/documenso-self-hosting-ops.md` for the full breakdown.

---

## 6. Common debug flow when "nothing happens"

When a user submits a form, signs the envelope, and nothing downstream fires:

1. **Check Documenso UI** — is the envelope at COMPLETED status?
   - No → signing flow is broken (email delivery? signing URL?). Use the recipient's `token` to bypass: `https://<your-documenso-host>/sign/{token}`
   - Yes → continue
2. **Check the router workflow's executions**
   - No execution at the completion timestamp → Documenso webhook subscription is missing for this team. Re-add in UI.
   - Execution exists but errored → see the error
   - Execution exists and succeeded → continue
3. **Check the appropriate handler's executions**
   - No execution → router routed to wrong output (Switch v3.2 rule structure?), OR executeWorkflow node typeVersion is 1.0
   - Execution exists but errored → drill into the failed node
4. **For "not found" data in completion email** → envelope_id form mismatch (numeric vs string) between intake and handler
5. **For ECONNREFUSED on Documenso calls from n8n** when laptop curl works → 1) check probe workflow, 2) replay payload via curl from n8n's host, 3) likely missing `type: 'DOCUMENT'` or other 400 being misreported
