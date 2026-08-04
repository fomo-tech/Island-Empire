// @ts-nocheck
import {
  generateConquestTerritories,
  generateWorldTerritories,
} from "@island/shared";
import {
  kingdomArchitectureFromEmblem,
  normalizeKingdomArchitecture,
} from "./kingdomArchitecture";
import {
  BIOMES,
  COLORS,
  factions,
  gameConfig,
  MAP_UNITS_TO_KM,
  megaContinents,
} from "./engineConstants";
import {
  BIOME_YIELDS,
  kingdomBuildingAssetPaths,
  towns as BASE_TOWNS,
} from "./engineStaticData";
import {
  LAND_QUERY_CELL_SIZE,
  REGION_POLYGON_CELL_SIZE,
  buildLandQueryBuckets,
  buildRegionSpatialBuckets,
  createInitialState,
} from "./engineBootstrap";
import {
  applyCanvasSize,
  createNoopEngineHandle,
  getRenderDpr,
  getViewportSize,
  type GameEngineHandle,
} from "./engineCore";
import {
  hash,
  lerp,
  nearestContinent as nearestContinentForRegion,
  visualBiomeIndex as computeVisualBiomeIndex,
} from "./engineTerrainUtils";
import { createNatureSpriteDrawers } from "./engineNatureSprites";
import { createOceanDecorDrawers } from "./engineOceanDecor";
import { createViewportHelpers } from "./engineViewport";
import { createTownEconomyHelpers } from "./engineTownEconomy";
import { createRouteUtils } from "./engineRouteUtils";
import { createBackendSyncHelpers } from "./engineBackendSync";
import { createSpatialHelpers } from "./engineSpatial";
import { createUiRuntimeHelpers } from "./engineUiRuntime";
import { createVegetationHelpers } from "./engineVegetation";
import { createColorHelpers } from "./engineColoring";
import { createOnboardingHelpers } from "./engineOnboarding";
import { createSpriteAtlasHelpers } from "./engineSpriteAtlases";
import { createKingdomBuildingHelpers } from "./engineKingdomBuildings";
import { timingProgress, clearingTimingProgress } from "./engineTiming";
import { createCanvasUiHelpers } from "./engineCanvasUi";
import { createCameraPersistenceHelpers } from "./engineCameraPersistence";
import {
  markMainlandCoastalRegions,
  normalizeTownCenters,
} from "./engineWorldPrep";
import { createAssetVisibilityHelpers } from "./engineAssetVisibility";
import { createMinimapInteractionHelpers } from "./engineMinimapInteraction";
import { createKeyboardShortcutsHelpers } from "./engineKeyboardShortcuts";
import { createPointerHelpers } from "./enginePointer";
import { createCanvasClickActionHelpers } from "./engineCanvasClickAction";
import { createCanvasGestureInputHelpers } from "./engineCanvasGestureInput";
import { createEngineActionPreludeHelper } from "./engineActionPrelude";
import { createBackendActionBridgeHelper } from "./engineBackendActionBridge";
import { createEngineActionFollowupHelper } from "./engineActionFollowup";
import { createApplyGameStateActionHelper } from "./engineApplyGameStateAction";
import { createNewbieActionsHelper } from "./engineNewbieActions";
import { createEngineChatActionsHelper } from "./engineChatActions";
import { createEnginePublicQueriesHelper } from "./enginePublicQueries";
import { createEngineLifecycleHelper } from "./engineLifecycle";
import { createEngineActionDispatcher } from "./engineActionDispatcher";
import { createEnginePublicApiUtilityHelper } from "./enginePublicApiUtility";
import { createEngineSimulationHelpers } from "./engineSimulation";

export type { GameEngineHandle };

