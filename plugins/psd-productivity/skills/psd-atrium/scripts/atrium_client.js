#!/usr/bin/env bun

/**
 * AtriumClient — HTTP boundary for AI Studio's Atrium content API.
 *
 * Atrium is AI Studio's collaborative content workspace: staff author DOCUMENTS
 * (markdown) and interactive ARTIFACTS (HTML/JSX), organize them into
 * collections, control visibility, and publish them to internal destinations.
 *
 * Auth is an AI Studio API key (`sk-…`) sent as `Authorization: Bearer`. Atrium
 * gates api_key callers purely on scopes — the `atrium-content` capability check
 * applies only to browser sessions — so a key carrying content:read /
 * content:create / content:update / content:publish_internal is sufficient.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS OVERRIDES BaseApiClient.fetch() INSTEAD OF USING IT
 * ---------------------------------------------------------------------------
 * The shared `fetch()` in ../../../scripts/api_client.js is deliberately lossy in
 * three ways that Atrium specifically depends on. Do NOT "simplify" this back
 * onto it:
 *
 *   1. It discards the HTTP status on success. Atrium signals "queued for admin
 *      approval" as a 202 with a normal-looking body. Collapsed to a 200-shaped
 *      return, a queued public publish is indistinguishable from a completed one
 *      and we would tell the user their content is live when it is not.
 *   2. It never exposes response headers. Atrium returns `ETag` on GET/versions/
 *      publish for If-Match optimistic concurrency, and `Idempotency-Replayed`
 *      to mark a replayed mutation.
 *   3. It stringifies the error envelope into a message blob, losing
 *      `error.code` — which is how callers distinguish IDEMPOTENCY_KEY_REUSED
 *      from VALIDATION_ERROR from FORBIDDEN.
 *
 * We still extend BaseApiClient for the repo-standard config/secrets/base-URL/
 * auth-header/rate-limiter plumbing, and add `request()` for the raw envelope.
 */

'use strict';

const { BaseApiClient, RateLimiter, normalizeHost } = require('../../../scripts/api_client.js');

/** Per-request timeout (ms). Overridable for a slow link or a large artifact. */
const REQUEST_TIMEOUT_MS = (() => {
  const raw = Number(process.env.ATRIUM_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 30000;
})();

/**
 * Atrium rate-limits API keys at 60 requests/minute (sliding window) and returns
 * 429 + Retry-After past that. Pace locally at 1 req/s with a small burst so a
 * multi-asset upload self-throttles instead of tripping the limiter mid-flow.
 */
const RATE_LIMIT_MAX_TOKENS = 10;
const RATE_LIMIT_REFILL_PER_SEC = 1;

class AtriumClient extends BaseApiClient {
  constructor(opts = {}) {
    super({
      rateLimiter:
        opts.rateLimiter ||
        new RateLimiter(RATE_LIMIT_MAX_TOKENS, RATE_LIMIT_REFILL_PER_SEC),
    });
  }

  get serviceName() {
    return 'atrium';
  }

  get displayName() {
    return 'AI Studio Atrium';
  }

  /** Every content route lives under /api/v1/content. */
  buildBaseUrl(config) {
    return `${normalizeHost(config.host, 'https')}/api/v1/content`;
  }

  buildAuthHeaders(config) {
    return { Authorization: `Bearer ${config.apiKey}` };
  }

  /** Internal reader deep link for a published object. */
  buildUiUrl(config, slug) {
    return `${normalizeHost(config.host, 'https')}/c/${slug}`;
  }

  /** Editor deep link — useful to hand a human after a draft is created. */
  getEditorUrl(objectId) {
    const config = this.getConfig();
    return `${normalizeHost(config.host, 'https')}/atrium/${objectId}/edit`;
  }

  /**
   * Issue one Atrium request and return the FULL envelope.
   *
   * @returns {Promise<{status:number, headers:Headers, payload:any, rawText:string}>}
   *   `payload` is the response's `data` field when present (Atrium wraps every
   *   success as `{ data, meta }`), otherwise the whole parsed body. Status and
   *   headers are preserved so the caller can detect 202 / read ETag — see the
   *   header comment for why that matters.
   */
  async request(method, path, opts = {}) {
    if (this._rateLimiter) await this._rateLimiter.acquire();

    const config = this.getConfig();
    const baseUrl = await this.buildBaseUrl(config);

    let url = baseUrl + (path || '');
    const query = normalizeQuery(opts.query);
    const qs = new URLSearchParams(query).toString();
    if (qs) url += `?${qs}`;

    const headers = {
      ...this.buildAuthHeaders(config),
      Accept: 'application/json',
      'Cache-Control': 'no-store',
      ...(opts.headers || {}),
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    let response;
    try {
      response = await globalThis.fetch(url, {
        method,
        headers,
        ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
        redirect: 'error',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      const timedOut = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
      const detail = timedOut
        ? `request timed out after ${REQUEST_TIMEOUT_MS}ms`
        : `network error: ${err.message}`;
      const error = new Error(`${this.displayName}: ${detail}`);
      error.networkFailure = true;
      throw error;
    }

    const rawText = await response.text();
    let parsed = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }
    }

    // Unwrap `{ data, meta }` only on success. An error body is `{ error, requestId }`
    // and must reach the caller intact so `error.code` survives.
    const ok = response.status >= 200 && response.status < 300;
    const payload =
      ok && parsed && parsed.data !== undefined ? parsed.data : parsed;

    return { status: response.status, headers: response.headers, payload, rawText };
  }

  /**
   * Fetch raw bytes from an Atrium route that returns a binary body.
   *
   * `GET /api/v1/content/assets/{assetId}/bytes` responds with the image itself
   * (Content-Type: image/*), not a JSON envelope — reading it as text would
   * corrupt it through UTF-8 replacement, so it needs its own path.
   *
   * @returns {Promise<{status:number, headers:Headers, bytes:Buffer, errorText:string}>}
   */
  async requestBytes(path) {
    if (this._rateLimiter) await this._rateLimiter.acquire();

    const config = this.getConfig();
    const baseUrl = await this.buildBaseUrl(config);

    let response;
    try {
      response = await globalThis.fetch(baseUrl + path, {
        method: 'GET',
        headers: {
          ...this.buildAuthHeaders(config),
          'Cache-Control': 'no-store',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      const timedOut = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
      const error = new Error(
        `${this.displayName}: ${
          timedOut ? `request timed out after ${REQUEST_TIMEOUT_MS}ms` : `network error: ${err.message}`
        }`
      );
      error.networkFailure = true;
      throw error;
    }

    if (!(response.status >= 200 && response.status < 300)) {
      return {
        status: response.status,
        headers: response.headers,
        bytes: Buffer.alloc(0),
        errorText: (await response.text()).slice(0, 512),
      };
    }

    return {
      status: response.status,
      headers: response.headers,
      bytes: Buffer.from(await response.arrayBuffer()),
      errorText: '',
    };
  }
}

/** Drop undefined/null/empty values so an absent filter never becomes `?tag=`. */
function normalizeQuery(queryOptions) {
  const query = {};
  for (const [key, value] of Object.entries(queryOptions || {})) {
    if (value !== undefined && value !== null && value !== '') {
      query[key] = String(value);
    }
  }
  return query;
}

module.exports = { AtriumClient, normalizeQuery, REQUEST_TIMEOUT_MS };
