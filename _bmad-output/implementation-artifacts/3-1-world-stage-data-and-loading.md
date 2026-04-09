# Story 3.1: 월드/스테이지 데이터 모델과 로딩 구현

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want world and stage data to load consistently,
so that content can scale without brittle hardcoding.

## Acceptance Criteria

1. Given static content definitions exist, when a world or stage is requested,
   then the app must load data through typed config loaders and asset manifests,
   and runtime code must not directly read raw files.
2. Given a stage payload is loaded, when the runtime boots that stage, then the
   scene must receive only normalized stage configuration, and the data model
   must support tutorial, normal, challenge, and climax stage types.

## Tasks / Subtasks

- [ ] Define typed world/stage domain models and loader contracts. (AC: 1, 2)
  - [ ] Add explicit model types for world metadata, stage metadata, stage type,
        and normalized runtime stage configuration.
  - [ ] Keep file/data shape decoding separate from runtime-facing normalized
        config so Scene code never depends on raw asset layout.
  - [ ] Represent tutorial, normal, challenge, and climax as typed stage kinds
        instead of ad hoc string checks spread across runtime code.
- [ ] Introduce typed config loader and manifest entry points for content access.
      (AC: 1)
  - [ ] Create loader modules under `app/assets/loaders` or `app/config` that
        expose typed APIs for world and stage lookup.
  - [ ] Route static asset/data discovery through manifest modules rather than
        direct Scene/file reads.
  - [ ] Keep recoverable lookup/load failures on typed result paths consistent
        with the architecture guidance.
- [ ] Normalize loaded stage payloads before runtime boot. (AC: 2)
  - [ ] Add a normalization step that transforms raw stage content into the
        minimal stage config consumed by runtime bootstrapping.
  - [ ] Ensure `StageScene` or runtime boot code receives only normalized stage
        config and not raw world/stage asset documents.
  - [ ] Preserve extension points for future stage presentation differences such
        as tutorial/challenge/climax rules and UI treatment.
- [ ] Wire initial world/stage loading into the current app boot path. (AC: 1, 2)
  - [ ] Choose a minimal entry world/stage flow that fits the current shell
        without prematurely building the full world-map UI from Story 3.2.
  - [ ] Keep content ownership outside Phaser runtime so future progression and
        selection flows can swap stage payloads cleanly.
  - [ ] Add structured logs with `worldId` and `stageId` where load/boot
        boundaries are crossed.
- [ ] Add focused verification for loader boundaries and normalization. (AC: 1, 2)
  - [ ] Add unit tests for typed loader success/failure and normalization output.
  - [ ] Add at least one test proving unsupported direct raw-file access is not
        required by runtime code paths.
  - [ ] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [ ] Manually verify: the app boots a stage through the new loader path and
        stage kind metadata is visible in logs/debug output.

## Dev Notes

### Story Intent

Story 3.1은 Epic 3의 기반 스토리다. 지금까지는 하나의 플레이 루프를 빠르게
완성하는 데 집중했다면, 이번 단계부터는 "콘텐츠가 늘어나도 버티는 구조"를
만들어야 한다. 핵심은 월드/스테이지 데이터를 typed loader와 manifest 경로로
읽고, runtime에는 정규화된 stage config만 넘겨서 이후 월드맵/별점/해금 흐름이
하드코딩 없이 이어지게 만드는 것이다.

### Epic Context

- Epic 3의 목표는 월드, 스테이지, 별점, 맵 선택 흐름을 붙여 실제 콘텐츠 루프를
  만들기 시작하는 것이다.
- Story 3.1은 그중 가장 아래 기반인 "데이터 모델과 로딩 경계"를 닫는 역할이다.
- Story 3.2의 월드맵/별점과 Story 3.3의 튜토리얼/챌린지/클라이맥스 분기는 모두
  Story 3.1의 typed stage model을 전제로 확장될 가능성이 높다.

### Story 3.1 Foundation

