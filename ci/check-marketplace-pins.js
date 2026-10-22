#!/usr/bin/env bun
// Enforces psd-dev-standards standards/06 ("Third-party Claude Code plugins"):
// every marketplace.json entry whose `source` is an object of type github, url
// or git-subdir must carry `sha`, a full 40-character lowercase commit SHA.
// Relative-path sources (strings such as "./plugins/foo") are PSD's own
// plugins and are exempt.
//
// Usage: bun ci/check-marketplace-pins.js [path/to/marketplace.json]
// Exits 1 and names each offending entry when any are unpinned.

import { readFileSync } from "node:fs";

const PINNED_TYPES = new Set(["github", "url", "git-subdir"]);
const SHA_RE = /^[0-9a-f]{40}$/;

export function findUnpinned(marketplace) {
  const problems = [];
  for (const [i, plugin] of (marketplace.plugins ?? []).entries()) {
    const src = plugin.source;
    if (typeof src !== "object" || src === null) continue;
    if (!PINNED_TYPES.has(src.source)) continue;
    if (typeof src.sha !== "string" || !SHA_RE.test(src.sha)) {
      const name = plugin.name ?? `plugins[${i}]`;
      const got = src.sha === undefined ? "no sha" : `sha ${JSON.stringify(src.sha)}`;
      problems.push(`${name}: ${src.source} source has ${got}; needs a full 40-character lowercase commit SHA`);
    }
  }
  return problems;
}

if (import.meta.main) {
  const path = process.argv[2] ?? ".claude-plugin/marketplace.json";
  const problems = findUnpinned(JSON.parse(readFileSync(path, "utf8")));
  if (problems.length) {
    console.error(`${path}: ${problems.length} unpinned third-party plugin source(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`${path}: all third-party plugin sources are SHA-pinned`);
}
