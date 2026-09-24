# Documenso Self-Hosting Operations Guide

Operational knowledge for the PSD self-hosted Documenso instance at `<your-documenso-host>`. Captures the gotchas around teams, webhooks, billing limits, email delivery, and API key rotation that have bitten real workflows.

---

## Billing-enabled mode applies free-plan limits

When `NEXT_PUBLIC_FEATURE_BILLING_ENABLED=true` is set on the Documenso server, the instance treats the user as a Free Plan cloud user and enforces a **5 documents/month** cap per user. Symptom: `LIMIT_EXCEEDED` error from `POST /envelope/create` after 5 envelopes in a calendar month.

### Two ways to remove the cap

**Option A — disable billing flag (recommended for fully self-hosted, single-tenant):**

1. SSH to the Documenso server
2. Edit `.env` (or compose env block): `NEXT_PUBLIC_FEATURE_BILLING_ENABLED=false`
3. Rebuild the container — the flag is `NEXT_PUBLIC_*` so it's baked into the client bundle at build time, env reload alone does not propagate it
4. `docker compose up -d --force-recreate documenso`

**Option B — use Teams (recommended when billing-enabled mode must stay on):**

1. In the Documenso UI, create a Team
2. Issue an API key from the team's settings (NOT from the personal user account)
3. Use that team-scoped API key in n8n workflows

Team-scoped API keys bypass the per-user free-plan cap. Personal-account keys remain limited.

### Code reference

The limit check lives in `packages/ee/server-only/limits/server.ts` upstream:

```typescript
if (!IS_BILLING_ENABLED()) {
  return { quota: SELFHOSTED_PLAN_LIMITS, ... };  // unlimited
}
// ...falls through to FREE_PLAN_LIMITS (5 docs/month)
```

And `IS_BILLING_ENABLED` resolves to `env('NEXT_PUBLIC_FEATURE_BILLING_ENABLED') === 'true'`.

---

## API keys are team-scoped

A key issued from a personal user account has that user's quota and visibility. A key issued from a Team has the team's quota and only sees envelopes within the team.

**When rotating keys:**
- Verify the source context (personal vs team) — they are not equivalent
- A new team key cannot see envelopes that were created with the old personal key
- Webhooks fired by old-context envelopes won't include the new context

**Key rotation procedure** (see `n8n-manager/scripts/rotate_documenso_key.js` if implemented):
1. Issue new key in Documenso UI (team settings)
2. Find all n8n workflows that reference the old key (grep for `api_` prefix in workflow JSON)
3. For each workflow: `get_workflow.js → string-replace key → update_workflow.js`
4. Re-snapshot all updated workflows to the repo
5. Test with a probe call before relying on production traffic

---

## Webhooks are per-team, UI-only

Documenso has no API to list, create, or delete webhook subscriptions. They are managed in the UI at `Settings → Webhooks` (per-team).

**When creating a new team OR issuing a new team key:**
The webhook subscription does NOT carry over from the old context. The router at `https://<your-n8n-host>/webhook/documenso-completed` must be re-added in the new team's webhook settings:

| Field | Value |
|-------|-------|
| URL | `https://<your-n8n-host>/webhook/documenso-completed` |
| Event | `DOCUMENT_COMPLETED` (older versions) or `ENVELOPE_COMPLETED` (newer) |
| Active | yes |
| Secret | optional but recommended; if used, n8n must validate signature |

**Symptom of a missing webhook:** envelopes complete (status → COMPLETED in Documenso UI), signed PDFs exist on the server, but no n8n router execution fires. Drive folder stays empty, completion email never sends, sheet row never updates. Silent.

### Diagnostic for "router never fires"

```bash
# Are envelopes actually reaching COMPLETED state?
curl -s "https://$DOCUMENSO_HOST/api/v2/envelope?status=COMPLETED" \
  -H "Authorization: api_xxx" | jq '.data[] | {id, title, completedAt}'

# Has the router seen any executions in the last 24 hours?
# (via n8n list_executions.js — workflowId is the router's ID)
bun list_executions.js '{"workflowId":"<router-id>","limit":10}'

# If completed envelopes exist but router has zero recent executions,
# the webhook subscription is missing or pointing at the wrong URL.
```

