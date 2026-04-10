# Story 4.2: 보상형 광고와 IAP adapter 구현

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want optional monetization features to feel separate from gameplay rules,
so that monetization supports rather than pollutes the core loop.

## Acceptance Criteria

1. Given an ad or purchase action is available, when the player invokes it, then
   the request must pass through `app/platform` adapters and XState services
   and gameplay Scene code must not access provider SDKs directly.
2. Given a monetization result is returned, when it succeeds, fails, or is
   cancelled, then the platform bridge must return a typed `Result` with shared
   error codes and the state machine must handle each branch explicitly.

## Tasks / Subtasks

- [ ] Consolidate monetization adapter boundaries under `app/platform`. (AC: 1, 2)
  - [ ] Reuse the existing rewarded-ad adapter path as part of a broader
        monetization boundary rather than leaving it as a one-off retry-only
        implementation.
  - [ ] Add an IAP adapter contract under `app/platform/iap` with capability
        detection or mock-ready provider branching.
  - [ ] Keep provider-facing SDK calls out of Phaser Scene code, React event
        handlers, and repository/domain layers.
- [ ] Introduce typed monetization result and error contracts. (AC: 2)
  - [ ] Define shared result shapes and error codes for rewarded ads and IAP
        outcomes such as success, denied, cancelled, unavailable, and transport
        failure.
  - [ ] Ensure recoverable monetization failures return typed `Result` values
        instead of thrown exceptions.
  - [ ] Align new error/result contracts with the existing save recovery and
        platform error handling conventions from Story 4.1.
- [ ] Route monetization requests through XState-owned service flows. (AC: 1, 2)
  - [ ] Keep UI intent-only: UI sends events, but does not call ad/IAP adapters
        directly.
  - [ ] Keep Scene/runtime gameplay paths free of purchase or ad provider
        knowledge.
  - [ ] Handle success, failure, and cancellation branches explicitly in state
        machines or adjacent services.
- [ ] Prepare monetization hooks for future reward and store surfaces. (AC: 1, 2)
  - [ ] Ensure rewarded retry can continue to use the rewarded-ad adapter
        through the shared platform boundary.
  - [ ] Add IAP-facing stubs or service entry points that future store/event
        stories can reuse without reworking gameplay architecture.
  - [ ] Preserve save-schema compatibility so rewarded grants and purchases can
        later extend progression safely.
- [ ] Add focused verification for monetization isolation and handled outcomes.
      (AC: 1, 2)
  - [ ] Add tests covering rewarded-ad and IAP adapter success/failure/cancel
        paths through typed results.
  - [ ] Add at least one state-machine or service-layer test confirming
        explicit branch handling for monetization outcomes.
  - [ ] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [ ] Manually verify: monetization UI intents do not crash gameplay flow and
        handled failures return cleanly to non-blocking UI states.

## Dev Notes

### Story Intent

Story 4.2는 이미 존재하는 rewarded retry 광고 흐름을 "실패 시 추가 기회"
전용 특수 케이스에서, Epic 4 전반에서 재사용 가능한 monetization platform
boundary로 끌어올리는 단계다. 동시에 아직 비어 있는 IAP 경계를 미리 도입해,
이후 상점/이벤트/보상 스토리가 Scene이나 UI에서 직접 SDK를 다루지 않아도 되게
만드는 것이 목표다.

핵심은 monetization이 코어 퍼즐 루프를 오염시키지 않게 하는 것이다. 광고와
구매는 모두 `platform adapter -> XState service -> explicit branch handling`
구조를 따라야 하고, 반환값은 저장 계층과 마찬가지로 typed `Result`로 닫혀야
한다.

### Epic Context

- Epic 4의 목표는 XP, 레벨업, 해금, 광고 보상, IAP, 이벤트 보상을 통해 장기
  동기와 BM 구조를 만드는 것이다.
- Story 4.1이 save schema와 recovery policy를 먼저 안정화했으므로, Story 4.2는
  그 위에서 광고/IAP 브리지를 공통 monetization contract로 정리하는 단계다.
- Story 4.3 이벤트/운영 보상 구조는 이번 스토리에서 정의한 platform/service
  경계를 재사용해야 한다.

### Story 4.2 Foundation

- User story: 플레이어는 수익화 기능이 게임 규칙과 분리된 선택형 보조 장치로
  느껴져야 한다.
- Success criteria:
  - 광고와 구매 요청은 모두 `app/platform` adapter와 XState service를 거친다.
  - 성공/실패/취소 결과는 typed `Result`와 shared error code로 반환된다.
  - 상태 머신이 각 분기를 명시적으로 처리한다.
  - Scene은 provider SDK나 monetization policy를 직접 알지 않는다.

### Previous Story Intelligence

최근 스토리들이 이번 작업의 기반을 이미 만들어 두었다.

- Story 1.4에서 `app/platform/ads/rewarded-ad.adapter.ts`와 session-owned
  rewarded retry 흐름이 도입되었다.
- Story 4.1에서 save schema, typed recovery, repository error handling이
  정리되어 platform 계층 전반의 `Result` 철학이 강화되었다.
- `GameShell.tsx`와 `session.machine.ts`는 이미 "UI intent -> XState decision ->
  bridge/service action" 패턴을 사용하고 있다.
