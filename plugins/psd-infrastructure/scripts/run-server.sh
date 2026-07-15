#!/usr/bin/env bash
# Launcher for psd-infrastructure MCP servers.
# Clones the server repo on first use, pulls updates on every launch,
# then execs the server. Server code lives in internal psd401 repos;
# users need `gh auth login` (or equivalent git credentials) once.
set -euo pipefail

NAME="${1:?usage: run-server.sh <aruba|fortianalyzer|freshservice|docbot>}"
CACHE_ROOT="${PSD_INFRA_HOME:-$HOME/.psd-infrastructure}/servers"
DIR="$CACHE_ROOT/$NAME"

case "$NAME" in
  aruba)         REPO="psd401/aruba-mcp" ;;
  fortianalyzer) REPO="psd401/fortianalyzer-mcp" ;;
  freshservice)  REPO="psd401/freshservice-mcp" ;;
  docbot)        REPO="psd401/DocBot" ;;
  *) echo "unknown server: $NAME" >&2; exit 1 ;;
esac

# Optional shared env file (see SECRETS-SETUP.md). Shell-profile exports also work.
ENV_FILE="${PSD_INFRA_ENV:-$HOME/.config/psd-infrastructure/.env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

log() { echo "[psd-infrastructure/$NAME] $*" >&2; }

clone_repo() {
  mkdir -p "$CACHE_ROOT"
  if command -v gh >/dev/null 2>&1; then
    gh repo clone "$REPO" "$DIR" -- --quiet >&2
  else
    git clone --quiet "https://github.com/$REPO.git" "$DIR" >&2
  fi
}

if [ ! -d "$DIR/.git" ]; then
  log "first run: cloning $REPO"
  clone_repo
else
  # Best-effort update; a failed pull (offline, etc.) falls back to cached code.
  git -C "$DIR" pull --ff-only --quiet >&2 || log "update check failed, using cached copy"
fi

cd "$DIR"

case "$NAME" in
  aruba)
    command -v uv >/dev/null 2>&1 || { log "uv is required (brew install uv)"; exit 1; }
    exec uv run aruba_mcp.py
    ;;
  fortianalyzer)
    command -v bun >/dev/null 2>&1 || { log "bun is required (brew install oven-sh/bun/bun)"; exit 1; }
    bun install --silent >&2 || true
    exec bun run src/index.ts
    ;;
  freshservice)
    command -v bun >/dev/null 2>&1 || { log "bun is required (brew install oven-sh/bun/bun)"; exit 1; }
    bun install --silent >&2 || true
    exec bun run src/index.ts
    ;;
  docbot)
    command -v bun >/dev/null 2>&1 || { log "bun is required (brew install oven-sh/bun/bun)"; exit 1; }
    bun install --silent >&2 || true
    export DOCBOT_DB_PATH="${DOCBOT_DB_PATH:-$DIR/docbot.db}"
    exec bun run src/index.ts
    ;;
esac
