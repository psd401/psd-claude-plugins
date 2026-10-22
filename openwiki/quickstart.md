---
type: Guide
title: PSD Claude Plugins wiki quickstart
description: "Entry point for the psd-claude-plugins knowledge base: what the PSD plugin marketplace contains (five Claude Code plugins, cloud routines, CI), a task-routing table to source files, symbols, tests and validation, links to every wiki page, and the open backlog."
tags: [quickstart, overview, marketplace, navigation]
openwiki:
  roles: [repository]
  change_kinds: [navigation]
  source_paths:
    - README.md
    - CLAUDE.md
    - .claude-plugin/marketplace.json
---

# PSD Claude Plugins — quickstart

`psd401/psd-claude-plugins` is Peninsula School District's **plugin marketplace for Claude Code and Claude Cowork** (marketplace version 2.36.0). It is almost entirely Markdown prompts (skills, agents), a few shell/JS/Python helper scripts, two vendored Go CLIs, and a vendored TypeScript plugin. There is no root build; "development" means editing `SKILL.md`/agent files (hot-reloaded) and keeping JSON manifests and version numbers consistent.

| Plugin | Purpose | Wiki |
|---|---|---|
| `psd-coding-system` v3.8.10 | `/plan` → `/lfg` → `/evolve` dev workflow, 44 agents, Definition-of-Done gate, hooks | [coding system](./architecture/coding-system.md), [DoD gate](./workflows/definition-of-done-gate.md), [workflow](./workflows/plan-lfg-evolve.md) |
| `psd-productivity` v2.26.0 | 33 district/productivity skills + `enrollment-validator` agent | [productivity plugin](./architecture/productivity-plugin.md), [Go CLI skills](./integrations/go-cli-skills.md) |
| `n8n`, `documenso` v1.0.0 | Opt-in MCP connections (start disabled) | [MCP plugins](./integrations/mcp-plugins.md) |
| `collab` v1.0.0 | Threads between colleagues' agents; **published from upstream, never hand-edit** | [collab](./integrations/collab-plugin.md) |

Outside the plugins: [cloud routines](./operations/cloud-routines.md) (triage / lfg / pr-fix) and [CI and automation](./operations/ci-and-automation.md). How the pieces fit together, versioning and release rules: [marketplace structure](./architecture/marketplace-structure.md).

## Wiki map

- Architecture: [marketplace structure](./architecture/marketplace-structure.md) · [coding system](./architecture/coding-system.md) · [productivity plugin](./architecture/productivity-plugin.md)
- Workflows: [plan → lfg → evolve](./workflows/plan-lfg-evolve.md) · [Definition-of-Done gate](./workflows/definition-of-done-gate.md)
- Integrations: [MCP plugins (n8n, documenso, context7)](./integrations/mcp-plugins.md) · [Go CLI skills (ParentSquare, Class Intercom)](./integrations/go-cli-skills.md) · [collab plugin](./integrations/collab-plugin.md)
- Operations: [cloud routines](./operations/cloud-routines.md) · [CI and automation](./operations/ci-and-automation.md)

## Task routing

Run commands from the repo root. Paths are under `plugins/` unless stated.

