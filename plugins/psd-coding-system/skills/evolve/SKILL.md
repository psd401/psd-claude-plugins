---
name: evolve
description: Auto-evolve the plugin — analyzes learnings, checks releases, compares competition, contributes patterns
model: claude-opus-4-8
effort: xhigh
context: fork
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Edit
  - Write
  - Task
  - Glob
  - Grep
  - WebFetch
  - WebSearch
extended-thinking: true
---

# Evolve Command

You are the plugin evolution engine. You take no arguments — instead you read system state and auto-pick the highest-value action to improve the plugin.

## Phase 0: Cache Staleness Check

```bash
echo "=== Plugin Cache Check ==="
PLUGIN_DIR="$(pwd)"
REPO_VERSION=$(grep -o '"version": *"[^"]*"' "$PLUGIN_DIR/.claude-plugin/plugin.json" 2>/dev/null | head -1 | sed 's/.*"version": *"//;s/"//')
CACHE_DIR=$(find ~/.claude/plugins/cache/psd-claude-plugins -name "plugin.json" -path "*/psd-coding-system/*/.claude-plugin/*" 2>/dev/null | head -1)
CACHE_VERSION=""
if [ -n "$CACHE_DIR" ]; then
  CACHE_VERSION=$(grep -o '"version": *"[^"]*"' "$CACHE_DIR" 2>/dev/null | head -1 | sed 's/.*"version": *"//;s/"//')
fi

echo "Repo version: ${REPO_VERSION:-unknown}"
echo "Cache version: ${CACHE_VERSION:-unknown}"

if [ -n "$REPO_VERSION" ] && [ -n "$CACHE_VERSION" ] && [ "$REPO_VERSION" != "$CACHE_VERSION" ]; then
  echo ""
  echo "⚠ STALE CACHE: Repo is v${REPO_VERSION} but cache has v${CACHE_VERSION}"
  echo "  This skill is running from the cached version."
  echo "  To refresh: /reload-plugins or /plugin install psd-coding-system"
  echo ""
fi
```

**If the cache is stale, warn the user but proceed anyway.** The evolve run still produces valid results — the warning helps the user know when to refresh.

## Phase 1: Read State

