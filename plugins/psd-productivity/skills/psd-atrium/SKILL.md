---
name: psd-atrium
description: "Publish and manage content in Atrium — PSD AI Studio's collaborative content workspace. Create native Atrium documents (markdown) and interactive HTML/JSX artifacts, embed images, edit, create and organize nested district/private collections, move content between collections, set visibility, and publish to the internal intranet reader. Artifacts fully support real HTML, CSS, and JavaScript including <script> and <style>. Use when: publishing a doc/report/spec into Atrium, organizing Atrium sections or private collections, turning an HTML artifact into a shareable Atrium page, finding or reading existing Atrium content, or publishing/unpublishing internally. Triggers on: atrium, publish to atrium, ai studio content, atrium doc, atrium artifact, atrium collection, subcollection, publish internally, intranet reader, psd401.ai content."
argument-hint: "[command] [args...] — e.g. 'status', 'collections --shape tree', 'create-collection --name \"X\" --scope private', 'move-content --id <id> --collection <id>', 'create-document --title \"X\" --markdown-file doc.md', 'publish --id <id>'"
model: claude-opus-5
effort: high
extended-thinking: true
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
paths:
  - scripts/
---

# psd-atrium

**Atrium** is AI Studio's collaborative content workspace at `aistudio.psd401.ai`.
Staff author **documents** (markdown) and interactive **artifacts** (HTML/CSS/JS or
JSX), organize them into collections, control who can view them, and **publish**
them to the internal "intranet" reader.

This skill gives you version-based read/write access over Atrium's REST API using
an AI Studio API key.

## Configuration

| Setting | Source | Default |
|---|---|---|
| `ATRIUM_API_KEY` | required secret | — |
| `ATRIUM_HOST` | optional secret | `aistudio.psd401.ai` |

**Getting a key:** AI Studio → **Settings → API Keys** → create a key. The raw key
is shown **once**. It needs these scopes:

- `content:read` · `content:create` · `content:update` · `content:publish_internal`

`content:publish_public` is deliberately withheld from staff/admin defaults — a
public publish returns a queued-for-approval result instead (see below).

Store it per [SECRETS-SETUP.md](../../SECRETS-SETUP.md) (`export ATRIUM_API_KEY=…`
in your shell profile, or the Geoffrey `.env`).

Verify setup before anything else:

```bash
bun scripts/run.js status
```

## Command reference

All commands: `bun scripts/run.js <subcommand> [flags]` from this skill directory.

### Setup & discovery

| Command | Purpose |
|---|---|
| `status` | Verify the key; show host + how many collections you can create into |
| `collections` | List collections; only `selectableForCreate: true` may be used as `--collection` |

Use `collections --shape tree` when hierarchy or parentage matters.

### Collection management

```bash
# District/admin hierarchy
bun scripts/run.js create-collection --name "Business Office" --scope district \
  --parent <parent-collection-uuid> --position 10 --visibility internal

# Owner-bound private hierarchy (available to Atrium authors)
bun scripts/run.js create-collection --name "My Research" --scope private

bun scripts/run.js update-collection --id <collection-uuid> \
  --parent <new-parent-uuid> --position 20

# Pin a document as a section's landing page
bun scripts/run.js update-collection --id <collection-uuid> \
  --landing-object <object-uuid>

# Move a document/artifact; use `none` to remove it from all collections
bun scripts/run.js move-content --id <object-id-or-slug> \
  --collection <collection-slug-or-uuid>
```

Collection create/update honors the key owner's authority. District hierarchy
changes require an administrator; every Atrium author may manage their own
`private` hierarchy. `--parent` on collection commands requires a UUID. Use
comma-separated `access:kind:value` entries for collection grants, for example
`view:role:staff,create:group:curriculum-leads@psd401.net`.

### Read

```bash
# Find content you can view (permission-filtered). All filters optional.
bun scripts/run.js find --kind document --query "field trip" --status published

# Read one object + its last saved version's metadata.
bun scripts/run.js read --id <uuid-or-slug>

# Read a DOCUMENT's committed body TEXT. This is the one command that returns it.
bun scripts/run.js read-source --id <uuid-or-slug>
```

