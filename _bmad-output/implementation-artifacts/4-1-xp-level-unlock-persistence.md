# Story 4.1: XP/레벨업/해금 저장 흐름 구현

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want my long-term progress to persist between sessions,
so that replay feels meaningful.

## Acceptance Criteria

1. Given the player completes gameplay sessions, when progression rewards are
   applied, then XP, level, stars, unlock flags, and settings must persist via
   the IndexedDB-backed repository
   and save payloads must include schema version metadata.
2. Given saved data is loaded, when the app boots, then corrupted or invalid
   payloads must follow the recovery policy defined in the architecture
   and recoverable failures must return typed errors rather than thrown
   exceptions.

## Tasks / Subtasks

- [x] Extend progression/save domain models for long-term meta state. (AC: 1, 2)
  - [x] Add explicit save model types for XP, player level, unlock flags,
        stars, settings, and schema version metadata.
  - [x] Keep session/runtime turn data separate from long-term persisted meta
        progression so Scene code does not become save-state aware.
  - [x] Preserve compatibility with the current stage/world progression snapshot
        so Story 3.x data can migrate cleanly into the new save envelope.
- [x] Introduce IndexedDB-backed persistence boundaries with recovery policy.
      (AC: 1, 2)
  - [x] Add repository/adapter structure under `app/platform/persistence` for
        browser-backed storage and typed load/save results.
  - [x] Keep direct IndexedDB access out of React, XState, and Phaser runtime
        code.
  - [x] Implement corruption/invalid-payload recovery behavior as typed handled
        paths, not uncaught exceptions.
- [x] Implement XP and level reward application in progression orchestration.
      (AC: 1)
  - [x] Define a minimal XP earning policy tied to completed gameplay sessions
        or stage results.
  - [x] Apply level-up and unlock projection through orchestration/repository
        boundaries rather than inside Scene logic.
  - [x] Ensure existing stars/unlock flags persist within the same save flow.
- [x] Persist and reload player settings with schema versioned save payloads.
      (AC: 1, 2)
  - [x] Add a typed settings shape for basic player preferences that belongs in
        the long-term save payload.
  - [x] Ensure app boot reads the persisted payload and hydrates progression
        state from repository results.
  - [x] Keep save writes structured so later migrations and cloud sync remain
        possible.
- [x] Add focused verification for persistence and recovery behavior. (AC: 1, 2)
  - [x] Add tests for schema version metadata, XP/level persistence, and stage
        progression coexistence in one save payload.
  - [x] Add tests for corrupted/invalid payload recovery returning typed results.
  - [x] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [x] Manually verify: progress survives reload and recoverable invalid data
        does not hard-crash boot.

## Dev Notes

### Story Intent

Story 4.1은 Epic 4의 시작점으로, 지금까지 쌓아온 월드/별점/해금 구조를
"현재 세션 안에서만 유지되는 진행"에서 "앱을 다시 열어도 남는 장기 진행"으로
전환하는 단계다. Story 3.2와 3.3에서 progression repository와 unlock 흐름은
이미 만들어졌지만, 아직은 in-memory 테스트용 저장소에 가까워서 XP, level,
settings, recovery policy를 담는 진짜 save boundary는 아니다.

핵심은 세 가지다. 첫째, XP/level/stars/unlock/settings를 한 save envelope로
묶는다. 둘째, 저장소는 IndexedDB-backed repository로 옮기되, UI나 Scene은 그
세부 구현을 몰라야 한다. 셋째, corrupted payload는 앱을 깨뜨리지 않고 typed
recovery path로 처리해야 한다.

### Epic Context

- Epic 4의 목표는 XP, 레벨업, 해금, 광고 보상, IAP, 이벤트 보상을 통해 장기
  동기와 운영 구조를 만드는 것이다.
- Story 4.1은 그 기반인 저장 모델, persistence boundary, boot-time recovery
  정책을 닫는 역할을 한다.
- Story 4.2와 4.3이 광고/IAP/event 분기를 얹기 전에, 공통 save schema와
  repository contract가 먼저 안정화되어야 한다.

### Story 4.1 Foundation

- User story: 플레이어는 장기 진행이 세션을 넘어 저장되어 반복 플레이가
  의미 있게 느껴져야 한다.
