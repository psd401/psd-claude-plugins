---
name: setup
description: Configure this project's verification gate and review agents — writes .psd/verify.json (build/lint/test/typecheck/e2e commands, E2E flows, strictness, AI-reviewer logins, learnings, active review agents)
argument-hint: "[show|reset]"
model: claude-opus-4-8
effort: high
context: fork
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Edit
  - Write
  - Grep
  - Glob
extended-thinking: true
---

# Project Setup — verification gate & reviewers

Create `.psd/verify.json`, the single per-project config that powers the Definition-of-Done gate (used by `/lfg`, the `runtime-verifier` agent, and the Stop hook) and the watch-until-clean loop. Without this file the gate and Stop hook are **inert**, so the plugin never disrupts a repo that hasn't opted in.

See `docs/patterns/definition-of-done.md` for the full schema.

**Arguments:** $ARGUMENTS

## Phase 1: show / reset

```bash
CONFIG=".psd/verify.json"
case "$ARGUMENTS" in
  show)
    [ -f "$CONFIG" ] && { echo "=== $CONFIG ==="; cat "$CONFIG"; } || echo "No $CONFIG — gate inert (run /setup to create)."
    exit 0 ;;
  reset)
    rm -f "$CONFIG"; echo "Removed $CONFIG. Gate is now inert for this repo."; exit 0 ;;
esac
[ -f "$CONFIG" ] && { echo "=== existing $CONFIG ==="; cat "$CONFIG"; echo; }
```

## Phase 2: Auto-detect commands

Detect the project's real commands before asking — propose, don't interrogate.

```bash
echo "=== detecting project commands ==="
if [ -f package.json ]; then
  for s in build lint typecheck test; do
    jq -e ".scripts.\"$s\"" package.json >/dev/null 2>&1 && echo "  $s → npm run $s"
  done
  jq -e '.devDependencies["@playwright/test"] // .dependencies["@playwright/test"]' package.json >/dev/null 2>&1 && echo "  e2e → npx playwright test"
fi
[ -f pyproject.toml ] || [ -f pytest.ini ] && echo "  test → pytest ; lint → ruff check ."
[ -f Cargo.toml ] && echo "  test → cargo test ; lint → cargo clippy -- -D warnings"
[ -f go.mod ] && echo "  test → go test ./... ; lint → go vet ./..."
```

**Lint must be zero-warning** — propose the warnings-as-errors form (`eslint --max-warnings 0`, `ruff check`, `clippy -- -D warnings`).

## Phase 3: Auto-detect the AI reviewers

The watch-until-clean loop must know which reviewer logins to wait for. Detect them from recent PRs:

```bash
echo "=== recent PR reviewers (bots + humans) ==="
DEF=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo main)
for pr in $(gh pr list --state all --limit 10 --json number --jq '.[].number' 2>/dev/null); do
  gh api "repos/{owner}/{repo}/pulls/$pr/reviews" --jq '.[].user.login' 2>/dev/null
done | sort -u
```

Present the bot-looking logins (e.g. `coderabbitai[bot]`, `greptile-apps[bot]`, `claude[bot]`) and confirm which N must weigh in before a PR is considered reviewed.

## Phase 4: Confirm the few real choices

Use AskUserQuestion for anything not safely inferred:
- E2E flows (named critical journeys Playwright must exercise + screenshot)
- `strictness`: `block` (default) or `warn` (while adopting in a repo with pre-existing red)
- `commit_learnings`: commit `/lfg`'s learning files into this repo (default true) — set false for repos where learnings shouldn't enter history
- Which internal review agents to disable (all on by default)

## Phase 5: Write `.psd/verify.json`

```bash
mkdir -p .psd
```

Write the config (fill from detection + answers):

```json
{
  "commands": {
    "build": "npm run build",
    "lint": "npm run lint",
    "typecheck": "npm run typecheck",
    "test": "npm test",
    "e2e": "npx playwright test"
  },
  "e2e_required": true,
  "e2e_flows": ["login", "primary-happy-path"],
  "strictness": "block",
  "reviewers": ["coderabbitai[bot]", "greptile-apps[bot]", "claude[bot]"],
  "commit_learnings": true,
  "screenshot_dir": ".verification",
  "baseline": { "allow_preexisting_failures": false },
  "review_agents": {
    "alwaysOn": {
      "architecture-strategist": true,
      "code-simplicity-reviewer": true,
      "pattern-recognition-specialist": true,
      "correctness-reviewer": true,
      "adversarial-reviewer": true,
      "security-reviewer": true
    },
    "languageReviewers": {
      "typescript-reviewer": true,
      "python-reviewer": true,
      "swift-reviewer": true,
      "sql-reviewer": true
    },
    "contextTriggered": {
      "data-migration-expert": true,
      "schema-drift-detector": true,
      "data-integrity-guardian": true,
      "deployment-verification-agent": true,
      "ux-specialist": true,
      "performance-optimizer": true,
      "configuration-validator": true,
      "breaking-change-validator": true,
      "document-validator": true,
      "telemetry-data-specialist": true,
      "agent-native-reviewer": true,
      "bug-reproduction-validator": true,
      "documentation-writer": true
    }
  }
}
```

Omit any command the project genuinely doesn't have (the gate skips unconfigured steps — it does not assume them).

## Phase 6: Confirm

```markdown
### Setup saved → `.psd/verify.json`

- Gate commands: build / lint / typecheck / test / e2e (as configured)
- E2E flows: <list>
- Strictness: block | warn
- Reviewers watched: <logins>
- Commit learnings: yes | no
- Review agents active: <count> on, <count> off

**How it's used:**
- `/lfg` runs this gate every verify-loop iteration and waits for these reviewers until 100% clean.
- The Stop hook blocks finishing while the gate is red (strictness=block).
- `/setup show` to view, `/setup reset` to remove (returns the gate to inert).
- Committed to git so the whole team shares it.
```