- 아직 `app/platform/iap` 경계는 비어 있어, IAP는 이번 스토리에서 처음으로
  contract를 세워야 한다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일/경로:
  - `app/platform/ads/rewarded-ad.adapter.ts`
  - `app/state/machines/session.machine.ts`
  - `app/ui/screens/GameShell.tsx`
  - `app/domain/errors/`
  - `app/shared/result/result.ts`
- 새로 생길 가능성이 높은 경로:
  - `app/platform/iap/`
  - `app/platform/iap/purchase.adapter.ts`
  - `app/state/services/`
  - `app/tests/unit/purchase.adapter.test.mjs`
  - `app/tests/unit/monetization-flow.test.mjs`
- 이미 있는 유용한 기반:
  - rewarded retry adapter stub와 handled outcome tests
  - typed save recovery/error handling
  - selector/XState 중심 UI intent 흐름

### Technical Requirements

- 광고와 IAP 결과는 typed `Result`와 shared error code 체계를 사용해야 한다.
- SDK/provider-specific 호출은 `app/platform` 내부 adapter 계층 밖에서 금지한다.
- XState service layer는 성공/실패/취소/미지원 분기를 explicit하게 다뤄야 한다.
- Story 4.1 save schema와 충돌하지 않도록 reward/purchase 확장을 고려한 contract를
  유지해야 한다.
- `app/`가 유일한 실행 루트이며, 테스트 가능한 mock/stub 경계가 필요하다.

### Architecture Compliance Guardrails

- `Scene`은 광고/IAP SDK를 직접 import하거나 호출하면 안 된다.
- `React`는 monetization intent를 보내고 결과를 표시할 수 있지만 adapter 직접
  호출은 금지한다.
- `XState`는 monetization 정책과 결과 분기의 single source of truth를 유지한다.
- `app/platform`은 provider differences, capability detection, mock branching을
  흡수해야 한다.
- recoverable monetization failure는 thrown exception이 아니라 handled
  `Result` 경로로 반환해야 한다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/platform/ads/`
- `app/platform/iap/`
- `app/state/machines/`
- `app/state/services/`
- `app/ui/screens/GameShell.tsx`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/platform/iap/purchase.adapter.ts`
- `app/platform/iap/purchase.adapter.js`
- `app/state/services/monetization.service.ts`
- `app/tests/unit/purchase.adapter.test.mjs`
- `app/tests/unit/monetization.service.test.mjs`

### Project Structure Notes

- 올바른 흐름은 `UI intent -> XState event -> monetization service ->
  platform adapter -> typed Result -> explicit state branch` 이다.
- rewarded retry는 기존 Story 1.4 동작을 유지하되, implementation detail은
  broader monetization boundary 안으로 정리하는 편이 자연스럽다.
- IAP는 이번 단계에서 실제 store UI보다 adapter/service contract를 먼저 닫는
  것이 안전하다.
- save model은 Story 4.3 이후 event/ad/IAP reward claim 이력을 붙일 수 있게
  확장 여지를 남겨두어야 한다.

### Library / Framework Requirements

- XState v5의 explicit state/event branching 패턴을 유지한다.
- typed `Result` helper와 공통 에러 코드 체계를 재사용한다.
- platform adapter는 mock-friendly contract를 제공해야 하며, provider SDK는 후속
  실제 연동으로 교체 가능해야 한다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - rewarded-ad success/failure/cancel handled-result 테스트
  - IAP success/cancel/unavailable handled-result 테스트
  - monetization service/state machine explicit branch 테스트
  - Scene/UI가 provider adapter를 직접 호출하지 않는 구조 보호 테스트

### UX / Player-Facing Constraints

- monetization은 선택형 지원 수단처럼 보여야 하며 코어 퍼즐 규칙을 덮어쓰면 안 된다.
- 실패/취소/미지원 경로는 플레이어를 막지 않고 부드럽게 이전 UI 상태로 돌려보내야 한다.
- 광고와 구매는 의미가 명확해야 하며, "왜 필요한지"가 UI에서 과도하게 공격적으로
  보이면 안 된다.

### Anti-Patterns To Avoid

- `StageScene`이나 core resolver에서 광고/IAP adapter를 직접 호출하는 구조
- `GameShell` 클릭 핸들러 안에서 provider SDK 비동기를 직접 처리하는 구조
- monetization outcome을 여러 진실원에 중복 저장하는 구조
- success/failure/cancel을 thrown exception과 boolean flag로 섞어 다루는 구조
- Story 4.1 save recovery contract와 분리된 별도 error handling 체계

### Git Intelligence Summary

Story 4.1까지 완료되면서 long-term save envelope, typed recovery, repository
write consistency가 정리되었다. 따라서 Story 4.2는 저장 경계를 다시 흔들기보다,
그 위에서 광고/IAP 결과도 같은 수준의 typed platform contract로 묶는 작업으로
보는 것이 가장 자연스럽다.

현재 확인된 관련 구현:

- `app/platform/ads/rewarded-ad.adapter.ts`
- `app/tests/unit/rewarded-ad.adapter.test.mjs`
- `app/state/machines/session.machine.ts`
- `app/ui/screens/GameShell.tsx`

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `platform adapters = all external SDK contact`
- monetization success/failure/cancel은 로그 검증 대상
