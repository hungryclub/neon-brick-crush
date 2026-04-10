# Story 4.3: 이벤트/운영 보상 구조 구현

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a returning player,
I want limited-time reward structures to fit existing progression rules,
so that live content feels additive instead of disruptive.

## Acceptance Criteria

1. Given event configuration is provided, when event state is loaded, then event
   definitions must come from typed config and repository-backed status and
   event reward eligibility must be revalidated in the domain layer.
2. Given the player claims an event reward, when the claim succeeds, then reward
   application must follow the same service and repository boundaries as core
   progression and analytics/logging hooks must capture the outcome for later
   review.

## Tasks / Subtasks

- [x] Add typed event content and state boundaries. (AC: 1, 2)
  - [x] Define typed event models for event identity, active window, reward
        definition, claim status, and eligibility prerequisites.
  - [x] Load event definitions through typed config/loader paths rather than
        hardcoded UI constants.
  - [x] Keep event status persistence repository-backed so reloads preserve
        claim and availability state.
- [x] Revalidate event reward eligibility in the domain layer. (AC: 1)
  - [x] Check unlock, replay, or progression prerequisites before any claim is
        accepted.
  - [x] Keep eligibility logic outside React and Phaser Scene code.
  - [x] Return handled typed failures for already-claimed, expired, or invalid
        event reward states.
- [x] Route event reward claims through service and repository boundaries. (AC: 2)
  - [x] Reuse Story 4.1 save envelope and Story 4.2 monetization/progression
        service patterns instead of inventing a new reward pipeline.
  - [x] Ensure reward application updates progression through repositories or
        adjacent domain services, not UI-local mutation.
  - [x] Keep claim intent-only in UI: buttons send events, but do not apply
        rewards directly.
- [x] Add analytics/logging hooks for event operations. (AC: 2)
  - [x] Emit structured logs for event loaded, claim attempted, claim granted,
        claim rejected, and claim restored states.
  - [x] Keep analytics/error sink wiring inside `app/platform` or shared logging
        boundaries.
  - [x] Preserve enough structured fields for later review: event id, reward
        id, stage/world context, and outcome code.
- [x] Add focused verification for event claim correctness. (AC: 1, 2)
  - [x] Add tests for typed event loading, repository persistence, and domain
        eligibility revalidation.
  - [x] Add tests for successful claim, duplicate claim rejection, and expired
        event rejection.
  - [x] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [x] Manually verify: event rewards reload correctly and handled claim
        failures never corrupt progression state.

## Dev Notes

### Story Intent

Story 4.3은 Epic 4의 마지막 단계로, 광고/IAP처럼 코어 루프 바깥에 있는 운영형
보상을 기존 progression/save/service 경계 안으로 안전하게 얹는 작업이다.
이벤트는 "새 보상 버튼 하나 더 추가"가 아니라, typed content, repository-backed
status, domain revalidation, analytics logging이 함께 닫혀야 하는 운영 구조다.

이번 스토리의 핵심은 이벤트 보상이 기존 progression 규칙을 우회하지 않게 하는
것이다. 즉, 이벤트 보상도 `typed config -> repository state -> domain eligibility
-> service/repository reward application -> structured logging` 흐름을 따라야 한다.

### Epic Context

- Epic 4의 목표는 XP, 레벨업, 해금, 광고 보상, IAP, 이벤트 보상을 통해 장기
  동기와 BM 계층을 완성하는 것이다.
- Story 4.1이 save schema와 recovery policy를 만들었고, Story 4.2가 광고/IAP
  monetization boundary를 정리했다.
- Story 4.3은 이 두 기반을 재사용해 운영형 event reward를 additive하게 붙이는
  단계다.

### Story 4.3 Foundation

- User story: 플레이어는 기간 한정 보상이 기존 진행 규칙을 깨뜨리지 않는 선에서
  신선한 복귀 이유로 느껴져야 한다.
- Success criteria:
  - 이벤트 정의는 typed config와 repository-backed status로 로드된다.
  - reward eligibility는 domain layer에서 재검증된다.
  - claim 성공 시 reward application은 기존 progression/service 경계를 따른다.
  - analytics/logging hook가 outcome을 구조적으로 남긴다.

### Previous Story Intelligence

- Story 4.1에서 schema-versioned save envelope, recovery policy, progression
  repository write consistency가 정리되었다.
- Story 4.2에서 ad/IAP adapter와 XState-owned monetization branching이 정리되어,
  외부 보상도 UI-local async 처리 없이 다루는 패턴이 생겼다.
- Story 3.x에서 typed world/stage content loader와 progression map/state가 이미
  만들어졌으므로, event content도 typed loader 기반으로 올리는 편이 자연스럽다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일/경로:
  - `app/platform/persistence/progression.repository.ts`
  - `app/platform/persistence/save-recovery.ts`
  - `app/domain/models/save-model.ts`
  - `app/state/machines/progression.machine.ts`
  - `app/ui/screens/GameShell.tsx`
  - `app/shared/logging/`
