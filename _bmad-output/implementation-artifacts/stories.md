---
title: 'Implementation Stories'
project: 'neo-brick-crush'
date: '2026-04-08'
author: 'Dhlee'
version: '1.0'
status: 'complete'
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-brief.md'
  - '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md'
  - '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/epics.md'
  - '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md'
  - '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md'
---

# neo-brick-crush - Story Breakdown

## Overview

이 문서는 GDD, 아키텍처, 에픽 문서를 구현 가능한 순서의 story backlog로
정리한 산출물이다. 각 story는 단일 개발 에이전트가 완료 가능한 크기로
쪼갰고, 같은 에픽 안에서는 미래 story에 의존하지 않도록 순서를 고정했다.

## Epic List

| Epic | Goal | Story Count |
| --- | --- | --- |
| 1 | 코어 플레이 루프와 재도전 템포 확립 | 4 |
| 2 | 게이트와 피버의 시그니처 재미 구현 | 3 |
| 3 | 월드/스테이지 콘텐츠 루프 구현 | 3 |
| 4 | 메타 진행과 BM 계층 구현 | 3 |
| 5 | 폴리시, 성능, QA 도구 마무리 | 3 |

## Epic 1: 코어 플레이

기본 플레이어블 루프를 완성하고, 빠른 실패/재도전 템포를 검증한다.

### Story 1.1: 앱 루트와 런타임 셸 초기화

As a player,  
I want the game shell to boot into a playable runtime foundation,  
So that later gameplay stories can build on a stable app structure.

**Acceptance Criteria**

**Given** a fresh repository with an empty `app/` root  
**When** the frontend project is initialized  
**Then** `app/` must contain the agreed `Phaser + React + XState + Zustand`
scaffold, entry files, and core directories  
**And** `app/` must be the execution root for install/dev/build commands.

**Given** the shell is rendered  
**When** the player opens the app  
**Then** a React game shell and a mounted Phaser canvas host must both appear  
**And** the runtime boundary must match the architecture document.

### Story 1.2: 조준/발사/턴 해석 루프 구현

As a player,  
I want to drag to aim and release to shoot,  
So that I can control each turn directly.

**Acceptance Criteria**

**Given** the stage runtime is active  
**When** the player drags and releases an aim gesture  
**Then** the ball must launch through Phaser runtime systems  
**And** the turn resolver must produce a deterministic turn result.

**Given** a turn resolves  
**When** the ball returns and the board updates  
**Then** the board descent and loss pressure must be applied in the same turn
cycle  
**And** runtime logic must stay inside `app/game`.

### Story 1.3: 실패/즉시 재도전 루프 구현

As a player,  
I want failure and instant retry to feel immediate,  
So that the game keeps a short, addictive rhythm.

**Acceptance Criteria**

**Given** a stage reaches a fail condition  
**When** the session machine receives the failure event  
**Then** it must transition to a failure state without Scene-local retry logic  
**And** the player must be able to trigger an instant retry path.

**Given** instant retry is selected  
**When** the stage resets  
**Then** the stage must restore from the session-controlled baseline  
**And** the retry flow must complete without a full application reload.

### Story 1.4: 광고 시청 후 재도전 흐름 구현

As a player,  
I want to watch an ad for one more chance after failing,  
So that I can recover in a high-tension moment.

**Acceptance Criteria**

**Given** the session enters the retry-offer state  
**When** the player selects rewarded retry  
**Then** the XState service layer must call the ad bridge adapter  
**And** Scene code must not call the ad SDK directly.

**Given** the ad result returns  
**When** it succeeds  
**Then** the session machine must restore the allowed retry context and resume the
stage  
**And** when it fails or is cancelled, the machine must fall back to the normal
failure flow with a handled error path.

## Epic 2: 게이트 & 피버

게이트 modifier와 수동 피버를 통해 이 게임만의 차별점을 구현한다.

### Story 2.1: 게이트 modifier 파이프라인 구현

