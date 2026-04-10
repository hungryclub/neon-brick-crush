const MIN_AIM_DISTANCE = 24;
const MAX_AIM_DISTANCE = 220;
const MIN_UPWARD_OFFSET = 16;
const MIN_SHOT_SPEED = 660;
const MAX_SHOT_SPEED = 980;

interface IPointLike {
  x: number;
  y: number;
}

export interface IAimPreview {
  angle: number;
  distance: number;
  isValid: boolean;
  pointer: IPointLike;
}

export interface IShotVelocity {
  x: number;
  y: number;
  speed: number;
}

export function canStartAim(
  origin: IPointLike,
  pointer: IPointLike
) {
  return pointer.y <= origin.y + MIN_UPWARD_OFFSET;
}

export function resolveAimPreview(
  origin: IPointLike,
  pointer: IPointLike
): IAimPreview {
  const clampedPointer = {
    x: pointer.x,
    y: Math.min(pointer.y, origin.y - MIN_UPWARD_OFFSET)
  };

  const distance = Math.min(
    Math.hypot(clampedPointer.x - origin.x, clampedPointer.y - origin.y),
    MAX_AIM_DISTANCE
  );
  const angle = Math.atan2(clampedPointer.y - origin.y, clampedPointer.x - origin.x);

  return {
    angle,
    distance,
    isValid: distance >= MIN_AIM_DISTANCE,
    pointer: clampedPointer
  };
}

export function resolveShotVelocity(
  origin: IPointLike,
  pointer: IPointLike
): IShotVelocity | null {
  const preview = resolveAimPreview(origin, pointer);

  if (!preview.isValid) {
    return null;
  }

  const speedRatio = preview.distance / MAX_AIM_DISTANCE;
  const speed = MIN_SHOT_SPEED + (MAX_SHOT_SPEED - MIN_SHOT_SPEED) * speedRatio;

  return {
    x: Math.cos(preview.angle) * speed,
    y: Math.sin(preview.angle) * speed,
    speed
  };
}
