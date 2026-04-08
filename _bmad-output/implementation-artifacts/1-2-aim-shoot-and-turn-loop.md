# Story 1.2: 조준/발사/턴 해석 루프 구현

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to drag to aim and release to shoot,
so that I can control each turn directly.

## Acceptance Criteria

1. Given the stage runtime is active, when the player drags and releases an aim
   gesture, then the ball must launch through Phaser runtime systems and the turn
   resolver must produce a deterministic turn result.
2. Given a turn resolves, when the ball returns and the board updates, then the
   board descent and loss pressure must be applied in the same turn cycle and
   runtime logic must stay inside `app/game`.

## Tasks / Subtasks

- [ ] Build the first playable aim and shot loop inside `app/game` only. (AC: 1)
  - [ ] Replace the current placeholder-only `StageScene` with a real stage
        runtime surface that supports drag-to-aim preview and release-to-shoot.
  - [ ] Keep pointer capture, aim vector calculation, launch velocity, and shot
        start gating inside Phaser runtime code, not React components.
  - [ ] Preserve mobile-first drag feel while keeping mouse drag/release
        behavior aligned for web/PC.
- [ ] Add deterministic turn resolution boundaries for Story 1.2 scope. (AC: 1, 2)
  - [ ] Introduce a pure or framework-light resolver layer under
        `app/game/systems` for turn completion, board descent, and loss-line
        evaluation.
  - [ ] Ensure the resolver produces the same result for the same runtime inputs
        without Scene-local ad hoc ordering.
  - [ ] Leave extension seams so Story 2.x can later apply
        `base -> gate -> fever -> finalize` without rewriting Story 1.2 code.
- [ ] Establish minimal board, ball, and collision structure required for the
      core loop. (AC: 1, 2)
  - [ ] Create only the entities/mechanics needed for one basic ball, destructible
        blocks, return detection, and board descent pressure.
  - [ ] Prefer Phaser Arcade Physics for the initial collision loop unless a
        smaller custom runtime boundary is clearly simpler within current scope.
  - [ ] Keep high-frequency runtime objects ready for pooling-friendly evolution;
        do not lock the code into repeated hot-loop allocation patterns.
- [ ] Keep ownership boundaries compatible with Story 1.1 and future session
      flows. (AC: 2)
  - [ ] Keep turn runtime truth in `app/game`; do not move gameplay rules into
        React or Zustand.
  - [ ] Use `GameRuntimeBridge` only for intentional runtime-to-orchestration/HUD
        signals that Story 1.2 actually needs.
  - [ ] Do not implement fail/retry/ad policy in Scene code; Story 1.3 and 1.4
        own those flows.
- [ ] Verify the loop through lightweight but meaningful checks. (AC: 1, 2)
  - [ ] Run `npm run typecheck` in `app/`.
  - [ ] Run `npm run build` in `app/`.
  - [ ] Manually verify drag aim, release shot, block hit/destruction, turn end,
        board descent, and visible loss pressure in the running build.

## Dev Notes

### Story Intent

이 스토리는 Epic 1의 실제 플레이 감각이 처음 나타나는 구간이다. 목표는
`조준 -> 발사 -> 충돌/파괴 -> 공 회수 -> 보드 하강`의 최소 플레이어블 루프를
안정적으로 만드는 것이다. 단순히 공을 움직이는 데서 끝나면 안 되고, 한 턴이
끝났다고 판정되는 기준과 그 직후의 보드 압박이 한 사이클 안에서 일관되게
이어져야 한다.

이번 단계는 코어 플레이 루프를 세우는 작업이지, 실패/즉시 재도전이나 광고
재도전까지 한 번에 끌고 오는 단계가 아니다. 따라서 Story 1.3과 1.4의 상태
분기를 미리 과도하게 구현하지 말고, 후속 스토리가 안전하게 올라올 수 있는
턴 해석 경계와 런타임 구조를 먼저 확정하는 것이 핵심이다.

### Epic Context

- Epic 1의 목표는 조준, 발사, 블록 파괴, 턴 종료, 실패/재도전까지 이어지는
  최소 플레이어블을 만드는 것이다.
