#!/usr/bin/env bun

/**
 * run.js — psd-atrium skill entrypoint.
 *
 * Version-based read/write access to Atrium, AI Studio's collaborative content
 * workspace (markdown DOCUMENTS + interactive HTML/JSX ARTIFACTS, with an
 * intranet publishing flow), over the public REST surface at /api/v1/content
 * using an AI Studio API key.
 *
 * Reads return the last SAVED version; writes create a NEW version. The live
 * collaborative editor rail (real-time Yjs keystrokes, comments, track-changes
 * suggestions) is session-only and NOT reachable here.
 *
 * Exit codes:
 *   0   success (JSON on stdout; includes approval_required outcomes)
 *   1   usage / config error
 *   2   internal / unexpected
 *   11  unauthorized — key rejected, or missing the scope for this operation
 *   12  upstream content-API error (404/409/422/5xx) or network failure
 *   14  rate-limited
 */

'use strict';

const path = require('node:path');
const { readFileSync, writeFileSync } = require('node:fs');

const common = require('./common.js');
const {
  fail,
  emit,
  parseArgs,
  parseList,
  parseGrants,
  restFetch,
  withEncodedBody,
  sha256Base64Url,
  detectImageContentType,
  presignedPutHeaders,
  getClient,
} = common;

const ASSET_PURPOSES = ['document_image', 'capture_step'];
/** Server ceiling for a single asset (20 MiB) — refuse locally rather than burn
 *  a round trip on a guaranteed 400. */
const ASSET_MAX_BYTES = 20 * 1024 * 1024;

const KINDS = ['document', 'artifact'];
const STATUSES = ['draft', 'published', 'archived'];
const LEVELS = ['private', 'group', 'internal', 'public'];
const BODY_FORMATS = ['markdown', 'html', 'jsx'];
const ARTIFACT_FORMATS = ['html', 'jsx'];
const PUBLISH_DESTINATIONS = ['intranet', 'public_web', 'schoology', 'google', 'okf'];
const UNPUBLISH_DESTINATIONS = ['intranet', 'public_web', 'schoology', 'google'];

function usage() {
  process.stdout.write(
    [
      'Usage: bun run.js <subcommand> [...]',
      '',
      'Setup:',
      '  status                          verify the API key and show the host + scopes in use',
      '  collections                     list collections you may create into',
      '',
      'Read (version-based — returns the last SAVED version):',
      '  find [--kind document|artifact] [--collection <slug|id>] [--tag <t>]',
      '       [--status draft|published|archived] [--query <title text>]',
      '  read --id <idOrSlug>',
      "  read-source --id <idOrSlug>     a DOCUMENT's committed body TEXT (`read` never returns it)",
      '  list-assets --id <idOrSlug>',
      '',
      'Images (the canonical way to put a picture in a document):',
      '  upload-asset --id <id> --file <png|jpeg|webp> [--alt <text>] [--filename <name>]',
      '               [--purpose document_image|capture_step]',
      '  get-asset --asset-id <assetId> --out <path>',
      '',
      'Write (creates a new version; content starts PRIVATE + DRAFT):',
      '  create-document --title <t> [--markdown <md> | --markdown-file <path>]',
      '                  [--collection <slug|id>] [--tags a,b,c] [--visibility <level>]',
      '                  [--grants k:v,...] [--summary <s>]',
      '  create-artifact --title <t> (--code <src> | --code-file <path>)',
      '                  [--body-format html|jsx] [--collection <slug|id>] [--tags a,b,c]',
      '                  [--visibility <level>] [--grants k:v,...]',
      '  edit --id <id> (--body <text> | --body-file <path>) [--mode replace|append]',
      '       [--body-format markdown|html|jsx] [--summary <s>]',
      '  archive --id <id>               soft-remove: status -> archived, stays findable',
      '  set-visibility --id <id> --level private|group|internal|public',
      '                 [--grants role:staff,building:GHS]',
      '',
      'Publish (a destination you may not publish directly returns a queued-for-',
      'approval result — relay its message verbatim; it is a SUCCESS, not an error):',
      '  publish --id <id> [--destination intranet|public_web|schoology|google|okf]',
      '  unpublish --id <id> --destination intranet|public_web|schoology|google',
      '',
      'Artifact code (HTML/CSS/JS, including <script> and <style>) is fully',
      'supported and sent base64-encoded automatically — pass raw code, escape',
      'nothing.',
      '',
      'Use --markdown-file / --body-file / --code-file for anything LARGE: a single',
      'argv value is capped at 128 KiB (MAX_ARG_STRLEN) and an oversized argument',
      'fails the spawn with E2BIG before this script starts — far below the 5 MB',
      'the API itself accepts.',
      '',
    ].join('\n')
  );
}