- User story: 플레이어는 월드와 스테이지 데이터가 일관되게 로드되어 콘텐츠가
  늘어나도 흐름이 깨지지 않아야 한다.
- Success criteria:
  - 월드/스테이지 데이터는 typed config loader와 manifest 경로로 로드된다.
  - runtime은 raw 파일이나 raw payload를 직접 읽지 않는다.
  - Scene은 normalized stage config만 받는다.
  - stage type은 tutorial, normal, challenge, climax를 지원한다.

### Previous Story Intelligence

Stories 1.x와 2.x에서 플레이 가능한 코어 루프와 modifier 시스템은 이미 갖춰져 있다.

- `StageScene.ts`는 현재 단일 스테이지 기준 런타임 루프를 담당한다.
- `session.machine.ts`와 bridge 계층은 실패/재도전/피버 같은 세션 오케스트레이션을
  이미 처리 중이다.
- Epic 2 완료로 플레이 한 턴의 감각은 준비됐고, 이제 Epic 3에서 "어떤 스테이지를
  어떤 데이터로 부팅하는가"를 구조화해야 한다.
- Story 3.2, 3.3에서 월드맵/별점/튜토리얼 분기를 붙일 것이므로, 이번 스토리에서
  stage kind와 loader contract를 너무 좁게 고정하면 후속 확장이 어려워진다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일/경로:
  - `app/game/scenes/StageScene.ts`
  - `app/game/core/`
  - `app/domain/models/`
  - `app/config/`
  - `app/assets/manifests/`
  - `app/assets/loaders/`
  - `app/tests/unit/`
- 새로 생길 가능성이 높은 경로:
  - `app/domain/models/world-model.ts`
  - `app/domain/models/stage-model.ts`
  - `app/assets/loaders/stage-config.loader.ts`
  - `app/assets/manifests/world-content.manifest.ts`
  - `app/tests/unit/stage-config-loader.test.mjs`
- 이미 있는 유용한 기반:
  - `app/` 내부 아키텍처 구획
  - structured logger
  - runtime boot shell과 current stage startup path

### Technical Requirements

- static content access는 typed config loader + manifest 경로로만 수행한다.
- mutable progression data는 repository가 소유하고, 이번 스토리의 static world/stage
  content와 혼동하지 않는다.
- runtime boot는 normalized stage config만 받아야 한다.
- stage kind는 최소 `tutorial | normal | challenge | climax`를 지원해야 한다.
- recoverable load failure는 typed result 또는 명시적 handled path를 우선한다.

### Architecture Compliance Guardrails

- `StageScene`와 Phaser runtime은 raw JSON 파일을 직접 읽지 않는다.
- static content는 `app/assets/loaders` 또는 `app/config`의 typed API를 거친다.
- world/stage metadata와 runtime config normalization은 Scene 밖 계층에서 끝내야 한다.
- future progression state는 repository-backed로 붙을 예정이므로, 이번 스토리에서
  static content loader와 persistence responsibility를 섞지 않는다.
- 구조화 로그는 `worldId`, `stageId`를 포함해 이후 progression debugging에
  도움이 되도록 남긴다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/game/core/`
- `app/game/scenes/StageScene.ts`
- `app/domain/models/`
- `app/config/`
- `app/assets/manifests/`
- `app/assets/loaders/`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/domain/models/world-model.ts`
- `app/domain/models/stage-model.ts`
- `app/assets/loaders/stage-config.loader.ts`
- `app/assets/manifests/world-content.manifest.ts`
- `app/tests/unit/stage-config-loader.test.mjs`

### Project Structure Notes

- 올바른 흐름은 `static content definition -> typed loader/manifest -> normalized
  stage config -> runtime boot`이다.
- Scene에서 `import ...json` 또는 파일 경로 기반 직접 접근을 늘리는 방향은 피해야 한다.
- Story 3.2의 world map은 이번 loader contract를 사용해 stage list와 world metadata를
  조회하는 방향으로 이어지는 것이 자연스럽다.
- Story 3.3의 stage kind 분기도 이번 스토리의 normalized stage config 위에서
  presentation/rule profile만 덧붙이는 방식이 바람직하다.

