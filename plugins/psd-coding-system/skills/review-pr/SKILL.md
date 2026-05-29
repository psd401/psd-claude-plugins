---
name: review-pr
description: Address feedback from pull request reviews systematically and efficiently
argument-hint: "[PR number] [--full to force complete re-review]"
model: claude-opus-4-8
effort: high
context: fork
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Edit
  - Write
  - Task
extended-thinking: true
---

# Pull Request Review Handler

You are an experienced developer skilled at addressing PR feedback constructively and thoroughly. You systematically work through review comments, make necessary changes, and maintain high code quality while leveraging specialized agents when needed.

**Target PR:** #$ARGUMENTS

## Workflow

### Phase 0.5: Incremental Detection

Parse arguments and detect whether this is a first run or an incremental follow-up.

```bash
# Parse --full flag
if echo "$ARGUMENTS" | grep -q '\-\-full'; then
  PR_NUMBER=$(echo "$ARGUMENTS" | sed 's/--full//' | tr -d ' ')
  FORCE_FULL=true
else
  PR_NUMBER=$ARGUMENTS
  FORCE_FULL=false
fi

# Use PR_NUMBER for all subsequent gh commands instead of $ARGUMENTS
OWNER_REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

# Search for last review-pr round marker in PR comments
LAST_MARKER=$(gh api "repos/$OWNER_REPO/issues/$PR_NUMBER/comments" \
  --paginate --jq '
  [.[] | select(.body | test("<!-- review-pr:round:")) |
   {
     round: (.body | capture("<!-- review-pr:round:(?<r>[0-9]+):timestamp:(?<t>[^>]+):sha:(?<s>[a-f0-9]+) -->") | .r | tonumber),
     timestamp: (.body | capture("<!-- review-pr:round:(?<r>[0-9]+):timestamp:(?<t>[^>]+):sha:(?<s>[a-f0-9]+) -->") | .t),
     sha: (.body | capture("<!-- review-pr:round:(?<r>[0-9]+):timestamp:(?<t>[^>]+):sha:(?<s>[a-f0-9]+) -->") | .s)
   }
  ] | sort_by(.round) | last // empty
' 2>/dev/null || echo "")

if [ "$FORCE_FULL" = true ]; then
  REVIEW_ROUND=1
  INCREMENTAL=false
  SINCE_TIMESTAMP=""
  echo "=== Full Review (forced with --full) ==="
elif [ -n "$LAST_MARKER" ] && [ "$LAST_MARKER" != "null" ] && [ "$LAST_MARKER" != "" ]; then
  PREV_ROUND=$(echo "$LAST_MARKER" | jq -r '.round')
  SINCE_TIMESTAMP=$(echo "$LAST_MARKER" | jq -r '.timestamp')
  PREV_SHA=$(echo "$LAST_MARKER" | jq -r '.sha')
  REVIEW_ROUND=$((PREV_ROUND + 1))
  INCREMENTAL=true
  echo "=== Incremental Review (Round $REVIEW_ROUND) ==="
  echo "  Previous run: Round $PREV_ROUND at $SINCE_TIMESTAMP"
  echo "  Filtering to comments after: $SINCE_TIMESTAMP"
else
  REVIEW_ROUND=1
  INCREMENTAL=false
  SINCE_TIMESTAMP=""
  echo "=== Full Review (Round 1) ==="
fi
```

**IMPORTANT**: All subsequent phases use `$PR_NUMBER` instead of `$ARGUMENTS` for gh commands (to exclude the `--full` flag).

### Phase 0.7: Load Project Review Config

Check for a project-level review config created by `/setup`. Agents disabled in this config are skipped during Phase 2 dispatch.

```bash
REVIEW_CONFIG=".claude/review-config.json"
if [ -f "$REVIEW_CONFIG" ]; then
  echo "=== Project Review Config Found ==="
  cat "$REVIEW_CONFIG"
  echo ""
  # Read disabled agents into a variable for Phase 2 gating
  DISABLED_AGENTS=$(jq -r '
    .reviewAgents | to_entries[] | .value | to_entries[] |
    select(.value == false) | .key
  ' "$REVIEW_CONFIG" 2>/dev/null | tr '\n' ' ')
  echo "Disabled agents: ${DISABLED_AGENTS:-none}"
else
  DISABLED_AGENTS=""
fi

# Helper used in Phase 2: returns true if agent should run
agent_enabled() {
  local agent="$1"
  echo "$DISABLED_AGENTS" | grep -qw "$agent" && echo "false" || echo "true"
}
```

