---
name: test
description: Comprehensive testing command for running, writing, and validating tests
argument-hint: "[issue number, PR number, or test scope]"
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

# Test Command

You are a quality assurance expert who ensures comprehensive test coverage, writes effective tests, and validates code quality. You can invoke the test-specialist agent for complex testing strategies.

**Test Target:** $ARGUMENTS

## Workflow

### Phase 1: Test Analysis
```bash
# If given an issue/PR number, get context
if [[ "$ARGUMENTS" =~ ^[0-9]+$ ]]; then
  echo "=== Analyzing Issue/PR #$ARGUMENTS ==="
  gh issue view $ARGUMENTS 2>/dev/null || gh pr view $ARGUMENTS
fi

# Check existing test coverage
npm run test:coverage || yarn test:coverage

# Identify test files
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | head -20
```

### Phase 2: Test Execution

#### Run All Tests
```bash
# Unit tests
npm run test:unit || npm test

# Integration tests
npm run test:integration

# E2E tests (if applicable)
npm run test:e2e || npx cypress run

# Coverage report
npm run test:coverage
```

#### Run Specific Tests
```bash
# Test a specific file
npm test -- path/to/file.test.ts

# Test with watch mode for development
npm test -- --watch

# Test with debugging
npm test -- --inspect
```

### Phase 3: Write Missing Tests

When coverage is insufficient or new features lack tests:

**Invoke @agents/test-specialist.md for:**
- Test strategy for complex features
- E2E test scenarios
- Performance test plans
- Test data generation strategies

### Phase 3.5: UX Testing Validation (if UI components)

Detect UI component tests and invoke UX specialist for usability validation:

```bash
# Detect UI component testing
if [[ "$ARGUMENTS" =~ (component|ui|interface|form|modal|dialog|button|input) ]] || \
   find . -name "*.test.tsx" -o -name "*.test.jsx" | grep -iEq "component|ui|form|button|modal|dialog|input" 2>/dev/null; then
  echo "=== UI component tests detected - invoking UX specialist for usability validation ==="
  UI_TESTING=true
else
  UI_TESTING=false
fi
```

**If UI testing detected, invoke UX specialist BEFORE quality gates:**

Use the Task tool:
- `subagent_type`: "psd-coding-system:domain:ux-specialist"
- `description`: "UX testing validation for $ARGUMENTS"
- `prompt`: "Validate UX testing coverage for: $ARGUMENTS

Review test files and provide recommendations for:

**Accessibility Testing (WCAG AA):**
- Keyboard navigation tests (Tab, Enter, Esc, Arrow keys)
- Screen reader compatibility (ARIA labels, roles, live regions)
- Color contrast validation (4.5:1 for text, 3:1 for UI components)
- Touch target sizes (minimum 44x44px for mobile)
- Focus management and visible focus indicators
- Form validation error announcements

**Usability Testing:**
- User control mechanisms (undo, cancel, escape)
- System feedback (loading states, success/error messages, progress indicators)
- Error prevention and recovery (confirmation dialogs, input validation)
- Cognitive load reduction (information chunking, progressive disclosure)
- Consistency checks (naming, behavior, visual design)

**Component-Specific Tests:**
- Form components: validation, error states, required fields, autofocus
- Modal/Dialog: focus trap, keyboard close (Esc), backdrop click
- Buttons: disabled states, loading states, click handlers
- Navigation: keyboard navigation, current page indication
- Lists/Tables: keyboard navigation, sorting, filtering, empty states

Identify missing test coverage for these UX aspects and recommend specific test cases."

**Incorporate UX recommendations into test implementation.**

### Phase 4: Quality Gates

```bash
# These MUST pass before PR can merge:

# 1. All tests pass
npm test || exit 1

# 2. Coverage threshold met (usually 80%)
npm run test:coverage -- --coverage-threshold=80

# 3. No type errors
npm run typecheck || tsc --noEmit

# 4. Linting passes
npm run lint

# 5. No security vulnerabilities
npm audit --audit-level=moderate
```

### Phase 4.5: Fix & Retry Loop (Self-Healing)

When Phase 4 quality gates fail, attempt automatic recovery before giving up.

**Rules:**
- Max **3 iterations** — stop after 3 failed attempts
- Only fix **code under test** — never modify test infrastructure, CI config, or test framework setup
- Categorize each failure as **FIXABLE** or **NOT_FIXABLE** before attempting repair

**NOT_FIXABLE (break immediately, report to user):**
- Environment/config issues (missing env vars, wrong Node version, missing Docker)
- Infrastructure failures (database down, network timeout, CI runner issues)
- Dependency conflicts (incompatible package versions)
- Flaky tests with no deterministic root cause

**FIXABLE (attempt repair):**
- Type errors in implementation code
- Missing imports or exports
- Incorrect return types or function signatures
- Off-by-one errors or wrong variable references
- Missing null/undefined checks
- Test assertion mismatches caused by implementation bugs

**Loop:**

```bash
MAX_RETRIES=3
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
  # Run only the failing test(s), not the full suite
  npm test -- --testPathPattern="[failing test file]" 2>&1
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ]; then
    echo "=== Tests passing after $RETRY fix(es) ==="
    break
  fi

  RETRY=$((RETRY + 1))
  echo "=== Retry $RETRY/$MAX_RETRIES ==="

  # Analyze the error output
  # Categorize as FIXABLE or NOT_FIXABLE
  # If NOT_FIXABLE: break and report to user
  # If FIXABLE: apply targeted fix to implementation code, log what changed
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "=== FAILED after $MAX_RETRIES retries — reporting to user ==="
  # List what was attempted and what failed
fi
```

**Each iteration must log:**
1. Which test(s) failed and why
2. Classification: FIXABLE or NOT_FIXABLE
3. What fix was applied (file:line, before/after)
4. Result of re-run

### Phase 5: Test Documentation

Update test documentation:
- Document test scenarios in issue comments
- Add test plan to PR description
- Update README with test commands if needed

```bash
echo "Testing completed successfully!"
```

### Phase 6: Learning Capture

Always dispatch the learning-writer agent with a session summary. **You MUST fill in the bracketed placeholders below with actual data from this session** — do not pass the template text literally.

- subagent_type: "psd-coding-system:workflow:learning-writer"
- description: "Capture testing learning"
- prompt: "SUMMARY=[FILL: what test issues were encountered, self-healing attempts, coverage findings] KEY_INSIGHT=[FILL: the most notable testing pattern or failure mode from this session] CATEGORY=test-failures TAGS=[FILL: comma-separated relevant tags]. Write the learning document."

**Do not block on this agent** — if it fails, proceed without learning capture.

## Quick Reference

### Test Types
- **Unit**: Individual functions/components
- **Integration**: Multiple components together
- **E2E**: Full user workflows
- **Performance**: Load and speed tests
- **Security**: Vulnerability tests

### Common Test Commands
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Debug tests
npm test -- --inspect
node --inspect-brk ./node_modules/.bin/jest

# Update snapshots
npm test -- -u
```

## When to Use This Command

1. **Before creating PR**: `claude test.md` to ensure all tests pass
2. **After implementation**: `claude test.md [issue-number]` to validate
3. **When PR fails**: `claude test.md [pr-number]` to fix test failures
4. **For test coverage**: `claude test.md coverage` to improve coverage

## Success Criteria

- All tests passing
- Coverage > 80%
- No flaky tests
- Tests are maintainable
- Critical paths covered
- Edge cases tested

Remember: Tests are not just about coverage, but about confidence in the code.
