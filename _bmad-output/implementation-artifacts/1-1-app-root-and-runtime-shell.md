# Story 1.1: 앱 루트와 런타임 셸 초기화

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want the game shell to boot into a playable runtime foundation,
so that later gameplay stories can build on a stable app structure.

## Acceptance Criteria

1. Given a fresh repository with an empty `app/` root, when the frontend project is initialized, then `app/` must contain the agreed `Phaser + React + XState + Zustand` scaffold, entry files, and core directories, and `app/` must be the execution root for install/dev/build commands.
2. Given the shell is rendered, when the player opens the app, then a React game shell and a mounted Phaser canvas host must both appear, and the runtime boundary must match the architecture document.

## Tasks / Subtasks

- [x] Verify and align the `app/` project root scaffold with the architecture directory contract.
  - [x] Keep `app/` as the only execution root for install, dev, build, and typecheck commands.
  - [x] Ensure bootstrap entry flow stays `main.tsx -> bootstrap/create-app.tsx -> bootstrap/register-providers.tsx -> bootstrap/mount-game-shell.tsx`.
  - [x] Add any missing top-level directories required by the architecture only when they are needed for Story 1.1 outcomes; do not prebuild future feature code speculatively.
- [x] Harden the runtime shell so React presentation and Phaser runtime are mounted with clear ownership boundaries.
  - [x] Keep the Phaser canvas mounted inside a dedicated host element in the React shell.
  - [x] Ensure runtime lifecycle cleanup happens on unmount and does not leave duplicate Phaser instances behind.
  - [x] Make runtime-ready signaling flow through orchestration boundaries, not direct Scene-to-React coupling.
- [x] Confirm state ownership boundaries for the starter shell.
  - [x] Keep session lifecycle ownership in XState.
  - [x] Restrict Zustand to lightweight UI/view state only.
  - [x] Prevent Phaser Scene code from owning retry, reward, persistence, or unlock policy.
- [x] Leave a minimal, developer-friendly foundation for follow-up stories.
  - [x] Keep `BootScene` focused on startup/preload handoff.
  - [x] Keep `StageScene` as the future gameplay runtime surface without embedding Story 1.2 turn logic yet.
  - [x] Preserve extension seams for `GameRuntimeBridge` / HUD bridge instead of hardwiring Scene state into React components.
- [x] Verify the shell against build and smoke expectations.
  - [x] Run `npm run typecheck` in `app/`.
  - [x] Run `npm run build` in `app/`.
  - [x] Manually verify that the mounted shell shows both the React frame and Phaser runtime host.

## Dev Notes

### Story Intent

이 스토리는 실제 게임 메커닉을 만드는 단계가 아니라, 이후 Story 1.2~1.4가
안전하게 올라갈 수 있는 실행 루트와 책임 경계를 고정하는 단계다. 이미 `app/`
초기 스캐폴딩은 존재하므로, 이번 구현은 "제로에서 생성"보다 "현재 구조를
아키텍처 기준에 맞게 정렬하고 부족한 경계를 보강"하는 작업으로 해석해야 한다.

### Existing Codebase Intelligence

- `app/`는 이미 Vite + React + TypeScript 루트로 초기화되어 있다.
- 현재 부트스트랩 경로는 `main.tsx -> create-app -> register-providers -> mount-game-shell`로 존재한다.
- `GameShell.tsx`는 React 셸 안에 Phaser 런타임 호스트와 HUD를 함께 렌더링하고 있다.
- `create-game-runtime.ts`는 `BootScene`, `StageScene`, `Phaser.Scale.FIT`, `CENTER_BOTH`를 사용해 런타임을 생성한다.
- `session.machine.ts`와 `use-ui-store.ts`가 이미 각각 XState / Zustand 시작점을 제공하고 있다.
- 따라서 Story 1.1의 목표는 현재 코드를 폐기하는 것이 아니라, 이 패턴을 기준선으로 문서화하고 아키텍처 위반 지점을 제거하는 것이다.

### Technical Requirements

- 런타임 엔진은 `Phaser 3.90.0`을 유지한다.
- 프레젠테이션 계층은 `React 18`을 유지한다.
- 세션 오케스트레이션은 `XState v5`를 기준으로 유지한다.
- UI selector store는 `Zustand 4`를 유지한다.
- recoverable error 모델은 `neverthrow`를 기준으로 이어가되, Story 1.1에서는 도입 경계만 보존하면 된다.
- `app/` 기준 명령만 사용한다. 루트 저장소나 다른 프로젝트 폴더를 실행 루트로 쓰면 안 된다.

### Architecture Compliance Guardrails

