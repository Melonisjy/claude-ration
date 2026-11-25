# Changelog

## 0.2.0

### ⚠️ Upgrade required

Hooks now call the globally installed `claude-ration` binary instead of `npx -y claude-ration@latest`. After upgrading, re-run install once:

```bash
npm install -g claude-ration
claude-ration install
```

This replaces the old `npx` hook entries. Running `npx claude-ration install` is now refused.

### Fixed

- `install` no longer overwrites your existing `UserPromptSubmit` / `PreToolUse` hooks, `statusLine`, or MCP servers. Hooks are appended; an existing non-claude-ration status line is left alone (with a warning).
- `uninstall` removes only claude-ration's own entries (previously it deleted all `mcpServers`, the status line, and every `UserPromptSubmit` / `PreToolUse` hook). It also cleans the project settings and slash command files.
- Graceful mode's "one more tool call" grace was reset on every status line refresh. A fresh `override` could also be lost.
- macOS: the OAuth token is now read from the Keychain, so usage is no longer stuck at 0%.

### Changed

- Hooks no longer hit the npm registry on every tool call.
- README rewritten to match actual commands, config file and defaults (all languages).
