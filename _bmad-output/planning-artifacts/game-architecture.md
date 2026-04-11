---
title: 'Game Architecture'
project: 'neo-brick-crush'
date: '2026-04-07'
author: 'Dhlee'
version: '1.0'
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9]
status: 'complete'
engine: 'Phaser 3.90.0 + React + XState + Zustand'
platform: '모바일 우선, 웹/PC 보조 확장'

# Source Documents
gdd: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md'
epics: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/epics.md'
brief: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-brief.md'
mobileLayout: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/mobile-layout-spec.md'
---

# Game Architecture

## Document Status

This architecture document has been completed through the GDS Architecture Workflow.

**Steps Completed:** 9 of 9 (Architecture Complete)

---

_Architecture handoff ready._

## Executive Summary

네온 브릭 크러시는 `Phaser 3.90.0 + React + XState + Zustand + neverthrow`
조합을 기반으로 하는 모바일 우선 네온 퍼즐 아케이드 게임이다.
아키텍처의 핵심은 `세션 상태 전이의 명시성`, `코어 런타임과 메타/BM
계층의 분리`, `게이트/피버 modifier의 예측 가능한 조합`, `광고
재도전 흐름의 테스트 가능성`, `selector 기반 최소 리렌더링`에 있다.

이 문서는 `app/`을 완전한 앱 루트로 정의하고, `Phaser = 런타임`,
`React = 프레젠테이션`, `XState = 오케스트레이션`,
`Zustand = selector 기반 클라이언트 UI 상태`, `platform = 외부 연동`
이라는 책임 경계를 기준으로 모든 AI 에이전트가 일관된 방식으로 구현할 수
있도록 가이드한다.

## Project Context

### Game Overview

**네온 브릭 크러시 (Neon Brick Crush)** - 짧은 세션 안에서 플레이어가 샷 각도와 게이트 경로를 설계하고, 수동 피버로 판세를 뒤집는 모바일 우선 네온 퍼즐 아케이드 게임

### Technical Scope

**Platform:** 모바일 우선, 웹/PC 보조 확장  
**Genre:** 퍼즐 아케이드 / 브릭브레이커 변주  
**Project Level:** Medium-High Complexity

### Core Systems

| System | Complexity | Notes |
|---|---|---|
| Core runtime loop | High | 조준, 발사, 공 회수, 보드 하강, 승패 판정, 실패/재도전 |
| Gate and fever modifiers | High | 게이트 변환, 피버 게이지, 수동 발동, 연쇄 증폭 |
| Stage/world progression | Medium | 월드 구조, 별점, 해금, 퍼펙트, 반복 도전 |
| Meta progression and BM | Medium | XP, 레벨업, 광고 보상, IAP, 이벤트 |
| Feedback pipeline | Medium | 네온 VFX, SFX, 진동, UI 반응 |
| Mobile performance management | High | 60fps 목표, 3초 이내 로드, 발열/배터리 고려 |

### Technical Requirements

- 모바일 가로 화면 기준 설계
- 60fps 목표, 모바일에서는 30~60fps 안정 동작 허용
- 로딩 3초 이내, 재도전은 거의 즉시 전환
- 오프라인 플레이 가능
- 보상형 광고와 IAP 지원
- 웹 빌드 용량 제한 고려
- 강한 네온 연출과 가독성/성능의 균형 필요
- 모바일 플레이 화면은 `스테이지 정보 바 -> 남는 높이를 모두 쓰는 게임 영역 -> HUD 7개 한 줄` 구조를 따른다

### Complexity Drivers

- 코어 런타임 루프 위에 게이트/피버 modifier를 안정적으로 얹어야 하는 구조
- 광고 재도전이 코어 세션 흐름을 해치지 않도록 하는 UX/상태 분기
- 실력 중심 퍼즐과 XP 메타를 함께 유지하는 데이터 구조
- 모바일 발열/배터리 환경에서도 강한 연출을 유지해야 하는 요구
- 다수의 플레이 분기를 명확한 세션 상태 전이로 관리해야 하는 요구

### Architectural Priorities

- 입력 반응성과 재도전 속도를 최우선으로 보장한다
- 코어 런타임 판정은 작고 예측 가능한 구조로 유지한다
- 게이트와 피버는 코어 판정 위에서 작동하는 modifier 계층으로 설계한다
- 광고/IAP/이벤트는 코어 게임 루프와 명확히 분리된 메타 계층으로 둔다
- 판정 로직과 연출/VFX/진동 피드백을 분리해 유지보수성과 성능을 확보한다
- `턴 상태`, `샷 결과`, `광고/보상 분기`가 명시적으로 구분되는 상태 전이 구조를 갖는다
- QA와 자동화가 가능한 수준으로 분기와 상태를 테스트 가능하게 유지한다
- 모바일 레이아웃은 `mobile-layout-spec.md`를 우선 참조하고, 현재 구현 코드보다 문서 기준을 우선한다

### Technical Risks

- 게이트/피버 로직이 코어 판정과 과도하게 결합될 위험
- 광고/IAP SDK 통합이 세션 템포를 깨뜨릴 위험
- 외부 에셋이 아트 방향 일관성을 해칠 가능성
- v2 멀티플레이를 고려할 경우, 초기 구조가 지나치게 단일플레이 전용으로 굳을 위험
- 세션 상태 전이가 불명확하면 버그 수정과 테스트 비용이 급격히 증가할 위험

## Engine & Framework

### Selected Engine

**Phaser 3.90.0 + React + XState + Zustand**

**Rationale:**  
Phaser는 웹과 모바일 WebView를 함께 타깃하는 2D 네온 퍼즐 아케이드
게임의 코어 런타임에 적합하다. React는 HUD, 메뉴, 월드맵, 결과 화면,
상점, 이벤트 UI 같은 비게임플레이 UI를 분리하는 데 유리하다. XState는
이 프로젝트의 핵심 복잡도인 `세션 상태 전이`, `광고 재도전`,
`메타 진행 분기`를 명시적으로 관리하는 데 적합하다. Zustand는 HUD,
오버레이, 디버그 패널, view-model 성격의 클라이언트 상태를 selector
기반으로 최소 구독하기에 적합하다.

### Project Initialization

```bash
npm create vite@latest neo-brick-crush -- --template react-ts
npm install phaser xstate @xstate/react zustand neverthrow
```

