---
name: product-pulse
description: Time-windowed production health report — GitHub repo health, FreshService bug trends, git velocity, and deployment indicators rolled into a single actionable digest
argument-hint: "[repo (default: current) | window (default: 7d) | e.g. psd401/aistudio 14d]"
model: claude-opus-4-8
effort: high
context: fork
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Grep
  - Glob
  - WebSearch
  - WebFetch
  - Task
extended-thinking: true
---

# Product Pulse Command

You are a production health monitor. You gather time-windowed signals from GitHub, git activity, FreshService bug patterns, and deployment health to produce a single prioritized digest. The output is actionable, not decorative — it surfaces what needs attention now, what is trending in the wrong direction, and what is healthy.

**Arguments:** $ARGUMENTS

## Phase 0: Parse Arguments

```bash
ARGS="$ARGUMENTS"

# Extract window if provided (e.g. "14d", "7d", "30d")
WINDOW=$(echo "$ARGS" | grep -oE '[0-9]+d' | head -1)
WINDOW=${WINDOW:-7d}
WINDOW_DAYS=$(echo "$WINDOW" | tr -d 'd')

# Extract repo if provided
REPO_ARG=$(echo "$ARGS" | grep -oE '[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+' | head -1)
if [ -z "$REPO_ARG" ]; then
  # Fall back to current repo
  REPO_ARG=$(git remote get-url origin 2>/dev/null | sed 's|.*github.com[:/]||;s|\.git$||' || echo "unknown")
fi

echo "=== Product Pulse Configuration ==="

# Validate repo format before use in gh CLI calls
if [ -n "$REPO_ARG" ] && [ "$REPO_ARG" != "unknown" ]; then
  if [[ ! "$REPO_ARG" =~ ^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$ ]]; then
    echo "WARNING: repo '$REPO_ARG' does not match expected owner/repo format — skipping GitHub checks"
    REPO_ARG="unknown"
  fi
fi

echo "Repo: $REPO_ARG"
echo "Window: last $WINDOW_DAYS days"
echo "As of: $(date -u +"%Y-%m-%d %H:%M UTC")"
```

## Phase 1: GitHub Repo Health

Gather issue and PR metrics for the window:

```bash
echo ""
echo "=== GitHub Issue Health ==="
SINCE_DATE=$(date -d "$WINDOW_DAYS days ago" +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -v-${WINDOW_DAYS}d +"%Y-%m-%dT00:00:00Z")

# Open issues by label
echo "--- Open issues (all) ---"
gh issue list --repo "$REPO_ARG" --state open --limit 100 --json number,title,labels,createdAt,updatedAt 2>/dev/null | \
  jq 'length as $total | 
    {
      total: $total,
      bugs: [.[] | select(.labels[].name? == "bug")] | length,
      lfg_ready: [.[] | select(.labels[].name? == "lfg-ready")] | length,
      blocked: [.[] | select(.labels[].name? == "lfg-blocked")] | length,
      stale_7d: [.[] | select(.updatedAt < (now - 604800 | todate))] | length
    }' 2>/dev/null || echo "gh CLI not available"

echo ""
echo "--- Issues opened in last $WINDOW_DAYS days ---"
gh issue list --repo "$REPO_ARG" --state open --limit 100 --json number,title,createdAt 2>/dev/null | \
  jq --arg since "$SINCE_DATE" '[.[] | select(.createdAt > $since)] | length' 2>/dev/null || echo "(unavailable)"

echo ""
echo "--- Issues closed in last $WINDOW_DAYS days ---"
gh issue list --repo "$REPO_ARG" --state closed --limit 100 --json number,title,closedAt 2>/dev/null | \
  jq --arg since "$SINCE_DATE" '[.[] | select(.closedAt > $since)] | length' 2>/dev/null || echo "(unavailable)"

echo ""
echo "=== Pull Request Health ==="
echo "--- Open PRs ---"
gh pr list --repo "$REPO_ARG" --state open --json number,title,createdAt,reviewDecision,mergeable,labels 2>/dev/null | \
  jq '{
    total: length,
    approved: [.[] | select(.reviewDecision == "APPROVED")] | length,
    changes_requested: [.[] | select(.reviewDecision == "CHANGES_REQUESTED")] | length,
    awaiting_review: [.[] | select(.reviewDecision == null)] | length,
    mergeable: [.[] | select(.mergeable == "MERGEABLE")] | length,
    stale_7d: [.[] | select(.createdAt < (now - 604800 | todate))] | length
  }' 2>/dev/null || echo "(unavailable)"

echo ""
echo "--- PRs merged in last $WINDOW_DAYS days ---"
gh pr list --repo "$REPO_ARG" --state merged --limit 50 --json number,title,mergedAt 2>/dev/null | \
  jq --arg since "$SINCE_DATE" '[.[] | select(.mergedAt > $since)] | length' 2>/dev/null || echo "(unavailable)"
```

