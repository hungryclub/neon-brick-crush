import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FEVER_COLLISION_BONUS_HIT_LIMIT,
  resolveFeverButtonLabel,
  resolveFeverCollisionBonus,
  resolveFeverHudValue,
  resolveFeverStatusPrompt,
  resolveFeverTier,
  resolveFeverTone,
  resolveReadyFeverMode
} from '../../game/systems/fever-overdrive.ts';

test('fever collision bonus instantly finishes durable blocks during the first three fever hits', () => {
  const result = resolveFeverCollisionBonus({
    activeFeverMode: 'breaker',
    board: [],
    currentHp: 3,
    hitsUsed: 1,
    targetCell: { id: 'cell-a', row: 1, col: 1, hp: 3 }
  });

  assert.equal(result.bonusApplied, true);
  assert.equal(result.nextHp, 0);
  assert.equal(result.hitsUsed, 2);
});

test('fever collision bonus stops after the configured overdrive limit', () => {
  const result = resolveFeverCollisionBonus({
    activeFeverMode: 'breaker',
    board: [],
    currentHp: 4,
    hitsUsed: FEVER_COLLISION_BONUS_HIT_LIMIT.breaker,
    targetCell: { id: 'cell-a', row: 1, col: 1, hp: 4 }
  });

  assert.equal(result.bonusApplied, false);
  assert.equal(result.nextHp, 3);
  assert.equal(result.hitsUsed, FEVER_COLLISION_BONUS_HIT_LIMIT.breaker);
});

test('tiered fever helpers map meter into ready mode, label, hud value, and tone', () => {
  assert.equal(resolveFeverTier(0), 0);
  assert.equal(resolveFeverTier(35), 1);
  assert.equal(resolveFeverTier(70), 2);
  assert.equal(resolveFeverTier(100), 3);
  assert.equal(resolveReadyFeverMode(35), 'breaker');
  assert.equal(resolveReadyFeverMode(70), 'pierce');
  assert.equal(resolveReadyFeverMode(100), 'pulse');
  assert.equal(
    resolveFeverButtonLabel({ activeMode: null, readyMode: 'breaker' }),
    'Activate Breaker'
  );
  assert.equal(
    resolveFeverHudValue({ activeMode: 'pulse', feverMeter: 100, readyMode: 'pulse' }),
    'PLS'
  );
  assert.equal(
    resolveFeverTone({ activeMode: null, readyMode: 'pierce' }),
    'pierce'
  );
  assert.equal(
    resolveFeverStatusPrompt({ activeMode: null, readyMode: 'pulse' }),
    'Pulse Ready: save this for dense clusters'
  );
  assert.equal(
    resolveFeverStatusPrompt({ activeMode: 'breaker', readyMode: 'pulse' }),
    'Breaker Active: your next turn smashes durable blocks'
  );
});
