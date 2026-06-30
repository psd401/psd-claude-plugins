#!/bin/bash
# Production environment setup script for the psd-automation cloud env.
# Used by all PSD routines (triage, lfg, pr-fix, etc.).
#
# What it does:
#   1. Diagnostics — prints cwd, HOME, and the layout the routine will see
#      during the session. Useful for debugging path issues.
#   2. Clones psd-claude-plugins fresh from main on every fire (always latest).
#   3. Copies every agent from plugins/psd-coding-system/agents/** into
#      ~/.claude/agents/ as user-scope subagents. Pilot confirmed this is
#      auto-discovered at session start by the routine.
#   4. Copies every skill directory from plugins/*/skills/ into
#      ~/.claude/skills/ as user-scope skills.
#   5. Validates FRESHSERVICE_API_KEY and FRESHSERVICE_DOMAIN env vars are
#      set (without printing them).
#
# Env vars required by the SESSION (not this setup script):
#   - FRESHSERVICE_API_KEY — API key for psd401.freshservice.com
#   - FRESHSERVICE_DOMAIN  — should be "psd401"
# Set these in the routine env config. They are injected into the session,
# not the setup phase — so this script does NOT validate them. The session
# prompt's Step 1 verifies them at session start instead.
#
# Required network access (set in env config):
#   - Trusted is fine for github.com / api.github.com
#   - Add psd401.freshservice.com to Allowed domains (it's not in the default
#     trusted allowlist). Without it, FreshService API calls fail with 403.

set -uo pipefail

echo "=== psd-automation env setup ==="
date -u +"setup start: %Y-%m-%dT%H:%M:%SZ"
echo "cwd: $(pwd)"
echo "HOME: $HOME"
echo "whoami: $(whoami 2>/dev/null || echo unknown)"

echo "--- existing $HOME contents ---"
ls -la "$HOME" 2>&1 | head -20 || true

# Install GitHub CLI (gh). The base image doesn't include it. This belongs
# in setup (not the in-session bootstrap) because the cached layer is the
# right place for a stable package install.
if ! command -v gh >/dev/null 2>&1; then
  echo "--- installing GitHub CLI (gh) ---"
  apt-get update -qq >/dev/null 2>&1
  if curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg status=none 2>/dev/null \
     && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg 2>/dev/null \
     && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
        > /etc/apt/sources.list.d/github-cli.list \
     && apt-get update -qq >/dev/null 2>&1 \
     && apt-get install -y -qq gh >/dev/null 2>&1; then
    echo "gh installed: $(gh --version | head -1)"
  else
    echo "WARN: gh install failed — routines will need to use GitHub MCP tools as fallback" >&2
  fi
else
  echo "gh already present: $(gh --version | head -1)"
fi

# NOTE: setup script does not see env vars set in the routine env config —
# those are injected into the session, not the setup phase. Env-var validation
# happens at session start, not here.

# Clone psd-claude-plugins fresh — always pull main
PLUGINS_DIR="/tmp/psd-plugins"
rm -rf "$PLUGINS_DIR"
echo "Cloning psd-claude-plugins (main)..."
git clone --depth 1 --branch main https://github.com/psd401/psd-claude-plugins.git "$PLUGINS_DIR" 2>&1 | tail -5
echo "Clone HEAD: $(cd "$PLUGINS_DIR" && git rev-parse --short HEAD) $(cd "$PLUGINS_DIR" && git log -1 --pretty=%s)"

# IMPORTANT: setup script runs as root (HOME=/root) but the session runs as
# user `user` (HOME=/home/user). $HOME in the setup script context is NOT
# where the session reads ~/.claude/. We must write to BOTH /root and
# /home/user so that whichever user the session ends up running as, the
# agents/skills are discoverable.
TARGET_HOMES=("/root" "/home/user")

# Materialize agents into user scope, for every plausible session HOME
AGENT_COUNT=0
for th in "${TARGET_HOMES[@]}"; do
  AGENTS_DIR="$th/.claude/agents"
  mkdir -p "$AGENTS_DIR"
  count=0
  while IFS= read -r agent_file; do
    cp "$agent_file" "$AGENTS_DIR/"
    count=$((count + 1))
  done < <(find "$PLUGINS_DIR/plugins/psd-coding-system/agents" -name "*.md" -type f)
  echo "Agents installed to $AGENTS_DIR: $count"
  AGENT_COUNT=$count

  # Ownership: if /home/user has a non-root owner, chown after writing
  if [ "$th" = "/home/user" ] && [ -d /home/user ]; then
    chown -R --reference=/home/user "$th/.claude" 2>/dev/null || true
  fi
done

# Materialize skills into user scope (both plugins' skills), for every HOME
SKILL_COUNT=0
for th in "${TARGET_HOMES[@]}"; do
  SKILLS_DIR="$th/.claude/skills"
  mkdir -p "$SKILLS_DIR"
  count=0
  for plugin_skills_root in "$PLUGINS_DIR/plugins/psd-coding-system/skills" "$PLUGINS_DIR/plugins/psd-productivity/skills"; do
    [ -d "$plugin_skills_root" ] || continue
    while IFS= read -r skill_md; do
      skill_dir="$(dirname "$skill_md")"
      skill_name="$(basename "$skill_dir")"
      rm -rf "$SKILLS_DIR/$skill_name"
      cp -r "$skill_dir" "$SKILLS_DIR/$skill_name"
      count=$((count + 1))
    done < <(find "$plugin_skills_root" -mindepth 2 -maxdepth 2 -name "SKILL.md" -type f)
  done
  echo "Skills installed to $SKILLS_DIR: $count"
  SKILL_COUNT=$count

  if [ "$th" = "/home/user" ] && [ -d /home/user ]; then
    chown -R --reference=/home/user "$th/.claude" 2>/dev/null || true
  fi
done

# Sanity-check a couple of expected agents (checking /home/user since that's
# where the session reads from in practice)
echo "--- sanity check against /home/user/.claude/agents/ ---"
for expected in repo-research-analyst.md git-history-analyzer.md bug-reproduction-validator.md work-researcher.md test-specialist.md work-validator.md runtime-verifier.md security-reviewer.md learning-writer.md; do
  if [ -f "/home/user/.claude/agents/$expected" ]; then
    echo "  ✓ $expected"
  else
    echo "  ✗ MISSING: $expected" >&2
  fi
done

date -u +"setup complete: %Y-%m-%dT%H:%M:%SZ"
echo "=== end setup ==="