### Engine-Provided Architecture

| Component | Solution | Notes |
|---|---|---|
| Rendering | Phaser WebGL/Canvas renderer | 2D 중심, 브라우저 친화적 |
| Input | Phaser pointer/touch input | 모바일 터치와 웹 입력 공통 처리 |
| Audio | Web Audio via Phaser | 전자음/SFX 중심에 적합 |
| Scene Runtime | Phaser Scene system | 실제 플레이 필드와 레벨 런타임 담당 |
| UI Layer | React | HUD, 메뉴, 결과, 이벤트, BM 화면 담당 |
| State Orchestration | XState | 세션 흐름과 메타 분기 상태 관리 |
| UI State Store | Zustand | selector 기반 경량 클라이언트 상태 관리 |
| Error Model | neverthrow | 복구 가능한 실패를 명시적 Result와 에러 코드로 처리 |
| Build System | Vite | 빠른 개발 루프와 웹 배포 적합 |

### Remaining Architectural Decisions

The following decisions must be made explicitly:

- Phaser Scene과 React UI의 경계
- XState 머신을 어디까지 세분화할지
- 광고/IAP/WebView 브리지 계층
- 세이브/진행 데이터 모델
- 에셋 로딩 및 preload 전략
- 이벤트/운영 콘텐츠 구조
- 모바일 패키징 전략

## Technology Stack Details

### Core Technologies

| Technology | Version | Source of Truth | Purpose |
| --- | --- | --- | --- |
| Phaser | 3.90.0 | architecture decision | 2D 게임 런타임과 렌더링 |
| React | locked in `app/package.json` | package manifest | HUD, 메뉴, 결과, 메타 UI |
| XState | locked in `app/package.json` | package manifest | 세션/진행/보상 상태 전이 오케스트레이션 |
| Zustand | locked in `app/package.json` | package manifest | selector 기반 경량 UI 상태 관리 |
| neverthrow | locked in `app/package.json` | package manifest | 복구 가능한 실패의 명시적 Result 처리 |
| TypeScript | locked in `app/package.json` and `app/tsconfig.json` | package/config | 타입 안정성과 계약 명시 |
| Vite | locked in `app/package.json` and `app/vite.config.ts` | package/config | 개발 서버와 웹 번들링 |

### Integration Points

- `Phaser`는 `app/game`에서 게임 루프, 씬, 판정, 이펙트를 담당한다.
- `React`는 `app/ui`에서 HUD, 메뉴, 결과, 이벤트, 상점 UI를 담당한다.
- `XState`는 `app/state`에서 세션과 메타 흐름을 조정한다.
- `Zustand`는 `app/ui`, `app/state/selectors`, `app/game/hud-bridges`에서
  selector 기반의 경량 뷰 상태와 HUD 파생 상태를 제공한다.
- `platform` 계층은 광고, IAP, WebView, IndexedDB, analytics를 adapter
  형태로 연결한다.
- `domain` 계층은 모델, 에러 코드, 계약, 상수를 프레임워크 독립적으로
  유지한다.

**Version Rule:**  
Phaser 버전은 아키텍처 결정으로 고정하며, 나머지 dependency의 정확한
버전은 `app/package.json`을 단일 진실원으로 삼는다. 구현 단계에서
아키텍처 문서와 package manifest가 충돌할 경우, manifest를 우선하되
아키텍처 문서도 함께 갱신한다.

## Architectural Decisions

### Decision Summary

| Category | Decision | Version | Rationale |
|---|---|---|---|
| State Management | XState 중심 상태 머신 + Zustand selector store | XState latest / Zustand latest | 세션 전이는 XState가 소유하고, 경량 UI 상태는 Zustand로 최소 리렌더링을 보장하기 위해 |
| Data Persistence | Serialized JSON domain model + IndexedDB persistence | Browser IndexedDB | 오프라인 플레이, 구조화된 진행 데이터 저장, 향후 cloud sync 확장성을 확보하기 위해 |
| Asset Management | Hybrid loading strategy | Phaser 3.90.0 | 공통 리소스 선로딩 + 월드/스테이지별 로딩으로 초기 속도와 플레이 안정성 균형 확보 |
| Platform Bridge | XState service layer를 통한 브리지 호출 | Custom adapter layer | 광고/IAP/이벤트 보상을 코어 루프와 분리하고 테스트 가능한 상태 분기를 유지하기 위해 |
| UI / Scene Boundary | Phaser는 인게임 렌더링, React는 메타/UI, 일부 HUD는 협업 | Phaser 3.90.0 + React | 책임 분리와 유지보수성을 확보하면서 게임 HUD는 가볍게 연동하기 위해 |
| Error Handling | neverthrow 기반 명시적 Result 처리 | neverthrow latest | 복구 가능한 실패를 에러 코드 기반으로 명시적으로 처리하기 위해 |

### State Management

**Approach:** XState 중심 상태 머신

게임의 핵심 복잡도는 세션 상태 전이에 있으므로, 상태 관리는 XState를 중심으로 설계한다. 인게임, 실패, 광고 재도전, 클리어, 보상, 월드 해금 같은 흐름은 모두 명시적 상태 전이로 관리한다.

- **XState**는 상태 전이와 서비스 오케스트레이션을 담당한다.
- **Zustand**는 selector 기반의 경량 클라이언트 상태 저장소를 담당한다.
- **Phaser**는 실시간 게임 런타임과 판정 처리를 담당한다.
- **React**는 메뉴, HUD, 결과, 이벤트, BM 화면 등 프레젠테이션 계층을 담당한다.

**State Boundary Rules:**
- 세션 흐름, 보상 흐름, 진행 흐름의 단일 진실원은 `XState`다.
- 리렌더링 최적화가 필요한 HUD/view-model 성격의 상태는 `Zustand`에 둘 수 있다.
- 컴포넌트 내부에서만 의미가 있는 임시 UI 상태는 React local state를 사용한다.
- 같은 값을 `XState`와 `Zustand`가 동시에 소유하지 않는다.
- 화면은 반드시 필요한 값만 selector로 구독한다.

### Mobile Layout Contract

모바일 레이아웃 구현은 `mobile-layout-spec.md`를 따른다. 아키텍처 관점의 핵심 규칙은 다음과 같다.

