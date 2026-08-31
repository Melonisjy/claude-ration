import { loadConfig } from './config.js'
import { loadState, saveState, isOverrideActive } from './state.js'

// PreToolUse Hook — blocks on every tool call while over the limit
async function main() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk

  const config = loadConfig()
  const state  = loadState()

  if (isOverrideActive(state)) process.exit(0)

  const dailyBlocked  = state.daily_pct  >= config.daily.stop
  const weeklyBlocked = state.weekly_pct >= config.weekly.stop

  if (!dailyBlocked && !weeklyBlocked) {
    // back under the limit — reset the grace flag so the next time it's exceeded gets a fresh grace call
    if (state.graceful_grace_used) saveState({ ...state, graceful_grace_used: false })
    process.exit(0)
  }

  const reason = dailyBlocked
    ? `Daily limit ${config.daily.stop}% reached (currently ${state.daily_pct.toFixed(0)}%)`
    : `Weekly limit ${config.weekly.stop}% reached (currently ${state.weekly_pct.toFixed(0)}%)`

  if (config.graceful && !state.graceful_grace_used) {
    // graceful: let this one call through so Claude can wrap up, then block from the next call on
    saveState({ ...state, graceful_grace_used: true })
    process.stderr.write(
      `\n[claude-ration] ${reason}. This tool call is allowed. ` +
      `Please wrap up what you're doing — the next tool call will be blocked.\n`
    )
    process.exit(0)
  }

  // hard stop, or the graceful grace call was already used: block immediately
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: config.graceful
        ? `[claude-ration] ${reason}. Grace call already used. Stopping.`
        : `[claude-ration] ${reason}. Stopping immediately.`,
    },
  }
  process.stdout.write(JSON.stringify(output))
  process.exit(0)
}

export { main }