- Story 1.2는 이 에픽의 중심축이며, 이후 Story 1.3의 실패/재도전과 Story
  2.x의 gate/fever modifier는 모두 여기서 정한 턴 해석 경계를 전제로 한다.
- GDD 기준 핵심 감각은 `내 선택이 결과를 바꾸는 샷 설계`와 `답답함 없이 계속
  이어지는 템포`다. 구현은 화려함보다 입력 반응성과 턴 템포를 먼저 보장해야
  한다.

### Story 1.2 Foundation

- User story: 플레이어가 드래그로 각도를 잡고 릴리즈로 발사해 각 턴을 직접
  제어할 수 있어야 한다.
- Success criteria:
  - 드래그 조준과 릴리즈 발사가 직관적으로 반응한다.
  - 발사 후 공의 충돌/파괴 결과가 일관된 턴 결과로 정리된다.
  - 턴 종료 직후 보드 하강과 압박 증가가 같은 사이클 안에서 반영된다.
  - 이 핵심 루프의 규칙은 `app/game` 안에 남고 React/HUD는 표시만 담당한다.

### Previous Story Intelligence

Story 1.1에서 이미 고정된 기준을 그대로 이어가야 한다.

- `app/`가 유일한 실행 루트다. 설치/개발/빌드/타입체크는 모두
  `bmad-projects/neo-brick-crush/app` 기준으로 수행한다.
- 현재 `main.tsx -> bootstrap/create-app.tsx -> bootstrap/register-providers.tsx
  -> bootstrap/mount-game-shell.tsx` 부트스트랩 흐름은 유지해야 한다.
- `GameShell.tsx`는 Phaser 런타임 호스트와 HUD를 붙이는 프레젠테이션 경계다.
  조준/충돌/턴 로직을 이 파일로 끌어올리면 안 된다.
- `create-game-runtime.ts`와 `game-runtime-bridge.ts`는 현재 runtime ready
  신호만 다루고 있다. Story 1.2에서 bridge를 늘리더라도 explicit event
  boundary를 유지해야 한다.
- `StageScene.ts`는 아직 placeholder 화면만 렌더링하므로, 실제 Story 1.2의
  주요 구현 진입점은 여기서 시작된다.
- `session.machine.ts`는 현재 boot/ready/failed의 최소 세션 흐름만 가진다.
  이번 스토리에서는 세션 전체 정책보다 턴 루프 정착이 우선이며, 실패 정책을
  Scene 내부에 넣지 않는 선에서 필요한 연결만 최소화해야 한다.

### Existing Codebase Intelligence

- 이미 존재하는 경로:
  - `app/game/scenes/StageScene.ts`
  - `app/game/core/create-game-runtime.ts`
  - `app/game/hud-bridges/game-runtime-bridge.ts`
  - `app/state/machines/session.machine.ts`
  - `app/state/selectors/session.selectors.ts`
  - `app/state/stores/use-ui-store.ts`
  - `app/ui/screens/GameShell.tsx`
  - `app/ui/components/HudPanel.tsx`
- 아직 비어 있거나 없는 구조:
  - `app/game/systems/` 턴 해석/보드 하강 계층
  - `app/game/mechanics/` 조준/발사 메커닉
  - `app/game/entities/` ball/block 같은 런타임 엔티티
  - `app/ui/hud/` 전용 HUD 컴포넌트 계층
- 따라서 이번 스토리는 현재 placeholder Scene을 실제 코어 루프로 교체하면서,
  아키텍처가 의도한 디렉터리 구조를 처음으로 실질 사용하기 시작하는 작업이다.

### Technical Requirements

- 런타임 엔진은 `Phaser 3.90.0` 기준을 유지한다.
- 프레젠테이션은 `React 18`, 세션 오케스트레이션은 `XState v5`,
  경량 UI 상태는 `Zustand 4`, recoverable error 모델은 `neverthrow`
  기준을 유지한다.
- 조준 입력은 모바일 터치 기준으로 자연스러워야 하며, 웹/PC의 마우스 드래그와
  릴리즈도 같은 핵심 감각으로 동작해야 한다.
