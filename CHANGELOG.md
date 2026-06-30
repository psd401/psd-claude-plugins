# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Cloud routines for triage, lfg, and pr-fix** (no plugin version bump — routines are infrastructure, not part of `/plugin install` distribution):
  - **`routines/triage`** — autonomous FreshService → GitHub triage. Runs twice daily (cron `0 6,18 * * *`). Polls software-dev workspace (ID 13), filters by `[claude-routine-triaged]` private-note marker, classifies tickets to `psd401/aistudio` / `psd401/psd-workflow-automation` / `psd401/psd-claude-plugins`, runs full Phase 1.5 diagnosis fan-out (`repo-research-analyst` + `git-history-analyzer` + `bug-reproduction-validator`), files an issue, posts private note (with diagnosis brief) + public reply to FreshService. Per-fire cap of 5 tickets.
  - **`routines/lfg`** — autonomous end-to-end implementation for issues labeled `lfg-ready`. Runs every 6 hours (cron `0 */6 * * *`). Label state machine: `lfg-ready` → `lfg-in-progress` → `lfg-pr-open` / `lfg-blocked`. Branches `claude/lfg-issue-<N>-<slug>` from `dev` (PSD convention), runs research + implement + test + validate + security-audit, opens PR targeting `dev`. One issue per fire. Honors `lfg-skip` opt-out label.
  - **`routines/pr-fix`** — autonomous PR review-feedback handler for open PRs across the three target repos. Runs every 4 hours at `:30` (cron `30 */4 * * *`), staggered from lfg. Uses the same `<!-- review-pr:round:N:timestamp:T:sha:S -->` marker convention as the `/review-pr` skill so interactive and routine runs interleave without re-processing comments. Detects "no actionable info" situations (only discussion/already-addressed/stylistic comments + no failing CI) and tags `pr-fix-stuck` to stop re-checking. Marks `pr-fix-done` when fully clean. Honors `pr-fix-skip` opt-out.
  - **`routines/shared/bootstrap.sh`** — in-session bootstrap invoked as Step 1 of every routine prompt. Locates the already-cloned `psd-claude-plugins`, copies all plugin agents into `$HOME/.claude/agents/` and skills into `$HOME/.claude/skills/`. Bypasses cloud-env setup-script caching by running in-session every fire, writing to the session user's own HOME — no user/HOME mismatch.
  - **`routines/shared/env-setup.sh`** — cloud env setup script for the shared `psd-automation` environment. Installs `gh` CLI from the official `cli.github.com` apt repo (stable tools belong in cached setup; agents do not).
  - **GitHub label taxonomy** documented per routine and pre-created across all three target repos: `triaged-from-freshservice`; `lfg-ready` / `lfg-in-progress` / `lfg-pr-open` / `lfg-blocked` / `lfg-skip`; `pr-fix-stuck` / `pr-fix-done` / `pr-fix-skip`. Designed for mobile-tap workflows from GitHub's app.
  - **Pattern 1 validation pilot** at `routine-pilots/agent-discovery-check/` (since removed after validation) — confirmed via pilot fires that project-scope `.claude/agents/*.md` AND user-scope `~/.claude/agents/*.md` written by setup are auto-discovered at routine session start, and the env setup script re-runs on every fire with a fresh HOME.

## [2.18.0] - 2026-06-30

### Changed
- **psd-coding-system → 3.0.0 (major, breaking): wholesale overhaul to a verification-first, run-to-100%-clean system.** Consolidated 21 overlapping skills into **3 disciplined surfaces + 3 utilities**:
  - **`/plan`** — clarify → parallel research → design → emit tasks + a machine-checkable Definition of Done (+ contract-compliant issues). Absorbs `/architect`, `/brainstorm`, `/scope`, `/product-manager`, `/deepen-plan`, `/issue`.
  - **`/lfg`** — autonomous build-to-done: implement → **verify-loop** (build, zero-warning lint, typecheck, **full** test suite, Playwright E2E + screenshots) until green → open a PR with embedded visual evidence → **watch CI + the project's AI reviewers and fix every round until `reviewDecision=APPROVED` and all checks pass** (self-paced ~3-min polls, cap 10, then escalate). Commits learnings. Absorbs `/work`, `/test`, `/debug`, `/optimize`, `/review-pr`, `/security-audit`. Removed the soft `|| true` lint gate.
  - **`/evolve`** — now compounds each learning into CLAUDE.md/patterns/agents then **prunes** the source file (capture → commit → compound → prune), replacing the blunt 90-day TTL; refreshed competitor sources (Obra superpowers, Every compound-engineering, Boris Cherny, Matt Pocock).

### Added
- **Definition-of-Done verify gate** — `scripts/verify-gate.sh` + `.psd/verify.json` (per-project commands, E2E flows, strictness, AI-reviewer logins, commit-learnings, active review agents), written by the rewritten `/setup`. Inert in repos without the config so it never disrupts opted-out repos.
- **Stop hook** (`hooks.json` → `scripts/verify-gate-stop-hook.sh`) — blocks finishing while the local DoD gate is not verifiably green at the current commit with a clean tree; armed only by the `.psd/finalizing` sentinel so it never fires mid-implementation or during PR-watch waits.
- **`runtime-verifier` agent** — the first agent that actually runs the app (build/lint/typecheck/full-suite/Playwright + screenshot capture), returning PASS/FAIL with evidence paths. Wired into `work-validator` as the terminal validation step.
- **Pattern docs** — `docs/patterns/{definition-of-done,issue-contract,worktrees-explained}.md` (incl. the multi-window parallel-`/lfg` how-to).
- **`agents/MANIFEST.md`** — skill→agent dispatch map.
- **PR visual evidence** — `/lfg` embeds Playwright screenshots that render on the GitHub PR page; the empty-checkbox PR template is gone.

### Changed (agents & routines)
- Merged `security-analyst` + `security-analyst-specialist` → **`security-reviewer`**. Renamed stale `agents/meta/meta-orchestrator.md` → `meta-reviewer.md` (matches its registered name). Agent total unchanged at 44.
- **Cloud routines unified to one source of truth:** the `lfg` routine now executes the `/lfg` SKILL.md workflow (Phases 3–7) instead of duplicating it and hands watch-until-clean to `pr-fix`; the `triage` routine now emits issue-contract-compliant issues (Definition-of-Done block).

### Removed
- 16 skills folded into the 3 surfaces (`work`, `test`, `debug`, `optimize`, `review-pr`, `security-audit`, `architect`, `brainstorm`, `scope`, `product-manager`, `deepen-plan`, `issue`, `changelog`, `clean-branch`, `swarm`, `triage`) and the loose snippet files (`git-workflow.md`, `parallel-dispatch.md`, `security-scan.md`, `test-runner.md`, `swarm-orchestration.md`).

## [2.17.0] - 2026-06-18

### Added
- **`/class-intercom` skill (psd-productivity → 2.15.0)** — self-contained Class Intercom social-comms CLI, generated with Printing Press from the live Class Intercom web app (a React SPA with a cookie/CSRF-authenticated Rails `/api` backend; no public API/spec — discovered via an authenticated in-page `fetch`/XHR capture) and hand-extended for PSD:
  - **Read commands** — social `channels` (with their UUIDs), the content/activity feed (`content list-content`), content tasks/failed-count/holidays (`content list-holidays` requires `--date-start`/`--date-end`), the social feed (`social list-feed`), `libraries`, the `moderation` queue, `reports`, `tasks` (+ `list-assignables`), `binder`, and per-resource `list-filters-config`. All hit real JSON `/api/...` endpoints.
  - **`create-draft`** — creates an *unsent* draft social post via `POST /api/compose-v2/submit_new` with `state` hard-forced to `save_draft` (never `publish`/`schedule`), so it structurally cannot post or notify; dry-run by default, `--confirm` to create. Generates a fresh `assignment_id` (v4 UUID) per draft like the composer does, and fetches the Rails CSRF token from an app page to send as `X-CSRF-Token` (the write 422s without it). Live-verified against PSD's workspace (HTTP 200, `state:"draft"`).
  - **Cookie auth** — `auth login --chrome` reads the Class Intercom session cookie from Chrome via `pycookiecheat` (base URL `app.classintercom.com`).
  - **Distribution (no committed binaries)** — Go source vendored under `plugins/psd-productivity/skills/class-intercom/cli/`; prebuilt binaries (darwin/arm64, linux/amd64, windows/amd64; pure-Go `modernc.org/sqlite`, `CGO_ENABLED=0`, ~13 MB gzipped) published via GitHub Release and fetched on first run by `scripts/ensure-binary.sh` (falls back to `go build` when offline + Go present). New `.github/workflows/classintercom-cli-release.yml` cross-builds + publishes the gzipped binaries on a `classintercom-cli-v*` tag.

## [2.16.0] - 2026-06-16

