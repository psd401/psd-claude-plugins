---
type: Architecture
title: psd-productivity plugin (skills, shared scripts, secrets chain)
description: "Map of the 33 psd-productivity skills by category, the shared bun/python helpers (secrets.js, api_client.js, health_check_base.js), the secrets lookup order, API-client conventions, the psd-atrium and enrollment skills, and which skills have automated tests."
tags: [psd-productivity, skills, secrets, api-client, enrollment, atrium, cowork]
openwiki:
  roles: [architecture, integration]
  change_kinds: [skill, secrets, api-client]
  source_paths:
    - plugins/psd-productivity/.claude-plugin/plugin.json
    - plugins/psd-productivity/scripts/secrets.js
    - plugins/psd-productivity/scripts/secrets.py
    - plugins/psd-productivity/scripts/api_client.js
    - plugins/psd-productivity/scripts/health_check_base.js
    - plugins/psd-productivity/SECRETS-SETUP.md
    - plugins/psd-productivity/skills/psd-atrium/scripts/run.js
    - plugins/psd-productivity/skills/enrollment/SKILL.md
  symbols: [BaseApiClient, RateLimiter, SECRETS, runHealthCheck]
  test_paths:
    - plugins/psd-productivity/skills/psd-atrium/scripts/common.test.js
    - plugins/psd-productivity/skills/psd-brand-guidelines/test_brand.py
  invariants:
    - Secrets resolve environment first, then macOS login Keychain, then the legacy Geoffrey .env file.
    - Skills in this plugin work without psd-coding-system installed.
    - Skill file references are relative to the skill directory, never repo paths.
  validation_commands:
    - "bun test plugins/psd-productivity/skills/psd-atrium/"
    - "cd plugins/psd-productivity/skills/psd-brand-guidelines && uv run --with pytest pytest -q test_brand.py"
---

# psd-productivity plugin

Version 3.0.0 (a breaking major release: the built-in-duplicate skills were removed, see below); 33 skills plus one agent (`agents/enrollment-validator.md`, Sonnet 5, validates P223 enrollment data). Works in Claude Code and Claude Cowork and has no dependency on the [coding system](./coding-system.md). Prerequisite: `bun` on `PATH` (the `n8n-docs` MCP server in `plugin.json` starts via `bunx n8n-mcp@2.94.3`, and many skills run bun scripts). Registration/versioning: [marketplace structure](./marketplace-structure.md).

The skill's own `SKILL.md` frontmatter description is the source of truth for what it does; the roster below is only a map.

## Skill map

| Category | Skills |
|---|---|
| Productivity | `freshservice-manager`, `redrover-manager`, `legislative-tracker` (public WA SOAP API, `config/topics.yaml`), `google-workspace-cli` |
| Content & docs | `writer`, `pdf-builder`, `pdf-to-markdown`, `presentation-master`, `assistant-architect`, `sop-creator`, `tech-writing`, `html-artifact`, `board-policy-formatter`, `slides-to-site`, `blog-to-site`, `psd-atrium` |
| Communications | `parentsquare`, `class-intercom` — see [Go CLI skills](../integrations/go-cli-skills.md) |
| E-signature / automation | `documenso-manager`, `n8n-manager`, `browser-control` — the first two pair with the opt-in [MCP plugins](../integrations/mcp-plugins.md) |
| Research & planning | `research`, `multi-model-research`, `strategic-planning-manager`, `seven-advisors` |
| Audio & media | `elevenlabs-tts`, `local-tts`, `image-gen` |
| PSD-specific | `psd-athletics`, `psd-brand-guidelines`, `psd-instructional-vision`, `enrollment`, `chief-of-staff` |

Frontmatter conventions used here: `paths:` file-scoping (adopted on board-policy-formatter, class-intercom, documenso-manager, enrollment, html-artifact, n8n-manager, parentsquare, pdf-builder, psd-atrium), explicit `model:`/`effort:`. The `docx`/`pdf`/`pptx`/`xlsx`/`skill-creator` skills were removed (38 → 33) because Claude ships equivalents built in; `presentation-master` refers to the built-in pptx skill by name.

## Secrets resolution

Canonical order, implemented identically in `scripts/secrets.js` (bun, `SECRETS` object, `_loadKeychain` caches hits and misses), `scripts/secrets.py`, and the shell MCP proxies:

