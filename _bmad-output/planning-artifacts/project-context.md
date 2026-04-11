---
project_name: 'neo-brick-crush'
user_name: 'Dhlee'
date: '2026-04-08'
sections_completed:
  [
    'technology_stack',
    'engine_rules',
    'performance_rules',
    'organization_rules',
    'testing_rules',
    'platform_rules',
    'anti_patterns',
  ]
status: 'complete'
rule_count: 24
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing game code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Engine/runtime: `Phaser 3.90.0`
- UI: `React` (`app/package.json` is source of truth)
- Orchestration: `XState` (`app/package.json` is source of truth)
- UI selector store: `Zustand` (`app/package.json` is source of truth)
- Error model: `neverthrow` (`app/package.json` is source of truth)
- Language/build: `TypeScript + Vite`
- App root: `bmad-projects/neo-brick-crush/app`

## Critical Implementation Rules

### Mobile Layout Rules

- 모바일 구현은 `/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/mobile-layout-spec.md`를 우선 기준으로 삼는다.
- 모바일 플레이 화면은 `스테이지 정보 바 -> 게임 영역 -> HUD 7개 한 줄` 구조를 유지한다.
- 모바일 HUD는 절대 두 줄로 래핑되면 안 된다.
- Fever 버튼은 별도 하단 행이 아니라 게임 영역 하단 중앙의 보조 액션이다.
- 모바일 게임 영역은 스테이지 정보 바와 HUD 사이의 남는 높이를 거의 전부 사용해야 한다.
- Phaser 보드/블록/런처 위치는 모바일 폭과 높이에 맞게 재계산되어야 하며, 블록이 잘리면 구현이 잘못된 것이다.
- 모바일 조준 시작은 좁은 런처 히트존이 아니라 플레이 가능 영역 드래그를 허용해야 한다.
- 모바일 `LOSS LINE`은 보이는 선을 실제로 넘는 row에서만 실패해야 하며, 선 바로 위 row에서 조기 종료되면 안 된다.

### Engine-Specific Rules

- `Phaser = runtime only`. Scene code must not call ads, IAP, persistence, or analytics directly.
- `XState = single source of truth` for session, retry, progression, reward, and unlock flows.
- `Zustand = lightweight UI/view state only`. Do not duplicate session truth in Zustand.
- `React = presentation only`. UI renders state and dispatches intents; it does not own gameplay rules.
- Use `GameRuntimeBridge` / HUD bridge for Phaser-to-XState-to-React wiring. Do not couple Scene code to React state.
- Phaser runtime boot must always include the required physics system; a mounted canvas without a working Scene is not a successful boot.
- preview or persistence load failures must degrade to a safe default boot path rather than trapping the shell in `booting`.
- stale saved stage ids must fall back to the default stage instead of crashing the shell.

### Performance Rules

- Target `60fps`; mobile may tolerate stable `30~60fps`, but input responsiveness comes first.
- Use hybrid loading: shared core assets preload first, world/stage assets load on entry.
- Pool high-frequency transient objects: `ball`, `impact effect`, `particle effect`, `transient VFX`.
- Do not allocate repeatedly in hot Scene loops if pooling is possible.
- HUD must subscribe with selectors only. Never broad-subscribe whole stores.
- Modifier resolution order is fixed: `base -> gate -> fever -> finalize`.

### Code Organization Rules

- All implementation code and runtime config live under `app/`.
- `app/` is the actual frontend project root. Run install/dev/build/test from `app/`.
- Put runtime logic in `app/game`, orchestration in `app/state`, UI in `app/ui`, SDK/storage in `app/platform`, contracts/models/errors in `app/domain`.
- `app/shared` is for truly cross-cutting code only. Do not use it as a default dumping ground.
- File naming:
  - TS modules: `kebab-case.ts`
  - React components: `PascalCase.tsx`
  - XState machines: `feature-name.machine.ts`
  - XState actors/services: `feature-name.actor.ts`, `feature-name.service.ts`
  - Scenes: `PascalCaseScene.ts`
- Prefer functional/declarative code. Avoid classes unless Phaser/engine conventions require them.
- Prefer early returns and guard clauses over nested conditionals.
- For React components, prefer `export default function`.

### Testing Rules

- Test session transitions, retry flows, reward flows, and unlock logic explicitly.
- Recoverable failures must be testable via `Result<T, GameError>`.
- Provide mock ad success/fail paths and forced failure triggers for QA.
- Keep platform mocks near adapters or under `app/tests/fixtures` / `app/tests` support files.
- Validate logs for critical branches: retry offer, retry ad accepted/denied, save load failure, reward application.

### Platform & Build Rules

- Primary target is mobile-first web/WebView; web and PC are secondary.
- External integrations are only allowed in `app/platform`.
- Use capability detection for platform-specific ads/IAP/WebView behavior.
- There are no public network APIs in v1; contracts are internal service/repository/bridge boundaries.
- Sensitive provider configuration must not be hardcoded in gameplay code.

### Critical Don't-Miss Rules

- Do not let the same state be owned by both XState and Zustand.
- Do not let HUD compute gameplay rules directly.
- Do not let Scene code determine retry policy, ad policy, save policy, or unlock policy.
- Do not bypass repositories/config loaders with direct file or IndexedDB access.
- Do not change modifier order per feature/file.
- Do not use broad Zustand subscriptions that trigger avoidable rerenders.
- Do not throw for recoverable failures; use `neverthrow` with shared error codes.
- Fatal handler is restricted to true unrecoverable boundaries only.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any game code.
- Follow ALL rules exactly as documented.
- When in doubt, choose the more restrictive boundary.
- If a new pattern emerges, update this file and the architecture together.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update when stack, state boundaries, or performance rules change.
- Remove rules that become obvious and keep the non-obvious ones.

Last Updated: 2026-04-08