### Added
- **`/parentsquare` skill (psd-productivity → 2.14.0)** — self-contained ParentSquare district-data CLI, generated with Printing Press from the live ParentSquare web app (no public API/spec; discovered via authenticated browser-sniff) and hand-extended for PSD:
  - **15 read endpoints** — district student/staff rosters (`dashboard/*.json`), school directories (`/api/v2/schools/{id}/directory`), class rosters (`/api/v2/sections/{id}/students|staff`), district/school/group/class event calendars, user autocomplete search, attendance report contacts, and `/api/v2/districts/{id}/data_health_stats | sync_info | totals`.
  - **`notification-activity`** — parses ParentSquare's server-rendered Notifications Activity report (no JSON API exists for it): per-school / per-staff / per-recipient message counts (posts, DMs, alerts, auto-notices, secure documents), with district→school drill-in and `--section` (school-usage / staff-usage / recipients) / `--resource` / date-range filters.
  - **`create-draft`** — creates an *unsent* draft post; hard-forces `publish_option=DRAFT` and zeroes every recipient include, so it structurally cannot notify anyone (there is no "send" path); dry-run by default, `--confirm` to create.
  - **Cookie auth** — `auth login --chrome` reads the ParentSquare session cookie from Chrome via `pycookiecheat` (host-scoped to `www.parentsquare.com`).
  - **Distribution (no committed binaries)** — Go source vendored under `plugins/psd-productivity/skills/parentsquare/cli/`; prebuilt binaries (darwin/arm64, linux/amd64, windows/amd64; pure-Go, `CGO_ENABLED=0`) published via GitHub Release and fetched on first run by `scripts/ensure-binary.sh` (falls back to `go build` when offline + Go present). New `.github/workflows/parentsquare-cli-release.yml` cross-builds + publishes the gzipped binaries on a `parentsquare-cli-v*` tag.

## [2.15.0] - 2026-05-29

### Added
- **`/html-artifact` data register** (psd-productivity 2.13.0) — the skill can now build self-contained data dashboards, data-rich analytical reports, and data-story / scrollytelling landing pages, alongside the existing document/design/interactive/multi-variant registers.
  - **`references/data-viz.md`** — charting doctrine: inline the dataset as JSON (always self-contained), hybrid rendering (hand-built inline SVG by default; CDN library only for complex/interactive, with a vetted `file://`-safe list — Observable Plot, uPlot, ECharts, Chart.js, D3), and the chart-taste rules (one chart/one message, direct labeling, honest zero baselines, restrained grid, accent-derived color that is never the sole encoding, no chartjunk, humanized numbers, motivated motion, required `role="img"`/aria-label or hidden-table fallback).
  - **`references/dashboard-patterns.md`** — the three page shapes (analytical dashboard, data-story landing, analytical report), tasteful KPI cards (number + comparison context + trend, no gradient), bento/grid layout with mixed cell sizes, sticky filter toolbars that re-render from the inline data, BLUF/findings→recommendations structure, and data-honesty rules.
  - **`assets/chart-snippets.html`** — a reference scaffold with data-driven inline-SVG bar, line+area (with reference line and end label), sparkline, and KPI-card patterns, all reading from an inline JSON block.
  - Wired into SKILL.md routing (new "Data / dashboard" register), nuanced the `anti-slop-bans.md` hero-metric ban (bans the cliché execution, not KPI cards), cross-linked `document-patterns.md`, and added data-specific checks to `preflight-audit.md`.

## [2.14.0] - 2026-05-29

