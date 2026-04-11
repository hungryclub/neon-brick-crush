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
        affectedCellIds: ['block-z', 'block-y', 'block-x'],
        bonusHits: 3,
        mode: 'pulse'
      }
    ]
  });

  assert.equal(plan.branch, 'gate-fever-combo');
  assert.deepEqual(
    plan.commands.map((command) => command.type),
    ['gate-pulse', 'camera-flash', 'camera-shake', 'haptic-pulse', 'camera-flash', 'sfx-cue']
  );
});

test('turn feedback emitter gives fever-only turns a stronger overdrive plan', () => {
  const plan = createTurnFeedbackPlan({
    branch: 'fever-only',
    feedbackEvents: [
      {
        type: 'fever.activated',
        affectedCellIds: ['block-a', 'block-b'],
        bonusHits: 2,
        mode: 'breaker'
      }
    ]
  });

  assert.deepEqual(
    plan.commands.map((command) => command.type),
    ['camera-flash', 'camera-shake', 'haptic-pulse', 'sfx-cue']
  );
});
