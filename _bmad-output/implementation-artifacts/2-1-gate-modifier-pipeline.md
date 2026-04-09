# Story 2.1: 게이트 modifier 파이프라인 구현

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want shots routed through gates to change outcome predictably,
so that I can plan higher-skill shots.

## Acceptance Criteria

1. Given a turn result is being resolved, when the shot intersects a gate, then
   gate logic must run through the modifier pipeline in the fixed order
   `base -> gate -> fever -> finalize`, and the Scene must not manually reorder
   modifier execution.
2. Given a gate-modified turn is finalized, when feedback is emitted, then
   gate-specific visual and audio events must be emitted from the feedback layer,
   and the base turn resolver must remain framework-light and testable.

## Tasks / Subtasks

- [x] Introduce a gate-aware modifier pipeline around the current turn resolver.
      (AC: 1, 2)
  - [x] Split the existing turn resolution into explicit phases that preserve the
        fixed order `base -> gate -> fever -> finalize`.
  - [x] Keep modifier logic in resolver/mechanics modules, not in
        `StageScene.ts`.
  - [x] Preserve deterministic output for identical inputs so unit tests remain
        stable.
- [x] Add the first gate effect as a pipeline-applied modifier. (AC: 1)
  - [x] Define a minimal gate contract and context shape that the resolver can
        consume without Phaser object references.
  - [x] Ensure gate application is data-driven enough to extend for later worlds
        and gate types.
  - [x] Prevent Scene-local ad hoc branching that changes modifier order.
- [x] Route gate feedback through a dedicated result/feedback layer. (AC: 2)
  - [x] Extend turn result output so finalized gate interactions emit explicit
        feedback events or payloads.
  - [x] Keep the base turn resolver framework-light by returning plain data,
        leaving Scene to only render/apply the emitted feedback.
  - [x] Prepare hooks for later VFX/SFX integration without requiring real
        assets in this story.
- [x] Wire the runtime to consume finalized gate results safely. (AC: 1, 2)
  - [x] Update `StageScene.ts` to pass gate context into the resolver through a
        single entry path.
  - [x] Ensure Scene consumes finalized output only and does not re-run gate
        logic after resolve.
  - [x] Keep HUD/runtime bridge updates consistent with the resolved turn result.
- [x] Add focused tests and verification for gate ordering and feedback output.
      (AC: 1, 2)
  - [x] Add unit tests for fixed modifier order and deterministic gate results.
  - [x] Add at least one test proving finalized gate feedback is emitted as data
        rather than Scene-owned branching.
  - [x] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [x] Manually verify: a gate-routed shot produces the expected outcome and no
        Scene-side modifier reordering is needed.

## Dev Notes

### Story Intent

Story 2.1은 Epic 2의 시작점으로, 기존 브릭 파괴 턴 해석에 `게이트 modifier`
계층을 붙여 이 게임의 차별점인 "샷 설계"를 시스템적으로 열어 주는 단계다.
핵심은 게이트 효과 자체보다도, 앞으로 피버와 월드별 기믹을 얹을 수 있는
`고정 순서 modifier pipeline`을 먼저 만드는 것이다.

이번 스토리에서는 Scene가 충돌 순간마다 임의 계산을 덧대는 구조를 피해야
한다. 게이트와 피버는 모두 코어 턴 판정 위에 올라가는 modifier이므로,
Resolver 계층이 순서를 소유하고 Scene은 결과만 소비해야 한다.

### Epic Context

- Epic 2의 목표는 게이트와 피버를 통해 "익숙한 브릭브레이커"를
  "샷을 설계하는 퍼즐 아케이드"로 끌어올리는 것이다.
- Story 2.1은 피버보다 먼저 게이트 파이프라인을 도입해 후속 Story 2.2, 2.3의
  조합 기반을 만드는 작업이다.
- GDD 기준 게이트는 단순 보너스가 아니라, 플레이어가 읽고 노릴 수 있는 전략
  장치여야 한다.

### Story 2.1 Foundation

