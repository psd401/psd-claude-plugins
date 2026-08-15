#!/usr/bin/env bun
/**
 * Unit tests for psd-atrium's pure helpers.
 *
 * These cover the transforms where a silent mistake produces a confusing
 * server-side rejection rather than a local error: the WAF base64 wrapper, the
 * base64url digest, magic-byte type detection, and the S3 checksum-header
 * reconciliation.
 *
 * Run: bun test plugins/psd-productivity/skills/psd-atrium/
 */

'use strict';

const { test, expect, describe } = require('bun:test');

const {
  encodeContentBody,
  withEncodedBody,
  parseArgs,
  parseList,
  parseGrants,
  parseBoolean,
  parseNonNegativeInt,
  parseCollectionGrants,
  sha256Base64Url,
  detectImageContentType,
  presignedPutHeaders,
  idempotencyKey,
} = require('./common.js');
const { COMMANDS } = require('./run.js');

describe('encodeContentBody / withEncodedBody', () => {
  test('round-trips utf-8 through base64', () => {
    const src = '# Título — with an em dash and emoji 🎓';
    expect(Buffer.from(encodeContentBody(src), 'base64').toString('utf8')).toBe(src);
  });

  test('produces a WAF-inert alphabet for artifact markup', () => {
    // The whole point: <script>/<style>/style=" must not survive into the wire
    // body, or the ALB CrossSiteScripting_BODY rule 403s the request.
    const encoded = encodeContentBody('<style>a{}</style><script>alert(1)</script>');
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(encoded).not.toContain('<script');
    expect(encoded).not.toContain('<style');
  });

  test('sets codeEncoding alongside the encoded body', () => {
    const out = withEncodedBody({ kind: 'artifact', body: '<script>x</script>' });
    expect(out.codeEncoding).toBe('base64');
    expect(Buffer.from(out.body, 'base64').toString('utf8')).toBe('<script>x</script>');
    expect(out.kind).toBe('artifact');
  });

  test('is a no-op when there is no body to encode', () => {
    // A metadata-only create must post unchanged — adding codeEncoding with no
    // body would make the server try to decode nothing.
    const meta = { kind: 'document', title: 'Empty' };
    expect(withEncodedBody(meta)).toEqual(meta);
    expect(withEncodedBody({ ...meta, body: '' })).toEqual({ ...meta, body: '' });
  });
});

describe('sha256Base64Url', () => {
  test('emits the 43-char base64url digest the asset API validates', () => {
    const digest = sha256Base64Url(Buffer.from('hello world'));
    // Server-side regex is /^[A-Za-z0-9_-]{43}$/ — hex or padded base64 is rejected.
    expect(digest).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(digest).not.toContain('=');
    expect(digest).not.toContain('+');
    expect(digest).not.toContain('/');
  });

  test('matches the known digest for a fixed input', () => {
    expect(sha256Base64Url(Buffer.from('hello world'))).toBe(
      'uU0nuZNNPgilLlLX2n2r-sSE7-N6U4DukIj3rOLvzek'
    );
  });
});

describe('detectImageContentType', () => {
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const WEBP = Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('WEBP', 'ascii'),
  ]);

  test('identifies the three supported types', () => {
    expect(detectImageContentType(PNG)).toBe('image/png');
    expect(detectImageContentType(JPEG)).toBe('image/jpeg');
    expect(detectImageContentType(WEBP)).toBe('image/webp');
  });

  test('rejects a non-image regardless of what it is named', () => {
    // The API re-derives the true type server-side, so trusting a .png suffix on
    // PDF bytes would reserve an upload that fails completion opaquely.
    expect(detectImageContentType(Buffer.from('%PDF-1.7\n'))).toBeNull();
    expect(detectImageContentType(Buffer.from('GIF89a'))).toBeNull();
    expect(detectImageContentType(Buffer.alloc(0))).toBeNull();
  });
});

