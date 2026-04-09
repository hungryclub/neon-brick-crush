import test from 'node:test';
import assert from 'node:assert/strict';

import { createActor } from 'xstate';

import { sessionMachine } from '../../state/machines/session.machine.ts';

test('session machine moves from play to failed to retry restore', () => {
  const actor = createActor(sessionMachine).start();

  actor.send({ type: 'BOOT_FINISHED' });
  assert.equal(actor.getSnapshot().matches('playing'), true);

  actor.send({ type: 'STAGE_FAILED' });
  assert.equal(actor.getSnapshot().matches('failed'), true);

  actor.send({ type: 'REQUEST_RETRY' });
  assert.equal(actor.getSnapshot().matches('retrying'), true);
  assert.equal(actor.getSnapshot().context.retryCount, 1);

  actor.send({ type: 'RETRY_RESTORED' });
  assert.equal(actor.getSnapshot().matches('playing'), true);
  assert.equal(actor.getSnapshot().context.retryCount, 1);
});

test('session machine can reset retry count back to baseline', () => {
  const actor = createActor(sessionMachine).start();

  actor.send({ type: 'BOOT_FINISHED' });
  actor.send({ type: 'STAGE_FAILED' });
  actor.send({ type: 'REQUEST_RETRY' });
  actor.send({ type: 'RETRY_RESTORED' });
  actor.send({ type: 'RESET_SESSION' });

  assert.equal(actor.getSnapshot().matches('playing'), true);
  assert.equal(actor.getSnapshot().context.retryCount, 0);
});
