#!/usr/bin/env bash

# Wrapper script for Documenso MCP server (official SDK).
# Reads DOCUMENSO_API_KEY and DOCUMENSO_HOST from the environment, then the
# macOS Keychain, then the legacy .env file, then launches the SDK's built-in
# MCP server.

ENV_FILE="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env"

# Prefer the macOS login Keychain (service = var name, account = $USER)
for var in DOCUMENSO_HOST DOCUMENSO_API_KEY; do
  if [[ -z "${!var}" ]]; then
    kc="$(/usr/bin/security find-generic-password -a "$USER" -s "$var" -w 2>/dev/null || true)"
    [[ -n "$kc" ]] && export "$var"="$kc"
  fi
done

# Fall back to the legacy .env if still unset (being retired)
if [[ -z "$DOCUMENSO_API_KEY" || -z "$DOCUMENSO_HOST" ]]; then
  if [[ -f "$ENV_FILE" ]]; then
    while IFS='=' read -r key value; do
      [[ -z "$key" || "$key" == \#* ]] && continue
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      case "$key" in
        DOCUMENSO_HOST)    [[ -z "$DOCUMENSO_HOST" ]]    && export DOCUMENSO_HOST="$value" ;;
        DOCUMENSO_API_KEY) [[ -z "$DOCUMENSO_API_KEY" ]] && export DOCUMENSO_API_KEY="$value" ;;
      esac
    done < "$ENV_FILE"
  fi
fi

if [[ -z "$DOCUMENSO_API_KEY" ]]; then
  echo '{"error": "DOCUMENSO_API_KEY not set."}' >&2
  exit 1
fi

# Build the base URL for self-hosted instance
if [[ -n "$DOCUMENSO_HOST" ]]; then
  if [[ "$DOCUMENSO_HOST" == http* ]]; then
    API_URL="$DOCUMENSO_HOST"
  else
    API_URL="https://$DOCUMENSO_HOST"
  fi
fi

exec npx -y --package @documenso/sdk-typescript -- mcp start --api-key "$DOCUMENSO_API_KEY" ${API_URL:+--server-url "$API_URL/api/v2"}
