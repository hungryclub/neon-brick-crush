---
title: 'Fever Enhancement Specification'
project: 'neo-brick-crush'
date: '2026-04-11'
author: 'Dhlee'
version: '1.0'
status: 'active'
relatedDocuments:
  gdd: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/gdd.md'
  architecture: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/game-architecture.md'
  story22: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/2-2-fever-meter-and-manual-activation.md'
  story23: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/implementation-artifacts/2-3-gate-fever-combo-feedback.md'
---

# Fever Enhancement Specification

## Problem

현재 Fever는 플레이어 입장에서 체감이 매우 약하다.

- 버튼을 눌러도 즉시 화면에서 큰 변화가 보이지 않는다.
- 현재 구현 효과는 사실상 `턴 정산 시 블록 1개 추가 제거`에 가깝다.
- 공의 움직임, 충돌 감각, 연출 강도 모두 일반 턴과 크게 다르지 않다.
- 결과적으로 `Build Fever -> Activate Fever -> Fever Active` 흐름이 있어도 "왜 눌러야 하는지"가 충분히 전달되지 않는다.

## Design Goal

Fever는 다음 조건을 만족해야 한다.

1. 버튼을 누른 보람이 즉시 느껴져야 한다.
2. 일반 턴과 Fever 턴의 차이가 시각적으로 분명해야 한다.
3. 결과 수치도 실제로 커져야 한다.
4. Gate와 조합될 때 시그니처 순간이 생겨야 한다.
5. 구현은 현재 `XState -> RuntimeBridge -> StageScene -> Resolver` 경계를 유지해야 한다.

## Option Summary

### Option A: Minimum Change

현재 구조를 크게 바꾸지 않고 결과만 키우는 방식.

- Fever 턴에 블록 1개가 아니라 `우선순위 3개` 제거
- Gate와 같이 발동하면 추가 1개 제거
- Fever 전용 feedback 문구와 SFX만 추가

장점:
- 구현 비용이 가장 낮다
- resolver 중심 구조를 유지하기 쉽다

단점:
- 플레이 중 공의 손맛은 여전히 약하다
- 버튼을 눌렀을 때의 즉시 체감이 제한적이다

### Option B: Recommended - One Turn Overdrive

가장 추천하는 방식. `다음 1턴을 강하게 만드는 오버드라이브`로 정의한다.

- Fever 발동 시 다음 턴에 공 오라 활성화
- Fever 턴 동안 첫 3회 충돌에 추가 제거 또는 관통 보너스
- 턴 정산 시 상위 위험 블록 추가 제거
- Gate와 겹치면 `gate-fever-combo`를 확장 적용
- HUD와 피드백에서 Fever 상태가 확실히 드러남

장점:
- 플레이 중에도 차이가 보인다
- 결과도 커진다
- 현재 구조와 가장 잘 맞는다

단점:
- Scene과 resolver 양쪽에 조정이 필요하다

### Option C: Spectacle Mode

아주 강한 연출형. 작은 보스킬 같은 순간을 만든다.

- Fever 턴 동안 공 크기 증가
- 관통 또는 폭발 충돌
- 여러 블록 연쇄 제거
- 전용 배경 톤, 카메라, 진동, SFX

장점:
- 가장 체감이 강하다

단점:
- 현재 게임 밸런스를 크게 흔들 수 있다
- 구현/QA 비용이 높다

## Selected Direction

이 문서는 `Option B: One Turn Overdrive`를 기본 구현 방향으로 채택한다.

이유:

- 현재 구조를 유지하면서도 체감이 가장 크게 좋아진다.
- `수동 발동 -> 다음 턴 강화 -> 큰 결과`라는 플레이어 기대와 잘 맞는다.
- Gate와의 조합을 선명하게 만들 수 있다.

## Recommended Behavior

### Player-Facing Summary

- 게이지가 100%가 되면 `Activate Fever` 버튼이 활성화된다.
- 플레이어가 누르면 `다음 1턴`이 Fever 턴이 된다.
- Fever 턴에는 공이 전용 오라를 갖고, 일반 턴보다 더 강한 파괴/보너스를 만든다.
- 턴 종료 후 Fever는 꺼지고, 다시 게이지를 채워야 한다.

### Runtime Effects

Fever 턴에는 아래 3층 효과가 동시에 적용된다.

#### 1. Immediate Visual State

