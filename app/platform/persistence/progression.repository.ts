import type {
  IProgressionSnapshot,
  IStageCompletionRecord
} from '../../domain/models/progression-model';
import type { IStageSelection } from '../../domain/models/stage-model';

let progressionSnapshot: IProgressionSnapshot = {
  version: 2,
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
    }
  },
  lastPlayedStageSelection: {
    worldId: 'world-01',
    stageId: 'world-01-stage-01'
  }
};

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

      const currentStageState = progressionSnapshot.stageProgressById[record.stageId] ?? {
        bestStarCount: 0,
        isCompleted: false,
        isUnlocked: false
      };
      const nextSnapshot: IProgressionSnapshot = {
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
      const nextStageId = resolveNextStageId(record.stageId);

      if (nextStageId) {
        nextSnapshot.stageProgressById = {
          ...nextSnapshot.stageProgressById,
          [nextStageId]: {
            ...(nextSnapshot.stageProgressById[nextStageId] ?? createEmptyStageProgress()),
            isUnlocked: true
          }
        };
      }

      progressionSnapshot = nextSnapshot;

      return structuredClone(progressionSnapshot);
    }
  };
}

function resolveNextStageId(stageId: string) {
  const match = stageId.match(/^(.*-stage-)(\d+)$/);

  if (!match) {
    return null;
  }

  return `${match[1]}${String(Number(match[2]) + 1).padStart(match[2].length, '0')}`;
}

function createEmptyStageProgress() {
  return {
    bestStarCount: 0,
    isCompleted: false,
    isUnlocked: false
  };
}
