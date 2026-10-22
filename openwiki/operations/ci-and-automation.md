---
type: Operations
title: CI, security scan, release and repo automation
description: "GitHub Actions in this repo: the org-reusable CI (gofmt/vet/shellcheck plus the four runnable test suites), security scan with gitleaks baseline, Claude review and @claude workflows, Go CLI release tags, the weekly OpenWiki update, and the validate-and-tag release ritual."
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
  invariants:
    - CI runs exactly four test suites; plugins/collab/test is deliberately not run here.
    - Reusable org workflows are referenced at @main on purpose, with a zizmor ignore comment.
    - gitleaks findings not fingerprinted in .gitleaksignore fail the security scan.
  validation_commands:
    - "shellcheck --severity=error $(git ls-files '*.sh')"
    - "claude plugin validate ."
---

# CI and repo automation

Most workflows are thin callers of PSD401 org reusable workflows (`PSD401/.github/.github/workflows/reusable-*.yml@main`). `@main` is deliberate so central updates propagate (org standard `psd-dev-standards` standards/06); each call carries `# zizmor: ignore[unpinned-uses]`. Third-party actions are SHA-pinned (e.g. `anthropics/claude-code-action`) and bumped by Dependabot (`github-actions`, weekly).

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
- **Tests:** `go test ./...` in `parentsquare/cli` and `class-intercom/cli`; `bun test plugins/psd-productivity/skills/psd-atrium/`; `uv run --with pytest pytest -q test_brand.py` in `psd-brand-guidelines`.
- **Not run:** `plugins/collab/test` (needs the `claude-code/testing` runtime; owned upstream — see [collab plugin](../integrations/collab-plugin.md)); the enrollment Python scripts, `scripts/test_pipeline.js`, and everything in `psd-coding-system` (markdown + shell, no suites). Adding a new test suite means adding it to `test-command`, otherwise it never gates a PR.

## Release ritual

Marketplace releases are driven by `/bump-version` ([version tracks](../architecture/marketplace-structure.md#version-tracks-never-mix)): branch from up-to-date `main`, bump the tracks that changed, run `claude plugin validate .`, merge through a PR (0 approvals but required), then tag the merge commit with plain `git tag -a vX.Y.Z` — never `claude plugin tag`. CLI binary releases are separate tag-driven jobs and must keep `VERSION` in each `ensure-binary.sh` in sync.

## Change navigation

- New runnable test or lint: add to `psd-ci.yml` `lint-command`/`test-command`; confirm tool install is covered by `install-command`.
- Narrow local checks: the per-suite commands above; shellcheck on just the touched scripts.
- Security-scan failure on a genuine false positive: add the fingerprint line to `.gitleaksignore` with a justification comment; never to hide real secrets.
- Workflow files are protected paths for [cloud routines](./cloud-routines.md#protected-paths), so routine-authored fixes cannot touch them.
