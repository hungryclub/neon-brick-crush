import { assign, createActor, fromPromise, setup } from 'xstate';

import createMonetizationService from '../services/monetization.service.ts';
import { IAP_PURCHASE_FAILED } from '../../domain/errors/game-error.ts';
import type {
  TIapProductId,
  TIapPurchaseOutcome
} from '../../platform/monetization/monetization-result.ts';

interface IMonetizationContext {
  featuredProductId: TIapProductId;
  lastPurchaseOutcome: TIapPurchaseOutcome | null;
  purchasedProductIds: TIapProductId[];
}

type TMonetizationEvent =
  | { type: 'REQUEST_FEATURED_PURCHASE' }
  | { type: 'CLEAR_PURCHASE_FEEDBACK' };

interface ICreateMonetizationMachineOptions {
  purchaseProduct?: (productId: TIapProductId) => Promise<TIapPurchaseOutcome>;
}

function isPurchaseOutcome(value: unknown): value is TIapPurchaseOutcome {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    (value.status === 'purchased' ||
      value.status === 'cancelled' ||
      value.status === 'unavailable' ||
      value.status === 'failed')
  );
}

export function createMonetizationMachine({
  purchaseProduct = createMonetizationService().purchaseProduct
}: ICreateMonetizationMachineOptions = {}) {
  return setup({
    types: {
      context: {} as IMonetizationContext,
      events: {} as TMonetizationEvent
    },
    actors: {
      purchaseFeaturedProduct: fromPromise(async ({ input }: { input: { productId: TIapProductId } }) =>
        purchaseProduct(input.productId)
      )
    },
    guards: {
      purchaseSucceeded: ({ event }) =>
        'output' in event && isPurchaseOutcome(event.output) && event.output.status === 'purchased',
      purchaseCancelled: ({ event }) =>
        'output' in event && isPurchaseOutcome(event.output) && event.output.status === 'cancelled',
      purchaseUnavailable: ({ event }) =>
        'output' in event && isPurchaseOutcome(event.output) && event.output.status === 'unavailable'
    },
    actions: {
      applyPurchaseOutcome: assign({
        lastPurchaseOutcome: ({ context, event }) =>
          'output' in event && isPurchaseOutcome(event.output) ? event.output : context.lastPurchaseOutcome,
        purchasedProductIds: ({ context, event }) => {
          if (!('output' in event) || !isPurchaseOutcome(event.output) || event.output.status !== 'purchased') {
            return context.purchasedProductIds;
          }

          if (context.purchasedProductIds.includes(event.output.productId)) {
            return context.purchasedProductIds;
          }

          return [...context.purchasedProductIds, event.output.productId];
        }
      }),
      applyFailedPurchase: assign({
        lastPurchaseOutcome: ({ context }) => ({
          status: 'failed',
          productId: context.featuredProductId,
          reason: IAP_PURCHASE_FAILED
        } as const)
      }),
      clearPurchaseFeedback: assign({
        lastPurchaseOutcome: null
      })
    }
  }).createMachine({
    id: 'monetization',
    initial: 'idle',
    context: {
      featuredProductId: 'supporter-pack',
      lastPurchaseOutcome: null,
      purchasedProductIds: []
    },
    states: {
      idle: {
        on: {
          REQUEST_FEATURED_PURCHASE: {
            target: 'purchasing'
          },
          CLEAR_PURCHASE_FEEDBACK: {
            actions: 'clearPurchaseFeedback'
          }
        }
      },
      purchasing: {
        invoke: {
          src: 'purchaseFeaturedProduct',
          input: ({ context }) => ({
            productId: context.featuredProductId
          }),
          onDone: [
            {
              guard: 'purchaseSucceeded',
              target: 'purchased',
              actions: 'applyPurchaseOutcome'
            },
            {
              guard: 'purchaseCancelled',
              target: 'cancelled',
              actions: 'applyPurchaseOutcome'
            },
            {
              guard: 'purchaseUnavailable',
              target: 'unavailable',
              actions: 'applyPurchaseOutcome'
            },
            {
              target: 'failed',
              actions: 'applyPurchaseOutcome'
            }
          ],
          onError: {
            target: 'failed',
            actions: 'applyFailedPurchase'
          }
        }
      },
      purchased: {
        on: {
          REQUEST_FEATURED_PURCHASE: {
            target: 'purchasing'
          },
          CLEAR_PURCHASE_FEEDBACK: {
            target: 'idle',
            actions: 'clearPurchaseFeedback'
          }
        }
      },
      cancelled: {
        on: {
          REQUEST_FEATURED_PURCHASE: {
            target: 'purchasing'
          },
          CLEAR_PURCHASE_FEEDBACK: {
            target: 'idle',
            actions: 'clearPurchaseFeedback'
          }
        }
      },
      unavailable: {
        on: {
          REQUEST_FEATURED_PURCHASE: {
            target: 'purchasing'
          },
          CLEAR_PURCHASE_FEEDBACK: {
            target: 'idle',
            actions: 'clearPurchaseFeedback'
          }
        }
      },
      failed: {
        on: {
          REQUEST_FEATURED_PURCHASE: {
            target: 'purchasing'
          },
          CLEAR_PURCHASE_FEEDBACK: {
            target: 'idle',
            actions: 'clearPurchaseFeedback'
          }
        }
      }
    }
  });
}

export const monetizationMachine = createMonetizationMachine();
export const monetizationActor = createActor(monetizationMachine).start();