## Phase 2: Git Velocity

Analyze commit activity in the window:

```bash
echo ""
echo "=== Git Velocity (last $WINDOW_DAYS days) ==="

# Commits in window
COMMIT_COUNT=$(git log --oneline --since="$WINDOW_DAYS days ago" 2>/dev/null | wc -l | tr -d ' ')
echo "Commits: $COMMIT_COUNT"

# Active contributors
CONTRIBUTORS=$(git log --format="%ae" --since="$WINDOW_DAYS days ago" 2>/dev/null | sort -u | wc -l | tr -d ' ')
echo "Active contributors: $CONTRIBUTORS"

# Files changed
FILES_CHANGED=$(git log --name-only --since="$WINDOW_DAYS days ago" --format="" 2>/dev/null | sort -u | grep -v '^$' | wc -l | tr -d ' ')
echo "Files changed: $FILES_CHANGED"

# Most active areas
echo ""
echo "--- Most active files/dirs ---"
git log --name-only --since="$WINDOW_DAYS days ago" --format="" 2>/dev/null | \
  sort | uniq -c | sort -rn | head -10 | \
  awk '{print "  " $2 " (" $1 " changes)"}'

# Recent commits
echo ""
echo "--- Recent commits ---"
git log --oneline --since="$WINDOW_DAYS days ago" --format="%h %s" 2>/dev/null | head -10

# Failed CI check (look for reverts, hotfixes)
HOTFIX_COUNT=$(git log --oneline --since="$WINDOW_DAYS days ago" 2>/dev/null | grep -iE 'hotfix|revert|emergency|critical' | wc -l | tr -d ' ')
echo ""
echo "Hotfixes/reverts: $HOTFIX_COUNT"
```

## Phase 3: FreshService Bug Signal

Look for bug patterns in the current project (if FreshService integration exists):

```bash
echo ""
echo "=== FreshService Bug Signal ==="

# Check if we have any triaged issues in this window
if command -v gh >/dev/null 2>&1 && [ "$REPO_ARG" != "unknown" ]; then
  echo "--- Bug tickets triaged from FreshService (last $WINDOW_DAYS days) ---"
  gh issue list --repo "$REPO_ARG" --state all --label "triaged-from-freshservice" --limit 50 \
    --json number,title,state,createdAt,labels 2>/dev/null | \
    jq --arg since "$SINCE_DATE" '
      [.[] | select(.createdAt > $since)] |
      {
        total: length,
        open: [.[] | select(.state == "OPEN")] | length,
        closed: [.[] | select(.state == "CLOSED")] | length,
        lfg_ready: [.[] | select(.labels[].name? == "lfg-ready")] | length
      }' 2>/dev/null || echo "(no FreshService issues found)"

  echo ""
  echo "--- Recently filed bugs (all sources) ---"
  gh issue list --repo "$REPO_ARG" --state all --label "bug" --limit 20 \
    --json number,title,state,createdAt 2>/dev/null | \
    jq --arg since "$SINCE_DATE" '[.[] | select(.createdAt > $since)] | .[:5] | .[] | "  #\(.number) \(.title) [\(.state)]"' -r \
    2>/dev/null || echo "(unavailable)"
else
  echo "(gh CLI not available — FreshService signal skipped)"
fi
```

## Phase 4: Deployment & Quality Indicators

Check recent CI/deployment health:

```bash
echo ""
echo "=== Quality Indicators ==="

# Check for test files
TEST_FILES=$(find . -name "*.test.*" -o -name "*.spec.*" -o -name "*_test.*" -o -path "*/tests/*" -name "*.py" 2>/dev/null | wc -l | tr -d ' ')
echo "Test files: $TEST_FILES"

# Check for recent CI runs if GH Actions available
echo ""
echo "--- Recent CI runs ---"
gh run list --repo "$REPO_ARG" --limit 10 --json name,status,conclusion,createdAt,headBranch 2>/dev/null | \
  jq '.[] | "[\(.conclusion // .status)] \(.name) on \(.headBranch) @ \(.createdAt[:10])"' -r \
  2>/dev/null || echo "(gh CLI or CI not configured)"

# Check for open security alerts
echo ""
echo "--- Security alerts (if Dependabot enabled) ---"
gh api "repos/$REPO_ARG/vulnerability-alerts" --silent 2>/dev/null && echo "Vulnerability alerts enabled" || echo "(not checked)"
```

