import { errAsync, okAsync } from 'neverthrow';

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
  mode = 'purchased'
}: ICreatePurchaseAdapterOptions = {}) {
  return {
    purchaseProduct(productId: TIapProductId) {
      if (mode === 'cancelled') {
        return okAsync<TIapPurchaseOutcome, IGameError>({
          status: 'cancelled',
          productId
        });
      }

      if (mode === 'unavailable') {
        return okAsync<TIapPurchaseOutcome, IGameError>({
          status: 'unavailable',
          productId,
          reason: MONETIZATION_UNAVAILABLE
        });
      }

      if (mode === 'failed') {
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