- 새로 생길 가능성이 높은 경로:
  - `app/assets/manifests/event-content.manifest.ts`
  - `app/assets/loaders/event-config.loader.ts`
  - `app/domain/models/event-model.ts`
  - `app/platform/persistence/event.repository.ts`
  - `app/state/machines/event.machine.ts`
  - `app/tests/unit/event-config.loader.test.mjs`
  - `app/tests/unit/event.machine.test.mjs`
- 이미 있는 유용한 기반:
  - schema-versioned save envelope
  - monetization service/machine boundary
  - structured logger and typed error/result conventions

### Technical Requirements

- 이벤트 정의는 typed config/loader를 통해 로드되어야 한다.
- 이벤트 상태는 repository-backed persistence로 관리되어 reload 이후에도 일관돼야
  한다.
- claim eligibility는 domain/service layer에서 재검증되어야 한다.
- recoverable event failures는 thrown exception이 아니라 typed handled path여야
  한다.
- outcome logging은 later review를 위한 structured fields를 포함해야 한다.

### Architecture Compliance Guardrails

- Phaser Scene은 event config, reward claim, analytics sink를 직접 알면 안 된다.
- React는 event claim intent를 보내고 결과를 표시할 수 있지만 reward를 직접 적용하면 안 된다.
- progression/save truth는 기존 repository boundary 안에서만 변경되어야 한다.
- 외부 운영/로그 sink 호출은 `app/platform` 또는 shared logging 경계 안에서만 수행한다.
- event reward는 기존 unlock/XP/stars 규칙을 우회하는 별도 진실원을 만들면 안 된다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/assets/manifests/`
- `app/assets/loaders/`
- `app/domain/models/`
- `app/platform/persistence/`
- `app/state/machines/`
- `app/ui/screens/`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/assets/manifests/event-content.manifest.ts`
- `app/assets/loaders/event-config.loader.ts`
- `app/domain/models/event-model.ts`
- `app/platform/persistence/event.repository.ts`
- `app/state/machines/event.machine.ts`
- `app/tests/unit/event-config.loader.test.mjs`
- `app/tests/unit/event.machine.test.mjs`

### Project Structure Notes

- 올바른 흐름은 `event config load -> repository-backed event status hydrate ->
  domain eligibility check -> claim service -> progression/save update -> log`
  이다.
- Story 4.2의 monetization service와 유사한 explicit branch handling 패턴을 event
  claims에도 적용하는 편이 안전하다.
- reward claim은 progression snapshot을 직접 mutate하지 말고 repository/service를
  통해 반영해야 한다.
- save model은 event claim state를 추가하더라도 Story 4.1 recovery policy를 그대로
  재사용할 수 있어야 한다.

### Library / Framework Requirements

- XState v5의 explicit state/event branching을 유지한다.
- typed loader/content boundary 규칙을 유지한다.
- structured logging은 기존 logger 계약을 따른다.
- typed `Result`/error code 철학을 save와 monetization 영역과 일치시킨다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - event config loader typed validation
  - duplicate claim rejection
  - expired/unavailable event handling
  - successful claim persistence and reload
  - structured logging payload coverage

### UX / Player-Facing Constraints

- event reward는 기존 progression을 압도하는 pay-to-win처럼 보이면 안 된다.
- 이벤트 실패/만료/중복 수령은 플레이어를 막지 않는 handled feedback으로 돌아와야 한다.
- 운영형 보상은 "추가 재미"처럼 보여야 하며 코어 퍼즐 정체성을 흐리면 안 된다.

### Anti-Patterns To Avoid

- UI 버튼에서 이벤트 보상을 직접 progression state에 반영하는 구조
- typed config 없이 ad hoc JSON/object literal로 event를 정의하는 구조
- event claim state와 progression save를 분리된 진실원으로 관리하는 구조
- analytics/logging을 React/Scene에서 직접 호출하는 구조
- eligibility 없이 claim success만 낙관적으로 처리하는 구조

### Git Intelligence Summary

Story 4.2 리뷰 패치까지 마무리되면서, monetization과 external reward flow는 모두
platform/service/state-machine 경계 안으로 정리되었다. 따라서 Story 4.3은 이
패턴을 event reward 운영 구조로 확장하고, save schema와 repository consistency를
유지하는 방향으로 가는 것이 가장 자연스럽다.

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `repositories/services = progression and reward application`
- `platform/logging adapters = all external sink contact`

## Completion Notes

### GPT-5 Codex

- Added typed live-event definitions and a dedicated loader so event content now
  comes from manifest/loader boundaries instead of UI-local constants.
- Extended the progression save snapshot with repository-backed event claim
  state and implemented handled claim persistence through
  `progression.repository.ts`.
- Added domain-level event eligibility checks for already-claimed, expired, and
  progression-locked reward states before any reward application occurs.
- Introduced `event.machine.ts` and selector/UI wiring so the world-map shell
  now exposes event claim intents without directly mutating progression state.
- Added structured event logs for load, claim attempted, claim granted, and
  claim rejected paths.
- Review patch: event claims now validate the canonical reward id from typed
  config before persisting, and GameShell only reapplies/logs a granted or
  rejected event outcome once instead of replaying the same result on later
  unrelated renders.
- Verified with `npm run test`, `npm run typecheck`, and `npm run build`.