## Phase 5: Trend Assessment

Based on all data gathered, perform a qualitative trend assessment:

Evaluate each signal:
- **Issue velocity**: new issues vs. closed issues — is the backlog growing or shrinking?
- **PR throughput**: are PRs moving through review in reasonable time?
- **Git velocity**: is commit cadence consistent or has it stalled/spiked?
- **Bug rate**: is the number of bugs increasing, decreasing, or flat?
- **Hotfix ratio**: are emergency fixes common? (signals stability problems)

Rate each dimension:
- 🟢 **Healthy**: trending in the right direction
- 🟡 **Watch**: stable but showing early warning signs
- 🔴 **Attention**: needs action

## Phase 6: Product Pulse Report

Synthesize everything into the pulse digest:

```markdown
## Product Pulse Report

**Repo:** [repo]
**Window:** Last [N] days (as of [date])

---

### Headline Numbers

| Signal | Value | Trend | Status |
|--------|-------|-------|--------|
| Open issues | [n] | [↑/↓/→] | 🟢/🟡/🔴 |
| Open bugs | [n] | [↑/↓/→] | 🟢/🟡/🔴 |
| Open PRs | [n] | [↑/↓/→] | 🟢/🟡/🔴 |
| Issues opened (window) | [n] | — | — |
| Issues closed (window) | [n] | — | — |
| PRs merged (window) | [n] | — | — |
| Commits (window) | [n] | — | — |
| Hotfixes (window) | [n] | — | 🟢/🟡/🔴 |

---

### Status by Dimension

**Issue Health:** 🟢/🟡/🔴 — [one-sentence assessment]
**PR Throughput:** 🟢/🟡/🔴 — [one-sentence assessment]
**Git Velocity:** 🟢/🟡/🔴 — [one-sentence assessment]
**Bug Rate:** 🟢/🟡/🔴 — [one-sentence assessment]
**Deployment Stability:** 🟢/🟡/🔴 — [one-sentence assessment]

---

### Attention Items

**🔴 Needs action now:**
- [Item] — [why] — [suggested action]

**🟡 Watch closely:**
- [Item] — [why] — [what to monitor]

---

### Backlog Snapshot

**lfg-ready (queued for automation):** [n]
**lfg-blocked (stalled):** [n]
**Stale issues (>7d no activity):** [n]
**PRs awaiting review:** [n]
**PRs with changes requested (stuck):** [n]

---

### Git Velocity Snapshot

**Most active areas this window:**
1. [file/dir] ([n] changes)
2. ...

---

### Overall Health

**Status:** 🟢 Healthy / 🟡 Watching / 🔴 Needs Attention

**One-line summary:** [most important thing to know about the product's health right now]

**Recommended next actions:**
1. [Highest priority action]
2. [Second action]
3. [Third action]

---
*Generated by /product-pulse — [date]*
```

## Phase 7: Persist Pulse (Optional)

If a `docs/` directory exists, save the pulse for trending:

```bash
PLUGIN_DIR="$(pwd)"
DOCS_DIR="$PLUGIN_DIR/docs"

if [[ -d "$DOCS_DIR" ]]; then
  mkdir -p "$DOCS_DIR/pulse"
  DATE=$(date +"%Y-%m-%d")
  PULSE_FILE="$DOCS_DIR/pulse/${DATE}-product-pulse.md"
  echo "Pulse report will be saved to: $PULSE_FILE"
else
  echo "(No docs/ directory — pulse not persisted)"
fi
```

Use the Write tool to save to the pulse file path above if `docs/` exists.

## Guidelines

- **Data first, narrative second** — show the raw numbers, then interpret them
- **Trend over snapshot** — a healthy number that's worsening is more important than a worrying number that's stable
- **Specific actions, not observations** — every 🔴 item must have a suggested action
- **Use available data only** — if gh CLI or git are unavailable, say so and proceed with what's available; do not make up numbers
- **The digest should take under 2 minutes to read** — cut anything that doesn't drive action
