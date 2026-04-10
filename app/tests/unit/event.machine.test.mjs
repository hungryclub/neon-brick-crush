import test from 'node:test';
import assert from 'node:assert/strict';

import { createActor } from 'xstate';

import { createEventMachine } from '../../state/machines/event.machine.ts';

async function flushActor() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test('event machine records successful reward claims explicitly', async () => {
  const actor = createActor(
    createEventMachine({
      claimEventReward: async ({ eventId, rewardId }) => ({
        status: 'granted',
        eventId,
        rewardId,
        snapshot: {
          version: 1,
          playerLevel: 3,
          totalXp: 250,
          settings: {
            isReducedMotionEnabled: false,
            isSfxEnabled: true,
            isTutorialHintsEnabled: true
          },
          eventClaimStateById: {
            [eventId]: {
              claimedRewardIds: [rewardId],
              lastClaimedAt: '2026-04-10T00:00:00.000Z'
            }
          },
          unlockedWorldIdList: ['world-01'],
          stageProgressById: {},
          lastPlayedStageSelection: null
        }
      })
    })
  ).start();

  actor.send({
    type: 'REQUEST_EVENT_CLAIM',
    eventId: 'event-neon-kickoff',
    rewardId: 'reward-neon-kickoff-xp'
  });
  await flushActor();

  assert.equal(actor.getSnapshot().matches('claimed'), true);
  assert.equal(actor.getSnapshot().context.lastClaimedEventId, 'event-neon-kickoff');
});

test('event machine records handled rejected claims explicitly', async () => {
  const actor = createActor(
    createEventMachine({
      claimEventReward: async ({ eventId, rewardId }) => ({
        status: 'rejected',
        eventId,
        rewardId,
        error: {
          code: 'EVENT_REWARD_ALREADY_CLAIMED',
          message: 'already claimed'
        }
      })
    })
  ).start();

  actor.send({
    type: 'REQUEST_EVENT_CLAIM',
    eventId: 'event-neon-kickoff',
    rewardId: 'reward-neon-kickoff-xp'
  });
  await flushActor();

  assert.equal(actor.getSnapshot().matches('failed'), true);
  assert.equal(actor.getSnapshot().context.lastError?.code, 'EVENT_REWARD_ALREADY_CLAIMED');
});
