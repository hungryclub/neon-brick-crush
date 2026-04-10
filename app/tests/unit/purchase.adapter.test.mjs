import test from 'node:test';
import assert from 'node:assert/strict';

import createPurchaseAdapter from '../../platform/iap/purchase.adapter.ts';

test('purchase adapter returns purchased outcome by default', async () => {
  const outcome = await createPurchaseAdapter()
    .purchaseProduct('supporter-pack')
    .match(
      (value) => value,
      () => null
    );

  assert.deepEqual(outcome, {
    status: 'purchased',
    productId: 'supporter-pack'
  });
});

test('purchase adapter returns cancelled outcome without throwing', async () => {
  const outcome = await createPurchaseAdapter({ mode: 'cancelled' })
    .purchaseProduct('supporter-pack')
    .match(
      (value) => value,
      () => null
    );

  assert.deepEqual(outcome, {
    status: 'cancelled',
    productId: 'supporter-pack'
  });
});

test('purchase adapter returns unavailable outcome as handled result', async () => {
  const outcome = await createPurchaseAdapter({ mode: 'unavailable' })
    .purchaseProduct('supporter-pack')
    .match(
      (value) => value,
      () => null
    );

  assert.deepEqual(outcome, {
    status: 'unavailable',
    productId: 'supporter-pack',
    reason: 'MONETIZATION_UNAVAILABLE'
  });
});

test('purchase adapter exposes provider failure through the error channel', async () => {
  const outcome = await createPurchaseAdapter({ mode: 'failed' })
    .purchaseProduct('supporter-pack')
    .match(
      () => null,
      (error) => error.code
    );

  assert.equal(outcome, 'IAP_PURCHASE_FAILED');
});
