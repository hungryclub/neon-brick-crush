# Story 3.2: 월드맵/스테이지 선택/별점 흐름 구현

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to choose stages from a world map and earn stars,
so that progression feels clear and replayable.

## Acceptance Criteria

1. Given the player opens world progression UI, when stages are rendered in the
   map flow, then React screens must reflect progression selector data, and
   unlock and star data must come from repository-backed progression state.
2. Given a stage ends, when results are finalized, then stars and completion
   status must be persisted through repositories, and the map must reflect
   updated stage state on the next view render.

## Tasks / Subtasks

- [x] Introduce repository-backed progression models for world map rendering.
      (AC: 1, 2)
  - [x] Extend progression data shape to include per-stage completion and star
        status rather than world-unlocked flags only.
  - [x] Keep mutable progression state behind repository contracts instead of
        letting screens or runtime assemble progression ad hoc.
  - [x] Preserve room for future world unlock and perfect/replay goals from
        Stories 3.3 and 4.x.
- [x] Build selector-driven world map and stage selection UI. (AC: 1)
  - [x] Add React screen/view-model structure for a minimal world map showing
        stage nodes, lock state, and earned stars.
  - [x] Ensure UI consumes progression selectors plus Story 3.1 loader data
        rather than direct repository/file reads.
  - [x] Add stage selection intent handling that routes the chosen stage into
        the runtime boot path without Scene-local selection policy.
- [x] Connect stage lifecycle results to progression persistence. (AC: 2)
  - [x] Define a result finalization path that converts stage clear outcomes
        into repository writes for stars and completion.
  - [x] Keep star award policy in session/progression orchestration or a domain
        helper, not inside `StageScene`.
  - [x] Ensure the next world-map render reflects newly saved stage status.
- [x] Bridge runtime/session/progression boundaries for stage selection. (AC: 1, 2)
  - [x] Reuse Story 3.1 normalized stage config path for selected stages.
  - [x] Keep Phaser runtime focused on the active stage only; world-map state
        and progression orchestration should remain outside `app/game`.
  - [x] Add structured logs for stage selection, result finalization, and
        persistence updates using `worldId` and `stageId`.
- [x] Add focused tests and verification for map rendering and persistence.
      (AC: 1, 2)
  - [x] Add repository and selector tests for stage status/star projection.
  - [x] Add at least one test for stage result persistence updating world-map
        state on the next read/render cycle.
  - [x] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [x] Manually verify: selecting a stage changes the active stage, clearing a
        stage updates stars, and returning to the map reflects the new state.

## Dev Notes

### Story Intent

Story 3.2는 Epic 3에서 처음으로 "플레이 사이의 연결"을 플레이어에게 보이게
하는 단계다. Story 3.1이 월드/스테이지 데이터를 안전하게 불러오는 경계를
세웠다면, 이번 스토리는 그 데이터를 진행 상태와 결합해 월드맵, 스테이지 선택,
별점이라는 실제 콘텐츠 루프 UI로 드러내야 한다.

핵심은 두 가지다. 첫째, 월드맵은 Story 3.1의 typed loader 데이터와 repository-backed
progression 상태를 함께 읽어 렌더링해야 한다. 둘째, 스테이지 결과는 단순 HUD로
끝나지 않고 repository에 저장되어, 다음 월드맵 렌더에서 즉시 반영되어야 한다.

### Epic Context

- Epic 3의 목표는 월드 구조, 별점, 맵 선택형 진행을 통해 콘텐츠 루프를
  플레이어가 읽을 수 있게 만드는 것이다.
- Story 3.2는 그 중심인 world map, stage selection, stars를 한 번에 묶는 단계다.
- Story 3.3에서 tutorial/challenge/climax의 stage profile 차이가 더 크게
  드러나기 전에, 먼저 "어떤 스테이지를 선택했고 어떻게 완료 상태가 저장되나"를
  안정적으로 닫아야 한다.

### Story 3.2 Foundation

- User story: 플레이어는 월드맵에서 스테이지를 선택하고, 클리어 후 별점을
  얻어 반복 플레이 목표를 읽을 수 있어야 한다.
- Success criteria:
  - 월드맵 UI는 progression selector data를 기준으로 렌더링된다.
  - unlock/star/completion은 repository-backed progression state에서 온다.
  - stage clear 결과는 repository에 저장된다.
  - 다음 world-map render에서 저장된 stage status가 반영된다.