describe('presignedPutHeaders', () => {
  const URL_UNSIGNED_CHECKSUM =
    'https://bucket.s3.us-east-1.amazonaws.com/k?x-amz-checksum-sha256=abc&X-Amz-SignedHeaders=host';
  const URL_SIGNED_CHECKSUM =
    'https://bucket.s3.us-east-1.amazonaws.com/k?x-amz-checksum-sha256=abc&X-Amz-SignedHeaders=host%3Bx-amz-checksum-sha256';

  test('drops the checksum header when it was hoisted to the query but not signed', () => {
    // Sending an unsigned header makes the signature mismatch -> AccessDenied.
    const headers = presignedPutHeaders(
      URL_UNSIGNED_CHECKSUM,
      { 'content-type': 'image/png', 'x-amz-checksum-sha256': 'abc' },
      'image/png'
    );
    expect(headers['x-amz-checksum-sha256']).toBeUndefined();
    expect(headers['content-type']).toBe('image/png');
  });

  test('keeps the checksum header when it IS listed in X-Amz-SignedHeaders', () => {
    const headers = presignedPutHeaders(
      URL_SIGNED_CHECKSUM,
      { 'x-amz-checksum-sha256': 'abc' },
      'image/png'
    );
    expect(headers['x-amz-checksum-sha256']).toBe('abc');
  });

  test('defaults content-type when the server omitted it', () => {
    const headers = presignedPutHeaders('https://bucket.s3.amazonaws.com/k', {}, 'image/webp');
    expect(headers['content-type']).toBe('image/webp');
  });
});

describe('parseArgs', () => {
  test('parses value flags, boolean flags, and kebab-to-snake keys', () => {
    const args = parseArgs(['bun', 'run.js', '--body-format', 'html', '--verbose'], 2);
    expect(args.body_format).toBe('html');
    expect(args.verbose).toBe(true);
  });

  test('treats a trailing flag as boolean rather than swallowing the next flag', () => {
    const args = parseArgs(['bun', 'run.js', '--tags', '--title', 'X'], 2);
    expect(args.tags).toBe(true);
    expect(args.title).toBe('X');
  });
});

describe('parseList / parseGrants', () => {
  test('splits and trims a tag list, dropping empties', () => {
    expect(parseList('a, b ,,c')).toEqual(['a', 'b', 'c']);
    expect(parseList(undefined)).toBeUndefined();
  });

  test('parses grant pairs into the API shape', () => {
    expect(parseGrants('role:staff,building:GHS')).toEqual([
      { kind: 'role', value: 'staff' },
      { kind: 'building', value: 'GHS' },
    ]);
  });

  test('accepts a value containing a colon', () => {
    expect(parseGrants('group:district:leadership')).toEqual([
      { kind: 'group', value: 'district:leadership' },
    ]);
  });
});

describe('collection CLI parsers', () => {
  test('parses explicit booleans and non-negative positions', () => {
    expect(parseBoolean('true', 'inherit-grants')).toBe(true);
    expect(parseBoolean('false', 'inherit-grants')).toBe(false);
    expect(parseBoolean(undefined, 'inherit-grants')).toBeUndefined();
    expect(parseNonNegativeInt('0', 'position')).toBe(0);
    expect(parseNonNegativeInt('12', 'position')).toBe(12);
  });

  test('parses collection grants with access, kind, and colon-bearing values', () => {
    expect(
      parseCollectionGrants(
        'view:role:staff,create:group:curriculum:leads',
        'grants'
      )
    ).toEqual([
      { access: 'view', kind: 'role', value: 'staff' },
      { access: 'create', kind: 'group', value: 'curriculum:leads' },
    ]);
  });

  test('wires collection management commands into the CLI', () => {
    expect(COMMANDS['create-collection']).toBeFunction();
    expect(COMMANDS['update-collection']).toBeFunction();
    expect(COMMANDS['move-content']).toBeFunction();
  });
});

describe('idempotencyKey', () => {
  test('fits the 16-128 char server bound and is unique per call', () => {
    const a = idempotencyKey('create');
    const b = idempotencyKey('create');
    expect(a.length).toBeGreaterThanOrEqual(16);
    expect(a.length).toBeLessThanOrEqual(128);
    // Reusing a key with a different body is a 409, so every write needs its own.
    expect(a).not.toBe(b);
  });
});
