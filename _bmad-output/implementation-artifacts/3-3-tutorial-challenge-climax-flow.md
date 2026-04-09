# Story 3.3: 튜토리얼/챌린지/월드 마지막 흐름 구현

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want stages to teach, test, and climax in distinct ways,
so that each world has a clear arc.

## Acceptance Criteria

1. Given a tutorial or challenge stage type is loaded, when the stage starts,
   then the UI and runtime must apply the correct stage presentation and rules
   profile
   and tutorial stages must support teach-by-play instead of text-only flow.
2. Given a world-ending climax stage is cleared, when the result is processed,
   then the progression flow must unlock the next content according to the
   defined rules
   and replay goals such as stars or perfect must remain available.

## Tasks / Subtasks

- [x] Define explicit stage-type presentation and rules profiles. (AC: 1, 2)
  - [x] Extend normalized stage config or adjacent domain metadata so tutorial,
        normal, challenge, and climax stages expose runtime-safe profile flags.
  - [x] Keep stage-type branching in loader/domain/orchestration layers rather
        than scattering ad hoc string checks across `StageScene` and React.
  - [x] Preserve room for future bonus stages and Epic 4 unlock conditions
        without overfitting this story to current content only.
- [x] Implement tutorial teach-by-play flow inside the playable stage shell.
      (AC: 1)
  - [x] Add lightweight in-run guidance hooks that surface mechanic teaching
        through safe first actions, timing prompts, or contextual cues.
  - [x] Avoid long blocking text overlays; the player should learn while still
        interacting with the live stage.
  - [x] Keep tutorial help driven by typed stage profile/config instead of
        Scene-local hardcoded stage IDs.
- [x] Differentiate challenge and climax presentation/rule treatment. (AC: 1, 2)
  - [x] Ensure challenge stages emphasize optional mastery and replay goals
        without breaking the normal clear flow.
  - [x] Ensure climax stages read as the world-ending test through stronger
        presentation/result treatment while still reusing the same core runtime.
  - [x] Keep gameplay rules and presentation feedback on their established
        boundaries: runtime for active stage behavior, React/effects for shell
        treatment and result surfacing.
- [x] Extend progression result handling for climax completion and next-content
      unlock. (AC: 2)
  - [x] Define how clearing a climax stage unlocks the next world or next
        content node without moving unlock policy into Phaser Scene code.
  - [x] Preserve replay availability for already-cleared stages, including
        stars and future perfect-style goals.
  - [x] Keep unlock writes inside repository/orchestration boundaries and ensure
        the world map reflects the new content on the next render.
- [x] Add focused verification for stage-type flow and progression outcomes.
      (AC: 1, 2)
  - [x] Add tests for stage profile projection and stage-type-specific flow
        selection.
  - [x] Add at least one test covering climax clear -> next content unlock while
        preserving replayable star goals.
  - [x] Run `npm run test`, `npm run typecheck`, and `npm run build` in `app/`.
  - [x] Manually verify: tutorial stages guide through play, challenge stages
        present mastery framing, and a climax clear unlocks next content.

## Dev Notes

### Story Intent

Story 3.3은 Epic 3의 콘텐츠 루프를 "맵에서 고른 스테이지를 플레이한다" 수준에서
"각 월드가 배우고, 시험하고, 마무리하는 구조를 가진다" 수준으로 끌어올리는
단계다. Story 3.1이 stage kind와 loader 경계를 만들었고 Story 3.2가 월드맵,
별점, 진행 저장을 연결했다면, 이번 스토리는 그 위에서 `tutorial`,
`challenge`, `climax`가 실제 플레이 경험과 진행 해금 규칙에 어떤 차이를
만드는지 닫아야 한다.

핵심은 두 가지다. 첫째, 튜토리얼은 설명 화면이 아니라 플레이 안에서 배우게 해야
한다. 둘째, 월드 마지막 스테이지는 progression과 presentation 모두에서
"월드의 마무리"로 읽혀야 하며, 클리어 후에도 별점/재도전 목표는 남아야 한다.

### Epic Context

- Epic 3의 목표는 월드, 스테이지, 별점, 해금 구조를 통해 실제 게임다운 콘텐츠
  루프를 만드는 것이다.
- Story 3.3은 Epic 3의 마지막 콘텐츠 구조 스토리로, 월드의 학습 곡선과
  클라이맥스 감각을 완성하는 역할이다.
- Epic 4에서 XP, 추가 해금 조건, BM 분기가 붙기 전에, 기본적인 월드 progression
  arc와 special stage handling을 먼저 안정화해야 한다.

### Story 3.3 Foundation

- User story: 플레이어는 스테이지가 가르치고, 시험하고, 마무리하는 서로 다른
  역할을 가져 각 월드에 분명한 arc를 느껴야 한다.
