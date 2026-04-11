import test from 'node:test';
import assert from 'node:assert/strict';

import {
  doesCircleIntersectRect,
  resolvePulseBlastTargetIds
} from '../../game/systems/pulse-blast.ts';

test('pulse blast target selection includes blocks whose rectangle overlaps the visible circle', () => {
  const targetIds = resolvePulseBlastTargetIds({
    sourceId: 'center',
    centerX: 100,
    centerY: 100,
    radius: 20,
    candidates: [
      { id: 'center', x: 100, y: 100, width: 20, height: 20, hp: 2 },
      { id: 'edge-overlap', x: 128, y: 100, width: 20, height: 20, hp: 1 },
      { id: 'outside', x: 141, y: 100, width: 20, height: 20, hp: 3 }
    ]
  });

  assert.deepEqual(targetIds, ['edge-overlap']);
});

test('circle-rectangle overlap works even when the block center sits outside the radius', () => {
  assert.equal(
    doesCircleIntersectRect({
      centerX: 100,
      centerY: 100,
      radius: 20,
      rectCenterX: 128,
      rectCenterY: 100,
      rectWidth: 20,
      rectHeight: 20
    }),
    true
  );

  assert.equal(
    doesCircleIntersectRect({
      centerX: 100,
      centerY: 100,
      radius: 20,
      rectCenterX: 141,
      rectCenterY: 100,
      rectWidth: 20,
      rectHeight: 20
    }),
    false
  );
});
