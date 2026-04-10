import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createImpactVisualCommand,
  createNeonVisualPlan
} from '../../game/effects/neon-feedback-plan.ts';

test('neon visual plan keeps visual-only playback commands in order', () => {
  const visualPlan = createNeonVisualPlan([
    { type: 'gate-pulse', gateId: 'gate-a' },
    { type: 'camera-flash', duration: 200, color: [255, 120, 180] },
    { type: 'haptic-pulse', intensity: 'strong' },
    { type: 'sfx-cue', cue: 'combo-burst' },
    { type: 'camera-shake', duration: 160, intensity: 0.004 }
  ]);

  assert.deepEqual(
    visualPlan.map((command) => command.type),
    ['gate-halo', 'screen-flash', 'camera-shake']
  );
});

test('impact visual command escalates destroyed hits over baseline hits', () => {
  const intact = createImpactVisualCommand({
    x: 10,
    y: 20,
    destroyed: false
  });
  const destroyed = createImpactVisualCommand({
    x: 10,
    y: 20,
    destroyed: true
  });

  assert.equal(intact.type, 'impact-ring');
  assert.equal(destroyed.type, 'impact-ring');
  assert.ok(destroyed.endRadius > intact.endRadius);
  assert.ok(destroyed.duration > intact.duration);
});
