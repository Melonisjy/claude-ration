import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface GuardianConfig {
  daily: { warn: number; stop: number }
  weekly: { warn: number; stop: number }
  graceful: boolean
}

const DEFAULT_CONFIG: GuardianConfig = {
  daily:  { warn: 60, stop: 70 },
  weekly: { warn: 70, stop: 80 },
  graceful: true,
}

export function getConfigDir(): string {
  return join(homedir(), '.claude', 'ration')
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json')
}

export function loadConfig(): GuardianConfig {
  const path = getConfigPath()
  if (!existsSync(path)) return DEFAULT_CONFIG
  try {
    const raw = readFileSync(path, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}

export function saveConfig(config: GuardianConfig): void {
  const dir = getConfigDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2))
}
