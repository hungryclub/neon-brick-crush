import type { Result } from 'neverthrow';

import type { IGameError } from '../../domain/errors/game-error.ts';
import { SAVE_LOAD_FAILED } from '../../domain/errors/game-error.ts';
import type {
  IPlayerSettings,
  IProgressionSnapshot
} from '../../domain/models/progression-model';
import type { IProgressionSaveEnvelope } from '../../domain/models/save-model';
import { err, ok } from '../../shared/result/result.ts';

export const PROGRESSION_SAVE_SCHEMA_VERSION = 1;

export function createDefaultPlayerSettings(): IPlayerSettings {
  return {
    isReducedMotionEnabled: false,
    isSfxEnabled: true,
    isTutorialHintsEnabled: true
  };
}

export function createInitialProgressionSnapshot(): IProgressionSnapshot {
  return {
    version: PROGRESSION_SAVE_SCHEMA_VERSION,
    playerLevel: 1,
    totalXp: 0,
    settings: createDefaultPlayerSettings(),
    unlockedWorldIdList: ['world-01'],
    stageProgressById: {
      'world-01-stage-01': {
        bestStarCount: 0,
        isCompleted: false,
        isUnlocked: true
      },
      'world-01-stage-02': {
        bestStarCount: 0,
        isCompleted: false,
        isUnlocked: false
      },
      'world-01-stage-03': {
        bestStarCount: 0,
        isCompleted: false,
        isUnlocked: false
      },
      'world-01-stage-04': {
        bestStarCount: 0,
        isCompleted: false,
        isUnlocked: false
      },
      'world-02-stage-01': {
        bestStarCount: 0,
        isCompleted: false,
        isUnlocked: false
      },
      'world-02-stage-02': {
        bestStarCount: 0,
        isCompleted: false,
        isUnlocked: false
      }
    },
    lastPlayedStageSelection: {
      worldId: 'world-01',
      stageId: 'world-01-stage-01'
    }
  };
}

export function createProgressionSaveEnvelope(
  progression: IProgressionSnapshot
): IProgressionSaveEnvelope {
  return {
    schemaVersion: PROGRESSION_SAVE_SCHEMA_VERSION,
    progression: {
      ...progression,
      version: PROGRESSION_SAVE_SCHEMA_VERSION,
      settings: {
        ...progression.settings
      }
    }
  };
}

export function parseProgressionSaveEnvelope(raw: string): Result<IProgressionSaveEnvelope, IGameError> {
  try {
    const parsed = JSON.parse(raw) as Partial<IProgressionSaveEnvelope>;

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.schemaVersion !== PROGRESSION_SAVE_SCHEMA_VERSION ||
      !parsed.progression ||
      typeof parsed.progression !== 'object'
    ) {
      return err({
        code: SAVE_LOAD_FAILED,
        message: 'Progression save payload is missing required schema metadata.'
      });
    }

    const snapshotValidation = validateProgressionSnapshot(parsed.progression as Partial<IProgressionSnapshot>);

    if (snapshotValidation.isErr()) {
      return err(snapshotValidation.error);
    }

    return ok({
      schemaVersion: parsed.schemaVersion,
      progression: snapshotValidation.value
    });
  } catch {
    return err({
      code: SAVE_LOAD_FAILED,
      message: 'Progression save payload could not be parsed.'
    });
  }
}

function validateProgressionSnapshot(
  snapshot: Partial<IProgressionSnapshot>
): Result<IProgressionSnapshot, IGameError> {
  if (
    typeof snapshot.version !== 'number' ||
    typeof snapshot.playerLevel !== 'number' ||
    typeof snapshot.totalXp !== 'number' ||
    !Array.isArray(snapshot.unlockedWorldIdList) ||
    typeof snapshot.stageProgressById !== 'object' ||
    snapshot.stageProgressById === null ||
    !snapshot.settings ||
    typeof snapshot.settings !== 'object'
  ) {
    return err({
      code: SAVE_LOAD_FAILED,
      message: 'Progression snapshot shape is invalid.'
    });
  }

  if (
    typeof snapshot.settings.isReducedMotionEnabled !== 'boolean' ||
    typeof snapshot.settings.isSfxEnabled !== 'boolean' ||
    typeof snapshot.settings.isTutorialHintsEnabled !== 'boolean'
  ) {
    return err({
      code: SAVE_LOAD_FAILED,
      message: 'Progression settings shape is invalid.'
    });
  }

  return ok({
    version: snapshot.version,
    playerLevel: snapshot.playerLevel,
    totalXp: snapshot.totalXp,
    settings: {
      isReducedMotionEnabled: snapshot.settings.isReducedMotionEnabled,
      isSfxEnabled: snapshot.settings.isSfxEnabled,
      isTutorialHintsEnabled: snapshot.settings.isTutorialHintsEnabled
    },
    unlockedWorldIdList: [...snapshot.unlockedWorldIdList],
    stageProgressById: structuredClone(snapshot.stageProgressById),
    lastPlayedStageSelection: snapshot.lastPlayedStageSelection ?? null
  });
}
