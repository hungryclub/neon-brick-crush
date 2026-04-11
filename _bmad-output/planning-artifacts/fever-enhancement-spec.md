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
  tieredSpec: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/tiered-fever-system-spec.md'
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

추가 규칙:

- Fever가 여러 종류로 확장될 경우, mode/tier 정책은 `tiered-fever-system-spec.md`를 우선 기준으로 삼는다.
- 모바일 플레이 화면에서는 기존 stage prompt 위치를 Fever 상태 안내와 공유해야 하며, `active > ready > base prompt` 우선순위를 따른다.
- 밸런스 기본값은 `block +20`, `gate +8`, tier threshold `35 / 70 / 100`을 기준으로 잡는다.

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

## Implementation Status

### Applied After Spec Link

`[Execution] Dave: Fever 강화 설계 문서 연결` 이후, 이 문서의 권장 방향인 `Option B: One Turn Overdrive` 기준으로 실제 코드 반영을 진행했다.

적용 커밋:

- `7bafbff` `[Execution] Dave: Fever 오버드라이브 구현과 테스트 보강`

### Implemented Scope

#### 1. Scene Overdrive Feedback

`StageScene.ts` 에 Fever 활성 직후 공 비주얼 상태가 즉시 바뀌도록 반영했다.

- Fever active 시 공 fill/stroke/color를 강화
- Fever active 시 공 scale을 소폭 올려 일반 턴과 구분
- Fever 시작, 턴 종료, reset 시점마다 비주얼 상태를 동기화

현재 구현은 충돌 반경 자체를 바꾸지 않고, 플레이어가 즉시 인지할 수 있는 시각 상태만 강화한다.

#### 2. In-Turn Collision Bonus

`fever-overdrive.ts` 를 추가해 Fever 턴의 첫 `3회 충돌`에 대해 추가 파괴 보너스를 분리된 규칙으로 구현했다.

- 기본 hit로 HP가 남는 블록도 Fever bonus hit 구간에서는 즉시 제거
- bonus hit 사용 횟수는 Scene이 관리
- turn 중 `fever_collision_bonus_hits` profiler/logging 카운터를 남김

이로써 Fever는 더 이상 턴 종료 시점의 작은 보정만이 아니라, 실제 플레이 중에도 체감되는 강화 턴이 되었다.

#### 3. Resolver Bonus Upgrade

`gate-modifier-pipeline.ts` 의 Fever modifier를 단일 블록 제거에서 다중 제거로 확장했다.

- Fever 단독: 상위 위험 블록 `2개` 추가 제거
- Gate + Fever combo: 상위 위험 블록 `3개`까지 추가 제거
- feedback event는 `affectedCellIds[]` 와 `bonusHits` 를 함께 기록

즉, resolver bonus는 이제 “블록 1개 추가 제거”가 아니라 `다중 타깃 overdrive clear`로 동작한다.

#### 4. Gate + Fever Combo Branch Reinforcement

`gate-fever-combo` 는 별도 강화 branch로 유지하고, 일반 Fever보다 더 강한 결과를 내도록 보강했다.

- Gate 단독 branch와 구분된 combo branch 유지
- Fever bonus hit 수 확대
- feedback emitter에서 combo 전용 flash/shake/haptic/sfx 흐름 강화

이 항목은 본 문서의 `Gate Combo Rule` 을 직접 코드에 반영한 부분이다.

#### 5. Feedback Plan Reinforcement

`turn-feedback-emitter.ts` 는 Fever-only 와 Gate+Fever combo 를 더 강하게 읽히는 playback command로 확장했다.

- Fever-only: flash + shake + haptic + sfx
- Gate+Fever combo: 기존 combo burst에 추가 flash를 더해 escalation 표현

현재는 lightweight playback 구조를 유지하면서도, 일반 턴과 Fever 턴의 차이를 더 분명하게 전달한다.

### Verification

아래 테스트를 추가/보강해 Fever 관련 동작을 고정했다.

- `app/tests/unit/fever-overdrive.test.mjs`
  - 첫 3회 충돌 보너스 즉시 제거 확인
  - bonus hit limit 이후 보너스 중단 확인
- `app/tests/unit/turn-resolver.test.mjs`
  - Fever-only 다중 제거 확인
  - Gate+Fever combo branch와 다중 제거 확인
- `app/tests/unit/turn-feedback-emitter.test.mjs`
  - Fever-only overdrive feedback plan 확인
  - Gate+Fever combo escalation command 확인

검증 실행:

- `npm run typecheck`
- `npm run test`
- `npm run build`

모두 통과한 상태에서 반영되었다.

### Current State Summary

현재 Fever는 더 이상 “정산 시 블록 1개 추가 제거” 수준의 임시 구현이 아니다.

현재 코드 기준의 Fever는 아래 의미를 가진다.

- 플레이어가 수동으로 발동하는 `다음 1턴 오버드라이브`
- Scene에서 즉시 보이는 비주얼 변화
- turn 중 첫 3회 충돌 추가 파괴 보너스
- turn 종료 정산 시 다중 블록 추가 제거
- Gate와 결합 시 별도 강화 branch

즉, 이 문서의 권장 방향은 설계 단계에만 머물지 않고 현재 구현의 기준선으로 반영된 상태다.
