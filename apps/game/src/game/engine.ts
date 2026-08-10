// @ts-nocheck
import {
  generateConquestTerritories,
  generateWorldTerritories,
} from "@island/shared";
import {
  kingdomArchitectureFromEmblem,
  kingdomBuildingVisualMetrics,
  kingdomBuildingSprite,
  KINGDOM_BUILDING_LAYOUT,
  normalizeKingdomArchitecture,
  type KingdomBuildingType,
} from "./kingdomArchitecture";
import {
  marchDirectionFromDelta,
  stableMarchDirection,
  type MarchDirection,
} from "./engine/marchDirection";
import {
  createNationUnitAtlases,
  drawNationShipSprite,
  drawNationUnitSprite,
  nationUnitAtlasReady,
} from "./engine/unitAtlas";
import { unitAttackPhase } from "./engine/unitAnimator";
import {
  ISLET_DISTRICT_RENDER_SIZE,
  MAINLAND_CAPITAL_RENDER_SIZE,
  standardTerritoryBuildingSize,
} from "./engine/buildingSizing";
import {
  BASE_ZOOM,
  FIXED_FAR_ZOOM,
  cameraStorageKey,
  getDefaultFarZoom as getDefaultFarZoomForViewport,
  getMinZoom as getMinZoomForViewport,
  getZoomTier,
  MAX_ZOOM,
} from "./engine/cameraRules";
import {
  lerp,
  pointAlongPolyline,
  polylineLength,
  type MapPoint,
} from "./engine/geometry";
import { hash } from "./engine/random";
import { getDarkerColor, getLighterColor } from "./engine/color";
import type { CachedRegion, GameEngineHandle } from "./engine/contracts";
export type { GameEngineHandle } from "./engine/contracts";
import { COLORS, MAP_UNITS_TO_KM, createGameConfig } from "./engine/config";
import {
  BIOMES,
  FACTIONS as factions,
  NEUTRAL_LAND,
  OVERVIEW_BIOMES,
  OVERVIEW_BIOME_GROUP_BY_BIOME,
  OWNER_BIOMES,
} from "./engine/worldPalette";
import { drawOcean as drawOceanLayer } from "./render/oceanRenderer";
import type { RenderContext } from "./render/renderContext";
import {
  fillPath as fillPathLayer,
  fillSmoothPath as fillSmoothPathLayer,
  strokePath as strokePathLayer,
  strokeSmoothPath as strokeSmoothPathLayer,
  traceSmoothPath as traceSmoothPathLayer,
} from "./render/pathRenderer";
import {
  renderTerritoryVegetation as renderTerritoryVegetationLayer,
} from "./render/vegetationRenderer";
import {
  fallbackTerritoryOwnerColor,
  TERRITORY_OWNER_TINT_ALPHA,
  territoryTerrainColor,
} from "./render/territoryVisuals";
import { territorySkinEffect } from "./cosmetics/territorySkinEffects";
import {
  buildingOverlayGeometry,
  drawKingdomBuildingAura,
  drawRulerAvatarBadge,
} from "./engine/kingdomBuildingOverlays";
import {
  ensureMinVertices,
  facetedRegionPath,
  organicPath,
  subdividePolygon,
  warpPoint,
} from "./engine/worldGeometry";
import {
  createMinimapController,
  type MinimapController,
} from "./minimap/controller";
import {
  clearingDuration as clearingDurationSelector,
  defaultBuildings as defaultBuildingsSelector,
  defaultStorage as defaultStorageSelector,
  maxDefendingTroops as maxDefendingTroopsSelector,
  normalizeTown as normalizeTownSelector,
  resourceCostText as resourceCostTextSelector,
  territoryAreaFactor as territoryAreaFactorSelector,
  territoryBuildCost as territoryBuildCostSelector,
  territoryStartingPopulation as territoryStartingPopulationSelector,
  territoryTroopLimit as territoryTroopLimitSelector,
  territoryYield as territoryYieldSelector,
  townPopulationCap as townPopulationCapSelector,
  townPopulationGrowthPerSecond as townPopulationGrowthPerSecondSelector,
  troopPopulationCost as troopPopulationCostSelector,
  unitExtraCosts as unitExtraCostsSelector,
  type SelectorDeps,
} from "./engine/stateSelectors";
import { classifySettlement } from "./settlementClassification";
// Generated from demo/js/game.js so the main app matches the demo map exactly.
export function createIslandEmpireGame(
  canvas: HTMLCanvasElement,
  onUpdate?: (state: any, towns: any[]) => void,
  minimapCanvas?: HTMLCanvasElement | null,
  onLayoutAction?: (actionId: string, payload?: any) => void,
  onBattleFinished?: (report: any) => void,
  options?: { layout?: "world" | "conquest" },
): GameEngineHandle {
  let ctx = canvas.getContext("2d");
  if (!ctx)
    return {
      destroy: () => {},
      getState: () => ({}),
      getTowns: () => [],
      getRegions: () => [],
      getIslets: () => [],
      mapToScreen: (x: number, y: number) => ({ x, y }),
      getRegionOwnership: () => 0,
      getSourceTown: () => null,
      getPlayerOwnedTowns: () => [],
      getTownRegionId: () => -1,
      getRegionCenter: () => null,
      getTerritorySpecialResources: () => [],
      getActiveBattleForRegion: () => null,
      canBuildStronghold: () => false,
      getExpansionConnectionType: () => null,
      getExpansionSourceRegionsForTarget: () => [],
      isPlayerOwnedTown: () => false,
      getMarchRouteStatus: () => ({
        ok: false,
        message: "Không có bản đồ",
        requiresShip: false,
      }),
      sendChat: () => {},
      handleAction: () => {},
      startNewbieOnboarding: () => {},
      cancelNewbieOnboarding: () => {},
    };

  const regionPass2Cache = new Map<number, CachedRegion>();
  const isletPass1Cache = new Map<number, CachedRegion>();
  let strategicWorldCache: {
    canvas: HTMLCanvasElement;
    minX: number;
    minY: number;
    width: number;
    height: number;
    signature: string;
  } | null = null;
  let lastStrategicCacheSignatureCheckAt = 0;

  function invalidateRegionCache(regionId: number) {
    regionPass2Cache.delete(regionId);
    isletPass1Cache.delete(regionId);
  }
  function clearAllRegionCache() {
    regionPass2Cache.clear();
    isletPass1Cache.clear();
    strategicWorldCache = null;
    lastStrategicCacheSignatureCheckAt = 0;
  }
  clearAllRegionCache();
  ctx.imageSmoothingEnabled = false;

  // Keep the existing terrain call sites stable while the renderer layer
  // receives the Canvas context explicitly. These adapters are temporary and
  // will disappear when terrainRenderer.ts owns the full layer boundary.
  const fillPath = (points: any, color: any) =>
    fillPathLayer(ctx, points, color);
  const fillSmoothPath = (points: any, color: any) =>
    fillSmoothPathLayer(ctx, points, color);
  const strokePath = (points: any, color: any, lineWidth: number) =>
    strokePathLayer(ctx, points, color, lineWidth);
  const strokeSmoothPath = (points: any, color: any, lineWidth: number) =>
    strokeSmoothPathLayer(ctx, points, color, lineWidth);
  const traceSmoothPath = (points: any) => traceSmoothPathLayer(ctx, points);

  const nationUnitAtlases = createNationUnitAtlases();
  // March positions still interpolate along their route, but the sprite stays
  // on one idle frame to avoid animating every moving formation every frame.
  const animateMarchingUnits = false;

  function drawMedievalUnitSprite(
    kind: "builder" | "infantry" | "cavalry" | "artillery",
    x: number,
    y: number,
    size: number,
    factionColor?: string,
    frame = "idle",
    motionPhase?: number,
    direction?: MarchDirection,
    architectureId?: string,
  ) {
    return drawNationUnitSprite({
      ctx,
      atlases: nationUnitAtlases,
      kind,
      x,
      y,
      size,
      factionColor,
      animationName: frame,
      motionPhase: motionPhase ?? state.tick,
      direction,
      architectureId: normalizeKingdomArchitecture(architectureId),
      drawFootRing: drawTroopFootRing,
    });
  }

  let destroyed = false;
  let raf = 0;
  let minimapController: MinimapController | null = null;
  let lastCameraInputAt = 0;

  function markCameraInput() {
    lastCameraInputAt = performance.now();
  }

  function isTouchDevice() {
    return Boolean(
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
        (typeof window !== "undefined" &&
          window.matchMedia?.("(pointer: coarse)").matches),
    );
  }

  function getRenderDpr() {
    if (typeof window === "undefined") return 1;
    const cssPixels = Math.max(1, window.innerWidth * window.innerHeight);
    const screenDprCap =
      cssPixels >= 2_800_000 ? 1.25 : cssPixels >= 1_400_000 ? 1.5 : 1.75;
    // Mobile GPUs pay a much higher fill-rate cost for a DPR of 2–3 while
    // drawing the same CSS-sized world. Keep the map readable, but avoid
    // allocating a needlessly large backing canvas during pan/zoom.
    const dprCap = isTouchDevice() ? Math.min(1.35, screenDprCap) : screenDprCap;
    return Math.max(1, Math.min(window.devicePixelRatio || 1, dprCap));
  }

  let dpr = getRenderDpr();
  let W = (window as any).__isRotatedLandscape
    ? window.innerHeight
    : window.innerWidth;
  let H = (window as any).__isRotatedLandscape
    ? window.innerWidth
    : window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  const getMinZoom = () => getMinZoomForViewport(W);
  const getMaxZoom = () => MAX_ZOOM;
  const getDefaultFarZoom = () =>
    getDefaultFarZoomForViewport(W, options?.layout || "world");

  function resizeCanvas() {
    if (destroyed) return;
    if ((window as any).__isRotatedLandscape) {
      // In forced landscape, the visual width = physical height, visual height = physical width
      W = window.innerHeight;
      H = window.innerWidth;
    } else {
      W = window.innerWidth;
      H = window.innerHeight;
    }
    dpr = getRenderDpr();
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.imageSmoothingEnabled = false;
    clearAllRegionCache();
  }
  function flushCameraOnPageHide() {
    saveCamera(true);
  }
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pagehide", flushCameraOnPageHide);

  const TAU = Math.PI * 2;
  const isConquestLayout = options?.layout === "conquest";
  const CAMERA_KEY = cameraStorageKey(isConquestLayout ? "conquest" : "world");
  const ONBOARDING_KEY = "island_empire_onboarding_pending";
  const NEWBIE_DEFAULT_REGION = 0;
  const gameConfig = createGameConfig();

  const megaContinents = [
    {
      x: 700,
      y: 450,
      rx: 420,
      ry: 340,
      biome: 2,
      cols: 5,
      rows: 4,
      seed: 10,
      name: "BẮC BĂNG ĐẠI LỤC",
      climate: "ice",
    },
    {
      x: 2450,
      y: 380,
      rx: 580,
      ry: 250,
      biome: 6,
      cols: 8,
      rows: 3,
      seed: 40,
      name: "TRUNG CHÂU ĐẢO",
      climate: "forest",
    },
    {
      x: 4200,
      y: 520,
      rx: 320,
      ry: 320,
      biome: 1,
      cols: 4,
      rows: 4,
      seed: 80,
      name: "SA MẠC NAM SA",
      climate: "desert",
    },
    {
      x: 5550,
      y: 950,
      rx: 260,
      ry: 580,
      biome: 3,
      cols: 3,
      rows: 7,
      seed: 110,
      name: "HỎA TIÊU THỔ",
      climate: "volcanic",
    },

    {
      x: 1200,
      y: 1350,
      rx: 380,
      ry: 260,
      biome: 5,
      cols: 5,
      rows: 3,
      seed: 150,
      name: "HỒNG HOA ĐẢO",
      climate: "rose",
    },
    {
      x: 3100,
      y: 1550,
      rx: 580,
      ry: 420,
      biome: 0,
      cols: 8,
      rows: 6,
      seed: 200,
      name: "ĐẠI LỤC TRUNG TÂM",
      climate: "forest",
    },
    {
      x: 4850,
      y: 1880,
      rx: 490,
      ry: 280,
      biome: 4,
      cols: 7,
      rows: 4,
      seed: 250,
      name: "TỬ VI VƯƠNG QUỐC",
      climate: "isles",
    },

    {
      x: 520,
      y: 2450,
      rx: 280,
      ry: 280,
      biome: 7,
      cols: 4,
      rows: 4,
      seed: 300,
      name: "PHONG NGUYÊN",
      climate: "mint",
    },
    {
      x: 2050,
      y: 2700,
      rx: 520,
      ry: 380,
      biome: 1,
      cols: 7,
      rows: 5,
      seed: 400,
      name: "ĐÔNG ĐẢO HOÀNG SHA",
      climate: "sand",
    },
    {
      x: 3800,
      y: 2880,
      rx: 460,
      ry: 380,
      biome: 3,
      cols: 6,
      rows: 5,
      seed: 450,
      name: "NÚI LỬA XÍCH THỔ",
      climate: "volcanic",
    },
    {
      x: 5450,
      y: 2950,
      rx: 290,
      ry: 520,
      biome: 2,
      cols: 4,
      rows: 7,
      seed: 500,
      name: "NAM BĂNG TUYẾT SƠN",
      climate: "ice",
    },

    {
      x: 1050,
      y: 3700,
      rx: 360,
      ry: 260,
      biome: 5,
      cols: 5,
      rows: 4,
      seed: 550,
      name: "SAN HÔ BIỂN NAM",
      climate: "rose",
    },
    {
      x: 2700,
      y: 3950,
      rx: 520,
      ry: 380,
      biome: 0,
      cols: 7,
      rows: 5,
      seed: 600,
      name: "MINH TÂM ĐẢO",
      climate: "forest",
    },
    {
      x: 4300,
      y: 3800,
      rx: 460,
      ry: 340,
      biome: 6,
      cols: 6,
      rows: 4,
      seed: 650,
      name: "VŨ LÂM ĐẠI LỤC",
      climate: "pine",
    },
    {
      x: 5600,
      y: 4050,
      rx: 280,
      ry: 260,
      biome: 4,
      cols: 4,
      rows: 4,
      seed: 700,
      name: "HUYỀN VŨ ĐẢO",
      climate: "violet",
    },

    {
      x: 3000,
      y: 2200,
      rx: 380,
      ry: 380,
      biome: 0,
      cols: 5,
      rows: 5,
      seed: 750,
      name: "TRUNG NGUYÊN THƯỢNG CỔ",
      climate: "forest",
    },
  ];

  const allGenerated = isConquestLayout
    ? generateConquestTerritories()
    : generateWorldTerritories();
  const regions = allGenerated.filter((t) => !t.isIslet);
  const islets = allGenerated.filter((t) => t.isIslet);
  const REGION_POLYGON_CELL_SIZE = 620;
  const regionSpatialBuckets = new Map<string, any[]>();
  regions.forEach((r: any) => {
    const gx = Math.floor(r.x / REGION_POLYGON_CELL_SIZE);
    const gy = Math.floor(r.y / REGION_POLYGON_CELL_SIZE);
    const key = `${gx}:${gy}`;
    const bucket = regionSpatialBuckets.get(key);
    if (bucket) bucket.push(r);
    else regionSpatialBuckets.set(key, [r]);
  });

  // Point-in-land checks are used heavily by sea pathfinding. Index every land
  // polygon by its full bounding box so route searches stay fast on large maps.
  const LAND_QUERY_CELL_SIZE = 360;
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

  const allLandsById = new Map<number, any>();
  allGenerated.forEach((r) => {
    allLandsById.set(r.id, r);
  });

  function landById(id: number) {
    return allLandsById.get(id) || null;
  }

  const routes = [
    [130, 379, 287, 348, 438, 315, 608, 352, 788, 318, 940, 256],
    [178, 743, 367, 664, 558, 612, 728, 564, 1000, 498],
    [301, 845, 507, 780, 738, 740, 951, 705, 1102, 688],
    [294, 206, 412, 271, 604, 302, 761, 224, 962, 144],
    [807, 112, 911, 175, 1070, 262, 1118, 395, 1086, 566],
    [358, 477, 264, 573, 207, 703, 219, 872],
    [300, 850, 382, 980, 534, 1070, 708, 1160, 900, 1265],
    [910, 780, 1010, 920, 1110, 1060, 1092, 1250],
    [150, 920, 260, 1040, 430, 1050, 610, 1250],
    [1070, 262, 1260, 205, 1510, 235, 1740, 318, 1980, 462],
    [1118, 395, 1320, 555, 1450, 820, 1640, 790, 2020, 1180],
    [900, 1265, 1180, 1335, 1365, 1395, 1590, 1370, 2070, 1470],
    [735, 843, 1010, 920, 1280, 760, 1530, 1040, 1760, 1115],
  ];

  const towns = [
    // --- 1. LỤC ĐỊA BĂNG TUYẾT PHÍA BẮC ---
    { id: 1, x: 2500, y: 350, lvl: 2, owner: 2, troops: 50 },
    { id: 2, x: 2720, y: 300, lvl: 3, owner: 7, troops: 68 },
    { id: 3, x: 2940, y: 380, lvl: 2, owner: 3, troops: 48 },
    { id: 4, x: 3160, y: 320, lvl: 4, owner: 7, troops: 88 },
    { id: 5, x: 3380, y: 400, lvl: 2, owner: 2, troops: 45 },
    { id: 6, x: 3600, y: 350, lvl: 3, owner: 3, troops: 72 },

    // --- 2. ĐẠI LỤC ĐỊA RỪNG XANH TRUNG TÂM ---
    { id: 7, x: 2400, y: 1500, lvl: 4, owner: 0, troops: 110 },
    { id: 8, x: 2620, y: 1450, lvl: 2, owner: 0, troops: 54 },
    { id: 9, x: 2840, y: 1600, lvl: 3, owner: 6, troops: 75 },
    { id: 10, x: 3060, y: 1500, lvl: 2, owner: 0, troops: 48 },
    { id: 11, x: 3280, y: 1650, lvl: 4, owner: 6, troops: 92 },
    { id: 12, x: 3500, y: 1550, lvl: 2, owner: 0, troops: 42 },
    { id: 13, x: 3720, y: 1700, lvl: 3, owner: 6, troops: 78 },
    { id: 14, x: 2720, y: 2250, lvl: 2, owner: 0, troops: 50 },
    { id: 15, x: 2940, y: 2200, lvl: 3, owner: 0, troops: 82 },
    { id: 16, x: 3160, y: 2350, lvl: 2, owner: 6, troops: 46 },
    { id: 17, x: 3380, y: 2250, lvl: 4, owner: 0, troops: 98 },
    { id: 18, x: 3600, y: 2400, lvl: 2, owner: 6, troops: 52 },

    // --- 3. LỤC ĐỊA HỎA SƠN ĐẤT ĐỎ ---
    { id: 19, x: 450, y: 4200, lvl: 3, owner: 1, troops: 74 },
    { id: 20, x: 670, y: 4150, lvl: 2, owner: 1, troops: 52 },
    { id: 21, x: 890, y: 4250, lvl: 4, owner: 1, troops: 96 },
    { id: 22, x: 400, y: 4600, lvl: 2, owner: 1, troops: 48 },
    { id: 23, x: 620, y: 4650, lvl: 3, owner: 1, troops: 84 },
    { id: 24, x: 840, y: 4550, lvl: 2, owner: 1, troops: 44 },

    // --- 4. LỤC ĐỊA SA MẠC CÁT VÀNG ---
    { id: 25, x: 6800, y: 4300, lvl: 3, owner: 3, troops: 78 },
    { id: 26, x: 7020, y: 4250, lvl: 2, owner: 3, troops: 50 },
    { id: 27, x: 7240, y: 4350, lvl: 4, owner: 4, troops: 98 },
    { id: 28, x: 7460, y: 4300, lvl: 2, owner: 4, troops: 44 },
    { id: 29, x: 7170, y: 4750, lvl: 3, owner: 3, troops: 82 },
    { id: 30, x: 7390, y: 4650, lvl: 2, owner: 4, troops: 48 },

    // --- 5. QUẦN ĐẢO PHÙ THỦY MA THUẬT ---
    { id: 31, x: 6800, y: 350, lvl: 2, owner: 4, troops: 56 },
    { id: 32, x: 7100, y: 300, lvl: 3, owner: 5, troops: 72 },
    { id: 33, x: 7400, y: 400, lvl: 2, owner: 5, troops: 48 },
    { id: 34, x: 7700, y: 350, lvl: 4, owner: 4, troops: 94 },
    { id: 35, x: 7250, y: 750, lvl: 3, owner: 5, troops: 78 },

    // --- 6. LỤC ĐỊA ĐẦM LẦY BẠC HÀ ---
    { id: 36, x: 3500, y: 4300, lvl: 3, owner: 7, troops: 80 },
    { id: 37, x: 3720, y: 4250, lvl: 2, owner: 7, troops: 54 },
    { id: 38, x: 3940, y: 4400, lvl: 4, owner: 7, troops: 98 },
    { id: 39, x: 4160, y: 4350, lvl: 2, owner: 0, troops: 52 },
    { id: 40, x: 4380, y: 4450, lvl: 3, owner: 7, troops: 76 },
    { id: 41, x: 3870, y: 4800, lvl: 2, owner: 0, troops: 48 },

    // --- 7. CHUỖI ĐẢO HẢI TẶC PHÍA TÂY BẮC ---
    { id: 42, x: 450, y: 300, lvl: 2, owner: 5, troops: 52 },
    { id: 43, x: 750, y: 250, lvl: 3, owner: 2, troops: 70 },
    { id: 44, x: 1050, y: 350, lvl: 2, owner: 5, troops: 46 },
    { id: 45, x: 700, y: 650, lvl: 4, owner: 2, troops: 92 },
    { id: 46, x: 1000, y: 550, lvl: 2, owner: 5, troops: 42 },

    // --- 8. LỤC ĐỊA CỔ ĐẠI PHÍA ĐÔNG CỰC ---
    { id: 47, x: 7000, y: 1550, lvl: 4, owner: 5, troops: 96 },
    { id: 48, x: 7220, y: 1500, lvl: 2, owner: 1, troops: 50 },
    { id: 49, x: 7440, y: 1600, lvl: 3, owner: 2, troops: 82 },
    { id: 50, x: 7270, y: 2000, lvl: 5, owner: 0, troops: 128 },

    // --- 9. LỤC ĐỊA NÚI BĂNG TÂY BẮC (MỚI) ---
    { id: 51, x: 720, y: 1450, lvl: 3, owner: 2, troops: 75 },
    { id: 52, x: 1050, y: 1800, lvl: 2, owner: 7, troops: 52 },
    { id: 53, x: 940, y: 2200, lvl: 4, owner: 3, troops: 94 },

    // --- 10. QUẦN ĐẢO THẠCH ANH CỰC NĂM (MỚI) ---
    { id: 54, x: 2520, y: 5150, lvl: 2, owner: 4, troops: 48 },
    { id: 55, x: 2850, y: 5500, lvl: 3, owner: 5, troops: 76 },
    { id: 56, x: 2960, y: 5850, lvl: 2, owner: 4, troops: 50 },

    // --- 11. LỤC ĐỊA RỪNG THÔNG ĐÔNG NAM (MỚI) ---
    { id: 57, x: 6320, y: 5150, lvl: 3, owner: 6, troops: 82 },
    { id: 58, x: 6650, y: 5500, lvl: 2, owner: 0, troops: 54 },
    { id: 59, x: 6760, y: 5850, lvl: 4, owner: 6, troops: 96 },
    { id: 60, x: 6540, y: 5250, lvl: 5, owner: 0, troops: 120 },

    // --- 12. LỤC ĐỊA PHA LÊ ĐÔNG CỰC (MỚI) ---
    { id: 61, x: 7320, y: 950, lvl: 3, owner: 4, troops: 80 },
    { id: 62, x: 7430, y: 1350, lvl: 2, owner: 5, troops: 54 },
    { id: 63, x: 7760, y: 1550, lvl: 4, owner: 4, troops: 98 },

    // --- 13. QUẦN ĐẢO ĐẦM LẦY PHÍA TÂY (MỚI) ---
    { id: 64, x: 720, y: 2950, lvl: 2, owner: 7, troops: 48 },
    { id: 65, x: 830, y: 3400, lvl: 3, owner: 7, troops: 72 },
    { id: 66, x: 1160, y: 3650, lvl: 2, owner: 0, troops: 50 },

    // --- 14. LỤC ĐỊA CÁT ĐỎ PHÍA TÂY NAM (MỚI) ---
    { id: 67, x: 1420, y: 4450, lvl: 3, owner: 3, troops: 84 },
    { id: 68, x: 1530, y: 4900, lvl: 2, owner: 1, troops: 52 },
    { id: 69, x: 1760, y: 5250, lvl: 4, owner: 3, troops: 96 },

    // --- 15. LỤC ĐỊA THÔNG XANH PHÍA ĐÔNG NAM (MỚI) ---
    { id: 70, x: 5320, y: 4350, lvl: 3, owner: 6, troops: 78 },
    { id: 71, x: 5430, y: 4800, lvl: 2, owner: 0, troops: 54 },
    { id: 72, x: 5650, y: 5500, lvl: 4, owner: 6, troops: 92 },
    { id: 73, x: 5870, y: 4750, lvl: 2, owner: 0, troops: 46 },
    { id: 74, x: 5540, y: 5150, lvl: 3, owner: 6, troops: 80 },
    { id: 75, x: 5870, y: 5400, lvl: 5, owner: 0, troops: 110 },
  ];

  const ships = [
    { x: 279, y: 213, team: COLORS.gold },
    { x: 144, y: 478, team: COLORS.gold },
    { x: 210, y: 596, team: COLORS.gold },
    { x: 286, y: 804, team: COLORS.blue },
    { x: 893, y: 126, team: COLORS.blue },
    { x: 1004, y: 211, team: COLORS.blue },
    { x: 1044, y: 390, team: COLORS.blue },
    { x: 905, y: 528, team: COLORS.gold },
    { x: 1093, y: 772, team: COLORS.red },
    { x: 214, y: 962, team: COLORS.gold },
    { x: 340, y: 1184, team: COLORS.blue },
    { x: 958, y: 1266, team: COLORS.red },
    { x: 230, y: 1040, team: COLORS.purple },
    { x: 1090, y: 680, team: COLORS.green },
    { x: 1280, y: 184, team: COLORS.green },
    { x: 1850, y: 245, team: COLORS.purple },
    { x: 2060, y: 618, team: COLORS.gold },
    { x: 1320, y: 1075, team: COLORS.red },
    { x: 1900, y: 1290, team: COLORS.blue },
    { x: 1095, y: 1515, team: COLORS.purple },
  ];

  // Conquest has its own territories and must not inherit demo towns or ships
  // from the persistent world map.
  if (isConquestLayout) {
    towns.length = 0;
    ships.length = 0;
  }

  const buttons = [
    { id: "army", x: 34, y: H - 840, w: 116, h: 98, label: "QUÂN ĐỘI" },
    { id: "build", x: 34, y: H - 710, w: 116, h: 98, label: "XÂY DỰNG" },
    { id: "treasure", x: W - 118 - 34, y: 92, w: 118, h: 92, label: "BẢO VẬT" },
    { id: "map", x: W - 118 - 34, y: 300, w: 118, h: 92, label: "BẢN ĐỒ" },
    { id: "event", x: W - 118 - 34, y: 404, w: 118, h: 92, label: "SỰ KIỆN" },
    { id: "zoomIn", x: W - 54 - 34, y: H - 460, w: 54, h: 54, label: "+" },
    { id: "zoomOut", x: W - 54 - 34, y: H - 390, w: 54, h: 54, label: "-" },
  ];

  const state = {
    selected: null,
    hover: null,
    tick: 0,
    zoom: FIXED_FAR_ZOOM,
    targetZoom: FIXED_FAR_ZOOM,
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
      { text: "CHIẾM 3 THÀNH PHỐ", value: 0, goal: 3 },
      { text: "XÂY 5 NHÀ QUÂN SỰ", value: 2, goal: 5 },
      { text: "NÂNG THÀNH LV.3", value: 1, goal: 3 },
    ],
    log: [
      "PLAYER1: CÙNG NHAU CHIẾN THẮNG!",
      "PLAYER2: TÔI ĐÃ CHIẾM ĐƯỢC THÀNH PHỐ A",
      "PLAYER3: CẦN THĂM DÒ PHÍA BẮC.",
      "PLAYER4: TẤN CÔNG KẺ ĐỊCH!",
    ],
    toast: "CHỌN LÃNH THỔ ĐỂ XÂY THÀNH",
    // Territory ownership: 0 = wild, 1 = player, 2..N = AI faction
    regionOwnership: [] as number[],
    regionOwnerNames: {} as Record<number, string>,
    regionOwnerIds: {} as Record<number, string>,
    regionOwnerFlagColors: {} as Record<number, string>,
    regionOwnerEmblems: {} as Record<number, string>,
    regionOwnerArchitectureIds: {} as Record<number, string>,
    regionOwnerAvatarIds: {} as Record<number, string>,
    regionOwnerAvatarFrameIds: {} as Record<number, string>,
    regionOwnerVipLevels: {} as Record<number, number>,
    regionOwnerAllianceTags: {} as Record<number, string>,
    regionOwnerAllianceEmblems: {} as Record<number, string>,
    regionSettlementKinds: {} as Record<
      number,
      "capital" | "sub_capital" | "military" | "military_district" | "flag"
    >,
    regionParentTerritoryIds: {} as Record<number, number>,
    regionRootTerritoryIds: {} as Record<number, number>,
    regionConnectionTypes: {} as Record<number, "land" | "sea">,
    regionIsolatedUntil: {} as Record<number, string>,
    regionSpecialResources: {} as Record<number, string[]>,
    regionOwnerCapitalSkins: {} as Record<number, string | null>,
    regionOwnerDistrictSkins: {} as Record<number, string | null>,
    expansionSourceRegionId: null as number | null,
    hasAuthoritativeOwnership: false,
    // Clearing progress per region: 0.0 → 1.0
    regionClearing: [] as number[],
    activeClearingTimings: {},
    // Which region is currently being cleared (-1 = none)
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
    localPlayerName: "BẠN",
    localPlayerAvatarId: "emperor",
    equippedAvatarFrameId: "vip" as string | null,
    localPlayerVipLevel: 0,
    equippedCapitalSkin: null as string | null,
    equippedDistrictSkin: null as string | null,
    equippedNameFrameId: null as string | null,
    capitalTerritoryIds: new Set<number>(),
    capitalTownIds: new Set<number>(),
    research: { sword: 0, stirrups: 0, cannon: 0, travel: 0 },
    events: { goldRush: 0, harvestRush: 0 },
  };

  const premiumNameplateImages = Object.fromEntries(
    ["imperial", "tempest", "astral"].map((id) => {
      const image = new Image();
      image.src = `/assets/cosmetics/nameplates/${id}.png`;
      return [id, image];
    }),
  ) as Record<string, HTMLImageElement>;

  const organicPathCache = new Map();
  const sharedEdgeCache = new Map<string, Array<[number, number]>>();
  const sharedRegionPolygonCache = new Map<string, Array<[number, number]>>();
  const sharedInlandVertexCache = new Map<string, boolean>();
  const visualBiomeCache = new Map<string, number>();
  const overviewBiomeCache = new Map<string, number>();
  const mainlandCoastalRegionIds = new Set<number>();
  const territoryDisplayPolygonCache = new Map<
    string,
    Array<[number, number]>
  >();

  let hideTerritoryAssets = false;

  function toggleHideTerritoryAssets(forceValue?: boolean) {
    hideTerritoryAssets =
      forceValue !== undefined ? forceValue : !hideTerritoryAssets;
    localStorage.setItem(
      "island_empire_hide_assets",
      hideTerritoryAssets ? "true" : "false",
    );
    if (hideTerritoryAssets) {
      toast("⚡ ĐÃ ẨN TÀI NGUYÊN & ASSETS LÃNH THỔ (TEST HIỆU SUẤT)");
    } else {
      toast("🌿 ĐÃ HIỂN THỊ LẠI TÀI NGUYÊN & ASSETS LÃNH THỔ");
    }
    return hideTerritoryAssets;
  }
  (window as any).toggleHideTerritoryAssets = toggleHideTerritoryAssets;
  (window as any).setHideTerritoryAssets = (hide: boolean) =>
    toggleHideTerritoryAssets(hide);

  regions.forEach((r: any) => {
    const continent = nearestContinent(r);
    if (!continent) return;
    const nx = (r.x - continent.x) / continent.rx;
    const ny = (r.y - continent.y) / continent.ry;
    const edgeScore = Math.sqrt(nx * nx + ny * ny);
    if (edgeScore < 0.58) return;

    const rx = r.rx || r.r || 180;
    const ry = r.ry || (r.r || 180) * 0.78;
    const outwardAngle = Math.atan2(r.y - continent.y, r.x - continent.x);
    let openSeaSamples = 0;
    for (let i = -2; i <= 2; i++) {
      const angle = outwardAngle + i * (Math.PI / 8);
      const px = r.x + Math.cos(angle) * rx * 1.28;
      const py = r.y + Math.sin(angle) * ry * 1.28;
      if (regionAtCoords(px, py) < 0) {
        openSeaSamples++;
      }
    }
    if (openSeaSamples >= 2) mainlandCoastalRegionIds.add(r.id);
  });

  towns.forEach((town, i) => {
    normalizeTown(town);
    const regionId = i < regions.length ? i : town.id - 1;
    const pt = getOptimalTownCenter(regionId);
    if (pt && (pt.x !== 0 || pt.y !== 0)) {
      town.x = pt.x;
      town.y = pt.y;
    }
  });

  function isNewbieOnboarding() {
    const params = new URLSearchParams(window.location.search);
    return params.has("newbie") || localStorage.getItem(ONBOARDING_KEY) === "1";
  }

  function resetStarterTownsForNewbie() {
    if (!isNewbieOnboarding()) return;
    towns.forEach((t, i) => {
      if (t.owner === 0) {
        t.owner = 1 + (i % Math.max(1, factions.length - 1));
        t.troops = Math.max(36, t.troops || 36);
      }
    });
    state.selected = null;
    state.selectedRegion = null;
    state.regionOwnership = [];
    state.regionOwnerNames = {};
    state.regionOwnerIds = {};
    state.regionOwnerFlagColors = {};
    state.regionOwnerEmblems = {};
    state.regionOwnerArchitectureIds = {};
    state.regionOwnerAvatarIds = {};
    state.regionOwnerAvatarFrameIds = {};
    state.regionOwnerVipLevels = {};
    state.regionOwnerAllianceTags = {};
    state.regionOwnerAllianceEmblems = {};
    state.regionSettlementKinds = {};
    state.regionParentTerritoryIds = {};
    state.regionRootTerritoryIds = {};
    state.regionConnectionTypes = {};
    state.regionIsolatedUntil = {};
    state.regionSpecialResources = {};
    state.regionOwnerCapitalSkins = {};
    state.regionOwnerDistrictSkins = {};
    state.hasAuthoritativeOwnership = false;
    state.regionClearing = [];
    state.regionInProgress = -1;
    state.newbieMode = true;
    state.newbiePhase = "select_land";
    state.newbieSelectedRegion = null;
    state.settlerTravel = {
      active: false,
      targetRegionId: -1,
      originTownId: null,
      originX: 0,
      originY: 0,
    };
    state.pendingBackendClearingStarts = [];
    state.pendingBackendClaims = [];
    state.toast = "TÂN THỦ: CHỌN MẢNH ĐẤT HOANG ĐỂ XÂY THÀNH";
  }

  const selectorDeps: SelectorDeps = {
    getRegion: landById,
    getSpecialResources: territorySpecialResources,
    getRegionAtCoords: regionAtCoords,
    gameConfig,
  };

  // Keep the engine-facing adapters stable while the pure selectors live in
  // their own module. Mutating game actions below can continue using the same
  // local names without coupling to selector implementation details.
  function territoryAreaFactor(regionOrId: any) {
    return territoryAreaFactorSelector(regionOrId, landById);
  }

  function territoryYield(regionId: number) {
    return territoryYieldSelector(regionId, selectorDeps);
  }

  function territoryStartingPopulation(regionId: number, ownerCode = 1) {
    return territoryStartingPopulationSelector(regionId, ownerCode, landById);
  }

  function clearingDuration(rOrId?: any) {
    return clearingDurationSelector(rOrId, landById);
  }

  function defaultBuildings() {
    return defaultBuildingsSelector();
  }

  function defaultStorage() {
    return defaultStorageSelector();
  }

  const SETTLER_POPULATION_COST = 4;

  function unitExtraCosts() {
    return unitExtraCostsSelector(gameConfig);
  }

  function normalizeTown(town: any) {
    return normalizeTownSelector(town);
  }

  function townPopulationCap(town: any) {
    return townPopulationCapSelector(town, selectorDeps);
  }

  function townPopulationGrowthPerSecond(town: any) {
    return townPopulationGrowthPerSecondSelector(town);
  }

  function troopPopulationCost(troopValue: number) {
    return troopPopulationCostSelector(troopValue);
  }

  function maxDefendingTroops(town: any) {
    if (town && town.troopCapacity == null && town.maxTroops == null) {
      const regionId = Number(
        town.territoryId ?? town.regionId ?? regionAtCoords(town.x, town.y),
      );
      const territory = landById(regionId);
      if (territory) {
        town.troopCapacity = territoryTroopLimitSelector(
          territory,
          landById,
        );
      }
    }
    return maxDefendingTroopsSelector(town);
  }

  function refundSettlerPopulationForRegion(regionId: number) {
    const travel = state.settlerTravel;
    if (
      !travel ||
      travel.targetRegionId !== regionId ||
      !travel.populationCost ||
      travel.originTownId == null
    )
      return;
    const originTown = towns.find(
      (town) => town.id === travel.originTownId && town.owner === 0,
    );
    if (!originTown) return;
    normalizeTown(originTown);
    originTown.population = Math.min(
      townPopulationCap(originTown),
      originTown.population + travel.populationCost,
    );
  }

  function beginSettlerReturn(
    regionId: number,
    reason = "ĐỘI THỢ ĐÃ HỦY XÂY THÀNH VÀ ĐANG QUAY VỀ",
  ) {
    const travel = state.settlerTravel;
    if (!travel || travel.targetRegionId !== regionId) {
      toast(reason);
      return;
    }
    const originTown =
      travel.originTownId == null
        ? null
        : towns.find((town) => town.id === travel.originTownId);
    const originRegionId = originTown
      ? regionAtCoords(originTown.x, originTown.y)
      : -1;
    const canReturnToTown =
      originTown &&
      originTown.owner === 0 &&
      originRegionId >= 0 &&
      derivedRegionOwnership(originRegionId) === 1;
    travel.returning = true;
    travel.returnProgress = 0;
    travel.active = true;
    state.regionInProgress = -1;
    state.regionClearing[regionId] = 0;
    delete state.activeClearingTimings[regionId];
    state.regionOwnership[regionId] = 0;
    delete state.regionOwnerNames[regionId];
    delete state.regionOwnerFlagColors[regionId];
    delete state.regionOwnerEmblems[regionId];
    delete state.regionOwnerIds[regionId];
    delete state.regionSettlementKinds[regionId];
    delete state.regionOwnerCapitalSkins[regionId];
    delete state.regionOwnerDistrictSkins[regionId];
    if (!canReturnToTown && travel.populationCost) {
      travel.populationCost = 0;
      pushLog("SYSTEM: THÀNH XUẤT PHÁT ĐÃ MẤT, ĐỘI THỢ XÂY THÀNH BỊ TAN RÃ");
      toast("THÀNH XUẤT PHÁT ĐÃ BỊ CHIẾM, XÂY THÀNH BỊ HỦY");
      return;
    }
    toast(reason);
  }

  function clearSettlerReturn() {
    const travel = state.settlerTravel;
    if (!travel?.returning) return;
    if (travel.populationCost && travel.originTownId != null) {
      const originTown = towns.find(
        (town) => town.id === travel.originTownId && town.owner === 0,
      );
      if (originTown) {
        normalizeTown(originTown);
        originTown.population = Math.min(
          townPopulationCap(originTown),
          originTown.population + travel.populationCost,
        );
      }
    }
    state.settlerTravel = {
      active: false,
      targetRegionId: -1,
      originTownId: null,
      originX: 0,
      originY: 0,
    };
    toast("ĐỘI THỢ ĐÃ QUAY VỀ THÀNH XUẤT PHÁT");
  }

  function cancelClearingIfOriginLost() {
    const travel = state.settlerTravel;
    if (
      !travel?.active ||
      travel.returning ||
      travel.targetRegionId < 0 ||
      travel.originTownId == null
    )
      return;
    const originTown = towns.find((town) => town.id === travel.originTownId);
    const originRegionId = originTown
      ? regionAtCoords(originTown.x, originTown.y)
      : -1;
    if (
      !originTown ||
      originTown.owner !== 0 ||
      originRegionId < 0 ||
      derivedRegionOwnership(originRegionId) !== 1
    ) {
      beginSettlerReturn(
        travel.targetRegionId,
        "THÀNH XUẤT PHÁT BỊ CHIẾM, XÂY THÀNH ĐÃ HỦY",
      );
    }
  }

  function cancelClearingIfTargetTaken(regionIds: number[]) {
    const travel = state.settlerTravel;
    if (!travel?.active || travel.returning || travel.targetRegionId < 0)
      return;
    if (!regionIds.includes(travel.targetRegionId)) return;
    const ownerCode = derivedRegionOwnership(travel.targetRegionId);
    if (ownerCode === 1) {
      state.regionInProgress = -1;
      state.regionClearing[travel.targetRegionId] = 0;
      delete state.activeClearingTimings[travel.targetRegionId];
      state.settlerTravel = {
        active: false,
        targetRegionId: -1,
        originTownId: null,
        originX: 0,
        originY: 0,
      };
      toast("XÂY THÀNH HOÀN TẤT, SERVER ĐÃ XÁC NHẬN");
      return;
    }
    if (ownerCode !== 0) {
      beginSettlerReturn(
        travel.targetRegionId,
        "LÃNH THỔ ĐANG XÂY ĐÃ BỊ CHIẾM, ĐỘI THỢ QUAY VỀ",
      );
    }
  }

  function enforceTownTroopLimit(town: any) {
    normalizeTown(town);
    const maxTroops = maxDefendingTroops(town);
    if ((town.troops || 0) <= maxTroops) return 0;
    const overflowPower = Math.floor((town.troops || 0) - maxTroops);
    town.troops = maxTroops;
    const infantryReturn = Math.min(
      town.infantryCount || 0,
      Math.ceil(
        overflowPower / Math.max(1, gameConfig.infantryTroopsValue || 18),
      ),
    );
    town.infantryCount = Math.max(
      0,
      (town.infantryCount || 0) - infantryReturn,
    );
    return overflowPower;
  }

  function territoryBuildCost(regionId: number) {
    return territoryBuildCostSelector(regionId, selectorDeps);
  }

  function resourceCostText(cost: Record<string, number>) {
    return resourceCostTextSelector(cost);
  }

  const VALID_SPECIAL_RESOURCE_NAMES = new Set([
    "Bãi ngựa",
    "Xưởng rèn",
    "Bến tàu tự nhiên",
    "Mỏ Ngọc",
  ]);

  function territorySpecialResources(regionId: number) {
    const authoritative = state.regionSpecialResources?.[regionId];
    const r = landById(regionId);
    if (!r) return [];

    const specials = Array.isArray(authoritative)
      ? authoritative
      : (() => {
          const generated: string[] = [];
          const specialtyRoll = hash((regionId + 1) * 71.731);
          if (specialtyRoll < 0.12) generated.push("Bãi ngựa");
          else if (specialtyRoll < 0.23) generated.push("Xưởng rèn");

          if (
            r.isIslet ||
            r.coastal ||
            mainlandCoastalRegionIds.has(r.id)
          ) {
            generated.push("Bến tàu tự nhiên");
          }

          if (hash((regionId + 1) * 691.13) < 0.007)
            generated.push("Mỏ Ngọc");
          return generated;
        })();

    // Sanitize server/fallback data at the renderer boundary. A harbor without
    // a real coastal region is invalid and must not create a dock on land.
    const coastal = Boolean(
      r.isIslet || r.coastal || mainlandCoastalRegionIds.has(r.id),
    );
    return Array.from(new Set(specials)).filter(
      (name) =>
        VALID_SPECIAL_RESOURCE_NAMES.has(name) &&
        (name !== "Bến tàu tự nhiên" || coastal),
    );
  }

  const STRATEGIC_ASSET_PATHS: Record<string, string> = {
    "Bãi ngựa": "/assets/special/special_horse_pasture_icon.png",
    "Xưởng rèn": "/assets/special/special_forge_icon.png",
    "Bến tàu tự nhiên": "/assets/special/special_harbor_icon.png",
    "Mỏ Ngọc": "/assets/special/special_gem_mine_icon.png",
  };
  const STRATEGIC_MAP_ASSET_PATHS: Record<string, string> = {
    "Bãi ngựa": "/assets/special/special_horse_pasture.png",
    "Xưởng rèn": "/assets/special/special_forge.png",
    "Bến tàu tự nhiên": "/assets/special/special_harbor.png",
    "Mỏ Ngọc": "/assets/special/special_gem_mine.png",
  };
  const SPECIAL_RESOURCE_MAP_ORDER = [
    "Bãi ngựa",
    "Xưởng rèn",
    "Bến tàu tự nhiên",
    "Mỏ Ngọc",
  ];
  const strategicAssetImages = new Map<string, HTMLImageElement>();
  const strategicMapAssetImages = new Map<string, HTMLImageElement>();
  let medievalWorldAtlas: HTMLImageElement | null = null;
  let medievalDetailAtlas: HTMLImageElement | null = null;
  let gameEnvAssetsV2: HTMLImageElement | null = null;
  let territoryVegetationAtlas: HTMLImageElement | null = null;
  const kingdomBuildingImages = new Map<string, HTMLImageElement>();
  const kingdomBuildingAssetPaths = [
    "/assets/kingdoms/kingdom_premium.webp",
    "/assets/kingdoms/nation_flags_atlas.webp?v=flags-v2",
    "/assets/kingdoms/nations/nations_8_buildings.webp?v=nations-v2",
  ];

  // Keep the same decoded image instances for every frame. Recreating them in the
  // render path made large buildings briefly fall back while the map was moving.
  function preloadKingdomBuildingAssets() {
    kingdomBuildingAssetPaths.forEach((src) => {
      if (kingdomBuildingImages.has(src)) return;
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      kingdomBuildingImages.set(src, image);
    });
  }

  preloadKingdomBuildingAssets();
  const MEDIEVAL_WORLD_SPRITES: Record<string, [number, number]> = {
    forest_oak: [0, 0],
    forest_pine: [1, 0],
    forest_snow: [2, 0],
    forest_autumn: [3, 0],
    food: [0, 1],
    stone: [1, 1],
    gold: [2, 1],
    wood: [3, 1],
    desert: [0, 2],
    mountain: [1, 2],
    ruins: [2, 2],
    cottage: [3, 2],
    horse: [0, 3],
    forge: [1, 3],
    harbor: [2, 3],
    gems: [3, 3],
  };
  const TERRITORY_VEGETATION_SPRITES: Record<string, [number, number]> = {
    oak: [0, 0],
    autumn: [2, 1],
    pine: [2, 0],
    blossomTree: [3, 0],
    deadTree: [0, 0],
    palm: [0, 1],
    sapling: [1, 1],
    broadleaf: [2, 1],
    cypress: [3, 1],
    willow: [4, 1],
    roundBush: [0, 2],
    leafyBush: [1, 2],
    berryBush: [2, 2],
    fern: [3, 2],
    flowerBush: [4, 2],
    cactusTall: [0, 3],
    cactusGroup: [1, 3],
    cactusRound: [2, 3],
    cactusPad: [3, 3],
    agave: [4, 3],
  };

  function getTerritoryVegetationAtlas() {
    if (!territoryVegetationAtlas) {
      territoryVegetationAtlas = new Image();
      territoryVegetationAtlas.decoding = "async";
      territoryVegetationAtlas.onload = () => {
        regionPass2Cache.clear();
      };
      territoryVegetationAtlas.src =
        "/assets/world/territory_vegetation_atlas.webp";
    }
    return territoryVegetationAtlas;
  }

  function drawTerritoryVegetationSprite(
    sprite: string,
    x: number,
    y: number,
    size: number,
    alpha = 1,
  ) {
    let cell = TERRITORY_VEGETATION_SPRITES[sprite];
    const atlas = getTerritoryVegetationAtlas();
    if (!cell || !atlas.complete || !atlas.naturalWidth) return false;
    // ABSOLUTE SAFETY OVERRIDE: Cell [1, 0] in vegetation atlas is the tree stump with roots diorama.
    // Replace it 100% with cell [0, 0] (oak green tree).
    if (cell[0] === 1 && cell[1] === 0) {
      cell = [0, 0];
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    // During a pan, nearest/bilinear sampling is materially cheaper and the
    // sprite is only shown for a few frames. Restore high-quality filtering
    // when the camera settles.
    ctx.imageSmoothingEnabled = true;
    if (!fastRenderMode) {
      ctx.imageSmoothingQuality = "high";
    } else {
      ctx.imageSmoothingQuality = "low";
    }
    const pad = 18; // Aggressive inset padding margin (18px) to guarantee zero adjacent cell pixel bleeding
    const sx = cell[0] * 256 + pad;
    const sy = cell[1] * 256 + pad;
    const sw = 256 - pad * 2;
    const sh = 256 - pad * 2;
    ctx.drawImage(atlas, sx, sy, sw, sh, x - size / 2, y - size, size, size);
    ctx.restore();
    return true;
  }

  const GAME_ENV_V2_SPRITES: Record<string, [number, number]> = {
    // Semantic 4x4 Atlas Names
    v2_waterfall: [0, 0],
    v2_swamp: [3, 2], // Replaced tree stump with lush green orchard
    v2_lava: [2, 0],
    v2_mushrooms: [3, 0],
    v2_church: [0, 1],
    v2_market: [1, 1],
    v2_watchtower: [2, 1],
    v2_camp: [3, 1],
    v2_bridge: [0, 2],
    v2_graveyard: [1, 2],
    v2_fountain: [2, 2],
    v2_orchard: [3, 2],
    v2_shipwreck: [0, 3],
    v2_wizard_tower: [1, 3],
    v2_arena: [2, 3],
    v2_dragon_bone: [3, 3],

    // Backward-compatible sprite alias keys (all stumps/roots map to lush trees)
    v2_oak: [3, 2],
    v2_autumn: [3, 2],
    v2_pine: [2, 1],
    v2_cherry: [3, 2],
    v2_dead_tree: [3, 2],
    v2_bush_round: [3, 2],
    v2_bush_leafy: [3, 2],
    v2_bush_berry: [3, 2],
    v2_fern: [3, 2],
    v2_bush_flower: [2, 2],
    v2_rock_big: [2, 0],
    v2_rock_cluster: [2, 0],
    v2_log: [3, 2],
    v2_stump: [3, 2],
    v2_roots: [3, 2],
    v2_bamboo: [3, 2],
    v2_reeds: [3, 2],
    v2_flowers: [2, 2],
    v2_ruin_wall: [3, 3],
    v2_grass_patch: [3, 2],
  };

  function strategicAssetImage(name: string) {
    const path = STRATEGIC_ASSET_PATHS[name];
    if (!path) return null;
    let image = strategicAssetImages.get(path);
    if (!image) {
      image = new Image();
      image.decoding = "async";
      image.src = path;
      strategicAssetImages.set(path, image);
    }
    return image;
  }

  function strategicMapAssetImage(name: string) {
    const path = STRATEGIC_MAP_ASSET_PATHS[name];
    if (!path) return null;
    let image = strategicMapAssetImages.get(path);
    if (!image) {
      image = new Image();
      image.decoding = "async";
      image.src = path;
      strategicMapAssetImages.set(path, image);
    }
    return image;
  }

  function getMedievalWorldAtlas() {
    if (!medievalWorldAtlas) {
      medievalWorldAtlas = new Image();
      medievalWorldAtlas.decoding = "async";
      medievalWorldAtlas.onload = () => {
        regionPass2Cache.clear();
      };
      medievalWorldAtlas.src = "/assets/world/medieval_world_atlas.webp";
    }
    return medievalWorldAtlas;
  }

  function drawMedievalWorldSprite(
    sprite: string,
    x: number,
    y: number,
    size: number,
    alpha = 1,
  ) {
    const image = getMedievalWorldAtlas();
    const cell = MEDIEVAL_WORLD_SPRITES[sprite];
    // Strictly restrict to Top Row (Row 0: forest_oak, forest_pine, forest_snow, forest_autumn)
    if (!cell || cell[1] !== 0 || !image.complete || !image.naturalWidth)
      return false;
    const cellWidth = image.naturalWidth / 4;
    const cellHeight = image.naturalHeight / 4;
    const padX = Math.max(12, Math.round(cellWidth * 0.075));
    const padY = Math.max(12, Math.round(cellHeight * 0.075));
    const sx = cell[0] * cellWidth + padX;
    const sy = cell[1] * cellHeight + padY;
    const sw = cellWidth - padX * 2;
    const sh = cellHeight - padY * 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      image,
      sx,
      sy,
      sw,
      sh,
      x - size / 2,
      y - size * 0.76,
      size,
      size,
    );
    ctx.restore();
    return true;
  }

  function getGameEnvAssetsV2() {
    if (!gameEnvAssetsV2) {
      gameEnvAssetsV2 = new Image();
      gameEnvAssetsV2.decoding = "async";
      gameEnvAssetsV2.src = "/assets/world/game-environment-assets-v2.webp";
    }
    return gameEnvAssetsV2;
  }

  function drawGameEnvV2Sprite(
    sprite: string,
    x: number,
    y: number,
    size: number,
    alpha = 1,
  ) {
    return false; // Completely disabled game-environment-assets-v2.webp as requested
  }

  function drawMedievalDetailSprite(
    column: number,
    row: number,
    x: number,
    y: number,
    size: number,
  ) {
    return false; // Completely disabled medieval_detail_atlas.webp as requested
  }

  function getMedievalDetailAtlas() {
    if (!medievalDetailAtlas) {
      medievalDetailAtlas = new Image();
      medievalDetailAtlas.decoding = "async";
      medievalDetailAtlas.src = "/assets/world/medieval_detail_atlas.webp";
    }
    return medievalDetailAtlas;
  }

  function drawKingdomBuildingSprite(
    architectureId: string,
    buildingType: KingdomBuildingType,
    x: number,
    y: number,
    size: number,
    skinId: string | null = null,
  ) {
    const normalized = normalizeKingdomArchitecture(architectureId);
    const frame = kingdomBuildingSprite(normalized, buildingType, skinId);
    let image = kingdomBuildingImages.get(frame.src);
    if (!image) {
      image = new Image();
      image.decoding = "async";
      image.src = frame.src;
      kingdomBuildingImages.set(frame.src, image);
    }
    if (!image.complete || !image.naturalWidth) return false;

    if (
      frame.premium &&
      state.zoom >= 0.5 &&
      !fastRenderMode &&
      !crowdedRenderMode &&
      !isFastPanning()
    ) {
      drawKingdomBuildingAura({
        ctx,
        tick: state.tick,
        architectureId: normalized,
        buildingType,
        x,
        y,
        size,
        skinId,
      });
    }
    const layout = KINGDOM_BUILDING_LAYOUT[buildingType];
    const drawHeight = size;
    const drawWidth =
      buildingType === "flag"
        ? frame.premium
          ? // The premium atlas uses a square transparent cell around a tall
            // banner. Give the banner its intended readable width; using the
            // old 418/627 ratio made the already narrow artwork collapse.
            size * 1.12
          : size * (frame.sw / frame.sh)
        : size;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = fastRenderMode ? "low" : "high";
    ctx.drawImage(
      image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      x - drawWidth * layout.pivotX,
      y - drawHeight * layout.pivotY,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
    return true;
  }

  function territoryBuildingAnchor(
    centerX: number,
    centerY: number,
    architectureId: string,
    buildingType: KingdomBuildingType,
    size: number,
    skinId: string | null = null,
  ) {
    const layout = KINGDOM_BUILDING_LAYOUT[buildingType];
    const metrics = kingdomBuildingVisualMetrics(
      architectureId,
      buildingType,
      skinId,
    );
    const frame = kingdomBuildingSprite(architectureId, buildingType, skinId);
    const drawWidth =
      buildingType === "flag"
        ? frame.premium
          ? size * 1.12
          : size * (frame.sw / frame.sh)
        : size;
    return {
      // A territory's canonical point represents the centre of its usable
      // ground. Align the sprite's footprint—not the centre of its transparent
      // atlas cell—to that point so every building stands in the middle of
      // the province regardless of nation artwork or equipped skin.
      x: centerX + drawWidth * (layout.pivotX - metrics.footX),
      y: centerY + size * (layout.pivotY - metrics.footY),
    };
  }

  // Start decoding before the first map frame. Missing atlases never fall back to pixel art.
  getMedievalWorldAtlas();
  getMedievalDetailAtlas();

  function townHasSpecial(town: any, special: string) {
    const regionId = town ? regionAtCoords(town.x, town.y) : -1;
    return (
      regionId >= 0 && territorySpecialResources(regionId).includes(special)
    );
  }

  function timingProgress(startedAt: any, endsAt: any) {
    const start = new Date(startedAt).getTime();
    const end = new Date(endsAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      return 1;
    return Math.max(0, Math.min(1, (Date.now() - start) / (end - start)));
  }

  function clearingTimingProgress(timing: any) {
    if (!timing?.startedAt || !timing?.completesAt) return 0;
    const start = new Date(timing.startedAt).getTime();
    const arrives = timing.arrivesAt
      ? new Date(timing.arrivesAt).getTime()
      : start;
    const end = new Date(timing.completesAt).getTime();
    const now = Date.now();
    if (now < arrives) return 0;
    if (now >= end || end <= arrives) return 1;
    return Math.max(0, Math.min(1, (now - arrives) / (end - arrives)));
  }

  function timingElapsedSeconds(startedAt: any, endsAt: any) {
    const start = new Date(startedAt).getTime();
    const end = new Date(endsAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      return { elapsed: 0, duration: 1 };
    return {
      elapsed: Math.max(0, (Date.now() - start) / 1000),
      duration: Math.max(1, (end - start) / 1000),
    };
  }

  // Initialize ownership arrays: all wild (0)
  function initTerritoryArrays() {
    const total = regions.length + islets.length;
    for (let i = 0; i < total; i++) {
      if (state.regionOwnership[i] === undefined) state.regionOwnership[i] = 0;
      if (state.regionClearing[i] === undefined) state.regionClearing[i] = 0;
    }
    // Precompute and cache regionId for all initial towns to avoid slow regionAtCoords calls later
    towns.forEach((t: any) => {
      if (t.regionId === undefined) {
        t.regionId = t.id >= 9000 ? t.id - 9000 : regionAtCoords(t.x, t.y);
      }
    });
  }

  function load() {
    // Gameplay state is authoritative from backend/socket, not localStorage.
  }

  function save() {
    // No local gameplay persistence. Backend/socket owns durable state.
  }

  let lastCameraSaveAt = 0;
  let cameraSavePending = false;

  let cachedBounds: any = null;

  function worldContentBounds() {
    if (cachedBounds) return cachedBounds;
    const lands = [...regions, ...islets];
    if (!lands.length)
      return { minX: 0, minY: 0, maxX: 1600, maxY: 1400, cx: 800, cy: 700 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    lands.forEach((r: any) => {
      const rx = r.rx || r.r || 120;
      const ry = r.ry || (r.r || 120) * 0.78;
      minX = Math.min(minX, r.x - rx - 220);
      minY = Math.min(minY, r.y - ry - 220);
      maxX = Math.max(maxX, r.x + rx + 220);
      maxY = Math.max(maxY, r.y + ry + 220);
    });
    minX = Math.max(0, minX);
    minY = Math.max(0, minY);
    cachedBounds = {
      minX,
      minY,
      maxX,
      maxY,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    };
    return cachedBounds;
  }

  function centerCameraOnWorldContent() {
    const b = worldContentBounds();
    const farZ = getDefaultFarZoom();
    state.zoom = farZ;
    state.targetZoom = farZ;
    state.panX = W / 2 - b.cx * state.zoom - (1 - state.zoom) * W * 0.48;
    state.panY = H / 2 - b.cy * state.zoom - (1 - state.zoom) * H * 0.48;
    state.targetPanX = null;
    state.targetPanY = null;
    clampPan();
  }

  function panCameraTo(cx: number, cy: number) {
    state.targetPanX = W / 2 - cx * state.zoom - (1 - state.zoom) * W * 0.48;
    state.targetPanY = H / 2 - cy * state.zoom - (1 - state.zoom) * H * 0.48;
  }

  function cameraSeesLand() {
    const left = (0 - (1 - state.zoom) * W * 0.48 - state.panX) / state.zoom;
    const top = (0 - (1 - state.zoom) * H * 0.48 - state.panY) / state.zoom;
    const right = (W - (1 - state.zoom) * W * 0.48 - state.panX) / state.zoom;
    const bottom = (H - (1 - state.zoom) * H * 0.48 - state.panY) / state.zoom;
    return [...regions, ...islets].some((r: any) => {
      const rx = r.rx || r.r || 120;
      const ry = r.ry || (r.r || 120) * 0.78;
      return (
        r.x + rx >= left &&
        r.x - rx <= right &&
        r.y + ry >= top &&
        r.y - ry <= bottom
      );
    });
  }

  function loadCamera() {
    try {
      const raw = localStorage.getItem(CAMERA_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      const minZ = getMinZoom();
      const maxZ = getMaxZoom();
      if (Number.isFinite(saved.zoom)) {
        state.zoom = Math.max(minZ, Math.min(maxZ, saved.zoom));
        state.targetZoom = state.zoom;
      } else {
        const farZ = getDefaultFarZoom();
        state.zoom = farZ;
        state.targetZoom = farZ;
      }
      if (Number.isFinite(saved.panX)) state.panX = saved.panX;
      if (Number.isFinite(saved.panY)) state.panY = saved.panY;
      state.selected = null;
      state.selectedRegion = null;
      clampPan();
      if (!cameraSeesLand()) centerCameraOnWorldContent();
      state.cameraRestored = true;
      return true;
    } catch (e) {
      localStorage.removeItem(CAMERA_KEY);
      return false;
    }
  }

  function saveCamera(force = false) {
    try {
      const now = performance.now();
      if (!force && now - lastCameraSaveAt < 500) {
        cameraSavePending = true;
        return;
      }
      lastCameraSaveAt = now;
      cameraSavePending = false;
      localStorage.setItem(
        CAMERA_KEY,
        JSON.stringify({
          zoom: state.zoom,
          targetZoom: state.targetZoom,
          panX: state.panX,
          panY: state.panY,
          selected: state.selected,
          selectedRegion: state.selectedRegion,
        }),
      );
    } catch (e) {}
  }

  function pxRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (n & 255) + amount));
    return `rgb(${r},${g},${b})`;
  }

  function nearestContinent(r: any) {
    let best: any = null;
    for (const c of megaContinents) {
      const nx = (r.x - c.x) / c.rx;
      const ny = (r.y - c.y) / c.ry;
      const d = nx * nx + ny * ny;
      if (!best || d < best.d) best = { ...c, d };
    }
    return best;
  }

  const CONTINENT_TERRAIN_CLUSTERS: Record<
    number,
    { core: number; mid: number; coast: number }
  > = {
    0: { core: 6, mid: 0, coast: 5 }, // Emerald Continent: Core Deep Pine -> Mid Grassland -> Coastal Olive
    1: { core: 1, mid: 7, coast: 0 }, // Desert: compact sand core -> moss savanna -> green coast
    2: { core: 2, mid: 4, coast: 6 }, // Alpine: snow core -> jade foothills -> pine coast
    3: { core: 3, mid: 6, coast: 5 }, // Volcanic: compact ash core -> pine highland -> clay coast
    4: { core: 4, mid: 6, coast: 0 }, // Jade Isle: Core Jade -> Mid Pine -> Coastal Grass
    5: { core: 5, mid: 0, coast: 7 }, // Rose Isle: Core Clay -> Mid Grass -> Coastal Moss
    6: { core: 6, mid: 4, coast: 0 }, // Pine Realm: Core Pine -> Mid Jade -> Coastal Grass
    7: { core: 7, mid: 6, coast: 5 }, // Highland Moss: Core Moss -> Mid Pine -> Coastal Olive
  };

  const OVERVIEW_CLIMATE_GROUP: Record<string, number> = {
    forest: 0,
    pine: 0,
    mint: 0,
    isles: 0,
    violet: 0,
    desert: 1,
    sand: 1,
    rose: 1,
    ice: 2,
    volcanic: 3,
  };

  function visualBiomeIndex(r: any, idx: number, isIslet = false) {
    const declaredBiome = Number(r?.biome);
    const hasDeclaredBiome =
      r?.biome !== null &&
      r?.biome !== undefined &&
      Number.isInteger(declaredBiome) &&
      declaredBiome >= 0 &&
      declaredBiome < BIOMES.length;
    const cacheKey = `${isIslet ? "i" : "r"}_${r.id ?? idx}_${hasDeclaredBiome ? declaredBiome : "auto"}`;
    const cached = visualBiomeCache.get(cacheKey);
    if (cached !== undefined) return cached;

    if (isIslet) {
      // Islands inherit the nearest climate family so an archipelago reads as
      // one geographic group instead of alternating colour per island.
      const nearest = nearestContinent(r);
      const isletBiome = Number.isInteger(Number(nearest?.biome))
        ? Number(nearest.biome) % BIOMES.length
        : hasDeclaredBiome
          ? declaredBiome
          : 0;
      visualBiomeCache.set(cacheKey, isletBiome);
      return isletBiome;
    }

    const continent = nearestContinent(r);
    let base = 0;
    if (continent) {
      const primaryBiome = (continent.biome ?? 0) % BIOMES.length;
      const cluster = CONTINENT_TERRAIN_CLUSTERS[primaryBiome] || {
        core: primaryBiome,
        mid: primaryBiome,
        coast: primaryBiome,
      };

      const nx = (r.x - continent.x) / (continent.rx || 300);
      const ny = (r.y - continent.y) / (continent.ry || 300);
      const distSq = nx * nx + ny * ny;
      // Keep only a tiny deterministic wobble at climate boundaries. The old
      // 0.32 noise amplitude scattered isolated snow/desert/forest provinces
      // throughout a continent and created the mottled appearance.
      const noise =
        (hash((r.id ?? idx) * 37 + (r.seed || 1) * 19) - 0.5) * 0.035;
      const effectiveDist = distSq + noise;

      const coreThreshold =
        primaryBiome === 1
          ? 0.14
          : primaryBiome === 5
            ? 0.18
            : primaryBiome === 3
              ? 0.2
              : 0.26;
      const midThreshold = primaryBiome === 1 ? 0.64 : 0.72;

      if (effectiveDist < coreThreshold) {
        base = cluster.core; // Core mountain peak / deep forest
      } else if (effectiveDist < midThreshold) {
        base = cluster.mid; // Midland valley / grassland
      } else {
        base = cluster.coast; // Coastal plain / savanna
      }
    } else {
      base = Math.max(0, Math.min(BIOMES.length - 1, Math.round(r.biome || 0)));
    }

    visualBiomeCache.set(cacheKey, base);
    return base;
  }

  function visualBiome(r: any, idx: number, isIslet = false) {
    if (overviewRenderMode) {
      const cacheKey = `${isIslet ? "i" : "r"}_${r.id ?? idx}`;
      const cachedOverviewBiome = overviewBiomeCache.get(cacheKey);
      if (cachedOverviewBiome !== undefined) {
        return OVERVIEW_BIOMES[cachedOverviewBiome] || OVERVIEW_BIOMES[0];
      }

      // Keep the exact biome for normal zoom, but use the continent climate
      // for the strategic overview so every province in one landmass shares
      // one stable colour instead of becoming a patchwork of biome colours.
      let sourceBiome = visualBiomeIndex(r, idx, isIslet);
      let overviewGroup: number | undefined;
      if (!isIslet) {
        const continent = nearestContinent(r);
        const climate = String(continent?.climate || "").toLowerCase();
        if (climate in OVERVIEW_CLIMATE_GROUP) {
          overviewGroup = OVERVIEW_CLIMATE_GROUP[climate];
        }
        const continentBiome = Number(continent?.biome);
        if (
          Number.isInteger(continentBiome) &&
          continentBiome >= 0 &&
          continentBiome < BIOMES.length
        ) {
          sourceBiome = continentBiome;
        }
      }
      const group =
        overviewGroup ??
        OVERVIEW_BIOME_GROUP_BY_BIOME[sourceBiome] ??
        OVERVIEW_BIOME_GROUP_BY_BIOME[0];
      overviewBiomeCache.set(cacheKey, group);
      return OVERVIEW_BIOMES[group] || OVERVIEW_BIOMES[0];
    }

    const baseIndex = visualBiomeIndex(r, idx, isIslet);
    const baseBiome = BIOMES[baseIndex] || BIOMES[0];
    // Keep one canonical surface color per biome. Per-region micro tint made
    // adjacent provinces look like a patchwork quilt and also made the coast
    // foundation disagree slightly with the cached land body.
    return baseBiome;
  }

  function text(
    str: string,
    x: number,
    y: number,
    size: number,
    color?: string,
    align?: CanvasTextAlign,
  ) {
    ctx.font = `700 ${size}px 'Noto Serif', 'Noto Serif KR', 'Noto Serif JP', serif`;
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.lineWidth = Math.max(2, Math.floor(size / 5));
    ctx.strokeStyle = "#071018";
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color || "#fff4ce";
    ctx.fillText(str, x, y);
  }

  function panel(x, y, w, h, title) {
    pxRect(x + 5, y + 5, w, h, "rgba(0,0,0,0.35)");
    pxRect(x, y, w, h, "#0b1e2a");
    pxRect(x + 4, y + 4, w - 8, h - 8, "#183040");
    pxRect(x + 8, y + 8, w - 16, h - 16, "#102633");
    ctx.strokeStyle = "#513922";
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeStyle = "#8d6a3e";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 7, y + 7, w - 14, h - 14);
    if (title) {
      pxRect(x + 8, y + 8, w - 16, 38, "#162c39");
      text(title, x + 18, y + 17, 21, "#ffd34d");
    }
  }

  function drawWorldOceanTexture() {
    return; // Đã xóa toàn bộ sóng nhỏ ngoài đại dương, chỉ giữ sóng tại vách đá ven biển
  }

  function drawCompassRose(cx: number, cy: number) {
    ctx.save();
    // Base shadow
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 2, 28, 0, Math.PI * 2);
    ctx.fill();

    // Outer gold ring
    ctx.strokeStyle = "#c29b4f";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#8b6c37";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.stroke();

    // Draw the 8 points
    const drawPoint = (
      angle: number,
      length: number,
      width: number,
      isMajor: boolean,
    ) => {
      ctx.fillStyle = isMajor ? "#c29b4f" : "#8b6c37";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const radLeft = angle - Math.PI / 2;
      ctx.lineTo(
        cx + Math.cos(radLeft) * width,
        cy + Math.sin(radLeft) * width,
      );
      ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
      ctx.closePath();
      ctx.fill();

      // Shadow side
      ctx.fillStyle = isMajor ? "#614e26" : "#45381a";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const radRight = angle + Math.PI / 2;
      ctx.lineTo(
        cx + Math.cos(radRight) * width,
        cy + Math.sin(radRight) * width,
      );
      ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
      ctx.closePath();
      ctx.fill();
    };

    // Major points (N, E, S, W)
    for (let i = 0; i < 4; i++) {
      drawPoint((i * Math.PI) / 2, 38, 5, true);
    }
    // Minor points (NE, SE, SW, NW)
    for (let i = 0; i < 4; i++) {
      drawPoint((i * Math.PI) / 2 + Math.PI / 4, 25, 3.5, false);
    }

    // Inner gold core
    ctx.fillStyle = "#fdfbf7";
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c29b4f";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw Direction Letters
    ctx.fillStyle = "#ffd34d";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", cx, cy - 47);
    ctx.fillText("S", cx, cy + 47);
    ctx.fillText("E", cx + 47, cy);
    ctx.fillText("W", cx - 47, cy);
    ctx.restore();
  }

  function drawSailingShip(x: number, y: number, seed: number) {
    const bob = Math.sin(state.tick * 0.04 + seed) * 3.5;
    const tilt = Math.sin(state.tick * 0.03 + seed) * 0.06;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(tilt);

    // Ship shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(-14, 5, 28, 4);

    // 1. Brown Wooden Hull
    ctx.fillStyle = "#5c4033"; // dark wood
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(12, 0);
    ctx.lineTo(8, 6);
    ctx.lineTo(-12, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8b5a2b"; // light wood deck line
    ctx.fillRect(-12, -2, 22, 2);

    // 2. Masts (Bronze poles)
    ctx.fillStyle = "#332211";
    ctx.fillRect(-4, -22, 2, 20); // main mast
    ctx.fillRect(4, -16, 1.5, 14); // fore mast

    // 3. Sails (Glowing cream/white)
    ctx.fillStyle = "#fdfbf7";
    // Main sail
    ctx.beginPath();
    ctx.moveTo(-3, -22);
    ctx.quadraticCurveTo(-11, -12, -3, -4);
    ctx.quadraticCurveTo(-1, -12, -3, -22);
    ctx.closePath();
    ctx.fill();

    // Fore sail
    ctx.beginPath();
    ctx.moveTo(5, -16);
    ctx.quadraticCurveTo(0, -9, 5, -3);
    ctx.quadraticCurveTo(7, -9, 5, -16);
    ctx.closePath();
    ctx.fill();

    // 4. Empire Flag at masthead
    ctx.fillStyle = "#ffd34d"; // Gold flag
    ctx.beginPath();
    ctx.moveTo(-3, -22);
    ctx.lineTo(-9, -20 + Math.sin(state.tick * 0.15) * 1.5);
    ctx.lineTo(-3, -18);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawSeaMonster(x: number, y: number, seed: number) {
    const bob = Math.sin(state.tick * 0.05 + seed) * 6;
    const wave = Math.sin(state.tick * 0.08 + seed) * 4;

    ctx.save();
    ctx.translate(x, y + bob);

    // Monster shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tentacle / Tail
    ctx.fillStyle = "#2d1f3b"; // dark purple
    ctx.strokeStyle = "#493561"; // light highlights
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.bezierCurveTo(-12 + wave, -10, 4 + wave, -18, 0, -26);
    ctx.bezierCurveTo(8 + wave, -18, -4 + wave, -10, 8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Splashes around the tentacle
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(-10 + Math.sin(state.tick * 0.2) * 2, 4, 4, 2);
    ctx.fillRect(6 + Math.cos(state.tick * 0.2) * 2, 3, 4, 2);

    ctx.restore();
  }

  function drawWorldOceanDetails() {
    // 1. Draw Compass Rose
    drawCompassRose(530, 180);

    // 2. Draw Sailing Ships
    drawSailingShip(280, 140, 101);
    drawSailingShip(760, 390, 202);

    // 3. Draw Sea Monsters
    drawSeaMonster(130, 480, 303);
  }

  function drawClouds() {
    ctx.save();
    // 6 clouds drifting
    const count = 6;
    for (let i = 0; i < count; i++) {
      const seed = i + 105;
      const speed = 0.18 + (seed % 3) * 0.06;
      const size = 50 + (seed % 4) * 15;

      // Drifts slowly across the canvas (added 65x speed multiplier to state.tick)
      const cx =
        ((seed * 220 + state.tick * 65 * speed) % (W + size * 4)) - size * 2;
      const cy = ((seed * 137) % (H - 140)) + 60;

      // Overlapping circle offsets to make it look like a fluffy cluster
      const bubbles = [
        { dx: 0, dy: 0, r: size },
        { dx: -size * 0.5, dy: size * 0.1, r: size * 0.65 },
        { dx: size * 0.5, dy: size * 0.1, r: size * 0.65 },
        { dx: -size * 0.25, dy: -size * 0.25, r: size * 0.75 },
        { dx: size * 0.25, dy: -size * 0.25, r: size * 0.75 },
      ];

      // 1. Draw soft cloud shadow on the map (very clear contrast shadow)
      ctx.fillStyle = "rgba(4, 15, 26, 0.35)";
      bubbles.forEach((b) => {
        ctx.beginPath();
        ctx.arc(cx + b.dx + 25, cy + b.dy + 30, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw fluffy cloud body (85% opaque white)
      ctx.fillStyle = "rgba(245, 248, 252, 0.85)";
      bubbles.forEach((b) => {
        ctx.beginPath();
        ctx.arc(cx + b.dx, cy + b.dy, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Draw highlighted core
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      bubbles.forEach((b) => {
        ctx.beginPath();
        ctx.arc(cx + b.dx - 4, cy + b.dy - 4, b.r * 0.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Draw soft outline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 1.8;
      bubbles.forEach((b) => {
        ctx.beginPath();
        ctx.arc(cx + b.dx, cy + b.dy, b.r, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
    ctx.restore();
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

  function softenPolygonCorners(
    points: Array<[number, number]>,
  ): Array<[number, number]> {
    return points;
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

  function getSharedEdge(r1: any, r2: any): Array<[number, number]> {
    const idA = Math.min(r1.id ?? 0, r2.id ?? 0);
    const idB = Math.max(r1.id ?? 0, r2.id ?? 0);
    const edgeKey = `${idA}_${idB}`;

    let cached = sharedEdgeCache.get(edgeKey);
    if (cached) return cached;

    const mx = (r1.x + r2.x) / 2;
    const my = (r1.y + r2.y) / 2;
    const dx = r2.x - r1.x;
    const dy = r2.y - r1.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;

    const seed = idA * 7919 + idB * 104729;
    const numPts = 9;
    const halfLen = Math.min(r1.rx || 180, r2.rx || 180) * 0.45;

    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= numPts; i++) {
      const t = i / numPts - 0.5;
      const px = mx + nx * (t * halfLen * 2);
      const py = my + ny * (t * halfLen * 2);

      const wave =
        Math.sin((i / numPts) * Math.PI) * ((hash(seed + i * 23) - 0.5) * 16);
      const finalX = Math.round((px + (dx / dist) * wave) * 2) / 2;
      const finalY = Math.round((py + (dy / dist) * wave) * 2) / 2;
      pts.push([finalX, finalY]);
    }

    sharedEdgeCache.set(edgeKey, pts);
    return pts;
  }

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
    // Đảm bảo tối thiểu 6 đỉnh sau khi clipping
    cached = ensureMinVertices(cached, 6);
    cached = softenCoastalTerritoryEdges(cached, r);
    // Subdivide and warp the coordinates to make the boundaries wavy/organic and remove the hexagonal look
    const subdivided = subdividePolygon(cached, 20);
    const warped = subdivided.map(([x, y]) => warpPoint(x, y));
    sharedRegionPolygonCache.set(polyKey, warped);
    return warped;
  }

  function getContinentFoundationPolygon(
    r: any,
    idx: number,
  ): Array<[number, number]> {
    const seed = r.seed || idx * 101 + 17;
    const key = `continent_foundation_v1_${idx}_${Math.round(r.x)}_${Math.round(r.y)}`;
    let cached = sharedRegionPolygonCache.get(key);
    if (cached) return cached;

    const rx = (r.rx || 230) * (1.0 + hash(seed * 71) * 0.08);
    const ry = (r.ry || rx * 0.78) * (0.98 + hash(seed * 73) * 0.08);
    cached = getOrganicPath(r.x, r.y, rx, ry, seed * 1.7 + 0.19, key);
    sharedRegionPolygonCache.set(key, cached);
    return cached;
  }

  // Phình rộng polygon ra ngoài `amount` pixel so với tâm (cx, cy)
  // Dùng để lấp kín gap sub-pixel giữa các ô kề nhau
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

      if (fastRenderMode || lightweightAssetRenderMode) {
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

      // 6. Vân vách đá 3D nứt nẻ sắc nét (Vertical Rock Crevices & Striations)
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
      // The foundation only closes the tiny gaps between shared polygons.
      // Do not stroke every region here: that turns each province into a
      // visible tile. Actual ownership boundaries are drawn once in pass 4.
      fillPath(
        makeOffset(r, id, false, 6, 1, 2),
        biome.a || biome.b || "#427a32",
      );
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
      state.regionOwnerNames[regionId] === "ĐANG KHAI HOANG";

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
      return (
        (state.regionOwnerIds[regionId]
          ? fallbackTerritoryOwnerColor(state.regionOwnerIds[regionId])
          : null) ||
        factions[ownerCode]?.color ||
        "#ef4444"
      );
    }
    return state.newbieFlagColor || "#2563eb";
  }

  function regionOwner(r) {
    let best = null;
    towns.forEach((t) => {
      const rx = (r.rx || r.r) * 1.08;
      const ry = (r.ry || r.r * 0.78) * 1.08;
      const nx = (t.x - r.x) / rx;
      const ny = (t.y - r.y) / ry;
      const d = nx * nx + ny * ny;
      if (d <= 1.2 && (!best || d < best.d)) best = { owner: t.owner, d };
    });
    if (best) return best.owner;
    let nearest = null;
    towns.forEach((t) => {
      const d = Math.hypot(t.x - r.x, t.y - r.y);
      if (d < 150 && (!nearest || d < nearest.d))
        nearest = { owner: t.owner, d };
    });
    return nearest ? nearest.owner : null;
  }

  function drawHill(x, y, scale, _color?: string) {
    drawBush(x, y, (scale || 1) * 0.9);
  }

  function drawBush(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    const rnd = Math.abs(Math.sin(x * 12.9898 + y * 78.233));
    const sprite = rnd > 0.5 ? "v2_bush_round" : "v2_bush_leafy";
    if (!drawGameEnvV2Sprite(sprite, x, y, 42 * sc, 0.95)) {
      drawMedievalDetailSprite(0, 0, x, y, 42 * sc);
    }
  }

  function drawPalmTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_dead_tree", x, y, 78 * sc, 0.95)) {
      drawMedievalWorldSprite("desert", x, y, 78 * sc, 0.95);
    }
  }

  function drawChest(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    drawMedievalWorldSprite("gold", x, y, 54 * sc, 0.95);
  }

  function drawFlower(
    x: number,
    y: number,
    scale?: number,
    _color1?: string,
    _color2?: string,
  ) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_flowers", x, y, 40 * sc, 0.95)) {
      drawMedievalDetailSprite(1, 0, x, y, 40 * sc);
    }
  }

  function drawBerryBush(
    x: number,
    y: number,
    scale?: number,
    _berryColor?: string,
  ) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_bush_berry", x, y, 44 * sc, 0.95)) {
      drawMedievalDetailSprite(0, 0, x, y, 44 * sc);
    }
  }

  function drawMushrooms(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_log", x, y, 52 * sc, 0.95)) {
      drawMedievalDetailSprite(1, 1, x, y, 36 * sc);
    }
  }

  function drawSnowTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_cherry", x, y, 72 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_snow", x, y, 72 * sc, 0.95);
    }
  }

  // Swamp tree maps to pine tree sprite
  function drawSwampTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_pine", x, y, 74 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_pine", x, y, 74 * sc, 0.95);
    }
  }

  function drawLakeInRegion(r, seed, rx, ry) {
    return; // Đã vô hiệu hóa sông hồ vẽ tay trên lãnh thổ
  }

  function drawRiverInRegion(r, seed, rx, ry) {
    return; // Đã vô hiệu hóa sông hồ vẽ tay trên lãnh thổ
  }

  const renderTerritoryVegetation = (
    r: any,
    seed: number,
    rx: number,
    ry: number,
    biome: number,
    lightweight = false,
  ) => {
    if (lightweightAssetRenderMode) return "hidden" as const;
    return (
      renderTerritoryVegetationLayer(
        {
          hasTown: (regionId) => frameTownRegionIds.has(regionId),
          getTownDistance: (x, y) => {
            let nearest = Infinity;
            towns.forEach((town: any) => {
              nearest = Math.min(
                nearest,
                Math.hypot(town.x - x, town.y - y),
              );
            });
            return nearest;
          },
          zoom: state.zoom,
          getAtlas: getTerritoryVegetationAtlas,
          drawMedievalWorldSprite,
          drawTerritoryVegetationSprite,
        },
        r,
        seed,
        rx,
        ry,
        biome,
        { hideAssets: hideTerritoryAssets, lightweight },
      )
    );
  };

  function drawRegionTerrain(
    r: any,
    seed: number,
    rx: number,
    ry: number,
    _originalBiome: number,
    terrainBiome = _originalBiome,
  ) {
    if (hideTerritoryAssets || lightweightAssetRenderMode) return;
    drawLakeInRegion(r, seed, rx, ry);
    drawRiverInRegion(r, seed, rx, ry);
    if (
      renderTerritoryVegetation(
        r,
        seed,
        rx,
        ry,
        terrainBiome,
        fastRenderMode || crowdedRenderMode || isFastPanning(),
      ) === "complete"
    ) return;

    const atlas = getMedievalWorldAtlas();
    if (!atlas.complete || !atlas.naturalWidth) return;

    const hasTown = frameTownRegionIds.has(Number(r.id));
    const specials = territorySpecialResources(r.id);
    const special = specials.find((name) =>
      ["Bãi ngựa", "Xưởng rèn", "Bến tàu tự nhiên", "Mỏ Ngọc"].includes(name),
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
    if (!special && dominantResource === "wood") {
      const resRoll = hash(seed * 71 + r.id * 17);
      if (resRoll < 0.65) {
        primarySprite = naturalLandmark;
      } else {
        primarySprite = "wood";
      }
    } else if (!special && dominantResource === "food") {
      const resRoll = hash(seed * 71 + r.id * 17);
      primarySprite =
        resRoll < 0.4 ? "food" : resRoll < 0.7 ? "cottage" : naturalLandmark;
    } else if (!special && dominantResource === "stone") {
      const resRoll = hash(seed * 71 + r.id * 17);
      primarySprite = resRoll < 0.5 ? "stone" : naturalLandmark;
    } else if (!special && dominantResource === "gold") {
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

      if (special === "Bến tàu tự nhiên" && i > 0) {
        const fixedHarbor = getCachedCoastPort(r.id);
        const harborX = fixedHarbor?.x ?? r.x + dx;
        const harborY = fixedHarbor?.y ?? r.y + dy;

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
          const fixedHarbor = getCachedCoastPort(r.id);
          if (fixedHarbor) {
            posX = fixedHarbor.x;
            posY = fixedHarbor.y;
          }
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

      if (special === "Bãi ngựa") {
        if (roll < 0.55) {
          items.push({ type: "grass", x, y, size, scale });
        } else {
          items.push({ type: "flower", x, y, size, scale });
        }
      } else if (special === "Xưởng rèn") {
        if (roll < 0.4) {
          items.push({ type: "bush", x, y, size, scale });
        } else if (roll < 0.75) {
          items.push({ type: "oak", x, y, size, scale });
        } else {
          items.push({ type: "berry", x, y, size, scale });
        }
      } else if (special === "Bến tàu tự nhiên") {
        if (roll < 0.7) {
          items.push({ type: "grass", x, y, size, scale });
        } else {
          items.push({ type: "bush", x, y, size, scale });
        }
      } else if (special === "Mỏ Ngọc") {
        if (roll < 0.55) {
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

  function drawPaintedForestCluster(
    r: any,
    seed: number,
    rx: number,
    ry: number,
    biome: number,
  ) {
    if (
      fastRenderMode ||
      isFastPanning() ||
      state.zoom < 0.36 ||
      (biome !== 0 && biome !== 5 && biome !== 6) ||
      hash(seed * 389 + r.id * 17) > 0.18
    )
      return false;

    const angle = hash(seed * 61) * TAU + Math.PI;
    const radius = 0.34 + hash(seed * 409) * 0.13;
    const x = r.x + Math.cos(angle) * rx * radius;
    const y = r.y + Math.sin(angle) * ry * radius;
    const size = state.zoom >= 0.78 ? 112 : 88;

    const sprite =
      biome === 5
        ? "forest_autumn"
        : biome === 6
          ? "forest_pine"
          : "forest_oak";
    return drawMedievalWorldSprite(sprite, x, y, size, 0.97);
  }

  function drawMedievalTerritoryDetails(
    r: any,
    seed: number,
    rx: number,
    ry: number,
    biome: number,
  ) {
    if (fastRenderMode || isFastPanning() || state.zoom < 0.52) return;

    const detailRoll = hash(seed * 199 + r.id * 11);
    if (detailRoll > 0.2) return;

    const angle = hash(seed * 211) * TAU;
    const radius = 0.48 + hash(seed * 223) * 0.13;
    const x = Math.round((r.x + Math.cos(angle) * rx * radius) / 4) * 4;
    const y = Math.round((r.y + Math.sin(angle) * ry * radius) / 4) * 4;
    const scale = state.zoom > 0.82 ? 0.95 : 0.72;

    if (biome === 0 || biome === 6 || biome === 7) {
      if (detailRoll < 0.45) {
        drawMedievalWorldSprite("food", x, y, 66 * scale, 0.9);
        return;
      }
      drawBerryBush(x, y, scale * 0.85);
    } else if (biome === 1 || biome === 2 || biome === 5) {
      drawRockPile(x, y, scale * 0.78);
    } else if (detailRoll < 0.16) {
      drawRuins(x, y, scale * 0.72);
    }
  }

  function getRegionBattleState(idx: number) {
    const battle = state.activeBattles?.find(
      (b: any) =>
        Number(b.regionId) === Number(idx) ||
        (b.townId !== undefined &&
          towns.find(
            (t: any) => t.id === b.townId && Number(t.regionId) === Number(idx),
          )),
    );
    if (battle) {
      const dur = battle.duration || battle.durationSeconds || 25;
      const remSec = Math.max(0, Math.ceil(dur - (battle.t || 0)));
      return {
        type: "battle",
        label: `GIAO TRANH: ${remSec}s`,
        remainingSec: remSec,
      };
    }

    const sourceBattle = state.activeBattles?.find(
      (b: any) => Number(b.fromTerritoryId) === Number(idx),
    );
    if (sourceBattle) {
      const dur = sourceBattle.duration || sourceBattle.durationSeconds || 25;
      const remSec = Math.max(0, Math.ceil(dur - (sourceBattle.t || 0)));
      return {
        type: "battle_source",
        label: `ĐANG CÔNG THÀNH: ${remSec}s`,
        remainingSec: remSec,
      };
    }

    let incomingVoyage: any = null;
    let outgoingVoyage: any = null;

    state.voyages?.forEach((v: any) => {
      if (!v.isAttack) return;
      let targetReg = v.targetRegionId;
      if (targetReg === undefined || targetReg < 0) {
        const dest = v.to || v.target;
        if (dest) targetReg = regionAtCoords(dest.x, dest.y);
      }
      let sourceReg = v.sourceRegionId;
      if (sourceReg === undefined || sourceReg < 0) {
        const src = v.from || v.source;
        if (src) sourceReg = regionAtCoords(src.x, src.y);
      }

      if (targetReg === idx) incomingVoyage = v;
      if (sourceReg === idx) outgoingVoyage = v;
    });

    if (incomingVoyage) {
      const remSec = Math.max(
        0,
        Math.ceil((incomingVoyage.duration || 10) - (incomingVoyage.t || 0)),
      );
      return {
        type: "under_attack",
        label: `BỊ TẤN CÔNG: ${remSec}s`,
        remainingSec: remSec,
      };
    }
    if (outgoingVoyage) {
      const remSec = Math.max(
        0,
        Math.ceil((outgoingVoyage.duration || 10) - (outgoingVoyage.t || 0)),
      );
      return {
        type: "attacking",
        label: `XUẤT BINH: ${remSec}s`,
        remainingSec: remSec,
      };
    }

    return null;
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
      nameUpper.startsWith("[LIÊN MINH]") ||
      nameUpper.includes("LIÊN MINH") ||
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
      territorySpecialResources(target.id).includes("Bến tàu tự nhiên"),
    );
    const sourceHasHarbor = Boolean(
      source.isIslet || sourceSpecials.includes("Bến tàu tự nhiên"),
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
      // At far zoom the tiny diorama canvases no longer carry readable detail
      // and are the largest source of draw calls. Territory land and buildings
      // are rendered by their separate passes, so the map never becomes blank.
      if (farSceneryRenderMode || lightweightAssetRenderMode) return;
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
      // Keep already-baked trees/resources visible while the camera is being
      // dragged. The old early return made all territory vegetation disappear
      // exactly during a pan, then reappear after the gesture ended.
      return;
    }

    const biomeId = visualBiomeIndex(r, idx, isIslet);
    // The strategic overview must use the same continent palette as the
    // foundation layer. Using BIOMES[biomeId] here repainted every province
    // on top and recreated the green/amber/grey patchwork.
    const biome = visualBiome(r, idx, isIslet);
    const seed = r.seed || idx + 1;
    const territoryColor = territoryTerrainColor(biome);
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
      if (fastRenderMode || lightweightAssetRenderMode || crowdedRenderMode)
        return;
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
      if ((lightweightAssetRenderMode || crowdedRenderMode) && !isIslet)
        return;
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
        cache.zoomTier === zoomTier &&
        cache.assetsEnabled === !lightweightAssetRenderMode &&
        cache.overviewPalette === overviewRenderMode
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
        if (
          state.zoom < 0.38 &&
          !farSceneryRenderMode &&
          !lightweightAssetRenderMode &&
          !hideTerritoryAssets &&
          !isConquestLayout
        ) {
          renderTerritoryVegetation(r, seed, rx, ry, biomeId, true);
        }
      } else {
        // If panning or in fast mode, and no cache exists, draw simplified directly to screen without caching
        if (
          fastRenderMode ||
          crowdedRenderMode ||
          isCameraInteracting() ||
          regionCacheBuildBudget <= 0
        ) {
          ctx.save();
          ctx.globalAlpha = isIslet || isCoastal ? 1 : 0.95;
          const landInflated = inflatePolygon(
            targetPoly,
            3,
            r.x,
            r.y - (isSelected ? 8 : 0),
          );
          fillSmoothPath(landInflated, territoryColor);
          ctx.restore();

          // Draw one deterministic, low-density vegetation item for uncached
          // regions during a pan. This avoids a blank territory while keeping
          // the expensive diorama cache build out of the input frame.
          if (
            !farSceneryRenderMode &&
            !lightweightAssetRenderMode &&
            !hideTerritoryAssets &&
            !isConquestLayout
          ) {
            renderTerritoryVegetation(r, seed, rx, ry, biomeId, true);
          }
        } else {
          regionCacheBuildBudget -= 1;
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
          fillSmoothPath(landInflated, territoryColor);
          ctx.restore();

          ctx.restore();
          ctx = tempCtx;

          // Build assets canvas
          let assetsCanvas: HTMLCanvasElement | null = null;
          if (!lightweightAssetRenderMode && !isConquestLayout) {
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
            assetsEnabled: !lightweightAssetRenderMode,
            overviewPalette: overviewRenderMode,
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
        state.regionOwnerNames[idx] === "ĐANG KHAI HOANG";

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
    const usesDistrictSkin = classifySettlement({
      isIslet: Boolean(r.isIslet),
      settlementKind: state.regionSettlementKinds[idx],
      connectionType: state.regionConnectionTypes[idx],
      capitalTerritoryConfirmed: state.capitalTerritoryIds.has(idx),
    }).isMilitaryDistrict;
    const ownerSkinId =
      ownerCode === 1
        ? usesDistrictSkin
          ? state.equippedDistrictSkin
          : state.equippedCapitalSkin
        : usesDistrictSkin
          ? state.regionOwnerDistrictSkins[idx]
          : state.regionOwnerCapitalSkins[idx];
    const skinTerritoryEffect = territorySkinEffect(ownerSkinId);

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
      } else if (ownerCode > 0) {
        ctx.save();
        ctx.globalAlpha = overviewRenderMode
          ? 0.52
          : skinTerritoryEffect?.fillAlpha ?? TERRITORY_OWNER_TINT_ALPHA;
        const claimedLand = inflatePolygon(displayLand, 3, r.x, r.y);
        fillSmoothPath(
          claimedLand,
          overviewRenderMode ? flagColor : skinTerritoryEffect?.fill ?? flagColor,
        );
        ctx.restore();

        if (
          skinTerritoryEffect &&
          !overviewRenderMode &&
          !fastRenderMode &&
          !crowdedRenderMode
        ) {
          // A low-contrast moving sheen makes the skin feel alive without
          // painting over trees, roads, or resource markers.
          ctx.save();
          traceSmoothPath(displayLand);
          ctx.clip();
          const pulse = 0.72 + Math.sin(state.tick * 2.2 + idx) * 0.16;
          const sheen = ctx.createRadialGradient(
            r.x - rx * 0.28,
            r.y - ry * 0.22,
            4,
            r.x,
            r.y,
            Math.max(rx, ry) * 1.28,
          );
          sheen.addColorStop(0, `rgba(255,255,255,${0.1 * pulse})`);
          sheen.addColorStop(0.45, "rgba(255,255,255,0.025)");
          sheen.addColorStop(1, "rgba(255,255,255,0)");
          ctx.globalCompositeOperation = "screen";
          ctx.fillStyle = sheen;
          ctx.fillRect(r.x - rx * 1.4, r.y - ry * 1.4, rx * 2.8, ry * 2.8);

          const sweep = ((state.tick * 18 + idx * 31) % (rx * 5)) - rx * 2.5;
          const sweepGradient = ctx.createLinearGradient(
            r.x + sweep - rx * 0.16,
            r.y - ry,
            r.x + sweep + rx * 0.16,
            r.y + ry,
          );
          sweepGradient.addColorStop(0, "rgba(255,255,255,0)");
          sweepGradient.addColorStop(0.5, `rgba(255,255,255,${0.055 * pulse})`);
          sweepGradient.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = sweepGradient;
          ctx.fillRect(r.x - rx * 1.4, r.y - ry * 1.4, rx * 2.8, ry * 2.8);
          ctx.restore();
        }
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

    function isInternalEdgePoint(
      px: number,
      py: number,
      r: any,
      ownerCode: number,
      _rel: string,
    ) {
      if (ownerCode === 0) return false;
      const neighbors = nearbyMainlandRegions(r);
      for (let i = 0; i < neighbors.length; i++) {
        const other = neighbors[i];
        const otherOwner = derivedRegionOwnership(other.id);

        const currentOwnerId = state.regionOwnerIds?.[r.id];
        const otherOwnerId = state.regionOwnerIds?.[other.id];
        const sameRemoteOwner =
          currentOwnerId && otherOwnerId
            ? currentOwnerId === otherOwnerId
            : Boolean(
                state.regionOwnerNames[other.id] &&
                  state.regionOwnerNames[other.id] ===
                    state.regionOwnerNames[r.id],
              );
        const sameOwner =
          otherOwner === ownerCode &&
          (ownerCode === 1 || sameRemoteOwner);

        if (sameOwner) {
          const dx = px - other.x;
          const dy = py - other.y;
          const otherRx = (other.rx || 230) * 1.08;
          const otherRy = (other.ry || otherRx * 0.78) * 1.08;
          const normDist =
            (dx * dx) / (otherRx * otherRx) + (dy * dy) / (otherRy * otherRy);
          if (normDist <= 1.08) {
            return true;
          }
        }
      }
      return false;
    }

    // Helper to draw outer boundary lines (skipping internal edges shared with same owner)
    function drawOuterBoundaryLines(
      strokeColor: string,
      width: number,
      shadowColor?: string,
    ) {
      if (targetPoly.length < 3) return;

      ctx.save();
      if (shadowColor) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = fastRenderMode ? 0 : 5;
      }
      ctx.globalAlpha *= 0.85;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.beginPath();
      const n = targetPoly.length;
      for (let i = 0; i < n; i++) {
        const p1 = targetPoly[i];
        const p2 = targetPoly[(i + 1) % n];
        const midX = (p1[0] + p2[0]) / 2;
        const midY = (p1[1] + p2[1]) / 2;

        const isInternal = isInternalEdgePoint(midX, midY, r, ownerCode, rel);
        if (!isInternal) {
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawStrategicCoastline(strokeColor: string, width: number) {
      if (!isCoastal || targetPoly.length < 3) return;
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < targetPoly.length; i++) {
        const p1 = targetPoly[i];
        const p2 = targetPoly[(i + 1) % targetPoly.length];
        const midX = (p1[0] + p2[0]) / 2;
        const midY = (p1[1] + p2[1]) / 2;
        if (isIslet || !isSharedInlandVertex(midX, midY, r)) {
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    if (pass === 4) {
      // Strategic overview uses a strict hierarchy: coastline, then country
      // borders. Province edges inside one owner remain hidden.
      if (
        overviewRenderMode &&
        !isClearing &&
        state.selectedRegion !== idx
      ) {
        const inverseZoom = 1 / Math.max(0.05, state.zoom);
        if (isCoastal) {
          drawStrategicCoastline("rgba(5, 15, 22, 0.9)", 3.2 * inverseZoom);
          drawStrategicCoastline("rgba(126, 166, 161, 0.72)", 1.05 * inverseZoom);
        }
        if (ownerCode > 0) {
          drawOuterBoundaryLines("rgba(4, 10, 15, 0.94)", 3.8 * inverseZoom);
          drawOuterBoundaryLines(flagColor, 1.45 * inverseZoom);
        }
        return;
      }

      if (ownerCode > 0 && skinTerritoryEffect && !isClearing) {
        ctx.save();
        ctx.globalAlpha = fastRenderMode ? 0.48 : 0.68;
        drawOuterBoundaryLines(
          skinTerritoryEffect.border,
          fastRenderMode ? 1.6 : 2.25,
          fastRenderMode ? undefined : skinTerritoryEffect.glow,
        );
        ctx.restore();
      }

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

  type TerritoryResourceIcon = {
    x: number;
    y: number;
    resType: string;
  };

  const territoryResourceIconCache = new Map<number, TerritoryResourceIcon[]>();
  const availableResourceTypes = [
    "gold",
    "wood",
    "stone",
    "food",
    "iron",
    "gems",
    "coal",
    "sulfur",
  ];

  function resourceIconsForRegion(
    r: any,
    seed: number,
    rx: number,
    ry: number,
    originalBiome: number,
  ) {
    const cacheKey = Number(r.id ?? seed);
    const cached = territoryResourceIconCache.get(cacheKey);
    if (cached) return cached;

    const icons: TerritoryResourceIcon[] = [];
    const specials = territorySpecialResources(r.id);

    const specialTypes: Record<string, string> = {
      "Bãi ngựa": "horse",
      "Xưởng rèn": "forge",
      "Bến tàu tự nhiên": "harbor",
      "Mỏ Ngọc": "gems",
    };
    const mappedSpecials = SPECIAL_RESOURCE_MAP_ORDER.filter(
      (name) => specialTypes[name] && specials.includes(name),
    );

    if (mappedSpecials.length) {
      const angleOffset = hash(seed * 61) * TAU;
      mappedSpecials.forEach((name, index) => {
        const angle = angleOffset + index * (TAU / Math.max(3, mappedSpecials.length));
        const rr = 0.34 + hash(seed * 67 + index * 13) * 0.24;
        const x = Math.round((r.x + Math.cos(angle) * rx * rr) / 4) * 4;
        const y = Math.round((r.y + Math.sin(angle) * ry * rr) / 4) * 4;
        icons.push({ x, y, resType: specialTypes[name] });
      });
    } else {
      let resType = "";
      const yields = territoryYield(r.id);
      const sorted = (["food", "wood", "stone", "gold"] as const)
        .map((key) => [key, Number(yields[key] || 0)] as const)
        .sort((a, b) => b[1] - a[1]);
      resType = sorted[0][0];
      if (resType) {
        const a = hash(seed * 61) * TAU;
        const rr = 0.42 + hash(seed * 67) * 0.28;
        const x = Math.round((r.x + Math.cos(a) * rx * rr) / 4) * 4;
        const y = Math.round((r.y + Math.sin(a) * ry * rr) / 4) * 4;
        icons.push({ x, y, resType });
      }
    }

    icons.sort((a, b) => a.y - b.y);
    territoryResourceIconCache.set(cacheKey, icons);
    return icons;
  }

  function drawTerritoryResources(visibleRegions: any[], visibleIslets: any[]) {
    if (
      hideTerritoryAssets ||
      farSceneryRenderMode ||
      lightweightAssetRenderMode ||
      fastRenderMode ||
      state.zoom < 0.45
    )
      return;
    const drawFor = ([r, idx]: any[]) => {
      const seed = r.seed || idx + 1;
      const scale = r.isIslet || islets.includes(r) ? 0.82 : 0.995;
      const sizeFactor = 0.99 + hash(seed * 31) * 0.2;
      const rx = (r.rx || 230) * sizeFactor * scale;
      const ry = rx * 0.78;
      resourceIconsForRegion(r, seed, rx, ry, r.biome ?? 0).forEach((icon) => {
        drawResourceIcon(icon.resType, icon.x, icon.y);
      });
    };
    visibleRegions.forEach(drawFor);
    visibleIslets.forEach(drawFor);
  }

  function drawRoutes() {
    routes.forEach((route) => {
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(10, 45, 70, 0.5)";
      ctx.beginPath();
      ctx.moveTo(route[0], route[1] + 2);
      for (let i = 2; i < route.length; i += 2)
        ctx.lineTo(route[i], route[i + 1] + 2);
      ctx.stroke();
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#e1f7fc";
      ctx.beginPath();
      ctx.moveTo(route[0], route[1]);
      for (let i = 2; i < route.length; i += 2)
        ctx.lineTo(route[i], route[i + 1]);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    routes.forEach((route) => {
      for (let i = 0; i < route.length; i += 2) {
        if (i % 4 === 0) {
          drawCoin(route[i], route[i + 1], 0.45);
        }
      }
    });
  }

  function drawOakTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_oak", x, y, 84 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_oak", x, y, 84 * sc, 0.95);
    }
  }

  function drawAutumnTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_autumn", x, y, 82 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_autumn", x, y, 82 * sc, 0.95);
    }
  }

  function drawPineTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_pine", x, y, 86 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_pine", x, y, 86 * sc, 0.95);
    }
  }

  function drawGrassPatch(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    if (!drawGameEnvV2Sprite("v2_grass_patch", x, y, 42 * sc, 0.95)) {
      drawMedievalDetailSprite(0, 0, x, y, 42 * sc);
    }
  }

  function drawRockPile(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    const rnd = Math.abs(Math.sin(x * 12.9898 + y * 78.233));
    const sprite = rnd > 0.5 ? "v2_rock_big" : "v2_rock_cluster";
    if (!drawGameEnvV2Sprite(sprite, x, y, 64 * sc, 0.95)) {
      drawMedievalWorldSprite("stone", x, y, 64 * sc, 0.95);
    }
  }

  function drawElephant(x: number, y: number, scale = 1.0) {
    const sc = scale;
    drawMedievalWorldSprite("horse", x, y, 82 * sc, 0.95);
  }

  function drawDeer(x: number, y: number, scale = 1.0) {
    const sc = scale;
    drawMedievalWorldSprite("horse", x, y, 68 * sc, 0.95);
  }

  function drawBoar(x: number, y: number, scale = 1.0) {
    const sc = scale;
    drawMedievalWorldSprite("horse", x, y, 68 * sc, 0.95);
  }

  function drawCactus(x: number, y: number, scale = 1.0) {
    const sc = scale;
    if (!drawGameEnvV2Sprite("v2_dead_tree", x, y, 64 * sc, 0.95)) {
      drawMedievalWorldSprite("desert", x, y, 64 * sc, 0.95);
    }
  }

  function drawCave(x: number, y: number, scale = 1.0) {
    const sc = scale;
    drawMedievalWorldSprite("ruins", x, y, 78 * sc, 0.95);
  }

  function drawBananaTree(x: number, y: number, scale = 1.0) {
    const sc = scale;
    if (!drawGameEnvV2Sprite("v2_oak", x, y, 76 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_oak", x, y, 76 * sc, 0.95);
    }
  }

  // Draw baobab using large oak v2
  function drawBaobabTree(x: number, y: number, scale = 1.0) {
    const sc = scale;
    if (!drawGameEnvV2Sprite("v2_oak", x, y, 86 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_oak", x, y, 86 * sc, 0.95);
    }
  }

  function drawFarmPatch(x: number, y: number, scale = 1.0) {
    const sc = scale;
    drawMedievalWorldSprite("food", x, y, 64 * sc, 0.95);
  }

  function drawWillowTree(x: number, y: number, scale = 1.0) {
    const sc = scale;
    if (!drawGameEnvV2Sprite("v2_oak", x, y, 82 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_oak", x, y, 82 * sc, 0.95);
    }
  }

  function drawRedwoodTree(x: number, y: number, scale = 1.0) {
    const sc = scale;
    if (!drawGameEnvV2Sprite("v2_pine", x, y, 88 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_pine", x, y, 88 * sc, 0.95);
    }
  }

  function drawFernPalm(x: number, y: number, scale = 1.0) {
    const sc = scale;
    if (!drawGameEnvV2Sprite("v2_oak", x, y, 74 * sc, 0.95)) {
      drawMedievalWorldSprite("forest_oak", x, y, 74 * sc, 0.95);
    }
  }

  function drawDenseFerns(x: number, y: number, scale = 1.0) {
    const sc = scale;
    if (!drawGameEnvV2Sprite("v2_fern", x, y, 40 * sc, 0.95)) {
      drawMedievalDetailSprite(0, 0, x, y, 40 * sc);
    }
  }

  function drawVineBush(x: number, y: number, scale = 1.0) {
    const sc = scale;
    if (!drawGameEnvV2Sprite("v2_bush_leafy", x, y, 42 * sc, 0.95)) {
      drawMedievalDetailSprite(0, 0, x, y, 42 * sc);
    }
  }

  function drawFloweringCactus(x: number, y: number, scale = 1.0) {
    const sc = scale;
    if (!drawGameEnvV2Sprite("v2_dead_tree", x, y, 72 * sc, 0.95)) {
      drawMedievalWorldSprite("desert", x, y, 72 * sc, 0.95);
    }
  }

  function drawRunestone(x: number, y: number, scale = 1.0) {
    const sc = scale;
    if (!drawGameEnvV2Sprite("v2_rock_big", x, y, 74 * sc, 0.95)) {
      drawMedievalWorldSprite("ruins", x, y, 74 * sc, 0.95);
    }
  }

  function drawRuins(x: number, y: number, scale = 1.0) {
    const sc = scale;
    if (!drawGameEnvV2Sprite("v2_ruin_wall", x, y, 76 * sc, 0.95)) {
      drawMedievalWorldSprite("ruins", x, y, 76 * sc, 0.95);
    }
  }

  function drawTree(x: number, y: number, scale?: number, biomeId = 0) {
    if (isFastPanning() || state.zoom < 0.45) return;
    const sc = scale || 1;
    const rnd = Math.abs(Math.sin(x * 12.9898 + y * 78.233));
    if (biomeId === 1 || rnd > 0.75) {
      drawPalmTree(x, y, sc);
    } else if (biomeId === 5 || rnd > 0.52) {
      drawAutumnTree(x, y, sc);
    } else if (biomeId === 6 || rnd > 0.32) {
      drawPineTree(x, y, sc);
    } else {
      drawOakTree(x, y, sc);
    }
  }

  function drawMountain(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    drawMedievalWorldSprite("mountain", x, y, 96 * sc, 0.95);
  }

  function drawHill(x, y, scale, _color?: string) {
    drawBush(x, y, (scale || 1) * 0.9);
  }

  function drawIceField(x: number, y: number, scale?: number) {
    drawRockPile(x, y, (scale || 1) * 1.1);
  }

  function drawDune(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    drawMedievalWorldSprite("desert", x, y, 76 * sc, 0.95);
  }

  function drawVolcano(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    drawMedievalWorldSprite("mountain", x, y, 92 * sc, 0.95);
  }

  function drawTerrainPatch(c, px, py, rx, ry, color, seed) {
    const patch = organicPath(c.x + px * c.rx, c.y + py * c.ry, rx, ry, seed);
    ctx.globalAlpha = 0.72;
    fillPath(patch, color);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(20,24,18,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawTerrainDetails() {
    megaContinents.forEach((c, ci) => {
      if (c.climate === "ice") {
        drawTerrainPatch(
          c,
          -0.18,
          -0.22,
          c.rx * 0.58,
          c.ry * 0.34,
          "#f1f3e7",
          c.seed + 90,
        );
        drawTerrainPatch(
          c,
          0.26,
          0.18,
          c.rx * 0.38,
          c.ry * 0.28,
          "#cbd9da",
          c.seed + 91,
        );
      } else if (c.climate === "desert") {
        drawTerrainPatch(
          c,
          -0.18,
          0.04,
          c.rx * 0.62,
          c.ry * 0.48,
          "#d8ad36",
          c.seed + 90,
        );
        drawTerrainPatch(
          c,
          0.36,
          -0.18,
          c.rx * 0.32,
          c.ry * 0.26,
          "#efc75a",
          c.seed + 91,
        );
      } else if (c.climate === "volcanic") {
        drawTerrainPatch(
          c,
          -0.12,
          -0.04,
          c.rx * 0.58,
          c.ry * 0.46,
          "#cf6337",
          c.seed + 90,
        );
        drawTerrainPatch(
          c,
          0.28,
          0.24,
          c.rx * 0.38,
          c.ry * 0.3,
          "#6c2d24",
          c.seed + 91,
        );
      } else if (c.climate === "forest" || c.climate === "isles") {
        drawTerrainPatch(
          c,
          -0.16,
          0.18,
          c.rx * 0.5,
          c.ry * 0.38,
          "#428a3f",
          c.seed + 90,
        );
        drawTerrainPatch(
          c,
          0.26,
          -0.22,
          c.rx * 0.34,
          c.ry * 0.3,
          "#86c252",
          c.seed + 91,
        );
      } else {
        drawTerrainPatch(
          c,
          -0.28,
          -0.18,
          c.rx * 0.42,
          c.ry * 0.32,
          "#d8ad36",
          c.seed + 90,
        );
        drawTerrainPatch(
          c,
          0.3,
          0.2,
          c.rx * 0.4,
          c.ry * 0.3,
          "#66aa42",
          c.seed + 91,
        );
      }

      for (let i = 0; i < 18; i++) {
        const a = hash(c.seed * 19 + i * 11) * TAU;
        const rr = Math.sqrt(hash(c.seed * 23 + i * 17)) * 0.72;
        const x = c.x + Math.cos(a) * c.rx * rr;
        const y = c.y + Math.sin(a) * c.ry * rr;
        const pick = hash(c.seed * 31 + i * 13);
        if (c.climate === "ice") drawIceField(x, y, pick > 0.65 ? 0.82 : 0.58);
        else if (c.climate === "desert")
          drawDune(x, y, pick > 0.65 ? 0.92 : 0.62);
        else if (c.climate === "volcanic" && pick > 0.45)
          drawVolcano(x, y, pick > 0.75 ? 0.86 : 0.62);
        else if (pick > 0.65) drawMountain(x, y, pick > 0.82 ? 0.78 : 0.55);
        else if (pick > 0.34) drawBush(x, y, 0.72);
        else drawTree(x, y, 0.72);
      }
      ctx.globalAlpha = 0.42;
      text(c.name, c.x, c.y - c.ry * 0.78, 44, "#fff3d2", "center");
      ctx.globalAlpha = 1;
    });
  }

  function ownerTint(owner) {
    if (owner === 0) return "rgba(47,112,215,0.58)";
    if (owner === 1) return "rgba(215,70,53,0.55)";
    if (owner === 2) return "rgba(68,161,61,0.55)";
    if (owner === 3) return "rgba(216,155,33,0.58)";
    return "rgba(142,69,188,0.58)";
  }

  const townNearDistanceCache = new Map<number, number>();

  function getTownNearDistance(t: any) {
    let cached = townNearDistanceCache.get(t.id);
    if (cached !== undefined) return cached;
    let near = 9999;
    for (const other of towns) {
      if (other.id === t.id) continue;
      const d = Math.hypot(other.x - t.x, other.y - t.y);
      if (d < near) near = d;
    }
    townNearDistanceCache.set(t.id, near);
    return near;
  }

  function drawTerritoryZones(vp?: any) {
    towns.forEach((t) => {
      if (vp && !isPointInViewport(t.x, t.y, vp, 300)) return;
      const seed = 800 + t.id * 17;
      const near = getTownNearDistance(t);
      const base = Math.max(34, Math.min(82, near * 0.34));
      const rx = base + t.lvl * 3;
      const ry = base * 0.72 + t.lvl * 2;
      const pts = organicPath(t.x, t.y + 8, rx, ry, seed);
      ctx.globalAlpha = 1;
      fillPath(pts, ownerTint(t.owner));
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle =
        t.owner === 0 ? "rgba(145,195,255,0.78)" : "rgba(20,18,14,0.42)";
      ctx.lineWidth = t.owner === 0 ? 3 : 2;
      ctx.stroke();
      ctx.setLineDash([]);
      if (state.selected === t.id) {
        ctx.strokeStyle = "#ffe24a";
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    });
    ctx.lineWidth = 1;
  }

  function continentOfTown(t) {
    if (t.continent) return t.continent;
    let best = null;
    for (const c of megaContinents) {
      const nx = (t.x - c.x) / c.rx;
      const ny = (t.y - c.y) / c.ry;
      const d = nx * nx + ny * ny;
      if (d <= 1.35 && (!best || d < best.d)) best = { name: c.name, d };
    }
    return best ? best.name : islandOfTownLegacy(t);
  }

  function drawDecoration(vp?: any) {
    if (
      hideTerritoryAssets ||
      farSceneryRenderMode ||
      lightweightAssetRenderMode ||
      fastRenderMode ||
      state.zoom < 0.45
    )
      return; // Không vẽ rặng cây/núi phụ khi camera di chuyển/zoom cận
    const items: Array<{
      type: "tree" | "mountain" | "stone";
      x: number;
      y: number;
      scale?: number;
    }> = [];

    const treeClusters = [
      [300, 382, 18, 5],
      [360, 461, 24, 7],
      [489, 411, 22, 8],
      [555, 226, 16, 4],
      [692, 430, 18, 4],
      [470, 705, 30, 8],
      [620, 730, 28, 9],
      [820, 612, 16, 4],
      [345, 610, 22, 7],
      [787, 245, 18, 4],
      [591, 563, 22, 6],
      [410, 526, 18, 5],
      [703, 816, 24, 7],
      [902, 796, 18, 6],
      [318, 746, 18, 5],
      [739, 684, 16, 4],
      [424, 1004, 26, 8],
      [566, 1058, 28, 9],
      [706, 1034, 30, 10],
      [846, 1108, 24, 7],
      [740, 1218, 24, 8],
      [640, 1260, 20, 6],
      [970, 1024, 18, 5],
      [520, 1164, 22, 6],
      [340, 880, 24, 6],
      [260, 1020, 20, 5],
      [1040, 500, 18, 4],
      [750, 140, 20, 5],
    ];
    treeClusters.forEach(([cx, cy, spread, count], ci) => {
      if (vp && !isPointInViewport(cx, cy, vp, spread + 250)) return;
      for (let i = 0; i < count; i++) {
        const a = hash(ci * 71 + i * 9) * TAU;
        const d = hash(ci * 53 + i * 17) * spread;
        const x = cx + Math.cos(a) * d;
        const y = cy + Math.sin(a) * d * 0.7;
        const scale = hash(ci * 23 + i) > 0.68 ? 1.15 : 0.86;
        items.push({ type: "tree", x, y, scale });
      }
    });

    const mountains = [
      [462, 91, 1.22],
      [517, 96, 1],
      [570, 108, 1.18],
      [630, 102, 0.9],
      [410, 131, 0.74],
      [859, 704, 1.25],
      [914, 698, 1],
      [891, 746, 0.9],
      [642, 286, 0.45],
      [578, 430, 0.48],
      [716, 520, 0.45],
      [374, 269, 0.43],
      [836, 552, 0.46],
      [866, 932, 1.2],
      [916, 946, 1.0],
      [970, 970, 0.88],
      [650, 1190, 0.52],
      [710, 1196, 0.48],
      [330, 160, 0.9],
      [770, 145, 0.85],
      [380, 900, 1.1],
      [270, 860, 0.95],
    ];
    mountains.forEach((m) => {
      items.push({ type: "mountain", x: m[0], y: m[1], scale: m[2] });
    });

    const stones = [
      [602, 526],
      [628, 523],
      [651, 523],
      [548, 292],
      [565, 302],
      [759, 466],
      [784, 464],
      [691, 585],
      [876, 770],
      [842, 794],
      [970, 292],
      [326, 517],
      [506, 847],
      [546, 850],
      [580, 1070],
      [608, 1084],
      [808, 1010],
      [834, 1014],
      [720, 1268],
      [300, 910],
      [1060, 710],
    ];
    stones.forEach(([x, y]) => {
      items.push({ type: "stone", x, y });
    });

    // Sort all background decorations by Y coordinate for correct overlap!
    items.sort((a, b) => a.y - b.y);
    items.forEach((item, i) => {
      const { type, x, y, scale } = item;
      if (type === "tree") {
        drawTree(x, y, scale);
      } else if (type === "mountain") {
        drawMountain(x, y, scale);
      } else if (type === "stone") {
        drawMedievalWorldSprite("stone", x, y, 22, 0.95);
      }
    });
  }

  function drawFlagEmblem(
    x: number,
    y: number,
    emblem: string,
    scale = 1,
    targetCtx?: CanvasRenderingContext2D,
  ) {
    const s = scale;
    const drawCtx = targetCtx || ctx;
    const px = (
      pxX: number,
      pxY: number,
      pxW: number,
      pxH: number,
      color: string,
    ) => {
      drawCtx.fillStyle = color;
      drawCtx.fillRect(
        Math.floor(pxX),
        Math.floor(pxY),
        Math.ceil(pxW),
        Math.ceil(pxH),
      );
    };

    drawCtx.fillStyle = "#fff7d6";
    if (emblem === "shield") {
      px(x - 4 * s, y - 6 * s, 8 * s, 9 * s, "#fff7d6");
      px(x - 2 * s, y + 3 * s, 4 * s, 3 * s, "#fff7d6");
    } else if (emblem === "tree") {
      px(x - 2 * s, y - 7 * s, 4 * s, 12 * s, "#fff7d6");
      px(x - 6 * s, y - 6 * s, 12 * s, 5 * s, "#fff7d6");
      px(x - 4 * s, y - 11 * s, 8 * s, 5 * s, "#fff7d6");
    } else if (emblem === "mountain") {
      px(x - 8 * s, y + 1 * s, 16 * s, 5 * s, "#fff7d6");
      px(x - 4 * s, y - 5 * s, 8 * s, 6 * s, "#fff7d6");
    } else if (emblem === "anchor") {
      px(x - 2 * s, y - 9 * s, 4 * s, 15 * s, "#fff7d6");
      px(x - 8 * s, y + 3 * s, 16 * s, 4 * s, "#fff7d6");
      px(x - 6 * s, y + 7 * s, 12 * s, 3 * s, "#fff7d6");
    } else if (emblem === "crown") {
      px(x - 9 * s, y - 2 * s, 18 * s, 7 * s, "#fff7d6");
      px(x - 7 * s, y - 7 * s, 4 * s, 5 * s, "#fff7d6");
      px(x - 2 * s, y - 9 * s, 4 * s, 7 * s, "#fff7d6");
      px(x + 3 * s, y - 7 * s, 4 * s, 5 * s, "#fff7d6");
    } else if (emblem === "star") {
      px(x - 8 * s, y - 6 * s, 16 * s, 5 * s, "#fff7d6");
      px(x - 4 * s, y - 10 * s, 8 * s, 14 * s, "#fff7d6");
      px(x - 6 * s, y + 4 * s, 12 * s, 3 * s, "#fff7d6");
    } else if (emblem === "lion") {
      px(x - 6 * s, y - 8 * s, 12 * s, 10 * s, "#fff7d6");
      px(x - 4 * s, y + 2 * s, 8 * s, 6 * s, "#fff7d6");
    } else if (emblem === "swords" || emblem === "tower") {
      px(x - 7 * s, y - 7 * s, 14 * s, 3 * s, "#fff7d6");
      px(x - 2 * s, y - 10 * s, 4 * s, 18 * s, "#fff7d6");
    } else {
      px(x - 5 * s, y - 5 * s, 10 * s, 10 * s, "#fff7d6");
    }
  }

  const castleSpriteCacheMap = new Map<string, HTMLCanvasElement>();
  const miniCastleSpriteCacheMap = new Map<string, HTMLCanvasElement>();

  function getCachedGrandCastleSprite(
    flagColor: string,
    emblem: string,
  ): HTMLCanvasElement {
    const key = `grand_v17_${emblem}_${flagColor}`;
    let cached = castleSpriteCacheMap.get(key);
    if (cached) return cached;

    const size = 320;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = size;
    offCanvas.height = size;
    const offCtx = offCanvas.getContext("2d");
    if (!offCtx) return offCanvas;

    const cx = size / 2;
    const cy = size / 2 + 45;

    const isoPoly = (
      pts: [number, number][],
      fillStyle: string | CanvasGradient,
    ) => {
      offCtx.fillStyle = fillStyle;
      offCtx.beginPath();
      offCtx.moveTo(cx + pts[0][0], cy + pts[0][1]);
      for (let i = 1; i < pts.length; i++)
        offCtx.lineTo(cx + pts[i][0], cy + pts[i][1]);
      offCtx.closePath();
      offCtx.fill();
    };

    const isoCube = (
      dx: number,
      dy: number,
      w: number,
      h: number,
      depth: number,
      cLeft: string,
      cRight: string,
      cTop: string,
    ) => {
      isoPoly(
        [
          [dx - w / 2, dy],
          [dx, dy + depth / 2],
          [dx, dy + depth / 2 - h],
          [dx - w / 2, dy - h],
        ],
        cLeft,
      );
      isoPoly(
        [
          [dx, dy + depth / 2],
          [dx + w / 2, dy],
          [dx + w / 2, dy - h],
          [dx, dy + depth / 2 - h],
        ],
        cRight,
      );
      isoPoly(
        [
          [dx - w / 2, dy - h],
          [dx, dy + depth / 2 - h],
          [dx + w / 2, dy - h],
          [dx, dy - depth / 2 - h],
        ],
        cTop,
      );
    };

    const isoRoof = (
      dx: number,
      dy: number,
      w: number,
      h: number,
      depth: number,
      cLeft: string,
      cRight: string,
    ) => {
      isoPoly(
        [
          [dx - w / 2, dy],
          [dx, dy + depth / 2],
          [dx, dy - h],
        ],
        cLeft,
      );
      isoPoly(
        [
          [dx, dy + depth / 2],
          [dx + w / 2, dy],
          [dx, dy - h],
        ],
        cRight,
      );
    };

    const isoCylinder = (
      dx: number,
      dy: number,
      rx: number,
      h: number,
      c1: string,
      c2: string,
      cTop: string,
    ) => {
      const grad = offCtx.createLinearGradient(
        cx + dx - rx,
        cy + dy,
        cx + dx + rx,
        cy + dy,
      );
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      offCtx.fillStyle = grad;
      offCtx.beginPath();
      // Start at top-left
      offCtx.moveTo(cx + dx - rx, cy + dy - h);
      // Top-front arc (left to right)
      offCtx.ellipse(cx + dx, cy + dy - h, rx, rx * 0.45, 0, Math.PI, 0, true);
      // Line down to bottom-right
      offCtx.lineTo(cx + dx + rx, cy + dy);
      // Bottom-front arc (right to left)
      offCtx.ellipse(cx + dx, cy + dy, rx, rx * 0.45, 0, 0, Math.PI, false);
      // Line up to top-left
      offCtx.lineTo(cx + dx - rx, cy + dy - h);
      offCtx.closePath();
      offCtx.fill();

      offCtx.fillStyle = cTop;
      offCtx.beginPath();
      offCtx.ellipse(cx + dx, cy + dy - h, rx, rx * 0.45, 0, 0, Math.PI * 2);
      offCtx.fill();
    };

    const rectGrad = (
      dx: number,
      dy: number,
      w: number,
      h: number,
      c1: string,
      c2: string,
      vertical = true,
    ) => {
      const grad = vertical
        ? offCtx.createLinearGradient(cx + dx, cy + dy, cx + dx, cy + dy + h)
        : offCtx.createLinearGradient(cx + dx, cy + dy, cx + dx + w, cy + dy);
      grad.addColorStop(0, c1 || "#2563eb");
      grad.addColorStop(1, c2 || "#1e40af");
      offCtx.fillStyle = grad;
      offCtx.fillRect(
        Math.floor(cx + dx),
        Math.floor(cy + dy),
        Math.ceil(w),
        Math.ceil(h),
      );
    };

    const r = (dx: number, dy: number, w: number, h: number, color: string) => {
      offCtx.fillStyle = color || "#000000";
      offCtx.fillRect(
        Math.floor(cx + dx),
        Math.floor(cy + dy),
        Math.ceil(w),
        Math.ceil(h),
      );
    };

    const roof3D = (points: number[][], c1: string, c2: string) => {
      const grad = offCtx.createLinearGradient(
        cx + points[0][0],
        cy + points[0][1],
        cx + points[2][0],
        cy + points[2][1],
      );
      grad.addColorStop(0, c1 || "#2563eb");
      grad.addColorStop(1, c2 || "#1e40af");
      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.moveTo(cx + points[0][0], cy + points[0][1]);
      for (let i = 1; i < points.length; i++)
        offCtx.lineTo(cx + points[i][0], cy + points[i][1]);
      offCtx.closePath();
      offCtx.fill();
    };

    const shadowGrad = offCtx.createRadialGradient(
      cx + 10,
      cy + 50,
      15,
      cx + 10,
      cy + 50,
      142,
    );
    shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0.94)");
    shadowGrad.addColorStop(0.55, "rgba(0, 0, 0, 0.52)");
    shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    offCtx.fillStyle = shadowGrad;
    offCtx.beginPath();
    offCtx.ellipse(cx + 10, cy + 50, 142, 44, 0, 0, Math.PI * 2);
    offCtx.fill();

    const bannerWave = Math.sin(state.tick * 0.2) * 2.5;
    const bannerCol =
      flagColor && typeof flagColor === "string" && flagColor.length >= 3
        ? flagColor
        : "#2563eb";

    if (emblem === "premium_gold") {
      const ivoryLeft = "#5f5542";
      const ivoryRight = "#a99a78";
      const ivoryTop = "#eee0b7";
      const goldLeft = "#8f530e";
      const goldRight = "#f0bf43";

      isoCube(0, 40, 252, 18, 50, "#42351f", "#78613a", "#c2a75e");
      isoCube(0, 24, 224, 54, 42, ivoryLeft, ivoryRight, ivoryTop);
      isoCylinder(-76, 0, 22, 92, "#564b39", "#b5a47d", "#f0dfb6");
      isoRoof(-76, -92, 54, 38, 24, goldLeft, goldRight);
      isoCylinder(76, 0, 22, 92, "#564b39", "#b5a47d", "#f0dfb6");
      isoRoof(76, -92, 54, 38, 24, goldLeft, goldRight);
      isoCylinder(-101, 24, 27, 96, "#4c4232", "#a99873", "#ead8ad");
      isoRoof(-101, -72, 66, 44, 28, goldLeft, goldRight);
      isoCylinder(101, 24, 27, 96, "#4c4232", "#a99873", "#ead8ad");
      isoRoof(101, -72, 66, 44, 28, goldLeft, goldRight);
      isoCube(0, 10, 122, 122, 36, "#544936", "#aa9870", "#f3e2b8");
      isoCube(0, -92, 88, 38, 28, "#695a3f", "#b9a477", "#f7e8bd");
      isoRoof(0, -130, 112, 48, 34, "#a16212", "#f5cb55");

      const drawPremiumWindow = (wx: number, wy: number) => {
        const aura = offCtx.createRadialGradient(
          cx + wx,
          cy + wy,
          1,
          cx + wx,
          cy + wy,
          20,
        );
        aura.addColorStop(0, "rgba(255, 247, 174, 0.98)");
        aura.addColorStop(0.46, "rgba(245, 178, 42, 0.66)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(cx + wx, cy + wy, 20, 0, Math.PI * 2);
        offCtx.fill();
        r(wx - 4, wy - 9, 8, 18, "#fff0a0");
      };
      drawPremiumWindow(-101, -20);
      drawPremiumWindow(101, -20);
      drawPremiumWindow(-30, -52);
      drawPremiumWindow(30, -52);
      r(-22, 0, 44, 44, "#271c10");
      offCtx.fillStyle = "#271c10";
      offCtx.beginPath();
      offCtx.arc(cx, cy, 22, Math.PI, 0);
      offCtx.fill();
      drawFlagEmblem(cx, cy - 68, "dragon", 0.82, offCtx);
      isoCylinder(0, -178, 3, 15, "#936316", "#f6da70", "#fff9d1");
      offCtx.fillStyle = "#b4232f";
      offCtx.beginPath();
      offCtx.moveTo(cx + 2, cy - 192 + bannerWave);
      offCtx.lineTo(cx + 40, cy - 197 + bannerWave);
      offCtx.lineTo(cx + 34, cy - 180 + bannerWave);
      offCtx.lineTo(cx + 40, cy - 163 + bannerWave);
      offCtx.lineTo(cx + 2, cy - 168 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#ffe47a";
      offCtx.lineWidth = 2;
      offCtx.stroke();
      drawFlagEmblem(cx + 21, cy - 180 + bannerWave, "dragon", 0.72, offCtx);
    } else if (emblem === "premium_fire") {
      const basaltLeft = "#161519";
      const basaltRight = "#494047";
      const basaltTop = "#74656a";

      isoCube(0, 40, 252, 20, 50, "#0c0b0d", "#31272a", "#5c3b38");
      isoCube(0, 24, 224, 58, 42, basaltLeft, basaltRight, basaltTop);
      isoCube(-98, 24, 58, 108, 30, "#100f12", "#44383e", "#725b60");
      isoRoof(-98, -84, 70, 58, 26, "#5b100e", "#e13f1d");
      isoCube(98, 24, 58, 108, 30, "#100f12", "#44383e", "#725b60");
      isoRoof(98, -84, 70, 58, 26, "#5b100e", "#e13f1d");
      isoCube(-55, 0, 42, 106, 24, "#17151a", "#514148", "#806268");
      isoRoof(-55, -106, 52, 48, 20, "#6c120e", "#f05a22");
      isoCube(55, 0, 42, 106, 24, "#17151a", "#514148", "#806268");
      isoRoof(55, -106, 52, 48, 20, "#6c120e", "#f05a22");
      isoCube(0, 12, 114, 126, 34, "#121115", "#4b3b43", "#796068");
      isoCube(0, -94, 78, 34, 26, "#21191d", "#5f4548", "#95695e");
      isoRoof(0, -128, 100, 54, 30, "#74140e", "#ff6425");

      const drawLavaWindow = (wx: number, wy: number, h = 24) => {
        const aura = offCtx.createRadialGradient(
          cx + wx,
          cy + wy,
          1,
          cx + wx,
          cy + wy,
          22,
        );
        aura.addColorStop(0, "rgba(255, 210, 86, 1)");
        aura.addColorStop(0.45, "rgba(255, 76, 25, 0.78)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(cx + wx, cy + wy, 22, 0, Math.PI * 2);
        offCtx.fill();
        r(wx - 4, wy - h / 2, 8, h, "#ff8b2b");
      };
      drawLavaWindow(-98, -25, 28);
      drawLavaWindow(98, -25, 28);
      drawLavaWindow(-28, -48);
      drawLavaWindow(28, -48);
      offCtx.strokeStyle = "#ff5a22";
      offCtx.lineWidth = 3;
      offCtx.beginPath();
      offCtx.moveTo(cx - 74, cy + 18);
      offCtx.lineTo(cx - 55, cy - 2);
      offCtx.lineTo(cx - 64, cy - 24);
      offCtx.moveTo(cx + 72, cy + 20);
      offCtx.lineTo(cx + 54, cy - 4);
      offCtx.lineTo(cx + 63, cy - 27);
      offCtx.stroke();
      r(-22, 0, 44, 44, "#080608");
      drawFlagEmblem(cx, cy - 66, "dragon", 0.8, offCtx);
      isoCylinder(0, -182, 3, 12, "#7b3718", "#ff9a3e", "#fff0a1");
      offCtx.fillStyle = "#6f0c0c";
      offCtx.beginPath();
      offCtx.moveTo(cx + 2, cy - 191 + bannerWave);
      offCtx.lineTo(cx + 40, cy - 196 + bannerWave);
      offCtx.lineTo(cx + 34, cy - 179 + bannerWave);
      offCtx.lineTo(cx + 40, cy - 162 + bannerWave);
      offCtx.lineTo(cx + 2, cy - 167 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#ff6a28";
      offCtx.lineWidth = 2;
      offCtx.stroke();
      drawFlagEmblem(cx + 21, cy - 179 + bannerWave, "dragon", 0.72, offCtx);
    } else if (emblem === "premium_wind") {
      const pearlLeft = "#3c5c63";
      const pearlRight = "#91b9ba";
      const pearlTop = "#e2f1e9";
      const cyanLeft = "#07566b";
      const cyanRight = "#35cfdd";

      isoCube(0, 40, 248, 18, 50, "#27434b", "#527b80", "#8fb6b2");
      isoCube(0, 24, 218, 52, 42, pearlLeft, pearlRight, pearlTop);
      isoCylinder(-94, 22, 25, 100, "#315058", "#9ac4c2", "#e5f3e8");
      isoRoof(-94, -78, 62, 52, 26, cyanLeft, cyanRight);
      isoCylinder(94, 22, 25, 100, "#315058", "#9ac4c2", "#e5f3e8");
      isoRoof(94, -78, 62, 52, 26, cyanLeft, cyanRight);
      isoCylinder(-54, 0, 18, 112, "#385a61", "#a5ccca", "#edf8ef");
      isoRoof(-54, -112, 46, 48, 20, "#08677a", "#45dce4");
      isoCylinder(54, 0, 18, 112, "#385a61", "#a5ccca", "#edf8ef");
      isoRoof(54, -112, 46, 48, 20, "#08677a", "#45dce4");
      isoCube(0, 12, 108, 120, 34, pearlLeft, "#9dc5c3", "#edf7ed");
      isoCube(0, -88, 74, 36, 26, "#4b7378", "#add2ce", "#f3fbf2");
      isoRoof(0, -124, 94, 56, 30, cyanLeft, "#5de8ec");

      const drawWindWindow = (wx: number, wy: number) => {
        const aura = offCtx.createRadialGradient(
          cx + wx,
          cy + wy,
          1,
          cx + wx,
          cy + wy,
          22,
        );
        aura.addColorStop(0, "rgba(216, 255, 255, 1)");
        aura.addColorStop(0.46, "rgba(45, 218, 230, 0.7)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(cx + wx, cy + wy, 22, 0, Math.PI * 2);
        offCtx.fill();
        r(wx - 4, wy - 11, 8, 22, "#baffff");
      };
      drawWindWindow(-94, -22);
      drawWindWindow(94, -22);
      drawWindWindow(-27, -49);
      drawWindWindow(27, -49);
      r(-21, 0, 42, 44, "#17383e");
      drawFlagEmblem(cx, cy - 65, "eagle", 0.78, offCtx);
      isoCylinder(0, -180, 3, 13, "#397f86", "#b8ffff", "#ffffff");
      offCtx.fillStyle = "#147f91";
      offCtx.beginPath();
      offCtx.moveTo(cx + 2, cy - 192 + bannerWave);
      offCtx.lineTo(cx + 40, cy - 197 + bannerWave);
      offCtx.lineTo(cx + 34, cy - 180 + bannerWave);
      offCtx.lineTo(cx + 40, cy - 163 + bannerWave);
      offCtx.lineTo(cx + 2, cy - 168 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#a9fbff";
      offCtx.lineWidth = 2;
      offCtx.stroke();
      drawFlagEmblem(cx + 21, cy - 180 + bannerWave, "eagle", 0.72, offCtx);
    } else if (emblem === "dragon") {
      const wallRedLeft = "#6f1d1b";
      const wallRedRight = "#b53529";
      const wallRedTop = "#e27454";
      const tileDark = "#75400d";
      const tileGold = "#e5a72c";

      isoCube(0, 40, 248, 18, 50, "#253329", "#526348", "#8b8c62");
      isoCube(0, 25, 224, 52, 42, wallRedLeft, wallRedRight, wallRedTop);

      // Four guarded corner pavilions frame the long citadel.
      for (const tx of [-92, 92]) {
        isoCube(tx, 18, 50, 78, 28, "#581714", "#9f2b22", "#df7652");
        isoRoof(tx, -60, 68, 28, 24, tileDark, tileGold);
        isoRoof(tx, -88, 46, 20, 18, "#9a570f", "#f3c04b");
      }

      // Tall central gate palace with layered golden eaves.
      isoCube(0, 8, 116, 102, 34, "#611a17", "#aa3025", "#e98762");
      isoRoof(0, -94, 152, 34, 38, tileDark, tileGold);
      isoCube(0, -92, 72, 38, 24, "#7b211b", "#c13b2b", "#ef9a6f");
      isoRoof(0, -130, 102, 30, 28, "#9a570f", "#f5cf62");

      const drawLantern = (lx: number, ly: number) => {
        const aura = offCtx.createRadialGradient(
          cx + lx,
          cy + ly,
          1,
          cx + lx,
          cy + ly,
          20,
        );
        aura.addColorStop(0, "rgba(239, 68, 68, 0.98)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(cx + lx, cy + ly, 20, 0, Math.PI * 2);
        offCtx.fill();
        offCtx.fillStyle = "#ef4444";
        offCtx.fillRect(cx + lx - 4, cy + ly - 6, 8, 12);
        offCtx.fillStyle = "#fef08a";
        offCtx.fillRect(cx + lx - 2, cy + ly - 4, 4, 8);
      };
      drawLantern(-92, -18);
      drawLantern(92, -18);
      drawLantern(-31, -48);
      drawLantern(31, -48);

      r(-21, 0, 42, 42, "#321410");
      for (let gx = -15; gx <= 15; gx += 10) r(gx, 4, 3, 38, "#d39a3c");
      drawFlagEmblem(cx, cy - 59, "dragon", 0.72, offCtx);
      isoCylinder(0, -160, 3, 32, "#9a570f", "#f5cf62", "#fff7d6");

      offCtx.fillStyle = bannerCol;
      offCtx.beginPath();
      offCtx.moveTo(cx + 2, cy - 188 + bannerWave);
      offCtx.lineTo(cx + 48, cy - 194 + bannerWave);
      offCtx.lineTo(cx + 40, cy - 176 + bannerWave);
      offCtx.lineTo(cx + 48, cy - 158 + bannerWave);
      offCtx.lineTo(cx + 2, cy - 164 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#fbbf24";
      offCtx.lineWidth = 1.6;
      offCtx.stroke();
      drawFlagEmblem(cx + 25, cy - 176 + bannerWave, emblem, 0.85, offCtx);
    } else if (emblem === "eagle") {
      const marbleLeft = "#69747b";
      const marbleRight = "#b8c1c5";
      const marbleTop = "#f2ead7";
      const copperDark = "#35564f";
      const copperLight = "#78a493";

      isoCube(0, 40, 246, 18, 48, "#3d474d", "#78858c", "#c5cbd0");
      isoCube(0, 25, 222, 56, 42, marbleLeft, marbleRight, marbleTop);

      // Imperial wings and copper-roofed corner towers.
      for (const tx of [-91, 91]) {
        isoCylinder(tx, 21, 24, 86, "#59656c", "#cbd2d4", "#f4edda");
        isoRoof(tx, -65, 58, 38, 24, copperDark, copperLight);
      }
      isoCube(0, 10, 126, 104, 34, "#626e75", "#c5ced0", "#fff7e5");
      isoRoof(0, -94, 144, 48, 34, "#83621e", "#dfb94e");
      isoCylinder(0, -142, 20, 30, "#866723", "#e8c763", "#fff0a6");
      isoRoof(0, -172, 48, 12, 18, "#80601d", "#f0d16b");

      // A formal colonnade separates this palace from the military castles.
      for (const px of [-62, -42, 42, 62]) {
        isoCylinder(px, 20, 5, 54, "#7b858a", "#e0e4e2", "#fff9e8");
      }

      const drawImperialWindow = (wx: number, wy: number) => {
        const aura = offCtx.createRadialGradient(
          cx + wx,
          cy + wy,
          1,
          cx + wx,
          cy + wy,
          18,
        );
        aura.addColorStop(0, "rgba(254, 240, 138, 0.96)");
        aura.addColorStop(0.5, "rgba(245, 158, 11, 0.55)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(cx + wx, cy + wy, 18, 0, Math.PI * 2);
        offCtx.fill();
        r(wx - 4, wy - 9, 8, 18, "#facc15");
      };
      drawImperialWindow(-91, -18);
      drawImperialWindow(91, -18);
      drawImperialWindow(-27, -48);
      drawImperialWindow(27, -48);

      r(-19, 1, 38, 42, "#263238");
      drawFlagEmblem(cx, cy - 62, "eagle", 0.75, offCtx);
      isoCylinder(0, -184, 3, 12, "#8b6a24", "#f3d36d", "#fff7d6");

      offCtx.fillStyle = bannerCol;
      offCtx.beginPath();
      offCtx.moveTo(cx + 2, cy - 190 + bannerWave);
      offCtx.lineTo(cx + 48, cy - 196 + bannerWave);
      offCtx.lineTo(cx + 41, cy - 178 + bannerWave);
      offCtx.lineTo(cx + 48, cy - 160 + bannerWave);
      offCtx.lineTo(cx + 2, cy - 166 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#fbbf24";
      offCtx.lineWidth = 1.6;
      offCtx.stroke();
      drawFlagEmblem(cx + 25, cy - 178 + bannerWave, emblem, 0.85, offCtx);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 3. TRIỀU ĐẠI SƯ TỬ HOÀNG GIA (Royal Lion Citadel Keep - Emblem: "lion")
    // ─────────────────────────────────────────────────────────────────────────
    else if (emblem === "lion") {
      const stoneDark = "#504635";
      const stoneMid = "#806f54";
      const stoneLight = "#d8c8a5";
      const roofDark = "#8a3f16";
      const roofGold = "#e3ae38";

      isoCube(0, 40, 246, 18, 48, "#332f28", "#625a4a", "#a69574");
      isoCube(0, 24, 224, 50, 42, stoneDark, stoneMid, stoneLight);

      // Rear watchtowers sit behind the royal keep.
      isoCylinder(-68, -2, 22, 74, "#4b4132", "#a18d6c", "#d9c9a7");
      isoRoof(-68, -76, 54, 34, 24, roofDark, roofGold);
      isoCylinder(68, -2, 22, 74, "#4b4132", "#a18d6c", "#d9c9a7");
      isoRoof(68, -76, 54, 34, 24, roofDark, roofGold);

      // The central palace is tall, but its roof remains inside the sprite frame.
      isoCube(0, 8, 116, 102, 34, stoneDark, "#9b8562", "#ead9b5");
      isoCube(0, -76, 82, 34, 26, "#66583f", "#a89068", "#ead9b5");
      isoRoof(0, -110, 104, 56, 32, roofDark, roofGold);

      // Front drum towers give the lion castle a broad royal silhouette.
      isoCylinder(-91, 24, 25, 88, "#443b2e", "#927e60", "#d8c8a5");
      isoRoof(-91, -64, 60, 38, 26, roofDark, roofGold);
      isoCylinder(91, 24, 25, 88, "#443b2e", "#927e60", "#d8c8a5");
      isoRoof(91, -64, 60, 38, 26, roofDark, roofGold);

      const drawRoyalWindow = (
        ox: number,
        oy: number,
        width = 9,
        height = 18,
      ) => {
        const aura = offCtx.createRadialGradient(
          cx + ox,
          cy + oy,
          1,
          cx + ox,
          cy + oy,
          20,
        );
        aura.addColorStop(0, "rgba(254, 240, 138, 0.96)");
        aura.addColorStop(0.45, "rgba(245, 158, 11, 0.62)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(cx + ox, cy + oy, 20, 0, Math.PI * 2);
        offCtx.fill();
        r(ox - width / 2, oy - height / 2, width, height, "#3b2415");
        r(
          ox - width / 2 + 2,
          oy - height / 2 + 2,
          width - 4,
          height - 4,
          "#facc15",
        );
      };
      drawRoyalWindow(-91, -18);
      drawRoyalWindow(91, -18);
      drawRoyalWindow(-25, -48, 10, 20);
      drawRoyalWindow(25, -48, 10, 20);

      // Arched royal gate and lion crest.
      r(-19, 0, 38, 42, "#261d17");
      offCtx.fillStyle = "#261d17";
      offCtx.beginPath();
      offCtx.arc(cx, cy, 19, Math.PI, 0);
      offCtx.fill();
      r(-15, 5, 4, 37, "#7a5a2b");
      r(-2, 1, 4, 41, "#7a5a2b");
      r(11, 5, 4, 37, "#7a5a2b");
      drawFlagEmblem(cx, cy - 61, "lion", 0.72, offCtx);

      isoCylinder(0, -166, 3, 30, "#7c4a16", "#f5d36c", "#fff7d6");

      offCtx.fillStyle = bannerCol;
      offCtx.beginPath();
      offCtx.moveTo(cx + 2, cy - 192 + bannerWave);
      offCtx.lineTo(cx + 48, cy - 198 + bannerWave);
      offCtx.lineTo(cx + 41, cy - 180 + bannerWave);
      offCtx.lineTo(cx + 48, cy - 162 + bannerWave);
      offCtx.lineTo(cx + 2, cy - 168 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#fbbf24";
      offCtx.lineWidth = 1.6;
      offCtx.stroke();
      drawFlagEmblem(cx + 25, cy - 180 + bannerWave, emblem, 0.85, offCtx);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 4. TRIỀU ĐẠI THÁNH KIẾM GOTHIC (Gothic Blade Fortress - Emblem: "swords")
    // ─────────────────────────────────────────────────────────────────────────
    else if (emblem === "swords") {
      const gothicLeft = "#171b25";
      const gothicRight = "#394151";
      const gothicTop = "#71798a";
      const slateDark = "#251738";
      const slateLight = "#6f3b8d";

      isoCube(0, 40, 242, 18, 46, "#10131a", "#303746", "#697184");
      isoCube(0, 25, 212, 54, 38, gothicLeft, gothicRight, gothicTop);

      // Twin blade towers form the unmistakable Gothic silhouette.
      for (const tx of [-70, 70]) {
        isoCube(tx, 16, 48, 132, 26, "#11151e", "#343b4c", "#70788a");
        isoRoof(tx, -116, 62, 62, 22, slateDark, slateLight);
      }
      isoCube(0, 14, 82, 104, 30, "#181c27", "#41495c", "#858da0");
      isoRoof(0, -90, 102, 52, 28, "#2c183f", "#754197");

      const drawGothicWindow = (wx: number, wy: number, height = 28) => {
        const aura = offCtx.createRadialGradient(
          cx + wx,
          cy + wy,
          1,
          cx + wx,
          cy + wy,
          20,
        );
        aura.addColorStop(0, "rgba(196, 181, 253, 0.92)");
        aura.addColorStop(0.5, "rgba(126, 34, 206, 0.55)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(cx + wx, cy + wy, 20, 0, Math.PI * 2);
        offCtx.fill();
        r(wx - 4, wy - height / 2, 8, height, "#a78bfa");
      };
      drawGothicWindow(-70, -48, 34);
      drawGothicWindow(70, -48, 34);
      drawGothicWindow(0, -43, 30);

      r(-20, 1, 40, 43, "#080a10");
      offCtx.fillStyle = "#080a10";
      offCtx.beginPath();
      offCtx.arc(cx, cy + 1, 20, Math.PI, 0);
      offCtx.fill();
      drawFlagEmblem(cx, cy - 54, "swords", 0.72, offCtx);
      isoCylinder(0, -142, 3, 32, "#5d4771", "#c4b5fd", "#ffffff");

      offCtx.fillStyle = bannerCol;
      offCtx.beginPath();
      offCtx.moveTo(cx + 2, cy - 172 + bannerWave);
      offCtx.lineTo(cx + 47, cy - 178 + bannerWave);
      offCtx.lineTo(cx + 39, cy - 161 + bannerWave);
      offCtx.lineTo(cx + 47, cy - 144 + bannerWave);
      offCtx.lineTo(cx + 2, cy - 150 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#fbbf24";
      offCtx.lineWidth = 1.6;
      offCtx.stroke();
      drawFlagEmblem(cx + 24, cy - 161 + bannerWave, emblem, 0.85, offCtx);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 5. TRIỀU ĐẠI THÁI SƠN (Volcanic Basalt Fortress - Emblem: "mountain")
    // ─────────────────────────────────────────────────────────────────────────
    else if (emblem === "mountain") {
      isoCube(0, 40, 248, 20, 50, "#111113", "#3b3b3f", "#68676b");
      isoCube(0, 24, 218, 54, 42, "#17171a", "#454449", "#77757a");

      // Angular basalt bastions rise in stepped mountain terraces.
      isoCube(-88, 22, 58, 82, 30, "#111114", "#3b3a40", "#6c6970");
      isoCube(88, 22, 58, 82, 30, "#111114", "#3b3a40", "#6c6970");
      isoCube(-88, -46, 40, 28, 22, "#202024", "#515057", "#858188");
      isoCube(88, -46, 40, 28, 22, "#202024", "#515057", "#858188");

      isoCube(0, 12, 112, 112, 34, "#151518", "#47464c", "#79767d");
      isoCube(0, -78, 78, 38, 26, "#242327", "#57555c", "#8e8a91");
      isoRoof(0, -116, 94, 42, 30, "#6b1b12", "#d94a24");

      const drawMagmaTorch = (tx: number, ty: number) => {
        const aura = offCtx.createRadialGradient(
          cx + tx,
          cy + ty,
          1,
          cx + tx,
          cy + ty,
          26,
        );
        aura.addColorStop(0, "rgba(239, 68, 68, 0.98)");
        aura.addColorStop(0.5, "rgba(245, 158, 11, 0.7)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(cx + tx, cy + ty, 26, 0, Math.PI * 2);
        offCtx.fill();
        offCtx.fillStyle = "#ef4444";
        offCtx.fillRect(cx + tx - 4, cy + ty - 6, 8, 12);
        offCtx.fillStyle = "#fef08a";
        offCtx.fillRect(cx + tx - 2, cy + ty - 4, 4, 8);
      };
      drawMagmaTorch(-88, -18);
      drawMagmaTorch(88, -18);
      drawMagmaTorch(-27, -47);
      drawMagmaTorch(27, -47);

      r(-20, 1, 40, 43, "#070708");
      drawFlagEmblem(cx, cy - 58, "mountain", 0.72, offCtx);
      isoCylinder(0, -158, 3, 31, "#803b17", "#f2a63b", "#fff1a6");

      offCtx.fillStyle = bannerCol;
      offCtx.beginPath();
      offCtx.moveTo(cx + 3, cy - 187 + bannerWave);
      offCtx.lineTo(cx + 47, cy - 193 + bannerWave);
      offCtx.lineTo(cx + 40, cy - 176 + bannerWave);
      offCtx.lineTo(cx + 47, cy - 159 + bannerWave);
      offCtx.lineTo(cx + 3, cy - 165 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#fbbf24";
      offCtx.lineWidth = 1.6;
      offCtx.stroke();
      drawFlagEmblem(cx + 25, cy - 176 + bannerWave, emblem, 0.85, offCtx);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 6. TRIỀU ĐẠI THẦN THỤ (Elven Tree Sanctuary - Emblem: "tree")
    // ─────────────────────────────────────────────────────────────────────────
    else if (emblem === "tree") {
      const timberDark = "#3c2c20";
      const timberLight = "#826342";
      const leafDark = "#17452c";
      const leafLight = "#4d8b52";

      isoCube(0, 40, 244, 18, 48, "#26372b", "#506448", "#809071");
      isoCube(0, 25, 216, 50, 40, "#394132", "#68745b", "#a3aa83");

      for (const tx of [-91, 91]) {
        isoCylinder(tx, 22, 25, 86, timberDark, timberLight, "#a98a5d");
        isoRoof(tx, -64, 62, 42, 24, leafDark, leafLight);
      }
      isoCylinder(-55, 2, 18, 92, "#493426", "#906b47", "#b69668");
      isoRoof(-55, -90, 45, 34, 18, leafDark, "#62a45c");
      isoCylinder(55, 2, 18, 92, "#493426", "#906b47", "#b69668");
      isoRoof(55, -90, 45, 34, 18, leafDark, "#62a45c");

      isoCube(0, 10, 102, 104, 32, timberDark, "#8a6847", "#bea075");
      isoRoof(0, -94, 126, 58, 32, "#143b27", "#5d9b57");

      const drawGreenOrb = (ox: number, oy: number) => {
        const aura = offCtx.createRadialGradient(
          cx + ox,
          cy + oy,
          1,
          cx + ox,
          cy + oy,
          24,
        );
        aura.addColorStop(0, "rgba(74, 222, 128, 0.98)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(cx + ox, cy + oy, 24, 0, Math.PI * 2);
        offCtx.fill();
        offCtx.fillStyle = "#4ade80";
        offCtx.fillRect(cx + ox - 4, cy + oy - 4, 8, 8);
      };
      drawGreenOrb(-91, -18);
      drawGreenOrb(91, -18);
      drawGreenOrb(-27, -46);
      drawGreenOrb(27, -46);

      r(-20, 1, 40, 42, "#21180f");
      drawFlagEmblem(cx, cy - 58, "tree", 0.74, offCtx);
      isoCylinder(0, -152, 3, 31, "#795329", "#d6b266", "#fff4bd");

      offCtx.fillStyle = bannerCol;
      offCtx.beginPath();
      offCtx.moveTo(cx + 2, cy - 181 + bannerWave);
      offCtx.lineTo(cx + 46, cy - 187 + bannerWave);
      offCtx.lineTo(cx + 39, cy - 170 + bannerWave);
      offCtx.lineTo(cx + 46, cy - 153 + bannerWave);
      offCtx.lineTo(cx + 2, cy - 159 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#fbbf24";
      offCtx.lineWidth = 1.6;
      offCtx.stroke();
      drawFlagEmblem(cx + 24, cy - 170 + bannerWave, emblem, 0.85, offCtx);
    } else if (emblem === "anchor") {
      isoCube(0, 40, 248, 18, 50, "#193744", "#396877", "#79a7ae");
      isoCube(0, 25, 220, 54, 42, "#3d5960", "#759198", "#bcc6c1");

      // Twin lighthouse towers watch the harbor approaches.
      for (const tx of [-92, 92]) {
        isoCylinder(tx, 22, 25, 92, "#344f57", "#9aacaa", "#d9d7c7");
        isoCylinder(tx, -70, 20, 20, "#6f4d1e", "#d2a43c", "#f9df83");
        isoRoof(tx, -90, 50, 28, 20, "#155e75", "#36a3b5");
      }
      isoCube(0, 12, 112, 104, 34, "#334d55", "#8fa3a2", "#dddccc");
      isoRoof(0, -92, 132, 54, 34, "#0f5a70", "#37a9ba");

      const drawOceanBeacon = (bx: number, by: number) => {
        const aura = offCtx.createRadialGradient(
          cx + bx,
          cy + by,
          1,
          cx + bx,
          cy + by,
          26,
        );
        aura.addColorStop(0, "rgba(56, 189, 248, 0.98)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(cx + bx, cy + by, 26, 0, Math.PI * 2);
        offCtx.fill();
        offCtx.fillStyle = "#38bdf8";
        offCtx.fillRect(cx + bx - 4, cy + by - 6, 8, 12);
        offCtx.fillStyle = "#fef08a";
        offCtx.fillRect(cx + bx - 2, cy + by - 4, 4, 8);
      };
      drawOceanBeacon(-92, -80);
      drawOceanBeacon(92, -80);
      drawOceanBeacon(-28, -45);
      drawOceanBeacon(28, -45);

      r(-21, 1, 42, 43, "#14262c");
      drawFlagEmblem(cx, cy - 58, "anchor", 0.75, offCtx);
      isoCylinder(0, -146, 3, 31, "#785827", "#e0bc62", "#fff3b0");

      offCtx.fillStyle = bannerCol;
      offCtx.beginPath();
      offCtx.moveTo(cx + 3, cy - 175 + bannerWave);
      offCtx.lineTo(cx + 47, cy - 181 + bannerWave);
      offCtx.lineTo(cx + 40, cy - 164 + bannerWave);
      offCtx.lineTo(cx + 47, cy - 147 + bannerWave);
      offCtx.lineTo(cx + 3, cy - 153 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#fbbf24";
      offCtx.lineWidth = 1.6;
      offCtx.stroke();
      drawFlagEmblem(cx + 25, cy - 164 + bannerWave, emblem, 0.85, offCtx);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 8. TRIỀU ĐẠI KHIÊN THÉP (Steel Shield Bastion Citadel - Emblem: "shield")
    // ─────────────────────────────────────────────────────────────────────────
    else if (emblem === "shield") {
      const ironLeft = "#252c32";
      const ironRight = "#53616b";
      const ironTop = "#aebbc3";
      const drawBattlements = (
        centerX: number,
        topY: number,
        width: number,
        count: number,
      ) => {
        const gap = width / Math.max(1, count - 1);
        for (let i = 0; i < count; i++) {
          isoCube(
            centerX - width / 2 + gap * i,
            topY,
            12,
            13,
            8,
            "#30383e",
            "#65737c",
            "#d1d9de",
          );
        }
      };

      isoCube(0, 40, 250, 18, 48, "#171b1e", "#3b454c", "#7c8b94");

      // Rear towers and the curtain wall create a compact defensive courtyard.
      isoCube(-72, 0, 48, 76, 28, ironLeft, ironRight, ironTop);
      isoCube(72, 0, 48, 76, 28, ironLeft, ironRight, ironTop);
      drawBattlements(-72, -76, 34, 3);
      drawBattlements(72, -76, 34, 3);
      isoCube(0, 25, 214, 60, 42, "#2c3338", "#5a6871", "#aebbc3");
      drawBattlements(0, -35, 176, 9);

      // Central gatehouse and two heavy front bastions.
      isoCube(0, 13, 102, 103, 34, "#20272c", "#526069", "#c7d0d5");
      drawBattlements(0, -90, 80, 5);
      isoCube(-94, 27, 52, 94, 30, "#20272c", "#4d5a62", "#bac5cb");
      isoCube(94, 27, 52, 94, 30, "#20272c", "#4d5a62", "#bac5cb");
      drawBattlements(-94, -67, 38, 3);
      drawBattlements(94, -67, 38, 3);

      // Recessed gate, portcullis and steel dynasty crest.
      r(-22, -2, 44, 48, "#0b1014");
      offCtx.fillStyle = "#0b1014";
      offCtx.beginPath();
      offCtx.arc(cx, cy - 2, 22, Math.PI, 0);
      offCtx.fill();
      for (let gx = -17; gx <= 17; gx += 8) r(gx, -7, 3, 53, "#89979f");
      for (let gy = 8; gy <= 40; gy += 11) r(-20, gy, 40, 3, "#89979f");
      drawFlagEmblem(cx, cy - 54, "shield", 0.82, offCtx);

      const drawArrowSlit = (sx: number, sy: number) => {
        r(sx - 2, sy - 7, 4, 15, "#0a0e11");
        r(sx - 6, sy - 1, 12, 3, "#0a0e11");
      };
      drawArrowSlit(-94, -22);
      drawArrowSlit(94, -22);
      drawArrowSlit(-30, -50);
      drawArrowSlit(30, -50);

      isoCylinder(0, -103, 3, 43, "#64727b", "#d8e0e4", "#ffffff");

      offCtx.fillStyle = bannerCol;
      offCtx.beginPath();
      offCtx.moveTo(cx + 3, cy - 143 + bannerWave);
      offCtx.lineTo(cx + 48, cy - 149 + bannerWave);
      offCtx.lineTo(cx + 40, cy - 132 + bannerWave);
      offCtx.lineTo(cx + 48, cy - 115 + bannerWave);
      offCtx.lineTo(cx + 3, cy - 121 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#fbbf24";
      offCtx.lineWidth = 1.6;
      offCtx.stroke();
      drawFlagEmblem(cx + 25, cy - 132 + bannerWave, emblem, 0.85, offCtx);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 9. TRIỀU ĐẠI TINH TÚ (Astral Starlight Observatory - Emblem: "star")
    // ─────────────────────────────────────────────────────────────────────────
    else if (emblem === "star") {
      isoCube(0, 40, 246, 18, 48, "#252545", "#4c4e7b", "#8488b7");
      isoCube(0, 24, 218, 52, 42, "#30305a", "#62659a", "#aeb1dd");

      for (const tx of [-88, 88]) {
        isoCylinder(tx, 21, 24, 88, "#29294d", "#7376a8", "#c1c4e8");
        isoRoof(tx, -67, 58, 34, 24, "#35307f", "#7774db");
      }
      isoCylinder(0, 10, 55, 98, "#292951", "#7477ad", "#c5c8ec");
      isoCylinder(0, -88, 44, 28, "#4b4690", "#9698db", "#d7d9ff");
      isoRoof(0, -116, 98, 42, 30, "#383285", "#817ce8");

      const drawStarOrb = (sx: number, sy: number) => {
        const aura = offCtx.createRadialGradient(
          cx + sx,
          cy + sy,
          1,
          cx + sx,
          cy + sy,
          22,
        );
        aura.addColorStop(0, "rgba(129, 140, 248, 0.98)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(cx + sx, cy + sy, 22, 0, Math.PI * 2);
        offCtx.fill();
        offCtx.fillStyle = "#c7d2fe";
        offCtx.fillRect(cx + sx - 4, cy + sy - 4, 8, 8);
      };
      drawStarOrb(-88, -18);
      drawStarOrb(88, -18);
      drawStarOrb(-24, -50);
      drawStarOrb(24, -50);

      r(-20, 1, 40, 42, "#171731");
      drawFlagEmblem(cx, cy - 60, "star", 0.75, offCtx);
      isoCylinder(0, -158, 3, 31, "#8a6825", "#f0cf69", "#fff7d6");

      offCtx.fillStyle = bannerCol;
      offCtx.beginPath();
      offCtx.moveTo(cx + 2, cy - 187 + bannerWave);
      offCtx.lineTo(cx + 47, cy - 193 + bannerWave);
      offCtx.lineTo(cx + 40, cy - 176 + bannerWave);
      offCtx.lineTo(cx + 47, cy - 159 + bannerWave);
      offCtx.lineTo(cx + 2, cy - 165 + bannerWave);
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#fbbf24";
      offCtx.lineWidth = 1.6;
      offCtx.stroke();
      drawFlagEmblem(cx + 24, cy - 176 + bannerWave, emblem, 0.85, offCtx);
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 10. TRIỀU ĐẠI VƯƠNG MIỆN (High Medieval Kingdom Castle - Emblem: "crown")
    // ─────────────────────────────────────────────────────────────────────────
    else {
      const crownStoneLeft = "#4b5560";
      const crownStoneRight = "#8d99a1";
      const crownStoneTop = "#d7d2c4";
      const crownRoofLeft = getDarkerColor(bannerCol, 0.48);
      const crownRoofRight = bannerCol;

      isoCube(0, 40, 248, 18, 48, "#293038", "#58636b", "#91999b");
      isoCube(
        0,
        25,
        220,
        58,
        42,
        crownStoneLeft,
        crownStoneRight,
        crownStoneTop,
      );

      // Four round towers and a square royal keep make the classic silhouette.
      for (const tx of [-94, 94]) {
        isoCylinder(tx, 23, 24, 88, "#3f4852", "#909ba2", "#d9d4c5");
        isoRoof(tx, -65, 58, 40, 24, crownRoofLeft, crownRoofRight);
      }
      for (const tx of [-55, 55]) {
        isoCylinder(tx, 2, 18, 98, "#46515b", "#99a4a9", "#ddd8c9");
        isoRoof(tx, -96, 44, 34, 18, crownRoofLeft, crownRoofRight);
      }
      isoCube(0, 11, 106, 110, 34, "#46515b", "#98a4aa", "#e5dfcf");
      isoCube(0, -82, 76, 30, 26, "#56616a", "#a8b1b4", "#eee6d4");
      isoRoof(0, -112, 94, 54, 30, crownRoofLeft, crownRoofRight);
      isoCylinder(0, -166, 3, 32, "#7c4a16", "#f4cf67", "#fff7d6");

      offCtx.fillStyle = bannerCol;
      offCtx.beginPath();
      offCtx.moveTo(cx + 2, cy - 194 + bannerWave);
      offCtx.bezierCurveTo(
        cx + 20,
        cy - 200 + bannerWave,
        cx + 35,
        cy - 188 + bannerWave,
        cx + 48,
        cy - 194 + bannerWave,
      );
      offCtx.lineTo(cx + 48, cy - 168 + bannerWave);
      offCtx.bezierCurveTo(
        cx + 35,
        cy - 162 + bannerWave,
        cx + 20,
        cy - 174 + bannerWave,
        cx + 2,
        cy - 168 + bannerWave,
      );
      offCtx.closePath();
      offCtx.fill();
      offCtx.strokeStyle = "#fbbf24";
      offCtx.lineWidth = 1.6;
      offCtx.stroke();
      drawFlagEmblem(cx + 25, cy - 181 + bannerWave, emblem, 0.85, offCtx);

      const drawGlowingWindow = (
        wx: number,
        wy: number,
        ww: number,
        wh: number,
      ) => {
        r(wx, wy, ww, wh, "#0f172a");
        const aura = offCtx.createRadialGradient(
          cx + wx + ww / 2,
          cy + wy + wh / 2,
          1,
          cx + wx + ww / 2,
          cy + wy + wh / 2,
          ww * 2.5,
        );
        aura.addColorStop(0, "rgba(254, 240, 138, 0.98)");
        aura.addColorStop(0.45, "rgba(245, 158, 11, 0.7)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        offCtx.fillStyle = aura;
        offCtx.beginPath();
        offCtx.arc(
          cx + wx + ww / 2,
          cy + wy + wh / 2,
          ww * 2.5,
          0,
          Math.PI * 2,
        );
        offCtx.fill();
        rectGrad(wx + 1, wy + 2, ww - 2, wh - 4, "#fef08a", "#f59e0b");
      };

      drawGlowingWindow(-98, -18, 10, 20);
      drawGlowingWindow(88, -18, 10, 20);
      drawGlowingWindow(-30, -47, 10, 22);
      drawGlowingWindow(20, -47, 10, 22);

      r(-21, 0, 42, 44, "#171b20");
      offCtx.fillStyle = "#171b20";
      offCtx.beginPath();
      offCtx.arc(cx, cy, 21, Math.PI, 0);
      offCtx.fill();
      for (let gx = -16; gx <= 16; gx += 8) r(gx, 2, 3, 42, "#8b969c");
      drawFlagEmblem(cx, cy - 61, "crown", 0.75, offCtx);
    }

    castleSpriteCacheMap.set(key, offCanvas);
    return offCanvas;
  }

  const premiumCastleSpriteCacheMap = new Map<string, HTMLCanvasElement>();

  function getCachedPremiumCastleSprite(skinId: string): HTMLCanvasElement {
    const key = `premium_canvas_v2_${skinId}`;
    const cached = premiumCastleSpriteCacheMap.get(key);
    if (cached) return cached;

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 640;
    const c = canvas.getContext("2d");
    if (!c) return canvas;
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";

    const cx = 320;
    const cy = 470;
    const variant =
      skinId === "skin_hoa_long_dien"
        ? "fire"
        : skinId === "skin_phong_long_cac"
          ? "wind"
          : "gold";
    const palette =
      variant === "fire"
        ? {
            stoneLeft: "#17171b",
            stoneRight: "#4b4147",
            stoneTop: "#75666b",
            stoneHi: "#9a7c74",
            roofLeft: "#4d0e0b",
            roofRight: "#d83a19",
            roofHi: "#ff7a2d",
            accent: "#ff5a1f",
            window: "#ffb13b",
            banner: "#71100e",
            metal: "#ba6b2c",
            outline: "#080709",
          }
        : variant === "wind"
          ? {
              stoneLeft: "#425d63",
              stoneRight: "#a7c5c2",
              stoneTop: "#e8f0e7",
              stoneHi: "#ffffff",
              roofLeft: "#07576b",
              roofRight: "#24b9ca",
              roofHi: "#9cf8fc",
              accent: "#5ce9ef",
              window: "#c9ffff",
              banner: "#116f80",
              metal: "#bcecf0",
              outline: "#173b43",
            }
          : {
              stoneLeft: "#5b503d",
              stoneRight: "#ae9b73",
              stoneTop: "#eee0b6",
              stoneHi: "#fff3cd",
              roofLeft: "#7c3411",
              roofRight: "#c96b1b",
              roofHi: "#ffd86b",
              accent: "#f4c447",
              window: "#fff0a0",
              banner: "#a51f2d",
              metal: "#e8b94e",
              outline: "#302619",
            };

    const gradient = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      colors: string[],
    ) => {
      const g = c.createLinearGradient(x1, y1, x2, y2);
      colors.forEach((color, index) =>
        g.addColorStop(index / Math.max(1, colors.length - 1), color),
      );
      return g;
    };

    const polygon = (
      pts: [number, number][],
      fill: string | CanvasGradient,
      stroke = palette.outline,
      lineWidth = 2,
    ) => {
      c.beginPath();
      c.moveTo(cx + pts[0][0], cy + pts[0][1]);
      for (let i = 1; i < pts.length; i++)
        c.lineTo(cx + pts[i][0], cy + pts[i][1]);
      c.closePath();
      c.fillStyle = fill;
      c.fill();
      c.strokeStyle = stroke;
      c.lineWidth = lineWidth;
      c.stroke();
    };

    const isoBlock = (
      dx: number,
      dy: number,
      w: number,
      h: number,
      depth: number,
      colors?: Partial<typeof palette>,
    ) => {
      const left = colors?.stoneLeft || palette.stoneLeft;
      const right = colors?.stoneRight || palette.stoneRight;
      const top = colors?.stoneTop || palette.stoneTop;
      polygon(
        [
          [dx - w / 2, dy],
          [dx, dy + depth / 2],
          [dx, dy + depth / 2 - h],
          [dx - w / 2, dy - h],
        ],
        gradient(cx + dx - w / 2, cy + dy, cx + dx, cy + dy, [
          left,
          palette.outline,
        ]),
      );
      polygon(
        [
          [dx, dy + depth / 2],
          [dx + w / 2, dy],
          [dx + w / 2, dy - h],
          [dx, dy + depth / 2 - h],
        ],
        gradient(cx + dx, cy + dy, cx + dx + w / 2, cy + dy, [right, left]),
      );
      polygon(
        [
          [dx - w / 2, dy - h],
          [dx, dy + depth / 2 - h],
          [dx + w / 2, dy - h],
          [dx, dy - depth / 2 - h],
        ],
        gradient(
          cx + dx,
          cy + dy - h - depth / 2,
          cx + dx,
          cy + dy - h + depth / 2,
          [palette.stoneHi, top],
        ),
        palette.outline,
        2.4,
      );
    };

    const roof = (
      dx: number,
      dy: number,
      w: number,
      h: number,
      depth: number,
      crystal = false,
    ) => {
      const left = crystal ? "#08758c" : palette.roofLeft;
      const right = crystal ? palette.accent : palette.roofRight;
      const apex: [number, number] = [dx, dy - h];
      polygon(
        [[dx - w / 2, dy], [dx, dy + depth / 2], apex],
        gradient(cx + dx - w / 2, cy + dy, cx + dx, cy + dy - h, [
          left,
          palette.outline,
        ]),
        palette.metal,
        2.5,
      );
      polygon(
        [[dx, dy + depth / 2], [dx + w / 2, dy], apex],
        gradient(cx + dx, cy + dy - h, cx + dx + w / 2, cy + dy, [
          palette.roofHi,
          right,
          left,
        ]),
        palette.metal,
        2.5,
      );
      c.strokeStyle = palette.roofHi;
      c.globalAlpha = 0.62;
      c.lineWidth = 1.3;
      for (const amount of [-0.28, 0.28]) {
        c.beginPath();
        c.moveTo(cx + dx, cy + dy - h);
        c.lineTo(cx + dx + w * amount, cy + dy + Math.abs(amount) * depth);
        c.stroke();
      }
      c.globalAlpha = 1;
    };

    const roundTower = (
      dx: number,
      dy: number,
      radius: number,
      h: number,
      roofHeight: number,
      crystal = false,
    ) => {
      const body = gradient(
        cx + dx - radius,
        cy + dy,
        cx + dx + radius,
        cy + dy,
        [
          palette.outline,
          palette.stoneLeft,
          palette.stoneRight,
          palette.stoneHi,
          palette.stoneLeft,
        ],
      );
      c.beginPath();
      c.moveTo(cx + dx - radius, cy + dy - h);
      c.ellipse(
        cx + dx,
        cy + dy - h,
        radius,
        radius * 0.38,
        0,
        Math.PI,
        0,
        true,
      );
      c.lineTo(cx + dx + radius, cy + dy);
      c.ellipse(cx + dx, cy + dy, radius, radius * 0.38, 0, 0, Math.PI, false);
      c.closePath();
      c.fillStyle = body;
      c.fill();
      c.strokeStyle = palette.outline;
      c.lineWidth = 2.5;
      c.stroke();

      for (const offset of [0.25, 0.58]) {
        const y = cy + dy - h * offset;
        c.strokeStyle = palette.metal;
        c.lineWidth = 3;
        c.globalAlpha = 0.55;
        c.beginPath();
        c.ellipse(cx + dx, y, radius, radius * 0.3, 0, 0, Math.PI);
        c.stroke();
      }
      c.globalAlpha = 1;
      roof(dx, dy - h, radius * 2.45, roofHeight, radius * 0.8, crystal);
    };

    const squareTower = (
      dx: number,
      dy: number,
      width: number,
      h: number,
      roofHeight: number,
    ) => {
      isoBlock(dx, dy, width, h, width * 0.58);
      isoBlock(dx, dy - h + 18, width + 14, 18, width * 0.68, {
        stoneLeft: palette.outline,
        stoneRight: palette.stoneRight,
        stoneTop: palette.metal,
      });
      roof(
        dx,
        dy - h,
        width + 22,
        roofHeight,
        width * 0.62,
        variant === "wind",
      );
    };

    const archedWindow = (x: number, y: number, width = 14, height = 34) => {
      const glow = c.createRadialGradient(
        cx + x,
        cy + y,
        1,
        cx + x,
        cy + y,
        width * 2.5,
      );
      glow.addColorStop(0, palette.window);
      glow.addColorStop(0.36, `${palette.accent}bb`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = glow;
      c.beginPath();
      c.arc(cx + x, cy + y, width * 2.5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = palette.outline;
      c.beginPath();
      c.roundRect(
        cx + x - width / 2,
        cy + y - height / 2,
        width,
        height,
        width / 2,
      );
      c.fill();
      c.fillStyle = palette.window;
      c.beginPath();
      c.roundRect(
        cx + x - width / 2 + 3,
        cy + y - height / 2 + 3,
        width - 6,
        height - 6,
        Math.max(2, width / 3),
      );
      c.fill();
      c.strokeStyle = palette.metal;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(cx + x, cy + y - height / 2 + 3);
      c.lineTo(cx + x, cy + y + height / 2 - 3);
      c.stroke();
    };

    const stoneCourses = (
      x: number,
      top: number,
      width: number,
      height: number,
      rows: number,
    ) => {
      c.save();
      c.strokeStyle =
        variant === "fire" ? "rgba(255,111,54,.17)" : "rgba(255,255,255,.17)";
      c.lineWidth = 1;
      for (let row = 1; row < rows; row++) {
        const y = top + (height / rows) * row;
        c.beginPath();
        c.moveTo(cx + x - width / 2, cy + y);
        c.lineTo(cx + x + width / 2, cy + y);
        c.stroke();
        const offset = row % 2 ? width / 6 : 0;
        for (let sx = -width / 2 + offset; sx < width / 2; sx += width / 3) {
          c.beginPath();
          c.moveTo(cx + x + sx, cy + y - height / rows);
          c.lineTo(cx + x + sx, cy + y);
          c.stroke();
        }
      }
      c.restore();
    };

    const banner = (x: number, top: number, length: number, flip = false) => {
      c.strokeStyle = palette.metal;
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(cx + x, cy + top);
      c.lineTo(cx + x, cy + top + length + 10);
      c.stroke();
      const dir = flip ? -1 : 1;
      c.fillStyle = palette.banner;
      c.strokeStyle = palette.metal;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(cx + x, cy + top + 5);
      c.bezierCurveTo(
        cx + x + dir * 26,
        cy + top,
        cx + x + dir * 40,
        cy + top + 16,
        cx + x + dir * 58,
        cy + top + 8,
      );
      c.lineTo(cx + x + dir * 50, cy + top + 40);
      c.bezierCurveTo(
        cx + x + dir * 30,
        cy + top + 48,
        cx + x + dir * 20,
        cy + top + 30,
        cx + x,
        cy + top + 38,
      );
      c.closePath();
      c.fill();
      c.stroke();
    };

    const drawGate = () => {
      c.fillStyle = palette.outline;
      c.beginPath();
      c.moveTo(cx - 42, cy + 18);
      c.lineTo(cx - 42, cy - 26);
      c.quadraticCurveTo(cx, cy - 82, cx + 42, cy - 26);
      c.lineTo(cx + 42, cy + 18);
      c.closePath();
      c.fill();
      c.strokeStyle = palette.metal;
      c.lineWidth = 4;
      c.stroke();
      for (let x = -30; x <= 30; x += 12) {
        c.strokeStyle = variant === "fire" ? "#b9652e" : palette.metal;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(cx + x, cy - 36 + Math.abs(x) * 0.45);
        c.lineTo(cx + x, cy + 18);
        c.stroke();
      }
    };

    c.clearRect(0, 0, 640, 640);
    const shadow = c.createRadialGradient(cx, cy + 62, 20, cx, cy + 62, 270);
    shadow.addColorStop(0, "rgba(0,0,0,.88)");
    shadow.addColorStop(0.55, "rgba(0,0,0,.48)");
    shadow.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = shadow;
    c.beginPath();
    c.ellipse(cx, cy + 62, 275, 74, 0, 0, Math.PI * 2);
    c.fill();

    isoBlock(0, 42, 540, 34, 130, {
      stoneLeft: palette.outline,
      stoneRight: palette.stoneLeft,
      stoneTop: palette.stoneRight,
    });
    isoBlock(0, 14, 500, 118, 112);
    stoneCourses(0, -104, 470, 112, 6);

    if (variant === "fire") {
      squareTower(-205, 25, 82, 202, 82);
      squareTower(205, 25, 82, 202, 82);
      squareTower(-122, -8, 66, 224, 74);
      squareTower(122, -8, 66, 224, 74);
    } else {
      roundTower(
        -205,
        24,
        43,
        194,
        variant === "wind" ? 92 : 76,
        variant === "wind",
      );
      roundTower(
        205,
        24,
        43,
        194,
        variant === "wind" ? 92 : 76,
        variant === "wind",
      );
      roundTower(
        -116,
        -10,
        34,
        220,
        variant === "wind" ? 84 : 66,
        variant === "wind",
      );
      roundTower(
        116,
        -10,
        34,
        220,
        variant === "wind" ? 84 : 66,
        variant === "wind",
      );
    }

    isoBlock(
      0,
      6,
      variant === "fire" ? 226 : 238,
      variant === "fire" ? 270 : 252,
      78,
    );
    stoneCourses(
      0,
      variant === "fire" ? -264 : -246,
      210,
      variant === "fire" ? 260 : 242,
      9,
    );
    isoBlock(0, variant === "fire" ? -226 : -208, 168, 54, 58, {
      stoneLeft: palette.stoneLeft,
      stoneRight: palette.stoneRight,
      stoneTop: palette.stoneHi,
    });

    if (variant === "gold") {
      roof(0, -262, 214, 108, 72);
      roundTower(0, -238, 42, 88, 62);
    } else if (variant === "fire") {
      roof(0, -280, 214, 128, 72);
      for (const hornX of [-80, -40, 40, 80]) {
        polygon(
          [
            [hornX - 12, -270],
            [hornX, -345 - Math.abs(hornX) * 0.18],
            [hornX + 12, -270],
          ],
          gradient(cx + hornX, cy - 350, cx + hornX, cy - 270, [
            palette.roofHi,
            palette.roofLeft,
          ]),
          palette.outline,
          2,
        );
      }
    } else {
      roof(0, -262, 212, 122, 70, true);
      polygon(
        [
          [-24, -374],
          [0, -438],
          [24, -374],
          [0, -346],
        ],
        gradient(cx, cy - 438, cx, cy - 346, [
          "#e6ffff",
          palette.accent,
          "#08758c",
        ]),
        palette.metal,
        3,
      );
    }

    archedWindow(-205, -60, 16, 38);
    archedWindow(205, -60, 16, 38);
    archedWindow(-116, -104, 14, 36);
    archedWindow(116, -104, 14, 36);
    archedWindow(-54, -118, 17, 44);
    archedWindow(54, -118, 17, 44);
    archedWindow(0, -180, 19, 50);
    drawGate();

    if (variant === "gold") {
      c.strokeStyle = palette.metal;
      c.lineWidth = 8;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(cx - 54, cy - 2);
      c.bezierCurveTo(cx - 102, cy - 38, cx - 116, cy - 82, cx - 76, cy - 108);
      c.moveTo(cx + 54, cy - 2);
      c.bezierCurveTo(cx + 102, cy - 38, cx + 116, cy - 82, cx + 76, cy - 108);
      c.stroke();
    } else if (variant === "fire") {
      c.strokeStyle = palette.accent;
      c.shadowColor = palette.accent;
      c.shadowBlur = 12;
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(cx - 170, cy + 12);
      c.lineTo(cx - 135, cy - 35);
      c.lineTo(cx - 150, cy - 72);
      c.moveTo(cx + 170, cy + 12);
      c.lineTo(cx + 135, cy - 35);
      c.lineTo(cx + 150, cy - 72);
      c.stroke();
      c.shadowBlur = 0;
    } else {
      c.strokeStyle = palette.accent;
      c.lineWidth = 4;
      c.globalAlpha = 0.75;
      c.beginPath();
      c.ellipse(cx, cy - 30, 240, 58, 0, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 1;
    }

    banner(-205, -238, 86);
    banner(205, -238, 86, true);
    banner(0, variant === "wind" ? -430 : variant === "fire" ? -405 : -360, 74);

    premiumCastleSpriteCacheMap.set(key, canvas);
    return canvas;
  }

  function getCachedMiniCastleSprite(
    flagColor: string,
    emblem: string,
  ): HTMLCanvasElement {
    const key = `mini_v15_${emblem}_${flagColor}`;
    let cached = miniCastleSpriteCacheMap.get(key);
    if (cached) return cached;

    const size = 128;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = size;
    offCanvas.height = size;
    const offCtx = offCanvas.getContext("2d");
    if (!offCtx) return offCanvas;

    const cx = size / 2;
    const cy = size / 2 + 16;

    // Helper 3D Isometric Polygon Functions for Mini Canvas
    const isoPoly = (
      pts: [number, number][],
      fillStyle: string | CanvasGradient,
    ) => {
      offCtx.fillStyle = fillStyle;
      offCtx.beginPath();
      offCtx.moveTo(cx + pts[0][0], cy + pts[0][1]);
      for (let i = 1; i < pts.length; i++)
        offCtx.lineTo(cx + pts[i][0], cy + pts[i][1]);
      offCtx.closePath();
      offCtx.fill();
    };

    const isoCube = (
      dx: number,
      dy: number,
      w: number,
      h: number,
      depth: number,
      cLeft: string,
      cRight: string,
      cTop: string,
    ) => {
      isoPoly(
        [
          [dx - w / 2, dy],
          [dx, dy + depth / 2],
          [dx, dy + depth / 2 - h],
          [dx - w / 2, dy - h],
        ],
        cLeft,
      );
      isoPoly(
        [
          [dx, dy + depth / 2],
          [dx + w / 2, dy],
          [dx + w / 2, dy - h],
          [dx, dy + depth / 2 - h],
        ],
        cRight,
      );
      isoPoly(
        [
          [dx - w / 2, dy - h],
          [dx, dy + depth / 2 - h],
          [dx + w / 2, dy - h],
          [dx, dy - depth / 2 - h],
        ],
        cTop,
      );
    };

    const isoRoof = (
      dx: number,
      dy: number,
      w: number,
      h: number,
      depth: number,
      cLeft: string,
      cRight: string,
    ) => {
      isoPoly(
        [
          [dx - w / 2, dy],
          [dx, dy + depth / 2],
          [dx, dy - h],
        ],
        cLeft,
      );
      isoPoly(
        [
          [dx, dy + depth / 2],
          [dx + w / 2, dy],
          [dx, dy - h],
        ],
        cRight,
      );
    };

    const isoCylinder = (
      dx: number,
      dy: number,
      rx: number,
      h: number,
      c1: string,
      c2: string,
      cTop: string,
    ) => {
      const grad = offCtx.createLinearGradient(
        cx + dx - rx,
        cy + dy,
        cx + dx + rx,
        cy + dy,
      );
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.moveTo(cx + dx - rx, cy + dy - h);
      offCtx.ellipse(cx + dx, cy + dy - h, rx, rx * 0.45, 0, Math.PI, 0, true);
      offCtx.lineTo(cx + dx + rx, cy + dy);
      offCtx.ellipse(cx + dx, cy + dy, rx, rx * 0.45, 0, 0, Math.PI, false);
      offCtx.lineTo(cx + dx - rx, cy + dy - h);
      offCtx.closePath();
      offCtx.fill();

      offCtx.fillStyle = cTop;
      offCtx.beginPath();
      offCtx.ellipse(cx + dx, cy + dy - h, rx, rx * 0.45, 0, 0, Math.PI * 2);
      offCtx.fill();
    };

    // 1. Drop Shadow
    offCtx.fillStyle = "rgba(0, 0, 0, 0.65)";
    offCtx.beginPath();
    offCtx.ellipse(cx, cy + 14, 48, 15, 0, 0, Math.PI * 2);
    offCtx.fill();

    const bannerWave = Math.sin(state.tick * 0.25) * 1.5;
    const bannerCol =
      flagColor && typeof flagColor === "string" && flagColor.length >= 3
        ? flagColor
        : "#2563eb";

    // 2. Render 10 Dynastic 3D Mini Castles
    if (emblem === "dragon") {
      isoCube(0, 16, 98, 8, 22, "#253329", "#526348", "#8b8c62");
      isoCube(0, 9, 82, 26, 18, "#6f1d1b", "#b53529", "#e27454");
      for (const tx of [-34, 34]) {
        isoCube(tx, 8, 22, 38, 12, "#581714", "#9f2b22", "#df7652");
        isoRoof(tx, -30, 30, 13, 10, "#75400d", "#e5a72c");
      }
      isoCube(0, 7, 42, 48, 14, "#611a17", "#aa3025", "#e98762");
      isoRoof(0, -41, 55, 18, 16, "#75400d", "#f3c04b");
      isoCylinder(0, -59, 2, 12, "#9a570f", "#f5cf62", "#fff7d6");
    } else if (emblem === "eagle") {
      isoCube(0, 16, 98, 8, 22, "#3d474d", "#78858c", "#c5cbd0");
      isoCube(0, 9, 84, 28, 18, "#69747b", "#b8c1c5", "#f2ead7");
      for (const tx of [-34, 34]) {
        isoCylinder(tx, 8, 9, 38, "#59656c", "#cbd2d4", "#f4edda");
        isoRoof(tx, -30, 23, 15, 10, "#35564f", "#78a493");
      }
      isoCube(0, 7, 44, 46, 14, "#626e75", "#c5ced0", "#fff7e5");
      isoRoof(0, -39, 53, 19, 16, "#83621e", "#dfb94e");
      isoCylinder(0, -58, 2, 12, "#8b6a24", "#f3d36d", "#fff7d6");
    } else if (emblem === "lion") {
      isoCube(0, 16, 96, 8, 22, "#332f28", "#625a4a", "#a69574");
      isoCylinder(-31, 8, 9, 38, "#4b4132", "#a18d6c", "#d9c9a7");
      isoRoof(-31, -30, 23, 15, 10, "#8a3f16", "#e3ae38");
      isoCylinder(31, 8, 9, 38, "#4b4132", "#a18d6c", "#d9c9a7");
      isoRoof(31, -30, 23, 15, 10, "#8a3f16", "#e3ae38");
      isoCube(0, 8, 48, 48, 16, "#504635", "#9b8562", "#ead9b5");
      isoCube(0, -30, 34, 14, 12, "#66583f", "#a89068", "#ead9b5");
      isoRoof(0, -44, 43, 22, 14, "#8a3f16", "#e3ae38");
      isoCylinder(0, -66, 2, 12, "#7c4a16", "#f5d36c", "#fff7d6");
    } else if (emblem === "swords") {
      isoCube(0, 16, 96, 8, 22, "#10131a", "#303746", "#697184");
      isoCube(0, 9, 80, 26, 18, "#171b25", "#394151", "#71798a");
      for (const tx of [-29, 29]) {
        isoCube(tx, 8, 22, 50, 12, "#11151e", "#343b4c", "#70788a");
        isoRoof(tx, -42, 30, 21, 10, "#251738", "#6f3b8d");
      }
      isoCube(0, 8, 34, 40, 13, "#181c27", "#41495c", "#858da0");
      isoRoof(0, -32, 42, 18, 14, "#2c183f", "#754197");
      isoCylinder(0, -50, 2, 12, "#5d4771", "#c4b5fd", "#ffffff");
    } else if (emblem === "mountain") {
      isoCube(0, 16, 98, 9, 22, "#111113", "#3b3b3f", "#68676b");
      isoCube(0, 9, 82, 28, 18, "#17171a", "#454449", "#77757a");
      isoCube(-33, 9, 24, 40, 14, "#111114", "#3b3a40", "#6c6970");
      isoCube(33, 9, 24, 40, 14, "#111114", "#3b3a40", "#6c6970");
      isoCube(0, 7, 42, 50, 14, "#151518", "#47464c", "#79767d");
      isoCube(0, -34, 30, 18, 11, "#242327", "#57555c", "#8e8a91");
      isoRoof(0, -52, 38, 16, 13, "#6b1b12", "#d94a24");
      isoCylinder(0, -68, 2, 10, "#803b17", "#f2a63b", "#fff1a6");
    } else if (emblem === "tree") {
      isoCube(0, 16, 96, 8, 22, "#26372b", "#506448", "#809071");
      isoCube(0, 9, 80, 26, 18, "#394132", "#68745b", "#a3aa83");
      for (const tx of [-34, 34]) {
        isoCylinder(tx, 8, 9, 40, "#3c2c20", "#826342", "#a98a5d");
        isoRoof(tx, -32, 24, 16, 10, "#17452c", "#4d8b52");
      }
      isoCube(0, 7, 42, 48, 14, "#3c2c20", "#8a6847", "#bea075");
      isoRoof(0, -41, 52, 22, 16, "#143b27", "#5d9b57");
      isoCylinder(0, -63, 2, 12, "#795329", "#d6b266", "#fff4bd");
    } else if (emblem === "anchor") {
      isoCube(0, 16, 98, 8, 22, "#193744", "#396877", "#79a7ae");
      isoCube(0, 9, 82, 28, 18, "#3d5960", "#759198", "#bcc6c1");
      for (const tx of [-34, 34]) {
        isoCylinder(tx, 8, 9, 44, "#344f57", "#9aacaa", "#d9d7c7");
        isoRoof(tx, -36, 24, 16, 10, "#155e75", "#36a3b5");
      }
      isoCube(0, 7, 42, 48, 14, "#334d55", "#8fa3a2", "#dddccc");
      isoRoof(0, -41, 52, 21, 16, "#0f5a70", "#37a9ba");
      isoCylinder(0, -62, 2, 12, "#785827", "#e0bc62", "#fff3b0");
    } else if (emblem === "shield") {
      isoCube(0, 16, 98, 8, 22, "#171b1e", "#3b454c", "#7c8b94");
      isoCube(0, 9, 78, 28, 18, "#2c3338", "#5a6871", "#aebbc3");
      isoCube(-34, 10, 24, 44, 14, "#20272c", "#4d5a62", "#bac5cb");
      isoCube(34, 10, 24, 44, 14, "#20272c", "#4d5a62", "#bac5cb");
      isoCube(0, 8, 40, 48, 16, "#20272c", "#526069", "#c7d0d5");
      for (const bx of [-34, -7, 7, 34]) {
        isoCube(
          bx,
          bx === -34 || bx === 34 ? -34 : -40,
          8,
          8,
          6,
          "#30383e",
          "#65737c",
          "#d1d9de",
        );
      }
      isoCylinder(0, -48, 2, 18, "#64727b", "#d8e0e4", "#ffffff");
    } else if (emblem === "star") {
      isoCube(0, 16, 98, 8, 22, "#252545", "#4c4e7b", "#8488b7");
      isoCube(0, 9, 82, 27, 18, "#30305a", "#62659a", "#aeb1dd");
      isoCylinder(-34, 8, 9, 41, "#29294d", "#7376a8", "#c1c4e8");
      isoRoof(-34, -33, 23, 15, 10, "#35307f", "#7774db");
      isoCylinder(34, 8, 9, 41, "#29294d", "#7376a8", "#c1c4e8");
      isoRoof(34, -33, 23, 15, 10, "#35307f", "#7774db");
      isoCylinder(0, 7, 20, 48, "#292951", "#7477ad", "#c5c8ec");
      isoRoof(0, -41, 47, 20, 15, "#383285", "#817ce8");
      isoCylinder(0, -61, 2, 12, "#8a6825", "#f0cf69", "#fff7d6");
    } else {
      isoCube(0, 16, 98, 8, 22, "#293038", "#58636b", "#91999b");
      isoCube(0, 9, 84, 28, 18, "#4b5560", "#8d99a1", "#d7d2c4");
      for (const tx of [-35, 35]) {
        isoCylinder(tx, 8, 9, 42, "#3f4852", "#909ba2", "#d9d4c5");
        isoRoof(
          tx,
          -34,
          24,
          17,
          10,
          getDarkerColor(bannerCol, 0.48),
          bannerCol,
        );
      }
      isoCube(0, 7, 44, 50, 14, "#46515b", "#98a4aa", "#e5dfcf");
      isoCube(0, -33, 32, 14, 11, "#56616a", "#a8b1b4", "#eee6d4");
      isoRoof(0, -47, 40, 20, 14, getDarkerColor(bannerCol, 0.48), bannerCol);
      isoCylinder(0, -67, 2, 12, "#7c4a16", "#f4cf67", "#fff7d6");
    }

    // 3. Waving flag on spire
    offCtx.fillStyle = bannerCol;
    offCtx.beginPath();
    offCtx.moveTo(cx + 1, cy - 66 + bannerWave);
    offCtx.lineTo(cx + 20, cy - 69 + bannerWave);
    offCtx.lineTo(cx + 16, cy - 60 + bannerWave);
    offCtx.lineTo(cx + 20, cy - 51 + bannerWave);
    offCtx.lineTo(cx + 1, cy - 54 + bannerWave);
    offCtx.closePath();
    offCtx.fill();
    offCtx.strokeStyle = "#fbbf24";
    offCtx.lineWidth = 0.8;
    offCtx.stroke();

    miniCastleSpriteCacheMap.set(key, offCanvas);
    return offCanvas;
  }

  function drawEmpireCastleSprite(
    x: number,
    y: number,
    flagColor: string,
    emblem: string,
    scale = 1,
    relation: "own" | "ally" | "enemy" = "enemy",
  ) {
    // LOD Selection: Use Lightweight Mini Castle when zoomed out extreme (scale < 0.18)
    if (scale < 0.18) {
      const miniCanvas = getCachedMiniCastleSprite(flagColor, emblem);
      const drawSize = 128 * (scale * 1.5);
      ctx.drawImage(
        miniCanvas,
        x - drawSize / 2,
        y - drawSize * 0.75,
        drawSize,
        drawSize,
      );
      return;
    }

    const spriteCanvas = getCachedGrandCastleSprite(flagColor, emblem);
    const size = 320;
    const drawW = size * scale;
    const drawH = size * scale;
    // Align ground base (cx=160, cy=243) exactly at (x, y) on map
    const drawX = x - 160 * scale;
    const drawY = y - 243 * scale;

    ctx.drawImage(spriteCanvas, drawX, drawY, drawW, drawH);
  }

  const militaryDistrictSpriteCacheMap = new Map<string, HTMLCanvasElement>();

  function getCachedMilitaryDistrictSprite(
    flagColor: string,
    emblem: string,
  ): HTMLCanvasElement {
    const key = `military_v15_${emblem}_${flagColor}`;
    let cached = militaryDistrictSpriteCacheMap.get(key);
    if (cached) return cached;

    const size = 320;
    const offCanvas = document.createElement("canvas");
    offCanvas.width = size;
    offCanvas.height = size;
    const offCtx = offCanvas.getContext("2d");
    if (!offCtx) return offCanvas;

    const cx = size / 2;
    const cy = size / 2 + 45;

    // Helper 3D Isometric Polygon Functions
    const isoPoly = (
      pts: [number, number][],
      fillStyle: string | CanvasGradient,
    ) => {
      offCtx.fillStyle = fillStyle;
      offCtx.beginPath();
      offCtx.moveTo(cx + pts[0][0], cy + pts[0][1]);
      for (let i = 1; i < pts.length; i++)
        offCtx.lineTo(cx + pts[i][0], cy + pts[i][1]);
      offCtx.closePath();
      offCtx.fill();
    };

    const isoCube = (
      dx: number,
      dy: number,
      w: number,
      h: number,
      depth: number,
      cLeft: string,
      cRight: string,
      cTop: string,
    ) => {
      isoPoly(
        [
          [dx - w / 2, dy],
          [dx, dy + depth / 2],
          [dx, dy + depth / 2 - h],
          [dx - w / 2, dy - h],
        ],
        cLeft,
      );
      isoPoly(
        [
          [dx, dy + depth / 2],
          [dx + w / 2, dy],
          [dx + w / 2, dy - h],
          [dx, dy + depth / 2 - h],
        ],
        cRight,
      );
      isoPoly(
        [
          [dx - w / 2, dy - h],
          [dx, dy + depth / 2 - h],
          [dx + w / 2, dy - h],
          [dx, dy - depth / 2 - h],
        ],
        cTop,
      );
    };

    const isoRoof = (
      dx: number,
      dy: number,
      w: number,
      h: number,
      depth: number,
      cLeft: string,
      cRight: string,
    ) => {
      isoPoly(
        [
          [dx - w / 2, dy],
          [dx, dy + depth / 2],
          [dx, dy - h],
        ],
        cLeft,
      );
      isoPoly(
        [
          [dx, dy + depth / 2],
          [dx + w / 2, dy],
          [dx, dy - h],
        ],
        cRight,
      );
    };

    const isoCylinder = (
      dx: number,
      dy: number,
      rx: number,
      h: number,
      c1: string,
      c2: string,
      cTop: string,
    ) => {
      const grad = offCtx.createLinearGradient(
        cx + dx - rx,
        cy + dy,
        cx + dx + rx,
        cy + dy,
      );
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      offCtx.fillStyle = grad;
      offCtx.beginPath();
      offCtx.moveTo(cx + dx - rx, cy + dy - h);
      offCtx.ellipse(cx + dx, cy + dy - h, rx, rx * 0.45, 0, Math.PI, 0, true);
      offCtx.lineTo(cx + dx + rx, cy + dy);
      offCtx.ellipse(cx + dx, cy + dy, rx, rx * 0.45, 0, 0, Math.PI, false);
      offCtx.lineTo(cx + dx - rx, cy + dy - h);
      offCtx.closePath();
      offCtx.fill();

      offCtx.fillStyle = cTop;
      offCtx.beginPath();
      offCtx.ellipse(cx + dx, cy + dy - h, rx, rx * 0.45, 0, 0, Math.PI * 2);
      offCtx.fill();
    };

    const r = (dx: number, dy: number, w: number, h: number, color: string) => {
      offCtx.fillStyle = color;
      offCtx.fillRect(
        Math.floor(cx + dx),
        Math.floor(cy + dy),
        Math.ceil(w),
        Math.ceil(h),
      );
    };

    // Ground Shadow
    const shadowGrad = offCtx.createRadialGradient(
      cx,
      cy + 42,
      12,
      cx,
      cy + 42,
      118,
    );
    shadowGrad.addColorStop(0, "rgba(0, 0, 0, 0.85)");
    shadowGrad.addColorStop(0.5, "rgba(0, 0, 0, 0.45)");
    shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    offCtx.fillStyle = shadowGrad;
    offCtx.beginPath();
    offCtx.ellipse(cx, cy + 42, 118, 36, 0, 0, Math.PI * 2);
    offCtx.fill();

    const bannerWave = Math.sin(state.tick * 0.25) * 2.5;
    const bannerCol = flagColor || "#dc2626";

    const stoneLeft = "#3d4549";
    const stoneRight = "#707b80";
    const stoneTop = "#aeb5b4";
    const timberLeft = "#4b2f1b";
    const timberRight = "#8b5b2b";
    const timberTop = "#c18a4b";
    const roofLeft = getDarkerColor(bannerCol, 0.42);
    const roofRight = bannerCol;

    // Raised stone platform and packed-earth drill yard.
    isoCube(0, 42, 250, 14, 56, "#292f32", "#515b60", "#838b8b");
    isoCube(0, 29, 222, 6, 48, "#65523a", "#8b7049", "#b99a62");

    // Rear curtain wall and watchtowers.
    isoCube(0, 2, 202, 34, 34, stoneLeft, stoneRight, stoneTop);
    for (const tx of [-91, 91]) {
      isoCube(tx, 8, 42, 76, 24, "#31383c", "#687378", "#aeb5b4");
      isoCube(tx, -55, 50, 13, 28, timberLeft, timberRight, timberTop);
      isoRoof(tx, -68, 58, 27, 24, roofLeft, roofRight);
    }

    // Barracks flank the open training yard.
    isoCube(-58, 22, 62, 40, 30, timberLeft, timberRight, timberTop);
    isoRoof(-58, -18, 72, 25, 34, "#2b211a", roofRight);
    isoCube(58, 22, 62, 40, 30, timberLeft, timberRight, timberTop);
    isoRoof(58, -18, 72, 25, 34, "#2b211a", roofRight);

    // Central command hall remains lower than a capital keep.
    isoCube(0, -3, 76, 76, 28, "#343c40", "#778288", "#bdc2bf");
    isoRoof(0, -79, 92, 38, 30, roofLeft, roofRight);

    // Weapon racks in the yard.
    offCtx.save();
    offCtx.strokeStyle = "#2a1a0f";
    offCtx.lineWidth = 5;
    offCtx.lineCap = "round";
    for (const rackX of [-27, 27]) {
      offCtx.beginPath();
      offCtx.moveTo(cx + rackX - 10, cy + 11);
      offCtx.lineTo(cx + rackX + 10, cy + 31);
      offCtx.moveTo(cx + rackX + 10, cy + 11);
      offCtx.lineTo(cx + rackX - 10, cy + 31);
      offCtx.stroke();
      r(rackX - 14, 20, 28, 4, "#b98a4b");
    }
    offCtx.restore();

    // Front palisade, fortified gatehouse and portcullis.
    isoCube(-72, 34, 72, 32, 28, timberLeft, timberRight, timberTop);
    isoCube(72, 34, 72, 32, 28, timberLeft, timberRight, timberTop);
    for (const postX of [-101, -86, -71, -56, -41, 41, 56, 71, 86, 101]) {
      isoCube(postX, 34, 10, 43, 10, "#3a2415", "#7a4c25", "#bd8141");
    }
    isoCube(0, 31, 58, 58, 26, "#30383c", "#68747a", "#b8bfbd");
    isoCube(0, -17, 66, 12, 28, timberLeft, timberRight, timberTop);
    r(-18, 5, 36, 43, "#11171a");
    offCtx.fillStyle = "#11171a";
    offCtx.beginPath();
    offCtx.arc(cx, cy + 5, 18, Math.PI, 0);
    offCtx.fill();
    for (let gx = -14; gx <= 14; gx += 7) r(gx, 1, 3, 47, "#89969c");
    for (let gy = 13; gy <= 41; gy += 10) r(-17, gy, 34, 3, "#89969c");

    const drawTorch = (tx: number, ty: number) => {
      const aura = offCtx.createRadialGradient(
        cx + tx,
        cy + ty,
        1,
        cx + tx,
        cy + ty,
        17,
      );
      aura.addColorStop(0, "rgba(254, 240, 138, 0.95)");
      aura.addColorStop(0.4, "rgba(249, 115, 22, 0.62)");
      aura.addColorStop(1, "rgba(0, 0, 0, 0)");
      offCtx.fillStyle = aura;
      offCtx.beginPath();
      offCtx.arc(cx + tx, cy + ty, 17, 0, Math.PI * 2);
      offCtx.fill();
      r(tx - 3, ty - 5, 6, 10, "#f59e0b");
      r(tx - 1, ty - 3, 2, 6, "#fff7ae");
    };
    drawTorch(-28, -5);
    drawTorch(28, -5);

    // Command standard carries the player's selected dynasty emblem.
    drawFlagEmblem(cx, cy - 47, emblem, 0.7, offCtx);
    isoCylinder(0, -117, 3, 31, "#7c4a16", "#efc65e", "#fff7d6");

    offCtx.fillStyle = bannerCol;
    offCtx.beginPath();
    offCtx.moveTo(cx + 2, cy - 146 + bannerWave);
    offCtx.lineTo(cx + 42, cy - 151 + bannerWave);
    offCtx.lineTo(cx + 35, cy - 136 + bannerWave);
    offCtx.lineTo(cx + 42, cy - 121 + bannerWave);
    offCtx.lineTo(cx + 2, cy - 126 + bannerWave);
    offCtx.closePath();
    offCtx.fill();
    offCtx.strokeStyle = "#fbbf24";
    offCtx.lineWidth = 1.4;
    offCtx.stroke();
    drawFlagEmblem(cx + 22, cy - 136 + bannerWave, emblem, 0.72, offCtx);

    militaryDistrictSpriteCacheMap.set(key, offCanvas);
    return offCanvas;
  }

  function drawMilitaryDistrictSprite(
    x: number,
    y: number,
    flagColor: string,
    emblem: string,
    scale = 1,
    relation: "own" | "ally" | "enemy" = "enemy",
  ) {
    // LOD Selection: Use Lightweight Mini Castle when zoomed out extreme (scale < 0.18)
    if (scale < 0.18) {
      const miniCanvas = getCachedMiniCastleSprite(flagColor, emblem);
      const drawSize = 128 * (scale * 1.5);
      ctx.drawImage(
        miniCanvas,
        x - drawSize / 2,
        y - drawSize * 0.75,
        drawSize,
        drawSize,
      );
      return;
    }

    const spriteCanvas = getCachedMilitaryDistrictSprite(flagColor, emblem);
    const size = 320;
    const drawW = size * scale;
    const drawH = size * scale;
    const drawX = x - 160 * scale;
    const drawY = y - 243 * scale;

    ctx.drawImage(spriteCanvas, drawX, drawY, drawW, drawH);
  }

  function drawRelationRing(
    x: number,
    y: number,
    ownerType: "own" | "ally" | "enemy",
    scale = 1,
  ) {
    ctx.save();

    let strokeColor, fillColor;
    if (ownerType === "own") {
      strokeColor = "#00f0ff"; // Electric Royal Cyan
      fillColor = "rgba(0, 240, 255, 0.30)";
    } else if (ownerType === "ally") {
      strokeColor = "#3b82f6"; // Blue
      fillColor = "rgba(59, 130, 246, 0.2)";
    } else {
      strokeColor = "#ef4444"; // Red
      fillColor = "rgba(239, 68, 68, 0.2)";
    }

    const baseRx = 110 * scale; // Increased radius to stand out
    const baseRy = 40 * scale;
    const pulse = Math.sin(state.tick * 0.08) * 0.06 + 1.0; // Smooth pulse ticker

    // Positioned to wrap around the base footprint and nameplate
    const centerY = y + 45 * scale;

    // Glowing Neon Aura Effect
    ctx.shadowBlur = 12 * scale;
    ctx.shadowColor = strokeColor;

    // 1. Glowing fill
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.ellipse(x, centerY, baseRx * pulse, baseRy * pulse, 0, 0, TAU);
    ctx.fill();

    // 2. Outer dashed ring (glowing)
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3.5 * scale;
    ctx.setLineDash([8 * scale, 5 * scale]);
    ctx.beginPath();
    ctx.ellipse(x, centerY, baseRx * pulse, baseRy * pulse, 0, 0, TAU);
    ctx.stroke();

    // 3. Inner solid ring (glowing)
    ctx.setLineDash([]);
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.ellipse(x, centerY, baseRx * 0.82, baseRy * 0.82, 0, 0, TAU);
    ctx.stroke();

    ctx.restore();
  }

  function resolveCastleEmblem(
    ownerName?: string,
    regionId?: number,
    explicitEmblem?: string,
  ): string {
    const validStyles = [
      "crown",
      "eagle",
      "dragon",
      "lion",
      "swords",
      "shield",
      "tree",
      "mountain",
      "anchor",
    ];
    if (explicitEmblem && validStyles.includes(explicitEmblem)) {
      return explicitEmblem;
    }
    if (
      regionId !== undefined &&
      state.regionOwnerEmblems[regionId] &&
      validStyles.includes(state.regionOwnerEmblems[regionId])
    ) {
      return state.regionOwnerEmblems[regionId];
    }
    const seed = String(
      ownerName || (regionId !== undefined ? `region-${regionId}` : "castle"),
    );
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return validStyles[hash % validStyles.length];
  }

  function drawAllianceMiniEmblem(
    cx: number,
    cy: number,
    emblem: string,
    scale = 1,
  ) {
    const s = scale;
    const r = (dx: number, dy: number, w: number, h: number, color: string) =>
      pxRect(cx + dx * s, cy + dy * s, w * s, h * s, color);
    const color = "#57d3ff";
    const dark = "#0b1420";
    if (emblem === "star") {
      r(-2, -8, 4, 16, color);
      r(-8, -2, 16, 4, color);
      r(-5, -5, 10, 10, color);
      r(-2, -2, 4, 4, dark);
    } else if (emblem === "tower") {
      r(-7, -6, 14, 14, color);
      r(-9, -10, 4, 6, color);
      r(-2, -10, 4, 6, color);
      r(5, -10, 4, 6, color);
      r(-3, 2, 6, 6, dark);
    } else if (emblem === "anchor") {
      r(-2, -9, 4, 17, color);
      r(-7, -1, 14, 4, color);
      r(-8, 4, 4, 4, color);
      r(4, 4, 4, 4, color);
      r(-4, -11, 8, 4, color);
    } else if (emblem === "flame") {
      r(-2, -10, 4, 4, "#ffd85a");
      r(-5, -6, 10, 7, "#f97316");
      r(-7, 0, 14, 9, "#ef4444");
      r(-2, 1, 4, 7, "#ffd85a");
    } else {
      r(-8, -9, 16, 5, color);
      r(-7, -4, 14, 8, color);
      r(-4, 4, 8, 6, color);
      r(-2, -5, 4, 11, dark);
    }
  }

  function drawAllianceBadge(
    x: number,
    y: number,
    tag: string,
    emblem: string,
    scale = 1,
  ) {
    if (!tag) return;
    const s = scale;
    const cleanTag = String(tag).slice(0, 6).toUpperCase();
    const w = Math.max(54, cleanTag.length * 12 + 30) * s;
    const h = 24 * s;
    pxRect(x - w / 2 + 3 * s, y + 3 * s, w, h, "rgba(0,0,0,0.45)");
    pxRect(x - w / 2, y, w, h, "rgba(6,14,20,0.96)");
    ctx.strokeStyle = "#57d3ff";
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(
      Math.round(x - w / 2),
      Math.round(y),
      Math.round(w),
      Math.round(h),
    );
    drawAllianceMiniEmblem(
      x - w / 2 + 14 * s,
      y + 12 * s,
      emblem || "shield",
      s,
    );
    text(cleanTag, x + 9 * s, y + 7 * s, 22 * s, "#dff7ff", "center");
  }

  function drawCastle(t) {
    const explicitRegionId = Number(t.regionId ?? t.territoryId);
    const castleRegionId =
      Number.isInteger(explicitRegionId) && explicitRegionId >= 0
        ? explicitRegionId
        : regionAtCoords(t.x, t.y);
    const castleLand = castleRegionId >= 0 ? landById(castleRegionId) : null;
    const isIslet = Boolean(castleLand?.isIslet);
    const drawX = castleLand ? castleLand.x : t.x;
    const drawY = castleLand ? castleLand.y : t.y;

    // Viewport Culling Optimization: Skip rendering castles completely offscreen!
    const viewport = getWorldViewport();
    if (viewport && !isPointInViewport(drawX, drawY, viewport, 360)) {
      return;
    }

    const owner = factions[t.owner] || factions[0];

    const isUserTown =
      t.owner === 0 ||
      (state.localPlayerId && t.ownerId === state.localPlayerId);
    const sel = t.id === state.selected;
    if (sel) {
      ctx.save();
      ctx.shadowColor = "#ffe85a";
      ctx.shadowBlur = isUserTown ? 22 : 12;
      ctx.fillStyle = "rgba(255, 230, 90, 0.35)";
      ctx.beginPath();
      ctx.ellipse(
        drawX,
        drawY + (isUserTown ? 68 : 38),
        isUserTown ? 130 : 72,
        isUserTown ? 42 : 24,
        0,
        0,
        TAU,
      );
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffe24a";
      ctx.lineWidth = isUserTown ? 4.0 : 2.5;
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.0;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -state.tick * 15;
      ctx.stroke();
      ctx.restore();
    }
    const regionId = castleRegionId;
    const settlement = classifySettlement({
      isIslet,
      settlementKind:
        t.settlementKind ||
        t.kind ||
        (regionId >= 0 ? state.regionSettlementKinds[regionId] : undefined),
      connectionType:
        regionId >= 0 ? state.regionConnectionTypes[regionId] : undefined,
      capitalTerritoryConfirmed:
        regionId >= 0 && state.capitalTerritoryIds.has(regionId),
      capitalTownConfirmed: state.capitalTownIds.has(Number(t.id)),
    });
    const {
      isCapital: isCapitalSettlement,
      isSubCapital,
      isMilitaryDistrict,
      buildingType,
    } = settlement;

    let flagColor = owner.color || "#ef4444";
    let ownerName = owner.name || "KẺ ĐỊCH";
    let rawEmblem = undefined;

    if (t.owner === 0) {
      flagColor = state.newbieFlagColor || "#2563eb";
      ownerName = state.localPlayerName || "BẠN";
      rawEmblem = state.newbieEmblem;
    } else if (regionId >= 0 && state.regionOwnerNames[regionId]) {
      flagColor = state.regionOwnerFlagColors[regionId] || "#ef4444";
      ownerName = state.regionOwnerNames[regionId];
      rawEmblem = state.regionOwnerEmblems[regionId];
    }
    const emblem = resolveCastleEmblem(
      ownerName,
      regionId >= 0 ? regionId : undefined,
      rawEmblem,
    );

    // Resolve equipped skin for this castle (local player or remote players)
    let equippedSkin: string | null = null;
    if (isUserTown) {
      equippedSkin = isCapitalSettlement
        ? state.equippedCapitalSkin
        : isMilitaryDistrict
          ? state.equippedDistrictSkin
          : state.equippedCapitalSkin;
    } else if (regionId >= 0) {
      equippedSkin = isCapitalSettlement
        ? state.regionOwnerCapitalSkins[regionId]
        : isMilitaryDistrict
          ? state.regionOwnerDistrictSkins[regionId]
          : state.regionOwnerCapitalSkins[regionId];
    }

    const architectureId = isUserTown
      ? normalizeKingdomArchitecture(state.newbieArchitectureId)
      : state.regionOwnerArchitectureIds[regionId]
        ? normalizeKingdomArchitecture(
            state.regionOwnerArchitectureIds[regionId],
          )
        : kingdomArchitectureFromEmblem(emblem);
    const size = standardTerritoryBuildingSize(
      castleLand || {},
      buildingType,
      isIslet,
    );
    const buildingAnchor = territoryBuildingAnchor(
      drawX,
      drawY,
      architectureId,
      buildingType,
      size,
      equippedSkin,
    );
    drawKingdomBuildingSprite(
      architectureId,
      buildingType,
      buildingAnchor.x,
      buildingAnchor.y,
      size,
      equippedSkin,
    );
    if (buildingType === "capital" || buildingType === "district") {
      const avatarRelation = isUserTown
        ? "own"
        : getRegionAllianceRelation(
              regionId,
              2,
              state.regionOwnerNames[regionId],
            ) === "ally"
          ? "ally"
          : "enemy";
      drawRulerAvatarBadge({
        ctx,
        zoom: state.zoom,
        architectureId,
        buildingType,
        x: buildingAnchor.x,
        y: buildingAnchor.y,
        size,
        skinId: equippedSkin,
        avatarId: isUserTown
          ? state.localPlayerAvatarId
          : state.regionOwnerAvatarIds[regionId],
        avatarFrameId: isUserTown
          ? state.equippedAvatarFrameId
          : state.regionOwnerAvatarFrameIds[regionId],
        relation: avatarRelation,
      });
    }

    // Skip heavy nameplate & badge measurement when zoomed far out
    if (state.zoom < 0.45 && !isUserTown && !sel) {
      return;
    }

    // Draw Castle Name Plate directly below ground level
    const nameText = cleanOwnerName(ownerName, t.owner === 0 ? 1 : 2, regionId);
    const textSz = isUserTown ? 14 : 13;

    ctx.save();
    ctx.font = `bold ${textSz}px 'Noto Serif', 'Noto Serif KR', 'Noto Serif JP', serif`;
    const tw = ctx.measureText(nameText).width || 48;
    const padX = 9;
    const labelGround = buildingOverlayGeometry(
      architectureId,
      buildingType,
      buildingAnchor.x,
      buildingAnchor.y,
      size,
      equippedSkin,
    );
    const premiumNameplate = isUserTown && state.equippedNameFrameId
      ? premiumNameplateImages[state.equippedNameFrameId]
      : null;
    const avatarRadius = Math.max(12, Math.min(20, 14 / Math.max(state.zoom, 0.55)));
    const avatarBottom = labelGround.groundY + avatarRadius * 0.28 + 3.5;
    const nameplateTop = avatarBottom + 4;
    const bx = labelGround.groundX - tw / 2 - padX;
    const by = nameplateTop + (premiumNameplate ? 18 : 0);
    const bw = tw + padX * 2;
    const bh = 22;

    if (premiumNameplate?.complete && premiumNameplate.naturalWidth > 0) {
      ctx.drawImage(premiumNameplate, bx - 36, by - 18, bw + 72, bh + 36);
    } else {
      ctx.fillStyle = "rgba(10, 20, 23, 0.92)";
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 3);
      ctx.fill();
      ctx.strokeStyle = flagColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = premiumNameplate ? "#fff4cf" : isUserTown ? "#55e6c1" : "#ff7b72";
    if (premiumNameplate) {
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
    }
    ctx.fillText(nameText, labelGround.groundX, by + bh / 2 + 0.5);
    ctx.restore();

    // ── Hammer Badge Indicator ON TOP OF CASTLE STRUCTURE ──────────────────
    const townRegionId = t.regionId;
    const firstPlayerTown = towns.find((tn: any) => tn.owner === 0);
    const isBuilderHere =
      t.owner === 0 &&
      (state.builderRegionId != null
        ? t.id === state.builderRegionId ||
          townRegionId === state.builderRegionId
        : t === firstPlayerTown);

    if (isBuilderHere) {
      const hY = buildingAnchor.y - (isUserTown ? 140 : 100);
      const hW = 148;
      const hH = 26;
      const hX = buildingAnchor.x - hW / 2;
      const pulse = Math.sin(state.tick * 6) * 3;

      // Dark plate with bright gold border resting right on top of castle roof
      pxRect(hX + 3, hY + 3, hW, hH, "rgba(0, 0, 0, 0.5)");
      pxRect(hX, hY, hW, hH, "#0f172a");
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.0;
      ctx.strokeRect(hX, hY, hW, hH);

      // Gold corner rivets
      pxRect(hX + 1, hY + 1, 2, 2, "#ffd700");
      pxRect(hX + hW - 3, hY + 1, 2, 2, "#ffd700");
      pxRect(hX + 1, hY + hH - 3, 2, 2, "#ffd700");
      pxRect(hX + hW - 3, hY + hH - 3, 2, 2, "#ffd700");

      // Text Label with emoji
      text(
        "THỢ XÂY TẠI ĐÂY",
        drawX,
        hY + 6 + pulse * 0.2,
        11,
        "#ffd34d",
        "center",
      );
    }

    const activeBattle = state.activeBattles?.find((b: any) => {
      if (b.townId !== undefined && String(b.townId) === String(t.id))
        return true;
      const bCanvasReg = reactToCanvasRegionId(b.regionId);
      if (
        bCanvasReg >= 0 &&
        regionId >= 0 &&
        Number(bCanvasReg) === Number(regionId)
      )
        return true;
      if (regionId >= 0 && Number(b.regionId) === Number(regionId)) return true;
      if (
        b.x !== undefined &&
        b.y !== undefined &&
        Math.hypot(b.x - drawX, b.y - drawY) < 60
      )
        return true;
      return false;
    });

    // Active siege visuals are rendered once by drawSiegeRenderer(). Keeping
    // them out of the building renderer prevents duplicate bars and legacy
    // territory-sized warning rings.
  }
  function battleTargetRegionId(battle: any) {
    const raw =
      battle?.regionId ?? battle?.targetTerritoryId ?? battle?.toTerritoryId;
    const id = Number(raw);
    return Number.isFinite(id) ? id : -1;
  }

  function battlesAtTarget(territoryId: number) {
    if (frameBattleIndexReady) {
      return frameBattlesByTarget.get(Number(territoryId)) || [];
    }
    return (state.activeBattles || []).filter((battle: any) => {
      if (battleTargetRegionId(battle) === Number(territoryId)) return true;
      if (battle?.townId !== undefined) {
        const town =
          frameTownById.get(String(battle.townId)) ||
          towns.find((item: any) => String(item.id) === String(battle.townId));
        if (town && Number(town.regionId) === Number(territoryId)) return true;
      }
      return false;
    });
  }

  function drawBattleBar(
    x: number,
    y: number,
    width: number,
    ratio: number,
    color: string,
    height = 5,
  ) {
    const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
    const radius = Math.max(1.5, height / 2);
    ctx.save();
    ctx.lineJoin = "round";
    ctx.fillStyle = "rgba(12, 18, 19, .66)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    if (safeRatio > 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(
        x + 1,
        y + 1,
        Math.max(2, (width - 2) * safeRatio),
        Math.max(1, height - 2),
        Math.max(1, radius - 1),
      );
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(246, 211, 126, .78)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.stroke();
    ctx.restore();
  }

  function siegeVisualScale() {
    // Keep the battle card at a stable, compact screen size. The old 5.5x cap
    // made the two bars grow into a huge floating panel at mobile zoom.
    return Math.max(0.9, Math.min(2.8, 0.92 / Math.max(0.2, state.zoom)));
  }

  function siegeParticipants(battle: any) {
    if (Array.isArray(battle.participants) && battle.participants.length) {
      return battle.participants.filter(
        (participant: any) => participant.status === "engaged",
      );
    }
    if (
      Array.isArray(battle.attackerSources) &&
      battle.attackerSources.length
    ) {
      const ratio = Math.max(
        0,
        Math.min(
          1,
          Number(battle.attackerCurrentHp ?? battle.attackerPower ?? 0) /
            Math.max(
              1,
              Number(battle.attackerMaxHp ?? battle.attackerPower ?? 1),
            ),
        ),
      );
      return battle.attackerSources.map((source: any) => ({
        ...source,
        playerId: source.ownerId,
        sourceTerritoryId: source.fromTerritoryId,
        maxHp: Math.max(1, Number(source.power || 1)),
        currentHp: Math.max(0, Math.round(Number(source.power || 0) * ratio)),
        status: "engaged",
      }));
    }
    return [];
  }

  function siegeSourceParticipants(battle: any) {
    const participants =
      Array.isArray(battle?.participants) && battle.participants.length
        ? battle.participants
        : siegeParticipants(battle);
    return participants.filter(
      (participant: any) =>
        !["defeated", "returned"].includes(String(participant.status || "")),
    );
  }

  function mergeSiegeParticipants(participants: any[]) {
    if (participants.length <= 1) return participants[0] || null;
    return participants.reduce(
      (merged: any, participant: any) => ({
        ...merged,
        maxHp:
          Number(merged.maxHp || 0) +
          Number(participant.maxHp || participant.power || 0),
        currentHp:
          Number(merged.currentHp || 0) +
          Number(
            participant.currentHp ??
              participant.maxHp ??
              participant.power ??
              0,
          ),
        power: Number(merged.power || 0) + Number(participant.power || 0),
        troops: Number(merged.troops || 0) + Number(participant.troops || 0),
        infantry:
          Number(merged.infantry || 0) + Number(participant.infantry || 0),
        cavalry: Number(merged.cavalry || 0) + Number(participant.cavalry || 0),
        artillery:
          Number(merged.artillery || 0) + Number(participant.artillery || 0),
      }),
      { ...participants[0] },
    );
  }

  function drawSiegeImpact(x: number, y: number, seed = 0) {
    const lowDetail = fastRenderMode || crowdedRenderMode || state.zoom < 0.52;
    const visualScale = siegeVisualScale();
    const impact = Math.max(0, Math.sin(state.tick * 3.4 + seed));
    if (impact > 0.68) {
      ctx.save();
      ctx.globalAlpha = (impact - 0.68) * 1.8;
      const glow = ctx.createRadialGradient(
        x,
        y,
        1,
        x,
        y,
        (lowDetail ? 9 : 16) * visualScale,
      );
      glow.addColorStop(0, "rgba(255,244,182,.95)");
      glow.addColorStop(0.35, "rgba(244,147,48,.72)");
      glow.addColorStop(1, "rgba(177,55,22,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, (lowDetail ? 9 : 16) * visualScale, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    const smokeCount = lowDetail ? 2 : 4;
    for (let i = 0; i < smokeCount; i++) {
      const phase = (((state.tick * 0.42 + i * 0.23 + seed) % 1) + 1) % 1;
      ctx.fillStyle = `rgba(66,61,53,${(1 - phase) * 0.26})`;
      ctx.beginPath();
      ctx.arc(
        x + (i - smokeCount / 2) * 5 * visualScale,
        y - phase * 26 * visualScale,
        (4 + phase * 8) * visualScale,
        0,
        TAU,
      );
      ctx.fill();
    }
  }

  function drawSiegeProjectile(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    attackPhase: number,
  ) {
    if ((fastRenderMode || ultraCrowdedRenderMode) && state.zoom < 0.56) return;
    const phase = ((attackPhase % 1) + 1) % 1;
    const fireAt = 0.45;
    const impactAt = 0.92;
    if (phase < fireAt || phase > impactAt) return;
    const t = (phase - fireAt) / (impactAt - fireAt);
    const x = lerp(fromX, toX, t);
    const y =
      lerp(fromY, toY, t) - Math.sin(t * Math.PI) * 18 * siegeVisualScale();
    const radius = 1.7 * siegeVisualScale();
    ctx.save();
    ctx.shadowColor = "#f6b94b";
    ctx.shadowBlur = 5 * siegeVisualScale();
    ctx.fillStyle = "#ffe7a0";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawTargetSiegeOverlay(
    x: number,
    y: number,
    territoryId: number,
    defenderOwner: number,
  ) {
    const battles = battlesAtTarget(territoryId);
    if (!battles.length) return;
    const lead = battles[0];
    const participants = battles.flatMap((battle: any) =>
      siegeParticipants(battle),
    );
    const attackersMax = Math.max(
      1,
      participants.length
        ? participants.reduce(
            (sum: number, participant: any) =>
              sum +
              Math.max(1, Number(participant.maxHp || participant.power || 1)),
            0,
          )
        : Number(lead.attackerMaxHp ?? lead.attackerPower ?? 1),
    );
    const attackersHp = Math.max(
      0,
      participants.length
        ? participants.reduce(
            (sum: number, participant: any) =>
              sum +
              Math.max(
                0,
                Number(
                  participant.currentHp ??
                    participant.maxHp ??
                    participant.power ??
                    0,
                ),
              ),
            0,
          )
        : Number(
            lead.attackerCurrentHp ??
              lead.attackerMaxHp ??
              lead.attackerPower ??
              0,
          ),
    );
    const defenderMax = Math.max(
      1,
      Number(lead.defenderMaxHp ?? lead.defenderPower ?? lead.defPower ?? 1),
    );
    const defenderHp = Math.max(
      0,
      Number(lead.defenderCurrentHp ?? defenderMax),
    );
    const fortificationMax = Math.max(
      0,
      Number(lead.fortificationMaxHp || 0),
    );
    const fortificationHp = Math.max(
      0,
      Number(lead.fortificationCurrentHp ?? fortificationMax),
    );
    const rem = lead.resolvesAt
      ? Math.max(
          0,
          Math.ceil((new Date(lead.resolvesAt).getTime() - Date.now()) / 1000),
        )
      : Math.max(
          0,
          Math.ceil(
            (lead.duration ?? lead.durationSeconds ?? 25) - (lead.t ?? 0),
          ),
        );
    const compact = fastRenderMode || state.zoom < 0.58;
    const visualScale = siegeVisualScale();
    const formatStat = (value: any) => {
      const amount = Math.max(0, Math.round(Number(value) || 0));
      if (amount >= 1_000_000)
        return `${(amount / 1_000_000).toFixed(amount >= 10_000_000 ? 0 : 1)}M`;
      if (amount >= 1_000)
        return `${(amount / 1_000).toFixed(amount >= 10_000 ? 0 : 1)}K`;
      return String(amount);
    };
    const formatTime = (seconds: number) => {
      const safe = Math.max(0, Math.floor(Number(seconds) || 0));
      return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(
        safe % 60,
      ).padStart(2, "0")}`;
    };
    const attackerPower = Math.max(
      0,
      Number(lead.attackerPower ?? lead.attPower ?? attackersMax),
    );
    const defenderPower = Math.max(
      0,
      Number(lead.defenderPower ?? lead.defPower ?? defenderMax),
    );
    const attackerTroops = Math.max(
      0,
      participants.length
        ? participants.reduce(
            (sum: number, participant: any) =>
              sum +
              Number(
                participant.troops ??
                  Number(participant.infantry || 0) +
                    Number(participant.cavalry || 0) +
                    Number(participant.artillery || 0),
              ),
            0,
          )
        : Number(
            lead.attackerTroops ??
              Number(lead.attackerInfantry || 0) +
                Number(lead.attackerCavalry || 0) +
                Number(lead.attackerArtillery || 0),
          ),
    );
    const defenderTroops = Math.max(
      0,
      Number(
        lead.defenderTroops ??
          Number(lead.defenderInfantry || 0) +
            Number(lead.defenderCavalry || 0) +
            Number(lead.defenderArtillery || 0),
      ),
    );
    const engagedCount = Math.max(
      1,
      participants.filter((participant: any) => participant.status === "engaged")
        .length ||
        lead.attackerSources?.length ||
        1,
    );
    const targetGround = territoryGroundPoint(territoryId, { x, y });
    // Keep enough horizontal room for both the role and power value. The old
    // compact card tried to fit “PHÒNG THỦ” and the power number into a 62px
    // column, which made the labels collide on phones.
    const panelWidth = compact ? 178 : 222;
    const panelHeight = compact ? 86 : 108;
    // Anchor from the building's ground contact so every territory type gets
    // the same clear, floating battle banner above its sprite.
    const top = -(panelHeight + (compact ? 38 : 48));
    const left = -panelWidth / 2;
    const headerHeight = compact ? 24 : 29;
    const footerHeight = compact ? 14 : 17;
    const bodyTop = top + headerHeight + 5;
    const sideGap = compact ? 16 : 20;
    const sideWidth = (panelWidth - 12 - sideGap) / 2;
    const leftSide = left + 6;
    const rightSide = left + panelWidth - sideWidth - 6;
    const attackTone = "#e65a4f";
    const defendTone = "#4da5e5";
    const pulse = 0.55 + Math.sin(state.tick * 5.4 + territoryId * 0.17) * 0.18;

    ctx.save();
    ctx.translate(targetGround.x, targetGround.y);
    ctx.scale(visualScale, visualScale);

    // A short luminous pin keeps the card visually attached to the contested
    // building while the opaque card remains above every map asset.
    ctx.strokeStyle = `rgba(255, 202, 92, ${0.7 + pulse * 0.24})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(0, top + panelHeight);
    ctx.lineTo(0, top + panelHeight + 12);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffd36a";
    ctx.beginPath();
    ctx.arc(0, top + panelHeight + 12, 1.8 + pulse, 0, TAU);
    ctx.fill();

    // Strong shadow and restrained gold trim keep the HUD readable over trees,
    // units, borders, and bright territory colours.
    ctx.shadowColor = "rgba(0, 0, 0, .78)";
    ctx.shadowBlur = compact ? 8 : 12;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = "rgba(0, 0, 0, .5)";
    ctx.beginPath();
    ctx.roundRect(left + 3, top + 5, panelWidth, panelHeight, 11);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const panelGradient = ctx.createLinearGradient(0, top, 0, top + panelHeight);
    panelGradient.addColorStop(0, "rgba(19, 39, 52, .99)");
    panelGradient.addColorStop(0.44, "rgba(9, 22, 32, .99)");
    panelGradient.addColorStop(1, "rgba(3, 10, 16, .99)");
    ctx.fillStyle = panelGradient;
    ctx.beginPath();
    ctx.roundRect(left, top, panelWidth, panelHeight, 11);
    ctx.fill();
    ctx.strokeStyle = `rgba(241, 187, 72, ${0.9 + pulse * 0.1})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 232, 159, .28)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.roundRect(left + 4, top + 4, panelWidth - 8, panelHeight - 8, 8);
    ctx.stroke();

    // Small corner rivets give the panel a crafted RTS/HUD silhouette.
    ctx.fillStyle = "rgba(255, 225, 137, .8)";
    for (const corner of [
      [left + 8, top + 8],
      [left + panelWidth - 8, top + 8],
      [left + 8, top + panelHeight - 8],
      [left + panelWidth - 8, top + panelHeight - 8],
    ]) {
      ctx.beginPath();
      ctx.arc(corner[0], corner[1], 1, 0, TAU);
      ctx.fill();
    }

    // Two-tone header communicates the opposing sides before the player reads
    // any number.
    const headerGradient = ctx.createLinearGradient(left, 0, left + panelWidth, 0);
    headerGradient.addColorStop(0, "#7d2930");
    headerGradient.addColorStop(0.48, "#28313a");
    headerGradient.addColorStop(1, "#174d6d");
    ctx.fillStyle = headerGradient;
    ctx.beginPath();
    ctx.roundRect(left + 1, top + 1, panelWidth - 2, headerHeight, 10);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, .16)";
    ctx.fillRect(left + 10, top + headerHeight - 2, panelWidth - 20, 1);

    // Crossed-sword emblem.
    const iconX = left + (compact ? 13 : 16);
    const iconY = top + headerHeight / 2;
    ctx.save();
    ctx.strokeStyle = "#ffe6a6";
    ctx.lineCap = "round";
    ctx.lineWidth = compact ? 2.1 : 2.5;
    ctx.beginPath();
    ctx.moveTo(iconX - 5, iconY - 6);
    ctx.lineTo(iconX + 5, iconY + 5);
    ctx.moveTo(iconX + 5, iconY - 6);
    ctx.lineTo(iconX - 5, iconY + 5);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(iconX - 6, iconY - 1);
    ctx.lineTo(iconX - 2, iconY - 5);
    ctx.moveTo(iconX + 2, iconY - 5);
    ctx.lineTo(iconX + 6, iconY - 1);
    ctx.stroke();
    ctx.restore();

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `800 ${compact ? 8.1 : 10}px 'Noto Serif', 'Noto Serif KR', 'Noto Serif JP', serif`;
    ctx.fillStyle = "#fff0c2";
    ctx.fillText("GIAO TRANH", left + (compact ? 27 : 32), iconY);

    ctx.textAlign = "left";
    ctx.font = `700 ${compact ? 4.8 : 5.8}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255, 232, 175, .72)";
    ctx.fillText("TRẬN ĐẤU THỜI GIAN THỰC", left + (compact ? 27 : 32), top + headerHeight - 5);

    const timerWidth = compact ? 48 : 58;
    const timerX = left + panelWidth - timerWidth - 5;
    ctx.fillStyle = "rgba(4, 10, 16, .78)";
    ctx.beginPath();
    ctx.roundRect(timerX, top + 5, timerWidth, headerHeight - 10, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 211, 106, .82)";
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = `800 ${compact ? 7 : 8}px ui-monospace, monospace`;
    ctx.fillStyle = "#ffe08a";
    ctx.fillText(formatTime(rem), timerX + timerWidth / 2, iconY);

    const drawBattleSide = (
      sideX: number,
      label: string,
      tone: string,
      hp: number,
      maxHp: number,
      troops: number,
      power: number,
    ) => {
      const sideY = bodyTop;
      const sideH = panelHeight - headerHeight - footerHeight - 8;
      const sideGradient = ctx.createLinearGradient(0, sideY, 0, sideY + sideH);
      if (tone === attackTone) {
        sideGradient.addColorStop(0, "rgba(137, 40, 43, .4)");
        sideGradient.addColorStop(1, "rgba(54, 17, 24, .72)");
      } else {
        sideGradient.addColorStop(0, "rgba(28, 101, 147, .42)");
        sideGradient.addColorStop(1, "rgba(10, 37, 61, .76)");
      }
      ctx.fillStyle = sideGradient;
      ctx.beginPath();
      ctx.roundRect(sideX, sideY, sideWidth, sideH, 7);
      ctx.fill();
      ctx.strokeStyle = tone;
      ctx.globalAlpha = 0.58;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.arc(sideX + 7, sideY + 7, 2.4, 0, TAU);
      ctx.fill();
      ctx.textAlign = "left";
      ctx.font = `900 ${compact ? 6.3 : 7.4}px system-ui, sans-serif`;
      ctx.fillStyle = tone === attackTone ? "#ffb2a7" : "#b8e1ff";
      ctx.fillText(label === "PHÒNG THỦ" ? (compact ? "THỦ" : label) : label, sideX + 13, sideY + 7);
      ctx.textAlign = "right";
      ctx.font = `900 ${compact ? 6.1 : 7.2}px system-ui, sans-serif`;
      ctx.fillStyle = "#f9e7b0";
      ctx.fillText(
        formatStat(power),
        sideX + sideWidth - 5,
        sideY + 7,
      );
      ctx.fillStyle = "rgba(255, 231, 170, .56)";
      ctx.font = `700 ${compact ? 4.2 : 5}px system-ui, sans-serif`;
      ctx.fillText("LỰC", sideX + sideWidth - 5, sideY + 13);
      drawBattleBar(
        sideX + 5,
        sideY + (compact ? 17 : 19),
        sideWidth - 10,
        hp / maxHp,
        tone,
        compact ? 6 : 7,
      );
      const statY = sideY + sideH - (compact ? 6 : 7);
      ctx.textAlign = "left";
      ctx.font = `800 ${compact ? 4.9 : 5.8}px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(238, 244, 247, .94)";
      ctx.fillText(`QUÂN ${formatStat(troops)}`, sideX + 5, statY);
      ctx.textAlign = "right";
      ctx.fillStyle = tone === attackTone ? "#ffb2a7" : "#b8e1ff";
      ctx.fillText(
        `${Math.round((hp / maxHp) * 100)}% HP`,
        sideX + sideWidth - 5,
        statY,
      );
    };

    drawBattleSide(
      leftSide,
      "CÔNG",
      attackTone,
      attackersHp,
      attackersMax,
      attackerTroops,
      attackerPower,
    );
    drawBattleSide(
      rightSide,
      fortificationMax > 0 ? "THỦ + THÀNH" : "PHÒNG THỦ",
      defendTone,
      defenderHp + fortificationHp,
      defenderMax + fortificationMax,
      defenderTroops,
      defenderPower,
    );

    // Compact VS seal separates both cards without an extra column.
    const vsY = bodyTop +
      (panelHeight - headerHeight - footerHeight - 8) / 2;
    ctx.fillStyle = "rgba(5, 12, 19, .98)";
    ctx.beginPath();
    ctx.arc(0, vsY, compact ? 7 : 8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(241, 187, 72, .9)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = `900 ${compact ? 5.8 : 6.6}px system-ui, sans-serif`;
    ctx.fillStyle = "#ffe19a";
    ctx.fillText("VS", 0, vsY + 0.3);

    // Live-state footer: the progress track is separated from the copy so the
    // timer and the “units engaged” message never fight for the same baseline.
    const footerY = top + panelHeight - footerHeight / 2 + 1;
    const progressTrackX = left + 7;
    const progressTrackW = panelWidth - 14;
    const progressTrackY = top + panelHeight - footerHeight + 2;
    ctx.fillStyle = "rgba(0, 0, 0, .56)";
    ctx.beginPath();
    ctx.roundRect(progressTrackX, progressTrackY, progressTrackW, 3, 2);
    ctx.fill();
    const dur = Math.max(1, lead.duration ?? lead.durationSeconds ?? 25);
    const progress = Math.max(0, Math.min(1, rem / dur));
    const progressGradient = ctx.createLinearGradient(
      progressTrackX,
      0,
      progressTrackX + progressTrackW,
      0,
    );
    progressGradient.addColorStop(0, "#e5534d");
    progressGradient.addColorStop(1, "#f4c65d");
    ctx.fillStyle = progressGradient;
    ctx.beginPath();
    ctx.roundRect(
      progressTrackX,
      progressTrackY,
      Math.max(3, progressTrackW * progress),
      3,
      2,
    );
    ctx.fill();

    ctx.fillStyle = `rgba(239, 68, 68, ${0.65 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(-(compact ? 57 : 73), footerY, 1.7, 0, TAU);
    ctx.fill();
    ctx.font = `800 ${compact ? 5.5 : 6.4}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255, 224, 151, .9)";
    ctx.fillText(
      `${engagedCount} ĐẠO QUÂN ĐANG THAM CHIẾN`,
      compact ? 4 : 5,
      footerY,
    );
    ctx.restore();
  }

  function drawSourceSiegeOverlay(
    x: number,
    y: number,
    participant: any,
    battle: any,
  ) {
    const sourceMax = Math.max(
      1,
      Number(participant.maxHp ?? participant.power ?? 1),
    );
    const sourceHp = Math.max(0, Number(participant.currentHp ?? sourceMax));
    const remainingTroops = Math.max(
      0,
      Math.round((Number(participant.troops || 0) * sourceHp) / sourceMax),
    );
    const defenderMax = Math.max(
      1,
      Number(battle.defenderMaxHp ?? battle.defenderPower ?? 1),
    );
    const defenderHp = Math.max(
      0,
      Number(battle.defenderCurrentHp ?? defenderMax),
    );
    const compact = fastRenderMode || state.zoom < 0.58;
    const visualScale = siegeVisualScale();
    const panelWidth = compact ? 76 : 84;
    const panelHeight = compact ? 25 : 28;
    const top = -(compact ? 45 : 52);
    const groupWidth = (panelWidth - 17) / 2;
    const beacon =
      0.72 +
      Math.sin(state.tick * 5 + Number(participant.sourceTerritoryId || 0)) *
        0.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(visualScale, visualScale);
    ctx.fillStyle = "rgba(8, 16, 22, .9)";
    ctx.strokeStyle = "rgba(221, 171, 72, .82)";
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.roundRect(-panelWidth / 2, top - 8, panelWidth, panelHeight, 4);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = beacon;
    ctx.fillStyle = "#f4b443";
    ctx.beginPath();
    ctx.moveTo(-4, top - 8);
    ctx.quadraticCurveTo(0, top - 20, 4, top - 8);
    ctx.quadraticCurveTo(0, top - 3, -4, top - 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    const leftX = -panelWidth / 2 + 5;
    const rightX = 3;
    const barY = top + 4;
    drawBattleBar(leftX, barY, groupWidth, sourceHp / sourceMax, "#d25743", 4);
    drawBattleBar(
      rightX,
      barY,
      groupWidth,
      defenderHp / defenderMax,
      "#438bc2",
      4,
    );
    ctx.textAlign = "center";
    ctx.font = `700 ${compact ? 5.4 : 5.9}px 'Noto Serif', 'Noto Serif KR', 'Noto Serif JP', serif`;
    ctx.fillStyle = "#f0cb71";
    ctx.fillText(`QUÂN ${remainingTroops}`, leftX + groupWidth / 2, top + 15);
    ctx.fillStyle = "#b9dcf7";
    ctx.fillText(
      `THỦ ${Math.ceil(defenderHp)}`,
      rightX + groupWidth / 2,
      top + 15,
    );
    ctx.restore();
  }
  function drawShip(s, i) {
    const bob = Math.sin(state.tick * 2 + i) * 3;
    const x = s.x + Math.sin(state.tick * 0.25 + i) * 6;
    const y = s.y + bob;
    pxRect(x - 18, y + 16, 36, 6, "rgba(0,0,0,0.3)");
    pxRect(x - 18, y + 8, 36, 10, "#4a2912");
    pxRect(x - 14, y + 15, 28, 5, "#291508");
    pxRect(x - 20, y + 6, 8, 4, "#6b3d1d");
    pxRect(x - 2, y - 22, 4, 32, "#331c0c");
    pxRect(x + 3, y - 18, 22, 16, "#f4ebd2");
    pxRect(x + 5, y - 16, 18, 12, "#ffffff");
    pxRect(x - 16, y - 6, 16, 14, "#e8dcbe");
    pxRect(x + 4, y - 27, 16, 9, s.team);
    pxRect(x + 16, y - 24, 5, 4, s.team);
  }

  function drawDualFlagBattle(
    x: number,
    y: number,
    attackerOwner: number,
    defenderOwner: number,
    territoryId?: number,
  ) {
    // Retired renderer. Kept temporarily for save/build compatibility; all
    // siege presentation is owned by drawActiveBattleConnections.
    return;
    ctx.save();
    const localFlagColor = state.newbieFlagColor || "#ef4444";
    const attColor =
      attackerOwner === 0
        ? localFlagColor
        : factions[attackerOwner]?.color || "#ef4444";
    const defColor =
      territoryId != null && state.regionOwnerFlagColors?.[territoryId]
        ? state.regionOwnerFlagColors[territoryId]
        : factions[defenderOwner]?.color || "#3b82f6";

    const attEmblem =
      attackerOwner === 0
        ? state.newbieEmblem
        : territoryId != null
          ? state.regionOwnerEmblems?.[territoryId] || "crown"
          : "crown";
    const defEmblem =
      territoryId != null && state.regionOwnerEmblems?.[territoryId]
        ? state.regionOwnerEmblems[territoryId]
        : "shield";

    const animPulse = Math.sin(state.tick * 8) * 3;
    const by = y - 90 + animPulse;
    const CX = x;

    // ─── 1. BATTLEFIELD GROUND FIRE & SHOCKWAVE AURA ──────────────────────────
    const wT = Math.max(0, (((state.tick * 1.8) % 1) + 1) % 1);
    ctx.save();
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 24;
    ctx.strokeStyle = `rgba(239, 68, 68, ${(1 - wT) * 0.9})`;
    ctx.lineWidth = Math.max(0.1, 4 * (1 - wT));
    ctx.beginPath();
    ctx.ellipse(
      CX,
      y + 10,
      Math.max(2, wT * 64),
      Math.max(1, wT * 32),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();

    // ─── 2. BATTLEFIELD SMOKE PUFFS (Bốc khói chiến trường) ───────────────────
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + state.tick * 0.4;
      const t = Math.max(0, (((state.tick * 0.9 + i * 0.2) % 1) + 1) % 1);
      const smokeAlpha = (1 - t) * 0.45;
      ctx.fillStyle = `rgba(50, 45, 40, ${smokeAlpha})`;
      ctx.beginPath();
      ctx.arc(
        CX + Math.cos(angle) * t * 32,
        by - 10 + Math.sin(angle) * t * 20 - t * 15,
        Math.max(0, 5 + t * 16),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // ─── 3. CLASHING ANIMATED SWORDS WITH RECOIL (Thanh kiếm nảy va chạm) ─────
    const impactRecoil = Math.abs(Math.sin(state.tick * 12)) * 0.15;
    for (const dir of [1]) {
      ctx.save();
      ctx.translate(CX, by - 12);
      ctx.rotate(dir * (0.58 + impactRecoil));

      // Blade steel
      pxRect(-36, -3, 72, 6, "#e2e8f0");
      pxRect(-36, -3, 72, 2, "#ffffff");
      // Crossguard gold
      pxRect(18, -8, 5, 16, "#fbbf24");
      // Handle wood
      pxRect(23, -2.5, 11, 5, "#451a03");
      // Pommel gold
      pxRect(34, -4, 5, 8, "#d97706");
      ctx.restore();
    }

    // ─── 4. SPARK & FIRE EMBERS (Tóe đốm lửa chiến tranh) ─────────────────────
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - state.tick * 2.2;
      const t = Math.max(0, (((state.tick * 3.2 + i * 0.12) % 1) + 1) % 1);
      const sz = Math.max(1, (1 - t) * 6);
      const col =
        t < 0.25
          ? "#ffffff"
          : t < 0.5
            ? "#fef08a"
            : t < 0.75
              ? "#f97316"
              : "#dc2626";
      pxRect(
        CX + Math.cos(angle) * t * 42 - sz / 2,
        by - 12 + Math.sin(angle) * t * 32 - sz / 2,
        sz,
        sz,
        col,
      );
    }

    // ─── 5. UNIVERSAL RTS MULTI-PLAYER COMBAT CREST & TIMER BADGE ───────────
    if (territoryId !== undefined) {
      const activeBattle = state.activeBattles?.find(
        (b: any) => Number(b.regionId) === Number(territoryId),
      );
      const conflict = getRegionBattleState(territoryId);
      const remSec = activeBattle?.resolvesAt
        ? Math.max(
            0,
            Math.ceil(
              (new Date(activeBattle.resolvesAt).getTime() - Date.now()) / 1000,
            ),
          )
        : (conflict?.remainingSec ?? 15);

      const attPwr =
        activeBattle?.attPower ?? activeBattle?.attackerPower ?? 1200;
      const defPwr =
        activeBattle?.defPower ?? activeBattle?.defenderPower ?? 800;
      const attMaxHp = Math.max(1, activeBattle?.attackerMaxHp ?? attPwr);
      const defMaxHp = Math.max(1, activeBattle?.defenderMaxHp ?? defPwr);
      const attHp = Math.max(
        0,
        Math.min(attMaxHp, activeBattle?.attackerCurrentHp ?? attMaxHp),
      );
      const defHp = Math.max(
        0,
        Math.min(defMaxHp, activeBattle?.defenderCurrentHp ?? defMaxHp),
      );
      const attackerLabel =
        activeBattle?.attackerId === state.localPlayerId ? "BẠN" : "CÔNG";
      const defenderLabel =
        activeBattle?.defenderId === state.localPlayerId ? "BẠN" : "THỦ";

      const formatPwr = (val: number) =>
        val >= 1000 ? (val / 1000).toFixed(1) + "k" : String(val);

      const bw = 154;
      const bh = 40;
      const bx = CX - bw / 2;
      const byPos = by - 58;

      // Outer metallic dark slate badge with gold trim
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = 10;

      // Dark slate background
      ctx.fillStyle = "#090d16";
      ctx.beginPath();
      ctx.roundRect(bx, byPos, bw, bh, 5);
      ctx.fill();

      // Inner slate accent fill
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.roundRect(bx + 2, byPos + 2, bw - 4, bh - 4, 3.5);
      ctx.fill();

      // Server-authoritative attacker and defender health.
      ctx.fillStyle = "rgba(0,0,0,.72)";
      ctx.fillRect(bx + 7, byPos + 21, 66, 5);
      ctx.fillRect(bx + bw - 73, byPos + 21, 66, 5);
      ctx.fillStyle = "#e05243";
      ctx.fillRect(bx + 7, byPos + 21, 66 * (attHp / attMaxHp), 5);
      ctx.fillStyle = "#3b8edb";
      ctx.fillRect(bx + bw - 73, byPos + 21, 66 * (defHp / defMaxHp), 5);

      // Battle countdown indicator along the bottom.
      const dur = activeBattle?.duration || activeBattle?.durationSeconds || 25;
      const progress = Math.max(0, Math.min(1, remSec / dur));
      const barW = (bw - 6) * progress;
      ctx.fillStyle = "rgba(220, 38, 38, 0.85)";
      ctx.fillRect(bx + 3, byPos + bh - 4, Math.max(2, barW), 2);

      // Gold frame border
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(bx, byPos, bw, bh, 5);
      ctx.stroke();
      ctx.restore();

      // Line 1: Coalition Power Comparison (Attacker vs Defender)
      const pwrText = `${formatPwr(attPwr)}  VS  ${formatPwr(defPwr)}`;
      text(pwrText, CX, byPos + 4, 10, "#ffffff", "center");
      text(
        `${attackerLabel} ${Math.round((attHp / attMaxHp) * 100)}%`,
        bx + 40,
        byPos + 13,
        8,
        "#fca5a5",
        "center",
      );
      text(
        `${defenderLabel} ${Math.round((defHp / defMaxHp) * 100)}%`,
        bx + bw - 40,
        byPos + 13,
        8,
        "#93c5fd",
        "center",
      );

      // Line 2: Countdown Timer
      const timerText = `GIAO TRANH: ${remSec}s`;
      text(timerText, CX, byPos + 29, 9, "#fef08a", "center");
    }

    ctx.restore();
  }

  function drawTroopFootRing(x: number, y: number, color: string) {
    ctx.save();
    const ringColor = color || "#2563eb";

    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.beginPath();
    ctx.ellipse(x, y + 2.5, 16, 4.2, 0, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 17, 4.8, 0, 0, TAU);
    ctx.stroke();

    ctx.globalAlpha = 0.58;
    ctx.strokeStyle = "#e9c66b";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 14.5, 3.6, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // ─── SHARED: golden medallion base ──────────────────────────────────────────

  // ─── SHARED MEDALLION BACKDROP (Exactly matching the premium vector style) ───

  // drawTroopMedallion has been removed as we only show the foot ring effect under their feet now.

  function drawLegacyPixelInfantry(
    x: number,
    y: number,
    color: string,
    emblem = "crown",
  ) {
    ctx.save();

    // Draw 3D glowing foot ring effect under their feet
    drawTroopFootRing(x, y, color);

    // 1. Large Waving Flag with Player Emblem in the background
    const wave = Math.sin(state.tick * 6) * 1.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 27 + wave);
    ctx.bezierCurveTo(
      x + 2,
      y - 33 + wave,
      x + 10,
      y - 21 + wave,
      x + 20,
      y - 28 + wave,
    );
    ctx.lineTo(x + 20, y - 12 + wave);
    ctx.bezierCurveTo(
      x + 10,
      y - 5 + wave,
      x + 2,
      y - 17 + wave,
      x - 8,
      y - 11 + wave,
    );
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Emblem on Flag
    drawFlagEmblem(x + 5, y - 20 + wave, emblem, 0.65);

    // 2. Spear/Flagpole (Vertical on the left side)
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x - 9, y + 10);
    ctx.lineTo(x - 9, y - 31);
    ctx.stroke();

    // Spear tip (white diamond)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 31);
    ctx.lineTo(x - 7, y - 26);
    ctx.lineTo(x - 11, y - 26);
    ctx.closePath();
    ctx.fill();

    // 3. Legs
    const stepAnim = Math.sin(state.tick * 9);
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(x - 5 + stepAnim * 1.5, y + 4, 3.5, 7, 1);
    ctx.roundRect(x + 1.5 - stepAnim * 1.5, y + 4, 3.5, 7, 1);
    ctx.fill();

    // 4. Knight Torso
    ctx.fillStyle = "#94a3b8"; // grey steel
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 6, 8, 0, 0, TAU);
    ctx.fill();

    // Shoulders
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.arc(x - 6, y - 4, 3.8, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 6, y - 4, 3.8, 0, TAU);
    ctx.fill();

    // Head/Helmet
    ctx.fillStyle = "#cbd5e1"; // lighter steel highlight
    ctx.beginPath();
    ctx.arc(x, y - 12, 4.8, 0, TAU);
    ctx.fill();
    ctx.fillRect(x - 4.8, y - 12, 9.6, 6);

    // Helmet visor line
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y - 7);
    ctx.stroke();

    // 5. Shield in foreground (Lower right)
    ctx.fillStyle = color;
    ctx.strokeStyle = "#fbbf24"; // golden border
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 5);
    ctx.lineTo(x + 11, y - 5);
    ctx.lineTo(x + 11, y + 2);
    ctx.quadraticCurveTo(x + 11, y + 8, x + 6.5, y + 11);
    ctx.quadraticCurveTo(x + 2, y + 8, x + 2, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden cross emblem on shield
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 6.5, y - 3);
    ctx.lineTo(x + 6.5, y + 9);
    ctx.moveTo(x + 4, y + 2);
    ctx.lineTo(x + 9, y + 2);
    ctx.stroke();

    ctx.restore();
  }

  function drawLegacyPixelCavalry(
    x: number,
    y: number,
    color: string,
    emblem = "crown",
  ) {
    ctx.save();

    // Draw 3D glowing foot ring effect under their feet
    drawTroopFootRing(x, y, color);

    const bob = Math.sin(state.tick * 6) * 1.2;
    const legAnim = Math.sin(state.tick * 9) * 2.5;

    // 1. Flowing Horse Tail
    ctx.strokeStyle = "#1c0a01";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 2 + bob);
    ctx.quadraticCurveTo(x + 18, y + 4 + bob, x + 16, y + 12 + bob);
    ctx.stroke();

    // 2. Horse Legs (Realistic bending legs with hooves)
    ctx.fillStyle = "#5c2f17";
    // Back legs
    ctx.beginPath();
    ctx.roundRect(x + 5 + legAnim, y + 5 + bob, 3.5, 8, 1);
    ctx.roundRect(x + 9 - legAnim, y + 5 + bob, 3.5, 8, 1);
    // Front legs
    ctx.roundRect(x - 10 - legAnim, y + 5 + bob, 3.5, 8, 1);
    ctx.roundRect(x - 6 + legAnim, y + 5 + bob, 3.5, 8, 1);
    ctx.fill();

    // Hooves (black)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x + 5 + legAnim, y + 11 + bob, 3.5, 2);
    ctx.fillRect(x + 9 - legAnim, y + 11 + bob, 3.5, 2);
    ctx.fillRect(x - 10 - legAnim, y + 11 + bob, 3.5, 2);
    ctx.fillRect(x - 6 + legAnim, y + 11 + bob, 3.5, 2);

    // 3. Horse Main Body (Sleek 3D Gradient)
    const hb = ctx.createLinearGradient(
      x - 14,
      y - 2 + bob,
      x + 14,
      y + 6 + bob,
    );
    hb.addColorStop(0, "#9a3412");
    hb.addColorStop(0.6, "#7c2d12");
    hb.addColorStop(1, "#431407");
    ctx.fillStyle = hb;
    ctx.beginPath();
    ctx.ellipse(x - 1, y + 1 + bob, 14, 7.5, 0, 0, TAU);
    ctx.fill();

    // 4. Horse Neck & Head (Facing Left)
    ctx.fillStyle = "#7c2d12";
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 2 + bob);
    ctx.bezierCurveTo(
      x - 14,
      y - 4 + bob,
      x - 17,
      y - 10 + bob,
      x - 13,
      y - 14 + bob,
    );
    ctx.lineTo(x - 7, y - 8 + bob);
    ctx.closePath();
    ctx.fill();

    // Horse Head
    ctx.beginPath();
    ctx.ellipse(x - 14, y - 12 + bob, 5.5, 3.8, -0.4, 0, TAU);
    ctx.fill();

    // Horse Ear
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 15 + bob);
    ctx.lineTo(x - 14, y - 19 + bob);
    ctx.lineTo(x - 10, y - 16 + bob);
    ctx.closePath();
    ctx.fill();

    // Horse Eye & Nose
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(x - 16, y - 13 + bob, 1.2, 0, TAU);
    ctx.fill();

    // Horse Mane
    ctx.fillStyle = "#1c0a01";
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 16 + bob);
    ctx.quadraticCurveTo(x - 14, y - 8 + bob, x - 9, y - 1 + bob);
    ctx.lineTo(x - 7, y - 3 + bob);
    ctx.closePath();
    ctx.fill();

    // 5. Saddle Caparison (Colored trim over horse back)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 2 + bob, 12, 6, 1.5);
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // 6. Mounted Knight Rider
    // Rider Legs (Grip on saddle)
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(x - 3, y + 1 + bob, 6, 6, 1);
    ctx.fill();

    // Rider Torso (Armor in faction color)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - 4.5, y - 10 + bob, 9, 10, 2);
    ctx.fill();

    // Shoulder Pauldrons (Grey metal)
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.arc(x - 5, y - 8 + bob, 3.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 5, y - 8 + bob, 3.2, 0, TAU);
    ctx.fill();

    // Rider Helmet (Sleek metallic cylinder/visor)
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.arc(x, y - 15 + bob, 4.5, 0, TAU);
    ctx.fill();
    ctx.fillRect(x - 4.5, y - 15 + bob, 9, 5);

    // Helmet visor (Dark slit)
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 14 + bob);
    ctx.lineTo(x + 2, y - 14 + bob);
    ctx.stroke();

    // Helmet Plume / Crest (Faction color)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 19 + bob);
    ctx.bezierCurveTo(
      x - 4,
      y - 23 + bob,
      x + 4,
      y - 24 + bob,
      x + 2,
      y - 19 + bob,
    );
    ctx.closePath();
    ctx.fill();

    // 7. Knight's Lance & Waving Flag (Diagonal Spear with Banner)
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 12 + bob);
    ctx.lineTo(x + 16, y - 20 + bob);
    ctx.stroke();

    // Spearhead Tip (White diamond)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 20 + bob);
    ctx.lineTo(x + 19, y - 24 + bob);
    ctx.lineTo(x + 17, y - 26 + bob);
    ctx.lineTo(x + 14, y - 22 + bob);
    ctx.closePath();
    ctx.fill();

    // Large Waving Banner on top of Lance with Player Emblem
    const wave = Math.sin(state.tick * 6) * 1.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + 10, y - 19 + bob);
    ctx.bezierCurveTo(
      x + 16,
      y - 26 + bob + wave,
      x + 24,
      y - 14 + bob + wave,
      x + 30,
      y - 21 + bob + wave,
    );
    ctx.lineTo(x + 30, y - 10 + bob + wave);
    ctx.bezierCurveTo(
      x + 24,
      y - 3 + bob + wave,
      x + 16,
      y - 15 + bob + wave,
      x + 10,
      y - 8 + bob,
    );
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Emblem on Cavalry Flag
    drawFlagEmblem(x + 20, y - 15 + bob + wave, emblem, 0.65);

    ctx.restore();
  }

  function drawLegacyPixelArtillery(
    x: number,
    y: number,
    color: string,
    emblem = "crown",
  ) {
    ctx.save();

    // Draw 3D glowing foot ring effect under their feet
    drawTroopFootRing(x, y, color);

    const recoil = Math.sin(state.tick * 6) * 1.5;

    // 1. Large Waving flag/banner at the top with Player Emblem
    const wave = Math.sin(state.tick * 5) * 1.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 27 + wave);
    ctx.bezierCurveTo(
      x,
      y - 33 + wave,
      x + 8,
      y - 21 + wave,
      x + 18,
      y - 28 + wave,
    );
    ctx.lineTo(x + 18, y - 12 + wave);
    ctx.bezierCurveTo(
      x + 8,
      y - 5 + wave,
      x,
      y - 17 + wave,
      x - 10,
      y - 11 + wave,
    );
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Emblem on Artillery Flag
    drawFlagEmblem(x + 3, y - 20 + wave, emblem, 0.65);

    // Flagpole for flag
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x - 11, y + 4);
    ctx.lineTo(x - 11, y - 30);
    ctx.stroke();

    // Spearhead tip on flagpole
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 33);
    ctx.lineTo(x - 9, y - 29);
    ctx.lineTo(x - 13, y - 29);
    ctx.closePath();
    ctx.fill();

    // 2. Carriage (Wooden frame)
    ctx.fillStyle = "#78350f";
    ctx.beginPath();
    ctx.roundRect(x - 13, y + 1, 26, 7, 1.5);
    ctx.fill();

    // 3. Cannon Barrel (Golden brass pointing up-left)
    ctx.save();
    ctx.translate(x, y - 2);
    ctx.rotate(-0.35); // tilt up-left

    const goldGrad = ctx.createLinearGradient(0, -4, 0, 4);
    goldGrad.addColorStop(0, "#ffe066");
    goldGrad.addColorStop(0.5, "#f59e0b");
    goldGrad.addColorStop(1, "#b45309");
    ctx.fillStyle = goldGrad;

    // Barrel cylinder
    ctx.beginPath();
    ctx.roundRect(-12, -4, 20, 8, 2);
    ctx.fill();

    // Rear ball knob (breech)
    ctx.beginPath();
    ctx.arc(-12, 0, 3.5, 0, TAU);
    ctx.fill();

    // Muzzle ring (front)
    ctx.beginPath();
    ctx.roundRect(8, -5, 2.5, 10, 0.8);
    ctx.fill();

    ctx.restore();

    // 4. Wheel in the foreground
    const wx = x;
    const wy = y + 5;
    const wr = 7.5;

    // Outer wheel ring
    ctx.fillStyle = "#64748b";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(wx, wy, wr, 0, TAU);
    ctx.fill();
    ctx.stroke();

    // Inner dark disc
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(wx, wy, wr - 1.5, 0, TAU);
    ctx.fill();

    // White spokes (+ pattern)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(wx - wr + 1.5, wy);
    ctx.lineTo(wx + wr - 1.5, wy);
    ctx.moveTo(wx, wy - wr + 1.5);
    ctx.lineTo(wx, wy + wr - 1.5);
    ctx.stroke();

    // Hub
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(wx, wy, 1.8, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  function drawMapStandard(
    x: number,
    y: number,
    color: string,
    emblem: string,
    scale = 0.42,
  ) {
    const wave = Math.sin(state.tick * 5) * 1.1;
    ctx.strokeStyle = "#5b3719";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 11);
    ctx.lineTo(x, y - 29);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 28);
    ctx.quadraticCurveTo(x + 10, y - 31 + wave, x + 18, y - 27);
    ctx.lineTo(x + 16, y - 14);
    ctx.quadraticCurveTo(x + 9, y - 18 + wave, x + 1, y - 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#e7bd5e";
    ctx.lineWidth = 1;
    ctx.stroke();
    drawFlagEmblem(x + 9, y - 22 + wave * 0.4, emblem, scale);
  }

  function drawPixelInfantry(
    x: number,
    y: number,
    color: string,
    emblem = "crown",
  ) {
    ctx.save();
    drawTroopFootRing(x, y, color);

    const walk = Math.sin(state.tick * 9);
    const bob = Math.sin(state.tick * 9) * 0.7;
    const dark = getDarkerColor(color);
    drawMapStandard(x - 11, y - 1 + bob, color, emblem);

    // Pike and steel spearhead.
    ctx.strokeStyle = "#a87a3f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 12);
    ctx.lineTo(x + 16, y - 29);
    ctx.stroke();
    ctx.fillStyle = "#eef1e8";
    ctx.strokeStyle = "#667681";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 29);
    ctx.lineTo(x + 20, y - 36);
    ctx.lineTo(x + 20, y - 27);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Marching boots and mail skirt.
    ctx.fillStyle = "#211a16";
    ctx.fillRect(x - 6 + walk * 1.2, y + 5, 5, 9);
    ctx.fillRect(x + 2 - walk * 1.2, y + 5, 5, 9);
    ctx.fillStyle = "#080b0e";
    ctx.fillRect(x - 8 + walk * 1.2, y + 12, 7, 3);
    ctx.fillRect(x + 1 - walk * 1.2, y + 12, 8, 3);
    ctx.fillStyle = "#465761";
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 4 + bob);
    ctx.lineTo(x + 8, y - 4 + bob);
    ctx.lineTo(x + 10, y + 8 + bob);
    ctx.lineTo(x - 10, y + 8 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#aab4b5";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Heraldic tabard over plate.
    const tabard = ctx.createLinearGradient(x - 7, y - 5, x + 7, y + 8);
    tabard.addColorStop(0, color);
    tabard.addColorStop(1, dark);
    ctx.fillStyle = tabard;
    ctx.fillRect(x - 7, y - 5 + bob, 14, 13);
    ctx.strokeStyle = "#e8c461";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 7, y - 5 + bob, 14, 13);
    ctx.strokeStyle = "#f0cf72";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y - 4 + bob);
    ctx.lineTo(x, y + 7 + bob);
    ctx.moveTo(x - 5, y + 1 + bob);
    ctx.lineTo(x + 5, y + 1 + bob);
    ctx.stroke();

    // Plate shoulders.
    const steel = ctx.createLinearGradient(x - 10, y - 10, x + 10, y);
    steel.addColorStop(0, "#edf0e6");
    steel.addColorStop(0.45, "#8b9aa2");
    steel.addColorStop(1, "#34444f");
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.ellipse(x - 8, y - 5 + bob, 5, 3.4, -0.2, 0, TAU);
    ctx.ellipse(x + 8, y - 5 + bob, 5, 3.4, 0.2, 0, TAU);
    ctx.fill();

    // Armet helmet with visor.
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 18 + bob);
    ctx.quadraticCurveTo(x, y - 25 + bob, x + 6, y - 18 + bob);
    ctx.lineTo(x + 5, y - 9 + bob);
    ctx.quadraticCurveTo(x, y - 6 + bob, x - 5, y - 9 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#e8d69a";
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.fillStyle = "#11181d";
    ctx.fillRect(x - 5, y - 16 + bob, 10, 3);
    ctx.strokeStyle = "#7f9099";
    ctx.lineWidth = 0.7;
    for (let i = -3; i <= 3; i += 3) {
      ctx.beginPath();
      ctx.moveTo(x + i, y - 16 + bob);
      ctx.lineTo(x + i, y - 13 + bob);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 23 + bob);
    ctx.quadraticCurveTo(x + 6, y - 31 + bob, x + 12, y - 24 + bob);
    ctx.quadraticCurveTo(x + 5, y - 25 + bob, x + 1, y - 20 + bob);
    ctx.closePath();
    ctx.fill();

    // Kite shield in the foreground.
    ctx.fillStyle = color;
    ctx.strokeStyle = "#efca67";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 5 + bob);
    ctx.lineTo(x + 15, y - 4 + bob);
    ctx.lineTo(x + 14, y + 5 + bob);
    ctx.quadraticCurveTo(x + 10, y + 12 + bob, x + 5, y + 14 + bob);
    ctx.quadraticCurveTo(x + 2, y + 5 + bob, x + 4, y - 5 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#f5d878";
    ctx.beginPath();
    ctx.moveTo(x + 9, y - 2 + bob);
    ctx.lineTo(x + 9, y + 9 + bob);
    ctx.moveTo(x + 5, y + 3 + bob);
    ctx.lineTo(x + 13, y + 3 + bob);
    ctx.stroke();
    ctx.restore();
  }

  function drawPixelCavalry(
    x: number,
    y: number,
    color: string,
    emblem = "crown",
  ) {
    ctx.save();
    drawTroopFootRing(x, y, color);
    const bob = Math.sin(state.tick * 7) * 1.1;
    const gallop = Math.sin(state.tick * 10) * 2.2;
    const dark = getDarkerColor(color);

    // Horse legs and hooves.
    ctx.strokeStyle = "#4a2a18";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    [
      [-10, gallop],
      [-4, -gallop],
      [8, -gallop],
      [13, gallop],
    ].forEach(([dx, kick]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + 5 + bob);
      ctx.lineTo(x + dx + kick * 0.55, y + 14 + bob);
      ctx.stroke();
    });
    ctx.strokeStyle = "#11100f";
    ctx.lineWidth = 2.4;
    [
      [-10, gallop],
      [-4, -gallop],
      [8, -gallop],
      [13, gallop],
    ].forEach(([dx, kick]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx + kick * 0.55 - 1, y + 14 + bob);
      ctx.lineTo(x + dx + kick * 0.55 + 3, y + 14 + bob);
      ctx.stroke();
    });

    const horse = ctx.createLinearGradient(x - 18, y - 10, x + 18, y + 10);
    horse.addColorStop(0, "#b47444");
    horse.addColorStop(0.55, "#6c3d23");
    horse.addColorStop(1, "#2c180f");
    ctx.fillStyle = horse;
    ctx.beginPath();
    ctx.ellipse(x + 1, y + bob, 18, 8.5, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 12, y + bob);
    ctx.quadraticCurveTo(x - 19, y - 9 + bob, x - 16, y - 18 + bob);
    ctx.lineTo(x - 8, y - 13 + bob);
    ctx.lineTo(x - 4, y - 2 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - 18, y - 17 + bob, 7, 4.5, -0.25, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#1c110c";
    ctx.beginPath();
    ctx.moveTo(x - 13, y - 20 + bob);
    ctx.lineTo(x - 16, y - 28 + bob);
    ctx.lineTo(x - 10, y - 22 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 20, y - 18 + bob, 1.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#20120c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 1 + bob);
    ctx.quadraticCurveTo(x + 25, y + 4 + bob, x + 21, y + 13 + bob);
    ctx.stroke();

    // Barded caparison.
    const cloth = ctx.createLinearGradient(x - 11, y - 6, x + 14, y + 10);
    cloth.addColorStop(0, color);
    cloth.addColorStop(1, dark);
    ctx.fillStyle = cloth;
    ctx.strokeStyle = "#e8bf5d";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 5 + bob);
    ctx.lineTo(x + 14, y - 4 + bob);
    ctx.lineTo(x + 17, y + 9 + bob);
    ctx.lineTo(x - 9, y + 8 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#f1cf6d";
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 4 + bob);
    ctx.lineTo(x + 3, y + 8 + bob);
    ctx.moveTo(x - 7, y + 2 + bob);
    ctx.lineTo(x + 14, y + 2 + bob);
    ctx.stroke();

    // Armored rider.
    const steel = ctx.createLinearGradient(x - 8, y - 24, x + 10, y - 4);
    steel.addColorStop(0, "#f1f1e6");
    steel.addColorStop(0.4, "#8d9ca3");
    steel.addColorStop(1, "#32434d");
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 16 + bob);
    ctx.quadraticCurveTo(x, y - 21 + bob, x + 7, y - 15 + bob);
    ctx.lineTo(x + 9, y - 3 + bob);
    ctx.lineTo(x - 8, y - 3 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = cloth;
    ctx.fillRect(x - 5, y - 14 + bob, 11, 10);
    ctx.strokeStyle = "#e9c25d";
    ctx.strokeRect(x - 5, y - 14 + bob, 11, 10);
    ctx.fillStyle = steel;
    ctx.beginPath();
    ctx.arc(x, y - 23 + bob, 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#0a1014";
    ctx.fillRect(x - 5, y - 24 + bob, 10, 2.5);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 29 + bob);
    ctx.quadraticCurveTo(x + 7, y - 36 + bob, x + 13, y - 29 + bob);
    ctx.quadraticCurveTo(x + 7, y - 30 + bob, x + 1, y - 26 + bob);
    ctx.closePath();
    ctx.fill();

    // Couched lance and compact pennon.
    ctx.strokeStyle = "#d8ae58";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 9 + bob);
    ctx.lineTo(x + 25, y - 27 + bob);
    ctx.stroke();
    ctx.fillStyle = "#f3f3e9";
    ctx.beginPath();
    ctx.moveTo(x + 25, y - 27 + bob);
    ctx.lineTo(x + 30, y - 33 + bob);
    ctx.lineTo(x + 29, y - 24 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.strokeStyle = "#e9c05c";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 14, y - 19 + bob);
    ctx.lineTo(x + 28, y - 18 + bob);
    ctx.lineTo(x + 22, y - 9 + bob);
    ctx.lineTo(x + 10, y - 14 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawFlagEmblem(x + 20, y - 15 + bob, emblem, 0.3);
    ctx.restore();
  }

  function drawPixelArtillery(
    x: number,
    y: number,
    color: string,
    emblem = "crown",
  ) {
    ctx.save();
    drawTroopFootRing(x, y, color);
    const recoil = Math.max(0, Math.sin(state.tick * 4)) * 1.2;
    const dark = getDarkerColor(color);
    drawMapStandard(x - 14, y + 2, color, emblem, 0.36);

    // Gunner in a morion helmet.
    ctx.fillStyle = "#2c2119";
    ctx.fillRect(x - 15, y + 3, 4, 11);
    ctx.fillRect(x - 8, y + 3, 4, 11);
    const coat = ctx.createLinearGradient(x - 17, y - 8, x - 4, y + 6);
    coat.addColorStop(0, color);
    coat.addColorStop(1, dark);
    ctx.fillStyle = coat;
    ctx.fillRect(x - 17, y - 8, 14, 13);
    ctx.strokeStyle = "#e7bd5a";
    ctx.strokeRect(x - 17, y - 8, 14, 13);
    ctx.fillStyle = "#b9855c";
    ctx.beginPath();
    ctx.arc(x - 10, y - 14, 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#8e9ca2";
    ctx.beginPath();
    ctx.moveTo(x - 17, y - 16);
    ctx.quadraticCurveTo(x - 10, y - 24, x - 3, y - 16);
    ctx.lineTo(x - 4, y - 12);
    ctx.lineTo(x - 16, y - 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e3e5dd";
    ctx.fillRect(x - 19, y - 16, 18, 2);
    ctx.strokeStyle = "#8b5930";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 3);
    ctx.lineTo(x + 5, y + 2);
    ctx.stroke();

    // Bronze field gun and wooden carriage.
    ctx.save();
    ctx.translate(x + recoil, y - 1);
    ctx.rotate(-0.2);
    const bronze = ctx.createLinearGradient(-9, -5, 16, 5);
    bronze.addColorStop(0, "#6b421a");
    bronze.addColorStop(0.35, "#e0aa4f");
    bronze.addColorStop(0.58, "#fff0a0");
    bronze.addColorStop(1, "#704618");
    ctx.fillStyle = bronze;
    ctx.beginPath();
    ctx.roundRect(-8, -5, 27, 10, 2);
    ctx.fill();
    ctx.fillStyle = "#4c2c0f";
    ctx.beginPath();
    ctx.arc(-8, 0, 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#dca64a";
    ctx.fillRect(17, -6, 4, 12);
    ctx.restore();

    ctx.fillStyle = "#75441f";
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 3);
    ctx.lineTo(x + 19, y + 3);
    ctx.lineTo(x + 14, y + 11);
    ctx.lineTo(x - 5, y + 10);
    ctx.closePath();
    ctx.fill();

    [x + 1, x + 14].forEach((wx, index) => {
      const wy = y + 10 + index;
      ctx.fillStyle = "#17191a";
      ctx.strokeStyle = "#bd8942";
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.arc(wx, wy, 8, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#91a0a5";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wx - 6, wy);
      ctx.lineTo(wx + 6, wy);
      ctx.moveTo(wx, wy - 6);
      ctx.lineTo(wx, wy + 6);
      ctx.moveTo(wx - 4, wy - 4);
      ctx.lineTo(wx + 4, wy + 4);
      ctx.moveTo(wx + 4, wy - 4);
      ctx.lineTo(wx - 4, wy + 4);
      ctx.stroke();
      ctx.fillStyle = "#d6a34a";
      ctx.beginPath();
      ctx.arc(wx, wy, 2.1, 0, TAU);
      ctx.fill();
    });

    // Smoke only during the firing half of the idle cycle.
    const smoke = Math.max(0, Math.sin(state.tick * 2.2));
    if (smoke > 0.35) {
      ctx.globalAlpha = 0.24 + smoke * 0.22;
      ctx.fillStyle = "#dce1dc";
      [
        [25, -8, 5],
        [30, -14, 7],
        [36, -20, 9],
      ].forEach(([dx, dy, radius]) => {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, radius, 0, TAU);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  function drawVoyageShip(
    x,
    y,
    color,
    direction: MarchDirection = "E",
    motionPhase = 0,
    opacity = 1,
    architectureId?: string,
  ) {
    if (farSceneryRenderMode) {
      const markerScale = Math.min(
        8,
        Math.max(1, 0.42 / Math.max(0.05, state.zoom)),
      );
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(markerScale, markerScale);
      ctx.globalAlpha = opacity;
      ctx.fillStyle = "rgba(5, 18, 28, 0.94)";
      ctx.strokeStyle = "#d9b75f";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-10, -10, 20, 20, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-6, 4);
      ctx.lineTo(6, 4);
      ctx.lineTo(3, 8);
      ctx.lineTo(-4, 8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#f7e7b2";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(0, -7);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.restore();
      return true;
    }
    if (!nationUnitAtlasReady(nationUnitAtlases, "walk")) return false;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.28 * opacity;
    ctx.fillStyle = "#9adcf3";
    ctx.beginPath();
    ctx.ellipse(0, 17, 31, 7, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = opacity;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = fastRenderMode ? "low" : "high";
    drawNationShipSprite({
      ctx,
      atlases: nationUnitAtlases,
      x: 0,
      y: 20,
      size: 72,
      motionPhase: animateMarchingUnits ? motionPhase : 0,
      direction,
      architectureId,
    });
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 22, 2.6, 0, TAU);
    ctx.fill();
    ctx.restore();
    return true;
  }

  function voyageArchitecture(v: any) {
    if (v?.owner === 0 || v?.ownerId === state.localPlayerId) {
      return normalizeKingdomArchitecture(state.newbieArchitectureId);
    }
    const sourceRegionId = Number(v?.sourceRegionId);
    if (
      Number.isInteger(sourceRegionId) &&
      state.regionOwnerArchitectureIds[sourceRegionId]
    ) {
      return normalizeKingdomArchitecture(
        state.regionOwnerArchitectureIds[sourceRegionId],
      );
    }
    return kingdomArchitectureFromEmblem(v?.emblem || v?.ownerEmblem);
  }

  function drawArmyLodToken(
    hasInfantry: boolean,
    hasCavalry: boolean,
    hasArtillery: boolean,
    color: string,
  ) {
    drawTroopFootRing(0, 0, color);
    ctx.fillStyle = "rgba(8, 15, 21, 0.94)";
    ctx.strokeStyle = "#e4bd5e";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(-12, -15, 24, 22, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-9, -12);
    ctx.lineTo(9, -12);
    ctx.lineTo(7, 2);
    ctx.quadraticCurveTo(0, 9, -7, 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#f4d277";
    ctx.lineWidth = 1.6;
    if (hasCavalry) {
      ctx.beginPath();
      ctx.moveTo(-7, 1);
      ctx.quadraticCurveTo(-4, -8, 3, -5);
      ctx.lineTo(8, 2);
      ctx.moveTo(1, -5);
      ctx.lineTo(6, -10);
      ctx.stroke();
    } else if (hasArtillery) {
      ctx.beginPath();
      ctx.arc(-4, 2, 3.4, 0, TAU);
      ctx.arc(5, 2, 3.4, 0, TAU);
      ctx.moveTo(-6, -2);
      ctx.lineTo(8, -7);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-5, 3);
      ctx.lineTo(6, -8);
      ctx.moveTo(-5, -8);
      ctx.lineTo(6, 3);
      ctx.stroke();
    }
    if (Number(hasInfantry) + Number(hasCavalry) + Number(hasArtillery) > 1) {
      ctx.fillStyle = "#fff1b0";
      ctx.beginPath();
      ctx.arc(9, -12, 3, 0, TAU);
      ctx.fill();
    }
  }

  function renderTroopSprites(
    x: number,
    y: number,
    v: any,
    factionColor: string,
    suppliedViewport?: any,
    distanceTravelled = 0,
    suppliedDirection?: MarchDirection,
  ) {
    const viewport = suppliedViewport || getWorldViewport();
    if (viewport && !isPointInViewport(x, y, viewport, 150)) return;

    const hasInfantry = v.infantry && v.infantry > 0;
    const hasCavalry = v.cavalry && v.cavalry > 0;
    const hasArtillery = v.artillery && v.artillery > 0;

    const ownerName =
      v.ownerName ||
      (v.owner === 0 ? state.localPlayerName || "BẠN" : undefined);
    const explicitEmblem =
      v.owner === 0
        ? state.newbieEmblem
        : v.sourceRegionId !== undefined
          ? state.regionOwnerEmblems[v.sourceRegionId]
          : undefined;
    const emblem = resolveCastleEmblem(
      ownerName,
      v.sourceRegionId,
      explicitEmblem,
    );
    const architectureId =
      v.owner === 0
        ? normalizeKingdomArchitecture(state.newbieArchitectureId)
        : v.sourceRegionId !== undefined &&
            state.regionOwnerArchitectureIds[v.sourceRegionId]
          ? normalizeKingdomArchitecture(
              state.regionOwnerArchitectureIds[v.sourceRegionId],
            )
          : kingdomArchitectureFromEmblem(emblem);
    const troopColor =
      // Use the player's selected heraldic colour for the footprint ring; the
      // old cyan fallback made every local army look like a neutral marker.
      v.owner === 0 ? state.newbieFlagColor || "#d6a34a" : factionColor;
    // Normal marches stay on the nation atlas with a static idle frame; only
    // crowded/zoomed-out views use the compact token to reduce draw cost.
    const useLowDetail =
      lightweightAssetRenderMode || crowdedRenderMode || state.zoom < 0.42;
    const detailScale = state.zoom < 0.72 ? 0.88 : 1;
    const direction =
      suppliedDirection ||
      marchDirectionFromDelta(
        (v.to?.x ?? x) - (v.from?.x ?? x),
        (v.to?.y ?? y) - (v.from?.y ?? y),
      );
    const marchFrame = animateMarchingUnits ? "walk" : "idle";
    const motionCycles = animateMarchingUnits
      ? {
          infantry: distanceTravelled / 38,
          cavalry: distanceTravelled / 52,
          artillery: distanceTravelled / 44,
        }
      : { infantry: 0, cavalry: 0, artillery: 0 };

    ctx.save();
    const visibleKinds =
      Number(Boolean(hasInfantry)) +
      Number(Boolean(hasCavalry)) +
      Number(Boolean(hasArtillery));
    const formationScale =
      visibleKinds >= 3 ? 0.9 : visibleKinds === 2 ? 0.98 : 1.06;
    const pulse = farSceneryRenderMode
      ? Math.min(8, Math.max(1, 0.42 / Math.max(0.05, state.zoom)))
      : useLowDetail
        ? 0.92
        : formationScale * detailScale;
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);

    if (useLowDetail) {
      drawArmyLodToken(
        Boolean(hasInfantry),
        Boolean(hasCavalry),
        Boolean(hasArtillery),
        troopColor,
      );
    } else if (hasInfantry && hasCavalry && hasArtillery) {
      drawMedievalUnitSprite(
        "cavalry",
        -12,
        -3,
        46,
        troopColor,
        marchFrame,
        motionCycles.cavalry,
        direction,
        architectureId,
      );
      drawMedievalUnitSprite(
        "infantry",
        11,
        -1,
        42,
        troopColor,
        marchFrame,
        motionCycles.infantry,
        direction,
        architectureId,
      );
      drawMedievalUnitSprite(
        "artillery",
        0,
        10,
        46,
        troopColor,
        marchFrame,
        motionCycles.artillery,
        direction,
        architectureId,
      );
    } else if (hasInfantry && hasCavalry) {
      drawMedievalUnitSprite(
        "cavalry",
        -10,
        -3,
        46,
        troopColor,
        marchFrame,
        motionCycles.cavalry,
        direction,
        architectureId,
      );
      drawMedievalUnitSprite(
        "infantry",
        10,
        0,
        42,
        troopColor,
        marchFrame,
        motionCycles.infantry,
        direction,
        architectureId,
      );
    } else if (hasInfantry && hasArtillery) {
      drawMedievalUnitSprite(
        "infantry",
        -10,
        -1,
        42,
        troopColor,
        marchFrame,
        motionCycles.infantry,
        direction,
        architectureId,
      );
      drawMedievalUnitSprite(
        "artillery",
        10,
        8,
        46,
        troopColor,
        marchFrame,
        motionCycles.artillery,
        direction,
        architectureId,
      );
    } else if (hasCavalry && hasArtillery) {
      drawMedievalUnitSprite(
        "cavalry",
        -10,
        -3,
        46,
        troopColor,
        marchFrame,
        motionCycles.cavalry,
        direction,
        architectureId,
      );
      drawMedievalUnitSprite(
        "artillery",
        10,
        8,
        46,
        troopColor,
        marchFrame,
        motionCycles.artillery,
        direction,
        architectureId,
      );
    } else if (hasInfantry) {
      drawMedievalUnitSprite(
        "infantry",
        0,
        0,
        42,
        troopColor,
        marchFrame,
        motionCycles.infantry,
        direction,
        architectureId,
      );
    } else if (hasCavalry) {
      drawMedievalUnitSprite(
        "cavalry",
        0,
        0,
        46,
        troopColor,
        marchFrame,
        motionCycles.cavalry,
        direction,
        architectureId,
      );
    } else if (hasArtillery) {
      drawMedievalUnitSprite(
        "artillery",
        0,
        0,
        46,
        troopColor,
        marchFrame,
        motionCycles.artillery,
        direction,
        architectureId,
      );
    } else {
      drawMedievalUnitSprite(
        "infantry",
        0,
        0,
        42,
        troopColor,
        marchFrame,
        motionCycles.infantry,
        direction,
        architectureId,
      );
    }

    ctx.restore();
  }

  function drawPortIcon(x: number, y: number) {
    const image = strategicMapAssetImage("Bến tàu tự nhiên");
    if (!image?.complete || image.naturalWidth <= 0) return;
    const size = Math.max(52, Math.min(92, 78 / Math.max(0.45, state.zoom)));
    ctx.drawImage(image, x - size / 2, y - size * 0.82, size, size);
  }

  function voyageRouteColors(v: any) {
    const isAlliance =
      v.relation === "ally" || v.alliance === true || v.ownerType === "ally";
    if (isAlliance)
      return {
        main: "rgba(59, 130, 246, 0.94)",
        glow: "rgba(59, 130, 246, 0.24)",
      };
    if (v.owner === 0)
      return {
        main: "rgba(34, 197, 94, 0.94)",
        glow: "rgba(34, 197, 94, 0.24)",
      };
    return { main: "rgba(239, 68, 68, 0.94)", glow: "rgba(239, 68, 68, 0.24)" };
  }

  function strokeVoyagePath(v: any, drawPath: () => void, persisted = false) {
    // On mobile/zoomed-out maps the animated unit already communicates the
    // direction. Omitting the map-wide route prevents the battlefield from
    // becoming a web of lines.
    if (
      !persisted &&
      (lightweightAssetRenderMode || fastRenderMode || state.zoom < 0.5)
    )
      return;
    const colors = voyageRouteColors(v);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // RoK-style march routes use strong broken segments so the direction is
    // readable even when the path crosses bright terrain or buildings.
    const dash = persisted ? [13, 8] : [15, 9];

    // Give the route a dark keyline first. The map contains bright coastlines,
    // terrain texture and territory borders, so a single translucent stroke
    // easily disappears depending on where the army is marching.
    ctx.setLineDash(dash);
    ctx.globalAlpha = persisted ? 0.76 : 0.64;
    ctx.lineWidth = persisted ? 6.2 : 7;
    ctx.strokeStyle = "rgba(4, 12, 20, 0.9)";
    drawPath();
    ctx.stroke();

    // A restrained color halo keeps the line readable without turning the map
    // into a bright web when many marches are visible at once.
    ctx.globalAlpha = persisted
      ? fastRenderMode || state.zoom < 0.5
        ? 0.28
        : 0.4
      : state.voyages.length > 28
        ? 0.28
        : 0.46;
    ctx.lineWidth = persisted ? 4.7 : 5.4;
    ctx.strokeStyle = colors.glow;
    drawPath();
    ctx.stroke();

    // Crisp center stroke is the actual route marker; it remains visible at
    // normal zoom while the keyline separates it from the map underneath.
    ctx.globalAlpha = persisted ? 0.99 : 0.96;
    ctx.lineWidth = persisted ? 3 : 3.5;
    ctx.strokeStyle = colors.main;
    drawPath();
    ctx.stroke();
    ctx.restore();
  }

  function drawBattleRoute(
    from: { x: number; y: number },
    to: { x: number; y: number },
    route: any,
  ) {
    if (!Number.isFinite(from?.x) || !Number.isFinite(from?.y)) return;
    if (!Number.isFinite(to?.x) || !Number.isFinite(to?.y)) return;
    if (lightweightAssetRenderMode) return;
    const colors = voyageRouteColors(route || {});
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const dash = [14, 9];
    ctx.setLineDash(dash);
    ctx.lineDashOffset = -state.tick * 7;
    // Keep the battle connector bold enough to remain visible above the
    // territory building and visually match the regular march route.
    ctx.globalAlpha = fastRenderMode || state.zoom < 0.5 ? 0.3 : 0.46;
    ctx.lineWidth = 7.2;
    ctx.strokeStyle = "rgba(4, 12, 20, 0.9)";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalAlpha = fastRenderMode || state.zoom < 0.5 ? 0.24 : 0.34;
    ctx.lineWidth = 5.2;
    ctx.strokeStyle = colors.glow;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalAlpha = fastRenderMode || state.zoom < 0.5 ? 0.76 : 0.94;
    ctx.lineWidth = 3.1;
    ctx.strokeStyle = colors.main;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    // Small arrowhead identifies the direction without the old red dashed
    // territory border or oversized battle text.
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowT = 0.72;
    const ax = lerp(from.x, to.x, arrowT);
    const ay = lerp(from.y, to.y, arrowT);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(
      ax - Math.cos(angle - 0.48) * 7,
      ay - Math.sin(angle - 0.48) * 7,
    );
    ctx.lineTo(
      ax - Math.cos(angle + 0.48) * 7,
      ay - Math.sin(angle + 0.48) * 7,
    );
    ctx.closePath();
    ctx.fillStyle = colors.main;
    ctx.fill();
    ctx.restore();
  }

  function drawBattleSourcePulse(
    x: number,
    y: number,
    seed: number,
    color: string,
  ) {
    const scale = siegeVisualScale();
    const pulse = 0.58 + Math.sin(state.tick * 3.5 + seed) * 0.12;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = color || "#e1b34f";
    ctx.lineWidth = 1.1 * scale;
    ctx.setLineDash([5 * scale, 4 * scale]);
    ctx.beginPath();
    // `y` is already the calculated ground contact point. Adding a fixed
    // offset here was the source of the visible gap under capitals and flags.
    ctx.ellipse(x, y, 28 * scale, 12 * scale, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function territoryGroundPoint(
    regionId: number,
    fallback: { x: number; y: number },
  ) {
    const region = landById(Number(regionId));
    if (!region) return fallback;

    const isIslet = Boolean(region.isIslet);
    const playerTown =
      frameTownByRegion.get(regionId) ||
      towns.find(
        (town: any) =>
          town.regionId === regionId || town.territoryId === regionId,
      );
    const settlement = classifySettlement({
      isIslet,
      settlementKind: state.regionSettlementKinds[regionId],
      connectionType: state.regionConnectionTypes[regionId],
      capitalTerritoryConfirmed: state.capitalTerritoryIds.has(regionId),
      capitalTownConfirmed:
        playerTown && state.capitalTownIds.has(Number(playerTown.id)),
    });
    const {
      isCapital,
      isSubCapital,
      isMilitaryDistrict: isDistrict,
      buildingType,
    } = settlement;
    const size = standardTerritoryBuildingSize(region, buildingType, isIslet);
    const ownerCode = derivedRegionOwnership(regionId);
    const rawEmblem =
      ownerCode === 1 ? state.newbieEmblem : state.regionOwnerEmblems[regionId];
    const architectureId =
      ownerCode === 1
        ? normalizeKingdomArchitecture(state.newbieArchitectureId)
        : state.regionOwnerArchitectureIds[regionId]
          ? normalizeKingdomArchitecture(
              state.regionOwnerArchitectureIds[regionId],
            )
          : kingdomArchitectureFromEmblem(rawEmblem);
    const skinId =
      ownerCode === 1
        ? isDistrict
          ? state.equippedDistrictSkin
          : state.equippedCapitalSkin
        : isDistrict
          ? state.regionOwnerDistrictSkins[regionId]
          : state.regionOwnerCapitalSkins[regionId];
    const anchor = territoryBuildingAnchor(
      region.x,
      region.y,
      architectureId,
      buildingType,
      size,
      skinId,
    );
    const geometry = buildingOverlayGeometry(
      architectureId,
      buildingType,
      anchor.x,
      anchor.y,
      size,
      skinId,
    );
    return {
      x: geometry.groundX,
      y: geometry.groundY,
    };
  }

  function battleSourcePoint(
    participant: any,
    battle: any,
    targetX: number,
    targetY: number,
  ) {
    const sourceTerritoryId = Number(
      participant?.sourceTerritoryId ??
        participant?.fromTerritoryId ??
        battle?.fromTerritoryId,
    );
    const sourceTownId = participant?.sourceTownId;
    const sourceTown =
      sourceTownId !== undefined
        ? frameTownById.get(String(sourceTownId))
        : frameTownByRegion.get(sourceTerritoryId);
    const sourceRegion = landById(sourceTerritoryId);
    const marchId = participant?.marchId;
    const matchingVoyage = state.voyages?.find(
      (voyage: any) =>
        (marchId && voyage.backendMarchId === marchId) ||
        (Number(voyage.sourceRegionId) === sourceTerritoryId &&
          voyage.to &&
          Math.hypot(voyage.to.x - targetX, voyage.to.y - targetY) < 80),
    );
    const point = sourceTown
      ? { x: sourceTown.x, y: sourceTown.y }
      : sourceRegion
        ? { x: sourceRegion.x, y: sourceRegion.y }
        : matchingVoyage?.from
          ? { x: matchingVoyage.from.x, y: matchingVoyage.from.y }
          : battle?.from
            ? { x: battle.from.x, y: battle.from.y }
            : null;
    return {
      point,
      sourceTerritoryId,
      sourceTownId: sourceTown?.id ?? sourceTownId,
      voyage: matchingVoyage,
    };
  }

  function drawVoyageTravelBadge(
    voyage: any,
    x: number,
    y: number,
    remainingSeconds: number,
  ) {
    if (crowdedRenderMode && voyage?.owner !== 0) return;
    const compact = fastRenderMode || state.zoom < 0.58;
    const scale = siegeVisualScale();
    const safeSeconds = Math.max(0, Math.floor(Number(remainingSeconds) || 0));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    const time = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const label = time;
    ctx.save();
    ctx.translate(x, y - 14 * scale);
    ctx.scale(scale, scale);
    ctx.font = `700 ${compact ? 5.4 : 5.8}px 'Noto Serif', 'Noto Serif KR', 'Noto Serif JP', serif`;
    ctx.textAlign = "center";
    const width = ctx.measureText(label).width + 8;
    ctx.fillStyle = "rgba(8, 16, 22, .84)";
    ctx.strokeStyle = voyageRouteColors(voyage).main;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(-width / 2, -6, width, 10, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f4cf70";
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }

  function voyageIntersectsViewport(voyage: any, vp: any, margin = 400) {
    if (!vp) return true;
    if (voyage.bounds) {
      return (
        voyage.bounds.maxX >= vp.minX - margin &&
        voyage.bounds.minX <= vp.maxX + margin &&
        voyage.bounds.maxY >= vp.minY - margin &&
        voyage.bounds.minY <= vp.maxY + margin
      );
    }
    const first = voyage.from || voyage.to;
    if (!Number.isFinite(first?.x) || !Number.isFinite(first?.y)) return false;
    let minX = first.x;
    let maxX = first.x;
    let minY = first.y;
    let maxY = first.y;
    [
      voyage.to,
      voyage.sourcePort,
      voyage.targetPort,
      voyage.control,
      ...(voyage.seaPath || []),
    ].forEach((point: any) => {
      if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return;
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
    voyage.bounds = { minX, maxX, minY, maxY };
    return (
      maxX >= vp.minX - margin &&
      minX <= vp.maxX + margin &&
      maxY >= vp.minY - margin &&
      minY <= vp.maxY + margin
    );
  }

  function easedRouteProgress(progress: number) {
    const p = Math.max(0, Math.min(1, progress));
    return 0.5 - 0.5 * Math.cos(p * Math.PI);
  }

  function routeMovementState(progress: number) {
    if (progress <= 0.001) return "idle";
    if (progress < 0.06) return "accelerating";
    if (progress > 0.94 && progress < 0.999) return "decelerating";
    if (progress >= 0.999) return "arrived";
    return "marching";
  }

  function drawActiveBattleConnections(vp?: any) {
    if (!state.activeBattles || state.activeBattles.length === 0) return;
    const renderedTargets = new Set<number>();
    const renderedSources = new Set<string>();
    state.activeBattles.forEach((battle: any) => {
      let toX = battle.x;
      let toY = battle.y;
      if (toX === undefined || toY === undefined) {
        if (battle.townId !== undefined) {
          const tw =
            frameTownById.get(String(battle.townId)) ||
            towns.find((t: any) => String(t.id) === String(battle.townId));
          if (tw) {
            toX = tw.x;
            toY = tw.y;
          }
        }
        if (
          (toX === undefined || toY === undefined) &&
          battleTargetRegionId(battle) >= 0
        ) {
          const canvasRegId = reactToCanvasRegionId(
            battleTargetRegionId(battle),
          );
          const r = landById(
            canvasRegId >= 0 ? canvasRegId : battleTargetRegionId(battle),
          );
          if (r) {
            toX = r.x;
            toY = r.y;
          }
        }
      }
      if (toX === undefined || toY === undefined) return;

      const targetRegionId = battleTargetRegionId(battle);
      const targetPoint = { x: toX, y: toY };

      // Origin has an individual card: this is its own contingent against the
      // shared defender, not the total army besieging the target.
      const participants = siegeParticipants(battle);
      const sourceGroups = new Map<string, any[]>();
      siegeSourceParticipants(battle).forEach((participant: any) => {
        const sourceRegionId = Number(
          participant.sourceTerritoryId ??
            participant.fromTerritoryId ??
            battle.fromTerritoryId,
        );
        const sourceTownId = participant.sourceTownId ?? "";
        const key = `${sourceRegionId}:${sourceTownId}:${participant.playerId || participant.ownerId || ""}`;
        sourceGroups.set(key, [...(sourceGroups.get(key) || []), participant]);
      });
      const sourceGroupsToRender = Array.from(sourceGroups.entries()).slice(
        0,
        ultraCrowdedRenderMode ? 4 : crowdedRenderMode ? 8 : sourceGroups.size,
      );
      sourceGroupsToRender.forEach(([key, group]) => {
        const participant = mergeSiegeParticipants(group);
        const source = battleSourcePoint(participant, battle, toX, toY);
        if (!source.point) return;
        const sourceKey = `${targetRegionId}:${key}`;
        if (renderedSources.has(sourceKey)) return;
        renderedSources.add(sourceKey);
        if (Math.hypot(source.point.x - toX, source.point.y - toY) > 14) {
          drawBattleRoute(
            source.point,
            targetPoint,
            source.voyage || {
              owner:
                String(participant.playerId || participant.ownerId || "") ===
                String(state.localPlayerId || "")
                  ? 0
                  : 2,
            },
          );
        }
        const sourceColor =
          state.regionOwnerFlagColors?.[source.sourceTerritoryId] || "#e1b34f";
        const pulsePoint = territoryGroundPoint(
          source.sourceTerritoryId,
          source.point,
        );
        drawBattleSourcePulse(
          pulsePoint.x,
          pulsePoint.y,
          source.sourceTerritoryId,
          sourceColor,
        );
        drawSourceSiegeOverlay(
          source.point.x,
          source.point.y,
          participant,
          battle,
        );
      });

      // Siege presentation: attackers hold outside the settlement; never draw
      // two armies colliding on the town center.
      if (renderedTargets.has(targetRegionId)) return;
      renderedTargets.add(targetRegionId);
      const attColor = factions[battle.attackerOwner ?? 1]?.color || "#b84c3e";
      const visualScale = siegeVisualScale();
      const targetGround = territoryGroundPoint(targetRegionId, targetPoint);
      const pulse = Math.sin(state.tick * 3.2) * 0.09 + 0.64;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "#d39243";
      ctx.lineWidth = 1.6 * visualScale;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.ellipse(
        targetGround.x,
        targetGround.y,
        54 * visualScale,
        27 * visualScale,
        0,
        0,
        TAU,
      );
      ctx.stroke();
      ctx.restore();

      const visibleParticipants = participants.slice(
        0,
        ultraCrowdedRenderMode
          ? 1
          : lightweightAssetRenderMode ||
              crowdedRenderMode ||
              fastRenderMode ||
              state.zoom < 0.55
            ? 2
            : 6,
      );
      visibleParticipants.forEach((participant: any, index: number) => {
        const angle =
          Math.PI * 0.15 +
          (index / Math.max(1, visibleParticipants.length)) * Math.PI * 1.45;
        const unitX = toX + Math.cos(angle) * 64 * visualScale;
        const unitY = toY + 8 + Math.sin(angle) * 35 * visualScale;
        const sourceRegionId = Number(participant.sourceTerritoryId ?? -1);
        const unitColor =
          state.regionOwnerFlagColors?.[sourceRegionId] || attColor;
        const direction = unitX < toX ? "E" : "W";
        const unitType =
          Number(participant.artillery || 0) > Number(participant.infantry || 0)
            ? "artillery"
            : Number(participant.cavalry || 0) >
                Number(participant.infantry || 0)
              ? "cavalry"
              : "infantry";
        if (
          farSceneryRenderMode ||
          lightweightAssetRenderMode ||
          crowdedRenderMode
        ) {
          ctx.save();
          ctx.translate(unitX, unitY);
          ctx.scale(visualScale, visualScale);
          drawArmyLodToken(
            unitType === "infantry",
            unitType === "cavalry",
            unitType === "artillery",
            unitColor,
          );
          ctx.restore();
        } else {
          const attackPhase = unitAttackPhase(state.tick, index);
          drawMedievalUnitSprite(
            unitType,
            unitX,
            unitY,
            (unitType === "cavalry" ? 34 : 30) * visualScale,
            unitColor,
            "attack_down",
            attackPhase,
            direction,
            state.regionOwnerArchitectureIds[sourceRegionId],
          );
          if (unitType === "artillery") {
            drawSiegeProjectile(
              unitX,
              unitY - 5 * visualScale,
              toX,
              toY - 5 * visualScale,
              attackPhase,
            );
          }
        }
      });
      if (!farSceneryRenderMode) {
        drawSiegeImpact(
          toX + 19 * visualScale,
          toY - 10 * visualScale,
          targetRegionId * 0.07,
        );
      }
      if (
        !(
          lightweightAssetRenderMode ||
          fastRenderMode ||
          state.zoom < 0.5
        )
      ) {
        drawSiegeImpact(
          toX - 17 * visualScale,
          toY - 4 * visualScale,
          targetRegionId * 0.11 + 0.35,
        );
      }
      drawTargetSiegeOverlay(
        toX,
        toY,
        targetRegionId,
        battle.defenderOwner ?? 1,
      );
    });
  }

  function drawVoyages(vp?: any) {
    if (isConquestLayout) return;
    state.voyages.forEach((v) => {
      // A route can cross the current view while both endpoints are off-screen.
      // Endpoint-only culling made those persisted marches disappear after reload.
      if (!voyageIntersectsViewport(v, vp)) return;
      const serverProgress = Math.min(1, v.displayProgress ?? v.t / v.duration);
      let t = easedRouteProgress(serverProgress);
      v.movementState = routeMovementState(serverProgress);

      const targetReg =
        v.targetRegionId ?? (v.to ? regionAtCoords(v.to.x, v.to.y) : -1);
      const isTargetInBattle = frameBattleIndexReady
        ? frameBattleTargetRegions.has(Number(targetReg))
        : (state.activeBattles || []).some((b: any) => {
            if (b.townId !== undefined && v.to) {
              const tMatch =
                frameTownById.get(String(b.townId)) ||
                towns.find((tw: any) => tw.id === b.townId);
              if (
                tMatch &&
                Math.hypot(tMatch.x - v.to.x, tMatch.y - v.to.y) < 60
              )
                return true;
            }
            return battleTargetRegionId(b) === Number(targetReg);
          });

      // Keep a quiet route from the source city to the target while the
      // server-side battle is active. It is removed with that battle snapshot.
      const keepBattleRoute =
        isTargetInBattle &&
        (v.keepLineUntilResolved !== false ||
          v.isAttack ||
          v.battleSide === "attacker");
      const routeOnly = t >= 1 && keepBattleRoute;
      if (t >= 1 && !keepBattleRoute) return;
      const factionColor = factions[v.owner ?? 0]?.color || factions[0].color;
      let travelBadgePoint = {
        x: lerp(v.from.x, v.to.x, t),
        y: lerp(v.from.y, v.to.y, t),
      };

      if (voyageUsesShip(v)) {
        const sPort = v.sourcePort || {
          x: lerp(v.from.x, v.to.x, 0.2),
          y: lerp(v.from.y, v.to.y, 0.2),
        };
        const tPort = v.targetPort || {
          x: lerp(v.from.x, v.to.x, 0.8),
          y: lerp(v.from.y, v.to.y, 0.8),
        };
        const seaPath: MapPoint[] =
          Array.isArray(v.seaPath) && v.seaPath.length >= 2
            ? v.seaPath
            : [sPort, tPort];

        // Port art is part of the heavy map asset layer. Keep the moving ship
        // marker, but omit decorative port bitmaps in lightweight mode.
        if (!farSceneryRenderMode && !lightweightAssetRenderMode) {
          drawPortIcon(sPort.x, sPort.y);
          if (Math.hypot(sPort.x - tPort.x, sPort.y - tPort.y) > 30) {
            drawPortIcon(tPort.x, tPort.y);
          }
        }

        // Route line follows the exact water path used by the ship.
        strokeVoyagePath(
          v,
          () => {
            ctx.beginPath();
            // A naval order begins at the actual dock. The city-to-dock leg is
            // intentionally omitted for both route clarity and cheaper draw.
            ctx.moveTo(sPort.x, sPort.y);
            seaPath.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
            if (Math.hypot(v.to.x - tPort.x, v.to.y - tPort.y) > 15) {
              ctx.lineTo(v.to.x, v.to.y);
            }
          },
          keepBattleRoute,
        );

        const seaLength = Math.max(1, polylineLength(seaPath));
        const targetLandLength = Math.hypot(v.to.x - tPort.x, v.to.y - tPort.y);
        const totalLength = Math.max(1, seaLength + targetLandLength);
        const travelled = t * totalLength;

        if (!routeOnly && travelled <= seaLength) {
          const seaP = travelled / seaLength;
          const shipPoint = pointAlongPolyline(seaPath, seaP);
          const nextShipPoint = pointAlongPolyline(
            seaPath,
            Math.min(1, seaP + 0.01),
          );
          const direction = stableMarchDirection(
            v,
            nextShipPoint.x - shipPoint.x,
            nextShipPoint.y - shipPoint.y,
          );
          drawVoyageShip(
            shipPoint.x,
            shipPoint.y,
            factionColor,
            direction,
            travelled / 72,
            1,
            voyageArchitecture(v),
          );
          travelBadgePoint = shipPoint;
        } else if (!routeOnly) {
          // The ship remains in water while the army disembarks onto the target territory.
          const landP =
            targetLandLength > 0
              ? Math.min(
                  1,
                  (travelled - seaLength) / targetLandLength,
                )
              : 1;
          drawVoyageShip(
            tPort.x,
            tPort.y,
            factionColor,
            stableMarchDirection(v, v.to.x - tPort.x, v.to.y - tPort.y),
            travelled / 72,
            Math.max(0, 1 - landP * 2.5),
            voyageArchitecture(v),
          );
          const xLand = lerp(tPort.x, v.to.x, landP);
          const yLand = lerp(tPort.y, v.to.y, landP);
          travelBadgePoint = { x: xLand, y: yLand };
          renderTroopSprites(
            xLand,
            yLand,
            v,
            factionColor,
            vp,
            travelled,
            stableMarchDirection(v, v.to.x - tPort.x, v.to.y - tPort.y),
          );
        }
      } else {
        // Straight line land march
        const x = lerp(v.from.x, v.to.x, t);
        const y = lerp(v.from.y, v.to.y, t);
        travelBadgePoint = { x, y };

        strokeVoyagePath(
          v,
          () => {
            ctx.beginPath();
            ctx.moveTo(v.from.x, v.from.y);
            ctx.lineTo(v.to.x, v.to.y);
          },
          keepBattleRoute,
        );

        if (!routeOnly) {
          renderTroopSprites(
            x,
            y,
            v,
            factionColor,
            vp,
            t * Math.hypot(v.to.x - v.from.x, v.to.y - v.from.y),
            stableMarchDirection(v, v.to.x - v.from.x, v.to.y - v.from.y),
          );
        }
      }
      if (!routeOnly && serverProgress < 0.999) {
        const remainingSeconds = v.arrivesAt
          ? Math.max(
              0,
              Math.ceil((new Date(v.arrivesAt).getTime() - Date.now()) / 1000),
            )
          : Math.max(0, Math.ceil((v.duration || 0) * (1 - serverProgress)));
        drawVoyageTravelBadge(
          v,
          travelBadgePoint.x,
          travelBadgePoint.y,
          remainingSeconds,
        );
      }
    });

    drawActiveBattleConnections(vp);
  }

  function voyageUsesShip(voyage: any) {
    return Boolean(
      voyage?.usesShip === true ||
      voyage?.crossingSea === true ||
      voyage?.requiresShip === true ||
      voyage?.routeType === "sea" ||
      voyage?.connectionType === "sea",
    );
  }

  function getNearestPlayerTown(
    targetX: number,
    targetY: number,
    targetRegionId?: number,
  ) {
    const playerTowns = towns.filter((t) => t.owner === 0);
    if (playerTowns.length === 0) return null;

    if (targetRegionId !== undefined && targetRegionId >= 0) {
      const candidateList = playerTowns.map((town) => {
        const route = settlerRouteForRegion(
          { x: town.x, y: town.y },
          targetRegionId,
        );
        const d = Math.hypot(targetX - town.x, targetY - town.y);
        const townRegId = town.regionId;
        const specials =
          townRegId >= 0 ? territorySpecialResources(townRegId) : [];
        const isPort =
          specials.includes("Bến tàu tự nhiên") ||
          (townRegId >= 0 && landById(townRegId)?.isIslet);
        return { town, d, route, isPort };
      });

      const requiresSea = candidateList.some((c) => c.route.requiresShip);
      if (requiresSea) {
        const validPortTowns = candidateList.filter(
          (c) => c.isPort && (!c.route.requiresShip || !c.route.blocked),
        );
        if (validPortTowns.length > 0) {
          validPortTowns.sort((a, b) => a.d - b.d);
          return validPortTowns[0].town;
        }
        const unblockedTowns = candidateList.filter((c) => !c.route.blocked);
        if (unblockedTowns.length > 0) {
          unblockedTowns.sort((a, b) => a.d - b.d);
          return unblockedTowns[0].town;
        }
      }
    }

    let nearest = playerTowns[0];
    let minD = Math.hypot(targetX - nearest.x, targetY - nearest.y);
    for (let i = 1; i < playerTowns.length; i++) {
      const d = Math.hypot(
        targetX - playerTowns[i].x,
        targetY - playerTowns[i].y,
      );
      if (d < minD) {
        minD = d;
        nearest = playerTowns[i];
      }
    }
    return nearest;
  }

  function settlerOriginForRegion(regionId: number) {
    const r = landById(regionId);
    if (!r)
      return {
        originTownId: null,
        originX: 0,
        originY: 0,
        x: 0,
        y: 0,
        fromCamp: true,
      };

    // Priority 1: Town where Builder currently resides
    let builderTown = null;
    if (state.builderRegionId != null) {
      builderTown = towns.find(
        (t) =>
          t.owner === 0 &&
          (t.id === state.builderRegionId ||
            t.regionId === state.builderRegionId),
      );
    }
    // Priority 2: Nearest Player Town fallback
    if (!builderTown) {
      builderTown = getNearestPlayerTown(r.x, r.y, regionId);
    }

    if (builderTown) {
      return {
        originTownId: builderTown.id,
        originX: builderTown.x,
        originY: builderTown.y,
        x: builderTown.x,
        y: builderTown.y,
        fromCamp: false,
      };
    }
    const ox = r.x - Math.min(120, Math.max(45, (r.rx || r.r || 100) * 0.42));
    const oy = r.y + Math.min(70, Math.max(24, (r.ry || r.r || 80) * 0.18));
    return {
      originTownId: null,
      originX: ox,
      originY: oy,
      x: ox,
      y: oy,
      fromCamp: true,
    };
  }

  function campOriginForRegion(regionId: number) {
    const r = landById(regionId);
    if (!r)
      return {
        originTownId: null,
        originX: 0,
        originY: 0,
        x: 0,
        y: 0,
        fromCamp: true,
      };
    const ox = r.x - Math.min(120, Math.max(45, (r.rx || r.r || 100) * 0.42));
    const oy = r.y + Math.min(70, Math.max(24, (r.ry || r.r || 80) * 0.18));
    return {
      originTownId: null,
      originX: ox,
      originY: oy,
      x: ox,
      y: oy,
      fromCamp: true,
    };
  }

  function settlerRouteForRegion(origin: any, regionId: number) {
    const r = landById(regionId);
    if (!r) return { requiresShip: false };
    const source = { x: origin.x, y: origin.y };
    const sourceRegionId = townRegionId(source);
    const crossesSea = segmentTouchesSea(source, r);
    if (!crossesSea || landTravelAllowed(sourceRegionId, regionId)) {
      return { requiresShip: false };
    }
    const seaRoute = findBestSeaRoute(sourceRegionId, regionId, source, r);
    if (
      seaRoute.error ||
      !seaRoute.sourcePort ||
      !seaRoute.targetPort ||
      !Array.isArray(seaRoute.seaPath) ||
      seaRoute.seaPath.length < 2
    ) {
      return { requiresShip: true, blocked: true };
    }
    const seaPath: MapPoint[] = seaRoute.seaPath;
    return {
      requiresShip: true,
      sourcePort: seaRoute.sourcePort,
      sourceLand: seaRoute.sourceCoast?.land || seaRoute.sourcePort,
      targetPort: seaRoute.targetPort,
      targetLand: seaRoute.targetCoast?.land || seaRoute.targetPort,
      seaPath,
      control:
        seaRoute.control ||
        seaPath[Math.floor(seaPath.length / 2)] || {
          x: (seaRoute.sourcePort.x + seaRoute.targetPort.x) / 2,
          y: (seaRoute.sourcePort.y + seaRoute.targetPort.y) / 2,
        },
    };
  }

  function drawSettlerForRegion(regionId: number) {
    const r = landById(regionId);
    if (!r) return;
    const timing = state.activeClearingTimings?.[regionId];
    const travel =
      state.settlerTravel?.targetRegionId === regionId
        ? state.settlerTravel
        : null;
    const isMine = timing?.playerId && timing.playerId === state.localPlayerId;
    const origin = travel?.active
      ? {
          x: travel.originX ?? r.x,
          y: travel.originY ?? r.y,
          fromCamp:
            travel.originTownId === null || travel.originTownId === undefined,
        }
      : isMine
        ? settlerOriginForRegion(regionId)
        : campOriginForRegion(regionId);
    const calculatedRoute = settlerRouteForRegion(origin, regionId);
    const serverRequiresShip = Boolean(
      timing?.usesShip ||
      timing?.requiresShip ||
      timing?.connectionType === "sea" ||
      travel?.usesShip ||
      travel?.connectionType === "sea",
    );
    const route =
      serverRequiresShip && !calculatedRoute.requiresShip
        ? { requiresShip: true, blocked: true }
        : calculatedRoute;
    if (
      route.blocked ||
      (route.requiresShip &&
        (!route.sourcePort ||
          !route.targetPort ||
          !Array.isArray(route.seaPath) ||
          route.seaPath.length < 2))
    ) {
      return;
    }

    const now = Date.now();
    const startMs = timing?.startedAt
      ? new Date(timing.startedAt).getTime()
      : now;
    const arrivesMs = timing?.arrivesAt
      ? new Date(timing.arrivesAt).getTime()
      : startMs;
    const completesMs = timing?.completesAt
      ? new Date(timing.completesAt).getTime()
      : now + 30000;

    let inTravelPhase = false;
    let travelP = 1;
    let buildP = 0;

    if (travel?.returning) {
      const rawProgress = travel.returnProgress || 0;
      travelP = Math.max(0, 1 - Math.min(1, rawProgress));
      inTravelPhase = true;
    } else if (timing?.arrivesAt && now < arrivesMs) {
      inTravelPhase = true;
      const totalTravelMs = Math.max(1000, arrivesMs - startMs);
      travelP = Math.max(0, Math.min(1, (now - startMs) / totalTravelMs));
    } else {
      inTravelPhase = false;
      const totalBuildMs = Math.max(1000, completesMs - arrivesMs);
      buildP = Math.max(0, Math.min(1, (now - arrivesMs) / totalBuildMs));
    }

    if (route.requiresShip) {
      strokeVoyagePath({ owner: 0, relation: "ally" }, () => {
        ctx.beginPath();
        ctx.moveTo(route.sourcePort.x, route.sourcePort.y);
        const builderSeaPath: MapPoint[] = route.seaPath;
        builderSeaPath
          .slice(1)
          .forEach((point) => ctx.lineTo(point.x, point.y));
        ctx.lineTo(r.x, r.y);
      });
      if (!lightweightAssetRenderMode) {
        drawPortIcon(route.sourcePort.x, route.sourcePort.y);
        drawPortIcon(route.targetPort.x, route.targetPort.y);
      }
    } else if (!lightweightAssetRenderMode) {
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = inTravelPhase
        ? "rgba(255, 211, 77, 0.75)"
        : "rgba(16, 185, 129, 0.4)";
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
      ctx.restore();
    }

    if (origin.fromCamp && !lightweightAssetRenderMode) {
      drawBush(origin.x, origin.y, 0.75);
      drawTree(origin.x + 6, origin.y - 4, 0.65);
    }

    if (!inTravelPhase) {
      const constructionArchitecture = isMine
        ? normalizeKingdomArchitecture(state.newbieArchitectureId)
        : state.regionOwnerArchitectureIds[regionId]
          ? normalizeKingdomArchitecture(
              state.regionOwnerArchitectureIds[regionId],
            )
          : "vietnam";
      const constructionType: KingdomBuildingType =
        timing?.isStarterClaim && !r.isIslet
          ? "capital"
          : r.isIslet || timing?.connectionType === "sea"
            ? "district"
            : "flag";
      const constructionSize =
        constructionType === "capital"
          ? MAINLAND_CAPITAL_RENDER_SIZE
          : constructionType === "district"
            ? r.isIslet
              ? ISLET_DISTRICT_RENDER_SIZE
              : 158
            : 118;
      ctx.save();
      ctx.globalAlpha = 0.42 + buildP * 0.58;
      if (lightweightAssetRenderMode) {
        if (state.zoom <= OVERVIEW_ICON_THRESHOLD) {
          drawLightweightTerritoryMarker(
            r.x,
            r.y,
            state.newbieFlagColor || "#2563eb",
            constructionType,
          );
        }
      } else {
        const constructionAnchor = territoryBuildingAnchor(
          r.x,
          r.y,
          constructionArchitecture,
          constructionType,
          constructionSize,
        );
        drawKingdomBuildingSprite(
          constructionArchitecture,
          constructionType,
          constructionAnchor.x,
          constructionAnchor.y,
          constructionSize,
        );
      }
      ctx.restore();
    }

    let x = r.x;
    let y = r.y;
    let onShip = false;
    let builderDirection = marchDirectionFromDelta(
      travel?.returning ? origin.x - r.x : r.x - origin.x,
      travel?.returning ? origin.y - r.y : r.y - origin.y,
    );

    const renderedTravelP = inTravelPhase
      ? easedRouteProgress(travelP)
      : travelP;
    const directRouteDistance = Math.hypot(r.x - origin.x, r.y - origin.y);
    // Keep the engineer visually static while its position still follows the
    // route. This matches the idle march sprites used by the other units.
    const builderMotionCycle = 0;
    const builderShipCycle =
      state.tick * 2.4 + (renderedTravelP * directRouteDistance) / 72;

    if (inTravelPhase) {
      x = lerp(origin.x, r.x, renderedTravelP);
      y = lerp(origin.y, r.y, renderedTravelP);
      if (
        route.requiresShip &&
        route.sourcePort &&
        route.targetPort &&
        Array.isArray(route.seaPath) &&
        route.seaPath.length >= 2
      ) {
        const builderSeaPath: MapPoint[] = route.seaPath;
        if (renderedTravelP <= 0.8) {
          const seaP = renderedTravelP / 0.8;
          const shipPoint = pointAlongPolyline(builderSeaPath, seaP);
          const nextShipPoint = pointAlongPolyline(
            builderSeaPath,
            Math.min(1, seaP + 0.01),
          );
          x = shipPoint.x;
          y = shipPoint.y;
          const tangentX = nextShipPoint.x - shipPoint.x;
          const tangentY = nextShipPoint.y - shipPoint.y;
          builderDirection = marchDirectionFromDelta(tangentX, tangentY);
          onShip = true;
        } else {
          const landP = (renderedTravelP - 0.8) / 0.2;
          x = lerp(route.targetPort.x, r.x, landP);
          y = lerp(route.targetPort.y, r.y, landP);
          onShip = false;
        }
      }
    } else {
      // Construction starts only after the server arrival time and remains
      // anchored to the territory center for the whole build phase.
      onShip = false;
      x = r.x;
      y = r.y;
    }

    const walk = Math.round(Math.sin(state.tick * 10) * 2);
    const bob = 0;
    const flagColor = state.newbieFlagColor || "#2563eb";

    if (onShip) {
      drawVoyageShip(
        x,
        y,
        flagColor,
        builderDirection,
        builderShipCycle,
        1,
        state.newbieArchitectureId,
      );
      text("ĐỘI CÔNG BINH ĐI THUYỀN", x, y - 72, 14, "#dbeafe", "center");
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    // Match the regular infantry footprint instead of the old oversized
    // engineer-specific scale.
    const builderMapScale = 1;
    ctx.scale(builderMapScale, builderMapScale);

    ctx.fillStyle = "rgba(0,0,0,0.34)";
    ctx.beginPath();
    ctx.ellipse(0, 6, 17, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const builderFrame = inTravelPhase
      ? "idle"
      : buildP >= 0.985
        ? "complete"
        : Math.floor(state.tick * 5) % 2 === 0
          ? "hammer_up"
          : "hammer_down";
    const hasBuilderSprite = drawMedievalUnitSprite(
      "builder",
      0,
      4,
      42,
      flagColor,
      builderFrame,
      builderMotionCycle,
      builderDirection,
      state.newbieArchitectureId,
    );
    const allowLegacyBuilderFallback = false;

    // Timber cart and rolled plans make the role readable at map scale.
    if (allowLegacyBuilderFallback && !hasBuilderSprite && !inTravelPhase) {
      pxRect(-26, 8, 17, 8, "#72431e");
      pxRect(-24, 5, 13, 5, "#a96c32");
      pxRect(-23, 2, 4, 7, "#d2a05c");
      pxRect(-18, 0, 4, 9, "#c38b4b");
      pxRect(-13, 3, 3, 6, "#e1b36f");
      pxRect(-25, 15, 5, 5, "#1b1714");
      pxRect(-13, 15, 5, 5, "#1b1714");
      pxRect(-24, 16, 3, 3, "#8d969d");
      pxRect(-12, 16, 3, 3, "#8d969d");
    } else if (allowLegacyBuilderFallback && !hasBuilderSprite) {
      pxRect(-15, -5 + bob, 6, 21, "#e7d8ae");
      pxRect(-16, -7 + bob, 8, 4, "#6e512d");
      pxRect(-16, 13 + bob, 8, 4, "#6e512d");
      pxRect(-14, -2 + bob, 4, 2, "#b88b4c");
    }

    if (allowLegacyBuilderFallback && !hasBuilderSprite) {
      // Heavy boots, split doublet and leather engineer apron.
      pxRect(-8 + walk, 6, 6, 11, "#37271d");
      pxRect(2 - walk, 6, 6, 11, "#37271d");
      pxRect(-10 + walk, 15, 9, 4, "#15110e");
      pxRect(1 - walk, 15, 10, 4, "#15110e");
      pxRect(-10, -11 + bob, 20, 19, getDarkerColor(flagColor));
      pxRect(-8, -10 + bob, 16, 17, flagColor);
      pxRect(-7, -7 + bob, 7, 14, "#9b5c2c");
      pxRect(1, -7 + bob, 7, 14, "#75411f");
      pxRect(-8, -10 + bob, 16, 3, "#e0b34e");
      pxRect(-1, -9 + bob, 2, 16, "#ead173");
      pxRect(-8, 5 + bob, 16, 4, "#4a2b18");
      pxRect(-5, 7 + bob, 10, 8, "#a86b35");
      pxRect(-4, 8 + bob, 8, 6, "#c58b50");

      // Steel shoulder guards, gloves and tool belt.
      pxRect(-13, -9 + bob, 6, 6, "#697985");
      pxRect(-12, -10 + bob, 5, 2, "#d4dcdd");
      pxRect(7, -9 + bob, 6, 6, "#697985");
      pxRect(8, -10 + bob, 5, 2, "#d4dcdd");
      pxRect(-14, -4 + bob, 5, 9, "#ad774b");
      pxRect(9, -4 + bob, 5, 9, "#ad774b");
      pxRect(-8, 6 + bob, 16, 3, "#3b2416");
      pxRect(6, 7 + bob, 5, 5, "#6a431f");
      pxRect(7, 8 + bob, 3, 2, "#d8ae4f");

      // Morion helmet, mail collar and bearded face.
      pxRect(-6, -22 + bob, 12, 11, "#d3a072");
      pxRect(-7, -20 + bob, 2, 10, "#6f7d86");
      pxRect(5, -20 + bob, 2, 10, "#6f7d86");
      pxRect(-5, -12 + bob, 10, 4, "#667681");
      pxRect(-8, -25 + bob, 16, 5, "#7e8d96");
      pxRect(-6, -28 + bob, 12, 5, "#bfc9ca");
      pxRect(-3, -31 + bob, 6, 5, "#667681");
      pxRect(-10, -23 + bob, 20, 3, "#d9e0df");
      pxRect(-8, -21 + bob, 16, 2, "#4d5b64");
      pxRect(1, -18 + bob, 2, 2, "#151719");
      pxRect(-4, -14 + bob, 8, 4, "#67402a");
      pxRect(-2, -11 + bob, 5, 2, "#3a251b");

      // Hammer swings during construction and rests over the shoulder on the march.
      ctx.save();
      ctx.translate(11, -2 + bob);
      ctx.rotate(
        inTravelPhase ? -0.76 : -0.4 + Math.sin(state.tick * 12) * 0.82,
      );
      pxRect(-1, -3, 3, 24, "#744821");
      pxRect(-7, -9, 15, 7, "#8c9aa2");
      pxRect(-5, -8, 11, 2, "#e7ece9");
      pxRect(5, -7, 4, 4, "#4e5c65");
      ctx.restore();

      if (!inTravelPhase && Math.sin(state.tick * 12) > 0.6) {
        pxRect(17, 2, 3, 3, "#ffd34d");
        pxRect(21, -2, 2, 2, "#fff0a6");
        pxRect(14, 7, 2, 2, "#e89b2d");
        pxRect(23, 5, 2, 2, "#ffb13b");
      }
    } else if (!inTravelPhase && Math.sin(state.tick * 12) > 0.72) {
      pxRect(18, 4, 2, 2, "#ffd34d");
      pxRect(22, 0, 1.5, 1.5, "#fff0a6");
    }
    ctx.restore();

    let remainingSec = 0;
    let badgeTitle = "";
    let fillPct = 0;
    let fillColor = "#ffd34d";

    if (travel?.returning) {
      remainingSec = Math.max(0, Math.ceil((1 - travelP) * 12));
      badgeTitle = "VỀ";
      fillPct = travelP;
      fillColor = "#3b82f6";
    } else if (inTravelPhase) {
      remainingSec = Math.max(0, Math.ceil((arrivesMs - now) / 1000));
      badgeTitle = "DI CHUYỂN";
      fillPct = travelP;
      fillColor = "#f59e0b";
    } else {
      remainingSec = Math.max(0, Math.ceil((completesMs - now) / 1000));
      const constructionStage =
        buildP < 0.25
          ? "ĐẶT NỀN"
          : buildP < 0.55
            ? "DỰNG KHUNG"
            : buildP < 0.85
              ? "XÂY THÁP"
              : "HOÀN THIỆN";
      badgeTitle = `${constructionStage} ${Math.round(buildP * 100)}%`;
      fillPct = buildP;
      fillColor = "#10b981";
    }

    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    const barW = 80;
    const barH = 3;
    const barX = x - barW / 2;
    const barY = y - 32 + bob;

    // Slim progress bar background
    pxRect(barX, barY, barW, barH, "rgba(0, 0, 0, 0.45)");
    // Progress fill
    pxRect(barX, barY, barW * fillPct, barH, fillColor);

    // Resolve correct player name (using dynamic lookup for enemy names if possible)
    let resolvedPlayerName = "";
    if (isMine) {
      resolvedPlayerName = state.localPlayerName || "BẠN";
    } else if (timing?.playerId) {
      const matchingRegion = Object.keys(state.regionOwnerIds).find(
        (key) => state.regionOwnerIds[Number(key)] === timing.playerId,
      );
      if (matchingRegion) {
        resolvedPlayerName =
          state.regionOwnerNames[Number(matchingRegion)] || "";
      }
      if (!resolvedPlayerName) {
        resolvedPlayerName = "ĐỐI THỦ";
      }
    } else {
      resolvedPlayerName = "BẠN";
    }

    ctx.save();
    ctx.font = "bold 11px 'Noto Serif', 'Noto Serif KR', 'Noto Serif JP', serif";
    ctx.textAlign = "center";

    // Crisp text shadow for contrast
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 3;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3.5;

    const displayText = `${resolvedPlayerName} ${timeStr}`;
    ctx.strokeText(displayText, x, barY - 6);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(displayText, x, barY - 6);
    ctx.restore();
  }

  function getNewbieShieldRemainingMs() {
    return 0;
  }

  function formatShieldTimer(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function drawNewbiePeaceShield(
    x: number,
    y: number,
    sc: number,
    remainingMs: number,
  ) {
    const timeStr = formatShieldTimer(remainingMs);
    const radius = 52 * sc;
    const centerY = y - 4 * sc;

    ctx.save();

    // 1. Semi-transparent Cyan Energy Dome
    const pulse = Math.sin(state.tick * 0.1) * 0.04 + 1.0;
    const domeR = radius * pulse;

    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 20 * sc;

    // Dome fill gradient
    const grad = ctx.createRadialGradient(
      x,
      centerY - domeR * 0.3,
      4,
      x,
      centerY,
      domeR,
    );
    grad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
    grad.addColorStop(0.7, "rgba(14, 165, 233, 0.25)");
    grad.addColorStop(1, "rgba(2, 132, 199, 0.55)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, centerY, domeR, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    // Glowing Neon Shield Outer Stroke
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3 * sc;
    ctx.stroke();

    // Animated Energy Arc Rings inside Dome
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1.5 * sc;
    ctx.setLineDash([8 * sc, 6 * sc]);
    ctx.lineDashOffset = -state.tick * 4;
    ctx.beginPath();
    ctx.arc(x, centerY, domeR * 0.82, Math.PI, 0, false);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Floating Shield Plaque Badge above the Dome
    const badgeY = centerY - domeR - 26 * sc;
    const badgeW = 145 * sc;
    const badgeH = 28 * sc;

    // Dark Gold Plaque Background
    pxRect(x - badgeW / 2 + 2, badgeY + 2, badgeW, badgeH, "rgba(0,0,0,0.5)");
    pxRect(x - badgeW / 2, badgeY, badgeW, badgeH, "#0f172a");

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.8 * sc;
    ctx.strokeRect(
      Math.round(x - badgeW / 2),
      Math.round(badgeY),
      Math.round(badgeW),
      Math.round(badgeH),
    );

    // Shield Emblem & Timer Text
    text("BẢO VỆ TÂN THỦ", x, badgeY + 9 * sc, 14 * sc, "#38bdf8", "center");
    text(`⏱️ ${timeStr}`, x, badgeY + 21 * sc, 13 * sc, "#fbbf24", "center");

    ctx.restore();
  }

  function cleanOwnerName(
    rawName: any,
    ownerCode: number,
    regionId: number,
  ): string {
    const removeLordTitle = (name: string) =>
      name.replace(/^LÃNH\s+CHÚA\s+/i, "").trim();
    const rawTag = state.regionOwnerAllianceTags[regionId];
    const tag =
      rawTag &&
      typeof rawTag === "string" &&
      /^[A-Za-z0-9]{2,8}$/.test(rawTag) &&
      !/^\d+$/.test(rawTag)
        ? `[${rawTag.toUpperCase()}] `
        : "";

    if (ownerCode === 1) {
      const myName = state.localPlayerName || "BẠN";
      return `${tag}${removeLordTitle(myName)}`;
    }

    if (!rawName) return `${tag}NGƯỜI CHƠI`.toUpperCase();

    let str = String(rawName).trim();
    if (str.toLowerCase().startsWith("guest:")) str = str.slice(6);
    if (str.toLowerCase().startsWith("player:")) str = str.slice(7);
    str = removeLordTitle(str);

    // Format raw Mongo DB IDs or numeric IDs nicely into readable player names (e.g. "USER 2121" instead of raw DB string)
    if (/^[0-9a-fA-F]{8,}$/.test(str)) {
      str = str.slice(0, 6).toUpperCase();
    } else if (/^\d{8,}$/.test(str)) {
      str = str.slice(0, 6);
    }

    return `${tag}${str}`;
  }

  function drawTerritoryFlagMarker(
    x: number,
    y: number,
    color: string,
    sc: number,
  ) {
    ctx.save();
    const ratio = sc / 0.7;
    const flagCol = color || "#2563eb";

    // Flag Pole
    pxRect(x - 2 * ratio, y - 25 * sc, 4 * ratio, 36 * sc, "#334155");

    // Banner Flag
    pxRect(x + 2 * ratio, y - 25 * sc, 26 * ratio, 16 * sc, flagCol);
    pxRect(
      x + 2 * ratio,
      y - 25 * sc,
      26 * ratio,
      3 * sc,
      "rgba(255, 255, 255, 0.4)",
    );
    pxRect(x + 2 * ratio, y - 9 * sc, 26 * ratio, 3 * sc, "rgba(0, 0, 0, 0.3)");
    ctx.restore();
  }

  function drawLightweightTerritoryMarker(
    x: number,
    y: number,
    color: string,
    buildingType: string,
  ) {
    const isCapital = buildingType === "capital";
    // At the far strategic overview the canvas itself is scaled to 0.05x.
    // Compensate that scale so a marker remains a small, readable screen icon
    // instead of shrinking below one physical pixel.
    const overviewScale = Math.min(
      10,
      Math.max(1, 0.5 / Math.max(state.zoom, 0.05)),
    );
    const width = (isCapital ? 22 : 17) * overviewScale;
    const height = (isCapital ? 18 : 14) * overviewScale;
    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = "rgba(4, 12, 18, 0.72)";
    ctx.beginPath();
    ctx.ellipse(x, y + 3, width * 0.72, 4, 0, 0, TAU);
    ctx.fill();

    // Minimal house silhouette: one fill, one roof, one flag. It replaces the
    // large cached castle/skin artwork while the camera is moving or close in.
    ctx.fillStyle = color || "#2563eb";
    ctx.fillRect(x - width / 2, y - height, width, height);
    ctx.beginPath();
    ctx.moveTo(x - width * 0.66, y - height);
    ctx.lineTo(x, y - height - (isCapital ? 9 : 7));
    ctx.lineTo(x + width * 0.66, y - height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 245, 200, 0.88)";
    ctx.fillRect(
      x - 2 * overviewScale,
      y - height + 6 * overviewScale,
      4 * overviewScale,
      5 * overviewScale,
    );
    ctx.fillStyle = "#334155";
    ctx.fillRect(
      x + width * 0.46,
      y - height - (isCapital ? 16 : 13) * overviewScale,
      2 * overviewScale,
      16 * overviewScale,
    );
    ctx.fillStyle = color || "#2563eb";
    ctx.beginPath();
    ctx.moveTo(
      x + width * 0.48,
      y - height - (isCapital ? 16 : 13) * overviewScale,
    );
    ctx.lineTo(
      x + width * 0.48 + 11 * overviewScale,
      y - height - (isCapital ? 13 : 10) * overviewScale,
    );
    ctx.lineTo(
      x + width * 0.48,
      y - height - (isCapital ? 9 : 7) * overviewScale,
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMedievalCastleNameplate(
    x: number,
    y: number,
    ownerName: string,
    ownerCode: number,
    castleSize: number,
    inBattle: boolean,
  ) {
    const isOwn = ownerCode === 1;
    const isNeutral = ownerCode <= 0;
    const name = ownerName;
    const fontSize = isOwn ? 14 : 13;

    ctx.save();
    ctx.font = `700 ${fontSize}px 'Noto Serif', 'Noto Serif KR', 'Noto Serif JP', serif`;
    const nameWidth = ctx.measureText(name).width;
    const width = Math.max(54, nameWidth + 18);
    const height = 22;
    // The avatar badge sits just above the ground anchor. Keep the expanded
    // premium artwork below it instead of letting the frame cover the badge.
    const top = y + 28;
    const box = {
      x: x - width / 2,
      y: top,
      w: width,
      h: height,
    };
    const overlaps = frameCastleLabelBounds.some(
      (other) =>
        box.x < other.x + other.w + 5 &&
        box.x + box.w + 5 > other.x &&
        box.y < other.y + other.h + 4 &&
        box.y + box.h + 4 > other.y,
    );
    if (overlaps && !isOwn && !inBattle) {
      ctx.restore();
      return;
    }
    frameCastleLabelBounds.push(box);

    const accent = inBattle
      ? "#dc2626"
      : isOwn
        ? "#0f766e"
        : isNeutral
          ? "#8a6528"
          : "#991b1b";
    const nameColor = inBattle
      ? "#fecaca"
      : isOwn
        ? "#55e6c1"
        : isNeutral
          ? "#f5d98f"
          : "#ff7b72";

    const premiumNameplate = isOwn && state.equippedNameFrameId
      ? premiumNameplateImages[state.equippedNameFrameId]
      : null;
    if (premiumNameplate?.complete && premiumNameplate.naturalWidth > 0) {
      ctx.drawImage(premiumNameplate, box.x - 36, box.y - 18, width + 72, height + 36);
    } else {
      ctx.fillStyle = "rgba(10, 20, 23, 0.92)";
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, width, height, 3);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = isOwn || inBattle ? 1.5 : 1;
      ctx.stroke();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontSize}px 'Noto Serif', 'Noto Serif KR', 'Noto Serif JP', serif`;
    ctx.fillStyle = premiumNameplate ? "#fff4cf" : nameColor;
    if (premiumNameplate) {
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
    }
    ctx.fillText(name, x, box.y + height / 2 + 0.5);
    ctx.restore();
  }

  function drawTerritoryCastle(regionId, ownerCode, ownerName) {
    const r = landById(regionId);
    if (!r) return;

    // Visual placement is centered; authoritative town coordinates stay untouched.
    const x = r.x;
    const y = r.y;

    // Viewport Culling Optimization: Skip rendering territories completely offscreen!
    const viewport = getWorldViewport();
    if (viewport && !isPointInViewport(x, y, viewport, 360)) {
      return;
    }

    const color = getRegionFlagColor(regionId);

    const isBattleRegion =
      frameBattleTargetRegions.has(Number(regionId)) ||
      frameBattleSourceRegions.has(Number(regionId));

    // On Conquest Map layout, do NOT draw 1,000 castle sprites or flag markers over every territory
    if (isConquestLayout) {
      return;
    }

    const playerTown =
      frameTownByRegion.get(regionId) ||
      towns.find(
        (town: any) =>
          town.regionId === regionId || town.territoryId === regionId,
      );
    const isIslet = Boolean(r.isIslet);
    const settlement = classifySettlement({
      isIslet,
      settlementKind: state.regionSettlementKinds[regionId],
      connectionType: state.regionConnectionTypes[regionId],
      capitalTerritoryConfirmed: state.capitalTerritoryIds.has(regionId),
      capitalTownConfirmed:
        playerTown && state.capitalTownIds.has(Number(playerTown.id)),
    });
    const { isCapital, isSubCapital, isMilitaryDistrict, buildingType } =
      settlement;
    const displayOwnerName = cleanOwnerName(ownerName, ownerCode, regionId);

    // Remote non-capital settlements may collapse to a flag under extreme
    // load, but a Hoàng Thành must retain its identity and player name.
    if (
      ultraCrowdedRenderMode &&
      state.zoom <= OVERVIEW_ICON_THRESHOLD &&
      ownerCode > 1 &&
      !isBattleRegion &&
      !isCapital
    ) {
      drawTerritoryFlagMarker(x, y, color, 0.58);
      return;
    }

    if (lightweightAssetRenderMode) {
      // The global map shows strategic anchors, not one icon per province.
      // This keeps capitals and battles readable instead of creating a dense
      // block of overlapping house markers.
      if (state.zoom <= OVERVIEW_ICON_THRESHOLD) {
        const showStrategicMarker =
          isCapital ||
          isSubCapital ||
          isBattleRegion ||
          state.selectedRegion === regionId;
        if (showStrategicMarker) {
          drawLightweightTerritoryMarker(x, y, color, buildingType);
        }
      }
      // Names are deliberately omitted in the global overview: one compact
      // marker per territory remains legible and avoids text-layout work.
      return;
    }

    const rawEmblem =
      ownerCode === 1 ? state.newbieEmblem : state.regionOwnerEmblems[regionId];
    const emblem = resolveCastleEmblem(ownerName, regionId, rawEmblem);

    // Resolve equipped skin for this territory castle (local player or remote players)
    let equippedSkin: string | null = null;
    if (ownerCode === 1) {
      equippedSkin = isCapital
        ? state.equippedCapitalSkin
        : isMilitaryDistrict
          ? state.equippedDistrictSkin
          : state.equippedCapitalSkin;
    } else if (regionId >= 0) {
      equippedSkin = isCapital
        ? state.regionOwnerCapitalSkins[regionId]
        : isMilitaryDistrict
          ? state.regionOwnerDistrictSkins[regionId]
          : state.regionOwnerCapitalSkins[regionId];
    }

    const architectureId =
      ownerCode === 1
        ? normalizeKingdomArchitecture(state.newbieArchitectureId)
        : state.regionOwnerArchitectureIds[regionId]
          ? normalizeKingdomArchitecture(
              state.regionOwnerArchitectureIds[regionId],
            )
          : kingdomArchitectureFromEmblem(emblem);
    const castleSize = standardTerritoryBuildingSize(r, buildingType, isIslet);
    const buildingAnchor = territoryBuildingAnchor(
      x,
      y,
      architectureId,
      buildingType,
      castleSize,
      equippedSkin,
    );
    drawKingdomBuildingSprite(
      architectureId,
      buildingType,
      buildingAnchor.x,
      buildingAnchor.y,
      castleSize,
      equippedSkin,
    );
    const isolatedUntil = state.regionIsolatedUntil[regionId];
    if (isolatedUntil && state.zoom >= 0.45) {
      const hoursLeft = Math.max(
        1,
        Math.ceil(
          (new Date(isolatedUntil).getTime() - Date.now()) / 3_600_000,
        ),
      );
      ctx.save();
      ctx.fillStyle = "rgba(31, 15, 5, .94)";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(buildingAnchor.x - 30, buildingAnchor.y + 7, 60, 14, 5);
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "800 7px system-ui, sans-serif";
      ctx.fillStyle = "#fde68a";
      ctx.fillText(
        `CÔ LẬP · ${hoursLeft}H`,
        buildingAnchor.x,
        buildingAnchor.y + 14,
      );
      ctx.restore();
    }
    if (buildingType === "capital" || buildingType === "district") {
      // The world renderer has no alliance lookup in its hot path. Remote
      // rulers use the enemy frame here; alliance screens can still render
      // their dedicated blue relation treatment independently.
      const avatarRelation = ownerCode === 1 ? "own" : "enemy";
      drawRulerAvatarBadge({
        ctx,
        zoom: state.zoom,
        architectureId,
        buildingType,
        x: buildingAnchor.x,
        y: buildingAnchor.y,
        size: castleSize,
        skinId: equippedSkin,
        avatarId:
          ownerCode === 1
            ? state.localPlayerAvatarId
            : state.regionOwnerAvatarIds[regionId],
        avatarFrameId:
          ownerCode === 1
            ? state.equippedAvatarFrameId
            : state.regionOwnerAvatarFrameIds[regionId],
        relation: avatarRelation,
      });
    }

    // Only Hoàng Thành carries the player name. Districts and flag-only
    // territories stay label-free to keep the map compact.
    if (isCapital) {
      drawMedievalCastleNameplate(
        buildingAnchor.x,
        buildingAnchor.y,
        displayOwnerName,
        ownerCode,
        castleSize,
        isBattleRegion,
      );
    }
  }

  function drawClaimedTerritoryMarkers(
    vp?: any,
    visibleTerritories?: Array<[any, number]>,
  ) {
    if (isConquestLayout) return;
    const candidates =
      visibleTerritories ||
      Object.keys(state.regionOwnership).map(
        (key) => [landById(Number(key)), Number(key)] as [any, number],
      );
    candidates.forEach(([land, regionId]) => {
      const ownerCode = derivedRegionOwnership(regionId);
      if (!ownerCode) return;
      if (land && vp && !isPointInViewport(land.x, land.y, vp, 350)) return;
      drawTerritoryCastle(
        regionId,
        ownerCode,
        state.regionOwnerNames[regionId],
      );
    });
  }

  type SpecialHarborAnchor = {
    x: number;
    y: number;
    outwardX: number;
    outwardY: number;
  };

  const specialHarborAnchorCache = new Map<number, SpecialHarborAnchor>();

  function specialHarborAnchor(region: any): SpecialHarborAnchor {
    const regionId = Number(region.id);
    const cached = specialHarborAnchorCache.get(regionId);
    if (cached) return cached;

    const regionRx = region.rx || region.r || 120;
    const regionRy = region.ry || (region.r || 120) * 0.78;
    const continent = megaContinents.find((c) => {
      const nx = (region.x - c.x) / c.rx;
      const ny = (region.y - c.y) / c.ry;
      return nx * nx + ny * ny <= 2.2;
    });
    const cx = continent ? continent.x : 1200;
    const cy = continent ? continent.y : 800;
    const dx = region.x - cx;
    const dy = region.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const outwardX = dx / len;
    const outwardY = dy / len;

    // Reuse the same land-to-water coast solver used by sea routes. It checks
    // both sides of the shoreline, so the dock cannot be anchored on a green
    // polygon just because the continent-center vector points into a bay.
    const coast = findCoastPort(
      regionId,
      {
        x: region.x + outwardX * regionRx,
        y: region.y + outwardY * regionRy,
      },
    );
    if (coast) {
      const anchor = {
        x: coast.land.x,
        y: coast.land.y,
        outwardX: coast.dir.x,
        outwardY: coast.dir.y,
      };
      specialHarborAnchorCache.set(regionId, anchor);
      return anchor;
    }

    // Defensive fallback for irregular map edges: find any direction where a
    // radial sample leaves the territory and lands in water.
    let fallbackDirection = { x: outwardX, y: outwardY };
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * TAU;
      const sampleX = region.x + Math.cos(angle) * regionRx * 1.32;
      const sampleY = region.y + Math.sin(angle) * regionRy * 1.32;
      if (isWaterAt(sampleX, sampleY)) {
        fallbackDirection = { x: Math.cos(angle), y: Math.sin(angle) };
        break;
      }
    }
    const { x: fallbackX, y: fallbackY } = fallbackDirection;
    const polygon = getSharedRegionPolygon(
      region,
      regionId,
      Boolean(region.isIslet),
    );

    let edgeX = region.x + fallbackX * regionRx;
    let edgeY = region.y + fallbackY * regionRy;
    let furthest = -Infinity;
    polygon.forEach(([px, py]) => {
      if (!region.isIslet && isSharedInlandVertex(px, py, region)) return;
      const projection =
        (px - region.x) * fallbackX + (py - region.y) * fallbackY;
      if (projection > furthest) {
        furthest = projection;
        edgeX = px;
        edgeY = py;
      }
    });

    const anchor = {
      x: edgeX,
      y: edgeY,
      outwardX: fallbackX,
      outwardY: fallbackY,
    };
    specialHarborAnchorCache.set(regionId, anchor);
    return anchor;
  }

  function drawSpecialTerritorySprites(
    visibleRegions: any[],
    visibleIslets: any[],
  ) {
    if (
      hideTerritoryAssets ||
      farSceneryRenderMode ||
      lightweightAssetRenderMode ||
      fastRenderMode ||
      crowdedRenderMode
    )
      return;

    const baseSize = Math.max(
      82,
      Math.min(136, 112 / Math.max(0.48, state.zoom)),
    );
    const viewport = getWorldViewport();
    type SpritePlacement = {
      x: number;
      groundY: number;
      size: number;
      image: HTMLImageElement;
    };
    type SpriteBox = {
      left: number;
      top: number;
      right: number;
      bottom: number;
    };
    const occupiedSpriteBoxes: SpriteBox[] = [];
    const townKeepoutBoxes: SpriteBox[] = Array.from(
      frameTownByRegion.values(),
    ).map((town: any) => ({
      left: town.x - 48,
      top: town.y - 86,
      right: town.x + 48,
      bottom: town.y + 22,
    }));
    const territoryBuildingKeepoutBoxes: SpriteBox[] = [
      ...visibleRegions,
      ...visibleIslets,
    ]
      .filter(([region, id]: any[]) => region && derivedRegionOwnership(id) > 0)
      .map(([region]: any[]) => {
        const radius = region.isIslet ? 46 : 62;
        return {
          left: region.x - radius,
          top: region.y - radius * 1.18,
          right: region.x + radius,
          bottom: region.y + radius * 0.34,
        };
      });

    const spriteBox = (placement: SpritePlacement): SpriteBox => ({
      // Use a conservative visible-footprint box. The old narrow box allowed
      // two transparent-edge sprites to overlap in their actual art.
      left: placement.x - placement.size * 0.46,
      top: placement.groundY - placement.size * 0.82,
      right: placement.x + placement.size * 0.46,
      bottom: placement.groundY + placement.size * 0.08,
    });
    const boxesOverlap = (a: SpriteBox, b: SpriteBox, gap = 12) =>
      a.left < b.right + gap &&
      a.right + gap > b.left &&
      a.top < b.bottom + gap &&
      a.bottom + gap > b.top;

    const harborFootprintIsWater = (placement: SpritePlacement) => {
      const xSamples = [-0.38, 0, 0.38];
      const ySamples = [-0.74, -0.46, -0.18, 0.04];
      return xSamples.every((xRatio) =>
        ySamples.every((yRatio) =>
          isWaterAt(
            placement.x + placement.size * xRatio,
            placement.groundY + placement.size * yRatio,
          ),
        ),
      );
    };

    const drawFor = ([region]: any[]) => {
      if (!region || !isPointInViewport(region.x, region.y, viewport, 180)) {
        return;
      }
      const specials = SPECIAL_RESOURCE_MAP_ORDER.filter((name) =>
        territorySpecialResources(Number(region.id)).includes(name),
      );
      if (!specials.length) return;

      const isSelected = state.selectedRegion === Number(region.id);
      const nonHarborSpecials = specials.filter(
        (name) => name !== "Bến tàu tự nhiên",
      );
      ctx.save();
      specials.forEach((name) => {
        const image = strategicMapAssetImage(name);
        if (!image?.complete || image.naturalWidth <= 0) return;

        const layoutScale = isSelected ? 1.12 : specials.length > 1 ? 0.82 : 1;
        const compactScale =
          name === "Bãi ngựa" ||
          name === "Xưởng rèn" ||
          name === "Mỏ Ngọc"
            ? 0.56
            : name === "Bến tàu tự nhiên"
              ? 0.82
              : 1;
        const spriteSize = baseSize * layoutScale * compactScale;

        const regionRx = region.rx || region.r || 120;
        const regionRy = region.ry || (region.r || 120) * 0.78;
        let x = region.x;
        let groundY = region.y - Math.max(22, regionRy * 0.38);
        const candidatePlacements: SpritePlacement[] = [];
        if (name === "Bến tàu tự nhiên") {
          const shore = specialHarborAnchor(region);
          // Put the dock clearly beyond the actual polygon edge. The sprite's
          // ground anchor must sit in the sea, not on the territory interior.
          const waterGap = Math.max(50, spriteSize * 0.72);
          x = shore.x + shore.outwardX * waterGap;
          groundY =
            shore.y +
            shore.outwardY * waterGap +
            Math.max(18, spriteSize * 0.16);
          const tangentX = -shore.outwardY;
          const tangentY = shore.outwardX;
          [0, 1, -1, 2, -2].forEach((sideStep) => {
            [0, 1, 2, 3].forEach((depthStep) => {
              candidatePlacements.push({
                image,
                size: spriteSize,
                x:
                  x +
                  tangentX * sideStep * Math.min(baseSize * 0.38, spriteSize),
                groundY:
                  groundY +
                  tangentY * sideStep * Math.min(baseSize * 0.38, spriteSize) +
                  shore.outwardY * depthStep * 24,
              });
            });
          });
        } else {
          const slot = nonHarborSpecials.indexOf(name);
          const count = nonHarborSpecials.length;
          const singleSide = hash(Number(region.id) * 41.7) < 0.5 ? -1 : 1;
          const slotOffsets =
            count === 1
              ? [singleSide * 0.38]
              : count === 2
                ? [-0.36, 0.36]
                : [-0.4, 0, 0.4];
          x += (slotOffsets[slot] || 0) * regionRx;
          groundY =
            region.y -
            regionRy * (count >= 3 && slot === 1 ? 0.52 : 0.34);
          const candidateStep = Math.min(baseSize * 0.26, spriteSize * 0.72);
          [0, -1, 1, -2, 2].forEach((step) => {
            candidatePlacements.push({
              image,
              size: spriteSize,
              x: x + step * candidateStep,
              groundY: groundY - Math.abs(step) * spriteSize * 0.08,
            });
          });
        }

        const placement = candidatePlacements.find((candidate) => {
          const box = spriteBox(candidate);
          if (
            townKeepoutBoxes.some((townBox) => boxesOverlap(box, townBox)) ||
            territoryBuildingKeepoutBoxes.some((buildingBox) =>
              boxesOverlap(box, buildingBox),
            )
          ) {
            return false;
          }
          if (
            name === "Bến tàu tự nhiên" &&
            !harborFootprintIsWater(candidate)
          ) {
            return false;
          }
          return !occupiedSpriteBoxes.some((occupied) =>
            boxesOverlap(box, occupied),
          );
        });
        if (!placement) return;

        occupiedSpriteBoxes.push(spriteBox(placement));
        ctx.drawImage(
          placement.image,
          placement.x - placement.size / 2,
          placement.groundY - placement.size * 0.86,
          placement.size,
          placement.size,
        );
      });
      ctx.restore();
    };

    visibleRegions.forEach(drawFor);
    visibleIslets.forEach(drawFor);
  }

  function drawCoin(x, y, scale) {
    const sc = scale || 1;
    const r = 9.5 * sc;
    // Drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.beginPath();
    ctx.ellipse(x + 1 * sc, y + r * 0.7, r * 1.05, r * 0.45, 0, 0, TAU);
    ctx.fill();

    // Dark amber outer rim
    ctx.fillStyle = "#92400e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    // Primary bright gold face
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(x, y - 0.5 * sc, r * 0.85, 0, TAU);
    ctx.fill();

    // Inner bright gold highlight ring
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(x, y - 0.8 * sc, r * 0.65, 0, TAU);
    ctx.fill();

    // Shiny specular white highlight dot
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.28, 0, TAU);
    ctx.fill();

    // Inner coin symbol mark
    pxRect(x - 1 * sc, y - 3 * sc, 2 * sc, 5 * sc, "#78350f");
  }

  function drawMainCoast() {
    if (isConquestLayout) return;
    const hulls = [
      [
        [450, 62],
        [612, 72],
        [752, 150],
        [840, 272],
        [884, 420],
        [980, 562],
        [912, 704],
        [778, 824],
        [618, 892],
        [468, 840],
        [330, 748],
        [260, 602],
        [206, 450],
        [254, 300],
        [328, 172],
      ],
      [
        [390, 900],
        [560, 846],
        [736, 862],
        [930, 940],
        [1060, 1078],
        [1010, 1240],
        [830, 1338],
        [628, 1362],
        [448, 1278],
        [310, 1152],
        [286, 1020],
      ],
      [
        [866, 254],
        [1036, 274],
        [1116, 398],
        [1048, 520],
        [904, 530],
        [810, 420],
      ],
      [
        [936, 632],
        [1108, 690],
        [1110, 842],
        [1002, 950],
        [862, 918],
        [812, 774],
      ],
      [
        [1002, 1032],
        [1142, 1112],
        [1100, 1260],
        [952, 1302],
        [870, 1194],
      ],
      [
        [1260, 130],
        [1510, 92],
        [1770, 164],
        [1995, 326],
        [2080, 542],
        [1960, 680],
        [1708, 626],
        [1480, 574],
        [1282, 430],
        [1206, 252],
      ],
      [
        [1238, 684],
        [1460, 646],
        [1748, 674],
        [2028, 764],
        [2120, 936],
        [1960, 1168],
        [1682, 1206],
        [1390, 1082],
        [1190, 894],
      ],
      [
        [1058, 1374],
        [1278, 1280],
        [1588, 1308],
        [1884, 1380],
        [2108, 1548],
        [1810, 1588],
        [1372, 1542],
        [1110, 1500],
      ],
    ];
    hulls.length = 0;
    megaContinents.forEach((m, mi) => {
      const pts = [];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        const seed = m.seed + i * 23;
        const wob = 0.84 + hash(seed) * 0.28 + Math.sin(a * 3 + m.seed) * 0.08;
        pts.push([
          m.x + Math.cos(a) * m.rx * wob,
          m.y + Math.sin(a) * m.ry * wob,
        ]);
      }
      hulls.push(pts);
    });
    hulls.forEach((hull, hi) => {
      pathFromPoints(hull, 0, 0, 11 + hi, 22);
      ctx.fillStyle = "#269bb7";
      ctx.fill();
      pathFromPoints(hull, 8, 12, 24 + hi, 18);
      ctx.fillStyle = "rgba(2, 50, 70, 0.38)";
      ctx.fill();
      pathFromPoints(hull, 2, 6, 37 + hi, 16);
      ctx.fillStyle = hi % 2 ? "#747b5c" : "#858b68";
      ctx.fill();
    });
  }

  function getWorldViewport() {
    const invZoom = 1 / (state.zoom || 1);
    const offX = -((1 - state.zoom) * W * 0.48 + state.panX) * invZoom;
    const offY = -((1 - state.zoom) * H * 0.48 + state.panY) * invZoom;
    // Keep the culling margin roughly screen-sized. A fixed 200 world-unit
    // margin becomes 800 CSS pixels at 4x and renders many invisible regions.
    const margin = Math.min(200, 240 / Math.max(1, state.zoom));
    return {
      minX: offX - margin,
      minY: offY - margin,
      maxX: offX + W * invZoom + margin,
      maxY: offY + H * invZoom + margin,
    };
  }

  function isRegionInViewport(r: any, vp: any) {
    if (!r) return false;
    const rx = r.rx || 150;
    const ry = r.ry || 120;
    return (
      r.x + rx >= vp.minX &&
      r.x - rx <= vp.maxX &&
      r.y + ry >= vp.minY &&
      r.y - ry <= vp.maxY
    );
  }

  function strategicOwnershipSignature() {
    const claimedIds = Object.keys(state.regionOwnership || {});
    return claimedIds
      .map((rawId) => {
        const id = Number(rawId);
        return `${id}:${derivedRegionOwnership(id)}:${state.regionOwnerIds?.[id] || ""}:${getRegionFlagColor(id)}`;
      })
      .join("|");
  }

  function buildStrategicWorldCache(signature: string) {
    const entries = [
      ...regions.map((region: any) => [region, Number(region.id), false] as const),
      ...islets.map((region: any) => [region, Number(region.id), true] as const),
    ];
    if (!entries.length) return null;

    const prepared = entries.map(([region, id, isIslet]) => ({
      region,
      id,
      isIslet,
      polygon: organicTerritoryDisplayPolygon(
        getSharedRegionPolygon(region, id, isIslet),
        region,
        id,
        isIslet,
      ),
    }));
    let rawMinX = Infinity;
    let rawMinY = Infinity;
    let rawMaxX = -Infinity;
    let rawMaxY = -Infinity;
    prepared.forEach((entry) => {
      entry.polygon.forEach(([x, y]) => {
        rawMinX = Math.min(rawMinX, x);
        rawMinY = Math.min(rawMinY, y);
        rawMaxX = Math.max(rawMaxX, x);
        rawMaxY = Math.max(rawMaxY, y);
      });
    });
    const minX = Math.floor(rawMinX - 20);
    const minY = Math.floor(rawMinY - 20);
    const maxX = Math.ceil(rawMaxX + 20);
    const maxY = Math.ceil(rawMaxY + 20);
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const maxTextureSize = isTouchDevice() ? 1536 : 2048;
    const cacheScale = Math.min(
      isTouchDevice() ? 0.14 : 0.18,
      maxTextureSize / width,
      maxTextureSize / height,
    );
    const cacheCanvas = document.createElement("canvas");
    cacheCanvas.width = Math.max(1, Math.ceil(width * cacheScale));
    cacheCanvas.height = Math.max(1, Math.ceil(height * cacheScale));
    const cacheContext = cacheCanvas.getContext("2d", { alpha: true });
    if (!cacheContext) return null;

    const previousContext = ctx;
    ctx = cacheContext;
    ctx.save();
    ctx.scale(cacheScale, cacheScale);
    ctx.translate(-minX, -minY);
    prepared.forEach(({ region, id, isIslet, polygon }) => {
      const biome = visualBiome(region, id, isIslet);
      const claimedLand = inflatePolygon(polygon, 3, region.x, region.y);
      ctx.globalAlpha = 1;
      fillSmoothPath(claimedLand, territoryTerrainColor(biome));
      const ownerCode = isConquestLayout ? 0 : derivedRegionOwnership(id);
      if (ownerCode > 0) {
        ctx.globalAlpha = 0.52;
        fillSmoothPath(claimedLand, getRegionFlagColor(id));
      }
    });

    const strokeSegments = (
      polygon: Array<[number, number]>,
      shouldDraw: (midX: number, midY: number) => boolean,
      color: string,
      lineWidth: number,
    ) => {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const midX = (p1[0] + p2[0]) / 2;
        const midY = (p1[1] + p2[1]) / 2;
        if (!shouldDraw(midX, midY)) continue;
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
      }
      ctx.stroke();
    };

    prepared.forEach(({ region, id, isIslet, polygon }) => {
      const coastal =
        isIslet ||
        region.coastal ||
        mainlandCoastalRegionIds.has(id) ||
        polygon.some(([x, y]) => !isSharedInlandVertex(x, y, region));
      if (coastal) {
        const isCoastEdge = (x: number, y: number) =>
          isIslet || !isSharedInlandVertex(x, y, region);
        strokeSegments(polygon, isCoastEdge, "rgba(5, 15, 22, 0.92)", 24);
        strokeSegments(polygon, isCoastEdge, "rgba(126, 166, 161, 0.74)", 8);
      }

      const ownerCode = isConquestLayout ? 0 : derivedRegionOwnership(id);
      if (ownerCode <= 0) return;
      const ownerNeighbors = nearbyMainlandRegions(region);
      const isCountryEdge = (midX: number, midY: number) => {
        const currentOwnerId = state.regionOwnerIds?.[id];
        const currentOwnerName = state.regionOwnerNames?.[id];
        return !ownerNeighbors.some((other: any) => {
          const dx = midX - other.x;
          const dy = midY - other.y;
          const otherRx = (other.rx || 230) * 1.08;
          const otherRy = (other.ry || otherRx * 0.78) * 1.08;
          if (
            (dx * dx) / (otherRx * otherRx) +
              (dy * dy) / (otherRy * otherRy) >
            1.08
          ) {
            return false;
          }
          if (derivedRegionOwnership(other.id) !== ownerCode) return false;
          if (ownerCode === 1) return true;
          const otherOwnerId = state.regionOwnerIds?.[other.id];
          return currentOwnerId && otherOwnerId
            ? currentOwnerId === otherOwnerId
            : Boolean(
                currentOwnerName &&
                  currentOwnerName === state.regionOwnerNames?.[other.id],
              );
        });
      };
      strokeSegments(polygon, isCountryEdge, "rgba(4, 10, 15, 0.96)", 28);
      strokeSegments(polygon, isCountryEdge, getRegionFlagColor(id), 11);
    });
    ctx.restore();
    ctx = previousContext;

    return {
      canvas: cacheCanvas,
      minX,
      minY,
      width,
      height,
      signature,
    };
  }

  function drawStrategicWorldCache() {
    const now = performance.now();
    let signature = strategicWorldCache?.signature || "";
    if (
      !strategicWorldCache ||
      now - lastStrategicCacheSignatureCheckAt >= 1000
    ) {
      lastStrategicCacheSignatureCheckAt = now;
      signature = strategicOwnershipSignature();
      if (!strategicWorldCache || strategicWorldCache.signature !== signature) {
        strategicWorldCache = buildStrategicWorldCache(signature);
      }
    }
    if (!strategicWorldCache) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";
    ctx.drawImage(
      strategicWorldCache.canvas,
      strategicWorldCache.minX,
      strategicWorldCache.minY,
      strategicWorldCache.width,
      strategicWorldCache.height,
    );
    ctx.restore();
    return true;
  }

  function isPointInViewport(x: number, y: number, vp: any, margin = 200) {
    if (!vp) return true;
    const effectiveMargin = Math.min(
      margin,
      420 / Math.max(1, state.zoom),
    );
    return (
      x >= vp.minX - effectiveMargin &&
      x <= vp.maxX + effectiveMargin &&
      y >= vp.minY - effectiveMargin &&
      y <= vp.maxY + effectiveMargin
    );
  }

  function isFastPanning() {
    return (
      Boolean(state.drag && state.dragMoved) ||
      Math.abs(panVelX) > 0.35 ||
      Math.abs(panVelY) > 0.35 ||
      Boolean(minimapController?.isDragging())
    );
  }

  function isCameraInteracting() {
    return (
      isFastPanning() ||
      performance.now() - lastCameraInputAt < 180
    );
  }

  let fastRenderMode = false;
  // Keep normal world assets through almost the entire zoom range. The cheap
  // strategic renderer is entered only at the true global overview near the
  // camera minimum, so a small wheel/pinch zoom never empties the map.
  const OVERVIEW_PALETTE_THRESHOLD = 0.22;
  const FAR_SCENERY_THRESHOLD = 0.22;
  const OVERVIEW_LIGHTWEIGHT_THRESHOLD = 0.06;
  // Small epsilon avoids a fractional zoom value such as 0.0500001 missing
  // the far-overview tier. Markers start exactly when heavy assets are hidden.
  const OVERVIEW_ICON_THRESHOLD = 0.06;
  const HIGH_ZOOM_PERFORMANCE_THRESHOLD = 3.2;
  let overviewRenderMode = false;
  let farSceneryRenderMode = false;
  let lightweightAssetRenderMode = false;
  // Render pressure is based on visible simulation entities, not the number
  // of players connected to the server. This lets a busy world stay readable
  // while automatically switching expensive effects to their LOD versions.
  let crowdedRenderMode = false;
  let ultraCrowdedRenderMode = false;
  let regionCacheBuildBudget = 0;

  function drawWorld() {
    const fastPan = isCameraInteracting();
    // Zoom level alone must not remove assets. During active dragging we may
    // temporarily skip effects, while settled rendering follows the LOD tiers.
    fastRenderMode = fastPan;
    overviewRenderMode = state.zoom <= OVERVIEW_PALETTE_THRESHOLD;
    farSceneryRenderMode = state.zoom <= FAR_SCENERY_THRESHOLD;
    lightweightAssetRenderMode =
      state.zoom <= OVERVIEW_LIGHTWEIGHT_THRESHOLD;
    // Build only a few new offscreen territory caches per settled frame. A
    // zoom-tier change can invalidate many regions at once; spreading that
    // work prevents a long hitch immediately after a pinch or wheel zoom.
    regionCacheBuildBudget =
      fastPan || farSceneryRenderMode || lightweightAssetRenderMode
        ? 0
        : state.zoom >= HIGH_ZOOM_PERFORMANCE_THRESHOLD
          ? 1
        : isTouchDevice()
          ? 2
          : 4;
    const renderEntityLoad =
      towns.length +
      state.voyages.length * 3 +
      (state.activeBattles?.length || 0) * 6;
    crowdedRenderMode = renderEntityLoad > 180;
    ultraCrowdedRenderMode = renderEntityLoad > 420;
    const renderContext: RenderContext = {
      ctx,
      width: W,
      height: H,
      dpr,
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      tick: state.tick,
    };
    drawOceanLayer(renderContext);
    // drawRoutes(); // routes hidden
    ctx.save();
    ctx.translate(
      (1 - state.zoom) * W * 0.48 + state.panX,
      (1 - state.zoom) * H * 0.48 + state.panY,
    );
    ctx.scale(state.zoom, state.zoom);

    // Draw world space ocean texture & details (moves with pan/zoom)
    if (
      !fastRenderMode &&
      !farSceneryRenderMode &&
      !lightweightAssetRenderMode
    ) {
      drawWorldOceanTexture();
      drawWorldOceanDetails();
    }

    function drawRoKConquestPassesAndMountains(vp?: any) {
      // 1. Level 1 Passes (Đèo Cấp 1 - Cyan #00d2fe)
      const passLvl1: Array<[number, number]> = [
        [2500, 560],
        [3500, 560],
        [1040, 1300],
        [960, 2600],
        [4640, 1300],
        [4640, 2700],
        [2100, 3540],
        [3500, 3540],
      ];
      // 2. Level 2 Passes (Đèo Cấp 2 - Orange #ff8c00)
      const passLvl2: Array<[number, number]> = [
        [1600, 1100],
        [2400, 1040],
        [3960, 1100],
        [1500, 2900],
        [1760, 3100],
        [3700, 3100],
        [1240, 1460],
        [1240, 1760],
        [3200, 880],
        [3440, 880],
        [4040, 2200],
        [4040, 2500],
        [2040, 3240],
        [2300, 3240],
      ];
      // 3. Level 3 Passes (Đèo Cấp 3 - Red #ff3333 8-gate Ring)
      const passLvl3: Array<[number, number]> = [
        [2800, 1720],
        [3120, 1800],
        [3280, 2100],
        [3120, 2400],
        [2800, 2480],
        [2480, 2400],
        [2320, 2100],
        [2480, 1800],
      ];

      // Helper to draw single 3D Snow-Capped Mountain Peak
      const drawMountainPeak = (mx: number, my: number, scale = 1.0) => {
        if (vp && !isPointInViewport(mx, my, vp, 250)) return;
        ctx.save();
        const s = scale;

        // Drop shadow
        pxRect(mx - 22 * s, my + 4 * s, 44 * s, 12 * s, "rgba(0,0,0,0.35)");

        // Dark Mountain Shadow Side
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.moveTo(mx, my - 34 * s);
        ctx.lineTo(mx - 24 * s, my + 6 * s);
        ctx.lineTo(mx, my + 8 * s);
        ctx.closePath();
        ctx.fill();

        // Sunlit Mountain Side
        ctx.fillStyle = "#475569";
        ctx.beginPath();
        ctx.moveTo(mx, my - 34 * s);
        ctx.lineTo(mx + 24 * s, my + 6 * s);
        ctx.lineTo(mx, my + 8 * s);
        ctx.closePath();
        ctx.fill();

        // Snow Cap Peak (White)
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(mx, my - 34 * s);
        ctx.lineTo(mx - 8 * s, my - 16 * s);
        ctx.lineTo(mx, my - 14 * s);
        ctx.lineTo(mx + 8 * s, my - 16 * s);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      };

      // Render Continuous Mountain Walls along Zone Boundary Loops
      // Zone 1 Outer Mountain Chains
      for (let x = 600; x <= 5000; x += 110) {
        drawMountainPeak(x, 520, 1.15);
        drawMountainPeak(x, 3620, 1.15);
      }
      for (let y = 600; y <= 3500; y += 95) {
        drawMountainPeak(920, y, 1.15);
        drawMountainPeak(4680, y, 1.15);
      }

      // Zone 2 / Zone 3 Ring Mountain Chains
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
        const rx1 = 1850;
        const ry1 = 1250;
        const mx1 = 2800 + Math.cos(angle) * rx1;
        const my1 = 2100 + Math.sin(angle) * ry1;
        drawMountainPeak(mx1, my1, 1.25);

        const rx2 = 820;
        const ry2 = 560;
        const mx2 = 2800 + Math.cos(angle) * rx2;
        const my2 = 2100 + Math.sin(angle) * ry2;
        drawMountainPeak(mx2, my2, 1.35);
      }

      // Helper to draw Heavy 3D RoK Mountain Pass Fortress Badge
      const drawPassFortressBadge = (
        x: number,
        y: number,
        label: string,
        color: string,
        badgeBg: string,
      ) => {
        if (vp && !isPointInViewport(x, y, vp, 600)) return;
        ctx.save();

        // Shadow base
        pxRect(x - 46, y + 4, 92, 32, "rgba(0,0,0,0.6)");

        // 3D Heavy Stone Fortress Base Walls & Side Turrets
        pxRect(x - 48, y - 28, 96, 30, "#0f172a");
        pxRect(x - 44, y - 32, 88, 8, color);

        // Left & Right Guard Towers
        pxRect(x - 48, y - 42, 18, 22, "#334155");
        pxRect(x + 30, y - 42, 18, 22, "#334155");
        pxRect(x - 48, y - 46, 18, 4, color);
        pxRect(x + 30, y - 46, 18, 4, color);

        // Center Gate Arch Tunnel
        pxRect(x - 14, y - 16, 28, 18, "#020617");

        // RoK Pass Badge Plaque
        pxRect(x - 38, y - 56, 76, 20, badgeBg);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.0;
        ctx.strokeRect(x - 38, y - 56, 76, 20);

        text(label, x, y - 42, 11, "#ffffff", "center");
        ctx.restore();
      };

      // Draw Passes
      passLvl1.forEach(([x, y]) =>
        drawPassFortressBadge(x, y, "ĐÈO CẤP 1", "#00d2fe", "#0c4a6e"),
      );
      passLvl2.forEach(([x, y]) =>
        drawPassFortressBadge(x, y, "ĐÈO CẤP 2", "#ff8c00", "#7c2d12"),
      );
      passLvl3.forEach(([x, y]) =>
        drawPassFortressBadge(x, y, "ĐÈO CẤP 3", "#ff3333", "#7f1d1d"),
      );

      // Central Lost Temple Monument (Thần Điện Tối Cao)
      const tx = 2800;
      const ty = 2100;
      if (!vp || isPointInViewport(tx, ty, vp, 600)) {
        ctx.save();
        // Glowing Auras around Lost Temple
        const aura = ctx.createRadialGradient(tx, ty, 10, tx, ty, 140);
        aura.addColorStop(0, "rgba(251, 191, 36, 0.65)");
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(tx, ty, 140, 0, Math.PI * 2);
        ctx.fill();

        // Golden Temple Structure
        pxRect(tx - 60, ty - 40, 120, 50, "#92400e");
        pxRect(tx - 50, ty - 65, 100, 30, "#d97706");
        pxRect(tx - 35, ty - 95, 70, 35, "#f59e0b");
        pxRect(tx - 15, ty - 125, 30, 35, "#fbbf24");
        pxRect(tx - 4, ty - 145, 8, 25, "#fef08a");

        // Title Plaque
        pxRect(tx - 80, ty + 20, 160, 24, "#0f172a");
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.strokeRect(tx - 80, ty + 20, 160, 24);
        text("🏰 THẦN ĐIỆN TỐI CAO", tx, ty + 36, 12, "#fbbf24", "center");
        ctx.restore();
      }
    }

    // Tính toán danh sách các đảo đang nằm trong màn hình
    const vp = getWorldViewport();
    const visibleIslets = [];
    const visibleRegions = [];
    for (let i = 0; i < islets.length; i++) {
      const r = islets[i];
      if (isRegionInViewport(r, vp)) visibleIslets.push([r, r.id]);
    }
    for (let i = 0; i < regions.length; i++) {
      const r = regions[i];
      if (isRegionInViewport(r, vp)) visibleRegions.push([r, r.id]);
    }

    if (!farSceneryRenderMode) {
      // Layer 2: continuous mainland foundation below all province polygons.
      drawStrategyContinentLayer(visibleRegions, visibleIslets);

      // Pass 0/1 only for standalone islets. At far zoom the strategic
      // coastline pass replaces waves, cliffs and island depth completely.
      visibleIslets.forEach(([r, id]) => drawRegion(r, id, 0, true));
      visibleIslets.forEach(([r, id]) => drawRegion(r, id, 1, true));
    }

    // At strategic zoom, one cached bitmap replaces hundreds of territory
    // land paths. Dynamic selections/clearing states are layered afterward.
    const strategicBaseDrawn =
      overviewRenderMode && drawStrategicWorldCache();
    if (!strategicBaseDrawn) {
      visibleIslets.forEach(([r, id]) => drawRegion(r, id, 2, true));
      visibleRegions.forEach(([r, id]) => drawRegion(r, id, 2, false));
    } else {
      activeClearingRegionIds().forEach((regionId) => {
        const clearingRegion = landById(regionId);
        if (clearingRegion && isRegionInViewport(clearingRegion, vp)) {
          drawRegion(
            clearingRegion,
            regionId,
            2,
            Boolean(clearingRegion.isIslet),
          );
        }
      });
    }

    // Re-render active/selected territory on top of all other regions so it floats above everything
    if (state.selectedRegion !== null && state.selectedRegion !== undefined) {
      const activeId = state.selectedRegion;
      const activeRegion = landById(activeId);
      if (activeRegion && isRegionInViewport(activeRegion, vp)) {
        drawRegion(activeRegion, activeId, 2, Boolean(activeRegion.isIslet));
      }
    }

    if (!farSceneryRenderMode) {
      // Pass 3: Draw diorama assets only while they remain readable.
      visibleIslets.forEach(([r, id]) => drawRegion(r, id, 3, true));
      visibleRegions.forEach(([r, id]) => drawRegion(r, id, 3, false));

      if (state.selectedRegion !== null && state.selectedRegion !== undefined) {
        const activeId = state.selectedRegion;
        const activeRegion = landById(activeId);
        if (activeRegion && isRegionInViewport(activeRegion, vp)) {
          drawRegion(activeRegion, activeId, 3, Boolean(activeRegion.isIslet));
        }
      }
    }

    // Strategic coastline/country borders are baked into the world cache.
    if (!strategicBaseDrawn) {
      visibleIslets.forEach(([r, id]) => drawRegion(r, id, 4, true));
      visibleRegions.forEach(([r, id]) => drawRegion(r, id, 4, false));
    } else {
      activeClearingRegionIds().forEach((regionId) => {
        const clearingRegion = landById(regionId);
        if (clearingRegion && isRegionInViewport(clearingRegion, vp)) {
          drawRegion(
            clearingRegion,
            regionId,
            4,
            Boolean(clearingRegion.isIslet),
          );
        }
      });
    }

    if (state.selectedRegion !== null && state.selectedRegion !== undefined) {
      const activeId = state.selectedRegion;
      const activeRegion = landById(activeId);
      if (activeRegion && isRegionInViewport(activeRegion, vp)) {
        drawRegion(activeRegion, activeId, 4, Boolean(activeRegion.isIslet));
      }
    }

    if (isConquestLayout) {
      drawRoKConquestPassesAndMountains(vp);
    }

    // Resource production is communicated by the territory tooltip. The old
    // icon pass duplicated dioramas with mines and obscured borders/towns.
    if (!fastRenderMode && !crowdedRenderMode && !isConquestLayout)
      drawDecoration(vp);
    // Territory buildings are the base layer for a settlement. In overview
    // these functions automatically draw compact markers/tokens; above 0.5x
    // they restore the original building and unit sprites.
    drawClaimedTerritoryMarkers(vp, [...visibleIslets, ...visibleRegions]);
    drawSpecialTerritorySprites(visibleRegions, visibleIslets);
    drawVoyages(vp);
    if (!isConquestLayout) {
      activeClearingRegionIds().forEach((regionId) =>
        drawSettlerForRegion(regionId),
      );
    }
    ctx.restore();

    // Floating sky clouds in screen space (disabled to optimize performance/lag)
    // drawClouds();
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

    const specialMapName =
      type === "horse" || type === "horses" || type === "pasture"
        ? "Bãi ngựa"
        : type === "forge"
          ? "Xưởng rèn"
          : type === "harbor"
            ? "Bến tàu tự nhiên"
            : type === "gems"
              ? "Mỏ Ngọc"
              : null;
    if (specialMapName) {
      const image = strategicMapAssetImage(specialMapName);
      if (image?.complete && image.naturalWidth > 0) {
        const size = 82;
        ctx.drawImage(image, x - size / 2, y - size * 0.86, size, size);
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
    else if (type === "forge") spriteName = "forge";
    else if (type === "harbor") spriteName = "harbor";
    else if (type === "silver") spriteName = "stone";
    else if (type === "ruby") spriteName = "gems";
    else if (type === "amber") spriteName = "gems";

    drawMedievalWorldSprite(spriteName, x, y, 42);
  }

  function getDynamicButtons() {
    const rightX = W - 134;
    return [
      { id: "army", x: 24, y: H - 230, w: 104, h: 86, label: "QUÂN ĐỘI" },
      { id: "build", x: 24, y: H - 130, w: 104, h: 86, label: "XÂY DỰNG" },
      { id: "treasure", x: rightX, y: 92, w: 110, h: 82, label: "BẢO VẬT" },
      { id: "map", x: rightX, y: 280, w: 110, h: 82, label: "BẢN ĐỒ" },
      { id: "event", x: rightX, y: 374, w: 110, h: 82, label: "SỰ KIỆN" },
      { id: "home", x: rightX, y: 468, w: 110, h: 82, label: "THỦ ĐÔ" },
    ];
  }

  function drawSidePanels() {
    // Dynamically calculate mission values
    const ownedTowns = towns.filter((t) => t.owner === 0);
    const ownedTownsCount = ownedTowns.length;
    const ownedRegionsCount = state.regionOwnership.filter(
      (o) => o === 1,
    ).length;
    const barracksCount = ownedTowns.reduce(
      (a, t) => a + (t.buildings?.barracks || 0),
      0,
    );
    const lv3TownsCount = ownedTowns.filter((t) => t.lvl >= 3).length;

    state.missions[0].value = ownedTownsCount;
    state.missions[1].value = barracksCount;
    state.missions[2].value = lv3TownsCount;

    panel(12, 94, 248, 158, "NHIỆM VỤ");
    state.missions.forEach((m, i) => {
      text(m.text, 28, 151 + i * 42, 17, "#f3f0db");
      text(`${m.value}/${m.goal}`, 225, 151 + i * 42, 18, "#ffd34d", "right");
    });

    panel(12, 274, 180, 158, "THÔNG TIN");
    const totalRegions = regions.length + islets.length;
    const townTroops = ownedTowns.reduce((a, t) => a + t.troops, 0);
    const voyageTroops = state.voyages
      .filter((v) => v.owner === 0)
      .reduce((a, v) => a + v.power, 0);
    const totalTroops = townTroops + voyageTroops;

    text(`LÃNH THỔ: ${ownedRegionsCount}/${totalRegions}`, 28, 330, 18);
    text(`THÀNH PHỐ: ${ownedTownsCount}`, 28, 372, 18);
    text(`QUÂN ĐỘI: ${totalTroops}`, 28, 414, 18);

    getDynamicButtons().forEach(drawButton);

    panel(14, H - 250, 354, 232, "TRÒ CHUYỆN");
    state.log.slice(-4).forEach((line, i) => {
      const color = factions[i % factions.length].color;
      text(line, 34, H - 205 + i * 27, 18, color);
    });
    pxRect(34, H - 70, 253, 36, "#071018");
    text("NHẬP TIN NHẮN...", 44, H - 62, 16, "#8196a3");
    pxRect(302, H - 74, 42, 42, "#2b3b45");
    text(">", 323, H - 68, 30, "#ffd34d", "center");

    const t = towns.find((it) => it.id === state.selected);
    if (t) {
      panel(386, H - 114, 512, 96);
      text(
        `THÀNH ${t.id} - ${factions[t.owner].name}`,
        404,
        H - 90,
        19,
        factions[t.owner].color,
      );
      text(`CẤP ${t.lvl}  |  QUÂN ${t.troops}`, 404, H - 60, 16, "#fff3d2");
      text(state.toast, 610, H - 60, 15, "#ffd34d");
    }
  }

  function drawButton(b) {
    const hot = state.hover === b.id;
    panel(b.x, b.y, b.w, b.h);
    if (hot)
      pxRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16, "rgba(255,211,77,0.12)");
    const cx = b.x + b.w / 2;
    const cy = b.y + 35;
    if (b.id === "army") drawShield(cx, cy);
    else if (b.id === "build") drawHammer(cx, cy);
    else if (b.id === "research") drawBook(cx, cy);
    else if (b.id === "treasure") drawSword(cx, cy);
    else if (b.id === "ally") drawBlocks(cx, cy);
    else if (b.id === "map") drawMap(cx, cy);
    else if (b.id === "event") drawStar(cx, cy);
    else if (b.id === "home") drawCastleIcon(cx, cy);
    else if (b.id === "zoomIn" || b.id === "zoomOut")
      text(b.label, cx, b.y + 12, 32, "#fff3d2", "center");
    if (!["zoomIn", "zoomOut"].includes(b.id))
      text(b.label, cx, b.y + b.h - 28, 17, "#fff3d2", "center");
  }

  function drawCastleIcon(x, y) {
    pxRect(x - 18, y - 10, 36, 26, "#dfa437");
    pxRect(x - 14, y - 18, 6, 8, "#c68d27");
    pxRect(x + 8, y - 18, 6, 8, "#c68d27");
    pxRect(x - 3, y - 4, 6, 12, "#111");
  }

  function drawShield(x, y) {
    pxRect(x - 19, y - 18, 38, 39, "#e9e2c8");
    pxRect(x - 13, y - 12, 26, 26, COLORS.blue);
    pxRect(x - 3, y - 18, 6, 39, "#d6a134");
  }

  function drawHammer(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.55);
    pxRect(-5, -5, 10, 34, "#7a4a28");
    pxRect(-20, -17, 40, 16, "#b6d0df");
    pxRect(-17, -21, 34, 5, "#e5f0f4");
    ctx.restore();
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

  function drawBook(x, y) {
    pxRect(x - 24, y - 19, 48, 38, "#7a3d22");
    pxRect(x - 20, y - 15, 18, 30, "#f6e6ba");
    pxRect(x + 2, y - 15, 18, 30, "#f6e6ba");
    pxRect(x - 1, y - 16, 3, 33, "#d49a33");
  }

  function drawSword(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.72);
    pxRect(-5, -28, 10, 44, "#e5edf3");
    pxRect(-12, 8, 24, 8, "#d89b21");
    pxRect(-4, 15, 8, 24, "#7b3d22");
    ctx.restore();
  }

  function drawBlocks(x, y) {
    for (let iy = 0; iy < 2; iy++) {
      for (let ix = 0; ix < 2; ix++) {
        pxRect(x - 25 + ix * 28, y - 20 + iy * 28, 21, 21, "#f2aa18");
        pxRect(x - 20 + ix * 28, y - 25 + iy * 28, 17, 7, "#ffd34d");
      }
    }
  }

  function drawMap(x, y) {
    pxRect(x - 24, y - 20, 48, 40, "#f7d978");
    pxRect(x - 18, y - 13, 13, 27, "#4fa65a");
    pxRect(x + 2, y - 15, 15, 30, "#2f70d7");
    pxRect(x - 2, y - 20, 4, 40, "#b2852d");
  }

  function drawStar(x, y) {
    ctx.fillStyle = "#ffc526";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 13 : 30;
      const a = -Math.PI / 2 + (i / 10) * TAU;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#94611b";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  function drawLighthouse(x, y) {
    pxRect(x - 18, y + 30, 38, 15, "#71543a");
    pxRect(x - 11, y - 30, 22, 62, "#f1ead8");
    pxRect(x - 8, y - 6, 16, 10, "#d74635");
    pxRect(x - 16, y - 42, 32, 14, "#d74635");
    pxRect(x - 5, y - 56, 10, 14, "#ffe8ae");
    pxRect(x - 18, y - 46, 36, 6, "#fff4ce");
  }

  function drawMainCoast() {
    const hulls = [
      [
        [450, 62],
        [612, 72],
        [752, 150],
        [840, 272],
        [884, 420],
        [980, 562],
        [912, 704],
        [778, 824],
        [618, 892],
        [468, 840],
        [330, 748],
        [260, 602],
        [206, 450],
        [254, 300],
        [328, 172],
      ],
      [
        [390, 900],
        [560, 846],
        [736, 862],
        [930, 940],
        [1060, 1078],
        [1010, 1240],
        [830, 1338],
        [628, 1362],
        [448, 1278],
        [310, 1152],
        [286, 1020],
      ],
      [
        [866, 254],
        [1036, 274],
        [1116, 398],
        [1048, 520],
        [904, 530],
        [810, 420],
      ],
      [
        [936, 632],
        [1108, 690],
        [1110, 842],
        [1002, 950],
        [862, 918],
        [812, 774],
      ],
      [
        [1002, 1032],
        [1142, 1112],
        [1100, 1260],
        [952, 1302],
        [870, 1194],
      ],
      [
        [1260, 130],
        [1510, 92],
        [1770, 164],
        [1995, 326],
        [2080, 542],
        [1960, 680],
        [1708, 626],
        [1480, 574],
        [1282, 430],
        [1206, 252],
      ],
      [
        [1238, 684],
        [1460, 646],
        [1748, 674],
        [2028, 764],
        [2120, 936],
        [1960, 1168],
        [1682, 1206],
        [1390, 1082],
        [1190, 894],
      ],
      [
        [1058, 1374],
        [1278, 1280],
        [1588, 1308],
        [1884, 1380],
        [2108, 1548],
        [1810, 1588],
        [1372, 1542],
        [1110, 1500],
      ],
      [
        [1280, 132],
        [1510, 96],
        [1768, 166],
        [1992, 326],
        [2078, 542],
        [1960, 680],
        [1708, 626],
        [1480, 574],
        [1282, 430],
        [1206, 252],
      ],
      [
        [1240, 686],
        [1460, 646],
        [1748, 674],
        [2024, 764],
        [2116, 936],
        [1960, 1168],
        [1682, 1206],
        [1390, 1082],
        [1190, 894],
      ],
      [
        [1058, 1374],
        [1278, 1280],
        [1588, 1308],
        [1884, 1380],
        [2108, 1548],
        [2014, 1776],
        [1710, 1844],
        [1372, 1818],
        [1110, 1680],
      ],
    ];
    hulls.length = 0;
    megaContinents.forEach((m, mi) => {
      const pts = [];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU;
        const seed = m.seed + i * 23;
        const wob = 0.84 + hash(seed) * 0.28 + Math.sin(a * 3 + m.seed) * 0.08;
        pts.push([
          m.x + Math.cos(a) * m.rx * wob,
          m.y + Math.sin(a) * m.ry * wob,
        ]);
      }
      hulls.push(pts);
    });
    hulls.forEach((hull, hi) => {
      pathFromPoints(hull, 0, 0, 11 + hi, 22);
      ctx.fillStyle = "#31c6cf";
      ctx.fill();
      pathFromPoints(hull, 8, 12, 24 + hi, 18);
      ctx.fillStyle = "rgba(2,62,78,0.32)";
      ctx.fill();
      pathFromPoints(hull, 2, 6, 37 + hi, 16);
      ctx.fillStyle = hi % 2 ? "#747b5c" : "#858b68";
      ctx.fill();
      ctx.save();
      pathFromPoints(hull, 2, 6, 37 + hi, 16);
      ctx.clip();
      const minX = Math.min(...hull.map((p) => p[0])) - 20;
      const maxX = Math.max(...hull.map((p) => p[0])) + 20;
      const minY = Math.min(...hull.map((p) => p[1])) - 20;
      const maxY = Math.max(...hull.map((p) => p[1])) + 20;
      const g = ctx.createLinearGradient(minX, minY, maxX, maxY);
      g.addColorStop(0, "#a7aa82");
      g.addColorStop(0.55, "#777f5d");
      g.addColorStop(1, "#959b73");
      ctx.fillStyle = g;
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      for (let i = 0; i < 260; i++) {
        const x = minX + hash(hi * 701 + i * 17) * (maxX - minX);
        const y = minY + hash(hi * 907 + i * 29) * (maxY - minY);
        const p = hash(hi * 311 + i * 37);
        if (p > 0.84)
          pxRect(
            x,
            y,
            p > 0.9 ? 5 : 3,
            p > 0.9 ? 3 : 2,
            p > 0.9 ? "#b9b98d" : "#626d51",
          );
      }
      ctx.restore();
    });
  }

  function mapToScreen(x, y) {
    return {
      x: x * state.zoom + (1 - state.zoom) * W * 0.48 + state.panX,
      y: y * state.zoom + (1 - state.zoom) * H * 0.48 + state.panY,
    };
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
      minimapController?.isDragging() ||
      now - lastMinimapDrawAt >
        (farSceneryRenderMode ? 650 : crowdedRenderMode ? 420 : 180)
    ) {
      minimapController?.draw();
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
    const base = overviewRenderMode
      ? visualBiome(r, r.id, isIslet).a || "#557a46"
      : BIOME_COLORS[visualBiomeIndex(r, r.id, isIslet)] || "#557a46";
    let color = base;

    const ownerCode = isConquestLayout ? 0 : derivedRegionOwnership(r.id);
    if (ownerCode > 0) {
      color = getRegionFlagColor(r.id);
    }
    return color;
  }

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

  // Minimap owns its canvas rendering and pointer lifecycle. The engine only
  // supplies world/camera snapshots and receives a world-coordinate pan.
  minimapController = createMinimapController({
    canvas: minimapCanvas,
    getDpr: () => dpr,
    getViewport: () => ({ width: W, height: H }),
    getCamera: () => ({
      panX: state.panX,
      panY: state.panY,
      zoom: state.zoom,
    }),
    getTick: () => state.tick,
    getRegions: () => regions,
    getIslets: () => islets,
    getTowns: () => towns,
    getLocalPlayerId: () => state.localPlayerId,
    getTerritoryColor: minimapTerritoryColor,
    panToWorld: (worldX, worldY) => {
      state.panX = -worldX * state.zoom + W * 0.5 - (1 - state.zoom) * W * 0.48;
      state.panY = -worldY * state.zoom + H * 0.5 - (1 - state.zoom) * H * 0.48;
      clampPan();
      saveCamera();
    },
  });

  function buttonAt(x, y) {
    return getDynamicButtons().find(
      (b) => x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h,
    );
  }

  function townAt(x, y) {
    if (state.newbieMode && state.newbiePhase !== "done") return null;
    const wx = (x - (1 - state.zoom) * W * 0.48 - state.panX) / state.zoom;
    const wy = (y - (1 - state.zoom) * H * 0.48 - state.panY) / state.zoom;
    let best = null;
    towns.forEach((t) => {
      const d = Math.hypot(t.x - wx, t.y - wy);
      if (d < 48 && (!best || d < best.d)) best = { t, d };
    });
    return best && best.t;
  }

  function screenToMap(x: number, y: number) {
    // Must match drawWorld: ctx.translate((1-zoom)*W*0.48 + panX, ...)
    const tx = (1 - state.zoom) * W * 0.48 + state.panX;
    const ty = (1 - state.zoom) * H * 0.48 + state.panY;
    return {
      x: (x - tx) / state.zoom,
      y: (y - ty) / state.zoom,
    };
  }

  function mapToScreen(x: number, y: number) {
    // Must match drawWorld: world point → canvas pixel → CSS pixel
    const tx = (1 - state.zoom) * W * 0.48 + state.panX;
    const ty = (1 - state.zoom) * H * 0.48 + state.panY;
    const canvasX = x * state.zoom + tx;
    const canvasY = y * state.zoom + ty;
    if (typeof document !== "undefined" && canvas) {
      const rect = canvas.getBoundingClientRect();
      const cssX = rect.left + (canvasX / (canvas.width || W)) * rect.width;
      const cssY = rect.top + (canvasY / (canvas.height || H)) * rect.height;
      return { x: cssX, y: cssY };
    }
    return { x: canvasX, y: canvasY };
  }

  function canvasToReactRegionId(canvasId: number): number {
    return canvasId;
  }

  function reactToCanvasRegionId(reactId: number): number {
    return reactId;
  }

  function pointInPolygon(
    px: number,
    py: number,
    polygon: Array<[number, number]>,
  ) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0],
        yi = polygon[i][1];
      const xj = polygon[j][0],
        yj = polygon[j][1];
      const intersect =
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi || 1) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function regionAtCoords(x: number, y: number): number {
    let bestRegion: { id: number; d: number } | null = null;
    const nearbyLands =
      landQueryBuckets.get(
        `${Math.floor(x / LAND_QUERY_CELL_SIZE)}:${Math.floor(y / LAND_QUERY_CELL_SIZE)}`,
      ) || [];
    nearbyLands.forEach((r) => {
      if (r.isIslet) return;
      const brx = (r.rx || r.r || 180) * 1.35;
      const bry = (r.ry || (r.r || 180) * 0.78) * 1.35;
      if (x < r.x - brx || x > r.x + brx || y < r.y - bry || y > r.y + bry)
        return;
      const poly = getSharedRegionPolygon(r, r.id, false);
      if (pointInPolygon(x, y, poly)) {
        const d = Math.hypot(x - r.x, y - r.y);
        if (!bestRegion || d < bestRegion.d) bestRegion = { id: r.id, d };
      }
    });

    if (bestRegion !== null) return bestRegion.id;

    let bestIslet: { id: number; d: number } | null = null;
    nearbyLands.forEach((r) => {
      if (!r.isIslet) return;
      const brx = (r.rx || r.r || 120) * 1.05;
      const bry = (r.ry || (r.r || 120) * 0.78) * 1.05;
      if (x < r.x - brx || x > r.x + brx || y < r.y - bry || y > r.y + bry)
        return;
      const poly = getSharedRegionPolygon(r, r.id, true);
      if (pointInPolygon(x, y, poly)) {
        const d = Math.hypot(x - r.x, y - r.y);
        if (!bestIslet || d < bestIslet.d) bestIslet = { id: r.id, d };
      }
    });

    return bestIslet !== null ? bestIslet.id : -1;
  }

  function regionAt(x, y) {
    const p = screenToMap(x, y);
    const canvasId = regionAtCoords(p.x, p.y);
    return canvasId >= 0 ? canvasId : null;
  }

  function derivedRegionOwnership(regionId) {
    const explicit = state.regionOwnership[regionId] ?? 0;
    const ownerId = state.regionOwnerIds[regionId];
    const ownerName = state.regionOwnerNames[regionId];
    if (ownerName === "ĐANG KHAI HOANG") return 0;
    if (ownerId) return ownerId === state.localPlayerId ? 1 : 2;
    if (explicit) return explicit;
    if (state.hasAuthoritativeOwnership) return 0;

    const townsInRegion = towns.filter(
      (t) => t.id === 9000 + regionId || t.regionId === regionId,
    );
    if (townsInRegion.some((t) => t.owner === 0)) return 1;
    if (townsInRegion.length > 0) return 2;
    return 0;
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

  function triggerSettlerClearing(canvasId: number) {
    const r = landById(canvasId);
    if (!r) return toast("KHÔNG TÌM THẤY MẢNH ĐẤT");
    if (derivedRegionOwnership(canvasId) !== 0)
      return toast("MẢNH ĐẤT NÀY ĐÃ CÓ CHỦ");
    state.selectedRegion = canvasId;
    const playerTowns = towns.filter((t: any) => t.owner === 0);
    if (
      playerTowns.length === 0 ||
      (state.newbieMode && state.newbiePhase === "select_land")
    ) {
      state.newbieMode = true;
      state.newbieSelectedRegion = canvasId;
      state.newbiePhase = "choose_banner";
      state.toast = "CHỌN CỜ VÀ BIỂU TƯỢNG RỒI XÁC NHẬN XÂY THÀNH";
      return;
    }
    startNewbieClearing(canvasId);
  }

  function startNewbieClearing(canvasId: number) {
    state.newbieSelectedRegion = canvasId;
    toast("XÂY THÀNH PHẢI ĐƯỢC SERVER XÁC NHẬN");
  }

  function completeClearing(canvasId) {
    toast("HOÀN TẤT XÂY THÀNH PHẢI ĐƯỢC SERVER XÁC NHẬN");
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
      toast("CAMERA XA ĐÃ RESET");
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
        toast("ĐÃ QUAY VỀ THỦ ĐÔ CỦA BẠN");
        saveCamera();
        save();
      } else {
        toast("CHƯA CÓ THÀNH PHỐ NÀO ĐỂ QUAY VỀ!");
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
      toast("MỘ BINH PHẢI ĐƯỢC SERVER XÁC NHẬN");
      return;
    }
    if (id === "trainCavalry") {
      toast("MỘ BINH PHẢI ĐƯỢC SERVER XÁC NHẬN");
      return;
    }
    if (id === "trainArtillery") {
      toast("MỘ BINH PHẢI ĐƯỢC SERVER XÁC NHẬN");
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
        toast("THÀNH PHỐ KHÔNG ĐỦ QUÂN ĐỂ XUẤT BINH");
      }
      return;
    }
    resolveAttack(t);
  }

  function resolveAttack(t) {
    toast("KẾT QUẢ CHIẾN ĐẤU PHẢI ĐƯỢC SERVER XÁC NHẬN");
  }

  function resolveBattleFinal(b) {
    state.activeBattles = [];
    toast("KẾT QUẢ CHIẾN ĐẤU PHẢI ĐƯỢC SERVER XÁC NHẬN");
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

  function islandOfTown(t) {
    if (t.x > 1180 && t.y < 660) return "EAST_CONTINENT";
    if (t.x > 1180 && t.y < 1240) return "MIDDLE_SEA_CONTINENT";
    if (t.x > 1040 && t.y >= 1240) return "SOUTH_WORLD_CONTINENT";
    if (t.x > 880 && t.y < 620) return "EAST_NORTH";
    if (t.x > 840 && t.y >= 620 && t.y < 1030) return "EAST_MID";
    if (t.y < 520) return "NORTH";
    if (t.y < 900) return "CENTER";
    if (t.y < 1200) return "SOUTH";
    return "FAR_SOUTH";
  }

  function segmentTouchesSea(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) {
    const steps = Math.max(
      12,
      Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 42),
    );
    for (let i = 1; i < steps; i++) {
      const p = i / steps;
      const x = lerp(a.x, b.x, p);
      const y = lerp(a.y, b.y, p);
      if (regionAtCoords(x, y) < 0) return true;
    }
    return false;
  }

  function segmentCrossesLand(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) {
    const steps = Math.max(
      12,
      Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 42),
    );
    for (let i = 1; i < steps; i++) {
      const p = i / steps;
      const x = lerp(a.x, b.x, p);
      const y = lerp(a.y, b.y, p);
      if (regionAtCoords(x, y) >= 0) return true;
    }
    return false;
  }

  function isWaterAt(x: number, y: number) {
    return regionAtCoords(x, y) < 0;
  }

  const coastPortCache: {
    [regionId: number]: { x: number; y: number } | null;
  } = {};
  const coastPortCandidateCache: { [regionId: number]: any | null } = {};

  function getCachedCoastPortCandidate(regionId: number) {
    if (coastPortCandidateCache[regionId] !== undefined) {
      return coastPortCandidateCache[regionId];
    }
    const candidate =
      findCoastPortCandidates(regionId, { x: 0, y: 0 }, 1)[0] || null;
    coastPortCandidateCache[regionId] = candidate;
    return candidate;
  }

  function getCachedCoastPort(regionId: number) {
    if (coastPortCache[regionId] !== undefined) {
      return coastPortCache[regionId];
    }
    const candidate = getCachedCoastPortCandidate(regionId);
    const port =
      candidate && candidate.water
        ? { x: candidate.water.x, y: candidate.water.y }
        : null;
    coastPortCache[regionId] = port;
    return port;
  }

  function isDeepLandObstacle(
    x: number,
    y: number,
    ignoreA?: number,
    ignoreB?: number,
  ): boolean {
    const rId = regionAtCoords(x, y);
    if (rId < 0) return false;
    if (ignoreA !== undefined && rId === ignoreA) return false;
    if (ignoreB !== undefined && rId === ignoreB) return false;
    const r = landById(rId);
    if (!r || r.isIslet) return false;
    const dx = x - r.x;
    const dy = y - r.y;
    const rx = (r.rx || 230) * 0.7;
    const ry = (r.ry || rx * 0.78) * 0.7;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0;
  }

  function findCoastPortCandidates(
    regionId: number,
    toward: { x: number; y: number },
    limit = 10,
  ) {
    const r = landById(regionId);
    if (!r) return [];
    const rx = r.rx || r.r || 120;
    const ry = r.ry || (r.r || 120) * 0.78;
    const baseAngle = Math.atan2(toward.y - r.y, toward.x - r.x);
    const candidates: {
      score: number;
      land: { x: number; y: number };
      water: { x: number; y: number };
      dir: { x: number; y: number };
    }[] = [];
    for (let i = 0; i < 64; i++) {
      const offset = (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 32);
      const a = baseAngle + offset;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const shoreLand = { x: r.x + dx * rx * 0.88, y: r.y + dy * ry * 0.88 };
      if (regionAtCoords(shoreLand.x, shoreLand.y) < 0) continue;

      let waterPoint: { x: number; y: number } | null = null;
      for (const mult of [1.05, 1.12, 1.2, 1.3]) {
        const wx = r.x + dx * rx * mult;
        const wy = r.y + dy * ry * mult;
        if (regionAtCoords(wx, wy) < 0) {
          waterPoint = { x: wx, y: wy };
          break;
        }
      }
      if (!waterPoint) continue;
      // A gap between two provinces, an inland lake, or a narrow river is
      // still reported as "water" by regionAtCoords. Ports are only valid on
      // water connected to the outer ocean, otherwise ships can spawn inside
      // the continent and their route immediately crosses land.
      if (!isOceanWaterPoint(waterPoint)) continue;
      const distToTarget = Math.hypot(
        waterPoint.x - toward.x,
        waterPoint.y - toward.y,
      );
      const score = Math.abs(offset) * 250 + distToTarget;
      candidates.push({
        score,
        land: shoreLand,
        water: waterPoint,
        dir: { x: dx, y: dy },
      });
    }
    candidates.sort((a, b) => a.score - b.score);
    return candidates.slice(0, limit);
  }

  function findCoastPort(regionId: number, toward: { x: number; y: number }) {
    return findCoastPortCandidates(regionId, toward, 1)[0] || null;
  }

  function waterSegmentClear(a: MapPoint, b: MapPoint) {
    const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (!isWaterAt(lerp(a.x, b.x, t), lerp(a.y, b.y, t))) return false;
    }
    return true;
  }

  const seaRouteBounds = allGenerated.reduce(
    (bounds: any, r: any) => {
      const rx = (r.rx || r.r || 180) * 1.55;
      const ry = (r.ry || (r.r || 180) * 0.78) * 1.55;
      bounds.minX = Math.min(bounds.minX, r.x - rx);
      bounds.maxX = Math.max(bounds.maxX, r.x + rx);
      bounds.minY = Math.min(bounds.minY, r.y - ry);
      bounds.maxY = Math.max(bounds.maxY, r.y + ry);
      return bounds;
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );

  const SEA_NAV_STEP = 92;
  const SEA_NAV_MARGIN = 460;
  const seaNavMinX =
    Math.floor((seaRouteBounds.minX - SEA_NAV_MARGIN) / SEA_NAV_STEP) *
    SEA_NAV_STEP;
  const seaNavMinY =
    Math.floor((seaRouteBounds.minY - SEA_NAV_MARGIN) / SEA_NAV_STEP) *
    SEA_NAV_STEP;
  const seaNavMaxX =
    Math.ceil((seaRouteBounds.maxX + SEA_NAV_MARGIN) / SEA_NAV_STEP) *
    SEA_NAV_STEP;
  const seaNavMaxY =
    Math.ceil((seaRouteBounds.maxY + SEA_NAV_MARGIN) / SEA_NAV_STEP) *
    SEA_NAV_STEP;
  const seaNavCols = Math.floor((seaNavMaxX - seaNavMinX) / SEA_NAV_STEP) + 1;
  const seaNavRows = Math.floor((seaNavMaxY - seaNavMinY) / SEA_NAV_STEP) + 1;
  const seaNavCount = seaNavCols * seaNavRows;
  const seaNavWater = new Int8Array(Math.max(0, seaNavCount));
  const seaNavOcean = new Uint8Array(Math.max(0, seaNavCount));
  let seaNavOceanReady = false;

  function seaNavPoint(index: number): MapPoint {
    return {
      x: seaNavMinX + (index % seaNavCols) * SEA_NAV_STEP,
      y:
        seaNavMinY + Math.floor(index / seaNavCols) * SEA_NAV_STEP,
    };
  }

  function seaNavIsWater(index: number) {
    if (index < 0 || index >= seaNavCount) return false;
    if (seaNavWater[index] !== 0) return seaNavWater[index] === 1;
    const point = seaNavPoint(index);
    const water = isWaterAt(point.x, point.y);
    seaNavWater[index] = water ? 1 : 2;
    return water;
  }

  function seaNavNodesConnect(
    currentIndex: number,
    nextIndex: number,
    dx: number,
    dy: number,
  ) {
    if (!seaNavIsWater(nextIndex)) return false;
    const current = seaNavPoint(currentIndex);
    const next = seaNavPoint(nextIndex);
    if (
      !isWaterAt(lerp(current.x, next.x, 0.25), lerp(current.y, next.y, 0.25)) ||
      !isWaterAt(lerp(current.x, next.x, 0.5), lerp(current.y, next.y, 0.5)) ||
      !isWaterAt(lerp(current.x, next.x, 0.75), lerp(current.y, next.y, 0.75))
    ) {
      return false;
    }
    if (dx !== 0 && dy !== 0) {
      const gx = currentIndex % seaNavCols;
      const gy = Math.floor(currentIndex / seaNavCols);
      if (
        !seaNavIsWater(gy * seaNavCols + gx + dx) ||
        !seaNavIsWater((gy + dy) * seaNavCols + gx)
      ) {
        return false;
      }
    }
    return true;
  }

  function ensureSeaNavOcean() {
    if (seaNavOceanReady) return;
    seaNavOceanReady = true;
    if (seaNavCount <= 0 || seaNavCount > 180000) return;

    const queue = new Int32Array(seaNavCount);
    let head = 0;
    let tail = 0;
    const seed = (index: number) => {
      if (seaNavOcean[index] || !seaNavIsWater(index)) return;
      seaNavOcean[index] = 1;
      queue[tail++] = index;
    };
    for (let x = 0; x < seaNavCols; x++) {
      seed(x);
      seed((seaNavRows - 1) * seaNavCols + x);
    }
    for (let y = 1; y < seaNavRows - 1; y++) {
      seed(y * seaNavCols);
      seed(y * seaNavCols + seaNavCols - 1);
    }

    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    while (head < tail) {
      const currentIndex = queue[head++];
      const gx = currentIndex % seaNavCols;
      const gy = Math.floor(currentIndex / seaNavCols);
      for (const [dx, dy] of directions) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || nx >= seaNavCols || ny < 0 || ny >= seaNavRows) continue;
        const nextIndex = ny * seaNavCols + nx;
        if (
          seaNavOcean[nextIndex] ||
          !seaNavNodesConnect(currentIndex, nextIndex, dx, dy)
        ) {
          continue;
        }
        seaNavOcean[nextIndex] = 1;
        queue[tail++] = nextIndex;
      }
    }
  }

  function isOceanWaterPoint(point: MapPoint) {
    if (!isWaterAt(point.x, point.y)) return false;
    ensureSeaNavOcean();
    if (seaNavCount <= 0 || seaNavCount > 180000) return false;
    const cx = Math.round((point.x - seaNavMinX) / SEA_NAV_STEP);
    const cy = Math.round((point.y - seaNavMinY) / SEA_NAV_STEP);
    for (let radius = 0; radius <= 5; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (
            radius > 0 &&
            Math.abs(dx) !== radius &&
            Math.abs(dy) !== radius
          ) {
            continue;
          }
          const gx = cx + dx;
          const gy = cy + dy;
          if (gx < 0 || gx >= seaNavCols || gy < 0 || gy >= seaNavRows) continue;
          const index = gy * seaNavCols + gx;
          if (!seaNavOcean[index]) continue;
          if (waterSegmentClear(point, seaNavPoint(index))) return true;
        }
      }
    }
    return false;
  }

  const shortestWaterPathCache = new Map<string, MapPoint[] | null>();

  function findShortestWaterPath(
    start: MapPoint,
    goal: MapPoint,
  ): MapPoint[] | null {
    if (waterSegmentClear(start, goal)) return [start, goal];
    const cacheKey = `${Math.round(start.x / 12)}:${Math.round(start.y / 12)}:${Math.round(goal.x / 12)}:${Math.round(goal.y / 12)}`;
    if (shortestWaterPathCache.has(cacheKey))
      return shortestWaterPathCache.get(cacheKey) || null;

    const step = SEA_NAV_STEP;
    const margin = SEA_NAV_MARGIN;
    const minX = Math.floor((seaRouteBounds.minX - margin) / step) * step;
    const minY = Math.floor((seaRouteBounds.minY - margin) / step) * step;
    const maxX = Math.ceil((seaRouteBounds.maxX + margin) / step) * step;
    const maxY = Math.ceil((seaRouteBounds.maxY + margin) / step) * step;
    const cols = Math.floor((maxX - minX) / step) + 1;
    const rows = Math.floor((maxY - minY) / step) + 1;
    const count = cols * rows;
    if (count <= 0 || count > 180000) return null;

    const pointFor = (index: number) => ({
      x: minX + (index % cols) * step,
      y: minY + Math.floor(index / cols) * step,
    });
    const waterMemo = new Int8Array(count);
    const isWaterNode = (index: number) => {
      if (waterMemo[index] !== 0) return waterMemo[index] === 1;
      const point = pointFor(index);
      const water = isWaterAt(point.x, point.y);
      waterMemo[index] = water ? 1 : 2;
      return water;
    };
    const nearestReachableNode = (point: MapPoint) => {
      const cx = Math.round((point.x - minX) / step);
      const cy = Math.round((point.y - minY) / step);
      let best = -1;
      let bestDistance = Infinity;
      for (let radius = 0; radius <= 5; radius++) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (
              radius > 0 &&
              Math.abs(dx) !== radius &&
              Math.abs(dy) !== radius
            )
              continue;
            const gx = cx + dx;
            const gy = cy + dy;
            if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) continue;
            const index = gy * cols + gx;
            if (!isWaterNode(index)) continue;
            const candidate = pointFor(index);
            const distance = Math.hypot(
              candidate.x - point.x,
              candidate.y - point.y,
            );
            if (
              distance < bestDistance &&
              waterSegmentClear(point, candidate)
            ) {
              best = index;
              bestDistance = distance;
            }
          }
        }
        if (best >= 0) return best;
      }
      return best;
    };

    const startIndex = nearestReachableNode(start);
    const goalIndex = nearestReachableNode(goal);
    if (startIndex < 0 || goalIndex < 0) {
      shortestWaterPathCache.set(cacheKey, null);
      return null;
    }

    const scores = new Float64Array(count);
    scores.fill(Infinity);
    const previous = new Int32Array(count);
    previous.fill(-1);
    const closed = new Uint8Array(count);
    const heap: Array<{ index: number; score: number }> = [];
    const heapPush = (item: { index: number; score: number }) => {
      heap.push(item);
      let i = heap.length - 1;
      while (i > 0) {
        const parent = Math.floor((i - 1) / 2);
        if (heap[parent].score <= item.score) break;
        heap[i] = heap[parent];
        i = parent;
      }
      heap[i] = item;
    };
    const heapPop = () => {
      const first = heap[0];
      const last = heap.pop();
      if (!first || !last || heap.length === 0) return first;
      let i = 0;
      while (true) {
        const left = i * 2 + 1;
        const right = left + 1;
        if (left >= heap.length) break;
        const child =
          right < heap.length && heap[right].score < heap[left].score
            ? right
            : left;
        if (heap[child].score >= last.score) break;
        heap[i] = heap[child];
        i = child;
      }
      heap[i] = last;
      return first;
    };
    const heuristic = (index: number) => {
      const p = pointFor(index);
      return Math.hypot(p.x - goal.x, p.y - goal.y);
    };

    scores[startIndex] = 0;
    heapPush({ index: startIndex, score: heuristic(startIndex) });
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    let visited = 0;
    while (heap.length > 0 && visited < 100000) {
      const current = heapPop();
      if (!current || closed[current.index]) continue;
      if (current.index === goalIndex) break;
      closed[current.index] = 1;
      visited++;
      const gx = current.index % cols;
      const gy = Math.floor(current.index / cols);
      const currentPoint = pointFor(current.index);
      for (const [dx, dy] of directions) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        const nextIndex = ny * cols + nx;
        if (closed[nextIndex] || !isWaterNode(nextIndex)) continue;
        const nextPoint = pointFor(nextIndex);
        if (
          !isWaterAt(
            lerp(currentPoint.x, nextPoint.x, 0.25),
            lerp(currentPoint.y, nextPoint.y, 0.25),
          ) ||
          !isWaterAt(
            lerp(currentPoint.x, nextPoint.x, 0.5),
            lerp(currentPoint.y, nextPoint.y, 0.5),
          ) ||
          !isWaterAt(
            lerp(currentPoint.x, nextPoint.x, 0.75),
            lerp(currentPoint.y, nextPoint.y, 0.75),
          )
        )
          continue;
        if (dx !== 0 && dy !== 0) {
          const horizontalIndex = gy * cols + nx;
          const verticalIndex = ny * cols + gx;
          if (!isWaterNode(horizontalIndex) || !isWaterNode(verticalIndex))
            continue;
        }
        const tentative = scores[current.index] + Math.hypot(dx, dy) * step;
        if (tentative >= scores[nextIndex]) continue;
        scores[nextIndex] = tentative;
        previous[nextIndex] = current.index;
        heapPush({ index: nextIndex, score: tentative + heuristic(nextIndex) });
      }
    }

    if (startIndex !== goalIndex && previous[goalIndex] < 0) {
      shortestWaterPathCache.set(cacheKey, null);
      return null;
    }
    const raw: MapPoint[] = [goal];
    let cursor = goalIndex;
    raw.push(pointFor(cursor));
    while (cursor !== startIndex) {
      cursor = previous[cursor];
      if (cursor < 0) break;
      raw.push(pointFor(cursor));
    }
    raw.push(start);
    raw.reverse();

    const compact: MapPoint[] = [raw[0]];
    let anchor = 0;
    while (anchor < raw.length - 1) {
      let next = raw.length - 1;
      while (next > anchor + 1 && !waterSegmentClear(raw[anchor], raw[next]))
        next--;
      compact.push(raw[next]);
      anchor = next;
    }
    shortestWaterPathCache.set(cacheKey, compact);
    const reverseKey = `${Math.round(goal.x / 12)}:${Math.round(goal.y / 12)}:${Math.round(start.x / 12)}:${Math.round(start.y / 12)}`;
    shortestWaterPathCache.set(reverseKey, [...compact].reverse());
    return compact;
  }

  function findBestSeaRoute(
    sourceRegionId: number,
    targetRegionId: number,
    sourcePoint: { x: number; y: number },
    targetPoint: { x: number; y: number },
  ) {
    const sourceFixedHarbor = territorySpecialResources(
      sourceRegionId,
    ).includes("Bến tàu tự nhiên")
      ? getCachedCoastPortCandidate(sourceRegionId)
      : null;
    const targetFixedHarbor = territorySpecialResources(
      targetRegionId,
    ).includes("Bến tàu tự nhiên")
      ? getCachedCoastPortCandidate(targetRegionId)
      : null;
    const sourcePorts = sourceFixedHarbor
      ? [sourceFixedHarbor]
      : findCoastPortCandidates(sourceRegionId, targetPoint, 14);
    const targetPorts = targetFixedHarbor
      ? [targetFixedHarbor]
      : findCoastPortCandidates(targetRegionId, sourcePoint, 14);
    if (sourcePorts.length === 0) return { error: "source_port" };
    if (targetPorts.length === 0) return { error: "target_port" };
    const pairs: any[] = [];
    sourcePorts.slice(0, 8).forEach((sourceCoast) => {
      targetPorts.slice(0, 8).forEach((targetCoast) => {
        pairs.push({
          sourceCoast,
          targetCoast,
          estimate:
            sourceCoast.score +
            targetCoast.score +
            Math.hypot(
              sourceCoast.water.x - targetCoast.water.x,
              sourceCoast.water.y - targetCoast.water.y,
            ),
        });
      });
    });
    pairs.sort((a, b) => a.estimate - b.estimate);

    let best: any = null;
    for (const pair of pairs.slice(0, 10)) {
      const seaPath = findShortestWaterPath(
        pair.sourceCoast.water,
        pair.targetCoast.water,
      );
      if (!seaPath) continue;
      const score =
        Math.hypot(
          sourcePoint.x - pair.sourceCoast.water.x,
          sourcePoint.y - pair.sourceCoast.water.y,
        ) +
        polylineLength(seaPath) +
        Math.hypot(
          targetPoint.x - pair.targetCoast.water.x,
          targetPoint.y - pair.targetCoast.water.y,
        );
      if (!best || score < best.score) {
        best = {
          sourceCoast: pair.sourceCoast,
          targetCoast: pair.targetCoast,
          sourcePort: pair.sourceCoast.water,
          targetPort: pair.targetCoast.water,
          seaPath,
          score,
        };
      }
    }
    return best || { error: "blocked" };
  }

  function continentOfRegion(r: any) {
    if (!r) return null;
    let best = null;
    for (const c of megaContinents) {
      const nx = (r.x - c.x) / c.rx;
      const ny = (r.y - c.y) / c.ry;
      const d = nx * nx + ny * ny;
      if (!best || d < best.d) best = { name: c.name, d };
    }
    return best ? best.name : null;
  }

  function landTravelAllowed(sourceRegionId: number, targetRegionId: number) {
    if (sourceRegionId < 0 || targetRegionId < 0) return false;
    if (sourceRegionId === targetRegionId) return true;
    const a = landById(sourceRegionId);
    const b = landById(targetRegionId);
    if (!a || !b || a.isIslet || b.isIslet) return false;

    // Any path crossing ocean water MUST require a ship!
    if (segmentTouchesSea(a, b)) return false;

    const cA = continentOfRegion(a);
    const cB = continentOfRegion(b);
    if (!cA || !cB || cA !== cB) return false;

    const arx = a.rx || a.r || 100;
    const ary = a.ry || (a.r || 100) * 0.78;
    const brx = b.rx || b.r || 100;
    const bry = b.ry || (b.r || 100) * 0.78;
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    const closeEnough = dx <= (arx + brx) * 1.28 && dy <= (ary + bry) * 1.42;
    const centerDistance = Math.hypot(a.x - b.x, a.y - b.y);
    const bridgeDistance = centerDistance - (arx + brx) * 0.72;
    return closeEnough || bridgeDistance <= 130;
  }

  function getMarchRouteStatus(source: any, targetRegionId: number) {
    const targetLand = landById(targetRegionId);
    if (!source || !targetLand)
      return {
        ok: false,
        message: "Không tìm thấy điểm xuất quân hoặc lãnh thổ đích",
        requiresShip: false,
      };
    const targetPoint = { x: targetLand.x, y: targetLand.y };
    const sourceRegionId = regionAtCoords(source.x, source.y);
    if (landTravelAllowed(sourceRegionId, targetRegionId)) {
      return {
        ok: true,
        message: "Đường bộ trong cùng cụm lục địa hợp lệ",
        requiresShip: false,
      };
    }
    const crossesSea = segmentTouchesSea(source, targetPoint);
    if (!crossesSea)
      return { ok: true, message: "Đường bộ hợp lệ", requiresShip: false };
    if (sourceRegionId < 0) {
      return {
        ok: false,
        message: "Không xác định được lãnh thổ xuất phát",
        requiresShip: true,
      };
    }
    if (derivedRegionOwnership(sourceRegionId) !== 1) {
      return {
        ok: false,
        message: `Thành xuất quân đang nằm trên lãnh thổ #${sourceRegionId + 1} chưa thuộc về bạn trên server`,
        requiresShip: true,
      };
    }
    const sourceLand = landById(sourceRegionId);
    const sourceHasPort = Boolean(
      sourceLand?.isIslet ||
      territorySpecialResources(sourceRegionId).includes("Bến tàu tự nhiên"),
    );
    const targetIsCoastal = Boolean(
      targetLand.isIslet ||
      targetLand.coastal ||
      mainlandCoastalRegionIds.has(targetRegionId) ||
      territorySpecialResources(targetRegionId).includes("Bến tàu tự nhiên"),
    );
    if (!sourceHasPort) {
      return {
        ok: false,
        message: "Thành xuất quân không có Bến tàu tự nhiên",
        requiresShip: true,
      };
    }
    if (!targetIsCoastal) {
      return {
        ok: false,
        message: "Không thể đổ bộ thẳng vào lãnh thổ nội địa",
        requiresShip: true,
      };
    }
    const route = findBestSeaRoute(
      sourceRegionId,
      targetRegionId,
      source,
      targetPoint,
    );
    if (route.error === "source_port")
      return {
        ok: false,
        message: "Lãnh thổ xuất phát chưa có bờ biển/cảng để đóng thuyền",
        requiresShip: true,
      };
    if (route.error === "target_port")
      return {
        ok: false,
        message: "Đích không phải vùng ven biển, phải chiếm bờ biển trước",
        requiresShip: true,
      };
    if (route.error === "blocked")
      return {
        ok: false,
        message:
          "Tuyến biển đang bị lục địa chắn, hãy chọn cảng/vùng ven biển khác gần đường biển hơn",
        requiresShip: true,
      };
    return { ok: true, message: "Tuyến thuyền hợp lệ", requiresShip: true };
  }

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
      toast("VUI LÒNG CHỌN QUÂN ĐỂ XUẤT BINH");
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
      toast("SỐ LƯỢNG QUÂN XUẤT CHIẾN VƯỢT QUÁ QUÂN ĐANG CÓ TRONG THÀNH");
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
            `⚠️ THÀNH NÀY ĐANG TRONG THỜI GIAN BẢO VỆ TÂN THỦ! (Còn ${formatShieldTimer(shieldMs)})`,
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
          "KHÔNG CÓ CẢNG XUẤT PHÁT: HÃY CHỌN THÀNH/LÃNH THỔ VEN BIỂN CỦA BẠN",
        );
        return false;
      }
      if (effectiveTargetRegionId < 0) {
        toast("KHÔNG TÌM THẤY BỜ BIỂN ĐỔ BỘ");
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
      if (cavalry > 0) speeds.push(gameConfig.cavalrySpeed);
      if (artillery > 0) speeds.push(gameConfig.artillerySpeed);
      if (speeds.length > 0) {
        speed = Math.min(...speeds);
      }
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
        if (!backendTiming) {
          toast(
            "LÃNH THỔ XUẤT PHÁT KHÔNG CÓ BỜ BIỂN/CẢNG - KHÔNG THỂ ĐI THUYỀN",
          );
        }
        return false;
      }
      if (route.error === "target_port") {
        if (!backendTiming) {
          toast("ĐÍCH KHÔNG PHẢI VÙNG VEN BIỂN - PHẢI CHIẾM BỜ BIỂN TRƯỚC");
        }
        return false;
      }
      sourcePort = route.sourcePort || null;
      targetPort = route.targetPort || null;
      seaPath = route.seaPath || null;
      if (
        !sourcePort ||
        !targetPort ||
        !seaPath ||
        seaPath.length < 2 ||
        route.error === "blocked"
      ) {
        if (!backendTiming) {
          toast("KHÔNG TÌM ĐƯỢC TUYẾN NƯỚC AN TOÀN ĐẾN VÙNG ĐÍCH");
        }
        return false;
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
        ? `XUẤT BINH CHIẾM THÀNH (${power} QUÂN | HÀNH QUÂN: ${Math.round(duration)}s)`
        : `XUẤT BINH TIẾP VIỆN (${power} QUÂN | HÀNH QUÂN: ${Math.round(duration)}s)`,
    );
    pushLog(
      isAttack
        ? `PLAYER1: ĐÃ XUẤT BINH TẤN CÔNG LÃNH THỔ ${targetRegionId + 1} (${power} QUÂN)`
        : `PLAYER1: ĐÃ GỬI TIẾP VIỆN ĐẾN LÃNH THỔ ${targetRegionId + 1} (${power} QUÂN)`,
    );
    save();
    return true;
  }

  function applyBackendClearing(clearing: any) {
    const regionId = reactToCanvasRegionId(clearing?.territoryId);
    const r = landById(regionId);
    if (!r) return;
    const isMine =
      clearing.playerId && clearing.playerId === state.localPlayerId;
    state.regionOwnership[regionId] = 0;
    state.regionOwnerIds[regionId] = clearing.playerId || null;
    state.regionOwnerNames[regionId] = "ĐANG KHAI HOANG";
    state.activeClearingTimings[regionId] = {
      playerId: clearing.playerId,
      startedAt: clearing.startedAt,
      arrivesAt: clearing.arrivesAt,
      completesAt: clearing.completesAt,
      sourceTownId: clearing.sourceTownId,
      settlers: clearing.settlers,
      sourceX: clearing.sourceX,
      sourceY: clearing.sourceY,
      connectionType: clearing.connectionType,
      isStarterClaim: Boolean(clearing.isStarterClaim),
    };
    state.regionClearing[regionId] = clearingTimingProgress(clearing);
    if (isMine) {
      const sourceTown =
        clearing.sourceTownId !== undefined
          ? towns.find((town: any) => town.id === clearing.sourceTownId)
          : null;
      const origin =
        Number.isFinite(clearing.sourceX) && Number.isFinite(clearing.sourceY)
          ? {
              originTownId: clearing.sourceTownId ?? null,
              originX: clearing.sourceX,
              originY: clearing.sourceY,
            }
          : sourceTown
            ? {
                originTownId: sourceTown.id,
                originX: sourceTown.x,
                originY: sourceTown.y,
              }
            : settlerOriginForRegion(regionId);
      state.regionInProgress = regionId;
      state.newbieSelectedRegion = regionId;
      state.newbiePhase = "clearing";
      state.settlerTravel = {
        active: true,
        targetRegionId: regionId,
        originTownId: origin.originTownId,
        originX: origin.originX,
        originY: origin.originY,
      };
    }
  }

  function applyBackendMarch(march: any, unitMix: any = {}) {
    const marchId = march?._id || march?.id || march?.marchId;
    if (!marchId) return false;
    const existingVoyage = state.voyages.find(
      (v) => v.backendMarchId === marchId,
    );
    if (existingVoyage) {
      const timing = timingElapsedSeconds(march.startedAt, march.arrivesAt);
      existingVoyage.startedAt = march.startedAt;
      existingVoyage.arrivesAt = march.arrivesAt;
      existingVoyage.duration = timing.duration;
      existingVoyage.targetProgress = Math.min(
        1,
        timing.elapsed / timing.duration,
      );
      existingVoyage.infantry =
        unitMix.infantry ?? march.infantry ?? existingVoyage.infantry;
      existingVoyage.cavalry =
        unitMix.cavalry ?? march.cavalry ?? existingVoyage.cavalry;
      existingVoyage.artillery =
        unitMix.artillery ?? march.artillery ?? existingVoyage.artillery;
      return true;
    }
    // Legacy bot orders stored town IDs (9000 + territoryId) here. Convert
    // them before looking up map geometry, otherwise the march is invisible.
    const normalizeWorldTerritoryId = (value: any) => {
      const id = Number(value);
      return Number.isInteger(id) && id >= 9000 ? id - 9000 : id;
    };
    const sourceRegionId = reactToCanvasRegionId(
      normalizeWorldTerritoryId(march.fromTerritoryId),
    );
    const targetRegionId = reactToCanvasRegionId(
      normalizeWorldTerritoryId(march.toTerritoryId),
    );
    const ownerCode = march.ownerId === state.localPlayerId ? 1 : 2;
    const sourceLand = landById(sourceRegionId);
    const source =
      ensureTownForRegion(sourceRegionId, ownerCode) ||
      (sourceLand
        ? {
            id: 9000 + sourceRegionId,
            regionId: sourceRegionId,
            x: sourceLand.x,
            y: sourceLand.y,
            owner: ownerCode === 1 ? 0 : Math.max(1, ownerCode || 2),
            troops: 0,
            infantryCount: 0,
            cavalryCount: 0,
            artilleryCount: 0,
            population: territoryStartingPopulation(sourceRegionId, ownerCode),
            buildings: defaultBuildings(),
            storage: defaultStorage(),
            virtual: true,
          }
        : null);
    const targetOwner =
      derivedRegionOwnership(targetRegionId) ||
      (march.kind === "reinforce" ? ownerCode : 2);
    const targetLand = landById(targetRegionId);
    const target =
      ensureTownForRegion(targetRegionId, targetOwner) ||
      (targetLand
        ? {
            id: 9000 + targetRegionId,
            regionId: targetRegionId,
            x: targetLand.x,
            y: targetLand.y,
            owner: targetOwner === 1 ? 0 : Math.max(1, targetOwner || 2),
            troops: 0,
            infantryCount: 0,
            cavalryCount: 0,
            artilleryCount: 0,
            population: territoryStartingPopulation(
              targetRegionId,
              targetOwner,
            ),
            buildings: defaultBuildings(),
            storage: defaultStorage(),
            virtual: true,
          }
        : null);
    const timing = timingElapsedSeconds(march.startedAt, march.arrivesAt);
    const elapsed = Math.min(timing.duration - 0.05, timing.elapsed);
    if (!source || !target) return false;
    const isAttack =
      march.kind === "attack" ||
      march.battleSide === "attacker" ||
      unitMix.battleSide === "attacker";
    const inf = unitMix.infantry ?? march.infantry ?? 0;
    const cav = unitMix.cavalry ?? march.cavalry ?? 0;
    const art = unitMix.artillery ?? march.artillery ?? 0;

    return launchVoyage(
      source,
      target,
      march.troops,
      targetRegionId,
      isAttack,
      inf,
      cav,
      art,
      march.battleSide ||
        unitMix.battleSide ||
        (isAttack ? "attacker" : "defender"),
      {
        ...timing,
        elapsed: Math.max(0, elapsed),
        startedAt: march.startedAt,
        arrivesAt: march.arrivesAt,
        marchId: marchId,
        noTroopDebit: true,
        usesShip:
          typeof march.usesShip === "boolean" ? march.usesShip : undefined,
      },
    );
  }

  function focusBackendMarch(marchId?: string) {
    const voyage = state.voyages.find(
      (item: any) =>
        item.backendMarchId === marchId || (!marchId && item.owner === 1),
    );
    if (!voyage?.from || !voyage?.to) return false;

    const centerX = (voyage.from.x + voyage.to.x) / 2;
    const centerY = (voyage.from.y + voyage.to.y) / 2;
    const routeWidth = Math.abs(voyage.to.x - voyage.from.x) + 520;
    const routeHeight = Math.abs(voyage.to.y - voyage.from.y) + 420;
    const fittedZoom = Math.min(
      getDefaultFarZoom(),
      (W * 0.82) / Math.max(1, routeWidth),
      (H * 0.68) / Math.max(1, routeHeight),
    );
    state.zoom = Math.max(getMinZoom(), Math.min(getMaxZoom(), fittedZoom));
    state.targetZoom = state.zoom;
    state.panX = W / 2 - centerX * state.zoom - (1 - state.zoom) * W * 0.48;
    state.panY = H / 2 - centerY * state.zoom - (1 - state.zoom) * H * 0.48;
    state.targetPanX = null;
    state.targetPanY = null;
    clampPan();
    saveCamera();
    return true;
  }

  function focusBackendClearing(territoryId: number) {
    const regionId = reactToCanvasRegionId(Number(territoryId));
    const region = landById(regionId);
    if (!region) return false;
    const zoom = getDefaultFarZoom();
    state.zoom = zoom;
    state.targetZoom = zoom;
    state.panX = W / 2 - region.x * zoom - (1 - zoom) * W * 0.48;
    state.panY = H / 2 - region.y * zoom - (1 - zoom) * H * 0.48;
    state.targetPanX = null;
    state.targetPanY = null;
    clampPan();
    saveCamera();
    return true;
  }

  function mapBackendBattle(battle: any) {
    const regId = reactToCanvasRegionId(battle.regionId);
    const fromRegId =
      battle.fromTerritoryId === undefined
        ? undefined
        : reactToCanvasRegionId(battle.fromTerritoryId);
    const toRegId =
      battle.toTerritoryId === undefined
        ? regId
        : reactToCanvasRegionId(battle.toTerritoryId);
    const fromRegion = fromRegId === undefined ? null : landById(fromRegId);
    const targetRegion = landById(toRegId >= 0 ? toRegId : regId);
    const dur = Math.max(
      1,
      battle.durationSeconds ||
        (battle.startedAt && battle.resolvesAt
          ? (new Date(battle.resolvesAt).getTime() -
              new Date(battle.startedAt).getTime()) /
            1000
          : 25),
    );
    const remMs = battle.resolvesAt
      ? new Date(battle.resolvesAt).getTime() - Date.now()
      : dur * 1000;
    const remSec = Math.max(0, remMs / 1000);
    return {
      ...battle,
      id: battle.id || battle._id,
      regionId: regId,
      fromTerritoryId: fromRegId,
      toTerritoryId: toRegId,
      from: fromRegion ? { x: fromRegion.x, y: fromRegion.y } : battle.from,
      target: targetRegion
        ? { x: targetRegion.x, y: targetRegion.y }
        : battle.target,
      attackerOwner: battle.attackerId === state.localPlayerId ? 0 : 1,
      townId: battle.townId ?? 9000 + regId,
      startedAt: battle.startedAt,
      resolvesAt: battle.resolvesAt,
      duration: dur,
      durationSeconds: dur,
      t: Math.max(0, dur - remSec),
      isServerBattle: true,
      attPower: battle.attackerPower ?? battle.attPower ?? 0,
      defPower: battle.defenderPower ?? battle.defPower ?? 0,
      attackerSources: Array.isArray(battle.attackerSources)
        ? battle.attackerSources.map((source: any) => ({
            ...source,
            fromTerritoryId: reactToCanvasRegionId(source.fromTerritoryId),
          }))
        : [],
      participants: Array.isArray(battle.participants)
        ? battle.participants.map((participant: any) => ({
            ...participant,
            sourceTerritoryId: reactToCanvasRegionId(
              participant.sourceTerritoryId,
            ),
          }))
        : [],
    };
  }

  function applyBackendBattles(battles: any[] = [], merge = true) {
    const mapped = battles.map(mapBackendBattle);
    const isNewerBattle = (next: any, current: any) => {
      if (!current) return true;
      const nextVersion = Number(next?.battleVersion || 0);
      const currentVersion = Number(current?.battleVersion || 0);
      if (nextVersion !== currentVersion) return nextVersion > currentVersion;
      return (
        new Date(next?.hpUpdatedAt || 0).getTime() >=
        new Date(current?.hpUpdatedAt || 0).getTime()
      );
    };
    if (!merge) {
      const currentById = new Map(
        (state.activeBattles || []).map((battle: any) => [
          battle.id || battle._id,
          battle,
        ]),
      );
      state.activeBattles = mapped.map((battle) => {
        const current = currentById.get(battle.id || battle._id);
        return isNewerBattle(battle, current) ? battle : current;
      });
      return;
    }
    mapped.forEach((battle) => {
      const current = (state.activeBattles || []).find(
        (item: any) => item.id === battle.id || item._id === battle.id,
      );
      if (!isNewerBattle(battle, current)) return;
      state.activeBattles = [
        ...(state.activeBattles || []).filter(
          (item: any) => item.id !== battle.id && item._id !== battle.id,
        ),
        battle,
      ];
    });
  }

  let toastTimeout: any = null;
  function toast(msg) {
    state.toast = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    if (
      msg &&
      msg !== "TÂN THỦ: CHỌN MẢNH ĐẤT HOANG ĐỂ XÂY THÀNH" &&
      msg !== "CHỌN CỜ VÀ BIỂU TƯỢNG RỒI XÁC NHẬN XÂY THÀNH"
    ) {
      toastTimeout = setTimeout(() => {
        if (state.toast === msg) {
          state.toast = "CHỌN THÀNH CỦA BẠN ĐỂ RA LỆNH";
        }
      }, 3000);
    }
  }

  function pushLog(msg) {
    state.log.push(msg);
    if (state.log.length > 8) state.log.shift();
  }

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

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      toast("FULL MÀN HÌNH - CUỘN CHUỘT / PINCH ĐỂ ZOOM");
    } else {
      document.exitFullscreen?.();
      toast("THOÁT FULL MÀN HÌNH");
    }
  }

  function gearAt(x, y) {
    const gearX = W - 62 - 12;
    return x >= gearX && y >= 12 && x <= gearX + 62 && y <= 66;
  }

  let cachedRect: DOMRect | null = null;
  function updateCachedRect() {
    if (canvas) cachedRect = canvas.getBoundingClientRect();
  }
  window.addEventListener("resize", () => {
    cachedRect = null;
  });
  window.addEventListener(
    "scroll",
    () => {
      cachedRect = null;
    },
    { passive: true },
  );

  function pointer(e: any) {
    if (!cachedRect) updateCachedRect();
    const rect = cachedRect || canvas.getBoundingClientRect();
    // When the UI is CSS-rotated 90deg for forced landscape on portrait mobile,
    // the physical touch coordinates (clientX, clientY) are in the un-rotated
    // device coordinate space, but the canvas bounding rect is already rotated.
    // We need to remap: physical Y → logical X, physical (viewportW - X) → logical Y.
    if ((window as any).__isRotatedLandscape) {
      // In rotated mode, the CSS wrapper is rotated 90deg clockwise.
      // Physical device portrait: width = narrow, height = tall
      // Visual landscape: width = tall dimension, height = narrow dimension
      const physicalW = window.screen?.width || window.innerWidth;
      const rawX = e.clientY;
      const rawY = physicalW - e.clientX;
      return {
        x: rawX * (W / (rect.width || 1)),
        y: rawY * (H / (rect.height || 1)),
      };
    }
    return {
      x: (e.clientX - rect.left) * (W / (rect.width || 1)),
      y: (e.clientY - rect.top) * (H / (rect.height || 1)),
    };
  }

  let dragStartPos = { x: 0, y: 0 };
  let panVelX = 0;
  let panVelY = 0;
  let lastDragTime = 0;
  let clickStartTime = 0;
  let initialPinchDistance = 0;
  let initialPinchZoom = 0;
  let pinchCenterWorld = { x: 0, y: 0 };

  canvas.addEventListener("mousemove", (e) => {
    const p = pointer(e);
    if (state.drag) {
      const now = performance.now();
      const totalDist = Math.hypot(p.x - dragStartPos.x, p.y - dragStartPos.y);
      if (!state.dragMoved && totalDist <= 4) {
        state.drag = p;
        lastDragTime = now;
        return;
      }
      state.dragMoved = true;
      markCameraInput();
      const dtMs = Math.max(1, now - lastDragTime);
      const dx = p.x - state.drag.x;
      const dy = p.y - state.drag.y;

      // Exponential moving average for drag velocity
      panVelX = panVelX * 0.35 + (dx / dtMs) * 16 * 0.65;
      panVelY = panVelY * 0.35 + (dy / dtMs) * 16 * 0.65;
      lastDragTime = now;

      state.panX += dx;
      state.panY += dy;
      state.drag = p;
      clampPan();
      return;
    }
    const b = buttonAt(p.x, p.y);
    const t = townAt(p.x, p.y);
    state.hover = gearAt(p.x, p.y)
      ? "fullscreen"
      : b
        ? b.id
        : t
          ? `town-${t.id}`
          : null;
  });

  canvas.addEventListener("mousedown", (e) => {
    updateCachedRect();
    const p = pointer(e);
    dragStartPos = p;
    state.dragMoved = false;
    panVelX = 0;
    panVelY = 0;
    lastDragTime = performance.now();
    clickStartTime = performance.now();
    state.targetPanX = null;
    state.targetPanY = null;
    if (!buttonAt(p.x, p.y) && !gearAt(p.x, p.y)) {
      state.drag = p;
    }
  });

  window.addEventListener("mouseup", () => {
    if (state.drag) {
      if (performance.now() - lastDragTime > 60) {
        panVelX = 0;
        panVelY = 0;
      }
      state.drag = null;
      saveCamera();
    }
  });

  let touchStartClient = { x: 0, y: 0 };

  canvas.addEventListener(
    "touchstart",
    (e) => {
      updateCachedRect();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const p = pointer({ clientX: touch.clientX, clientY: touch.clientY });
        dragStartPos = p;
        touchStartClient = { x: touch.clientX, y: touch.clientY };
        state.dragMoved = false;
        panVelX = 0;
        panVelY = 0;
        lastDragTime = performance.now();
        clickStartTime = performance.now();
        state.targetPanX = null;
        state.targetPanY = null;
        if (!buttonAt(p.x, p.y) && !gearAt(p.x, p.y)) state.drag = p;
      } else if (e.touches.length === 2) {
        state.drag = null;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialPinchDistance = Math.hypot(
          t1.clientX - t2.clientX,
          t1.clientY - t2.clientY,
        );
        initialPinchZoom = state.zoom;
        const cx = (t1.clientX + t2.clientX) / 2;
        const cy = (t1.clientY + t2.clientY) / 2;
        const p = pointer({ clientX: cx, clientY: cy });
        pinchCenterWorld = screenToMap(p.x, p.y);
      }
    },
    { passive: false },
  );

  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (e.cancelable) e.preventDefault();
      if (e.touches.length === 1 && state.drag) {
        const touch = e.touches[0];
        const p = pointer({ clientX: touch.clientX, clientY: touch.clientY });
        const now = performance.now();
        const totalDist = Math.hypot(
          touch.clientX - touchStartClient.x,
          touch.clientY - touchStartClient.y,
        );
        if (!state.dragMoved && totalDist <= 4) {
          state.drag = p;
          lastDragTime = now;
          return;
        }
        state.dragMoved = true;
        markCameraInput();
        const dtMs = Math.max(1, now - lastDragTime);
        const dx = p.x - state.drag.x;
        const dy = p.y - state.drag.y;

        panVelX = panVelX * 0.35 + (dx / dtMs) * 16 * 0.65;
        panVelY = panVelY * 0.35 + (dy / dtMs) * 16 * 0.65;
        lastDragTime = now;

        state.panX += dx;
        state.panY += dy;
        state.drag = p;
        clampPan();
      } else if (e.touches.length === 2 && initialPinchDistance > 0) {
        markCameraInput();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(
          t1.clientX - t2.clientX,
          t1.clientY - t2.clientY,
        );
        const scale = currentDist / initialPinchDistance;
        const minZ = getMinZoom();
        const maxZ = getMaxZoom();
        const newZoom = Math.max(
          minZ,
          Math.min(maxZ, initialPinchZoom * scale),
        );

        const cx = (t1.clientX + t2.clientX) / 2;
        const cy = (t1.clientY + t2.clientY) / 2;
        const screenPos = pointer({ clientX: cx, clientY: cy });

        state.zoom = newZoom;
        state.targetZoom = newZoom;
        state.panX =
          screenPos.x - pinchCenterWorld.x * newZoom - (1 - newZoom) * W * 0.48;
        state.panY =
          screenPos.y - pinchCenterWorld.y * newZoom - (1 - newZoom) * H * 0.48;
        clampPan();
      }
    },
    { passive: false },
  );

  const handleTouchEnd = () => {
    if (state.drag) {
      if (performance.now() - lastDragTime > 60) {
        panVelX = 0;
        panVelY = 0;
      }
      state.drag = null;
      saveCamera();
    }
    initialPinchDistance = 0;
  };

  window.addEventListener("touchend", handleTouchEnd, { passive: true });
  window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.14 : 0.86;
      const oldZoom = state.zoom;
      const minZ = getMinZoom();
      const maxZ = getMaxZoom();
      const newZoom = Math.max(minZ, Math.min(maxZ, oldZoom * zoomFactor));
      if (Math.abs(newZoom - oldZoom) > 0.001) {
        markCameraInput();
        const p = pointer(e);
        const focalX = (p.x - (1 - oldZoom) * W * 0.48 - state.panX) / oldZoom;
        const focalY = (p.y - (1 - oldZoom) * H * 0.48 - state.panY) / oldZoom;
        state.zoom = newZoom;
        state.targetZoom = newZoom;
        state.panX = p.x - focalX * newZoom - (1 - newZoom) * W * 0.48;
        state.panY = p.y - focalY * newZoom - (1 - newZoom) * H * 0.48;
        clampPan();
        saveCamera();
      }
    },
    { passive: false },
  );

  canvas.addEventListener("click", (e) => {
    const p = pointer(e);
    const clickDuration = performance.now() - clickStartTime;
    const totalDist = Math.hypot(p.x - dragStartPos.x, p.y - dragStartPos.y);
    if (state.dragMoved || totalDist > 4 || clickDuration > 220) {
      state.dragMoved = false;
      return;
    }

    // Chat click detection
    const isChatInput =
      p.x >= 34 && p.y >= H - 70 && p.x <= 34 + 253 && p.y <= H - 70 + 36;
    const isChatSend =
      p.x >= 302 && p.y >= H - 74 && p.x <= 302 + 42 && p.y <= H - 74 + 42;
    if (isChatInput || isChatSend) {
      onLayoutAction?.("chat");
      return;
    }

    if (gearAt(p.x, p.y)) {
      toggleFullscreen();
      return;
    }
    const b = buttonAt(p.x, p.y);
    if (b) {
      handleButton(b.id);
      return;
    }
    const t = townAt(p.x, p.y);
    if (t) {
      if (t.owner === 0) {
        state.selected = t.id;
        state.selectedRegion = null;
        toast("QUẢN LÝ THÀNH TRÌ CỦA BẠN");
      } else {
        state.selected = t.id;
        state.selectedRegion = regionAt(p.x, p.y);
        toast(`THÀNH TRÌ CỦA ĐỊCH #${t.id}`);
      }
      panCameraTo(t.x, t.y);
      return;
    }
    const region = regionAt(p.x, p.y);
    if (region === null) {
      state.selectedRegion = null;
      state.selected = null;
      return;
    }

    const ownership = derivedRegionOwnership(region);
    const r = landById(region);

    if (ownership === 1) {
      state.selectedRegion = region;
      state.selected = null;
      toast("QUẢN LÝ LÃNH THỔ CỦA BẠN");
      if (r) panCameraTo(r.x, r.y);
      return;
    }

    state.selectedRegion = region;
    state.selected = null;
    if (r) panCameraTo(r.x, r.y);

    if (ownership === 0) {
      toast(`ĐÃ CHỌN LÃNH THỔ ${region + 1} - BẤM XÂY THÀNH TRÊN TOOLTIP`);
      return;
    }

    toast(`LÃNH THỔ ${region + 1} ĐÃ BỊ ĐỐI THỦ CHIẾM GIỮ`);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      state.selectedRegion = null;
      state.selected = null;
    }
    if (e.key === "+" || e.key === "=" || e.key === "-" || e.key === "_") {
      e.preventDefault();
      return;
    }
    if (e.key.toLowerCase() === "f") toggleFullscreen();
    if (
      e.key.toLowerCase() === "h" &&
      !(
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target?.isContentEditable
      )
    ) {
      toggleHideTerritoryAssets();
    }
    if (e.key === "0") {
      centerCameraOnWorldContent();
      toast("CAMERA XA ĐÃ RESET");
      saveCamera();
    }
  });

  function sim(dt) {
    state.tick += dt;
    if (
      state.targetZoom !== undefined &&
      state.targetZoom !== null &&
      Math.abs(state.zoom - state.targetZoom) > 0.001
    ) {
      state.zoom = lerp(state.zoom, state.targetZoom, Math.min(1, dt * 32));
    }

    if (state.targetPanX !== null && state.targetPanY !== null) {
      state.panX = lerp(state.panX, state.targetPanX, Math.min(1, dt * 32));
      state.panY = lerp(state.panY, state.targetPanY, Math.min(1, dt * 32));
      if (
        Math.abs(state.panX - state.targetPanX) < 0.5 &&
        Math.abs(state.panY - state.targetPanY) < 0.5
      ) {
        state.panX = state.targetPanX;
        state.panY = state.targetPanY;
        state.targetPanX = null;
        state.targetPanY = null;
        saveCamera();
      }
    }

    clampPan();
    for (let i = state.voyages.length - 1; i >= 0; i--) {
      const v = state.voyages[i];
      if (v.startedAt && v.arrivesAt) {
        const timing = timingElapsedSeconds(v.startedAt, v.arrivesAt);
        v.duration = timing.duration;
        v.targetProgress = Math.min(1, timing.elapsed / timing.duration);
        const current = Number.isFinite(v.displayProgress)
          ? v.displayProgress
          : v.targetProgress;
        const drift = v.targetProgress - current;
        v.displayProgress =
          Math.abs(drift) > 0.2
            ? v.targetProgress
            : current + drift * (1 - Math.exp(-dt * 10));
        v.t = v.displayProgress * v.duration;
      } else {
        v.t += dt;
        v.displayProgress = Math.min(1, v.t / v.duration);
      }
      if (v.t >= v.duration) {
        const targetReg =
          v.targetRegionId ?? (v.to ? regionAtCoords(v.to.x, v.to.y) : -1);
        const isTargetInBattle =
          hasBattleTargetRegion(targetReg) ||
          (targetReg < 0 &&
            (state.activeBattles || []).some((b: any) => {
              if (b.townId === undefined || !v.to) return false;
              const tMatch = towns.find(
                (tw: any) => String(tw.id) === String(b.townId),
              );
              return Boolean(
                tMatch && Math.hypot(tMatch.x - v.to.x, tMatch.y - v.to.y) < 60,
              );
            }));

        if (!isTargetInBattle) {
          state.voyages.splice(i, 1);
          continue;
        } else {
          v.t = v.duration;
          v.displayProgress = 1.0;
        }
      }
    }

    const nextBattles: any[] = [];
    (state.activeBattles || []).forEach((battle: any) => {
      const dur = battle.duration || battle.durationSeconds || 25;

      if (battle.isServerBattle && battle.resolvesAt) {
        const remMs = new Date(battle.resolvesAt).getTime() - Date.now();
        const remSec = Math.max(0, remMs / 1000);
        battle.t = Math.max(0, dur - remSec);
        if (remMs > -10000) {
          nextBattles.push(battle);
        }
      } else {
        battle.t = (battle.t || 0) + dt;
        if (battle.t < dur) {
          nextBattles.push(battle);
        }
      }
    });
    state.activeBattles = nextBattles;

    cancelClearingIfOriginLost();
    if (state.settlerTravel?.returning) {
      const settlerReturnSeconds = Math.max(
        2,
        12 *
          (18 / Math.max(1, gameConfig.settlerSpeed || 18)) *
          ((gameConfig.gameHourSeconds || 60) / 60),
      );
      state.settlerTravel.returnProgress = Math.min(
        1,
        (state.settlerTravel.returnProgress || 0) + dt / settlerReturnSeconds,
      );
      if (state.settlerTravel.returnProgress >= 1) {
        clearSettlerReturn();
      }
    }

    // ── Clearing progress ──────────────────────────────────────────────────
    Object.entries(state.activeClearingTimings || {}).forEach(
      ([key, timing]: any) => {
        const regionId = Number(key);
        if (!Number.isFinite(regionId)) return;
        state.regionClearing[regionId] = clearingTimingProgress(timing);
        if (
          state.regionClearing[regionId] >= 1 &&
          timing.playerId !== state.localPlayerId
        ) {
          delete state.activeClearingTimings[regionId];
          state.regionClearing[regionId] = 0;
        }
      },
    );
    const ip = state.regionInProgress;
    if (ip >= 0) {
      const r = landById(ip);
      if (r) {
        const serverTiming = state.activeClearingTimings[ip];
        if (serverTiming) {
          state.regionClearing[ip] = clearingTimingProgress(serverTiming);
          if (
            state.regionClearing[ip] >= 1 &&
            serverTiming.playerId === state.localPlayerId &&
            !state.pendingBackendClaims.includes(ip)
          ) {
            state.pendingBackendClaims.push(ip);
            toast("XÂY THÀNH HOÀN TẤT, ĐANG XÁC NHẬN SERVER");
          }
        } else {
          state.regionClearing[ip] = Math.max(0, state.regionClearing[ip] || 0);
        }
      }
    }

    // Resources, town storage, and population are owned by the backend state.

    if (Math.floor(state.tick) % 17 === 0 && Math.random() < dt * 0.08) {
      const f = factions[1 + Math.floor(Math.random() * (factions.length - 1))];
      pushLog(`${f.name}: ${f.chat}`);
    }

    // ── Smooth camera momentum inertia update ─────────────────────────────
    if (!state.drag && (Math.abs(panVelX) > 0.05 || Math.abs(panVelY) > 0.05)) {
      state.panX += panVelX;
      state.panY += panVelY;
      panVelX *= 0.82;
      panVelY *= 0.82;
      clampPan();
      if (Math.abs(panVelX) <= 0.05 && Math.abs(panVelY) <= 0.05) {
        panVelX = 0;
        panVelY = 0;
        saveCamera();
      }
    }
  }

  let last = performance.now();
  let lastFrameTime = 0;

  function hasActiveAnimations() {
    return (
      Boolean(state.drag) ||
      (state.voyages && state.voyages.length > 0) ||
      (state.activeBattles && state.activeBattles.length > 0) ||
      (state.regionClearing &&
        state.regionClearing.some((v: any) => v > 0 && v < 1)) ||
      (state.activeClearingTimings &&
        Object.keys(state.activeClearingTimings).length > 0) ||
      isFastPanning() ||
      isCameraInteracting() ||
      Boolean(minimapController?.isDragging())
    );
  }

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
    const highZoomPerformanceMode =
      state.zoom >= HIGH_ZOOM_PERFORMANCE_THRESHOLD;
    const farZoomPerformanceMode = state.zoom <= FAR_SCENERY_THRESHOLD;
    const targetFps = farZoomPerformanceMode
      ? isAnimating
        ? isTouchDevice()
          ? 20
          : 24
        : 15
      : highZoomPerformanceMode
      ? isAnimating
        ? isTouchDevice()
          ? 24
          : 30
        : 20
      : isAnimating
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

    if (!isFastPanning() && cameraSavePending && now - lastCameraSaveAt >= 500)
      saveCamera();
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
    destroy: () => {
      destroyed = true;
      saveCamera(true);
      clearAllRegionCache();
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pagehide", flushCameraOnPageHide);
      minimapController?.destroy();
      if (raf) cancelAnimationFrame(raf);
    },
    getState: () => state,
    canBuildStronghold: (regionId: number) =>
      expansionTargetState(regionId) !== null,
    getExpansionConnectionType: (regionId: number) => {
      const preferred = state.expansionSourceRegionId;
      if (preferred !== null)
        return expansionConnectionType(preferred, regionId);
      for (const sourceId of expansionSourceRegionsForTarget(regionId)) {
        const type = expansionConnectionType(sourceId, regionId);
        if (type) return type;
      }
      return null;
    },
    getExpansionSourceRegionsForTarget: (regionId: number) =>
      expansionSourceRegionsForTarget(regionId),
    getTowns: () => towns,
    getRegions: () => regions,
    getIslets: () => islets,
    mapToScreen: (x: number, y: number) => mapToScreen(x, y),
    getRegionOwnership: (id: number) => derivedRegionOwnership(id),
    getSourceTown: () => sourceTown(),
    getPlayerOwnedTowns: () => towns.filter(isPlayerOwnedTown),
    getTownRegionId: (town: any) => townRegionId(town),
    getRegion: (id: number) => landById(reactToCanvasRegionId(id)),
    getRegionCenter: (id: number) => {
      const r = landById(reactToCanvasRegionId(id));
      if (!r) return null;
      return mapToScreen(r.x, r.y);
    },
    getTerritorySpecialResources: (id: number) =>
      territorySpecialResources(reactToCanvasRegionId(id)),
    getActiveBattleForRegion: (id: number) =>
      state.activeBattles.find(
        (battle: any) => Number(battle.regionId) === Number(id),
      ) || null,
    isPlayerOwnedTown: (town: any) => isPlayerOwnedTown(town),
    getMarchRouteStatus: (sourceTown: any, targetRegionId: number) =>
      getMarchRouteStatus(sourceTown, reactToCanvasRegionId(targetRegionId)),
    sendChat: (msg: string) => {
      pushLog(`PLAYER1: ${msg}`);
      save();

      // AI Faction responses
      setTimeout(() => {
        if (destroyed) return;
        const msgClean = msg.toLowerCase().trim();
        const opponentFactions = factions.filter((_, idx) => idx > 0);
        const f =
          opponentFactions[Math.floor(Math.random() * opponentFactions.length)];

        let reply = "";
        if (msgClean.includes("chào") || msgClean.includes("hello")) {
          reply = "Chào mừng sứ giả PLAYER1! Bản xứ không đón tiếp kẻ thù.";
        } else if (
          msgClean.includes("đánh") ||
          msgClean.includes("chiếm") ||
          msgClean.includes("cướp") ||
          msgClean.includes("tấn công")
        ) {
          reply =
            "Muốn động binh đao sao? Kiếm sắc của chúng ta đã khát máu lâu rồi!";
        } else if (
          msgClean.includes("xin") ||
          msgClean.includes("đổi") ||
          msgClean.includes("giao thương") ||
          msgClean.includes("vàng")
        ) {
          reply =
            "Hãy gửi vàng sang đây, chúng ta sẽ xem xét thông thương hữu nghị!";
        } else {
          reply = f.chat || "Ngươi đang nói gì vậy?";
        }
        pushLog(`${f.name}: ${reply}`);
        save();
      }, 1500);
    },
    handleAction: (id: string, payload?: any) => {
      if (id === "setMinimapCanvas") {
        minimapCanvas = payload;
        minimapController?.setCanvas(minimapCanvas);
        return;
      }
      if (id === "setUiOverlayActive") {
        uiOverlayActive = Boolean(payload?.active ?? payload);
        if (!uiOverlayActive) {
          lastOverlayFrameAt = 0;
          lastOverlayUpdateAt = 0;
        }
        return;
      }
      if (id === "setRenderSuspended") {
        renderSuspended = Boolean(payload?.active ?? payload);
        lastFrameTime = 0;
        last = performance.now();
        return;
      }
      if (id === "setToast") {
        toast(payload?.message || "KHÔNG THỂ THỰC HIỆN LỆNH");
        return;
      }
      if (id === "setLocalPlayer") {
        if (payload?.playerId !== undefined) {
          state.localPlayerId = payload.playerId || null;
        }
        if (payload?.playerName !== undefined) {
          state.localPlayerName = payload.playerName || "BẠN";
        }
        if (payload?.avatarId) {
          state.localPlayerAvatarId = payload.avatarId;
        }
        return;
      }
      if (id === "syncResources") {
        if (payload?.resources)
          state.resources = { ...state.resources, ...payload.resources };
        return;
      }
      if (id === "setShopInventory") {
        state.equippedAvatarFrameId =
          payload?.inventory?.equippedAvatarFrameId || "vip";
        state.equippedCapitalSkin =
          payload?.inventory?.equippedCapitalSkin || null;
        state.equippedDistrictSkin =
          payload?.inventory?.equippedDistrictSkin || null;
        state.equippedNameFrameId =
          payload?.inventory?.equippedNameFrameId || null;
        if (Array.isArray(payload?.capitalTerritoryIds)) {
          state.capitalTerritoryIds = new Set(
            payload.capitalTerritoryIds.map(Number).filter(Number.isFinite),
          );
        }
        if (Array.isArray(payload?.capitalTownIds)) {
          state.capitalTownIds = new Set(
            payload.capitalTownIds.map(Number).filter(Number.isFinite),
          );
        }
        return;
      }
      if (id === "updateRemoteSkin") {
        const ownerId = payload?.ownerId;
        if (!ownerId) return;
        Object.keys(state.regionOwnerIds).forEach((key) => {
          const regionId = Number(key);
          if (state.regionOwnerIds[regionId] !== ownerId) return;
          if (payload?.equippedCapitalSkin !== undefined)
            state.regionOwnerCapitalSkins[regionId] =
              payload.equippedCapitalSkin || null;
          if (payload?.equippedDistrictSkin !== undefined)
            state.regionOwnerDistrictSkins[regionId] =
              payload.equippedDistrictSkin || null;
        });
        return;
      }
      if (id === "updateRemoteProfileCosmetic") {
        const ownerId = payload?.ownerId;
        if (!ownerId) return;
        Object.keys(state.regionOwnerIds).forEach((key) => {
          const regionId = Number(key);
          if (state.regionOwnerIds[regionId] !== ownerId) return;
          if (payload?.avatarId)
            state.regionOwnerAvatarIds[regionId] = payload.avatarId;
          if (payload?.avatarFrameId)
            state.regionOwnerAvatarFrameIds[regionId] = payload.avatarFrameId;
        });
        return;
      }
      if (id === "syncTownSnapshots") {
        applyBackendTownSnapshots(payload?.towns || []);
        save();
        return;
      }
      if (id === "applyConfig") {
        if (payload?.config) Object.assign(gameConfig, payload.config);
        return;
      }
      if (id === "setExpansionSource") {
        const regionId = Number(payload?.regionId);
        state.expansionSourceRegionId =
          Number.isInteger(regionId) && regionId >= 0 ? regionId : null;
        state.toast =
          state.expansionSourceRegionId === null
            ? "ĐÃ HỦY MỞ RỘNG LÃNH ĐỊA"
            : "CHỌN VÙNG ĐƯỢC VIỀN VÀNG ĐỂ DỰNG PHÁO ĐÀI";
        return;
      }
      if (id === "prepareBackendWorld") {
        state.hasAuthoritativeOwnership = true;
        state.regionOwnership = [];
        state.regionOwnerIds = {};
        state.regionOwnerNames = {};
        state.regionOwnerFlagColors = {};
        state.regionOwnerEmblems = {};
        state.regionOwnerArchitectureIds = {};
        state.regionOwnerAvatarIds = {};
        state.regionOwnerAvatarFrameIds = {};
        state.regionOwnerVipLevels = {};
        state.regionOwnerAllianceTags = {};
        state.regionOwnerAllianceEmblems = {};
        state.regionSettlementKinds = {};
        state.regionParentTerritoryIds = {};
        state.regionRootTerritoryIds = {};
        state.regionConnectionTypes = {};
        state.regionIsolatedUntil = {};
        state.regionSpecialResources = {};
        state.regionOwnerCapitalSkins = {};
        state.regionOwnerDistrictSkins = {};
        state.regionClearing = [];
        state.activeClearingTimings = {};
        state.regionInProgress = -1;
        state.selected = null;
        state.selectedRegion = null;
        state.settlerTravel = {
          active: false,
          targetRegionId: -1,
          originTownId: null,
          originX: 0,
          originY: 0,
        };
        towns.splice(0, towns.length);
        initTerritoryArrays();
        state.toast = "ĐANG ĐỒNG BỘ DỮ LIỆU SERVER";
        return;
      }
      if (id === "updateNewbieShield") {
        const until = payload?.until ? new Date(payload.until).getTime() : 0;
        state.newbieShieldUntil = until;
        localStorage.setItem(
          "island_empire_newbie_shield_until",
          String(until),
        );
        return;
      }
      if (id === "applyGameState") {
        if (payload?.resources) {
          state.resources = { ...state.resources, ...payload.resources };
        }
        if (payload?.newbieShieldUntil !== undefined) {
          state.newbieShieldUntil = payload.newbieShieldUntil
            ? new Date(payload.newbieShieldUntil).getTime()
            : 0;
          localStorage.setItem(
            "island_empire_newbie_shield_until",
            String(state.newbieShieldUntil),
          );
        }
        if (payload?.playerProfile) {
          state.localPlayerName =
            String(
              payload.playerProfile.cityName ||
                payload.playerProfile.name ||
                state.localPlayerName ||
                "BẠN",
            ).trim() || "BẠN";
          state.newbieFlagColor = payload.playerProfile.flagColor;
          state.newbieEmblem = payload.playerProfile.emblem;
          state.localPlayerAvatarId =
            payload.playerProfile.avatarId || state.localPlayerAvatarId;
          state.localPlayerVipLevel = Number(
            payload.playerProfile.vipLevel || 0,
          );
          state.newbieArchitectureId = normalizeKingdomArchitecture(
            payload.playerProfile.kingdomArchitectureId ||
              kingdomArchitectureFromEmblem(payload.playerProfile.emblem),
          );
        }
        const touchedRegionIds = [];
        state.hasAuthoritativeOwnership = true;
        state.regionOwnerIds = {};
        state.regionOwnerNames = {};
        state.regionOwnerFlagColors = {};
        state.regionOwnerEmblems = {};
        state.regionOwnerArchitectureIds = {};
        state.regionOwnerAvatarIds = {};
        state.regionOwnerAvatarFrameIds = {};
        state.regionOwnerVipLevels = {};
        state.regionOwnerAllianceTags = {};
        state.regionOwnerAllianceEmblems = {};
        state.regionSettlementKinds = {};
        state.regionParentTerritoryIds = {};
        state.regionRootTerritoryIds = {};
        state.regionConnectionTypes = {};
        state.regionIsolatedUntil = {};
        state.regionSpecialResources = {};
        state.regionOwnerCapitalSkins = {};
        state.regionOwnerDistrictSkins = {};
        state.activeClearingTimings = {};
        state.regionInProgress = -1;
        state.settlerTravel = {
          active: false,
          targetRegionId: -1,
          originTownId: null,
          originX: 0,
          originY: 0,
        };
        let hasOwnedTerritory = false;
        (payload?.territories || []).forEach((territory) => {
          const ownerId = territory.ownerId || null;
          const ownerCode = ownerId
            ? ownerId === state.localPlayerId
              ? 1
              : 2
            : territory.ownerCode || 0;
          if (ownerCode === 1) {
            hasOwnedTerritory = true;
          }
          touchedRegionIds.push(territory.id);
          state.regionOwnership[territory.id] = ownerCode;
          if (ownerId) state.regionOwnerIds[territory.id] = ownerId;
          if (territory.ownerName)
            state.regionOwnerNames[territory.id] =
              ownerCode === 1
                ? state.localPlayerName || "BẠN"
                : territory.ownerName;
          if (territory.ownerFlagColor)
            state.regionOwnerFlagColors[territory.id] =
              territory.ownerFlagColor;
          if (territory.ownerEmblem)
            state.regionOwnerEmblems[territory.id] = territory.ownerEmblem;
          if (territory.ownerArchitectureId)
            state.regionOwnerArchitectureIds[territory.id] =
              territory.ownerArchitectureId;
          if (territory.ownerAvatarId)
            state.regionOwnerAvatarIds[territory.id] = territory.ownerAvatarId;
          if (territory.ownerAvatarFrameId)
            state.regionOwnerAvatarFrameIds[territory.id] =
              territory.ownerAvatarFrameId;
          if (territory.ownerVipLevel !== undefined)
            state.regionOwnerVipLevels[territory.id] = Number(
              territory.ownerVipLevel || 0,
            );
          if (territory.ownerAllianceTag)
            state.regionOwnerAllianceTags[territory.id] =
              territory.ownerAllianceTag;
          if (territory.ownerAllianceEmblem)
            state.regionOwnerAllianceEmblems[territory.id] =
              territory.ownerAllianceEmblem;
          if (territory.settlementKind)
            state.regionSettlementKinds[territory.id] =
              territory.settlementKind;
          if (territory.parentTerritoryId !== undefined)
            state.regionParentTerritoryIds[territory.id] =
              territory.parentTerritoryId;
          if (territory.rootTerritoryId !== undefined)
            state.regionRootTerritoryIds[territory.id] =
              territory.rootTerritoryId;
          if (territory.connectionType)
            state.regionConnectionTypes[territory.id] =
              territory.connectionType;
          if (territory.isolated && territory.isolatedUntil)
            state.regionIsolatedUntil[territory.id] = territory.isolatedUntil;
          if (Array.isArray(territory.specialResources))
            state.regionSpecialResources[territory.id] =
              territory.specialResources;
          if (territory.equippedCapitalSkin)
            state.regionOwnerCapitalSkins[territory.id] =
              territory.equippedCapitalSkin;
          if (territory.equippedDistrictSkin)
            state.regionOwnerDistrictSkins[territory.id] =
              territory.equippedDistrictSkin;
        });
        if (hasOwnedTerritory) {
          if (state.newbieMode) {
            state.newbieMode = false;
            state.newbiePhase = "done";
            localStorage.removeItem(ONBOARDING_KEY);
          }
        } else {
          state.newbieMode = true;
          if (state.newbiePhase === "none" || state.newbiePhase === "done") {
            state.newbiePhase = "select_land";
          }
          state.toast = "TÂN THỦ: CHỌN MẢNH ĐẤT HOANG ĐỂ XÂY THÀNH";
        }
        syncTownOwnersForRegions(touchedRegionIds);
        applyBackendTownSnapshots(payload?.towns || []);
        cancelClearingIfTargetTaken(touchedRegionIds);
        cancelClearingIfOriginLost();
        state.voyages = state.voyages.filter((voyage) => {
          const targetReg =
            voyage.targetRegionId ??
            (voyage.to ? regionAtCoords(voyage.to.x, voyage.to.y) : -1);
          const hasActiveClearing =
            (state.regionClearing || []).includes(targetReg) ||
            (state.activeClearingTimings &&
              (state.activeClearingTimings[targetReg] ||
                state.activeClearingTimings[canvasToReactRegionId(targetReg)]));
          const isServerActive = (payload?.marches || []).some((m: any) => {
            const mId = m._id || m.id || m.marchId;
            return mId === voyage.backendMarchId;
          });
          return isServerActive && voyage.t < voyage.duration;
        });
        (payload?.marches || []).forEach((march) => {
          try {
            applyBackendMarch(march);
          } catch (err) {
            console.warn("Failed to hydrate march:", march, err);
          }
        });
        try {
          applyBackendBattles(payload?.battles || [], false);
        } catch (err) {
          console.warn("Failed to hydrate battles:", err);
        }

        // --- BUG FIX: Re-apply persisted clearings from server after state reset ---
        if (Array.isArray(payload?.clearings) && payload.clearings.length > 0) {
          payload.clearings.forEach((clearing: any) => {
            try {
              applyBackendClearing(clearing);
            } catch (err) {
              console.warn("Failed to hydrate clearing:", clearing, err);
            }
          });
        }

        save();
        return;
      }
      if (id === "applyBackendBattles") {
        applyBackendBattles(payload?.battles || [], payload?.merge !== false);
        return;
      }
      if (id === "removeBackendMarch") {
        const marchId = payload?.marchId;
        if (marchId) {
          state.voyages = (state.voyages || []).filter(
            (voyage: any) => voyage.backendMarchId !== marchId,
          );
        }
        return;
      }
      if (id === "removeBackendBattle") {
        const battleId = payload?.battleId;
        if (battleId) {
          state.activeBattles = (state.activeBattles || []).filter(
            (battle: any) => battle.id !== battleId && battle._id !== battleId,
          );
        }
        return;
      }
      if (id === "applyWorldOwnership") {
        const touchedRegionIds = [];
        state.hasAuthoritativeOwnership = true;
        if (payload?.replace) {
          state.regionOwnership = [];
          state.regionOwnerNames = {};
          state.regionOwnerIds = {};
          state.regionOwnerFlagColors = {};
          state.regionOwnerEmblems = {};
          state.regionOwnerArchitectureIds = {};
          state.regionOwnerAvatarIds = {};
          state.regionOwnerAvatarFrameIds = {};
          state.regionOwnerVipLevels = {};
          state.regionOwnerAllianceTags = {};
          state.regionOwnerAllianceEmblems = {};
          state.regionSettlementKinds = {};
          state.regionParentTerritoryIds = {};
          state.regionRootTerritoryIds = {};
          state.regionConnectionTypes = {};
          state.regionIsolatedUntil = {};
          state.regionSpecialResources = {};
          state.regionOwnerCapitalSkins = {};
          state.regionOwnerDistrictSkins = {};
        }
        (payload?.territories || []).forEach((territory) => {
          const ownerId = territory.ownerId || null;
          const ownerCode = ownerId
            ? ownerId === state.localPlayerId
              ? 1
              : 2
            : territory.ownerCode || 0;
          if (ownerCode === 1) {
            state.builderRegionId = territory.id;
            localStorage.setItem(
              "island_empire_builder_region_id",
              String(territory.id),
            );
          }
          touchedRegionIds.push(territory.id);
          state.regionOwnership[territory.id] = ownerCode;
          if (ownerId) state.regionOwnerIds[territory.id] = ownerId;
          else delete state.regionOwnerIds[territory.id];
          if (territory.ownerName)
            state.regionOwnerNames[territory.id] =
              ownerCode === 1
                ? state.localPlayerName || "BẠN"
                : territory.ownerName;
          else delete state.regionOwnerNames[territory.id];
          if (territory.ownerFlagColor)
            state.regionOwnerFlagColors[territory.id] =
              territory.ownerFlagColor;
          else delete state.regionOwnerFlagColors[territory.id];
          if (territory.ownerEmblem)
            state.regionOwnerEmblems[territory.id] = territory.ownerEmblem;
          else delete state.regionOwnerEmblems[territory.id];
          if (territory.ownerArchitectureId)
            state.regionOwnerArchitectureIds[territory.id] =
              territory.ownerArchitectureId;
          else delete state.regionOwnerArchitectureIds[territory.id];
          if (territory.ownerAvatarId)
            state.regionOwnerAvatarIds[territory.id] = territory.ownerAvatarId;
          else delete state.regionOwnerAvatarIds[territory.id];
          if (territory.ownerAvatarFrameId)
            state.regionOwnerAvatarFrameIds[territory.id] =
              territory.ownerAvatarFrameId;
          else delete state.regionOwnerAvatarFrameIds[territory.id];
          if (territory.ownerVipLevel !== undefined)
            state.regionOwnerVipLevels[territory.id] = Number(
              territory.ownerVipLevel || 0,
            );
          else delete state.regionOwnerVipLevels[territory.id];
          if (territory.ownerAllianceTag)
            state.regionOwnerAllianceTags[territory.id] =
              territory.ownerAllianceTag;
          else delete state.regionOwnerAllianceTags[territory.id];
          if (territory.ownerAllianceEmblem)
            state.regionOwnerAllianceEmblems[territory.id] =
              territory.ownerAllianceEmblem;
          else delete state.regionOwnerAllianceEmblems[territory.id];
          if (territory.settlementKind)
            state.regionSettlementKinds[territory.id] =
              territory.settlementKind;
          else delete state.regionSettlementKinds[territory.id];
          if (territory.parentTerritoryId !== undefined)
            state.regionParentTerritoryIds[territory.id] =
              territory.parentTerritoryId;
          else delete state.regionParentTerritoryIds[territory.id];
          if (territory.rootTerritoryId !== undefined)
            state.regionRootTerritoryIds[territory.id] =
              territory.rootTerritoryId;
          else delete state.regionRootTerritoryIds[territory.id];
          if (territory.connectionType)
            state.regionConnectionTypes[territory.id] =
              territory.connectionType;
          else delete state.regionConnectionTypes[territory.id];
          if (territory.isolated && territory.isolatedUntil)
            state.regionIsolatedUntil[territory.id] = territory.isolatedUntil;
          else delete state.regionIsolatedUntil[territory.id];
          if (Array.isArray(territory.specialResources))
            state.regionSpecialResources[territory.id] =
              territory.specialResources;
          else delete state.regionSpecialResources[territory.id];

          // Ownership events are sometimes partial (for example after a
          // battle). Preserve a known skin when the event does not carry skin
          // fields; an explicit null still means the player unequipped it.
          if (
            Object.prototype.hasOwnProperty.call(
              territory,
              "equippedCapitalSkin",
            )
          ) {
            if (territory.equippedCapitalSkin)
              state.regionOwnerCapitalSkins[territory.id] =
                territory.equippedCapitalSkin;
            else delete state.regionOwnerCapitalSkins[territory.id];
          }

          if (
            Object.prototype.hasOwnProperty.call(
              territory,
              "equippedDistrictSkin",
            )
          ) {
            if (territory.equippedDistrictSkin)
              state.regionOwnerDistrictSkins[territory.id] =
                territory.equippedDistrictSkin;
            else delete state.regionOwnerDistrictSkins[territory.id];
          }
        });
        syncTownOwnersForRegions(touchedRegionIds);
        cancelClearingIfTargetTaken(touchedRegionIds);
        cancelClearingIfOriginLost();
        state.activeBattles = (state.activeBattles || []).filter(
          (b: any) => !touchedRegionIds.includes(b.regionId),
        );
        // Ownership updates can arrive before the matching march event. Do not
        // infer that a route is finished here; only server state/march_removed
        // is allowed to remove a persisted backend march.
        save();
        return;
      }
      if (id === "applyBackendClearing") {
        applyBackendClearing(payload?.clearing || payload);
        save();
        return;
      }
      if (id === "applyBackendMarch") {
        const applied = applyBackendMarch(
          payload?.march || payload,
          payload?.unitMix || payload,
        );
        save();
        return applied;
      }
      if (id === "focusBackendMarch") {
        return focusBackendMarch(payload?.marchId);
      }
      if (id === "focusBackendClearing") {
        return focusBackendClearing(payload?.territoryId);
      }
      if (id === "focusTerritory") {
        const territoryId = Number(payload?.territoryId);
        const focused = focusBackendClearing(territoryId);
        if (!focused) return false;
        state.selected = null;
        state.selectedRegion = reactToCanvasRegionId(territoryId);
        toast(
          payload?.label
            ? `ĐÃ ĐỊNH VỊ ${String(payload.label).toUpperCase()}`
            : `ĐÃ ĐỊNH VỊ LÃNH THỔ ${territoryId + 1}`,
        );
        save();
        return true;
      }
      if (id === "markClearingRejected") {
        const regionId = payload?.regionId;
        if (regionId !== undefined && regionId !== null) {
          refundSettlerPopulationForRegion(regionId);
          state.regionOwnership[regionId] = 0;
          delete state.regionOwnerIds[regionId];
          delete state.regionOwnerNames[regionId];
          delete state.regionOwnerAllianceTags[regionId];
          delete state.regionOwnerAllianceEmblems[regionId];
          state.regionClearing[regionId] = 0;
          delete state.activeClearingTimings[regionId];
          if (state.regionInProgress === regionId) state.regionInProgress = -1;
        }
        state.settlerTravel = {
          active: false,
          targetRegionId: -1,
          originTownId: null,
          originX: 0,
          originY: 0,
        };
        state.pendingBackendClearingStarts =
          state.pendingBackendClearingStarts.filter((id) => id !== regionId);
        toast(
          payload?.message || "SERVER TỪ CHỐI XÂY THÀNH, ĐÃ HOÀN TÀI NGUYÊN",
        );
        return;
      }
      if (id === "consumeBackendClaims") {
        state.pendingBackendClaims = [];
        return;
      }
      if (id === "consumeBackendClaim") {
        const regionId = payload?.regionId ?? payload;
        state.pendingBackendClaims = state.pendingBackendClaims.filter(
          (id) => id !== regionId,
        );
        return;
      }
      if (id === "consumeBackendConquests") {
        state.pendingBackendConquests = [];
        return;
      }
      if (id === "consumeBackendClearingStarts") {
        state.pendingBackendClearingStarts = [];
        return;
      }
      if (id === "markClaimRejected") {
        const regionId = payload?.regionId;
        if (regionId !== undefined && regionId !== null) {
          state.regionOwnership[regionId] = 0;
          state.regionClearing[regionId] = 0;
          delete state.activeClearingTimings[regionId];
          delete state.regionOwnerIds[regionId];
          delete state.regionOwnerNames[regionId];
          for (let i = towns.length - 1; i >= 0; i--) {
            if (towns[i].owner === 0 && towns[i].regionId === regionId)
              towns.splice(i, 1);
          }
        }
        state.pendingBackendClaims = state.pendingBackendClaims.filter(
          (id) => id !== regionId,
        );
        toast("SERVER TỪ CHỐI: LÃNH THỔ NÀY ĐÃ CÓ NGƯỜI CHIẾM");
        return;
      }
      if (id === "claimRegion") {
        toast("XÂY THÀNH PHẢI ĐƯỢC SERVER XÁC NHẬN");
        return;
      }
      if (id === "cancelClaimRegion") {
        const canvasId = reactToCanvasRegionId(payload);
        state.regionInProgress = -1;
        state.regionClearing[canvasId] = 0;
        delete state.activeClearingTimings[canvasId];
        state.regionOwnership[canvasId] = 0;
        delete state.regionOwnerNames[canvasId];
        delete state.regionOwnerFlagColors[canvasId];
        delete state.regionOwnerEmblems[canvasId];
        delete state.regionOwnerIds[canvasId];
        delete state.regionSettlementKinds[canvasId];
        beginSettlerReturn(
          canvasId,
          "ĐÃ HỦY XÂY THÀNH: ĐỘI THỢ QUAY VỀ, ĐẤT ĐÃ RESET TRỞ VỀ HOANG DÃ",
        );
        return;
      }
      if (id === "marchAttack") {
        toast("HÀNH QUÂN PHẢI ĐƯỢC SERVER XÁC NHẬN");
        return false;
      }
      if (id === "marchReinforce") {
        toast("HÀNH QUÂN PHẢI ĐƯỢC SERVER XÁC NHẬN");
        return false;
      }
      if (id === "selectTown") {
        let townId = payload.townId;
        if (payload.regionId !== undefined && payload.regionId !== null) {
          const t = ensureTownForRegion(payload.regionId, 1);
          if (t) townId = t.id;
        }
        state.selected = townId;
        state.selectedRegion = null;
        save();
        return;
      }
      if (id === "centerCamera") {
        const b = worldContentBounds();
        const x = Math.max(
          b.minX,
          Math.min(b.maxX, Number(payload?.x) || b.cx),
        );
        const y = Math.max(
          b.minY,
          Math.min(b.maxY, Number(payload?.y) || b.cy),
        );
        const farZ = getDefaultFarZoom();
        state.zoom = farZ;
        state.targetZoom = farZ;
        state.panX = W / 2 - x * state.zoom - (1 - state.zoom) * W * 0.48;
        state.panY = H / 2 - y * state.zoom - (1 - state.zoom) * H * 0.48;
        state.selected = null;
        state.selectedRegion = null;
        clampPan();
        toast(
          payload?.label
            ? `ĐÃ NHẢY ĐẾN ${payload.label}`
            : `ĐÃ NHẢY ĐẾN X:${Math.round(x)} Y:${Math.round(y)}`,
        );
        saveCamera();
        save();
        return;
      }
      if (id === "setStarterRegion") {
        if (state.cameraRestored && !payload?.force) return;
        const regionId = reactToCanvasRegionId(payload.regionId);
        const r = landById(regionId);
        if (!r) return;
        const farZ = getDefaultFarZoom();
        state.zoom = farZ;
        state.targetZoom = farZ;
        state.panX = W / 2 - r.x * state.zoom - (1 - state.zoom) * W * 0.48;
        state.panY = H / 2 - r.y * state.zoom - (1 - state.zoom) * H * 0.48;
        state.selected = null;
        state.selectedRegion = null;
        state.newbieSelectedRegion = regionId;
        clampPan();
        toast(`GỢI Ý VÙNG KHỞI ĐẦU: LÃNH THỔ ${regionId + 1}`);
        saveCamera();
        return;
      }
      if (id === "buildStructure") {
        toast("TÍNH NĂNG XÂY CÔNG TRÌNH ĐÃ TẠM ẨN ĐỂ CHỜ ĐỒNG BỘ SERVER");
        return;
      }
      if (id === "allyTrade") {
        toast("GIAO THƯƠNG LIÊN MINH PHẢI ĐƯỢC SERVER XÁC NHẬN");
        return;
      }
      if (id === "allyHire") {
        toast("THUÊ VIỆN BINH PHẢI ĐƯỢC SERVER XÁC NHẬN");
        return;
      }
      if (id === "triggerEvent") {
        toast("TÍNH NĂNG SỰ KIỆN BUFF ĐÃ TẠM ẨN ĐỂ CHỜ ĐỒNG BỘ SERVER");
        return;
      }
      handleButton(id);
    },
    startNewbieOnboarding: (
      flagColor: string,
      emblem: string,
      cityName?: string,
      architectureId?: string,
    ) => {
      state.newbieFlagColor = flagColor;
      state.newbieEmblem = emblem;
      state.newbieArchitectureId = normalizeKingdomArchitecture(
        architectureId || kingdomArchitectureFromEmblem(emblem),
      );
      const region = state.newbieSelectedRegion ?? NEWBIE_DEFAULT_REGION;
      state.newbieSelectedRegion = region;
      if (region >= 0) {
        state.regionOwnerFlagColors[region] = flagColor;
        state.regionOwnerEmblems[region] = emblem;
        state.regionOwnerArchitectureIds[region] = state.newbieArchitectureId;
        if (cityName) {
          state.regionOwnerNames[region] = cityName;
        }
      }
      toast("ĐÃ TẠO VƯƠNG QUỐC! ĐANG DỰNG THÀNH TRÌ...");
    },
    cancelNewbieOnboarding: () => {
      state.newbiePhase = "select_land";
      state.newbieSelectedRegion = null;
    },
    selectNewbieLand: (regionId: number) => {
      state.newbieMode = true;
      state.newbiePhase = "choose_banner";
      state.newbieSelectedRegion = regionId;
      state.selectedRegion = null;
      state.selected = null;
      state.toast = "CHỌN CỜ VÀ BIỂU TƯỢNG RỒI XÁC NHẬN XÂY THÀNH";
    },
    setHideTerritoryAssets: (hide: boolean) => {
      toggleHideTerritoryAssets(hide);
    },
    isHidingTerritoryAssets: () => hideTerritoryAssets,
    toggleHideTerritoryAssets: (forceValue?: boolean) => {
      return toggleHideTerritoryAssets(forceValue);
    },
    getConfig: () => gameConfig,
    territoryYield,
    clearingDuration,
    territoryBuildCost,
  };
}
