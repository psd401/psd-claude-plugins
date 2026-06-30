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

## Automatic with `/lfg` (the easy path)

You usually don't need to run `/worktree` by hand. By default **`/lfg` creates and enters its own worktree per issue**: open several Claude windows in the repo root, run `/lfg 142` in one and `/lfg 150` in another, and each window auto-isolates into `.claude/worktrees/<branch>` on its own branch — no collisions, no manual setup.

- **Base branch:** `dev` if it exists, else the repo default.
- **Already inside a worktree?** `/lfg` detects it (a linked worktree's `.git` is a file, not a directory) and just branches in place — no nesting.
- **Fresh-worktree dependencies:** a new worktree has no installed deps, so `/lfg` installs them (`npm ci`, `pip install -e .`, etc.) before running the verify gate. The `WorktreeCreate` hook symlinks `.env` in automatically.
- **Opt out per repo:** set `auto_worktree: false` in `.psd/verify.json` and `/lfg` branches in place; isolate manually with `/worktree`.
- **Cleanup:** on session exit you're prompted to keep or remove the worktree — keep it while the PR is open, then `/worktree clean` after it merges.

## Native helpers & the manual path

Under the hood `/lfg` uses Claude Code's built-in worktree support (`EnterWorktree`/`ExitWorktree`), and its parallel sub-agents declare `isolation: worktree` to get throwaway checkouts. You can still drive it manually when you want explicit control — `/worktree <issue>` to create the folder, then open a `claude` session inside it (the reliable, explicit path shown above).

## Pitfalls

- **Don't check out the same branch in two worktrees** — git refuses; each branch lives in exactly one worktree.
- **Worktrees are folders on disk** — they take space and have their own `node_modules`. Run install once per worktree (or symlink/hardlink heavy dirs if your tooling supports it).
- **Clean up after merge** — `/worktree clean` is full post-merge hygiene: it prunes stale worktrees, deletes merged local **and** remote branches (squash-merge-aware), and closes issues whose PR already merged (confirming the destructive steps first). `/worktree prune` is the lightweight worktrees-only version.
- **`.env` and secrets** — the `WorktreeCreate` hook symlinks `.env`; anything else machine-specific you need, copy in.