- 모바일 플레이 화면은 `스테이지 정보`, `게임 플레이`, `HUD`만 유지한다.
- 모바일 HUD는 7개 항목을 모두 한 줄에 표시한다.
- Fever 버튼은 게임 영역 내부 하단 중앙의 오버레이 액션으로 유지한다.
- Phaser 런타임은 부모 프레임의 실제 폭/높이를 사용해 resize 되어야 한다.
- Scene의 보드 메트릭은 모바일 폭에 맞게 재계산되어야 하며, 좌우 블록 잘림이 있으면 구현이 잘못된 것이다.

### Data Persistence

**Save System:** Serialized JSON domain model + IndexedDB persistence

진행 데이터는 JSON 직렬화 가능한 도메인 모델로 관리하고, 실제 저장은 IndexedDB에 맡긴다. 저장 대상에는 월드 해금, 별점, 퍼펙트, XP, 레벨업, 이벤트 상태 등이 포함된다. 저장 구조는 schema versioning과 migration 가능성을 고려하며, JSON은 이식 가능한 데이터 형식, IndexedDB는 영속 저장소 역할을 맡는다.

### Asset Management

**Loading Strategy:** Hybrid

게임 공통 리소스는 초기 preload 단계에서 먼저 로드하고, 월드/스테이지 전용 리소스는 해당 진입 시점에 scene-based preload로 불러온다. 이 방식은 짧은 초기 로딩과 실제 플레이 중의 안정성을 동시에 확보하는 데 적합하다.

### Platform Bridge / BM Integration

**Approach:** XState service layer를 통한 브리지 호출

광고, IAP, 이벤트 보상 호출은 Phaser나 React에서 직접 SDK를 다루지 않고, XState service layer를 통해 호출한다. 플랫폼별 차이는 bridge adapter 계층이 처리하며, 상태 머신은 성공/실패 결과만 받아 분기한다. Phaser는 저장소나 광고 SDK를 직접 호출하지 않고, 코어 런타임 책임만 유지한다.

### UI / Scene Boundary

**Approach:** Phaser는 인게임 렌더링, React는 메타/UI, 일부 HUD는 협업

Phaser는 플레이 필드, 충돌, 이펙트, 게임 장면을 담당한다. React는 메뉴, 월드맵, 결과 화면, 상점, 이벤트, 설정 등 메타 UI를 담당한다. HUD는 상태 전달이 필요한 일부 요소만 React와 협업하되, 상태 소유권과 입력/렌더링 책임은 명확히 구분한다.

### Error Handling

**Approach:** neverthrow 기반 명시적 Result 처리

복구 가능한 실패는 예외를 던지기보다 `Result<T, GameError>` 형태로 반환한다. 광고 로드 실패, IAP 취소, 세이브 손상, 해금 조건 미충족, 이벤트 보상 실패 같은 케이스는 공통 에러 코드 체계로 관리한다. `neverthrow`는 특히 브리지 계층, 저장 계층, 메타 서비스 계층에서 사용하며, 상태 머신은 성공/실패 결과를 명시적으로 소비한다.

### Architecture Decision Records

- 세션 상태 전이 복잡도가 높아 XState를 중심 상태 관리로 채택
- 오프라인 및 WebView 호환성을 위해 IndexedDB 기반 저장 전략 채택
- schema versioning과 migration 가능성을 고려한 저장 구조 채택
- 초기 진입 속도와 플레이 안정성 균형을 위해 Hybrid 로딩 전략 채택
- 광고/IAP/이벤트는 코어 루프와 분리된 브리지 계층으로 다루기로 결정
- Phaser/React/XState 책임 경계를 명시해 구현 충돌을 줄이기로 결정
- recoverable failures는 neverthrow와 공통 에러 코드 체계로 관리하기로 결정

## Cross-cutting Concerns

These patterns apply to ALL systems and must be followed by every implementation.

### Error Handling

**Strategy:** `neverthrow Result 중심 + 제한된 전역 fatal handler`

복구 가능한 실패는 예외를 던지기보다 `Result<T, GameError>`로 반환한다. 광고 로드 실패, 저장 실패, 해금 조건 미충족, 이벤트 보상 실패 같은 recoverable error는 가능한 한 사용자 경험을 끊지 않는 방식으로 조용히 복구하거나 대체 경로를 제공한다. 다만 사용자가 기대한 결과가 직접 무효화되는 경우에는 짧고 명확한 UX 피드백을 제공한다.

fatal error는 세션을 안전하게 중단하고, 상태를 보호한 뒤 반드시 로깅한다. fatal handler는 어디서나 호출되는 일반 예외 처리기가 아니라, 세션 초기화 실패, 복구 불가능한 상태 손상, 치명적 저장 구조 손상 같은 제한된 진입점에서만 사용한다.

**Error Levels:**
- `Recoverable`: 세션 지속 가능, 사용자에게는 최소한의 피드백 또는 조용한 복구
- `Handled Failure`: 명시적 분기 처리 필요, 예: 광고 실패 후 일반 재도전으로 복귀
- `Fatal`: 세션 중단, 로깅, 필요 시 안전한 초기 화면 복귀

**Example:**

```ts
type RetryError =
  | { code: 'AD_LOAD_FAILED'; message: string }
  | { code: 'SESSION_RESTORE_FAILED'; message: string };

function requestRetryFromAd(): ResultAsync<'retry-granted', RetryError> {
  return adBridge.showRewardedRetryAd().mapErr(() => ({
    code: 'AD_LOAD_FAILED',
    message: 'Rewarded retry ad could not be loaded',
  }));
}
```

### Logging

**Format:** 구조화된 JSON 로그  
**Destination:** dev는 console, prod는 adapter를 통해 analytics/error sink 전송

모든 시스템은 공통 필드를 포함한 구조화 로그를 사용한다. 최소 필드는 `timestamp`, `level`, `domain`, `event`, `sessionId`를 포함하며, 가능하면 `worldId`, `stageId`, `stateNode`, `context`를 함께 남긴다. 로그는 사람이 읽기 쉬운 문장보다, 필터링과 재현이 쉬운 구조를 우선한다.

**Log Levels:**
- `ERROR`: 복구 실패, fatal error, 데이터 손상 가능성
- `WARN`: 예상 외 상황이지만 처리 가능함
- `INFO`: 세션 시작/종료, 스테이지 클리어, 광고 보상 수령 같은 주요 마일스톤
- `DEBUG`: 상태 전이, 브리지 응답, 로딩 세부 정보
- `TRACE`: 필요 시 개발 중 한정 사용

