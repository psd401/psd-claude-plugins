---
name: bump-version
description: Automate the version bump ritual — three independent tracks (marketplace, psd-coding-system, psd-productivity)
argument-hint: "[patch|minor|major]"
model: claude-opus-5
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

# Bump Version Command

You automate the version bump ritual for the PSD Plugin Marketplace. There are **three independent version tracks** — never conflate them.

**Bump type:** $ARGUMENTS

## Version Track Reference

| Track | Files | When to bump |
|-------|-------|--------------|
| **Marketplace** | `.claude-plugin/marketplace.json` → `metadata.version`; `CLAUDE.md` → `**Version**`; root `README.md` | Every release |
| **psd-coding-system** | `plugins/psd-coding-system/.claude-plugin/plugin.json`; `marketplace.json` → `plugins[name=psd-coding-system].version`; `plugins/psd-coding-system/README.md` | Only when coding system skills/agents changed |
| **psd-productivity** | `plugins/psd-productivity/.claude-plugin/plugin.json`; `marketplace.json` → `plugins[name=psd-productivity].version`; `plugins/psd-productivity/README.md` | Only when productivity skills/agents changed |

## Phase 1: Determine Bump Type

```bash
BUMP_TYPE="$ARGUMENTS"

case "$BUMP_TYPE" in
  patch|minor|major) echo "Bump type: $BUMP_TYPE" ;;
  *)
    echo "Invalid or missing bump type"
    ;;
esac
```

If the argument is empty or invalid, use AskUserQuestion to ask which bump type they want.

## Phase 2: Determine Which Plugins Changed

Use AskUserQuestion to ask:
- Did **psd-coding-system** skills or agents change in this release?
- Did **psd-productivity** skills or agents change in this release?

The marketplace version always bumps. Plugin versions only bump for their own changes.

## Phase 3: Read Current Versions

```bash
# Marketplace version (always bumps)
MARKETPLACE_VERSION=$(jq -r '.metadata.version' .claude-plugin/marketplace.json)
echo "Marketplace current: $MARKETPLACE_VERSION"

# Plugin versions (only if those plugins changed)
CODING_VERSION=$(jq -r '.version' plugins/psd-coding-system/.claude-plugin/plugin.json)
PRODUCTIVITY_VERSION=$(jq -r '.version' plugins/psd-productivity/.claude-plugin/plugin.json)
echo "psd-coding-system current: $CODING_VERSION"
echo "psd-productivity current: $PRODUCTIVITY_VERSION"
```

Calculate new versions using the bump type:
```bash
bump_version() {
  local version="$1" type="$2"
  local major minor patch
  major=$(echo "$version" | cut -d. -f1)
  minor=$(echo "$version" | cut -d. -f2)
  patch=$(echo "$version" | cut -d. -f3)
  case "$type" in
    patch) echo "$major.$minor.$((patch + 1))" ;;
    minor) echo "$major.$((minor + 1)).0" ;;
    major) echo "$((major + 1)).0.0" ;;
  esac
}

NEW_MARKETPLACE=$(bump_version "$MARKETPLACE_VERSION" "$BUMP_TYPE")
# Only calculate if those plugins changed:
# NEW_CODING=$(bump_version "$CODING_VERSION" "$BUMP_TYPE")
# NEW_PRODUCTIVITY=$(bump_version "$PRODUCTIVITY_VERSION" "$BUMP_TYPE")
```

## Phase 4: Update Files

Read each file before editing (required by Edit tool).

### Always update (marketplace track):

1. **`.claude-plugin/marketplace.json`** — `metadata.version` only (use specific context to avoid matching plugin version lines)
2. **`CLAUDE.md`** — `**Version**: X.Y.Z`
3. **`README.md`** — badge and `**Version**: X.Y.Z` occurrences
4. **`CHANGELOG.md`** — Add new section at top (see Phase 5)

### Only if psd-coding-system changed:

