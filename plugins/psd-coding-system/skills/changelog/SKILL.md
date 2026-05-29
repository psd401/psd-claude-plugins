---
name: changelog
description: Auto-generate a Keep-a-Changelog entry from recent git history
argument-hint: "[since tag/commit, e.g. v1.25.1]"
model: claude-opus-4-8
effort: high
context: fork
agent: general-purpose
allowed-tools:
  - Bash(*)
  - Read
  - Edit
  - Write
  - Grep
  - Glob
extended-thinking: true
---

# Changelog Generator

You generate structured Keep-a-Changelog entries from git history. You read commits, classify changes, and produce a formatted changelog section ready to paste into CHANGELOG.md.

**Arguments:** $ARGUMENTS

## Phase 1: Determine Range

```bash
# Find the most recent tag as default starting point
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
echo "Latest tag: ${LATEST_TAG:-none}"

# Use argument if provided, otherwise use latest tag
SINCE="${ARGUMENTS:-$LATEST_TAG}"
if [ -z "$SINCE" ]; then
  echo "No tag found and no argument provided."
  echo "Usage: /changelog [since-ref]"
  echo "  e.g., /changelog v1.25.0"
  echo "  e.g., /changelog HEAD~10"
  exit 1
fi

echo "Generating changelog since: $SINCE"
echo ""

# Get current version from plugin.json
CURRENT_VERSION=$(grep -o '"version": *"[^"]*"' plugins/psd-coding-system/.claude-plugin/plugin.json 2>/dev/null | head -1 | sed 's/.*"version": *"//;s/"//')
echo "Current version: ${CURRENT_VERSION:-unknown}"
```

## Phase 2: Collect Commits

```bash
echo "=== Commits since $SINCE ==="
git log "$SINCE"..HEAD --format="%h %s%n%b---" --no-merges

echo ""
echo "=== Merge commits ==="
git log "$SINCE"..HEAD --format="%h %s" --merges

echo ""
echo "=== Files changed ==="
git diff --stat "$SINCE"..HEAD
```

## Phase 3: Classify and Generate

Analyze every commit and classify each change into Keep-a-Changelog categories:

- **Added** — New features, new skills, new agents, new files
- **Changed** — Changes to existing functionality, updated behavior
- **Deprecated** — Features that will be removed in future
- **Removed** — Removed features or files
- **Fixed** — Bug fixes
- **Security** — Security improvements

**Rules:**
- Each bullet should describe the *user-visible impact*, not the implementation detail
- Bold the feature or component name at the start of each bullet
- Group related commits into single bullets where appropriate
- Omit version bump commits (they're part of the release process, not the content)
- Omit merge commits (the actual changes are in the feature commits)

## Phase 4: Output

Get today's date and produce the changelog entry:

```bash
TODAY=$(date +%Y-%m-%d)
echo "Date: $TODAY"
```

Present the formatted changelog entry:

```markdown
## [VERSION] - DATE

### Added
- **Feature name** — Description of what was added

### Changed
- **Component** — Description of what changed

### Fixed
- **Bug area** — Description of what was fixed
```

**Only include sections that have content.** Don't include empty sections.

Then ask the user:

> Ready to insert this into CHANGELOG.md? [y/n]
>
> If yes, I'll add it at the top of the file (after the header).

If confirmed, use the Edit tool to insert the new entry at the top of CHANGELOG.md, right before the first existing `## [` version entry.
