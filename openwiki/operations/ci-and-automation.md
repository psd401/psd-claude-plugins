---
type: Operations
title: CI, security scan, release and repo automation
description: "GitHub Actions in this repo: the org-reusable CI (gofmt/vet/shellcheck plus the five runnable test suites, including the marketplace SHA-pin check), security scan with gitleaks baseline, Claude review and @claude workflows, Go CLI release tags, the weekly OpenWiki update, and the validate-and-tag release ritual."
tags: [ci, github-actions, testing, security-scan, release, openwiki, gitleaks, dependabot]
openwiki:
  roles: [delivery, testing, operations]
  change_kinds: [ci, release, test-command]
  source_paths:
    - .github/workflows/psd-ci.yml
    - .github/workflows/security-scan.yml
    - .github/workflows/claude-code-review.yml
    - .github/workflows/claude.yml
    - .github/workflows/openwiki-update.yml
    - .github/workflows/parentsquare-cli-release.yml
    - .github/workflows/classintercom-cli-release.yml
    - .github/dependabot.yml
    - .gitleaksignore
  test_paths:
    - plugins/psd-productivity/skills/parentsquare/cli
    - plugins/psd-productivity/skills/class-intercom/cli
    - plugins/psd-productivity/skills/psd-atrium/scripts/common.test.js
    - plugins/psd-productivity/skills/psd-brand-guidelines/test_brand.py
    - ci/check-marketplace-pins.test.js
    - ci/check-workflow-pins.test.js
  invariants:
    - CI runs exactly five test suites; plugins/collab/test is deliberately not run here.
    - Object-typed third-party marketplace sources must be SHA-pinned; ci/check-marketplace-pins.js exits 1 and names each unpinned entry.
    - Every GitHub Actions uses: ref in .github/workflows must be a full 40-character lowercase commit SHA (org reusable workflows included); ci/check-workflow-pins.js exits 1 and names each file:line that is not.
    - gitleaks findings not fingerprinted in .gitleaksignore fail the security scan.
  validation_commands:
    - "bun ci/check-workflow-pins.js"
    - "shellcheck --severity=error $(git ls-files '*.sh')"
    - "claude plugin validate ."
---

# CI and repo automation

Most workflows are thin callers of PSD401 org reusable workflows (`PSD401/.github/.github/workflows/reusable-*.yml`). Every `uses:` ref is pinned to a full commit SHA, including the org reusables (pinned to the `PSD401/.github` main commit of 2026-10-21 instead of `@main`) and GitHub-owned actions such as `actions/checkout` and `actions/setup-go`. Until `PSD401/.github` publishes release tags, Dependabot (`github-actions`, weekly) cannot bump the four org reusable pins, so those need manual bumps. Third-party actions such as `anthropics/claude-code-action` are SHA-pinned and bumped by Dependabot.

## Action pinning

The rule is enforced by `ci/check-workflow-pins.js`, run from `psd-ci.yml`'s `test-command` (`bun ci/check-workflow-pins.js`). It scans `.github/workflows/*.yml` with a `uses:` line matcher and fails on:

- any action or reusable ref whose `@` suffix is not `[0-9a-f]{40}` (tags such as `@v7` and branches such as `@main` fail; so do short SHAs and uppercase SHAs);
- a `uses:` with no ref at all;
- `docker://` images without an `@sha256:` digest.

Local `./` refs are exempt. Commented-out `uses:` lines are ignored. Its own tests (`ci/check-workflow-pins.test.js`) include a "this repo's workflows are all pinned" test, so a new unpinned workflow fails `bun test ci/` as well. The older `@main` plus `zizmor: ignore[unpinned-uses]` pattern is gone. This SHA-pin rule matches `psd-dev-standards` standards/06, which now requires it for every repo (see the Unreleased/Security entry in `CHANGELOG.md`).