- 한 턴의 루프는 짧고 빠르게 이어져야 한다. 턴 종료 판정 후 보드 하강을 따로
  지연된 다른 흐름으로 분리하지 말고 같은 turn cycle 안에서 닫아야 한다.
- Story 1.2 범위의 deterministic turn result는 "같은 발사/충돌 입력 조건이면
  같은 turn resolution ordering을 보장"한다는 의미로 해석한다.
- Scene 내부 즉흥 로직이 아니라, 추후 gate/fever modifier를 얹을 수 있는
  resolver entry point를 기준으로 계산 순서를 고정해야 한다.

### Architecture Compliance Guardrails

- `Phaser = runtime only`. 조준, 발사, 충돌, 턴 종료, 보드 하강 같은 핵심
  루프는 `app/game` 안에서 끝내야 한다.
- `React = presentation only`. HUD는 조준선 계산, 충돌 판정, 승패 판정을 직접
  계산하지 않는다.
- `XState = single source of truth` for session lifecycle. 다만 Story 1.2의
  turn-internal physics state까지 모두 XState로 밀어 넣지 말고, 세션 전이와
  런타임 판정을 구분한다.
- `Zustand = lightweight UI state only`. 런타임 볼 위치, 블록 HP, 턴 판정 중간
  상태를 store에 복제하지 않는다.
- runtime to UI 연결은 `GameRuntimeBridge`나 selector projection을 통해
  의도적으로만 노출한다.