| Change area / intent | Wiki page | Source entry points | Key symbols / fields | Focused tests | Minimal validation |
|---|---|---|---|---|---|
| Add/rename/remove a plugin, bump versions, release | [marketplace structure](./architecture/marketplace-structure.md) | `.claude-plugin/marketplace.json`, `<plugin>/.claude-plugin/plugin.json`, `psd-coding-system/skills/bump-version/SKILL.md` | `metadata.version`, `plugins[].source`, `plugins[].version` | none (manifest checks) | `claude plugin validate .` ; `jq '.plugins[].name' .claude-plugin/marketplace.json` |
| Edit a `/plan`, `/lfg`, `/evolve`, `/setup`, `/worktree` skill | [plan → lfg → evolve](./workflows/plan-lfg-evolve.md) | `psd-coding-system/skills/<name>/SKILL.md`, `docs/patterns/{definition-of-done,issue-contract}.md` | frontmatter `model`, `effort`, `allowed-tools`; `<!-- dod:start -->` block | none; dry-run the skill in a scratch repo | `claude plugin validate .` |
| Change the verify gate / Stop hook / `.psd/verify.json` | [DoD gate](./workflows/definition-of-done-gate.md) | `psd-coding-system/scripts/verify-gate.sh`, `verify-gate-stop-hook.sh`, `hooks/hooks.json`, `skills/setup/SKILL.md` | `.psd/finalizing`, `.psd/last-gate-result`, `PSD_VERIFY_CONFIG`, `strictness` | none; scratch-repo matrix in page | `shellcheck --severity=error plugins/psd-coding-system/scripts/*.sh` |
| Add/modify an agent or hook | [coding system](./architecture/coding-system.md) | `psd-coding-system/agents/<category>/*.md`, `docs/agent-manifest.md`, `scripts/*.sh` | agent frontmatter `name`, `model`, `effort`, `memory: project`; hook events | none | `claude plugin validate .` ; `shellcheck --severity=error <script>` |
| Add/modify a productivity skill | [productivity plugin](./architecture/productivity-plugin.md) | `psd-productivity/skills/<name>/SKILL.md`, `scripts/secrets.js`, `scripts/api_client.js` | `SECRETS`, `BaseApiClient`, `runHealthCheck` | `psd-atrium/scripts/common.test.js`, `psd-brand-guidelines/test_brand.py` | `bun test plugins/psd-productivity/skills/psd-atrium/` |
| Add or rotate an API secret | [productivity plugin](./architecture/productivity-plugin.md#secrets-resolution) | `psd-productivity/SECRETS-SETUP.md`, `scripts/secrets.js`, `scripts/secrets.py` | env → Keychain → legacy `.env` chain | none | `bun -e "require('./plugins/psd-productivity/scripts/secrets.js')"` (load smoke) |
| Change ParentSquare / Class Intercom CLI or binary fetch | [Go CLI skills](./integrations/go-cli-skills.md) | `…/parentsquare/cli`, `…/class-intercom/cli`, `…/scripts/ensure-binary.sh`, `.github/workflows/*-cli-release.yml` | `VERSION`, `TAG`, `create-draft` (forced `save_draft`) | `go test ./...` in each `cli/` (`root_test.go`, `client_test.go`, `tools_test.go`) | `cd <cli> && gofmt -l . && go vet ./... && go test ./...` |
| n8n / documenso MCP connection | [MCP plugins](./integrations/mcp-plugins.md) | `n8n/scripts/n8n-mcp-proxy.sh`, `documenso/scripts/documenso-mcp-proxy.sh`, each `plugin.json` | `defaultEnabled: false`, `mcpServers` | none | `shellcheck --severity=error plugins/n8n/scripts/*.sh plugins/documenso/scripts/*.sh` |
| collab plugin behavior | [collab plugin](./integrations/collab-plugin.md) | change **upstream** `psd401/psd-collab-mcp`; local reference `collab/hooks/register.tsx`, `.publish-source` | `register`, `projectKey`, `statusText`, `sessionSection` | `collab/test/*.test.ts` (upstream runtime only) | none locally; not run in this repo's CI |
| Edit a cloud routine or its labels | [cloud routines](./operations/cloud-routines.md) | `routines/<name>/routine-prompt.md`, `routines/shared/bootstrap.sh` | label state machines, protected paths | none (first-run checklist in routine README) | `shellcheck --severity=error routines/shared/*.sh` |
| Change CI, security scan, wiki workflow | [CI and automation](./operations/ci-and-automation.md) | `.github/workflows/psd-ci.yml`, `security-scan.yml`, `openwiki-update.yml`, `.gitleaksignore` | `lint-command`, `test-command` | the four CI suites | `shellcheck --severity=error $(git ls-files '*.sh')` |

Boundary checks worth remembering: a new skill/agent is only complete when counts in `README.md`, `CLAUDE.md`, plugin `README.md`, `plugin.json` and `marketplace.json` descriptions agree; a plugin ships nothing from another plugin (no cross-plugin dependencies, skills cannot call skills).

## Backlog

- `plugins/psd-productivity/skills/*` (individual skills such as `enrollment`, `board-policy-formatter`, `n8n-manager`, `documenso-manager`, `multi-model-research`, `html-artifact`) — only mapped at group level in the [productivity plugin](./architecture/productivity-plugin.md); per-skill internals (enrollment FTE rules, Python pipelines) deserve their own pages.
- `plugins/psd-coding-system/skills/hallmark`, `chad-review`, `psd-sign` — vendored/specialized skills summarized only; internals not documented.
- `plugins/psd-coding-system/agents/**` — individual agent contracts are summarized by category; `docs/agent-manifest.md` still lists as "orphans" several agents that `/lfg` Phase 6 and `/setup` `review_agents` now wire (likely stale).
- `docs/META_LEARNING_GUIDE.md` and `plugins/psd-coding-system/docs/how-to-use.md` — reference removed commands (`/work`, `/review_pr`, `/clean_branch`); likely stale, not otherwise covered.
to-use.md` and its images were not reviewed.