```bash
echo "=== Evolve State ==="
STATE_FILE="$PLUGIN_DIR/docs/learnings/.evolve-state.json"

# Ensure learnings directory exists
mkdir -p "$PLUGIN_DIR/docs/learnings"

# Load or initialize state
if [ -f "$STATE_FILE" ]; then
  cat "$STATE_FILE"
else
  echo '{"last_analyze":null,"last_updates_check":null,"last_compare":null,"last_concepts":null,"learnings_at_last_analyze":0}'
fi

echo ""
echo "=== Learnings Count ==="
TOTAL_LEARNINGS=$(find "$PLUGIN_DIR/docs/learnings" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
echo "Total learning files: $TOTAL_LEARNINGS"

# Count by category
for dir in "$PLUGIN_DIR/docs/learnings"/*/; do
  if [ -d "$dir" ]; then
    CATEGORY=$(basename "$dir")
    COUNT=$(find "$dir" -name "*.md" -type f | wc -l | tr -d ' ')
    echo "  $CATEGORY: $COUNT"
  fi
done

echo ""
echo "=== TTL Cleanup (90 days) ==="
CUTOFF_DATE=$(date -v-90d +"%Y-%m-%d" 2>/dev/null || date -d "90 days ago" +"%Y-%m-%d")
EXPIRED_COUNT=0
for f in $(find "$PLUGIN_DIR/docs/learnings" -name "*.md" -not -name ".gitkeep" -type f 2>/dev/null); do
  FILE_DATE=$(grep -m1 "^date:" "$f" 2>/dev/null | sed 's/^date: *//')
  if [ -n "$FILE_DATE" ] && [["$FILE_DATE" < "$CUTOFF_DATE"]]; then
    rm "$f"
    EXPIRED_COUNT=$((EXPIRED_COUNT + 1))
  fi
done
if [ "$EXPIRED_COUNT" -gt 0 ]; then
  echo "  Removed $EXPIRED_COUNT learnings older than 90 days"
  # Recount after cleanup
  TOTAL_LEARNINGS=$(find "$PLUGIN_DIR/docs/learnings" -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
  echo "  Remaining: $TOTAL_LEARNINGS"
else
  echo "  No expired learnings found"
fi

echo ""
echo "=== Learning Capture Health ==="
RECENT_COMMITS=$(git log --oneline --since="14 days ago" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TOTAL_LEARNINGS" -lt 3 ] && [ "$RECENT_COMMITS" -gt 5 ]; then
  echo "⚠ Learning capture appears underactive — $RECENT_COMMITS commits in last 14 days but only $TOTAL_LEARNINGS learnings."
  echo "  Verify learning-writer is functioning by running a real /work task."
else
  echo "OK ($TOTAL_LEARNINGS learnings, $RECENT_COMMITS recent commits)"
fi

echo ""
echo "=== Universal Learnings ==="
UNIVERSAL_COUNT=0
if [ -d "$PLUGIN_DIR/docs/learnings" ]; then
  UNIVERSAL_COUNT=$(grep -rl "applicable_to: universal" "$PLUGIN_DIR/docs/learnings" 2>/dev/null | wc -l | tr -d ' ')
fi
echo "Universal learnings: $UNIVERSAL_COUNT"

echo ""
echo "=== Agent Memory Files ==="
find .claude/agent-memory -name "MEMORY.md" -type f 2>/dev/null || echo "(none)"

echo ""
echo "=== 5 Most Recent Learnings ==="
if [ "$TOTAL_LEARNINGS" -gt 0 ]; then
  find "$PLUGIN_DIR/docs/learnings" -name "*.md" -type f -exec stat -f "%m %N" {} \; 2>/dev/null | \
    sort -rn | head -5 | while read -r ts file; do
      TITLE=$(grep -m1 "^title:" "$file" 2>/dev/null | sed 's/^title: *//' || basename "$file" .md)
      DATE=$(grep -m1 "^date:" "$file" 2>/dev/null | sed 's/^date: *//' || echo "unknown")
      echo "  [$DATE] $TITLE"
    done
else
  echo "  (none)"
fi

echo ""
echo "=== Plugin Summary ==="
echo "Skills: $(find "$PLUGIN_DIR/skills" -name 'SKILL.md' -type f 2>/dev/null | wc -l | tr -d ' ')"
echo "Agents: $(find "$PLUGIN_DIR/agents" -name '*.md' -type f 2>/dev/null | wc -l | tr -d ' ')"

echo ""
echo "=== Skill Drift Check ==="
DEFERRAL_WORDS="consider|suggestion|optional|if needed|where reasonable|follow-up issue"
DRIFT_FILES=""
for skill in $(find "$PLUGIN_DIR/skills" -name 'SKILL.md' -type f 2>/dev/null); do
  HITS=$(grep -ciE "$DEFERRAL_WORDS" "$skill" 2>/dev/null)
  HITS=${HITS:-0}
  if [ "$HITS" -gt 5 ]; then
    SKILL_NAME=$(basename "$(dirname "$skill")")
    DRIFT_FILES="$DRIFT_FILES  $SKILL_NAME: $HITS deferral phrases\n"
  fi
done
if [ -n "$DRIFT_FILES" ]; then
  echo "⚠ Behavioral drift candidates (>5 deferral phrases):"
  printf "%s" "$DRIFT_FILES"
else
  echo "No skill drift detected"
fi
```

## Phase 2: Decision Engine

Evaluate the following priority list top-to-bottom. **First match wins.**

Load the state file values:
- `last_analyze` — timestamp of last deep pattern analysis
- `last_updates_check` — timestamp of last Claude Code release check
- `last_compare` — timestamp of last plugin comparison
- `last_concepts` — timestamp of last automation concepts extraction
- `learnings_at_last_analyze` — number of learnings at the time of last analysis

### Priority 1: Deep Pattern Analysis

**Condition:** `TOTAL_LEARNINGS - learnings_at_last_analyze >= 8`

There are 8+ unanalyzed learnings since the last deep analysis. This is the highest-value action because accumulated learnings contain compounding insights.

**Action:** Proceed to Phase 3A.

### Priority 2: Claude Code Release Gap Analysis

**Condition:** `last_updates_check` is null OR more than 30 days ago

Claude Code releases frequently. Staying current prevents drift and unlocks new capabilities.

**Action:** Proceed to Phase 3B.

### Priority 3: Pattern Contribution

**Condition:** There exist learnings with `applicable_to: universal` that have NOT been contributed to the plugin repo patterns directory

Universal learnings benefit all users. Check if any `docs/learnings/**/*.md` files with `applicable_to: universal` have no corresponding file in `docs/patterns/`.

**Action:** Proceed to Phase 3C.

### Priority 4: Plugin Comparison

**Condition:** `last_compare` is null OR more than 30 days ago

