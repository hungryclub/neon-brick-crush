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
