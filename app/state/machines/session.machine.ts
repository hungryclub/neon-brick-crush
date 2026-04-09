import { assign, createActor, fromPromise, setup } from 'xstate';

import createRewardedAdAdapter from '../../platform/ads/rewarded-ad.adapter.js';

type TRetryAdOutcome =
  | { status: 'granted' }
  | { status: 'denied'; reason: 'AD_LOAD_FAILED' }
  | { status: 'cancelled' };

interface ISessionContext {
  hasConsumedRewardedRetry: boolean;
  retryCount: number;
}

type TSessionEvent =
  | { type: 'BOOT_FINISHED' }
  | { type: 'STAGE_FAILED' }
  | { type: 'REQUEST_RETRY' }
  | { type: 'REQUEST_REWARDED_RETRY' }
  | { type: 'RETRY_RESTORED' }
  | { type: 'RESET_SESSION' };

interface ICreateSessionMachineOptions {
  requestRewardedRetry?: () => Promise<TRetryAdOutcome>;
}

function defaultRequestRewardedRetry() {
  return createRewardedAdAdapter().requestRetryAd().match(
    (outcome) => outcome,
    (error) => ({
      status: 'denied' as const,
      reason: error.code
    })
  );
}

function isRetryAdOutcome(value: unknown): value is TRetryAdOutcome {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    (value.status === 'granted' ||
      value.status === 'cancelled' ||
      value.status === 'denied')
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
      canUseRewardedRetry: ({ context }) => !context.hasConsumedRewardedRetry,
      rewardedRetryGranted: ({ event }) =>
        'output' in event &&
        isRetryAdOutcome(event.output) &&
        event.output.status === 'granted',
      rewardedRetryCancelled: ({ event }) =>
        'output' in event &&
        isRetryAdOutcome(event.output) &&
        event.output.status === 'cancelled'
    },
    actions: {
      incrementRetryCount: assign({
        retryCount: ({ context }) => context.retryCount + 1
      }),
      consumeRewardedRetry: assign({
        hasConsumedRewardedRetry: true,
        retryCount: ({ context }) => context.retryCount + 1
      }),
      resetSessionProgress: assign({
        hasConsumedRewardedRetry: false,
        retryCount: 0
      })
    }
  }).createMachine({
    id: 'session',
    initial: 'booting',
    context: {
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
            target: 'failed.offer'
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
