import { errAsync, okAsync } from 'neverthrow';

import { getDebugSimulationState } from '../../debug/debug-command-bus.ts';
import { isDebugToolsEnabled } from '../../debug/debug-flags.ts';
import {
  IAP_PURCHASE_FAILED,
  MONETIZATION_UNAVAILABLE,
  type IGameError
} from '../../domain/errors/game-error.ts';
import type {
  TIapProductId,
  TIapPurchaseOutcome
} from '../monetization/monetization-result.ts';

interface ICreatePurchaseAdapterOptions {
  mode?: 'purchased' | 'cancelled' | 'unavailable' | 'failed';
}

export default function createPurchaseAdapter({
  mode
}: ICreatePurchaseAdapterOptions = {}) {
  const resolvedMode =
    mode ??
    (isDebugToolsEnabled() && getDebugSimulationState().purchaseMode !== 'live'
      ? getDebugSimulationState().purchaseMode
      : 'purchased');

  return {
    purchaseProduct(productId: TIapProductId) {
      if (resolvedMode === 'cancelled') {
        return okAsync<TIapPurchaseOutcome, IGameError>({
          status: 'cancelled',
          productId
        });
      }

      if (resolvedMode === 'unavailable') {
        return okAsync<TIapPurchaseOutcome, IGameError>({
          status: 'unavailable',
          productId,
          reason: MONETIZATION_UNAVAILABLE
        });
      }

      if (resolvedMode === 'failed') {
        return errAsync({
          code: IAP_PURCHASE_FAILED,
          message: 'Purchase provider request failed.'
        });
      }

      return okAsync<TIapPurchaseOutcome, IGameError>({
        status: 'purchased',
        productId
      });
    }
  };
}
