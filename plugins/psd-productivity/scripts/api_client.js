#!/usr/bin/env bun

/**
 * Shared API Client Base — common boilerplate for PSD API-backed skills.
 *
 * Provides:
 *   - Config loading from secrets.js
 *   - Authenticated fetch with JSON error handling
 *   - Three pagination strategies: page-based, cursor-based, offset-based
 *   - Optional rate limiting (token bucket)
 *   - URL builder helper
 *
 * Each service client extends BaseApiClient and overrides:
 *   - serviceName (string)          — key in SECRETS object
 *   - buildBaseUrl(config)          — construct API base URL from config
 *   - buildAuthHeaders(config)      — return auth header(s) for requests
 *   - buildUiUrl(config, id)        — (optional) return UI URL for a resource
 *
 * Usage:
 *   const { BaseApiClient } = require('../../scripts/api_client.js');
 *
 *   class MyClient extends BaseApiClient {
 *     get serviceName() { return 'myService'; }
 *     buildBaseUrl(config) { return `https://${config.host}/api/v1`; }
 *     buildAuthHeaders(config) { return { Authorization: `Bearer ${config.apiKey}` }; }
 *   }
 *
 *   const client = new MyClient();
 *   const result = await client.fetch('/endpoint');
 *   const allItems = await client.fetchAllPages('/list', {}, { perPage: 50 });
 */

const { SECRETS } = require('./secrets.js');

// ---------------------------------------------------------------------------
// Rate Limiter (Token Bucket)
// ---------------------------------------------------------------------------

class RateLimiter {
  /**
   * @param {number} maxTokens  - Maximum burst capacity
   * @param {number} refillRate - Tokens added per second
   */
  constructor(maxTokens = 480, refillRate = 16) {
    if (refillRate <= 0) throw new Error('refillRate must be positive');
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire() {
    this._refill();
    if (this.tokens < 1) {
      const waitMs = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      this._refill();
    }
    this.tokens -= 1;
  }

  _refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// ---------------------------------------------------------------------------
// Base API Client
// ---------------------------------------------------------------------------

class BaseApiClient {
  /**
   * @param {object} opts
   * @param {RateLimiter|null} opts.rateLimiter - Optional rate limiter instance
   */
  constructor(opts = {}) {
    this._rateLimiter = opts.rateLimiter || null;
  }

  // -- Override these in subclasses ------------------------------------------

  /** SECRETS key for this service (e.g., 'n8n', 'documenso'). */
  get serviceName() {
    throw new Error('Subclass must define serviceName');
  }

  /** Display name for error messages (defaults to serviceName). */
  get displayName() {
    return this.serviceName;
  }

  /**
   * Build the API base URL from service config.
   * May be async to support dynamic URL discovery.
   * @param {object} config - The SECRETS[serviceName] object
   * @returns {string|Promise<string>} Base URL (e.g., 'https://host/api/v1')
   */
  async buildBaseUrl(config) {
    throw new Error('Subclass must implement buildBaseUrl(config)');
  }

  /**
   * Build authentication headers from service config.
   * @param {object} config - The SECRETS[serviceName] object
   * @returns {object} Headers object (e.g., { Authorization: 'Bearer xxx' })
   */
  buildAuthHeaders(config) {
    throw new Error('Subclass must implement buildAuthHeaders(config)');
  }

  /**
   * Build a UI URL for a resource. Override for service-specific URL patterns.
   * @param {object} config - The SECRETS[serviceName] object
   * @param {string} resourceId - Resource identifier
   * @returns {string} UI URL
   */
  buildUiUrl(config, resourceId) {
    return null;
  }

  // -- Public API ------------------------------------------------------------

  /** Get the raw service config from SECRETS. */
  getConfig() {
    return SECRETS[this.serviceName];
  }

  /** Get the API base URL. */
  async getBaseUrl() {
    return this.buildBaseUrl(this.getConfig());
  }

  /** Get a UI URL for a resource. */
  getUiUrl(resourceId) {
    return this.buildUiUrl(this.getConfig(), resourceId);
  }

  /**
   * Make an authenticated request to the service API.
   *
   * @param {string} path    - API path (e.g., '/workflows')
   * @param {object} options - fetch options: method, body, headers, responseType
   * @returns {object} Parsed JSON response, { success: true }, or { error, status }
   */
  async fetch(path, options = {}) {
    if (this._rateLimiter) {
      await this._rateLimiter.acquire();
    }

    const config = this.getConfig();
    const baseUrl = await this.buildBaseUrl(config);
    const authHeaders = await this.buildAuthHeaders(config);
    const url = path ? (baseUrl.replace(/\/$/, '') + (path.startsWith('/') ? path : '/' + path)) : baseUrl;

    const headers = {
      ...authHeaders,
      ...options.headers,
    };

    // Set Content-Type for non-FormData bodies
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOptions = {
      method: options.method || 'GET',
      headers,
    };

    // Serialize body
    if (options.body) {
      if (options.body instanceof FormData) {
        fetchOptions.body = options.body;
      } else {
        fetchOptions.body = typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body);
      }
    }

    const response = await globalThis.fetch(url, fetchOptions);

    // Handle binary responses
    if (options.responseType === 'arraybuffer') {
      if (!response.ok) {
        const text = await response.text();
        return { error: `${this.displayName} API error ${response.status}: ${text}`, status: response.status };
      }
      return response.arrayBuffer();
    }

    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail;
      try { errorDetail = JSON.parse(errorText); } catch { errorDetail = errorText; }
      return {
        error: `${this.displayName} API error ${response.status}: ${typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : errorDetail}`,
        status: response.status,
      };
    }

    // Parse successful response
    const text = await response.text();
    if (!text) return { success: true };
    try { return JSON.parse(text); } catch { return { data: text }; }
  }

