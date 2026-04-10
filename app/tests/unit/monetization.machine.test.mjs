import test from 'node:test';
import assert from 'node:assert/strict';

import { createActor } from 'xstate';

import { createMonetizationMachine } from '../../state/machines/monetization.machine.ts';

async function flushActor() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test('monetization machine records purchased outcome explicitly', async () => {
  const actor = createActor(
    createMonetizationMachine({
      purchaseProduct: async () => ({
        status: 'purchased',
        productId: 'supporter-pack'
      })
    })
  ).start();

  actor.send({ type: 'REQUEST_FEATURED_PURCHASE' });
  await flushActor();

  assert.equal(actor.getSnapshot().matches('purchased'), true);
  assert.deepEqual(actor.getSnapshot().context.purchasedProductIds, ['supporter-pack']);
});

test('monetization machine ignores duplicate featured purchase requests after ownership is recorded', async () => {
  let requestCount = 0;
  const actor = createActor(
    createMonetizationMachine({
      purchaseProduct: async () => {
        requestCount += 1;

        return {
          status: 'purchased',
          productId: 'supporter-pack'
        };
      }
    })
  ).start();

  actor.send({ type: 'REQUEST_FEATURED_PURCHASE' });
  await flushActor();
  actor.send({ type: 'REQUEST_FEATURED_PURCHASE' });
  await flushActor();

  assert.equal(requestCount, 1);
  assert.equal(actor.getSnapshot().matches('purchased'), true);
  assert.deepEqual(actor.getSnapshot().context.purchasedProductIds, ['supporter-pack']);
});

test('monetization machine records cancelled purchases explicitly', async () => {
  const actor = createActor(
    createMonetizationMachine({
      purchaseProduct: async () => ({
        status: 'cancelled',
        productId: 'supporter-pack'
      })
    })
  ).start();

  actor.send({ type: 'REQUEST_FEATURED_PURCHASE' });
  await flushActor();

  assert.equal(actor.getSnapshot().matches('cancelled'), true);
  assert.equal(actor.getSnapshot().context.lastPurchaseOutcome?.status, 'cancelled');
});

test('monetization machine records unavailable purchases explicitly', async () => {
  const actor = createActor(
    createMonetizationMachine({
      purchaseProduct: async () => ({
        status: 'unavailable',
        productId: 'supporter-pack',
        reason: 'MONETIZATION_UNAVAILABLE'
      })
    })
  ).start();

  actor.send({ type: 'REQUEST_FEATURED_PURCHASE' });
  await flushActor();

  assert.equal(actor.getSnapshot().matches('unavailable'), true);
  assert.equal(actor.getSnapshot().context.lastPurchaseOutcome?.status, 'unavailable');
});

test('monetization machine maps rejected purchases into a handled failed state', async () => {
  const actor = createActor(
    createMonetizationMachine({
      purchaseProduct: async () => {
        throw new Error('purchase transport failed');
      }
    })
  ).start();

  actor.send({ type: 'REQUEST_FEATURED_PURCHASE' });
  await flushActor();

  assert.equal(actor.getSnapshot().matches('failed'), true);
  assert.deepEqual(actor.getSnapshot().context.lastPurchaseOutcome, {
    status: 'failed',
    productId: 'supporter-pack',
    reason: 'IAP_PURCHASE_FAILED'
  });
});
