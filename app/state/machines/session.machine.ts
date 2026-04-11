import { assign, createActor, fromPromise, setup } from 'xstate';

import type { TRewardedAdOutcome } from '../../platform/monetization/monetization-result.ts';
import {
  resolveReadyFeverMode,
  type TFeverMode
} from '../../game/systems/fever-overdrive.ts';
import createMonetizationService from '../services/monetization.service.ts';

const FEVER_CHARGE_PER_BLOCK = 20;
const FEVER_CHARGE_PER_GATE = 8;
const FEVER_METER_MAX = 100;

interface ISessionContext {
  activeFeverMode: TFeverMode | null;
  feverMeter: number;
  isFeverActive: boolean;
  hasConsumedRewardedRetry: boolean;
  retryCount: number;
}

type TSessionEvent =
  | { type: 'BOOT_FINISHED' }
  | { type: 'STAGE_FAILED' }
  | {
      type: 'TURN_RESOLVED';
      payload: {
        destroyedBlocksThisTurn: number;
        feverApplied: boolean;
        gateTriggeredCount: number;
      };
    }
  | { type: 'REQUEST_RETRY' }
  | { type: 'REQUEST_FEVER_ACTIVATION' }
  | { type: 'REQUEST_REWARDED_RETRY' }
  | { type: 'RETRY_RESTORED' }
  | { type: 'RESET_SESSION' };

interface ICreateSessionMachineOptions {
  requestRewardedRetry?: () => Promise<TRewardedAdOutcome>;
}

function defaultRequestRewardedRetry() {
  return createMonetizationService().requestRewardedRetry();
}

function isRetryAdOutcome(value: unknown): value is TRewardedAdOutcome {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    (value.status === 'granted' ||
      value.status === 'cancelled' ||
      value.status === 'denied' ||
      value.status === 'unavailable')
  );
}

export function createSessionMachine({
  requestRewardedRetry = defaultRequestRewardedRetry
}: ICreateSessionMachineOptions = {}) {
  return setup({
    types: {
      context: {} as ISessionContext,
      events: {} as TSessionEvent
    },
    actors: {
      requestRewardedRetry: fromPromise(async () => requestRewardedRetry())
    },
    guards: {
      canActivateFever: ({ context }) =>
        resolveReadyFeverMode(context.feverMeter) !== null && !context.isFeverActive,
      canUseRewardedRetry: ({ context }) => !context.hasConsumedRewardedRetry,
      rewardedRetryGranted: ({ event }) =>
        'output' in event &&
        isRetryAdOutcome(event.output) &&
        event.output.status === 'granted',
      rewardedRetryCancelled: ({ event }) =>
        'output' in event &&
        isRetryAdOutcome(event.output) &&
        event.output.status === 'cancelled',
      rewardedRetryUnavailable: ({ event }) =>
        'output' in event &&
        isRetryAdOutcome(event.output) &&
        event.output.status === 'unavailable'
    },
    actions: {
      incrementRetryCount: assign({
        retryCount: ({ context }) => context.retryCount + 1
      }),
      activateFever: assign({
        feverMeter: 0,
        isFeverActive: true,
        activeFeverMode: ({ context }) => resolveReadyFeverMode(context.feverMeter)
      }),
      consumeRewardedRetry: assign({
        hasConsumedRewardedRetry: true,
        retryCount: ({ context }) => context.retryCount + 1
      }),
      resetSessionProgress: assign({
        activeFeverMode: null,
        feverMeter: 0,
        isFeverActive: false,
        hasConsumedRewardedRetry: false,
        retryCount: 0
      }),
      clearActiveFever: assign({
        activeFeverMode: null,
        isFeverActive: false
      }),
      resolveFeverTurn: assign({
        feverMeter: ({ context, event }) => {
          if (event.type !== 'TURN_RESOLVED') {
            return context.feverMeter;
          }

          const addedCharge =
            event.payload.destroyedBlocksThisTurn * FEVER_CHARGE_PER_BLOCK +
            event.payload.gateTriggeredCount * FEVER_CHARGE_PER_GATE;

          return Math.min(context.feverMeter + addedCharge, FEVER_METER_MAX);
        },
        isFeverActive: ({ context, event }) => {
          if (event.type !== 'TURN_RESOLVED') {
            return context.isFeverActive;
          }

          return context.isFeverActive ? false : context.isFeverActive;
        },
        activeFeverMode: ({ context, event }) => {
          if (event.type !== 'TURN_RESOLVED') {
            return context.activeFeverMode;
          }

          return context.isFeverActive ? null : context.activeFeverMode;
        }
      })
    }
  }).createMachine({
    id: 'session',
    initial: 'booting',
    context: {
      activeFeverMode: null,
      feverMeter: 0,
      isFeverActive: false,
      hasConsumedRewardedRetry: false,
      retryCount: 0
    },
    states: {
      booting: {
        on: {
          BOOT_FINISHED: {
            target: 'playing'
          }
        }
      },
      playing: {
        on: {
          STAGE_FAILED: {
            target: 'failed.offer',
            actions: 'clearActiveFever'
          },
          TURN_RESOLVED: {
            actions: 'resolveFeverTurn'
          },
          REQUEST_FEVER_ACTIVATION: {
            guard: 'canActivateFever',
            actions: 'activateFever'
          },
          RESET_SESSION: {
            target: 'playing',
            actions: 'resetSessionProgress'
          }
        }
      },
      failed: {
        initial: 'offer',
        states: {
          offer: {
            on: {
              REQUEST_RETRY: {
                target: '#session.retrying',
                actions: 'incrementRetryCount'
              },
              REQUEST_REWARDED_RETRY: [
                {
                  guard: 'canUseRewardedRetry',
                  target: 'requestingRewardedRetry'
                }
              ]
            }
          },
          requestingRewardedRetry: {
            invoke: {
              src: 'requestRewardedRetry',
              onDone: [
                {
                  guard: 'rewardedRetryGranted',
                  target: '#session.rewardedRetrying',
                  actions: 'consumeRewardedRetry'
                },
                {
                  guard: 'rewardedRetryCancelled',
                  target: 'cancelled'
                },
                {
                  guard: 'rewardedRetryUnavailable',
                  target: 'unavailable'
                },
                {
                  target: 'denied'
                }
              ],
              onError: {
                target: 'denied'
              }
            }
          },
          denied: {
            on: {
              REQUEST_RETRY: {
                target: '#session.retrying',
                actions: 'incrementRetryCount'
              },
              REQUEST_REWARDED_RETRY: [
                {
                  guard: 'canUseRewardedRetry',
                  target: 'requestingRewardedRetry'
                }
              ]
            }
          },
          unavailable: {
            on: {
              REQUEST_RETRY: {
                target: '#session.retrying',
                actions: 'incrementRetryCount'
              }
            }
          },
          cancelled: {
            on: {
              REQUEST_RETRY: {
                target: '#session.retrying',
                actions: 'incrementRetryCount'
              },
              REQUEST_REWARDED_RETRY: [
                {
                  guard: 'canUseRewardedRetry',
                  target: 'requestingRewardedRetry'
                }
              ]
            }
          }
        },
        on: {
          RESET_SESSION: {
            target: 'playing',
            actions: 'resetSessionProgress'
          }
        }
      },
      retrying: {
        on: {
          RETRY_RESTORED: {
            target: 'playing'
          }
        }
      },
      rewardedRetrying: {
        on: {
          RETRY_RESTORED: {
            target: 'playing'
          }
        }
      }
    }
  });
}

export const sessionMachine = createSessionMachine();
export const sessionActor = createActor(sessionMachine);