Comparing against Every's Compound Engineering plugin reveals gaps and opportunities.

**Action:** Proceed to Phase 3D.

### Priority 5: Automation Concepts Extraction

**Condition:** `last_concepts` is null OR more than 14 days ago AND no new learnings in 14+ days

When learning capture has been quiet, there may be automation opportunities hiding in recent work sessions.

**Action:** Proceed to Phase 3E.

### Priority 6: Health Dashboard (Default)

**Condition:** Nothing above matched — everything is current.

**Action:** Proceed to Phase 3F.

---

**After selecting a priority, announce what you're doing and why:**

```markdown
## Evolve: [Action Name]

**Why:** [One sentence explaining why this was selected]
**Priority:** [N] of 6
```

## Phase 3: Execute Selected Action

### Phase 3A: Deep Pattern Analysis

Dispatch the meta-reviewer agent to analyze accumulated learnings:

```
Task tool invocation:
  subagent_type: "psd-coding-system:meta:meta-reviewer"
  model: opus
  description: "Analyze learnings for patterns"
  prompt: "Analyze all project learnings in docs/learnings/ and any agent memory files. Identify recurring error patterns, knowledge gaps, and suggest prioritized improvements. Produce a structured Meta Review Report with top 3-5 actionable improvements."
```

Present the meta-reviewer's report with:
- Summary of findings
- Top 3-5 actionable improvements
- Knowledge gap warnings
- Suggested next steps

### Phase 3B: Claude Code Release Gap Analysis

Use WebFetch to check for Claude Code updates:

1. **Primary source** — Fetch `https://code.claude.com/docs/en/changelog` (canonical, always current; the GitHub blob was lossy and stale)
2. **Secondary cross-check** — Fetch `https://github.com/anthropics/claude-code/releases` to confirm version dates and fill any gaps from the primary source
3. Compare against our plugin structure using a **significance-ranked checklist**:

   **Tier 1 — Headline features (MANDATORY: list ALL, even if no adoption recommended this cycle):**
   - New slash commands (e.g. `/goal`, `/session`)
   - New CLI subcommands (e.g. `claude session`, `claude plugin tag`)
   - New orchestration or agent execution models (e.g. dynamic workflows, headless mode, multi-agent)
   - New top-level capabilities that change how plugins or sessions fundamentally work

   **Tier 2 — Adoption candidates:**
   - New frontmatter fields for skills/agents (`effort:`, `paths:`, `keep-coding-instructions:`, `initialPrompt:`, etc.)
   - New hook events (`PreCompact`, `WorktreeCreate/Remove`, etc.)
   - New tool permissions or scoping mechanisms
   - New `$schema` or plugin validation tooling

   **Tier 3 — Maintenance checks:**
   - Model deprecations or renames
   - Breaking changes to existing APIs or hook formats
   - Bug fixes relevant to known plugin issues

**CRITICAL:** The release report MUST explicitly list every new top-level slash command and every new orchestration paradigm shipped since `last_updates_check`, even if no adoption action is recommended. Omitting a shipped command (e.g. `/goal`, dynamic workflows) is a miss — the checklist existed precisely to catch these.

Present a structured report:
```markdown
### Claude Code Release Analysis

**Tier 1 — New Commands & Orchestration (ALL must be listed)**

| Command / Feature | Version | Description | Adopt? |
|------------------|---------|-------------|--------|
| /goal            | v2.1.139 | ...         | Yes/No/Later |
| dynamic workflows | v2.1.154 | ...        | Yes/No/Later |

**Tier 2 — Adoption Candidates**

| Feature | Version | Impact on Plugin |
|---------|---------|------------------|
| ...     | ...     | ...              |

**Tier 3 — Maintenance**

| Version | Change | Action Required |
|---------|--------|-----------------|
| X.Y.Z   | ...    | ...             |

### Required Actions
- [List any breaking changes or urgent adoption items]

### Recommended Improvements
- [List Tier 1 + Tier 2 features to adopt, ranked by impact]
```

### Phase 3C: Pattern Contribution

1. List all learnings with `applicable_to: universal`
2. Check which ones already have corresponding files in `docs/patterns/`
3. Present the uncontributed universal learnings to the user:

```markdown
### Universal Learnings Ready to Contribute

| Learning | Category | Date |
|----------|----------|------|
| ...      | ...      | ...  |

**Would you like me to create a PR contributing these patterns to the plugin repo?**
```

**IMPORTANT:** Wait for explicit user confirmation before creating any PR. Do NOT auto-create PRs.

