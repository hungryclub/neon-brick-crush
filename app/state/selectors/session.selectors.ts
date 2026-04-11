import type { SnapshotFrom } from 'xstate';

import {
  resolveFeverButtonLabel,
  resolveFeverHudValue,
  resolveFeverTier,
  resolveFeverTone,
  resolveReadyFeverMode
} from '../../game/systems/fever-overdrive.ts';
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
  return snapshot.matches('retrying') || snapshot.matches('rewardedRetrying');
}

export function selectRetryCount(snapshot: SessionSnapshot) {
  return snapshot.context.retryCount;
}

export function selectFeverMeter(snapshot: SessionSnapshot) {
  return snapshot.context.feverMeter;
}

export function selectFeverTier(snapshot: SessionSnapshot) {
  return resolveFeverTier(snapshot.context.feverMeter);
}

export function selectFeverReadyMode(snapshot: SessionSnapshot) {
  return resolveReadyFeverMode(snapshot.context.feverMeter);
}

export function selectActiveFeverMode(snapshot: SessionSnapshot) {
  return snapshot.context.activeFeverMode;
}

export function selectIsFeverReady(snapshot: SessionSnapshot) {
  return selectFeverReadyMode(snapshot) !== null;
}

export function selectIsFeverActive(snapshot: SessionSnapshot) {
  return snapshot.context.isFeverActive;
}

export function selectCanActivateFever(snapshot: SessionSnapshot) {
  return selectFeverReadyMode(snapshot) !== null && !snapshot.context.isFeverActive;
}

export function selectFeverButtonLabel(snapshot: SessionSnapshot) {
  return resolveFeverButtonLabel({
    activeMode: snapshot.context.activeFeverMode,
    readyMode: selectFeverReadyMode(snapshot)
  });
}

export function selectFeverTone(snapshot: SessionSnapshot) {
  return resolveFeverTone({
    activeMode: snapshot.context.activeFeverMode,
    readyMode: selectFeverReadyMode(snapshot)
  });
}

export function selectFeverHudValue(snapshot: SessionSnapshot) {
  return resolveFeverHudValue({
    activeMode: snapshot.context.activeFeverMode,
    feverMeter: snapshot.context.feverMeter,
    readyMode: selectFeverReadyMode(snapshot)
  });
}

export function selectIsRewardedRetryPending(snapshot: SessionSnapshot) {
  return snapshot.matches({ failed: 'requestingRewardedRetry' });
}

export function selectCanUseRewardedRetry(snapshot: SessionSnapshot) {
  return !snapshot.context.hasConsumedRewardedRetry && !snapshot.matches({ failed: 'unavailable' });
}

export function selectRewardedRetryFeedback(snapshot: SessionSnapshot) {
  if (snapshot.matches({ failed: 'unavailable' })) {
    return '이 기기에서는 광고 재도전이 현재 제공되지 않습니다. 일반 재도전으로 계속할 수 있어요.';
  }

  if (snapshot.matches({ failed: 'denied' })) {
    return '광고 재도전 준비에 실패했습니다. 일반 재도전으로 계속할 수 있어요.';
  }

  if (snapshot.matches({ failed: 'cancelled' })) {
    return '광고 시청이 취소되었습니다. 다른 선택으로 이어갈 수 있어요.';
  }

  return null;
}
