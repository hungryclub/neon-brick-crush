# Story 2.3: 게이트/피버 조합과 시그니처 피드백 구현

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want gate and fever combinations to feel explosive but readable,
so that the game's signature moments stay memorable and fair.

## Acceptance Criteria

1. Given a turn includes both gate effects and active fever, when the resolver
   finalizes the result, then combined outcomes must follow the fixed modifier
   order, and structured logs must capture the branch for debugging.
2. Given a high-impact combined result occurs, when feedback is emitted, then
   VFX, SFX, and haptics must trigger through dedicated feedback boundaries,
   and hot runtime loops must avoid avoidable allocations.

## Tasks / Subtasks

- [ ] Complete the combined gate+fever resolver path. (AC: 1)
  - [ ] Extend the Story 2.1/2.2 modifier pipeline so gate and fever can both
        contribute to the same finalized result without breaking order.
  - [ ] Preserve explicit `base -> gate -> fever -> finalize` trace data for
        debugging and tests.
  - [ ] Ensure combined outcomes remain deterministic for identical inputs.
- [ ] Add structured combo branch logging for debugging. (AC: 1)
  - [ ] Emit logs that distinguish gate-only, fever-only, and gate+fever combo
        branches.
  - [ ] Keep logs tied to finalized resolver output rather than Scene guesses.
  - [ ] Avoid broad ad hoc logging from hot collision loops.
- [ ] Introduce a dedicated gameplay feedback boundary for combo moments. (AC: 2)
  - [ ] Create or extend an effect/feedback layer that consumes finalized result
        data and emits VFX/SFX/haptics triggers.
  - [ ] Keep resolver output framework-light and feedback handling out of the
        core turn calculation.
  - [ ] Ensure Scene only plays back structured feedback events.
- [ ] Make high-impact combo feedback feel readable and performant. (AC: 2)
  - [ ] Differentiate combo feedback from gate-only or fever-only moments with
        stronger but still readable signals.
  - [ ] Reuse/pool transient effect objects or keep feedback lightweight enough
        to avoid avoidable allocations in hot loops.
  - [ ] Preserve mobile-first readability under fast repeated turns.
- [ ] Add focused tests and verification for combo order, logging, and feedback.
      (AC: 1, 2)
  - [ ] Add resolver tests covering gate-only, fever-only, and gate+fever combo
        outcomes.
  - [ ] Add at least one test around structured combo logs or feedback payloads.
  - [ ] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [ ] Manually verify: combo moments look stronger than single-modifier turns
        and remain readable on the runtime shell.

## Dev Notes

### Story Intent

Story 2.3은 Epic 2의 시그니처 순간을 완성하는 단계다. Story 2.1이 gate pipeline을,
Story 2.2가 fever ownership과 activation flow를 열었다면, 이번 스토리는 둘이
동시에 걸리는 고임팩트 상황을 "폭발적이지만 읽을 수 있게" 마무리해야 한다.

핵심은 두 가지다. 첫째, combined result가 여전히 `base -> gate -> fever ->
finalize` 순서를 지켜야 한다. 둘째, 그 결과에 대한 VFX/SFX/haptics는 core
resolver가 아니라 dedicated feedback boundary에서 처리되어야 한다.

### Epic Context

- Epic 2의 목표는 게이트와 수동 피버가 함께 작동할 때 이 게임만의 정체성이
  느껴지게 만드는 것이다.
- Story 2.3은 Epic 2의 마감 스토리로, gate/fever 단일 기능을 "조합 경험"으로
  끌어올리는 역할을 한다.
- GDD 기준 좋은 샷, 피버, 연쇄 파괴 순간은 강하게 기억에 남아야 하지만,
  결과가 unfair하거나 unreadable하게 느껴지면 안 된다.

### Story 2.3 Foundation

- User story: 플레이어는 게이트와 피버가 겹치는 순간이 폭발적이지만 공정하고
  읽기 쉽게 느껴져야 한다.
- Success criteria:
  - combined turn 결과는 fixed modifier order를 따른다.
  - structured logs가 combo branch를 남긴다.
  - VFX/SFX/haptics는 feedback boundary를 통해 발생한다.
  - hot runtime loops에서 avoidable allocation을 만들지 않는다.

### Previous Story Intelligence

Story 2.1과 2.2에서 필요한 기반이 이미 준비되었다.

- `turn-resolver.ts`는 `base -> gate -> fever -> finalize` trace를 가진다.
- `gate-modifier-pipeline.ts`는 gate feedback과 fever feedback을 plain data로 반환한다.
- `session.machine.ts`는 fever readiness/activation을 소유한다.
- `GameRuntimeBridge`는 turn resolved payload와 fever activation command를 오간다.
- `StageScene.ts`는 gate/fever feedback playback을 시작했지만, 아직 dedicated
  feedback/effects 경계는 없다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일:
  - `app/game/mechanics/gate-modifier-pipeline.ts`
  - `app/game/systems/turn-resolver.ts`
  - `app/game/scenes/StageScene.ts`
  - `app/game/hud-bridges/game-runtime-bridge.ts`
  - `app/shared/logging/create-logger.ts`
- 새로 생길 가능성이 높은 경로:
  - `app/game/effects/turn-feedback-emitter.ts`
  - `app/game/effects/combo-feedback-pool.ts`
  - `app/tests/unit/turn-feedback-emitter.test.mjs`
- 이미 있는 유용한 기반:
  - modifier trace data
  - gate/fever feedback event payloads
  - structured logger usage in `StageScene.ts`