If confirmed, for each learning:
- Fork/clone the plugin repo via `gh` CLI
- Create a branch, copy the pattern, create PR
- Report the PR URL

### Phase 3D: Plugin Comparison

Use WebFetch to analyze Every's Compound Engineering plugin:

1. Fetch `https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/README.md`
2. Fetch `https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/plugins/compound-engineering/.claude-plugin/plugin.json`
3. Fetch `https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/CHANGELOG.md` — CE publishes canonical release notes here (the root CHANGELOG links to GitHub Releases for tagged entries)
4. **Filter CE CHANGELOG to entries after `last_compare`** — only compare what is NEW since the last run, not a full snapshot each time. If `last_compare` is null, report all entries.
5. Compare agent counts, skill patterns, architecture approaches, and new features added since last check

Present a structured comparison:
```markdown
### Plugin Comparison: PSD vs Every

**CE changes since last compare (`last_compare` date)**

| Version / Entry | CE Change | Relevant to PSD? |
|----------------|-----------|------------------|
| ...            | ...       | Yes/No           |

**Overall Snapshot**

| Dimension | PSD | Every | Gap |
|-----------|-----|-------|-----|
| Agents    | X   | Y     | ... |
| Skills    | X   | Y     | ... |

### Agents/Skills They Have That We Don't
- [List with priority]

### Our Unique Strengths
- [List]

### Top 3 Adoption Recommendations
1. ...
```

### Phase 3E: Automation Concepts Extraction

Analyze recent git activity and session patterns for compound engineering opportunities:

```bash
# Recent git activity
git log --oneline -20 2>/dev/null || echo "No git history"

# Recently modified files
git diff --stat HEAD~10 2>/dev/null || echo "No recent changes"
```

Then analyze for:
1. **Delegation opportunities** — subtasks that could be handled by specialized agents
2. **Automation candidates** — recurring manual processes
3. **Systematization targets** — knowledge that should be captured
4. **Parallel processing** — independent workstreams that could run simultaneously

Present 3-5 actionable suggestions in this format:
```markdown
### Compound Engineering Opportunities

**1. [Suggestion]**
- Compound Benefit: [Long-term value]
- Implementation: [How]
- Confidence: [High/Medium/Low]
```

### Phase 3F: Health Dashboard

Display current system status:

```markdown
### System Health

| Metric | Value |
|--------|-------|
| Total Learnings | X |
| Agent Memory Files | X |
| Skills | X |
| Agents | X |

### Recent Activity
[5 most recent learnings]

### Staleness Report
| Check | Last Run | Status |
|-------|----------|--------|
| Pattern Analysis | [date] | Current/Stale |
| Release Check | [date] | Current/Stale |
| Plugin Comparison | [date] | Current/Stale |
| Concepts Extraction | [date] | Current/Stale |

**You're current. Keep shipping.**
```

## Phase 4: Update State

After executing the selected action, update `.evolve-state.json`:

```bash
# Read current state or initialize
STATE_FILE="./docs/learnings/.evolve-state.json"
CURRENT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TOTAL_LEARNINGS=$(find ./docs/learnings -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')

# Update the appropriate field based on which action was executed:
# - Priority 1 (Pattern Analysis): update last_analyze + learnings_at_last_analyze
# - Priority 2 (Release Check): update last_updates_check
# - Priority 3 (Contribution): no state update needed
# - Priority 4 (Comparison): update last_compare
# - Priority 5 (Concepts): update last_concepts
# - Priority 6 (Health): no state update needed
```

Use the Write tool to save the updated JSON to `docs/learnings/.evolve-state.json`.

## Phase 4.5: Issue Routing & Feedback Loop

If the executed action produced actionable findings, create GitHub issues — but route them to the correct repo.

### Step 1: Detect Context

```bash
PLUGIN_REPO="psd401/psd-claude-plugins"

# Multi-fallback repo detection (gh repo view fails in subdirectories)
CURRENT_REPO=$(gh repo view . --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [ -z "$CURRENT_REPO" ] || [ "$CURRENT_REPO" = "unknown" ]; then
  # Fallback: parse git remote URL
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  if [ -n "$REMOTE_URL" ]; then
    CURRENT_REPO=$(echo "$REMOTE_URL" | sed 's|.*github.com[:/]||;s|\.git$||')
  fi
fi
if [ -z "$CURRENT_REPO" ]; then
  CURRENT_REPO="unknown"
  echo "WARNING: Could not detect current repo. Issues will not be auto-created."
  echo "Manually bring findings to the appropriate repo."
fi

IS_PLUGIN_REPO=$( [ "$CURRENT_REPO" = "$PLUGIN_REPO" ] && echo "true" || echo "false" )
echo "Current repo: $CURRENT_REPO"
echo "Is plugin repo: $IS_PLUGIN_REPO"
```

