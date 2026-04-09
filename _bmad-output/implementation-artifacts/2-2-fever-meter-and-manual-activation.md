# Story 2.2: 피버 게이지와 수동 발동 구현

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to charge and trigger fever manually,
so that I can choose when to create a power moment.

## Acceptance Criteria

1. Given gameplay events add fever charge, when the meter reaches a valid
   threshold, then the session state and HUD selector data must expose fever
   readiness, and the same value must not be duplicated across XState and
   Zustand ownership.
2. Given the player triggers fever, when the session receives the intent, then
   fever activation must pass through XState orchestration and runtime bridge,
   and the runtime must receive only the resolved activation command it needs.

## Tasks / Subtasks

- [x] Extend session orchestration to own fever meter and readiness. (AC: 1, 2)
  - [x] Add explicit XState context/state support for fever meter value, ready
        status, and active status or activation window.
  - [x] Keep fever truth in `session.machine.ts` and selectors, not in Zustand
        or Phaser Scene state.
  - [x] Define clear session events for charge gain and player activation intent.
- [x] Route gameplay charge events through runtime bridge into XState. (AC: 1)
  - [x] Have runtime emit only charge-worthy gameplay events or summarized turn
        payloads rather than directly mutating fever state.
  - [x] Ensure React/HUD consumes selector data only and does not calculate
        readiness itself.
  - [x] Preserve current retry/session flow behavior while adding fever updates.
- [x] Expose a fever-ready HUD/button flow for manual activation. (AC: 1, 2)
  - [x] Add a clear fever meter/readiness indicator to HUD or overlay UI.
  - [x] Add a player-triggered fever activation control that dispatches only a
        session event.
  - [x] Prevent invalid activation when meter is not ready.
- [x] Deliver resolved fever activation to runtime through the bridge boundary.
      (AC: 2)
  - [x] Extend `GameRuntimeBridge` with the minimal activation command/event
        needed by runtime.
  - [x] Ensure Scene receives only the resolved activation signal, not policy
        decisions about readiness.
  - [x] Keep fever modifier integration aligned with Story 2.1 pipeline order.
- [x] Add focused tests and verification for fever ownership and activation.
      (AC: 1, 2)
  - [x] Add session machine tests for meter charging, readiness, and activation.
  - [x] Add at least one bridge/runtime test confirming activation crosses the
        XState-to-runtime boundary without duplicated ownership.
  - [x] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [x] Manually verify: meter charges during play, ready state is visible, and
        tapping fever activates through the intended flow.

## Dev Notes

### Story Intent

Story 2.2는 Epic 2의 "역전 버튼"을 여는 단계다. Story 2.1이 게이트/피버 modifier
pipeline의 형태를 만들었다면, 이번 스토리는 그 pipeline에 나중에 실제 증폭을
넣을 수 있도록 `fever readiness`와 `manual activation`의 상태 흐름을 먼저
닫는 작업이다.

핵심은 피버가 자동 보상이 아니라 플레이어가 타이밍을 선택하는 수동 시스템이라는
점이다. 따라서 meter accumulation은 gameplay event에서 올라오더라도, readiness와
activation eligibility는 XState가 소유해야 하고 React/HUD는 이를 selector로
표시만 해야 한다.

### Epic Context

- Epic 2의 목표는 게이트와 피버를 함께 써서 "좋은 샷 하나가 판세를 뒤집는"
  감각을 만드는 것이다.
- Story 2.1이 gate modifier pipeline을 완성했으므로, Story 2.2는 fever meter와
  activation orchestration을 올려 후속 Story 2.3의 조합 연출 기반을 만든다.
- GDD 기준 피버 버튼은 즉시 이해 가능하고, 게이지 완충 시 플레이어가 직접
  선택해 눌러야 하는 수동 발동 장치다.

### Story 2.2 Foundation

- User story: 플레이어는 플레이 중 meter를 채우고, 준비 완료 시 수동으로
  fever를 발동할 수 있어야 한다.
- Success criteria:
  - fever meter/readiness는 session state와 HUD selector에서 노출된다.
  - 같은 fever truth를 XState와 Zustand가 중복 소유하지 않는다.
  - activation intent는 React UI -> session event -> runtime bridge 경로를 따른다.
  - runtime은 activation policy가 아니라 resolved activation command만 받는다.

