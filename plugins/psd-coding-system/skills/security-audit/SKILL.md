---
name: security-audit
description: Security audit for code review and vulnerability analysis
argument-hint: "[PR number]"
model: claude-opus-4-8
effort: high
context: fork
agent: general-purpose
allowed-tools:
  - Task
  - Bash(*)
extended-thinking: true
---

# Security Audit Command (Wrapper)

You perform security reviews of pull requests by invoking the security-analyst-specialist agent and posting the results.

**PR Number:** $ARGUMENTS

**Note:** This command is automatically run by `/work` after PR creation. For manual security audits, use: `/psd-coding-system:security-audit [pr_number]`

## Workflow

### Step 1: Invoke Security Analyst Agent

Use the Task tool to invoke security analysis:
- `subagent_type`: "psd-coding-system:review:security-analyst-specialist"
- `description`: "Security audit for PR #$ARGUMENTS"
- `prompt`: "Perform comprehensive security audit on PR #$ARGUMENTS. Analyze all changed files for:

1. **Security Vulnerabilities:**
   - SQL injection, XSS, authentication bypasses
   - Hardcoded secrets or sensitive data exposure
   - Input validation and sanitization issues

2. **Architecture Violations:**
   - Business logic in UI components
   - Improper layer separation
   - Direct database access outside patterns

3. **Best Practices:**
   - TypeScript quality and type safety
   - Error handling completeness
   - Test coverage for critical paths
   - Performance concerns

Return structured findings in the specified format."

### Step 1.5: Data Integrity Scan

Always invoke the data-integrity-guardian for PII and compliance scanning during security audits:

Use the Task tool:
- `subagent_type`: "psd-coding-system:review:data-integrity-guardian"
- `description`: "Data integrity scan for PR #$ARGUMENTS"
- `prompt`: "Perform comprehensive PII and compliance scan on PR #$ARGUMENTS. Check for:

1. **PII Exposure:**
   - Unencrypted sensitive data (SSN, email, phone, credit card)
   - Sensitive data in logs, URLs, or error messages
   - Plaintext password storage

2. **FERPA Compliance (Education):**
   - Student record protection (grades, IEP, attendance, disciplinary)
   - Parent/guardian data handling
   - Directory information opt-out support

3. **GDPR Compliance:**
   - Right to erasure support
   - Data portability capabilities
   - Consent management
   - Data retention policies

4. **Access Control:**
   - Role-based access on sensitive endpoints
   - Data scoping (users only see their own data)
   - Authentication on protected routes

Return structured compliance findings."

**Merge data integrity findings with security analysis** in the consolidated comment.

### Step 2: Post Consolidated Comment

The agent will return structured findings. Format and post as a single consolidated PR comment:

```bash
# Post the security review as a single comment
gh pr comment $ARGUMENTS --body "## Automated Security & Best Practices Review

[Format the agent's structured findings here]

### Summary
- Critical Issues: [count from agent]
- High Priority: [count from agent]
- Low Priority: [count from agent]

### Critical Issues (Must Fix Before Merge)
[Critical findings from agent with file:line, problem, fix, reference]

### High Priority (Should Fix Before Merge)
[High priority findings from agent]

### Low Priority (Fix Before Merge)
[Low priority findings from agent]

### Positive Practices Observed
[Good practices noted by agent]

### Required Actions
1. Fix all critical issues
2. Fix all high priority issues
3. Fix all low priority issues
4. Run security checks: \`npm audit\`, \`npm run lint\`, \`npm run typecheck\`
5. Verify all tests pass after fixes

---
*Automated security review by security-analyst-specialist agent*"

echo "Security audit completed and posted to PR #$ARGUMENTS"
```

### Step 3: Fix All Findings

After posting the review comment, fix every finding. Do NOT create GitHub issues for any findings — every critical, high, and low priority finding gets a code fix in this session. If a finding cannot be fixed due to an external constraint outside this codebase, stop and use the AskUserQuestion tool to explain the constraint and ask the user how they want to handle it. Do not add TODOs. No issue creation.

1. **Critical issues** — Fix immediately, these block merge
2. **High priority** — Fix all of them
3. **Low priority** — Fix all of them

Commit fixes and push:
```bash
git add [specific changed files]
git commit -m "fix: address security audit findings for PR #$ARGUMENTS

- [List each finding fixed]"
git push
```

## Key Features

- **Comprehensive Analysis**: Covers security, architecture, and best practices
- **Single Comment**: All findings consolidated into one easy-to-review comment
- **Actionable Feedback**: Includes specific fixes and code examples
- **Severity Levels**: Critical, High, Suggestions
- **Educational**: References to OWASP and project documentation

## When to Use

**Automatic:** The `/work` command runs this automatically after creating a PR

**Manual:** Use this command when:
- You want to audit an existing PR
- You need to re-run security analysis after fixes
- You're reviewing someone else's PR

## Example Usage

```bash
# Manual security audit of PR #123
/psd-coding-system:security-audit 123
```

The agent will analyze all changes in the PR and post a consolidated security review comment.
