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
  console.log('✅ claude-ration 설치 완료!')
  console.log(`📁 설정 파일: ${SETTINGS_PATH}`)
  console.log('🔄 Claude Code를 재시작하면 적용됩니다.\n')
  console.log('현재 설정:')
  const config = loadConfig()
  console.log(`  일간 경고: ${config.daily.warn}% / 차단: ${config.daily.stop}%`)
  console.log(`  주간 경고: ${config.weekly.warn}% / 차단: ${config.weekly.stop}%`)
  console.log(`  중단 방식: ${config.graceful ? 'graceful' : 'hard stop'}`)
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
  console.log('✅ claude-ration 제거 완료.')
}

function cmdStatus() {
  const state  = loadState()
  const config = loadConfig()
  console.log('\n🛡️  claude-ration 상태\n')
  console.log(`  일간: ${state.daily_pct.toFixed(1)}%  (경고 ${config.daily.warn}% / 차단 ${config.daily.stop}%)`)
  console.log(`  주간: ${state.weekly_pct.toFixed(1)}%  (경고 ${config.weekly.warn}% / 차단 ${config.weekly.stop}%)`)
  if (state.reset_in_seconds > 0) {
    const h = Math.floor(state.reset_in_seconds / 3600)
    const m = Math.floor((state.reset_in_seconds % 3600) / 60)
    console.log(`  리셋: ${h}h ${m}m 후`)
  }
  console.log()
}

function cmdConfig(args: string[]) {
  const config = loadConfig()

  if (args.length === 0) {
    console.log(JSON.stringify(config, null, 2))
    return
  }

  // claude-ration config set daily.stop 75
  if (args[0] === 'set' && args[1] && args[2]) {
    const [section, key] = args[1].split('.')
    const value = Number(args[2])
    if (isNaN(value) || value < 0 || value > 100) {
      console.error('값은 0~100 사이 숫자여야 합니다.')
      process.exit(1)
    }
    const cfg = config as Record<string, Record<string, number | boolean>>
    if (cfg[section] && key in cfg[section]) {
      (cfg[section][key] as number) = value
      saveConfig(config)
      console.log(`✅ ${args[1]} = ${value}`)
    } else {
      console.error(`알 수 없는 설정 키: ${args[1]}`)
      process.exit(1)
    }
  }
}

function cmdOverride(args: string[]) {
  const state = loadState()
  const minutes = args[0] ? parseInt(args[0]) : 60
  const until = new Date(Date.now() + minutes * 60 * 1000).toISOString()
  saveState({ ...state, override_until: until })
  console.log(`✅ ${minutes}분간 한도 제한 해제됨.`)
}

function printHelp() {
  console.log(`
🛡️  claude-ration v0.1.0

사용법:
  claude-ration install              설치 (settings.local.json에 등록)
  claude-ration uninstall            제거
  claude-ration status               현재 사용량 확인
  claude-ration config               현재 설정 확인
  claude-ration config set <키> <값>  설정 변경
  claude-ration override [분]        지정 시간(기본 60분)간 한도 해제

설정 키:
  daily.warn    일간 경고 임계값 (기본: 60)
  daily.stop    일간 차단 임계값 (기본: 70)
  weekly.warn   주간 경고 임계값 (기본: 70)
  weekly.stop   주간 차단 임계값 (기본: 80)
`)
}

const [,, cmd, ...args] = process.argv

switch (cmd) {
  case 'install':   cmdInstall(); break
  case 'uninstall': cmdUninstall(); break
  case 'status':    cmdStatus(); break
  case 'config':    cmdConfig(args); break
  case 'override':  cmdOverride(args); break
  default:          printHelp()
}
