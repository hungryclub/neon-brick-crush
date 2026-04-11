import test from 'node:test';
import assert from 'node:assert/strict';

import createGameRuntimeBridge from '../../game/hud-bridges/game-runtime-bridge.ts';

test('game runtime bridge forwards failure and reset lifecycle signals', () => {
  const runtimeBridge = createGameRuntimeBridge();
  let failedCount = 0;
  let clearedCount = 0;
  let resetRequestedCount = 0;
  let resetCompletedCount = 0;
  let turnResolvedPayload = null;
  let feverActivationRequestedCount = 0;

  runtimeBridge.onStageFailed(() => {
    failedCount += 1;
  });
  runtimeBridge.onStageCleared(() => {
    clearedCount += 1;
  });
  runtimeBridge.onStageResetRequested(() => {
    resetRequestedCount += 1;
  });
  runtimeBridge.onStageResetCompleted(() => {
    resetCompletedCount += 1;
  });
  runtimeBridge.onTurnResolved((payload) => {
    turnResolvedPayload = payload;
  });

  runtimeBridge.signalStageFailed();
  runtimeBridge.signalStageCleared();
  runtimeBridge.requestStageReset();
  runtimeBridge.signalStageResetCompleted();
  runtimeBridge.signalTurnResolved({
    directBlockHitsThisTurn: 2,
    destroyedBlocksThisTurn: 3,
    feverApplied: true,
    gateTriggeredCount: 1
  });
  let requestedMode = null;
  runtimeBridge.onFeverActivationRequested((mode) => {
    requestedMode = mode;
    feverActivationRequestedCount += 1;
  });
  runtimeBridge.requestFeverActivation('pulse');

  assert.equal(failedCount, 1);
  assert.equal(clearedCount, 1);
  assert.equal(resetRequestedCount, 1);
  assert.equal(resetCompletedCount, 1);
  assert.deepEqual(turnResolvedPayload, {
    directBlockHitsThisTurn: 2,
    destroyedBlocksThisTurn: 3,
    feverApplied: true,
    gateTriggeredCount: 1
  });
  assert.equal(feverActivationRequestedCount, 1);
  assert.equal(requestedMode, 'pulse');
});
