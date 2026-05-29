---
name: setup
description: Configure which review agents activate for this project during /review-pr
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

# Project Review Setup

Configure which of the 22 review and language agents activate during `/review-pr` for this specific project. Creates a `.claude/review-config.json` in the project root.

**Arguments:** $ARGUMENTS

## Phase 1: Detect Current Config

```bash
CONFIG_FILE=".claude/review-config.json"

if [ "$ARGUMENTS" = "reset" ]; then
  rm -f "$CONFIG_FILE"
  echo "Review config removed. /review-pr will use default agent activation."
  exit 0
fi

if [ "$ARGUMENTS" = "show" ]; then
  if [ -f "$CONFIG_FILE" ]; then
    echo "=== Current Review Config ==="
    cat "$CONFIG_FILE"
  else
    echo "No review config found. Using defaults."
  fi
  exit 0
fi

if [ -f "$CONFIG_FILE" ]; then
  echo "=== Current Review Config ==="
  cat "$CONFIG_FILE"
  echo ""
fi

echo "=== Available Review Agents ==="
```

## Phase 2: Show Available Agents

Present all 22 review and language agents with their descriptions and let the user choose which to enable:

```markdown
### Always-On Structural Agents (Round 1)
These run on every `/review-pr` Round 1 by default:

| # | Agent | Description | Default |
|---|-------|-------------|---------|
| 1 | architecture-strategist | SOLID compliance and anti-pattern detection | ON |
| 2 | code-simplicity-reviewer | YAGNI enforcement and complexity scoring | ON |
| 3 | pattern-recognition-specialist | Code duplication detection | ON |
| 4 | correctness-reviewer | Logic errors, edge cases, off-by-one, state bugs | ON |
| 5 | adversarial-reviewer | Failure scenarios across component boundaries | ON |

### Feedback-Triggered Agents
These activate when matching keywords appear in review comments:

| # | Agent | Trigger | Default |
|---|-------|---------|---------|
| 6 | security-analyst-specialist | Security/vulnerability keywords | ON |
| 7 | performance-optimizer | Performance/speed keywords | ON |
| 8 | test-specialist | Test/coverage keywords | ON |
| 9 | architect-specialist | Architecture/design keywords | ON |
| 10 | telemetry-data-specialist | Telemetry/metrics keywords | ON |
| 11 | shell-devops-specialist | Shell/hook/exit-code keywords | ON |
| 12 | configuration-validator | Version/config keywords | ON |
| 13 | ux-specialist | UX/accessibility keywords | ON |

### Context-Triggered Agents
These activate when specific file patterns or labels appear in the PR:

| # | Agent | Trigger | Default |
|---|-------|---------|---------|
| 14 | data-migration-expert | Migration files detected | ON |
| 15 | schema-drift-detector | Schema/ORM changes detected | ON |
| 16 | data-integrity-guardian | PII-related files detected | ON |
| 17 | deployment-verification-agent | Migration files detected | ON |
| 18 | bug-reproduction-validator | Bug label on linked issue | ON |

### Language Reviewers
These activate when matching file extensions appear in the PR diff:

| # | Agent | Trigger | Default |
|---|-------|---------|---------|
| 19 | typescript-reviewer | .ts/.tsx/.js/.jsx files | ON |
| 20 | python-reviewer | .py files | ON |
| 21 | swift-reviewer | .swift files | ON |
| 22 | sql-reviewer | .sql files | ON |
```

## Phase 3: Interactive Configuration

Ask the user which agents to disable (all are enabled by default):

> Which agents would you like to **disable** for this project?
> Enter numbers separated by commas (e.g., "9,11,17,18"), or "none" to keep all enabled.
>
> Common configurations:
> - **Python-only project:** Disable 19, 21 (TS and Swift reviewers)
> - **No database project:** Disable 14, 15, 16, 17 (migration/schema/PII/deployment agents)
> - **Minimal review:** Disable 6-18 (keep only structural + language reviewers)

## Phase 4: Write Config

Based on user input, create the config file:

```bash
mkdir -p .claude
```

Write a JSON config file with this structure:

```json
{
  "reviewAgents": {
    "alwaysOn": {
      "architecture-strategist": true,
      "code-simplicity-reviewer": true,
      "pattern-recognition-specialist": true,
      "correctness-reviewer": true,
      "adversarial-reviewer": true
    },
    "feedbackTriggered": {
      "security-analyst-specialist": true,
      "performance-optimizer": true,
      "test-specialist": true,
      "architect-specialist": true,
      "telemetry-data-specialist": true,
      "shell-devops-specialist": true,
      "configuration-validator": true,
      "ux-specialist": true
    },
    "contextTriggered": {
      "data-migration-expert": true,
      "schema-drift-detector": true,
      "data-integrity-guardian": true,
      "deployment-verification-agent": true,
      "bug-reproduction-validator": true
    },
    "languageReviewers": {
      "typescript-reviewer": true,
      "python-reviewer": true,
      "swift-reviewer": true,
      "sql-reviewer": true
    }
  }
}
```

Set disabled agents to `false` based on user selections.

## Phase 5: Confirm

```markdown
### Review Config Saved

**File:** `.claude/review-config.json`

| Category | Enabled | Disabled |
|----------|---------|----------|
| Always-On | X | Y |
| Feedback-Triggered | X | Y |
| Context-Triggered | X | Y |
| Language Reviewers | X | Y |

**How it works:**
- `/review-pr` checks for `.claude/review-config.json` before dispatching agents
- Disabled agents are skipped entirely (no Task invocation, no token cost)
- Use `/setup show` to view current config
- Use `/setup reset` to remove config and return to defaults
- Config is project-scoped (checked into git) so all team members share it

**Note:** `/review-pr` integration reads this config file. Agents set to `false` will not be dispatched.
```