5. **`plugins/psd-coding-system/.claude-plugin/plugin.json`** — `"version": "X.Y.Z"`
6. **`.claude-plugin/marketplace.json`** — `plugins[name=psd-coding-system].version` (use surrounding context to target correctly)
7. **`plugins/psd-coding-system/README.md`** — `Version: X.Y.Z`

### Only if psd-productivity changed:

8. **`plugins/psd-productivity/.claude-plugin/plugin.json`** — `"version": "X.Y.Z"`
9. **`.claude-plugin/marketplace.json`** — `plugins[name=psd-productivity].version`
10. **`plugins/psd-productivity/README.md`** — `Version: X.Y.Z`

**CRITICAL for marketplace.json edits:** The file has three version strings. Use sufficient surrounding context in Edit calls to uniquely target each one — never use `replace_all: true` on marketplace.json.

## Phase 5: Update CHANGELOG (auto-generated from git history)

This absorbs the old `/changelog` skill — generate the entry from commits since the last release tag rather than asking the user to recall what changed.

```bash
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
echo "=== Commits since ${LATEST_TAG:-repo start} ==="
git log ${LATEST_TAG:+$LATEST_TAG..HEAD} --format="%h %s%n%b---" --no-merges
echo "=== Files changed ==="
git diff --stat ${LATEST_TAG:+$LATEST_TAG..HEAD}
TODAY=$(date +%Y-%m-%d)
echo "Date: $TODAY"
```

Classify every commit into Keep-a-Changelog sections and write the entry at the top of `CHANGELOG.md` (before the first existing `## [` entry):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- **Component** — user-visible new capability

### Changed
- **Component** — what changed for the user

### Removed
- **Component** — what was removed

### Fixed
- **Area** — what was fixed
```

**Rules:** describe user-visible impact (not implementation), bold the component, group related commits, omit version-bump and merge commits, include only non-empty sections. If git history is too terse to classify, fall back to AskUserQuestion for a brief description.

## Phase 6: Update Skill/Agent Counts (if changed)

```bash
SKILL_COUNT=$(find plugins/psd-coding-system/skills -name 'SKILL.md' -type f | wc -l | tr -d ' ')
AGENT_COUNT=$(find plugins/psd-coding-system/agents -name '*.md' -type f | wc -l | tr -d ' ')
echo "Skills: $SKILL_COUNT"
echo "Agents: $AGENT_COUNT"
```

If counts differ from CLAUDE.md, update them. Otherwise skip.

## Phase 7: Commit, Tag, Push

```bash
# Stage changed files
git add \
  .claude-plugin/marketplace.json \
  CLAUDE.md \
  README.md \
  CHANGELOG.md
  # + plugin-specific files if those plugins changed

git commit -m "chore: Bump version to $NEW_MARKETPLACE — [brief reason]"

# Validate manifests before tagging (catches version mismatches early).
# NOTE: do NOT use `claude plugin tag` here — the CLI takes a plugin *path*
# and creates per-plugin {name}--v{version} tags, which does not match this
# repo's marketplace-wide vX.Y.Z tag convention.
claude plugin validate .

git tag -a "v$NEW_MARKETPLACE" -m "Release v$NEW_MARKETPLACE - [brief summary]"

git push origin HEAD
git push origin "v$NEW_MARKETPLACE"
```

## Phase 8: Summary

```markdown
### Release v$NEW_MARKETPLACE

| Track | Old | New | Updated |
|-------|-----|-----|---------|
| Marketplace | $MARKETPLACE_VERSION | $NEW_MARKETPLACE | ✅ |
| psd-coding-system | $CODING_VERSION | $NEW_CODING or (unchanged) | ✅ / — |
| psd-productivity | $PRODUCTIVITY_VERSION | $NEW_PRODUCTIVITY or (unchanged) | ✅ / — |

**Tag:** v$NEW_MARKETPLACE
**Pushed:** ✅
**Cache:** Run `/reload-plugins` to activate
```
