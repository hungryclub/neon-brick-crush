import test from 'node:test';
import assert from 'node:assert/strict';

import { createActor } from 'xstate';

import { createSessionMachine } from '../../state/machines/session.machine.ts';

async function flushActor() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test('session machine moves from play to failed to instant retry restore', () => {
  const actor = createActor(createSessionMachine()).start();

  actor.send({ type: 'BOOT_FINISHED' });
  assert.equal(actor.getSnapshot().matches('playing'), true);

  actor.send({ type: 'STAGE_FAILED' });
  assert.equal(actor.getSnapshot().matches({ failed: 'offer' }), true);

  actor.send({ type: 'REQUEST_RETRY' });
  assert.equal(actor.getSnapshot().matches('retrying'), true);
  assert.equal(actor.getSnapshot().context.retryCount, 1);

  actor.send({ type: 'RETRY_RESTORED' });
  assert.equal(actor.getSnapshot().matches('playing'), true);
});

test('session machine grants rewarded retry only after ad success', async () => {
  const actor = createActor(
    createSessionMachine({
      requestRewardedRetry: async () => ({ status: 'granted' })
    })
  ).start();

  actor.send({ type: 'BOOT_FINISHED' });
  actor.send({ type: 'STAGE_FAILED' });
  actor.send({ type: 'REQUEST_REWARDED_RETRY' });

  await flushActor();

  assert.equal(actor.getSnapshot().matches('rewardedRetrying'), true);
  assert.equal(actor.getSnapshot().context.retryCount, 1);
  assert.equal(actor.getSnapshot().context.hasConsumedRewardedRetry, true);
});

test('session machine falls back to failed state when rewarded retry is denied', async () => {
  const actor = createActor(
    createSessionMachine({
      requestRewardedRetry: async () => ({
        status: 'denied',
        reason: 'AD_LOAD_FAILED'
      })
    })
  ).start();

  actor.send({ type: 'BOOT_FINISHED' });
  actor.send({ type: 'STAGE_FAILED' });
  actor.send({ type: 'REQUEST_REWARDED_RETRY' });

  await flushActor();

  assert.equal(actor.getSnapshot().matches({ failed: 'denied' }), true);
  assert.equal(actor.getSnapshot().context.hasConsumedRewardedRetry, false);
});

test('session machine falls back to failed state when rewarded retry is cancelled', async () => {
  const actor = createActor(
    createSessionMachine({
      requestRewardedRetry: async () => ({ status: 'cancelled' })
    })
  ).start();

  actor.send({ type: 'BOOT_FINISHED' });
  actor.send({ type: 'STAGE_FAILED' });
  actor.send({ type: 'REQUEST_REWARDED_RETRY' });

  await flushActor();

  assert.equal(actor.getSnapshot().matches({ failed: 'cancelled' }), true);
  assert.equal(actor.getSnapshot().context.hasConsumedRewardedRetry, false);
});

test('session machine falls back to failed state when rewarded retry request rejects', async () => {
  const actor = createActor(
    createSessionMachine({
      requestRewardedRetry: async () => {
        throw new Error('ad transport failed');
      }
    })
  ).start();

  actor.send({ type: 'BOOT_FINISHED' });
  actor.send({ type: 'STAGE_FAILED' });
  actor.send({ type: 'REQUEST_REWARDED_RETRY' });

  await flushActor();

  assert.equal(actor.getSnapshot().matches({ failed: 'denied' }), true);
  assert.equal(actor.getSnapshot().context.hasConsumedRewardedRetry, false);
});

test('session machine exposes unavailable rewarded retry as its own handled branch', async () => {
  const actor = createActor(
    createSessionMachine({
      requestRewardedRetry: async () => ({
        status: 'unavailable',
        placement: 'fail_retry',
        rewardKey: 'retry',
        reason: 'MONETIZATION_UNAVAILABLE'
      })
    })
  ).start();

  actor.send({ type: 'BOOT_FINISHED' });
  actor.send({ type: 'STAGE_FAILED' });
  actor.send({ type: 'REQUEST_REWARDED_RETRY' });

  await flushActor();

  assert.equal(actor.getSnapshot().matches({ failed: 'unavailable' }), true);
  assert.equal(actor.getSnapshot().context.hasConsumedRewardedRetry, false);
});