성능 민감 구간에서는 DEBUG/TRACE 남용을 피하고, production에서는 DEBUG를 기본 비활성화한다.

**Example:**

```ts
logger.info({
  domain: 'session',
  event: 'session.retry_ad.accepted',
  sessionId,
  worldId,
  stageId,
  stateNode: 'session.failed.offerRetry',
  context: { placement: 'fail_retry' },
});
```

### Configuration

**Approach:** `JSON config + TypeScript schema`

설정은 아래 4가지 범주로 분리한다.

- `Game Constants`: 물리 상수, 불변 식별자, 시스템 제한값
- `Balance Config`: 블록 HP, 피버 충전량, 점수 배율 등 조정 가능한 값
- `Player Settings`: 진동, 볼륨, 그래픽 옵션, 접근성 옵션
- `Platform Settings`: WebView 여부, 광고/IAP provider 키, 플랫폼별 제약값

JSON 기반 설정 파일을 사용하되, TypeScript schema 또는 타입 검증 계층을 통해 읽는다. 플레이어 설정은 IndexedDB를 기본 저장소로 하고, 아주 단순한 값은 localStorage 사용도 허용한다.

### Event System

**Pattern:** `typed event bus`

시스템 간 결합도를 낮추기 위해 typed event bus를 사용한다. 이벤트는 string literal union 또는 타입 정의된 payload와 함께 발행된다. 기본은 동기 이벤트 처리이며, 광고/IAP/외부 브리지 같은 외부 호출은 async service 계층에서 처리한다.

이벤트 버스는 모든 통신에 사용하지 않고, `도메인 경계를 넘는 통신`, `관찰 가능한 상태 변화`, `분석/디버깅 가치가 있는 사건`에 한해 사용한다. 동일 모듈 내부의 단순 제어 흐름은 직접 함수 호출을 우선한다.

**Event Naming:** `domain.action`
예:
- `session.started`
- `session.failed`
- `ads.retryRequested`
- `progression.worldUnlocked`
- `fever.activated`

**Example:**

```ts
type GameEvent =
  | { type: 'session.failed'; stageId: string }
  | { type: 'ads.retryRequested'; placement: 'fail_retry' }
  | { type: 'fever.activated'; meterValue: number };

eventBus.emit({ type: 'session.failed', stageId });
```

### Debug Tools

**Available Tools:**
- debug overlay
- state inspector
- cheat commands
- ad simulation
- save reset
- forced error/fatal trigger
- mock ad success/fail toggles

debug 도구는 개발과 QA 효율을 높이기 위해 기본 제공한다. 특히 이 프로젝트는 상태 전이와 광고 재도전 분기가 많기 때문에, 상태 inspect, 광고 시뮬레이션, 강제 실패 유도 도구가 중요하다.

**Activation:**
- dev build에서만 활성
- 숨김 단축키 또는 query parameter로 활성
- release build에는 기본 비노출

예:
- `?debug=1`
- 숨김 키 조합으로 overlay 토글

## Data Architecture

게임 데이터는 `정적 구성 데이터`와 `가변 진행 데이터`로 분리한다.

### Static Data

정적 데이터는 `app/assets/data`와 `app/config`에서 관리한다.

- 월드 정의
- 스테이지 정의
- 밸런스 값
- 이벤트 구성
- 플랫폼별 설정

이 데이터는 `typed config loader`를 통해 로드하며, 직접 JSON 파일을 읽는
방식은 허용하지 않는다.

### Mutable Data

가변 데이터는 `repository + IndexedDB`로 관리한다.

- 별점
- 퍼펙트 기록
- 월드 해금 상태
- XP / 레벨업
- 플레이어 설정
- 이벤트 참여 / 보상 수령 상태

### Save Model Principles

- 저장 데이터는 JSON 직렬화 가능한 구조여야 한다.
- 저장 스키마에는 version 필드를 포함한다.
- migration 없이 직접 구조 변경하지 않는다.
- 런타임 시스템은 IndexedDB를 직접 호출하지 않고 repository를 통해
  접근한다.

## API Contracts

v1 기준으로 외부 백엔드 API를 전제로 하지 않는다. 따라서 이 프로젝트의
“API 계약”은 주로 내부 브리지와 서비스 계약을 의미한다.

This project does not define public network APIs in v1. 모든 계약은 내부
service, repository, bridge boundary를 의미한다.

### Internal Contracts

- `AdBridgeAdapter`
  - rewarded ad 요청
  - 성공 / 실패 / 취소 결과 반환
- `IapAdapter`
  - 구매 요청
  - 구매 성공 / 실패 / 취소 반환
- `ProgressionRepository`
  - 저장 데이터 load / save
- `ConfigLoader`
  - 정적 설정 로드
- `AnalyticsSink`
  - 구조화 이벤트 전송

### Contract Rules

- 모든 외부 연동 계약은 `app/domain/contracts` 또는 `app/platform/*`
  adapter 경계에서 정의한다.
- 성공/실패는 `Result<T, GameError>`로 표현한다.
- Phaser Scene은 외부 계약을 직접 호출하지 않는다.
- 브리지 결과는 XState service layer가 수신하고 상태 전이로 변환한다.

## Security Architecture

이 프로젝트는 계정 기반 인증이나 권한 체계를 요구하지 않지만, 데이터
무결성과 외부 SDK 경계를 보호하는 보안 원칙이 필요하다.

### Security Principles

- 외부 SDK 호출은 `app/platform` 계층으로 제한한다.
- 브리지 입력값은 플랫폼 adapter에서 검증한다.
- 저장 데이터는 신뢰하지 않고 로드 시 schema 검증을 수행한다.
- 손상된 저장 데이터는 migration 또는 안전한 초기화 경로로 복구한다.
- debug 기능은 dev 모드에서만 활성화한다.
- 민감한 provider key는 코드 상수로 직접 하드코딩하지 않고 빌드 설정 또는
  환경 주입을 사용한다.

### Data Integrity

- 저장 데이터는 버전 검증 후 로드한다.
- 해금 조건, 보상 수령 조건은 domain 계층에서 재검증한다.
- 광고/IAP 결과는 adapter 성공만으로 즉시 확정하지 않고, service layer에서
  도메인 규칙과 함께 처리한다.

