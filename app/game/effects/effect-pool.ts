export interface IEffectPoolLease<TValue> {
  isCurrent(): boolean;
  release(): boolean;
  resource: TValue;
  revision: number;
}

export interface IEffectPoolEntry<TValue> {
  active: boolean;
  resource: TValue;
  revision: number;
}

export interface IEffectPool<TValue> {
  acquire(): IEffectPoolLease<TValue>;
  entries(): IEffectPoolEntry<TValue>[];
}

export function createEffectPool<TValue>({
  create,
  size
}: {
  create: () => TValue;
  size: number;
}): IEffectPool<TValue> {
  const entries = Array.from({ length: size }, (): IEffectPoolEntry<TValue> => ({
    active: false,
    resource: create(),
    revision: 0
  }));
  let cursor = 0;

  return {
    acquire() {
      const entry = entries[cursor];
      cursor = (cursor + 1) % entries.length;
      entry.active = true;
      entry.revision += 1;
      const currentRevision = entry.revision;

      return {
        isCurrent: () => entry.revision === currentRevision,
        release: () => {
          if (entry.revision !== currentRevision) {
            return false;
          }

          entry.active = false;
          return true;
        },
        resource: entry.resource,
        revision: currentRevision
      };
    },
    entries() {
      return entries;
    }
  };
}
