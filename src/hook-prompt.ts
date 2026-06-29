import { loadConfig } from './config.js'
import { loadState, isOverrideActive } from './state.js'

// UserPromptSubmit Hook — 새 작업 시작 전 차단
async function main() {
  const config = loadConfig()
  const state  = loadState()

  // override 활성 중이면 통과
  if (isOverrideActive(state)) process.exit(0)

  const dailyBlocked  = state.daily_pct  >= config.daily.stop
  const weeklyBlocked = state.weekly_pct >= config.weekly.stop

  if (!dailyBlocked && !weeklyBlocked) process.exit(0)

  const reason = dailyBlocked
    ? `일간 사용량 ${state.daily_pct.toFixed(0)}% — 한도(${config.daily.stop}%) 초과`
    : `주간 사용량 ${state.weekly_pct.toFixed(0)}% — 한도(${config.weekly.stop}%) 초과`

  const resetMsg = state.reset_in_seconds > 0
    ? `리셋까지 ${Math.ceil(state.reset_in_seconds / 60)}분 남았습니다.`
    : '곧 리셋됩니다.'

  // Claude Code에 차단 메시지 출력
  process.stderr.write(
    `\n🛡️  claude-guardian: ${reason}\n` +
    `새 작업을 시작할 수 없습니다. ${resetMsg}\n` +
    `한도를 해제하려면: claude-guardian override\n\n`
  )

  // exit 2 = UserPromptSubmit 차단 신호
  process.exit(2)
}

export { main }
