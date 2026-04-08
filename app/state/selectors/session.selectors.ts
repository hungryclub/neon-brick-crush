import type { SnapshotFrom } from 'xstate';

import { sessionMachine } from '../machines/session.machine';

type SessionSnapshot = SnapshotFrom<typeof sessionMachine>;

export function selectSessionPhase(snapshot: SessionSnapshot) {
  return snapshot.value.toString();
}

export function selectIsSessionBooting(snapshot: SessionSnapshot) {
  return snapshot.matches('booting');
}
