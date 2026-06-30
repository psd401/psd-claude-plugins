#!/usr/bin/env bash
# verify-gate-stop-hook.sh — Stop-hook backstop for the Definition-of-Done gate.
#
# Blocks the agent from ending its turn while the local DoD is not verifiably
# green — but ONLY at the finalize step (the coding skill dropped .psd/finalizing)
# and ONLY in repos that opted in (.psd/verify.json). This is what stops an agent
# declaring "done" with red tests, lint warnings, or uncommitted work.
#
# It does NOT re-run the test suite (that would hang the UI for minutes). Instead
# it trusts the cached result written by verify-gate.sh ONLY when that result is
# GREEN, was produced at the current HEAD, and the tree is clean. Any drift since
# the last green gate ⇒ block and make the agent re-run the gate.
#
# It deliberately never fires during mid-implementation turns or the PR watch-loop
# polling waits (no sentinel then), so it can't fight the self-paced loop.
#
# Stop-hook contract: exit 0 allows the stop; exit 2 blocks it and feeds stderr
# to the model as the reason to keep working.

set -uo pipefail

SENTINEL=".psd/finalizing"
CONFIG="${PSD_VERIFY_CONFIG:-.psd/verify.json}"
RESULT=".psd/last-gate-result"

# Not finalizing, or repo not configured → allow stop.
[ -f "$SENTINEL" ] || exit 0
[ -f "$CONFIG" ]   || exit 0

# Stale sentinel (abandoned session) → clear and allow, never block forever.
if find "$SENTINEL" -mmin +30 2>/dev/null | grep -q .; then
  rm -f "$SENTINEL"
  exit 0
fi

block() {
  { echo "Definition-of-Done gate not satisfied — do not finish yet."
    echo "$1"
    echo "Run: \${CLAUDE_PLUGIN_ROOT}/scripts/verify-gate.sh — fix every failing step, commit, then finish."
  } >&2
  exit 2
}

[ -f "$RESULT" ] || block "No gate result on record. The gate has not been run for this change."

# shellcheck disable=SC1090
. "$RESULT"

CUR_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "nogit")
CUR_DIRTY=$([ -n "$(git status --porcelain 2>/dev/null)" ] && echo 1 || echo 0)

[ "${STATUS:-RED}" = "GREEN" ] || block "Last gate run was RED."
[ "${HEAD:-x}" = "$CUR_HEAD" ]  || block "Code changed since the last green gate (HEAD moved). Re-run the gate."
[ "$CUR_DIRTY" = "0" ]          || block "Uncommitted changes present. Commit everything, then re-run the gate."

# Verified green at current state → clear sentinel, allow stop.
rm -f "$SENTINEL"
exit 0