- `Phaser = runtime only`. Scene는 렌더링, 입력, 런타임 이벤트 생산만 담당한다.
- `React = presentation only`. `GameShell`, HUD, 디버그 패널은 상태를 표시하고 intent를 전달하지만 게임 규칙을 소유하지 않는다.
- `XState = single source of truth` for session lifecycle. Story 1.1의 boot/ready/failed 흐름도 XState 소유로 유지한다.
- `Zustand = lightweight UI state only`. `storeHasRuntime`, debug visibility 같은 뷰 상태만 유지한다.
- Scene 코드에서 광고, IAP, 저장, 분석 SDK를 직접 호출하면 안 된다.
- 같은 값을 XState와 Zustand가 동시에 소유하면 안 된다.
- HUD가 게임 규칙을 직접 계산하면 안 된다.
- `GameRuntimeBridge` / HUD bridge를 둘 수 있는 구조를 남기고, React에서 Phaser internals를 직접 읽는 구조로 고정하지 않는다.

### File Structure Requirements

이번 스토리에서 우선 검토하거나 수정될 가능성이 높은 경로:

- `app/main.tsx`
- `app/bootstrap/create-app.tsx`
- `app/bootstrap/register-providers.tsx`
- `app/bootstrap/mount-game-shell.tsx`
- `app/ui/screens/GameShell.tsx`
- `app/ui/components/HudPanel.tsx`
- `app/game/core/create-game-runtime.ts`
- `app/game/scenes/BootScene.ts`
- `app/game/scenes/StageScene.ts`
- `app/state/machines/session.machine.ts`
- `app/state/stores/use-ui-store.ts`

미리 만들어 둘 수 있으나 과도한 선구현은 피해야 하는 경로:

- `app/game/hud-bridges/`
- `app/state/selectors/`
- `app/ui/hud/`
- `app/tests/`

### Project Structure Notes

- 아키텍처 문서는 넓은 최종 구조를 정의하지만, 현재 앱은 그 전체를 아직 채우지 않았다.
- Story 1.1에서는 아키텍처상 필수 진입점과 책임 경계를 맞추는 데 집중하고, future story의 시스템/엔티티/메커닉 디렉터리를 억지로 모두 채우지는 않는다.
- 다만 후속 스토리가 자연스럽게 이어질 수 있도록 명명 규칙과 디렉터리 방향은 지금부터 지켜야 한다.
- 특히 `app/shared`를 임시 잡동사니 폴더처럼 사용하지 말고, 공통성이 명확한 경우에만 확장한다.

### Library / Framework Requirements

- `xstate`는 v5 문법을 사용하고 있으므로, 새로운 machine/actor 코드는 v5 기준으로 작성한다. 기존 starter code가 `createActor`를 직접 시작하는 패턴이므로 이를 깨지 않게 유지하되, 컴포넌트 리렌더링은 `@xstate/react` selector 패턴을 우선 고려한다.
- `@xstate/react`의 `useSelector`는 actor snapshot에서 필요한 값만 구독할 수 있으므로, `GameShell`과 HUD에서 broad subscription을 피하는 방향으로 유지한다.
- Phaser Scale 설정은 `FIT + CENTER_BOTH`를 유지하되, 부모 엘리먼트 크기가 계산 가능해야 한다. 즉 React host 컨테이너는 명시적 width/height 또는 aspect-ratio를 유지해야 한다.
- Zustand는 selector 기반 사용이 권장된다. `useUiStore((state) => state.someValue)` 형태를 유지하고, 전체 store broad subscribe는 피한다.

### Testing Requirements

- Story 1.1 완료 기준의 필수 검증은 `app/`에서의 `npm run typecheck`와 `npm run build`다.
- 테스트 프레임워크 도입은 아직 문서상 강제되지 않았으므로, 이번 스토리에서 새로운 테스트 러너를 임의로 추가하지 않아도 된다.
- 대신 최소한 다음 동작은 수동 검증 또는 매우 얇은 smoke 검증으로 확인해야 한다.
  - 앱 로드시 React shell이 렌더링된다.
  - Phaser canvas host가 정상적으로 마운트된다.
  - 언마운트 시 Phaser runtime이 정리된다.
  - boot 완료 후 session state가 `ready`로 전이된다.

### UX / Player-Facing Constraints

- 첫 셸부터 모바일 기준의 16:9 플레이 필드 인상이 유지되어야 한다.
- React shell과 Phaser runtime host가 동시에 보이더라도, 플레이어 입장에서는 하나의 일관된 게임 화면처럼 느껴져야 한다.
- Story 1.1에서는 복잡한 HUD/메뉴보다 "게임이 켜지고, 플레이 준비가 된 느낌"을 주는 것이 핵심이다.
- GDD의 신스웨이브/네온 무드는 현재 셸의 배경, 패널, HUD 톤에서 최소한의 방향성을 유지해야 한다.

### Anti-Patterns To Avoid

- Story 1.2 이상의 조준/발사/턴 로직을 Story 1.1에서 미리 크게 구현하지 말 것.
- Phaser Scene에서 React state를 직접 import하거나 조작하지 말 것.
- React 컴포넌트 안에서 Phaser Game 인스턴스 세부 상태를 직접 계산하지 말 것.
- Zustand에 session truth를 복제하지 말 것.
- `app/` 밖에 실행/빌드 관련 파일을 분산시키지 말 것.
- 미래 구조를 맞춘다는 이유로 빈 파일/빈 폴더를 대량 생성하지 말 것.

