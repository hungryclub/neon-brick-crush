# Story 5.1: 네온 피드백 레이어와 오디오 베이스 구현

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,  
I want impactful audiovisual feedback on key moments,  
So that strong shots feel memorable.

## Acceptance Criteria

1. Given runtime events such as hit, gate trigger, or fever activation occur,
   when feedback is emitted, then VFX, SFX, and vibration hooks must be
   triggered from dedicated feedback boundaries and gameplay rule code must stay
   separate from presentation effects.
2. Given the app is running on constrained devices, when feedback is applied,
   then baseline effects must preserve readability first and heavy transient
   effects must use pooling-friendly patterns.

## Tasks / Subtasks

- [x] Add a dedicated neon feedback layer on top of the existing feedback plan boundary. (AC: 1, 2)
  - [x] Keep gameplay systems producing plain feedback data or commands rather than Scene-local VFX logic.
  - [x] Translate key runtime moments such as hits, gate triggers, fever activation, and combo bursts into readable neon visual playback.
  - [x] Ensure baseline visual feedback still reads cleanly on smaller mobile screens before adding stronger accent effects.
- [x] Add a platform audio base adapter and cue mapping. (AC: 1, 2)
  - [x] Create an audio boundary under `app/platform/audio/` so Scene/UI code does not talk to Phaser/Web Audio directly.
  - [x] Map existing feedback commands to lightweight SFX cues and optional vibration hooks.
  - [x] Keep unsupported audio or haptic environments on handled no-op paths.
- [x] Preserve pooling-friendly and low-allocation playback patterns. (AC: 2)
  - [x] Reuse existing effect objects or lightweight playback plans where possible instead of allocating new transient structures in hot loops.
  - [x] Keep heavier burst effects behind explicit, reusable playback helpers that can evolve into pooled objects in Story 5.2.
  - [x] Avoid moving effect decision logic into resolver or XState layers.
- [x] Add focused verification for feedback boundary correctness. (AC: 1, 2)
  - [x] Add unit coverage for feedback plan to neon/audio command translation.
  - [x] Add unit coverage for audio adapter handled fallback behavior.
  - [x] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [x] Manually verify key moments remain readable on mobile-sized viewport conditions.

## Dev Notes

### Story Intent

Story 5.1은 Epic 5의 첫 단계로, 이미 만들어진 gate/fever feedback command 구조 위에
게임다운 감각 레이어를 얹는 작업이다. 핵심은 “멋진 연출 추가”보다도,
gameplay rule code와 presentation effect code를 다시 섞지 않으면서 네온 VFX,
오디오, 진동 hook를 dedicated boundary로 정리하는 것이다.

### Epic Context

- Epic 5의 목표는 출시 직전 품질 완성이다.
- Story 5.1은 감각 피드백 경계를 닫고, Story 5.2가 pooling/성능 최적화를,
  Story 5.3이 debug/QA/release guardrails를 담당한다.
- 따라서 이번 단계는 full polish보다도 reusable feedback/audio base를 안전하게
  도입하는 것이 우선이다.

### Story 5.1 Foundation

- User story: 플레이어는 강한 샷, 게이트, 피버 같은 핵심 순간이 시청각적으로
  더 기억에 남아야 한다.
- Success criteria:
  - runtime event는 dedicated feedback boundary를 통해서만 VFX/SFX/진동으로 변환된다.
  - rule resolver, Scene gameplay rule, state machine은 presentation effect를 직접 다루지 않는다.
  - constrained device에서도 baseline readability가 먼저 보장된다.
  - heavier transient effect는 pooling-friendly한 구조를 향해 가야 한다.

### Previous Story Intelligence

- Story 2.3에서 `turn-feedback-emitter.ts`가 gate/fever/combo를 structured
  feedback command로 바꾸는 dedicated boundary를 이미 만들었다.
- Story 2.1~2.3에서 hot runtime loop allocation과 dedicated feedback separation이
  반복해서 강조되었으므로, 이번 Story 5.1도 그 규칙을 유지해야 한다.
- Story 4.x에서 external adapter/service boundary 패턴이 정리되었기 때문에,
  오디오도 Scene 직결 대신 platform adapter로 여는 편이 자연스럽다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일/경로:
  - `app/game/effects/turn-feedback-emitter.ts`
  - `app/game/scenes/StageScene.ts`
  - `app/shared/logging/create-logger.ts`
- 새로 생길 가능성이 높은 경로:
  - `app/game/effects/neon-feedback-layer.ts`
  - `app/platform/audio/game-audio.adapter.ts`
  - `app/platform/audio/game-audio.adapter.js`
  - `app/tests/unit/neon-feedback-layer.test.mjs`
  - `app/tests/unit/game-audio.adapter.test.mjs`
