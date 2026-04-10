import test from 'node:test';
import assert from 'node:assert/strict';

import createRewardedAdAdapter from '../../platform/ads/rewarded-ad.adapter.ts';

test('rewarded ad adapter returns granted outcome by default', async () => {
  const outcome = await createRewardedAdAdapter().requestRetryAd().match(
    (value) => value,
    () => null
  );

  assert.deepEqual(outcome, {
    status: 'granted',
    placement: 'fail_retry',
    rewardKey: 'retry'
  });
});

test('rewarded ad adapter returns denied outcome as a handled result', async () => {
  const outcome = await createRewardedAdAdapter({ mode: 'denied' }).requestRetryAd().match(
    (value) => value,
    () => null
  );

  assert.deepEqual(outcome, {
    status: 'denied',
    placement: 'fail_retry',
    rewardKey: 'retry',
    reason: 'AD_LOAD_FAILED'
  });
});

test('rewarded ad adapter returns cancelled outcome without throwing', async () => {
  const outcome = await createRewardedAdAdapter({ mode: 'cancelled' }).requestRetryAd().match(
    (value) => value,
    () => null
  );

  assert.deepEqual(outcome, {
    status: 'cancelled',
    placement: 'fail_retry',
    rewardKey: 'retry'
  });
});

test('rewarded ad adapter returns unavailable outcome as a handled result', async () => {
  const outcome = await createRewardedAdAdapter({ mode: 'unavailable' }).requestRetryAd().match(
    (value) => value,
    () => null
  );

  assert.deepEqual(outcome, {
    status: 'unavailable',
    placement: 'fail_retry',
    rewardKey: 'retry',
    reason: 'MONETIZATION_UNAVAILABLE'
  });
});

test('rewarded ad adapter exposes provider failure through the error channel', async () => {
  const outcome = await createRewardedAdAdapter({ mode: 'failed' }).requestRetryAd().match(
    () => null,
    (error) => error.code
  );

  assert.equal(outcome, 'AD_LOAD_FAILED');
});
