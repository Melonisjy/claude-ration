import { loadConfig } from './config.js'
import { loadState, saveState } from './state.js'
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
  // fallback in case the API returns a different shape
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
    const timeout = setTimeout(() => controller.abort(), 3000) // 3s timeout

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
  const clamped = Math.max(0, Math.min(100, pct))
  const filled = Math.round((clamped / 100) * width)
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

function render(config: ReturnType<typeof loadConfig>, dailyPct: number, weeklyPct: number, resetSecs: number): string {
  const dailyStr = colorize(
    `daily ${dailyPct.toFixed(0)}% ${bar(dailyPct)} /${config.daily.stop}%`,
    dailyPct, config.daily.warn, config.daily.stop
  )
  const weeklyStr = colorize(
    `weekly ${weeklyPct.toFixed(0)}% ${bar(weeklyPct)} /${config.weekly.stop}%`,
    weeklyPct, config.weekly.warn, config.weekly.stop
  )
  return `${dailyStr}  ${weeklyStr}  reset ${formatReset(resetSecs)}\n`
}

async function main() {
  const config = loadConfig()
  const cached = loadState()

  // 1. render immediately from cache — doesn't wait on the network, so it always renders even if killed
  process.stdout.write(render(config, cached.daily_pct, cached.weekly_pct, cached.reset_in_seconds))

  // 2. fetch in the background and update state for the next render (output is already done)
  // ponytail: only updates while the process is alive. If Claude Code kills it mid-fetch, that round is
  // just skipped and the next invocation catches up — no separate daemon needed
  const token = readOAuthToken()
  if (!token) return
  const usage = await fetchUsage(token)
  if (!usage) return
  saveState({
    daily_pct: usage.dailyPct,
    weekly_pct: usage.weeklyPct,
    reset_in_seconds: usage.resetSecs,
    override_until: cached.override_until,  // preserve override
    updated_at: new Date().toISOString(),
  })
}

export { main }