- Success criteria:
  - XP, level, stars, unlock flags, settings가 IndexedDB-backed repository를
    통해 저장된다.
  - save payload는 schema version metadata를 포함한다.
  - invalid/corrupted payload는 recovery policy에 따라 handled path로 처리된다.
  - recoverable failure는 typed result/error 경로를 사용한다.

### Previous Story Intelligence

Story 3.x에서 중요한 기반이 이미 준비되었다.

- `progression.repository.ts`는 현재 stage progression snapshot을 소유한다.
- `progression.machine.ts`와 selectors는 world-map과 stage completion 결과를
  UI에 반영하는 루프를 갖고 있다.
- Story 3.3에서 `challenge/climax` unlock policy와 typed stage profile이
  안정화되었으므로, 이제 이를 장기 저장 payload 안에 담는 방향이 자연스럽다.
- 아키텍처 문서는 mutable progression data를 `repository + IndexedDB`로
  관리하고 schema versioning을 고려하라고 명시한다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일/경로:
  - `app/platform/persistence/progression.repository.ts`
  - `app/domain/models/progression-model.ts`
  - `app/state/machines/progression.machine.ts`
  - `app/state/selectors/progression.selectors.ts`
  - `app/ui/screens/GameShell.tsx`
  - `app/tests/unit/progression.repository.test.mjs`
- 새로 생길 가능성이 높은 경로:
  - `app/platform/persistence/indexeddb/`
  - `app/domain/models/save-model.ts`
  - `app/platform/persistence/save-recovery.ts`
  - `app/tests/unit/save-recovery.test.mjs`
  - `app/tests/unit/indexeddb-progression.repository.test.mjs`
- 이미 있는 유용한 기반:
  - stage/world progression repository contract
  - world-map progression machine and selectors
  - typed loader/content boundaries from Story 3.1

### Technical Requirements

- save payload는 schema version metadata를 포함해야 한다.
- XP/level/stars/unlock/settings는 같은 장기 save model 안에서 일관되게 관리해야
  한다.
- 저장 구현은 IndexedDB-backed repository boundary 뒤에 위치해야 한다.
- corrupted/invalid payload는 recovery policy에 따라 typed result/error로
  처리해야 한다.
- Scene/runtime은 저장 정책이나 IndexedDB 세부 구현을 직접 알면 안 된다.

### Architecture Compliance Guardrails

- direct IndexedDB access는 `app/platform/persistence` 밖에서 금지한다.
- XState는 hydrated snapshot/result만 소비하고, 저장소 세부 구현을 몰라야 한다.
- Phaser Scene은 XP, level, save schema, recovery policy를 직접 소유하지 않는다.
- save model은 schema versioning과 migration 가능성을 고려한 JSON-serializable
  구조여야 한다.
- recoverable failure는 thrown exception 대신 typed `Result` 또는 명시적 handled
  path로 흘려야 한다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/platform/persistence/`
- `app/domain/models/`
- `app/state/machines/`
- `app/state/selectors/`
- `app/ui/screens/GameShell.tsx`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/domain/models/save-model.ts`
- `app/platform/persistence/indexeddb/`
- `app/platform/persistence/save-recovery.ts`
- `app/tests/unit/save-recovery.test.mjs`
- `app/tests/unit/indexeddb-progression.repository.test.mjs`

### Project Structure Notes

- 올바른 흐름은 `session/stage result -> progression reward application ->
  repository save envelope write -> app boot hydrate -> selector projection` 이다.
- Story 3.x의 current progression snapshot을 버리기보다, schema-versioned save
  envelope 안에 흡수하는 방식이 migration 부담이 적다.
- XP/level은 코어 퍼즐 실력을 대체하는 power가 아니라 장기 만족과 해금 조건을
  위한 보조 메타로 유지해야 한다.
- Story 4.2, 4.3에서 추가 보상 구조가 붙으므로, save model은 event/ad/IAP 확장
  필드를 붙일 수 있게 열어두는 편이 안전하다.

### Library / Framework Requirements

- IndexedDB integration은 `platform` adapter/repository 계층에서만 수행한다.
- XState는 progression hydration/result orchestration에 집중한다.
- React는 hydrated state를 표시하고 settings intent를 보내는 presentation 역할에
  머문다.
