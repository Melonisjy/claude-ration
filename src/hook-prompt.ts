import { loadConfig } from './config.js'
import { loadState, isOverrideActive } from './state.js'

// UserPromptSubmit Hook — blocks before a new task starts
async function main() {
  const config = loadConfig()
  const state  = loadState()

  // pass through while an override is active
  if (isOverrideActive(state)) process.exit(0)

  const dailyBlocked  = state.daily_pct  >= config.daily.stop
  const weeklyBlocked = state.weekly_pct >= config.weekly.stop

  if (!dailyBlocked && !weeklyBlocked) process.exit(0)

  const reason = dailyBlocked
    ? `Daily usage ${state.daily_pct.toFixed(0)}% — over limit (${config.daily.stop}%)`
    : `Weekly usage ${state.weekly_pct.toFixed(0)}% — over limit (${config.weekly.stop}%)`

  const resetMsg = state.reset_in_seconds > 0
    ? `Resets in ${Math.ceil(state.reset_in_seconds / 60)} minutes.`
    : 'Resets soon.'

  // print the block message to Claude Code
  process.stderr.write(
    `\n🛡️  claude-ration: ${reason}\n` +
    `Cannot start a new task. ${resetMsg}\n` +
    `To lift the limit: claude-ration override\n\n`
  )

  // exit 2 = UserPromptSubmit block signal
  process.exit(2)
}

export { main }
