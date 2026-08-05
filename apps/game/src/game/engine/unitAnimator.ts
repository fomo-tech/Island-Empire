export type UnitMotionPhases = {
  infantry: number;
  cavalry: number;
  artillery: number;
};

const STRIDE_PIXELS = {
  infantry: 38,
  cavalry: 52,
  artillery: 44,
} as const;

export function unitWalkPhases(
  _tickSeconds: number,
  distanceTravelled: number,
  seed = 0,
): UnitMotionPhases {
  const phaseOffset = (Math.abs(seed) % 7) * 0.13;
  return {
    infantry:
      distanceTravelled / STRIDE_PIXELS.infantry +
      phaseOffset,
    cavalry:
      distanceTravelled / STRIDE_PIXELS.cavalry +
      phaseOffset,
    artillery:
      distanceTravelled / STRIDE_PIXELS.artillery +
      phaseOffset,
  };
}

export function unitAttackPhase(tickSeconds: number, formationIndex = 0) {
  return tickSeconds * 0.72 + formationIndex * 0.17;
}

export function attackImpactWindow(
  phase: number,
  frameCount: number,
  impactFrame: number,
) {
  return Math.floor(Math.abs(phase) * frameCount) % frameCount === impactFrame;
}