`find` filters: `--kind document|artifact`, `--collection <slug|id>`, `--tag <t>`,
`--status draft|published|archived`, `--query <title text>` (case-insensitive).

### Create — starts **private + draft**

```bash
bun scripts/run.js create-document --title "Sample" --markdown-file /tmp/doc.md \
  [--collection <slug|id>] [--tags a,b]

bun scripts/run.js create-artifact --title "Chart" --code-file /tmp/page.html \
  [--body-format html|jsx] [--collection <slug|id>] [--tags a,b]
```

Optional on both: `--visibility private|group|internal|public` and
`--grants role:staff,building:GHS`.

### Edit — creates a new version

```bash
bun scripts/run.js edit --id <id> --body-file /tmp/new.md            # replace (default)
bun scripts/run.js edit --id <id> --body "extra para" --mode append  # append to saved body
```

`--mode append` only works when the current body comes back inline (small
content). For a large or externally-stored body, use `read-source` to get the
current text, then `--mode replace` with the full new text.

### Images

An image belongs to **one object**. Order matters — the object must exist first,
and the asset must be `ready` before a version may reference it.

```bash
# 1. create the document   2. attach the image (reserve + upload + complete)
bun scripts/run.js upload-asset --id <objectId> --file /tmp/panel.png --alt "Printer control panel"
# 3. put the returned `directive` on its OWN LINE in the body, then:
bun scripts/run.js edit --id <objectId> --body-file /tmp/body-with-directive.md

bun scripts/run.js list-assets --id <objectId>
bun scripts/run.js get-asset --asset-id <assetId> --out /tmp/copy.png
```

- **PNG, JPEG, WebP only**, 20 MiB max. Type is detected from **magic bytes**, not
  the filename — renaming a PDF to `.png` is refused locally.
- **Assets do not cross objects.** To reuse an image, `get-asset` it from the
  source and `upload-asset` it to the target.
- Always pass `--alt`. Without it the alt text becomes the filename, which is
  useless to a screen reader.

### Publish / unpublish / visibility / archive

```bash
bun scripts/run.js publish --id <id> --destination intranet    # default destination
bun scripts/run.js unpublish --id <id> --destination intranet
bun scripts/run.js set-visibility --id <id> --level internal
bun scripts/run.js archive --id <id>                           # soft, reversible
```

There is **no delete command** — this skill cannot hard-delete Atrium content.
Use `archive` (reversible; also takes any live publication offline).

## Rules

1. **Documents are markdown; artifacts are HTML/JSX.** The server enforces this —
   a document rejects `html`/`jsx` and an artifact rejects `markdown`. Pick `kind`
   by what the content *is*: prose/report → `create-document`; a self-contained
   interactive page → `create-artifact`.
2. **Pass large bodies through a FILE flag, never inline.** `--markdown-file`,
   `--body-file`, `--code-file`. One argv value is capped at 128 KiB
   (`MAX_ARG_STRLEN`); an oversized argument fails the spawn with `E2BIG` before
   the script starts — far below the 5 MB the API accepts. Any real HTML artifact
   will exceed it. Passing both the inline and file form is an error, not a
   silent preference.
3. **Artifact code fully supports `<script>`, `<style>`, and inline `style="…"`.**
   Pass raw code. The skill base64-encodes every write body automatically so it is
   opaque to AI Studio's edge WAF (which would otherwise 403 a raw markup body
   with no explanation) and the server decodes it before storage. **Never** strip
   tags or fall back to legacy attributes like `bgcolor`/`width` to work around a
   403 — that is the WAF, and encoding already handles it.
4. **New content is private + draft.** Creating neither publishes nor shares it.
   `publish` and `set-visibility` are separate, explicit steps.
