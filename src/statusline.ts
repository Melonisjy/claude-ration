import { loadConfig } from './config.js'
import { saveState } from './state.js'
import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'

interface Credentials {
  accessToken?: string
  access_token?: string
  expiresAt?: number
}

interface UsageData {
  daily_percentage?: number
  weekly_percentage?: number
  reset_in_seconds?: number
  // 혹시 다른 구조일 경우 대비
  [key: string]: unknown
}

function readOAuthToken(): string | null {
  try {
    const credPath = join(homedir(), '.claude', '.credentials.json')
    if (!existsSync(credPath)) return null
    const creds = JSON.parse(readFileSync(credPath, 'utf-8'))
    return creds?.claudeAiOauth?.accessToken ?? null
  } catch {
    return null
  }
}

async function fetchUsage(token: string): Promise<{ dailyPct: number; weeklyPct: number; resetSecs: number } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000) // 3초 타임아웃

    const res = await fetch('https://api.anthropic.com/api/oauth/usage', {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'User-Agent': 'claude-code/2.1.193',
        'Content-Type': 'application/json',
      },
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json() as Record<string, unknown>

    const fiveHour = data.five_hour as { utilization?: number; resets_at?: string } | null
    const sevenDay = data.seven_day as { utilization?: number; resets_at?: string } | null

    const dailyPct  = fiveHour?.utilization ?? 0
    const weeklyPct = sevenDay?.utilization ?? 0
    const resetsAt  = fiveHour?.resets_at ?? null
    const resetSecs = resetsAt
      ? Math.max(0, Math.floor((new Date(resetsAt).getTime() - Date.now()) / 1000))
      : 0

    return { dailyPct, weeklyPct, resetSecs }
  } catch {
    return null
  }
}

function bar(pct: number, width = 10): string {
  const filled = Math.round((pct / 100) * width)
  const block = '\u2588'  // █
  const empty = '\u2591'  // ░
  return block.repeat(filled) + empty.repeat(width - filled)
}

function colorize(text: string, pct: number, warnAt: number, stopAt: number): string {
  if (pct >= stopAt)  return `\x1b[31m${text}\x1b[0m`
  if (pct >= warnAt)  return `\x1b[33m${text}\x1b[0m`
  return `\x1b[32m${text}\x1b[0m`
}

function formatReset(seconds: number): string {
  if (!seconds || seconds <= 0) return 'soon'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

async function main() {
  // stdin은 타임아웃 걸고 읽기
  let raw = ''
  try {
    const stdinPromise = (async () => {
      for await (const chunk of process.stdin) raw += chunk
    })()
    await Promise.race([
      stdinPromise,
      new Promise(resolve => setTimeout(resolve, 500))
    ])
  } catch { }

  const config = loadConfig()
  const token = readOAuthToken()

  let dailyPct = 0
  let weeklyPct = 0
  let resetSecs = 0

  if (token) {
    const usage = await fetchUsage(token)
    if (usage) {
      dailyPct  = usage.dailyPct
      weeklyPct = usage.weeklyPct
      resetSecs = usage.resetSecs
    }
  }

  saveState({
    daily_pct: dailyPct,
    weekly_pct: weeklyPct,
    reset_in_seconds: resetSecs,
    override_until: null,
    updated_at: new Date().toISOString(),
  })

  const dailyStr  = colorize(
    `daily ${dailyPct.toFixed(0)}% ${bar(dailyPct)} /${config.daily.stop}%`,
    dailyPct, config.daily.warn, config.daily.stop
  )
  const weeklyStr = colorize(
    `weekly ${weeklyPct.toFixed(0)}% ${bar(weeklyPct)} /${config.weekly.stop}%`,
    weeklyPct, config.weekly.warn, config.weekly.stop
  )

  process.stdout.write(`${dailyStr}  ${weeklyStr}  reset ${formatReset(resetSecs)}`)
}

export { main }