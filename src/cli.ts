import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { addOurs, removeOurs } from './settings.js'
import { loadConfig, saveConfig } from './config.js'
import { loadState, saveState } from './state.js'
import { main as statuslineMain } from './statusline.js'
import { main as hookPromptMain } from './hook-prompt.js'
import { main as hookToolMain } from './hook-tool.js'
import { main as mcpMain } from './mcp.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const HOME_SETTINGS_PATH = join(homedir(), '.claude', 'settings.local.json')

// ponytail: calls the globally installed binary — `npx -y claude-ration@latest` hit the npm registry on every tool call
const BIN = 'claude-ration'

const OURS = {
  statusLine: { type: 'command', command: BIN + ' statusline' },
  hooks: {
    UserPromptSubmit: [{ hooks: [{ type: 'command', command: BIN + ' hook-prompt' }] }],
    PreToolUse: [{ hooks: [{ type: 'command', command: BIN + ' hook-tool' }] }],
  },
}

function readJson(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {}
  try { return JSON.parse(readFileSync(path, 'utf-8')) } catch { return {} }
}

function writeJson(path: string, data: Record<string, unknown>): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2))
}

function projectSettingsPath(): string | null {
  const dir = join(process.cwd(), '.claude')
  return existsSync(dir) ? join(dir, 'settings.local.json') : null
}

function install(path: string, ours: Parameters<typeof addOurs>[1]): void {
  const { settings, statusLineSkipped } = addOurs(readJson(path), ours)
  writeJson(path, settings)
  console.log('Installed to: ' + path)
  if (statusLineSkipped) {
    console.log('  ! statusLine already set by another tool — left untouched.')
    console.log('    claude-ration reads usage from its statusline, so limits will NOT update until you')
    console.log('    set "statusLine": { "type": "command", "command": "claude-ration statusline" } yourself.')
  }
}

function cmdInstall() {
  // hooks call `claude-ration` directly, so it must be on PATH (npx runs from a throwaway cache)
  if (/[\\/]_npx[\\/]/.test(process.argv[1] ?? '')) {
    console.error('Install globally first:  npm install -g claude-ration  &&  claude-ration install')
    process.exit(1)
  }

  // 1. home directory
  install(HOME_SETTINGS_PATH, {
    ...OURS,
    mcpServers: { 'claude-ration': { type: 'stdio', command: BIN, args: ['mcp'] } },
  })

  // 2. current project's .claude/settings.local.json
  const projectPath = projectSettingsPath()
  if (projectPath) install(projectPath, OURS)

  // 3. register slash commands
  const commandsDir = join(homedir(), '.claude', 'commands')
  mkdirSync(commandsDir, { recursive: true })

  writeFileSync(join(commandsDir, 'ration-status.md'), `---
description: Show claude-ration usage and current limits
allowed-tools: Bash(claude-ration *)
---
Run this and show the output:
!\`claude-ration status\`
`)

  writeFileSync(join(commandsDir, 'ration-set.md'), `---
description: Set claude-ration limit (e.g. /ration-set daily.stop 75)
argument-hint: <daily.stop|daily.warn|weekly.stop|weekly.warn> <0-100>
allowed-tools: Bash(claude-ration *)
---
Run this and show the result:
!\`claude-ration config set $ARGUMENTS\`
`)

  writeFileSync(join(commandsDir, 'ration-override.md'), `---
description: Temporarily disable claude-ration limits (e.g. /ration-override 30)
argument-hint: [minutes]
allowed-tools: Bash(claude-ration *)
---
Run this and show the result:
!\`claude-ration override $ARGUMENTS\`
`)

  const config = loadConfig()
  console.log('\nclaude-ration installed!')
  console.log('Restart Claude Code to apply.\n')
  console.log('Current config:')
  console.log('  Daily  - warn: ' + config.daily.warn + '% / stop: ' + config.daily.stop + '%')
  console.log('  Weekly - warn: ' + config.weekly.warn + '% / stop: ' + config.weekly.stop + '%')
  console.log('  Mode: ' + (config.graceful ? 'graceful' : 'hard stop'))
  console.log('\nSlash commands registered: /ration-status, /ration-set, /ration-override')
}

