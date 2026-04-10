import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGameAudioAdapter,
  resolveAudioCueSpec,
  resolveHapticPattern
} from '../../platform/audio/game-audio.adapter.ts';

test('audio adapter safely no-ops when audio and haptics are unsupported', () => {
  const adapter = createGameAudioAdapter({
    audioContext: null,
    vibrate: null
  });

  assert.doesNotThrow(() => {
    adapter.playCue('gate-hit');
    adapter.playHaptic('medium');
    adapter.destroy();
  });
});

test('audio cue spec and haptic pattern stay typed and deterministic', () => {
  const comboSpec = resolveAudioCueSpec('combo-burst');
  const hitSpec = resolveAudioCueSpec('block-hit');

  assert.ok(comboSpec.durationMs > hitSpec.durationMs);
  assert.deepEqual(resolveHapticPattern('strong'), [18, 20, 28]);
  assert.deepEqual(resolveHapticPattern('light'), [8]);
});
