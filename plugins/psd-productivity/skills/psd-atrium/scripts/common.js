#!/usr/bin/env bun

/**
 * common.js — shared helpers for the psd-atrium skill.
 *
 * Ported from AI Studio's internal `psd-atrium` agent skill, with one structural
 * change: that skill reaches Atrium through an owner-bound loopback broker
 * (`/api/agent/atrium`) that exists only inside AI Studio's agent-image runtime.
 * Nothing outside that runtime can call it, so this version talks to the public
 * REST surface (`/api/v1/content`) with an AI Studio API key instead. The
 * payload shapes, gotchas, and exit-code contract are otherwise identical.
 */

'use strict';

const { readFileSync } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');

const { AtriumClient } = require('./atrium_client.js');

/** Lazily constructed so `--help` works without an API key configured. */
let _client = null;
function getClient() {
  if (!_client) _client = new AtriumClient();
  return _client;
}

const _internals = { getClient };

function fail(message, code = 1) {
  process.stderr.write(`psd-atrium: ${message}\n`);
  process.exit(code);
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}

/**
 * base64-encode a content body for transit.
 *
 * AI Studio sits behind an ALB running the managed `CrossSiteScripting_BODY`
 * WAF rule, which 403s any request body containing `<script>`, `<style>`, or
 * `style="…"` — which is exactly what a real Atrium ARTIFACT is made of. The
 * response is a bare 403 with no detail, so this failure looks like an auth
 * problem rather than a firewall one.
 *
 * base64's alphabet ([A-Za-z0-9+/=]) contains none of those characters, so an
 * encoded body is inert to the WAF. The server decodes it (signalled by
 * `codeEncoding: "base64"`) BEFORE screening and size caps. This makes artifact
 * code opaque in transit — it is never stripped or sanitized.
 */
function encodeContentBody(text) {
  return Buffer.from(String(text), 'utf8').toString('base64');
}

/**
 * Return a write body with `body` base64-encoded and `codeEncoding: "base64"`
 * set. A no-op when there is no body (e.g. a metadata-only create), so an empty
 * document posts unchanged.
 */
function withEncodedBody(body) {
  if (!body || typeof body.body !== 'string' || body.body.length === 0) {
    return body;
  }
  return { ...body, body: encodeContentBody(body.body), codeEncoding: 'base64' };
}

/**
 * A fresh idempotency key for one mutation. Atrium accepts 16–128 chars and
 * treats a replay of the same key as the same operation; the SAME key with a
 * DIFFERENT body is a 409 IDEMPOTENCY_KEY_REUSED, so never reuse one across
 * distinct writes.
 */
function idempotencyKey(operation) {
  return `psd-atrium:${operation}:${randomUUID()}`;
}

/**
 * Minimal long-form argv parser. `--foo bar` and `--foo` (boolean) supported;
 * dashes in key names become underscores.
 */
