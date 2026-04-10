import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDebugSimulationState,
  resetDebugSimulationStateForTests
} from '../../debug/debug-command-bus.ts';

test('debug command bus exposes a stable default simulation snapshot', () => {
  resetDebugSimulationStateForTests();

  assert.deepEqual(getDebugSimulationState(), {
    purchaseMode: 'live',
    rewardedAdMode: 'live'
  });
});
