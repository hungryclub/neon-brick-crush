# Story 1.4: 광고 시청 후 재도전 흐름 구현

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to watch an ad for one more chance after failing,
so that I can recover in a high-tension moment.

## Acceptance Criteria

1. Given the session enters the retry-offer state, when the player selects
   rewarded retry, then the XState service layer must call the ad bridge adapter,
   and Scene code must not call the ad SDK directly.
2. Given the ad result returns, when it succeeds, then the session machine must
   restore the allowed retry context and resume the stage, and when it fails or
   is cancelled, the machine must fall back to the normal failure flow with a
   handled error path.

## Tasks / Subtasks

- [x] Extend the session orchestration to distinguish instant retry from
      rewarded retry offer flow. (AC: 1, 2)
  - [x] Add explicit XState state nodes for retry offer, ad request in flight,
        ad-granted restore, and ad-denied fallback.
  - [x] Keep retry policy, ad eligibility, and grant consumption in
        `session.machine.ts` or adjacent state-layer helpers, not in Scene/UI.
  - [x] Preserve Story 1.3 instant retry baseline so rewarded retry builds on
        it instead of replacing it.
- [x] Route rewarded retry through the platform adapter boundary only. (AC: 1)
  - [x] Use `app/platform/ads/rewarded-ad.adapter.ts` behind a session-owned
        service call path.
  - [x] Ensure `StageScene` never imports or calls the ad adapter directly.
  - [x] Return handled success/failure/cancel outcomes rather than throwing.
- [x] Resume the stage only after the session grants the rewarded retry. (AC: 2)
  - [x] Reuse the Story 1.3 runtime reset command path so stage restoration still
        happens without full app reload.
  - [x] Restore only when ad grant succeeds and the retry context is valid.
  - [x] Prevent duplicate grants or repeated rewarded retries if current policy
        should allow only one fail-state extra chance.
- [x] Expose a clear retry-offer UX without breaking the current failure tempo.
      (AC: 1, 2)
  - [x] Update the failure overlay or related UI to offer both instant retry and
        rewarded retry choices with clear labels.
  - [x] Keep UI intent-only: buttons send session events, but UI does not call
        runtime reset or ad adapter methods directly.
  - [x] Surface handled failure/cancel feedback so the player returns to the
        normal failure state instead of getting stuck.
- [x] Add focused tests and verification for rewarded retry branching. (AC: 1, 2)
  - [x] Add session machine tests covering ad accepted, ad denied, and ad
        cancelled paths.
  - [x] Add at least one test around the adapter/service contract to ensure
        Scene isolation is preserved.
  - [x] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [x] Manually verify: fail state shows rewarded retry option, ad success
        restores play, ad failure/cancel returns to failure UI, and no full app
        reload occurs.

## Dev Notes

### Story Intent

Story 1.4는 Story 1.3에서 만든 실패/즉시 재도전 루프 위에 `광고 시청 후 한 번
더 기회`를 추가하는 단계다. 핵심은 ad flow가 코어 런타임을 오염시키지 않도록
하는 것이다. 실패 감지와 stage reset은 이미 Story 1.3에서 분리했으므로, 이번
스토리는 그 위에 `session-owned rewarded retry branch`를 얹어야 한다.

중요한 점은 "광고 성공 시에만 재도전이 허가된다"는 정책을 XState가 소유해야
한다는 것이다. UI는 선택지만 보여주고, Scene은 stage reset command만 받는다.
광고 SDK/adapter 호출은 반드시 session service 계층에서만 발생해야 한다.

### Epic Context

- Epic 1의 목표는 최소 플레이어블에 실패/재도전과 광고 재도전까지 붙이는 것이다.
- Story 1.3이 이미 instant retry 경로를 닫았기 때문에, Story 1.4는 정상 실패
  경로를 유지하면서 보상형 광고 기반 추가 기회를 넣는 확장 작업이다.
- GDD 기준 광고 재도전은 억지스럽지 않은 "자연스러운 추가 기회"처럼 느껴져야
  하며, 세션 템포를 과하게 깨면 안 된다.

### Story 1.4 Foundation