- 공 오라 색상/광도 증가
- 발사 직후 짧은 trail 강조
- HUD의 Fever 상태를 `ready`가 아니라 `active`로 강하게 표시

#### 2. In-Turn Gameplay Bonus

- 첫 `3회 충돌` 동안 추가 파괴 보너스
- 구현 방식 선택지:
  - 맞은 블록 즉시 파괴
  - 맞은 블록과 인접 블록 추가 피해
  - 1회 제한 관통

기본 권장안:
- 첫 3회 충돌에서 맞은 블록을 즉시 파괴

#### 3. End-of-Turn Resolver Bonus

- 턴 정산 시 `가장 위험한 블록 1~2개`를 추가 제거
- Gate와 같이 발동했으면 추가 제거 수를 1 늘린다

## Gate Combo Rule

Gate와 Fever가 같은 턴에 모두 적용되면 `gate-fever-combo` branch를 더 강하게 만든다.

권장 규칙:

- Gate 단독: top-row 위험 블록 1개 제거
- Fever 단독: collision bonus + resolver bonus
- Gate + Fever 동시:
  - collision bonus 유지
  - resolver bonus +1
  - combo 전용 feedback command 발행

## UI / UX Rules

### Fever Button States

- `Build Fever`
  게이지가 부족한 상태
- `Activate Fever`
  지금 누르면 다음 턴에 Fever 적용
- `Fever Active`
  발동 승인 후 아직 턴 종료 전

### UX Requirements

- `Activate Fever`를 누른 직후 즉시 공/버튼/HUD에서 시각적 변화가 보여야 한다.
- Fever 턴 동안은 플레이어가 "지금 강화 턴"이라고 바로 인지할 수 있어야 한다.
- 턴 종료 후 요약 피드백이 필요하다.
  - 예: `FEVER HIT x3`
  - 예: `OVERDRIVE CLEAR`

## Architecture Impact

### session.machine.ts

- 현행 `isFeverActive: boolean`은 유지 가능
- 필요 시 `feverChargesRemaining` 또는 `feverTurnMode` 확장 가능
- 최소 구현에서는 boolean 유지 후 Runtime이 `feverCollisionBonusCount`를 관리해도 된다

### GameShell.tsx

- 현재 버튼 상태 라벨은 유지 가능
- Fever active 상태 스타일을 더 강하게 표시

### game-runtime-bridge.ts

- 현재 `requestFeverActivation()`는 유지
- 필요 시 turn summary에 아래 필드 추가 고려
  - `feverBonusHits`
  - `feverDestroyedExtraBlocks`

### StageScene.ts

- Fever 오라, trail, collision bonus 카운트 관리
- Fever 턴 시작/종료 시 런타임 비주얼 상태 업데이트

### turn-resolver.ts / gate-modifier-pipeline.ts

- 현재 `applyFeverModifiers()`는 블록 1개 제거 수준
- 권장 변경:
  - `extraDestroyedCells`
  - `feverBonusStrength`
  - `gate-fever-combo` 보너스 확장

### turn-feedback-emitter.ts

- Fever 발동 전용 command
- Fever collision bonus command
- Gate+Fever combo command

## Acceptance Criteria

1. 플레이어가 Fever를 발동한 턴은 일반 턴과 즉시 구분된다.
2. Fever 턴은 적어도 1회 이상 명확한 추가 파괴 보너스를 제공한다.
3. Gate와 조합될 경우 일반 Fever보다 더 강한 결과를 낸다.
4. 턴 종료 후 Fever 결과가 HUD 또는 피드백으로 읽힌다.
5. Fever를 쓴 보람이 "블록 1개 사라진 것 같다" 수준을 넘어선다.

## Implementation Recommendation

새로 구현할 때는 아래 순서로 진행한다.

1. `StageScene`에 Fever collision bonus 추가
2. `turn-resolver`의 Fever bonus를 1개 제거에서 다중 보너스로 확장
3. `turn-feedback-emitter`에 Fever 전용 연출 추가
4. `session.machine` 테스트와 `turn-resolver` 테스트를 같이 갱신

## Priority Rule

Fever 관련 구현이 현재 코드와 이 문서가 충돌하면, 체감 강화 목표가 더 잘 달성되는 쪽으로 구현을 수정한다. 현재 구현의 "보드 1개 추가 제거"는 최종 목표가 아니라 임시 단계로 본다.
