#!/usr/bin/env bun

// Rotate the Documenso API key across every n8n workflow that uses it.
//
// Usage:
//   bun rotate_documenso_key.js <old_key> <new_key>
//   bun rotate_documenso_key.js --dry-run <old_key> <new_key>
//
// What it does:
//   1. Lists all workflows on the n8n instance (paginated via n8nFetchAll)
//   2. For each, fetches live JSON and counts occurrences of <old_key>
//   3. For workflows with matches: string-replaces old → new in the full JSON,
//      strips only read-only fields (id, createdAt, etc.), and PUTs back
//   4. Prints a per-workflow result line (exits non-zero if any update fails)
//
// Safe to re-run; workflows with zero matches are skipped.

const { n8nFetch, n8nFetchAll, getEditorUrl } = require('./n8n_client.js');

const args = process.argv.slice(2);
const dryRun = args[0] === '--dry-run';
if (dryRun) args.shift();
const [oldKey, newKey] = args;

if (!oldKey || !newKey) {
  console.error(JSON.stringify({
    error: 'Usage: bun rotate_documenso_key.js [--dry-run] <old_key> <new_key>'
  }));
  process.exit(1);
}

if (!oldKey.startsWith('api_') || !newKey.startsWith('api_')) {
  console.error(JSON.stringify({
    error: 'Both keys must start with "api_" — refusing to do replacements that look unsafe.'
  }));
  process.exit(1);
}

// n8n's PUT accepts ONLY these four fields.
//
// This used to send the whole GET payload minus a handful of read-only keys.
// That is a denylist, and it silently stopped matching reality: newer n8n
// rejects `description`, `active`, `isArchived`, `staticData`, `meta`,
// `pinData`, `activeVersionId`, `versionCounter`, `triggerCount`, `shared`,
// `tags`, `activeVersion` and `url` too, so every PUT failed with
// `request/body must NOT have additional properties` and the rotation wrote
// nothing at all. An allowlist cannot rot the same way -- a new read-only
// field n8n starts returning is simply not sent.
const PUT_FIELDS = ['name', 'nodes', 'connections', 'settings'];

// `binaryMode` is a legacy settings key on a few older workflows that the PUT
// schema also rejects. Omitting it is safe: n8n keeps the stored value
// server-side, so the workflow is unchanged after the round trip.
const REJECTED_SETTINGS_KEYS = ['binaryMode'];

function occurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function buildPutBody(live) {
  const body = {};
  for (const field of PUT_FIELDS) {
    if (live[field] !== undefined) body[field] = live[field];
  }
  body.settings = Object.assign({}, live.settings || {});
  for (const key of REJECTED_SETTINGS_KEYS) delete body.settings[key];
  return body;
}

async function main() {
  // Use n8nFetchAll to paginate through all workflows (n8nFetch only returns one page)
  const list = await n8nFetchAll('/workflows');
  if (list.error) {
    console.error(JSON.stringify({ error: `Failed to list workflows: ${list.error}` }));
    process.exit(1);
  }
  const workflows = list.data || [];
  const results = [];
  let hasFailures = false;

  for (const w of workflows) {
    const id = w.id;
    const name = w.name || '(unnamed)';

    // Fetch the full live workflow — n8nFetch returns {error} on failure, does not throw
    const live = await n8nFetch(`/workflows/${id}`);
    if (live.error) {
      results.push({ id, name, status: 'fetch_failed', error: live.error });
      hasFailures = true;
      continue;
    }

    const json = JSON.stringify(live);
    const count = occurrences(json, oldKey);
    if (count === 0) continue;

    if (dryRun) {
      results.push({ id, name, status: 'would_update', references: count });
      continue;
    }

    const body = JSON.parse(JSON.stringify(buildPutBody(live)).split(oldKey).join(newKey));

    const putResult = await n8nFetch(`/workflows/${id}`, { method: 'PUT', body });
    if (putResult.error) {
      results.push({ id, name, status: 'update_failed', references: count, error: putResult.error });
      hasFailures = true;
      continue;
    }

    // Verify against the live system, not against the response to our own write.
    // A rotation that reports success while the old key is still accepted is
    // worse than one that fails loudly, because nobody goes back to check.
    const after = await n8nFetch(`/workflows/${id}`);
    if (after.error) {
      results.push({ id, name, status: 'verify_failed', references: count, error: after.error });
      hasFailures = true;
      continue;
    }
    const afterJson = JSON.stringify(after);
    const oldLeft = occurrences(afterJson, oldKey);
    const newNow = occurrences(afterJson, newKey);

    if (oldLeft !== 0 || newNow < count) {
      results.push({
        id, name, status: 'verify_mismatch', references: count,
        oldRemaining: oldLeft, newReferences: newNow,
        error: 'PUT reported success but the live workflow does not match',
      });
      hasFailures = true;
    } else {
      results.push({ id, name, status: 'updated', references: count, newReferences: newNow, url: getEditorUrl(id) });
    }
  }

  console.log(JSON.stringify({
    dryRun,
    totalWorkflows: workflows.length,
    affectedWorkflows: results.length,
    results,
  }, null, 2));

  if (hasFailures) process.exit(1);
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
});
