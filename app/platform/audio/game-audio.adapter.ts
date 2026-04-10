import createLogger from '../../shared/logging/create-logger.ts';

export type TGameAudioCue =
  | 'gate-hit'
  | 'fever-hit'
  | 'combo-burst'
  | 'block-hit'
  | 'block-break';

export type THapticIntensity = 'light' | 'medium' | 'strong';

interface IOscillatorLike {
  connect(node: unknown): void;
  disconnect(): void;
  frequency: { value: number };
  type: OscillatorType;
  start(time?: number): void;
  stop(time?: number): void;
}

interface IGainNodeLike {
  connect(node: unknown): void;
  disconnect(): void;
  gain: {
    setValueAtTime(value: number, time: number): void;
    exponentialRampToValueAtTime(value: number, time: number): void;
  };
}

export interface IAudioContextLike {
  currentTime: number;
  destination: unknown;
  state?: string;
  createOscillator(): IOscillatorLike;
  createGain(): IGainNodeLike;
  resume?: () => Promise<void>;
}

type TVibrateHandler = (pattern: number | number[]) => boolean;

export interface IGameAudioAdapter {
  playCue(cue: TGameAudioCue): void;
  playHaptic(intensity: THapticIntensity): void;
  destroy(): void;
}

export function resolveAudioCueSpec(cue: TGameAudioCue) {
  if (cue === 'combo-burst') {
    return { frequency: 240, durationMs: 180, gain: 0.048, type: 'sawtooth' as const };
  }

  if (cue === 'fever-hit') {
    return { frequency: 420, durationMs: 140, gain: 0.036, type: 'triangle' as const };
  }

  if (cue === 'gate-hit') {
    return { frequency: 520, durationMs: 90, gain: 0.026, type: 'square' as const };
  }

  if (cue === 'block-break') {
    return { frequency: 320, durationMs: 110, gain: 0.03, type: 'triangle' as const };
  }

  return { frequency: 660, durationMs: 55, gain: 0.018, type: 'square' as const };
}

export function resolveHapticPattern(intensity: THapticIntensity) {
  if (intensity === 'strong') {
    return [18, 20, 28];
  }

  if (intensity === 'medium') {
    return [16];
  }

  return [8];
}

export function createGameAudioAdapter({
  audioContext = resolveDefaultAudioContext(),
  vibrate = resolveDefaultVibrate(),
  logger = createLogger()
}: {
  audioContext?: IAudioContextLike | null;
  vibrate?: TVibrateHandler | null;
  logger?: ReturnType<typeof createLogger>;
} = {}): IGameAudioAdapter {
  return {
    playCue(cue) {
      if (!audioContext) {
        logger.info('audio.cue_skipped', { cue, reason: 'unsupported' });
        return;
      }

      const spec = resolveAudioCueSpec(cue);
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const startedAt = audioContext.currentTime;
      const stopAt = startedAt + spec.durationMs / 1000;

      if (audioContext.state === 'suspended') {
        void audioContext.resume?.();
      }

      oscillator.type = spec.type;
      oscillator.frequency.value = spec.frequency;
      gainNode.gain.setValueAtTime(spec.gain, startedAt);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(startedAt);
      oscillator.stop(stopAt);
    },
    playHaptic(intensity) {
      if (!vibrate) {
        logger.info('audio.haptic_skipped', { intensity, reason: 'unsupported' });
        return;
      }

      vibrate(resolveHapticPattern(intensity));
    },
    destroy() {
      logger.info('audio.adapter_destroyed');
    }
  };
}

function resolveDefaultAudioContext(): IAudioContextLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextCtor = window.AudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  return new AudioContextCtor();
}

function resolveDefaultVibrate(): TVibrateHandler | null {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return null;
  }

  return (pattern) => navigator.vibrate(pattern);
}