## Performance Considerations

이 게임의 성능 목표는 `입력 즉시성`, `60fps에 가까운 안정성`, `짧은 로딩`,
`광고/재도전 전환의 부드러움`이다.

### Performance Strategies

- 공통 리소스 선로딩 + 월드 단위 hybrid 로딩 사용
- `ball`, `impact effect`, `particle effect`, `transient VFX`는 pooling 우선
- Scene에서 반복적인 객체 생성과 직접 SDK 호출 금지
- HUD는 XState 또는 Zustand selector 기반 최소 구독만 수행
- DEBUG / TRACE 로그는 production 비활성화
- VFX는 판정 계층이 아니라 피드백 계층에서 처리
- 성능 민감 경로에서는 순수 계산과 데이터 접근을 분리

### Profiling Focus Areas

- 턴 종료 시 modifier 조합
- 연쇄 파괴가 길어지는 순간
- 피버 발동과 대량 이펙트
- 실패 후 광고 재도전 분기
- WebView 환경에서의 렌더링 안정성

## Deployment Architecture

이 프로젝트는 `app/`을 독립적인 프론트엔드 앱 루트로 사용하며, 웹과 모바일
WebView 래핑을 모두 고려한다.

### Deployment Targets

- 웹 배포: 브라우저 실행용 정적 번들
- 모바일 배포: WebView 기반 앱 패키징 대상
- PC 보조 배포: 웹 빌드 기반 보조 실행 가능

### Deployment Principles

- 빌드 기준 루트는 `app/`
- 정적 산출물은 웹 서버 또는 WebView host가 로드 가능해야 함
- 플랫폼별 광고/IAP adapter는 capability detection을 통해 분기
- core runtime은 특정 SDK 존재를 가정하지 않음
- 오프라인 플레이를 지원하는 방향으로 asset/data loading 구성

## Project Structure

### Organization Pattern

**Pattern:** Hybrid

**Rationale:**  
`app/`을 이 프로젝트의 실제 애플리케이션 루트로 사용한다. 빌드 설정, 런타임 진입점, 게임 코드, UI, 상태 관리, 플랫폼 연동, 테스트, 에셋 참조가 모두 `app/` 아래에 위치한다. 상위 레벨에서는 `game`, `state`, `ui`, `platform`, `domain`, `config`처럼 역할 기준으로 나누고, 내부에서는 세션, 진행, 광고, 저장, 피버 같은 기능/도메인 기준으로 세분화한다.

이 구조는 프로젝트 규칙인 `소스 코드: ./app/`을 가장 강하게 지키며,
`Phaser = runtime`, `React = UI`, `XState = orchestration`,
`Zustand = selector store`, `platform = external integration`이라는 현재
아키텍처 결정을 명확하게 반영한다.

### Directory Structure

```text
neo-brick-crush/
├── app/                              # 완전한 앱 루트
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── vite-env.d.ts
│   │
│   ├── main.tsx                      # 웹 앱 진입점
│   ├── bootstrap/                    # provider 등록, 초기 wiring, composition root
│   │   ├── create-app.ts
│   │   ├── register-providers.ts
│   │   └── mount-game-shell.tsx
│   │
│   ├── game/                         # Phaser 게임 런타임
│   │   ├── core/                     # 게임 루프, 엔진 초기화, shared runtime services
│   │   ├── scenes/                   # BootScene, MenuScene, StageScene 등
│   │   ├── systems/                  # collision, board descent, turn resolution
│   │   ├── entities/                 # ball, block, gate, fever entities
│   │   ├── mechanics/                # aim/shoot, gate modifiers, fever behavior
│   │   ├── effects/                  # VFX trigger, screen shake, vibration hook
│   │   └── hud-bridges/              # Phaser <-> React HUD sync helpers
│   │
│   ├── state/                        # XState orchestration
│   │   ├── machines/                 # session, progression, ads, boot, store machines
│   │   ├── actors/                   # invoked actor / service wiring
│   │   ├── selectors/                # derived state for UI/runtime
│   │   ├── stores/                   # Zustand stores for lightweight UI state
│   │   ├── events/                   # typed state event definitions
│   │   └── guards/                   # transition guards and condition helpers
│   │
│   ├── ui/                           # React presentation layer
│   │   ├── screens/                  # menu, world map, result, event, store
│   │   ├── hud/                      # fever meter, score, retry CTA, stage HUD
│   │   ├── components/               # reusable UI components
│   │   ├── overlays/                 # reward modal, pause modal, debug overlay
│   │   └── hooks/                    # UI-only hooks
│   │
│   ├── platform/                     # 외부 플랫폼/SDK 연동
│   │   ├── ads/                      # rewarded ad adapters, mocks
│   │   ├── iap/                      # purchase adapters
│   │   ├── persistence/              # IndexedDB repository, migration
│   │   ├── analytics/                # analytics / error sink adapter
│   │   ├── audio/                    # platform audio integration
│   │   └── webview/                  # WebView bridge and capability detection
│   │
│   ├── domain/                       # 프레임워크 독립 도메인 계층
│   │   ├── models/                   # save model, progression model, stage model
│   │   ├── value-objects/            # ids, score value, fever meter value
│   │   ├── constants/                # global constants
│   │   ├── errors/                   # GameError, error code catalog
│   │   └── contracts/                # repository/service/bridge interfaces
│   │
│   ├── config/                       # typed config and schema
│   │   ├── game/
│   │   ├── balance/
│   │   ├── platform/
│   │   └── schema/
│   │
│   ├── assets/                       # 앱에서 참조하는 런타임 에셋과 데이터
│   │   ├── manifests/
│   │   ├── loaders/
│   │   ├── art/
│   │   │   ├── sprites/
│   │   │   ├── backgrounds/
│   │   │   ├── effects/
│   │   │   └── ui/
│   │   ├── audio/
│   │   │   ├── music/
│   │   │   ├── sfx/
│   │   │   └── ui/
│   │   └── data/
│   │       ├── worlds/
│   │       ├── stages/
│   │       ├── balance/
│   │       └── events/
│   │
│   ├── shared/                       # cross-cutting helpers only
│   │   ├── logging/
│   │   ├── events/
│   │   ├── result/
│   │   ├── utils/
│   │   └── types/
│   │
│   ├── tests/                        # 앱 근접 테스트
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── e2e/
│   │   └── fixtures/
│   │
│   └── README.md                     # 앱 실행/개발 가이드
│
├── _bmad-output/
│   ├── gdd.md
│   ├── epics.md
│   ├── game-brief.md
│   └── game-architecture.md
│
├── docs/                             # 추가 설명 문서가 필요할 경우
└── README.md
```

