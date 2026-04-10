import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PROGRESSION_SAVE_SCHEMA_VERSION,
  createInitialProgressionSnapshot,
  createProgressionSaveEnvelope,
  parseProgressionSaveEnvelope
} from '../../platform/persistence/save-recovery.ts';

test('save recovery accepts a schema-versioned progression envelope', () => {
  const raw = JSON.stringify(createProgressionSaveEnvelope(createInitialProgressionSnapshot()));
  const result = parseProgressionSaveEnvelope(raw);

  assert.equal(result.isOk(), true);
  assert.equal(result._unsafeUnwrap().schemaVersion, PROGRESSION_SAVE_SCHEMA_VERSION);
  assert.equal(result._unsafeUnwrap().progression.playerLevel, 1);
});

test('save recovery returns a typed error for corrupted payloads', () => {
  const result = parseProgressionSaveEnvelope('{not-json');

  assert.equal(result.isErr(), true);
  assert.equal(result._unsafeUnwrapErr().code, 'SAVE_LOAD_FAILED');
});

test('save recovery returns a typed error for invalid schema payloads', () => {
  const result = parseProgressionSaveEnvelope(
    JSON.stringify({
      schemaVersion: 999,
      progression: {}
    })
  );

  assert.equal(result.isErr(), true);
  assert.equal(result._unsafeUnwrapErr().code, 'SAVE_LOAD_FAILED');
});

test('save recovery backfills missing event claim state for older payloads', () => {
  const result = parseProgressionSaveEnvelope(
    JSON.stringify({
      schemaVersion: PROGRESSION_SAVE_SCHEMA_VERSION,
      progression: {
        version: PROGRESSION_SAVE_SCHEMA_VERSION,
        playerLevel: 2,
        totalXp: 175,
        settings: {
          isReducedMotionEnabled: false,
          isSfxEnabled: true,
          isTutorialHintsEnabled: true
        },
        unlockedWorldIdList: ['world-01'],
        stageProgressById: {
          'world-01-stage-01': {
            bestStarCount: 1,
            isCompleted: true,
            isUnlocked: true
          }
        },
        lastPlayedStageSelection: {
          worldId: 'world-01',
          stageId: 'world-01-stage-01'
        }
      }
    })
  );

  assert.equal(result.isOk(), true);
  assert.deepEqual(result._unsafeUnwrap().progression.eventClaimStateById, {});
});
