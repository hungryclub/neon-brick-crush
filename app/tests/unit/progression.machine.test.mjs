import test from 'node:test';
import assert from 'node:assert/strict';

import { createActor } from 'xstate';

import { progressionMachine } from '../../state/machines/progression.machine.ts';

test('progression machine projects loaded state, selection, and completion updates', () => {
  const actor = createActor(progressionMachine).start();

  actor.send({
    type: 'PROGRESSION_LOADED',
    snapshot: {
      version: 2,
      unlockedWorldIdList: ['world-01'],
      stageProgressById: {
        'world-01-stage-01': {
          bestStarCount: 0,
          isCompleted: false,
          isUnlocked: true
        },
        'world-01-stage-02': {
          bestStarCount: 0,
          isCompleted: false,
          isUnlocked: false
        }
      },
      lastPlayedStageSelection: {
        worldId: 'world-01',
        stageId: 'world-01-stage-01'
      }
    }
  });

  assert.equal(actor.getSnapshot().matches('ready'), true);
  actor.send({
    type: 'SELECT_STAGE',
    selection: {
      worldId: 'world-01',
      stageId: 'world-01-stage-01'
    }
  });

  assert.equal(actor.getSnapshot().context.activeStageSelection.stageId, 'world-01-stage-01');

  actor.send({
    type: 'STAGE_COMPLETED',
    record: {
      worldId: 'world-01',
      stageId: 'world-01-stage-01',
      starCount: 3
    },
    snapshot: {
      version: 2,
      unlockedWorldIdList: ['world-01'],
      stageProgressById: {
        'world-01-stage-01': {
          bestStarCount: 3,
          isCompleted: true,
          isUnlocked: true
        },
        'world-01-stage-02': {
          bestStarCount: 0,
          isCompleted: false,
          isUnlocked: true
        }
      },
      lastPlayedStageSelection: {
        worldId: 'world-01',
        stageId: 'world-01-stage-01'
      }
    }
  });

  assert.equal(actor.getSnapshot().context.lastStageCompletion.starCount, 3);
  assert.equal(
    actor.getSnapshot().context.snapshot.stageProgressById['world-01-stage-02'].isUnlocked,
    true
  );

  actor.send({ type: 'RETURN_TO_MAP' });
  assert.equal(actor.getSnapshot().context.lastStageCompletion, null);
});

test('progression machine can refresh a loaded snapshot after boot', () => {
  const actor = createActor(progressionMachine).start();

  actor.send({
    type: 'PROGRESSION_LOADED',
    snapshot: {
      version: 2,
      unlockedWorldIdList: ['world-01'],
      stageProgressById: {
        'world-01-stage-01': {
          bestStarCount: 0,
          isCompleted: false,
          isUnlocked: true
        }
      },
      lastPlayedStageSelection: {
        worldId: 'world-01',
        stageId: 'world-01-stage-01'
      }
    }
  });

  actor.send({
    type: 'STAGE_COMPLETED',
    record: {
      worldId: 'world-01',
      stageId: 'world-01-stage-01',
      starCount: 3
    },
    snapshot: {
      version: 2,
      unlockedWorldIdList: ['world-01'],
      stageProgressById: {
        'world-01-stage-01': {
          bestStarCount: 3,
          isCompleted: true,
          isUnlocked: true
        }
      },
      lastPlayedStageSelection: {
        worldId: 'world-01',
        stageId: 'world-01-stage-01'
      }
    }
  });

  actor.send({
    type: 'PROGRESSION_LOADED',
    snapshot: {
      version: 2,
      unlockedWorldIdList: ['world-01'],
      stageProgressById: {
        'world-01-stage-01': {
          bestStarCount: 0,
          isCompleted: false,
          isUnlocked: true
        }
      },
      lastPlayedStageSelection: null
    }
  });

  assert.equal(actor.getSnapshot().matches('ready'), true);
  assert.equal(actor.getSnapshot().context.lastStageCompletion, null);
  assert.equal(actor.getSnapshot().context.activeStageSelection, null);
  assert.equal(
    actor.getSnapshot().context.snapshot.stageProgressById['world-01-stage-01'].isCompleted,
    false
  );
});
