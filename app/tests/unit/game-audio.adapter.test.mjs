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

test('audio adapter closes an owned audio context during destroy', async () => {
  let closeCallCount = 0;
  const adapter = createGameAudioAdapter({
    audioContextFactory: () => ({
      close: async () => {
        closeCallCount += 1;
      },
      createGain: () => ({
        connect() {},
        disconnect() {},
        gain: {
          exponentialRampToValueAtTime() {},
          setValueAtTime() {}
        }
      }),
      createOscillator: () => ({
        connect() {},
        disconnect() {},
        frequency: { value: 0 },
        start() {},
        stop() {},
        type: 'square'
      }),
      currentTime: 0,
      destination: {},
      state: 'running'
    }),
    vibrate: null
  });

  adapter.destroy();
  await Promise.resolve();

  assert.equal(closeCallCount, 1);
});
