import test from 'node:test';
import assert from 'node:assert/strict';

import createProgressionRepository from '../../platform/persistence/progression.repository.ts';

test('progression repository persists stars and unlocks the next stage', async () => {
  const repository = createProgressionRepository();

  const updatedSnapshot = await repository.saveStageCompletion({
    worldId: 'world-01',
    stageId: 'world-01-stage-01',
    starCount: 3
  });

  assert.equal(updatedSnapshot.stageProgressById['world-01-stage-01'].isCompleted, true);
  assert.equal(updatedSnapshot.stageProgressById['world-01-stage-01'].bestStarCount, 3);
  assert.equal(updatedSnapshot.stageProgressById['world-01-stage-02'].isUnlocked, true);
});