### Previous Story Intelligence

Story 3.1에서 중요한 기반이 이미 준비되었다.

- `stage-config.loader.ts`가 typed manifest 기반으로 normalized stage config를
  제공한다.
- `StageScene.ts`는 registry를 통해 active stage config를 부팅한다.
- `createGameRuntime.ts`는 초기 stage load path를 소유하고 있어, 이후 selected
  stage로의 전환점을 만들기 좋은 위치다.
- `progression.repository.ts`는 아직 world unlock 중심의 최소 스냅샷만 갖고 있어,
  이번 Story 3.2에서 per-stage progression shape 확장이 필요하다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일/경로:
  - `app/platform/persistence/progression.repository.ts`
  - `app/state/machines/`
  - `app/state/selectors/`
  - `app/ui/screens/GameShell.tsx`
  - `app/ui/components/`
  - `app/assets/loaders/stage-config.loader.ts`
  - `app/game/core/create-game-runtime.ts`
  - `app/tests/unit/`
- 새로 생길 가능성이 높은 경로:
  - `app/state/machines/progression.machine.ts`
  - `app/state/selectors/progression.selectors.ts`
  - `app/ui/screens/WorldMapScreen.tsx`
  - `app/domain/models/progression-model.ts`
  - `app/tests/unit/progression-*.test.mjs`
- 이미 있는 유용한 기반:
  - Story 3.1의 world/stage loader
  - existing `createProgressionRepository()`
  - React shell + XState selector 구독 패턴

### Technical Requirements

- mutable progression data는 repository를 통해 읽고 쓴다.
- world map UI는 loader data + progression selector projection을 소비한다.
- stage selection은 normalized stage config boot path를 재사용해야 한다.
- stars/completion 정책은 Scene이 아니라 domain/progression/session 경계에서
  결정되어야 한다.
- 결과 저장 후 다음 render에서 즉시 반영되는 read/write loop가 필요하다.

### Architecture Compliance Guardrails

- `StageScene`는 별점 정책, unlock 정책, save 정책을 소유하지 않는다.
- progression truth는 repository + orchestration 계층이 소유한다.
- React는 progression selectors를 기반으로 world map을 렌더링한다.
- loader는 static content를, repository는 mutable completion/star state를
  담당하며 둘의 책임을 섞지 않는다.
- runtime active stage 전환은 `app/game` 밖의 selection policy를 통해
  결정되어야 한다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/platform/persistence/progression.repository.ts`
- `app/state/machines/`
- `app/state/selectors/`
- `app/ui/screens/`
- `app/ui/components/`
- `app/assets/loaders/stage-config.loader.ts`
- `app/game/core/create-game-runtime.ts`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/domain/models/progression-model.ts`
- `app/state/machines/progression.machine.ts`
- `app/state/selectors/progression.selectors.ts`
- `app/ui/screens/WorldMapScreen.tsx`
- `app/tests/unit/progression.machine.test.mjs`
- `app/tests/unit/progression.repository.test.mjs`

### Project Structure Notes

- 올바른 흐름은 `loader world/stage data + progression repository state ->
  selectors/view model -> world map render -> selection intent -> active stage boot`
  이다.
- stage clear 후 흐름은 `runtime/session result -> progression update ->
  repository persist -> map selector refresh`가 되어야 한다.
- Story 3.3은 stage type별 presentation과 unlock arc를 더 얹는 단계이므로,
  이번 스토리에서는 world map과 stage result persistence를 먼저 안정화하는 쪽이
  맞다.

### Library / Framework Requirements

- XState는 progression/orchestration 계층에서 적극적으로 사용할 수 있다.
- Phaser는 active stage runtime만 담당한다.
- React는 map UI와 result reflection을 담당한다.
- repository/config loader 경계는 Story 3.1에서 세운 규칙을 유지한다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - stage status/star selector projection 테스트
  - progression repository write/read loop 테스트
  - selected stage가 loader/runtime boot 경로에 반영되는지 확인
  - 결과 반영 후 world-map UI state가 갱신되는지 확인

### UX / Player-Facing Constraints

