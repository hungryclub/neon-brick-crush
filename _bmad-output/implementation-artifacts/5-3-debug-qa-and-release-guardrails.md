# Story 5.3: 디버그/QA 도구와 release guardrails 구현

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer or QA engineer,  
I want strong debug and failure simulation tools,  
So that branching gameplay flows can be validated quickly.

## Acceptance Criteria

1. Given the app is in a development build, when debug mode is activated, then
   the project must expose debug overlay, state inspection, ad simulation, save
   reset, and forced failure tools and these tools must stay behind explicit
   dev-only guards.
2. Given a production build is prepared, when release behavior is validated,
   then debug-only paths must not leak into release behavior and critical
   branches such as retry, reward, save failure, and unlock flows must remain
   observable through structured logs.

## Tasks / Subtasks

- [x] Add dev-only debug surfaces and state inspection hooks. (AC: 1)
  - [x] Expose a debug overlay or panel for session/progression/runtime inspection without making it part of release UI.
  - [x] Surface existing runtime profiler and critical selector data in a QA-friendly way.
  - [x] Keep all debug UI and commands behind explicit development guards.
- [x] Add simulation controls for critical branching flows. (AC: 1, 2)
  - [x] Provide ad simulation, save reset, forced failure, and reward flow toggles through typed debug commands rather than ad hoc globals.
  - [x] Reuse existing repository/machine/service boundaries so simulations exercise real orchestration paths.
  - [x] Keep failure simulations handled and reversible for repeated QA use.
- [x] Reinforce release guardrails around debug-only code. (AC: 2)
  - [x] Ensure production builds do not render or enable debug-only paths.
  - [x] Keep structured logs for retry, reward, save failure, unlock, and profiling flows observable even without debug UI.
  - [x] Avoid coupling release behavior to debug-only providers or overlays.
- [x] Verify QA and release-readiness behavior. (AC: 1, 2)
  - [x] Add focused tests for dev guard conditions and simulation command routing where practical.
  - [x] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [x] Manually verify debug tools appear only in development context and remain absent from release behavior.

## Dev Notes

### Story Intent

Story 5.3은 Epic 5의 마지막 단계로, 지금까지 구현한 gameplay, retry, reward,
save, feedback, performance 경계를 QA가 빠르게 검증할 수 있는 형태로 노출하되
release build에는 남지 않게 하는 작업이다. 핵심은 “숨겨진 디버그 버튼 몇 개”
추가가 아니라, dev-only guard와 structured observability를 함께 닫는 것이다.

### Epic Context

- Story 5.1이 감각 피드백 경계를 만들었고 Story 5.2가 pooling/perf
  instrumentation을 붙였다.
- Story 5.3은 이 기반을 활용해 QA/debug surface를 만들고 출시 전 guardrail을
  닫는다.
- 따라서 새 디버그 기능도 기존 machine/repository/runtime 경계를 재사용해야 한다.

### Story 5.3 Foundation

- User story: 개발자와 QA는 복잡한 branching flow를 수동으로 재현하기 위해 코드
  수정이나 콘솔 해킹에 의존하지 않아야 한다.
- Success criteria:
  - dev-only debug UI/command surface가 있다.
  - ad/retry/save/unlock/failure 같은 critical path를 시뮬레이션할 수 있다.
  - production build에는 debug path가 드러나지 않는다.
  - critical branch observability는 structured logs로 계속 남는다.

### Previous Story Intelligence

- Story 4.x에서 retry, reward, save, unlock, monetization 분기가 explicit state
  machine/repository/service 구조로 정리되었다.
- Story 5.2에서 runtime profiler와 structured perf logging이 생겼으므로, 이번
  Story 5.3은 이를 QA surface에 연결하는 것이 자연스럽다.
- Story 5.1~5.2 모두 release-safe boundary를 유지해왔으므로 debug tooling도
  그 규칙을 따라야 한다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일/경로:
  - `app/ui/screens/GameShell.tsx`
  - `app/ui/components/`
  - `app/state/machines/session.machine.ts`
  - `app/state/machines/monetization.machine.ts`
  - `app/platform/persistence/progression.repository.ts`
  - `app/game/scenes/StageScene.ts`
  - `app/game/perf/runtime-profiler.ts`
  - `app/shared/logging/create-logger.ts`
