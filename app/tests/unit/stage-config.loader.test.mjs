import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_STAGE_SELECTION,
  loadAllWorldContent,
  loadInitialStageRuntimeConfig,
  loadStageRuntimeConfig,
  loadWorldContent
} from '../../assets/loaders/stage-config.loader.ts';
import { STAGE_CONFIG_NOT_FOUND } from '../../domain/errors/game-error.ts';
import {
  createInitialStageBoard,
  createSpawnRow
} from '../../game/entities/stage-board.ts';

test('stage config loader returns normalized runtime config for the default stage', () => {
  const result = loadInitialStageRuntimeConfig();

  assert.equal(result.isOk(), true);

  const stageRuntimeConfig = result._unsafeUnwrap();

  assert.deepEqual(stageRuntimeConfig.worldId, DEFAULT_STAGE_SELECTION.worldId);
  assert.deepEqual(stageRuntimeConfig.stageId, DEFAULT_STAGE_SELECTION.stageId);
  assert.equal(stageRuntimeConfig.stageKind, 'tutorial');
  assert.equal(stageRuntimeConfig.boardColumns, 7);
  assert.deepEqual(stageRuntimeConfig.assetBundleIds, [
    'world-01-core',
    'stage-01-board',
    'stage-01-ui'
  ]);
});

test('stage config loader supports challenge and climax stage kinds', () => {
  const challengeStageResult = loadStageRuntimeConfig({
    worldId: 'world-01',
    stageId: 'world-01-stage-03'
  });
  const climaxStageResult = loadStageRuntimeConfig({
    worldId: 'world-01',
    stageId: 'world-01-stage-04'
  });

  assert.equal(challengeStageResult.isOk(), true);
  assert.equal(climaxStageResult.isOk(), true);
  assert.equal(challengeStageResult._unsafeUnwrap().stageKind, 'challenge');
  assert.equal(climaxStageResult._unsafeUnwrap().stageKind, 'climax');
  assert.equal(challengeStageResult._unsafeUnwrap().rulesProfile.lossRowBufferRows, 1);
  assert.equal(
    climaxStageResult._unsafeUnwrap().unlockProfile.nextWorldIdToUnlock,
    'world-02'
  );
});

test('stage config loader projects typed stage presentation profiles', () => {
  const tutorialStage = loadStageRuntimeConfig({
    worldId: 'world-01',
    stageId: 'world-01-stage-01'
  })._unsafeUnwrap();
  const normalStage = loadStageRuntimeConfig({
    worldId: 'world-01',
    stageId: 'world-01-stage-02'
  })._unsafeUnwrap();
  const challengeStage = loadStageRuntimeConfig({
    worldId: 'world-01',
    stageId: 'world-01-stage-03'
  })._unsafeUnwrap();
  const worldList = loadAllWorldContent()._unsafeUnwrap();

  assert.equal(tutorialStage.presentationProfile.shellLabel, 'Tutorial Stage');
  assert.equal(tutorialStage.presentationProfile.teachByPlayCueList.length >= 2, true);
  assert.equal(tutorialStage.rulesProfile.gateLayout, 'training');
  assert.deepEqual(normalStage.unlockProfile.stageIdsToUnlockOnClear, [
    'world-01-stage-03',
    'world-01-stage-04'
  ]);
  assert.deepEqual(challengeStage.unlockProfile.stageIdsToUnlockOnClear, []);
  assert.equal(worldList.some((world) => world.id === 'world-02'), true);
});

test('stage config loader returns a typed error when stage content is missing', () => {
  const result = loadStageRuntimeConfig({
    worldId: 'world-01',
    stageId: 'missing-stage'
  });

  assert.equal(result.isErr(), true);
  assert.equal(result._unsafeUnwrapErr().code, STAGE_CONFIG_NOT_FOUND);
});

test('runtime board creation only needs normalized stage config from the loader', () => {
  const stageRuntimeConfig = loadInitialStageRuntimeConfig()._unsafeUnwrap();
  const worldContent = loadWorldContent(stageRuntimeConfig.worldId)._unsafeUnwrap();

  const initialBoard = createInitialStageBoard(stageRuntimeConfig);
  const spawnedBoardRow = createSpawnRow(2, stageRuntimeConfig);

  assert.equal(worldContent.stageIds.includes(stageRuntimeConfig.stageId), true);
  assert.equal(initialBoard.length > 0, true);
  assert.equal(spawnedBoardRow.length > 0, true);
  assert.equal(initialBoard.every((cell) => cell.col < stageRuntimeConfig.boardColumns), true);
  assert.equal(spawnedBoardRow.every((cell) => cell.row === 0), true);
});