### Added
- **`/html-artifact` skill** (psd-productivity 2.12.0) — generates beautiful, self-contained single-page HTML artifacts with an anti-slop design doctrine synthesized from Thariq's "Unreasonable Effectiveness of HTML" and four open-source taste skills (`pbakaus/impeccable`, `alchaincyf/huashu-design`, `nextlevelbuilder/ui-ux-pro-max-skill`, `leonxlnx/taste-skill`). Routes by register — document/report, design/marketing, interactive editor, multi-variant exploration — and loads only the relevant guidance. Capabilities: self-contained single `.html` (inline CSS/JS, CDN fonts, opens via `file://`, auto-opens in browser via `scripts/open.sh`), interactive editors with copy-as-JSON/markdown/prompt exports, multi-variant comparison grids, and a mechanical pre-flight self-audit gate run against its own output before delivery.
  - **Reference set** (`references/`): `taste-core.md` (typography/color/layout/motion/copy rules + a rotate-don't-default font-pairing list), `anti-slop-bans.md` (reflex-reject fonts, the AI-purple ban, banned beige+brass hex palettes, codex tells with "why" + fixes), `document-patterns.md`, `interactive-patterns.md`, `multivariant.md`, `preflight-audit.md`, and `psd-branding.md`.
  - **Taste-first with opt-in PSD branding** — defaults to distinctive brief-appropriate taste; applies PSD identity (Sea Glass/Pacific palette, Josefin Sans/Slab, real logo files) only on request or for clear PSD audiences, reading values directly from the existing `psd-brand-guidelines` skill's `brand-config.json`/`assets/` (never AI-generated logos). Complements the Anthropic `frontend-design` skill rather than duplicating it.
  - **Structural-only scaffold** (`assets/base-scaffold.html`) ships reset, a11y, `prefers-reduced-motion`, print CSS, fluid type scale, and an embedded pre-flight checklist — deliberately no visual identity, to avoid converging every artifact on the same look.
  - Frontmatter: `model: claude-opus-4-8`, `effort: high`, `extended-thinking: true`, `paths:` scoped.
- **`/board-policy-formatter` skill** (psd-productivity 2.12.0) — reformats a Google Doc, PDF, or Word document into the official PSD school board policy/procedure template with zero text modification (extract → format → fidelity-verify → build docx). Previously developed but untracked; now committed and documented in the skill tables, directory trees, and counts. Scripts: `extract_text.py`, `convert_pdf.py`, `format_policy.py`, `build_docx.py`, `verify_fidelity.py`, `batch_format.py`.

### Changed
- **Upgraded all Opus model references from 4.6 to 4.8** (psd-coding-system 2.4.0 + psd-productivity 2.12.0) — updated `model: claude-opus-4-6` → `model: claude-opus-4-8` across 31 skill frontmatter files (10 psd-productivity + 21 psd-coding-system) and 3 agent frontmatter files (`plan-validator`, `architect-specialist`, `meta-orchestrator`), plus 2 agent documentation references (`agent-native-reviewer`, `configuration-validator`) and the CLAUDE.md "Model Selection" rules/strategy prose. Opus 4.8 is the current Claude Code default frontier model. Historical CHANGELOG entries were intentionally left at their original `4-6`/`4-5` values. Sonnet references remain `claude-sonnet-4-6` (current Sonnet); the hard rule still holds — never put `model: claude-sonnet-4-6` in skill frontmatter, since Sonnet 4.6 rejects the `effort` parameter Claude Code sends (GitHub issue #30795).

## [2.13.1] - 2026-04-29

### Fixed
- **psd-coding-system plugin failed to load** (psd-coding-system 2.3.1) — removed invalid `alwaysLoad` field from the `context7` mcpServers entry in `plugin.json`. The field is not part of the plugin manifest schema and caused `claude plugin validate` to fail with `mcpServers: Invalid input`, which prevented the entire plugin (all skills and agents) from loading. The `alwaysLoad` "adoption" claim from v2.13.0 has been removed from CLAUDE.md's adopted-features table; if/when this is supported in plugin.json the table can be restored.

## [2.13.0] - 2026-04-28

### Added
- **Adopt Claude Code v2.1.83-v2.1.122 features** (psd-coding-system 2.3.0, PR #58, closes #56):
  - **`alwaysLoad` MCP config** (v2.1.121) — Context7 tools (`resolve-library-id`, `query-docs`) eagerly loaded, eliminating deferred-search latency
  - **`$schema` in plugin.json** (v2.1.120) — added to both psd-coding-system and psd-productivity, enables `claude plugin validate`
  - **`keep-coding-instructions: true`** (v2.1.94) — added to work-researcher, learning-writer, and test-specialist agents
  - **`PreCompact` hook** (v2.1.105) — new `pre-compact-context.sh` preserves branch, uncommitted changes, recent commits, and active issue number before context compaction
  - **Agent `mcpServers` frontmatter** (v2.1.117) — framework-docs-researcher, best-practices-researcher, and repo-research-analyst now declare Context7 dependency directly
  - **PostToolUse `outputReplace`** (v2.1.121) — new `redact-secrets.sh` auto-redacts API keys, Bearer tokens, AWS keys, and password assignments from Bash output before Claude sees them (perl-based for macOS BSD portability)

### Fixed
- **learning-writer agent producing zero output** (psd-coding-system 2.3.0, PR #59, closes #57):
  - Added `Bash` tool so the agent can run `mkdir -p` for category directories — previously `Write` failed silently when the directory did not exist
  - Removed stale `TRIGGER_REASON` input field that no skill ever populated
  - Removed "Skip if routine" escape hatch from all six consuming skills (`/work`, `/test`, `/review-pr`, `/lfg`, `/debug`, `/optimize`) — template placeholders were being passed literally and read as "routine," suppressing every learning capture
  - Added `[FILL:]` prefixes to skill prompts to force real data substitution rather than placeholder text
  - Strengthened agent behavior to "Write the learning document" unconditionally
  - Quoted the `mkdir -p` path against special characters in category names
  - Replaced `etc.` shorthand in `/review-pr` CATEGORY list with the exact 11-category enum from the agent definition

## [2.12.0] - 2026-04-27

### Changed
- **`/triage` skill — deep diagnosis + dual FreshService update** (psd-coding-system 2.2.0):
  - New Phase 1.5 fans out three research agents in parallel — `repo-research-analyst`, `git-history-analyzer`, `bug-reproduction-validator` — to produce a Diagnosis Brief (suspected root cause, likely files, related commits, reproduction status, open questions) before invoking `/issue`
  - Diagnosis Brief is appended to the issue description so `/issue` populates Steps to Reproduce / Root Cause / Proposed Fix from real evidence rather than placeholders
  - Captures GitHub issue URL after `/issue` completes; aborts Phase 3 if URL not parseable
  - Phase 3 split into two FreshService writes: a **private internal note** (`POST /tickets/{id}/notes` with `private: true`) carrying the full Diagnosis Brief + GitHub URL, and a sanitized **public reply** to the requester containing the GitHub URL plus a status acknowledgement
- **`/issue` skill — mandatory Completion Criteria** (psd-coding-system 2.2.0):
  - New top-level "Mandatory Completion Criteria" section defines the universal floor every issue must satisfy
  - All three templates (Feature Request, Bug Report, Improvement/Refactoring) gained a Completion Criteria block above their Acceptance Criteria — unit/integration tests, e2e tests, zero lint warnings on touched files, type-check clean, e2e framework scaffold if missing, PR description listing every touched file
  - Each template's Acceptance Criteria now includes an explicit `E2E flow(s) covered:` line with `N/A — <reason>` escape hatch for refactors with no UI surface
- **`/work` skill — strict touched-files quality gate + e2e enforcement** (psd-coding-system 2.2.0):
  - Phase 4 testing replaced with strict per-file lint enforcement: ESLint `--max-warnings 0` for JS/TS, ruff/flake8 for Python, shellcheck for shell, jq for JSON. **Pre-existing warnings on touched files MUST be fixed** — no `eslint-disable`, `# noqa`, or `@ts-ignore` suppressions. TypeScript `tsc --noEmit` runs without error suppression
  - New Phase 4.5 enforces e2e coverage: detects Playwright / Cypress / custom e2e setups and runs them; scaffolds Playwright if no framework exists; honors `E2E flow.*N/A` waiver from the issue body
  - Phase 5 result handling: `PASS_WITH_WARNINGS` is promoted to FAIL when the warning lives on a touched file
  - Phase 6 PR body now includes a Completion Criteria checklist plus a `## Touched Files` list emitted from `git diff --name-only`

## [2.11.0] - 2026-04-23

### Added
- **`/debug` skill — structured root-cause analysis** (psd-coding-system 2.1.0):
  - Reproduce → hypothesize → test → verify → fix → learn workflow
  - Automatic learning capture on completion
- **`/optimize` skill — metric-driven iterative optimization** (psd-coding-system 2.1.0):
  - Baseline measurement → targeted optimization loops → verification
- **correctness-reviewer agent** (psd-coding-system 2.1.0):
  - Validates logical correctness, edge cases, and invariant preservation
- **adversarial-reviewer agent** (psd-coding-system 2.1.0):
  - Stress-tests code against adversarial inputs, race conditions, and failure modes
- **Cross-skill integration test harness** (psd-productivity 2.11.0):
  - Reusable test framework for validating skill interactions and shared infrastructure
- **Shared BaseApiClient refactor** (psd-productivity 2.11.0):
  - Common API client library extracted from duplicate patterns across skills
  - Consistent error handling, rate limiting, and retry logic

### Changed
- **Claude Code feature adoption** (psd-coding-system 2.1.0): Updated skills and agents for latest Claude Code capabilities (PR #49)
- **`/clean-branch` fix** (psd-coding-system 2.1.0): Corrected branch cleanup logic (PR #51)
- **Skill hardening from MV migration** (psd-productivity 2.11.0): Robustness improvements to skills based on lessons learned from McKinney-Vento DocuSign migration (PR #42)

### Fixed
- `/clean-branch` skill now correctly handles edge cases in post-merge cleanup

## [2.10.0] - 2026-04-17

### Added
- **n8n-manager: MCP-based folder management** (psd-productivity 2.10.0):
  - `n8n_mcp_client.js` — shared MCP client for n8n's native MCP server (JSON-RPC, bearer token auth)
  - `list_folders.js` — list folders via MCP `search_folders` tool
  - `manage_folders.js` — folder/tag management: list, search, organize report, ensure standard tags, tag workflows
  - 8 standard PSD tags: `psd-production`, `psd-ess`, `psd-google`, `psd-infrastructure`, `psd-evaluations`, `psd-timesheets`, `psd-compliance`, `psd-documenso`
  - Folder structure conventions: ESS Evaluations, ESS Timesheets, ESS Compliance, PSD Infrastructure, PSD Servers
  - Organization audit report: missing folders, missing tags, naming compliance
  - Auto-discovers projectId from workflow shared field (MCP search_projects returns personal projects)
- **pdf-builder: custom table column widths** — `col_widths` property (fractional array) for non-uniform table columns
- **pdf-builder: custom table row height** — `row_height` property on table sections
- **letterhead: bold department name** — department line in contact block now renders in Inter-Bold

### Changed
- **n8n-manager SKILL.md** — added folder & organization command reference, folder structure table, standard tags table, folder creation note (UI only — public API limitation)

## [2.9.0] - 2026-04-02

### Added
- **`/docusign` skill — DocuSign migration and export manager** (psd-productivity 2.9.0):
  - JWT authentication with RSA-SHA256 signing, token caching, auto-refresh, base URI discovery
  - Token bucket rate limiter for 3,000 calls/hour API limit
  - Template operations: list, get, export as Documenso JSON, download PDFs with field coordinate mapping
  - Envelope operations: list/search, get, download signed PDFs, download audit trails/certificates
  - PowerForm operations: list, get with migration hints
  - Account inventory export (templates, PowerForms, groups, brands, envelope stats by year)
  - Bulk download with checkpointing for 55K+ envelopes (~18 hours), resume, retry, progress reporting
  - 20-day migration plan, DocuSign→Documenso mapping guide, JWT setup guide
  - 13 scripts, 3 reference docs, no npm dependencies

## [2.8.2] - 2026-04-02

### Added
- **n8n-manager**: Naming convention table for workflows, envelopes, templates, and Drive files. Multi-page form data merge warning with code example in node catalog.
- **documenso-manager**: Envelope naming convention documentation (title prefix pattern used by router for dispatching).
- **pdf-builder**: Duplicate field label warning (same label produces same manifest slug, losing one field's position). Spacer page break tip (~80pt after signatures pushes next section to new page).

## [2.8.1] - 2026-04-01

### Added
- **n8n-manager**: Community Edition limitations section, Code node sandbox restrictions (complete available/unavailable list), Form Trigger branding guide (iframe workaround, CSS variables, deactivation cycle), Google Sheets gotchas (auto-map pitfalls, schema format), Google Drive known issues (download bug, template server workaround), API deployment gotchas (shell escaping, `__rl` format, settings stripping, body serialization), 3 new workflow templates (Document Completion Router, Asset Server, Error Notification Handler), expanded tag convention
- **documenso-manager**: Field pre-filling section (`fieldMeta.text` + `readOnly` pattern with examples), webhook ID mismatch warning (numeric vs `envelope_xxxxx`), `envelopeItems` naming documentation, webhook management UI-only note, signing preview CSS bug #2669 documentation, same-email deduplication warning
- **pdf-builder**: Custom `height` property on `field_row` fields (for textarea-sized boxes), Template Server pattern section (base64-embedded webhook serving), critical n8n gotchas in integration guide (sandbox, shell escaping, form URLs, hidden fields, resource locator format)

### Changed
- **pdf-builder/generate_pdf.py**: `field_row` now supports per-field `height` property (default 22pt, configurable per field)

## [2.8.0] - 2026-04-01

### Added
- **`/pdf-builder` skill — branded PSD PDF generator** (psd-productivity 2.8.0):
  - **Branded letterhead system**: PSD horizontal logo, Pacific (#25424C) color bar, district address/phone/website, Sea Glass (#6CA18A) accent lines, page-aware footer with page numbers
  - **Font system**: Inter Regular/Bold (Google Fonts) for body/form fields, Josefin Sans Bold for headings — clean, legible form typography separate from brand display fonts
  - **3 scripts**: `generate_pdf.py` (core generator with JSON spec + template modes), `letterhead.py` (letterhead module), `install_fonts.py` (one-time font downloader from Google Fonts CDN)
  - **8 built-in templates**: permission-slip, employment-agreement, contractor-agreement, policy-acknowledgment, field-trip-waiver, board-resolution, leave-request, generic-form
  - **7 section types**: heading, paragraph, field_row (labeled input boxes), checkbox_group, table, signature_block (multi-signer), spacer, divider
  - **Documenso field manifest**: every PDF outputs a `.fields.json` with percentage coordinates (0-100) that map directly to Documenso's `add_fields` API — automatic reportlab-to-Documenso coordinate conversion
  - **10 field types**: TEXT, DATE, NAME, EMAIL, NUMBER, SIGNATURE, INITIALS, CHECKBOX, DROPDOWN, MULTILINE_TEXT — all with correct Documenso outer/inner type mapping
  - **Dual-mode operation**: interactive via `/pdf-builder` in Claude + scriptable via `uv run generate_pdf.py --json/--template` for n8n automation
  - **Template data variables**: `{{variable}}` substitution in paragraph text + pre-filled field values
  - **Multi-page support**: page 1 letterhead + continuation page headers with document title
  - **4 reference docs**: coordinate-system.md (reportlab↔Documenso conversion), field-manifest-spec.md (JSON schema), document-layouts.md (page structure, sizing), n8n-integration.md (complete workflow pattern)
  - **n8n workflow pattern**: webhook → build spec → generate PDF → create Documenso envelope → add fields from manifest → distribute

## [2.7.0] - 2026-03-31

### Added
- **`/documenso` skill — document signing manager** (psd-productivity 2.7.0):
  - **Two-layer architecture**: official Documenso SDK MCP server for document/template discovery + 23 custom Bun/JS scripts for full v2 REST API CRUD
  - **23 scripts**: documenso_client.js (shared HTTP client with `api_xxx` auth), health_check.js, 6 envelope management scripts (list/get/create/update/delete/duplicate), 4 distribution scripts (distribute/redistribute/download/audit-log), 6 recipient & field scripts (add/update/remove for both), 4 template & folder scripts (list/get/use-template, list/create folder), documenso-mcp-proxy.sh
  - **Envelope builder protocol**: natural language → design recipients/fields → create with PDF upload → place signature fields → distribute for signing → track → download signed PDF
  - **4 reference documents**: API reference (v2 endpoints, 11 field types, 5 recipient roles, 13 webhook events), envelope lifecycle (states, field positioning guide with percentage coordinates), 8 PSD signing template patterns (employment contract, coaching stipend, vendor MOU, board acknowledgement, field trip permission, media release, facility use, substitute agreement), end-to-end PSD signing workflows with n8n integration patterns
  - **Safety guardrails**: never auto-distribute (sends real emails), confirm before delete, field coordinate validation (rejects >100%), status-aware operations
  - **n8n integration**: added Documenso to n8n-manager's PSD integration map with auth method, webhook events, community node reference, and key workflow pattern (HR template → sign → webhook → Google Drive)
  - **Server URL never hardcoded** — all scripts read DOCUMENSO_HOST from environment/secrets
  - **API gotchas documented**: auth is NOT Bearer (literal `api_xxx`), field coordinates are percentages (0-100) not pixels, `fieldMeta.type` must be lowercase, `placeholder` field is required, batch endpoints use `data` key not named arrays

### Changed
- **`secrets.js`** — added `SECRETS.documenso` namespace (host, apiKey)
- **`secrets.py`** — added DOCUMENSO_HOST, DOCUMENSO_API_KEY to KNOWN_SECRETS and VAULT_MAP
- **`plugin.json`** (psd-productivity) — added Documenso MCP server, updated description and skill count (29→30)
- **n8n integration map** — added Documenso section with auth, endpoints, webhook events, community node info

## [2.6.0] - 2026-03-31

### Added
- **`/n8n` skill — comprehensive n8n workflow automation manager** (psd-productivity 2.6.0):
  - **Three-layer architecture**: n8n native Instance MCP (workflow discovery/execution), czlonkowski/n8n-mcp (1,396 node docs + 2,709 templates), and 24 custom Bun/JS scripts for full REST API CRUD
  - **24 scripts**: n8n_client.js (shared HTTP client with cursor-based pagination), health_check.js, 7 workflow management scripts (list/get/create/update/delete/activate/deactivate), validate_workflow.js (catches duplicate node names and broken connections), deploy_workflow.js (validate + create + auto-inject settings), trigger_workflow.js (webhook POST), 3 execution scripts (list/get/retry), 3 credential scripts (list/schema/create), 2 tag scripts, 2 variable scripts, run_audit.js, n8n-mcp-proxy.sh (dynamic MCP proxy reading host from .env)
  - **Workflow builder protocol**: natural language → design → generate JSON → validate → deploy → test → activate
  - **4 reference documents**: workflow JSON spec (connection model, node format), node catalog (15+ common nodes with JSON snippets), PSD integration map (Freshservice, PowerSchool, Google Workspace, Red Rover, Slack credential configs), 7 PSD workflow templates (equipment request, absence digest, student intake, report scheduler, health monitor)
  - **Safety guardrails**: confirm before destructive actions, enforce unique node names, tag convention (psd-production/staging/template), no direct production edits, webhook authentication required
  - **Server URL never hardcoded** — all scripts and MCP proxy read N8N_HOST from environment/secrets for easy migration
- **`secrets.js` — JavaScript secrets manager** (psd-productivity 2.6.0):
  - Created `plugins/psd-productivity/scripts/secrets.js` as JS counterpart to secrets.py
  - Fixes 18 existing broken freshservice-manager and redrover-manager scripts that referenced non-existent secrets.js
  - Priority chain: environment variables → `~/Library/Mobile Documents/.../Geoffrey/secrets/.env`
  - Service-specific namespaces: `SECRETS.freshservice`, `SECRETS.redrover`, `SECRETS.n8n`, `SECRETS.openai`, etc.
  - CLI mode: `bun secrets.js` shows availability of all known secrets

### Fixed
- **`secrets.py` ENV_FILE path** — corrected from `~/.config/psd-productivity/.env` (didn't exist) to actual location at `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env`
- **`secrets.py` KNOWN_SECRETS** — added N8N_HOST, N8N_API_KEY, N8N_MCP_TOKEN, RED_ROVER_USERNAME, RED_ROVER_PASSWORD

### Changed
- **`plugin.json`** (psd-productivity) — added n8n-instance and n8n-docs MCP servers, updated description and skill count (28→29)

## [2.5.8] - 2026-03-20

### Improved
- **`/slides-to-site` thumbnail automation** (psd-productivity 2.5.6) — replaced broken `gws drive files export` with Slides API `presentations.pages.getThumbnail` endpoint. Automatically fetches a 1600×900 PNG of the first slide and downloads it via curl, eliminating the need for manual screenshot capture.

## [2.5.7] - 2026-03-20

### Added
- **`/slides-to-site` skill** (psd-productivity 2.5.5) — converts Google Slides presentations into psd401.ai presentation pages. Reads full slide content via `gws slides`, collects metadata interactively, generates properly formatted markdown with frontmatter, exports thumbnails, and supports batch mode with commit-and-push to trigger Amplify deploy.

## [2.5.6] - 2026-03-20

### Fixed
- **`/enrollment` skill — speed & reliability overhaul** (psd-productivity 2.5.4):
  - **P223 never skipped**: Report order now strictly numbered STEP 1–8 with P223 as `[REQUIRED]` first — if P223 fails, execution stops immediately instead of silently continuing with backup reports
  - **Anti-stopping mandate**: Added completion-driven loop (Ralph-Loop pattern) that defines DONE and loops until all 17 schools are processed — replaces linear step list that invited stopping at school boundaries
  - **Context window pressure**: Added context management rules — no `take_snapshot` unless debugging, use `evaluate_script` for data extraction, `take_screenshot` with `filePath` for archival (prevents 50KB+ DOM snapshots from filling context)
  - **daysToScan=3 bug**: Consecutive Absence `daysToScan` field defaults to 3 in some school contexts — added explicit JS override to force 20 and post-run header verification
  - **District-level batching**: Restructured `/enrollment run` into Phase 1 (district batch: P223 + Enrollment Summary + Consecutive Absence at District Office level) → Phase 2 (per-school completion loop) → Phase 3 (post-reports) — estimated 50% time reduction pending live validation
  - **BUILD-PLAN.md**: Added Phase 7 documenting root causes, fixes, and district-level batching items needing live testing

## [2.5.5] - 2026-03-17

### Fixed
- **`/clean-branch`, `/bump-version`, `/triage`, `/evolve`, `/setup`, `/worktree`, `/changelog`, `/swarm`** (psd-coding-system 2.0.3) — completed the sonnet→opus fix missed in v2.5.4. All 8 remaining skills with `model: claude-sonnet-4-6` + `context: fork` were also failing due to the same Claude Code v2.1.68+ effort parameter regression. Zero `model: claude-sonnet-4-6` entries remain in any SKILL.md.

## [2.5.4] - 2026-03-17

### Fixed
- **`/review-pr`, `/security-audit`, `/test`** (psd-coding-system 2.0.2) — changed `model: claude-sonnet-4-6` → `model: claude-opus-4-6` + `effort: high` to fix API 400 errors caused by Claude Code v2.1.68+ unconditionally sending the `effort` parameter to all model invocations. Sonnet 4.6 does not support `effort`; Opus 4.6 does. (GitHub issue #30795)
- **`/enrollment`, `/browser-control`, `/chief-of-staff`, `/google-workspace`** (psd-productivity 2.5.3) — same model fix applied to all four skills that had `model: claude-sonnet-4-6` in frontmatter.
- **CLAUDE.md** — added "Model Selection Rules for Skills" section documenting the constraint: never explicitly specify `model: claude-sonnet-4-6` in skill frontmatter while Claude Code default is Opus 4.6. Lightweight skills without a `model:` field are safe (they inherit the default).

## [2.5.3] - 2026-03-15

### Changed
- **`/work`, `/lfg`, `/review-pr`, `/security-audit`** — eliminated the GitHub issue creation escape hatch from all implementation skills. These skills no longer call `gh issue create` for findings discovered during a session. Every flagged issue must be fixed inline. If a fix is genuinely blocked by an external constraint, the skill now stops and uses `AskUserQuestion` to ask the user how to proceed — no TODOs, no deferred issues.
- **`/review-pr` Phase 2 agent prompts** — all 8 conditional feedback agents (security, performance, test, architecture, telemetry, shell/DevOps, configuration, UX) now require direct code implementation rather than analysis-and-recommend. Prompts changed from "Analyze and provide solutions" to "Analyze... then implement fixes directly. Do not just report — make the code changes."

## [2.5.2] - 2026-03-14

### Fixed
- **`enrollment` skill — `report-checklist.md`** — corrected 5 broken/missing automation patterns discovered during live DES run:
  - **P223 URL**: `/admin/reports/compliance/p223form.html` 404s — replaced with `statereports.html?repType=state` + JS link finder
  - **P223 form scroll**: `window.scrollTo` has no effect; must use `document.getElementById('content-main').scrollTop = 1200`
  - **P223 output**: documented ZIP download + bash extract/rename command for `WA_P223_Form.pdf` and `WA_P223_Audit.csv`
  - **Enrollment Summary date trigger**: Tab key pattern does not work — jQuery datepicker `onSelect` skips if `lastVal === date`; correct pattern clears `data.lastVal = null` then calls `data.settings.onSelect.call(input, date, data)`
  - **`wait_for` false positives**: `"Completed Reports"` and `"Result File"` match static DOM elements before reports finish; replaced with `["Download Completed", "Download Pdf"]` for queue polls and `["Total In Grade"]` for Enrollment Summary
  - **Session health check**: added pre-flight JS snippet to detect expired PS sessions before starting reports

## [2.5.1] - 2026-03-13

### Fixed
- **`enrollment` skill** — removed non-functional `powerschool-navigator` agent; subagents cannot inherit Chrome DevTools MCP tools from parent session. All PowerSchool browser automation now runs directly in the main session.
- **`enrollment` skill** — reordered report sequence: P223 Form and Audit moved to first position as the primary EDS deliverable. Added pre-flight checklist (disable Brave "Ask where to save" setting). Added proven `evaluate_script` JS patterns for all report forms.
- **`report-checklist.md`** — added direct URLs, explicit JS field patterns, and save commands for each report type. Documented Entry/Exit auto-refresh behavior (no submit button), Class Attendance Audit radio/checkbox patterns, and Consecutive Absence multi-select picker.
- **`browser-control/SKILL.md`** — replaced stale powerschool-navigator delegation reference with main-session automation guidance.

## [2.5.0] - 2026-03-13

### Fixed
- **`enrollment` skill** — restored 18 `mcp__chrome-devtools__*` tools to `allowed-tools` and switched browser automation from agent delegation to direct MCP tool use. The `powerschool-navigator` agent cannot access MCP tools when invoked as a subagent (MCP servers are not propagated to subagent contexts), so the enrollment skill now drives PowerSchool navigation directly. The original rate limit errors were caused by the 1M context window model variant, not the MCP tool declarations.

## [2.4.0] - 2026-03-13

### Fixed
- **`enrollment` skill** — removed 18 `mcp__chrome-devtools__*` tools from `allowed-tools` that caused "Rate limit reached" errors on skill load. Browser automation is delegated to the `powerschool-navigator` agent which declares its own Chrome DevTools tools, so the enrollment skill never needed direct MCP tool access.

## [2.3.0] - 2026-03-13

### Added
- **Browser control skill** (`/browser-control`) — browser automation for authenticated web apps using Chrome DevTools MCP, replacing unreliable Claude-in-Chrome integration
  - Connects to Brave Browser Nightly via `--remote-debugging-port=9222` to bypass PSD district MDM restrictions on Chrome remote debugging
  - Persistent debug profile at `~/.psd-browser-automation` preserves login sessions across restarts
  - Launch script with status check, headless mode support
  - 30 Chrome DevTools MCP tools: navigation, clicking, form filling, screenshots, snapshots, JavaScript evaluation, network inspection
- **Chrome DevTools MCP server** — declared in `psd-productivity` plugin.json `mcpServers` for automatic registration on plugin install

### Changed
- **`powerschool-navigator` agent** — migrated from 11 `mcp__claude-in-chrome__*` tools to 18 `mcp__chrome-devtools__*` tools + Bash
- **`enrollment` skill** — migrated from 10 `mcp__claude-in-chrome__*` tools to 17 `mcp__chrome-devtools__*` tools, added browser launch prerequisite
- **`psd-productivity`** — 26 → 27 skills
- **All version references** bumped to 2.3.0

## [2.2.1] - 2026-03-13

### Fixed
- **Model identifiers** — all `psd-productivity` skills and agents used invalid `sonnet-4-6` model ID instead of `claude-sonnet-4-6`, causing skill launch failures
  - Skills: `enrollment`, `chief-of-staff`, `google-workspace-cli`
  - Agents: `powerschool-navigator`, `enrollment-validator`

## [2.2.0] - 2026-03-13

### Added
- **P223 enrollment automation** (`/enrollment`) — complete rewrite from placeholder to 13-command workflow automating Peninsula School District's monthly state enrollment reporting
  - 6 reference docs extracted from P223 Compliance Form, PSD Comprehensive Enrollment Reporting Manual, and 25-26 Enrollment Handbook
  - 7 Python scripts: FTE calculator, enrollment validator, month-over-month comparison, entry/exit balancer, ALE reconciler, Running Start reconciler, validation report + EDS import generator
  - `powerschool-navigator` agent — Claude-in-Chrome browser automation for 9 PowerSchool report types with correct parameters per school level (ES/MS/HS)
  - `enrollment-validator` agent — 9 validation checks (headcount consistency, FTE calc, 20-day absence, entry/exit balance, RS cap, program compliance, teacher assignment, FTE override audit, non-FTE course check)
- **Google Workspace CLI skill** (`/google-workspace`) — shared skill providing Drive, Sheets, Gmail, Calendar, Chat, and Docs access via `gws` CLI with multi-account auth support
- **`.gitignore`** — added Python `__pycache__` and `.pyc` patterns

### Changed
- **`psd-productivity`** — 25 → 26 skills, 0 → 2 agents
- **All version references** bumped to 2.2.0

## [2.1.0] - 2026-03-13

### Added
- **23 skills migrated to `psd-productivity`** from Geoffrey personal assistant — plugin now has 25 total skills (23 new + 2 existing placeholders)
- **Productivity** (3): `freshservice-manager`, `redrover-manager`, `legislative-tracker`
- **Content & Document Generation** (9): `writer`, `docx`, `pptx`, `pdf`, `pdf-to-markdown`, `xlsx`, `presentation-master`, `assistant-architect`, `sop-creator`
- **Research & Intelligence** (3): `research`, `multi-model-research`, `strategic-planning-manager`
- **Audio & Media** (3): `elevenlabs-tts`, `local-tts`, `image-gen`
- **Planning & Decision-Making** (2): `seven-advisors`, `skill-creator`
- **PSD-Specific** (3): `psd-athletics`, `psd-brand-guidelines`, `psd-instructional-vision`

### Changed
- **`psd-productivity` plugin.json** — version 2.0.0 → 2.1.0, updated description and keywords
- **marketplace.json** — version 2.0.0 → 2.1.0, updated psd-productivity entry
- **All documentation** — CLAUDE.md, README.md, psd-productivity README updated with full skill inventory

## [2.0.0] - 2026-03-13

### Changed
- **Marketplace rebranded** from `psd-claude-coding-system` to `psd-claude-plugins` — now a multi-plugin marketplace for Claude Code and Claude Cowork
- **Coding plugin renamed** from `psd-claude-coding-system` to `psd-coding-system` — directory, plugin.json name, and all 87 `subagent_type` references updated
- **Repository name** changed from `psd-claude-coding-system` to `psd-claude-plugins`
- **Version bumping** now covers 7 locations (added `psd-productivity` plugin.json)

### Added
- **`psd-productivity` plugin** scaffolded as a new independently installable plugin for general-purpose productivity workflows, designed for both Claude Code and Claude Cowork
- **`/enrollment` skill** (placeholder) — enrollment workflow for PSD families
- **`/chief-of-staff` skill** (placeholder) — daily briefings, priority management, and executive support
- **Multi-plugin marketplace architecture** — `marketplace.json` now lists two plugins that can be installed independently

### Removed
- **`psd-claude-coding-system` name** — replaced by `psd-coding-system` (shorter, cleaner)

## [1.28.1] - 2026-03-10

### Fixed
- **Anti-deferral mandate** added to `/work`, `/review-pr`, and `/lfg` skills — explicit instruction to fix all findings now, with legitimate deferrals requiring a GitHub issue via `gh issue create` (not PR comments or TODOs)
- **"Consider for Improvement" deferral language** removed from 5 agents (`security-analyst-specialist`, `telemetry-data-specialist`, `configuration-validator`, `shell-devops-specialist`, `security-scan`) — replaced with "Low Priority (Fix Before Merge)"
- **"Non-blocking" warnings** in `work-validator` changed to "must fix" — all findings now labeled as requiring action
- **P3 severity label** in `/review-pr` changed from "Suggestions (Non-Blocking)" to "Low Priority (Fix Before Merge)"
- **"Consider Refactoring"** in `pattern-recognition-specialist` changed to "Refactor Now"
- **PASS_WITH_WARNINGS handling** in `/work` tightened from soft "fix the warnings" to "fix ALL warnings — they are issues, not suggestions"
- **Follow-up issue escape hatch** removed from `/review-pr` — replaced with rule that legitimate deferrals must become GitHub issues, never PR comments

## [1.28.0] - 2026-03-09

### Added
- **`/evolve` skill drift detector** — Phase 1 scans all `SKILL.md` files for deferral language (`consider`, `optional`, `if needed`, `where reasonable`, `follow-up issue`) and flags files with >5 hits as behavioral drift candidates. Catches cross-cutting work-avoidance patterns before they affect output quality.
- **`/evolve` learning capture health check** — After TTL cleanup, warns if <3 learnings exist despite >5 commits in last 14 days. Helps detect when learning-writer is underactive.
- **`/evolve` issue → implementation pipeline** — Phase 5 now lists issues created in Phase 4.5 with `/work #N` commands, eliminating the manual context switch from identification to implementation.
- **`/bump-version` cache refresh prompt** — After `git push origin vX.Y.Z`, the skill prompts to run `/reload-plugins`, preventing recurring stale cache warnings in subsequent `/evolve` runs.
- **`deployment-verification-agent` and `bug-reproduction-validator`** added to `/setup` config schema — these conditional agents were previously omitted despite being dispatched by `/review-pr`.

### Changed
- **`/review-pr` Phase 0.7** — Now reads `.claude/review-config.json` (created by `/setup`) before agent dispatch. Agents set to `false` are skipped via `agent_enabled()` helper, making `/setup` integration functional.
- **`/setup` `show` command** — Now calls `exit 0` after displaying config instead of falling through to interactive agent selection.
- **`/setup` agent count** — Corrected from "14" to "20" throughout; added 2 missing context-triggered agents; renumbered language reviewers 15–18 → 17–20.

### Fixed
- **`grep -c || echo 0` double-output bug** in `/evolve` drift check — `grep -c` outputs `0` on no-match but exits 1, causing `|| echo 0` to append a second `0`, breaking arithmetic comparison with "integer expression expected". Fixed with `HITS=${HITS:-0}` pattern.
- **`printf` format string vulnerability** in `/evolve` drift check — `printf "$DRIFT_FILES"` used variable as format string. Fixed to `printf "%s" "$DRIFT_FILES"`.
- **Learning health check ran before TTL cleanup** — `TOTAL_LEARNINGS` was counted pre-deletion, inflating the check. Moved to after TTL cleanup block.
- **`/deepen-plan` argument-hint** — Removed unimplemented `'clipboard'` option that was never handled in Phase 1.

## [1.27.0] - 2026-03-09

### Added
- **`/changelog` skill** — Auto-generate structured Keep-a-Changelog entries from git history. Reads commits since a tag, classifies into Added/Changed/Fixed categories, and optionally inserts into CHANGELOG.md. Eliminates manual changelog writing in the `/bump-version` workflow.
- **`/deepen-plan` skill** — Parallel per-section plan research. Takes a plan file from `/architect` or `/scope` and spawns research agents simultaneously — best-practices-researcher for high-risk sections, framework-docs-researcher for medium-risk, learnings-researcher for low-risk. Produces annotated plan with research notes inline.
- **`/setup` skill** — Per-project review agent configuration. Interactive setup creating `.claude/review-config.json`; `/review-pr` now reads this config (Phase 0.7) and skips agents set to `false`. Supports `show`, `reset`, and selective disable by number across all 20 review and language agents.

## [1.26.0] - 2026-03-09

### Added
- **`effort: high` on all opus-based skills and agents** — Since Claude Code v2.1.68, Opus 4.6 defaults to medium effort for Max/Team subscribers. Explicitly setting `effort: high` prevents silent degradation of reasoning depth on critical skills (`/work`, `/lfg`, `/brainstorm`, `/issue`, `/architect`, `/scope`, `/product-manager`) and agents (`plan-validator`, `meta-reviewer`, `architect-specialist`).
- **WorktreeCreate/WorktreeRemove hooks** — New hook events (v2.1.50, fixed in v2.1.69) auto-symlink `.env` into new worktrees and log cleanup on removal.
- **Plugin `settings.json`** — Ships recommended default auto-allow permissions for `gh`, `git`, and Context7 MCP tools (v2.1.49 feature).

### Changed
- **CLAUDE.md and `/evolve`** — Reference `/reload-plugins` command (v2.1.69) as primary refresh method instead of manual git pull + `/plugin install`.

### Deferred (evaluation needed)
- `/simplify` and `/batch` integration into workflows (items 7-8)
- HTTP hooks for external notifications (item 9)
- `InstructionsLoaded` hook for version display (item 10)
- Auto-memory vs learning system relationship (item 14)
- `includeGitInstructions` setting (item 15)
- `isolation: worktree` coverage audit for review agents (item 17)

## [1.25.1] - 2026-03-02

### Changed
- **Eliminate work deferral across skills** — Skills now fix all identified issues instead of deferring them as "suggestions to consider" or "follow-up issues"
- **`/review-pr`** — P3 findings must be fixed (not "applied where reasonable"), removed "Outstanding Items" section from PR comment template, follow-up issues only allowed for true scope-creep (unrelated to PR's purpose)
- **`/security-audit`** — Renamed "Suggestions (Consider for Improvement)" tier to "Low Priority (Fix Before Merge)", hardened Required Actions to say "Fix" not "Consider", added Step 3 to actually fix all findings after posting the review comment
- **`/lfg`** — P3 items are now fixed instead of skipped, commit message updated to reflect P1/P2/P3 fixes, PASS_WITH_WARNINGS requires fixing before proceeding
- **`/work`** — PASS_WITH_WARNINGS now requires fixing warnings before proceeding to PR creation instead of just noting them in PR body

## [1.25.0] - 2026-02-28

### Added
- **Iterative `/review-pr`** — Multi-round PR feedback handling. Rounds 2+ only process new comments since last run via PR comment markers (`<!-- review-pr:round:N:timestamp:T:sha:S -->`).
- **Phase 0.5: Incremental Detection** — Searches PR comments for round markers, sets `INCREMENTAL` mode with `SINCE_TIMESTAMP` filtering on all comment fetches.
- **`--full` flag** — Force complete re-review on any round: `/review-pr 123 --full`.
- **Early exit on no new feedback** — Incremental runs with no new comments exit gracefully with "PR up to date" message.

### Changed
- **Always-on structural agents skipped on rounds 2+** — architecture-strategist, code-simplicity-reviewer, pattern-recognition-specialist only run on Round 1. Incremental runs focus on addressing new reviewer feedback.
- **Phase 4 summary comment** — Now includes round marker with timestamp and HEAD SHA for stateless cross-session tracking.
- **All `$ARGUMENTS` references → `$PR_NUMBER`** — Supports `--full` flag parsing without breaking gh commands.
- **Learning capture** — Includes round number and incremental context in learning-writer prompt.
- **Learnings gitignored** — `docs/learnings/**/*.md` no longer committed to git. Learning files are local working data; agents build knowledge as you work.
- **90-day TTL on learnings** — `/evolve` Phase 1 now auto-deletes learning files older than 90 days (based on `date:` frontmatter). Runs on every `/evolve` invocation regardless of priority.

## [1.24.0] - 2026-02-28

### Added
- **`/bump-version` skill** — automates the 6-file version bump ritual. Reads current version from plugin.json, increments based on patch/minor/major argument, patches all 6 locations, prompts for CHANGELOG entry, commits, tags, and pushes.
- **`/evolve` Phase 0** — cache staleness check comparing repo version vs installed plugin cache version. Warns user with refresh command when stale.

### Fixed
- **`/evolve` Phase 4.5 repo detection** — multi-fallback chain: `gh repo view` → `git remote get-url origin` parsing → explicit warning. Fixes silent failure when `gh repo view .` fails in subdirectories.
- **`/evolve` Phase 4.5 label creation** — idempotent `evolve-feedback` label creation before issue creation. No more "label not found" errors on first run.
- **Item 5 from #27 (auto-commit state)** — moot since `.evolve-state.json` was gitignored in v1.23.0

### Changed
- **Skill count** 15 → 16

## [1.23.0] - 2026-02-28

### Added
- **`/brainstorm` skill** — collaborative requirements exploration using opus. Produces structured briefs with approaches, risks, and recommended next step before `/scope` or `/work`.
- **`/worktree` skill** — user-invocable git worktree management (create, list, remove, clean). Supports issue-number-based branch creation for parallel development.
- **`/swarm` skill** — orchestrates parallel agent teams. Falls back to Task-parallel dispatch when Agent Teams is not enabled. Decomposes tasks into parallelizable work units with dependency ordering.
- **`isolation: worktree`** added to deployment-verification-agent, data-migration-expert, work-validator (from #25)
- **`background: true`** added to learning-writer agent (from #25)
- **`.evolve-state.json` gitignored** — local per-machine state no longer tracked in git

### Changed
- **Skill count** 12 → 15

## [1.22.0] - 2026-02-27

### Changed
- **`/evolve` Phase 4.5 — Issue Routing** — Rewrote the feedback loop to detect whether `/evolve` is running inside the plugin repo or a consumer project. Findings are now classified as plugin-level or project-specific and routed to the correct GitHub repo. Previously, all issues were hardcoded to `psd401/psd-claude-coding-system` even when findings were project-specific.

## [1.21.0] - 2026-02-27

### Added
- **`/evolve` skill** - Zero-argument auto-decision command that reads system state and picks the highest-value action. Priority cascade: deep pattern analysis (≥8 unanalyzed learnings) → Claude Code release gap check → universal pattern contribution → plugin comparison → automation concepts → health dashboard
- **`.evolve-state.json`** - State tracking file at `docs/learnings/.evolve-state.json` recording timestamps of last analysis, release check, comparison, and concepts extraction
- **Plugin feedback loop** - `/evolve` Phase 4.5 auto-creates GitHub issues on psd401/psd-claude-coding-system when findings require plugin changes

### Removed
- **7 knowledge skills consolidated into `/evolve`**: `/compound`, `/meta-review`, `/meta-health`, `/claude-code-updates`, `/compound-plugin-analyzer`, `/compound-concepts`, `/contribute-pattern`

### Changed
- **Skill count** 18 → 12 (removed 7, added 1)
- **All documentation** updated to reference `/evolve` instead of removed skills
- **README.md** Quick Start and usage examples updated
- **CLAUDE.md** skill lists, directory trees, and data flow diagrams updated

## [1.20.1] - 2026-02-26

### Changed
- **GPT model upgrade** - `gpt-5.2-pro` → `gpt-5.3-codex` in gpt-5-codex agent and plan-validator agent
- **Gemini model upgrade** - `gemini-3-pro-preview` → `gemini-3.1-pro-preview` in gemini-3-pro agent
- **Codex reasoning effort** - Upgraded `model_reasoning_effort` from "high" to "xhigh" in gpt-5-codex and plan-validator agents

## [1.20.0] - 2026-02-18

### Added
- **Context7 MCP server** - Live framework docs for 100+ frameworks via `resolve-library-id` and `query-docs` tools. Configured in plugin.json, no API key required
- **`/lfg` skill** - Autonomous end-to-end workflow: implement → test → review → fix → learn. Delegates 5 of 10 phases to Task agents for context budget management. Dispatches test-specialist, work-validator, security-analyst-specialist, and language reviewers
- **Swarm orchestration documentation** - `docs/patterns/swarm-orchestration.md` documenting Agent Teams (experimental) leader/teammate/inbox pattern for future integration

### Changed
- **Learning capture now always-run** - `/work` (Phase 7), `/test` (Phase 6), `/review-pr` (Phase 6) always dispatch learning-writer agent instead of conditional triggers. Agent handles deduplication and novelty detection internally
- **plugin.json description/keywords cleaned** - Removed stale "telemetry", "self-improving", "meta-learning" references from plugin.json and marketplace.json
- **Skill count** 17 → 18 (added `/lfg`)

## [1.19.0] - 2026-02-18

### Added
- **`learning-writer` agent** (workflow) - Lightweight automatic learning capture agent with `memory: project`. Deduplicates against existing learnings and writes to `docs/learnings/{category}/`
- **`meta-reviewer` agent** (meta) - Deep analysis of accumulated learnings and agent memory. Uses opus-4-6 with `memory: project` and extended-thinking. Complete rewrite of the former meta-orchestrator
- **`/meta-review` skill** - On-demand analysis of accumulated learnings, producing prioritized improvement roadmaps via meta-reviewer agent
- **Conditional learning capture** in `/work` (Phase 7), `/test` (Phase 6), `/review-pr` (Phase 6) — triggers only when notable patterns detected (3+ errors, self-healing activated, P1 issues found, etc.)
- **`memory: project`** frontmatter on 4 agents: learnings-researcher, work-researcher, test-specialist, learning-writer, meta-reviewer — enables cross-session knowledge retention

### Changed
- **Sonnet 4.5 → 4.6** - Upgraded `claude-sonnet-4-5` to `claude-sonnet-4-6` across all 51 agent and skill files
- **`/meta-health` rewritten** - Replaced 759-line aspirational dashboard with simple, honest health check that counts learnings, lists agent memory files, and shows recent activity
- **hooks.json stripped** to PostToolUse only — removed SessionStart, UserPromptSubmit, SubagentStop, and Stop hook events
- **Agent counts** updated: 43 → 42 total, meta 3 → 1, workflow 3 → 4
- **Skill counts** updated: 25 → 17 total (removed 9 meta-*, added /meta-review, rewrote /meta-health)
- **Model strategy** updated in CLAUDE.md to reference sonnet-4-6 as default

### Removed
- **9 meta-* skills** that never worked on real data: meta-analyze, meta-learn, meta-implement, meta-experiment, meta-evolve, meta-document, meta-predict, meta-improve, meta-compound-analyze
- **2 dead meta agents**: code-cleanup-specialist, pr-review-responder
- **4 telemetry scripts**: telemetry-init.sh, telemetry-command.sh, telemetry-agent.sh, telemetry-track.sh (telemetry.json was always empty)
- **Telemetry architecture section** from CLAUDE.md (hooks data flow diagram, debugging instructions for telemetry)
- **Stale telemetry references** from /test and /review-pr skills

## [1.18.0] - 2026-02-05

### Added
- **New agents (2):**
  - `work-researcher` (workflow) - Pre-implementation research orchestrator that dispatches learnings-researcher, repo-research-analyst, best-practices-researcher, git-history-analyzer, test-specialist, domain specialists, security-analyst, and ux-specialist in parallel
  - `work-validator` (workflow) - Post-implementation validation orchestrator that dispatches language reviewers in LIGHT mode and deployment/migration validators based on changed files
- **`/test` self-healing loop** - Phase 4.5 "Fix & Retry Loop" automatically categorizes test failures as FIXABLE or NOT_FIXABLE, applies targeted fixes, and retries (max 3 iterations)
- **Post-edit validation hook** - PostToolUse hook (`scripts/post-edit-validate.sh`) validates syntax after Edit/Write operations: `.ts/.tsx` via tsc, `.py` via py_compile, `.json` via jq. Non-blocking with 10s timeout

### Changed
- **Refactored `/work` skill** from 594 lines to ~192 lines — decomposed into slim 6-phase orchestrator backed by work-researcher and work-validator agents. Research phases (1.5, 1.55, 1.6, 2.5, 2.6) collapsed into single work-researcher Task call. Validation phases (4.3, 4.4) collapsed into single work-validator Task call. Critical steps (branch creation Phase 2, commit/PR Phase 6) marked with `[REQUIRED — DO NOT SKIP]` headers
- **`/work` auto-detects default branch** via `gh repo view --json defaultBranchRef` instead of hardcoding `dev`
- **`/work` uses `git push -u origin HEAD`** for simpler push that works with any branch name
- **Updated agent counts** from 41 to 43 across all documentation (CLAUDE.md, README.md, plugins/README.md)
- **Workflow agents category** expanded from 1 to 3 agents

## [1.17.0] - 2026-02-05

### Added
- **New agents (4):**
  - `git-history-analyzer` (research) - Git archaeology agent for blame analysis, change velocity, hot file detection, fix-on-fix patterns, and ownership mapping
  - `repo-research-analyst` (research) - Codebase onboarding and deep research for architecture mapping, tech stack identification, and convention discovery
  - `schema-drift-detector` (review) - ORM-agnostic schema drift detection comparing model definitions, migrations, and raw SQL schemas across Prisma, Django, SQLAlchemy, TypeORM, Drizzle, and ActiveRecord
  - `data-integrity-guardian` (review) - PII and compliance scanning for GDPR, FERPA (K-12 education), sensitive data handling, and access control validation

### Changed
- **Enhanced `performance-optimizer` agent** - Added Big O complexity analysis (flag O(n^2)+ in hot paths), scalability projections (10x/100x load estimates), sub-200ms response time targets, memory leak pattern detection (unbounded caches, event listener leaks, closure captures), and database N+1 query detection with ORM-specific fix patterns
- **Enhanced `/work` skill** - Added Phase 1.55 (codebase research for unfamiliar repos via repo-research-analyst), Phase 2.5 (git history analysis for existing files via git-history-analyzer), Phase 4.4 schema-drift-detector alongside deployment-verification
- **Enhanced `/architect` skill** - Added repo-research-analyst invocation in parallel during Phase 1 context gathering for codebase structure context
- **Enhanced `/review-pr` skill** - Added conditional schema-drift-detector (triggers on migration/schema/ORM changes) and data-integrity-guardian (triggers on PII-related file changes) in Phase 2 parallel agent dispatch
- **Enhanced `/security-audit` skill** - Added Step 1.5 data-integrity-guardian invocation for PII/FERPA/GDPR compliance scanning on every security audit
- **Corrected agent counts** - Fixed total from 38 to 41, review from 13 to 14, research from 4 to 6 (previous counts were inaccurate)

## [1.16.0] - 2026-02-05

### Fixed
- **Critical: Agent subagent_type path resolution** - All subagent_type references in skill files now include category subdirectory prefixes (e.g., `psd-claude-coding-system:security-analyst-specialist` → `psd-claude-coding-system:review:security-analyst-specialist`). The v1.14.0 agent reorganization into category subdirectories broke agent invocation from skills that still used flat paths. Affected skills: `/security-audit`, `/work`, `/test`, `/issue`, `/architect`, `/product-manager`, `/review-pr`, plus `parallel-dispatch.md` and `security-scan.md` helper skills.

### Changed
- **Upgraded all Opus model references from 4.5 to 4.6** - Updated `claude-opus-4-5-20251101` → `claude-opus-4-6` across 16 skill frontmatter files, 3 agent files (plan-validator, architect-specialist, meta-orchestrator), and 2 agent documentation references (configuration-validator, agent-native-reviewer). Opus 4.6 is the latest frontier model available in Claude Code 2.1.32+.

## [1.15.2] - 2026-01-29

### Changed
- **Renamed `/plan` skill to `/scope`** - Resolves collision with Claude Code's built-in `/plan` command (which enters plan mode). The skill's core value is scope classification + tiered routing to execution, making `/scope` a more accurate name.
- Skill directory: `skills/plan/` → `skills/scope/`
- Frontmatter: `name: plan` → `name: scope`
- All documentation references updated (CLAUDE.md, README.md, plugin README)

## [1.15.1] - 2026-01-29

### Fixed
- hooks.json schema corrected to use nested `"hooks"` array wrapper required by Claude Code validator
- Previous flat format caused "expected array, received undefined" validation errors on plugin load

## [1.15.0] - 2026-01-29

### Added
- **New `/plan` skill** - Flexible planning on-ramp with tiered output (tasks/issues/PRD), scope classification, parallel research, and execution routing
- **New agents (6)**:
  - `best-practices-researcher` - Two-phase knowledge lookup (local → online) with mandatory deprecation validation
  - `framework-docs-researcher` - Framework/API deprecation checking with traffic-light status output
  - `bug-reproduction-validator` - Documented bug reproduction with evidence collection and root cause verification
  - `architecture-strategist` - SOLID compliance review and anti-pattern detection with structured checklists
  - `code-simplicity-reviewer` - YAGNI enforcement, complexity scoring, and simplification recommendations
  - `pattern-recognition-specialist` - Code duplication detection with threshold-based analysis (50+ tokens)
- New `agents/workflow/` category directory for workflow-specific agents
- `docs/learnings/` directory (was referenced by `/work` and `/compound` but missing)

### Changed
- **Enhanced `/review-pr`** - Massive parallelism with 3 new always-on review agents (architecture-strategist, code-simplicity-reviewer, pattern-recognition-specialist) + P1/P2/P3 severity classification output + conditional agent activation (data-migration-expert only for migrations, bug-reproduction-validator only for bug PRs)
- **Enhanced `/work`** - Incremental commit heuristic in Phase 3 ("Can I write a complete commit message right now?") + risk-based external research routing in Phase 1.6 for security/payments/auth topics via best-practices-researcher
- **Enhanced `/compound`** - YAML validation gates (Phase 4.5) block saving until frontmatter is complete and valid, with auto-fix for date/severity/title-length and re-prompting for missing required sections
- Updated CLAUDE.md with accurate agent/skill counts (38 agents, 25 skills) and new components

## [1.14.1] - 2026-01-22

### Fixed
- `learnings-researcher` agent now uses configured tools (Read, Grep, Glob) instead of bash commands
- Resolves "No such tool available: Bash" errors when agent is invoked

## [1.14.0] - 2026-01-22

### Added
- **Compound Engineering Integration** - Major update integrating best practices from Every's Compound Engineering plugin

**New Agents (9 total):**
- `deployment-verification-agent` - Go/No-Go checklists for risky deployments (migrations, schema changes)
- `data-migration-expert` - Validates ID mappings, foreign key integrity, data transformation logic
- `spec-flow-analyzer` - Gap analysis for feature specs, user flow permutations, edge case identification
- `agent-native-reviewer` - Validates AI-agent architecture parity, prompt consistency
- `learnings-researcher` - Searches knowledge base for relevant past learnings before implementation
- `typescript-reviewer` - Language-specific reviewer for TypeScript/JavaScript (light and full modes)
- `python-reviewer` - Language-specific reviewer for Python (type hints, async patterns, security)
- `swift-reviewer` - Language-specific reviewer for Swift (optionals, memory management, SwiftUI)
- `sql-reviewer` - Language-specific reviewer for SQL (injection prevention, performance, migrations)

**New Skills (2 total):**
- `/compound` - Capture learnings from current session for knowledge compounding
- `/contribute-pattern` - Share universal patterns to the plugin repository

**New Infrastructure:**
- `docs/patterns/` directory for plugin-wide universal patterns
- `scripts/language-detector.sh` for automatic language detection

### Changed
- **Agent Reorganization** - All 30 agents reorganized into category subdirectories:
  - `agents/review/` - 10 code review specialists
  - `agents/domain/` - 7 domain specialists
  - `agents/quality/` - 3 quality assurance agents
  - `agents/research/` - 2 research agents (NEW)
  - `agents/external/` - 2 external AI providers
  - `agents/meta/` - 3 meta-learning agents
  - `agents/validation/` - 5 validator agents

- **Enhanced `/work` skill** - Added three new phases:
  - Phase 1.5: Knowledge Lookup - Searches `docs/learnings/` and plugin patterns via `learnings-researcher`
  - Phase 4.3: Language-Specific Review - Light mode review before PR creation
  - Phase 4.4: Deployment Verification - Conditional checklist for migrations/schema changes

- **Enhanced `/review-pr` skill**:
  - Phase 2.5: Language-Specific Deep Review with full mode analysis
  - Phase 2.6: Deployment Verification for migration PRs
  - Auto-triggers based on file extensions in PR diff

- **Enhanced `/issue` skill**:
  - Phase 1.5: Spec Flow Analysis for complex user-flow features

- **Simplified telemetry-track.sh**:
  - Removed complex transcript parsing for errors/corrections
  - Added high-signal session detection
  - The `/compound` skill now handles sophisticated analysis

### Security
- Language reviewers check for SQL injection, XSS, command injection, and other OWASP vulnerabilities

## [1.13.2] - 2026-01-21

### Changed
- **Naming convention alignment** - All skill `name:` fields now use kebab-case to match directory names
  - `review_pr` → `review-pr`, `clean_branch` → `clean-branch`, `security_audit` → `security-audit`
  - `compound_concepts` → `compound-concepts`, `compound_plugin_analyzer` → `compound-plugin-analyzer`
  - `claude_code_updates` → `claude-code-updates`
  - All 10 `meta_*` skills → `meta-*` (meta-analyze, meta-learn, meta-implement, etc.)
- **Documentation updated** - All user-facing command references now use kebab-case invocations
  - README.md, all SKILL.md files, parallel-dispatch.md updated
- **Telemetry scripts updated** - `telemetry-command.sh` COMMAND_LIST now tracks kebab-case commands
  - Also added missing skills: triage, meta-compound-analyze, compound-plugin-analyzer, claude-code-updates

### Fixed
- Skill invocation commands now correctly match directory names per Claude Code 2.1.x conventions

## [1.13.1] - 2026-01-21

### Added
- **New `/compound_plugin_analyzer` skill** - Analyzes the Every Compound Engineering plugin and compares it to our plugin, generating prioritized improvement suggestions
  - Fetches remote plugin structure via WebFetch
  - Compares agents, skills, patterns, and commands
  - Outputs gap analysis with priorities and implementation roadmap
  - Supports optional focus area filtering (agents, skills, patterns, commands, safety)

## [1.13.0] - 2026-01-21

### Added
- **Skills Architecture Migration** - Aligned with Claude Code 2.1.x
  - All 20 commands migrated to `skills/<name>/SKILL.md` directory structure
  - New frontmatter fields: `context: fork`, `agent` type specification
  - Skills support hot-reload (changes apply without session restart)
- **New `/claude_code_updates` skill** - Analyzes Claude Code releases and recommends plugin improvements
- **Agent improvements**:
  - Added missing `color` fields to 8 agents (security-analyst, backend-specialist, frontend-specialist, database-specialist, documentation-writer, performance-optimizer, llm-specialist, test-specialist)
  - Fixed `security-analyst-specialist` missing `tools` field (added Bash, Read, Grep, Glob)

### Changed
- Directory structure: `commands/` deprecated in favor of `skills/`
- Updated CLAUDE.md with new skills-based architecture documentation
- All workflow and meta-learning commands now use skills format

### Deprecated
- `commands/` directory - all files migrated to `skills/`, directory kept for backwards compatibility

## [1.12.3] - 2026-01-20

### Fixed
- Correct hooks.json structure to enable telemetry collection

## [1.12.2] - 2026-01-19

### Added
- Gemini 3 Pro agent for multimodal analysis

## [1.12.1] - 2026-01-18

### Added
- Inline review comments feature for `/review_pr`

### Fixed
- Eliminated redundant API calls in `/review_pr`

## [1.12.0] - 2026-01-17

### Added
- UX Specialist Agent - evaluates UI against 68 usability heuristics from 7 HCI frameworks
- Automatic UX review auto-invoked for `/work`, `/product-manager`, `/review_pr`, `/architect`, `/test` when UI work detected

### Changed
- Upgraded `gpt-5-codex` and `plan-validator` agents to use gpt-5.2-pro model

## [1.11.0] - Previous

### Added
- Initial workflow automation system
- Meta-learning commands
- Telemetry integration via hooks
- Specialized domain agents

---

**Note**: For versions prior to 1.11.0, see git commit history.
