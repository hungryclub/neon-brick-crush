import type { SnapshotFrom } from 'xstate';

import { sessionMachine } from '../machines/session.machine';

type SessionSnapshot = SnapshotFrom<typeof sessionMachine>;

export function selectSessionPhase(snapshot: SessionSnapshot) {
  return snapshot.value.toString();
}

export function selectIsSessionBooting(snapshot: SessionSnapshot) {
  return snapshot.matches('booting');
}

export function selectIsSessionFailed(snapshot: SessionSnapshot) {
  return snapshot.matches('failed');
}

export function selectIsSessionRetrying(snapshot: SessionSnapshot) {
  return snapshot.matches('retrying');
}

export function selectRetryCount(snapshot: SessionSnapshot) {
  return snapshot.context.retryCount;
}
