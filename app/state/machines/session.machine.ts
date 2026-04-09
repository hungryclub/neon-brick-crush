import { assign, createActor, setup } from 'xstate';

interface ISessionContext {
  retryCount: number;
}

type TSessionEvent =
  | { type: 'BOOT_FINISHED' }
  | { type: 'STAGE_FAILED' }
  | { type: 'REQUEST_RETRY' }
  | { type: 'RETRY_RESTORED' }
  | { type: 'RESET_SESSION' };

export const sessionMachine = setup({
  types: {
    context: {} as ISessionContext,
    events: {} as TSessionEvent
  },
  actions: {
    incrementRetryCount: assign({
      retryCount: ({ context }) => context.retryCount + 1
    }),
    resetRetryCount: assign({
      retryCount: 0
    })
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
          target: 'playing'
        }
      }
    },
    playing: {
      on: {
        STAGE_FAILED: {
          target: 'failed'
        },
        RESET_SESSION: {
          target: 'playing',
          actions: 'resetRetryCount'
        }
      }
    },
    failed: {
      on: {
        REQUEST_RETRY: {
          target: 'retrying',
          actions: 'incrementRetryCount'
        },
        RESET_SESSION: {
          target: 'playing',
          actions: 'resetRetryCount'
        }
      }
    },
    retrying: {
      on: {
        RETRY_RESTORED: {
          target: 'playing'
        }
      }
    }
  }
});

export const sessionActor = createActor(sessionMachine);
