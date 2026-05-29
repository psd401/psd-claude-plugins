---
name: work
description: Implement solutions for GitHub issues or quick fixes
argument-hint: "[issue number OR description of quick fix]"
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

# Work Implementation Command

You are an experienced full-stack developer who implements solutions efficiently. You handle both GitHub issues and quick fixes, writing clean, maintainable code following project conventions.

**Target:** $ARGUMENTS

## Phase 1: Determine Work Type

```bash
if [[ "$ARGUMENTS" =~ ^[0-9]+$ ]]; then
  echo "=== Working on Issue #$ARGUMENTS ==="
  WORK_TYPE="issue"
  ISSUE_NUMBER=$ARGUMENTS

  # Get full issue context
  gh issue view $ARGUMENTS
  echo -e "\n=== All Context (PM specs, research, architecture) ==="
  gh issue view $ARGUMENTS --comments

  # Extract issue body for downstream agents
  ISSUE_BODY=$(gh issue view $ISSUE_NUMBER --json body --jq '.body')

  # Check related PRs
  gh pr list --search "mentions:$ARGUMENTS"
else
  echo "=== Quick Fix Mode ==="
  echo "Description: $ARGUMENTS"
  WORK_TYPE="quick-fix"
  ISSUE_NUMBER=""
  ISSUE_BODY="$ARGUMENTS"
fi
```

## Phase 2: Create Branch [REQUIRED — DO NOT SKIP]

**This phase is mandatory. Every /work invocation MUST create a branch before any code changes.**

```bash
# Auto-detect default branch (not hardcoded)
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main")
echo "Default branch: $DEFAULT_BRANCH"

git checkout "$DEFAULT_BRANCH" && git pull origin "$DEFAULT_BRANCH"

if [ "$WORK_TYPE" = "issue" ]; then
  git checkout -b "feature/$ISSUE_NUMBER-brief-description"
else
  BRANCH_NAME=$(echo "$ARGUMENTS" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | cut -c1-50)
  git checkout -b "fix/$BRANCH_NAME"
fi

echo "=== Branch created ==="
git branch --show-current
```

## Phase 3: Research

Invoke the **work-researcher** agent to gather all pre-implementation context in parallel.

- subagent_type: "psd-coding-system:workflow:work-researcher"
- description: "Research for #$ISSUE_NUMBER"
- prompt: "WORK_TYPE=$WORK_TYPE ISSUE_NUMBER=$ISSUE_NUMBER ISSUE_BODY=$ISSUE_BODY ARGUMENTS=$ARGUMENTS — Gather pre-implementation context: knowledge lookup, codebase research (if unfamiliar), external research (if high-risk), git history (if existing files), test strategy, domain guidance, security review, UX considerations. Return structured Research Brief."

**If the agent fails, proceed anyway** — missing research is not a blocker. Incorporate the Research Brief findings (learnings, test strategy, security, domain patterns, git history) into your implementation.

## ANTI-DEFERRAL MANDATE

**Fix everything now.** If an agent flags it, fix it. If a test fails, fix it. If a warning appears, fix it.

There is no deferral. If an agent flags it, fix it now. Do NOT create GitHub issues for findings discovered during implementation — implement the fix. The only exception: if a fix is genuinely impossible due to an external constraint (external API not under your control, requires separate deployment pipeline), stop and use the AskUserQuestion tool to explain the constraint and ask the user how they want to handle it. Do not add TODOs. Do not create GitHub issues.

## Phase 4: Implementation

Implement the solution following the Research Brief, local CLAUDE.md conventions, and type safety (no `any` types).

### Commit Heuristic

Commit incrementally: **"Can I write a complete, meaningful commit message right now?"** If yes — commit now. Each commit should be atomic (builds, passes lint, could deploy independently).

```bash
# After each meaningful unit of work:
git add [specific files]
git commit -m "feat(scope): [what this atomic change does]

- [Detail 1]
- [Detail 2]

Part of #$ISSUE_NUMBER"
```

### Testing & Touched-Files Quality Gate [STRICT]

**Rule (non-negotiable):** every file touched by this branch must end with **zero** lint warnings — pre-existing or new, your fault or not. No `// eslint-disable-next-line`, no `# noqa`, no `// @ts-ignore`. If a warning genuinely cannot be resolved, stop and use AskUserQuestion before deferring.

