import test from 'node:test';
import assert from 'node:assert/strict';

import { createTurnFeedbackPlan } from '../../game/effects/turn-feedback-emitter.ts';

test('turn feedback emitter escalates combo moments through dedicated commands', () => {
  const plan = createTurnFeedbackPlan({
    branch: 'gate-fever-combo',
    feedbackEvents: [
      {
        type: 'gate.triggered',
        gateId: 'gate-a',
        gateKind: 'spawn-clear',
        affectedCellId: 'spawn-b'
      },
      {
        type: 'fever.activated',
        affectedCellId: 'block-z'
      }
    ]
  });

  assert.equal(plan.branch, 'gate-fever-combo');
  assert.deepEqual(
    plan.commands.map((command) => command.type),
    ['gate-pulse', 'camera-flash', 'camera-shake', 'haptic-pulse', 'sfx-cue']
  );
});
