# Definition of Done (DoD) & the verify gate

The single, machine-checkable contract that every coding surface drives toward. "Done" is not "the agent thinks it's finished" — it's "the gate is green." `/lfg` loops until this passes; the Stop hook blocks finalize while it is red.

## The canonical DoD (web/app project)

A change is done only when **all** of these hold — for the **whole app**, not just the files that were touched:

1. **Build succeeds** — the project's build command exits 0.
2. **Zero lint warnings** — the lint command runs with warnings-as-errors and exits 0. No `// eslint-disable`, `# noqa`, `// @ts-ignore`, or equivalent suppressions.
3. **Typecheck clean** — no new `any`, no new type errors.
4. **Full test suite green** — the entire suite, not a touched-files subset. Regressions on pages the change did not touch are still failures.
5. **E2E flows green** — Playwright exercises the configured critical flows (`e2e_flows`) end-to-end. Required whenever `e2e_required` is true.
6. **Visual evidence captured** — screenshots (video when enabled) of the exercised flows, attached to the PR so a human can see the feature working.

Non-web projects drop steps 5–6 unless an equivalent is configured.

## Where the DoD comes from

- For issue-driven work, the DoD is the **Definition of Done block** in the issue (see [issue-contract.md](./issue-contract.md)). `/lfg` reads it verbatim.
- For quick fixes with no issue, `/lfg` generates a DoD from this canonical list plus the project config.

## `.psd/verify.json` — per-project configuration

Written by `/setup`. Absent → the gate is **inert** (the Stop hook does nothing), so the plugin never disrupts a repo that hasn't opted in.

```json
{
  "commands": {
    "build":     "npm run build",
    "lint":      "npm run lint",
    "typecheck": "npm run typecheck",
    "test":      "npm test",
    "e2e":       "npx playwright test"
  },
  "e2e_required": true,
  "e2e_flows": ["login", "primary-happy-path"],
  "strictness": "block",
  "reviewers": ["coderabbitai[bot]", "greptile-apps[bot]", "claude[bot]"],
  "commit_learnings": true,
  "screenshot_dir": ".verification",
  "baseline": { "allow_preexisting_failures": false }
}
```

| Key | Meaning |
|-----|---------|
| `commands` | The exact commands the gate runs. Any omitted command is skipped (not assumed). `lint` **must** be configured to fail on warnings (e.g. `eslint --max-warnings 0`, `ruff check`). |
| `e2e_required` | When true, the gate fails if the E2E command is missing or red. |
| `e2e_flows` | Named flows `/lfg` must exercise + screenshot. |
| `strictness` | `block` → the Stop hook blocks finalize on red. `warn` → the gate reports but does not block (use while adopting in a repo with pre-existing red). |
| `reviewers` | The GitHub logins of the AI reviewers `/lfg` must wait for in the watch-until-clean loop. Repo-specific — never hardcoded. |
| `commit_learnings` | When true, `/lfg` commits the learning-writer's output. Set false to keep learnings out of this repo's history. |
| `screenshot_dir` | Where evidence is written and committed for the PR. |
| `baseline.allow_preexisting_failures` | When true, the gate only fails on regressions vs. the base branch, not on failures that already existed. |

## The gate script

`scripts/verify-gate.sh` reads `.psd/verify.json` and runs build → lint → typecheck → test → e2e in order. It exits non-zero (naming every failing step) on the first hard failure, or 0 when the configured DoD is green. It is the single source of truth used by:

- **`/lfg`** — invoked each verify-loop iteration (via the `runtime-verifier` agent) until green.
- **The Stop hook** — armed only by the `.psd/finalizing` sentinel that the coding skills drop at their done-step, so it enforces at finalize without blocking mid-implementation. See `hooks/hooks.json`.

## Why "full app, not touched files"

The most common autonomous-agent failure is declaring victory after checking only the pages it edited. The gate runs the **entire** suite and the configured E2E flows every time, precisely so a change that breaks an untouched page cannot pass.