function cmdUninstall() {
  // removes only claude-ration's own entries; other hooks / statusLine / MCP servers are kept
  for (const path of [HOME_SETTINGS_PATH, projectSettingsPath()]) {
    if (!path || !existsSync(path)) continue
    writeJson(path, removeOurs(readJson(path)))
    console.log('Cleaned: ' + path)
  }
  for (const f of ['ration-status.md', 'ration-set.md', 'ration-override.md']) {
    rmSync(join(homedir(), '.claude', 'commands', f), { force: true })
  }
  console.log('claude-ration uninstalled.')
}

function cmdStatus() {
  const state = loadState()
  const config = loadConfig()
  console.log('\nclaude-ration status\n')
  console.log('  Daily:  ' + state.daily_pct.toFixed(1) + '%  (warn ' + config.daily.warn + '% / stop ' + config.daily.stop + '%)')
  console.log('  Weekly: ' + state.weekly_pct.toFixed(1) + '%  (warn ' + config.weekly.warn + '% / stop ' + config.weekly.stop + '%)')
  if (state.reset_in_seconds > 0) {
    const h = Math.floor(state.reset_in_seconds / 3600)
    const m = Math.floor((state.reset_in_seconds % 3600) / 60)
    console.log('  Resets in: ' + h + 'h ' + m + 'm')
  }
  console.log()
}

function cmdConfig(args: string[]) {
  const config = loadConfig()
  if (args.length === 0) { console.log(JSON.stringify(config, null, 2)); return }
  if (args[0] === 'set' && args[1] && args[2]) {
    const [section, key] = args[1].split('.')
    const value = Number(args[2])
    if (isNaN(value) || value < 0 || value > 100) { console.error('Value must be 0-100.'); process.exit(1) }
    const cfg = config as unknown as Record<string, Record<string, number | boolean>>
    if (cfg[section] && key in cfg[section]) {
      (cfg[section][key] as number) = value
      saveConfig(config)
      console.log(args[1] + ' = ' + value)
    } else { console.error('Unknown key: ' + args[1]); process.exit(1) }
  }
}

function cmdOverride(args: string[]) {
  const state = loadState()
  const minutes = args[0] ? parseInt(args[0]) : 60
  saveState({ ...state, override_until: new Date(Date.now() + minutes * 60 * 1000).toISOString() })
  console.log('Limits disabled for ' + minutes + ' minutes.')
}

function printHelp() {
  console.log('\nclaude-ration v' + pkg.version + '\n')
  console.log('Usage:')
  console.log('  claude-ration install                Install')
  console.log('  claude-ration uninstall              Remove')
  console.log('  claude-ration status                 Show current usage')
  console.log('  claude-ration config                 Show config')
  console.log('  claude-ration config set <key> <val> Update config')
  console.log('  claude-ration override [minutes]     Disable limits temporarily\n')
  console.log('Config keys:')
  console.log('  daily.warn    Daily warning threshold  (default: 60)')
  console.log('  daily.stop    Daily stop threshold     (default: 70)')
  console.log('  weekly.warn   Weekly warning threshold (default: 70)')
  console.log('  weekly.stop   Weekly stop threshold    (default: 80)')
}

const [,, cmd, ...args] = process.argv
switch (cmd) {
  case 'install':    cmdInstall(); break
  case 'uninstall':  cmdUninstall(); break
  case 'status':     cmdStatus(); break
  case 'config':     cmdConfig(args); break
  case 'override':   cmdOverride(args); break
  case 'statusline': statuslineMain(); break
  case 'hook-prompt': hookPromptMain(); break
  case 'hook-tool':  hookToolMain(); break
  case 'mcp': mcpMain(); break
  default:           printHelp()
}