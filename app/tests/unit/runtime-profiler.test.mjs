import test from 'node:test';
import assert from 'node:assert/strict';

import { createRuntimeProfiler } from '../../game/perf/runtime-profiler.ts';

test('runtime profiler aggregates counters and measured timings into a structured snapshot', () => {
  const logs = [];
  let ticks = [10, 15, 20, 29];
  const profiler = createRuntimeProfiler({
    logger: {
      info(event, context) {
        logs.push({ event, context });
      }
    },
    now: () => ticks.shift() ?? 29
  });

  profiler.incrementCounter('impact_visual_played', 2);
  profiler.measure('feedback.playback_ms', () => 'ok');
  profiler.measure('turn.resolve_ms', () => 'done');
  profiler.flush('stage.turn_profiled', { turnNumber: 3 });

  assert.deepEqual(profiler.snapshot().counters, {
    impact_visual_played: 2
  });
  assert.deepEqual(profiler.snapshot().samples, {
    'feedback.playback_ms': { count: 1, totalMs: 5 },
    'turn.resolve_ms': { count: 1, totalMs: 9 }
  });
  assert.equal(logs[0].event, 'stage.turn_profiled');
  assert.equal(logs[0].context.turnNumber, 3);
});