  // -- Pagination Strategies -------------------------------------------------

  /**
   * Page-based pagination (page/perPage).
   * Used by: Documenso.
   *
   * @param {string} path       - API path
   * @param {object} params     - Extra query parameters
   * @param {object} opts
   * @param {number} opts.perPage    - Items per page (default 50)
   * @param {string[]} opts.dataKeys - Keys to check for items array in response
   *                                   (checked in order; default ['data'])
   * @returns {object} { data: [...], count: N } or { error, status }
   */
  async fetchAllPages(path, params = {}, opts = {}) {
    const perPage = opts.perPage || 50;
    const dataKeys = opts.dataKeys || ['data'];
    let page = 1;
    const allData = [];

    while (true) {
      const qs = new URLSearchParams({ ...params, page: String(page), perPage: String(perPage) });
      const result = await this.fetch(`${path}?${qs}`);
      if (result.error) return result;

      let items = [];
      for (const key of dataKeys) {
        if (result[key] && Array.isArray(result[key])) {
          items = result[key];
          break;
        }
      }

      if (items.length === 0) break;
      allData.push(...items);
      if (items.length < perPage) break;
      page++;
    }

    return { data: allData, count: allData.length };
  }

  /**
   * Cursor-based pagination (limit/cursor).
   * Used by: n8n.
   *
   * @param {string} path    - API path
   * @param {object} params  - Extra query parameters
   * @param {object} opts
   * @param {number} opts.limit     - Items per page (default 100)
   * @param {string} opts.cursorKey - Response key for next cursor (default 'nextCursor')
   * @param {string} opts.dataKey   - Response key for items array (default 'data')
   * @returns {object} { data: [...], count: N } or { error, status }
   */
  async fetchAllCursor(path, params = {}, opts = {}) {
    const limit = opts.limit || 100;
    const cursorKey = opts.cursorKey || 'nextCursor';
    const dataKey = opts.dataKey || 'data';
    let cursor = undefined;
    const allData = [];

    while (true) {
      const qs = new URLSearchParams({ ...params, limit: String(limit) });
      if (cursor) qs.set('cursor', cursor);

      const result = await this.fetch(`${path}?${qs}`);
      if (result.error) return result;

      const rawItems = result[dataKey];
      if (rawItems != null && !Array.isArray(rawItems)) {
        return {
          error: `Invalid pagination payload: expected '${dataKey}' to be an array`,
          status: 500,
        };
      }
      const items = Array.isArray(rawItems) ? rawItems : [];
      allData.push(...items);
      cursor = result[cursorKey];
      if (!cursor) break;
    }

    return { data: allData, count: allData.length };
  }

  /**
   * Offset-based pagination (start_position/count).
   * No current caller (its only user, docusign-manager, was removed in 2.24.3).
   *
   * @param {string} path     - API path
   * @param {object} params   - Extra query parameters
   * @param {object} opts
   * @param {number} opts.pageSize  - Items per page (default 100)
   * @param {string} opts.itemsKey  - Response key for items array (default 'items')
   * @param {string} opts.totalKey  - Response key for total count (default 'totalSetSize')
   * @returns {object} { data: [...], count: N } or { error, status }
   */
  async fetchAllOffset(path, params = {}, opts = {}) {
    const pageSize = opts.pageSize || 100;
    const itemsKey = opts.itemsKey || 'items';
    const totalKeys = Array.isArray(opts.totalKey) ? opts.totalKey : [opts.totalKey || 'totalSetSize', 'resultSetSize'];
    const allItems = [];
    let startPosition = 0;
    let totalCount = null;

    while (true) {
      const qs = new URLSearchParams({
        ...params,
        count: String(pageSize),
        start_position: String(startPosition),
      });

      const result = await this.fetch(`${path}?${qs}`);
      if (result.error) return result;

      const rawItems = result[itemsKey];
      if (rawItems != null && !Array.isArray(rawItems)) {
        return {
          error: `Expected "${itemsKey}" to be an array in offset pagination response.`,
          status: result.status || 502,
        };
      }
      const items = Array.isArray(rawItems) ? rawItems : [];
      allItems.push(...items);

      if (totalCount === null) {
        for (const key of totalKeys) {
          if (result[key] !== undefined) {
            totalCount = parseInt(result[key], 10);
            break;
          }
        }
      }

      if (items.length < pageSize || (totalCount !== null && allItems.length >= totalCount)) {
        break;
      }

      startPosition += pageSize;
    }

    return { data: allItems, count: totalCount || allItems.length };
  }
}

// ---------------------------------------------------------------------------
// Utility: normalize host to URL
// ---------------------------------------------------------------------------

/**
 * Ensure a host string starts with http:// or https://.
 * @param {string} host     - Host string (may or may not include protocol)
 * @param {string} protocol - Default protocol if missing (default 'http')
 * @returns {string}
 */
function normalizeHost(host, protocol = 'http') {
  if (host.startsWith('http://') || host.startsWith('https://')) return host;
  return `${protocol}://${host}`;
}

module.exports = { BaseApiClient, RateLimiter, normalizeHost };