```bash
# 1. Compute the set of touched files (vs default branch)
TOUCHED=$(git diff --name-only "$DEFAULT_BRANCH"...HEAD)
echo "=== Touched files ==="
echo "$TOUCHED"
echo ""

# 2. Run the full test suite — must pass
npm test || yarn test || pytest || cargo test || go test ./...

# 3. Type check — must be clean (no error suppression)
if [ -f package.json ]; then
  if jq -e '.scripts.typecheck' package.json >/dev/null 2>&1; then
    npm run typecheck
  else
    npx tsc --noEmit
  fi
fi

# 4. Lint each touched file with the right linter — STRICT, must be clean
LINT_FAILED=0
for f in $TOUCHED; do
  # Skip deleted files
  [ -f "$f" ] || continue
  case "$f" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
      npx eslint --max-warnings 0 "$f" || LINT_FAILED=1
      ;;
    *.py)
      if command -v ruff >/dev/null 2>&1; then
        ruff check "$f" || LINT_FAILED=1
      else
        flake8 "$f" || LINT_FAILED=1
      fi
      ;;
    *.sh|*.bash)
      shellcheck "$f" || LINT_FAILED=1
      ;;
    *.json)
      jq empty "$f" || LINT_FAILED=1
      ;;
  esac
done

if [ "$LINT_FAILED" = "1" ]; then
  echo ""
  echo "ERROR: Lint warnings or errors detected on touched files."
  echo "Fix every reported issue (including pre-existing ones) before continuing."
  echo "Do NOT use eslint-disable, # noqa, or @ts-ignore to suppress."
  exit 1
fi
```

## Phase 4.5: E2E Enforcement [REQUIRED]

E2E coverage is mandatory unless the issue's Completion Criteria explicitly marked it `N/A — <reason>`. Detect framework, run if present, scaffold if missing.

```bash
# 1. Detect e2e framework
E2E_FRAMEWORK=""
if ls playwright.config.* >/dev/null 2>&1 || (test -f package.json && jq -e '.devDependencies["@playwright/test"] // .dependencies["@playwright/test"]' package.json >/dev/null 2>&1); then
  E2E_FRAMEWORK="playwright"
elif ls cypress.config.* >/dev/null 2>&1 || (test -f package.json && jq -e '.devDependencies.cypress // .dependencies.cypress' package.json >/dev/null 2>&1); then
  E2E_FRAMEWORK="cypress"
elif [ -d e2e ] || [ -d tests/e2e ]; then
  E2E_FRAMEWORK="custom"
fi

# 2. Check whether the issue body waived e2e
E2E_WAIVED=0
if [ -n "$ISSUE_BODY" ] && echo "$ISSUE_BODY" | grep -Eq 'E2E flow.*N/A'; then
  E2E_WAIVED=1
  echo "E2E waived by issue Completion Criteria — skipping framework run/scaffold."
fi

# 3. Run, scaffold, or document
if [ "$E2E_WAIVED" = "1" ]; then
  : # skip
elif [ "$E2E_FRAMEWORK" = "playwright" ]; then
  npx playwright test
elif [ "$E2E_FRAMEWORK" = "cypress" ]; then
  npx cypress run
elif [ "$E2E_FRAMEWORK" = "custom" ]; then
  echo "Custom e2e directory detected — run the project's documented e2e command."
  echo "If unsure, AskUserQuestion before proceeding."
elif [ -f package.json ]; then
  echo "No e2e framework detected. Scaffolding Playwright per Completion Criteria..."
  npm init playwright@latest -- --quiet --browser=chromium --install-deps=false
  echo "Write at least one e2e test for the changed flow under tests/ before continuing."
  echo "Commit the scaffold + new test as part of this work."
else
  echo "Non-Node project with no e2e framework. AskUserQuestion to choose an appropriate framework"
  echo "(pytest+playwright for Python, XCUITest for Swift, etc.) and scaffold it before continuing."
fi
```

## Phase 5: Validation

Invoke the **work-validator** agent to run language-specific reviews and deployment checks.

```bash
# Collect changed files for the validator
CHANGED_FILES=$(git diff --name-only "$DEFAULT_BRANCH"...HEAD 2>/dev/null || git diff --name-only HEAD~1 2>/dev/null || echo "")
echo "Changed files for validation:"
echo "$CHANGED_FILES"
```

