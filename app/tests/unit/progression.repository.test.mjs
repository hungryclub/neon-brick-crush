import test from 'node:test';
import assert from 'node:assert/strict';

import createProgressionRepository, {
  resetProgressionSnapshotForTests
} from '../../platform/persistence/progression.repository.ts';
import { PROGRESSION_SAVE_SCHEMA_VERSION } from '../../platform/persistence/save-recovery.ts';

test('progression repository persists stars and unlocks the next stage', async () => {
  resetProgressionSnapshotForTests();
  const repository = createProgressionRepository();

  const updatedSnapshotResult = await repository.saveStageCompletion({
    worldId: 'world-01',
    stageId: 'world-01-stage-01',
    starCount: 3
  });
  const updatedSnapshot = updatedSnapshotResult._unsafeUnwrap();

  assert.equal(updatedSnapshot.stageProgressById['world-01-stage-01'].isCompleted, true);
  assert.equal(updatedSnapshot.stageProgressById['world-01-stage-01'].bestStarCount, 3);
  assert.equal(updatedSnapshot.stageProgressById['world-01-stage-02'].isUnlocked, true);
  assert.equal(updatedSnapshot.playerLevel, 2);
  assert.equal(updatedSnapshot.totalXp, 175);
  assert.equal(updatedSnapshot.version, PROGRESSION_SAVE_SCHEMA_VERSION);
});

test('progression repository unlocks challenge and climax together from the normal path', async () => {
  resetProgressionSnapshotForTests();
  const repository = createProgressionRepository();

  const updatedSnapshot = (
    await repository.saveStageCompletion({
      worldId: 'world-01',
      stageId: 'world-01-stage-02',
      starCount: 2
    })
  )._unsafeUnwrap();

  assert.equal(updatedSnapshot.stageProgressById['world-01-stage-03'].isUnlocked, true);
  assert.equal(updatedSnapshot.stageProgressById['world-01-stage-04'].isUnlocked, true);
});

test('progression repository unlocks the next world when a climax stage is cleared', async () => {
  resetProgressionSnapshotForTests();
  const repository = createProgressionRepository();

  const updatedSnapshot = (
    await repository.saveStageCompletion({
      worldId: 'world-01',
      stageId: 'world-01-stage-04',
      starCount: 2
    })
  )._unsafeUnwrap();

  assert.equal(updatedSnapshot.unlockedWorldIdList.includes('world-02'), true);
  assert.equal(updatedSnapshot.stageProgressById['world-02-stage-01'].isUnlocked, true);
  assert.equal(updatedSnapshot.stageProgressById['world-01-stage-04'].bestStarCount, 2);
  assert.equal(updatedSnapshot.stageProgressById['world-01-stage-04'].isCompleted, true);
});

test('progression repository does not treat challenge clears as the required unlock gate', async () => {
  resetProgressionSnapshotForTests();
  const repository = createProgressionRepository();

  const updatedSnapshot = (
    await repository.saveStageCompletion({
      worldId: 'world-01',
      stageId: 'world-01-stage-03',
      starCount: 3
    })
  )._unsafeUnwrap();

  assert.equal(updatedSnapshot.unlockedWorldIdList.includes('world-02'), false);
  assert.equal(updatedSnapshot.stageProgressById['world-01-stage-03'].isCompleted, true);
});

test('progression repository unlock fallback does not copy completion or stars onto a new stage', async () => {
  resetProgressionSnapshotForTests();
  const repository = createProgressionRepository();

  await repository.saveStageCompletion({
    worldId: 'world-01',
    stageId: 'world-01-stage-04',
    starCount: 2
  });

  const updatedSnapshot = (
    await repository.saveStageCompletion({
      worldId: 'world-02',
      stageId: 'world-02-stage-01',
      starCount: 3
    })
  )._unsafeUnwrap();

  assert.deepEqual(updatedSnapshot.stageProgressById['world-02-stage-02'], {
    bestStarCount: 0,
    isCompleted: false,
    isUnlocked: true
  });
});

test('progression repository persists settings through the same save envelope', async () => {
  resetProgressionSnapshotForTests();
  const repository = createProgressionRepository();

  const savedSnapshot = (
    await repository.saveSettings({
      isReducedMotionEnabled: true,
      isSfxEnabled: false
    })
  )._unsafeUnwrap();
  const loadedSnapshot = (await repository.load())._unsafeUnwrap();

  assert.equal(savedSnapshot.settings.isReducedMotionEnabled, true);
  assert.equal(savedSnapshot.settings.isSfxEnabled, false);
  assert.equal(loadedSnapshot.settings.isReducedMotionEnabled, true);
  assert.equal(loadedSnapshot.settings.isSfxEnabled, false);
  assert.equal(loadedSnapshot.version, PROGRESSION_SAVE_SCHEMA_VERSION);
});

test('progression repository returns a typed load error and recovers to defaults for invalid payloads', async () => {
  resetProgressionSnapshotForTests();
  const repository = createProgressionRepository({
    storageDriver: {
      async read() {
        return {
          isErr: () => false,
          isOk: () => true,
          value: '{"schemaVersion":1,"progression":{}}'
        };
      },
      async write() {
        return {
          isErr: () => false,
          isOk: () => true,
          value: undefined
        };
      }
    }
  });

  const loadResult = await repository.load();

  assert.equal(loadResult.isErr(), true);
  assert.equal(loadResult._unsafeUnwrapErr().code, 'SAVE_LOAD_FAILED');
});
