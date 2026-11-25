<div align="center">
  <h1>claude-ration</h1>
  <p>
    <strong>Claude Code 작업 도중 사용량 한도(Rate Limit)로 갑자기 끊기는 일을 방지하세요.</strong><br />
    설정한 임계값에 도달하면 진행 중인 작업을 깔끔하게 마무리하고 안전하게 멈춰주는 사용량 관리 도구입니다.
  </p>
  <p>
    <a href="https://npmjs.com">
      <img src="https://shields.io" alt="npm version" />
    </a>
    <a href="./LICENSE">
      <img src="https://shields.io" alt="License: MIT" />
    </a>
  </p>
  <p>
    <a href="./README.md">English</a> | <strong>한국어</strong>
  </p>
</div>

---

## 왜 `claude-ration`이 필요한가요?

Claude Code에 큰 작업을 맡겨두고 자리를 비웠을 때, 갑자기 5시간 세션 또는 주간 한도에 걸려 작업이 강제 중단되면 코드가 어중간하게 깨지고 컨텍스트를 잃게 됩니다.

`claude-ration`은 사용량의 안전장치를 제공합니다:
- **안전한 작업 마무리 (Graceful Shutdown):** 설정한 임계값(예: `75%`)에 도달하면 즉시 강제 종료하지 않고, 현재 진행 중인 작업 단계를 깔끔하게 정리한 뒤 멈춥니다.
- **코드 손상 방지:** 파일 수정 도중 끊겨 빌드 에러나 충돌이 발생하는 상황을 예방합니다.
- **긴급 여유분 확보:** 항상 `20~30%`의 한도를 남겨두어 급한 버그 수정(Hotfix)에 바로 대응할 수 있습니다.
- **주간 한도 배분:** 월·화요일에 주간 할당량을 다 써버리는 일을 막고 일주일 내내 안정적으로 사용할 수 있습니다.

---

## 빠른 시작 (Quick Start)

### 설치

```bash
npm install -g claude-ration
# 또는 설치 없이 바로 실행
npx claude-ration
```

### 기본 사용법

원하는 임계값(기본값: `80%`)을 지정해 실행합니다:

```bash
claude-ration --threshold 75
```

현재 사용량 상태 확인:

```bash
claude-ration status
```

---

## 설정 (Configuration)

프로젝트 루트 또는 홈 디렉토리(`~/.claude-ration.json`)에 설정 파일을 생성해 세부 동작을 제어할 수 있습니다:

```json
{
  "sessionThreshold": 80,
  "weeklyThreshold": 85,
  "gracefulWrapUp": true,
  "notifyOnStop": true
}
```

| 옵션 | 타입 | 기본값 | 설명 |
| :--- | :--- | :--- | :--- |
| `sessionThreshold` | `number` | `80` | 안전 종료를 실행할 5시간 세션 한도 비율 (%) |
| `weeklyThreshold` | `number` | `85` | 안전 종료를 실행할 주간 한도 비율 (%) |
| `gracefulWrapUp` | `boolean` | `true` | 종료 전 현재 진행 중인 파일 수정/명령을 마무리할지 여부 |
| `notifyOnStop` | `boolean` | `true` | 임계값 도달 시 터미널/데스크톱 알림 표시 여부 |

---

## 작동 원리

1. **실시간 모니터링:** 세션 및 주간 토큰 사용량을 실시간으로 추적합니다.
2. **임계값 감지:** 지정한 한도 비율에 도달하면 다음 작업 사이클 전에 마무리 신호를 전달합니다.
3. **정리 후 종료:** Claude가 현재 수정 중인 코드를 안전하게 저장하고 진행 상황을 요약한 뒤 종료합니다.

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