### Step 2: Classify Each Finding

For each actionable finding, classify it:

| Classification | Definition | Examples | Target Repo |
|----------------|-----------|----------|-------------|
| **Plugin-level** | Changes to skills, agents, hooks, or plugin architecture | New agent frontmatter fields, skill workflow improvements, hook additions, model upgrades | `psd401/psd-claude-plugins` |
| **Project-specific** | Changes to the current project's code, config, tests, or workflows | Bug fixes, refactoring suggestions, test coverage gaps, performance issues found in project code | Current repo (`$CURRENT_REPO`) |

**Classification rules:**
- If the finding recommends changing files under `plugins/`, `agents/`, `skills/`, or `hooks/` → **Plugin-level**
- If the finding recommends changing files in the current project's source code → **Project-specific**
- Release gap analysis findings (Priority 2) → Always **Plugin-level**
- Plugin comparison findings (Priority 4) → Always **Plugin-level**
- Pattern analysis findings (Priority 1) → Classify each finding individually; recurring project errors are project-specific, recurring plugin workflow issues are plugin-level
- Automation concepts (Priority 5) → Classify each finding individually

### Step 3: Create Issues

**Skip issue creation entirely if:**
- The action was health dashboard (Priority 6) — nothing actionable
- The action was pattern contribution (Priority 3) — that creates a PR instead
- No actionable findings were produced

**For plugin-level findings:**

If `$IS_PLUGIN_REPO` is `true`, create the issue on the current repo directly.
If `$IS_PLUGIN_REPO` is `false`, create the issue on `$PLUGIN_REPO` (the remote plugin repo).

```bash
TARGET_REPO="$PLUGIN_REPO"

# Ensure evolve-feedback label exists (idempotent)
gh label create "evolve-feedback" --color "0075ca" --description "Auto-created by /evolve" --repo "$TARGET_REPO" 2>/dev/null || true

gh issue create \
  --repo "$TARGET_REPO" \
  --label "evolve-feedback" \
  --title "evolve: [Brief description]" \
  --body "[Issue body with findings, recommended changes, evidence]"
```

**For project-specific findings:**

Create the issue on `$CURRENT_REPO` (the repo where `/evolve` was run). Do NOT create project-specific issues on the plugin repo.

```bash
TARGET_REPO="$CURRENT_REPO"

# Ensure evolve-feedback label exists (idempotent)
gh label create "evolve-feedback" --color "0075ca" --description "Auto-created by /evolve" --repo "$TARGET_REPO" 2>/dev/null || true

gh issue create \
  --repo "$TARGET_REPO" \
  --label "evolve-feedback" \
  --title "evolve: [Brief description]" \
  --body "[Issue body with findings, recommended changes, evidence]"
```

**If a single `/evolve` run produces both plugin-level AND project-specific findings, create separate issues on the appropriate repos.**

### Issue Template

```markdown
## Source

Auto-created by `/evolve` running in: [CURRENT_REPO]
Classification: [Plugin-level | Project-specific]

## Findings

[Summary of what /evolve discovered]

## Recommended Changes

- [ ] [Specific change 1]
- [ ] [Specific change 2]

## Evidence

[Key data points from the analysis]

---
*Auto-generated by `/evolve` Phase 4.5 — Issue Routing*
```

**Present all issue URLs to the user** so they can track them. Then continue to Phase 5.

## Phase 5: Suggest Next

Based on remaining staleness in the state file, suggest when to run `/evolve` again.

**If issues were created in Phase 4.5**, list them with ready-to-run commands:

```markdown
### Next Steps

**Issues created this run:**
- #N — [title] → `/work N`
- #M — [title] → `/work M`

Pick one to start implementing, or run `/evolve` again after [condition] to [action].
Meanwhile, `/work`, `/test`, `/review-pr`, and `/lfg` continue capturing learnings automatically.
```

If no issues were created, omit the issues list and just show the next evolve trigger condition.

## Success Criteria

- State file read (or initialized if first run)
- Correct priority selected based on current state
- Selected action executed fully
- State file updated with new timestamp
- GitHub issue created on plugin repo if findings are actionable (Phase 4.5)
- Next suggestion provided