As a player,  
I want shots routed through gates to change outcome predictably,  
So that I can plan higher-skill shots.

**Acceptance Criteria**

**Given** a turn result is being resolved  
**When** the shot intersects a gate  
**Then** gate logic must run through the modifier pipeline in the fixed order  
`base -> gate -> fever -> finalize`  
**And** the Scene must not manually reorder modifier execution.

**Given** a gate-modified turn is finalized  
**When** feedback is emitted  
**Then** gate-specific visual and audio events must be emitted from the feedback
layer  
**And** the base turn resolver must remain framework-light and testable.

### Story 2.2: 피버 게이지와 수동 발동 구현

As a player,  
I want to charge and trigger fever manually,  
So that I can choose when to create a power moment.

**Acceptance Criteria**

**Given** gameplay events add fever charge  
**When** the meter reaches a valid threshold  
**Then** the session state and HUD selector data must expose fever readiness  
**And** the same value must not be duplicated across XState and Zustand ownership.

**Given** the player triggers fever  
**When** the session receives the intent  
**Then** fever activation must pass through XState orchestration and runtime bridge  
**And** the runtime must receive only the resolved activation command it needs.

### Story 2.3: 게이트/피버 조합과 시그니처 피드백 구현

As a player,  
I want gate and fever combinations to feel explosive but readable,  
So that the game’s signature moments stay memorable and fair.

**Acceptance Criteria**

**Given** a turn includes both gate effects and active fever  
**When** the resolver finalizes the result  
**Then** combined outcomes must follow the fixed modifier order  
**And** structured logs must capture the branch for debugging.

**Given** a high-impact combined result occurs  
**When** feedback is emitted  
**Then** VFX, SFX, and haptics must trigger through dedicated feedback boundaries  
**And** hot runtime loops must avoid avoidable allocations.

## Epic 3: 퍼즐 월드 & 레벨

월드/스테이지/별점/맵 흐름을 붙여 게임다운 콘텐츠 루프를 만든다.

### Story 3.1: 월드/스테이지 데이터 모델과 로딩 구현

As a player,  
I want world and stage data to load consistently,  
So that content can scale without brittle hardcoding.

**Acceptance Criteria**

**Given** static content definitions exist  
**When** a world or stage is requested  
**Then** the app must load data through typed config loaders and asset manifests  
**And** runtime code must not directly read raw files.

**Given** a stage payload is loaded  
**When** the runtime boots that stage  
**Then** the scene must receive only normalized stage configuration  
**And** the data model must support tutorial, normal, challenge, and climax stage
types.

### Story 3.2: 월드맵/스테이지 선택/별점 흐름 구현

As a player,  
I want to choose stages from a world map and earn stars,  
So that progression feels clear and replayable.

**Acceptance Criteria**

**Given** the player opens world progression UI  
**When** stages are rendered in the map flow  
**Then** React screens must reflect progression selector data  
**And** unlock and star data must come from repository-backed progression state.

**Given** a stage ends  
**When** results are finalized  
**Then** stars and completion status must be persisted through repositories  
**And** the map must reflect updated stage state on the next view render.

### Story 3.3: 튜토리얼/챌린지/월드 마지막 흐름 구현

As a player,  
I want stages to teach, test, and climax in distinct ways,  
So that each world has a clear arc.

**Acceptance Criteria**

**Given** a tutorial or challenge stage type is loaded  
**When** the stage starts  
**Then** the UI and runtime must apply the correct stage presentation and rules
profile  
**And** tutorial stages must support teach-by-play instead of text-only flow.

**Given** a world-ending climax stage is cleared  
**When** the result is processed  
**Then** the progression flow must unlock the next content according to the defined
rules  
**And** replay goals such as stars or perfect must remain available.

## Epic 4: 메타 진행 & BM

XP, 해금, 광고 보상, IAP, 이벤트 보상을 붙여 장기 동기와 BM 구조를 만든다.

