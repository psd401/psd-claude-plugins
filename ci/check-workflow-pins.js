#!/usr/bin/env bun
// Fails when any GitHub Actions `uses:` ref is not pinned to an immutable
// commit: actions and reusable workflows must use a full 40-character
// lowercase commit SHA (a tag or branch such as @v7 or @main can be moved
// to point at new code). docker:// images must use an @sha256: digest.
// Local refs (./path) are exempt; they come from this repo's own checkout.
//
// Usage: bun ci/check-workflow-pins.js [workflow-dir]   (default .github/workflows)
// Exits 1 and names each offending file:line when any are unpinned.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SHA_RE = /^[0-9a-f]{40}$/;
const DIGEST_RE = /@sha256:[0-9a-f]{64}$/;
// `uses:` as a mapping key, optionally as a list item; value optionally quoted.
const USES_RE = /^\s*(?:-\s+)?uses:\s*(["']?)([^"'#\s]+)\1/;

export function findUnpinnedRefs(text, file = "<input>") {
  const problems = [];
  text.split("\n").forEach((line, i) => {
    const m = line.match(USES_RE);
    if (!m) return;
    const ref = m[2];
    const where = `${file}:${i + 1}`;
    if (ref.startsWith("./")) return;
    if (ref.startsWith("docker://")) {
      if (!DIGEST_RE.test(ref)) problems.push(`${where}: ${ref} — docker image needs an @sha256: digest`);
      return;
    }
    const at = ref.lastIndexOf("@");
    const pin = at === -1 ? "" : ref.slice(at + 1);
    if (!SHA_RE.test(pin)) {
      problems.push(`${where}: ${ref} — needs a full 40-character commit SHA (got ${pin ? `@${pin}` : "no ref"})`);
    }
  });
  return problems;
}

if (import.meta.main) {
  const dir = process.argv[2] ?? ".github/workflows";
  const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort();
  const problems = files.flatMap((f) => findUnpinnedRefs(readFileSync(join(dir, f), "utf8"), join(dir, f)));
  if (problems.length) {
    console.error(`${problems.length} unpinned workflow ref(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`${dir}: all uses: refs in ${files.length} workflow file(s) are SHA-pinned`);
}
