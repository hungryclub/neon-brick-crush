import type { AD_LOAD_FAILED, IAP_PURCHASE_FAILED, MONETIZATION_UNAVAILABLE } from '../../domain/errors/game-error.ts';

export type TRewardedPlacement = 'fail_retry';
export type TRewardKey = 'retry';

export type TRewardedAdOutcome =
  | {
      status: 'granted';
      placement: TRewardedPlacement;
      rewardKey: TRewardKey;
    }
  | {
      status: 'cancelled';
      placement: TRewardedPlacement;
      rewardKey: TRewardKey;
    }
  | {
      status: 'denied';
      placement: TRewardedPlacement;
      rewardKey: TRewardKey;
      reason: typeof AD_LOAD_FAILED;
    }
  | {
      status: 'unavailable';
      placement: TRewardedPlacement;
      rewardKey: TRewardKey;
      reason: typeof MONETIZATION_UNAVAILABLE;
    };

export type TIapProductId = 'supporter-pack';

export type TIapPurchaseOutcome =
  | {
      status: 'purchased';
      productId: TIapProductId;
    }
  | {
      status: 'cancelled';
      productId: TIapProductId;
    }
  | {
      status: 'unavailable';
      productId: TIapProductId;
      reason: typeof MONETIZATION_UNAVAILABLE;
    }
  | {
      status: 'failed';
      productId: TIapProductId;
      reason: typeof IAP_PURCHASE_FAILED;
    };
