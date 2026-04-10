import type { Result } from 'neverthrow';

import type { IGameError } from '../../../domain/errors/game-error.ts';
import { SAVE_LOAD_FAILED } from '../../../domain/errors/game-error.ts';
import { err, ok } from '../../../shared/result/result.ts';

const DATABASE_NAME = 'neo-brick-crush';
const OBJECT_STORE_NAME = 'progression';
const RECORD_KEY = 'main';

let inMemoryRawSave: string | null = null;

export interface IProgressionStorageDriver {
  read: () => Promise<Result<string | null, IGameError>>;
  write: (raw: string) => Promise<Result<void, IGameError>>;
}

export function resetInMemoryProgressionStorageForTests() {
  inMemoryRawSave = null;
}

export default function createProgressionStorageDriver(): IProgressionStorageDriver {
  if (typeof indexedDB === 'undefined') {
    return {
      async read() {
        return ok(inMemoryRawSave);
      },
      async write(raw) {
        inMemoryRawSave = raw;
        return ok(undefined);
      }
    };
  }

  return {
    async read() {
      try {
        const database = await openDatabase();

        return await new Promise((resolve) => {
          const transaction = database.transaction(OBJECT_STORE_NAME, 'readonly');
          const request = transaction.objectStore(OBJECT_STORE_NAME).get(RECORD_KEY);

          request.onsuccess = () => {
            resolve(ok((request.result as string | undefined) ?? null));
          };
          request.onerror = () => {
            resolve(
              err({
                code: SAVE_LOAD_FAILED,
                message: 'IndexedDB progression save could not be read.'
              })
            );
          };
        });
      } catch {
        return err({
          code: SAVE_LOAD_FAILED,
          message: 'IndexedDB progression save could not be opened.'
        });
      }
    },
    async write(raw) {
      try {
        const database = await openDatabase();

        return await new Promise((resolve) => {
          const transaction = database.transaction(OBJECT_STORE_NAME, 'readwrite');
          const request = transaction.objectStore(OBJECT_STORE_NAME).put(raw, RECORD_KEY);

          request.onsuccess = () => {
            resolve(ok(undefined));
          };
          request.onerror = () => {
            resolve(
              err({
                code: SAVE_LOAD_FAILED,
                message: 'IndexedDB progression save could not be written.'
              })
            );
          };
        });
      } catch {
        return err({
          code: SAVE_LOAD_FAILED,
          message: 'IndexedDB progression save could not be opened for writing.'
        });
      }
    }
  };
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        database.createObjectStore(OBJECT_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