1. Environment variables (shell profile).
2. macOS login Keychain: `security find-generic-password -a "$USER" -s <VAR_NAME> -w` (darwin only; unattended runs need the user logged in).
3. Legacy `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env` (being retired; do not add new secrets there). `SECRETS-SETUP.md` also describes a `~/.config/psd-productivity/.env` legacy option.

Which skill needs which key (ElevenLabs, OpenAI/Gemini/Perplexity/xAI, FreshService, Red Rover, Atrium, …) is tabulated in `SECRETS-SETUP.md`; never document or log key values. The [MCP proxies](../integrations/mcp-plugins.md) share this chain.

## API client convention

`scripts/api_client.js` exports `BaseApiClient` (config from `SECRETS`, authenticated JSON fetch, page/cursor/offset pagination via `fetchAllPages`, optional token-bucket `RateLimiter`, URL builder). Service clients override `serviceName`, `buildBaseUrl`, `buildAuthHeaders` (optional `buildUiUrl`). Current subclasses: `documenso-manager/scripts/documenso_client.js`, `n8n-manager/scripts/n8n_client.js`, `psd-atrium/scripts/atrium_client.js`. `scripts/health_check_base.js` `runHealthCheck(fn)` standardizes `health_check.js` JSON output and exit code (non-zero on `status:"error"`).

## Notable skills

- **psd-atrium** (`scripts/run.js`, `common.js`, `atrium_client.js`): version-based read/write over AI Studio's `/api/v1/content` REST API. Subcommands include `status`, `collections`, `create-document`, `create-artifact`, `edit`, `publish`, `set-visibility`, image uploads (20 MiB cap, presigned PUT). Exit codes: 0 ok (including approval-required), 1 usage/config, 2 internal, 11 unauthorized/missing scope, 12 upstream error, 14 rate-limited. Key scopes `content:read|create|update|publish_internal`; `publish_public` is deliberately withheld, so public publishing returns a queued-for-approval result. Live collaborative-editor features are not reachable.
- **enrollment** (P223 monthly enrollment): orchestrates PowerSchool reports through Claude in Chrome, then deterministic Python (`scripts/fte_calculator.py`, `enrollment_validator.py`, `entry_exit_balancer.py`, `rs_reconciler.py`, `ale_reconciler.py`, `validation_report.py`, …) run with `uv run`. Human-in-the-loop: it flags issues; people submit to EDS. Shared state lives in a Google tracking sheet written via the `gws` CLI; n8n owns calendar/reminder/notification, the skill owns browser collection and computation. Reference docs under `references/` (fte-rules, school-config with count dates, p223-process, cant-automate, machine-setup). Must stay machine-portable: reference files relative to the skill dir, stage in `~/Enrollment/P223-<Month>-<Year>/`, Google Drive BACKUP is the record. Sibling `agents/enrollment-validator.md`.
- **board-policy-formatter**: Python pipeline (`extract_*`, `format_*`, `build_*_docx|pdf`, `verify_fidelity.py`) with a zero-text-modification fidelity check.
- **html-artifact**, **image-gen**, **pdf-builder**, **multi-model-research** (`research.py`, `llm_client.py`, `pyproject.toml`), **elevenlabs-tts** / **local-tts**: script + reference bundles; consult each `SKILL.md`.

## Tests and validation

CI (see [CI and automation](../operations/ci-and-automation.md)) runs only: `bun test plugins/psd-productivity/skills/psd-atrium/` (`scripts/common.test.js`: body encoding, sha256, content-type detection, presigned headers, arg/collection/grant parsers, idempotency key), `uv run --with pytest pytest -q test_brand.py` in `psd-brand-guidelines`, and the two Go CLI suites. All other scripts are untested; validate by running their `health_check.js`/`--help` against a configured environment (conditional on having credentials).

## Change navigation

- **New skill:** `skills/<name>/SKILL.md` with explicit `model`, `effort`, `allowed-tools`, `paths` if script-bearing; update counts in `plugin.json`, marketplace entry, both READMEs, `CLAUDE.md`; add keys to `SECRETS-SETUP.md`; bump per [version tracks](./marketplace-structure.md#version-tracks-never-mix).
- **New API-backed skill:** subclass `BaseApiClient`, add a `SECRETS` entry in `secrets.js`/`secrets.py`, add `health_check.js` using `runHealthCheck`.
- **Do not** commit credentials or compiled Go binaries; do not use repo-relative paths inside skills.