### Technical Requirements

- modifier 적용 순서는 항상 `base -> gate -> fever -> finalize`로 유지한다.
- resolver는 framework-light plain data를 반환해야 한다.
- feedback playback은 dedicated boundary에서 처리해야 한다.
- hot loop에서 반복 생성되는 transient VFX는 pooling 또는 equivalent lightweight
  reuse 전략을 고려한다.
- debug용 structured logs는 branch distinction이 가능해야 한다.

### Architecture Compliance Guardrails

- `TurnResolver`는 combined result 계산만 담당한다.
- `EffectEmitter` 또는 이에 준하는 계층은 finalized result로부터 VFX/SFX/haptics
  trigger를 만든다.
- Scene는 feedback payload를 소비할 뿐 combo 계산을 다시 하지 않는다.
- debug/logging은 finalized branch를 기준으로 남기고, collision loop 중간 추측
  로그를 남발하지 않는다.
- XState session ownership rules는 유지하고, Story 2.3에서 fever truth를 runtime이나
  UI 쪽으로 옮기지 않는다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/game/mechanics/gate-modifier-pipeline.ts`
- `app/game/systems/turn-resolver.ts`
- `app/game/scenes/StageScene.ts`
- `app/game/hud-bridges/game-runtime-bridge.ts`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/game/effects/turn-feedback-emitter.ts`
- `app/game/effects/combo-feedback-pool.ts`
- `app/tests/unit/turn-feedback-emitter.test.mjs`

### Project Structure Notes

- 올바른 구조는 `resolver combo result -> feedback payload -> effect emitter ->
  runtime playback`이다.
- Scene에서 `if gate && fever then ...` 식의 직접 조합 분기를 늘리는 방향은 피해야 한다.
- Story 2.3이 끝나면 Epic 2는 “차별점이 실제로 느껴지는 vertical slice”에 가까워져야 한다.

### Library / Framework Requirements

- Phaser는 runtime playback 계층 역할만 유지한다.
- XState는 fever activation truth를 계속 소유한다.
- React/HUD는 selector 기반 표시만 유지한다.
- structured logging은 existing logger helper를 재사용한다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - gate-only / fever-only / combo turn 비교 테스트
  - combo branch structured log 확인
  - feedback emitter가 core resolver와 분리되어 있는지 확인
  - runtime shell에서 combo 피드백 가독성 수동 확인

### UX / Player-Facing Constraints

- combo 순간은 분명히 더 강해야 하지만, 화면이 과도하게 지저분해지면 안 된다.
- 플레이어가 "왜 강한 결과가 났는지" 읽을 수 있어야 한다.
- mobile-first readability를 해치지 않도록 빛/흔들림/진동을 조절해야 한다.
- 시그니처 피드백은 기억에 남아야 하지만 반복 플레이에서 피로감을 주면 안 된다.

### Anti-Patterns To Avoid

- Scene 내부에서 combo 계산과 feedback를 함께 얽어버리는 구조
- resolver가 Phaser API나 effect 객체를 직접 다루는 구조
- combo 순간마다 transient object를 무분별하게 새로 생성하는 구조
- structured log 없이 branch를 추적하기 어렵게 만드는 구조
- Story 2.1/2.2에서 만든 ownership 경계를 무너뜨리는 구조

### Git Intelligence Summary

최근 흐름은 Story 2.1 gate modifier pipeline과 Story 2.2 fever meter/manual activation이
구현 및 리뷰까지 마무리된 상태다. 따라서 Story 2.3은 "둘을 조합한 결과"와
"그 결과의 시그니처 피드백"을 정리하는 Epic 2의 마감 작업이다.

최근 관련 커밋:

- `3770ac7` `[Execution] Dave: Story 2.2 리뷰 패치 반영`
- `1056ea5` `[Execution] Dave: Story 2.2 피버 게이지와 수동 발동 구현`
- `c1192fe` `[Execution] Dave: Story 2.1 리뷰 패치 반영`

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `Zustand = lightweight UI/view state only`
- Modifier resolution order is fixed: `base -> gate -> fever -> finalize`
- VFX는 판정 계층이 아니라 피드백 계층에서 처리
- Pool high-frequency transient objects when possible

### References

- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/stories.md` - `Story 2.3: 게이트/피버 조합과 시그니처 피드백 구현`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/2-1-gate-modifier-pipeline.md` - `Completion Notes`, `Anti-Patterns To Avoid`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/2-2-fever-meter-and-manual-activation.md` - `Completion Notes`, `Project Structure Notes`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md` - `게이트 / 피버 조합 패턴`, `EffectEmitter`, `Creation: Factory + pooling`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md` - `피버 발동`, `VFX`, `오디오 방향`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md` - `Performance Rules`, `Critical Don't-Miss Rules`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/mechanics/gate-modifier-pipeline.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/scenes/StageScene.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/systems/turn-resolver.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story 2.3 context generated from the Story 2.3 story entry, GDD signature
  feedback expectations, architecture feedback/pooling guidance, and the current
  gate+fever implementation state from Stories 2.1 and 2.2.
- Existing code inspection confirmed combo data already exists in resolver
  outputs, but a dedicated feedback boundary is still the main missing piece.

### Completion Notes List

- Prepared Story 2.3 as the Epic 2 capstone focused on combined branch
  correctness, structured logs, and dedicated feedback boundaries.
- Fixed the implementation guardrails so combo moments can be intensified
  without pushing VFX/SFX/haptics logic back into the core resolver.

