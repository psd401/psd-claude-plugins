#!/usr/bin/env bash
# Resolve the classintercom-pp-cli binary for the current platform.
# Strategy: use a cached binary if present; else download the prebuilt binary
# for this OS/arch from the repo's GitHub Release; else (offline + Go present)
# build it from the vendored source. Prints the absolute binary path on stdout;
# all diagnostics go to stderr so callers can `BIN="$(ensure-binary.sh)"`.
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="v1.0.1"                      # bump together with the GitHub Release tag
REPO="psd401/psd-claude-plugins"
TAG="classintercom-cli-${VERSION}"
CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/classintercom-pp-cli/${VERSION}"

case "$(uname -s)" in
  Darwin) OS=darwin ;;
  Linux)  OS=linux ;;
  MINGW*|MSYS*|CYGWIN*|Windows_NT) OS=windows ;;
  *) OS=linux ;;
esac
case "$(uname -m)" in
  arm64|aarch64) ARCH=arm64 ;;
  *) ARCH=amd64 ;;
esac
EXT=""; [ "$OS" = "windows" ] && EXT=".exe"

BIN="${CACHE_DIR}/classintercom-pp-cli${EXT}"
if [ -x "$BIN" ]; then
  echo "$BIN"
  exit 0
fi
mkdir -p "$CACHE_DIR"

ASSET="classintercom-pp-cli-${OS}-${ARCH}${EXT}.gz"
URL="https://github.com/${REPO}/releases/download/${TAG}/${ASSET}"

echo "class-intercom: fetching prebuilt binary (${OS}/${ARCH}) from ${TAG}..." >&2
if curl -fsSL "$URL" -o "${BIN}.gz" 2>/dev/null && gunzip -f "${BIN}.gz" 2>/dev/null; then
  chmod +x "$BIN"
  echo "$BIN"
  exit 0
fi
rm -f "${BIN}.gz" 2>/dev/null || true

# Fallback: build from the vendored source (requires Go 1.26.4+).
if command -v go >/dev/null 2>&1; then
  echo "class-intercom: download unavailable; building from vendored source with Go..." >&2
  ( cd "${SKILL_DIR}/cli" && CGO_ENABLED=0 go build -o "$BIN" ./cmd/classintercom-pp-cli )
  echo "$BIN"
  exit 0
fi

echo "ERROR: could not download the prebuilt classintercom-pp-cli binary for ${OS}/${ARCH}" >&2
echo "       from ${URL}, and Go is not installed to build from source." >&2
echo "Fix: ensure network access to GitHub Releases, or install Go 1.26.4+ (https://go.dev/dl/)" >&2
echo "     and re-run; the skill will build the binary from plugins/.../class-intercom/cli/." >&2
exit 1
