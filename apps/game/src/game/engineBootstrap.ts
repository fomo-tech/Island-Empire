// @ts-nocheck

export const REGION_POLYGON_CELL_SIZE = 620;
export const LAND_QUERY_CELL_SIZE = 360;

export function buildRegionSpatialBuckets(regions: any[]) {
  const regionSpatialBuckets = new Map<string, any[]>();
  regions.forEach((r: any) => {
    const gx = Math.floor(r.x / REGION_POLYGON_CELL_SIZE);
    const gy = Math.floor(r.y / REGION_POLYGON_CELL_SIZE);
    const key = `${gx}:${gy}`;
    const bucket = regionSpatialBuckets.get(key);
    if (bucket) bucket.push(r);
    else regionSpatialBuckets.set(key, [r]);
  });
  return regionSpatialBuckets;
}

export function buildLandQueryBuckets(allGenerated: any[]) {
  const landQueryBuckets = new Map<string, any[]>();
  allGenerated.forEach((r: any) => {
    const scale = r.isIslet ? 1.08 : 1.42;
    const rx = (r.rx || r.r || 180) * scale;
    const ry = (r.ry || (r.r || 180) * 0.78) * scale;
    const minGX = Math.floor((r.x - rx) / LAND_QUERY_CELL_SIZE);
    const maxGX = Math.floor((r.x + rx) / LAND_QUERY_CELL_SIZE);
    const minGY = Math.floor((r.y - ry) / LAND_QUERY_CELL_SIZE);
    const maxGY = Math.floor((r.y + ry) / LAND_QUERY_CELL_SIZE);
    for (let gy = minGY; gy <= maxGY; gy++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        const key = `${gx}:${gy}`;
        const bucket = landQueryBuckets.get(key);
        if (bucket) bucket.push(r);
        else landQueryBuckets.set(key, [r]);
      }
    }
  });
  return landQueryBuckets;
}

export function createInitialState(fixedFarZoom: number) {
  return {
    selected: null,
    hover: null,
    tick: 0,
    zoom: fixedFarZoom,
    targetZoom: fixedFarZoom,
    panX: 0,
    panY: 0,
    targetPanX: null as number | null,
    targetPanY: null as number | null,
    cameraRestored: false,
    drag: null,
    dragMoved: false,
    selectedRegion: null,
    voyages: [],
    resources: {
      gold: 1250,
      wood: 830,
      stone: 670,
      food: 920,
      iron: 260,
      coal: 120,
      sulfur: 80,
      gems: 420,
    },
    missions: [
      { text: "MISSION_CAPTURE_3_TOWNS", value: 0, goal: 3 },
      { text: "MISSION_BUILD_5_BARRACKS", value: 2, goal: 5 },
      { text: "MISSION_UPGRADE_LV3", value: 1, goal: 3 },
    ],
    log: [
      "PLAYER1: FOR_GLORY",
      "PLAYER2: I_CAPTURED_CITY_A",
      "PLAYER3: SCOUTING_THE_NORTH",
      "PLAYER4: ATTACKING_THE_TARGET",
    ],
    toast: "SELECT_A_REGION_TO_BUILD",
    regionOwnership: [] as number[],
    regionOwnerNames: {} as Record<number, string>,
    regionOwnerIds: {} as Record<number, string>,
    regionOwnerFlagColors: {} as Record<number, string>,
    regionOwnerEmblems: {} as Record<number, string>,
    regionOwnerArchitectureIds: {} as Record<number, string>,
    regionOwnerAllianceTags: {} as Record<number, string>,
    regionOwnerAllianceEmblems: {} as Record<number, string>,
    regionSettlementKinds: {} as Record<
      number,
      "capital" | "sub_capital" | "military" | "military_district" | "flag"
    >,
    regionParentTerritoryIds: {} as Record<number, number>,
    regionRootTerritoryIds: {} as Record<number, number>,
    regionConnectionTypes: {} as Record<number, "land" | "sea">,
    regionSpecialResources: {} as Record<number, string[]>,
    regionOwnerCapitalSkins: {} as Record<number, string | null>,
    regionOwnerDistrictSkins: {} as Record<number, string | null>,
    expansionSourceRegionId: null as number | null,
    hasAuthoritativeOwnership: false,
    regionClearing: [] as number[],
    activeClearingTimings: {},
    regionInProgress: -1,
    activeBattles: [],
    newbieMode: false,
    newbiePhase: "none",
    newbieSelectedRegion: null,
    newbieFlagColor: "#f59e0b",
    newbieEmblem: "crown",
    newbieArchitectureId: "vietnam",
    newbieShieldUntil: (() => {
      const stored = localStorage.getItem("island_empire_newbie_shield_until");
      if (stored) return Number(stored);
      const initial = Date.now() + 24 * 3600 * 1000;
      localStorage.setItem(
        "island_empire_newbie_shield_until",
        String(initial),
      );
      return initial;
    })(),
    builderRegionId: (() => {
      const stored = localStorage.getItem("island_empire_builder_region_id");
      return stored ? Number(stored) : null;
    })(),
    settlerTravel: {
      active: false,
      targetRegionId: -1,
      originTownId: null,
      originX: 0,
      originY: 0,
    },
    pendingBackendClearingStarts: [],
    pendingBackendClaims: [],
    pendingBackendConquests: [],
    localPlayerId: null,
    localPlayerName: "Báº N",
    equippedCapitalSkin: null as string | null,
    equippedDistrictSkin: null as string | null,
    capitalTerritoryIds: new Set<number>(),
    capitalTownIds: new Set<number>(),
    research: { sword: 0, stirrups: 0, cannon: 0, travel: 0 },
    events: { goldRush: 0, harvestRush: 0 },
  };
}
