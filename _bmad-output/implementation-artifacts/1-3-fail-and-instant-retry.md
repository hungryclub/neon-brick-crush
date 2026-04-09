# Story 1.3: 실패/즉시 재도전 루프 구현

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want failure and instant retry to feel immediate,
so that the game keeps a short, addictive rhythm.

## Acceptance Criteria

1. Given a stage reaches a fail condition, when the session machine receives the
   failure event, then it must transition to a failure state without Scene-local
   retry logic, and the player must be able to trigger an instant retry path.
2. Given instant retry is selected, when the stage resets, then the stage must
   restore from the session-controlled baseline, and the retry flow must
   complete without a full application reload.

## Tasks / Subtasks

- [x] Add an explicit runtime-to-session failure boundary that does not put retry
      policy inside Scene code. (AC: 1)
  - [x] Extend `GameRuntimeBridge` so the runtime can emit a high-level stage
        failure signal and accept a session-approved reset command.
  - [x] Keep `StageScene` responsible only for detecting fail conditions
        (`hasReachedLossLine` / stage-failed state) and emitting the signal.
  - [x] Do not let `StageScene` decide whether retry is allowed, how many times
        it is allowed, or how the retry UI behaves.
- [x] Evolve the XState session machine into a real failure/retry orchestrator.
      (AC: 1, 2)
  - [x] Add explicit state nodes for active play, failed state, and retry
        restore flow rather than relying on Scene-local booleans.
  - [x] Ensure instant retry intent is handled by `session.machine.ts` and not
        by React or Phaser directly.
  - [x] Keep retry context in XState as the single source of truth so Story 1.4
        can add rewarded retry on top instead of replacing this logic.
- [x] Restore the stage from a session-controlled baseline without reloading the
      whole app/runtime shell. (AC: 2)
  - [x] Capture or reconstruct the baseline stage state needed to reset Story
        1.2 gameplay cleanly.
  - [x] Reset board, ball, turn number, HUD projection, and failure flags
        through a runtime command path rather than destroying the whole app.
  - [x] Preserve the mounted Phaser runtime host and React shell while the stage
        resets.
- [x] Expose an immediate retry UX that fits the current shell without pulling
      Story 1.4 ad flow forward. (AC: 1, 2)
  - [x] Surface a clear failure state and instant retry CTA in the React/HUD
        layer.
  - [x] Keep the retry CTA wired to session intent only; no direct Scene reset
        call from UI components.
  - [x] Do not add rewarded-ad choice UI in this story; Story 1.4 owns that
        branch.
- [x] Verify failure/retry behavior with focused automated checks and a short
      manual loop. (AC: 1, 2)
  - [x] Add unit tests for session state transitions covering `STAGE_FAILED`,
        retry request, and retry completion.
  - [x] Add at least one test that protects the runtime reset contract or
        baseline restore logic from regression.
  - [x] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [x] Manually verify: fail reached, failure UI appears, instant retry works,
        stage resets without full reload, and the player can shoot again
        immediately.

### Review Findings

- [x] [Review][Patch] Runtime bridge is registered after Phaser scenes start, so `StageScene` misses HUD/failure/reset listeners and Story 1.3 flow never actually wires up. [`app/game/core/create-game-runtime.ts:16`]

## Dev Notes

### Story Intent

Story 1.3는 Story 1.2의 코어 턴 루프 위에 `실패 -> 즉시 재도전` 템포를
붙이는 단계다. 중요한 점은 실패 감지와 재도전 정책을 분리하는 것이다.
실패 감지는 `app/game` 런타임이 할 수 있지만, retry 허용 여부와 재시작
오케스트레이션은 반드시 `XState`가 소유해야 한다.

이번 단계의 목표는 광고 재도전까지 한 번에 넣는 것이 아니다. 즉시 재도전
단일 경로를 먼저 안정적으로 만들고, Story 1.4에서 광고 기반 추가 기회를
그 위에 올릴 수 있게 구조를 고정하는 것이 핵심이다.

### Epic Context

- Epic 1의 목표는 조준, 발사, 블록 파괴, 턴 종료, 실패/재도전, 광고
  재도전까지 이어지는 최소 플레이어블을 완성하는 것이다.
- Story 1.3은 Story 1.2에서 만든 플레이 루프가 "짧고 계속 이어지는 템포"를
  가지도록 만드는 전환점이다.
- GDD의 핵심은 실패가 좌절감보다 재도전 욕구를 남겨야 한다는 점이다.
  결과 화면과 복귀 흐름은 짧고 직관적이어야 한다.

### Story 1.3 Foundation

- User story: 플레이어가 실패 후 즉시 다시 시도할 수 있어야 한다.
- Success criteria:
  - fail condition이 runtime에서 감지되면 session machine이 명시적으로 실패
    상태로 전이된다.
  - retry는 session intent를 통해 트리거되며 Scene-local 임시 로직이 아니다.
  - stage reset은 전체 앱 reload 없이 baseline에서 빠르게 복구된다.
  - Story 1.4의 광고 재도전 분기가 자연스럽게 올라갈 수 있도록 구조가 열린다.