### Git Intelligence Summary

최근 커밋 흐름상 이미 `planning artifacts 정리와 app 초기 스캐폴딩 구축`이 완료된 상태다.
즉 이번 스토리는 완전 신규 셸 생성보다, 그 초기 스캐폴딩을 Story 1.1의 완료 조건에 맞게
정돈하고 기준선을 명확히 하는 작업으로 보는 것이 안전하다.

### Latest Technical Information

- XState 공식 문서는 현재 v5 기준이며, `createActor(machine).start()` 및 actor 기반 orchestration을 기본 패턴으로 제시한다. 현재 코드의 actor 시작 방식은 이 방향과 맞다. Source: https://stately.ai/docs
- `@xstate/react` 공식 문서는 `useSelector(actorRef, selector)`를 통해 필요한 snapshot 값만 구독하는 패턴을 권장한다. HUD/셸에서 이 방향을 유지하면 불필요한 리렌더링을 줄일 수 있다. Source: https://stately.ai/docs/xstate-react
- Phaser 공식 문서는 `scale.mode = Phaser.Scale.FIT`와 `autoCenter = Phaser.Scale.CENTER_BOTH` 조합을 지원하지만, centering은 부모 컨테이너의 크기가 계산 가능해야 정상 동작한다고 설명한다. 따라서 `GameShell`의 런타임 호스트 레이아웃은 깨지지 않게 유지해야 한다. Source: https://docs.phaser.io/phaser/concepts/scale-manager
- Phaser 공식 API 문서는 `FIT`가 종횡비를 유지한 채 목표 영역 안에 맞추는 모드라고 명시한다. Story 1.1에서는 이 기본 화면 정책을 바꾸지 않는 편이 후속 스테이지 런타임 안정성에 유리하다. Source: https://docs.phaser.io/api-documentation/3.88.2/constant/scale
- Zustand 공식 가이드는 selector 사용을 권장한다. 현재 `useUiStore((state) => state.storeIsDebugVisible)` 같은 패턴은 유지 가치가 있다. Source: https://zustand.docs.pmnd.rs/learn/guides/auto-generating-selectors

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

- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/stories.md` - `Story 1.1: 앱 루트와 런타임 셸 초기화`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/epics.md` - `Epic 1: 코어 플레이`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md` - `Epic Overview`, `Recommended Sequence`, `Technical Metrics`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md` - `Directory Structure`, `System Location Mapping`, `Code Organization Rules`, `Architectural Boundaries`, `Phaser-React-XState-Zustand 연결 패턴`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md` - `Technology Stack & Versions`, `Critical Implementation Rules`, `Performance Rules`, `Testing Rules`, `Platform & Build Rules`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/package.json`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/main.tsx`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/bootstrap/create-app.tsx`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/bootstrap/register-providers.tsx`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/bootstrap/mount-game-shell.tsx`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/ui/screens/GameShell.tsx`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/core/create-game-runtime.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/game/scenes/BootScene.ts`
- `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app/state/machines/session.machine.ts`
- `https://stately.ai/docs`
- `https://stately.ai/docs/xstate-react`
- `https://docs.phaser.io/phaser/concepts/scale-manager`
- `https://docs.phaser.io/api-documentation/3.88.2/constant/scale`
- `https://zustand.docs.pmnd.rs/learn/guides/auto-generating-selectors`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Story context generated from sprint status, stories backlog, architecture, GDD, project context, current app scaffold, and recent git history.
- `npm run typecheck` succeeded in `app/`.
- `npm run build` succeeded in `app/`.
- Headless Chrome verification against `vite preview` confirmed `#game-runtime-host`, a mounted Phaser `<canvas>`, and HUD session state `ready`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Existing app scaffold was detected and incorporated into implementation guidance.
- Latest official library guidance was cross-checked for XState, Phaser Scale, and Zustand selector usage.
- Added a runtime bridge so Phaser boot completion signals XState/React through an explicit boundary instead of a direct callback shortcut.
- Added selector and Vite config structure expected by the architecture while keeping Story 1.1 scoped to shell initialization only.
- Verified shell boot through typecheck, production build, and headless browser smoke validation.

### File List

- `_bmad-output/implementation-artifacts/1-1-app-root-and-runtime-shell.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/game/core/create-game-runtime.ts`
- `app/game/hud-bridges/game-runtime-bridge.ts`
- `app/game/scenes/BootScene.ts`
- `app/state/selectors/session.selectors.ts`
- `app/ui/screens/GameShell.tsx`
- `app/vite.config.ts`

### Change Log

- 2026-04-08: Implemented Story 1.1 runtime shell hardening, explicit boot bridge wiring, selector extraction, and shell verification workflow.
