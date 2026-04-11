import type { IStageBoardCell } from '../entities/stage-board';

export type TFeverMode = 'breaker' | 'pierce' | 'pulse';
export type TFeverTier = 0 | 1 | 2 | 3;
export type TFeverTone = 'neutral' | 'breaker' | 'pierce' | 'pulse';

export const FEVER_METER_MAX = 130;
export const FEVER_TIER_BREAKER_THRESHOLD = 45;
export const FEVER_TIER_PIERCE_THRESHOLD = 85;
export const FEVER_TIER_PULSE_THRESHOLD = 130;

export const FEVER_COLLISION_BONUS_HIT_LIMIT = {
  breaker: 3,
  pierce: 2,
  pulse: 3
} as const;

export function resolveFeverTier(feverMeter: number): TFeverTier {
  if (feverMeter >= FEVER_TIER_PULSE_THRESHOLD) {
    return 3;
  }

  if (feverMeter >= FEVER_TIER_PIERCE_THRESHOLD) {
    return 2;
  }

  if (feverMeter >= FEVER_TIER_BREAKER_THRESHOLD) {
    return 1;
  }

  return 0;
}

export function resolveReadyFeverMode(feverMeter: number): TFeverMode | null {
  const tier = resolveFeverTier(feverMeter);

  if (tier === 3) {
    return 'pulse';
  }

  if (tier === 2) {
    return 'pierce';
  }

  if (tier === 1) {
    return 'breaker';
  }

  return null;
}

export function resolveFeverButtonLabel({
  activeMode,
  readyMode
}: {
  activeMode: TFeverMode | null;
  readyMode: TFeverMode | null;
}) {
  if (activeMode === 'breaker') {
    return 'Breaker Active';
  }

  if (activeMode === 'pierce') {
    return 'Pierce Active';
  }

  if (activeMode === 'pulse') {
    return 'Pulse Active';
  }

  if (readyMode === 'breaker') {
    return 'Activate Breaker';
  }

  if (readyMode === 'pierce') {
    return 'Activate Pierce';
  }

  if (readyMode === 'pulse') {
    return 'Activate Pulse';
  }

  return 'Build Fever';
}

export function resolveFeverTone({
  activeMode,
  readyMode
}: {
  activeMode: TFeverMode | null;
  readyMode: TFeverMode | null;
}): TFeverTone {
  return activeMode ?? readyMode ?? 'neutral';
}

export function resolveFeverHudValue({
  activeMode,
  feverMeter,
  readyMode
}: {
  activeMode: TFeverMode | null;
  feverMeter: number;
  readyMode: TFeverMode | null;
}) {
  if (activeMode === 'breaker') {
    return 'BRK';
  }

  if (activeMode === 'pierce') {
    return 'PRC';
  }

  if (activeMode === 'pulse') {
    return 'PLS';
  }

  if (readyMode === 'breaker') {
    return 'B1';
  }

  if (readyMode === 'pierce') {
    return 'P2';
  }

  if (readyMode === 'pulse') {
    return 'P3';
  }

  return `${Math.round((feverMeter / FEVER_METER_MAX) * 100)}%`;
}

export function resolveFeverStatusPrompt({
  activeMode,
  readyMode
}: {
  activeMode: TFeverMode | null;
  readyMode: TFeverMode | null;
}) {
  if (activeMode === 'breaker') {
    return 'Breaker Active: your next turn smashes durable blocks';
  }

  if (activeMode === 'pierce') {
    return 'Pierce Active: your next turn cuts through the lane';
  }

  if (activeMode === 'pulse') {
    return 'Pulse Active: your next turn detonates a block cluster';
  }

  if (readyMode === 'breaker') {
    return 'Breaker Ready: activate to crush high-HP blocks';
  }

  if (readyMode === 'pierce') {
    return 'Pierce Ready: line up a clean angle for a piercing run';
  }

  if (readyMode === 'pulse') {
    return 'Pulse Ready: save this for the densest cluster';
  }

  return null;
}

export function resolveFeverCollisionBonus({
  activeFeverMode,
  board,
  currentHp,
  hitsUsed,
  targetCell
}: {
  activeFeverMode: TFeverMode | null;
  board: IStageBoardCell[];
  currentHp: number;
  hitsUsed: number;
  targetCell: IStageBoardCell;
}) {
  if (!activeFeverMode) {
    return {
      bonusApplied: false,
      hitsUsed,
      nextHp: currentHp - 1,
      pierceThrough: false,
      splashTargetIds: [],
      chainPulseTargetIds: []
    };
  }

  const nextHp = currentHp - 1;
  const hitLimit = FEVER_COLLISION_BONUS_HIT_LIMIT[activeFeverMode];
  const hasBonusCapacity = hitsUsed < hitLimit;

  if (activeFeverMode === 'breaker') {
    const shouldSpendBonus = hasBonusCapacity && nextHp > 0;

    return {
      bonusApplied: shouldSpendBonus,
      hitsUsed: shouldSpendBonus ? hitsUsed + 1 : hitsUsed,
      nextHp: shouldSpendBonus ? 0 : nextHp,
      pierceThrough: false,
      splashTargetIds: [],
      chainPulseTargetIds: []
    };
  }

  if (activeFeverMode === 'pierce') {
    const shouldSpendBonus = hasBonusCapacity;

    return {
      bonusApplied: shouldSpendBonus,
      hitsUsed: shouldSpendBonus ? hitsUsed + 1 : hitsUsed,
      nextHp: shouldSpendBonus ? 0 : nextHp,
      pierceThrough: shouldSpendBonus,
      splashTargetIds: [],
      chainPulseTargetIds: []
    };
  }

  if (!hasBonusCapacity) {
    return {
      bonusApplied: false,
      hitsUsed,
      nextHp,
      pierceThrough: false,
      splashTargetIds: [],
      chainPulseTargetIds: []
    };
  }

  const pulseNextHp = Math.max(currentHp - 2, 0);

  return {
    bonusApplied: true,
    hitsUsed: hitsUsed + 1,
    nextHp: pulseNextHp,
    pierceThrough: false,
    splashTargetIds: [],
    chainPulseTargetIds: []
  };
}
