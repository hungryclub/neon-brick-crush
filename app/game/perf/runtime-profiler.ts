interface IRuntimeProfilerLogger {
  info(event: string, context?: Record<string, unknown>): void;
}

interface ISampleTotals {
  count: number;
  totalMs: number;
}

export interface IRuntimeProfilerSnapshot {
  counters: Record<string, number>;
  samples: Record<string, ISampleTotals>;
}

export interface IRuntimeProfiler {
  incrementCounter(name: string, amount?: number): void;
  measure<TValue>(name: string, run: () => TValue): TValue;
  reset(): void;
  snapshot(): IRuntimeProfilerSnapshot;
  flush(event: string, context?: Record<string, unknown>): void;
}

export function createRuntimeProfiler({
  logger,
  now = defaultNow
}: {
  logger: IRuntimeProfilerLogger;
  now?: () => number;
}): IRuntimeProfiler {
  let counters: Record<string, number> = {};
  let samples: Record<string, ISampleTotals> = {};

  return {
    incrementCounter(name, amount = 1) {
      counters[name] = (counters[name] ?? 0) + amount;
    },
    measure(name, run) {
      const startedAt = now();

      try {
        return run();
      } finally {
        const durationMs = roundMs(now() - startedAt);
        const sample = samples[name] ?? {
          count: 0,
          totalMs: 0
        };
        sample.count += 1;
        sample.totalMs = roundMs(sample.totalMs + durationMs);
        samples[name] = sample;
      }
    },
    reset() {
      counters = {};
      samples = {};
    },
    snapshot() {
      return {
        counters: { ...counters },
        samples: Object.fromEntries(
          Object.entries(samples).map(([name, sample]) => [
            name,
            {
              count: sample.count,
              totalMs: roundMs(sample.totalMs)
            }
          ])
        )
      };
    },
    flush(event, context = {}) {
      const snapshot = this.snapshot();
      logger.info(event, {
        ...context,
        counters: snapshot.counters,
        samples: snapshot.samples
      });
    }
  };
}

function defaultNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
}