- User story: 플레이어는 게이트를 거친 샷이 예측 가능하게 결과를 바꿔야 한다.
- Success criteria:
  - 턴 해석이 항상 `base -> gate -> fever -> finalize` 순서를 따른다.
  - Scene는 modifier 순서를 직접 조합하거나 바꾸지 않는다.
  - gate-modified 결과는 feedback layer용 plain data를 함께 반환한다.
  - base resolver는 Phaser 의존성 없이 테스트 가능한 상태를 유지한다.

### Previous Story Intelligence

Epic 1에서 이미 중요한 코어 루프 기반이 완성되었다.

- `StageScene.ts`는 aim/shoot/turn 루프, 실패 감지, runtime bridge 연결을 소유한다.
- `turn-resolver.ts`는 현재 보드 하강, 신규 row spawn, loss line 판단을
  framework-light하게 처리한다.
- retry/rewarded retry는 XState와 runtime bridge 경계로 분리되어 있으므로,
  Story 2.1은 세션 오케스트레이션보다 "턴 판정 구조"를 확장하는 데 집중하면 된다.
- 현재 `app/game`에는 `mechanics/aim-shot-controller.ts`, `systems/turn-resolver.ts`,
  `entities/stage-board.ts` 정도만 있으므로, 게이트 파이프라인은 이 구조를
  해치지 않는 방향으로 추가되어야 한다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일:
  - `app/game/systems/turn-resolver.ts`
  - `app/game/scenes/StageScene.ts`
  - `app/game/entities/stage-board.ts`
  - `app/game/hud-bridges/game-runtime-bridge.ts`
- 새로 생길 가능성이 높은 경로:
  - `app/game/mechanics/gate-modifier-pipeline.ts`
  - `app/game/mechanics/gate-feedback.ts`
  - `app/game/entities/gate-*.ts`
  - `app/tests/unit/gate-modifier-pipeline.test.mjs`
- 이미 있는 유용한 기반:
  - deterministic turn resolver tests
  - runtime bridge로 전달되는 plain HUD snapshot
  - StageScene가 runtime 결과를 React/XState와 분리해 소비하는 구조

### Technical Requirements

- modifier 적용 순서는 항상 `base -> gate -> fever -> finalize`로 고정한다.
- Scene는 modifier 순서를 직접 조합하지 않는다.
- modifier는 가능한 한 순수 함수 형태를 우선한다.
- recoverable branch는 data/result 중심으로 반환하고, gameplay code 안에서
  불필요한 예외 흐름을 만들지 않는다.
- `app/`가 유일한 실행 루트이며 테스트/빌드도 여기서 수행한다.

### Architecture Compliance Guardrails

- `TurnResolver`는 기본 턴 판정 해석을 소유한다.
- `GateModifierPipeline`은 gate effect 적용만 담당한다.
- `FeverModifierPipeline`은 아직 본격 구현 전이지만, Story 2.1에서도 순서상
  자리와 확장 포인트는 보존해야 한다.
- `EffectEmitter` 또는 이에 준하는 feedback payload는 finalized result를 기반으로
  VFX/SFX 트리거 데이터를 만들어야 한다.
- Scene는 gate effect를 다시 계산하지 않고 finalized output만 소비한다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/game/systems/turn-resolver.ts`
- `app/game/scenes/StageScene.ts`
- `app/game/entities/stage-board.ts`
- `app/game/mechanics/`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/game/mechanics/gate-modifier-pipeline.ts`
- `app/game/mechanics/gate-feedback.ts`
- `app/tests/unit/gate-modifier-pipeline.test.mjs`

파일 추가 여부는 구현 중 판단할 수 있지만, gate effect를 `StageScene` 안의
Phaser object branching으로 직접 넣는 방향은 피해야 한다.

### Project Structure Notes

- Story 2.1은 세션 상태 머신보다 runtime turn-resolution 계층 변화가 중심이다.
- 올바른 구조는 `shot context -> base resolve -> gate modifiers -> fever slot ->
  finalize -> feedback payload`다.
- Story 2.2의 피버, Story 2.3의 게이트/피버 조합은 이번 스토리의 pipeline shape를
  그대로 재사용할 수 있어야 한다.

### Library / Framework Requirements

- Phaser는 runtime 표현과 collision source 제공까지만 담당한다.
- XState/Zustand ownership rules는 Story 2.1에서 새 truth source를 만들지 않도록
  그대로 유지한다.
