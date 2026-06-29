<div align="center">

# 🛡️ claude-ration

**Automatically stops Claude Code when it hits your custom usage threshold.**

[![npm version](https://img.shields.io/npm/v/claude-ration?color=black&style=flat-square)](https://npmjs.com/package/claude-ration)
[![npm downloads](https://img.shields.io/npm/dm/claude-ration?color=black&style=flat-square)](https://npmjs.com/package/claude-ration)
[![license](https://img.shields.io/npm/l/claude-ration?color=black&style=flat-square)](./LICENSE)

</div>

---

Claude Code keeps working until it hits 100% — then it dies mid-task.  
Files left half-edited. Session gone. Nothing you can do until the next reset.

**claude-ration** stops Claude at the threshold *you* set, gracefully, before it's too late.

```
Set daily limit to 70%, weekly to 80% → Claude wraps up and stops on its own.
```

## Demo

> *(demo GIF coming soon)*

**Status line** (always visible at the bottom of your terminal):

```
daily 5% ██░░░░░░░░ /70%  weekly 13% █░░░░░░░░░ /80%  reset 1h 42m
```

**When a new prompt is submitted over the limit:**

```
🛡️  claude-ration: daily usage 71% — limit (70%) exceeded
Cannot start new task. Reset in 82 minutes.
To override: claude-ration override
```

**When the limit is hit mid-task:**

```
[claude-ration] Daily limit 70% reached (current: 71%).
Please wrap up the current task and stop. New tool calls are now blocked.
```

## Why this exists

Every existing tool only *shows* usage. None of them *stop* anything.

| Tool | Shows usage | Blocks work | Custom limit |
|---|:---:|:---:|:---:|
| claude-hud | ✅ | ❌ | ❌ |
| ccstatusline | ✅ | ❌ | ❌ |
| **claude-ration** | ✅ | **✅** | **✅** |

## Install

```bash
npx claude-ration install
```

Restart Claude Code. That's it.

## How it works

claude-ration hooks into three Claude Code lifecycle events:

```
StatusLine        → fetches live usage from Anthropic's OAuth API, displays it, saves state
UserPromptSubmit  → blocks new tasks when over the limit
PreToolUse        → blocks tool calls mid-task when the limit is hit
```

**Graceful stop** (default): tells Claude to finish what it's doing, then stop.  
**Hard stop**: kills the next tool call immediately.

Reads your existing Claude Code credentials — no separate login, no API key needed.

## Configure

```bash
# View current config
claude-ration config

# Change thresholds
claude-ration config set daily.stop 75
claude-ration config set weekly.stop 85

# Temporarily disable limits (default: 60 min)
claude-ration override
claude-ration override 30
```

Or edit `~/.claude/ration/config.json` directly:

```json
{
  "daily":  { "warn": 60, "stop": 70 },
  "weekly": { "warn": 70, "stop": 80 },
  "graceful": true
}
```

| Key | Default | Description |
|---|---|---|
| `daily.warn` | 60 | Yellow warning threshold (daily %) |
| `daily.stop` | 70 | Hard stop threshold (daily %) |
| `weekly.warn` | 70 | Yellow warning threshold (weekly %) |
| `weekly.stop` | 80 | Hard stop threshold (weekly %) |
| `graceful` | `true` | `true` = finish current task first, `false` = stop immediately |

## Uninstall

```bash
npx claude-ration uninstall
```

## License

MIT