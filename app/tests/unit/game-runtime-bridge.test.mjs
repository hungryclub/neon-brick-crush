import test from 'node:test';
import assert from 'node:assert/strict';

import createGameRuntimeBridge from '../../game/hud-bridges/game-runtime-bridge.ts';

test('game runtime bridge forwards failure and reset lifecycle signals', () => {
  const runtimeBridge = createGameRuntimeBridge();
  let failedCount = 0;
  let resetRequestedCount = 0;
  let resetCompletedCount = 0;

  runtimeBridge.onStageFailed(() => {
    failedCount += 1;
  });
  runtimeBridge.onStageResetRequested(() => {
    resetRequestedCount += 1;
  });
  runtimeBridge.onStageResetCompleted(() => {
    resetCompletedCount += 1;
  });

  runtimeBridge.signalStageFailed();
  runtimeBridge.requestStageReset();
  runtimeBridge.signalStageResetCompleted();

  assert.equal(failedCount, 1);
  assert.equal(resetRequestedCount, 1);
  assert.equal(resetCompletedCount, 1);
});
