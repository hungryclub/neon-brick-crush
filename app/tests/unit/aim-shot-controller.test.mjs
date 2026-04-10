import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canStartAim,
  resolveAimPreview,
  resolveShotVelocity
} from '../../game/mechanics/aim-shot-controller.ts';

test('canStartAim allows drag starts from the playable lane above the launcher', () => {
  assert.equal(
    canStartAim(
      { x: 200, y: 500 },
      { x: 40, y: 320 }
    ),
    true
  );
  assert.equal(
    canStartAim(
      { x: 200, y: 500 },
      { x: 200, y: 530 }
    ),
    false
  );
});

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
