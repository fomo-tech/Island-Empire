export type MarchDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export const marchDirectionCells: Record<
  MarchDirection,
  { row: number; pair: number }
> = {
  S: { row: 0, pair: 0 },
  SW: { row: 0, pair: 1 },
  W: { row: 1, pair: 0 },
  NW: { row: 1, pair: 1 },
  N: { row: 2, pair: 0 },
  NE: { row: 2, pair: 1 },
  E: { row: 3, pair: 0 },
  SE: { row: 3, pair: 1 },
};

export function marchDirectionFromDelta(
  dx: number,
  dy: number,
): MarchDirection {
  if (Math.abs(dx) + Math.abs(dy) < 0.001) return "S";
  const directions: MarchDirection[] = [
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW",
    "N",
    "NE",
  ];
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return directions[(octant + 8) % 8];
}

export function stableMarchDirection(
  owner: { lastDirection?: MarchDirection } | null | undefined,
  dx: number,
  dy: number,
): MarchDirection {
  const next = marchDirectionFromDelta(dx, dy);
  const previous = owner?.lastDirection;
  if (!previous) {
    if (owner) owner.lastDirection = next;
    return next;
  }

  const directionAngles: Record<MarchDirection, number> = {
    E: 0,
    SE: Math.PI / 4,
    S: Math.PI / 2,
    SW: (Math.PI * 3) / 4,
    W: Math.PI,
    NW: (-Math.PI * 3) / 4,
    N: -Math.PI / 2,
    NE: -Math.PI / 4,
  };
  const angle = Math.atan2(dy, dx);
  const delta = Math.abs(
    Math.atan2(
      Math.sin(angle - directionAngles[previous]),
      Math.cos(angle - directionAngles[previous]),
    ),
  );
  const resolved = delta <= Math.PI / 8 + 0.14 ? previous : next;
  if (owner) owner.lastDirection = resolved;
  return resolved;
}
