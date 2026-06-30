#!/bin/bash
# Routine session bootstrap.
#
# Called from the routine prompt's Step 1. Runs every fire as part of the
# actual session (not as a pre-session env setup), so it writes to the
# session user's HOME — no user/HOME mismatch with the cloud env's setup
# script. No caching layer in front of it.
#
# What it does:
#   1. Locates the already-cloned psd-claude-plugins (the routine clones it
#      automatically because it's in the routine's repo list).
#   2. Copies plugins/psd-coding-system/agents/**/*.md into ~/.claude/agents/
#   3. Copies plugins/*/skills/** into ~/.claude/skills/
#   4. Prints a sanity-check summary against the agents the routines invoke.
#
# Exits 0 on success, 1 on hard failure (psd-claude-plugins not cloned).

set -uo pipefail

echo "=== routine bootstrap (in-session) ==="
echo "whoami: $(whoami 2>/dev/null || echo unknown)  HOME: ${HOME:-unset}  cwd: $(pwd)"

# Find psd-claude-plugins — should be cloned by the routine into HOME or nearby
PLUGINS_DIR=""
for cand in "$HOME/psd-claude-plugins" "/home/user/psd-claude-plugins" "/root/psd-claude-plugins" "/workspace/psd-claude-plugins"; do
  if [ -d "$cand/plugins/psd-coding-system/agents" ]; then
    PLUGINS_DIR="$cand"; break
  fi
done

if [ -z "$PLUGINS_DIR" ]; then
  # Fallback: search
  PLUGINS_DIR=$(find / -maxdepth 5 -type d -path "*/psd-claude-plugins/plugins/psd-coding-system/agents" 2>/dev/null | head -1 | xargs -r dirname | xargs -r dirname | xargs -r dirname)
fi

if [ -z "$PLUGINS_DIR" ] || [ ! -d "$PLUGINS_DIR/plugins/psd-coding-system/agents" ]; then
  echo "FATAL: psd-claude-plugins not found in any expected location." >&2
  echo "Make sure psd401/psd-claude-plugins is in the routine's repository list." >&2
  exit 1
fi
echo "Source: $PLUGINS_DIR"

# Materialize agents into ~/.claude/agents/ (the session's own HOME — no
# guessing about user mismatch).
AGENTS_DIR="$HOME/.claude/agents"
mkdir -p "$AGENTS_DIR"
AGENT_COUNT=0
while IFS= read -r agent_file; do
  cp "$agent_file" "$AGENTS_DIR/"
  AGENT_COUNT=$((AGENT_COUNT + 1))
done < <(find "$PLUGINS_DIR/plugins/psd-coding-system/agents" -name "*.md" -type f)
echo "Agents installed to $AGENTS_DIR: $AGENT_COUNT"

# Materialize skills into ~/.claude/skills/
SKILLS_DIR="$HOME/.claude/skills"
mkdir -p "$SKILLS_DIR"
SKILL_COUNT=0
for plugin_skills_root in "$PLUGINS_DIR/plugins/psd-coding-system/skills" "$PLUGINS_DIR/plugins/psd-productivity/skills"; do
  [ -d "$plugin_skills_root" ] || continue
  while IFS= read -r skill_md; do
    skill_dir="$(dirname "$skill_md")"
    skill_name="$(basename "$skill_dir")"
    rm -rf "$SKILLS_DIR/$skill_name"
    cp -r "$skill_dir" "$SKILLS_DIR/$skill_name"
    SKILL_COUNT=$((SKILL_COUNT + 1))
  done < <(find "$plugin_skills_root" -mindepth 2 -maxdepth 2 -name "SKILL.md" -type f)
done
echo "Skills installed to $SKILLS_DIR: $SKILL_COUNT"

# Sanity check for the agents the routines actually invoke
echo "--- agent sanity check ---"
MISSING=0
for expected in \
  repo-research-analyst.md \
  git-history-analyzer.md \
  bug-reproduction-validator.md \
  work-researcher.md \
  test-specialist.md \
  work-validator.md \
  runtime-verifier.md \
  security-reviewer.md \
  learning-writer.md; do
  if [ -f "$AGENTS_DIR/$expected" ]; then
    echo "  ✓ $expected"
  else
    echo "  ✗ MISSING: $expected" >&2
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo "FATAL: $MISSING required agent(s) missing after materialization." >&2
  exit 1
fi

echo "=== bootstrap complete ==="
