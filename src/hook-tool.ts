import { loadConfig } from './config.js'
import { loadState, isOverrideActive } from './state.js'

// PreToolUse Hook — 작업 중 툴 호출마다 차단
async function main() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk

  const config = loadConfig()
  const state  = loadState()

  if (isOverrideActive(state)) process.exit(0)

  const dailyBlocked  = state.daily_pct  >= config.daily.stop
  const weeklyBlocked = state.weekly_pct >= config.weekly.stop

  if (!dailyBlocked && !weeklyBlocked) process.exit(0)

  const reason = dailyBlocked
    ? `일간 한도 ${config.daily.stop}% 도달 (현재 ${state.daily_pct.toFixed(0)}%)`
    : `주간 한도 ${config.weekly.stop}% 도달 (현재 ${state.weekly_pct.toFixed(0)}%)`

  if (config.graceful) {
    // graceful: Claude에게 마무리 요청 후 중단
    const output = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `[claude-ration] ${reason}. ` +
          `현재 작업을 마무리하고 중단해주세요. 새로운 툴 호출은 차단됩니다.`,
      },
    }
    process.stdout.write(JSON.stringify(output))
  } else {
    // hard stop: 즉시 강제 종료
    const output = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `[claude-ration] ${reason}. 즉시 중단.`,
      },
    }
    process.stdout.write(JSON.stringify(output))
  }

  process.exit(0)
}

export { main }