- repository/config loader 경계는 기존 규칙을 유지한다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - schema version metadata 포함 테스트
  - XP/level/stars/unlock/settings 통합 save/load 테스트
  - corrupted payload recovery typed-result 테스트
  - boot hydration 이후 selector projection 테스트

### UX / Player-Facing Constraints

- 장기 저장은 플레이 템포를 해치지 않게 background-safe하게 동작해야 한다.
- reload 이후에도 월드/별점/해금/레벨이 자연스럽게 이어져야 한다.
- corrupted save가 있더라도 앱은 가능한 한 복구 가능한 기본 상태로 진입해야 한다.
- settings persistence는 작은 편의 기능이어도 “다시 열면 남아 있다”는 신뢰를 줘야 한다.

### Anti-Patterns To Avoid

- React, XState, Phaser에서 직접 IndexedDB를 호출하는 구조
- stars/unlock progression과 XP/level save를 서로 다른 진실원으로 분리하는 구조
- schema version 없는 ad hoc JSON 저장
- corrupted payload에서 boot를 hard crash 시키는 구조
- Story 4.2/4.3 확장을 막는 overly narrow save model

### Git Intelligence Summary

최근 흐름은 Story 3.3 리뷰 패치까지 완료되어, 월드 arc와 unlock policy가
안정화된 상태다. 따라서 Story 4.1은 콘텐츠 구조 자체를 또 바꾸기보다, 그
결과를 장기 저장 모델로 승격시키는 작업으로 보는 것이 가장 자연스럽다.

최근 관련 커밋:

- `3cbef60` `[Execution] Dave: Story 3.3 리뷰 패치 반영`
- `8c2ca51` `[Execution] Dave: Story 3.3 튜토리얼 챌린지 클라이맥스 흐름 구현`
- `016b3ba` `[Execution] Dave: Story 3.2 리뷰 패치 반영`

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `Zustand = lightweight UI/view state only`
- Mutable progression state uses repository boundaries
- Do not bypass repositories/config loaders with direct file or IndexedDB access
- Recoverable persistence errors should use typed handled paths

### References

- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/stories.md` - `Story 4.1: XP/레벨업/해금 저장 흐름 구현`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/3-3-tutorial-challenge-climax-flow.md`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/epics.md` - `Epic 4: 메타 진행 & BM`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md` - `Data Persistence`, `Repository + IndexedDB`, `schema versioning`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md` - `경험치 기반 레벨업`, `레벨 조건 해금`, `진행 구조`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/platform/persistence/progression.repository.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story 4.1 context generated from `stories.md`, Epic 4 planning notes, GDD meta
  progression guidance, and architecture persistence rules.
- Existing code inspection shows the current progression repository is still
  in-memory and stage-centric, making this story the right place to introduce a
  schema-versioned save envelope and persistence recovery policy.

### Completion Notes List

- Added `save-model.ts` and a schema-versioned progression save envelope that
  stores world progression, XP, level, and player settings together.
- Added `save-recovery.ts` plus typed payload parsing/validation so corrupted or
  invalid save data now returns handled `SAVE_LOAD_FAILED` results instead of
  uncaught exceptions.
- Reworked `progression.repository.ts` to use an IndexedDB-ready storage driver,
  persist the envelope through typed `Result` paths, and award XP/level on stage
  completion while preserving Story 3.x stars/unlock logic.
- Updated `GameShell.tsx` to hydrate progression through typed repository load
  results and recover boot safely to default progression when persistence data
  is invalid.
- Review patch: save writes now update the in-memory progression truth only after
  durable persistence succeeds, and stage-clear save failures surface an
  explicit retry path instead of silently resetting the session.
- Added unit tests for settings persistence, save schema metadata, and invalid
  payload recovery, then verified with `npm run test`, `npm run typecheck`, and
  `npm run build`.

### File List

- _bmad-output/implementation-artifacts/4-1-xp-level-unlock-persistence.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/domain/models/progression-model.ts
- app/domain/models/save-model.ts
- app/platform/persistence/indexeddb/progression-storage.ts
- app/platform/persistence/progression.repository.ts
- app/platform/persistence/save-recovery.ts
- app/tests/unit/progression.repository.test.mjs
- app/tests/unit/save-recovery.test.mjs
- app/ui/screens/GameShell.tsx
