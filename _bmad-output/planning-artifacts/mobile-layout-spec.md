---
title: 'Mobile Layout Specification'
project: 'neo-brick-crush'
date: '2026-04-11'
author: 'Dhlee'
version: '1.0'
status: 'active'
relatedDocuments:
  gdd: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md'
  architecture: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md'
  projectContext: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md'
---

# Mobile Layout Specification

## Purpose

이 문서는 `neo-brick-crush`의 모바일 플레이 화면 기준을 고정한다. 이후 재구현이나 리팩터링이 발생하더라도, 모바일 레이아웃은 현재 코드보다 이 문서의 규칙을 우선해야 한다.

## Core Rules

- 모바일에서는 페이지 스크롤이 생기면 안 된다.
- 플레이 화면은 `스테이지 정보 바 -> 게임 영역 -> HUD` 3단 구조로 유지한다.
- 게임 영역은 스테이지 정보와 HUD 사이의 남는 높이를 거의 전부 사용해야 한다.
- HUD는 PC와 동일한 7개 항목을 모바일에서도 모두 보여줘야 한다.
- HUD 7개 항목은 반드시 한 줄이다.
- Fever 버튼은 게임 영역 하단 중앙의 작은 오버레이 액션이다.
- 게임 보드와 블록은 모바일 폭 안에서 잘리지 않아야 한다.

## Mobile Play Layout

```text
┌──────────────────────────┐
│ Compact Stage Bar        │
├──────────────────────────┤
│                          │
│        Game Area         │
│   blocks start near top  │
│   launcher near bottom   │
│                          │
├──────────────────────────┤
│ Sess Turn Aim Blk Dng    │
│ Fvr Shot  (single row)   │
└──────────────────────────┘
```

실제 HUD는 위 예시처럼 두 줄이 아니라, 7개 항목이 한 줄에 모두 보여야 한다.

## HUD Contract

모바일 HUD는 다음 7개 항목을 모두 한 줄에 표시한다.

1. `Session`
2. `Turn`
3. `Aim`
4. `Blocks`
5. `Danger`
6. `Fever`
7. `Shot`

### HUD Rules

- 줄바꿈 금지
- 래핑 금지
- 각 항목은 고정 비율 폭으로 계산
- 필요 시 축약 라벨 허용
  - `Sess`, `Blk`, `Dng`, `Fvr`
- 부모 폭을 넘지 않도록 `nowrap` 기준으로 강제

## Fever Button Contract

- 위치: 게임 영역 안 하단 중앙
- 별도 하단 행 금지
- HUD보다 큰 세로 공간 차지 금지
- 프롬프트/공/조준선과 겹침 최소화

## Game Area Contract

### Height

- 블록은 스테이지 정보 바 바로 아래부터 보여야 한다.
- 공은 HUD 바로 위에 보여야 한다.
- 게임 영역은 스테이지 정보 바와 HUD 사이의 공간을 거의 전부 사용해야 한다.
- 게임 영역을 고정 `16:9` 박스로 잠그면 안 된다.

### Width

- 게임 캔버스는 부모 프레임 폭을 그대로 사용해야 한다.
- 보드 메트릭은 모바일 폭 기준으로 재계산해야 한다.
- 좌우 끝 블록이 잘리면 실패한 구현이다.

## Runtime Rules

- Phaser 런타임은 부모 DOM의 실제 `width/height`를 기준으로 생성/resize 한다.
- 모바일/preview 모두에서 Phaser `arcade` physics가 반드시 활성화되어야 하며, physics 누락으로 scene이 검은 캔버스 상태에 머물면 실패한 구현이다.
- Scene은 모바일 폭에서 별도의 보드 메트릭을 사용해야 한다.
  - horizontal padding
  - block width
  - block height
  - block gap
  - board top
  - launcher y

## Input Rules

- 모바일 조준 시작은 런처 근처의 작은 점 클릭에만 의존하면 안 된다.
- 플레이어는 `런처보다 위쪽의 플레이 가능 영역`에서 자연스럽게 드래그를 시작할 수 있어야 한다.
- 조준 시작 허용 범위가 지나치게 좁아 preview에서 "아무 동작도 안 되는 것처럼" 느껴지면 실패한 구현이다.

## Preview / Boot Resilience

- `progressionRepository.load()`가 지연되거나 실패하더라도 셸은 기본 progression으로 복구되어야 한다.
- preview 환경에서 save load 경계 때문에 앱이 영구 `booting` 상태에 머물면 안 된다.
- persisted stage selection이 stale하거나 잘못된 경우에도 기본 stage fallback으로 안전하게 부팅되어야 한다.

## Loss Line Contract

- 보이는 `LOSS LINE`과 실제 실패 판정 row는 체감상 같은 경계를 가리켜야 한다.
- 블록이 `LOSS LINE 바로 위`에 있을 때 실패하면 안 된다.
- 실패는 `보이는 선을 실제로 넘는 첫 row`에서만 발생해야 한다.
- launcher 기준선이나 HUD 여백 조정 때문에 `LOSS LINE` 위치까지 같이 움직이면 안 된다.

## Acceptance Criteria

1. 모바일에서 페이지 스크롤이 없다.
2. HUD 7개 항목이 한 줄에 모두 보인다.
3. Fever 버튼이 가운데 정렬되고 화면 밖으로 나가지 않는다.
4. 블록이 좌우로 잘리지 않는다.
5. 블록은 스테이지 바 바로 아래에서 시작한다.
6. 공은 HUD 바로 위에 위치한다.
7. 게임 영역이 스테이지 바와 HUD 사이를 대부분 사용한다.
8. preview에서 기본 stage 또는 fallback stage로 실제 플레이 가능 상태까지 부팅된다.
9. 조준은 플레이 영역 드래그로 시작할 수 있다.
10. 블록은 `LOSS LINE`을 실제로 넘기 전에는 실패 처리되지 않는다.

## Priority Rule

이 문서와 현재 구현 코드가 충돌하면, 모바일 레이아웃에 대해서는 이 문서를 우선한다.
