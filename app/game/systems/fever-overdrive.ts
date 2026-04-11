import type { IStageBoardCell } from '../entities/stage-board';

export type TFeverMode = 'breaker' | 'pierce' | 'pulse';
export type TFeverTier = 0 | 1 | 2 | 3;
export type TFeverTone = 'neutral' | 'breaker' | 'pierce' | 'pulse';

export const FEVER_COLLISION_BONUS_HIT_LIMIT = {
  breaker: 3,
  pierce: 2,
  pulse: 3
} as const;

export function resolveFeverTier(feverMeter: number): TFeverTier {
  if (feverMeter >= 100) {
    return 3;
  }

  if (feverMeter >= 70) {
    return 2;
  }

  if (feverMeter >= 35) {
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

  return `${Math.round(feverMeter)}%`;
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
    return 'Pierce Active: your next turn pierces through the lane';
  }

  if (activeMode === 'pulse') {
    return 'Pulse Active: your next turn emits splash pulses';
  }

  if (readyMode === 'breaker') {
    return 'Breaker Ready: activate to crush high-HP blocks';
  }

  if (readyMode === 'pierce') {
    return 'Pierce Ready: line up a clean angle for piercing hits';
  }

  if (readyMode === 'pulse') {
    return 'Pulse Ready: save this for dense clusters';
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
    const shouldSpendBonus = hasBonusCapacity && currentHp > 1;

    return {
      bonusApplied: shouldSpendBonus,
      hitsUsed: shouldSpendBonus ? hitsUsed + 1 : hitsUsed,
      nextHp: shouldSpendBonus ? Math.max(currentHp - 2, 0) : nextHp,
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
  const splashTargetIds = resolvePulseSplashTargetIds(board, targetCell.id);

  return {
    bonusApplied: true,
    hitsUsed: hitsUsed + 1,
    nextHp: pulseNextHp,
    pierceThrough: false,
    splashTargetIds,
    chainPulseTargetIds:
      pulseNextHp <= 0 ? resolvePulseChainTargetIds(board, targetCell.id, splashTargetIds) : []
  };
}

function resolvePulseSplashTargetIds(board: IStageBoardCell[], targetCellId: string) {
  const targetCell = board.find((cell) => cell.id === targetCellId);

  if (!targetCell) {
    return [];
  }

  return board
    .filter((cell) => cell.id !== targetCell.id)
    .filter((cell) => {
      const rowDistance = Math.abs(cell.row - targetCell.row);
      const colDistance = Math.abs(cell.col - targetCell.col);

      return rowDistance <= 1 && colDistance <= 1;
    })
    .sort((left, right) => {
      const leftDistance = resolvePulseDistance(left, targetCell);
      const rightDistance = resolvePulseDistance(right, targetCell);

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      if (right.hp !== left.hp) {
        return right.hp - left.hp;
      }

      if (right.row !== left.row) {
        return right.row - left.row;
      }

      return left.col - right.col;
    })
    .slice(0, 4)
    .map((cell) => cell.id);
}

function resolvePulseChainTargetIds(
  board: IStageBoardCell[],
  targetCellId: string,
  splashTargetIds: string[]
) {
  const excludedIds = new Set([targetCellId, ...splashTargetIds]);
  const originIds = [targetCellId, ...splashTargetIds];

  return board
    .filter((cell) => !excludedIds.has(cell.id))
    .map((cell) => ({
      cell,
      distance: Math.min(
        ...originIds.map((originId) => {
          const originCell = board.find((candidate) => candidate.id === originId);

          if (!originCell) {
            return Number.POSITIVE_INFINITY;
          }

          return resolvePulseDistance(cell, originCell);
        })
      )
    }))
    .filter((entry) => Number.isFinite(entry.distance) && entry.distance <= 2)
    .sort((left, right) => {
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }

      if (right.cell.hp !== left.cell.hp) {
        return right.cell.hp - left.cell.hp;
      }

      if (right.cell.row !== left.cell.row) {
        return right.cell.row - left.cell.row;
      }

      return left.cell.col - right.cell.col;
    })
    .slice(0, 2)
    .map((entry) => entry.cell.id);
}

function resolvePulseDistance(cell: IStageBoardCell, targetCell: IStageBoardCell) {
  return Math.max(Math.abs(cell.row - targetCell.row), Math.abs(cell.col - targetCell.col));
}
