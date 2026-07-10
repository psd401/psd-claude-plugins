#!/usr/bin/env bash
# post-edit-validate.sh — PostToolUse hook for Edit|Write
# Fast, single-file syntax validation after edits. Non-blocking, exits cleanly
# for unknown types. Reads tool_input JSON from stdin to extract file_path.
#
# Intentionally NO .ts/.tsx branch: a per-edit `tsc --noEmit` is a whole-project
# typecheck (not a single-file syntax check), costs ~4s on large repos, and is
# redundant with the Definition-of-Done gate (verify-gate.sh) that already runs a
# full typecheck before a turn can finish. See issue #77. Keep this hook cheap —
# only add checks that are single-file and sub-second.

set -euo pipefail

# Parse the edited file path from the hook payload. jq reads stdin directly — no
# intermediate variable and no `echo` (which would mangle backslashes or eat a
# leading `-n`/`-e`). Malformed stdin makes jq exit non-zero, which `set -e` +
# `pipefail` would otherwise turn into a hook failure — a hook must stay
# non-blocking, so swallow that into a clean exit.
FILE_PATH=$(jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

EXT="${FILE_PATH##*.}"

case "$EXT" in
  py)
    # Python syntax check
    python3 -m py_compile "$FILE_PATH" 2>&1 || true
    ;;
  json)
    # JSON syntax check
    jq . < "$FILE_PATH" > /dev/null 2>&1 || echo "post-edit-validate: Invalid JSON in $FILE_PATH"
    ;;
  *)
    # Unknown file type — exit cleanly
    ;;
esac

exit 0
