# Worktrees, explained (and how to run several `/lfg` sessions at once)

## The one-paragraph mental model

A **git worktree** is a second (third, fourth…) working folder for the *same* repository. Normally one repo = one folder, and you switch branches inside it. With worktrees, each branch gets its **own folder**, all sharing one underlying git history. Editing files in folder A never touches folder B. So you can open a separate Claude Code window in each folder and have several `/lfg` runs going **in parallel**, each on its own branch, with zero collisions — no stashing, no "wait, which branch am I on?"

```
my-app/                      ← main checkout (branch: main)
my-app/.worktrees/
  feature-142-search/        ← worktree (branch: feature/142-search)   ← Claude window #1 runs /lfg 142
  feature-150-export/        ← worktree (branch: feature/150-export)   ← Claude window #2 runs /lfg 150
  fix-login-redirect/        ← worktree (branch: fix/login-redirect)   ← Claude window #3 runs /lfg "..."
```

All four share the same `.git` data. A commit in window #1 is immediately visible to the others as a branch; you never merge folders — you merge **branches**, through normal PRs.

## The workflow: N windows, N worktrees, N `/lfg`

**Step 1 — create a worktree per task** (from your main checkout):

```bash
/worktree 142     # creates .worktrees/feature-142-... on a new branch from the default branch
/worktree 150
```

`/worktree` prints the exact path and the next steps. Under the hood it runs:

```bash
git worktree add -b feature/142-search .worktrees/feature-142-search origin/main
```

**Step 2 — open a new terminal/window per worktree and start Claude there:**

```bash
cd .worktrees/feature-142-search
claude
```

That window is now a **completely independent session** scoped to that folder/branch. (The `WorktreeCreate` hook already symlinks your `.env` into the new worktree so it runs.)

**Step 3 — run the work in each window:**

```
/lfg 142      # in window #1
/lfg 150      # in window #2
```

Each session implements, runs the verify gate, opens its own PR, and watches its own reviews — all at the same time, none stepping on the others.

**Step 4 — merge through PRs, then clean up:**

```bash
/worktree list            # see all active worktrees
/worktree remove 142      # after the PR merges (prompts if there are uncommitted changes)
/worktree clean           # prune stale entries
```

## Native helpers

Claude Code also has built-in worktree support (`EnterWorktree`/`ExitWorktree` in-session, and subagents can declare `isolation: worktree` to get a throwaway checkout). `/lfg`'s parallel sub-work uses `isolation: worktree` automatically so concurrent helper agents don't conflict. For the human multi-window flow above, plain `git worktree` + a separate `claude` per folder is the reliable, explicit path.

## Pitfalls

- **Don't check out the same branch in two worktrees** — git refuses; each branch lives in exactly one worktree.
- **Worktrees are folders on disk** — they take space and have their own `node_modules`. Run install once per worktree (or symlink/hardlink heavy dirs if your tooling supports it).
- **Clean up after merge** — a stale worktree pointing at a deleted branch is clutter; `/worktree clean` prunes them.
- **`.env` and secrets** — the `WorktreeCreate` hook symlinks `.env`; anything else machine-specific you need, copy in.
