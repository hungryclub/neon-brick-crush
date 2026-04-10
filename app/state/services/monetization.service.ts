import createRewardedAdAdapter from '../../platform/ads/rewarded-ad.adapter.js';
import createPurchaseAdapter from '../../platform/iap/purchase.adapter.js';
import {
  AD_LOAD_FAILED,
  IAP_PURCHASE_FAILED,
  MONETIZATION_UNAVAILABLE
} from '../../domain/errors/game-error.ts';
import type {
  TIapProductId,
  TIapPurchaseOutcome,
  TRewardedAdOutcome,
  TRewardKey,
  TRewardedPlacement
} from '../../platform/monetization/monetization-result.ts';

interface ICreateMonetizationServiceOptions {
  purchaseProduct?: (productId: TIapProductId) => Promise<TIapPurchaseOutcome>;
  requestRewardedPlacement?: (
    placement: TRewardedPlacement,
    rewardKey: TRewardKey
  ) => Promise<TRewardedAdOutcome>;
}

function defaultRequestRewardedPlacement(
  placement: TRewardedPlacement,
  rewardKey: TRewardKey
) {
  return createRewardedAdAdapter()
    .requestPlacement(placement, rewardKey)
    .match(
      (outcome) => outcome,
      (error) => {
        if (error.code === MONETIZATION_UNAVAILABLE) {
          return {
            status: 'unavailable',
            placement,
            rewardKey,
            reason: MONETIZATION_UNAVAILABLE
          } as const;
        }

        return {
          status: 'denied',
          placement,
          rewardKey,
          reason: AD_LOAD_FAILED
        } as const;
      }
    );
}

function defaultPurchaseProduct(productId: TIapProductId) {
  return createPurchaseAdapter()
    .purchaseProduct(productId)
    .match(
      (outcome) => outcome,
      () => ({
        status: 'failed',
        productId,
        reason: IAP_PURCHASE_FAILED
      } as const)
    );
}

export default function createMonetizationService({
  purchaseProduct = defaultPurchaseProduct,
  requestRewardedPlacement = defaultRequestRewardedPlacement
}: ICreateMonetizationServiceOptions = {}) {
  return {
    purchaseProduct,
    requestRewardedPlacement,
    requestRewardedRetry() {
      return requestRewardedPlacement('fail_retry', 'retry');
    }
  };
}
