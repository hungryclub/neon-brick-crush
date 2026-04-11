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
- 블록 파괴 charge: `+15`
- gate trigger charge: `+5`

## Pierce Final Behavior

- 첫 2회 bonus 충돌에서 `pass-through`가 발생해야 한다.
- 공은 블록에 맞고도 뒤쪽으로 이어져야 한다.
- 관통 순간 cyan trail이 남아야 한다.
- 플레이어는 "맞고 지나갔다"가 아니라 "뚫고 지나갔다"라고 읽어야 한다.

## Pulse Final Behavior

- 중심 블록은 기존보다 강하게 타격한다.
- 주변 splash는 orthogonal에 한정하지 않고 더 넓게 읽혀야 한다.
- 파괴 발생 시 chain mini pulse를 추가한다.
- affected block 영역은 rectangle flash 또는 ring으로 시각화한다.
- `Pulse`는 가장 드라마틱한 Fever여야 한다.

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
  - `Pierce` trail is visible
  - `Pulse` area flash is visible
  - bottom spacing no longer feels cramped
  - Fever rail fills toward `130`