---

## Email delivery depends on Documenso SMTP

Documenso's `distributionMethod: 'EMAIL'` relies on the instance's SMTP config. If SMTP is broken (bad credentials, blocked port, expired Mailgun account), envelopes still distribute and reach `PENDING` with each recipient's `sendStatus: SENT` in the API — but no signing emails actually reach inboxes.

### SMTP environment variables

| Var | Purpose |
|-----|---------|
| `NEXT_PRIVATE_SMTP_TRANSPORT` | `smtp` / `mailchannels` / `resend` |
| `NEXT_PRIVATE_SMTP_HOST` | Server hostname |
| `NEXT_PRIVATE_SMTP_PORT` | Usually 587 or 465 |
| `NEXT_PRIVATE_SMTP_USERNAME` | Auth user |
| `NEXT_PRIVATE_SMTP_PASSWORD` | Auth pass |
| `NEXT_PRIVATE_SMTP_FROM_NAME` | Display name |
| `NEXT_PRIVATE_SMTP_FROM_ADDRESS` | From: address |

### Bypass when email is broken

Each recipient has a `token` in the envelope GET response. Signing URL:

```
https://{DOCUMENSO_HOST}/sign/{recipient.token}
```

Send this URL via another channel (Slack, n8n Gmail node, etc.) and the signer can complete without the Documenso-generated email.

### Diagnostic for "envelope distributed but no email"

```bash
# Check what Documenso thinks happened
curl -s "https://$DOCUMENSO_HOST/api/v2/envelope/{id}" -H "Authorization: api_xxx" \
  | jq '.recipients[] | {role, email, sendStatus, signingStatus, token}'

# All sendStatus: SENT but recipients aren't getting emails → SMTP broken.
# Check Documenso server logs for SMTP errors.
docker logs documenso 2>&1 | grep -iE 'smtp|email|mail' | tail -50
```

---

## Recipient role behavior

| Role | Receives email | Blocks completion | Auto-marked SIGNED on create |
|------|---------------|-------------------|------------------------------|
| SIGNER | Yes (signing link) | Yes | No |
| APPROVER | Yes (approval link) | Yes | No |
| CC | Yes (final completed copy) | No | Yes |
| VIEWER | Yes (view link) | No | Yes |
| ASSISTANT | Yes (fill link) | No | Yes |

**CC recipients are auto-SIGNED on envelope creation.** Their `signingStatus` is `SIGNED` even before any signer has done anything. They get a copy of the completed PDF when the envelope reaches COMPLETED.

When you want a recipient to receive a styled n8n-built email instead of Documenso's default completion email, **remove them from `recipients` entirely** and have your completion handler send the branded email separately.

---

## Common error → real cause cheatsheet

| Error message | Real cause | Fix |
|---------------|-----------|-----|
| `ECONNREFUSED` from n8n on `/envelope/create` | Documenso 400 (validation) masked by n8n multipart handling | Replay payload via curl; usually missing `type: 'DOCUMENT'` |
| `LIMIT_EXCEEDED` | Free-plan billing cap on personal user account | Use a team-scoped API key OR disable `NEXT_PUBLIC_FEATURE_BILLING_ENABLED` |
| `Resource not found` (404) on distribute | Wrong endpoint shape | Use `POST /envelope/distribute` with body `{envelopeId}`, not path-based `/envelope/{id}/distribute` |
| `Workflow does not exist` (in n8n executeWorkflow node) | n8n issue, not Documenso | Bump executeWorkflow node `typeVersion` to 1.2 |
| Envelope completes but n8n doesn't fire | Webhook subscription missing for the team | Re-add webhook in Documenso UI under team settings |
| Envelope distributed but signers don't get email | Documenso SMTP broken | Send signing URL `https://{host}/sign/{token}` directly via another channel |
| Sheet row missing for completed envelope | envelope_id form mismatch (numeric vs string) | Canonicalize to string `envelope_xxx` in both the intake write AND the handler match |