### System Location Mapping

| System | Location | Responsibility |
| ------ | -------- | -------------- |
| 코어 세션 런타임 | `app/game/core`, `app/game/systems` | 게임 루프, 턴 해석, 보드 하강, 승패 판정 |
| 게이트 / 피버 메커닉 | `app/game/mechanics`, `app/game/entities` | 게이트 modifier, 피버 충전/발동, 연쇄 증폭 |
| Phaser 씬 | `app/game/scenes` | Boot, Menu, Stage 등 실제 장면 관리 |
| 세션 상태 전이 | `app/state/machines/session*` | 인게임, 실패, 광고 재도전, 클리어 흐름 |
| 진행 / 해금 | `app/state/machines/progression*`, `app/domain/models` | 월드 해금, 별점, XP, 퍼펙트 |
| 광고 / IAP 브리지 | `app/platform/ads`, `app/platform/iap` | SDK adapter, mock, bridge 처리 |
| 저장 / 세이브 | `app/platform/persistence`, `app/domain/models` | IndexedDB 저장, migration, save schema |
| UI 화면 | `app/ui/screens`, `app/ui/components` | 메뉴, 월드맵, 결과, 이벤트, 상점 |
| HUD | `app/ui/hud`, `app/game/hud-bridges` | 인게임 HUD와 런타임 연결 |
| 경량 UI 상태 | `app/state/stores`, `app/state/selectors` | selector 기반 HUD/view-model 상태 |
| 로그 / 에러 처리 | `app/shared/logging`, `app/domain/errors`, `app/shared/result` | structured log, Result helper, 에러 코드 |
| 이벤트 버스 | `app/shared/events`, `app/state/events` | typed event bus, state event contract |
| 설정 / 밸런스 | `app/config`, `app/assets/data/balance` | typed config, tuning values |
| 에셋 manifest / preload | `app/assets/manifests`, `app/assets/loaders` | preload, 월드별 asset bundle mapping |
| 디버그 도구 | `app/ui/overlays/debug`, `app/state/selectors` | debug overlay, state inspect, ad simulation |

### Naming Conventions

#### Files
- TypeScript 일반 모듈: `kebab-case.ts`
- React 컴포넌트 파일: `PascalCase.tsx`
- XState 머신: `feature-name.machine.ts`
- XState actor / service: `feature-name.actor.ts`, `feature-name.service.ts`
- Phaser Scene: `PascalCaseScene.ts`
- Adapter / Repository: `feature-name.adapter.ts`, `feature-name.repository.ts`
- Config 파일: `kebab-case.json`
- Asset manifest: `feature-name.manifest.ts`

#### Code Elements

