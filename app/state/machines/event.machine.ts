import { assign, createActor, fromPromise, setup } from 'xstate';

import createProgressionRepository from '../../platform/persistence/progression.repository.ts';
import type { IProgressionSnapshot } from '../../domain/models/progression-model';
import type { IGameError } from '../../domain/errors/game-error.ts';

interface IEventMachineContext {
  lastClaimedEventId: string | null;
  lastClaimedRewardId: string | null;
  lastError: IGameError | null;
  latestSnapshot: IProgressionSnapshot | null;
  pendingClaim: {
    eventId: string;
    rewardId: string;
  } | null;
}

type TEventMachineEvent =
  | { type: 'REQUEST_EVENT_CLAIM'; eventId: string; rewardId: string }
  | { type: 'CLEAR_EVENT_FEEDBACK' };

interface ICreateEventMachineOptions {
  claimEventReward?: (claim: {
    eventId: string;
    rewardId: string;
  }) => Promise<
    | {
        status: 'granted';
        snapshot: IProgressionSnapshot;
        eventId: string;
        rewardId: string;
      }
    | {
        status: 'rejected';
        error: IGameError;
        eventId: string;
        rewardId: string;
      }
  >;
}

function defaultClaimEventReward(claim: { eventId: string; rewardId: string }) {
  return createProgressionRepository()
    .saveEventRewardClaim(claim)
    .then((result) =>
      result.match(
        (snapshot) => ({
          status: 'granted' as const,
          snapshot,
          eventId: claim.eventId,
          rewardId: claim.rewardId
        }),
        (error) => ({
          status: 'rejected' as const,
          error,
          eventId: claim.eventId,
          rewardId: claim.rewardId
        })
      )
    );
}

function isGrantedClaimResult(
  value: unknown
): value is {
  status: 'granted';
  snapshot: IProgressionSnapshot;
  eventId: string;
  rewardId: string;
} {
  return typeof value === 'object' && value !== null && 'status' in value && value.status === 'granted';
}

function isRejectedClaimResult(
  value: unknown
): value is {
  status: 'rejected';
  error: IGameError;
  eventId: string;
  rewardId: string;
} {
  return typeof value === 'object' && value !== null && 'status' in value && value.status === 'rejected';
}

export function createEventMachine({
  claimEventReward = defaultClaimEventReward
}: ICreateEventMachineOptions = {}) {
  return setup({
    types: {
      context: {} as IEventMachineContext,
      events: {} as TEventMachineEvent
    },
    actors: {
      claimEventReward: fromPromise(async ({ input }: { input: { eventId: string; rewardId: string } }) =>
        claimEventReward(input)
      )
    },
    guards: {
      claimGranted: ({ event }) => 'output' in event && isGrantedClaimResult(event.output),
      claimRejected: ({ event }) => 'output' in event && isRejectedClaimResult(event.output)
    },
    actions: {
      storePendingClaim: assign({
        pendingClaim: ({ event, context }) =>
          event.type === 'REQUEST_EVENT_CLAIM'
            ? { eventId: event.eventId, rewardId: event.rewardId }
            : context.pendingClaim,
        lastError: null
      }),
      applyGrantedClaim: assign({
        latestSnapshot: ({ event, context }) =>
          'output' in event && isGrantedClaimResult(event.output)
            ? event.output.snapshot
            : context.latestSnapshot,
        lastClaimedEventId: ({ event, context }) =>
          'output' in event && isGrantedClaimResult(event.output)
            ? event.output.eventId
            : context.lastClaimedEventId,
        lastClaimedRewardId: ({ event, context }) =>
          'output' in event && isGrantedClaimResult(event.output)
            ? event.output.rewardId
            : context.lastClaimedRewardId,
        pendingClaim: null,
        lastError: null
      }),
      applyRejectedClaim: assign({
        lastError: ({ event, context }) =>
          'output' in event && isRejectedClaimResult(event.output)
            ? event.output.error
            : context.lastError,
        pendingClaim: null
      }),
      clearEventFeedback: assign({
        lastClaimedEventId: null,
        lastClaimedRewardId: null,
        lastError: null,
        pendingClaim: null
      })
    }
  }).createMachine({
    id: 'event',
    initial: 'idle',
    context: {
      lastClaimedEventId: null,
      lastClaimedRewardId: null,
      lastError: null,
      latestSnapshot: null,
      pendingClaim: null
    },
    states: {
      idle: {
        on: {
          REQUEST_EVENT_CLAIM: {
            target: 'claiming',
            actions: 'storePendingClaim'
          },
          CLEAR_EVENT_FEEDBACK: {
            actions: 'clearEventFeedback'
          }
        }
      },
      claiming: {
        invoke: {
          src: 'claimEventReward',
          input: ({ context }) => ({
            eventId: context.pendingClaim?.eventId ?? '',
            rewardId: context.pendingClaim?.rewardId ?? ''
          }),
          onDone: [
            {
              guard: 'claimGranted',
              target: 'claimed',
              actions: 'applyGrantedClaim'
            },
            {
              guard: 'claimRejected',
              target: 'failed',
              actions: 'applyRejectedClaim'
            }
          ],
          onError: {
            target: 'failed',
            actions: 'applyRejectedClaim'
          }
        }
      },
      claimed: {
        on: {
          REQUEST_EVENT_CLAIM: {
            target: 'claiming',
            actions: 'storePendingClaim'
          },
          CLEAR_EVENT_FEEDBACK: {
            target: 'idle',
            actions: 'clearEventFeedback'
          }
        }
      },
      failed: {
        on: {
          REQUEST_EVENT_CLAIM: {
            target: 'claiming',
            actions: 'storePendingClaim'
          },
          CLEAR_EVENT_FEEDBACK: {
            target: 'idle',
            actions: 'clearEventFeedback'
          }
        }
      }
    }
  });
}

export const eventMachine = createEventMachine();
export const eventActor = createActor(eventMachine).start();
