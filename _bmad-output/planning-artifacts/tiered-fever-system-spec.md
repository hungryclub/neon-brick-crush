---
title: 'Tiered Fever System Specification'
project: 'neo-brick-crush'
date: '2026-04-11'
author: 'Dhlee'
version: '1.0'
status: 'active'
relatedDocuments:
  feverEnhancement: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/fever-enhancement-spec.md'
  gdd: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md'
  architecture: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md'
  projectContext: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/project-context.md'
---

# Tiered Fever System Specification

## Purpose

이 문서는 기존 `단일 Fever`를 `3단계 게이지 기반 Fever System`으로 확장하는 기준을 고정한다.

Fever는 더 이상 단순한 `ready / active` 버프가 아니라, 게이지 단계에 따라 서로 다른 성격의 강화 모드로 발동되어야 한다.

## Selected Model

게이지 단계와 Fever 모드는 아래처럼 고정한다.

- `Tier 0`: charging only
- `Tier 1`: `Breaker`
- `Tier 2`: `Pierce`
- `Tier 3`: `Pulse`

추천 threshold:

- `0 ~ 34`: 미충전
- `35 ~ 69`: `Breaker Ready`
- `70 ~ 99`: `Pierce Ready`
- `100`: `Pulse Ready`

권장 충전량:

- 블록 파괴당 `+20`
- 게이트 트리거당 `+8`

위 수치는 `Pulse`가 너무 빨리 노출되지 않게 하면서, `Breaker`와 `Pierce`가 실제 플레이 중 눈에 띄도록 유지하는 기준값이다.

## Core Rule

- Fever 게이지는 준비 단계 자체가 플레이 선택지여야 한다.
- 플레이어는 현재 도달한 tier의 Fever를 즉시 발동할 수 있다.
- 발동 시 게이지는 `0`으로 초기화된다.
- 활성 Fever는 `다음 1턴`에만 적용된다.
- 턴 종료 후 Fever active 상태는 해제된다.

## Fever Modes

### Breaker

역할:

- 단단한 블록, 위험 블록, 위기 탈출에 강한 타입

의도:

- 가장 직관적인 `정면 돌파형 Fever`

기본 동작:

- Scene: 첫 3회 충돌에서 고내구 블록을 강하게 마무리
- Resolver: 상위 위험 블록 다중 제거
- Combo: Gate와 결합 시 제거 수가 증가하는 heavy clear

### Pierce

역할:

- 라인 정리, 좋은 각 활용, 경로 보상에 강한 타입

의도:

- 가장 속도감 있고 샷 감각 차이가 큰 Fever

기본 동작:

- Scene: 첫 몇 회 충돌에서 관통 또는 강화 피해
- Resolver: 샷 경로/라인과 가까운 타깃을 추가 제거
- Combo: Gate와 결합 시 라인 clear 또는 관통 보너스 강화

### Pulse

역할:

- 밀집 보드, 클러스터 정리, 범위 확산에 강한 타입

의도:

- 가장 화려하고 시각적으로 읽기 쉬운 Fever

기본 동작:

- Scene: 충돌 지점에서 주변 splash 또는 pulse 피해
- Resolver: 밀집된 클러스터 기반 추가 제거
- Combo: Gate와 결합 시 pulse 범위 또는 타깃 수 증가

## UI Contract

### Button Label

- `Build Fever`
- `Activate Breaker`
- `Activate Pierce`
- `Activate Pulse`
- `Breaker Active`
- `Pierce Active`
- `Pulse Active`

### Button Tone

- `Breaker`: amber / orange
- `Pierce`: electric cyan
- `Pulse`: magenta / pink

### HUD Tone

- HUD의 `Fever` 카드도 버튼과 같은 tier tone을 공유해야 한다.
- active 상태는 ready 상태보다 더 강한 시각 강조를 사용해야 한다.

### Prompt Contract

- 모바일의 기존 `keep playing ...` 텍스트 영역은 Fever 상태 설명 영역으로 겸용한다.
- 표시 우선순위는 `active mode > ready mode > 기본 스테이지 안내` 순서를 따른다.
- 모바일에서는 현재 activatable 또는 active 상태의 Fever 설명이 같은 자리에서 한 줄 또는 두 줄로 읽혀야 한다.

예시:

- `Breaker Ready: activate to crush high-HP blocks`
- `Pierce Ready: line up a clean angle for piercing hits`
- `Pulse Ready: save this for dense clusters`
- `Breaker Active: your next turn smashes durable blocks`
- `Pierce Active: your next turn pierces through the lane`
- `Pulse Active: your next turn emits splash pulses`

## Architecture Contract

### session.machine.ts

세션은 아래 진실원을 소유해야 한다.

- `feverMeter`
- `feverTier`
- `feverReadyMode`
- `activeFeverMode`

세션이 tier와 mode를 결정하고, UI는 표시만 해야 한다.

### GameShell.tsx

- 버튼 라벨과 색상은 selector 기반으로만 결정
- UI는 `mode-aware` 표시만 담당
- UI가 직접 Fever 종류를 계산하면 안 된다

### game-runtime-bridge.ts

- 런타임에는 boolean이 아니라 승인된 `FeverMode`를 전달해야 한다
- `requestFeverActivation(mode)` 형태를 우선 권장

### StageScene.ts

- active mode에 따라 공 비주얼, in-turn collision bonus, logging이 달라져야 한다

### gate-modifier-pipeline.ts / turn-resolver.ts

- resolver bonus는 mode-aware 해야 한다
- `Breaker / Pierce / Pulse`가 같은 추가 제거 로직을 공유하면 안 된다

### turn-feedback-emitter.ts

- mode별로 flash / shake / haptic / tone이 달라야 한다
- `gate-fever-combo`도 active mode에 따라 flavor가 달라져야 한다

## Implementation Priority

권장 구현 순서:

1. tier와 mode를 session selector로 확장
2. 버튼 라벨과 색상 분기
3. Breaker 구현
4. Pulse 구현
5. Pierce 구현
6. mode별 combo/feedback polish

## Acceptance Criteria

1. 게이지는 `tier 1 / tier 2 / tier 3`로 구분되어 읽힌다.
2. 각 tier는 서로 다른 button label과 tone을 가진다.
3. 발동된 Fever mode는 Scene, Resolver, Feedback 모두에 반영된다.
4. `Breaker / Pierce / Pulse`는 플레이 감각과 결과가 서로 다르다.
5. 상위 tier는 단순 상위호환이 아니라 상황 특화형으로 동작한다.

## Priority Rule

Fever 관련 구현이 기존 코드와 이 문서가 충돌하면, tiered Fever model을 우선한다.
