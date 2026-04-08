import type { ResultAsync } from 'neverthrow';

import type { IGameError } from '../errors/game-error';

export interface IRewardedRetryResult {
  granted: true;
}

export interface IAdBridgeAdapter {
  requestRetryAd: () => ResultAsync<IRewardedRetryResult, IGameError>;
}
