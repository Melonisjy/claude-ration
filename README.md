<div align="center">
  <h1>claude-ration</h1>
  <p>
    <strong>Never let Claude Code hit a rate limit mid-task again.</strong><br />
    Automatically wrap up and safely pause your Claude Code sessions when usage reaches your custom threshold.
  </p>
  <p>
    <a href="https://npmjs.com/package/claude-ration">
      <img src="https://img.shields.io/npm/v/claude-ration?color=black&style=flat-square" alt="npm version" />
    </a>
    <a href="https://npmjs.com/package/claude-ration">
      <img src="https://img.shields.io/npm/dm/claude-ration?color=black&style=flat-square" alt="npm downloads" />
    </a>
    <a href="./LICENSE">
      <img src="https://img.shields.io/npm/l/claude-ration?color=black&style=flat-square" alt="license" />
    </a>
  </p>
  <p>
    <strong>English</strong> | <a href="./README.ko.md">한국어</a> | <a href="./README.zh-CN.md">简体中文</a>
  </p>
</div>

---

## Why `claude-ration`?

Long Claude Code sessions are great — until you hit the 5-hour or weekly rate limit in the middle of a refactor and get cut off with a half-edited file.

`claude-ration` is a usage governor built on Claude Code hooks:
- **Stops before the wall:** once usage crosses your `stop` threshold, new prompts and tool calls are blocked.
- **Graceful mode:** the first tool call over the limit is still allowed so Claude can finish its current step; the next one is blocked.
- **Keeps a reserve:** stop at `70%` and the remaining quota stays available for urgent fixes (use `override` when you need it).
- **Live status line:** shows 5-hour and weekly usage with color-coded bars.

```
daily 42% ████░░░░░░ /70%  weekly 18% ██░░░░░░░░ /80%  reset 2h 13m
```

---

## Quick Start

```bash
npm install -g claude-ration
claude-ration install
```

Then restart Claude Code. That's it.

> A global install is required: the hooks call the `claude-ration` binary directly so they stay fast (no npm lookup on every tool call). `npx claude-ration install` is refused for that reason.

`install` adds to `~/.claude/settings.local.json` (and to `./.claude/settings.local.json` if the current project has a `.claude` folder):
- a `statusLine` — **only if you don't already have one** (see [Using another status line](#using-another-status-line))
- `UserPromptSubmit` and `PreToolUse` hooks — appended, your existing hooks are kept
- an MCP server and the slash commands `/ration-status`, `/ration-set`, `/ration-override`

To remove it, `claude-ration uninstall` deletes only claude-ration's own entries.

---

## Commands

| Command | Description |
| :--- | :--- |
| `claude-ration install` | Register hooks, status line and slash commands |
| `claude-ration uninstall` | Remove only claude-ration's entries |
| `claude-ration status` | Show current usage and thresholds |
| `claude-ration config` | Print current config |
| `claude-ration config set <key> <0-100>` | Change a threshold, e.g. `config set daily.stop 75` |
| `claude-ration override [minutes]` | Disable limits temporarily (default 60 min) |

Inside Claude Code: `/ration-status`, `/ration-set daily.stop 75`, `/ration-override 30`.

---

## Configuration

Stored in `~/.claude/ration/config.json` (created by `config set`):

```json
{
  "daily":  { "warn": 60, "stop": 70 },
  "weekly": { "warn": 70, "stop": 80 },
  "graceful": true
}
```

| Key | Default | Description |
| :--- | :--- | :--- |
| `daily.warn` | `60` | 5-hour window usage (%) at which the status line turns yellow |
| `daily.stop` | `70` | 5-hour window usage (%) at which prompts and tool calls are blocked |
| `weekly.warn` | `70` | Weekly usage (%) at which the status line turns yellow |
| `weekly.stop` | `80` | Weekly usage (%) at which prompts and tool calls are blocked |
| `graceful` | `true` | Allow one more tool call after the limit so Claude can wrap up. `false` = block immediately (edit the file to change) |

> `daily` refers to Claude's **5-hour** usage window, not a calendar day.

---

## How It Works

1. **Status line:** each time Claude Code refreshes the status line, `claude-ration` fetches your current 5-hour/weekly utilization and caches it in `~/.claude/ration/state.json`.
2. **`UserPromptSubmit` hook:** over the `stop` threshold → your new prompt is blocked with the reason and reset time.
3. **`PreToolUse` hook:** over the `stop` threshold → in graceful mode one tool call passes, after that every tool call is denied and Claude stops.
4. **Override:** `claude-ration override 30` lifts the limits for 30 minutes.

### Using another status line

Usage data is only refreshed by `claude-ration statusline`. If you already use another status line, `install` leaves it alone and warns you — but then the cached usage never updates and the limits won't trigger. Either switch to `"command": "claude-ration statusline"` or call it from your own status line script.

### Caveats

- Usage is read from the same endpoint Claude Code uses for `/usage`, which is not a public API and may change without notice.
- Credentials are read from `~/.claude/.credentials.json`, or from the Keychain on macOS. Only Claude subscription (OAuth) logins are supported; with an API key the usage stays at 0%.
- Once a limit is hit, slash commands may be blocked too — run `claude-ration override` from another terminal.

---

## Contributing

Contributions, issues, and feature requests are welcome!  
Feel free to check the issues page or submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit your Changes (`git commit -m 'Add some amazing feature'`)
4. Push to the Branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
