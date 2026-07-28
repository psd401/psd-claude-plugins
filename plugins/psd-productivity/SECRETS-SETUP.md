# Secrets Setup for PSD Productivity

Some skills require API keys to work. This guide explains how to set them up safely.

---

## Which skills need keys?

| Skill | Required Keys |
|-------|--------------|
| `/elevenlabs-tts` | `ELEVENLABS_API_KEY` |
| `/research` | `OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `XAI_API_KEY` |
| `/multi-model-research` | `OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `XAI_API_KEY` |
| `/image-gen` | `GEMINI_API_KEY` |
| `/pdf-to-markdown` | `GOOGLE_API_KEY` |
| `/freshservice-manager` | `FRESHSERVICE_API_KEY`, `FRESHSERVICE_DOMAIN` |
| `/redrover-manager` | `RED_ROVER_API_KEY` |
| `/legislative-tracker` | None (uses public SOAP API) |
| `/psd-atrium` | `ATRIUM_API_KEY` (+ optional `ATRIUM_HOST`, defaults to `aistudio.psd401.ai`) |
| `/strategic-planning-manager` | `OPENAI_API_KEY`, `GEMINI_API_KEY` |

Skills not listed above do not require API keys.

### Where to get the Atrium key

`ATRIUM_API_KEY` is issued by AI Studio itself, not by a third party: sign in at
`https://aistudio.psd401.ai` → **Settings → API Keys** → create a key. The raw key
(`sk-…`) is displayed **once** — copy it immediately.

Grant these scopes, or the matching commands return exit 11:

| Scope | Needed for |
|-------|-----------|
| `content:read` | `status`, `find`, `read`, `read-source`, `collections` |
| `content:create` | `create-document`, `create-artifact` |
| `content:update` | `edit`, `archive`, `set-visibility`, image uploads |
| `content:publish_internal` | `publish`, `unpublish` |

`content:publish_public` is withheld from staff/admin defaults by design. Publishing
to a public destination without it is not an error — it returns a queued-for-approval
result that an admin must approve.

---

## Option A: Shell Profile (Safest)

Add your keys to `~/.zshrc`. They stay in memory only — Claude Code cannot read your shell profile.

### Steps

1. Open Terminal
2. Run:
   ```bash
   open -e ~/.zshrc
   ```
3. Add your keys at the bottom:
   ```bash
   # PSD Productivity API Keys
   export ELEVENLABS_API_KEY="your-key-here"
   export OPENAI_API_KEY="your-key-here"
   export GEMINI_API_KEY="your-key-here"
   export PERPLEXITY_API_KEY="your-key-here"
   ```
4. Save and close the file
5. Restart your terminal (or run `source ~/.zshrc`)

Only add the keys you actually have — you don't need all of them.

---

## Option B: Config File (Easier)

Store keys in `~/.config/psd-productivity/.env`. This folder is NOT inside any project directory, so Claude Code will not auto-read it.

### Steps

1. Open Terminal
2. Create the folder and file:
   ```bash
   mkdir -p ~/.config/psd-productivity
   touch ~/.config/psd-productivity/.env
   chmod 600 ~/.config/psd-productivity/.env
   open -e ~/.config/psd-productivity/.env
   ```
3. Add your keys (one per line):
   ```
   ELEVENLABS_API_KEY=your-key-here
   OPENAI_API_KEY=your-key-here
   GEMINI_API_KEY=your-key-here
   PERPLEXITY_API_KEY=your-key-here
   ```
4. Save and close the file

The `chmod 600` makes the file readable only by you.

---

## How it works

When a skill needs a key, it checks in this order:

1. **Environment variable** (from shell profile) — checked first
2. **`~/.config/psd-productivity/.env`** — checked second
3. **1Password CLI** — checked last (only if `op` is installed)

If the key isn't found anywhere, you'll get a clear error message telling you which key is missing and how to set it.

---

## Verify your setup

Run this from any directory:

```bash
uv run ~/.claude/plugins/marketplaces/psd-claude-plugins/plugins/psd-productivity/scripts/secrets.py --check
```

This shows which keys are found and which are missing.

---

## Security notes

- **Never put API keys in a project directory** — Claude Code auto-reads `.env` files in working directories
- **Option A is safest** because keys only exist in process memory, not in a file
- **Option B is acceptable** because `~/.config/psd-productivity/` is outside project directories and the file is permission-locked
- **Future**: We plan to move secrets to the PSD organizational MCP server with role-based access control
