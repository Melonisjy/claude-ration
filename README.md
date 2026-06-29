<div align="center">

# 🛡️ claude-ration

**Automatically stops Claude Code when it hits your custom usage threshold.**

[![npm version](https://img.shields.io/npm/v/claude-ration?color=black&style=flat-square)](https://npmjs.com/package/claude-ration)
[![npm downloads](https://img.shields.io/npm/dm/claude-ration?color=black&style=flat-square)](https://npmjs.com/package/claude-ration)
[![license](https://img.shields.io/npm/l/claude-ration?color=black&style=flat-square)](./LICENSE)

</div>

---

If you're on **Claude Pro**, you know this feeling:

You kick off a big refactor. Claude's deep into it. Then — silence.  
Usage hit 100%. Session dead. Files half-edited. Nothing you can do for hours.

**claude-ration** stops Claude at *your* threshold — 70%, 80%, whatever — so it wraps up cleanly before the wall hits.

```
Set daily limit to 70% → Claude finishes what it's doing, then stops on its own.
```

## Demo

> *(demo GIF coming soon)*

**Status line** (always visible at the bottom of your terminal):

```
daily 5% ██░░░░░░░░ /70%  weekly 13% █░░░░░░░░░ /80%  reset 1h 42m
```

**When you try to start a new task over the limit:**

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

**Slash commands** (built into Claude Code):

```
/ration-status     → show current usage + limits
/ration-set daily.stop 75  → update threshold
/ration-override 30        → disable limits for 30 min
```

## Who this is for

**Claude Pro users.** The 5-hour usage window resets every 5 hours — and on Pro, it's easy to burn through it mid-task without realizing it.

This tool lets you reserve a buffer. Set your stop at 70% and you'll always have headroom left for follow-up questions, quick fixes, or emergencies — instead of hitting a wall at the worst moment.

> *On Claude Max? You probably hit limits less often, but claude-ration still works if you want tighter control.*

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

> **Note:** Run this from each project directory where you use Claude Code.  
> Claude Code loads the nearest `.claude/settings.local.json` first, so the install command updates both your home directory and the current project automatically.

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

Or use slash commands directly in Claude Code:

```
/ration-set daily.stop 75
/ration-override 30
/ration-status
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