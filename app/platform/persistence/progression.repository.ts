import type { Result } from 'neverthrow';

import type {
  IPlayerSettings,
  IProgressionSnapshot,
  IStageCompletionRecord
} from '../../domain/models/progression-model';
import type { IStageSelection } from '../../domain/models/stage-model';
import type { IGameError } from '../../domain/errors/game-error.ts';
import {
  loadStageRuntimeConfig,
  loadWorldContent
} from '../../assets/loaders/stage-config.loader.ts';
import createProgressionStorageDriver, {
  resetInMemoryProgressionStorageForTests,
  type IProgressionStorageDriver
} from './indexeddb/progression-storage.ts';
import {
  createDefaultPlayerSettings,
  createInitialProgressionSnapshot,
  createProgressionSaveEnvelope,
  parseProgressionSaveEnvelope
} from './save-recovery.ts';
import { err, ok } from '../../shared/result/result.ts';

const XP_PER_CLEAR = 100;
const XP_PER_STAR = 25;
const XP_PER_LEVEL = 100;

let progressionSnapshot: IProgressionSnapshot = createInitialProgressionSnapshot();

export function resetProgressionSnapshotForTests() {
  progressionSnapshot = createInitialProgressionSnapshot();
  resetInMemoryProgressionStorageForTests();
}

export interface IProgressionRepository {
  load: () => Promise<Result<IProgressionSnapshot, IGameError>>;
  saveLastPlayedStageSelection: (
    selection: IStageSelection | null
  ) => Promise<Result<IProgressionSnapshot, IGameError>>;
  saveStageCompletion: (
    record: IStageCompletionRecord | null
  ) => Promise<Result<IProgressionSnapshot, IGameError>>;
  saveSettings: (
    settingsPatch: Partial<IPlayerSettings>
  ) => Promise<Result<IProgressionSnapshot, IGameError>>;
}

export default function createProgressionRepository({
  storageDriver = createProgressionStorageDriver()
}: {
  storageDriver?: IProgressionStorageDriver;
} = {}): IProgressionRepository {
  return {
    async load() {
      const rawResult = await storageDriver.read();

      if (rawResult.isErr()) {
        progressionSnapshot = createInitialProgressionSnapshot();
        await persistSnapshot(storageDriver, progressionSnapshot);
        return err(rawResult.error);
      }

      if (!rawResult.value) {
        progressionSnapshot = createInitialProgressionSnapshot();
        await persistSnapshot(storageDriver, progressionSnapshot);
        return ok(structuredClone(progressionSnapshot));
      }

      const parsedEnvelopeResult = parseProgressionSaveEnvelope(rawResult.value);

      if (parsedEnvelopeResult.isErr()) {
        progressionSnapshot = createInitialProgressionSnapshot();
        await persistSnapshot(storageDriver, progressionSnapshot);
        return err(parsedEnvelopeResult.error);
      }

      progressionSnapshot = parsedEnvelopeResult.value.progression;

      return ok(structuredClone(progressionSnapshot));
    },
    async saveLastPlayedStageSelection(selection) {
      progressionSnapshot = {
        ...progressionSnapshot,
        lastPlayedStageSelection: selection
      };

      return persistSnapshot(storageDriver, progressionSnapshot);
    },
    async saveStageCompletion(record) {
      if (!record) {
        return ok(structuredClone(progressionSnapshot));
      }

      const stageRuntimeConfigResult = loadStageRuntimeConfig(record);
      const currentStageState = progressionSnapshot.stageProgressById[record.stageId] ?? {
        bestStarCount: 0,
        isCompleted: false,
        isUnlocked: false
      };
      const nextTotalXp =
        progressionSnapshot.totalXp + XP_PER_CLEAR + record.starCount * XP_PER_STAR;
      let nextSnapshot: IProgressionSnapshot = {
        ...progressionSnapshot,
        totalXp: nextTotalXp,
        playerLevel: resolvePlayerLevel(nextTotalXp),
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

      return persistSnapshot(storageDriver, progressionSnapshot);
    },
    async saveSettings(settingsPatch) {
      progressionSnapshot = {
        ...progressionSnapshot,
        settings: {
          ...progressionSnapshot.settings,
          ...settingsPatch
        }
      };

      return persistSnapshot(storageDriver, progressionSnapshot);
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

async function persistSnapshot(
  storageDriver: IProgressionStorageDriver,
  snapshot: IProgressionSnapshot
): Promise<Result<IProgressionSnapshot, IGameError>> {
  const writeResult = await storageDriver.write(
    JSON.stringify(createProgressionSaveEnvelope(snapshot))
  );

  if (writeResult.isErr()) {
    return err(writeResult.error);
  }

  progressionSnapshot = {
    ...snapshot,
    settings: {
      ...snapshot.settings
    }
  };

  return ok(structuredClone(progressionSnapshot));
}

function resolvePlayerLevel(totalXp: number) {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

export function createDefaultSettingsPatch() {
  return createDefaultPlayerSettings();
}
