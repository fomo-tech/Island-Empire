export type MinimapMarkerKind = "player" | "other";

export type MinimapMarker = {
  x: number;
  y: number;
  kind: MinimapMarkerKind;
};

/**
 * Converts the engine's town ownership shape into the two marker states the
 * minimap needs. Backend ids take precedence; the local owner code is kept as
 * a fallback for offline/newbie games before the first server sync.
 */
export function townMarkerKind(
  town: any,
  localPlayerId: string | number | null | undefined,
): MinimapMarkerKind {
  const townOwnerId = town?.ownerId ?? town?.playerId ?? null;
  if (localPlayerId != null && townOwnerId != null) {
    return String(townOwnerId) === String(localPlayerId) ? "player" : "other";
  }
  return town?.owner === 0 || town?.ownerCode === 1 ? "player" : "other";
}

export function collectMinimapMarkers(
  towns: any[],
  localPlayerId: string | number | null | undefined,
): MinimapMarker[] {
  return towns
    .filter((town) => Number.isFinite(Number(town?.x)) && Number.isFinite(Number(town?.y)))
    .map((town) => ({
      x: Number(town.x),
      y: Number(town.y),
      kind: townMarkerKind(town, localPlayerId),
    }));
}
