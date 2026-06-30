# Issue contract

The shape every GitHub issue must have so that `/lfg` can pick it up and drive it to a verifiable, fully-reviewed PR with no human translation step. This is the **input side** of the [Definition of Done](./definition-of-done.md): the issue's "Definition of Done" block is exactly what the verify gate checks.

Both issue-creating surfaces emit this contract:
- **`/plan`** — when it files issues from a plan.
- **the cloud `triage` routine** — when it turns a FreshService ticket into an issue.

`/lfg` consumes it: it reads the Definition of Done block as its loop exit condition and the E2E flows as the Playwright targets.

## Required issue body structure

```markdown
## Summary
<one paragraph: what and why>

## Definition of Done
<!-- dod:start -->
- [ ] <binary, testable criterion 1>
- [ ] <binary, testable criterion 2>
- [ ] Full test suite green
- [ ] Zero lint warnings; typecheck clean
- [ ] E2E flow(s) pass — flows: `<flow names>`  (or `N/A — <reason>`)
<!-- dod:end -->

## Acceptance tests / E2E flows
- `<flow-name>`: <user-visible steps Playwright must exercise and screenshot>

## Affected areas
- <files / modules / routes most likely involved — best guess>

## Out of scope
- <explicitly excluded>

## Risk & rollback
- Risk: <low|medium|high> — <why>
- Rollback: <how to revert safely>
```

## Rules

1. **Definition of Done is binary.** Every item is yes/no verifiable. No "improve performance" — instead "p95 of `/search` < 200ms measured by `<command>`". The machine-checkable items map to the verify gate; any human-only items are marked `(manual)`.
2. **The `<!-- dod:start -->` / `<!-- dod:end -->` markers are mandatory.** `/lfg` parses between them. Don't reformat or drop them.
3. **E2E flows are named.** Each named flow must correspond to a Playwright spec `/lfg` runs and screenshots. If genuinely not applicable, the DoD line says `N/A — <reason>` and the gate's `e2e_required` should be false for that repo.
4. **Labels carry the routine state.** Issues meant for autonomous pickup get `lfg-ready`; never-touch gets `lfg-skip`. See `routines/` and `docs/routines/GETTING-STARTED.md` for the full label state machine.
5. **No empty placeholders.** If a section has nothing real, omit it — do not ship `[TODO]`/`<...>` text into the issue.

## Why this exists

Before this contract, issues described intent in prose and `/lfg` had to guess what "done" meant — which is how agents shipped PRs with unchecked boxes and untested flows. With the contract, "done" is written down, machine-checkable, and identical whether a human, `/plan`, or the triage routine authored the issue.