- core modifier 계산은 engine-agnostic plain data 중심으로 유지한다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - 같은 입력에서 같은 gate-modified 결과가 재현되는지
  - modifier 순서가 `base -> gate -> fever -> finalize`로 고정되는지
  - Scene이 gate effect를 직접 재해석하지 않아도 결과/feedback이 충분한지
  - 수동으로 gate-routed shot의 결과와 feedback 반응을 확인하는지

### UX / Player-Facing Constraints

- 게이트는 "왜 결과가 바뀌었는지" 플레이어가 읽을 수 있어야 한다.
- 결과가 화려해도 무작위처럼 느껴지면 안 되고, 노린 샷이라는 감각이 살아야 한다.
- 이번 스토리에서는 실제 완성형 VFX/SFX보다도, 후속 피드백 계층이 소비할 수 있는
  명확한 이벤트 데이터 shape를 만드는 것이 더 중요하다.

### Anti-Patterns To Avoid

- `StageScene.ts` 안에서 gate/fever 순서를 직접 조합하는 구조
- `turn-resolver.ts`가 Phaser 객체나 Scene 참조를 직접 받는 구조
- gate effect와 feedback emission이 섞여 테스트 어려움이 커지는 구조
- feature별로 modifier 순서를 바꾸는 구조
- Story 2.2/2.3 확장 전에 fever placeholder를 제거해버리는 구조

### Git Intelligence Summary

최근 흐름은 Epic 1의 aim/shoot 루프, 실패/즉시 재도전, 광고 재도전까지 마무리된
상태다. Story 2.1은 그 위에 게이트 중심의 턴 판정 변주를 추가하는 첫 Epic 2
작업이며, 아직 `app/game/mechanics`와 `turn-resolver` 쪽에 dedicated gate
pipeline은 없다.

최근 관련 커밋:

- `cf698a0` `[Execution] Dave: Story 1.4 리뷰 패치 반영`
- `ab35505` `[Execution] Dave: Story 1.4 광고 재도전 흐름 구현`
- `3fd10b5` `[Execution] Dave: Story 1.3 리뷰 패치 반영`

### Project Context Rules

- `Phaser = runtime only`
- `XState = single source of truth`
- `React = presentation only`
- `Zustand = lightweight UI/view state only`
- Modifier resolution order is fixed: `base -> gate -> fever -> finalize`
- Do not change modifier order per feature/file

### References

- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/stories.md` - `Story 2.1: 게이트 modifier 파이프라인 구현`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md` - `게이트 / 피버 조합 패턴`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md` - `게이트 변환`, `핵심 루프`, `Epic 2`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md` - `Performance Rules`, `Critical Don't-Miss Rules`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/systems/turn-resolver.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/scenes/StageScene.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/entities/stage-board.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story 2.1 context generated from `stories.md`, architecture modifier pipeline
  section, project context rules, and current `app/game` runtime structure.
- Existing code review confirmed current turn resolution is framework-light and
  suitable for pipeline extraction before fever is introduced.
- `npm run test`, `npm run typecheck`, and `npm run build` all passed after
  adding the gate modifier pipeline, Scene gate wiring, and feedback payloads.
- The first gate effect is implemented as a `spawn-clear` modifier that removes
  the highest-priority spawned top-row block when the shot path intersects a
  gate zone.

### Completion Notes List

- Prepared Story 2.1 as the Epic 2 entry point focused on pipeline order,
  resolver purity, and feedback payload boundaries.
- Fixed the implementation guardrails so future fever work can plug into the
  same resolver path without Scene-side reordering.
- Added `stage-gates`, `gate-modifier-pipeline`, and turn resolver trace/feedback
  data so `StageScene` now consumes finalized output rather than recomputing gate
  behavior.
- Rendered gate zones in the runtime and hooked feedback playback to emitted
  resolver events as lightweight VFX placeholders.

### File List

- app/game/entities/stage-gates.ts
- app/game/mechanics/gate-modifier-pipeline.ts
- app/game/mechanics/gate-modifier-pipeline.js
- app/game/systems/turn-resolver.ts
- app/game/scenes/StageScene.ts
- app/tests/unit/turn-resolver.test.mjs
