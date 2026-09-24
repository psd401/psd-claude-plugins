# PSD Cloud Routines

Production Claude Code routines that run on Anthropic's cloud infrastructure (claude.ai/code/routines), not on Hagel's machine. They survive reboots, network changes, and sleep — unlike the local `/loop` they replace.

> **New here?** Read [`docs/routines/GETTING-STARTED.md`](../docs/routines/GETTING-STARTED.md) first — that's the user-facing guide with the infographic, setup walkthrough, and troubleshooting. This file is the architecture reference for people extending the system.

## The architecture

All routines share one cloud environment (`psd-automation`) whose setup script clones `psd-claude-plugins` fresh from `main` on every fire and materializes every plugin agent + skill into `~/.claude/agents/` and `~/.claude/skills/`. This is **Pattern 1**, validated by the `agent-discovery-check` pilot (issues #61 and #62, now closed).

```
┌──────────────────────────────────────────────────────────────┐
│  psd-automation cloud environment                             │
│                                                                │
│  Setup script (runs every fire — HOME is fresh per fire):     │
│    1. git clone --depth 1 psd-claude-plugins → /tmp/...       │
│    2. cp plugins/psd-coding-system/agents/**/*.md             │
│         → ~/.claude/agents/  (user-scope, auto-discovered)    │
│    3. cp plugins/*/skills/**                                  │
│         → ~/.claude/skills/  (user-scope, auto-discovered)    │
│    4. validate FRESHSERVICE_* env vars                        │
│                                                                │
│  Env vars:  FRESHSERVICE_API_KEY, _DOMAIN, _WORKSPACE_ID      │
│  Network:   Trusted + <domain>.freshservice.com allowed       │
└──────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │ triage  │         │  lfg    │         │ pr-fix  │
   │ (daily) │         │ (6h)    │         │ (3h)    │
   └─────────┘         └─────────┘         └─────────┘
   FreshService →      `lfg-ready` →       Failing PRs →
   GitHub issue        PR with audit       Comments addressed
```

Every routine clones all three target repos:
- `psd401/aistudio`
- `psd401/psd-workflow-automation`
- `psd401/psd-claude-plugins`

And `cd`s between them as needed.

## Routines

| Routine | Cadence | Per-fire | Status |
|---------|---------|----------|--------|
| [triage](./triage/README.md) | daily (`0 10 * * *`) | up to 5 tickets | built — first-run tested |
| [lfg](./lfg/README.md) | every 6h (`41 */6 * * *`) | 1 issue | built — first-run tested |
| [pr-fix](./pr-fix/README.md) | every 3h (`30 */3 * * *`) | 1 PR | built — pending first-run test |

## Why not plugins?

Claude Code routines don't load plugins installed via `/plugin install` — only **skills committed to a cloned repo** and **agents at `~/.claude/agents/` or `<repo>/.claude/agents/`** are auto-discovered. The setup script's job is to bridge that gap: it materializes plugin contents as user-scope files inside the cloud env, so the same agent definitions interactive desktop users invoke via plugins are also available to routines.

This means we maintain one source of truth (`plugins/psd-coding-system/agents/**`) and both paths use it.

## Why always pull main?

Agent improvements land in `main` and flow through to the next routine fire automatically. The tradeoff: a broken agent commit immediately breaks all routine runs until reverted. Mitigation: don't merge agent changes without manual `/triage` testing first. If desired, pin the setup script to a tagged release later.

## Updating routines

These files are the canonical source. To update a routine's prompt or env script:

1. Edit the file here
2. Commit + push
3. **Manually paste the new contents into the cloud routine config** at <https://claude.ai/code/routines>

The cloud doesn't watch the repo. Repo files are documentation + reviewable history; the runtime config is set in the web UI.

## Pilots

Throwaway validation routines that prove an architectural assumption live in `routine-pilots/` (currently empty — `agent-discovery-check` was removed after validation).