### Previous Story Intelligence

Story 1.2까지의 구현에서 이미 중요한 기준이 생겼다.

- `StageScene.ts`는 조준/발사/턴 해석/보드 하강을 직접 처리하지만, retry/ad
  정책은 아직 구현하지 않았다.
- `GameRuntimeBridge`는 현재 runtime ready 신호와 HUD snapshot 전파만 가진다.
- `session.machine.ts`는 `booting -> ready -> failed`의 최소 흐름만 있고,
  retry restore나 runtime command orchestration은 아직 없다.
- HUD는 React에서 `useUiStore` selector로 구독하며, Phaser 내부 상태를 직접
  읽지 않는다.
- Story 1.2 리뷰에서 입력 취소와 loss line 방어가 보강되었으므로, Story 1.3은
  이 상태를 기준선으로 사용해야 한다.

### Existing Codebase Intelligence

- 현재 failure/retry 관련 직접 수정 가능성이 높은 파일:
  - `app/state/machines/session.machine.ts`
  - `app/state/selectors/session.selectors.ts`
  - `app/game/hud-bridges/game-runtime-bridge.ts`
  - `app/game/scenes/StageScene.ts`
  - `app/ui/screens/GameShell.tsx`
  - `app/ui/components/HudPanel.tsx`
- 현재 참고 가능한 플랫폼/향후 연결 파일:
  - `app/platform/ads/rewarded-ad.adapter.ts`
  - `app/platform/persistence/progression.repository.ts`
- 아직 비어 있거나 약한 구조:
  - retry 전용 UI/overlay
  - runtime reset command 채널
  - session retry selector
  - failure/retry transition test coverage

### Technical Requirements

- 런타임 엔진은 `Phaser 3.90.0`을 유지한다.
- 상태 오케스트레이션은 `XState v5` 기준을 유지한다.
- 뷰 상태는 `Zustand` selector 기반 최소 구독을 유지한다.
- recoverable failure는 `neverthrow`/typed error 철학과 맞아야 하며, throw로
  임시 처리하지 않는다.
- `app/`가 유일한 실행 루트다.
- fail/retry는 모바일 우선 세션 템포를 해치지 않게 매우 짧아야 한다.

### Architecture Compliance Guardrails

- `XState = single source of truth` for session and retry flows.
- `Phaser = runtime only`. Scene는 fail condition을 감지하고 이벤트를 올릴 수는
  있지만, retry 허용 여부를 결정하면 안 된다.
- `React = presentation only`. UI는 retry intent를 보내고 상태를 표시하지만
  baseline reset을 직접 수행하면 안 된다.
- `Zustand = lightweight UI/view state only`. fail policy, retry count,
  restore eligibility를 store에 따로 복제하지 않는다.
- 광고 SDK/WebView/저장은 `app/platform` 밖에서 직접 호출하지 않는다.
- Story 1.4의 광고 재도전 정책을 미리 Scene/UI에 섞어 넣지 않는다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/state/machines/session.machine.ts`
- `app/state/selectors/session.selectors.ts`
- `app/game/hud-bridges/game-runtime-bridge.ts`
- `app/game/scenes/StageScene.ts`
- `app/ui/screens/GameShell.tsx`
- `app/ui/components/HudPanel.tsx`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/state/events/session.events.ts`
- `app/state/guards/session.guards.ts`
- `app/ui/overlays/RetryOverlay.tsx`
- `app/tests/unit/session.machine.test.mjs`
- `app/tests/integration/stage-retry-flow.test.mjs`

파일 추가 여부는 구현 중 판단할 수 있지만, `retry` 책임을 `Scene` 단일 파일에
몰아넣지는 말아야 한다.

### Project Structure Notes

- 현재 앱 구조는 Story 1.2까지 실제 플레이 루프를 담기 시작했고, 실패/재도전은
  아직 비어 있는 상태다.
- Story 1.3에서는 `runtime event -> session machine -> UI intent -> runtime reset`
  흐름을 고정하는 것이 중요하다.
- baseline restore는 "앱 전체 destroy/recreate"보다 "현재 runtime 안에서 stage
  상태 초기화"에 가깝게 설계하는 편이 Story intent와 템포 요구에 맞다.
- 단, baseline 데이터가 Scene 내부 임시 변수로만 남지 않게 해야 Story 1.4
  복구 규칙 확장이 쉬워진다.

### Library / Framework Requirements

- XState v5 기준으로 명시적 event와 상태 전이를 설계한다.
- `@xstate/react` selector 패턴을 유지해 failure/retry UI도 필요한 값만
  구독하도록 한다.
- Phaser Scene 입력/충돌 감지 로직은 유지하되, retry UI 제어를 Scene에 넣지
  않는다.
- typed event bus는 `도메인 경계를 넘는 통신`에 한해 사용 가능하지만, 동일
  모듈 내부 단순 흐름은 직접 함수 호출을 우선한다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - `session.machine.ts`가 fail -> retry intent -> restored 흐름을 정확히
    처리하는지 테스트
  - retry 후 turn number / board / HUD state가 baseline으로 복구되는지 검증
  - retry가 앱 전체 reload 없이 완료되는지 수동 검증
  - Story 1.4를 위해 retry/ad policy가 Scene에 묻히지 않았는지 확인