Before dispatching any agent in Phase 2, check `$(agent_enabled "<agent-name>")`. If it returns `false`, skip that agent without invoking a Task.

### Phase 1: PR Analysis
```bash
# Get full PR context with top-level comments
gh pr view $PR_NUMBER --comments

# Check PR status and CI/CD checks
gh pr checks $PR_NUMBER

# View the diff
gh pr diff $PR_NUMBER
```

### Phase 1.1: Fetch Inline Review Comments (Code-Level Annotations)

**CRITICAL**: The `gh pr view --comments` command only retrieves PR-level comments. Inline review comments (attached to specific lines/files) require the GitHub API.

```bash
echo "=== Inline Review Comments (Code-Level) ==="
# OWNER_REPO already set in Phase 0.5

# Fetch inline review comments and cache for reuse (Phases 1.1, 1.2, 2)
if [ "$INCREMENTAL" = true ]; then
  # On incremental runs, fetch all then filter client-side by created_at
  ALL_INLINE_RAW=$(gh api "repos/$OWNER_REPO/pulls/$PR_NUMBER/comments" \
    --paginate \
    2>/dev/null || echo "[]")
  INLINE_COMMENTS_RAW=$(echo "$ALL_INLINE_RAW" | jq "[.[] | select(.created_at > \"$SINCE_TIMESTAMP\")]" 2>/dev/null || echo "[]")
  TOTAL_BEFORE_FILTER=$(echo "$ALL_INLINE_RAW" | jq 'length' 2>/dev/null || echo 0)
  TOTAL_AFTER_FILTER=$(echo "$INLINE_COMMENTS_RAW" | jq 'length' 2>/dev/null || echo 0)
  echo "  Filtered inline comments: $TOTAL_AFTER_FILTER new (of $TOTAL_BEFORE_FILTER total)"
else
  INLINE_COMMENTS_RAW=$(gh api "repos/$OWNER_REPO/pulls/$PR_NUMBER/comments" \
    --paginate \
    2>/dev/null || echo "[]")
fi

# Check if any inline comments exist
if [ "$INLINE_COMMENTS_RAW" = "[]" ] || [ -z "$INLINE_COMMENTS_RAW" ]; then
  echo "No inline review comments found on this PR"
  INLINE_COMMENTS="No inline comments found"
  TOTAL_INLINE=0
  SUGGESTIONS_COUNT=0
  OUTDATED_COUNT=0
else
  # Group by file path for display
  INLINE_COMMENTS=$(echo "$INLINE_COMMENTS_RAW" | jq '
    group_by(.path) | .[] | {
      file: .[0].path,
      comments: [.[] | {
        line: (.line // .original_line),
        user: .user.login,
        body: .body,
        has_suggestion: (.body | test("```suggestion"; "i")),
        is_reply: (.in_reply_to_id != null),
        is_outdated: (.line == null and .original_line != null),
        created_at: .created_at
      }]
    }
  ' 2>/dev/null)

  echo "$INLINE_COMMENTS"

  # Calculate statistics from cached data (no additional API calls)
  TOTAL_INLINE=$(echo "$INLINE_COMMENTS_RAW" | jq 'length' 2>/dev/null || echo 0)
  SUGGESTIONS_COUNT=$(echo "$INLINE_COMMENTS_RAW" | jq '[.[] | select(.body | test("```suggestion"; "i"))] | length' 2>/dev/null || echo 0)
  OUTDATED_COUNT=$(echo "$INLINE_COMMENTS_RAW" | jq '[.[] | select(.line == null and .original_line != null)] | length' 2>/dev/null || echo 0)

  echo ""
  echo "Inline Comment Statistics:"
  echo "   Total: $TOTAL_INLINE"
  echo "   With Code Suggestions: $SUGGESTIONS_COUNT"
  echo "   Outdated (code changed): $OUTDATED_COUNT"
fi
```

### Phase 1.2: Extract Code Suggestions

Code suggestions are inline comments with ```` ```suggestion ```` blocks that propose specific code changes.

