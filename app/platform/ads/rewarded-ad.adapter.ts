import { errAsync, okAsync } from 'neverthrow';

type TRetryAdFailureCode = 'AD_LOAD_FAILED';

export type TRetryAdOutcome =
  | { status: 'granted' }
  | { status: 'denied'; reason: TRetryAdFailureCode }
  | { status: 'cancelled' };

interface ICreateRewardedAdAdapterOptions {
  mode?: 'granted' | 'denied' | 'cancelled';
}

export default function createRewardedAdAdapter({
  mode = 'granted'
}: ICreateRewardedAdAdapterOptions = {}) {
  return {
    requestRetryAd() {
      if (mode === 'cancelled') {
        return okAsync<TRetryAdOutcome, never>({
          status: 'cancelled'
        });
      }

      if (mode === 'denied') {
        return errAsync({
          code: 'AD_LOAD_FAILED' as const
        });
      }

      return okAsync<TRetryAdOutcome, never>({
        status: 'granted'
      });
    }
  };
}
