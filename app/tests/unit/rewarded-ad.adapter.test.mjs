import test from 'node:test';
import assert from 'node:assert/strict';

import createRewardedAdAdapter from '../../platform/ads/rewarded-ad.adapter.ts';

test('rewarded ad adapter returns granted outcome by default', async () => {
  const outcome = await createRewardedAdAdapter().requestRetryAd().match(
    (value) => value,
    () => null
  );

  assert.deepEqual(outcome, { status: 'granted' });
});

test('rewarded ad adapter exposes handled denied outcome through error channel', async () => {
  const outcome = await createRewardedAdAdapter({ mode: 'denied' }).requestRetryAd().match(
    () => null,
    (error) => error.code
  );

  assert.equal(outcome, 'AD_LOAD_FAILED');
});

test('rewarded ad adapter returns cancelled outcome without throwing', async () => {
  const outcome = await createRewardedAdAdapter({ mode: 'cancelled' }).requestRetryAd().match(
    (value) => value,
    () => null
  );

  assert.deepEqual(outcome, { status: 'cancelled' });
});
