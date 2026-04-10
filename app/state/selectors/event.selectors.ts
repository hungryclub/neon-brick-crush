import type { SnapshotFrom } from 'xstate';

import { eventMachine } from '../machines/event.machine.ts';

type EventSnapshot = SnapshotFrom<typeof eventMachine>;

export function selectIsEventClaimPending(snapshot: EventSnapshot) {
  return snapshot.matches('claiming');
}

export function selectEventClaimFeedback(snapshot: EventSnapshot) {
  if (snapshot.matches('claimed')) {
    return '이벤트 보상이 저장되었고 진행 상태에도 반영되었습니다.';
  }

  if (snapshot.matches('failed')) {
    return snapshot.context.lastError?.message ?? '이벤트 보상을 처리하지 못했습니다.';
  }

  return null;
}

export function selectLatestClaimedEventId(snapshot: EventSnapshot) {
  return snapshot.context.lastClaimedEventId;
}

export function selectLatestEventClaimError(snapshot: EventSnapshot) {
  return snapshot.context.lastError;
}
