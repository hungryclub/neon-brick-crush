import type { SnapshotFrom } from 'xstate';

import type { IStageProgressState } from '../../domain/models/progression-model';
import { loadWorldContent } from '../../assets/loaders/stage-config.loader.ts';
import { progressionMachine } from '../machines/progression.machine';

type TProgressionSnapshot = SnapshotFrom<typeof progressionMachine>;

export function selectProgressionPhase(snapshot: TProgressionSnapshot) {
  return snapshot.value.toString();
}

export function selectIsProgressionLoading(snapshot: TProgressionSnapshot) {
  return snapshot.matches('loading');
}

export function selectActiveStageSelection(snapshot: TProgressionSnapshot) {
  return snapshot.context.activeStageSelection;
}

export function selectLatestStageCompletion(snapshot: TProgressionSnapshot) {
  return snapshot.context.lastStageCompletion;
}

export function selectWorldMapStageCards(snapshot: TProgressionSnapshot) {
  const activeWorldId = snapshot.context.snapshot?.unlockedWorldIdList[0] ?? 'world-01';
  const worldResult = loadWorldContent(activeWorldId);

  if (worldResult.isErr() || !snapshot.context.snapshot) {
    return [];
  }

  return worldResult.value.stageIds.map((stageId) => {
    const progress = snapshot.context.snapshot?.stageProgressById[stageId] ?? defaultStageProgress();

    return {
      stageId,
      isCompleted: progress.isCompleted,
      isUnlocked: progress.isUnlocked,
      starCount: progress.bestStarCount,
      worldId: activeWorldId
    };
  });
}

function defaultStageProgress(): IStageProgressState {
  return {
    bestStarCount: 0,
    isCompleted: false,
    isUnlocked: false
  };
}
