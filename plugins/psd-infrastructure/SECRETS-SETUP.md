# Secrets Setup for PSD Infrastructure

Every server in this plugin talks to a real PSD system and needs credentials.
Nothing works until you set these up. Credentials never live in this repo.

## Prerequisites

- `gh` CLI authenticated to GitHub (`gh auth login`) — the server code lives in
  internal psd401 repos and is cloned on first launch
- `bun` (`brew install oven-sh/bun/bun`) — runs fortianalyzer, freshservice, docbot
- `uv` (`brew install uv`) — runs the Aruba server

## Which servers need which keys?

| Server | Required | Optional |
|---|---|---|
| `aruba` | `ARUBA_HOST`, `ARUBA_USERNAME`, `ARUBA_PASSWORD` | `ARUBA_PORT` (default 4343), `ARUBA_VERIFY_SSL` (default false) |
| `fortianalyzer` | `FAZ_HOST`, `FAZ_USERNAME`, `FAZ_PASSWORD` | `FAZ_ADOM` |
| `freshservice` | `FRESHSERVICE_DOMAIN`, `FRESHSERVICE_API_KEY`, `FRESHSERVICE_AGENT_EMAIL` | |
| `docbot` | `BOOKSTACK_URL`, `BOOKSTACK_TOKEN_ID`, `BOOKSTACK_TOKEN_SECRET` | `FRESHSERVICE_ENABLED`, `FRESHSERVICE_DOMAIN`, `FRESHSERVICE_API_KEY`, `GEMINI_API_KEY`, `DOCBOT_DB_PATH`, `DOCBOT_LOG_LEVEL` |

Ask Reese Herber (herberr@psd401.net) for host values and service accounts.
Freshservice API keys are per-agent: Freshservice → Profile Settings → API Key.

## Option A: Shared env file (recommended)

Create `~/.config/psd-infrastructure/.env`:

```bash
mkdir -p ~/.config/psd-infrastructure
cat > ~/.config/psd-infrastructure/.env <<'EOF'
ARUBA_HOST=...
ARUBA_USERNAME=...
ARUBA_PASSWORD=...

FAZ_HOST=...
FAZ_USERNAME=...
FAZ_PASSWORD=...

FRESHSERVICE_DOMAIN=...
FRESHSERVICE_API_KEY=...
FRESHSERVICE_AGENT_EMAIL=you@psd401.net

BOOKSTACK_URL=...
BOOKSTACK_TOKEN_ID=...
BOOKSTACK_TOKEN_SECRET=...
EOF
chmod 600 ~/.config/psd-infrastructure/.env
```

The launcher script loads this file automatically before starting each server.
Set `PSD_INFRA_ENV` to point somewhere else if you keep secrets elsewhere.

## Option B: Shell profile

Export the same variables from `~/.zshrc`. Both options work; the env file
keeps infrastructure credentials separate from your general shell environment.

## Only using some servers?

Set up only the credentials you need. A server with missing credentials fails
on first tool call with a clear error; the others are unaffected. You can also
disable individual servers under `/plugin` → manage plugins.
