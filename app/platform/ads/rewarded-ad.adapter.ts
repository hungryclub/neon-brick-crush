import { errAsync, okAsync } from 'neverthrow';

import { getDebugSimulationState } from '../../debug/debug-command-bus.ts';
import { isDebugToolsEnabled } from '../../debug/debug-flags.ts';
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
  mode
}: ICreateRewardedAdAdapterOptions = {}) {
  const resolvedMode =
    mode ??
    (isDebugToolsEnabled() && getDebugSimulationState().rewardedAdMode !== 'live'
      ? getDebugSimulationState().rewardedAdMode
      : 'granted');

  function requestPlacement(
    placement: TRewardedPlacement,
    rewardKey: TRewardKey
  ) {
    if (resolvedMode === 'cancelled') {
      return okAsync<TRewardedAdOutcome, IGameError>({
        status: 'cancelled',
        placement,
        rewardKey
      });
    }

    if (resolvedMode === 'denied') {
      return okAsync<TRewardedAdOutcome, IGameError>({
        status: 'denied',
        placement,
        rewardKey,
        reason: AD_LOAD_FAILED
      });
    }

    if (resolvedMode === 'unavailable') {
      return okAsync<TRewardedAdOutcome, IGameError>({
        status: 'unavailable',
        placement,
        rewardKey,
        reason: MONETIZATION_UNAVAILABLE
      });
    }

    if (resolvedMode === 'failed') {
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
