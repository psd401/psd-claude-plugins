---
name: bump-version
description: Automate the version bump ritual — three independent tracks (marketplace, psd-coding-system, psd-productivity)
argument-hint: "[patch|minor|major]"
model: claude-opus-5-5
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

## Phase 6: Reconcile count claims across every doc that states one

Three docs assert skill/agent counts and drift independently. Reconciling only CLAUDE.md is what let `plugins/psd-coding-system/README.md` say "Eight skills" — and the root `README.md` directory tree say "7 user-invocable skills" — for several releases after new skills landed.

```bash
# Recount from the tree — the only authoritative numbers
CODING_SKILLS=$(find plugins/psd-coding-system/skills -name 'SKILL.md' -type f | wc -l | tr -d ' ')
CODING_AGENTS=$(find plugins/psd-coding-system/agents -name '*.md' -type f | wc -l | tr -d ' ')
PROD_SKILLS=$(find plugins/psd-productivity/skills -name 'SKILL.md' -type f | wc -l | tr -d ' ')
echo "coding skills=$CODING_SKILLS  coding agents=$CODING_AGENTS  productivity skills=$PROD_SKILLS"

# Every count claim in all three docs, digits and spelled-out alike.
# The word alternatives are load-bearing: "Eight skills" is the exact form
# that survived three releases. Do not trim them.
# The explicit (^|[^a-zA-Z0-9]) boundaries replace \b on purpose. ugrep — which
# may be this machine's `grep` — uses a non-backtracking ERE engine that fails
# to match when a \b sits immediately on BOTH sides of a bounded repeat, as in
# \b[0-9]+\b[^.]{0,30}\bskills\b. Dropping either adjacent \b makes it match, and
# -P (PCRE) matches. Measured on the three real stale counts this phase exists to
# catch: the \b form found 1 of 3, this form found 3 of 3. Plain \b(word|word)\b
# is unaffected and fine — only the repeat-flanked shape breaks.
grep -nE -i '(^|[^a-zA-Z0-9])([0-9]+|six|seven|eight|nine|ten|eleven|twelve)[^.]{0,30}(skills?|agents?)([^a-zA-Z]|$)' \
  CLAUDE.md README.md plugins/psd-coding-system/README.md
```

Reconcile **every** line the grep returns. Each one is exactly one of three things, and only the third is safe to pass over:

1. **A total** — skills or agents in a plugin. Check against the three counts above.
2. **A scope count** — how many skills or agents adopted some feature ("Enabled on 6 key agents", "`paths:` … 10 skills"). These are just as checkable, from frontmatter, and they drift just as often. Recount them:
   ```bash
   grep -rl "^memory: project" --include="*.md" plugins/*/agents | wc -l
   grep -rl "^paths:" --include="SKILL.md" plugins/*/skills | wc -l
   grep -rl "^keep-coding-instructions:" --include="*.md" plugins/*/skills plugins/*/agents | wc -l
   grep -rl "^effort: xhigh" --include="*.md" plugins/*/skills plugins/*/agents | wc -l
   ```
   CLAUDE.md's **feature-adoption table** is nothing but scope counts. Recount every row you touch; the named lists beside them go stale too, independently of the number.
3. **Genuinely unrelated** — the number is not counting skills or agents at all. Real example from this repo: `- **claude-sonnet-5**: Default for agents and lightweight coding tasks` matches only because of the `5` in the model ID. Version numbers, model IDs and `v2.1.x` adoption columns land here.

**Do not treat category 2 as noise.** An earlier version of this phase named `"5 key agents"` as its example of harmless over-matching. That line was wrong for several releases, and the guidance here is what told operators to skip past it. Two more rows in the same table (`paths:`, `keep-coding-instructions:`) were stale for the same reason. A number you decline to recount is a number you are asserting on faith.

Two things the grep cannot check on its own:

```bash
# One command-table row per skill — a new skill often lands in the table with
# the sentence above it left stale, or the reverse
grep -cE '^\| `/[a-z-]+`' plugins/psd-coding-system/README.md   # must equal $CODING_SKILLS
```

- The root README's **directory tree** carries counts inside `#` comments (`skills/  # N user-invocable skills`). They are hand-written prose, not generated, and drift silently.