/** Require a string flag; fail (exit 1) with a clear message when absent/boolean. */
function requireStr(args, name, label) {
  const v = args[name];
  if (v === undefined || v === true || v === '') fail(`--${label} is required`);
  return v;
}

/** Validate an optional enum flag; returns the value or undefined. */
function optEnum(args, name, label, allowed) {
  const v = args[name];
  if (v === undefined) return undefined;
  if (v === true) fail(`--${label} requires a value`);
  if (!allowed.includes(v)) fail(`--${label} must be one of: ${allowed.join(', ')}`);
  return v;
}

/** Validate an optional STRING flag. A value-less flag is a usage error, not a
 *  silently dropped value. */
function optStr(args, name, label) {
  const v = args[name];
  if (v === undefined) return undefined;
  if (v === true) fail(`--${label} requires a value`);
  return v;
}

/**
 * Read a body inline (`--markdown`/`--body`/`--code`) or from a file, rejecting
 * the ambiguous combination. The file form is not a convenience — see the E2BIG
 * note in usage(); it is the only way to pass a large document or a real HTML
 * artifact.
 */
function readInlineOrFile(args, inlineKey, inlineLabel, fileKey, fileLabel) {
  const filePath = optStr(args, fileKey, fileLabel);
  if (filePath !== undefined && args[inlineKey] !== undefined) {
    fail(`pass either --${inlineLabel} or --${fileLabel}, not both`);
  }
  if (filePath === undefined) return optStr(args, inlineKey, inlineLabel);
  try {
    return readFileSync(filePath, 'utf8');
  } catch (err) {
    fail(`--${fileLabel} not readable: ${err.message}`);
  }
}

/** Build the { level, grants? } visibility object from --visibility/--grants. */
function buildVisibility(args) {
  const level = optEnum(args, 'visibility', 'visibility', LEVELS);
  if (level === undefined) return undefined;
  const grants = parseGrants(args.grants, 'grants');
  return grants ? { level, grants } : { level };
}

/** Attach the human-facing reader + editor URLs to a create/read result. */
function withLinks(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const client = getClient();
  const links = {};
  if (payload.id) links.editorUrl = client.getEditorUrl(payload.id);
  if (payload.slug) links.readerUrl = client.getUiUrl(payload.slug);
  return { ...payload, ...links };
}

/**
 * Emit a create result, flagging the silent "created as private" downgrade.
 *
 * Unlike publish/set-visibility (which return a real 202 approval signal), an
 * unauthorized PUBLIC create is silently created PRIVATE and a widen request is
 * queued server-side with NO field on the response. Compare requested vs.
 * returned level and synthesize the signal so the agent relays "widen pending",
 * not "public".
 */
function emitCreated(payload, requestedVisibility) {
  const requested = requestedVisibility && requestedVisibility.level;
  const result = withLinks(payload);
  if (
    requested &&
    payload &&
    typeof payload.visibilityLevel === 'string' &&
    payload.visibilityLevel !== requested
  ) {
    emit({
      ...result,
      requestedVisibilityLevel: requested,
      approvalRequired: true,
      visibilityNote:
        `Requested visibility "${requested}" was not applied — the object was created ` +
        `"${payload.visibilityLevel}". A visibility widen you may not perform directly is ` +
        `applied as PRIVATE and queued for admin approval. Tell the user the widen is ` +
        `PENDING APPROVAL — do NOT report the content as public.`,
    });
    return;
  }
  emit(result);
}

// ---------------------------------------------------------------------------
// Setup / discovery
// ---------------------------------------------------------------------------

async function status() {
  const client = getClient();
  const config = client.getConfig();
  // A cheap authenticated read doubles as a credential check: 401/403 exits 11
  // through the shared interpreter before we ever print "ok".
  const { payload } = await restFetch('GET', '/collections', {
    query: { shape: 'flat' },
  });
  const collections = Array.isArray(payload) ? payload : [];
  emit({
    status: 'ok',
    host: config.host,
    apiBase: await client.buildBaseUrl(config),
    collectionsVisible: collections.length,
    collectionsCreatable: collections.filter((c) => c.selectableForCreate).length,
    note: 'API key accepted. Content you create starts private + draft until you publish it.',
  });
}

