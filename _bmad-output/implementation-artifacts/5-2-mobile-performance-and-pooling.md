# Story 5.2: 모바일 성능 예산과 pooling 최적화 구현

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,  
I want the game to stay responsive during intense moments,  
So that impact never causes frustrating slowdown.

## Acceptance Criteria

1. Given ball, impact, particle, or transient VFX objects are used repeatedly,
   when they are created during gameplay, then pooling must be applied where
   the architecture requires it and hot loops must avoid repeated allocation.
2. Given the game is profiled in mobile-like conditions, when chain reactions or
   fever spikes occur, then the architecture must provide enough
   instrumentation to inspect the cost and the implementation must preserve
   input responsiveness over decorative effects.

## Tasks / Subtasks

- [x] Apply pooling to repeated runtime objects and transient feedback playback. (AC: 1)
  - [x] Audit ball, impact ring, gate halo, and other transient feedback objects that can be reused instead of recreated.
  - [x] Convert repeated gameplay/runtime allocations into reusable pool or ring-buffer style playback paths where the architecture expects pooling.
  - [x] Keep pooling ownership inside runtime/effects layers rather than leaking lifecycle concerns into resolver or React code.
- [x] Remove avoidable hot-loop allocations and repeated per-turn churn. (AC: 1)
  - [x] Review `StageScene` update/turn resolution paths for repeated object creation, array churn, or avoidable temporary structures.
  - [x] Preserve current gameplay behavior while tightening allocation-heavy paths.
  - [x] Prefer readability-preserving caps or degraded decorative behavior over expensive burst effects on constrained devices.
- [x] Add lightweight performance instrumentation for mobile-like inspection. (AC: 2)
  - [x] Expose structured timing or counters around heavy turn-resolution and feedback playback phases.
  - [x] Capture enough debug information to inspect chain-reaction and fever spikes without shipping intrusive overlays yet.
  - [x] Keep instrumentation dev-friendly and compatible with Story 5.3 debug tooling work.
- [x] Verify responsiveness under stress. (AC: 1, 2)
  - [x] Add focused unit coverage for pooling or perf helper behavior where practical.
  - [x] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [x] Manually smoke-check preview behavior under repeated shots and high-impact feedback moments.

## Dev Notes

### Story Intent

Story 5.2는 Story 5.1에서 만든 네온 피드백/오디오 베이스를 실제 모바일 성능
예산 관점에서 다듬는 단계다. 목표는 “더 화려한 연출”이 아니라, 반복 생성되는
ball, impact, transient feedback, chain-reaction 순간의 비용을 줄여서 입력
반응성과 가독성을 지키는 것이다.

### Epic Context

- Epic 5는 출시 전 품질 완성을 목표로 한다.
- Story 5.1이 감각 피드백 경계를 정리했고, Story 5.2는 그 경계를 성능적으로
  안전하게 만든다.
- Story 5.3은 이후 debug/QA/release guardrails를 추가하므로, 이번 단계의
  instrumentation은 Story 5.3의 기반이 된다.

### Story 5.2 Foundation

- User story: 플레이어는 콤보, 피버, 연쇄 반응처럼 화면이 바빠지는 순간에도
  게임이 버벅이지 않고 조작이 즉시 반응해야 한다.
- Success criteria:
  - pooling이 필요한 반복 객체는 재사용 경로를 갖는다.
  - hot loop에서 avoidable allocation이 줄어든다.
  - mobile-like stress 상황에서 inspection 가능한 instrumentation이 생긴다.
  - decorative effect보다 input responsiveness가 우선된다.

### Previous Story Intelligence

- Story 2.3에서 hot runtime loop allocation을 피하라는 가드레일이 이미 있었다.
- Story 5.1에서 `neon-feedback-layer.ts`, `neon-feedback-plan.ts`,
  `game-audio.adapter.ts`가 추가되며 effect planning과 playback가 분리되었다.
- 이제 Story 5.2는 이 구조를 기반으로, repeated VFX object와 transient burst를
  pooled/reused path로 바꾸는 작업이 자연스럽다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일/경로:
  - `app/game/scenes/StageScene.ts`
  - `app/game/effects/neon-feedback-layer.ts`
  - `app/game/effects/neon-feedback-plan.ts`
  - `app/game/effects/turn-feedback-emitter.ts`
  - `app/platform/audio/game-audio.adapter.ts`
  - `app/shared/logging/create-logger.ts`
