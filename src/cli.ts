import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { loadConfig, saveConfig, getConfigDir } from './config.js'
import { loadState, saveState } from './state.js'

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.local.json')

const GUARDIAN_HOOKS = {
  statusLine: {
    type: 'command',
    command: 'npx -y claude-ration@latest statusline',
  },
  hooks: {
    UserPromptSubmit: [{
      hooks: [{
        type: 'command',
        command: 'npx -y claude-ration@latest hook-prompt',
      }],
    }],
    PreToolUse: [{
      hooks: [{
        type: 'command',
        command: 'npx -y claude-ration@latest hook-tool',
      }],
    }],
  },
}

function readSettings(): Record<string, unknown> {
  if (!existsSync(SETTINGS_PATH)) return {}
  try { return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8')) } catch { return {} }
}

function writeSettings(settings: Record<string, unknown>): void {
  const dir = join(homedir(), '.claude')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

function cmdInstall() {
  const settings = readSettings()
  const merged = {
    ...settings,
    statusLine: GUARDIAN_HOOKS.statusLine,
    hooks: {
      ...(settings.hooks as object ?? {}),
      ...GUARDIAN_HOOKS.hooks,
    },
  }
  writeSettings(merged)
  console.log('✅ claude-ration installed!')
  console.log(`📁 Config file: ${SETTINGS_PATH}`)
  console.log('🔄 Restart Claude Code to apply.\n')
  console.log('Current config:')
  const config = loadConfig()
  console.log(`  Daily  — warn: ${config.daily.warn}% / stop: ${config.daily.stop}%`)
  console.log(`  Weekly — warn: ${config.weekly.warn}% / stop: ${config.weekly.stop}%`)
  console.log(`  Mode: ${config.graceful ? 'graceful' : 'hard stop'}`)
}

function cmdUninstall() {
  const settings = readSettings()
  delete settings['statusLine']
  if (settings.hooks && typeof settings.hooks === 'object') {
    const hooks = settings.hooks as Record<string, unknown>
    delete hooks['UserPromptSubmit']
    delete hooks['PreToolUse']
    if (Object.keys(hooks).length === 0) delete settings['hooks']
  }
  writeSettings(settings)
  console.log('✅ claude-ration uninstalled.')
}

function cmdStatus() {
  const state  = loadState()
  const config = loadConfig()
  console.log('\n🛡️  claude-ration status\n')
  console.log(`  Daily:  ${state.daily_pct.toFixed(1)}%  (warn ${config.daily.warn}% / stop ${config.daily.stop}%)`)
  console.log(`  Weekly: ${state.weekly_pct.toFixed(1)}%  (warn ${config.weekly.warn}% / stop ${config.weekly.stop}%)`)
  if (state.reset_in_seconds > 0) {
    const h = Math.floor(state.reset_in_seconds / 3600)
    const m = Math.floor((state.reset_in_seconds % 3600) / 60)
    console.log(`  Resets in: ${h}h ${m}m`)
  }
  console.log()
}

function cmdConfig(args: string[]) {
  const config = loadConfig()
  if (args.length === 0) {
    console.log(JSON.stringify(config, null, 2))
    return
  }
  if (args[0] === 'set' && args[1] && args[2]) {
    const [section, key] = args[1].split('.')
    const value = Number(args[2])
    if (isNaN(value) || value < 0 || value > 100) {
      console.error('Value must be a number between 0 and 100.')
      process.exit(1)
    }
    const cfg = config as unknown as Record<string, Record<string, number | boolean>>
    if (cfg[section] && key in cfg[section]) {
      (cfg[section][key] as number) = value
      saveConfig(config)
      console.log(`✅ ${args[1]} = ${value}`)
    } else {
      console.error(`Unknown config key: ${args[1]}`)
      process.exit(1)
    }
  }
}

function cmdOverride(args: string[]) {
  const state = loadState()
  const minutes = args[0] ? parseInt(args[0]) : 60
  const until = new Date(Date.now() + minutes * 60 * 1000).toISOString()
  saveState({ ...state, override_until: until })
  console.log(`✅ Limits disabled for ${minutes} minutes.`)
}

function printHelp() {
  console.log(`
🛡️  claude-ration v0.1.0

Usage:
  claude-ration install                Install (registers hooks in settings.local.json)
  claude-ration uninstall              Remove
  claude-ration status                 Show current usage
  claude-ration config                 Show current config
  claude-ration config set <key> <val> Update a config value
  claude-ration override [minutes]     Disable limits temporarily (default: 60 min)

Config keys:
  daily.warn    Daily warning threshold  (default: 60)
  daily.stop    Daily stop threshold     (default: 70)
  weekly.warn   Weekly warning threshold (default: 70)
  weekly.stop   Weekly stop threshold    (default: 80)
`)
}