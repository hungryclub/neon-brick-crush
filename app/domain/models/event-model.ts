import type { IGameError } from '../errors/game-error.ts';
import {
  EVENT_REWARD_ALREADY_CLAIMED,
  EVENT_REWARD_EXPIRED,
  EVENT_REWARD_INELIGIBLE
} from '../errors/game-error.ts';
import type { IProgressionSnapshot } from './progression-model';
import { err, ok } from '../../shared/result/result.ts';

export interface IEventRewardDefinition {
  id: string;
  title: string;
  description: string;
  xpAmount: number;
}

export interface IEventEligibilityRule {
  minimumPlayerLevel: number;
  requiredCompletedStageIds: string[];
}

export interface ILiveEventDefinition {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  reward: IEventRewardDefinition;
  eligibility: IEventEligibilityRule;
}

export interface IEventClaimState {
  claimedRewardIds: string[];
  lastClaimedAt: string | null;
}

export interface IEventEligibilityView {
  canClaim: boolean;
  reason: 'claimable' | 'already_claimed' | 'expired' | 'ineligible';
}

export function createEmptyEventClaimState(): IEventClaimState {
  return {
    claimedRewardIds: [],
    lastClaimedAt: null
  };
}

export function evaluateEventRewardEligibility(
  eventDefinition: ILiveEventDefinition,
  progressionSnapshot: IProgressionSnapshot,
  now = new Date()
): IEventEligibilityView {
  const eventClaimState =
    progressionSnapshot.eventClaimStateById[eventDefinition.id] ?? createEmptyEventClaimState();
  const eventEndTime = Date.parse(eventDefinition.endsAt);

  if (eventClaimState.claimedRewardIds.includes(eventDefinition.reward.id)) {
    return {
      canClaim: false,
      reason: 'already_claimed'
    };
  }

  if (Number.isNaN(eventEndTime) || now.getTime() > eventEndTime) {
    return {
      canClaim: false,
      reason: 'expired'
    };
  }

  const hasRequiredLevel =
    progressionSnapshot.playerLevel >= eventDefinition.eligibility.minimumPlayerLevel;
  const hasRequiredStages = eventDefinition.eligibility.requiredCompletedStageIds.every(
    (stageId) => progressionSnapshot.stageProgressById[stageId]?.isCompleted
  );

  if (!hasRequiredLevel || !hasRequiredStages) {
    return {
      canClaim: false,
      reason: 'ineligible'
    };
  }

  return {
    canClaim: true,
    reason: 'claimable'
  };
}

export function assertEventRewardClaimable(
  eventDefinition: ILiveEventDefinition,
  progressionSnapshot: IProgressionSnapshot,
  now = new Date()
) {
  const eligibility = evaluateEventRewardEligibility(eventDefinition, progressionSnapshot, now);

  if (eligibility.reason === 'already_claimed') {
    return err({
      code: EVENT_REWARD_ALREADY_CLAIMED,
      message: 'This event reward has already been claimed.'
    } satisfies IGameError);
  }

  if (eligibility.reason === 'expired') {
    return err({
      code: EVENT_REWARD_EXPIRED,
      message: 'This event reward is no longer active.'
    } satisfies IGameError);
  }

  if (eligibility.reason === 'ineligible') {
    return err({
      code: EVENT_REWARD_INELIGIBLE,
      message: 'Current progression does not satisfy this event reward.'
    } satisfies IGameError);
  }

  return ok(eligibility);
}