### Story 4.1: XP/레벨업/해금 저장 흐름 구현

As a player,  
I want my long-term progress to persist between sessions,  
So that replay feels meaningful.

**Acceptance Criteria**

**Given** the player completes gameplay sessions  
**When** progression rewards are applied  
**Then** XP, level, stars, unlock flags, and settings must persist via the
IndexedDB-backed repository  
**And** save payloads must include schema version metadata.

**Given** saved data is loaded  
**When** the app boots  
**Then** corrupted or invalid payloads must follow the recovery policy defined in
the architecture  
**And** recoverable failures must return typed errors rather than thrown exceptions.

### Story 4.2: 보상형 광고와 IAP adapter 구현

As a player,  
I want optional monetization features to feel separate from gameplay rules,  
So that monetization supports rather than pollutes the core loop.

**Acceptance Criteria**

**Given** an ad or purchase action is available  
**When** the player invokes it  
**Then** the request must pass through `app/platform` adapters and XState services  
**And** gameplay Scene code must not access provider SDKs directly.

**Given** a monetization result is returned  
**When** it succeeds, fails, or is cancelled  
**Then** the platform bridge must return a typed `Result` with shared error codes  
**And** the state machine must handle each branch explicitly.

### Story 4.3: 이벤트/운영 보상 구조 구현

As a returning player,  
I want limited-time reward structures to fit existing progression rules,  
So that live content feels additive instead of disruptive.

**Acceptance Criteria**

**Given** event configuration is provided  
**When** event state is loaded  
**Then** event definitions must come from typed config and repository-backed status  
**And** event reward eligibility must be revalidated in the domain layer.

**Given** the player claims an event reward  
**When** the claim succeeds  
**Then** reward application must follow the same service and repository boundaries
as core progression  
**And** analytics/logging hooks must capture the outcome for later review.

## Epic 5: 폴리시 & 감각 완성

시청각 임팩트, 모바일 성능, 디버그 도구를 붙여 출시 전 품질을 끌어올린다.

### Story 5.1: 네온 피드백 레이어와 오디오 베이스 구현

As a player,  
I want impactful audiovisual feedback on key moments,  
So that strong shots feel memorable.

**Acceptance Criteria**

**Given** runtime events such as hit, gate trigger, or fever activation occur  
**When** feedback is emitted  
**Then** VFX, SFX, and vibration hooks must be triggered from dedicated feedback
boundaries  
**And** gameplay rule code must stay separate from presentation effects.

**Given** the app is running on constrained devices  
**When** feedback is applied  
**Then** baseline effects must preserve readability first  
**And** heavy transient effects must use pooling-friendly patterns.

### Story 5.2: 모바일 성능 예산과 pooling 최적화 구현

As a player,  
I want the game to stay responsive during intense moments,  
So that impact never causes frustrating slowdown.

**Acceptance Criteria**

**Given** ball, impact, particle, or transient VFX objects are used repeatedly  
**When** they are created during gameplay  
**Then** pooling must be applied where the architecture requires it  
**And** hot loops must avoid repeated allocation.

**Given** the game is profiled in mobile-like conditions  
**When** chain reactions or fever spikes occur  
**Then** the architecture must provide enough instrumentation to inspect the cost  
**And** the implementation must preserve input responsiveness over decorative
effects.

### Story 5.3: 디버그/QA 도구와 release guardrails 구현

As a developer or QA engineer,  
I want strong debug and failure simulation tools,  
So that branching gameplay flows can be validated quickly.

**Acceptance Criteria**

**Given** the app is in a development build  
**When** debug mode is activated  
**Then** the project must expose debug overlay, state inspection, ad simulation,
save reset, and forced failure tools  
**And** these tools must stay behind explicit dev-only guards.

**Given** a production build is prepared  
**When** release behavior is validated  
**Then** debug-only paths must not leak into release behavior  
**And** critical branches such as retry, reward, save failure, and unlock flows
must remain observable through structured logs.