async function listCollections(args) {
  const { payload } = await restFetch('GET', '/collections', {
    query: { shape: optStr(args, 'shape', 'shape') || 'flat' },
  });
  const collections = Array.isArray(payload) ? payload : [];
  emit({
    collections,
    creatable: collections.filter((c) => c.selectableForCreate).length,
    note: 'Only collections with selectableForCreate: true may be passed as --collection.',
  });
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

async function findObjects(args) {
  const query = {
    kind: optEnum(args, 'kind', 'kind', KINDS),
    status: optEnum(args, 'status', 'status', STATUSES),
    collection: optStr(args, 'collection', 'collection'),
    tag: optStr(args, 'tag', 'tag'),
    query: optStr(args, 'query', 'query'),
  };
  const { payload } = await restFetch('GET', '', { query });
  emit(payload);
}

async function readObject(args) {
  const id = requireStr(args, 'id', 'id');
  const { payload } = await restFetch('GET', `/${encodeURIComponent(id)}`);
  const version = payload && payload.version;
  const body =
    version && typeof version.bodyInline === 'string' ? version.bodyInline : null;

  let note;
  if (!version) {
    note =
      'This object has no saved version yet (created without a body). There is nothing to read back.';
  } else if (body === null) {
    note =
      'Body not returned inline: documents keep their text in the collaborative store, and large artifacts are offloaded to object storage. Use `read-source` for a document body. This shows the last SAVED version metadata only.';
  } else {
    note = 'Shows the last SAVED version body (not the live collaborative editor state).';
  }
  emit({ ...withLinks(payload), body, bodyAvailableInline: body !== null, note });
}

async function readSource(args) {
  // The ONLY way to get a DOCUMENT's body text: `read` returns metadata because
  // the live text lives in the collaborative store; this returns the last
  // COMMITTED source.
  const id = requireStr(args, 'id', 'id');
  const { payload } = await restFetch('GET', `/${encodeURIComponent(id)}/source`);
  emit({
    ...payload,
    note: 'Committed source of the last saved version. A document open in the live editor may be AHEAD of this until someone snapshots a version.',
  });
}

async function listAssets(args) {
  const id = requireStr(args, 'id', 'id');
  const { payload } = await restFetch('GET', `/${encodeURIComponent(id)}/assets`);
  emit(payload);
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

async function uploadAsset(args) {
  // Three round trips: reserve -> PUT bytes straight to presigned S3 -> complete
  // (verifies the checksum, re-decodes the image, strips metadata, flips the
  // asset to `ready`). Only a `ready` asset may be referenced by a version.
  const id = requireStr(args, 'id', 'id');
  const file = requireStr(args, 'file', 'file');
  const alt = optStr(args, 'alt', 'alt') || '';
  const purpose = optEnum(args, 'purpose', 'purpose', ASSET_PURPOSES) || 'document_image';

  let bytes;
  try {
    bytes = readFileSync(file);
  } catch (err) {
    fail(`--file not readable: ${err.message}`);
  }
  if (bytes.length === 0) fail('--file is empty');
  if (bytes.length > ASSET_MAX_BYTES) {
    fail(`--file is ${bytes.length} bytes; Atrium assets are capped at ${ASSET_MAX_BYTES}`);
  }

  const contentType = detectImageContentType(bytes);
  if (!contentType) {
    fail('--file is not a PNG, JPEG, or WebP image (checked by magic bytes, not by filename)');
  }

  const sha256 = sha256Base64Url(bytes);
  const filename = optStr(args, 'filename', 'filename') || path.basename(file);

  const { payload: reserved } = await restFetch(
    'POST',
    `/${encodeURIComponent(id)}/assets`,
    {
      body: { filename, contentType, byteLength: bytes.length, sha256, purpose },
      idempotent: 'asset',
    }
  );

  const upload = reserved && reserved.upload;
  if (!upload || typeof upload.url !== 'string') {
    fail('AI Studio did not return an asset upload URL', 12);
  }

  await common._internals.putPresignedBytes(
    upload.url,
    presignedPutHeaders(upload.url, upload.headers, contentType),
    bytes
  );

  const { payload: completed } = await restFetch(
    'POST',
    `/${encodeURIComponent(id)}/assets/${encodeURIComponent(reserved.id)}/complete`,
    { body: { sha256 } }
  );

  // `embedRef` from the server carries the FILENAME as alt text. Rebuild the
  // directive with the caller's alt when given, so a screenshot lands with real
  // alternative text instead of "diagram.png". Quotes would break out of the
  // alt="…" attribute; braces would end the {...} directive early.
  const directive = alt
    ? `::atrium-asset{id="${completed.id}" alt="${alt.replace(/"/g, "'").replace(/[{}]/g, ' ').trim()}"}`
    : completed.embedRef;

  emit({
    ...completed,
    directive,
    note: 'Embed `directive` on its OWN LINE in a document version to place this image. The asset belongs to THIS object — another object cannot reference it.',
  });
}

async function getAsset(args) {
  // Assets are per-object, so re-using an image elsewhere means downloading and
  // re-uploading it to the target object.
  const assetId = requireStr(args, 'asset_id', 'asset-id');
  const out = requireStr(args, 'out', 'out');

  let result;
  try {
    result = await getClient().requestBytes(`/assets/${encodeURIComponent(assetId)}/bytes`);
  } catch (err) {
    if (err && err.networkFailure) fail(err.message, 12);
    throw err;
  }

  if (result.status < 200 || result.status >= 300) {
    emit({
      status: 'error',
      http_status: result.status,
      message: `AI Studio refused the asset download (HTTP ${result.status})`,
      detail: result.errorText,
    });
    process.exit(12);
  }
  if (result.bytes.length === 0) fail('AI Studio returned an empty asset', 12);

  // Atrium normalizes and re-encodes every asset on completion, so a type
  // mismatch means the response is not what it claims. Refusing here keeps this
  // command from writing arbitrary response bytes to a caller-named path.
  const contentType = detectImageContentType(result.bytes);
  if (!contentType) {
    fail('AI Studio returned bytes that are not a PNG, JPEG, or WebP image; refusing to write them', 12);
  }

  try {
    writeFileSync(out, result.bytes);
  } catch (err) {
    fail(`--out not writable: ${err.message}`);
  }

  emit({ assetId, contentType, byteLength: result.bytes.length, path: out });
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

async function createDocument(args) {
  const markdown = readInlineOrFile(args, 'markdown', 'markdown', 'markdown_file', 'markdown-file');
  const visibility = buildVisibility(args);
  const body = {
    kind: 'document',
    title: requireStr(args, 'title', 'title'),
    collectionId: optStr(args, 'collection', 'collection'),
    body: markdown,
    // A document MUST be markdown — the server rejects html/jsx for kind
    // "document" — so this is not caller-selectable.
    bodyFormat: markdown !== undefined ? 'markdown' : undefined,
    visibility,
    tags: parseList(args.tags, 'tags'),
  };
  const { payload } = await restFetch('POST', '', {
    body: withEncodedBody(body),
    idempotent: 'create',
  });
  emitCreated(payload, visibility);
}

function readArtifactCode(args) {
  const codeFile = optStr(args, 'code_file', 'code-file');
  if (codeFile === undefined) return requireStr(args, 'code', 'code');
  if (args.code !== undefined) fail('pass either --code or --code-file, not both');
  let code;
  try {
    code = readFileSync(codeFile, 'utf8');
  } catch (err) {
    fail(`--code-file not readable: ${err.message}`);
    return undefined;
  }
  if (!code) fail('--code-file is empty');
  return code;
}

async function createArtifact(args) {
  const title = requireStr(args, 'title', 'title');
  const code = readArtifactCode(args);
  // An artifact MUST be html or jsx (markdown is rejected server-side). Default
  // to html: that is what a self-contained page from /html-artifact is.
  const bodyFormat = optEnum(args, 'body_format', 'body-format', ARTIFACT_FORMATS) || 'html';
  const visibility = buildVisibility(args);
  const body = {
    kind: 'artifact',
    title,
    collectionId: optStr(args, 'collection', 'collection'),
    body: code,
    bodyFormat,
    visibility,
    tags: parseList(args.tags, 'tags'),
  };
  const { payload } = await restFetch('POST', '', {
    body: withEncodedBody(body),
    idempotent: 'create',
  });
  emitCreated(payload, visibility);
}

async function appendToBody(id, text, bodyFormat) {
  const { payload: current } = await restFetch('GET', `/${encodeURIComponent(id)}`);
  const version = current && current.version;
  if (!version) {
    fail('append: object has no current version to append to — use --mode replace or create-document instead.');
  }
  if (typeof version.bodyInline !== 'string') {
    fail('append: the current body is stored externally and cannot be read inline — use --mode replace with the full text (read-source gives you the current text).');
  }
  return { body: `${version.bodyInline}\n\n${text}`, bodyFormat: bodyFormat || version.bodyFormat };
}

async function editObject(args) {
  const id = requireStr(args, 'id', 'id');
  const text = readInlineOrFile(args, 'body', 'body', 'body_file', 'body-file');
  if (text === undefined || text === '') fail('--body or --body-file is required');
  const mode = optEnum(args, 'mode', 'mode', ['replace', 'append']) || 'replace';
  const requestedFormat = optEnum(args, 'body_format', 'body-format', BODY_FORMATS);

  const edit =
    mode === 'append'
      ? await appendToBody(id, text, requestedFormat)
      : { body: text, bodyFormat: requestedFormat };

  const { payload } = await restFetch('POST', `/${encodeURIComponent(id)}/versions`, {
    body: withEncodedBody({ ...edit, summary: optStr(args, 'summary', 'summary') }),
    idempotent: 'version',
  });
  emit({ ...withLinks(payload), mode });
}

async function archiveObject(args) {
  const id = requireStr(args, 'id', 'id');
  const { payload } = await restFetch('PATCH', `/${encodeURIComponent(id)}`, {
    body: { status: 'archived' },
  });
  emit({
    ...payload,
    archived: true,
    note: 'Reversible: the object still appears under `find --status archived`. Archiving also takes any live publication offline.',
  });
}

async function setVisibility(args) {
  const id = requireStr(args, 'id', 'id');
  const level = optEnum(args, 'level', 'level', LEVELS);
  if (!level) fail('--level private|group|internal|public is required');
  const grants = parseGrants(args.grants, 'grants');
  const { approvalRequired, payload } = await restFetch(
    'PATCH',
    `/${encodeURIComponent(id)}/visibility`,
    { body: grants ? { level, grants } : { level } }
  );
  emit(approvalRequired ? { ...payload, approvalRequired: true } : payload);
}

async function publishObject(args) {
  const id = requireStr(args, 'id', 'id');
  const destination =
    optEnum(args, 'destination', 'destination', PUBLISH_DESTINATIONS) || 'intranet';
  const { approvalRequired, payload } = await restFetch(
    'POST',
    `/${encodeURIComponent(id)}/publish`,
    { body: { destination }, idempotent: 'publish' }
  );
  if (approvalRequired) {
    emit({
      ...payload,
      approvalRequired: true,
      destination,
      note: 'QUEUED FOR APPROVAL — not yet live. Relay the message verbatim.',
    });
    return;
  }

  // The publish response carries no `slug`, so it cannot produce the reader URL
  // on its own — and the reader URL is the whole point of publishing. Spend one
  // extra GET to hand back a link the user can actually open. A failure here
  // must not read as a failed publish: the publish already succeeded.
  let slug;
  let visibilityLevel;
  try {
    const { payload: obj } = await restFetch('GET', `/${encodeURIComponent(id)}`);
    slug = obj && obj.slug;
    visibilityLevel = obj && obj.visibilityLevel;
  } catch {
    /* keep the publish result; the link is a convenience, not the outcome */
  }

  emit({
    ...withLinks({ ...payload, slug }),
    destination,
    visibilityLevel,
    ...(visibilityLevel === 'private'
      ? {
          note: 'Published, but visibility is still PRIVATE — only you can open the reader URL. Use `set-visibility --level internal` to let staff see it.',
        }
      : {}),
  });
}

async function unpublishObject(args) {
  const id = requireStr(args, 'id', 'id');
  const destination = optEnum(args, 'destination', 'destination', UNPUBLISH_DESTINATIONS);
  if (!destination) fail('--destination intranet|public_web|schoology|google is required');
  const { approvalRequired, payload } = await restFetch(
    'DELETE',
    `/${encodeURIComponent(id)}/publish/${encodeURIComponent(destination)}`
  );
  emit(approvalRequired ? { ...payload, approvalRequired: true, destination } : payload);
}

const COMMANDS = {
  status,
  collections: listCollections,
  find: findObjects,
  list: findObjects,
  read: readObject,
  'read-source': readSource,
  'list-assets': listAssets,
  'upload-asset': uploadAsset,
  'get-asset': getAsset,
  'create-document': createDocument,
  'create-artifact': createArtifact,
  edit: editObject,
  archive: archiveObject,
  'set-visibility': setVisibility,
  publish: publishObject,
  unpublish: unpublishObject,
};

async function main() {
  const subcommand = process.argv[2];
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    usage();
    process.exit(0);
  }
  const args = parseArgs(process.argv, 3);
  if (args.help) {
    usage();
    process.exit(0);
  }
  const command = COMMANDS[subcommand];
  if (!command) {
    fail(`Unknown subcommand: ${subcommand}. Run with --help to see options.`);
  }
  await command(args);
}

if (require.main === module) {
  main().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    // A missing ATRIUM_API_KEY is a CONFIG error the user can fix (exit 1), not an
    // internal fault (exit 2). secrets.js already throws with setup instructions.
    const configError = message.startsWith('Missing required secret:');
    fail(message, configError ? 1 : 2);
  });
}

module.exports = { main, COMMANDS };