| Workflow | Trigger | What it does |
|---|---|---|
| `psd-ci.yml` | PR, push to `main` | Reusable CI with repo-specific install, lint and test commands (below). |
| `security-scan.yml` | PR, push, Mondays 09:00 UTC, manual | Org security scan (gitleaks etc.). `.gitleaksignore` is a reviewed baseline of historical false positives (Freshservice curl placeholder, JWT-shape test fixtures); new findings still fail. |
| `claude-code-review.yml` | PR opened/synchronize/ready/reopened (not Dependabot) | Org Claude review via Bedrock; one of the AI reviewers [`/lfg` waits for](../workflows/plan-lfg-evolve.md#lfg-phases). |
| `claude.yml` | `@claude` mentions on issues/PRs/reviews | `claude-code-action` responder. |
| `parentsquare-cli-release.yml`, `classintercom-cli-release.yml` | tag `parentsquare-cli-v*` / `classintercom-cli-v*` or manual | Cross-build and publish gz binaries; see [Go CLI skills](../integrations/go-cli-skills.md). |
| `openwiki-update.yml` | push to `main`, Mondays 08:00 UTC, manual | Calls the org OpenWiki reusable (base branch `main`); regenerates `openwiki/` and opens a docs-only PR that merges itself. Concurrency group `openwiki`, cancel-in-progress. Passes only `BEDROCK_API_KEY` and `PSD_AUTOMATION_APP_PRIVATE_KEY`. Do not hand-edit generated wiki pages. |

## What CI actually runs (`psd-ci.yml`)

Install: `uv` 0.12.17, `bun` 1.4.2, Go from the runner (fetches the `go.mod` toolchain, go1.26.5). No lockfile at root, so no auto runtime install.

- **Lint:** `gofmt -l` clean and `go vet ./...` in both Go CLI dirs; `shellcheck --severity=error` over every tracked `*.sh`.
- **Tests:** `go test ./...` in `parentsquare/cli` and `class-intercom/cli`; `bun test plugins/psd-productivity/skills/psd-atrium/`; `bun test ci/` and `bun ci/check-marketplace-pins.js` (marketplace SHA-pin enforcement, see [marketplace structure](../architecture/marketplace-structure.md#invariants)); `uv run --with pytest pytest -q test_brand.py` in `psd-brand-guidelines`.
- **Not run:** `plugins/collab/test` (needs the `claude-code/testing` runtime; owned upstream — see [collab plugin](../integrations/collab-plugin.md)); the enrollment Python scripts, `scripts/test_pipeline.js`, and everything in `psd-coding-system` (markdown + shell, no suites). Adding a new test suite means adding it to `test-command`, otherwise it never gates a PR.

## Release ritual

Marketplace releases are driven by `/bump-version` ([version tracks](../architecture/marketplace-structure.md#version-tracks-never-mix)): branch from up-to-date `main`, bump the tracks that changed, run `claude plugin validate .`, merge through a PR (0 approvals but required), then tag the merge commit with plain `git tag -a vX.Y.Z` — never `claude plugin tag`. CLI binary releases are separate tag-driven jobs and must keep `VERSION` in each `ensure-binary.sh` in sync.

## Change navigation

- New runnable test or lint: add to `psd-ci.yml` `lint-command`/`test-command`; confirm tool install is covered by `install-command`.
- Marketplace pin rule failing on a `marketplace.json` change: an object-typed `source` lacks a 40-character lowercase `sha`. Pin it to a full commit SHA; the check's own tests live in `ci/check-marketplace-pins.test.js`.
- Workflow pin rule failing on a `.github/workflows` change: a `uses:` ref is a tag, branch, short or uppercase SHA, or missing a ref. Replace it with the full 40-character commit SHA (keep the tag as a trailing comment, as the existing refs do). `ci/check-workflow-pins.js` names each `file:line`; the rule is tested in `ci/check-workflow-pins.test.js`. Local `./` refs need no pin.
- Narrow local checks: the per-suite commands above; shellcheck on just the touched scripts.
- Security-scan failure on a genuine false positive: add the fingerprint line to `.gitleaksignore` with a justification comment; never to hide real secrets.
- Workflow files are protected paths for [cloud routines](./cloud-routines.md#protected-paths), so routine-authored fixes cannot touch them.
hide real secrets.
- Workflow files are protected paths for [cloud routines](./cloud-routines.md#protected-paths), so routine-authored fixes cannot touch them.
