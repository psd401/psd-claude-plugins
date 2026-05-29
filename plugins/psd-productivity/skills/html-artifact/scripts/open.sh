#!/usr/bin/env bash
# Open a generated HTML artifact in the default browser.
# Usage: bash scripts/open.sh /path/to/file.html
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: open.sh <file.html>" >&2
  exit 2
fi

target="$1"
if [ ! -f "$target" ]; then
  echo "error: file not found: $target" >&2
  exit 1
fi

case "$(uname -s)" in
  Darwin) open "$target" ;;
  Linux)  xdg-open "$target" >/dev/null 2>&1 || { echo "open manually: file://$target"; } ;;
  *)      echo "open manually: file://$target" ;;
esac