- Success criteria:
  - tutorial/challenge/climax stage type이 시작 시 올바른 presentation/rule
    profile을 적용한다.
  - tutorial은 teach-by-play 구조를 지원한다.
  - climax clear는 정의된 규칙에 따라 다음 콘텐츠를 해금한다.
  - cleared stage의 replay goals는 유지된다.

### Previous Story Intelligence

Story 3.1과 3.2가 이번 스토리의 직접 기반이다.

- `stage-config.loader.ts`와 normalized stage config는 이미 stage kind를
  전달할 수 있는 기반을 갖고 있다.
- `progression.repository.ts`, `progression.machine.ts`, world-map selectors는
  stage clear와 unlock 반영을 처리할 수 있는 경계를 이미 세워 두었다.
- `StageScene.ts`는 active stage runtime에 집중하고 있으므로, 이번 스토리도
  stage-type별 정책을 Scene 내부에 과도하게 넣지 않는 것이 중요하다.
- Story 4.x에서 별점 외 추가 unlock 조건이 붙을 예정이므로, 이번 스토리의 unlock
  로직은 "climax clear 기반 기본 흐름"까지만 닫고 확장 지점을 남겨야 한다.

### Existing Codebase Intelligence

- 현재 직접 수정 가능성이 높은 파일/경로:
  - `app/domain/models/`
  - `app/assets/loaders/stage-config.loader.ts`
  - `app/platform/persistence/progression.repository.ts`
  - `app/state/machines/progression.machine.ts`
  - `app/state/selectors/progression.selectors.ts`
  - `app/ui/screens/GameShell.tsx`
  - `app/ui/components/`
  - `app/game/core/create-game-runtime.ts`
  - `app/game/scenes/StageScene.ts`
  - `app/tests/unit/`
- 새로 생길 가능성이 높은 경로:
  - `app/domain/models/stage-presentation-model.ts`
  - `app/game/tutorial/`
  - `app/ui/components/stage-profile-banner/`
  - `app/tests/unit/progression-machine.test.mjs`
  - `app/tests/unit/stage-profile-*.test.mjs`
- 이미 있는 유용한 기반:
  - typed world/stage loader boundary
  - repository-backed progression state
  - world map and stage selection flow
  - runtime bridge and result signaling path

### Technical Requirements

- stage type별 규칙 차이는 typed stage profile 또는 adjacent normalized metadata로
  표현해야 한다.
- tutorial guidance는 teach-by-play여야 하며, long-form blocking modal/text만으로
  대체하지 않는다.
- climax clear 후 next-content unlock은 repository/orchestration 계층에서
  처리되어야 한다.
- replay goals는 cleared state 이후에도 유지되어야 한다.
- challenge/climax 차이는 presentation 강화와 progression arc에서 읽혀야 하지만,
  코어 runtime 루프를 새로 분기시키는 방식은 피한다.

### Architecture Compliance Guardrails

- `StageScene`는 active stage runtime만 담당하고, world unlock policy를 직접
  소유하지 않는다.
- static content는 typed config loader를 통해 읽고, mutable progression은
  repository를 통해 쓴다.
- tutorial/challenge/climax branching은 typed profile + orchestration + UI
  boundaries로 나뉘어야 한다.
- React는 stage shell/presentation을, Phaser는 live runtime behavior를, XState와
  repository는 progression policy를 담당한다.
- stage ID 하드코딩으로 special flow를 붙이는 방식은 피한다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/domain/models/`
- `app/assets/loaders/stage-config.loader.ts`
- `app/platform/persistence/progression.repository.ts`
- `app/state/machines/`
- `app/state/selectors/`
- `app/ui/screens/`
- `app/ui/components/`
- `app/game/core/`
- `app/game/scenes/StageScene.ts`
- `app/tests/unit/`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/domain/models/stage-presentation-model.ts`
- `app/game/tutorial/`
- `app/ui/components/StageProfileBanner.tsx`
- `app/tests/unit/stage-profile.test.mjs`
- `app/tests/unit/progression.repository.test.mjs`

### Project Structure Notes

- 올바른 흐름은 `typed stage kind/profile -> boot/orchestration decision ->
  runtime presentation hooks + UI shell treatment -> result finalization ->
  repository unlock update -> world-map refresh` 이다.
- tutorial은 별도 설명 화면으로 빠지는 흐름보다, active stage 안에서 guidance가
  붙는 방식이 더 적합하다.
- challenge는 optional mastery framing과 replay 목표를 강조하는 쪽이 맞고,
  climax는 world-ending unlock/result arc를 강조하는 쪽이 맞다.
- Story 4.x에서 level/star-based unlock 조건이 더 늘어나므로, 이번 스토리에서는
  climax clear unlock을 "기본 경로"로 두고 조건식 확장성을 남겨야 한다.

