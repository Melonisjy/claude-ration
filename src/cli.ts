import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
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

const HOOKS = {
  statusLine: {
    type: 'command',
    command: 'npx -y claude-ration@latest statusline',
  },
  hooks: {
    UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'npx -y claude-ration@latest hook-prompt' }] }],
    PreToolUse: [{ hooks: [{ type: 'command', command: 'npx -y claude-ration@latest hook-tool' }] }],
  },
}

function readJson(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {}
  try { return JSON.parse(readFileSync(path, 'utf-8')) } catch { return {} }
}

function writeJson(path: string, data: Record<string, unknown>): void {
  const dir = path.substring(0, path.lastIndexOf('/') === -1 ? path.lastIndexOf('\\') : path.lastIndexOf('/'))
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2))
}

function applySettings(path: string): void {
  const s = readJson(path)
  writeJson(path, {
    ...s,
    statusLine: HOOKS.statusLine,
    hooks: { ...(s.hooks as object ?? {}), ...HOOKS.hooks },
    mcpServers: {
      ...(s.mcpServers as object ?? {}),
      'claude-ration': {
        type: 'stdio',
        command: 'npx',
        args: ['-y', 'claude-ration@latest', 'mcp'],
      }
    }
  })
}

function cmdInstall() {
  // 1. 홈 디렉토리
  applySettings(HOME_SETTINGS_PATH)
  console.log('Installed to: ' + HOME_SETTINGS_PATH)

  // 2. 현재 프로젝트 .claude/settings.local.json
  const projectSettingsDir = join(process.cwd(), '.claude')
  const projectSettingsPath = join(projectSettingsDir, 'settings.local.json')
  if (existsSync(projectSettingsDir)) {
    const s = readJson(projectSettingsPath)
    writeJson(projectSettingsPath, {
      ...s,
      statusLine: HOOKS.statusLine,
      hooks: { ...(s.hooks as object ?? {}), ...HOOKS.hooks },
    })
    console.log('Installed to: ' + projectSettingsPath)
  }

  // 3. slash commands 등록
  const commandsDir = join(homedir(), '.claude', 'commands')
  if (!existsSync(commandsDir)) mkdirSync(commandsDir, { recursive: true })

  writeFileSync(join(commandsDir, 'ration-status.md'), `---
description: Show claude-ration usage and current limits
allowed-tools: Bash(npx *)
---
Run this and show the output:
!\`npx -y claude-ration@latest status\`
`)

  writeFileSync(join(commandsDir, 'ration-set.md'), `---
description: Set claude-ration limit (e.g. /ration-set daily.stop 75)
argument-hint: <daily.stop|daily.warn|weekly.stop|weekly.warn> <0-100>
allowed-tools: Bash(npx *)
---
Run this and show the result:
!\`npx -y claude-ration@latest config set $ARGUMENTS\`
`)

  writeFileSync(join(commandsDir, 'ration-override.md'), `---
description: Temporarily disable claude-ration limits (e.g. /ration-override 30)
argument-hint: [minutes]
allowed-tools: Bash(npx *)
---
Run this and show the result:
!\`npx -y claude-ration@latest override $ARGUMENTS\`
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
  const s = readJson(HOME_SETTINGS_PATH)
  delete s['statusLine']
  delete s['mcpServers']
  if (s.hooks && typeof s.hooks === 'object') {
    const h = s.hooks as Record<string, unknown>
    delete h['UserPromptSubmit']
    delete h['PreToolUse']
    if (Object.keys(h).length === 0) delete s['hooks']
  }
  writeJson(HOME_SETTINGS_PATH, s)
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