- 새로 생길 가능성이 높은 경로:
  - `app/game/effects/effect-pool.ts`
  - `app/game/perf/runtime-profiler.ts`
  - `app/tests/unit/effect-pool.test.mjs`
  - `app/tests/unit/runtime-profiler.test.mjs`
- 이미 있는 유용한 기반:
  - `StageScene`의 runtime-only ownership
  - `neon-feedback-layer.ts`의 pulse pool 초안
  - structured logger와 feedback command boundary

### Technical Requirements

- pooling은 architecture가 요구한 ball, impact effect, particle effect,
  transient VFX 우선순위를 따른다.
- perf instrumentation은 gameplay semantics를 바꾸지 않고 비용 관찰만 돕는
  방향이어야 한다.
- chain reaction이나 fever spike 중에도 input responsiveness를 우선 보장해야 한다.
- 성능이 부족하면 decorative layer를 낮추는 degrade path가 허용된다.

### Architecture Compliance Guardrails

- resolver는 계속 framework-light해야 하며 pooling lifecycle을 직접 알면 안 된다.
- Phaser Scene과 effects layer는 runtime object reuse를 소유할 수 있지만,
  React/XState가 object pool lifecycle을 알면 안 된다.
- profiling/logging은 shared/platform style의 structured output을 유지해야 한다.
- perf optimization이 gameplay rule correctness를 바꾸면 안 된다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/game/scenes/`
- `app/game/effects/`
- `app/game/systems/`
- `app/shared/logging/`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/game/effects/effect-pool.ts`
- `app/game/perf/runtime-profiler.ts`
- `app/tests/unit/effect-pool.test.mjs`
- `app/tests/unit/runtime-profiler.test.mjs`

### Project Structure Notes

- 권장 흐름은 `resolver output -> feedback plan -> pooled playback -> structured perf log`
  이다.
- Story 5.1에서 이미 만들어진 `neon-feedback-layer.ts`의 ring pool은 더 일반화되거나,
  effect-specific reusable path로 재구성될 수 있다.
- instrumentation은 release-only UI가 아니라 logger/counter 중심으로 두고,
  시각 디버그 surface는 Story 5.3에서 여는 편이 안전하다.

### Library / Framework Requirements

- Phaser runtime object reuse와 tween reuse 가능성을 우선 검토한다.
- typed command/result 및 structured logging 관례를 유지한다.
- 테스트는 Node 환경에서 가능한 순수 helper/profiler 경계를 우선 검증한다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - effect pool reuse behavior
  - perf counter/timing helper correctness
  - repeated shot/feedback stress smoke verification
  - mobile-like preview responsiveness check

### UX / Player-Facing Constraints

- 성능 저하 상황에서는 연출을 줄이더라도 입력 반응성과 정보 가독성을 지켜야 한다.
- 연출 축소가 일어나더라도 gate/fever/combo의 상태 구분은 계속 읽혀야 한다.
- 모바일에서 프레임 저하를 유발하는 과도한 burst는 허용하지 않는다.

### Anti-Patterns To Avoid

- hot update loop에서 새 배열/객체를 반복 생성하는 구조
- performance instrumentation이 Scene/UI를 잡아먹는 과한 overlay가 되는 구조
- pooling을 위해 gameplay correctness를 희생하는 구조
- React/XState에 runtime object lifecycle 최적화를 밀어 넣는 구조
- 성능 문제를 감추기 위해 무조건 effect를 제거해 정체성을 잃는 구조

### Git Intelligence Summary

Story 5.1까지 오며 feedback/audio 경계는 정리되었지만, 현재 성능 안정화는 아직
명시적으로 닫히지 않았다. Story 5.2는 그 경계를 바탕으로 reuse, pooling,
instrumentation을 붙여 실제 모바일 환경에서도 감각 연출이 조작성을 해치지 않게
만드는 단계다.

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `effects/perf helpers = runtime optimization only`
- `rule systems = data/decision only`

## Completion Notes

### GPT-5 Codex

- Added `effect-pool.ts` so transient runtime effects now use a reusable lease-based pool helper instead of ad hoc per-layer slot rotation.
- Added `runtime-profiler.ts` and wired `StageScene.ts` to emit structured turn-performance logs for resolve, render, and feedback playback phases.
- Added an impact-visual cap per turn so decorative burst effects degrade before input responsiveness and core readability do.
- Added unit coverage for pool lease invalidation and runtime profiler aggregation.
