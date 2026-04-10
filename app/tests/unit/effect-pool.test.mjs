import test from 'node:test';
import assert from 'node:assert/strict';

import { createEffectPool } from '../../game/effects/effect-pool.ts';

test('effect pool rotates leases and invalidates older revisions on reuse', () => {
  const pool = createEffectPool({
    create: () => ({ id: Symbol('effect') }),
    size: 1
  });

  const first = pool.acquire();
  const second = pool.acquire();

  assert.equal(first.resource, second.resource);
  assert.equal(first.isCurrent(), false);
  assert.equal(second.isCurrent(), true);
  assert.equal(first.release(), false);
  assert.equal(second.release(), true);
});
