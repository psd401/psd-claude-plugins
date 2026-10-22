---
type: Integration
title: Opt-in MCP plugins (n8n, documenso) and Context7
description: "How the n8n and documenso plugins launch MCP servers through bash proxy scripts that resolve credentials (env, Keychain, legacy .env), why they start disabled, the pinned mcp-remote and Documenso SDK versions and token-exposure trade-offs, plus the Context7 and n8n-docs servers configured elsewhere."
tags: [mcp, n8n, documenso, context7, secrets, proxy, opt-in]
openwiki:
  roles: [integration, operations]
  change_kinds: [mcp-server, secrets, version-pin]
  source_paths:
    - plugins/n8n/.claude-plugin/plugin.json
    - plugins/n8n/scripts/n8n-mcp-proxy.sh
    - plugins/documenso/.claude-plugin/plugin.json
    - plugins/documenso/scripts/documenso-mcp-proxy.sh
    - plugins/psd-coding-system/.claude-plugin/plugin.json
    - plugins/psd-productivity/.claude-plugin/plugin.json
  symbols: [defaultEnabled, mcpServers, n8n-instance, documenso, context7, n8n-docs]
  invariants:
    - The n8n and documenso plugins declare defaultEnabled false so people without credentials never see a failed server.
    - The n8n bearer token reaches mcp-remote through an environment placeholder, not argv; the Documenso API key is necessarily on argv with SDK 0.9.1.
    - Credential lookup order is env, then macOS Keychain, then legacy Geoffrey .env.
  validation_commands:
    - "shellcheck --severity=error plugins/n8n/scripts/n8n-mcp-proxy.sh plugins/documenso/scripts/documenso-mcp-proxy.sh"
    - "claude plugin validate ."
---

# MCP server plugins

Four MCP servers are configured across the marketplace; only n8n and documenso need proxy scripts.

| Server | Declared in | Transport | Credentials |
|---|---|---|---|
| `n8n-instance` | `plugins/n8n/.claude-plugin/plugin.json` | stdio → `scripts/n8n-mcp-proxy.sh` | `N8N_HOST`, `N8N_MCP_TOKEN` |
| `documenso` | `plugins/documenso/.claude-plugin/plugin.json` | stdio → `scripts/documenso-mcp-proxy.sh` | `DOCUMENSO_API_KEY` (+ `DOCUMENSO_HOST` for self-hosted) |
| `context7` | [psd-coding-system](../architecture/coding-system.md) `plugin.json` | http `https://mcp.context7.com/mcp` | none; live framework docs |
| `n8n-docs` | [psd-productivity](../architecture/productivity-plugin.md) `plugin.json` | stdio `bunx n8n-mcp@2.94.3` | none; node documentation |
| `collab` | see [collab plugin](./collab-plugin.md) | http (hosted) | Google sign-in via `/mcp` |

## Why separate opt-in plugins

Both `n8n` and `documenso` set `"defaultEnabled": false`: install the plugin, then enable it from the **Installed** tab of `/plugin`. Splitting them out of psd-productivity means staff without the credentials never see a failing MCP server. The matching skills (`/n8n-manager`, `/documenso-manager`) remain in psd-productivity and talk to the REST APIs through `BaseApiClient` clients ([productivity plugin](../architecture/productivity-plugin.md#api-client-convention)); `/n8n-manager` also has its own `n8n_mcp_client.js`.

## Proxy scripts

Each proxy: (1) for each variable not already set, read the macOS login Keychain (`security find-generic-password -a "$USER" -s VAR -w`); (2) fall back to the legacy `~/Library/Mobile Documents/com~apple~CloudDocs/Geoffrey/secrets/.env` parser (being retired); (3) exit 1 with a JSON error on stderr if required values are missing; (4) `exec` the server. Same chain as `secrets.js` ([secrets resolution](../architecture/productivity-plugin.md#secrets-resolution)); setup instructions in `plugins/psd-productivity/SECRETS-SETUP.md`.

- **n8n:** URL is `https://<N8N_HOST>/mcp-server/http` (a bare host gets `https://`; plain http is refused by `mcp-remote` except localhost, and the bearer token must not travel in clear). Launches `bunx mcp-remote@0.15.1 <url> --header 'Authorization: Bearer ${N8N_MCP_TOKEN}'` with the literal placeholder so `mcp-remote` substitutes from its environment and the token stays out of `ps`. **The 0.15.1 pin is load-bearing**: re-verify `${VAR}` header substitution before bumping.
- **documenso:** launches `bunx --package @documenso/sdk-typescript@0.9.1 mcp start --api-key ... [--server-url <host>/api/v2]`. The key *is* visible in `ps` because SDK 0.9.1's `mcp start` sets `apiKey = flags["api-key"] ?? ""`, preventing environment fallback; revisit when a newer SDK reads the environment.

## Change navigation

- Bump a pinned package: edit the proxy `exec` line, test locally by running the script with creds, then bump that plugin's version in its `plugin.json` and `marketplace.json` entry (the plugin tracks are independent of the marketplace — [version tracks](../architecture/marketplace-structure.md#version-tracks-never-mix)).
- Add a new MCP plugin: create `plugins/<name>/.claude-plugin/plugin.json` with `$schema`, `defaultEnabled:false` if credentialed, `mcpServers` using `${CLAUDE_PLUGIN_ROOT}/scripts/...`; add the marketplace entry first; shell scripts are shellchecked in CI (`shellcheck --severity=error $(git ls-files '*.sh')`).
- Never print or log token values; the repo's `redact-secrets.sh` hook only covers Bash tool output ([hooks](../architecture/coding-system.md#hooks)).
