# Files

- [Collab plugin](collab-plugin.md) - How the collab Claude Code plugin (v2.3.0) polls the hosted collab MCP server, shares inbox checks between sessions on one machine, runs the pane and listen commands, and guards reads and sends.
- [Vendored Go CLIs (parentsquare, class-intercom) and binary distribution](go-cli-skills.md) - How the parentsquare-pp-cli and classintercom-pp-cli Go CLIs are vendored under their skills, why binaries are never committed, how ensure-binary.sh fetches them from GitHub Releases, the tag-triggered release workflows, draft-only safety rules and the Go test/lint commands.
- [Opt-in MCP plugins (n8n, documenso) and Context7](mcp-plugins.md) - How the n8n and documenso plugins launch MCP servers through bash proxy scripts that resolve credentials (env, Keychain, legacy .env), why they start disabled, the pinned mcp-remote and Documenso SDK versions and token-exposure trade-offs, plus the Context7 and n8n-docs servers configured elsewhere.