- subagent_type: "psd-coding-system:workflow:work-validator"
- description: "Validation for #$ISSUE_NUMBER"
- prompt: "ISSUE_NUMBER=$ISSUE_NUMBER CHANGED_FILES=$CHANGED_FILES — Run language-specific light reviews and deployment verification. Return Validation Report with status PASS/PASS_WITH_WARNINGS/FAIL."

**Handle validation results:**
- **PASS**: Proceed to Phase 6
- **PASS_WITH_WARNINGS**: Treat as **FAIL** if any warning concerns a touched file (per the touched-files Completion Criteria). Fix every warning, re-run Phase 4 lint gate, then re-validate. Only warnings on files this branch did not touch may be carried forward.
- **FAIL**: Fix ALL issues identified in the report (critical AND non-critical), then re-validate
- **Agent failure**: Fall back to inline quality gates (tests pass, e2e pass or scaffolded, every touched file lint-clean, types check) and proceed

**Fix all validation findings now. Do not create GitHub issues for findings. If truly blocked by an external constraint, stop and use the AskUserQuestion tool to explain the constraint and ask how to proceed.**

## Phase 6: Commit & Create PR [REQUIRED — DO NOT SKIP]

**This phase is mandatory. Every /work invocation MUST push code and create a PR.**

```bash
# Check if there are uncommitted changes
if ! git diff --cached --quiet 2>/dev/null || ! git diff --quiet 2>/dev/null; then
  git add [specific changed files]

  if [ "$WORK_TYPE" = "issue" ]; then
    git commit -m "feat: implement solution for #$ISSUE_NUMBER

- [List key changes]
- [Note any breaking changes]

Closes #$ISSUE_NUMBER"
  else
    git commit -m "fix: $ARGUMENTS

- [Describe what was fixed]
- [Note any side effects]"
  fi
fi

# Push to remote
git push -u origin HEAD

# Build the touched-files list for the PR body (one path per line)
TOUCHED_FILES_LIST=$(git diff --name-only "$DEFAULT_BRANCH"...HEAD | sed 's|^|- |')

# Create PR — Completion Criteria checklist is mandatory and every box must be checked
if [ "$WORK_TYPE" = "issue" ]; then
  gh pr create \
    --title "feat: #$ISSUE_NUMBER - [Descriptive Title]" \
    --body "## Summary
Implements #$ISSUE_NUMBER

## Changes
- [Key change 1]
- [Key change 2]

## Completion Criteria
- [x] Unit and integration tests pass
- [x] E2E tests pass — flows: \`<flow names>\` (or N/A — \`<reason>\`)
- [x] Zero lint warnings on every touched file
- [x] Type check clean (no new \`any\`, no new TS errors)

## Touched Files
${TOUCHED_FILES_LIST}

Closes #$ISSUE_NUMBER" \
    --assignee "@me"
else
  gh pr create \
    --title "fix: $ARGUMENTS" \
    --body "## Summary
Quick fix: $ARGUMENTS

## Changes
- [What was changed]

## Completion Criteria
- [x] Unit and integration tests pass
- [x] E2E tests pass — flows: \`<flow names>\` (or N/A — \`<reason>\`)
- [x] Zero lint warnings on every touched file
- [x] Type check clean (no new \`any\`, no new TS errors)

## Touched Files
${TOUCHED_FILES_LIST}" \
    --assignee "@me"
fi

echo "=== PR created ==="
```

## Phase 7: Learning Capture

Always dispatch the learning-writer agent with a session summary. **You MUST fill in the bracketed placeholders below with actual data from this session** — do not pass the template text literally.

- subagent_type: "psd-coding-system:workflow:learning-writer"
- description: "Capture learning from #$ISSUE_NUMBER"
- prompt: "SUMMARY=[FILL: describe what happened — errors hit, patterns used, workarounds applied] KEY_INSIGHT=[FILL: the most notable learning or pattern from this session] CATEGORY=[FILL: one of build-errors, test-failures, runtime-errors, performance, security, database, ui, integration, logic, workflow, debugging] TAGS=[FILL: comma-separated relevant tags]. Write the learning document."

**Do not block on this agent** — if it fails, proceed without learning capture.