### UX / Player-Facing Constraints

- 실패 후 재도전까지의 흐름은 짧고 즉각적이어야 한다.
- 실패 UI는 현재 상황을 분명히 전달하되, 플레이 리듬을 끊지 않아야 한다.
- retry 버튼은 첫 시도에서도 이해 가능해야 하고 터치 타깃이 충분해야 한다.
- retry 후 플레이어는 재부팅 느낌이 아니라 "바로 다시 시작됐다"는 감각을
  받아야 한다.

### Anti-Patterns To Avoid

- Scene 안에서 `REQUEST_RETRY`를 직접 처리하며 board reset까지 끝내는 구조
- React 컴포넌트가 Phaser 인스턴스 메서드를 직접 호출해 reset하는 구조
- 같은 retry eligibility를 XState와 Zustand가 동시에 소유하는 구조
- 광고 재도전 분기나 ad adapter 호출을 Story 1.3에 섞어 넣는 구조
- runtime reset 대신 전체 app/runtime shell을 destroy/recreate하는 구조

### Git Intelligence Summary

최근 커밋 흐름은 Story 1.2 구현, 리뷰 수정, 충돌 보정, 리뷰 패치 반영 순서로
진행됐다. 즉 현재 코드베이스는 "턴 루프는 살아 있고, failure/retry orchestration
만 비어 있는 상태"로 보는 것이 맞다. 새 story 구현은 기존 StageScene을 갈아엎기보다
세션 전이와 reset 경계를 추가하는 방향이 안전하다.

최근 관련 커밋:

- `1d92611` `[Execution] Dave: Story 1.2 리뷰 패치 반영`
- `dc69386` `[Execution] Dave: Story 1.2 충돌 재접촉 처리 보정`
- `f76bcd5` `[Execution] Dave: Story 1.2 리뷰 수정 반영`
- `c4b1b3f` `[Execution] Dave: Story 1.2 조준 발사 턴 루프 구현`

### Project Context Rules

- `Phaser = runtime only`
- `XState = single source of truth`
- `Zustand = lightweight UI/view state only`
- `React = presentation only`
- `GameRuntimeBridge` / HUD bridge를 통한 연결 유지
- 외부 연동은 `app/platform` 내부에서만 허용
- recoverable failure는 typed error와 handled branch로 관리
- retry, reward, save failure 같은 critical branch는 로그/테스트 검증 대상

### References

- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/stories.md` - `Story 1.3: 실패/즉시 재도전 루프 구현`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/1-2-aim-shoot-and-turn-loop.md` - `Review Findings`, `Previous Story Intelligence`, `Architecture Compliance Guardrails`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md` - `Failure Recovery`, `Core Gameplay Loop`, `Failure Conditions`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md` - `Architectural Priorities`, `Error Handling`, `Event System`, `광고 재도전 패턴`, `Phaser-React-XState-Zustand 연결 패턴`, `Directory Structure`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md` - `Critical Implementation Rules`, `Testing Rules`, `Critical Don't-Miss Rules`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/state/machines/session.machine.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/state/selectors/session.selectors.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/hud-bridges/game-runtime-bridge.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/scenes/StageScene.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/ui/screens/GameShell.tsx`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/ui/components/HudPanel.tsx`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/platform/ads/rewarded-ad.adapter.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story 1.3 context generated from sprint status, stories backlog, GDD, game
  architecture, project context, current session/runtime code, and recent Story
  1.2 commits.
- `npm run test` passed with session machine, runtime bridge, turn resolver, and
  aim controller coverage.
- `npm run typecheck` passed in `app/`.
- `npm run build` passed in `app/` with an existing Vite chunk size warning.
- Headless Chrome DOM smoke against `vite preview` confirmed mounted
  `#game-runtime-host`, Phaser canvas presence, and session state `playing`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.2 implementation and review learnings were folded into the retry story
  so the next dev pass does not reinvent runtime/session boundaries.
- Added runtime failure and reset signals to `GameRuntimeBridge` so Phaser can
  report failure upward and accept session-approved retry commands.
- Expanded `session.machine.ts` to explicit `playing`, `failed`, and `retrying`
  states with retry count tracking and restore completion handling.
- Added failure overlay and instant retry CTA in React while keeping reset
  execution out of the UI layer.
- Reset the stage from a cloned baseline without destroying the runtime shell.

### File List

- `_bmad-output/implementation-artifacts/1-3-fail-and-instant-retry.md`
- `app/game/hud-bridges/game-runtime-bridge.ts`
- `app/game/scenes/StageScene.ts`
- `app/state/machines/session.machine.ts`
- `app/state/selectors/session.selectors.ts`
- `app/ui/screens/GameShell.tsx`
- `app/tests/unit/game-runtime-bridge.test.mjs`
- `app/tests/unit/session.machine.test.mjs`