- future modifier pipeline을 고려하되, Story 2.x의 gate/fever 동작을 이번
  스토리에서 미리 구현하지 않는다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/game/scenes/StageScene.ts`
- `app/game/core/create-game-runtime.ts`
- `app/game/hud-bridges/game-runtime-bridge.ts`
- `app/ui/screens/GameShell.tsx`
- `app/ui/components/HudPanel.tsx`
- `app/state/selectors/session.selectors.ts`
- `app/state/stores/use-ui-store.ts`

이번 스토리에서 새로 생길 가능성이 높은 경로:

- `app/game/systems/turn-resolver.ts`
- `app/game/systems/board-descent.ts`
- `app/game/mechanics/aim-shot-controller.ts`
- `app/game/entities/ball-factory.ts`
- `app/game/entities/block-factory.ts`
- `app/game/entities/stage-board.ts`
- `app/game/mechanics/shot-return-detector.ts`

파일명과 위치는 아키텍처 naming 규칙에 맞춰 조정할 수 있지만, 책임 분리는
반드시 유지해야 한다. `app/shared`를 임시 보관소처럼 사용해 Story 1.2 핵심
로직을 넣지 말 것.

### Project Structure Notes

- 아키텍처는 `app/game/systems`, `app/game/entities`, `app/game/mechanics`를
  코어 런타임의 주요 위치로 정의한다. Story 1.2는 이 구조를 처음 실사용하는
  단계이므로, Scene 단일 파일에 모든 로직을 몰아넣는 구현은 피해야 한다.
- 그렇다고 초반부터 과도하게 세분화해 10개 이상의 얇은 파일을 억지 생성할
  필요는 없다. 실제 책임 경계가 생기는 만큼만 분리하되, 후속 modifier와
  retry 스토리가 자연스럽게 이어질 정도로는 구조를 열어 둔다.
- `HudPanel.tsx`는 현재 세션 상태만 보여주는 매우 얇은 UI다. Story 1.2에서
  조준 정보나 턴 상태를 표시하더라도, HUD는 selector 기반 최소 구독만 유지해야
  한다.

### Library / Framework Requirements

- Phaser 공식 input 문서는 drag 관련 이벤트(`dragstart`, `drag`, `dragend`)와
  pointer 좌표/거리/각도 정보를 제공한다. Story 1.2에서는 이 입력 계층 또는
  동등한 pointer 처리 패턴을 사용해 조준과 릴리즈를 구현하는 편이 안전하다.
- Phaser 공식 physics 문서는 Arcade Physics를 빠르고 가벼운 2D 충돌 시스템으로
  설명한다. Story 1.2의 기본 ball/block 충돌 루프에는 이 선택이 범위에 맞다.
- XState v5 문서는 running machine을 actor로 다루고 이벤트를 통해 상태 전이를
  표현하는 패턴을 권장한다. Story 1.2에서도 Scene가 직접 UI 정책을 바꾸기보다,
  필요한 high-level runtime event만 actor에 보낼 수 있는 형태를 유지해야 한다.
- Zustand는 selector 기반 구독을 유지해야 한다. broad subscription으로 매 프레임
  HUD를 흔드는 구현은 피한다.

### Testing Requirements

- 필수 검증:
  - `npm run typecheck`
  - `npm run build`
  - 실행 중 drag aim / release shot / block hit / turn end / board descent 확인
- 강하게 권장되는 검증:
  - turn resolver를 framework-light 함수로 분리했다면 동일 입력에 대한 결정적
    결과를 단위 테스트 또는 최소한의 isolated assertion으로 검증
  - board descent와 loss-line 판정 순서가 뒤바뀌지 않는지 검증
  - shot in progress 중 추가 발사가 잠기고, turn resolved 후에만 다음 입력이
    열리는지 검증
- 아직 테스트 러너가 문서상 고정되어 있지 않으므로, Story 1.2에서 새 프레임워크를
  도입한다면 `app/` 내부에 국한하고 범위를 최소화해야 한다.

### UX / Player-Facing Constraints

- 조준은 한눈에 읽히고 미세 조정이 가능해야 한다.
- 발사는 릴리즈 직후 지연 없이 반응해야 한다.
- 한 턴의 결과는 "무슨 일이 일어났는지" 읽을 수 있어야 하며, 블록 파괴와 보드
  하강이 체감되는 템포를 유지해야 한다.
- 모바일 우선 16:9 플레이 필드 인상을 유지해야 하며, HUD가 조준/플레이 영역을
  과도하게 가리면 안 된다.
- 신스웨이브/네온 무드는 유지하되 Story 1.2의 최우선은 입력 감각과 판독성이다.

### Anti-Patterns To Avoid

- StageScene 하나에 입력, 물리, 보드, 턴 해석, HUD projection을 전부 밀어 넣지 말 것.
- React 컴포넌트에서 Phaser pointer나 physics 상태를 직접 읽어 게임 규칙을 계산하지 말 것.
- Zustand에 ball position, block hp, current turn resolution 같은 런타임 truth를 저장하지 말 것.
- Story 1.3의 실패/즉시 재도전 정책, Story 1.4의 광고 재도전 정책을 Scene 내부에 선구현하지 말 것.
- Story 2.x의 gate/fever modifier를 미리 넣겠다고 base turn loop를 복잡하게 만들지 말 것.
- hot loop에서 매 프레임 새 객체/배열을 반복 생성하는 방식으로 구조를 잠그지 말 것.
- direct IndexedDB access, ad SDK calls, analytics calls를 `app/game`에서 하지 말 것.

### Git Intelligence Summary

최근 커밋 기준으로 Story 1.1이 이미 구현되어 런타임 셸, bridge, selector,
앱 루트 구조가 기준선으로 고정되었다. 즉 Story 1.2는 이 기반 위에 첫 실제
플레이 루프를 얹는 작업이며, placeholder Scene을 실질 gameplay runtime으로
대체하는 방향으로 보는 것이 맞다.

최근 커밋 메시지:

- `66b1a99` `[Execution] Dave: Story 1.1 런타임 셸 초기화 구현 및 상태 반영`
- `f02d2a0` `[Execution] Dave: planning artifacts 정리와 app 초기 스캐폴딩 구축`

이 흐름상 가장 중요한 것은 "새 구조를 발명"하는 것이 아니라, 이미 합의된
아키텍처 구조를 실제 gameplay loop에 접목하는 일이다.

### Latest Technical Information

- Stately 공식 문서는 현재 XState docs가 v5 기준이라고 명시하며, machine을
  actor로 실행하고 이벤트를 보내는 패턴을 기본으로 안내한다. Story 1.2의
  runtime/session 연결도 이 actor 이벤트 모델을 유지하는 편이 안전하다.
  Source: https://stately.ai/docs
- XState actors 문서는 actor 테스트 시 `actor.getSnapshot()` 또는 subscribe
  기반 검증을 권장한다. 후속 Story 1.3 전에도 high-level runtime event를
  XState로 보낸다면 이런 검증 방식과 잘 맞는다.
  Source: https://stately.ai/docs/actors
- Phaser 공식 input 문서는 drag lifecycle과 pointer distance/angle 정보를
  제공한다. Story 1.2의 조준 입력은 이 이벤트/포인터 정보를 활용하면 모바일과
  마우스 입력을 공통 경계에서 다루기 쉽다.
  Source: https://docs.phaser.io/phaser/concepts/input
- Phaser 공식 physics 문서는 Arcade Physics를 가볍고 빠른 2D 물리 시스템으로
  설명한다. 단일 ball과 block 충돌 기반의 Story 1.2에는 범위상 적합하다.
  Source: https://docs.phaser.io/phaser/concepts/physics/arcade
- Zustand 공식 가이드는 selector 사용을 권장한다. Story 1.2에서 HUD 상태를
  추가하더라도 broad subscribe 대신 selector projection을 유지해야 한다.
  Source: https://zustand.docs.pmnd.rs/learn/guides/auto-generating-selectors

### Project Context Rules

- Engine/runtime: `Phaser 3.90.0`
- UI: `React`
- Orchestration: `XState`
- UI selector store: `Zustand`
- Error model: `neverthrow`
- Language/build: `TypeScript + Vite`
- App root: `bmad-projects/neo-brick-crush/app`
- `Phaser = runtime only`
- `XState = single source of truth`
- `Zustand = lightweight UI/view state only`
- `React = presentation only`
- `GameRuntimeBridge` / HUD bridge를 통한 연결 유지
- mobile-first web/WebView 기준
- 외부 연동은 `app/platform` 내부에서만 허용
- 공개 네트워크 API는 v1 범위 밖
- modifier resolution order는 추후에도 `base -> gate -> fever -> finalize`
- hot loop 반복 할당 최소화
- HUD는 selector 기반 최소 구독만 허용

### References

- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/stories.md` - `Story 1.2: 조준/발사/턴 해석 루프 구현`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/1-1-app-root-and-runtime-shell.md` - `Story 1.1: 앱 루트와 런타임 셸 초기화`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/epics.md` - `Epic 1: 코어 플레이`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md` - `Core Gameplay Loop`, `Win/Loss Conditions`, `Primary Mechanics`, `Controls and Input`, `Input Feel`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md` - `Core Systems`, `Architectural Priorities`, `Directory Structure`, `System Location Mapping`, `게이트 / 피버 조합 패턴`, `Phaser-React-XState-Zustand 연결 패턴`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md` - `Technology Stack & Versions`, `Critical Implementation Rules`, `Performance Rules`, `Code Organization Rules`, `Testing Rules`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/package.json`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/scenes/StageScene.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/core/create-game-runtime.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/hud-bridges/game-runtime-bridge.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/state/machines/session.machine.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/state/selectors/session.selectors.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/state/stores/use-ui-store.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/ui/screens/GameShell.tsx`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/ui/components/HudPanel.tsx`
- `https://stately.ai/docs`
- `https://stately.ai/docs/actors`
- `https://docs.phaser.io/phaser/concepts/input`
- `https://docs.phaser.io/phaser/concepts/physics/arcade`
- `https://zustand.docs.pmnd.rs/learn/guides/auto-generating-selectors`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generated from sprint status, story backlog, GDD, architecture,
  project context, Story 1.1 artifact, current app scaffold, and recent git
  history.
- Official documentation was cross-checked for XState actors, Phaser input,
  Phaser Arcade Physics, and Zustand selector guidance.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.1 boundaries and current placeholder runtime state were incorporated
  into Story 1.2 implementation guidance.
- Added explicit guardrails to keep turn logic in `app/game` and defer retry/ad
  policy to later stories.
- Added deterministic turn resolution and future modifier-pipeline compatibility
  guidance for Epic 1 and 2 continuity.

### File List

- `_bmad-output/implementation-artifacts/1-2-aim-shoot-and-turn-loop.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-04-08: Created Story 1.2 implementation context and marked sprint status
  as ready-for-dev.