- User story: 플레이어가 실패 직후 광고를 보고 한 번 더 기회를 얻을 수 있어야 한다.
- Success criteria:
  - rewarded retry 선택 시 XState orchestration이 ad adapter를 호출한다.
  - 광고 성공 시에만 session이 복구를 허가하고 stage가 다시 열린다.
  - 광고 실패/취소는 handled branch로 normal failure 상태에 복귀한다.
  - Scene은 광고 SDK나 retry policy를 직접 알지 못한다.

### Previous Story Intelligence

Story 1.3에서 이미 중요한 기반이 만들어졌다.

- `GameRuntimeBridge`는 stage failed, reset requested, reset completed 신호를 가진다.
- `StageScene.ts`는 fail condition을 감지하고 `signalStageFailed()`를 올리며,
  reset은 `onStageResetRequested()`를 통해 baseline restore로 처리한다.
- `session.machine.ts`는 현재 `booting -> playing -> failed -> retrying`
  흐름과 retry count를 가진다.
- `GameShell.tsx`는 failure overlay와 `Instant Retry` CTA를 이미 가지고 있고,
  retry가 UI intent -> session event -> runtime reset으로 이어지게 되어 있다.
- Story 1.4는 이 instant retry 흐름을 깨지 않고, rewarded retry 분기를 추가해야 한다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일:
  - `app/state/machines/session.machine.ts`
  - `app/state/selectors/session.selectors.ts`
  - `app/ui/screens/GameShell.tsx`
  - `app/game/hud-bridges/game-runtime-bridge.ts`
  - `app/platform/ads/rewarded-ad.adapter.ts`
- 이미 존재하는 유용한 구현:
  - `requestRetryAd()` stub가 있는 `rewarded-ad.adapter.ts`
  - Story 1.3의 failure overlay / retry reset path
- 아직 비어 있거나 약한 구조:
  - ad retry service layer
  - ad success/failure/cancel session tests
  - rewarded retry CTA 및 denial feedback

### Technical Requirements

- 런타임 엔진은 `Phaser 3.90.0` 유지
- 상태 오케스트레이션은 `XState v5`
- recoverable ad failure는 `neverthrow`/typed outcome 철학에 맞게 처리
- `app/`가 유일한 실행 루트
- rewarded retry는 fail-state 추가 기회이며, normal retry baseline을 무너뜨리면 안 됨

### Architecture Compliance Guardrails

- 광고 제안 여부와 grant 소비 여부는 `SessionMachine`이 소유한다.
- 광고 SDK 호출은 `AdBridgeAdapter`만 수행한다.
- Scene는 광고 요청을 직접 발생시키지 않는다.
- React는 선택지와 결과를 표시하지만 ad adapter를 직접 호출하지 않는다.
- Story 1.3의 baseline restore command path를 재사용하고, reset 수행 자체를 UI에서 직접 호출하지 않는다.
- ad failure/cancel은 throw가 아니라 handled failure로 normal failure state에 복귀해야 한다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/state/machines/session.machine.ts`
- `app/state/selectors/session.selectors.ts`
- `app/ui/screens/GameShell.tsx`
- `app/platform/ads/rewarded-ad.adapter.ts`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/state/actors/retry-ad.actor.ts`
- `app/state/services/retry-ad.service.ts`
- `app/tests/unit/rewarded-ad-flow.test.mjs`

파일 추가 여부는 구현 중 판단할 수 있지만, rewarded retry 분기를 `GameShell`
버튼 핸들러 내부 비동기 로직으로 몰아넣지는 말아야 한다.

### Project Structure Notes

- Story 1.3이 이미 instant retry를 닫았으므로, Story 1.4는 별도 runtime reset
  메커니즘을 새로 만들 필요가 없다.
- 올바른 구조는 `UI intent -> session event -> ad service -> session decision ->
  runtime reset command`다.
- 향후 BM/광고 adapter 정식 구현을 생각하면, 지금의 adapter stub도 service layer
  뒤에 두는 편이 확장성이 좋다.

### Library / Framework Requirements

- XState v5의 명시적 상태/이벤트 기반 분기를 유지한다.
- `neverthrow`는 adapter/service 경계에서 success/failure/cancel을 타입화하는 데
  활용하는 것이 적합하다.