### Library / Framework Requirements

- Phaser는 runtime only 원칙을 유지한다.
- XState는 세션/진행 오케스트레이션에 집중하고 static content 소유를 가져가지 않는다.
- React는 후속 world-map UI에서 loader/repository selector 결과를 소비하는 방향을 유지한다.
- config/data access는 아키텍처 문서의 `Repository + typed config loader` 패턴을 따른다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - stage kind normalization 테스트
  - loader lookup 실패 시 handled path 테스트
  - runtime boot path가 normalized config만 받는지 확인
  - structured logs에 `worldId`, `stageId`가 남는지 확인

### UX / Player-Facing Constraints

- 지금 단계에서는 full world-map UI보다, "콘텐츠가 바뀌어도 올바른 stage가 뜬다"는
  안정성이 우선이다.
- tutorial/challenge/climax 차이는 이번 단계에서 presentation shell이 아니라
  data model에 먼저 안전하게 담겨야 한다.
- 이후 월드맵이 붙을 때도 모바일 로딩 템포를 해치지 않도록, shared core assets와
  world/stage asset loading 경계를 분리할 수 있어야 한다.

### Anti-Patterns To Avoid

- Phaser Scene에서 raw 파일을 직접 읽는 구조
- static content loader와 progression repository 책임을 한 모듈에 섞는 구조
- runtime이 stage type별 raw branching 규칙을 하드코딩하는 구조
- stage payload를 정규화 없이 여러 계층에 그대로 흘리는 구조
- Story 3.2/3.3 확장을 어렵게 만드는 overly narrow stage model

### Git Intelligence Summary

최근 흐름은 Epic 2의 Story 2.1, 2.2, 2.3이 구현과 리뷰 패치까지 모두 완료된 상태다.
즉 코어 루프와 차별화 메커닉은 준비됐고, Epic 3부터는 콘텐츠 루프를 담는 데이터와
로딩 구조를 세우는 단계로 넘어간다.

최근 관련 커밋:

- `8cda903` `[Execution] Dave: Story 2.3 리뷰 패치 반영`
- `0ba2a0f` `[Execution] Dave: Story 2.3 게이트 피버 조합 피드백 구현`
- `3770ac7` `[Execution] Dave: Story 2.2 리뷰 패치 반영`

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `Zustand = lightweight UI/view state only`
- Data access uses `repository/config loader` boundaries
- Do not bypass repositories/config loaders with direct file access
- Use hybrid loading: shared core assets preload first, world/stage assets load on entry

### References

- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/stories.md` - `Story 3.1: 월드/스테이지 데이터 모델과 로딩 구현`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/epics.md` - `Epic 3: 퍼즐 월드 & 레벨`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md` - `System Location Mapping`, `Data Patterns`, `app/assets/manifests`, `app/assets/loaders`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md` - `월드 구조`, `튜토리얼/일반/챌린지/월드 마지막 흐름`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md` - `hybrid loading`, `direct file access 금지`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/scenes/StageScene.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story 3.1 context generated from `stories.md`, Epic 3 planning notes,
  architecture data-access rules, project context loading rules, and the current
  single-stage runtime structure.
- Planning artifacts explicitly require `typed config loader` and `asset manifest`
  boundaries for static content, plus normalized stage config before runtime boot.
- Existing implementation status indicates Epic 2 is complete enough that Epic 3
  can now focus on content loading rather than core mechanic changes.

### Completion Notes List

- Prepared Story 3.1 as the bridge from a single hardcoded playable stage toward
  scalable world/stage content loading.
- Fixed the implementation guardrails so future world map, stars, tutorial, and
  climax flows can build on a typed content boundary instead of Scene-local reads.
- Scoped this story to content models, loaders, manifests, and normalization,
  while intentionally deferring world-map UI and progression persistence to
  Stories 3.2 and 4.x.

### File List

- _bmad-output/implementation-artifacts/3-1-world-stage-data-and-loading.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
