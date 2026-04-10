import type { SnapshotFrom } from 'xstate';

import type { IStageProgressState } from '../../domain/models/progression-model';
import { evaluateEventRewardEligibility } from '../../domain/models/event-model.ts';
import { loadActiveEventConfigs } from '../../assets/loaders/event-config.loader.ts';
import {
  loadAllWorldContent,
  loadWorldStageRuntimeConfigs
} from '../../assets/loaders/stage-config.loader.ts';
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

export function selectWorldMapWorlds(snapshot: TProgressionSnapshot) {
  const worldResult = loadAllWorldContent();
  const progressionSnapshot = snapshot.context.snapshot;

  if (worldResult.isErr() || !progressionSnapshot) {
    return [];
  }

  return worldResult.value.map((world) => {
    const stageRuntimeConfigResults = loadWorldStageRuntimeConfigs(world.id);

    if (stageRuntimeConfigResults.isErr()) {
      return {
        isUnlocked: false,
        stageCards: [],
        title: world.title,
        worldId: world.id
      };
    }

    return {
      isUnlocked: progressionSnapshot.unlockedWorldIdList.includes(world.id),
      title: world.title,
      worldId: world.id,
      stageCards: stageRuntimeConfigResults.value.map((stageRuntimeConfig) => {
        const progress =
          progressionSnapshot.stageProgressById[stageRuntimeConfig.stageId] ?? defaultStageProgress();

        return {
          objectiveText: stageRuntimeConfig.presentationProfile.objectiveText,
          stageId: stageRuntimeConfig.stageId,
          stageKind: stageRuntimeConfig.stageKind,
          stageTitle: stageRuntimeConfig.stageTitle,
          shellLabel: stageRuntimeConfig.presentationProfile.shellLabel,
          accentColor: stageRuntimeConfig.presentationProfile.accentColor,
          isCompleted: progress.isCompleted,
          isUnlocked: progress.isUnlocked,
          starCount: progress.bestStarCount,
          worldId: world.id
        };
      })
    };
  });
}

export function selectActiveEventCards(snapshot: TProgressionSnapshot) {
  const progressionSnapshot = snapshot.context.snapshot;
  const eventResult = loadActiveEventConfigs();

  if (!progressionSnapshot || eventResult.isErr()) {
    return [];
  }

  return eventResult.value.map((eventDefinition) => {
    const eligibility = evaluateEventRewardEligibility(eventDefinition, progressionSnapshot);

    return {
      id: eventDefinition.id,
      title: eventDefinition.title,
      description: eventDefinition.description,
      rewardId: eventDefinition.reward.id,
      rewardTitle: eventDefinition.reward.title,
      rewardDescription: eventDefinition.reward.description,
      xpAmount: eventDefinition.reward.xpAmount,
      canClaim: eligibility.canClaim,
      statusText:
        eligibility.reason === 'claimable'
          ? 'Claimable'
          : eligibility.reason === 'already_claimed'
            ? 'Claimed'
            : eligibility.reason === 'expired'
              ? 'Expired'
              : 'Locked by Progression'
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