5. **Relay `approvalRequired` verbatim.** A queued publish or visibility widen is a
   SUCCESS (exit 0), not a failure — but the content is **not live**. Say it is
   pending approval; never report it as public.
6. **Trust the returned `visibilityLevel` over what you requested.** An
   unauthorized public create is silently created PRIVATE with a widen queued
   server-side. The skill diffs requested vs. returned and adds a
   `visibilityNote` — but if you create into a collection whose *default*
   visibility is public and pass no `--visibility`, the same downgrade happens
   with nothing to diff against.
7. **Version-based only.** Reads return the last saved version; writes create new
   versions. The live collaborative editor rail (real-time keystrokes, comments,
   track-changes suggestions) is session-only and **not** reachable here. A
   document open in the editor may be **ahead** of `read-source` until someone
   snapshots a version — say so rather than presenting it as the current text.
8. **A document's body text is not returned by `read`** — it lives in the
   collaborative store. Use `read-source`.
9. **Atrium is real and live.** Never tell a user the district has no content
   workspace — run `find` before answering "what's in Atrium?".
10. **Content is attributed to the key's owner** and gated by that user's
    permissions. `sk-` writes are not guardrail/PII-screened, so keep what you
    write appropriate.

## Publishing an HTML artifact from `/html-artifact`

`/html-artifact` produces a self-contained single-page HTML file. To put it in
Atrium:

```bash
bun scripts/run.js create-artifact --title "Q4 Enrollment Review" --code-file ~/Downloads/q4-review.html
bun scripts/run.js publish --id <id-from-previous-step> --destination intranet
```

Use `--code-file` (rule 2). Artifacts render only inside a cross-origin sandboxed
iframe with `connect-src 'none'` — a published artifact **cannot make network
calls**, so anything relying on `fetch`/XHR at runtime will silently do nothing.
Inline the data instead.

## Output contract

- **Success (exit 0):** JSON result on stdout. Create/read/publish results carry
  `readerUrl` and `editorUrl` when available.
- **approval_required (exit 0):** `approvalRequired: true` plus a `message` — relay
  it verbatim; the content is queued, not live.
- **Errors:** structured JSON with a non-zero exit.

| Code | Meaning | Response |
|---|---|---|
| 0 | Success (incl. approval_required) | Use the result |
| 1 | Config / usage error (incl. missing `ATRIUM_API_KEY`) | Fix the invocation or the key; do not retry blindly |
| 2 | Internal / unexpected | Report it |
| 11 | Unauthorized — key rejected, or missing the scope | Tell the user which scope is missing; do not retry |
| 12 | Upstream API error (404/409/422/5xx) or network | Surface the error verbatim |
| 14 | Rate-limited (60 req/min per key) | Wait, retry once |

## Key technical warnings

- **The WAF 403 is invisible.** A raw body containing `<script>`/`<style>` returns
  a bare 403 with no detail — it reads like an auth failure. Every write body is
  base64-encoded with `codeEncoding: "base64"` to prevent this. Do not "fix" that
  away.
- **Asset digests are base64url, not hex and not padded base64.** The server
  validates `/^[A-Za-z0-9_-]{43}$/` and re-derives the digest from the uploaded
  bytes.
- **S3 checksum header quirk:** when the presigner hoists `x-amz-checksum-sha256`
  into the query string without listing it in `X-Amz-SignedHeaders`, sending it as
  a header causes `AccessDenied`. The skill reconciles this and fails closed on a
  value mismatch.
- **Idempotency keys are per-write.** Reusing one with a different body is a
  `409 IDEMPOTENCY_KEY_REUSED`; the skill generates a fresh key per mutation.
- **Rate limit is 60 req/min per key.** The client paces locally at ~1 req/s so a
  multi-image upload self-throttles.

## Tests

```bash
bun test plugins/psd-productivity/skills/psd-atrium/
```

Covers the transforms where a silent mistake surfaces as a confusing server-side
rejection: the WAF base64 wrapper, the base64url digest, magic-byte type
detection, and the S3 checksum-header reconciliation.
