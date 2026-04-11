import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FEVER_COLLISION_BONUS_HIT_LIMIT,
  resolveFeverCollisionBonus
} from '../../game/systems/fever-overdrive.ts';

test('fever collision bonus instantly finishes durable blocks during the first three fever hits', () => {
  const result = resolveFeverCollisionBonus({
    currentHp: 3,
    hitsUsed: 1,
    isFeverActive: true
  });

  assert.equal(result.bonusApplied, true);
  assert.equal(result.nextHp, 0);
  assert.equal(result.hitsUsed, 2);
});

test('fever collision bonus stops after the configured overdrive limit', () => {
  const result = resolveFeverCollisionBonus({
    currentHp: 4,
    hitsUsed: FEVER_COLLISION_BONUS_HIT_LIMIT,
    isFeverActive: true
  });

  assert.equal(result.bonusApplied, false);
  assert.equal(result.nextHp, 3);
  assert.equal(result.hitsUsed, FEVER_COLLISION_BONUS_HIT_LIMIT);
});
