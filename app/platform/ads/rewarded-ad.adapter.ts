import { errAsync, okAsync } from 'neverthrow';

import {
  AD_LOAD_FAILED,
  MONETIZATION_UNAVAILABLE,
  type IGameError
} from '../../domain/errors/game-error.ts';
import type {
  TRewardKey,
  TRewardedAdOutcome,
  TRewardedPlacement
} from '../monetization/monetization-result.ts';

interface ICreateRewardedAdAdapterOptions {
  mode?: 'granted' | 'denied' | 'cancelled' | 'unavailable' | 'failed';
}

export default function createRewardedAdAdapter({
  mode = 'granted'
}: ICreateRewardedAdAdapterOptions = {}) {
  function requestPlacement(
    placement: TRewardedPlacement,
    rewardKey: TRewardKey
  ) {
    if (mode === 'cancelled') {
      return okAsync<TRewardedAdOutcome, IGameError>({
        status: 'cancelled',
        placement,
        rewardKey
      });
    }

    if (mode === 'denied') {
      return okAsync<TRewardedAdOutcome, IGameError>({
        status: 'denied',
        placement,
        rewardKey,
        reason: AD_LOAD_FAILED
      });
    }

    if (mode === 'unavailable') {
      return okAsync<TRewardedAdOutcome, IGameError>({
        status: 'unavailable',
        placement,
        rewardKey,
        reason: MONETIZATION_UNAVAILABLE
      });
    }

    if (mode === 'failed') {
      return errAsync({
        code: AD_LOAD_FAILED,
        message: 'Rewarded ad provider request failed.'
      });
    }

    return okAsync<TRewardedAdOutcome, IGameError>({
      status: 'granted',
      placement,
      rewardKey
    });
  }

  return {
    requestPlacement,
    requestRetryAd() {
      return requestPlacement('fail_retry', 'retry');
    }
  };
}