function parseArgs(argv, startIndex = 2) {
  const args = {};
  for (let i = startIndex; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      fail(`Unexpected positional argument: ${arg}`);
    }
    const key = arg.slice(2).replace(/-/g, '_');
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

/**
 * Parse a comma-separated `--tags a,b,c` flag into string[] (trimmed, empties
 * dropped). A value-LESS flag is a usage error, NOT a silent no-op, so a typo
 * cannot drop the field unnoticed.
 */
function parseList(value, label = 'tags') {
  if (value === undefined) return undefined;
  if (value === true) fail(`--${label} requires a value`);
  const items = String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/** Parse `--grants kind:value,kind:value` into [{ kind, value }]. */
function parseGrants(value, label = 'grants') {
  if (value === undefined) return undefined;
  if (value === true) fail(`--${label} requires a value`);
  const VALID = ['role', 'building', 'department', 'grade', 'user', 'group'];
  const grants = [];
  for (const raw of String(value).split(',')) {
    const entry = raw.trim();
    if (!entry) continue;
    const idx = entry.indexOf(':');
    if (idx <= 0) fail(`--grants entry must be kind:value, got "${entry}"`);
    const kind = entry.slice(0, idx).trim();
    const val = entry.slice(idx + 1).trim();
    if (!VALID.includes(kind)) {
      fail(`--grants kind must be one of ${VALID.join('|')}, got "${kind}"`);
    }
    if (!val) fail(`--grants entry "${entry}" has an empty value`);
    grants.push({ kind, value: val });
  }
  return grants.length > 0 ? grants : undefined;
}

/** Parse an explicit true/false CLI flag. A bare flag is rejected. */
function parseBoolean(value, label) {
  if (value === undefined) return undefined;
  if (value === true || value === '') fail(`--${label} requires true or false`);
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(`--${label} must be true or false`);
}

/** Parse a non-negative integer CLI flag without accepting partial numbers. */
function parseNonNegativeInt(value, label) {
  if (value === undefined) return undefined;
  if (value === true || !/^\d+$/.test(String(value))) {
    fail(`--${label} must be a non-negative integer`);
  }
  return Number(value);
}

/**
 * Parse collection grants as access:kind:value entries.
 * Example: view:role:staff,create:group:curriculum-leads@psd401.net
 */
function parseCollectionGrants(value, label = 'grants') {
  if (value === undefined) return undefined;
  if (value === true) fail(`--${label} requires a value`);
  const VALID_ACCESS = ['view', 'create', 'approve'];
  const VALID_KINDS = ['role', 'building', 'department', 'grade', 'user', 'group'];
  const grants = [];
  for (const raw of String(value).split(',')) {
    const entry = raw.trim();
    if (!entry) continue;
    const parts = entry.split(':');
    if (parts.length < 3) {
      fail(`--${label} entry must be access:kind:value, got "${entry}"`);
    }
    const access = parts.shift().trim();
    const kind = parts.shift().trim();
    const val = parts.join(':').trim();
    if (!VALID_ACCESS.includes(access)) {
      fail(`--${label} access must be one of ${VALID_ACCESS.join('|')}, got "${access}"`);
    }
    if (!VALID_KINDS.includes(kind)) {
      fail(`--${label} kind must be one of ${VALID_KINDS.join('|')}, got "${kind}"`);
    }
    if (!val) fail(`--${label} entry "${entry}" has an empty value`);
    grants.push({ access, kind, value: val });
  }
  return grants.length > 0 ? grants : undefined;
}

/**
 * The base64url SHA-256 digest the Atrium asset API expects on both initiate and
 * complete. NOT hex and NOT padded base64 — the server validates
 * /^[A-Za-z0-9_-]{43}$/ and re-derives the same digest from the uploaded bytes,
 * so a hex or standard-alphabet digest is rejected at initiate.
 */
function sha256Base64Url(bytes) {
  return createHash('sha256').update(bytes).digest('base64url');
}

/**
 * Identify an image by its MAGIC BYTES, not its filename. The asset API accepts
 * only PNG/JPEG/WebP and re-derives the true type server-side during
 * normalization, so trusting a `.png` suffix on JPEG bytes would reserve an
 * upload that then fails completion with an opaque rejection.
 */
function detectImageContentType(bytes) {
  const b = Buffer.from(bytes);
  if (
    b.length >= 8 &&
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    b.length >= 12 &&
    b.subarray(0, 4).toString('ascii') === 'RIFF' &&
    b.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Map an Atrium HTTP envelope onto this skill's exit-code contract.
 *
 * A 202 is a SUCCESS, not an error: Atrium returns it when an operation you may
 * not perform directly (typically a public publish) has been queued for admin
 * approval. Callers must relay `payload.message` verbatim.
 */
function interpret(result) {
  const { status, payload, rawText, headers } = result;

  if (status === 401 || status === 403) {
    const code = payload && payload.error ? payload.error.code : undefined;
    emit({
      status: 'unauthorized',
      http_status: status,
      code,
      message:
        status === 401
          ? 'AI Studio rejected the API key. Check ATRIUM_API_KEY is a current sk-… key.'
          : 'The API key lacks the scope (or ownership) required for this operation.',
      detail:
        payload && payload.error ? payload.error.message : rawText.slice(0, 512),
    });
    process.exit(11);
  }

  if (status === 429) {
    emit({
      status: 'rate-limited',
      message: 'AI Studio is rate-limiting this key (60 req/min). Wait and retry.',
      retryAfter: headers ? headers.get('retry-after') : undefined,
    });
    process.exit(14);
  }

  if (status === 202) {
    return { approvalRequired: true, status, payload, headers };
  }

  if (status < 200 || status >= 300) {
    const error = payload && payload.error ? payload.error : null;
    emit({
      status: 'error',
      http_status: status,
      code: error ? error.code : undefined,
      message: error
        ? error.message
        : `AI Studio content API returned HTTP ${status}`,
      detail: error ? undefined : rawText.slice(0, 512),
    });
    process.exit(12);
  }

  // A 2xx with an unparseable body means something between us and the app
  // answered (proxy, CDN error page). Never treat that as an empty success.
  if (payload === null && rawText) {
    fail('AI Studio content API returned a non-JSON body', 12);
  }

  return { approvalRequired: false, status, payload, headers };
}

/**
 * Single entry point for every Atrium content operation.
 *
 *   - method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
 *   - path:   path under /api/v1/content ('', '/<id>', '/<id>/publish', …)
 *   - opts.query / opts.body / opts.idempotent
 *
 * Pass `idempotent: '<operation>'` on a mutation to attach a fresh
 * Idempotency-Key.
 */
async function restFetch(method, path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.idempotent) {
    headers['Idempotency-Key'] = idempotencyKey(opts.idempotent);
  }
  let result;
  try {
    result = await _internals.getClient().request(method, path, {
      query: opts.query,
      body: opts.body,
      headers,
    });
  } catch (err) {
    if (err && err.networkFailure) fail(err.message, 12);
    throw err;
  }
  return interpret(result);
}

/**
 * PUT raw bytes at a presigned S3 URL — the one call that does not carry the
 * Atrium bearer token (the presigned URL is itself the credential, and leaking
 * the key to a storage host would be a real exposure).
 *
 * The URL is never author-supplied: it comes straight back from the reservation
 * response, and only https is accepted, so document content cannot steer this
 * at an internal endpoint.
 */
async function putPresignedBytes(url, headers, bytes, timeoutMs = 120000) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail('asset upload URL returned by AI Studio is not a valid URL', 12);
  }
  if (parsed.protocol !== 'https:') {
    fail(`asset upload URL must be https, got ${parsed.protocol}`, 12);
  }

  let resp;
  try {
    resp = await fetch(url, {
      method: 'PUT',
      headers,
      body: bytes,
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      fail(`asset upload timed out after ${timeoutMs}ms`, 12);
    }
    fail(`network error uploading asset bytes: ${err.message}`, 12);
  }

  if (!resp.ok) {
    // S3 returns a descriptive XML error (SignatureDoesNotMatch, EntityTooLarge)
    // that is the only clue about what went wrong — read it before failing.
    let detail = '';
    try {
      detail = (await resp.text()).slice(0, 512);
    } catch {
      /* body not readable */
    }
    emit({
      status: 'error',
      http_status: resp.status,
      message: `asset upload storage rejected the PUT (HTTP ${resp.status})`,
      detail,
    });
    process.exit(12);
  }
}

/**
 * Build the header set for the presigned PUT.
 *
 * Non-obvious S3 behaviour: if the presigner hoisted `x-amz-checksum-sha256`
 * into the query string but did NOT list it in X-Amz-SignedHeaders, sending it
 * as a header makes the request signature mismatch and S3 returns AccessDenied.
 * In that case the header must be omitted. If the query and header values
 * disagree outright, fail closed rather than upload bytes under a checksum that
 * will not verify.
 */
function presignedPutHeaders(uploadUrl, suppliedHeaders, contentType) {
  const headers = { ...(suppliedHeaders || {}) };
  if (!headers['content-type'] && !headers['Content-Type']) {
    headers['content-type'] = contentType;
  }

  const checksumKey = Object.keys(headers).find(
    (k) => k.toLowerCase() === 'x-amz-checksum-sha256'
  );
  if (!checksumKey) return headers;

  let parsed;
  try {
    parsed = new URL(uploadUrl);
  } catch {
    return headers;
  }

  const queryChecksum = parsed.searchParams.get('x-amz-checksum-sha256');
  if (!queryChecksum) return headers;

  if (queryChecksum !== headers[checksumKey]) {
    fail(
      'presigned upload checksum in the query string does not match the returned header; refusing to upload',
      12
    );
  }

  const signedHeaders = (parsed.searchParams.get('X-Amz-SignedHeaders') || '')
    .toLowerCase()
    .split(';');
  if (!signedHeaders.includes('x-amz-checksum-sha256')) {
    delete headers[checksumKey];
  }
  return headers;
}

/** Read a UTF-8 file, failing with a clear usage error rather than a stack. */
function readTextFile(filePath, label) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (err) {
    fail(`--${label} not readable: ${err.message}`);
  }
}

_internals.putPresignedBytes = putPresignedBytes;

module.exports = {
  fail,
  emit,
  parseArgs,
  parseList,
  parseGrants,
  parseBoolean,
  parseNonNegativeInt,
  parseCollectionGrants,
  restFetch,
  interpret,
  encodeContentBody,
  withEncodedBody,
  idempotencyKey,
  sha256Base64Url,
  detectImageContentType,
  putPresignedBytes,
  presignedPutHeaders,
  readTextFile,
  getClient,
  _internals,
};
