export interface IPulseBlastCandidate {
  height: number;
  hp: number;
  id: string;
  width: number;
  x: number;
  y: number;
}

export function resolvePulseBlastTargetIds({
  candidates,
  centerX,
  centerY,
  radius,
  sourceId
}: {
  candidates: IPulseBlastCandidate[];
  centerX: number;
  centerY: number;
  radius: number;
  sourceId: string;
}) {
  return candidates
    .filter((candidate) => candidate.id !== sourceId)
    .filter((candidate) =>
      doesCircleIntersectRect({
        centerX,
        centerY,
        radius,
        rectCenterX: candidate.x,
        rectCenterY: candidate.y,
        rectWidth: candidate.width,
        rectHeight: candidate.height
      })
    )
    .sort((left, right) => {
      const leftDistance = squaredDistance(centerX, centerY, left.x, left.y);
      const rightDistance = squaredDistance(centerX, centerY, right.x, right.y);

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      if (right.hp !== left.hp) {
        return right.hp - left.hp;
      }

      return left.id.localeCompare(right.id);
    })
    .map((candidate) => candidate.id);
}

export function doesCircleIntersectRect({
  centerX,
  centerY,
  radius,
  rectCenterX,
  rectCenterY,
  rectHeight,
  rectWidth
}: {
  centerX: number;
  centerY: number;
  radius: number;
  rectCenterX: number;
  rectCenterY: number;
  rectHeight: number;
  rectWidth: number;
}) {
  const halfWidth = rectWidth / 2;
  const halfHeight = rectHeight / 2;
  const closestX = clamp(centerX, rectCenterX - halfWidth, rectCenterX + halfWidth);
  const closestY = clamp(centerY, rectCenterY - halfHeight, rectCenterY + halfHeight);

  return squaredDistance(centerX, centerY, closestX, closestY) <= radius * radius;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function squaredDistance(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;

  return dx * dx + dy * dy;
}
