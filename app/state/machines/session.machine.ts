import { createActor, setup } from 'xstate';

interface ISessionContext {
  retryCount: number;
}

type TSessionEvent =
  | { type: 'BOOT_FINISHED' }
  | { type: 'STAGE_FAILED' }
  | { type: 'REQUEST_RETRY' }
  | { type: 'RESET_SESSION' };

export const sessionMachine = setup({
  types: {
    context: {} as ISessionContext,
    events: {} as TSessionEvent
  }
}).createMachine({
  id: 'session',
  initial: 'booting',
  context: {
    retryCount: 0
  },
  states: {
    booting: {
      on: {
        BOOT_FINISHED: {
          target: 'ready'
        }
      }
    },
    ready: {
      on: {
        STAGE_FAILED: {
          target: 'failed'
        }
      }
    },
    failed: {
      on: {
        REQUEST_RETRY: {
          target: 'ready'
        },
        RESET_SESSION: {
          target: 'ready'
        }
      }
    }
  }
});

export const sessionActor = createActor(sessionMachine);
