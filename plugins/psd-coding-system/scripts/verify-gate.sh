#!/usr/bin/env bash
# verify-gate.sh — the deterministic Definition-of-Done gate.
#
# Reads .psd/verify.json from the current repo and runs the configured
# build / lint / typecheck / test / e2e commands IN ORDER. Prints a summary.
#
# Exit codes:
#   0  gate green, OR no .psd/verify.json (inert — never disrupts opted-out repos),
#      OR strictness == "warn" (report-only)
#   1  gate red and strictness == "block"
#
# Callable directly by /lfg and the runtime-verifier agent, and wrapped by the
# Stop hook (see verify-gate-stop-hook.sh). See docs/patterns/definition-of-done.md.

set -uo pipefail

CONFIG="${PSD_VERIFY_CONFIG:-.psd/verify.json}"

# Inert when the repo has not opted in.
if [ ! -f "$CONFIG" ]; then
  echo "verify-gate: no $CONFIG — gate inert (repo not configured)."
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "verify-gate: jq not found — cannot read $CONFIG; treating gate as inert." >&2
  exit 0
fi

STRICTNESS=$(jq -r '.strictness // "block"' "$CONFIG")
E2E_REQUIRED=$(jq -r '.e2e_required // false' "$CONFIG")

FAILED_STEPS=()
WARNED_STEPS=()

run_step() {
  # $1 = step name (key under .commands), $2 = "required" | "optional"
  local name="$1" req="$2" cmd
  cmd=$(jq -r ".commands.${name} // empty" "$CONFIG")
  if [ -z "$cmd" ]; then
    echo "── $name: (not configured — skipped)"
    return 0
  fi
  echo "── $name: $cmd"
  if eval "$cmd"; then
    echo "   ✓ $name passed"
    return 0
  fi
  if [ "$req" = "required" ]; then
    echo "   ✗ $name FAILED"
    FAILED_STEPS+=("$name")
  else
    echo "   ⚠ $name failed (optional)"
    WARNED_STEPS+=("$name")
  fi
  return 1
}

echo "=== verify-gate (strictness=$STRICTNESS) ==="
run_step build     required
run_step lint      required
run_step typecheck required
run_step test      required
if [ "$E2E_REQUIRED" = "true" ]; then
  run_step e2e required
else
  run_step e2e optional
fi

# Cache the result so the Stop hook can verify it without re-running the suite.
write_result() {
  # $1 = GREEN|RED
  local status="$1" head dirty
  head=$(git rev-parse HEAD 2>/dev/null || echo "nogit")
  dirty=$([ -n "$(git status --porcelain 2>/dev/null)" ] && echo 1 || echo 0)
  mkdir -p .psd 2>/dev/null || true
  {
    echo "STATUS=$status"
    echo "HEAD=$head"
    echo "DIRTY=$dirty"
  } > .psd/last-gate-result 2>/dev/null || true
}

echo ""
echo "=== verify-gate summary ==="
if [ "${#FAILED_STEPS[@]}" -eq 0 ]; then
  echo "GREEN — Definition of Done satisfied."
  [ "${#WARNED_STEPS[@]}" -gt 0 ] && echo "(non-blocking warnings: ${WARNED_STEPS[*]})"
  write_result GREEN
  exit 0
fi

echo "RED — failing steps: ${FAILED_STEPS[*]}"
write_result RED
if [ "$STRICTNESS" = "warn" ]; then
  echo "strictness=warn → reporting only, not blocking."
  exit 0
fi
echo "strictness=block → gate fails. Fix the steps above before finishing."
exit 1
