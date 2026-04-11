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

test('pierce fever marks early durable hits as pass-through hits', () => {
  const result = resolveFeverCollisionBonus({
    activeFeverMode: 'pierce',
    board: [],
    currentHp: 3,
    hitsUsed: 0,
    targetCell: { id: 'cell-p', row: 1, col: 2, hp: 3 }
  });

  assert.equal(result.bonusApplied, true);
  assert.equal(result.nextHp, 0);
  assert.equal(result.pierceThrough, true);
});

test('pulse fever marks the center hit strongly and leaves area targeting to the scene layer', () => {
  const result = resolveFeverCollisionBonus({
    activeFeverMode: 'pulse',
    board: [
      { id: 'center', row: 3, col: 3, hp: 2 },
      { id: 'north', row: 2, col: 3, hp: 1 },
      { id: 'east', row: 3, col: 4, hp: 1 },
      { id: 'diag', row: 2, col: 4, hp: 1 },
      { id: 'chain', row: 1, col: 4, hp: 1 }
    ],
    currentHp: 2,
    hitsUsed: 0,
    targetCell: { id: 'center', row: 3, col: 3, hp: 2 }
  });

  assert.equal(result.bonusApplied, true);
  assert.equal(result.nextHp, 0);
  assert.deepEqual(result.splashTargetIds, []);
  assert.deepEqual(result.chainPulseTargetIds, []);
});

test('tiered fever helpers map meter into ready mode, label, hud value, and tone', () => {
  assert.equal(resolveFeverTier(0), 0);
  assert.equal(resolveFeverTier(45), 1);
  assert.equal(resolveFeverTier(85), 2);
  assert.equal(resolveFeverTier(130), 3);
  assert.equal(resolveReadyFeverMode(45), 'breaker');
  assert.equal(resolveReadyFeverMode(85), 'pierce');
  assert.equal(resolveReadyFeverMode(130), 'pulse');
  assert.equal(
    resolveFeverButtonLabel({ activeMode: null, readyMode: 'breaker' }),
    'Activate Breaker'
  );
  assert.equal(
    resolveFeverHudValue({ activeMode: 'pulse', feverMeter: 130, readyMode: 'pulse' }),
    'PLS'
  );
  assert.equal(
    resolveFeverTone({ activeMode: null, readyMode: 'pierce' }),
    'pierce'
  );
  assert.equal(
    resolveFeverStatusPrompt({ activeMode: null, readyMode: 'pulse' }),
    'Pulse Ready: save this for the densest cluster'
  );
  assert.equal(
    resolveFeverStatusPrompt({ activeMode: 'breaker', readyMode: 'pulse' }),
    'Breaker Active: your next turn smashes durable blocks'
  );
});
