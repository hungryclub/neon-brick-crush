---
title: 'Fever Final Pass Implementation Spec'
project: 'neo-brick-crush'
date: '2026-04-11'
author: 'Dhlee'
version: '1.0'
status: 'active'
relatedDocuments:
  tieredSpec: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/tiered-fever-system-spec.md'
  feverEnhancement: '/Users/dhlee/Desktop/projects/ai-orchestrator/bmad-projects/neo-brick-crush/_bmad-output/planning-artifacts/fever-enhancement-spec.md'
---

# Fever Final Pass Implementation Spec

## Goal

최종 Fever UX/Gameplay 패스의 목적은 아래 다섯 가지를 동시에 만족하는 것이다.

1. `Pierce`가 실제 관통처럼 보인다.
2. `Pulse`의 폭발 구역이 사용자에게 보인다.
3. 모바일 하단의 공 / 안내 문구 / Fever rail / 버튼 사이 간격이 답답하지 않다.
4. 기존 파란 선은 Fever 게이지 rail로 재정의된다.
5. `Pulse`는 드물고 특별한 최종 티어로 유지된다.

## Balance Lock

최종안은 추천안 A를 기준으로 고정한다.

- `Breaker Ready`: `45`
- `Pierce Ready`: `85`
- `Pulse Ready`: `130`
- direct block hit charge: `+15`
- gate trigger charge: `+0`

## Pierce Final Behavior

- 첫 2회 bonus 충돌에서만 `pass-through`가 발생해야 한다.
- 관통은 "블록을 부수고 그대로 진행"을 의미한다.
- 관통 순간 공은 반사되면 안 되며, 기존 진행 방향을 유지해야 한다.
- 턴 종료 규칙은 일반 샷과 동일하게 유지되어야 하며, 좌우 수평 무한 이동 상태에 빠지면 안 된다.
- 관통 순간 cyan trail이 남아야 한다.
- 플레이어는 "맞고 지나갔다"가 아니라 "뚫고 지나갔다"라고 읽어야 한다.

## Pulse Final Behavior

- Pulse는 `이동 중 proximity 파괴`가 아니라 `충돌 순간 폭발`로 정의한다.
- 공 주위 원형 표시는 preview 전용이며, 실제 파괴 판정은 충돌 순간에만 발생해야 한다.
- 중심 블록은 기존보다 강하게 타격한다.
- 실제 splash 반경은 현재 preview 대비 `3배` 크기로 확장한다.
- preview 반경과 actual splash 반경은 동일한 기준을 사용해야 한다.
- preview 또는 시각 효과와 무관한 블록이 부서지면 안 된다.
- affected block 영역은 rectangle flash 또는 ring으로 시각화한다.
- `Pulse`는 가장 드라마틱한 Fever여야 한다.
- preview 포함 판정은 블록 중심점이 아니라 `원형 영역과 블록 사각형의 실제 교차` 기준으로 계산한다.
- preview 반경 안에 포함된 블록은 HP와 관계없이 한 번에 파괴되어야 한다.

## Breaker Final Behavior

- Breaker는 `직접 충돌한 블록`만 강화 대상으로 삼는다.
- 직접 부딪히지 않은 블록은 Breaker 때문에 파괴되면 안 된다.
- Breaker 효과는 Scene 충돌 결과에 한정되며, 턴 종료 후 임의 후처리 파괴를 만들지 않는다.

## Fever Charge Contract

- Fever 게이지는 `직접 블록 충돌 수`만 기준으로 오른다.
- 게이트 통과, resolver 보너스 파괴, splash 파괴만으로는 게이지가 오르면 안 된다.
- 플레이어는 `실제로 공으로 맞혔다`는 감각과 Fever 충전을 연결해서 읽을 수 있어야 한다.

## Mobile Bottom Lane Contract

- `LOSS LINE` 위치는 유지한다.
- launcher ball, prompt text, Fever rail, Fever button은 별도 하단 레이아웃으로 정렬한다.
- 각 요소 사이 간격은 최소 `4px` 이상 유지한다.
- 모바일에서는 stage prompt 대신 Fever-aware prompt를 우선 노출한다.

## Fever Rail Contract

- 기존 파란 선은 mobile Fever rail로 대체한다.
- rail background는 어두운 cyan tone을 유지한다.
- fill은 현재 Fever tier tone을 따른다.
  - `Breaker`: amber
  - `Pierce`: cyan
  - `Pulse`: magenta
- active 상태에서는 glow가 더 강해져야 한다.

## Implementation Targets

- `app/game/systems/fever-overdrive.ts`
  tier/charge/max constants, prompt text, collision bonus behavior
- `app/state/machines/session.machine.ts`
  new charge values and max meter
- `app/game/scenes/StageScene.ts`
  mobile bottom spacing, pierce trail, pulse area highlight
- `app/ui/screens/GameShell.tsx`
  mobile fever prompt + rail overlay
- `app/ui/components/HudPanel.tsx`
  new meter max-based percentage
- `app/ui/components/CompactHudStrip.tsx`
  new meter max-based percentage

## Validation

- Unit tests must verify tier thresholds and collision helper behavior.
- Scene-affecting changes should preserve existing typecheck/build.
- Manual preview check should confirm:
  - `Pierce` trail is visible and the ball does not enter horizontal lock
  - `Pulse` preview ring and actual hit area match
  - `Breaker` never destroys untouched blocks
  - bottom spacing no longer feels cramped
  - Fever rail fills toward `130`
