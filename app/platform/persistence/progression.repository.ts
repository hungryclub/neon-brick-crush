import type {
  IProgressionSnapshot,
  IStageCompletionRecord
} from '../../domain/models/progression-model';
import type { IStageSelection } from '../../domain/models/stage-model';
import {
  loadStageRuntimeConfig,
  loadWorldContent
} from '../../assets/loaders/stage-config.loader.ts';

let progressionSnapshot: IProgressionSnapshot = createInitialProgressionSnapshot();

export function resetProgressionSnapshotForTests() {
  progressionSnapshot = createInitialProgressionSnapshot();
}

function createInitialProgressionSnapshot(): IProgressionSnapshot {
  return {
    version: 3,
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

export interface IProgressionRepository {
  load: () => Promise<IProgressionSnapshot>;
  saveLastPlayedStageSelection: (
    selection: IStageSelection | null
  ) => Promise<IProgressionSnapshot>;
  saveStageCompletion: (
    record: IStageCompletionRecord | null
  ) => Promise<IProgressionSnapshot>;
}

export default function createProgressionRepository(): IProgressionRepository {
  return {
    async load(): Promise<IProgressionSnapshot> {
      return structuredClone(progressionSnapshot);
    },
    async saveLastPlayedStageSelection(selection) {
      progressionSnapshot = {
        ...progressionSnapshot,
        lastPlayedStageSelection: selection
      };

      return structuredClone(progressionSnapshot);
    },
    async saveStageCompletion(record) {
      if (!record) {
        return structuredClone(progressionSnapshot);
      }

      const stageRuntimeConfigResult = loadStageRuntimeConfig(record);
      const currentStageState = progressionSnapshot.stageProgressById[record.stageId] ?? {
        bestStarCount: 0,
        isCompleted: false,
        isUnlocked: false
      };
      let nextSnapshot: IProgressionSnapshot = {
        ...progressionSnapshot,
        lastPlayedStageSelection: {
          worldId: record.worldId,
          stageId: record.stageId
        },
        stageProgressById: {
          ...progressionSnapshot.stageProgressById,
          [record.stageId]: {
            bestStarCount: Math.max(currentStageState.bestStarCount, record.starCount),
            isCompleted: true,
            isUnlocked: true
          }
        }
      };
      const unlockedStageSelections = resolveUnlockedStageSelections(record, stageRuntimeConfigResult);

      if (unlockedStageSelections.length > 0) {
        nextSnapshot.stageProgressById = {
          ...nextSnapshot.stageProgressById,
          ...Object.fromEntries(
            unlockedStageSelections.map((selection) => [
              selection.stageId,
              {
                ...(nextSnapshot.stageProgressById[selection.stageId] ?? createEmptyStageProgress()),
                isUnlocked: true
              }
            ])
          )
        };
      }

      if (stageRuntimeConfigResult.isOk()) {
        const nextWorldId = stageRuntimeConfigResult.value.unlockProfile.nextWorldIdToUnlock;

        if (nextWorldId) {
          nextSnapshot = unlockWorldEntry(nextSnapshot, nextWorldId);
        }
      }

      progressionSnapshot = nextSnapshot;

      return structuredClone(progressionSnapshot);
    }
  };
}

function resolveUnlockedStageSelections(
  selection: IStageSelection,
  stageRuntimeConfigResult: ReturnType<typeof loadStageRuntimeConfig>
) {
  if (stageRuntimeConfigResult.isOk()) {
    const configuredStageIds = stageRuntimeConfigResult.value.unlockProfile.stageIdsToUnlockOnClear;

    if (configuredStageIds.length > 0) {
      return configuredStageIds.map((stageId) => ({
        worldId: selection.worldId,
        stageId
      }));
    }

    if (stageRuntimeConfigResult.value.stageKind === 'challenge') {
      return [];
    }
  }

  const worldResult = loadWorldContent(selection.worldId);

  if (worldResult.isErr()) {
    return [];
  }

  const currentIndex = worldResult.value.stageIds.indexOf(selection.stageId);

  if (currentIndex === -1 || currentIndex >= worldResult.value.stageIds.length - 1) {
    return [];
  }

  return [
    {
      worldId: selection.worldId,
      stageId: worldResult.value.stageIds[currentIndex + 1]
    }
  ];
}

function unlockWorldEntry(snapshot: IProgressionSnapshot, worldId: string) {
  const worldResult = loadWorldContent(worldId);

  if (worldResult.isErr()) {
    return snapshot;
  }

  const nextWorldUnlockedIds = snapshot.unlockedWorldIdList.includes(worldId)
    ? snapshot.unlockedWorldIdList
    : [...snapshot.unlockedWorldIdList, worldId];
  const firstStageId = worldResult.value.stageIds[0];

  if (!firstStageId) {
    return {
      ...snapshot,
      unlockedWorldIdList: nextWorldUnlockedIds
    };
  }

  return {
    ...snapshot,
    unlockedWorldIdList: nextWorldUnlockedIds,
    stageProgressById: {
      ...snapshot.stageProgressById,
      [firstStageId]: {
        ...(snapshot.stageProgressById[firstStageId] ?? createEmptyStageProgress()),
        isUnlocked: true
      }
    }
  };
}

function createEmptyStageProgress() {
  return {
    bestStarCount: 0,
    isCompleted: false,
    isUnlocked: false
  };
}