- 이미 있는 유용한 기반:
  - `turn-feedback-emitter.ts`의 structured command plan
  - gate/fever/combo branch logging
  - React/Phaser/XState 책임 분리

### Technical Requirements

- runtime feedback는 existing plan/command boundary를 확장하는 방식으로 구현한다.
- 오디오는 `app/platform/audio/` 경계 뒤에 두고 Phaser/Web Audio specifics를 캡슐화한다.
- haptic hook는 지원 환경에서는 작동하고, 미지원 환경에서는 handled no-op여야 한다.
- baseline neon effect는 readability-first여야 하며 과한 화면 가림을 피해야 한다.
- transient effect playback는 pooling-friendly design을 유지해야 한다.

### Architecture Compliance Guardrails

- resolver는 여전히 framework-light해야 하며 VFX/SFX object creation을 직접 알면 안 된다.
- Phaser Scene은 effect playback orchestration은 할 수 있지만 gameplay rule 결정과 effect 판단을 동시에 소유하면 안 된다.
- React는 effect playback를 직접 하지 말고 presentation/HUD 역할에 머물러야 한다.
- audio/haptic contact는 `app/platform` 경계 안에서만 일어나야 한다.
- feedback layers는 final command/plan만 소비해야 하며 rule recomputation을 해서는 안 된다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/game/effects/`
- `app/game/scenes/`
- `app/platform/audio/`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/game/effects/neon-feedback-layer.ts`
- `app/platform/audio/game-audio.adapter.ts`
- `app/platform/audio/game-audio.adapter.js`
- `app/tests/unit/neon-feedback-layer.test.mjs`
- `app/tests/unit/game-audio.adapter.test.mjs`

### Project Structure Notes

- 권장 흐름은 `runtime event -> turn feedback plan -> neon/audio playback command -> Scene/platform playback` 이다.
- `turn-feedback-emitter.ts`는 effect planning 역할을 유지하고, 실제 네온 visual playback과 audio cue playback은 별도 경계로 분리하는 편이 안전하다.
- Story 5.2에서 pooling 최적화가 이어질 예정이므로, 이번 스토리에서 effect object lifecycle을 ad hoc으로 박아두지 않는 것이 중요하다.

### Library / Framework Requirements

- Architecture 문서상 오디오는 Phaser 기반 Web Audio 경계를 따른다.
- transient VFX는 factory/pooling 원칙을 따라야 한다.
- typed command/result 관례를 유지한다.
- 브라우저별 haptic 지원 차이는 handled fallback으로 흡수한다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - feedback command to visual/audio playback translation
  - unsupported audio/haptic fallback handling
  - combo/gate/fever key moment readability checks
  - constrained mobile viewport smoke verification

### UX / Player-Facing Constraints

- 기본 효과는 화려함보다 읽힘성을 우선해야 한다.
- 피버/게이트/콤보의 차이는 색, 리듬, 타격감으로 구분되어야 한다.
- 진동/사운드는 지원되지 않더라도 gameplay understanding이 무너지면 안 된다.
- 과도한 화면 섬광이나 시야 가림은 작은 화면에서 특히 피해야 한다.

### Anti-Patterns To Avoid

- Scene 내부에서 조건 분기마다 즉석 VFX/SFX 호출을 직접 늘려가는 구조
- resolver가 effect object나 audio cue 세부사항을 직접 아는 구조
- unsupported audio/haptic을 exception path로 처리하는 구조
- hot loop마다 새 particle/effect config object를 남발하는 구조
- readability보다 spectacle을 우선해 gameplay 정보를 가리는 구조

### Git Intelligence Summary

Epic 4까지 진행되며 progression, monetization, event reward, feedback command 경계는
이미 꽤 정리되었다. Story 5.1은 이 기반 위에서 dedicated feedback layer와
platform audio boundary를 추가하는 작업이므로, 새 기능을 빠르게 얹더라도 기존
rule/presentation 분리를 깨지 않는 것이 가장 중요하다.

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `effects/audio adapters = playback only`
- `rule systems = data/decision only`

## Completion Notes

### GPT-5 Codex

- Added `neon-feedback-layer.ts` so turn feedback commands and hit moments now flow through a dedicated neon playback boundary instead of Scene-local camera/effect branching.
- Added `game-audio.adapter.ts` under `app/platform/audio/` so SFX cues and haptic hooks now use a handled platform adapter with unsupported-environment no-op behavior.
- Updated `StageScene.ts` to route hit, gate, fever, and combo moments through the neon layer and audio adapter while keeping gameplay resolution logic separate.
- Added unit coverage for neon playback translation and audio adapter fallback behavior.
