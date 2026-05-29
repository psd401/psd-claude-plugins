---
name: clean-branch
description: Clean up merged branches, close issues, and extract compound learning insights
model: claude-opus-4-8
effort: high
context: new
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Edit
  - Write
  - Task
extended-thinking: true
---

# Branch Cleanup & PR Retrospective

You've just merged a PR. Now complete the post-merge cleanup workflow.

## Workflow

### Phase 1: Identify Current State

**CRITICAL**: The current branch from the shell is authoritative. Ignore any prior conversation context referencing other PRs or branches — only clean up the PR associated with the CURRENT branch as reported by `git branch --show-current`.

First, determine what branch you're on and find the associated merged PR and issue:

```bash
# Get current branch name — this is the ONLY source of truth
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Find merged PR for this branch — extract number and title as separate variables
PR_NUMBER=$(gh pr list --state merged --head "$CURRENT_BRANCH" --limit 1 --json number --jq '.[0].number // empty')
PR_TITLE=$(gh pr list --state merged --head "$CURRENT_BRANCH" --limit 1 --json title --jq '.[0].title // empty')
echo "Merged PR: #$PR_NUMBER — $PR_TITLE"

# Guard: stop if no merged PR found for this branch
if [ -z "$PR_NUMBER" ]; then
  echo "ERROR: No merged PR found for branch '$CURRENT_BRANCH'."
  echo "This skill only cleans up branches that have a merged PR."
  echo "If the PR was merged from a different branch name, switch to that branch first."
  exit 1
fi
```

**If no merged PR is found for the current branch, stop immediately and report:**

> No merged PR found for branch `$CURRENT_BRANCH`. This skill only cleans up branches that have a merged PR. If the PR was merged from a different branch name, switch to that branch first.

Do NOT fall back to guessing, searching other branches, or using PRs from prior conversation context.

```bash
# Get full PR details to find issue number (only if merged PR was found)
gh pr view "$PR_NUMBER" --json number,title,body
```

### Phase 2: Branch Cleanup

Dynamically detect the repository's default branch — do NOT hardcode `dev` or `main`:

```bash
# Detect the default branch dynamically (with fallback matching lfg/work skills)
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main")
echo "Default branch: $DEFAULT_BRANCH"

# Switch to default branch and pull latest
git checkout "$DEFAULT_BRANCH"
git pull origin "$DEFAULT_BRANCH"

# Delete local feature branch (use $CURRENT_BRANCH captured in Phase 1)
git branch -d "$CURRENT_BRANCH"

# Delete remote feature branch
git push origin --delete "$CURRENT_BRANCH"
```

### Phase 3: Close Associated Issue

Close the GitHub issue with a summary of what was completed:

```bash
# View issue to understand what was done
gh issue view <ISSUE_NUMBER>

# Close issue with comment summarizing the work
gh issue close <ISSUE_NUMBER> --comment "Completed in PR #$PR_NUMBER.

<Brief 1-2 sentence summary of what was implemented/fixed>

Changes merged to $DEFAULT_BRANCH."
```

## Important Notes

- **PR Analysis**: Compound engineering analysis happens automatically via the Stop hook
- **No manual telemetry**: The telemetry system will detect this command and analyze the PR for learning opportunities
- **Summary format**: Keep issue close comments concise but informative
- **Branch authority**: Always trust `git branch --show-current` over any conversation context

## What Happens Automatically

After you complete the cleanup, the telemetry system will:

1. Analyze the merged PR for patterns (review iterations, fix commits, common themes)
2. Identify compound engineering opportunities (automation, systematization, delegation)
3. Save insights to `meta/telemetry.json` in the `compound_learnings[]` array
4. Log suggestions for preventing similar issues in future PRs

This analysis looks for:
- **Delegation opportunities**: When specialized agents could have helped
- **Automation candidates**: Recurring manual processes
- **Systematization targets**: Knowledge for documentation
- **Prevention patterns**: Issues needing earlier intervention
