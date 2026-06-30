# Agent Manifest

Maps every agent in `agents/` to the skill/orchestrator that invokes it and the condition under which it runs. The overhaul consolidates the coding surface to three skills:

- **`/plan`** — design surface (absorbs architect, brainstorm, scope, product-manager, deepen-plan, issue)
- **`/lfg`** — build-to-done loop (absorbs work, test, debug, optimize, review-pr, security-audit); dispatches `work-researcher` (research), `runtime-verifier` (runs tests + Playwright), `work-validator` (validation), and internal review agents in parallel for self-review
- **`/evolve`** — compounding engine (uses `learning-writer` + `meta-reviewer`)

"Invoked by" distinguishes **direct** dispatch (the skill names the agent's `subagent_type`) from **indirect** dispatch (an orchestrator agent — `work-researcher` or `work-validator` — dispatches it). Agents whose `subagent_type` differs from their filename are noted.

Resolution is by frontmatter `name:`, not filename. Notable mismatch: `external/gpt-5-codex.md` registers as `psd-coding-system:external:gpt-5`.

---

## /plan surface

| Agent | Category | Invoked by | When |
|-------|----------|------------|------|
| `learnings-researcher` | research | `/plan` (direct) | Always — pull prior learnings before designing |
| `repo-research-analyst` | research | `/plan` (direct) | When codebase context is needed (architecture/conventions) |
| `best-practices-researcher` | research | `/plan` (direct) | When external/high-risk topics need validation |
| `framework-docs-researcher` | research | `/plan` (direct); also sub-dispatched by `best-practices-researcher` | When a framework/API must be checked for deprecation/EOL |
| `spec-flow-analyzer` | research | `/plan` (direct) | When fleshing out user flows / edge-case gaps in a spec |
| `architect-specialist` | domain | `/plan` (direct) | When the design needs architecture/tech-decision guidance |
| `plan-validator` | validation | `/plan` (direct) | Terminal step — validate/iterate the drafted plan before execution |

---

## /lfg surface

| Agent | Category | Invoked by | When |
|-------|----------|------------|------|
| `work-researcher` | workflow | `/lfg` (direct) | Phase 1 — gather knowledge/codebase/git/test/security/UX context |
| `runtime-verifier` | quality | `/lfg` (direct) **and** `work-validator` (indirect, terminal gate) | After implementation — runs build/lint/typecheck/full test suite + Playwright, captures evidence |
| `work-validator` | workflow | `/lfg` (direct) | Post-implementation validation orchestrator |
| `learning-writer` | workflow | `/lfg` (direct) | End of run — capture learnings |
| `learnings-researcher` | research | `work-researcher` (indirect) | Always during research phase |
| `repo-research-analyst` | research | `work-researcher` (indirect) | When codebase research flagged |
| `best-practices-researcher` | research | `work-researcher` (indirect) | When external research flagged (high-risk) |
| `git-history-analyzer` | research | `work-researcher` (indirect) | When existing files have relevant history |
| `test-specialist` | quality | `work-researcher` (indirect) | Always — test strategy during research |
| `ux-specialist` | domain | `work-researcher` (indirect) | When UI/UX work detected |
| `security-reviewer` | review | `work-researcher` (indirect, pre-impl guidance) **and** `/lfg` self-review (via `.psd/verify.json` `review_agents`) | Security-sensitive changes; default self-review reviewer |
| `architect-specialist` | domain | `work-researcher` (indirect, `domain:[detected]-specialist`) | When architecture is the detected domain |
| `backend-specialist` | domain | `work-researcher` (indirect, `domain:[detected]-specialist`) | When backend is the detected domain |
| `frontend-specialist` | domain | `work-researcher` (indirect, `domain:[detected]-specialist`) | When frontend is the detected domain |
| `database-specialist` | domain | `work-researcher` (indirect, `domain:[detected]-specialist`) | When database is the detected domain |
| `llm-specialist` | domain | `work-researcher` (indirect, `domain:[detected]-specialist`) | When LLM/AI is the detected domain |
| `shell-devops-specialist` | domain | `work-researcher` (indirect, `domain:[detected]-specialist`) | When shell/DevOps is the detected domain |
| `correctness-reviewer` | review | `/lfg` self-review (`.psd/verify.json` `review_agents`) | Default self-review reviewer |
| `adversarial-reviewer` | review | `/lfg` self-review (`.psd/verify.json` `review_agents`) | Default self-review reviewer |
| `code-simplicity-reviewer` | review | `/lfg` self-review (`.psd/verify.json` `review_agents`) | Default self-review reviewer |
| `architecture-strategist` | review | `/lfg` self-review (`.psd/verify.json` `review_agents`) | Default self-review reviewer |
| `pattern-recognition-specialist` | review | `/lfg` self-review (`.psd/verify.json` `review_agents`) | Default self-review reviewer |
| `typescript-reviewer` | review | `/lfg` self-review + `work-validator` (indirect, LIGHT mode) | TypeScript/JavaScript files changed |
| `python-reviewer` | review | `/lfg` self-review + `work-validator` (indirect, LIGHT mode) | Python files changed |
| `swift-reviewer` | review | `/lfg` self-review + `work-validator` (indirect, LIGHT mode) | Swift files changed |
| `sql-reviewer` | review | `/lfg` self-review + `work-validator` (indirect, LIGHT mode) | SQL files changed |
| `deployment-verification-agent` | review | `work-validator` (indirect) | Migration files detected |
| `data-migration-expert` | review | `work-validator` (indirect) | Migration files detected |
| `schema-drift-detector` | review | `work-validator` (indirect) | Schema files detected |

---

## /evolve surface

| Agent | Category | Invoked by | When |
|-------|----------|------------|------|
| `meta-reviewer` | meta | `/evolve` (direct) | When ≥8 unanalyzed learnings accumulate — pattern analysis + roadmap |
| `learning-writer` | workflow | `/evolve` (direct) **and** `/lfg` (direct) | Capture/dedupe learnings to `docs/learnings/` |

---

## Shared / utility

| Agent | Category | Invoked by | When |
|-------|----------|------------|------|
| `framework-docs-researcher` | research | `/plan` (direct) + `best-practices-researcher` (indirect) | Deprecation/EOL validation of frameworks & APIs |
| `gpt-5-codex` (name: `gpt-5`) | external | Ad-hoc second-opinion (referenced in domain-specialist cross-refs) | On demand — design validation / migration sanity-check via Codex |
| `gemini-3-pro` | external | Ad-hoc second-opinion | On demand — multimodal / deep analysis |

---

## Orphans — wire or remove (human decision needed)

These agents have **no current invoker** in any skill or orchestrator after consolidation. They are documented in README/CLAUDE.md and each has a distinct purpose, so they were kept (not deleted) per the conservative policy. The parallel skills rewrite (`/plan`, `/lfg`, `/evolve`) may still wire some of them; decide per agent.

| Agent | Category | Likely home | Status |
|-------|----------|-------------|--------|
| `bug-reproduction-validator` | workflow | `/lfg` (debug path — was wired to old `/debug`) | ORPHAN — wire or remove |
| `document-validator` | validation | `/plan` or `/lfg` (extraction-boundary data validation) | ORPHAN — wire or remove |
| `configuration-validator` | validation | `/plan` or `/evolve` (multi-file consistency / version drift) | ORPHAN — wire or remove |
| `breaking-change-validator` | validation | `/plan` or `/lfg` (dependency analysis before deletions) | ORPHAN — wire or remove |
| `telemetry-data-specialist` | validation | `/lfg` (data-pipeline / metrics correctness) | ORPHAN — wire or remove |
| `data-integrity-guardian` | review | `/lfg` self-review (PII/FERPA/GDPR scanning) | ORPHAN — wire or remove |
| `agent-native-reviewer` | review | `/lfg` self-review (AI-agent architecture parity) | ORPHAN — wire or remove |
| `performance-optimizer` | quality | `/lfg` (perf path — absorbed `/optimize`) | ORPHAN — wire or remove |
| `documentation-writer` | quality | `/lfg` or `/plan` (docs generation) | ORPHAN — wire or remove |
| `gpt-5-codex` (name: `gpt-5`) | external | second-opinion — invoked only ad-hoc, no skill wires it | ORPHAN (intentional?) — confirm or remove |
| `gemini-3-pro` | external | second-opinion — invoked only ad-hoc, no skill wires it | ORPHAN (intentional?) — confirm or remove |

> Note: the two `external/` agents are invoked manually/ad-hoc by design today (no skill dispatches them). Listed as orphans for visibility; "remove" only if ad-hoc second opinions are no longer wanted.