export function createIslandEmpireGame(
  canvas: HTMLCanvasElement,
  onUpdate?: (state: any, towns: any[]) => void,
  minimapCanvas?: HTMLCanvasElement | null,
  onLayoutAction?: (actionId: string, payload?: any) => void,
  onBattleFinished?: (report: any) => void,
  options?: { layout?: "world" | "conquest" },
): GameEngineHandle {
  let ctx = canvas.getContext("2d");
  if (!ctx) return createNoopEngineHandle();

  interface CachedRegion {
    canvas: HTMLCanvasElement;
    assetsCanvas?: HTMLCanvasElement | null;
    minX: number;
    minY: number;
    width: number;
    height: number;
    hasTown: boolean;
    hasOwner: boolean;
    zoomTier: number;
  }
  const regionPass2Cache = new Map<number, CachedRegion>();
  const isletPass1Cache = new Map<number, CachedRegion>();

  function getZoomTier(zoom: number) {
    if (zoom < 0.28) return 0;
    if (zoom < 0.5) return 1;
    if (zoom < 0.66) return 2;
    if (zoom < 0.75) return 3;
    return 4;
  }

  function clearAllRegionCache() {
    regionPass2Cache.clear();
    isletPass1Cache.clear();
  }
  clearAllRegionCache();
  ctx.imageSmoothingEnabled = false;

  let minimapCtx = minimapCanvas?.getContext("2d");

  let destroyed = false;
  let raf = 0;

  let dpr = getRenderDpr();
  let { width: W, height: H } = getViewportSize();
  applyCanvasSize(canvas, W, H, dpr);

  function getMinZoom() {
    if (W <= 600) return 0.08;
    if (W <= 1024) return 0.1;
    return 0.12;
  }

  function getMaxZoom() {
    return 4.0;
  }

  function getDefaultFarZoom() {
    if (options?.layout === "conquest") return W <= 700 ? 0.28 : 0.48;
    if (W <= 600) return 0.42;
    if (W <= 1024) return 0.4;
    return 0.52;
  }

  function resizeCanvas() {
    if (destroyed) return;
    ({ width: W, height: H } = getViewportSize());
    dpr = getRenderDpr();
    applyCanvasSize(canvas, W, H, dpr);
    ctx.imageSmoothingEnabled = false;
    clearAllRegionCache();
  }
  window.addEventListener("resize", resizeCanvas);

  const TAU = Math.PI * 2;
  const isConquestLayout = options?.layout === "conquest";
  const CAMERA_KEY = isConquestLayout
    ? "island_empire_conquest_camera_v1"
    : "island_empire_camera_v1";
  const ONBOARDING_KEY = "island_empire_onboarding_pending";
  const BASE_ZOOM = 1;
  const FIXED_FAR_ZOOM = 0.52;
  const NEWBIE_DEFAULT_REGION = 0;

  const allGenerated = isConquestLayout
    ? generateConquestTerritories()
    : generateWorldTerritories();
  const towns = BASE_TOWNS.map((town: any) => ({ ...town }));
  const regions = allGenerated.filter((t) => !t.isIslet);
  const islets = allGenerated.filter((t) => t.isIslet);
  const regionSpatialBuckets = buildRegionSpatialBuckets(regions);
  const landQueryBuckets = buildLandQueryBuckets(allGenerated);

  const state = createInitialState(FIXED_FAR_ZOOM);

  const {
    townAt,
    screenToMap,
    mapToScreen,
    canvasToReactRegionId,
    reactToCanvasRegionId,
    pointInPolygon,
    regionAtCoords,
    regionAt,
    derivedRegionOwnership,
  } = createSpatialHelpers({
    state,
    towns,
    WRef: () => W,
    HRef: () => H,
    canvas,
    landQueryBuckets,
    landQueryCellSize: LAND_QUERY_CELL_SIZE,
    getSharedRegionPolygon,
  });

  const organicPathCache = new Map();
  const sharedEdgeCache = new Map<string, Array<[number, number]>>();
  const sharedRegionPolygonCache = new Map<string, Array<[number, number]>>();
  const sharedInlandVertexCache = new Map<string, boolean>();
  const visualBiomeCache = new Map<string, number>();
  const mainlandCoastalRegionIds = new Set<number>();
  const territoryDisplayPolygonCache = new Map<
    string,
    Array<[number, number]>
  >();

  markMainlandCoastalRegions({
    regions,
    nearestContinent,
    regionAtCoords,
    mainlandCoastalRegionIds,
  });

  const { resetStarterTownsForNewbie } = createOnboardingHelpers({
    state,
    towns,
    factions,
    onboardingKey: ONBOARDING_KEY,
  });

  let toast = (message: string) => {
    state.toast = message;
  };
  let pushLog = (message: string) => {
    state.log.push(message);
    if (state.log.length > 8) state.log.shift();
  };

  const {
    SETTLER_POPULATION_COST,
    territoryAreaFactor,
    territoryYield,
    territoryStartingPopulation,
    clearingDuration,
    defaultBuildings,
    defaultStorage,
    normalizeTown,
    townPopulationCap,
    maxDefendingTroops,
    refundSettlerPopulationForRegion,
    beginSettlerReturn,
    clearSettlerReturn,
    cancelClearingIfOriginLost,
    cancelClearingIfTargetTaken,
    territoryBuildCost,
    territorySpecialResources,
  } = createTownEconomyHelpers({
    state,
    towns,
    landById,
    regionAtCoords,
    derivedRegionOwnership,
    mainlandCoastalRegionIds,
    BIOME_YIELDS,
    hash,
    toast,
    pushLog,
  });

  normalizeTownCenters({
    towns,
    regions,
    normalizeTown,
    getOptimalTownCenter,
  });

  const { getDarkerColor, getLighterColor, getRegionFlagColor } =
    createColorHelpers({
      state,
      factions,
      derivedRegionOwnership,
    });

  const {
    getTerritoryVegetationAtlas,
    drawTerritoryVegetationSprite,
    getMedievalWorldAtlas,
    drawMedievalWorldSprite,
    drawGameEnvV2Sprite,
    drawMedievalDetailSprite,
    getMedievalDetailAtlas,
  } = createSpriteAtlasHelpers({
    ctxRef: () => ctx,
    clearRegionPass2Cache: () => {
      regionPass2Cache.clear();
    },
  });

  const {
    drawKingdomBuildingSprite,
    territoryBuildingSize,
    territoryBuildingAnchor,
  } = createKingdomBuildingHelpers({
    ctxRef: () => ctx,
    tickRef: () => state.tick,
    zoomRef: () => state.zoom,
    TAU,
    isFastPanning,
    isFastRenderMode: () => fastRenderMode,
    isCrowdedRenderMode: () => crowdedRenderMode,
  });

  const { pxRect, text, panel } = createCanvasUiHelpers({
    ctxRef: () => ctx,
  });

  const { saveCamera, loadCamera, shouldFlushPendingCameraSave } =
    createCameraPersistenceHelpers({
      state,
      cameraKey: CAMERA_KEY,
      getDefaultFarZoom,
      getMinZoom,
      getMaxZoom,
      clampPan,
    });

  function flushCameraOnPageHide() {
    saveCamera(true);
  }
  window.addEventListener("pagehide", flushCameraOnPageHide);

  const {
    drawBush,
    drawPalmTree,
    drawChest,
    drawFlower,
    drawBerryBush,
    drawMushrooms,
    drawLakeInRegion,
    drawRiverInRegion,
    drawNaturalTerritoryVegetation,
  } = createVegetationHelpers({
    state,
    TAU,
    hash,
    hasTownRegionId: (regionId: number) => frameTownRegionIds.has(regionId),
    getTerritoryVegetationAtlas,
    drawTerritoryVegetationSprite,
    drawGameEnvV2Sprite,
    drawMedievalWorldSprite,
    drawMedievalDetailSprite,
  });

  const {
    drawOakTree,
    drawAutumnTree,
    drawPineTree,
    drawGrassPatch,
    drawRockPile,
    drawElephant,
    drawDeer,
    drawBoar,
    drawCave,
    drawRuins,
  } = createNatureSpriteDrawers({
    drawGameEnvV2Sprite,
    drawMedievalWorldSprite,
    drawMedievalDetailSprite,
  });

  // Start decoding before the first map frame. Missing atlases never fall back to pixel art.
  getMedievalWorldAtlas();
  getMedievalDetailAtlas();

  function nearestContinent(r: any) {
    return nearestContinentForRegion(r, megaContinents);
  }

  function visualBiomeIndex(r: any, idx: number, isIslet = false) {
    return computeVisualBiomeIndex(
      r,
      idx,
      isIslet,
      visualBiomeCache,
      BIOMES,
      megaContinents,
    );
  }

  function visualBiome(r: any, idx: number, isIslet = false) {
    const baseIndex = visualBiomeIndex(r, idx, isIslet);
    const baseBiome = BIOMES[baseIndex] || BIOMES[0];
    const seed = (r.id ?? idx) * 31 + (r.seed || 1);

    // Smooth micro-tint variance (Â±4%) so adjacent territories on the same continent blend harmoniously
    const factor = 1 + (hash(seed * 17) - 0.5) * 0.08;
    return {
      ...baseBiome,
      a: getDarkerColor(baseBiome.a, factor),
    };
  }

  function drawOcean() {
    // Layer 1: deep tactical sea base.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#071825");
    g.addColorStop(0.48, "#0a263b");
    g.addColorStop(1, "#061521");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const lightG = ctx.createRadialGradient(W / 2, H / 3, 50, W / 2, H / 3, W);
    lightG.addColorStop(0, "rgba(56, 189, 248, 0.10)");
    lightG.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = lightG;
    ctx.fillRect(0, 0, W, H);
  }

  function drawWorldOceanTexture() {
    return; // ÄÃ£ xÃ³a toÃ n bá»™ sÃ³ng nhá» ngoÃ i Ä‘áº¡i dÆ°Æ¡ng, chá»‰ giá»¯ sÃ³ng táº¡i vÃ¡ch Ä‘Ã¡ ven biá»ƒn
  }

  const {
    drawCompassRose,
    drawSailingShip,
    drawSeaMonster,
    drawWorldOceanDetails,
  } = createOceanDecorDrawers({
    ctx,
    state,
  });

  const { getWorldViewport, isRegionInViewport, isPointInViewport } =
    createViewportHelpers({
      state,
      getWidth: () => W,
      getHeight: () => H,
    });

  function facetedRegionPath(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    seed: number,
  ) {
    const style = Math.floor(hash(seed * 137) * 8);
    const numVertices = 18 + Math.floor(hash(seed * 43) * 14); // 18 to 32 base vertices (nhiá»u gÃ³c cáº¡nh phong phÃº!)
    const stretchAngle = hash(seed * 223) * TAU;
    const stretchAmount = 0.2 + hash(seed * 311) * 0.3;

    const pts: Array<[number, number]> = [];
    for (let i = 0; i < numVertices; i++) {
      const baseAngle = (i / numVertices) * TAU - Math.PI / 6;
      const anglePerturb = (hash(seed * 71 + i * 19) - 0.5) * 0.42;
      const angle = baseAngle + anglePerturb;

      let radiusMult = 0.78 + hash(seed * 113 + i * 29) * 0.44;

      if (style === 1) {
        // Style 1: Ã” thuÃ´n dÃ i nghiÃªng gÃ³c (Elongated Fjord/Peninsula)
        const align = Math.cos(angle - stretchAngle);
        radiusMult += align * stretchAmount;
      } else if (style === 2) {
        // Style 2: Ã” viá»n uá»‘n lÆ°á»£n phá»“ng 4-6 thÃ¹y (Multi-Lobe Organic Polygon)
        radiusMult +=
          Math.sin(angle * 4.0 + seed * 0.8) * 0.24 +
          Math.cos(angle * 7.0 - seed * 0.3) * 0.12;
      } else if (style === 3) {
        // Style 3: Ã” hÃ¬nh chÃªm / mÅ©i giÃ¡o chiáº¿n thuáº­t (Tactical Spearhead / Wedge)
        const wedge = Math.cos(angle * 2.5 + seed * 1.3) * 0.28;
        radiusMult += wedge;
      } else if (style === 4) {
        // Style 4: Ã” Ä‘a gÃ³c vuÃ´ng khá»‘i kiÃªn cá»‘ (Blocky Bastion Shield)
        const squareMod = Math.abs(Math.sin(angle * 2.5 + seed)) * 0.22 - 0.11;
        radiusMult += squareMod;
      } else if (style === 5) {
        // Style 5: Ã” gá» nÃºi rÄƒng cÆ°a nhiá»u náº¥c (Serrated Mountainous Ridge)
        const serrated =
          (i % 2 === 0 ? 0.18 : -0.12) + Math.sin(angle * 5.5) * 0.15;
        radiusMult += serrated;
      } else if (style === 6) {
        // Style 6: Ã” hÃ¬nh bÃ¡n nguyá»‡t / cong khuyáº¿t (Crescent Moon Region)
        const crescent = Math.cos(angle * 1.5 + seed) * 0.32;
        radiusMult += crescent;
      } else if (style === 7) {
        // Style 7: Ã” Ä‘a giÃ¡c tá»± do 24-32 gÃ³c sáº¯c nÃ©t (High-Facet Tactical Realm)
        const microFacet = Math.sin(angle * 8.0 + seed * 2.1) * 0.16;
        radiusMult += microFacet;
      }

      const px = Math.round((cx + Math.cos(angle) * rx * radiusMult) * 2) / 2;
      const py = Math.round((cy + Math.sin(angle) * ry * radiusMult) * 2) / 2;
      pts.push([px, py]);
    }
    return pts;
  }

  // Äáº£m báº£o polygon cÃ³ tá»‘i thiá»ƒu minV Ä‘á»‰nh báº±ng cÃ¡ch chÃ¨n Ä‘iá»ƒm giá»¯a cÃ¡c cáº¡nh dÃ i nháº¥t
  function ensureMinVertices(
    pts: Array<[number, number]>,
    minV: number,
  ): Array<[number, number]> {
    if (pts.length >= minV) return pts;
    let result = [...pts];
    while (result.length < minV) {
      let maxLen = 0;
      let maxIdx = 0;
      for (let i = 0; i < result.length; i++) {
        const next = result[(i + 1) % result.length];
        const len = Math.hypot(next[0] - result[i][0], next[1] - result[i][1]);
        if (len > maxLen) {
          maxLen = len;
          maxIdx = i;
        }
      }
      const p1 = result[maxIdx];
      const p2 = result[(maxIdx + 1) % result.length];
      const mid: [number, number] = [
        Math.round((p1[0] + p2[0]) / 2),
        Math.round((p1[1] + p2[1]) / 2),
      ];
      result.splice(maxIdx + 1, 0, mid);
    }
    return result;
  }

  function organicPath(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    seed: number,
  ) {
    const pts: Array<[number, number]> = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      const chip = hash(seed * 97 + i * 13) * 0.1 - 0.05;
      const wave =
        1 +
        Math.sin(a * 5 + seed * 1.7) * 0.08 +
        Math.cos(a * 9 - seed * 0.5) * 0.05 +
        chip;
      const x = Math.round((cx + Math.cos(a) * rx * wave) * 2) / 2;
      const y = Math.round((cy + Math.sin(a) * ry * wave) * 2) / 2;
      pts.push([x, y]);
    }
    return pts;
  }

  function isSharedInlandVertex(px: number, py: number, r: any): boolean {
    if (!r || r.isIslet) return false;
    const key = `${r.id}_${Math.round(px)}_${Math.round(py)}`;
    const cached = sharedInlandVertexCache.get(key);
    if (cached !== undefined) return cached;

    const neighbors = nearbyMainlandRegions(r);
    for (let i = 0; i < neighbors.length; i++) {
      const other = neighbors[i];
      const dx = px - other.x;
      const dy = py - other.y;
      const rx = (other.rx || 230) * 1.15;
      const ry = (other.ry || rx * 0.78) * 1.15;
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.12) {
        sharedInlandVertexCache.set(key, true);
        return true;
      }
    }
    sharedInlandVertexCache.set(key, false);
    return false;
  }

  function warpPoint(x: number, y: number): [number, number] {
    const scale1 = 0.015;
    const scale2 = 0.035;
    // Multi-frequency sine/cos waves for natural, river-like organic boundary lines
    const dx =
      Math.sin(x * scale1 + y * scale1) * 8 +
      Math.cos(x * scale2 - y * scale2) * 3.5;
    const dy =
      Math.cos(x * scale1 - y * scale1) * 8 +
      Math.sin(x * scale2 + y * scale2) * 3.5;
    return [Math.round((x + dx) * 2) / 2, Math.round((y + dy) * 2) / 2];
  }

  function subdividePolygon(
    poly: Array<[number, number]>,
    maxSegLength = 20,
  ): Array<[number, number]> {
    const result: Array<[number, number]> = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % n];
      result.push(p1);
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const dist = Math.hypot(dx, dy);
      if (dist > maxSegLength) {
        const numSegments = Math.ceil(dist / maxSegLength);
        for (let j = 1; j < numSegments; j++) {
          const t = j / numSegments;
          result.push([
            Math.round((p1[0] + dx * t) * 2) / 2,
            Math.round((p1[1] + dy * t) * 2) / 2,
          ]);
        }
      }
    }
    return result;
  }

  function softenCoastalTerritoryEdges(
    points: Array<[number, number]>,
    r: any,
  ): Array<[number, number]> {
    if (!r || r.isIslet || !points || points.length < 3) return points;

    const isInland = points.map(([px, py]) => isSharedInlandVertex(px, py, r));
    if (isInland.every(Boolean)) return points;

    const n = points.length;
    const result: Array<[number, number]> = [];

    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n];
      const curr = points[i];
      const next = points[(i + 1) % n];

      const currInland = isInland[i];
      const prevInland = isInland[(i - 1 + n) % n];
      const nextInland = isInland[(i + 1) % n];

      if (currInland) {
        result.push(curr);
      } else {
        if (!prevInland && !nextInland) {
          const qx = Math.round((0.75 * curr[0] + 0.25 * prev[0]) * 2) / 2;
          const qy = Math.round((0.75 * curr[1] + 0.25 * prev[1]) * 2) / 2;
          const rx = Math.round((0.75 * curr[0] + 0.25 * next[0]) * 2) / 2;
          const ry = Math.round((0.75 * curr[1] + 0.25 * next[1]) * 2) / 2;
          result.push([qx, qy]);
          result.push([rx, ry]);
        } else if (prevInland && !nextInland) {
          const px = Math.round((0.85 * curr[0] + 0.15 * prev[0]) * 2) / 2;
          const py = Math.round((0.85 * curr[1] + 0.15 * prev[1]) * 2) / 2;
          const rx = Math.round((0.65 * curr[0] + 0.35 * next[0]) * 2) / 2;
          const ry = Math.round((0.65 * curr[1] + 0.35 * next[1]) * 2) / 2;
          result.push([px, py]);
          result.push([rx, ry]);
        } else if (!prevInland && nextInland) {
          const qx = Math.round((0.65 * curr[0] + 0.35 * prev[0]) * 2) / 2;
          const qy = Math.round((0.65 * curr[1] + 0.35 * prev[1]) * 2) / 2;
          const nx = Math.round((0.85 * curr[0] + 0.15 * next[0]) * 2) / 2;
          const ny = Math.round((0.85 * curr[1] + 0.15 * next[1]) * 2) / 2;
          result.push([qx, qy]);
          result.push([nx, ny]);
        } else {
          const qx =
            Math.round((0.7 * curr[0] + 0.15 * prev[0] + 0.15 * next[0]) * 2) /
            2;
          const qy =
            Math.round((0.7 * curr[1] + 0.15 * prev[1] + 0.15 * next[1]) * 2) /
            2;
          result.push([qx, qy]);
        }
      }
    }
    return result;
  }

  function getOrganicPath(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    seed: number,
    key: string,
  ) {
    const cacheKey = `${key}_${Math.round(cx)}_${Math.round(cy)}_${Math.round(rx)}_${Math.round(ry)}`;
    let pts = organicPathCache.get(cacheKey);
    if (!pts) {
      pts = organicPath(cx, cy, rx, ry, seed);
      organicPathCache.set(cacheKey, pts);
    }
    return pts;
  }

  function nearbyMainlandRegions(r: any) {
    const gx = Math.floor(r.x / REGION_POLYGON_CELL_SIZE);
    const gy = Math.floor(r.y / REGION_POLYGON_CELL_SIZE);
    const out: any[] = [];
    for (let ox = -2; ox <= 2; ox++) {
      for (let oy = -2; oy <= 2; oy++) {
        const bucket = regionSpatialBuckets.get(`${gx + ox}:${gy + oy}`);
        if (!bucket) continue;
        bucket.forEach((other) => {
          if (other.id !== r.id) out.push(other);
        });
      }
    }
    return out;
  }

  function clipPolygonToNeighbor(
    poly: Array<[number, number]>,
    r: any,
    other: any,
  ) {
    if (poly.length < 3) return poly;
    const dx = other.x - r.x;
    const dy = other.y - r.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return poly;

    const rxLimit = ((r.rx || 230) + (other.rx || 230)) * 1.45;
    const ryLimit =
      ((r.ry || (r.rx || 230) * 0.78) +
        (other.ry || (other.rx || 230) * 0.78)) *
      1.48;
    const normalized = Math.hypot(dx / rxLimit, dy / ryLimit);
    if (normalized > 1.35) return poly;

    const midX = (r.x + other.x) / 2;
    const midY = (r.y + other.y) / 2;
    const side = (p: [number, number]) =>
      (p[0] - midX) * dx + (p[1] - midY) * dy;
    const intersect = (
      a: [number, number],
      b: [number, number],
    ): [number, number] => {
      const sa = side(a);
      const sb = side(b);
      const denominator = sa - sb;
      const t =
        denominator === 0 ? 0.5 : Math.max(0, Math.min(1, sa / denominator));
      return [
        Math.round((a[0] + (b[0] - a[0]) * t) * 2) / 2,
        Math.round((a[1] + (b[1] - a[1]) * t) * 2) / 2,
      ];
    };

    const clipped: Array<[number, number]> = [];
    for (let i = 0; i < poly.length; i++) {
      const current = poly[i];
      const prev = poly[(i - 1 + poly.length) % poly.length];
      const currentInside = side(current) <= 0;
      const prevInside = side(prev) <= 0;

      if (currentInside) {
        if (!prevInside) clipped.push(intersect(prev, current));
        clipped.push(current);
      } else if (prevInside) {
        clipped.push(intersect(prev, current));
      }
    }

    const deduped: Array<[number, number]> = [];
    clipped.forEach((p) => {
      const last = deduped[deduped.length - 1];
      if (!last || Math.hypot(last[0] - p[0], last[1] - p[1]) > 2)
        deduped.push(p);
    });
    if (deduped.length > 2) {
      const first = deduped[0];
      const last = deduped[deduped.length - 1];
      if (Math.hypot(first[0] - last[0], first[1] - last[1]) <= 2)
        deduped.pop();
    }
    return deduped.length >= 3 ? deduped : poly;
  }

  // --- SHARED EDGE MESH ALGORITHM ---

  function getSharedRegionPolygon(
    r: any,
    idx: number,
    isIslet: boolean,
  ): Array<[number, number]> {
    if (isIslet) {
      return getOrganicPath(
        r.x,
        r.y,
        (r.rx || r.r) * 0.82,
        (r.ry || r.r * 0.78) * 0.82,
        r.seed || idx + 1,
        `islet_${idx}_poly`,
      );
    }

    const polyKey = `shared_clipped_faceted_v6_${idx}_${Math.round(r.x)}_${Math.round(r.y)}`;
    let cached = sharedRegionPolygonCache.get(polyKey);
    if (cached) return cached;

    const seed = r.seed || idx * 101 + 17;
    const rx = (r.rx || r.r || 230) * 1.18;
    const ry = (r.ry || (r.r || 230) * 0.78) * 1.18;
    cached = facetedRegionPath(r.x, r.y, rx, ry, seed * 1.7 + 0.4);
    nearbyMainlandRegions(r)
      .sort(
        (a, b) =>
          Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y),
      )
      .forEach((other) => {
        cached = clipPolygonToNeighbor(cached, r, other);
      });
    // Äáº£m báº£o tá»‘i thiá»ƒu 6 Ä‘á»‰nh sau khi clipping
    cached = ensureMinVertices(cached, 6);
    cached = softenCoastalTerritoryEdges(cached, r);
    // Subdivide and warp the coordinates to make the boundaries wavy/organic and remove the hexagonal look
    const subdivided = subdividePolygon(cached, 20);
    const warped = subdivided.map(([x, y]) => warpPoint(x, y));
    sharedRegionPolygonCache.set(polyKey, warped);
    return warped;
  }

  function fillPath(points, color) {
    if (!points || points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // PhÃ¬nh rá»™ng polygon ra ngoÃ i `amount` pixel so vá»›i tÃ¢m (cx, cy)
  // DÃ¹ng Ä‘á»ƒ láº¥p kÃ­n gap sub-pixel giá»¯a cÃ¡c Ã´ ká» nhau
  function inflatePolygon(
    pts: Array<[number, number]>,
    amount: number,
    cx: number,
    cy: number,
  ): Array<[number, number]> {
    return pts.map(([px, py]) => {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy) || 1;
      return [px + (dx / dist) * amount, py + (dy / dist) * amount] as [
        number,
        number,
      ];
    });
  }

  function organicTerritoryDisplayPolygon(
    points: Array<[number, number]>,
    r: any,
    idx: number,
    isIslet: boolean,
  ): Array<[number, number]> {
    if (!points || points.length < 3) return points;
    const key = `${isIslet ? "islet" : "region"}_display_v3_${idx}_${Math.round(r.x)}_${Math.round(r.y)}_${points.length}`;
    const cached = territoryDisplayPolygonCache.get(key);
    if (cached) return cached;

    const result: Array<[number, number]> = [];
    const n = points.length;
    const baseSeed = (r.seed || idx * 97 + 13) * 1.37;
    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const dist = Math.hypot(dx, dy) || 1;
      const segments = Math.max(
        2,
        Math.min(6, Math.ceil(dist / (isIslet ? 42 : 56))),
      );
      const nx = -dy / dist;
      const ny = dx / dist;
      const midx = (p1[0] + p2[0]) / 2;
      const midy = (p1[1] + p2[1]) / 2;
      const outwardSign = (midx - r.x) * nx + (midy - r.y) * ny >= 0 ? 1 : -1;

      for (let s = 0; s < segments; s++) {
        const t = s / segments;
        const edgeFade = Math.sin(t * Math.PI);
        const waveA =
          (hash(baseSeed + i * 31 + s * 7) - 0.5) * (isIslet ? 16 : 22);
        const waveB =
          Math.sin((t + hash(baseSeed + i * 11)) * Math.PI * 2) *
          (isIslet ? 4 : 7);
        const offset = (waveA + waveB) * edgeFade * outwardSign;
        const along = (hash(baseSeed + i * 17 + s * 13) - 0.5) * 5 * edgeFade;
        result.push([
          Math.round((p1[0] + dx * t + nx * offset + (dx / dist) * along) * 2) /
            2,
          Math.round((p1[1] + dy * t + ny * offset + (dy / dist) * along) * 2) /
            2,
        ]);
      }
    }

    const smoothed = result.map((p, i) => {
      const prev = result[(i - 1 + result.length) % result.length];
      const next = result[(i + 1) % result.length];
      return [
        Math.round((p[0] * 0.55 + prev[0] * 0.225 + next[0] * 0.225) * 2) / 2,
        Math.round((p[1] * 0.55 + prev[1] * 0.225 + next[1] * 0.225) * 2) / 2,
      ] as [number, number];
    });
    territoryDisplayPolygonCache.set(key, smoothed);
    return smoothed;
  }

  function traceSmoothPath(points: Array<[number, number]>) {
    if (!points || points.length === 0) return;
    ctx.beginPath();
    if (points.length < 3) {
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++)
        ctx.lineTo(points[i][0], points[i][1]);
      return;
    }
    const last = points[points.length - 1];
    const first = points[0];
    ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      ctx.quadraticCurveTo(
        current[0],
        current[1],
        (current[0] + next[0]) / 2,
        (current[1] + next[1]) / 2,
      );
    }
    ctx.closePath();
  }

  function fillSmoothPath(points: Array<[number, number]>, color: any) {
    if (!points || points.length === 0) return;
    traceSmoothPath(points);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function strokeSmoothPath(
    points: Array<[number, number]>,
    strokeStyle: any,
    lineWidth: number,
  ) {
    if (!points || points.length === 0) return;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    traceSmoothPath(points);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
  }

  function strokePath(points, strokeStyle, lineWidth) {
    if (!points || points.length === 0) return;
    ctx.beginPath();
    ctx.lineJoin = "round";
    ctx.miterLimit = 2.0;
    ctx.lineCap = "round";
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function drawStrategyContinentLayer(
    visibleRegions: Array<[any, number]>,
    visibleIslets: Array<[any, number]>,
  ) {
    const makeOffset = (
      r: any,
      id: number,
      isIslet: boolean,
      amount: number,
      dx = 0,
      dy = 0,
    ) => {
      const land = getSharedRegionPolygon(r, id, isIslet);
      if (isIslet) {
        return land.map(([px, py]) => {
          const vx = px - r.x;
          const vy = py - r.y;
          const dist = Math.hypot(vx, vy) || 1;
          return [
            Math.round(r.x + (vx / dist) * (dist + amount) + dx),
            Math.round(r.y + (vy / dist) * (dist + amount * 0.78) + dy),
          ] as [number, number];
        });
      }

      const offsetLand = land.map(([px, py]) => {
        if (isSharedInlandVertex(px, py, r)) {
          return [px, py] as [number, number];
        }
        const vx = px - r.x;
        const vy = py - r.y;
        const dist = Math.hypot(vx, vy) || 1;
        return [
          Math.round(r.x + (vx / dist) * (dist + amount) + dx),
          Math.round(r.y + (vy / dist) * (dist + amount * 0.78) + dy),
        ] as [number, number];
      });

      return offsetLand;
    };

    const coastalRegions = visibleRegions.filter(([r]) => {
      if (r.isIslet || r.coastal || mainlandCoastalRegionIds.has(r.id))
        return true;
      const land = getSharedRegionPolygon(r, r.id, false);
      return land.some(([px, py]) => !isSharedInlandVertex(px, py, r));
    });

    coastalRegions.forEach(([r, id]) => {
      const biome = visualBiome(r, id, false);
      const bColor = biome.beach || "#f0a317";
      const cMid = biome.cliffMid || "#22150a";
      const cDeep = biome.cliffDeep || "#0c0804";
      const cUpper = biome.cliffUpper || "#4a3514";

      if (fastRenderMode) {
        fillPath(makeOffset(r, id, false, 18, 5, 11), cMid);
        fillPath(makeOffset(r, id, false, 8), bColor);
        return;
      }

      const seed = r.seed || id + 1;
      const wavePulse = Math.sin(state.tick * 3.6 + seed * 0.51) * 5.2;
      const waveCrash = Math.cos(state.tick * 5.5 - seed * 0.83) * 3.8;

      // 1. Shallow Ocean Wave Crests & Vivid White Foam
      fillPath(
        makeOffset(r, id, false, 56 + wavePulse),
        "rgba(14, 165, 233, 0.82)",
      );
      strokePath(
        makeOffset(r, id, false, 56 + wavePulse),
        "rgba(14, 165, 233, 0.55)",
        2.0,
      );
      fillPath(
        makeOffset(r, id, false, 40 + wavePulse * 0.75 + waveCrash),
        "rgba(56, 189, 248, 0.92)",
      );
      const foamPath = makeOffset(r, id, false, 27 + waveCrash * 1.2);
      fillPath(foamPath, "rgba(255, 255, 255, 0.96)");
      strokePath(foamPath, "#ffffff", 2.6);

      // 2. Extreme 3D Drop Shadow Base (+26px y-drop, +36px offset)
      const deepShadow = makeOffset(r, id, false, 36, 10, 26);
      fillPath(deepShadow, "rgba(0, 0, 0, 0.96)");
      strokePath(deepShadow, "#000000", 3.8);

      // 3. Lower Terraced Cliff Base (+18px y-drop, +28px offset)
      const cliffDeep = makeOffset(r, id, false, 28, 8, 18);
      fillPath(cliffDeep, cDeep);
      strokePath(cliffDeep, "rgba(0, 0, 0, 0.88)", 2.4);

      // 4. Mid Terraced Cliff Face (+12px y-drop, +20px offset)
      const cliffMid = makeOffset(r, id, false, 20, 5, 12);
      fillPath(cliffMid, cMid);
      strokePath(cliffMid, "rgba(0, 0, 0, 0.70)", 2.0);

      // 5. Upper Cliff Rim Terrace (+6px y-drop, +13px offset)
      const cliffUpper = makeOffset(r, id, false, 13, 2, 6);
      fillPath(cliffUpper, cUpper);
      strokePath(cliffUpper, "rgba(0, 0, 0, 0.50)", 1.6);

      // 6. VÃ¢n vÃ¡ch Ä‘Ã¡ 3D ná»©t náº» sáº¯c nÃ©t (Vertical Rock Crevices & Striations)
      ctx.strokeStyle = "rgba(0, 0, 0, 0.76)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i < cliffUpper.length; i += 2) {
        ctx.moveTo(cliffUpper[i][0], cliffUpper[i][1]);
        ctx.lineTo(
          cliffDeep[i % cliffDeep.length][0],
          cliffDeep[i % cliffDeep.length][1],
        );
      }
      ctx.stroke();

      // 7. Sunlight Highlights on top-facing rocky edges
      ctx.strokeStyle = "rgba(254, 240, 138, 0.52)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 1; i < cliffUpper.length; i += 2) {
        ctx.moveTo(cliffUpper[i][0], cliffUpper[i][1]);
        ctx.lineTo(
          deepShadow[i % deepShadow.length][0],
          deepShadow[i % deepShadow.length][1],
        );
      }
      ctx.stroke();

      // 8. Vivid Golden Sand Beach Rim & Inner Highlight
      const beachRim = makeOffset(r, id, false, 8);
      fillPath(beachRim, bColor);
      strokePath(beachRim, "#92400e", 1.8);
      const beachHighlight = makeOffset(r, id, false, 4);
      fillPath(beachHighlight, "rgba(254, 240, 138, 0.45)");
    });

    visibleRegions.forEach(([r, id]) => {
      const biome = visualBiome(r, id, false);
      // Inflate +3px and add stroke seam-filler to close all subpixel gaps between inland regions
      const innerFill = makeOffset(r, id, false, 3, 0, 0);
      fillPath(innerFill, biome.dark || "#2f5d31");
      fillPath(makeOffset(r, id, false, 5, 1, 2), biome.b || "#427a32");
      strokePath(innerFill, biome.b || "#427a32", 4.0); // Wide seam-filler: covers all gaps
    });

    visibleIslets.forEach(([r, id]) => {
      const biome = visualBiome(r, id, true);
      const seed = r.seed || id + 1;
      const wavePulse = Math.sin(state.tick * 3.6 + seed * 0.51) * 3.5;
      const cDeep = biome.cliffDeep || "#0c0804";
      const bColor = biome.beach || "#eab308";

      // Waves & Foam for Islets
      fillPath(
        makeOffset(r, id, true, 34 + wavePulse),
        "rgba(14, 165, 233, 0.82)",
      );
      fillPath(makeOffset(r, id, true, 20), "rgba(255, 255, 255, 0.95)");
      strokePath(makeOffset(r, id, true, 20), "#ffffff", 2.4);

      // 3D Shadow & Terraced Cliff Elevation
      const isletShadow = makeOffset(r, id, true, 24, 8, 16);
      fillPath(isletShadow, "rgba(0, 0, 0, 0.94)");
      strokePath(isletShadow, "#000000", 2.8);

      const isletCliff = makeOffset(r, id, true, 18, 5, 10);
      fillPath(isletCliff, cDeep);
      strokePath(isletCliff, "rgba(0, 0, 0, 0.82)", 2.0);

      // Golden Beach & Island Land
      const isletBeach = makeOffset(r, id, true, 10);
      fillPath(isletBeach, bColor);
      strokePath(isletBeach, "#92400e", 1.8);
      fillPath(makeOffset(r, id, true, 4), biome.b);
    });
  }

  const darkerColorCache = new Map<string, string>();
  const lighterColorCache = new Map<string, string>();

  function getDarkerColor(hex: string, factor = 0.6): string {
    if (!hex || typeof hex !== "string") return "#1e3a8a";
    const cacheKey = `${hex}:${factor}`;
    const cached = darkerColorCache.get(cacheKey);
    if (cached) return cached;
    const clean = hex.replace("#", "");
    const fullHex =
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean;
    let r = parseInt(fullHex.slice(0, 2), 16) || 0;
    let g = parseInt(fullHex.slice(2, 4), 16) || 0;
    let b = parseInt(fullHex.slice(4, 6), 16) || 0;
    r = Math.max(0, Math.min(255, Math.floor(r * factor)));
    g = Math.max(0, Math.min(255, Math.floor(g * factor)));
    b = Math.max(0, Math.min(255, Math.floor(b * factor)));
    const result = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    darkerColorCache.set(cacheKey, result);
    return result;
  }

  function getLighterColor(hex: string, factor = 1.3): string {
    if (!hex || typeof hex !== "string") return "#60a5fa";
    const cacheKey = `${hex}:${factor}`;
    const cached = lighterColorCache.get(cacheKey);
    if (cached) return cached;
    const clean = hex.replace("#", "");
    const fullHex =
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean;
    let r = parseInt(fullHex.slice(0, 2), 16) || 0;
    let g = parseInt(fullHex.slice(2, 4), 16) || 0;
    let b = parseInt(fullHex.slice(4, 6), 16) || 0;
    r = Math.max(0, Math.min(255, Math.floor(r * factor)));
    g = Math.max(0, Math.min(255, Math.floor(g * factor)));
    b = Math.max(0, Math.min(255, Math.floor(b * factor)));
    const result = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    lighterColorCache.set(cacheKey, result);
    return result;
  }

  function getRegionFlagColor(regionId: number): string {
    if (regionId < 0) return state.newbieFlagColor || "#2563eb";
    const ownerCode = derivedRegionOwnership(regionId);
    if (ownerCode === 1) {
      return (
        state.newbieFlagColor ||
        state.regionOwnerFlagColors[regionId] ||
        "#2563eb"
      );
    }
    if (state.regionOwnerFlagColors[regionId]) {
      return state.regionOwnerFlagColors[regionId];
    }
    const timing = state.activeClearingTimings?.[regionId];
    if (timing?.ownerFlagColor) {
      return timing.ownerFlagColor;
    }
    if (timing?.playerId && timing.playerId === state.localPlayerId) {
      return state.newbieFlagColor || "#2563eb";
    }

    const isClearing =
      state.regionInProgress === regionId ||
      Boolean(state.activeClearingTimings?.[regionId]) ||
      (state.regionClearing[regionId] > 0 &&
        state.regionClearing[regionId] < 1) ||
      state.regionOwnerNames[regionId] === "ÄANG KHAI HOANG";

    const isLocalClearing =
      isClearing &&
      (state.regionInProgress === regionId ||
        state.regionOwnerIds[regionId] === state.localPlayerId ||
        state.activeClearingTimings?.[regionId]?.playerId ===
          state.localPlayerId);

    if (isLocalClearing) {
      return state.newbieFlagColor || "#2563eb";
    }
    if (isClearing) {
      return "#ef4444";
    }
    if (ownerCode > 1) {
      return factions[ownerCode]?.color || "#ef4444";
    }
    return state.newbieFlagColor || "#2563eb";
  }

  function drawRegionTerrain(
    r: any,
    seed: number,
    rx: number,
    ry: number,
    _originalBiome: number,
    terrainBiome = _originalBiome,
  ) {
    if (isHidingTerritoryAssets() || state.zoom < 0.28) return;
    drawLakeInRegion(r, seed, rx, ry);
    drawRiverInRegion(r, seed, rx, ry);
    if (fastRenderMode || crowdedRenderMode || isFastPanning()) return;

    drawNaturalTerritoryVegetation(r, seed, rx, ry, terrainBiome);

    const atlas = getMedievalWorldAtlas();
    if (!atlas.complete || !atlas.naturalWidth) return;

    const hasTown = frameTownRegionIds.has(Number(r.id));
    const specials = territorySpecialResources(r.id);
    const special = specials.find((name) =>
      [
        "BÃ£i ngá»±a",
        "XÆ°á»Ÿng rÃ¨n",
        "Báº¿n tÃ u tá»± nhiÃªn",
        "Má» Ngá»c",
      ].includes(name),
    );

    // Adjust cluster chance to 75% to keep the map clean and less crowded
    const density = hash(seed * 43 + r.id * 19);
    if (!special && !hasTown && density > 0.75) return;
    if (!special && hasTown && state.zoom < 0.5) return;

    const yields = territoryYield(r.id);
    const dominantResource = (["food", "wood", "stone", "gold"] as const)
      .map((key) => [key, Number(yields[key] || 0)] as const)
      .sort((a, b) => b[1] - a[1])[0][0];

    const clusterX = Math.floor(r.x / 760);
    const clusterY = Math.floor(r.y / 620);
    const clusterRoll = hash(clusterX * 97.31 + clusterY * 173.17);
    const baseAngle = hash(clusterX * 311.7 + clusterY * 47.9) * TAU;
    const angle = baseAngle + (hash(seed * 61) - 0.5) * 0.7;

    // Wooded/Grass biomes (0, 3, 5, 6, 7): Mix colors organically!
    let naturalLandmark = "forest_oak";
    if (terrainBiome === 2) {
      naturalLandmark = "forest_snow";
    } else if (terrainBiome === 1) {
      naturalLandmark = "desert";
    } else {
      const treeRoll = hash(seed * 59 + r.id * 13);
      if (treeRoll < 0.48) {
        naturalLandmark = "forest_oak"; // Green oak
      } else if (treeRoll < 0.78) {
        naturalLandmark = "forest_pine"; // Deep green pine
      } else {
        naturalLandmark = "forest_autumn"; // Orange/Yellow autumn
      }
    }

    // Resources stay authoritative in the tooltip/economy. On the world map
    // they are represented by natural vegetation instead of mine buildings.
    let primarySprite: string = naturalLandmark;
    if (special === "BÃ£i ngá»±a") primarySprite = "horse";
    else if (special === "XÆ°á»Ÿng rÃ¨n") primarySprite = "cottage";
    else if (special === "Báº¿n tÃ u tá»± nhiÃªn") primarySprite = "harbor";
    else if (special === "Má» Ngá»c") primarySprite = naturalLandmark;
    else if (dominantResource === "wood") {
      const resRoll = hash(seed * 71 + r.id * 17);
      if (resRoll < 0.65) {
        primarySprite = naturalLandmark;
      } else {
        primarySprite = "wood";
      }
    } else if (dominantResource === "food") {
      const resRoll = hash(seed * 71 + r.id * 17);
      primarySprite =
        resRoll < 0.4 ? "food" : resRoll < 0.7 ? "cottage" : naturalLandmark;
    } else if (dominantResource === "stone") {
      const resRoll = hash(seed * 71 + r.id * 17);
      primarySprite = resRoll < 0.5 ? "stone" : naturalLandmark;
    } else if (dominantResource === "gold") {
      const resRoll = hash(seed * 71 + r.id * 17);
      primarySprite = resRoll < 0.4 ? "gold" : naturalLandmark;
    }

    if (!special && !hasTown && clusterRoll < 0.16) {
      if (terrainBiome === 1) primarySprite = "desert";
      else if (terrainBiome === 2) primarySprite = "forest_snow";
      else if (terrainBiome === 3) primarySprite = "forest_pine";
      else if (terrainBiome === 5) primarySprite = "forest_autumn";
    }

    // Now we generate a beautiful diorama cluster (Trees, Bushes, Flora & Wildlife ONLY - NO MINES)
    interface DioramaItem {
      type:
        | "sprite"
        | "oak"
        | "autumn"
        | "pine"
        | "palm"
        | "grass"
        | "bush"
        | "flower"
        | "berry"
        | "mushroom"
        | "chest"
        | "deer"
        | "boar"
        | "elephant";
      spriteName?: string;
      x: number;
      y: number;
      size: number;
      scale: number;
    }
    const items: DioramaItem[] = [];

    // Let's decide how many items to place (reduced to keep the map clean and not too crowded)
    let itemCount = 2 + Math.floor(hash(seed * 113) * 2); // 2 to 3 items
    if (special)
      itemCount = 4 + Math.floor(hash(seed * 73) * 2); // 4 to 5 items
    else if (
      dominantResource === "wood" ||
      primarySprite.startsWith("forest_")
    ) {
      itemCount = 3 + Math.floor(hash(seed * 97) * 3); // 3 to 5 items
    }

    const minRadius = hasTown ? 0.34 : 0.12;
    const maxRadius = hasTown ? 0.62 : 0.48;
    const minDimension = Math.min(rx * 2, ry * 2);

    for (let i = 0; i < itemCount; i++) {
      const itemSeed = seed * 37 + i * 19;
      const angle = hash(itemSeed * 29) * TAU;
      const radiusMult =
        minRadius + hash(itemSeed * 43) * (maxRadius - minRadius);

      const dx = Math.cos(angle) * rx * radiusMult;
      const dy = Math.sin(angle) * ry * radiusMult * 0.78; // Isometric compression

      let x = r.x + dx;
      let y = r.y + dy;

      if (special === "Báº¿n tÃ u tá»± nhiÃªn" && i > 0) {
        const continent = megaContinents.find((c) => {
          const nx = (r.x - c.x) / c.rx;
          const ny = (r.y - c.y) / c.ry;
          return nx * nx + ny * ny <= 2.2;
        });
        const cx = continent ? continent.x : 1200;
        const cy = continent ? continent.y : 800;
        const cdx = r.x - cx;
        const cdy = r.y - cy;
        const clen = Math.hypot(cdx, cdy) || 1;
        const harborX = r.x + (cdx / clen) * rx * 0.82;
        const harborY = r.y + (cdy / clen) * ry * 0.82;

        const angleInward = Math.atan2(r.y - harborY, r.x - harborX);
        const scatterRoll = hash(itemSeed * 53);
        const dist = 12 + scatterRoll * 26;
        const angleOffset = angleInward + (hash(itemSeed * 59) - 0.5) * 1.8;
        x = harborX + Math.cos(angleOffset) * dist;
        y = harborY + Math.sin(angleOffset) * dist;
      }

      // First item is always the primary tree/landmark at the core
      if (i === 0) {
        const size = Math.max(
          38,
          Math.min(
            hasTown ? 50 : state.zoom >= 0.75 ? 112 : 90,
            minDimension * (hasTown ? 0.22 : 0.34),
          ),
        );
        let posX = r.x + dx * (hasTown ? 1 : 0.4);
        let posY = r.y + dy * (hasTown ? 1 : 0.4);
        if (primarySprite === "harbor") {
          const continent = megaContinents.find((c) => {
            const nx = (r.x - c.x) / c.rx;
            const ny = (r.y - c.y) / c.ry;
            return nx * nx + ny * ny <= 2.2;
          });
          const cx = continent ? continent.x : 1200;
          const cy = continent ? continent.y : 800;
          const cdx = r.x - cx;
          const cdy = r.y - cy;
          const clen = Math.hypot(cdx, cdy) || 1;
          posX = r.x + (cdx / clen) * rx * 0.82;
          posY = r.y + (cdy / clen) * ry * 0.82;
        }
        items.push({
          type: "sprite",
          spriteName: primarySprite,
          x: posX,
          y: posY,
          size,
          scale: 1.0,
        });
        continue;
      }

      // Other items are surrounding flora (trees, bushes, flowers, berries, mushrooms ONLY)
      const roll = hash(itemSeed * 61);
      const scale = 0.8 + hash(itemSeed * 83) * 0.4;
      const size = Math.max(
        34,
        Math.min(64, minDimension * (0.16 + roll * 0.12)),
      );

      if (special === "BÃ£i ngá»±a") {
        if (roll < 0.35) {
          items.push({
            type: "sprite",
            spriteName: "horse",
            x,
            y,
            size: size * 0.9,
            scale,
          });
        } else if (roll < 0.7) {
          items.push({ type: "grass", x, y, size, scale });
        } else {
          items.push({ type: "flower", x, y, size, scale });
        }
      } else if (special === "XÆ°á»Ÿng rÃ¨n") {
        if (roll < 0.4) {
          items.push({ type: "bush", x, y, size, scale });
        } else if (roll < 0.75) {
          items.push({ type: "oak", x, y, size, scale });
        } else {
          items.push({ type: "berry", x, y, size, scale });
        }
      } else if (special === "Báº¿n tÃ u tá»± nhiÃªn") {
        if (roll < 0.4) {
          items.push({
            type: "sprite",
            spriteName: "harbor",
            x,
            y,
            size: size * 0.8,
            scale,
          });
        } else if (roll < 0.75) {
          items.push({ type: "grass", x, y, size, scale });
        } else {
          items.push({ type: "bush", x, y, size, scale });
        }
      } else if (special === "Má» Ngá»c") {
        if (roll < 0.4) {
          items.push({
            type: "sprite",
            spriteName: "gems",
            x,
            y,
            size: size * 0.9,
            scale,
          });
        } else if (roll < 0.7) {
          items.push({ type: "flower", x, y, size, scale });
        } else {
          items.push({ type: "bush", x, y, size, scale });
        }
      } else {
        // Nature & Flora Theme across all biomes
        if (roll < 0.45) {
          let treeType:
            | "oak"
            | "pine"
            | "autumn"
            | "snow_tree"
            | "palm"
            | "sprite" = "oak";
          let spriteName = "forest_oak";
          if (terrainBiome === 2) {
            treeType = "snow_tree";
            spriteName = "forest_snow";
          } else if (terrainBiome === 1) {
            treeType = "palm";
            spriteName = "desert";
          } else {
            // Wooded/Grass biomes: Mix individual surrounding trees colorfully!
            const treeRoll = hash(itemSeed * 53 + i * 11);
            if (treeRoll < 0.48) {
              treeType = "oak";
              spriteName = "forest_oak";
            } else if (treeRoll < 0.78) {
              treeType = "pine";
              spriteName = "forest_pine";
            } else {
              treeType = "autumn";
              spriteName = "forest_autumn";
            }
          }

          if (roll < 0.22 && treeType !== "palm") {
            items.push({ type: treeType, x, y, size, scale });
          } else {
            items.push({ type: "sprite", spriteName, x, y, size, scale });
          }
        } else if (roll < 0.65) {
          items.push({ type: "berry", x, y, size, scale });
        } else if (roll < 0.82) {
          items.push({ type: "mushroom", x, y, size, scale });
        } else if (roll < 0.92) {
          items.push({ type: "flower", x, y, size, scale });
        } else {
          items.push({ type: "bush", x, y, size, scale });
        }
      }
    }

    // Sort items by Y for correct overlapping
    items.sort((a, b) => a.y - b.y);

    // Draw all items in the diorama
    items.forEach((item) => {
      const { type, spriteName, x, y, size, scale } = item;
      if (type === "sprite" && spriteName) {
        drawMedievalWorldSprite(spriteName, x, y, size, special ? 1.0 : 0.96);
      } else if (type === "oak") {
        drawOakTree(x, y, scale * 1.25);
      } else if (type === "autumn") {
        drawAutumnTree(x, y, scale * 1.25);
      } else if (type === "pine") {
        drawPineTree(x, y, scale * 1.25);
      } else if (type === "palm") {
        drawPalmTree(x, y, scale * 1.25);
      } else if (type === "grass") {
        drawGrassPatch(x, y, scale * 1.2);
      } else if (type === "bush") {
        drawBush(x, y, scale * 1.2);
      } else if (type === "flower") {
        drawFlower(x, y, scale * 1.2);
      } else if (type === "berry") {
        drawBerryBush(x, y, scale * 1.25);
      } else if (type === "mushroom") {
        drawMushrooms(x, y, scale * 1.2);
      } else if (type === "rock") {
        drawRockPile(x, y, scale * 1.25);
      } else if (type === "ruins") {
        drawRuins(x, y, scale * 1.2);
      } else if (type === "chest") {
        drawChest(x, y, scale * 1.1);
      } else if (type === "cave") {
        drawCave(x, y, scale * 1.2);
      } else if (type === "deer") {
        drawDeer(x, y, scale * 1.15);
      } else if (type === "boar") {
        drawBoar(x, y, scale * 1.15);
      } else if (type === "elephant") {
        drawElephant(x, y, scale * 1.2);
      } else if (type === "resource" && spriteName) {
        drawResourceIcon(spriteName, x, y);
      }
    });

    const detailRoll = hash(seed * 901 + r.id * 37);
    if (!hasTown && !special && state.zoom >= 0.66 && detailRoll < 0.24) {
      const detailAngle = angle + Math.PI;
      const detailRadius = 0.24 + hash(seed * 919) * 0.1;
      const detailX = r.x + Math.cos(detailAngle) * rx * detailRadius;
      const detailY = r.y + Math.sin(detailAngle) * ry * detailRadius;
      let detailColumn = 0;
      let detailRow = 0; // Lush green tree
      if (dominantResource === "food") {
        detailColumn = detailRoll < 0.12 ? 0 : 1;
        detailRow = 0;
      } else if (derivedRegionOwnership(r.id) > 0 && detailRoll < 0.08) {
        detailColumn = 0;
        detailRow = 0;
      }
      const detailSize = Math.max(34, Math.min(62, minDimension * 0.28));
      drawMedievalDetailSprite(
        detailColumn,
        detailRow,
        detailX,
        detailY,
        detailSize,
      );
    }
  }

  function getRegionAllianceRelation(
    idx: number,
    ownerCode: number,
    ownerName?: string,
  ): "own" | "ally" | "enemy" {
    if (ownerCode === 1) return "own";
    if (!ownerCode) return "enemy";

    const tag = state.regionOwnerAllianceTags[idx];
    const myTag = state.myAllianceTag || state.myAlliance?.tag;

    if (
      tag &&
      myTag &&
      typeof tag === "string" &&
      typeof myTag === "string" &&
      tag.toLowerCase() === myTag.toLowerCase()
    ) {
      return "ally";
    }

    const nameUpper = String(ownerName || "").toUpperCase();
    const tagUpper = String(tag || "").toUpperCase();

    if (
      (myTag && tagUpper && tagUpper === myTag.toUpperCase()) ||
      nameUpper.startsWith("[LIÃŠN MINH]") ||
      nameUpper.includes("LIÃŠN MINH") ||
      nameUpper.includes("ALLY") ||
      nameUpper.includes("DONGBINH")
    ) {
      return "ally";
    }

    return "enemy";
  }

  function expansionConnectionType(
    sourceRegionId: number,
    targetRegionId: number,
  ) {
    const source = landById(sourceRegionId);
    const target = landById(targetRegionId);
    if (!source || !target) return null;

    const dx = Math.abs(source.x - target.x);
    const dy = Math.abs(source.y - target.y);
    const sourceSpecials = territorySpecialResources(source.id);
    const sumRx = (source.rx || 100) + (target.rx || 100);
    const sumRy = (source.ry || 100) + (target.ry || 100);
    const normDistSq = (dx / sumRx) ** 2 + (dy / sumRy) ** 2;
    if (!source.isIslet && !target.isIslet && normDistSq <= 0.85) return "land";

    const targetIsCoastal = Boolean(
      target.isIslet ||
      target.coastal ||
      mainlandCoastalRegionIds.has(target.id) ||
      territorySpecialResources(target.id).includes("Báº¿n tÃ u tá»± nhiÃªn"),
    );
    const sourceHasHarbor = Boolean(
      source.isIslet || sourceSpecials.includes("Báº¿n tÃ u tá»± nhiÃªn"),
    );
    if (sourceHasHarbor && targetIsCoastal) return "sea";
    return null;
  }

  function expansionTargetState(
    regionId: number,
  ): "available" | "active" | null {
    if (derivedRegionOwnership(regionId) !== 0) return null;
    const sourceRegionId = state.expansionSourceRegionId;
    if (sourceRegionId !== null) {
      return expansionConnectionType(sourceRegionId, regionId)
        ? "active"
        : null;
    }
    const ownedIds = Object.keys(state.regionOwnership || {})
      .map(Number)
      .filter(
        (id) =>
          state.regionOwnership[id] === 1 ||
          state.regionOwnerIds?.[id] === state.localPlayerId,
      );

    for (const id of ownedIds) {
      if (expansionConnectionType(id, regionId)) return "available";
    }
    return null;
  }

  function expansionSourceRegionsForTarget(regionId: number): number[] {
    if (derivedRegionOwnership(regionId) !== 0) return [];
    const sources: number[] = [];
    const ownedIds = Object.keys(state.regionOwnership || {})
      .map(Number)
      .filter(
        (id) =>
          state.regionOwnership[id] === 1 ||
          state.regionOwnerIds?.[id] === state.localPlayerId,
      );

    for (const id of ownedIds) {
      if (expansionConnectionType(id, regionId)) sources.push(id);
    }
    return sources;
  }

  function drawRegion(r, idx, pass, isIslet) {
    if (pass === 3) {
      if (isConquestLayout) return;
      if (fastRenderMode || crowdedRenderMode || isFastPanning()) return;
      const cache = regionPass2Cache.get(idx);
      if (cache && cache.assetsCanvas) {
        const isSelected = state.selectedRegion === idx;
        ctx.drawImage(
          cache.assetsCanvas,
          0,
          0,
          cache.width,
          cache.height,
          cache.minX,
          cache.minY - (isSelected ? 8 : 0),
          cache.width / 1.5,
          cache.height / 1.5,
        );
      }
      return;
    }

    const biomeId = visualBiomeIndex(r, idx, isIslet);
    const biome = BIOMES[biomeId] || BIOMES[0];
    const seed = r.seed || idx + 1;
    const colorRoll = hash(seed * 73.17 + idx * 11.9);
    let territoryColor = biome.a;

    // Wooded/Grass green biomes: Mix terrain colors to look like a premium 2.5D medieval map
    const isGreenBiome = [0, 4, 5, 6, 7].includes(biomeId);
    if (!isIslet && isGreenBiome) {
      // 1. Continuous wave based on coordinates to cluster similar terrain types
      const zoneWave =
        Math.sin(r.x * 0.0018) * Math.cos(r.y * 0.0018) +
        Math.sin(r.x * 0.004 + r.y * 0.002) * 0.35;
      const zoneValue = (zoneWave + 1.35) / 2.7;

      // 2. Map zones to specific, soft earthy/mossy tones
      if (zoneValue < 0.22) {
        // Dry Soil / Dirt Patch (Soft clay/earth tone)
        territoryColor = colorRoll < 0.5 ? "#786b53" : "#6b5f48";
      } else if (zoneValue > 0.78) {
        // Stony / Pebble Ground (Soft mossy slate grey tone)
        territoryColor = colorRoll < 0.5 ? "#5f6a5c" : "#535e50";
      } else if (zoneValue >= 0.22 && zoneValue <= 0.36) {
        // Dried Moss / Savanna Grass (Soft autumn dry herbal tone)
        territoryColor = "#596638";
      } else {
        // Standard green variations
        territoryColor =
          colorRoll < 0.35
            ? biome.b || biome.a
            : colorRoll > 0.62
              ? getLighterColor(biome.a, 1.08 + hash(seed * 19.3) * 0.08)
              : colorRoll > 0.48
                ? getDarkerColor(biome.a, 0.82 + hash(seed * 7.1) * 0.08)
                : biome.a;
      }
    } else {
      // Normal biomes (Snow, Desert, Volcanic)
      territoryColor =
        colorRoll < 0.25
          ? biome.b || biome.a
          : colorRoll > 0.78
            ? getLighterColor(biome.a, 1.08 + hash(seed * 19.3) * 0.12)
            : colorRoll > 0.56
              ? getDarkerColor(biome.a, 0.82 + hash(seed * 7.1) * 0.12)
              : biome.a;
    }
    const scale = isIslet ? 0.82 : 0.995;

    // Use the exact same baseRx/baseRy as getSharedRegionPolygon for perfect coastal alignment
    const sizeFactor = 0.99 + hash(seed * 31) * 0.2;
    const rx = (r.rx || 230) * sizeFactor * scale;
    const ry = rx * 0.78;

    const cachePrefix = isIslet ? `islet_${idx}` : `region_${idx}`;

    // Get the shared land polygon first so we can base our cliffs/beaches/foams on it!
    const land = getSharedRegionPolygon(r, idx, isIslet);
    const displayLand = organicTerritoryDisplayPolygon(land, r, idx, isIslet);

    function getOffsetPolygon(offset: number): Array<[number, number]> {
      const rawOffset = land.map(([px, py]) => {
        if (!isIslet && isSharedInlandVertex(px, py, r)) {
          return [px, py] as [number, number];
        }
        const dx = px - r.x;
        const dy = py - r.y;
        const dist = Math.hypot(dx, dy) || 1;
        return [
          Math.round((r.x + (dx / dist) * (dist + offset)) * 2) / 2,
          Math.round((r.y + (dy / dist) * (dist + offset * 0.78)) * 2) / 2,
        ] as [number, number];
      });

      return rawOffset;
    }

    const hasSeaEdge =
      !isIslet && land.some(([px, py]) => !isSharedInlandVertex(px, py, r));
    const isCoastal =
      isIslet || r.coastal || mainlandCoastalRegionIds.has(r.id) || hasSeaEdge;

    if (pass === 0) {
      if (!isCoastal) return;
      if (fastRenderMode || crowdedRenderMode) return;
      // Pass 0: Multi-layer Animated Ocean Waves crashing against coastal cliffs
      if (isCoastal) {
        const wavePulse = Math.sin(state.tick * 3.6 + seed * 0.51) * 5.2;
        const waveCrash = Math.cos(state.tick * 5.5 - seed * 0.83) * 3.8;

        // 1. Outer cyan shallow ocean water ring
        const shallowRing = getOffsetPolygon(62 + wavePulse);
        fillPath(shallowRing, "rgba(14, 155, 225, 0.78)");
        strokePath(shallowRing, "rgba(14, 155, 225, 0.50)", 1.6);

        // 2. Mid bright cyan wave crest
        const waveCrest = getOffsetPolygon(45 + wavePulse * 0.75 + waveCrash);
        fillPath(waveCrest, "rgba(56, 189, 248, 0.88)");

        // 3. Vivid white ocean foam crashing right at cliff foot
        const foamEdge = getOffsetPolygon(30 + waveCrash * 1.3);
        fillPath(foamEdge, "rgba(255, 255, 255, 0.94)");
        strokePath(foamEdge, "rgba(255, 255, 255, 0.98)", 2.4);
      }
      return;
    }

    if (pass === 1) {
      if (!isCoastal) return;
      if (crowdedRenderMode && !isIslet) return;
      if (isIslet) {
        const cache = isletPass1Cache.get(idx);
        if (cache) {
          ctx.drawImage(
            cache.canvas,
            0,
            0,
            cache.width,
            cache.height,
            cache.minX,
            cache.minY,
            cache.width / 1.5,
            cache.height / 1.5,
          );
          return;
        } else {
          const xs = displayLand.map(([px]) => px);
          const ys = displayLand.map(([, py]) => py);
          const minX = Math.min(...xs) - 85;
          const maxX = Math.max(...xs) + 85;
          const minY = Math.min(...ys) - 85;
          const maxY = Math.max(...ys) + 85;
          const width = maxX - minX;
          const height = maxY - minY;

          const cacheScale = 1.5;
          const cacheCanvas = document.createElement("canvas");
          cacheCanvas.width = Math.ceil(width * cacheScale);
          cacheCanvas.height = Math.ceil(height * cacheScale);
          const cacheCtx = cacheCanvas.getContext("2d")!;

          const tempCtx = ctx;
          ctx = cacheCtx;

          ctx.save();
          ctx.scale(cacheScale, cacheScale);
          ctx.translate(-minX, -minY);

          const cDeep = biome.cliffDeep || "#080503";
          const cMid = biome.cliffMid || "#1a1007";
          const cUpper = biome.cliffUpper || "#483214";
          const cHi = biome.hi || "#8c6b32";
          const bColor = biome.beach || "#f0a317";

          if (fastRenderMode) {
            fillPath(
              getOffsetPolygon(18).map(
                ([px, py]) => [px + 5, py + 11] as [number, number],
              ),
              cMid,
            );
            fillPath(getOffsetPolygon(8), bColor);
          } else {
            const shadowBase = getOffsetPolygon(38).map(
              ([px, py]) => [px + 12, py + 28] as [number, number],
            );
            fillPath(shadowBase, "rgba(0, 0, 0, 0.96)");
            strokePath(shadowBase, "rgba(0, 0, 0, 1.0)", 3.6);

            const cliffDeep = getOffsetPolygon(30).map(
              ([px, py]) => [px + 9, py + 20] as [number, number],
            );
            fillPath(cliffDeep, cDeep);
            strokePath(cliffDeep, "rgba(0, 0, 0, 0.85)", 2.4);

            const cliffBase = getOffsetPolygon(22).map(
              ([px, py]) => [px + 6, py + 13] as [number, number],
            );
            const baseGrad = ctx.createLinearGradient(
              r.x - rx * 0.5,
              r.y - ry * 0.6,
              r.x + rx * 0.4,
              r.y + ry + 22,
            );
            baseGrad.addColorStop(0, cUpper);
            baseGrad.addColorStop(0.5, cMid);
            baseGrad.addColorStop(1, cDeep);
            fillPath(cliffBase, baseGrad);
            strokePath(cliffBase, "rgba(0, 0, 0, 0.65)", 2.0);

            const coast = getOffsetPolygon(15).map(
              ([px, py]) => [px + 3, py + 7] as [number, number],
            );
            const coastGrad = ctx.createLinearGradient(
              r.x - rx * 0.4,
              r.y - ry * 0.6,
              r.x + rx * 0.3,
              r.y + ry + 12,
            );
            coastGrad.addColorStop(0, cHi);
            coastGrad.addColorStop(0.45, cUpper);
            coastGrad.addColorStop(1, cMid);
            fillPath(coast, coastGrad);
            strokePath(coast, "rgba(0, 0, 0, 0.45)", 1.5);

            ctx.strokeStyle = "rgba(0, 0, 0, 0.68)";
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            for (let i = 0; i < coast.length; i += 2) {
              ctx.moveTo(coast[i][0], coast[i][1]);
              ctx.lineTo(
                cliffDeep[i % cliffDeep.length][0],
                cliffDeep[i % cliffDeep.length][1],
              );
            }
            ctx.stroke();

            ctx.strokeStyle = "rgba(255, 230, 140, 0.35)";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            for (let i = 1; i < coast.length; i += 2) {
              ctx.moveTo(coast[i][0], coast[i][1]);
              ctx.lineTo(
                shadowBase[i % shadowBase.length][0],
                shadowBase[i % shadowBase.length][1],
              );
            }
            ctx.stroke();

            const sandRim = getOffsetPolygon(9);
            fillPath(sandRim, bColor);
            strokePath(sandRim, "#c47d08", 1.6);

            const sandHighlight = getOffsetPolygon(4);
            fillPath(sandHighlight, "rgba(255, 236, 120, 0.42)");

            const foamEdge = getOffsetPolygon(34).map(
              ([px, py]) => [px + 7, py + 16] as [number, number],
            );
            strokePath(foamEdge, "rgba(255, 255, 255, 0.65)", 2.0);
          }

          ctx.restore();
          ctx = tempCtx;

          isletPass1Cache.set(idx, {
            canvas: cacheCanvas,
            minX,
            minY,
            width: cacheCanvas.width,
            height: cacheCanvas.height,
            hasTown: false,
            hasOwner: false,
          });

          ctx.drawImage(
            cacheCanvas,
            0,
            0,
            cacheCanvas.width,
            cacheCanvas.height,
            minX,
            minY,
            width,
            height,
          );
        }
      } else {
        const cDeep = biome.cliffDeep || "#080503";
        const cMid = biome.cliffMid || "#1a1007";
        const cUpper = biome.cliffUpper || "#483214";
        const cHi = biome.hi || "#8c6b32";
        const bColor = biome.beach || "#f0a317";

        if (fastRenderMode) {
          fillPath(
            getOffsetPolygon(18).map(
              ([px, py]) => [px + 5, py + 11] as [number, number],
            ),
            cMid,
          );
          fillPath(getOffsetPolygon(8), bColor);
        } else {
          const shadowBase = getOffsetPolygon(38).map(
            ([px, py]) => [px + 12, py + 28] as [number, number],
          );
          fillPath(shadowBase, "rgba(0, 0, 0, 0.96)");
          strokePath(shadowBase, "rgba(0, 0, 0, 1.0)", 3.6);

          const cliffDeep = getOffsetPolygon(30).map(
            ([px, py]) => [px + 9, py + 20] as [number, number],
          );
          fillPath(cliffDeep, cDeep);
          strokePath(cliffDeep, "rgba(0, 0, 0, 0.85)", 2.4);

          const cliffBase = getOffsetPolygon(22).map(
            ([px, py]) => [px + 6, py + 13] as [number, number],
          );
          const baseGrad = ctx.createLinearGradient(
            r.x - rx * 0.5,
            r.y - ry * 0.6,
            r.x + rx * 0.4,
            r.y + ry + 22,
          );
          baseGrad.addColorStop(0, cUpper);
          baseGrad.addColorStop(0.5, cMid);
          baseGrad.addColorStop(1, cDeep);
          fillPath(cliffBase, baseGrad);
          strokePath(cliffBase, "rgba(0, 0, 0, 0.65)", 2.0);

          const coast = getOffsetPolygon(15).map(
            ([px, py]) => [px + 3, py + 7] as [number, number],
          );
          const coastGrad = ctx.createLinearGradient(
            r.x - rx * 0.4,
            r.y - ry * 0.6,
            r.x + rx * 0.3,
            r.y + ry + 12,
          );
          coastGrad.addColorStop(0, cHi);
          coastGrad.addColorStop(0.45, cUpper);
          coastGrad.addColorStop(1, cMid);
          fillPath(coast, coastGrad);
          strokePath(coast, "rgba(0, 0, 0, 0.45)", 1.5);

          ctx.strokeStyle = "rgba(0, 0, 0, 0.68)";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          for (let i = 0; i < coast.length; i += 2) {
            ctx.moveTo(coast[i][0], coast[i][1]);
            ctx.lineTo(
              cliffDeep[i % cliffDeep.length][0],
              cliffDeep[i % cliffDeep.length][1],
            );
          }
          ctx.stroke();

          ctx.strokeStyle = "rgba(255, 230, 140, 0.35)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let i = 1; i < coast.length; i += 2) {
            ctx.moveTo(coast[i][0], coast[i][1]);
            ctx.lineTo(
              shadowBase[i % shadowBase.length][0],
              shadowBase[i % shadowBase.length][1],
            );
          }
          ctx.stroke();

          const sandRim = getOffsetPolygon(9);
          fillPath(sandRim, bColor);
          strokePath(sandRim, "#c47d08", 1.6);

          const sandHighlight = getOffsetPolygon(4);
          fillPath(sandHighlight, "rgba(255, 236, 120, 0.42)");

          const foamEdge = getOffsetPolygon(34).map(
            ([px, py]) => [px + 7, py + 16] as [number, number],
          );
          strokePath(foamEdge, "rgba(255, 255, 255, 0.65)", 2.0);
        }
      }
      return;
    }

    if (r.isWater) {
      if (pass === 0) {
        const wavePulse = Math.sin(state.tick * 2.8 + seed) * 2.2;
        const waterPoly = getOrganicPath(
          r.x,
          r.y,
          rx + 14,
          ry + 11,
          seed * 1.7,
          `${cachePrefix}_water_poly`,
        );
        fillPath(waterPoly, "#0369a1"); // Deep lake blue

        const waveFoam = getOrganicPath(
          r.x,
          r.y,
          rx + 10 + wavePulse,
          ry + 8 + wavePulse,
          seed * 1.7 + 0.1,
          `${cachePrefix}_water_foam`,
        );
        fillPath(waveFoam, "rgba(56, 189, 248, 0.75)"); // Cyan lake foam
      } else if (pass === 1) {
        const sandRim = getOrganicPath(
          r.x,
          r.y,
          rx + 4,
          ry + 3,
          seed * 1.7 + 0.25,
          `${cachePrefix}_water_sand`,
        );
        fillPath(sandRim, "#e0b257"); // Golden lake sand rim
      }
      return;
    }

    // Pass 2: Main land body using Shared Edge Mesh (Flat and unified)

    const ownerCode = isConquestLayout ? 0 : derivedRegionOwnership(idx);
    const isWildBase = ownerCode === 0;

    const isSelected = state.selectedRegion === idx;
    const targetPoly = isSelected
      ? displayLand.map(([px, py]) => [px, py - 8] as [number, number])
      : displayLand;

    if (pass === 2) {
      if (isSelected) {
        // 3D Drop Shadow for elevated floating active territory
        const shadowPoly = displayLand.map(
          ([px, py]) => [px, py + 12] as [number, number],
        );
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
        ctx.shadowBlur = 26;
        fillSmoothPath(shadowPoly, "rgba(0, 0, 0, 0.65)");
        strokeSmoothPath(shadowPoly, "rgba(0, 0, 0, 0.50)", 2.5);
        ctx.restore();
      }

      const hasTown = frameTownRegionIds.has(Number(r.id));
      const hasOwner = ownerCode > 0;
      const zoomTier = getZoomTier(state.zoom);
      const cache = regionPass2Cache.get(idx);

      if (
        cache &&
        cache.hasTown === hasTown &&
        cache.hasOwner === hasOwner &&
        cache.zoomTier === zoomTier
      ) {
        ctx.drawImage(
          cache.canvas,
          0,
          0,
          cache.width,
          cache.height,
          cache.minX,
          cache.minY - (isSelected ? 8 : 0),
          cache.width / 1.5,
          cache.height / 1.5,
        );
      } else {
        // If panning or in fast mode, and no cache exists, draw simplified directly to screen without caching
        if (fastRenderMode || crowdedRenderMode || isFastPanning()) {
          ctx.save();
          ctx.globalAlpha = isIslet || isCoastal ? 1 : 0.95;
          const landInflated = inflatePolygon(
            targetPoly,
            3,
            r.x,
            r.y - (isSelected ? 8 : 0),
          );
          fillSmoothPath(landInflated, territoryColor);
          strokeSmoothPath(landInflated, territoryColor, 4.2);
          ctx.restore();
        } else {
          // Build cache canvas at 1.5x resolution
          const xs = displayLand.map(([px]) => px);
          const ys = displayLand.map(([, py]) => py);
          const minX = Math.min(...xs) - 85;
          const maxX = Math.max(...xs) + 85;
          const minY = Math.min(...ys) - 85;
          const maxY = Math.max(...ys) + 85;
          const width = maxX - minX;
          const height = maxY - minY;

          const cacheScale = 1.5;
          const landCanvas = document.createElement("canvas");
          landCanvas.width = Math.ceil(width * cacheScale);
          landCanvas.height = Math.ceil(height * cacheScale);
          const landCtx = landCanvas.getContext("2d")!;

          // Swap ctx temporarily to render on land canvas
          let tempCtx = ctx;
          ctx = landCtx;

          ctx.save();
          ctx.scale(cacheScale, cacheScale);
          ctx.translate(-minX, -minY);

          ctx.save();
          ctx.globalAlpha = isIslet || isCoastal ? 1 : 0.95;
          const landInflated = inflatePolygon(displayLand, 3, r.x, r.y);
          const gradRadius = Math.max(rx, ry) * 1.35;
          const topoGrad = ctx.createRadialGradient(
            r.x,
            r.y,
            4,
            r.x,
            r.y,
            gradRadius,
          );
          topoGrad.addColorStop(0, getLighterColor(territoryColor, 1.22));
          topoGrad.addColorStop(0.55, territoryColor);
          topoGrad.addColorStop(1, getDarkerColor(territoryColor, 0.72));
          fillSmoothPath(landInflated, topoGrad);
          strokeSmoothPath(landInflated, territoryColor, 4.2);
          ctx.restore();

          ctx.restore();
          ctx = tempCtx;

          // Build assets canvas
          let assetsCanvas: HTMLCanvasElement | null = null;
          if (!isConquestLayout) {
            assetsCanvas = document.createElement("canvas");
            assetsCanvas.width = Math.ceil(width * cacheScale);
            assetsCanvas.height = Math.ceil(height * cacheScale);
            const assetsCtx = assetsCanvas.getContext("2d")!;

            tempCtx = ctx;
            ctx = assetsCtx;

            ctx.save();
            ctx.scale(cacheScale, cacheScale);
            ctx.translate(-minX, -minY);
            drawRegionTerrain(r, seed, rx, ry, biomeId, biomeId);
            ctx.restore();
            ctx = tempCtx;
          }

          regionPass2Cache.set(idx, {
            canvas: landCanvas,
            assetsCanvas,
            minX,
            minY,
            width: landCanvas.width,
            height: landCanvas.height,
            hasTown,
            hasOwner,
            zoomTier,
          });

          ctx.drawImage(
            landCanvas,
            0,
            0,
            landCanvas.width,
            landCanvas.height,
            minX,
            minY - (isSelected ? 8 : 0),
            width,
            height,
          );
        }
      }
    }

    // Siege visuals are rendered around the actual towns/units below. Never
    // colour or outline an entire territory: that was the old noisy combat UI.
    const conflict = null;
    const isClearing = isConquestLayout
      ? false
      : state.regionInProgress === idx ||
        Boolean(state.activeClearingTimings?.[idx]) ||
        (state.regionClearing[idx] > 0 && state.regionClearing[idx] < 1) ||
        state.regionOwnerNames[idx] === "ÄANG KHAI HOANG";

    const isLocalClearing =
      isClearing &&
      (state.regionInProgress === idx ||
        state.regionOwnerIds[idx] === state.localPlayerId ||
        state.activeClearingTimings?.[idx]?.playerId === state.localPlayerId);
    const isRemoteClearing = isClearing && !isLocalClearing;

    const rel = getRegionAllianceRelation(
      idx,
      ownerCode,
      state.regionOwnerNames[idx],
    );
    const flagColor = getRegionFlagColor(idx);

    // Fill overlay based on state (Seamless inflation to hide internal grid seams)
    if (pass === 2) {
      if (isLocalClearing) {
        ctx.save();
        ctx.globalAlpha = 0.45 + Math.sin(state.tick * 5) * 0.08;
        fillSmoothPath(targetPoly, flagColor);
        ctx.restore();
      } else if (isRemoteClearing) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(state.tick * 4) * 0.06;
        fillSmoothPath(targetPoly, flagColor);
        ctx.restore();
      } else if (rel === "own") {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(state.tick * 3) * 0.03;
        const ownedLand = inflatePolygon(displayLand, 4, r.x, r.y);
        fillSmoothPath(ownedLand, flagColor);
        ctx.restore();
      } else if (rel === "ally") {
        ctx.save();
        ctx.globalAlpha = 0.22;
        const allyLand = inflatePolygon(displayLand, 3, r.x, r.y);
        fillSmoothPath(allyLand, flagColor);
        ctx.restore();
      } else if (rel === "enemy" && ownerCode > 1) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        const enemyLand = inflatePolygon(displayLand, 3, r.x, r.y);
        fillSmoothPath(enemyLand, flagColor);
        ctx.restore();
      }

      const expansionState = expansionTargetState(idx);
      if (expansionState) {
        const pulse = 0.45 + Math.sin(state.tick * 4 + idx) * 0.18;
        ctx.save();
        if (expansionState === "active") {
          ctx.globalAlpha = 0.18 + pulse * 0.12;
          fillSmoothPath(targetPoly, "#fbbf24");
        } else {
          ctx.globalAlpha = 0.055 + pulse * 0.025;
          fillSmoothPath(targetPoly, "#facc15");
        }
        ctx.restore();
      }

      if (state.selectedRegion === idx) {
        ctx.save();
        traceSmoothPath(displayLand);
        ctx.clip();

        const pulse = Math.sin(state.tick * 5.0) * 0.12 + 0.38;
        let colorCenter, colorEdge;
        if (isClearing) {
          colorCenter = getLighterColor(flagColor, 1.2);
          colorEdge = getDarkerColor(flagColor, 0.2);
        } else {
          colorCenter = `rgba(255, 235, 90, ${pulse})`;
          colorEdge = `rgba(216, 155, 33, 0.03)`;
        }

        const maxRadius = Math.max(rx, ry) * 1.4;
        const grad = ctx.createRadialGradient(r.x, r.y, 4, r.x, r.y, maxRadius);
        grad.addColorStop(0, colorCenter);
        grad.addColorStop(0.6, colorCenter);
        grad.addColorStop(1, colorEdge);
        ctx.fillStyle = grad;
        ctx.fill();

        const sweepPos = ((state.tick * 60) % (rx * 4)) - rx * 2;
        const sweepGrad = ctx.createLinearGradient(
          r.x + sweepPos - 20,
          r.y,
          r.x + sweepPos + 20,
          r.y,
        );
        if (isClearing) {
          sweepGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
          sweepGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.35)");
          sweepGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        } else {
          sweepGrad.addColorStop(0, "rgba(255, 235, 90, 0)");
          sweepGrad.addColorStop(0.5, "rgba(255, 235, 90, 0.35)");
          sweepGrad.addColorStop(1, "rgba(255, 235, 90, 0)");
        }
        ctx.fillStyle = sweepGrad;
        ctx.fill();

        ctx.restore();
      }
    }

    if (pass === 4) {
      if (isClearing) {
        const clearingFlagColor = getRegionFlagColor(idx);
        ctx.save();
        traceSmoothPath(displayLand);

        ctx.shadowColor = clearingFlagColor;
        ctx.shadowBlur = 32;
        ctx.globalAlpha = 0.95 + Math.sin(state.tick * 5) * 0.05;
        ctx.strokeStyle = clearingFlagColor;
        ctx.lineWidth = 7.5;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isLocalClearing ? "#ffd34d" : "#ffffff";
        ctx.lineWidth = 3.5;
        ctx.setLineDash([12, 6]);
        ctx.lineDashOffset = -state.tick * 28;
        ctx.stroke();
        ctx.restore();
      }

      if (state.selectedRegion === idx) {
        ctx.save();

        // Recreate land path for the double neon glowing border stroke
        traceSmoothPath(targetPoly);

        // Define colors based on state
        let glowColor = "#ffe85a";
        let strokeColor = "#fff06a";
        let innerColor = "#ffffff";
        if (isClearing) {
          if (isLocalClearing) {
            glowColor = "#34d399";
            strokeColor = "#10b981";
            innerColor = "#ffffff";
          } else {
            glowColor = "#f87171";
            strokeColor = "#ef4444";
            innerColor = "#fca5a5";
          }
        }

        if (fastRenderMode) {
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.restore();
        } else {
          // Layer 1: Wide soft ambient glow
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 40 + Math.sin(state.tick * 6) * 8;
          ctx.globalAlpha = 0.6 + Math.sin(state.tick * 6) * 0.1;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 10;
          ctx.stroke();

          // Layer 2: Medium intense core neon glow
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 18;
          ctx.globalAlpha = 0.95 + Math.sin(state.tick * 8) * 0.05;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 5;
          ctx.stroke();

          // Layer 3: Solid high-contrast white core
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          ctx.strokeStyle = innerColor;
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Layer 4: Running dashed energy flow
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 0.85;
          ctx.strokeStyle = innerColor;
          ctx.lineWidth = 2.0;
          ctx.setLineDash([12, 10]);
          ctx.lineDashOffset = -state.tick * 22;
          ctx.stroke();

          ctx.restore();
        }

        // Draw tactical radar target crosshair at the center of the region!
        ctx.save();

        let tickColor = "#ffd34d";
        if (isClearing) {
          if (isLocalClearing) {
            tickColor = "#6ee7b7";
          } else {
            tickColor = "#fca5a5";
          }
        }

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;

        // 1. Outer rotating dashed ring
        const outerRad = 28 + Math.sin(state.tick * 5) * 3;
        ctx.beginPath();
        ctx.arc(r.x, r.y, outerRad, 0, Math.PI * 2);
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -state.tick * 12;
        ctx.stroke();

        // 2. Inner counter-rotating dashed ring
        const innerRad = 16;
        ctx.beginPath();
        ctx.arc(r.x, r.y, innerRad, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 1.0;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = state.tick * 8;
        ctx.stroke();

        // 3. Crosshair ticks (pulsing slightly and pointing inwards)
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(r.x - outerRad - 8, r.y);
        ctx.lineTo(r.x - outerRad + 3, r.y);
        ctx.moveTo(r.x + outerRad - 3, r.y);
        ctx.lineTo(r.x + outerRad + 8, r.y);
        ctx.moveTo(r.x, r.y - outerRad - 8);
        ctx.lineTo(r.x, r.y - outerRad + 3);
        ctx.moveTo(r.x, r.y + outerRad - 3);
        ctx.lineTo(r.x, r.y + outerRad + 8);

        ctx.strokeStyle = tickColor;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // 4. Corner target brackets (L-shapes around the crosshair for a futuristic hud look)
        const bracketSize = 8;
        const bracketDist = outerRad + 12;
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#ffffff";

        ctx.beginPath();
        ctx.moveTo(r.x - bracketDist, r.y - bracketDist + bracketSize);
        ctx.lineTo(r.x - bracketDist, r.y - bracketDist);
        ctx.lineTo(r.x - bracketDist + bracketSize, r.y - bracketDist);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(r.x + bracketDist, r.y - bracketDist + bracketSize);
        ctx.lineTo(r.x + bracketDist, r.y - bracketDist);
        ctx.lineTo(r.x + bracketDist - bracketSize, r.y - bracketDist);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(r.x - bracketDist, r.y + bracketDist - bracketSize);
        ctx.lineTo(r.x - bracketDist, r.y + bracketDist);
        ctx.lineTo(r.x - bracketDist + bracketSize, r.y + bracketDist);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(r.x + bracketDist, r.y + bracketDist - bracketSize);
        ctx.lineTo(r.x + bracketDist, r.y + bracketDist);
        ctx.lineTo(r.x + bracketDist - bracketSize, r.y + bracketDist);
        ctx.stroke();

        // 5. Center pulsing indicator dot
        ctx.beginPath();
        ctx.arc(r.x, r.y, 3.0, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 10;
        ctx.fill();

        ctx.restore();
      }

      const expansionState = expansionTargetState(idx);
      if (expansionState) {
        const pulse = 0.45 + Math.sin(state.tick * 4 + idx) * 0.18;
        ctx.save();
        if (expansionState === "active") {
          ctx.globalAlpha = 0.7 + pulse * 0.25;
          strokeSmoothPath(targetPoly, "#fef08a", 5);
        } else {
          ctx.globalAlpha = 0.22 + pulse * 0.1;
          strokeSmoothPath(targetPoly, "#fde68a", 2.5);
        }
        ctx.restore();
      }
    }
  }

  let isFastPanningFromInput = () => Boolean(state.drag);
  let applyCameraInertiaStep = () => {};
  let shouldIgnoreCanvasClick = (_p: { x: number; y: number }) => false;

  function isFastPanning() {
    return isFastPanningFromInput();
  }

  let fastRenderMode = false;
  let crowdedRenderMode = false;
  let ultraCrowdedRenderMode = false;

  function drawWorld() {
    const fastPan = isFastPanning();
    fastRenderMode = fastPan || state.zoom < 0.15;
    const renderEntityLoad =
      towns.length +
      state.voyages.length * 3 +
      (state.activeBattles?.length || 0) * 6;
    crowdedRenderMode = renderEntityLoad > 180;
    ultraCrowdedRenderMode = renderEntityLoad > 420;

    drawOcean();
    ctx.save();
    ctx.translate(
      (1 - state.zoom) * W * 0.48 + state.panX,
      (1 - state.zoom) * H * 0.48 + state.panY,
    );
    ctx.scale(state.zoom, state.zoom);

    if (!fastRenderMode) {
      drawWorldOceanTexture();
      drawWorldOceanDetails();
    }

    const vp = getWorldViewport();
    const visibleIslets: Array<[any, number]> = [];
    const visibleRegions: Array<[any, number]> = [];

    for (let i = 0; i < islets.length; i++) {
      const r = islets[i];
      if (isRegionInViewport(r, vp)) visibleIslets.push([r, r.id]);
    }
    for (let i = 0; i < regions.length; i++) {
      const r = regions[i];
      if (isRegionInViewport(r, vp)) visibleRegions.push([r, r.id]);
    }

    drawStrategyContinentLayer(visibleRegions, visibleIslets);

    visibleIslets.forEach(([r, id]) => drawRegion(r, id, 0, true));
    visibleIslets.forEach(([r, id]) => drawRegion(r, id, 1, true));

    visibleIslets.forEach(([r, id]) => drawRegion(r, id, 2, true));
    visibleRegions.forEach(([r, id]) => drawRegion(r, id, 2, false));

    if (state.selectedRegion !== null && state.selectedRegion !== undefined) {
      const activeId = state.selectedRegion;
      const activeRegion = landById(activeId);
      if (activeRegion && isRegionInViewport(activeRegion, vp)) {
        drawRegion(activeRegion, activeId, 2, Boolean(activeRegion.isIslet));
      }
    }

    visibleIslets.forEach(([r, id]) => drawRegion(r, id, 3, true));
    visibleRegions.forEach(([r, id]) => drawRegion(r, id, 3, false));

    if (state.selectedRegion !== null && state.selectedRegion !== undefined) {
      const activeId = state.selectedRegion;
      const activeRegion = landById(activeId);
      if (activeRegion && isRegionInViewport(activeRegion, vp)) {
        drawRegion(activeRegion, activeId, 3, Boolean(activeRegion.isIslet));
      }
    }

    visibleIslets.forEach(([r, id]) => drawRegion(r, id, 4, true));
    visibleRegions.forEach(([r, id]) => drawRegion(r, id, 4, false));

    if (state.selectedRegion !== null && state.selectedRegion !== undefined) {
      const activeId = state.selectedRegion;
      const activeRegion = landById(activeId);
      if (activeRegion && isRegionInViewport(activeRegion, vp)) {
        drawRegion(activeRegion, activeId, 4, Boolean(activeRegion.isIslet));
      }
    }

    if (!fastRenderMode && !crowdedRenderMode && !isConquestLayout)
      drawDecoration(vp);
    drawVoyages(vp);
    drawClaimedTerritoryMarkers(vp, [...visibleIslets, ...visibleRegions]);

    if (!isConquestLayout) {
      activeClearingRegionIds().forEach((regionId) =>
        drawSettlerForRegion(regionId),
      );
    }

    ctx.restore();
  }

  function drawCoin(x, y, scale) {
    const sc = scale || 1;
    const r = 9.5 * sc;
    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.beginPath();
    ctx.ellipse(x + 1 * sc, y + r * 0.7, r * 1.05, r * 0.45, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#92400e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(x, y - 0.5 * sc, r * 0.85, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(x, y - 0.8 * sc, r * 0.65, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.28, 0, TAU);
    ctx.fill();

    pxRect(x - 1 * sc, y - 3 * sc, 2 * sc, 5 * sc, "#78350f");
  }

  function drawResourceIcon(type, x, y) {
    const s = 1.65;
    if (y < 50) {
      // HUD top bar icons (remain compact and simple)
      if (type === "gold") drawCoin(x, y, 0.95);
      if (type === "wood") {
        pxRect(x - 18 * s, y - 5 * s, 36 * s, 11 * s, "#a8662c");
        pxRect(x - 10 * s, y - 15 * s, 36 * s, 11 * s, "#c7813a");
        pxRect(x + 13 * s, y - 16 * s, 9 * s, 9 * s, "#6c3b1e");
      }
      if (type === "stone") {
        pxRect(x - 17 * s, y - 4 * s, 22 * s, 18 * s, "#aeb7c0");
        pxRect(x + 2 * s, y - 14 * s, 22 * s, 23 * s, "#78858f");
        pxRect(x - 4 * s, y - 18 * s, 15 * s, 12 * s, "#d3d9de");
      }
      if (type === "gems") {
        pxRect(x - 8, y - 10, 16, 14, "#06b6d4");
        pxRect(x - 4, y - 14, 8, 8, "#a5f3fc");
      }
      return;
    }

    // World Map Premium 3D Resource Sprites from Atlas
    let spriteName = "stone";
    if (type === "gold") spriteName = "gold";
    else if (type === "wood") spriteName = "wood";
    else if (type === "stone") spriteName = "stone";
    else if (type === "gems") spriteName = "gems";
    else if (type === "iron") spriteName = "stone";
    else if (type === "food") spriteName = "food";
    else if (type === "coal") spriteName = "stone";
    else if (type === "sulfur") spriteName = "gold";
    else if (type === "horse" || type === "horses" || type === "pasture")
      spriteName = "horse";
    else if (type === "silver") spriteName = "stone";
    else if (type === "ruby") spriteName = "gems";
    else if (type === "amber") spriteName = "gems";

    drawMedievalWorldSprite(spriteName, x, y, 42);
  }

  function getDynamicButtons() {
    const rightX = W - 134;
    return [
      { id: "army", x: 24, y: H - 230, w: 104, h: 86, label: "QUÃ‚N Äá»˜I" },
      { id: "build", x: 24, y: H - 130, w: 104, h: 86, label: "XÃ‚Y Dá»°NG" },
      {
        id: "research",
        x: 140,
        y: H - 130,
        w: 104,
        h: 86,
        label: "NGHIÃŠN Cá»¨U",
      },
      { id: "treasure", x: rightX, y: 92, w: 110, h: 82, label: "Báº¢O Váº¬T" },
      { id: "map", x: rightX, y: 280, w: 110, h: 82, label: "Báº¢N Äá»’" },
      { id: "event", x: rightX, y: 374, w: 110, h: 82, label: "Sá»° KIá»†N" },
      { id: "home", x: rightX, y: 468, w: 110, h: 82, label: "THá»¦ ÄÃ”" },
    ];
  }

  function activeClearingRegionIds() {
    const ids = new Set<number>();
    if (state.regionInProgress >= 0) ids.add(state.regionInProgress);
    if (
      state.settlerTravel?.returning &&
      state.settlerTravel.targetRegionId >= 0
    ) {
      ids.add(state.settlerTravel.targetRegionId);
    }
    Object.entries(state.activeClearingTimings || {}).forEach(
      ([key, timing]: any) => {
        const id = Number(key);
        if (!Number.isFinite(id)) return;
        const progress =
          timing?.startedAt && timing?.completesAt
            ? timingProgress(timing.startedAt, timing.completesAt)
            : state.regionClearing[id] || 0;
        if (progress < 1) ids.add(id);
      },
    );
    return [...ids];
  }

  let frameTownRegionIds = new Set<number>();
  let frameTownByRegion = new Map<number, any>();
  let frameTownById = new Map<string, any>();
  let frameCastleLabelBounds: { x: number; y: number; w: number; h: number }[] =
    [];
  let lastFrameTownRefreshAt = 0;

  function refreshFrameTownRegionIds() {
    const now = performance.now();
    if (now - lastFrameTownRefreshAt < 350 && frameTownByRegion.size > 0)
      return;
    lastFrameTownRefreshAt = now;
    frameTownRegionIds.clear();
    frameTownByRegion = new Map<number, any>();
    frameTownById = new Map<string, any>();
    towns.forEach((town: any) => {
      frameTownById.set(String(town.id), town);
      const regionId = Number(
        town.regionId ??
          town.territoryId ??
          (Number(town.id) >= 9000 ? Number(town.id) - 9000 : -1),
      );
      if (Number.isInteger(regionId) && regionId >= 0) {
        frameTownRegionIds.add(regionId);
        if (!frameTownByRegion.has(regionId))
          frameTownByRegion.set(regionId, town);
      }
    });
  }

  let frameBattleIndexReady = false;
  let frameBattleIndexSignature = "";
  let frameBattleTargetRegions = new Set<number>();
  let frameBattleSourceRegions = new Set<number>();
  let frameBattlesByTarget = new Map<number, any[]>();

  function refreshFrameBattleIndexes() {
    const battles = state.activeBattles || [];
    const signature = battles
      .map((battle: any) => {
        const participants = Array.isArray(battle.participants)
          ? battle.participants
              .map(
                (participant: any) =>
                  `${participant.sourceTerritoryId ?? participant.fromTerritoryId}:${participant.status || ""}`,
              )
              .join(",")
          : "";
        return `${battle.id || battle._id || ""}:${battleTargetRegionId(battle)}:${battle.fromTerritoryId ?? ""}:${participants}`;
      })
      .join("|");
    if (frameBattleIndexReady && signature === frameBattleIndexSignature)
      return;
    frameBattleIndexSignature = signature;
    frameBattleIndexReady = true;
    frameBattleTargetRegions = new Set<number>();
    frameBattleSourceRegions = new Set<number>();
    frameBattlesByTarget = new Map<number, any[]>();
    battles.forEach((battle: any) => {
      const targetRegionId = battleTargetRegionId(battle);
      if (targetRegionId >= 0) {
        frameBattleTargetRegions.add(targetRegionId);
        const targetBattles = frameBattlesByTarget.get(targetRegionId) || [];
        targetBattles.push(battle);
        frameBattlesByTarget.set(targetRegionId, targetBattles);
      }
      const participants =
        Array.isArray(battle.participants) && battle.participants.length
          ? battle.participants
          : battle.attackerSources || [];
      participants.forEach((participant: any) => {
        const sourceRegionId = Number(
          participant.sourceTerritoryId ??
            participant.fromTerritoryId ??
            battle.fromTerritoryId,
        );
        if (Number.isInteger(sourceRegionId) && sourceRegionId >= 0) {
          frameBattleSourceRegions.add(sourceRegionId);
        }
      });
    });
  }

  function hasBattleTargetRegion(regionId: number) {
    if (frameBattleIndexReady)
      return frameBattleTargetRegions.has(Number(regionId));
    return (state.activeBattles || []).some(
      (battle: any) => battleTargetRegionId(battle) === Number(regionId),
    );
  }

  function drawFrame() {
    refreshFrameTownRegionIds();
    refreshFrameBattleIndexes();
    frameCastleLabelBounds = [];
    ctx.save();
    ctx.scale(dpr, dpr);
    drawWorld();
    const now = performance.now();
    if (
      minimapDragging ||
      now - lastMinimapDrawAt > (crowdedRenderMode ? 420 : 180)
    ) {
      drawMinimap();
      lastMinimapDrawAt = now;
    }
    ctx.restore();
  }

  const BIOME_COLORS = {
    0: BIOMES[0].a,
    1: BIOMES[1].a,
    2: BIOMES[2].a,
    3: BIOMES[3].a,
    4: BIOMES[4].a,
    5: BIOMES[5].a,
    6: BIOMES[6].a,
    7: BIOMES[7].a,
  };
  function minimapTerritoryColor(r, isIslet) {
    const base = BIOME_COLORS[visualBiomeIndex(r, r.id, isIslet)] || "#557a46";
    const roll = hash((r.seed || r.id + 1) * 73.17 + r.id * 11.9);

    let color = base;
    if (roll < 0.25) color = getDarkerColor(base, 0.86);
    else if (roll > 0.76) color = getLighterColor(base, 1.12);

    const ownerCode = isConquestLayout ? 0 : derivedRegionOwnership(r.id);
    if (ownerCode > 0) {
      color = getRegionFlagColor(r.id);
    }
    return color;
  }

  let minimapDragging = false;
  let lastMinimapDrawAt = 0;
  let uiOverlayActive = false;
  let renderSuspended = false;

  function drawBootFrame() {
    ctx.save();
    ctx.scale(dpr, dpr);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#06131d");
    g.addColorStop(0.55, "#0a1f2c");
    g.addColorStop(1, "#02070b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  let lastOverlayFrameAt = 0;
  let lastOverlayUpdateAt = 0;

  const {
    bindMinimapMouseDown,
    unbindMinimapMouseDown,
    cleanupMinimapWindowListeners,
  } = createMinimapInteractionHelpers({
    getMinimapCanvas: () => minimapCanvas,
    getZoom: () => state.zoom,
    WRef: () => W,
    HRef: () => H,
    clampPan,
    saveCamera,
    setPan: (x: number, y: number) => {
      state.panX = x;
      state.panY = y;
    },
    isMinimapDragging: () => minimapDragging,
    setMinimapDragging: (value: boolean) => {
      minimapDragging = value;
    },
  });
  bindMinimapMouseDown();

  function drawMinimap() {
    if (!minimapCanvas || !minimapCtx) return;
    const mw = 160;
    const mh = 120;
    if (minimapCanvas.width !== Math.floor(mw * dpr)) {
      minimapCanvas.width = Math.floor(mw * dpr);
      minimapCanvas.height = Math.floor(mh * dpr);
      minimapCanvas.style.width = mw + "px";
      minimapCanvas.style.height = mh + "px";
    }
    minimapCtx.save();
    minimapCtx.scale(dpr, dpr);

    // Deep slate navy ocean background gradient
    const oceanGrad = minimapCtx.createRadialGradient(80, 60, 10, 80, 60, 100);
    oceanGrad.addColorStop(0, "#121d28");
    oceanGrad.addColorStop(1, "#0a1118");
    minimapCtx.fillStyle = oceanGrad;
    minimapCtx.fillRect(0, 0, 160, 120);

    // Draw circular latitudes and rhumb lines in gold ink (Wind Rose Navigation Chart style)
    minimapCtx.strokeStyle = "rgba(197, 160, 89, 0.05)";
    minimapCtx.lineWidth = 0.5;
    // Circular latitudes
    for (let r = 25; r <= 100; r += 25) {
      minimapCtx.beginPath();
      minimapCtx.arc(80, 60, r, 0, Math.PI * 2);
      minimapCtx.stroke();
    }
    // Diagonal rhumb lines
    minimapCtx.strokeStyle = "rgba(197, 160, 89, 0.035)";
    const angles = [0, Math.PI / 4, Math.PI / 2, (Math.PI * 3) / 4];
    angles.forEach((a) => {
      minimapCtx.beginPath();
      minimapCtx.moveTo(80 - Math.cos(a) * 120, 60 - Math.sin(a) * 120);
      minimapCtx.lineTo(80 + Math.cos(a) * 120, 60 + Math.sin(a) * 120);
      minimapCtx.stroke();
    });

    // Draw all regions (continents)
    regions.forEach((r) => {
      minimapCtx.fillStyle = minimapTerritoryColor(r, false);
      minimapCtx.beginPath();
      const mx = r.x / 150;
      const my = r.y / 150;
      const mrx = ((r.rx || r.r) / 150) * 1.02;
      const mry = ((r.ry || r.r * 0.78) / 150) * 1.02;
      minimapCtx.ellipse(mx, my, mrx, mry, 0, 0, TAU);
      minimapCtx.fill();

      // Hand-drawn shoreline sepia outline
      minimapCtx.strokeStyle = "rgba(110, 80, 50, 0.32)";
      minimapCtx.lineWidth = 0.55;
      minimapCtx.stroke();
    });

    // Draw all islets
    islets.forEach((r) => {
      minimapCtx.fillStyle = minimapTerritoryColor(r, true);
      minimapCtx.beginPath();
      const mx = r.x / 150;
      const my = r.y / 150;
      const mrx = ((r.rx || r.r) / 150) * 0.82;
      const mry = ((r.ry || r.r * 0.78) / 150) * 0.82;
      minimapCtx.ellipse(mx, my, mrx, mry, 0, 0, TAU);
      minimapCtx.fill();

      // Hand-drawn shoreline sepia outline for islets
      minimapCtx.strokeStyle = "rgba(110, 80, 50, 0.32)";
      minimapCtx.lineWidth = 0.55;
      minimapCtx.stroke();
    });

    // Draw all towns (Castles/Capitals)
    towns.forEach((t) => {
      const isPlayer = t.owner === 0;
      let color = "#10b981"; // player (bright neon green)
      if (!isPlayer) {
        // Alliance (blue), Enemy (red)
        const isAlly = t.owner === 2 || t.owner === 4 || t.owner === 6;
        color = isAlly ? "#3b82f6" : "#ef4444";
      }

      const tx = t.x / 150;
      const ty = t.y / 150;

      if (isPlayer) {
        // Draw pulsing green radar halo for player's capital / towns
        const pulse = 4 + Math.sin(state.tick * 0.2) * 2;
        minimapCtx.strokeStyle = "rgba(16, 185, 129, 0.8)";
        minimapCtx.lineWidth = 1.5;
        minimapCtx.beginPath();
        minimapCtx.arc(tx, ty, pulse, 0, TAU);
        minimapCtx.stroke();

        // Draw inner white core
        minimapCtx.fillStyle = "#ffffff";
        minimapCtx.beginPath();
        minimapCtx.arc(tx, ty, 2, 0, TAU);
        minimapCtx.fill();
      } else {
        minimapCtx.fillStyle = color;
        minimapCtx.fillRect(tx - 1, ty - 1, 2, 2);
      }
    });

    // Draw viewport boundary box
    const viewW = W / state.zoom;
    const viewH = H / state.zoom;
    const viewX = -(state.panX + (1 - state.zoom) * W * 0.48) / state.zoom;
    const viewY = -(state.panY + (1 - state.zoom) * H * 0.48) / state.zoom;

    const vx = viewX / 150;
    const vy = viewY / 150;
    const vw = viewW / 150;
    const vh = viewH / 150;

    // Solid brass/gold metallic camera viewport frame
    minimapCtx.strokeStyle = "rgba(212, 175, 55, 0.85)";
    minimapCtx.lineWidth = 1.25;
    minimapCtx.strokeRect(vx, vy, vw, vh);

    // Draw coordinate overlay panel at the bottom of the minimap
    const cx = Math.round(viewX + viewW / 2);
    const cy = Math.round(viewY + viewH / 2);

    // Coords overlay styled with a gold-bordered slate ribbon
    minimapCtx.fillStyle = "rgba(10, 20, 30, 0.9)";
    minimapCtx.fillRect(0, 106, 160, 14);
    minimapCtx.fillStyle = "#c5a059";
    minimapCtx.fillRect(0, 106, 160, 1);

    minimapCtx.fillStyle = "#ffd34d";
    minimapCtx.font = "bold 9px Courier New, monospace";
    minimapCtx.textAlign = "center";
    minimapCtx.fillText(`X:${cx} Y:${cy}`, 80, 116);

    // Draw user capital status indicator
    const playerCapital = towns.find((t) => t.owner === 0);
    if (playerCapital) {
      minimapCtx.fillStyle = "#10b981";
      minimapCtx.font = "bold 8px Courier New, monospace";
      minimapCtx.textAlign = "left";
      minimapCtx.fillText("â˜… TA", 4, 12);
    }
    minimapCtx.restore();
  }

  function getOptimalTownCenter(regionId: number): { x: number; y: number } {
    const r = landById(regionId);
    if (!r) return { x: 0, y: 0 };
    return { x: r.x, y: r.y };
  }

  function centerTownInRegion(town: any, regionId: number) {
    const pt = getOptimalTownCenter(regionId);
    if (!town || !pt) return;
    town.x = pt.x;
    town.y = pt.y;
  }

  function syncTownOwnersForRegions(regionIds) {
    Array.from(new Set(regionIds || [])).forEach((regionId) => {
      const ownerCode = derivedRegionOwnership(regionId);
      const ownerId = state.regionOwnerIds[regionId] || null;

      if (ownerCode === 0) {
        for (let i = towns.length - 1; i >= 0; i--) {
          const t = towns[i];
          if (t.regionId === regionId || t.id === 9000 + regionId) {
            towns.splice(i, 1);
          }
        }
        return;
      }

      let hasTownInRegion = false;
      towns.forEach((town) => {
        const isMatch =
          town.regionId === regionId || town.id === 9000 + regionId;
        if (!isMatch) return;
        hasTownInRegion = true;
        centerTownInRegion(town, regionId);
        if (ownerCode === 1) {
          town.owner = 0;
          town.ownerId = state.localPlayerId;
          town.troops = Math.max(0, town.troops || 0);
          town.population = Math.max(
            town.population || 0,
            territoryStartingPopulation(regionId, 1),
          );
        } else {
          town.owner = ownerCode;
          town.ownerId = ownerId ?? "enemy";
        }
      });

      if (!hasTownInRegion) {
        ensureTownForRegion(regionId, ownerCode);
      }
    });
  }

  function startNewbieClearing(canvasId: number) {
    state.newbieSelectedRegion = canvasId;
    toast("XÃ‚Y THÃ€NH PHáº¢I ÄÆ¯á»¢C SERVER XÃC NHáº¬N");
  }

  function ensureTownForRegion(regionId, ownerCode) {
    let town = towns.find(
      (t) => t.id === 9000 + regionId || t.regionId === regionId,
    );
    if (town) {
      normalizeTown(town);
      centerTownInRegion(town, regionId);
      town.owner = ownerCode === 1 ? 0 : Math.max(1, ownerCode || 2);
      town.troops = Math.max(0, town.troops || 0);
      town.population = Math.max(
        town.population || 0,
        territoryStartingPopulation(regionId, ownerCode),
      );
      town.regionId = regionId;
      return town;
    }
    const pt = getOptimalTownCenter(regionId);
    town = {
      id: 9000 + regionId,
      regionId,
      x: pt.x,
      y: pt.y,
      lvl: ownerCode === 0 ? 1 : 2,
      owner: ownerCode === 1 ? 0 : Math.max(1, ownerCode || 2),
      troops: ownerCode === 1 ? 24 : 72,
      population: territoryStartingPopulation(regionId, ownerCode),
      buildings: defaultBuildings(),
      storage: defaultStorage(),
      virtual: true,
    };
    towns.push(town);
    normalizeTown(town);
    return town;
  }

  function applyBackendTownSnapshots(snapshots: any[]) {
    if (!Array.isArray(snapshots)) return;
    snapshots.forEach((snapshot) => {
      const x = Number(snapshot?.x);
      const y = Number(snapshot?.y);
      const serverRegionId = Number(
        snapshot?.territoryId ?? snapshot?.regionId,
      );
      const regionId =
        Number.isInteger(serverRegionId) && serverRegionId >= 0
          ? serverRegionId
          : Number.isFinite(x) && Number.isFinite(y)
            ? regionAtCoords(x, y)
            : Number.isInteger(snapshot?.id) && snapshot.id >= 9000
              ? snapshot.id - 9000
              : -1;
      if (regionId < 0 || derivedRegionOwnership(regionId) !== 1) return;
      const town = ensureTownForRegion(regionId, 1);
      if (!town) return;
      town.id = Number.isInteger(snapshot.id) ? snapshot.id : town.id;
      town.regionId = regionId;
      town.territoryId = regionId;
      town.settlementKind =
        snapshot.kind ??
        snapshot.settlementKind ??
        state.regionSettlementKinds[regionId];
      town.lvl = Math.max(
        1,
        Math.floor(
          Number(snapshot.lvl ?? snapshot.level ?? town.lvl ?? 1) || 1,
        ),
      );
      town.troops = Math.max(
        0,
        Math.floor(Number(snapshot.troops ?? town.troops ?? 0) || 0),
      );
      town.population = Math.max(
        territoryStartingPopulation(regionId, 1),
        Math.floor(Number(snapshot.population ?? town.population ?? 32) || 32),
      );
      town.infantryCount = Math.max(
        0,
        Math.floor(
          Number(
            snapshot.infantryCount ?? town.infantryCount ?? town.troops ?? 0,
          ) || 0,
        ),
      );
      town.cavalryCount = Math.max(
        0,
        Math.floor(
          Number(snapshot.cavalryCount ?? town.cavalryCount ?? 0) || 0,
        ),
      );
      town.artilleryCount = Math.max(
        0,
        Math.floor(
          Number(snapshot.artilleryCount ?? town.artilleryCount ?? 0) || 0,
        ),
      );
      town.buildings = {
        ...defaultBuildings(),
        ...(snapshot.buildings || town.buildings || {}),
      };
      town.storage = {
        ...defaultStorage(),
        ...(snapshot.storage || town.storage || {}),
      };
      centerTownInRegion(town, regionId);
    });
  }

  function handleButton(id) {
    if (id === "zoomIn") {
      const oldZoom = state.zoom;
      const newZoom = Math.min(getMaxZoom(), oldZoom * 1.25);
      if (newZoom !== oldZoom) {
        const cx = W / 2;
        const cy = H / 2;
        const focal = screenToMap(cx, cy);
        state.targetZoom = newZoom;
        state.panX = cx - focal.x * newZoom - (1 - newZoom) * W * 0.48;
        state.panY = cy - focal.y * newZoom - (1 - newZoom) * H * 0.48;
        clampPan();
        saveCamera();
      }
      return;
    }
    if (id === "zoomOut") {
      const oldZoom = state.zoom;
      const newZoom = Math.max(getMinZoom(), oldZoom / 1.25);
      if (newZoom !== oldZoom) {
        const cx = W / 2;
        const cy = H / 2;
        const focal = screenToMap(cx, cy);
        state.targetZoom = newZoom;
        state.panX = cx - focal.x * newZoom - (1 - newZoom) * W * 0.48;
        state.panY = cy - focal.y * newZoom - (1 - newZoom) * H * 0.48;
        clampPan();
        saveCamera();
      }
      return;
    }
    if (id === "deselect") {
      state.selected = null;
      state.selectedRegion = null;
      return;
    }

    if (id === "map") {
      centerCameraOnWorldContent();
      toast("CAMERA XA ÄÃƒ RESET");
      saveCamera();
      save();
      return;
    }

    if (id === "home") {
      const capital = towns.find((t) => t.owner === 0);
      if (capital) {
        state.zoom = getDefaultFarZoom();
        state.targetZoom = state.zoom;
        state.panX =
          W / 2 - capital.x * state.zoom - (1 - state.zoom) * W * 0.48;
        state.panY =
          H / 2 - capital.y * state.zoom - (1 - state.zoom) * H * 0.48;
        state.selected = null;
        state.selectedRegion = null;
        clampPan();
        toast("ÄÃƒ QUAY Vá»€ THá»¦ ÄÃ” Cá»¦A Báº N");
        saveCamera();
        save();
      } else {
        toast("CHÆ¯A CÃ“ THÃ€NH PHá» NÃ€O Äá»‚ QUAY Vá»€!");
      }
      return;
    }

    const t = towns.find((it) => it.id === state.selected);

    // Layout Modals Bridge
    if (["army", "treasure", "ally"].includes(id)) {
      onLayoutAction?.(id);
      return;
    }

    if (!t) return;

    if (id === "trainInfantry") {
      toast("Má»˜ BINH PHáº¢I ÄÆ¯á»¢C SERVER XÃC NHáº¬N");
      return;
    }
    if (id === "trainCavalry") {
      toast("Má»˜ BINH PHáº¢I ÄÆ¯á»¢C SERVER XÃC NHáº¬N");
      return;
    }
    if (id === "trainArtillery") {
      toast("Má»˜ BINH PHáº¢I ÄÆ¯á»¢C SERVER XÃC NHáº¬N");
      return;
    }
    save();
  }

  function attack(t) {
    const source = sourceTown();
    if (source && continentOfTown(source) !== continentOfTown(t)) {
      const power = Math.max(0, source.troops - 1);
      if (power > 0) {
        const maxInfantry = Math.floor(power / 15);
        launchVoyage(
          source,
          t,
          power,
          regionAtCoords(t.x, t.y),
          true,
          maxInfantry,
          0,
          0,
        );
      } else {
        toast("THÃ€NH PHá» KHÃ”NG Äá»¦ QUÃ‚N Äá»‚ XUáº¤T BINH");
      }
      return;
    }
    resolveAttack(t);
  }

  function resolveAttack(t) {
    toast("Káº¾T QUáº¢ CHIáº¾N Äáº¤U PHáº¢I ÄÆ¯á»¢C SERVER XÃC NHáº¬N");
  }

  function resolveBattleFinal(b) {
    state.activeBattles = [];
    toast("Káº¾T QUáº¢ CHIáº¾N Äáº¤U PHáº¢I ÄÆ¯á»¢C SERVER XÃC NHáº¬N");
  }

  function isPlayerOwnedTown(town: any) {
    if (!town || town.owner !== 0) return false;
    const regionId = townRegionId(town);
    return regionId >= 0 && derivedRegionOwnership(regionId) === 1;
  }

  function townRegionId(town: any) {
    if (!town) return -1;
    const townId = Number(town.id);
    const encodedRegionId =
      Number.isInteger(townId) && townId >= 9000 ? townId - 9000 : -1;
    if (encodedRegionId >= 0 && landById(encodedRegionId))
      return encodedRegionId;
    const explicitRegionId = Number(town.regionId);
    if (
      Number.isInteger(explicitRegionId) &&
      explicitRegionId >= 0 &&
      landById(explicitRegionId)
    )
      return explicitRegionId;
    return regionAtCoords(town.x, town.y);
  }

  function sourceTown() {
    const selected = towns.find(
      (it) => it.id === state.selected && isPlayerOwnedTown(it),
    );
    if (selected) return selected;
    return towns
      .filter(isPlayerOwnedTown)
      .sort((a, b) => b.troops - a.troops)[0];
  }

  const {
    segmentTouchesSea,
    isWaterAt,
    findCoastPortCandidates,
    polylineLength,
    waterSegmentClear,
    findShortestWaterPath,
    findBestSeaRoute,
    continentOfRegion,
    landTravelAllowed,
    getMarchRouteStatus,
  } = createRouteUtils({
    allGenerated,
    landById,
    regionAtCoords,
    territorySpecialResources,
    mainlandCoastalRegionIds,
    megaContinents,
    derivedRegionOwnership,
    lerp,
  });

  function launchVoyage(
    source,
    target,
    power,
    targetRegionId,
    isAttack,
    infantry = 0,
    cavalry = 0,
    artillery = 0,
    battleSide: "attacker" | "defender" | null = null,
    backendTiming: any = null,
  ) {
    if (!source || !target) return false;
    normalizeTown(source);
    if (!power || power <= 0) {
      toast("VUI LÃ’NG CHá»ŒN QUÃ‚N Äá»‚ XUáº¤T BINH");
      return false;
    }
    const selectedUnitCount =
      Math.max(
        0,
        Math.floor((infantry || 0) + (cavalry || 0) + (artillery || 0)),
      ) || power;
    const availableUnitCount = Math.max(
      0,
      (source.infantryCount || 0) +
        (source.cavalryCount || 0) +
        (source.artilleryCount || 0),
    );
    if (
      !backendTiming?.noTroopDebit &&
      availableUnitCount > 0 &&
      selectedUnitCount > availableUnitCount
    ) {
      toast(
        "Sá» LÆ¯á»¢NG QUÃ‚N XUáº¤T CHIáº¾N VÆ¯á»¢T QUÃ QUÃ‚N ÄANG CÃ“ TRONG THÃ€NH",
      );
      return false;
    }
    const sourceRegionId = regionAtCoords(source.x, source.y);
    const targetRegionFromTown = regionAtCoords(target.x, target.y);
    const effectiveTargetRegionId = targetRegionId ?? targetRegionFromTown;

    if (isAttack && !backendTiming) {
      const targetOwner = derivedRegionOwnership(effectiveTargetRegionId);
      if (targetOwner === 1) {
        const shieldMs = getNewbieShieldRemainingMs();
        if (shieldMs > 0) {
          toast(
            `âš ï¸ THÃ€NH NÃ€Y ÄANG TRONG THá»œI GIAN Báº¢O Vá»† TÃ‚N THá»¦! (CÃ²n ${formatShieldTimer(shieldMs)})`,
          );
          return false;
        }
      }
    }

    const routeStatus = getMarchRouteStatus(source, effectiveTargetRegionId);
    if (!routeStatus.ok && !backendTiming) {
      toast(routeStatus.message);
      return false;
    }
    // Trust the server-confirmed usesShip flag when replaying a backend march;
    // local geometry/ownership re-derivation can disagree and silently hide the ship.
    const crossingSea =
      typeof backendTiming?.usesShip === "boolean"
        ? backendTiming.usesShip
        : routeStatus.ok
          ? routeStatus.requiresShip
          : segmentTouchesSea(source, target);
    if (crossingSea) {
      if (
        !backendTiming &&
        (sourceRegionId < 0 || derivedRegionOwnership(sourceRegionId) !== 1)
      ) {
        toast(
          "KHÃ”NG CÃ“ Cáº¢NG XUáº¤T PHÃT: HÃƒY CHá»ŒN THÃ€NH/LÃƒNH THá»” VEN BIá»‚N Cá»¦A Báº N",
        );
        return false;
      }
      if (effectiveTargetRegionId < 0) {
        toast("KHÃ”NG TÃŒM THáº¤Y Bá»œ BIá»‚N Äá»” Bá»˜");
        return false;
      }
    }

    let speed = gameConfig.cavalrySpeed;
    if (crossingSea) {
      let shipSpeed = gameConfig.shipSpeed;
      if (source.owner === 0) {
        // Lost Map treasure: +20% ship speed if player owns >= 5 regions
        const ownedRegions = state.regionOwnership.filter(
          (o) => o === 1,
        ).length;
        if (ownedRegions >= 5) shipSpeed *= 1.2;
      }
      speed = shipSpeed;
    } else {
      const speeds: number[] = [];
      if (infantry > 0) {
        speeds.push(gameConfig.infantrySpeed);
      }
      if (cavalry > 0) {
        // Stirrups technology: +20% cavalry speed per level
        const stirrupsLvl = state.research?.stirrups || 0;
        speeds.push(gameConfig.cavalrySpeed * (1 + stirrupsLvl * 0.2));
      }
      if (artillery > 0) {
        // Cannon Casting: +25% artillery speed per level
        const cannonLvl = state.research?.cannon || 0;
        speeds.push(gameConfig.artillerySpeed * (1 + cannonLvl * 0.25));
      }
      if (speeds.length > 0) {
        speed = Math.min(...speeds);
      }
    }

    // Fast Travel tech: +15% travel speed per level for player voyages
    if (source.owner === 0) {
      const travelLvl = state.research?.travel || 0;
      speed *= 1 + travelLvl * 0.15;
    }

    let sourcePort: { x: number; y: number } | null = null;
    let targetPort: { x: number; y: number } | null = null;
    let control: { x: number; y: number } | null = null;
    let seaPath: MapPoint[] | null = null;

    if (crossingSea) {
      const route = findBestSeaRoute(
        sourceRegionId,
        effectiveTargetRegionId,
        source,
        target,
      );
      if (route.error === "source_port") {
        if (backendTiming) {
          sourcePort = {
            x: lerp(source.x, target.x, 0.22),
            y: lerp(source.y, target.y, 0.22),
          };
        } else {
          toast(
            "LÃƒNH THá»” XUáº¤T PHÃT KHÃ”NG CÃ“ Bá»œ BIá»‚N/Cáº¢NG - KHÃ”NG THá»‚ ÄI THUYá»€N",
          );
          return false;
        }
      }
      if (route.error === "target_port") {
        if (backendTiming) {
          targetPort = {
            x: lerp(source.x, target.x, 0.78),
            y: lerp(source.y, target.y, 0.78),
          };
        } else {
          toast(
            "ÄÃCH KHÃ”NG PHáº¢I VÃ™NG VEN BIá»‚N - PHáº¢I CHIáº¾M Bá»œ BIá»‚N TRÆ¯á»šC",
          );
          return false;
        }
      }
      sourcePort = sourcePort ||
        route.sourcePort || {
          x: lerp(source.x, target.x, 0.22),
          y: lerp(source.y, target.y, 0.22),
        };
      targetPort = targetPort ||
        route.targetPort || {
          x: lerp(source.x, target.x, 0.78),
          y: lerp(source.y, target.y, 0.78),
        };
      seaPath = route.seaPath || null;
      if (!seaPath || seaPath.length < 2 || route.error === "blocked") {
        if (backendTiming) {
          // Server already confirmed this march sailed; draw a straight water
          // line instead of dropping the ship/voyage entirely.
          seaPath = [sourcePort, targetPort];
        } else {
          toast(
            "KHÃ”NG TÃŒM ÄÆ¯á»¢C TUYáº¾N NÆ¯á»šC AN TOÃ€N Äáº¾N VÃ™NG ÄÃCH",
          );
          return false;
        }
      }
    }

    const routeDistance =
      crossingSea && sourcePort && targetPort && seaPath
        ? Math.hypot(source.x - sourcePort.x, source.y - sourcePort.y) +
          polylineLength(seaPath) +
          Math.hypot(target.x - targetPort.x, target.y - targetPort.y)
        : Math.hypot(source.x - target.x, source.y - target.y);
    const distanceKm = Math.max(1, Math.round(routeDistance * MAP_UNITS_TO_KM));
    const localDuration = Math.max(
      6,
      Math.round((distanceKm / speed) * gameConfig.gameHourSeconds),
    );
    const duration = backendTiming?.duration ?? localDuration;
    const elapsed = backendTiming?.elapsed ?? 0;

    state.voyages.push({
      from: { x: source.x, y: source.y },
      to: { x: target.x, y: target.y },
      sourcePort: sourcePort,
      targetPort: targetPort,
      control: control,
      seaPath: seaPath,
      targetId: target.id,
      t: Math.min(duration, elapsed),
      duration: duration,
      displayProgress: Math.min(1, elapsed / Math.max(0.001, duration)),
      targetProgress: Math.min(1, elapsed / Math.max(0.001, duration)),
      startedAt: backendTiming?.startedAt || null,
      arrivesAt: backendTiming?.arrivesAt || null,
      backendMarchId: backendTiming?.marchId || null,
      sourceRegionId,
      owner: source.owner,
      power: power,
      targetRegionId: targetRegionId,
      isAttack: isAttack,
      keepLineUntilResolved: true,
      infantry: infantry,
      cavalry: cavalry,
      artillery: artillery,
      battleSide: battleSide || backendTiming?.battleSide || null,
      crossingSea: crossingSea,
      usesShip: crossingSea,
      requiresShip: crossingSea,
      routeType: crossingSea ? "sea" : "land",
    });
    if (!backendTiming?.noTroopDebit) {
      source.infantryCount = Math.max(
        0,
        (source.infantryCount || 0) - (infantry || 0),
      );
      source.cavalryCount = Math.max(
        0,
        (source.cavalryCount || 0) - (cavalry || 0),
      );
      source.artilleryCount = Math.max(
        0,
        (source.artilleryCount || 0) - (artillery || 0),
      );
      source.troops = Math.max(1, source.troops - power);
    }
    toast(
      isAttack
        ? `XUáº¤T BINH CHIáº¾M THÃ€NH (${power} QUÃ‚N | HÃ€NH QUÃ‚N: ${Math.round(duration)}s)`
        : `XUáº¤T BINH TIáº¾P VIá»†N (${power} QUÃ‚N | HÃ€NH QUÃ‚N: ${Math.round(duration)}s)`,
    );
    pushLog(
      isAttack
        ? `PLAYER1: ÄÃƒ XUáº¤T BINH Táº¤N CÃ”NG LÃƒNH THá»” ${targetRegionId + 1} (${power} QUÃ‚N)`
        : `PLAYER1: ÄÃƒ Gá»¬I TIáº¾P VIá»†N Äáº¾N LÃƒNH THá»” ${targetRegionId + 1} (${power} QUÃ‚N)`,
    );
    save();
    return true;
  }

  const {
    applyBackendClearing,
    applyBackendMarch,
    mapBackendBattle,
    applyBackendBattles,
  } = createBackendSyncHelpers({
    state,
    towns,
    reactToCanvasRegionId,
    landById,
    clearingTimingProgress,
    settlerOriginForRegion,
    timingElapsedSeconds,
    ensureTownForRegion,
    territoryStartingPopulation,
    defaultBuildings,
    defaultStorage,
    derivedRegionOwnership,
    launchVoyage,
  });

  const {
    focusBackendMarch,
    focusBackendClearing,
    toast: runtimeToast,
    pushLog: runtimePushLog,
  } = createUiRuntimeHelpers({
    state,
    reactToCanvasRegionId,
    landById,
    getDefaultFarZoom,
    getMinZoom,
    getMaxZoom,
    WRef: () => W,
    HRef: () => H,
    clampPan,
    saveCamera,
  });
  toast = runtimeToast;
  pushLog = runtimePushLog;

  const {
    toggleHideTerritoryAssets,
    bindWindowDebugToggles,
    isHidingTerritoryAssets,
  } = createAssetVisibilityHelpers({
    toast,
  });
  bindWindowDebugToggles();

  const { registerKeyboardShortcuts, unregisterKeyboardShortcuts } =
    createKeyboardShortcutsHelpers({
      state,
      toggleFullscreen,
      toggleHideTerritoryAssets,
      centerCameraOnWorldContent,
      toast,
      saveCamera,
    });
  registerKeyboardShortcuts();

  const { handlePreludeAction } = createEngineActionPreludeHelper({
    state,
    towns,
    setMinimapCanvas: (nextCanvas: HTMLCanvasElement | null) => {
      unbindMinimapMouseDown();
      minimapCanvas = nextCanvas;
      minimapCtx = minimapCanvas?.getContext("2d") || null;
      bindMinimapMouseDown();
    },
    setUiOverlayActive: (active: boolean) => {
      uiOverlayActive = active;
      if (!uiOverlayActive) {
        lastOverlayFrameAt = 0;
        lastOverlayUpdateAt = 0;
      }
    },
    setRenderSuspended: (active: boolean) => {
      renderSuspended = active;
      lastFrameTime = 0;
      last = performance.now();
    },
    toast,
    applyBackendTownSnapshots,
    save,
    gameConfig,
    initTerritoryArrays,
  });

  const { handleBackendBridgeAction } = createBackendActionBridgeHelper({
    state,
    save,
    toast,
    reactToCanvasRegionId,
    syncTownOwnersForRegions,
    cancelClearingIfTargetTaken,
    cancelClearingIfOriginLost,
    applyBackendClearing,
    applyBackendMarch,
    applyBackendBattles,
    focusBackendMarch,
    focusBackendClearing,
  });

  const { handleFollowupAction } = createEngineActionFollowupHelper({
    state,
    towns,
    W,
    H,
    toast,
    save,
    saveCamera,
    clampPan,
    worldContentBounds,
    getDefaultFarZoom,
    landById,
    reactToCanvasRegionId,
    refundSettlerPopulationForRegion,
    beginSettlerReturn,
    ensureTownForRegion,
  });

  const { handleApplyGameStateAction } = createApplyGameStateActionHelper({
    state,
    onboardingKey: ONBOARDING_KEY,
    save,
    syncTownOwnersForRegions,
    applyBackendTownSnapshots,
    cancelClearingIfTargetTaken,
    cancelClearingIfOriginLost,
    applyBackendMarch,
    applyBackendBattles,
    applyBackendClearing,
    regionAtCoords,
    normalizeKingdomArchitecture,
    kingdomArchitectureFromEmblem,
  });

  const { startNewbieOnboarding, cancelNewbieOnboarding, selectNewbieLand } =
    createNewbieActionsHelper({
      state,
      newbieDefaultRegion: NEWBIE_DEFAULT_REGION,
      toast,
      normalizeKingdomArchitecture,
      kingdomArchitectureFromEmblem,
    });

  const { sendChat } = createEngineChatActionsHelper({
    factions,
    pushLog,
    save,
    isDestroyed: () => destroyed,
  });

  const {
    canBuildStronghold,
    getExpansionConnectionType,
    getExpansionSourceRegionsForTarget,
    getRegionOwnership,
    getSourceTown,
    getPlayerOwnedTowns,
    getTownRegionId,
    getRegion,
    getRegionCenter,
    getTerritorySpecialResources,
    getActiveBattleForRegion,
    isPlayerOwnedTown: isPlayerOwnedTownPublic,
    getMarchRouteStatus: getMarchRouteStatusPublic,
  } = createEnginePublicQueriesHelper({
    state,
    towns,
    expansionTargetState,
    expansionConnectionType,
    expansionSourceRegionsForTarget,
    sourceTown,
    isPlayerOwnedTown,
    townRegionId,
    landById,
    reactToCanvasRegionId,
    mapToScreen,
    territorySpecialResources,
    getMarchRouteStatus,
    derivedRegionOwnership,
  });

  const { destroy } = createEngineLifecycleHelper({
    setDestroyed: (value: boolean) => {
      destroyed = value;
    },
    saveCamera,
    clearAllRegionCache,
    resizeCanvas,
    flushCameraOnPageHide,
    unregisterRectInvalidation,
    unregisterCanvasGestureInput,
    canvas,
    onCanvasClick,
    unregisterKeyboardShortcuts,
    cleanupMinimapWindowListeners,
    unbindMinimapMouseDown,
    rafRef: () => raf,
  });

  const { handleAction } = createEngineActionDispatcher({
    handlePreludeAction,
    handleApplyGameStateAction,
    handleBackendBridgeAction,
    handleFollowupAction,
    handleButton,
  });

  const {
    getTowns,
    getRegions,
    getIslets,
    mapToScreen: mapToScreenPublic,
    setHideTerritoryAssets,
    toggleHideTerritoryAssets: toggleHideTerritoryAssetsPublic,
    getConfig,
  } = createEnginePublicApiUtilityHelper({
    towns,
    regions,
    islets,
    mapToScreen,
    toggleHideTerritoryAssets,
    getConfig: () => gameConfig,
  });

  function buttonAt(x, y) {
    return getDynamicButtons().find(
      (b) => x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h,
    );
  }

  function setZoom(value) {
    const minZ = getMinZoom();
    const maxZ = getMaxZoom();
    state.zoom = Math.max(
      minZ,
      Math.min(maxZ, Number(value) || getDefaultFarZoom()),
    );
    state.targetZoom = state.zoom;
    clampPan();
    saveCamera();
  }

  function clampPan() {
    const minZ = getMinZoom();
    const maxZ = getMaxZoom();
    state.zoom = Math.max(
      minZ,
      Math.min(maxZ, state.zoom || getDefaultFarZoom()),
    );
    if (state.targetZoom !== null && state.targetZoom !== undefined) {
      state.targetZoom = Math.max(minZ, Math.min(maxZ, state.targetZoom));
    }
    const b = worldContentBounds();
    const minPanX =
      -b.maxX * state.zoom + W * 0.78 - (1 - state.zoom) * W * 0.48;
    const maxPanX =
      W * 0.22 - b.minX * state.zoom - (1 - state.zoom) * W * 0.48;
    const minPanY =
      -b.maxY * state.zoom + H * 0.78 - (1 - state.zoom) * H * 0.48;
    const maxPanY =
      H * 0.22 - b.minY * state.zoom - (1 - state.zoom) * H * 0.48;
    if (minPanX > maxPanX) state.panX = (minPanX + maxPanX) / 2;
    else state.panX = Math.max(minPanX, Math.min(maxPanX, state.panX));
    if (minPanY > maxPanY) state.panY = (minPanY + maxPanY) / 2;
    else state.panY = Math.max(minPanY, Math.min(maxPanY, state.panY));
  }

  const { sim, hasActiveAnimations } = createEngineSimulationHelpers({
    state,
    towns,
    factions,
    gameConfig,
    clampPan,
    saveCamera,
    timingElapsedSeconds,
    regionAtCoords,
    hasBattleTargetRegion,
    cancelClearingIfOriginLost,
    clearSettlerReturn,
    clearingTimingProgress,
    landById,
    toast,
    pushLog,
    isFastPanning,
    isMinimapDragging: () => minimapDragging,
    applyCameraInertiaStep,
  });

  let last = performance.now();
  let lastFrameTime = 0;

  function loop(now: number) {
    if (destroyed) return;

    // 1. Pause rendering completely when tab is hidden / inactive
    if (document.hidden) {
      last = now;
      raf = requestAnimationFrame(loop);
      return;
    }

    if (renderSuspended) {
      const minFrameInterval = 1000 / 12;
      if (now - lastFrameTime >= minFrameInterval) {
        lastFrameTime = now;
        last = now;
        drawBootFrame();
      }
      raf = requestAnimationFrame(loop);
      return;
    }

    // 2. Dynamic Frame Pacing & Throttle (60 FPS active / 30 FPS idle)
    const isAnimating = hasActiveAnimations();
    const targetFps = isAnimating
      ? ultraCrowdedRenderMode
        ? 24
        : crowdedRenderMode
          ? 36
          : 60
      : uiOverlayActive
        ? 20
        : 30;
    const minFrameInterval = 1000 / targetFps;

    if (now - lastFrameTime < minFrameInterval) {
      raf = requestAnimationFrame(loop);
      return;
    }
    lastFrameTime = now;

    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    sim(dt);

    if (!uiOverlayActive || now - lastOverlayFrameAt >= 180) {
      drawFrame();
      lastOverlayFrameAt = now;
    }

    if (shouldFlushPendingCameraSave(now, isFastPanning)) saveCamera();
    if (
      onUpdate &&
      !isFastPanning() &&
      (!uiOverlayActive || now - lastOverlayUpdateAt >= 500)
    ) {
      lastOverlayUpdateAt = now;
      onUpdate(state, towns);
    }
    raf = requestAnimationFrame(loop);
  }

  load();
  resetStarterTownsForNewbie();
  initTerritoryArrays();
  if (isConquestLayout) centerCameraOnWorldContent();
  else loadCamera();
  raf = requestAnimationFrame(loop);

  return {
    destroy,
    getState: () => state,
    canBuildStronghold,
    getExpansionConnectionType,
    getExpansionSourceRegionsForTarget,
    getTowns,
    getRegions,
    getIslets,
    mapToScreen: mapToScreenPublic,
    getRegionOwnership,
    getSourceTown,
    getPlayerOwnedTowns,
    getTownRegionId,
    getRegion,
    getRegionCenter,
    getTerritorySpecialResources,
    getActiveBattleForRegion,
    isPlayerOwnedTown: isPlayerOwnedTownPublic,
    getMarchRouteStatus: getMarchRouteStatusPublic,
    sendChat,
    handleAction,
    startNewbieOnboarding,
    cancelNewbieOnboarding,
    selectNewbieLand,
    setHideTerritoryAssets,
    isHidingTerritoryAssets,
    toggleHideTerritoryAssets: toggleHideTerritoryAssetsPublic,
    getConfig,
    territoryYield,
    clearingDuration,
    territoryBuildCost,
  };
}
