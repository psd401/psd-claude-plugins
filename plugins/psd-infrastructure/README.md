# PSD Infrastructure

Network and systems tooling for Peninsula School District IT, packaged as MCP
servers plus companion skills that teach Claude the workflows and pitfalls for
each system.

## What's included

| System | MCP server | Skill | Tools |
|---|---|---|---|
| Aruba wireless controllers | `aruba` | `aruba-wireless` | 6 (APs, clients, config, logs — read-only) |
| FortiAnalyzer | `fortianalyzer` | `fortianalyzer-logs` | 25 (log search, alerts, reports, devices) |
| Freshservice | `freshservice` | `freshservice-tickets` | 15 (tickets, replies, context, KB, similar-ticket matching) |
| DocBot (BookStack + FS docs) | `docbot` | `docbot-docs` | 30 (audits, propose/approve/apply changes, screenshots) |

Server source lives in internal psd401 repos:
[aruba-mcp](https://github.com/psd401/aruba-mcp),
[fortianalyzer-mcp](https://github.com/psd401/fortianalyzer-mcp),
[freshservice-mcp](https://github.com/psd401/freshservice-mcp),
[DocBot](https://github.com/psd401/DocBot).

## Install (one time)

```
/plugin marketplace add psd401/psd-claude-plugins   # skip if already added
/plugin install psd-infrastructure@psd-claude-plugins
```

Then:

1. **Enable auto-update** for the marketplace: `/plugin` → Marketplaces tab →
   psd-claude-plugins → Enable auto-update. Third-party marketplaces ship with
   auto-update off, so without this step you only get updates by running
   `/plugin marketplace update psd-claude-plugins` manually.
2. **Set up credentials**: see [SECRETS-SETUP.md](./SECRETS-SETUP.md).
   Requires `gh` (authenticated), `bun`, and `uv` — install commands are in
   that file too.

## How updates work

Two layers update independently, and both are automatic after the one-time
setup above:

1. **Server code.** On every launch, the launcher (`scripts/run-server.sh`)
   does a fast-forward `git pull` of the server repo before starting it. Push
   to a server repo's default branch and everyone runs the new code on their
   next Claude Code session. Offline or failed pulls fall back to the cached
   copy (kept under Claude's plugin data dir, surviving plugin updates).
2. **Skills and plugin config.** With marketplace auto-update enabled, Claude
   Code checks for updates shortly after each session starts and either
   prompts `/reload-plugins` or applies them on the next launch. This plugin
   deliberately has **no `version` field**, so for git-based installs every
   pushed commit counts as a new version — no version bump needed, and no
   forgotten-bump silent staleness.

Team repos can auto-prompt installation for everyone who trusts the folder by
committing this to the repo's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "psd-claude-plugins": {
      "source": { "source": "github", "repo": "psd401/psd-claude-plugins" }
    }
  },
  "enabledPlugins": {
    "psd-infrastructure@psd-claude-plugins": true
  }
}
```

Org-wide, managed settings can additionally set `"autoUpdate": true` on the
marketplace entry so nobody has to flip the toggle themselves.

## First launch is slow

The first session after install clones each server repo and installs its
dependencies (a few minutes total). Later launches start in seconds.

## Not included (yet)

`zabbix` and `onesync` MCP servers exist but are excluded from this plugin
until connection issues are resolved. The `mac-mini` bridge and `pinchtab`
browser servers are personal tooling and stay out of the shared plugin.
