---
name: worktree
description: Parallel development using git worktrees — work on multiple branches simultaneously
argument-hint: "[branch-name or issue-number] [optional: base-branch]"
model: claude-opus-4-8
effort: high
context: fork
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Grep
  - Glob
extended-thinking: true
---

# Worktree Command

You manage parallel development using git worktrees. Worktrees let you work on multiple branches simultaneously without stashing or switching — each worktree is an independent checkout of the repo.

**Arguments:** $ARGUMENTS

## Phase 1: Parse Arguments & Detect Intent

```bash
ARGS="$ARGUMENTS"

# Detect subcommand
case "$ARGS" in
  list|ls)
    SUBCOMMAND="list"
    ;;
  clean|prune)
    SUBCOMMAND="clean"
    ;;
  remove\ *|rm\ *)
    SUBCOMMAND="remove"
    TARGET=$(echo "$ARGS" | sed 's/^remove //;s/^rm //')
    ;;
  *)
    SUBCOMMAND="create"
    TARGET="$ARGS"
    ;;
esac

echo "Subcommand: $SUBCOMMAND"
echo "Target: ${TARGET:-N/A}"
```

## Phase 2: Execute

### If `list`:

```bash
echo "=== Active Worktrees ==="
git worktree list

echo ""
echo "=== Branches in Worktrees ==="
git worktree list --porcelain | grep "^branch" | sed 's/branch refs\/heads\//  /'
```

### If `clean`:

```bash
echo "=== Pruning stale worktrees ==="
git worktree prune --verbose

echo ""
echo "=== Remaining worktrees ==="
git worktree list
```

### If `remove`:

```bash
echo "=== Removing worktree: $TARGET ==="

# Find the worktree path
WORKTREE_PATH=$(git worktree list | grep "$TARGET" | awk '{print $1}')

if [ -z "$WORKTREE_PATH" ]; then
  echo "Worktree '$TARGET' not found. Available worktrees:"
  git worktree list
  exit 1
fi

# Check for uncommitted changes
if [ -d "$WORKTREE_PATH" ]; then
  cd "$WORKTREE_PATH"
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    echo "WARNING: Worktree has uncommitted changes!"
    echo "Use AskUserQuestion to confirm before removing."
  fi
  cd -
fi
```

Use AskUserQuestion to confirm removal if there are uncommitted changes. Then:

```bash
git worktree remove "$WORKTREE_PATH"
echo "Worktree removed."
```

### If `create`:

```bash
# Parse target — could be "issue-number" or "branch-name" with optional base
if [[ "$TARGET" =~ ^[0-9]+$ ]]; then
  # Issue number — create branch from issue
  ISSUE_NUMBER="$TARGET"
  ISSUE_TITLE=$(gh issue view "$ISSUE_NUMBER" --json title --jq '.title' 2>/dev/null | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | cut -c1-40)
  BRANCH_NAME="feature/${ISSUE_NUMBER}-${ISSUE_TITLE}"
  echo "Creating worktree for issue #$ISSUE_NUMBER"
else
  BRANCH_NAME="$TARGET"
  echo "Creating worktree for branch: $BRANCH_NAME"
fi

# Determine base branch
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main")
BASE_BRANCH="${2:-$DEFAULT_BRANCH}"

# Create worktree directory
WORKTREE_DIR=".worktrees/$(basename "$BRANCH_NAME")"
mkdir -p "$(dirname "$WORKTREE_DIR")"

echo "Branch: $BRANCH_NAME"
echo "Base: $BASE_BRANCH"
echo "Path: $WORKTREE_DIR"

git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" "$BASE_BRANCH" 2>/dev/null || \
  git worktree add "$WORKTREE_DIR" "$BRANCH_NAME" 2>/dev/null

echo ""
echo "=== Worktree created ==="
echo "Path: $(pwd)/$WORKTREE_DIR"
echo "Branch: $BRANCH_NAME"
echo ""
echo "To work in this worktree:"
echo "  cd $WORKTREE_DIR"
echo ""
echo "Active worktrees:"
git worktree list
```

## Phase 3: Summary

Present the result clearly:

```markdown
### Worktree [Action]

- **Path:** [worktree path]
- **Branch:** [branch name]
- **Base:** [base branch]
- **Status:** [created / listed / removed / pruned]

**Tip:** Each worktree is a full checkout. You can run `/work`, `/test`, or any other command inside it independently.
```