### Previous Story Intelligence

Story 2.1에서 이미 중요한 기반이 만들어졌다.

- `turn-resolver.ts`는 `base -> gate -> fever -> finalize` 순서를 가진다.
- `applyFeverModifiers()`는 아직 no-op slot이지만 pipeline상의 위치는 고정되어 있다.
- `StageScene.ts`는 runtime bridge와 HUD 갱신, turn resolution, retry/reset 경계를
  이미 소유하고 있다.
- `session.machine.ts`는 boot/playing/failed/retrying/rewarded retry 흐름을 관리하므로,
  fever state는 여기에 자연스럽게 확장되어야 한다.
- `HudPanel.tsx`는 runtime HUD와 sessionPhase를 같이 보여주고 있어 fever readiness
  표시를 넣기 좋은 위치다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일:
  - `app/state/machines/session.machine.ts`
  - `app/state/selectors/session.selectors.ts`
  - `app/game/hud-bridges/game-runtime-bridge.ts`
  - `app/game/scenes/StageScene.ts`
  - `app/ui/screens/GameShell.tsx`
  - `app/ui/components/HudPanel.tsx`
- 이미 있는 유용한 기반:
  - runtime bridge를 통한 stage failed/reset lifecycle 신호
  - session selectors 기반 React 구독 구조
  - Story 2.1의 fever pipeline slot
- 새로 생길 가능성이 높은 경로:
  - `app/state/selectors/fever.selectors.ts`
  - `app/tests/unit/fever-*.test.mjs`
  - `app/game/mechanics/fever-*.ts`

### Technical Requirements

- fever meter truth는 XState가 소유한다.
- runtime은 fever readiness를 계산하지 않고, activation command와 gameplay charge
  source만 다룬다.
- Zustand는 selector projection용 view state만 담당한다.
- modifier 적용 순서는 계속 `base -> gate -> fever -> finalize`로 고정한다.
- recoverable branch는 typed event/result 중심으로 다룬다.

### Architecture Compliance Guardrails

- Session state의 단일 진실원은 XState다.
- Phaser는 gameplay event와 runtime result를 생산하지만 fever policy를 소유하지 않는다.
- React는 selector 기반으로 meter/readiness를 렌더링하고 activation intent만 보낸다.
- `GameRuntimeBridge`는 fever activation 경계를 잇는 최소한의 명령 채널만 추가해야 한다.
- Scene는 "발동 가능 여부"를 계산하지 않고, session이 보낸 activation signal만 수행한다.

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

- `app/state/selectors/fever.selectors.ts`
- `app/tests/unit/fever-activation.test.mjs`
- `app/tests/unit/fever-bridge.test.mjs`

### Project Structure Notes

- 올바른 흐름은 `runtime gameplay event -> session charge update -> selector/HUD readiness
  -> UI intent -> session activation decision -> runtime activation command`다.
- `StageScene`에 fever meter 숫자를 따로 저장하거나, `HudPanel`이 readiness를 자체 계산하는
  구조는 피해야 한다.
- Story 2.3의 gate/fever 조합은 Story 2.2의 activation state를 바탕으로 resolver에
  modifier context를 주입하는 방식으로 이어져야 한다.

### Library / Framework Requirements

- XState v5 이벤트/상태 전이 중심 흐름을 유지한다.
- React는 selector 기반 구독만 사용한다.
- Phaser는 runtime only 원칙을 유지한다.
- `neverthrow` 또는 typed outcome 철학을 그대로 따르며 recoverable branch를 예외로
  처리하지 않는다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - meter accumulation과 ready 전환이 session에서 테스트되는지
  - ready 이전 activation이 무시되거나 방어되는지
  - activation 이후 runtime bridge를 통해 resolved command만 전달되는지
  - 수동으로 fever button ready/disabled 상태가 제대로 보이는지

### UX / Player-Facing Constraints

