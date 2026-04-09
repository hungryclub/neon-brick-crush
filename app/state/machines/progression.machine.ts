import { assign, createActor, setup } from 'xstate';

import type {
  IProgressionSnapshot,
  IStageCompletionRecord
} from '../../domain/models/progression-model';
import type { IStageSelection } from '../../domain/models/stage-model';

interface IProgressionContext {
  activeStageSelection: IStageSelection | null;
  lastStageCompletion: IStageCompletionRecord | null;
  snapshot: IProgressionSnapshot | null;
}

type TProgressionEvent =
  | { type: 'PROGRESSION_LOADED'; snapshot: IProgressionSnapshot }
  | { type: 'SELECT_STAGE'; selection: IStageSelection }
  | { type: 'STAGE_COMPLETED'; snapshot: IProgressionSnapshot; record: IStageCompletionRecord }
  | { type: 'RETURN_TO_MAP' };

export const progressionMachine = setup({
  types: {
    context: {} as IProgressionContext,
    events: {} as TProgressionEvent
  },
  actions: {
    applyLoadedSnapshot: assign({
      snapshot: ({ event }) => (event.type === 'PROGRESSION_LOADED' ? event.snapshot : null),
      activeStageSelection: ({ event }) =>
        event.type === 'PROGRESSION_LOADED' ? event.snapshot.lastPlayedStageSelection : null
    }),
    applySelectedStage: assign({
      activeStageSelection: ({ context, event }) =>
        event.type === 'SELECT_STAGE' ? event.selection : context.activeStageSelection,
      snapshot: ({ context, event }) => {
        if (event.type !== 'SELECT_STAGE' || !context.snapshot) {
          return context.snapshot;
        }

        return {
          ...context.snapshot,
          lastPlayedStageSelection: event.selection
        };
      },
      lastStageCompletion: null
    }),
    applyCompletedStage: assign({
      snapshot: ({ context, event }) =>
        event.type === 'STAGE_COMPLETED' ? event.snapshot : context.snapshot,
      lastStageCompletion: ({ context, event }) =>
        event.type === 'STAGE_COMPLETED' ? event.record : context.lastStageCompletion
    }),
    clearCompletionBanner: assign({
      lastStageCompletion: null
    })
  }
}).createMachine({
  id: 'progression',
  initial: 'loading',
  context: {
    activeStageSelection: null,
    lastStageCompletion: null,
    snapshot: null
  },
  states: {
    loading: {
      on: {
        PROGRESSION_LOADED: {
          target: 'ready',
          actions: 'applyLoadedSnapshot'
        }
      }
    },
    ready: {
      on: {
        SELECT_STAGE: {
          actions: 'applySelectedStage'
        },
        STAGE_COMPLETED: {
          actions: 'applyCompletedStage'
        },
        RETURN_TO_MAP: {
          actions: 'clearCompletionBanner'
        }
      }
    }
  }
});

export const progressionActor = createActor(progressionMachine).start();