- 월드맵은 복잡한 전략 화면보다 "지금 어디까지 왔고 다음에 뭐 할지"가 한눈에
  읽히는 화면이어야 한다.
- 별점은 반복 플레이 동기를 주되, 현재 스토리 범위에서는 단순하고 분명한 규칙이
  우선이다.
- 모바일에서 stage node, lock state, star state가 작은 공간에서도 읽혀야 한다.
- stage clear 후 map으로 돌아왔을 때 갱신이 즉시 보이는 것이 중요하다.

### Anti-Patterns To Avoid

- React screen이 repository를 직접 두드리며 상태를 임의로 조립하는 구조
- Phaser Scene이 stage result를 직접 저장하거나 stars를 계산하는 구조
- static stage data와 mutable progression state를 같은 모듈에 섞는 구조
- 선택된 stage를 hardcoded global state나 Scene-local 변수에 숨기는 구조
- Story 3.3/4.x 확장을 어렵게 만드는 overly narrow progression model

### Git Intelligence Summary

최근 흐름은 Story 3.1이 구현과 리뷰 패치까지 완료되어, typed loader와 normalized
stage boot 경계가 안정화된 상태다. 따라서 Story 3.2는 그 위에 world map UI와
repository-backed progression loop를 붙이는 작업으로 보는 것이 자연스럽다.

최근 관련 커밋:

- `96f1635` `[Execution] Dave: Story 3.1 리뷰 패치 반영`
- `e4e0c53` `[Execution] Dave: Story 3.1 월드 스테이지 데이터 로딩 구현`
- `8cda903` `[Execution] Dave: Story 2.3 리뷰 패치 반영`

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `Zustand = lightweight UI/view state only`
- Mutable progression state uses repository boundaries
- Static content uses typed config loader boundaries
- Scene code must not determine save or unlock policy

### References

- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/stories.md` - `Story 3.2: 월드맵/스테이지 선택/별점 흐름 구현`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/3-1-world-stage-data-and-loading.md` - `Completion Notes`, `Project Structure Notes`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/epics.md` - `Epic 3: 퍼즐 월드 & 레벨`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md` - `진행/해금`, `Repository + typed config loader`, `ui/screens`, `platform/persistence`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md` - `진행 구조`, `월드 해금`, `반복 플레이 목표`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md` - `progression/reward/unlock flows`, `Scene policy 금지`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/platform/persistence/progression.repository.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/assets/loaders/stage-config.loader.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story 3.2 context generated from `stories.md`, Epic 3 requirements, repository
  and progression architecture rules, and the new Story 3.1 loader boundary.
- Existing code inspection shows progression persistence is currently minimal and
  will need per-stage star/completion expansion for world-map rendering.
- Story 3.1 now provides normalized stage selection and stage kind data that
  Story 3.2 can project into world-map UI and persistence flow.

### Completion Notes List

- Prepared Story 3.2 as the first player-visible progression loop above Story 3.1's
  content loading boundary.
- Scoped the story around repository-backed progression state, selector-driven
  world map rendering, stage selection, and stage result persistence.
- Kept Story 3.3 concerns such as tutorial/challenge/climax presentation and
  unlock arc policy as follow-on work rather than overloading this story.
- Expanded progression persistence to store per-stage unlock, completion, and best-star
  state while preserving the last played stage selection for boot continuity.
- Added a selector-driven world map panel and stage clear feedback loop that persists
  stars and reflects the updated stage state on the next render.
- Reused the Story 3.1 stage loader path for selected stages and added runtime bridge
  stage-clear signaling so Phaser remains focused on the active stage only.

### File List

- app/assets/loaders/stage-config.loader.ts
- app/domain/models/progression-model.ts
- app/game/core/create-game-runtime.ts
- app/game/hud-bridges/game-runtime-bridge.ts
- app/game/scenes/StageScene.ts
- app/platform/persistence/progression.repository.ts
- app/state/machines/progression.machine.ts
- app/state/selectors/progression.selectors.ts
- app/tests/unit/game-runtime-bridge.test.mjs
- app/tests/unit/progression.machine.test.mjs
- app/tests/unit/progression.repository.test.mjs
- app/ui/components/WorldMapPanel.tsx
- app/ui/screens/GameShell.tsx
- _bmad-output/implementation-artifacts/3-2-world-map-stage-selection-stars.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