- selector 기반 UI 구독을 유지하고 broad subscription은 피한다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - ad success path가 `retrying`/restore로 이어지는지 테스트
  - ad fail/cancel path가 normal failure state로 되돌아가는지 테스트
  - Scene이 ad adapter를 직접 import하지 않았는지 간접적으로 보호하는 테스트
  - 수동으로 fail overlay에서 rewarded retry 선택지가 보이는지 확인

### UX / Player-Facing Constraints

- rewarded retry는 즉시 이해 가능한 "추가 기회"여야 한다.
- 광고 실패/취소 후 플레이어가 막히지 않고 다시 failure UI로 돌아와야 한다.
- instant retry와 rewarded retry가 동시에 존재해도 우선순위와 의미가 헷갈리지 않아야 한다.
- 광고 선택은 강요처럼 느껴지지 않아야 한다.

### Anti-Patterns To Avoid

- `StageScene`에서 ad adapter를 직접 호출하는 구조
- `GameShell` 버튼 클릭에서 adapter 비동기 호출과 state mutation을 직접 처리하는 구조
- ad success 여부를 Zustand와 XState가 동시에 소유하는 구조
- 광고 실패 시 stuck state에 빠지는 구조
- Story 1.3의 reset path를 무시하고 별도 reload 경로를 만드는 구조

### Git Intelligence Summary

최근 흐름은 Story 1.3 컨텍스트 작성, 실패/즉시 재도전 구현, 그리고 bridge wiring
리뷰 패치까지 마무리된 상태다. 즉 현재 코드는 rewarded retry를 얹기 위한
실패/복구 골격은 갖췄고, 광고 분기와 adapter orchestration만 비어 있다.

최근 관련 커밋:

- `3fd10b5` `[Execution] Dave: Story 1.3 리뷰 패치 반영`
- `50d9dde` `[Execution] Dave: Story 1.3 실패 재도전 루프 구현`
- `d44414e` `[Execution] Dave: Story 1.3 구현 컨텍스트 작성 및 상태 반영`

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `Zustand = lightweight UI/view state only`
- retry offer / retry ad accepted / retry ad denied는 로그 검증 대상
- 외부 연동은 `app/platform` 내부에서만 허용

### References

- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/stories.md` - `Story 1.4: 광고 시청 후 재도전 흐름 구현`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/1-3-fail-and-instant-retry.md` - `Tasks / Subtasks`, `Architecture Compliance Guardrails`, `Completion Notes`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md` - `광고 재도전 패턴`, `Error Handling`, `Event System`, `Directory Structure`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md` - `Failure Recovery`, `광고 재도전 선택률`, `광고 재도전 UX`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md` - `Testing Rules`, `Critical Don't-Miss Rules`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/platform/ads/rewarded-ad.adapter.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/state/machines/session.machine.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/ui/screens/GameShell.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story 1.4 context generated from sprint status, story backlog, Story 1.3
  implementation artifact, architecture ad-retry pattern, project context, and
  current ad adapter stub.
- `npm run test` passed with rewarded retry adapter coverage and session machine
  success/denied/cancelled branches.
- `npm run typecheck` passed in `app/`.
- `npm run build` passed in `app/` with an existing Vite chunk size warning.
- Preview smoke confirmed the app still serves successfully after rewarded retry
  UI changes; interactive ad flow remains based on local stub outcomes.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.3 retry orchestration was used as the fixed baseline so rewarded retry
  can layer on without reworking runtime reset boundaries.
- Added rewarded retry branching to the session machine so ad success restores
  play while denied/cancelled outcomes fall back to handled failure substates.
- Kept ad adapter invocation inside the state/service layer and out of Scene/UI.
- Expanded the failure overlay to present both instant retry and rewarded retry
  options with pending/error feedback.

### File List

- `_bmad-output/implementation-artifacts/1-4-rewarded-ad-retry-flow.md`
- `app/platform/ads/rewarded-ad.adapter.ts`
- `app/platform/ads/rewarded-ad.adapter.js`
- `app/state/machines/session.machine.ts`
- `app/state/selectors/session.selectors.ts`
- `app/ui/screens/GameShell.tsx`
- `app/tests/unit/session.machine.test.mjs`
- `app/tests/unit/rewarded-ad.adapter.test.mjs`