The **only** verified non-defect is the root README's **"Meta & Validation (6 agents)"** — a deliberate combined heading (meta 1 + validation 5), confirmed against the category dirs. Nothing else is on a skip list. If a line looks like noise, recount it anyway: dismissing lines as noise is what let three real defects through.

If every claim matches, skip. Otherwise fix them now — Phase 8 re-checks these, and a mismatch there costs an amend.

## Phase 7: Commit (do NOT tag yet)

```bash
# Stage changed files
git add \
  .claude-plugin/marketplace.json \
  CLAUDE.md \
  README.md \
  CHANGELOG.md
  # + plugin-specific files if those plugins changed

git commit -m "chore: Bump to $NEW_MARKETPLACE — [brief reason]"
```

**Nothing is tagged and nothing is pushed yet.** That is deliberate: Phase 8 may need to amend this commit, which is free before a push and impossible after.

## Phase 8: Verify the release claims — gate, must pass before tagging

The CHANGELOG entry, the commit subject, and the tag message all assert facts: how many files changed, how many surfaces were touched, which versions moved. Verify each against the actual diff before the tag freezes it.

```bash
# Authoritative file list. Use --name-only, NEVER --stat: --stat truncates
# long paths (".../skills/<name>/SKILL.md"), so any count grepped from stat
# output silently undercounts.
git show --name-only --format="" HEAD

# Recount whatever the CHANGELOG claims, from the tree rather than from memory.
# Example for a model migration — adapt to the claim being checked:
grep -rh "^model: " --include="*.md" plugins | sort | uniq -c | sort -rn
```

Check in order:

1. **Every number** in the CHANGELOG entry and the commit subject — recount from the commands above. A count asserted in prose but never recomputed is the usual defect.
2. **Version tracks agree** across all locations:
   ```bash
   jq -r '.metadata.version' .claude-plugin/marketplace.json
   jq -r '.plugins[]|"\(.name) \(.version)"' .claude-plugin/marketplace.json
   jq -r '.version' plugins/psd-coding-system/.claude-plugin/plugin.json
   jq -r '.version' plugins/psd-productivity/.claude-plugin/plugin.json
   grep -m1 '^\*\*Version\*\*' CLAUDE.md
   ```
3. **Manifests validate:** `claude plugin validate .`

**If anything is wrong, amend — never add a follow-up commit:**

```bash
git add -A
git commit --amend -m "chore: Bump to $NEW_MARKETPLACE — [corrected reason]"
```

A doc fix committed *after* the tag is the exact failure this gate prevents: the tag keeps pointing at the version with the wrong prose, and correcting it then requires a force-retag of a published ref. Amending costs nothing here because nothing has been pushed.

## Phase 9: Tag and push — only after Phase 8 passes

```bash
# NOTE: do NOT use `claude plugin tag` here — the CLI takes a plugin *path*
# and creates per-plugin {name}--v{version} tags, which does not match this
# repo's marketplace-wide vX.Y.Z tag convention.
git tag -a "v$NEW_MARKETPLACE" -m "Release v$NEW_MARKETPLACE - [brief summary]"

git push origin HEAD
git push origin "v$NEW_MARKETPLACE"

# Confirm the tag landed where intended
git ls-remote --tags origin | grep "v$NEW_MARKETPLACE"
```

The dereferenced ref (`refs/tags/vX.Y.Z^{}`) must equal the bump commit. If it does not, stop and report it — do not force-retag a pushed tag without asking the user first.

## Phase 10: Summary

```markdown
### Release v$NEW_MARKETPLACE

| Track | Old | New | Updated |
|-------|-----|-----|---------|
| Marketplace | $MARKETPLACE_VERSION | $NEW_MARKETPLACE | ✅ |
| psd-coding-system | $CODING_VERSION | $NEW_CODING or (unchanged) | ✅ / — |
| psd-productivity | $PRODUCTIVITY_VERSION | $NEW_PRODUCTIVITY or (unchanged) | ✅ / — |

**Tag:** v$NEW_MARKETPLACE → <commit sha it points at>
**Phase 8 gate:** passed (counts recomputed, versions cross-checked, manifests valid)
**Pushed:** ✅
**Cache:** Run `/reload-plugins` to activate
```