- fever button은 "지금 누르면 판세를 바꿀 수 있다"는 의미가 즉시 읽혀야 한다.
- 게이지가 차는 과정과 ready 상태는 HUD에서 명확해야 한다.
- ready가 아닌 상태의 버튼은 혼란스럽지 않게 비활성 또는 명확한 상태 표현을 가져야 한다.
- 모바일 한 손 조작을 해치지 않는 위치와 터치 영역을 고려해야 한다.

### Anti-Patterns To Avoid

- fever meter를 XState와 Zustand가 동시에 소유하는 구조
- `StageScene`이 readiness/policy를 판단하는 구조
- `GameShell` 버튼 핸들러에서 runtime bridge를 직접 두드리는 구조
- Story 2.1 pipeline order를 무시하고 fever effect를 Scene 후처리로 넣는 구조
- meter/readiness 값을 HUD에서 파생 계산해 진실원이 둘이 되는 구조

### Git Intelligence Summary

최근 흐름은 Story 2.1 gate modifier pipeline 구현과 리뷰 패치까지 마무리된 상태다.
즉 runtime turn pipeline은 준비되어 있고, 이번 Story 2.2는 그 위에 fever meter와
manual activation ownership을 올리는 작업이다.

최근 관련 커밋:

- `c1192fe` `[Execution] Dave: Story 2.1 리뷰 패치 반영`
- `d631661` `[Execution] Dave: Story 2.1 게이트 modifier 파이프라인 구현`
- `cf698a0` `[Execution] Dave: Story 1.4 리뷰 패치 반영`

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `Zustand = lightweight UI/view state only`
- Modifier resolution order is fixed: `base -> gate -> fever -> finalize`
- Do not let the same state be owned by both XState and Zustand

### References

- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/stories.md` - `Story 2.2: 피버 게이지와 수동 발동 구현`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/2-1-gate-modifier-pipeline.md` - `Completion Notes`, `Architecture Compliance Guardrails`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md` - `게이트 / 피버 조합 패턴`, `Phaser-React-XState-Zustand 연결 패턴`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md` - `피버 버튼`, `Controls and Input`, `Mechanic Interactions`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md` - `Performance Rules`, `Critical Don't-Miss Rules`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/state/machines/session.machine.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/hud-bridges/game-runtime-bridge.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/ui/components/HudPanel.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story 2.2 context generated from `stories.md`, GDD fever button requirements,
  architecture state-ownership patterns, project context rules, and current HUD/runtime/session structure.
- Existing code inspection confirmed Story 2.1 already preserves the fever slot
  in the modifier pipeline, so Story 2.2 can focus on ownership and activation flow.
- `npm run test`, `npm run typecheck`, and `npm run build` all passed after
  session-owned fever meter/readiness, runtime bridge turn payloads, and manual
  activation UI were added.
- Runtime now emits turn summary payloads for fever charge, while XState owns
  readiness/activation and dispatches only resolved activation commands back to
  the Scene.
- Review patch moved fever bridge delivery out of a React effect and into the
  same intent-handling control flow that observes the post-session snapshot, so
  runtime command dispatch no longer depends on a later render pass.

### Completion Notes List

- Prepared Story 2.2 as the state-ownership bridge between Story 2.1 pipeline
  and Story 2.3 combo feedback work.
- Fixed the implementation guardrails so fever meter/readiness stays in XState
  while Phaser and React only exchange events and resolved commands.
- Added bridge support for `turn resolved` payloads and `fever activation`
  commands, plus session selectors and HUD/button presentation for fever state.
- Wired the fever pipeline slot to a lightweight runtime effect so activation is
  observable in play without moving policy into Scene code.
- Tightened the activation boundary so session policy resolution and runtime
  command delivery are coupled more explicitly.

### File List

- app/game/hud-bridges/game-runtime-bridge.ts
- app/game/mechanics/gate-modifier-pipeline.ts
- app/game/systems/turn-resolver.ts
- app/game/scenes/StageScene.ts
- app/state/machines/session.machine.ts
- app/state/selectors/session.selectors.ts
- app/ui/components/HudPanel.tsx
- app/ui/screens/GameShell.tsx
- app/tests/unit/game-runtime-bridge.test.mjs
- app/tests/unit/session.machine.test.mjs
