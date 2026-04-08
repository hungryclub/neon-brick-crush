import { okAsync } from 'neverthrow';

export default function createRewardedAdAdapter() {
  return {
    requestRetryAd() {
      return okAsync({
        granted: true as const
      });
    }
  };
}