```bash
echo ""
echo "=== Code Suggestions (Proposed Changes) ==="

# Reuse cached inline comments data from Phase 1.1 (no additional API call)
if [ "$INLINE_COMMENTS_RAW" = "[]" ] || [ -z "$INLINE_COMMENTS_RAW" ]; then
  echo "No code suggestions found"
else
  CODE_SUGGESTIONS=$(echo "$INLINE_COMMENTS_RAW" | jq '
    [.[] | select(.body | test("```suggestion"; "i"))] |
    if length == 0 then "No code suggestions found"
    else .[] | {
      file: .path,
      line: (.line // .original_line),
      user: .user.login,
      suggestion: .body,
      diff_context: .diff_hunk
    }
    end
  ' 2>/dev/null || echo "No code suggestions found")

  echo "$CODE_SUGGESTIONS"
fi
```

### Phase 1.5: Security-Sensitive File Detection

```bash
# Automatically detect if PR touches security-sensitive code
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECURITY_SENSITIVE=false

if bash "$SCRIPT_DIR/scripts/security-detector.sh" "$PR_NUMBER" "pr" 2>&1; then
  SECURITY_SENSITIVE=true
  echo ""
  echo "This PR contains security-sensitive changes and will receive a security review."
  echo ""
fi
```

## ANTI-DEFERRAL MANDATE

**Fix everything now.** If a reviewer flagged it, fix it. If an agent flags it, fix it. If a P3 item is worth mentioning, it's worth fixing.

There is no deferral. Fix everything flagged. Do NOT create GitHub issues for review findings. If a fix is genuinely blocked by an external constraint, stop and use the AskUserQuestion tool to explain the constraint and ask the user how they want to handle it. Do not add TODOs. No GitHub issues from review runs.

### Phase 2: Parallel Feedback Categorization (Aggressive Parallelism)

Categorize feedback by type and dispatch specialized agents IN PARALLEL to handle each category.

```bash
# Extract review comments from ALL sources (top-level + inline)
# Reuses cached INLINE_COMMENTS_RAW from Phase 1.1

if [ "$INCREMENTAL" = true ]; then
  # Filter review bodies by submittedAt
  REVIEW_BODIES=$(gh pr view $PR_NUMBER --json reviews \
    --jq "[.reviews[] | select(.submittedAt > \"$SINCE_TIMESTAMP\")] | .[].body" \
    2>/dev/null || echo "")

  # Filter PR-level comments by createdAt (exclude our own review-pr marker comments)
  PR_COMMENTS=$(gh pr view $PR_NUMBER --json comments \
    --jq "[.comments[] | select(.createdAt > \"$SINCE_TIMESTAMP\") | select(.body | test(\"<!-- review-pr:round:\") | not)] | .[].body" \
    2>/dev/null || echo "")
else
  REVIEW_BODIES=$(gh pr view $PR_NUMBER --json reviews --jq '.reviews[].body' 2>/dev/null || echo "")
  PR_COMMENTS=$(gh pr view $PR_NUMBER --json comments --jq '.comments[].body' 2>/dev/null || echo "")
fi

# Inline review comments (code-level annotations) - Reuse cached data from Phase 1.1
INLINE_COMMENT_BODIES=$(echo "$INLINE_COMMENTS_RAW" | jq -r '.[].body' 2>/dev/null || echo "")

# Combine ALL feedback sources for categorization
REVIEW_COMMENTS=$(printf "%s\n%s\n%s" "$REVIEW_BODIES" "$INLINE_COMMENT_BODIES" "$PR_COMMENTS")

# Early exit on incremental runs with no new feedback
if [ "$INCREMENTAL" = true ]; then
  COMBINED_LENGTH=$(printf "%s%s%s" "$REVIEW_BODIES" "$INLINE_COMMENT_BODIES" "$PR_COMMENTS" | wc -c | tr -d ' ')
  if [ "$COMBINED_LENGTH" -lt 5 ]; then
    echo ""
    echo "=== No New Feedback Found ==="
    echo "No new comments since Round $PREV_ROUND ($SINCE_TIMESTAMP)."
    echo "The PR appears up to date with all feedback addressed."
    echo ""
    echo "To force a full re-review, run: /review-pr $PR_NUMBER --full"
    # Exit early — skip remaining phases
  fi
fi

echo "=== Feedback Sources$([ "$INCREMENTAL" = true ] && echo " (since Round $PREV_ROUND)") ==="
echo "  Review bodies: $(echo "$REVIEW_BODIES" | grep -c . || echo 0) comments"
echo "  Inline comments: $TOTAL_INLINE comments"
echo "  PR comments: $(echo "$PR_COMMENTS" | grep -c . || echo 0) comments"

# Detect feedback types
SECURITY_FEEDBACK=$(echo "$REVIEW_COMMENTS" | grep -iE "security|vulnerability|auth|xss|injection|secret" || echo "")
PERFORMANCE_FEEDBACK=$(echo "$REVIEW_COMMENTS" | grep -iE "performance|slow|optimize|cache|memory|speed" || echo "")
TEST_FEEDBACK=$(echo "$REVIEW_COMMENTS" | grep -iE "test|coverage|mock|assertion|spec" || echo "")
ARCHITECTURE_FEEDBACK=$(echo "$REVIEW_COMMENTS" | grep -iE "architecture|design|pattern|structure|refactor" || echo "")
TELEMETRY_DATA_FEEDBACK=$(echo "$REVIEW_COMMENTS" | grep -iE "telemetry|metrics|jq|awk|aggregation|regex|data pipeline" || echo "")
SHELL_DEVOPS_FEEDBACK=$(echo "$REVIEW_COMMENTS" | grep -iE "exit code|shell|hook|parsing|tool_result|bash script" || echo "")
CONFIG_FEEDBACK=$(echo "$REVIEW_COMMENTS" | grep -iE "version|model|consistency|configuration|env variable" || echo "")
UX_FEEDBACK=$(echo "$REVIEW_COMMENTS" | grep -iE "ux|usability|accessibility|a11y|wcag|user experience|heuristic|cognitive|feedback|error message|loading|progress|contrast|font size|touch target" || echo "")

# Auto-trigger security review for sensitive file changes (from Phase 1.5)
if [[ "$SECURITY_SENSITIVE" == true ]]; then
  SECURITY_FEEDBACK="Auto-triggered: PR contains security-sensitive file changes"
fi

# Auto-trigger UX review for UI file changes
FILES_CHANGED=$(gh pr diff $PR_NUMBER --name-only)
if echo "$FILES_CHANGED" | grep -iEq "component|\.tsx|\.jsx|\.vue|\.svelte|modal|dialog|form|button|input"; then
  UX_FEEDBACK="${UX_FEEDBACK:-Auto-triggered: PR contains UI component changes}"
fi

# Conditional agent activation (only when relevant)
HAS_MIGRATION=$(echo "$FILES_CHANGED" | grep -iE 'migration' | head -1)
HAS_SCHEMA_CHANGE=$(echo "$FILES_CHANGED" | grep -iEq "migration|\.prisma|models\.py|schema\.|CreateTable|ALTER TABLE" && echo "yes" || echo "")
HAS_PII_FILES=$(echo "$FILES_CHANGED" | grep -iEq "user|student|email|password|personal|ssn|address" && echo "yes" || echo "")
HAS_BUG_LABEL=$(gh pr view $PR_NUMBER --json labels --jq '.labels[].name' 2>/dev/null | grep -iE "bug|fix" || echo "")

echo "=== Feedback Categories Detected ==="
[ -n "$SECURITY_FEEDBACK" ] && echo "  - Security issues"
[ -n "$PERFORMANCE_FEEDBACK" ] && echo "  - Performance concerns"
[ -n "$TEST_FEEDBACK" ] && echo "  - Testing feedback"
[ -n "$ARCHITECTURE_FEEDBACK" ] && echo "  - Architecture feedback"
[ -n "$TELEMETRY_DATA_FEEDBACK" ] && echo "  - Telemetry/Data pipeline issues"
[ -n "$SHELL_DEVOPS_FEEDBACK" ] && echo "  - Shell/DevOps issues"
[ -n "$CONFIG_FEEDBACK" ] && echo "  - Configuration consistency issues"
[ -n "$UX_FEEDBACK" ] && echo "  - UX/Usability issues"
echo ""
if [ "$INCREMENTAL" = true ]; then
  echo "=== Structural Review Agents (SKIPPED — Round 2+, already ran on Round 1) ==="
else
  echo "=== Always-On Review Agents ==="
  echo "  - Architecture strategist (SOLID compliance)"
  echo "  - Code simplicity reviewer (YAGNI enforcement)"
  echo "  - Pattern recognition specialist (duplication detection)"
  echo "  - Correctness reviewer (logic errors, edge cases, state bugs)"
  echo "  - Adversarial reviewer (failure scenarios, boundary stress-testing)"
fi
[ -n "$HAS_MIGRATION" ] && echo "  - Data migration expert (conditional: migration files detected)"
[ -n "$HAS_MIGRATION" ] && echo "  - Deployment verification agent (conditional: migration files detected)"
[ -n "$HAS_SCHEMA_CHANGE" ] && echo "  - Schema drift detector (conditional: schema/migration changes detected)"
[ -n "$HAS_PII_FILES" ] && echo "  - Data integrity guardian (conditional: PII-related files detected)"
[ -n "$HAS_BUG_LABEL" ] && echo "  - Bug reproduction validator (conditional: bug label detected)"
```

**Invoke agents in parallel** based on detected categories:

**CRITICAL: Use Task tool with multiple simultaneous invocations:**

#### Always-On Review Agents (Round 1 only — skip on incremental runs)

On **Round 1**, invoke these 5 agents for structural code quality. On **rounds 2+** (incremental), skip them — they already ran on round 1 and the focus should be on addressing new reviewer feedback.

**Only if `$INCREMENTAL` is NOT true:**

- subagent_type: "psd-coding-system:review:architecture-strategist"
- description: "SOLID review for PR #$PR_NUMBER"
- prompt: "Review PR diff for SOLID compliance and anti-pattern detection. Evaluate changed files against Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. Report violations with file:line references."

- subagent_type: "psd-coding-system:review:code-simplicity-reviewer"
- description: "Simplicity review for PR #$PR_NUMBER"
- prompt: "Review PR diff for unnecessary complexity, YAGNI violations, premature abstractions, and over-engineering. Flag unused abstractions, speculative generality, and dead code. Every line is a liability."

- subagent_type: "psd-coding-system:review:pattern-recognition-specialist"
- description: "Duplication detection for PR #$PR_NUMBER"
- prompt: "Analyze PR diff for code duplication. Search the codebase for exact, near, and structural duplicates of significant code blocks (50+ tokens). Flag 3+ occurrences for refactoring. Respect 'three similar lines > premature abstraction' principle."

- subagent_type: "psd-coding-system:review:correctness-reviewer"
- description: "Correctness review for PR #$PR_NUMBER"
- prompt: "Review PR diff for logic errors, off-by-one bugs, null/undefined handling gaps, state management issues, comparison bugs, and async correctness. Enumerate edge cases for significant functions. Rate findings with confidence scores (HIGH/MEDIUM/LOW). Report findings with severity (P1/P2/P3)."

- subagent_type: "psd-coding-system:review:adversarial-reviewer"
- description: "Adversarial review for PR #$PR_NUMBER"
- prompt: "Map all component boundaries in the PR diff. Construct failure scenarios for each boundary: data contract violations, partial failure/recovery, timing/ordering failures, cascading failures, and resource exhaustion. Trace cross-boundary failure propagation for high-risk scenarios. Rate findings with confidence scores (HIGH/MEDIUM/LOW). Report findings with severity (P1/P2/P3)."

#### Conditional Feedback-Based Agents

If security feedback exists:
- subagent_type: "psd-coding-system:review:security-analyst-specialist"
- description: "Address security feedback for PR #$PR_NUMBER"
- prompt: "Analyze the security feedback: $SECURITY_FEEDBACK. Then implement fixes directly in the codebase. Do not just report — make the code changes."

If performance feedback exists:
- subagent_type: "psd-coding-system:quality:performance-optimizer"
- description: "Address performance feedback for PR #$PR_NUMBER"
- prompt: "Analyze the performance feedback: $PERFORMANCE_FEEDBACK. Then implement fixes directly in the codebase. Do not just report — make the code changes."

If test feedback exists:
- subagent_type: "psd-coding-system:quality:test-specialist"
- description: "Address testing feedback for PR #$PR_NUMBER"
- prompt: "Analyze the testing feedback: $TEST_FEEDBACK. Then implement fixes directly in the codebase — write the missing tests, fix the failing ones. Do not just report — make the code changes."

If architecture feedback exists:
- subagent_type: "psd-coding-system:domain:architect-specialist"
- description: "Address architecture feedback for PR #$PR_NUMBER"
- prompt: "Analyze the architecture feedback: $ARCHITECTURE_FEEDBACK. Then implement the refactoring directly in the codebase. Do not just report — make the code changes."

If telemetry/data feedback exists:
- subagent_type: "psd-coding-system:validation:telemetry-data-specialist"
- description: "Address telemetry/data pipeline feedback for PR #$PR_NUMBER"
- prompt: "Analyze the telemetry/data feedback: $TELEMETRY_DATA_FEEDBACK. Validate jq queries, regex patterns, and aggregation logic. Then implement fixes directly in the codebase. Do not just report — make the code changes."

If shell/DevOps feedback exists:
- subagent_type: "psd-coding-system:domain:shell-devops-specialist"
- description: "Address shell/DevOps feedback for PR #$PR_NUMBER"
- prompt: "Analyze the shell/DevOps feedback: $SHELL_DEVOPS_FEEDBACK. Check exit codes, JSON parsing, hook integration. Then implement fixes directly in the codebase. Do not just report — make the code changes."

If configuration feedback exists:
- subagent_type: "psd-coding-system:validation:configuration-validator"
- description: "Address configuration consistency feedback for PR #$PR_NUMBER"
- prompt: "Analyze the configuration feedback: $CONFIG_FEEDBACK. Verify version consistency across 5 locations, model name consistency. Then implement fixes directly in the codebase. Do not just report — make the code changes."

If UX feedback exists or UI files changed:
- subagent_type: "psd-coding-system:domain:ux-specialist"
- description: "Address UX/usability feedback for PR #$PR_NUMBER"
- prompt: "Evaluate UX considerations for PR changes. Check against 68 usability heuristics including Nielsen's 10, accessibility (WCAG AA), cognitive load, error handling, and user control. Address specific feedback: $UX_FEEDBACK. Then implement fixes directly in the codebase. Do not just report — make the code changes."

#### Conditional Context-Based Agents

If migration files detected in diff:
- subagent_type: "psd-coding-system:review:data-migration-expert"
- description: "Migration validation for PR #$PR_NUMBER"
- prompt: "Validate data migration: Check foreign key integrity, ID mappings, data transformation logic. Provide pre/post deployment validation queries."

If migration files detected in diff:
- subagent_type: "psd-coding-system:review:deployment-verification-agent"
- description: "Deployment checklist for PR #$PR_NUMBER"
- prompt: "Generate Go/No-Go deployment checklist for PR with migration/schema changes. Include rollback plan, validation queries, and risk assessment."

If PR is linked to a bug issue (bug label detected):
- subagent_type: "psd-coding-system:workflow:bug-reproduction-validator"
- description: "Bug reproduction for PR #$PR_NUMBER"
- prompt: "Validate the bug fix in this PR. Reproduce the original bug, collect evidence, verify the fix addresses the root cause. Provide structured reproduction report."

If PR diff contains migration files, schema changes, or ORM model modifications (detect via grep for `migration`, `.prisma`, `models.py`, `schema.`, `CreateTable`, `ALTER TABLE`):
- subagent_type: "psd-coding-system:review:schema-drift-detector"
- description: "Schema drift check for PR #$PR_NUMBER"
- prompt: "Detect schema drift in this PR. Compare ORM model definitions against migration files and raw SQL schemas. Flag missing migrations, orphaned columns, index drift, and type mismatches. Provide drift report with severity levels."

If PR touches database models, user-facing data handling, or files with PII-related naming (detect via grep for `user`, `student`, `email`, `password`, `personal`, `ssn`, `address`):
- subagent_type: "psd-coding-system:review:data-integrity-guardian"
- description: "PII/compliance scan for PR #$PR_NUMBER"
- prompt: "Scan PR changes for PII patterns, unencrypted sensitive data, access control gaps, and FERPA/GDPR compliance issues. Focus on student records, personal data handling, and encryption status. Provide compliance report with remediation steps."

### Phase 2.5: Language-Specific Deep Review (NEW - Post-PR Full Review)

**Detect languages from PR diff** and invoke language reviewers in FULL mode:

```bash
# Detect languages in changed files
HAS_TYPESCRIPT=$(echo "$FILES_CHANGED" | grep -E '\.(ts|tsx|js|jsx)$' | head -1)
HAS_PYTHON=$(echo "$FILES_CHANGED" | grep -E '\.py$' | head -1)
HAS_SWIFT=$(echo "$FILES_CHANGED" | grep -E '\.swift$' | head -1)
HAS_SQL=$(echo "$FILES_CHANGED" | grep -E '\.sql$' | head -1)
HAS_MIGRATION=$(echo "$FILES_CHANGED" | grep -iE 'migration' | head -1)

echo "=== Language-Specific Deep Review ==="
[ -n "$HAS_TYPESCRIPT" ] && echo "  TypeScript/JavaScript: FULL review"
[ -n "$HAS_PYTHON" ] && echo "  Python: FULL review"
[ -n "$HAS_SWIFT" ] && echo "  Swift: FULL review"
[ -n "$HAS_SQL" ] && echo "  SQL: FULL review"
[ -n "$HAS_MIGRATION" ] && echo "  Migration files: Deployment verification required"
```

**Invoke language reviewers in parallel (FULL MODE):**

If TypeScript/JavaScript detected:
- subagent_type: "psd-coding-system:review:typescript-reviewer"
- description: "Full TS review for PR #$PR_NUMBER"
- prompt: "FULL MODE review: Comprehensive TypeScript/JavaScript analysis including: type safety, error handling, null checks, async patterns, performance, security. Review full diff."

If Python detected:
- subagent_type: "psd-coding-system:review:python-reviewer"
- description: "Full Python review for PR #$PR_NUMBER"
- prompt: "FULL MODE review: Comprehensive Python analysis including: type hints, error handling, async patterns, security, performance, PEP8 compliance. Review full diff."

If Swift detected:
- subagent_type: "psd-coding-system:review:swift-reviewer"
- description: "Full Swift review for PR #$PR_NUMBER"
- prompt: "FULL MODE review: Comprehensive Swift analysis including: optionals, memory management, concurrency, SwiftUI patterns, security. Review full diff."

If SQL detected:
- subagent_type: "psd-coding-system:review:sql-reviewer"
- description: "Full SQL review for PR #$PR_NUMBER"
- prompt: "FULL MODE review: Comprehensive SQL analysis including: injection prevention, performance, indexes, constraints, transactions. Review full diff."

### Phase 2.6: Deployment Verification (NEW - For Migrations)

**Only if migration files detected:**

If migrations detected:
- subagent_type: "psd-coding-system:review:deployment-verification-agent"
- description: "Deployment checklist for PR #$PR_NUMBER"
- prompt: "Generate Go/No-Go deployment checklist for PR with migration/schema changes. Include rollback plan, validation queries, and risk assessment. Add checklist to PR comment."

If migrations detected:
- subagent_type: "psd-coding-system:review:data-migration-expert"
- description: "Migration validation for PR #$PR_NUMBER"
- prompt: "Validate data migration: Check foreign key integrity, ID mappings, data transformation logic. Provide pre/post deployment validation queries."

**Wait for all agents to return, then synthesize their recommendations into a unified response plan.**

### Phase 3: Severity Classification + Address Feedback

#### Step 1: Classify All Findings by Severity

Before addressing feedback, classify all findings from ALL agents into priority tiers:

```markdown
### Severity Classification

**P1 — Blocks Merge:**
- Security vulnerabilities (XSS, injection, auth bypass)
- Data loss risks (missing transactions, cascade deletes)
- Authentication/authorization bypasses
- Critical performance regressions (10x+ slowdown)
- Breaking API changes without migration path

**P2 — Must Fix Before Merge:**
- SOLID violations (from architecture-strategist)
- Missing error handling on critical paths
- Missing tests for critical paths
- Accessibility violations (WCAG AA)
- Significant code duplication (from pattern-recognition-specialist)
- Over-engineering / YAGNI violations (from code-simplicity-reviewer)

**P3 — Low Priority (Fix Before Merge):**
- Code style improvements
- Minor performance optimizations
- Documentation gaps
- Naming improvements
- Minor duplication (< 3 occurrences)
- Simplification opportunities
```

#### Step 2: Address Feedback by Priority

Using synthesized agent recommendations, systematically address each comment in priority order:
1. **P1 first** — Fix all blocking issues before anything else
2. **P2 next** — Address must-fix items
3. **P3 last** — Fix ALL P3 items. If it was worth flagging, it's worth fixing. No deferring to follow-up issues.
4. Test each change
5. Respond to the reviewer

### Phase 4: Update PR
```bash
# After making changes, commit with clear message
git add -A
git commit -m "fix: address PR feedback (Round $REVIEW_ROUND)

- [Addressed comment about X]
- [Fixed issue with Y]
- [Improved Z per review]

Addresses review comments in PR #$PR_NUMBER"

# Generate timestamp and SHA for round marker
CURRENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CURRENT_SHA=$(git rev-parse HEAD)

# Post summary comment on PR with severity breakdown and round marker
gh pr comment $PR_NUMBER --body "## Review Feedback Addressed (Round $REVIEW_ROUND)

<!-- review-pr:round:${REVIEW_ROUND}:timestamp:${CURRENT_TIMESTAMP}:sha:${CURRENT_SHA} -->

$(if [ "$INCREMENTAL" = true ]; then
  echo "**Incremental review** — only processed new feedback since Round $PREV_ROUND ($SINCE_TIMESTAMP)"
  echo ""
fi)
### Severity Summary
- **P1 (Blocking):** [count] found → [count] resolved
- **P2 (Must Fix):** [count] found → [count] resolved
- **P3 (Suggestions):** [count] found → [count] fixed

### Changes Made:
- [Specific change 1]
- [Specific change 2]
- [Specific change 3]

### Review Agents Used:
$(if [ "$INCREMENTAL" != true ]; then
  echo "- Architecture strategist (SOLID compliance)"
  echo "- Code simplicity reviewer (YAGNI enforcement)"
  echo "- Pattern recognition specialist (duplication detection)"
  echo "- Correctness reviewer (logic errors, edge cases, state bugs)"
  echo "- Adversarial reviewer (failure scenarios, boundary stress-testing)"
fi)
- [Additional conditional agents invoked]

### Testing:
- All tests passing
- Linting and type checks clean
- Manual testing completed

Ready for re-review. Thank you for the feedback!"

# Push updates
git push
```

### Phase 5: Quality Checks
```bash
# Ensure all checks pass
npm run lint
npm run typecheck
npm test

# Verify CI/CD status
gh pr checks $PR_NUMBER --watch
```

## Response Templates

### For Bug Fixes
```markdown
Good catch! Fixed in [commit-hash]. The issue was [explanation].
Added a test to prevent regression.
```

### For Architecture Feedback
```markdown
You're right about [concern]. I've refactored to [solution].
This better aligns with our [pattern/principle].
```

### For Style/Convention Issues
```markdown
Updated to follow project conventions. Changes in [commit-hash].
```

### For Clarification Requests
```markdown
Thanks for asking. [Detailed explanation].
I've also added a comment in the code for future clarity.
```

### When Disagreeing Respectfully
```markdown
I see your point about [concern]. I chose this approach because [reasoning].
However, I'm happy to change it if you feel strongly. What do you think about [alternative]?
```

## Quick Commands

```bash
# Mark conversations as resolved after addressing
gh pr review $PR_NUMBER --comment --body "All feedback addressed"

# Request re-review from specific reviewer
gh pr review $PR_NUMBER --request-reviewer @username

# Check if PR is ready to merge
gh pr ready $PR_NUMBER

# Merge when approved (to dev!)
gh pr merge $PR_NUMBER --merge --delete-branch
```

## Best Practices

1. **Address all comments** - Don't ignore any feedback
2. **Be gracious** - Thank reviewers for their time
3. **Explain changes** - Help reviewers understand your fixes
4. **Test thoroughly** - Ensure fixes don't introduce new issues
5. **Keep PR focused** - Don't add unrelated changes
6. **Use agents** - Leverage expertise for complex feedback
7. **Document decisions** - Add comments for non-obvious choices

## Follow-up Actions

After PR is approved and merged:
1. Delete the feature branch locally: `git branch -d feature/branch-name`
2. Update local dev: `git checkout dev && git pull origin dev`
3. Close related issue if not auto-closed

**All review findings must be fixed in this session. Do not create GitHub issues for findings. If blocked by an external constraint, stop and use the AskUserQuestion tool to explain the constraint and ask how to proceed.**

## Success Criteria

- All review comments addressed
- CI/CD checks passing
- Reviewers satisfied with changes
- PR approved and ready to merge
- Code quality maintained or improved

```bash
echo "PR review completed successfully!"
```

### Phase 6: Learning Capture

Always dispatch the learning-writer agent with a session summary. **You MUST fill in the bracketed placeholders below with actual data from this session** — do not pass the template text literally.

- subagent_type: "psd-coding-system:workflow:learning-writer"
- description: "Capture PR review learning for #$PR_NUMBER"
- prompt: "SUMMARY=[FILL: Round $REVIEW_ROUND review of PR #$PR_NUMBER — what review patterns were found, severity breakdown, agents invoked] KEY_INSIGHT=[FILL: the most notable mistake pattern or prevention strategy from this session] CATEGORY=[FILL: one of build-errors, test-failures, runtime-errors, performance, security, database, ui, integration, logic, workflow, debugging] TAGS=[FILL: comma-separated relevant tags]. Write the learning document."

**Do not block on this agent** — if it fails, proceed without learning capture.

Remember: Reviews make code better. Embrace feedback as an opportunity to improve.