| Element | Convention | Example |
| ------- | ---------- | ------- |
| Component | `PascalCase` | `RetryModal` |
| Function | `camelCase` | `resolveTurnResult` |
| Variable | `camelCase` | `sessionState`, `feverMeterValue` |
| Boolean | `is` / `has` / `can` prefix | `isLoaded`, `hasReward`, `canRetry` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_FEVER_METER` |
| Error Code | `UPPER_SNAKE_CASE` | `AD_LOAD_FAILED` |
| Event Name | `domain.action` | `session.failed`, `ads.retryRequested` |

#### Game Assets
- Sprite / texture: `domain-object-state`
  - `block-basic-hit`
  - `gate-reflect-idle`
- Audio: `category-purpose-variant`
  - `sfx-block-hit-01`
  - `music-world-01-loop`
- Stage data: `world-xx-stage-yy.json`
- Balance data: `balance-core.json`, `balance-fever.json`
- UI asset: `ui-element-state`
  - `ui-button-play-default`

### Code Organization Rules

- 앱 실행과 구현에 필요한 코드는 모두 `app/` 하위에 둔다.
- `app/`이 실제 프론트엔드 프로젝트 루트이며, `npm install`, `npm run dev`, `npm run build`, `npm test`는 기본적으로 `app/` 기준으로 수행한다.
- React 컴포넌트는 기본적으로 `export default function` 패턴을 우선한다.
- 클래스 기반 구현보다 함수형/선언형 패턴을 우선한다.
- 중첩 `if`보다 early return과 guard clause를 우선한다.
- UI 계층(`app/ui`)에는 게임 규칙을 두지 않는다.
- 상태 전이 로직은 `app/state`에, 런타임 판정은 `app/game`에 둔다.
- 세션/보상/진행의 단일 진실원은 `XState`에 둔다.
- 경량 UI 상태는 `app/state/stores`의 Zustand store에 둔다.
- 화면은 필요한 값만 selector로 구독해 리렌더링을 최소화한다.
- 외부 SDK 호출은 `app/platform` 밖에서 직접 수행하지 않는다.
- `app/shared`는 공통 사용이 명확한 경우에만 사용한다.
- 파일이 비대해지면 helper, selector, actor, adapter 등으로 분리한다.
- 주석은 “무엇”보다 “왜”를 설명한다.

### Architectural Boundaries

- `app/game`은 Phaser 런타임 전용이다.
- `app/state`는 XState 오케스트레이션 전용이다.
- `app/state/stores`는 Zustand 기반 UI selector store 전용이다.
- `app/ui`는 React 프레젠테이션 전용이다.
- `app/platform`은 광고/IAP/저장/분석/WebView 연동 전용이다.
- `app/domain`은 프레임워크 독립 규칙과 모델을 담는다.
- `app/config`는 JSON + TypeScript schema 기반 설정을 담는다.
- `app/shared`는 다계층 공용 유틸만 허용한다.
- `app/assets`는 앱 실행에 필요한 런타임 에셋, 데이터, manifest를 담는다.
- debug 기능은 dev 활성화 뒤에서만 동작해야 하며, release 동작에 섞이면 안 된다.

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents.

### Novel Patterns

#### 광고 재도전 패턴

**Purpose:**  
실패 직후의 감정 흐름을 유지하면서, 광고 시청 성공/실패에 따라 세션 복귀 또는 일반 실패 처리로 안정적으로 분기하기 위한 패턴이다.

**Components:**
- `SessionMachine` - 실패 상태, 광고 제안 상태, 복귀 상태 관리
- `AdRetryService` - 보상형 광고 요청 및 결과 반환
- `AdBridgeAdapter` - 실제 광고 SDK/WebView 브리지 연동
- `RetryPolicy` - 재도전 가능 여부, 횟수, 보상 적용 규칙
- `RetryOverlay` - 사용자에게 광고 재도전 선택 UI 제공

**Data Flow:**
1. 세션 실패 발생
2. `SessionMachine`이 광고 재도전 가능 상태인지 판단
3. 가능하면 `RetryOverlay` 노출
4. 사용자가 광고 재도전 선택 시 `AdRetryService` 호출
5. 광고 성공 시 세션 복구 컨텍스트 적용 후 인게임 복귀
6. 광고 실패 또는 거절 시 일반 실패 흐름 유지

**State Ownership Rules:**
- 광고 제안 여부와 복귀 가능 여부는 `SessionMachine`이 소유한다.
- 광고 SDK 호출은 `AdBridgeAdapter`만 수행한다.
- Scene는 광고 요청을 직접 발생시키지 않는다.

**Implementation Guide:**

```ts
const retryFromAd = fromPromise(async () => {
  const result = await adRetryService.requestRetry();
  return result.match(
    () => ({ type: 'RETRY_GRANTED' as const }),
    (error) => ({ type: 'RETRY_DENIED' as const, error }),
  );
});
```

**Usage:**
- 실패 후 추가 기회를 줄 때 사용
- 광고 성공/실패가 세션 상태 전이에 영향을 줄 때 사용
- Phaser가 아닌 XState orchestration 계층에서만 사용

#### 게이트 / 피버 조합 패턴

**Purpose:**  
코어 판정 로직을 오염시키지 않으면서, 게이트 modifier와 피버 modifier를 순서 있게 조합해 예측 가능하고 디버깅 가능한 결과를 만들기 위한 패턴이다.

**Components:**
- `TurnResolver` - 기본 턴 판정 해석
- `GateModifierPipeline` - 게이트 효과 적용
- `FeverModifierPipeline` - 피버 상태 기반 증폭 적용
- `ModifierContext` - 현재 샷, 충돌, 상태 정보를 전달
- `EffectEmitter` - 최종 결과를 기반으로 VFX/SFX/진동 이벤트 발행

**Data Flow:**
1. 기본 샷 결과 계산
2. 게이트 modifier 적용
3. 피버 modifier 적용
4. 최종 결과 확정
5. 결과를 런타임과 피드백 계층에 전달

**Modifier Rules:**
- modifier 적용 순서는 항상 `base -> gate -> fever -> finalize`로 고정한다.
- Scene는 modifier 순서를 직접 조합하지 않는다.
- modifier는 가능한 한 순수 함수 형태를 우선한다.

**Implementation Guide:**

```ts
function resolveTurn(context: ModifierContext): TurnResult {
  const baseResult = resolveBaseTurn(context);
  const gateApplied = applyGateModifiers(baseResult, context);
  const feverApplied = applyFeverModifiers(gateApplied, context);

  return finalizeTurnResult(feverApplied);
}
```

**Usage:**
- 게이트와 피버가 동시에 영향을 줄 수 있는 판정에 사용
- modifier 순서를 고정해야 할 때 사용
- 직접 Scene 안에서 계산하지 않고 resolver 계층을 통해 사용

#### Phaser-React-XState-Zustand 연결 패턴

**Purpose:**  
Phaser는 런타임, React는 표현, XState는 오케스트레이션, Zustand는
selector 기반 UI 상태라는 책임을 유지하면서, HUD와 세션 흐름을
일관되게 연결하기 위한 패턴이다.

**Components:**
- `GameRuntimeBridge` - Phaser와 XState 사이 상태/이벤트 연결
- `HudBridge` - XState 상태를 Zustand view store와 React HUD로 전달
- `SessionMachine` - 전체 세션 흐름 관리
- `StageScene` - 실제 게임 플레이와 판정 수행
- `HudStoreSelector` - HUD에 필요한 최소 상태만 선택
- `UiViewStore` - Zustand 기반 UI view-model 저장소

**Data Flow:**
1. XState가 세션 상태를 소유
2. Phaser Scene은 플레이 결과와 이벤트를 `GameRuntimeBridge`로 전달
3. XState는 이를 처리해 새로운 상태 생성
4. 필요한 파생 상태만 `UiViewStore`로 투영
5. React HUD는 selector를 통해 필요한 상태만 구독해 렌더링
6. React UI intent는 다시 XState 이벤트로 전달

**Ownership Rules:**
- 세션 상태의 단일 진실원은 XState다.
- Phaser는 상태를 소유하지 않고 이벤트와 런타임 결과를 생산한다.
- Zustand는 렌더링 최적화를 위한 selector store이며 세션 규칙을 소유하지 않는다.
- React는 상태를 계산하지 않고 selector 기반으로 표시만 한다.

**Implementation Guide:**

```ts
runtimeBridge.onTurnResolved((payload) => {
  sessionActor.send({ type: 'TURN_RESOLVED', payload });
});

const feverMeter = useUiViewStore((state) => state.feverMeter);
```

**Usage:**
- Phaser와 React가 같은 상태를 중복 소유하지 않게 할 때 사용
- XState와 Zustand의 책임을 분리하면서 HUD 리렌더링을 줄일 때 사용
- 인게임 HUD와 메타 UI를 분리하되 동일한 세션 상태를 반영할 때 사용
- Scene에서 직접 React state를 건드리지 않기 위해 사용

### Communication Patterns

**Pattern:** 이벤트 기반 + 명시적 서비스 호출 혼합

도메인 경계를 넘는 통신과 관찰 가능한 상태 변화는 이벤트를 사용하고, 외부 연동이나 명확한 요청/응답 흐름은 서비스 호출을 사용한다. 직접 참조는 최소화하고, 동일 모듈 내부의 단순 제어 흐름만 직접 호출을 허용한다.

**Rule of Use:**
- 도메인 경계를 넘는 사건: 이벤트 사용
- 외부 SDK / 저장 / 브리지 요청: 서비스 호출 사용
- 같은 모듈 내부의 단순 계산: 직접 함수 호출 허용

**Example:**

```ts
eventBus.emit({ type: 'session.failed', stageId });

