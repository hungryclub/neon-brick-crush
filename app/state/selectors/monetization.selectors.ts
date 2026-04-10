import type { SnapshotFrom } from 'xstate';

import { monetizationMachine } from '../machines/monetization.machine.ts';

type MonetizationSnapshot = SnapshotFrom<typeof monetizationMachine>;

export function selectIsPurchasePending(snapshot: MonetizationSnapshot) {
  return snapshot.matches('purchasing');
}

export function selectLastPurchaseOutcome(snapshot: MonetizationSnapshot) {
  return snapshot.context.lastPurchaseOutcome;
}

export function selectPurchaseFeedback(snapshot: MonetizationSnapshot) {
  const outcome = snapshot.context.lastPurchaseOutcome;

  if (!outcome) {
    return null;
  }

  if (outcome.status === 'purchased') {
    return 'Supporter Pack purchase simulated successfully. Store wiring is ready for a real provider.';
  }

  if (outcome.status === 'cancelled') {
    return '구매가 취소되었습니다. 게임 진행은 그대로 유지됩니다.';
  }

  if (outcome.status === 'unavailable') {
    return '이 기기에서는 상점이 아직 준비되지 않았습니다.';
  }

  return '구매 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}

export function selectHasPurchasedFeaturedPack(snapshot: MonetizationSnapshot) {
  return snapshot.context.purchasedProductIds.includes(snapshot.context.featuredProductId);
}
