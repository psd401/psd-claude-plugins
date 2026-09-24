#!/bin/bash
# Launch Brave Browser Nightly with persistent debug profile for browser automation.
# Uses Brave Nightly to bypass PSD district MDM restrictions on Chrome remote debugging.
#
# Usage:
#   ./launch-chrome.sh              # Launch visible browser
#   ./launch-chrome.sh --headless   # Launch headless
#   ./launch-chrome.sh --status     # Check if running

PROFILE_DIR="$HOME/.psd-browser-automation"
PORT=9222

# Status check
if [ "$1" = "--status" ]; then
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo '{"status":"running","port":'$PORT',"profile":"'"$PROFILE_DIR"'"}'
    else
        echo '{"status":"stopped","port":'$PORT'}'
    fi
    exit 0
fi

# Check if already running
if lsof -i :$PORT > /dev/null 2>&1; then
    echo '{"status":"already_running","port":'$PORT',"profile":"'"$PROFILE_DIR"'"}'
    exit 0
fi

# Verify Brave Nightly is installed
BRAVE_PATH="/Applications/Brave Browser Nightly.app/Contents/MacOS/Brave Browser Nightly"
if [ ! -f "$BRAVE_PATH" ]; then
    echo '{"status":"error","error":"Brave Browser Nightly not found at '"$BRAVE_PATH"'"}'
    exit 1
fi

mkdir -p "$PROFILE_DIR"

HEADLESS=""
[ "$1" = "--headless" ] && HEADLESS="--headless=new"

# On a fresh visible launch, open the PowerSchool admin login so the operator
# can sign in immediately (session expired = this is the page they need anyway;
# session alive = PS just shows the start page).
# The host comes from POWERSCHOOL_HOST (env, then login Keychain) so it stays out
# of this public repo; with neither set, Brave opens its default page.
PS_HOST="${POWERSCHOOL_HOST:-$(security find-generic-password -a "$USER" -s POWERSCHOOL_HOST -w 2>/dev/null)}"
START_URL="${PSD_BROWSER_START_URL:-${PS_HOST:+https://$PS_HOST/admin/pw.html}}"
[ -n "$HEADLESS" ] && START_URL=""

# Fully detach Brave from this shell: an inherited stdout/stderr pipe makes the
# calling tool hang until Brave exits (seen 2026-09-09). Brave's own stderr is
# kept in a log because "DevTools listening on ws://..." is the reliable
# readiness signal.
LOG="$PROFILE_DIR/brave-launch.log"
nohup "$BRAVE_PATH" \
    --remote-debugging-port=$PORT \
    --user-data-dir="$PROFILE_DIR" \
    $HEADLESS \
    --no-first-run \
    --no-default-browser-check \
    --window-size=1280,900 \
    $START_URL > "$LOG" 2>&1 < /dev/null &
disown 2>/dev/null || true

# Wait for the DevTools endpoint (not just a bound port) — up to ~15s
for i in $(seq 1 30); do
    if curl -s --max-time 1 "http://127.0.0.1:$PORT/json/version" > /dev/null 2>&1 \
       || grep -q "DevTools listening" "$LOG" 2>/dev/null; then
        echo '{"status":"started","port":'$PORT',"profile":"'"$PROFILE_DIR"'","log":"'"$LOG"'"}'
        exit 0
    fi
    sleep 0.5
done

echo '{"status":"failed","error":"DevTools endpoint on port '$PORT' not ready within 15 seconds — see '"$LOG"'"}'
exit 1