const rewardResult = await adRetryService.requestRetry();
```

### Entity Patterns

**Creation:** Factory + pooling

엔티티 생성은 factory를 기본으로 사용한다. 단순하고 설정 가능한 게임 오브젝트 생성은 factory가 담당하며, 자주 생성/파괴되는 공, 파티클, 임팩트 이펙트는 pooling을 사용한다.

**Pooling Rules:**
- `ball`, `impact effect`, `particle effect`, `transient VFX`는 pooling 우선
- 월드/스테이지 단위의 장기 객체는 factory 생성 후 일반 lifecycle 허용
- Scene 안에서 반복적인 `new` 생성은 금지

**Example:**

```ts
const ball = ballFactory.create(initialBallConfig);
const impactEffect = impactEffectPool.acquire();
```

### State Patterns

**Pattern:** 명시적 상태 머신 + modifier pipeline

세션 흐름과 메타 분기는 XState 상태 머신으로 관리하고, 실제 턴 판정 내부의 게이트/피버 조합은 modifier pipeline으로 처리한다. 즉, 세션 상태와 판정 상태를 같은 방식으로 다루지 않는다.

**Example:**

```ts
sessionActor.send({ type: 'STAGE_FAILED' });

const resolvedTurn = turnResolver.resolve(context);
```

### Data Patterns

**Access:** Repository + typed config loader

저장 데이터, 진행 데이터, 이벤트 상태는 repository를 통해 접근한다. 밸런스 값, 게임 상수, 플랫폼 설정은 typed config loader를 통해 로드한다. 시스템이 파일이나 저장소를 직접 읽는 방식은 금지한다.

**Boundary Rules:**
- mutable progression data: repository
- static tunable data: config loader
- 직접 JSON 파일 읽기 또는 직접 IndexedDB 접근 금지

**Example:**

```ts
const saveData = await progressionRepository.load();
const feverBalance = configLoader.load('balance/fever');
```

### Consistency Rules

| Pattern | Convention | Enforcement |
| ------- | ---------- | ----------- |
| Runtime ownership | Phaser는 런타임만 담당 | Scene에서 광고/IAP/저장 직접 호출 금지 |
| State ownership | XState가 세션 상태를 소유, Zustand는 UI view state만 소유 | React/Phaser/Zustand의 세션 상태 중복 소유 금지 |
| UI updates | React는 XState/Zustand selector 기반 구독 | HUD가 게임 규칙 직접 계산 금지 |
| Error flow | recoverable error는 Result로 반환 | throw 남용 금지, fatal만 제한 허용 |
| Modifier logic | 게이트 후 피버 순서 고정 | Scene 내부 임의 순서 계산 금지 |
| Data access | repository/config loader 경유 | 직접 파일 접근 금지 |
| Entity creation | factory 우선, 고빈도 객체는 pooling | Scene 내 임시 new 남발 금지 |
| Communication | 이벤트 + 서비스 혼합 | 도메인 경계 넘는 직접 참조 최소화 |
| Debuggability | 상태/분기 로깅 가능해야 함 | 브리지/세션/보상 흐름은 로그와 디버그 포인트 제공 |
| Render optimization | 화면은 필요한 값만 selector로 구독 | broad store subscribe 금지 |

## Architecture Validation

### Validation Summary

| Check | Result | Notes |
| --- | --- | --- |
| Decision Compatibility | PASS | `Phaser + React + XState + Zustand + neverthrow` 조합이 역할 충돌 없이 정리됨 |
| GDD Coverage | PASS | 코어 루프, 게이트/피버, 광고 재도전, 진행/해금, 임팩트/성능 요구사항 모두 아키텍처 지원 존재 |
| Pattern Completeness | PASS | 광고 재도전, 게이트/피버 조합, Phaser-React-XState-Zustand 연결, repository/config, factory/pooling까지 정의됨 |
| Epic Mapping | PASS | Epic 1~5가 모두 구조/패턴/책임 경계에 매핑됨 |
| Document Completeness | PASS | 핵심 템플릿 섹션과 구현 가이드가 모두 채워졌고 placeholder 없음 |

### Coverage Report

- **Systems Covered:** 6/6
- **Patterns Defined:** 8+
- **Decisions Made:** 7+
- **Novel Patterns Defined:** 3

### Revalidated Points

- `Zustand`를 UI view state 전용으로 명시
- `XState`는 세션/보상/진행의 단일 진실원으로 유지
- `React`는 selector 기반 구독만 수행
- `broad subscribe` 금지, 화면은 필요한 값만 selector로 사용
- `Phaser-React-XState-Zustand` 연결 패턴이 문서에 명시됨

### Issues Resolved

- `_bmad-output` 직하 산출물을 `planning-artifacts`로 이동
- 문서 내부 참조 경로 수정
- `app/`을 완전한 앱 루트로 재정의
- 누락된 템플릿 섹션 보강
- 버전 source of truth 명시
- 상태 계층을 `XState / Zustand / React local state`로 명확히 분리
- 리렌더링 최소화를 위한 selector 원칙 명시

### Overall Status

**PASS**

현재 아키텍처 문서는 구현 책임 경계가 분명하고, AI 에이전트가 파일 위치와
패턴을 추측하지 않아도 되며, 세션 상태, BM, 저장, HUD, 성능 최적화 기준까지
포함하고 있어서 구현 가이드 문서로 사용 가능한 상태다.

## Development Environment

### Prerequisites

- Node.js: 현재 app dependency를 설치하고 Vite를 실행할 수 있는 버전
- npm 또는 호환 패키지 매니저
- 최신 브라우저(WebGL/Canvas 실행 가능)
- 모바일 WebView 테스트 환경
- IndexedDB 사용 가능 브라우저 환경

### AI Tooling (MCP Servers)

- v1 아키텍처 기준 필수 MCP 의존성은 없음
- 공식 문서 확인용 문서 조회 도구는 추후 선택적으로 추가 가능
- 광고/IAP/WebView SDK 도입 시 해당 공급자 공식 문서 기반 검증을 권장

### Setup Commands

```bash
cd /Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/app
npm install
npm run dev
```
