---
name: worktree
description: Parallel development with git worktrees — create/list/remove worktrees, plus `clean` for post-merge hygiene (prune worktrees, delete merged local+remote branches, close orphaned issues)
argument-hint: "[issue-number | branch-name | list | clean | prune | remove <branch>]"
model: claude-opus-4-8
effort: high
context: fork
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Grep
  - Glob
  - AskUserQuestion
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
  prune)
    SUBCOMMAND="prune"
    ;;
  clean|sweep|tidy)
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

### If `prune` (worktrees only — lightweight):

```bash
echo "=== Pruning stale worktrees ==="
git worktree prune --verbose

echo ""
echo "=== Remaining worktrees ==="
git worktree list
```

### If `clean` (post-merge hygiene — restores what `/clean-branch` used to do):

Sweeps merged branches (local **and** remote, squash-merge-aware), stale worktrees, and issues that should be closed. Gather the candidates first; the destructive steps (remote-branch deletion, issue closing) are confirmed before running.

```bash
echo "=== /worktree clean — post-merge hygiene ==="
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo main)
if git ls-remote --exit-code --heads origin dev >/dev/null 2>&1; then BASE=dev; else BASE="$DEFAULT_BRANCH"; fi
CUR=$(git branch --show-current); PROT='^(main|master|dev|HEAD)$'

git fetch --prune origin --quiet 2>/dev/null || true   # drop tracking refs for branches already deleted on the remote

echo "--- 1. local branches whose work is merged (safe to delete) ---"
LOCAL_DELETE=""
for b in $(git for-each-ref --format='%(refname:short)' refs/heads/); do
  echo "$b" | grep -qE "$PROT" && continue
  [ "$b" = "$CUR" ] && continue
  # normal-merged into base, OR its PR is merged (covers squash merges, which change the SHA)
  if git merge-base --is-ancestor "$b" "origin/$BASE" 2>/dev/null \
     || [ -n "$(gh pr list --head "$b" --state merged --limit 1 --json number --jq '.[].number' 2>/dev/null)" ]; then
    LOCAL_DELETE="$LOCAL_DELETE $b"
  fi
done
echo "${LOCAL_DELETE:-(none)}"

echo "--- 2. worktrees (remove any on a merged/gone branch) ---"
git worktree list

echo "--- 3. remote branches whose PR is MERGED/CLOSED (dependabot excluded) ---"
REMOTE_DELETE=""
for rb in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/ | sed 's#^origin/##'); do
  echo "$rb" | grep -qE "$PROT" && continue
  echo "$rb" | grep -qE '^dependabot/' && continue     # Dependabot manages its own branches
  S=$(gh pr list --head "$rb" --state all --limit 1 --json state --jq '.[].state' 2>/dev/null)
  case "$S" in MERGED|CLOSED) REMOTE_DELETE="$REMOTE_DELETE $rb" ;; esac
done
echo "${REMOTE_DELETE:-(none)}"

echo "--- 4. issues still OPEN whose linked PR already merged ---"
ORPHANS=""
for pr in $(gh pr list --state merged --limit 30 --json number --jq '.[].number' 2>/dev/null); do
  for issue in $(gh pr view "$pr" --json closingIssuesReferences --jq '.closingIssuesReferences[].number' 2>/dev/null); do
    [ "$(gh issue view "$issue" --json state --jq '.state' 2>/dev/null)" = "OPEN" ] && ORPHANS="$ORPHANS #${issue}(PR#${pr})"
  done
done
echo "${ORPHANS:-(none)}"
```

Then act on the candidates:

1. **Local branches** — delete the merged ones (they're already merged, so this is non-destructive): `git branch -D <branch>` for each in list 1.
2. **Worktrees** — `git worktree prune`; for any worktree whose branch is in list 1 (merged) or gone, `git worktree remove <path>` (confirm no uncommitted changes first; `git worktree list` shows paths). Both `.worktrees/*` (manual) and `.claude/worktrees/*` (auto from `/lfg`) are covered.
3. **Remote branches** (list 3) — remote deletion is destructive and outward-facing. **Use AskUserQuestion to confirm the list first**, then `git push origin --delete <branch>` for each approved branch.
4. **Orphan issues** (list 4) plus any merged PR that had **no** closing reference but an issue number in its head branch (`feature/<N>-…`, `claude/lfg-issue-<N>-…`) — surface those as *candidates*, and verify each really is the work that PR did (check the issue title) before acting. **Confirm with AskUserQuestion**, then `gh issue close <N> --comment "Closed via merged PR #<pr>."` for each approved one.

Print a summary: local branches deleted, remote branches deleted, worktrees removed, issues closed.

> **Note on auto-close:** issues only auto-close when their PR merges into the repo's **default** branch. If a repo's default is `main` but PRs target `dev`, `Closes #N` won't fire until `dev` → `main` — step 4 closes them explicitly so they don't linger.

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
echo "To run an independent session in this worktree:"
echo "  1. Open a NEW terminal/window"
echo "  2. cd $WORKTREE_DIR"
echo "  3. claude          # a fresh, isolated Claude Code session scoped to this folder"
echo "  4. /lfg $TARGET    # build this issue to done, in parallel with your other windows"
echo ""
echo "Repeat /worktree for another issue to run several /lfg sessions side by side."
echo "Full explanation: plugins/psd-coding-system/docs/patterns/worktrees-explained.md"
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
- **Status:** [created / listed / removed / pruned / cleaned]

**Tip:** Each worktree is a full, independent checkout. Open a separate Claude Code window in it and run `/lfg` — multiple worktrees = multiple `/lfg` sessions in parallel, with zero collisions. New to worktrees? Read `docs/patterns/worktrees-explained.md`.
```
