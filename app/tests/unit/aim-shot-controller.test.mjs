import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveAimPreview,
  resolveShotVelocity
} from '../../game/mechanics/aim-shot-controller.ts';

test('resolveAimPreview clamps aim to an upward shot lane', () => {
  const preview = resolveAimPreview(
    { x: 200, y: 500 },
    { x: 240, y: 560 }
  );

  assert.equal(preview.pointer.y, 484);
  assert.equal(preview.isValid, true);
});

test('resolveShotVelocity returns null for tiny aim drags', () => {
  const velocity = resolveShotVelocity(
    { x: 100, y: 200 },
    { x: 110, y: 188 }
  );

  assert.equal(velocity, null);
});

test('resolveShotVelocity returns an upward launch vector for valid shots', () => {
  const velocity = resolveShotVelocity(
    { x: 100, y: 200 },
    { x: 160, y: 80 }
  );

  assert.ok(velocity);
  assert.ok(velocity.x > 0);
  assert.ok(velocity.y < 0);
});