- 새로 생길 가능성이 높은 경로:
  - `app/debug/debug-flags.ts`
  - `app/debug/debug-command-bus.ts`
  - `app/ui/components/DebugOverlay.tsx`
  - `app/tests/unit/debug-flags.test.mjs`
  - `app/tests/unit/debug-command-bus.test.mjs`
- 이미 있는 유용한 기반:
  - session/progression/monetization machines
  - structured logging
  - runtime profiler
  - repository-backed save/reward flows

### Technical Requirements

- debug tooling은 development build에서만 접근 가능해야 한다.
- simulation command는 real machine/repository/runtime path를 통과해야 한다.
- release build는 debug overlay와 command surface를 노출하면 안 된다.
- critical branch observability는 logs만으로도 충분히 추적 가능해야 한다.

### Architecture Compliance Guardrails

- React는 debug presentation을 담당할 수 있지만, simulation 결과를 직접 mutation하면 안 된다.
- state machine/repository/service는 실제 orchestration을 유지한 채 debug input만 받아야 한다.
- Phaser runtime debug controls도 dev-only bridge나 command 경계 뒤에 있어야 한다.
- release code path가 debug module import에 묶이면 안 된다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/ui/screens/`
- `app/ui/components/`
- `app/state/machines/`
- `app/platform/persistence/`
- `app/game/scenes/`
- `app/shared/logging/`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/debug/debug-flags.ts`
- `app/debug/debug-command-bus.ts`
- `app/ui/components/DebugOverlay.tsx`
- `app/tests/unit/debug-flags.test.mjs`
- `app/tests/unit/debug-command-bus.test.mjs`

### Project Structure Notes

- 권장 흐름은 `dev flag -> debug command surface -> machine/repository/runtime command -> structured log`
  이다.
- Story 5.2의 profiler output은 debug overlay에서 읽을 수 있어도, release에서는
  overlay 없이 log 기반 관찰이 가능해야 한다.
- debug reset/save failure/ad simulation도 “shortcut mutation”이 아니라 기존 경로를
  재사용해야 회귀 검증 가치가 생긴다.

### Library / Framework Requirements

- existing XState explicit transitions를 유지한다.
- dev-only branching은 Vite/TypeScript 환경 변수 또는 명시적 debug flag helper로 관리한다.
- logs는 existing structured logger 계약을 따른다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - dev guard helper behavior
  - debug command routing through machines/repositories
  - release path exclusion smoke verification
  - retry/reward/save failure/unlock observability checks

### UX / Player-Facing Constraints

- 디버그 UI는 개발/QA에게는 빠르고 명확해야 하지만, 플레이어 release 경험에는 섞이면 안 된다.
- simulation control은 destructive 동작이라도 개발 환경 안에서는 되돌리기 쉽고 예측 가능해야 한다.
- debug overlay가 core HUD readability를 무너뜨리면 안 된다.

### Anti-Patterns To Avoid

- production build에서도 렌더되는 숨은 debug 버튼
- state mutation을 직접 때리는 shortcut debug handlers
- debug-only provider를 release 코드가 의존하는 구조
- structured log 없이 overlay에만 의존하는 QA tooling
- branch simulation을 위해 실제 orchestration 경계를 우회하는 구조

### Git Intelligence Summary

Story 5.2까지 오며 feedback, pooling, perf observability가 어느 정도 갖춰졌다.
Story 5.3은 이 기반 위에 dev-only debug tooling과 release guardrails를 얹어, QA가
핵심 분기를 빠르게 재현하면서도 production에는 그 흔적이 남지 않도록 닫는
단계다.

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `debug commands = dev-only orchestration inputs`
- `logs = release-safe observability`

## Completion Notes

- Added dev-only debug flag and typed debug command bus for rewarded ad, purchase, forced failure, and save reset simulation.
- Added a React debug overlay that surfaces session/runtime state plus the latest runtime profiler snapshot without exposing the panel in release builds.
- Extended the runtime bridge and `StageScene` so QA commands can force failure and inspect last-turn profile data through structured snapshots.
- Routed rewarded ad and purchase adapters through debug simulation state so QA can exercise real machine/service flows without ad hoc global mutations.
- Added focused unit coverage for debug flag resolution and default debug simulation state, then re-ran app verification commands.
