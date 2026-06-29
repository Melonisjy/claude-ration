import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { getConfigDir } from './config.js'

export interface GuardianState {
  daily_pct: number
  weekly_pct: number
  reset_in_seconds: number
  override_until: string | null
  updated_at: string
}

const EMPTY_STATE: GuardianState = {
  daily_pct: 0,
  weekly_pct: 0,
  reset_in_seconds: 0,
  override_until: null,
  updated_at: new Date().toISOString(),
}

function getStatePath(): string {
  return join(getConfigDir(), 'state.json')
}

export function loadState(): GuardianState {
  const path = getStatePath()
  if (!existsSync(path)) return EMPTY_STATE
  try {
    return { ...EMPTY_STATE, ...JSON.parse(readFileSync(path, 'utf-8')) }
  } catch {
    return EMPTY_STATE
  }
}

export function saveState(state: GuardianState): void {
  const dir = getConfigDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(getStatePath(), JSON.stringify(state, null, 2))
}

export function isOverrideActive(state: GuardianState): boolean {
  if (!state.override_until) return false
  return new Date(state.override_until) > new Date()
}
