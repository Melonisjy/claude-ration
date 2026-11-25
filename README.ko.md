<div align="center">
  <h1>claude-ration</h1>
  <p>
    <strong>Claude Code 작업 도중 사용량 한도(Rate Limit)로 갑자기 끊기는 일을 방지하세요.</strong><br />
    설정한 임계값에 도달하면 진행 중인 작업을 깔끔하게 마무리하고 안전하게 멈춰주는 사용량 관리 도구입니다.
  </p>
  <p>
    <a href="https://npmjs.com/package/claude-ration">
      <img src="https://img.shields.io/npm/v/claude-ration?color=black&style=flat-square" alt="npm version" />
    </a>
    <a href="https://npmjs.com/package/claude-ration">
      <img src="https://img.shields.io/npm/dm/claude-ration?color=black&style=flat-square" alt="npm downloads" />
    </a>
    <a href="./LICENSE">
      <img src="https://img.shields.io/npm/l/claude-ration?color=black&style=flat-square" alt="license" />
    </a>
  </p>
  <p>
    <a href="./README.md">English</a> | <strong>한국어</strong> | <a href="./README.zh-CN.md">简体中文</a>
  </p>
</div>

---

## 왜 `claude-ration`이 필요한가요?

Claude Code로 긴 작업을 돌리다 보면, 리팩터링 도중 5시간 한도나 주간 한도에 걸려 파일이 반쯤 수정된 채로 끊기는 일이 생깁니다.

`claude-ration`은 Claude Code 훅 기반의 사용량 관리 도구입니다:
- **한도 전에 멈춤:** 사용량이 `stop` 임계값을 넘으면 새 프롬프트와 도구 호출을 막습니다.
- **Graceful 모드:** 한도를 넘은 뒤 첫 도구 호출 한 번은 허용해서 Claude가 현재 단계를 마무리하게 하고, 그다음 호출부터 막습니다.
- **여유분 확보:** `70%`에서 멈추면 나머지 사용량은 급한 수정용으로 남습니다 (필요할 때 `override`).
- **실시간 상태줄:** 5시간/주간 사용량을 색깔 막대로 보여줍니다.

```
daily 42% ████░░░░░░ /70%  weekly 18% ██░░░░░░░░ /80%  reset 2h 13m
```

---

## 빠른 시작 (Quick Start)

```bash
npm install -g claude-ration
claude-ration install
```

그다음 Claude Code를 재시작하면 끝입니다.

> 전역 설치가 필요합니다. 훅이 `claude-ration` 바이너리를 직접 호출해야 도구 호출마다 npm 조회가 생기지 않기 때문입니다. 그래서 `npx claude-ration install`은 거부됩니다.

`install`은 `~/.claude/settings.local.json`에 다음을 추가합니다 (현재 프로젝트에 `.claude` 폴더가 있으면 `./.claude/settings.local.json`에도):
- `statusLine` — **다른 상태줄이 없을 때만** ([다른 상태줄을 쓰는 경우](#다른-상태줄을-쓰는-경우) 참고)
- `UserPromptSubmit`, `PreToolUse` 훅 — 기존 훅 뒤에 추가되며, 기존 훅은 그대로 유지됩니다
- MCP 서버와 슬래시 명령 `/ration-status`, `/ration-set`, `/ration-override`

제거는 `claude-ration uninstall` — claude-ration이 추가한 항목만 지웁니다.

---

## 명령어

| 명령 | 설명 |
| :--- | :--- |
| `claude-ration install` | 훅, 상태줄, 슬래시 명령 등록 |
| `claude-ration uninstall` | claude-ration 항목만 제거 |
| `claude-ration status` | 현재 사용량과 임계값 표시 |
| `claude-ration config` | 현재 설정 출력 |
| `claude-ration config set <key> <0-100>` | 임계값 변경, 예: `config set daily.stop 75` |
| `claude-ration override [분]` | 일시적으로 제한 해제 (기본 60분) |

Claude Code 안에서는: `/ration-status`, `/ration-set daily.stop 75`, `/ration-override 30`.

---

## 설정 (Configuration)

`~/.claude/ration/config.json`에 저장됩니다 (`config set` 시 생성):

```json
{
  "daily":  { "warn": 60, "stop": 70 },
  "weekly": { "warn": 70, "stop": 80 },
  "graceful": true
}
```

| 키 | 기본값 | 설명 |
| :--- | :--- | :--- |
| `daily.warn` | `60` | 5시간 사용량(%)이 이 값을 넘으면 상태줄이 노란색 |
| `daily.stop` | `70` | 5시간 사용량(%)이 이 값을 넘으면 프롬프트와 도구 호출 차단 |
| `weekly.warn` | `70` | 주간 사용량(%)이 이 값을 넘으면 상태줄이 노란색 |
| `weekly.stop` | `80` | 주간 사용량(%)이 이 값을 넘으면 프롬프트와 도구 호출 차단 |
| `graceful` | `true` | 한도 초과 후 도구 호출 한 번을 더 허용해 마무리. `false`면 즉시 차단 (파일 직접 수정) |

> `daily`는 달력상 하루가 아니라 Claude의 **5시간** 사용 창을 뜻합니다.

---

## 작동 원리

1. **상태줄:** Claude Code가 상태줄을 갱신할 때마다 현재 5시간/주간 사용률을 가져와 `~/.claude/ration/state.json`에 캐시합니다.
2. **`UserPromptSubmit` 훅:** `stop` 임계값을 넘으면 새 프롬프트를 막고 사유와 리셋 시간을 보여줍니다.
3. **`PreToolUse` 훅:** `stop` 임계값을 넘으면 graceful 모드에서는 도구 호출 한 번을 통과시키고, 그 뒤로는 모두 거부해 Claude가 멈춥니다.
4. **Override:** `claude-ration override 30`으로 30분간 제한을 해제합니다.

### 다른 상태줄을 쓰는 경우

사용량은 `claude-ration statusline`이 실행될 때만 갱신됩니다. 이미 다른 상태줄을 쓰고 있으면 `install`은 그대로 두고 경고만 출력합니다. 이 경우 사용량이 갱신되지 않아 제한이 동작하지 않으니, `"command": "claude-ration statusline"`으로 바꾸거나 기존 상태줄 스크립트에서 함께 호출하세요.

### 주의사항

- 사용량은 Claude Code의 `/usage`가 쓰는 엔드포인트에서 읽습니다. 공개 API가 아니라서 예고 없이 바뀔 수 있습니다.
- 인증 정보는 `~/.claude/.credentials.json`(macOS는 키체인)에서 읽습니다. Claude 구독(OAuth) 로그인만 지원하며, API 키를 쓰면 사용량이 0%로 표시됩니다.
- 한도에 걸리면 슬래시 명령도 막힐 수 있습니다. 다른 터미널에서 `claude-ration override`를 실행하세요.

---

## 기여하기 (Contributing)

버그 제보, 기능 제안, Pull Request는 언제든 환영합니다!

1. 저장소 Fork
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성

---

## 라이선스 (License)

MIT 라이선스에 따라 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참고하세요.