test('session machine can reset session progress back to baseline', () => {
  const actor = createActor(createSessionMachine()).start();

  actor.send({ type: 'BOOT_FINISHED' });
  actor.send({ type: 'STAGE_FAILED' });
  actor.send({ type: 'REQUEST_RETRY' });
  actor.send({ type: 'RETRY_RESTORED' });
  actor.send({ type: 'RESET_SESSION' });

  assert.equal(actor.getSnapshot().matches('playing'), true);
  assert.equal(actor.getSnapshot().context.retryCount, 0);
  assert.equal(actor.getSnapshot().context.hasConsumedRewardedRetry, false);
});

test('session machine charges fever meter from turn results up to ready state', () => {
  const actor = createActor(createSessionMachine()).start();

  actor.send({ type: 'BOOT_FINISHED' });
  actor.send({
    type: 'TURN_RESOLVED',
    payload: {
      destroyedBlocksThisTurn: 2,
      feverApplied: false,
      gateTriggeredCount: 1
    }
  });
  actor.send({
    type: 'TURN_RESOLVED',
    payload: {
      destroyedBlocksThisTurn: 3,
      feverApplied: false,
      gateTriggeredCount: 0
    }
  });

  assert.equal(actor.getSnapshot().context.feverMeter, 100);
  assert.equal(actor.getSnapshot().context.isFeverActive, false);
  assert.equal(actor.getSnapshot().context.activeFeverMode, null);
});

test('session machine activates breaker once tier 1 is ready and clears it after use', () => {
  const actor = createActor(createSessionMachine()).start();

  actor.send({ type: 'BOOT_FINISHED' });
  actor.send({ type: 'REQUEST_FEVER_ACTIVATION' });
  assert.equal(actor.getSnapshot().context.isFeverActive, false);

  actor.send({
    type: 'TURN_RESOLVED',
    payload: {
      destroyedBlocksThisTurn: 2,
      feverApplied: false,
      gateTriggeredCount: 0
    }
  });
  actor.send({ type: 'REQUEST_FEVER_ACTIVATION' });

  assert.equal(actor.getSnapshot().context.feverMeter, 0);
  assert.equal(actor.getSnapshot().context.isFeverActive, true);
  assert.equal(actor.getSnapshot().context.activeFeverMode, 'breaker');

  actor.send({
    type: 'TURN_RESOLVED',
    payload: {
      destroyedBlocksThisTurn: 1,
      feverApplied: true,
      gateTriggeredCount: 0
    }
  });

  assert.equal(actor.getSnapshot().context.isFeverActive, false);
  assert.equal(actor.getSnapshot().context.activeFeverMode, null);
  assert.equal(actor.getSnapshot().context.feverMeter, 20);
});

test('session machine escalates ready fever mode by tier before activation', () => {
  const actor = createActor(createSessionMachine()).start();

  actor.send({ type: 'BOOT_FINISHED' });
  actor.send({
    type: 'TURN_RESOLVED',
    payload: {
      destroyedBlocksThisTurn: 4,
      feverApplied: false,
      gateTriggeredCount: 0
    }
  });
  actor.send({ type: 'REQUEST_FEVER_ACTIVATION' });
  assert.equal(actor.getSnapshot().context.activeFeverMode, 'pierce');

  actor.send({
    type: 'TURN_RESOLVED',
    payload: {
      destroyedBlocksThisTurn: 5,
      feverApplied: false,
      gateTriggeredCount: 0
    }
  });
  actor.send({ type: 'REQUEST_FEVER_ACTIVATION' });
  assert.equal(actor.getSnapshot().context.activeFeverMode, 'pulse');
});

test('session machine clears active fever even when the fever phase finds no target', () => {
  const actor = createActor(createSessionMachine()).start();

  actor.send({ type: 'BOOT_FINISHED' });
  actor.send({
    type: 'TURN_RESOLVED',
    payload: {
      destroyedBlocksThisTurn: 4,
      feverApplied: false,
      gateTriggeredCount: 0
    }
  });
  actor.send({ type: 'REQUEST_FEVER_ACTIVATION' });

  assert.equal(actor.getSnapshot().context.isFeverActive, true);
  assert.equal(actor.getSnapshot().context.feverMeter, 0);

  actor.send({
    type: 'TURN_RESOLVED',
    payload: {
      destroyedBlocksThisTurn: 0,
      feverApplied: false,
      gateTriggeredCount: 1
    }
  });

  assert.equal(actor.getSnapshot().context.isFeverActive, false);
  assert.equal(actor.getSnapshot().context.feverMeter, 8);
});