### Library / Framework Requirements

- Phaser는 runtime only 원칙을 유지한다.
- XState는 progression/session orchestration에 사용한다.
- React는 stage shell, map reflection, result messaging 같은 presentation을
  담당한다.
- repository/config loader 경계는 Story 3.1과 3.2에서 세운 규칙을 유지한다.

### Testing Requirements

- 필수 검증:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
- 강하게 권장되는 검증:
  - tutorial/challenge/climax profile projection 테스트
  - climax clear 이후 next-content unlock 테스트
  - replay goal preservation 테스트
  - world-map selector가 new unlock state를 반영하는지 확인

### UX / Player-Facing Constraints

- tutorial은 “읽고 이해”보다 “짧게 해보고 바로 성공”을 우선해야 한다.
- challenge는 기본 진행을 막는 벌점보다 optional mastery tone이 중요하다.
- climax는 월드의 마무리처럼 느껴져야 하지만, 클리어 후에도 재도전과 별점 수집
  동기는 남아야 한다.
- 모바일에서도 tutorial cue, challenge framing, climax result가 과도한 텍스트
  없이 읽혀야 한다.

### Anti-Patterns To Avoid

- special stage handling을 stage ID 하드코딩으로 붙이는 구조
- tutorial을 long blocking text-only flow로 만드는 구조
- world unlock policy를 `StageScene` 안에서 직접 결정하는 구조
- replay goals를 clear 처리와 함께 소거하는 구조
- Story 4.x 확장을 어렵게 만드는 overly narrow unlock logic

### Git Intelligence Summary

최근 흐름은 Story 3.1이 typed content boundary를 닫고, Story 3.2가 world-map,
stage selection, stars, progression persistence를 붙인 상태다. 따라서 Story 3.3은
새 persistence 구조를 다시 흔들기보다, stage kind별 플레이 경험과 climax unlock
flow를 그 위에 얹는 방식이 가장 자연스럽다.

최근 관련 커밋:

- `016b3ba` `[Execution] Dave: Story 3.2 리뷰 패치 반영`
- `3d46e67` `[Execution] Dave: Story 3.2 월드맵 선택과 별점 흐름 구현`
- `96f1635` `[Execution] Dave: Story 3.1 리뷰 패치 반영`

### Project Context Rules

- `XState = single source of truth`
- `Phaser = runtime only`
- `React = presentation only`
- `Zustand = lightweight UI/view state only`
- Static content uses typed config loader boundaries
- Mutable progression state uses repository boundaries
- Scene code must not own unlock/save policy

### References

- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/stories.md` - `Story 3.3: 튜토리얼/챌린지/월드 마지막 흐름 구현`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/3-1-world-stage-data-and-loading.md`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/3-2-world-map-stage-selection-stars.md`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/epics.md` - `Epic 3: 퍼즐 월드 & 레벨`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md` - `Level Types`, `Tutorial Integration`, `Unlock System`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/platform/persistence/progression.repository.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/scenes/StageScene.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story 3.3 context generated from `stories.md`, Epic 3 requirements, GDD level
  type and unlock notes, plus Story 3.1/3.2 implementation boundaries.
- Existing code inspection shows stage kind metadata, progression repository, and
  world-map selectors are already in place, making this story primarily about
  stage-type differentiation and climax unlock orchestration.

### Completion Notes List

- Added typed stage presentation/rules/unlock profiles to the loader output so
  `tutorial`, `challenge`, and `climax` stages arrive at runtime with explicit
  profile data instead of ad hoc kind branching.
- Added a second world manifest entry and wired climax completion to unlock the
  next world and its first stage through the progression repository boundary.
- Added a stage profile banner plus richer world-map rendering so tutorial,
  challenge, and climax stages read differently before the player even starts a
  run.
- Updated `StageScene` to apply stage-type rule differences through loss-line
  buffer and gate layout profiles, while tutorial stages surface teach-by-play
  prompts inside the live stage shell.
- Verified the new behavior with loader and repository regression tests plus
  `npm run test`, `npm run typecheck`, and `npm run build`.

### File List

- _bmad-output/implementation-artifacts/3-3-tutorial-challenge-climax-flow.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/assets/loaders/stage-config.loader.ts
- app/assets/manifests/world-content.manifest.ts
- app/domain/models/progression-model.ts
- app/domain/models/stage-model.ts
- app/game/entities/stage-gates.ts
- app/game/scenes/StageScene.ts
- app/platform/persistence/progression.repository.ts
- app/state/selectors/progression.selectors.ts
- app/tests/unit/progression.repository.test.mjs
- app/tests/unit/stage-config.loader.test.mjs
- app/ui/components/StageProfileBanner.tsx
- app/ui/components/WorldMapPanel.tsx
- app/ui/screens/GameShell.tsx
