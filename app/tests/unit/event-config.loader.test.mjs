import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadActiveEventConfigs,
  loadEventConfigById
} from '../../assets/loaders/event-config.loader.ts';

test('event config loader returns active event definitions', () => {
  const result = loadActiveEventConfigs(new Date('2026-04-10T12:00:00.000Z'));
  const definitions = result._unsafeUnwrap();

  assert.equal(definitions.length, 1);
  assert.equal(definitions[0].id, 'event-neon-kickoff');
  assert.equal(definitions[0].reward.xpAmount, 250);
});

test('event config loader returns a typed error for missing definitions', () => {
  const result = loadEventConfigById('missing-event');

  assert.equal(result.isErr(), true);
  assert.equal(result._unsafeUnwrapErr().code, 'EVENT_CONFIG_NOT_FOUND');
});
