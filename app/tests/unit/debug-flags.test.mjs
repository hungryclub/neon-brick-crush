import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDebugBuildFlag } from '../../debug/debug-flags.ts';

test('debug build flag resolves explicit dev environment values', () => {
  assert.equal(resolveDebugBuildFlag({ DEV: true }), true);
  assert.equal(resolveDebugBuildFlag({ DEV: false }), false);
  assert.equal(resolveDebugBuildFlag(undefined), false);
});
