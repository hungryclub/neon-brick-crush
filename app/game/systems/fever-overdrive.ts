export const FEVER_COLLISION_BONUS_HIT_LIMIT = 3;

export function resolveFeverCollisionBonus({
  currentHp,
  hitsUsed,
  isFeverActive
}: {
  currentHp: number;
  hitsUsed: number;
  isFeverActive: boolean;
}) {
  const hasBonusCapacity = isFeverActive && hitsUsed < FEVER_COLLISION_BONUS_HIT_LIMIT;
  const nextHp = currentHp - 1;
  const shouldSpendBonus = hasBonusCapacity && nextHp > 0;

  return {
    bonusApplied: shouldSpendBonus,
    hitsUsed: shouldSpendBonus ? hitsUsed + 1 : hitsUsed,
    nextHp: shouldSpendBonus ? 0 : nextHp
  };
}
