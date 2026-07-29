// @ts-nocheck
import { generateWorldTerritories } from "@island/shared";
// Generated from demo/js/game.js so the main app matches the demo map exactly.
export type GameEngineHandle = {
  destroy: () => void;
  getState: () => any;
  getTowns: () => any[];
  getRegions: () => any[];
  getIslets: () => any[];
  mapToScreen: (x: number, y: number) => { x: number; y: number };
  getRegionOwnership: (id: number) => number;
  getSourceTown: () => any;
  getPlayerOwnedTowns: () => any[];
  getTownRegionId: (town: any) => number;
  getRegion: (id: number) => any;
  getRegionCenter: (id: number) => { x: number; y: number } | null;
  getTerritorySpecialResources: (id: number) => string[];
  getActiveBattleForRegion: (id: number) => any;
  isPlayerOwnedTown: (town: any) => boolean;
  getMarchRouteStatus: (sourceTown: any, targetRegionId: number) => { ok: boolean; message: string; requiresShip: boolean };
  sendChat: (msg: string) => void;
  handleAction: (id: string, payload?: any) => any;
  startNewbieOnboarding: (flagColor: string, emblem: string) => void;
  cancelNewbieOnboarding: () => void;
};

export function createIslandEmpireGame(
  canvas: HTMLCanvasElement, 
  onUpdate?: (state: any, towns: any[]) => void,
  minimapCanvas?: HTMLCanvasElement | null,
  onLayoutAction?: (actionId: string, payload?: any) => void
): GameEngineHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) return {
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
    isPlayerOwnedTown: () => false,
    getMarchRouteStatus: () => ({ ok: false, message: "Không có bản đồ", requiresShip: false }),
    sendChat: () => {},
    handleAction: () => {},
    startNewbieOnboarding: () => {},
    cancelNewbieOnboarding: () => {},
  };
  ctx.imageSmoothingEnabled = false;

  let minimapCtx = minimapCanvas?.getContext("2d");

  let destroyed = false;
  let raf = 0;

  let W = window.innerWidth;
  let H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;

  function resizeCanvas() {
    if (destroyed) return;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;
  }
  function flushCameraOnPageHide() {
    saveCamera(true);
  }
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pagehide", flushCameraOnPageHide);

  const TAU = Math.PI * 2;
  const CAMERA_KEY = "island_empire_camera_v1";
  const ONBOARDING_KEY = "island_empire_onboarding_pending";
  const BASE_ZOOM = 1;
  const FIXED_FAR_ZOOM = 0.35;
  const NEWBIE_DEFAULT_REGION = 0;
  const gameConfig = {
    infantryCostGold: 100,
    infantryCostWood: 30,
    infantryTroopsValue: 18,
    cavalryCostGold: 170,
    cavalryCostWood: 40,
    cavalryCostStone: 45,
    cavalryTroopsValue: 34,
    artilleryCostGold: 240,
    artilleryCostStone: 120,
    artilleryTroopsValue: 58,
    infantryCostFood: 55,
    cavalryCostFood: 90,
    cavalryCostIron: 12,
    artilleryCostIron: 85,
    artilleryCostSulfur: 25,
    settlerSpeed: 18,
    infantrySpeed: 24,
    cavalrySpeed: 42,
    artillerySpeed: 14,
    shipSpeed: 12,
    gameHourSeconds: 60,
    maxBattleDuration: 12,
  };
  const MAP_UNITS_TO_KM = 0.18;

  const COLORS = {
    blue: "#2f70d7",
    red: "#d74635",
    green: "#44a13d",
    purple: "#8e45bc",
    gold: "#d89b21",
    pink: "#cf5d83",
    teal: "#48a88e",
    gray: "#8d95a1",
  };

  const BIOMES = [
    { id: "grass", a: "#6f9651", b: "#5d8044", hi: "#9fb977", dark: "#3d6032", edge: "#273d22", beach: "#cfb46a", cliffUpper: "#6a5730", cliffMid: "#40321b", cliffDeep: "#1f180d" },
    { id: "sand", a: "#c8a85d", b: "#af8d4b", hi: "#dec37c", dark: "#7e6537", edge: "#5d4828", beach: "#d8bd75", cliffUpper: "#7d6135", cliffMid: "#4f3a1f", cliffDeep: "#251b0e" },
    { id: "snow", a: "#d9e1da", b: "#c2cec6", hi: "#f1f4ed", dark: "#8fa098", edge: "#687a72", beach: "#dfe5dc", cliffUpper: "#819188", cliffMid: "#55645d", cliffDeep: "#303b36" },
    { id: "ember", a: "#70685b", b: "#5b554c", hi: "#918674", dark: "#403b34", edge: "#2d2a25", beach: "#9b8252", cliffUpper: "#514533", cliffMid: "#312a20", cliffDeep: "#17130f" },
    { id: "jade", a: "#6ea48d", b: "#5b8d79", hi: "#9bc7b3", dark: "#3b675b", edge: "#284941", beach: "#a9c6a0", cliffUpper: "#506c4f", cliffMid: "#314335", cliffDeep: "#172119" },
    { id: "clay", a: "#bd785b", b: "#a6664d", hi: "#d29373", dark: "#764630", edge: "#573222", beach: "#d2a66f", cliffUpper: "#765036", cliffMid: "#493120", cliffDeep: "#23170f" },
    { id: "pine", a: "#4f7d44", b: "#3f6a39", hi: "#7aa36d", dark: "#294b27", edge: "#1f351d", beach: "#a8bf83", cliffUpper: "#4a5f33", cliffMid: "#2f3e22", cliffDeep: "#171f10" },
    { id: "moss", a: "#879762", b: "#728151", hi: "#a8b87b", dark: "#505e37", edge: "#39452a", beach: "#b8bd79", cliffUpper: "#65623a", cliffMid: "#3f3d24", cliffDeep: "#1e1d11" },
  ];

  const OWNER_BIOMES = [
    { a: "#2f70d7", b: "#265bb5", hi: "#578ff7", dark: "#193d8a", edge: "#112b63" }, // Blue (0)
    { a: "#d74635", b: "#b83526", hi: "#f76957", dark: "#8a2419", edge: "#631711" }, // Red (1)
    { a: "#44a13d", b: "#358a30", hi: "#6be263", dark: "#205c1c", edge: "#154212" }, // Green (2)
    { a: "#d89b21", b: "#b88017", hi: "#f9bc48", dark: "#8a5e0f", edge: "#634208" }, // Gold (3)
    { a: "#529642", b: "#3f7832", hi: "#77be65", dark: "#2a5921", edge: "#1d4217" }, // Forest Green (4)
    { a: "#ff9736", b: "#d9751e", hi: "#ffc385", dark: "#9e4e0b", edge: "#733704" }, // Vibrant Orange (5)
    { a: "#48a88e", b: "#3c8d76", hi: "#6ecfb5", dark: "#276855", edge: "#1e5141" }, // Teal (6)
    { a: "#8d95a1", b: "#747c87", hi: "#aeb6c2", dark: "#4a515a", edge: "#373c43" }, // Gray (7)
  ];

  const NEUTRAL_LAND = {
    a: "#9fa07f",
    b: "#858d68",
    hi: "#bcb995",
    dark: "#667052",
    edge: "#3f4b34",
  };

  const factions = [
    { name: "PLAYER1", color: COLORS.blue, chat: "CÙNG NHAU CHIẾN THẮNG!" },
    { name: "PLAYER2", color: COLORS.red, chat: "TÔI ĐÃ CHIẾM ĐƯỢC THÀNH PHỐ A" },
    { name: "PLAYER3", color: COLORS.green, chat: "CẦN THĂM DÒ PHÍA BẮC." },
    { name: "PLAYER4", color: COLORS.gold, chat: "TẤN CÔNG KẺ ĐỊCH!" },
    { name: "PLAYER5", color: COLORS.purple, chat: "LIÊN MINH ĐANG TẬP KẾT." },
    { name: "PLAYER6", color: COLORS.pink, chat: "ĐẢO HỒNG SẼ LÀ CỦA TA!" },
    { name: "PLAYER7", color: COLORS.teal, chat: "HẢI QUÂN ĐANG TUẦN TRA." },
    { name: "PLAYER8", color: COLORS.gray, chat: "KẺ ĐỊCH ĐANG ÁP SÁT!" },
  ];

  const megaContinents = [
    { x: 700, y: 700, rx: 420, ry: 340, biome: 2, cols: 5, rows: 4, seed: 10, name: "BẮC BĂNG ĐẠI LỤC", climate: "ice" },
    { x: 1800, y: 750, rx: 460, ry: 380, biome: 6, cols: 6, rows: 5, seed: 40, name: "TRUNG CHÂU ĐẢO", climate: "forest" },
    { x: 3000, y: 700, rx: 500, ry: 400, biome: 1, cols: 7, rows: 5, seed: 80, name: "SA MẠC NAM SA", climate: "desert" },
    { x: 4100, y: 800, rx: 450, ry: 360, biome: 3, cols: 6, rows: 4, seed: 110, name: "HỎA TIÊU THỔ", climate: "volcanic" },

    { x: 650, y: 1900, rx: 440, ry: 380, biome: 5, cols: 5, rows: 4, seed: 150, name: "HỒNG HOA ĐẢO", climate: "rose" },
    { x: 1900, y: 1950, rx: 540, ry: 450, biome: 0, cols: 8, rows: 6, seed: 200, name: "ĐẠI LỤC TRUNG TÂM", climate: "forest" },
    { x: 3100, y: 1900, rx: 480, ry: 400, biome: 4, cols: 6, rows: 5, seed: 250, name: "TỬ VI VƯƠNG QUỐC", climate: "isles" },
    { x: 4200, y: 2000, rx: 420, ry: 350, biome: 7, cols: 5, rows: 4, seed: 300, name: "PHONG NGUYÊN", climate: "mint" },

    { x: 750, y: 3100, rx: 460, ry: 390, biome: 7, cols: 6, rows: 5, seed: 350, name: "LỤC BẢO ĐẢO", climate: "isles" },
    { x: 1950, y: 3150, rx: 520, ry: 420, biome: 1, cols: 7, rows: 5, seed: 400, name: "ĐÔNG ĐẢO HOÀNG SHA", climate: "sand" },
    { x: 3150, y: 3100, rx: 490, ry: 410, biome: 3, cols: 6, rows: 5, seed: 450, name: "NÚI LỬA XÍCH THỔ", climate: "volcanic" },
    { x: 4150, y: 3200, rx: 460, ry: 380, biome: 2, cols: 5, rows: 4, seed: 500, name: "NAM BĂNG TUYẾT SƠN", climate: "ice" },

    { x: 800, y: 4200, rx: 450, ry: 350, biome: 5, cols: 6, rows: 4, seed: 550, name: "SAN HÔ BIỂN NAM", climate: "rose" },
    { x: 2000, y: 4250, rx: 500, ry: 390, biome: 0, cols: 7, rows: 5, seed: 600, name: "MINH TÂM ĐẢO", climate: "forest" },
    { x: 3200, y: 4200, rx: 480, ry: 370, biome: 6, cols: 6, rows: 4, seed: 650, name: "VŨ LÂM ĐẠI LỤC", climate: "pine" },
    { x: 4200, y: 4250, rx: 430, ry: 340, biome: 4, cols: 5, rows: 4, seed: 700, name: "HUYỀN VŨ ĐẢO", climate: "violet" },
  ];

  function continentRegions() {
    return [];
    const out = [];
    megaContinents.forEach((c, ci) => {
      for (let y = 0; y < c.rows; y++) {
        for (let x = 0; x < c.cols; x++) {
          const nx = c.cols <= 1 ? 0 : x / (c.cols - 1) * 2 - 1;
          const ny = c.rows <= 1 ? 0 : y / (c.rows - 1) * 2 - 1;
          const edge = nx * nx + ny * ny * 0.9;
          if (edge > 1.32) continue;
          const seed = c.seed + y * 17 + x * 29;
          const wobX = (hash(seed * 3) - 0.5) * 70;
          const wobY = (hash(seed * 5) - 0.5) * 58;
          out.push({
            x: c.x + nx * c.rx * 0.72 + wobX,
            y: c.y + ny * c.ry * 0.72 + wobY,
            rx: 116 + hash(seed * 7) * 58,
            ry: 86 + hash(seed * 11) * 48,
            biome: (c.biome + Math.floor(hash(seed * 13) * 3)) % BIOMES.length,
            seed,
          });
        }
      }
    });
    return out;
  }

  function continentTowns(startId) {
    const out = [];
    let id = startId;
    megaContinents.forEach((c, ci) => {
      const townCols = c.cols + 1;
      const townRows = c.rows;
      for (let y = 0; y < townRows; y++) {
        for (let x = 0; x < townCols; x++) {
          const nx = townCols <= 1 ? 0 : x / (townCols - 1) * 2 - 1;
          const ny = townRows <= 1 ? 0 : y / (townRows - 1) * 2 - 1;
          const edge = nx * nx + ny * ny * 0.82;
          if (edge > 1.02) continue;
          const seed = c.seed + 400 + y * 31 + x * 37;
          const lvl = 1 + Math.floor(hash(seed * 3) * 5);
          out.push({
            id: id++,
            x: Math.round(c.x + nx * c.rx * 0.68 + (hash(seed * 5) - 0.5) * 58),
            y: Math.round(c.y + ny * c.ry * 0.66 + (hash(seed * 7) - 0.5) * 54),
            lvl,
            owner: hash(seed * 11) < 0.28 ? 0 : 1 + Math.floor(hash(seed * 13) * (factions.length - 1)),
            troops: 28 + lvl * 18 + Math.floor(hash(seed * 17) * 70),
            continent: c.name,
          });
        }
      }
    });
    return out;
  }

  function worldRoutes() {
    const hubs = megaContinents.map(c => [c.x, c.y]);
    const out = [];
    for (let i = 0; i < hubs.length - 1; i++) {
      const a = hubs[i];
      const b = hubs[i + 1];
      out.push([a[0], a[1], (a[0] + b[0]) / 2 + 80, (a[1] + b[1]) / 2, b[0], b[1]]);
    }
    out.push([640, 430, 1268, 650, 1330, 1160]);
    out.push([710, 1000, 270, 1370, 840, 1690]);
    out.push([840, 1690, 1330, 1160, 1270, 650]);
    return out;
  }

  const allGenerated = generateWorldTerritories();
  const regions = allGenerated.filter(t => !t.isIslet);
  const islets = allGenerated.filter(t => t.isIslet);

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

  const buttons = [
    { id: "army", x: 34, y: H - 840, w: 116, h: 98, label: "QUÂN ĐỘI" },
    { id: "build", x: 34, y: H - 710, w: 116, h: 98, label: "XÂY DỰNG" },
    { id: "research", x: 34, y: H - 580, w: 116, h: 98, label: "NGHIÊN CỨU" },
    { id: "treasure", x: W - 118 - 34, y: 92, w: 118, h: 92, label: "BẢO VẬT" },
    { id: "ally", x: W - 118 - 34, y: 196, w: 118, h: 92, label: "LIÊN MINH" },
    { id: "map", x: W - 118 - 34, y: 300, w: 118, h: 92, label: "BẢN ĐỒ" },
    { id: "event", x: W - 118 - 34, y: 404, w: 118, h: 92, label: "SỰ KIỆN" },
    { id: "zoomIn", x: W - 54 - 34, y: H - 460, w: 54, h: 54, label: "+" },
    { id: "zoomOut", x: W - 54 - 34, y: H - 390, w: 54, h: 54, label: "-" },
  ];

  const state = {
    selected: null,
    hover: null,
    tick: 0,
    level: 25,
    xp: 68,
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
    resources: { gold: 1250, wood: 830, stone: 670, food: 920, iron: 260, coal: 120, sulfur: 80, gems: 420 },
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
    regionOwnerAllianceTags: {} as Record<number, string>,
    regionOwnerAllianceEmblems: {} as Record<number, string>,
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
    newbieShieldUntil: (() => {
      const stored = localStorage.getItem("island_empire_newbie_shield_until");
      if (stored) return Number(stored);
      const initial = Date.now() + 24 * 3600 * 1000;
      localStorage.setItem("island_empire_newbie_shield_until", String(initial));
      return initial;
    })(),
    settlerTravel: { active: false, targetRegionId: -1, originTownId: null, originX: 0, originY: 0 },
    pendingBackendClearingStarts: [],
    pendingBackendClaims: [],
    pendingBackendConquests: [],
    localPlayerId: null,
    localPlayerName: "BẠN",
    research: { sword: 0, stirrups: 0, cannon: 0, travel: 0 },
    events: { goldRush: 0, harvestRush: 0 },
  };

  const organicPathCache = new Map();
  const sharedEdgeCache = new Map<string, Array<[number, number]>>();
  const sharedRegionPolygonCache = new Map<string, Array<[number, number]>>();
  const visualBiomeCache = new Map<string, number>();
  const mainlandCoastalRegionIds = new Set<number>();

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
    const regionId = i < regions.length ? i : (town.id - 1);
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
    state.regionOwnerAllianceTags = {};
    state.regionOwnerAllianceEmblems = {};
    state.hasAuthoritativeOwnership = false;
    state.regionClearing = [];
    state.regionInProgress = -1;
    state.newbieMode = true;
    state.newbiePhase = "select_land";
    state.newbieSelectedRegion = null;
    state.settlerTravel = { active: false, targetRegionId: -1, originTownId: null, originX: 0, originY: 0 };
    state.pendingBackendClearingStarts = [];
    state.pendingBackendClaims = [];
    state.toast = "TÂN THỦ: CHỌN MẢNH ĐẤT HOANG ĐỂ XÂY THÀNH";
  }

  // Biome resource yield rates per second (per owned territory)
  const BIOME_YIELDS = [
    { gold: 0.003, wood: 0.010, stone: 0.006, food: 0.030, iron: 0.0015, coal: 0.0008, sulfur: 0.0004, gems: 0.0002 },
    { gold: 0.018, wood: 0.001, stone: 0.012, food: 0.003, iron: 0.0030, coal: 0.0010, sulfur: 0.0010, gems: 0.0040 },
    { gold: 0.002, wood: 0.003, stone: 0.020, food: 0.003, iron: 0.0160, coal: 0.0080, sulfur: 0.0010, gems: 0.0020 },
    { gold: 0.004, wood: 0.001, stone: 0.018, food: 0.001, iron: 0.0200, coal: 0.0180, sulfur: 0.0140, gems: 0.0020 },
    { gold: 0.005, wood: 0.003, stone: 0.010, food: 0.003, iron: 0.0050, coal: 0.0010, sulfur: 0.0020, gems: 0.0140 },
    { gold: 0.010, wood: 0.008, stone: 0.004, food: 0.022, iron: 0.0020, coal: 0.0010, sulfur: 0.0005, gems: 0.0020 },
    { gold: 0.002, wood: 0.026, stone: 0.012, food: 0.010, iron: 0.0040, coal: 0.0030, sulfur: 0.0005, gems: 0.0005 },
    { gold: 0.003, wood: 0.016, stone: 0.003, food: 0.018, iron: 0.0020, coal: 0.0060, sulfur: 0.0040, gems: 0.0010 },
  ];

  function territoryAreaFactor(regionOrId: any) {
    const r = typeof regionOrId === "number" ? landById(regionOrId) : regionOrId;
    if (!r) return 1;
    const rx = r.rx || r.r || 100;
    const ry = r.ry || (r.r || 100) * 0.78;
    return Math.max(0.35, Math.min(6, (rx * ry) / 10000));
  }

  function territoryYield(regionId: number) {
    const r = landById(regionId);
    const y = BIOME_YIELDS[r?.biome ?? 0] || BIOME_YIELDS[0];
    const areaFactor = territoryAreaFactor(r);
    const isIslet = Boolean(r?.isIslet);
    const mult = {
      gold: isIslet ? 1.25 : 1,
      wood: isIslet ? 0.3 : 1,
      stone: isIslet ? 0.5 : 1,
      food: isIslet ? 0.45 : 1,
      iron: isIslet ? 0.55 : 1,
      coal: isIslet ? 0.35 : 1,
      sulfur: isIslet ? 1.25 : 1,
      gems: isIslet ? 2.8 : 1,
    };
    return {
      gold: y.gold * areaFactor * mult.gold,
      wood: y.wood * areaFactor * mult.wood,
      stone: y.stone * areaFactor * mult.stone,
      food: y.food * areaFactor * mult.food,
      iron: y.iron * areaFactor * mult.iron,
      coal: y.coal * areaFactor * mult.coal,
      sulfur: y.sulfur * areaFactor * mult.sulfur,
      gems: y.gems * areaFactor * mult.gems,
    };
  }

  function territoryStartingPopulation(regionId: number, ownerCode = 1) {
    const r = landById(regionId);
    if (!r) return ownerCode === 1 ? 32 : 64;
    const biomePopMult = [1.25, 0.65, 0.55, 0.45, 0.8, 1.35, 0.95, 0.75][r.biome ?? 0] || 1;
    const isletPenalty = r?.isIslet ? 0.55 : 1;
    const base = ownerCode === 1 ? 24 : 48;
    return Math.round(base + territoryAreaFactor(r) * 28 * biomePopMult * isletPenalty);
  }

  function clearingDuration(rOrId?: any) {
    const r = typeof rOrId === "number" ? landById(rOrId) : rOrId;
    if (!r) return 45;
    const rx = r.rx || r.r || 100;
    const ry = r.ry || (r.r || 100) * 0.78;
    const biomeMult = [1.0, 1.25, 1.55, 1.75, 1.45, 1.1, 1.25, 1.65][r.biome ?? 0] || 1;
    return Math.max(8, Math.min(180, Math.round((rx * ry / 650) * biomeMult)));
  }

  function defaultBuildings() {
    return { barracks: 0, lumberCamp: 0, quarry: 0, goldMine: 0, gemCutter: 0, fort: 0, siegeWorkshop: 0, warehouse: 0 };
  }

  function defaultStorage() {
    return { gold: 0, wood: 0, stone: 0, food: 0, iron: 0, coal: 0, sulfur: 0, gems: 0 };
  }

  const SETTLER_POPULATION_COST = 4;
  function unitExtraCosts() {
    return {
      infantry: { food: gameConfig.infantryCostFood },
      cavalry: { food: gameConfig.cavalryCostFood, iron: gameConfig.cavalryCostIron },
      artillery: { iron: gameConfig.artilleryCostIron, sulfur: gameConfig.artilleryCostSulfur },
    };
  }

  function normalizeTown(town: any) {
    if (!town) return town;
    town.buildings = { ...defaultBuildings(), ...(town.buildings || {}) };
    town.storage = { ...defaultStorage(), ...(town.storage || {}) };
    town.population = Math.max(0, Number(town.population ?? 32) || 0);
    town.infantryCount = Math.max(0, Math.floor(Number(town.infantryCount ?? town.troops ?? 0) || 0));
    town.cavalryCount = Math.max(0, Math.floor(Number(town.cavalryCount ?? 0) || 0));
    town.artilleryCount = Math.max(0, Math.floor(Number(town.artilleryCount ?? 0) || 0));
    return town;
  }

  function townPopulationCap(town: any) {
    normalizeTown(town);
    const lvl = town?.lvl || 1;
    const fort = town?.buildings?.fort || 0;
    const warehouse = town?.buildings?.warehouse || 0;
    const regionId = town ? regionAtCoords(town.x, town.y) : -1;
    const areaBonus = regionId >= 0 ? Math.round(territoryAreaFactor(regionId) * 18) : 0;
    return 64 + lvl * 36 + fort * 24 + warehouse * 8 + areaBonus;
  }

  function townPopulationGrowthPerSecond(town: any) {
    normalizeTown(town);
    const lvl = town?.lvl || 1;
    const fort = town?.buildings?.fort || 0;
    return (1 / 120) + Math.max(0, lvl - 1) * (1 / 160) + fort * (1 / 240);
  }

  function troopPopulationCost(troopValue: number) {
    return Math.max(1, Math.ceil((troopValue || 0) / 5));
  }

  function maxDefendingTroops(town: any) {
    normalizeTown(town);
    return Math.max(10, Math.floor((town.population || 0) * 10));
  }

  function refundSettlerPopulationForRegion(regionId: number) {
    const travel = state.settlerTravel;
    if (!travel || travel.targetRegionId !== regionId || !travel.populationCost || travel.originTownId == null) return;
    const originTown = towns.find((town) => town.id === travel.originTownId && town.owner === 0);
    if (!originTown) return;
    normalizeTown(originTown);
    originTown.population = Math.min(townPopulationCap(originTown), originTown.population + travel.populationCost);
  }

  function refundBuildCostForRegion(regionId: number) {
    const travel = state.settlerTravel;
    if (!travel || travel.targetRegionId !== regionId) return;
    refundResources(travel.resourceCost);
  }

  function beginSettlerReturn(regionId: number, reason = "ĐỘI THỢ ĐÃ HỦY XÂY THÀNH VÀ ĐANG QUAY VỀ") {
    const travel = state.settlerTravel;
    if (!travel || travel.targetRegionId !== regionId) {
      toast(reason);
      return;
    }
    const originTown = travel.originTownId == null ? null : towns.find((town) => town.id === travel.originTownId);
    const originRegionId = originTown ? regionAtCoords(originTown.x, originTown.y) : -1;
    const canReturnToTown = originTown && originTown.owner === 0 && originRegionId >= 0 && derivedRegionOwnership(originRegionId) === 1;
    travel.returning = true;
    travel.returnProgress = 0;
    travel.active = true;
    state.regionInProgress = -1;
    state.regionClearing[regionId] = 0;
    delete state.activeClearingTimings[regionId];
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
      const originTown = towns.find((town) => town.id === travel.originTownId && town.owner === 0);
      if (originTown) {
        normalizeTown(originTown);
        originTown.population = Math.min(townPopulationCap(originTown), originTown.population + travel.populationCost);
      }
    }
    state.settlerTravel = { active: false, targetRegionId: -1, originTownId: null, originX: 0, originY: 0 };
    toast("ĐỘI THỢ ĐÃ QUAY VỀ THÀNH XUẤT PHÁT");
  }

  function cancelClearingIfOriginLost() {
    const travel = state.settlerTravel;
    if (!travel?.active || travel.returning || travel.targetRegionId < 0 || travel.originTownId == null) return;
    const originTown = towns.find((town) => town.id === travel.originTownId);
    const originRegionId = originTown ? regionAtCoords(originTown.x, originTown.y) : -1;
    if (!originTown || originTown.owner !== 0 || originRegionId < 0 || derivedRegionOwnership(originRegionId) !== 1) {
      refundBuildCostForRegion(travel.targetRegionId);
      beginSettlerReturn(travel.targetRegionId, "THÀNH XUẤT PHÁT BỊ CHIẾM, XÂY THÀNH ĐÃ HỦY");
    }
  }

	  function cancelClearingIfTargetTaken(regionIds: number[]) {
	    const travel = state.settlerTravel;
	    if (!travel?.active || travel.returning || travel.targetRegionId < 0) return;
	    if (!regionIds.includes(travel.targetRegionId)) return;
	    const ownerCode = derivedRegionOwnership(travel.targetRegionId);
	    if (ownerCode === 1) {
	      state.regionInProgress = -1;
	      state.regionClearing[travel.targetRegionId] = 0;
	      delete state.activeClearingTimings[travel.targetRegionId];
	      state.settlerTravel = { active: false, targetRegionId: -1, originTownId: null, originX: 0, originY: 0 };
	      toast("XÂY THÀNH HOÀN TẤT, SERVER ĐÃ XÁC NHẬN");
	      return;
	    }
	    if (ownerCode !== 0) {
	      refundBuildCostForRegion(travel.targetRegionId);
	      beginSettlerReturn(travel.targetRegionId, "LÃNH THỔ ĐANG XÂY ĐÃ BỊ CHIẾM, ĐỘI THỢ QUAY VỀ");
	    }
	  }

  function enforceTownTroopLimit(town: any) {
    normalizeTown(town);
    const maxTroops = maxDefendingTroops(town);
    if ((town.troops || 0) <= maxTroops) return 0;
    const overflowPower = Math.floor((town.troops || 0) - maxTroops);
    town.troops = maxTroops;
    const infantryReturn = Math.min(town.infantryCount || 0, Math.ceil(overflowPower / Math.max(1, gameConfig.infantryTroopsValue || 18)));
    town.infantryCount = Math.max(0, (town.infantryCount || 0) - infantryReturn);
    return overflowPower;
  }

  function territoryBuildCost(regionId: number) {
    const r = landById(regionId);
    if (!r) return { gold: 0, wood: 0, stone: 0, food: 0, iron: 0, gems: 0 };
    const rx = r.rx || r.r || 100;
    const ry = r.ry || (r.r || 100) * 0.78;
    const areaFactor = Math.max(0.85, (rx * ry) / 10000);
    const y = territoryYield(regionId);
    return {
      gold: Math.round(180 + areaFactor * 32 + y.gold * 92 + y.gems * 70),
      wood: Math.round(130 + areaFactor * 28 + y.wood * 66),
      stone: Math.round(125 + areaFactor * 34 + y.stone * 76 + y.iron * 28),
      food: Math.round(80 + areaFactor * 18 + y.food * 42),
      iron: Math.round(20 + y.iron * 95 + y.sulfur * 30),
      gems: Math.round(Math.max(0, y.gems - 0.28) * 22),
    };
  }

  function resourceCostText(cost: Record<string, number>) {
    const labels = { gold: "VÀNG", wood: "GỖ", stone: "ĐÁ", food: "LƯƠNG", iron: "SẮT", sulfur: "LƯU HUỲNH", gems: "KIM CƯƠNG" };
    return Object.entries(cost)
      .filter(([, amount]) => Math.floor(amount || 0) > 0)
      .map(([key, amount]) => `${Math.floor(amount)} ${labels[key] || key.toUpperCase()}`)
      .join(" · ");
  }

  function refundResources(cost?: Record<string, number>) {
    if (!cost) return;
    Object.entries(cost).forEach(([key, amount]) => {
      if (!amount || amount <= 0) return;
      state.resources[key] = (state.resources[key] || 0) + amount;
    });
  }

  function storageCapacity(town: any) {
    const warehouse = town?.buildings?.warehouse || 0;
    const fort = town?.buildings?.fort || 0;
    const regionId = town ? regionAtCoords(town.x, town.y) : -1;
    const areaBonus = regionId >= 0 ? Math.round(territoryAreaFactor(regionId) * 90) : 0;
    return 250 + warehouse * 650 + fort * 180 + (town?.lvl || 1) * 120 + areaBonus;
  }

  function addTownStorage(town: any, gained: Record<string, number>) {
    normalizeTown(town);
    const cap = storageCapacity(town);
    const keys = ["gold", "wood", "stone", "food", "iron", "coal", "sulfur", "gems"];
    keys.forEach((key) => {
      const amount = gained[key] || 0;
      if (amount <= 0) return;
      town.storage[key] = Math.min(cap, (town.storage[key] || 0) + amount);
    });
  }

  function lootTownStorage(town: any) {
    normalizeTown(town);
    const loot = defaultStorage();
    let total = 0;
    Object.keys(loot).forEach((key) => {
      const amount = Math.floor((town.storage?.[key] || 0) * 0.85);
      if (amount <= 0) return;
      loot[key] = amount;
      state.resources[key] = (state.resources[key] || 0) + amount;
      town.storage[key] = 0;
      total += amount;
    });
    return total;
  }

  function territorySpecialResources(regionId: number) {
    const r = landById(regionId);
    if (!r) return [];
    const area = (r.rx || r.r || 100) * (r.ry || (r.r || 100) * 0.78);
    const specials: string[] = [];
    if ((r.biome === 0 || r.biome === 5) && area >= 18000 && regionId % 3 !== 0) specials.push("Bãi ngựa");
    if (r.isIslet || regionId % 5 === 0 || regionId % 7 === 0) specials.push("Bến tàu tự nhiên");
    if ((r.biome === 2 || r.biome === 3 || r.biome === 4 || r.biome === 6) && regionId % 2 === 0) specials.push("Mỏ sắt");
    if ((r.biome === 1 || r.biome === 2 || r.biome === 3 || r.biome === 6) && area >= 16000) specials.push("Mỏ đá");
    if ((r.biome === 1 || r.biome === 5 || r.biome === 3) && regionId % 4 === 1) specials.push("Mạch vàng");
    if ((r.biome === 1 || r.biome === 4 || r.isIslet) && regionId % 5 === 2) specials.push("Mỏ đá quý");
    if ((r.biome === 2 || r.biome === 3 || r.biome === 7) && regionId % 3 === 0) specials.push("Vỉa than");
    if (r.biome === 3 || (r.biome === 7 && regionId % 6 === 0)) specials.push("Mỏ lưu huỳnh");
    return specials;
  }

  function townHasSpecial(town: any, special: string) {
    const regionId = town ? regionAtCoords(town.x, town.y) : -1;
    return regionId >= 0 && territorySpecialResources(regionId).includes(special);
  }

  function timingProgress(startedAt: any, endsAt: any) {
    const start = new Date(startedAt).getTime();
    const end = new Date(endsAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
    return Math.max(0, Math.min(1, (Date.now() - start) / (end - start)));
  }

  function timingElapsedSeconds(startedAt: any, endsAt: any) {
    const start = new Date(startedAt).getTime();
    const end = new Date(endsAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return { elapsed: 0, duration: 1 };
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
    if (!lands.length) return { minX: 0, minY: 0, maxX: 1600, maxY: 1400, cx: 800, cy: 700 };
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
    cachedBounds = { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
    return cachedBounds;
  }

  function centerCameraOnWorldContent() {
    const b = worldContentBounds();
    state.zoom = FIXED_FAR_ZOOM;
    state.targetZoom = FIXED_FAR_ZOOM;
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
      return r.x + rx >= left && r.x - rx <= right && r.y + ry >= top && r.y - ry <= bottom;
    });
  }

  function loadCamera() {
    try {
      const raw = localStorage.getItem(CAMERA_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      state.zoom = FIXED_FAR_ZOOM;
      state.targetZoom = FIXED_FAR_ZOOM;
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
      localStorage.setItem(CAMERA_KEY, JSON.stringify({
        zoom: state.zoom,
        targetZoom: state.targetZoom,
        panX: state.panX,
        panY: state.panY,
        selected: state.selected,
        selectedRegion: state.selectedRegion,
      }));
    } catch (e) {}
  }

  function pxRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function hash(n) {
    const x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
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

  function visualBiomeIndex(r: any, idx: number, isIslet = false) {
    const cacheKey = `${isIslet ? "i" : "r"}_${r.id ?? idx}`;
    const cached = visualBiomeCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const continent = nearestContinent(r);
    const base = Math.max(0, Math.min(BIOMES.length - 1, Math.round(r.biome || 0)));
    const palettes = [
      [0, 6, 7, 5],
      [1, 7, 5, 0],
      [2, 7, 6, 3],
      [3, 1, 5, 7],
      [4, 0, 7, 6],
      [5, 1, 0, 7],
      [6, 0, 7, 4],
      [7, 0, 6, 1],
    ];
    const palette = palettes[base] || palettes[0];
    const continentSeed = (continent?.seed || 0) * 97;
    const roll = hash((r.seed || idx + 1) * 53 + continentSeed);
    let picked = palette[0];
    if (!isIslet && roll > 0.78 && roll <= 0.88) picked = palette[1];
    else if (!isIslet && roll > 0.88 && roll <= 0.96) picked = palette[2];
    else if (!isIslet && roll > 0.96) picked = palette[3];

    visualBiomeCache.set(cacheKey, picked);
    return picked;
  }

  function visualBiome(r: any, idx: number, isIslet = false) {
    return BIOMES[visualBiomeIndex(r, idx, isIslet)] || BIOMES[0];
  }

  function text(str, x, y, size, color, align) {
    ctx.font = `700 ${size}px "Courier New", monospace`;
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

    ctx.save();
    ctx.globalAlpha = 0.9;
    for (let y = 0; y < H; y += 18) {
      for (let x = 0; x < W; x += 18) {
        const n = hash(x * 13 + y * 29 + 17);
        if (n > 0.86) {
          pxRect(x + (n > 0.94 ? 6 : 0), y + (n > 0.91 ? 4 : 0), n > 0.94 ? 8 : 4, 2, "rgba(43, 132, 168, 0.22)");
        } else if (n < 0.055) {
          pxRect(x + 4, y + 8, 3, 3, "rgba(2, 48, 72, 0.42)");
        }
      }
    }
    ctx.restore();
  }

  function drawWorldOceanTexture() {
    const vp = getWorldViewport();
    const startY = Math.floor(vp.minY / 64) * 64;
    const endY = Math.ceil(vp.maxY / 64) * 64;
    const startX = Math.floor(vp.minX / 80) * 80;
    const endX = Math.ceil(vp.maxX / 80) * 80;

    for (let y = startY; y < endY; y += 64) {
      for (let x = startX; x < endX; x += 80) {
        const waveCycle = state.tick * 1.2 + hash(x * 37 + y * 43) * Math.PI * 2;
        const fade = Math.max(0, Math.sin(waveCycle)); // 0 to 1
        if (fade > 0.08) {
          const waveOffset = Math.sin((x * 0.015) + state.tick * 1.5) * 5;
          const py = y + waveOffset;
          const waveType = hash(x * 9 + y * 17);
          
          if (waveType > 0.65) {
            // Major cresting wave
            const alphaBase = 0.65 * fade;
            const alphaCrest = 0.92 * fade;
            const alphaShadow = 0.70 * fade;
            
            const wx = x + (y % 17);
            
            // 1. Deep blue shadow
            pxRect(wx - 2, py + 2, 36, 2, `rgba(2, 32, 54, ${alphaShadow})`);
            // 2. Light blue wave body
            pxRect(wx, py, 32, 2, `rgba(14, 165, 233, ${alphaBase})`);
            // 3. Bright white crest highlight
            pxRect(wx + 8, py - 1.5, 16, 1.5, `rgba(255, 255, 255, ${alphaCrest})`);
          } else if (waveType > 0.28) {
            // Minor wave ripple
            const alphaBase = 0.45 * fade;
            const alphaShadow = 0.50 * fade;
            const wx = x + (y % 11);
            
            // Ripple shadow
            pxRect(wx - 1, py + 1.5, 18, 1.5, `rgba(2, 32, 54, ${alphaShadow})`);
            // Ripple body
            pxRect(wx, py, 16, 1.5, `rgba(56, 189, 248, ${alphaBase})`);
          }
        }
      }
    }
  }

  function drawCompassRose(cx: number, cy: number) {
    ctx.save();
    // Base shadow
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.arc(cx + 2, cy + 2, 28, 0, Math.PI * 2); ctx.fill();

    // Outer gold ring
    ctx.strokeStyle = "#c29b4f";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.stroke();
    
    ctx.strokeStyle = "#8b6c37";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.stroke();

    // Draw the 8 points
    const drawPoint = (angle: number, length: number, width: number, isMajor: boolean) => {
      ctx.fillStyle = isMajor ? "#c29b4f" : "#8b6c37";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const radLeft = angle - Math.PI / 2;
      ctx.lineTo(cx + Math.cos(radLeft) * width, cy + Math.sin(radLeft) * width);
      ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
      ctx.closePath();
      ctx.fill();

      // Shadow side
      ctx.fillStyle = isMajor ? "#614e26" : "#45381a";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const radRight = angle + Math.PI / 2;
      ctx.lineTo(cx + Math.cos(radRight) * width, cy + Math.sin(radRight) * width);
      ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
      ctx.closePath();
      ctx.fill();
    };

    // Major points (N, E, S, W)
    for (let i = 0; i < 4; i++) {
      drawPoint(i * Math.PI / 2, 38, 5, true);
    }
    // Minor points (NE, SE, SW, NW)
    for (let i = 0; i < 4; i++) {
      drawPoint(i * Math.PI / 2 + Math.PI / 4, 25, 3.5, false);
    }

    // Inner gold core
    ctx.fillStyle = "#fdfbf7";
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c29b4f";
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();

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
      const cx = ((seed * 220 + state.tick * 65 * speed) % (W + size * 4)) - size * 2;
      const cy = (seed * 137) % (H - 140) + 60;

      // Overlapping circle offsets to make it look like a fluffy cluster
      const bubbles = [
        { dx: 0, dy: 0, r: size },
        { dx: -size * 0.5, dy: size * 0.1, r: size * 0.65 },
        { dx: size * 0.5, dy: size * 0.1, r: size * 0.65 },
        { dx: -size * 0.25, dy: -size * 0.25, r: size * 0.75 },
        { dx: size * 0.25, dy: -size * 0.25, r: size * 0.75 }
      ];

      // 1. Draw soft cloud shadow on the map (very clear contrast shadow)
      ctx.fillStyle = "rgba(4, 15, 26, 0.35)";
      bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(cx + b.dx + 25, cy + b.dy + 30, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw fluffy cloud body (85% opaque white)
      ctx.fillStyle = "rgba(245, 248, 252, 0.85)";
      bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(cx + b.dx, cy + b.dy, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // 3. Draw highlighted core
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(cx + b.dx - 4, cy + b.dy - 4, b.r * 0.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Draw soft outline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 1.8;
      bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(cx + b.dx, cy + b.dy, b.r, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
    ctx.restore();
  }

  function hexCellPath(cx, cy, radius) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = Math.round((cx + radius * Math.cos(angle)) / 4) * 4;
      const py = Math.round((cy + radius * Math.sin(angle) * 0.82) / 4) * 4;
      pts.push([px, py]);
    }
    return pts;
  }

  function organicPath(cx, cy, rx, ry, seed) {
    const pts: Array<[number, number]> = [];
    const count = 12; // 12 points for jagged, rocky edges
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      const radVar = 0.72 + hash(seed * 97 + i * 13) * 0.48; // High variance
      const x = Math.round((cx + Math.cos(a) * rx * radVar) / 4) * 4;
      const y = Math.round((cy + Math.sin(a) * ry * radVar * 0.78) / 4) * 4;
      pts.push([x, y]);
    }
    return pts;
  }

  function getOrganicPath(cx, cy, rx, ry, seed, key) {
    const cacheKey = `${key}_${Math.round(cx)}_${Math.round(cy)}_${Math.round(rx)}_${Math.round(ry)}`;
    let pts = organicPathCache.get(cacheKey);
    if (!pts) {
      pts = organicPath(cx, cy, rx, ry, seed);
      organicPathCache.set(cacheKey, pts);
    }
    return pts;
  }

  // --- SHARED EDGE MESH ALGORITHM (NO OVERLAPPING, ORGANIC CURVED SHARED BORDERS) ---

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

      // Organic smooth sine wave displacement perpendicular to boundary (no straight lines!)
      const wave = Math.sin((i / numPts) * Math.PI) * ((hash(seed + i * 23) - 0.5) * 16);
      const finalX = Math.round((px + (dx / dist) * wave) / 4) * 4;
      const finalY = Math.round((py + (dy / dist) * wave) / 4) * 4;
      pts.push([finalX, finalY]);
    }

    sharedEdgeCache.set(edgeKey, pts);
    return pts;
  }

  function getSharedRegionPolygon(r: any, idx: number, isIslet: boolean): Array<[number, number]> {
    if (isIslet) {
      return getOrganicPath(r.x, r.y, (r.rx || r.r) * 0.82, (r.ry || r.r * 0.78) * 0.82, r.seed || idx + 1, `islet_${idx}_poly`);
    }

    const polyKey = `shared_poly_${idx}_${Math.round(r.x)}_${Math.round(r.y)}`;
    let cached = sharedRegionPolygonCache.get(polyKey);
    if (cached) return cached;

    // Find neighboring regions within 500px radius to align borders
    const allRegions = regions || [];
    const neighbors: Array<{ r2: any; angle: number; dist: number }> = [];

    allRegions.forEach((r2: any) => {
      if (r2.id === r.id) return;
      const dist = Math.hypot(r2.x - r.x, r2.y - r.y);
      if (dist < 500) {
        const angle = Math.atan2(r2.y - r.y, r2.x - r.x);
        neighbors.push({ r2, angle, dist });
      }
    });

    const seed = r.seed || idx * 101 + 17;
    const sizeFactor = 0.99 + hash(seed * 31) * 0.20;
    const baseRx = (r.rx || 230) * sizeFactor;

    const numCorners = 7 + Math.floor(hash(seed * 17) * 4);
    const cornerAngles: number[] = [];

    for (let c = 0; c < numCorners; c++) {
      const baseA = (c / numCorners) * TAU;
      const jiggle = (hash(seed * 23 + c * 13) - 0.5) * (TAU / numCorners) * 0.48;
      cornerAngles.push(baseA + jiggle);
    }
    cornerAngles.sort((a, b) => a - b);

    const cornerPts: Array<{ x: number; y: number; angle: number }> = [];
    cornerAngles.forEach((a, i) => {
      const cornerRadiusMult = 0.85 + hash(seed * 41 + i * 19) * 0.28;
      let maxDistInAngle = baseRx * cornerRadiusMult;
      
      let hasNeighbor = false;

      for (let j = 0; j < neighbors.length; j++) {
        const nbr = neighbors[j];
        let diff = Math.abs(a - nbr.angle);
        if (diff > Math.PI) diff = TAU - diff;

        if (diff < Math.PI / 2.75) {
          const allowedDist = (nbr.dist * 0.58) / Math.max(0.5, Math.cos(diff));
          if (allowedDist < maxDistInAngle) {
            maxDistInAngle = allowedDist;
            hasNeighbor = true;
          }
        }
      }

      // Ocean-facing edges: Add rugged, jagged coastline noise (no neighbor to align with!)
      if (!hasNeighbor) {
        const oceanNoise = 1.0 + Math.sin(a * 5.0 + seed) * 0.10 + Math.cos(a * 11.0 - seed * 0.5) * 0.06;
        maxDistInAngle = baseRx * cornerRadiusMult * oceanNoise;
      }

      const px = Math.round((r.x + Math.cos(a) * maxDistInAngle) / 4) * 4;
      const py = Math.round((r.y + Math.sin(a) * maxDistInAngle * 0.78) / 4) * 4;
      cornerPts.push({ x: px, y: py, angle: a });
    });

    const basePts: Array<[number, number]> = cornerPts.map((p) => [p.x, p.y]);
    const angularPts: Array<[number, number]> = [];
    const nLen = basePts.length;
    for (let i = 0; i < nLen; i++) {
      const p0 = basePts[i];
      const p1 = basePts[(i + 1) % nLen];
      const midSeed = seed * 101 + i * 37;
      const mx = (p0[0] + p1[0]) / 2;
      const my = (p0[1] + p1[1]) / 2;
      const ex = p1[0] - p0[0];
      const ey = p1[1] - p0[1];
      const len = Math.hypot(ex, ey) || 1;
      const notch = (hash(midSeed) - 0.5) * Math.min(14, len * 0.07);
      const mid: [number, number] = [
        Math.round((mx + (-ey / len) * notch) / 2) * 2,
        Math.round((my + (ex / len) * notch) / 2) * 2,
      ];
      angularPts.push(p0);
      if (len > 118 && hash(midSeed + 9) > 0.62) angularPts.push(mid);
    }

    const beveledPts: Array<[number, number]> = [];
    const aLen = angularPts.length;
    for (let i = 0; i < aLen; i++) {
      const prev = angularPts[(i - 1 + aLen) % aLen];
      const cur = angularPts[i];
      const next = angularPts[(i + 1) % aLen];
      const prevLen = Math.hypot(prev[0] - cur[0], prev[1] - cur[1]);
      const nextLen = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
      const cut = Math.min(14, prevLen * 0.12, nextLen * 0.12);
      if (cut >= 4) {
        beveledPts.push([
          Math.round((cur[0] + ((prev[0] - cur[0]) / (prevLen || 1)) * cut) / 2) * 2,
          Math.round((cur[1] + ((prev[1] - cur[1]) / (prevLen || 1)) * cut) / 2) * 2,
        ]);
        beveledPts.push([
          Math.round((cur[0] + ((next[0] - cur[0]) / (nextLen || 1)) * cut) / 2) * 2,
          Math.round((cur[1] + ((next[1] - cur[1]) / (nextLen || 1)) * cut) / 2) * 2,
        ]);
      } else {
        beveledPts.push(cur);
      }
    }

    sharedRegionPolygonCache.set(polyKey, beveledPts);
    return beveledPts;
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

  function strokePath(points, strokeStyle, lineWidth) {
    if (!points || points.length === 0) return;
    ctx.beginPath();
    ctx.lineJoin = "miter";
    ctx.miterLimit = 2.6;
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

  function drawStrategyContinentLayer(visibleRegions: Array<[any, number]>, visibleIslets: Array<[any, number]>) {
    const makeOffset = (r: any, id: number, isIslet: boolean, amount: number, dx = 0, dy = 0) => {
      const land = getSharedRegionPolygon(r, id, isIslet);
      return land.map(([px, py]) => {
        const vx = px - r.x;
        const vy = py - r.y;
        const dist = Math.hypot(vx, vy) || 1;
        return [
          Math.round(r.x + (vx / dist) * (dist + amount) + dx),
          Math.round(r.y + (vy / dist) * (dist + amount * 0.78) + dy),
        ] as [number, number];
      });
    };

    const drawContinentPass = (lands: Array<[any, number]>, amount: number, dx: number, dy: number, color: string) => {
      lands.forEach(([r, id]) => fillPath(makeOffset(r, id, false, amount, dx, dy), color));
    };
    const drawBiomePass = (lands: Array<[any, number]>, amount: number, dx: number, dy: number, pick: (biome: any) => string) => {
      lands.forEach(([r, id]) => {
        const biome = visualBiome(r, id, false);
        fillPath(makeOffset(r, id, false, amount, dx, dy), pick(biome));
      });
    };
    const coastalRegions = visibleRegions.filter(([r]) => mainlandCoastalRegionIds.has(r.id));

    // One continuous mainland underlay: draw the same expanded polygons in broad passes.
    // Overlap between neighbors fills gaps, so provinces read as sitting on one land mass.
    drawContinentPass(visibleRegions, 28, 10, 16, "rgba(0, 0, 0, 0.24)");

    drawBiomePass(visibleRegions, 18, 3, 7, (biome) => biome.cliffUpper || "rgba(92, 62, 26, 0.78)");
    drawBiomePass(visibleRegions, 7, 0, 0, (biome) => biome.b || "#879c5d");

    coastalRegions.forEach(([r, id]) => {
      const wavePulse = Math.sin(state.tick * 3.1 + (r.seed || id + 1) * 0.47) * 2.2;
      fillPath(makeOffset(r, id, false, 37 + wavePulse), "rgba(56, 189, 248, 0.30)");
      fillPath(makeOffset(r, id, false, 31 + wavePulse * 0.65), "rgba(255, 255, 255, 0.48)");
    });

    coastalRegions.forEach(([r, id]) => {
      const biome = visualBiome(r, id, false);
      fillPath(makeOffset(r, id, false, 28, 7, 17), "rgba(3, 4, 3, 0.82)");
      fillPath(makeOffset(r, id, false, 23, 5, 13), biome.cliffDeep || "#1f180d");
      fillPath(makeOffset(r, id, false, 17, 3, 9), biome.cliffMid || "#40321b");
      fillPath(makeOffset(r, id, false, 10, 1, 4), biome.cliffUpper || "#6a5730");
      fillPath(makeOffset(r, id, false, 6), biome.beach || "#cfb46a");
    });

    const drawIsletBase = (r: any, id: number) => {
      const biome = visualBiome(r, id, true);
      fillPath(makeOffset(r, id, true, 18, 8, 13), "rgba(0, 0, 0, 0.22)");
      fillPath(makeOffset(r, id, true, 13, 3, 6), biome.cliffDeep || "rgba(30, 20, 9, 0.76)");
      fillPath(makeOffset(r, id, true, 9), biome.beach || "#d9b45f");
      fillPath(makeOffset(r, id, true, 4), biome.b);
    };

    visibleIslets.forEach(([r, id]) => drawIsletBase(r, id));
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
      if (d < 150 && (!nearest || d < nearest.d)) nearest = { owner: t.owner, d };
    });
    return nearest ? nearest.owner : null;
  }

  function drawHill(x, y, scale, _color?: string) {
    drawBush(x, y, (scale || 1) * 0.9);
  }

  function drawBush(x, y, scale) {
    scale = scale || 1;
    pxRect(x - 11 * scale, y + 8 * scale, 22 * scale, 5 * scale, "rgba(0,0,0,0.22)");
    pxRect(x - 11 * scale, y, 9 * scale, 9 * scale, "#1d3d20"); // Deep shadow green
    pxRect(x - 3 * scale, y - 6 * scale, 12 * scale, 12 * scale, "#27592a"); // Mid green
    pxRect(x + 7 * scale, y - 1 * scale, 8 * scale, 8 * scale, "#1d3d20");
    // highlights
    pxRect(x - 2 * scale, y - 4 * scale, 5 * scale, 3 * scale, "#5db346"); // Bright green
    pxRect(x - 8 * scale, y + 1 * scale, 4 * scale, 3 * scale, "#418030");
    // small red berries (rich details)
    pxRect(x + 2 * scale, y - 3 * scale, 2 * scale, 2 * scale, "#ef3030");
    pxRect(x - 6 * scale, y + 3 * scale, 2 * scale, 2 * scale, "#ef3030");
    pxRect(x + 5 * scale, y + 1 * scale, 2 * scale, 2 * scale, "#ef3030");
  }

  function drawPalmTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    // Base Shadow
    pxRect(x - 12 * sc, y + 16 * sc, 24 * sc, 5 * sc, "rgba(0,0,0,0.28)");

    // Curved Trunk
    pxRect(x - 2 * sc, y + 6 * sc, 5 * sc, 12 * sc, "#78350f");
    pxRect(x - 1 * sc, y - 4 * sc, 5 * sc, 12 * sc, "#92400e");
    pxRect(x + 1 * sc, y - 14 * sc, 4 * sc, 11 * sc, "#b45309");
    
    // Trunk Bark texture rings
    pxRect(x - 1 * sc, y + 10 * sc, 4 * sc, 2 * sc, "#451a03");
    pxRect(x, y + 2 * sc, 4 * sc, 2 * sc, "#451a03");
    pxRect(x + 2 * sc, y - 8 * sc, 3 * sc, 2 * sc, "#78350f");

    const trunkTopX = x + 3 * sc;
    const trunkTopY = y - 14 * sc;

    // Coconuts
    pxRect(trunkTopX - 4 * sc, trunkTopY + 2 * sc, 5 * sc, 5 * sc, "#78350f");
    pxRect(trunkTopX + 1 * sc, trunkTopY + 4 * sc, 4 * sc, 4 * sc, "#92400e");
    pxRect(trunkTopX - 2 * sc, trunkTopY + 6 * sc, 4 * sc, 4 * sc, "#451a03");

    // Arching Palm Fronds
    const fronds = [
      { dx: -24, dy: 10, c1: "#14532d", c2: "#16a34a", c3: "#4ade80" },
      { dx: 24, dy: 12, c1: "#14532d", c2: "#16a34a", c3: "#4ade80" },
      { dx: -18, dy: -12, c1: "#15803d", c2: "#22c55e", c3: "#86efac" },
      { dx: 18, dy: -10, c1: "#15803d", c2: "#22c55e", c3: "#86efac" },
      { dx: -28, dy: -2, c1: "#14532d", c2: "#16a34a", c3: "#4ade80" },
      { dx: 28, dy: -2, c1: "#14532d", c2: "#16a34a", c3: "#4ade80" },
      { dx: 0, dy: -20, c1: "#15803d", c2: "#4ade80", c3: "#bbf7d0" }
    ];

    fronds.forEach(({ dx, dy, c1, c2, c3 }) => {
      ctx.save();
      ctx.translate(trunkTopX, trunkTopY);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(dx * 0.5 * sc, dy * 0.4 * sc - 6 * sc, dx * sc, dy * sc);
      ctx.strokeStyle = c1;
      ctx.lineWidth = 4 * sc;
      ctx.stroke();

      ctx.strokeStyle = c2;
      ctx.lineWidth = 2.5 * sc;
      ctx.stroke();

      ctx.strokeStyle = c3;
      ctx.lineWidth = 1.2 * sc;
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawChest(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    pxRect(x - 8 * sc, y + 4 * sc, 16 * sc, 4 * sc, "rgba(0,0,0,0.28)");
    pxRect(x - 7 * sc, y - 5 * sc, 14 * sc, 9 * sc, "#78350f");
    pxRect(x - 6 * sc, y - 4 * sc, 12 * sc, 7 * sc, "#92400e");
    pxRect(x - 8 * sc, y - 8 * sc, 16 * sc, 4 * sc, "#b45309");
    pxRect(x - 7 * sc, y - 7 * sc, 14 * sc, 2 * sc, "#d97706");
    pxRect(x - 6 * sc, y - 8 * sc, 2 * sc, 12 * sc, "#fbbf24");
    pxRect(x + 4 * sc, y - 8 * sc, 2 * sc, 12 * sc, "#fbbf24");
    pxRect(x - 2 * sc, y - 5 * sc, 4 * sc, 4 * sc, "#fef08a");
    pxRect(x - 1 * sc, y - 4 * sc, 2 * sc, 2 * sc, "#451a03");
  }

  function drawFlower(x, y, scale, color1?, color2?) {
    scale = scale || 1;
    color1 = color1 || "#f855a5";
    color2 = color2 || "#ffffa0";
    // stem
    pxRect(x - 1 * scale, y, 2 * scale, 8 * scale, "#2d7528");
    // petals in 4 directions
    pxRect(x - 6 * scale, y - 3 * scale, 5 * scale, 5 * scale, color1);
    pxRect(x + 2 * scale, y - 3 * scale, 5 * scale, 5 * scale, color1);
    pxRect(x - 2 * scale, y - 7 * scale, 5 * scale, 5 * scale, color1);
    pxRect(x - 2 * scale, y + 1 * scale, 5 * scale, 5 * scale, color1);
    // center
    pxRect(x - 2 * scale, y - 3 * scale, 5 * scale, 5 * scale, color2);
  }

  function drawSnowTree(x, y, scale) {
    scale = scale || 1;
    pxRect(x - 8 * scale, y + 12 * scale, 16 * scale, 5 * scale, "rgba(0,0,0,0.22)");
    // trunk
    pxRect(x - 3 * scale, y - 18 * scale, 6 * scale, 7 * scale, "#2e6632");
    // snow caps
    pxRect(x - 6 * scale, y - 6 * scale, 12 * scale, 3 * scale, "rgba(225,242,255,0.92)");
    pxRect(x - 4 * scale, y - 13 * scale, 8 * scale, 3 * scale, "rgba(235,248,255,0.95)");
    pxRect(x - 2 * scale, y - 19 * scale, 5 * scale, 3 * scale, "rgba(255,255,255,0.98)");
  }

  function drawSwampTree(x, y, scale) {
    scale = scale || 1;
    // shadow/water reflection
    pxRect(x - 10 * scale, y + 14 * scale, 24 * scale, 4 * scale, "rgba(10,40,25,0.34)");
    // gnarled trunk (wider base)
    pxRect(x - 5 * scale, y - 2 * scale, 10 * scale, 18 * scale, "#2c2007");
    pxRect(x - 3 * scale, y, 6 * scale, 14 * scale, "#422e11");
    // mossy foliage (dark, irregular)
    pxRect(x - 14 * scale, y - 10 * scale, 28 * scale, 12 * scale, "#1c4220");
    pxRect(x - 10 * scale, y - 16 * scale, 20 * scale, 10 * scale, "#123016");
    pxRect(x - 5 * scale, y - 20 * scale, 12 * scale, 8 * scale, "#275228");
    // hanging moss
    pxRect(x - 12 * scale, y - 2 * scale, 3 * scale, 10 * scale, "#2e522e");
    pxRect(x + 8 * scale, y - 4 * scale, 3 * scale, 12 * scale, "#274c20");
    // bioluminescent patches (magical glowing green)
    pxRect(x - 2 * scale, y - 8 * scale, 4 * scale, 3 * scale, "rgba(80,255,80,0.8)");
  }

  function drawCrystal(x: number, y: number, scale?: number, _color?: string) {
    drawRockPile(x, y, (scale || 1) * 1.05);
  }

  function drawVolcano(x, y, scale) {
    scale = scale || 1;
    // base shadow
    pxRect(x - 28 * scale, y + 18 * scale, 56 * scale, 8 * scale, "rgba(0,0,0,0.32)");
    // dark rocky body
    ctx.fillStyle = "#2c190f";
    ctx.beginPath();
    ctx.moveTo(x, y - 30 * scale);
    ctx.lineTo(x - 26 * scale, y + 20 * scale);
    ctx.lineTo(x + 26 * scale, y + 20 * scale);
    ctx.closePath();
    ctx.fill();
    // lighter face
    ctx.fillStyle = "#4a2a19";
    ctx.beginPath();
    ctx.moveTo(x, y - 30 * scale);
    ctx.lineTo(x, y + 20 * scale);
    ctx.lineTo(x + 26 * scale, y + 20 * scale);
    ctx.closePath();
    ctx.fill();
    // lava crater rim
    pxRect(x - 8 * scale, y - 32 * scale, 16 * scale, 6 * scale, "#73330b");
    // glowing lava inside crater
    ctx.fillStyle = "#ff6a00";
    ctx.beginPath();
    ctx.ellipse(x, y - 28 * scale, 6 * scale, 3 * scale, 0, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = "#ff8c00";
    ctx.shadowBlur = 14 * scale;
    ctx.fillStyle = "#ffca28";
    ctx.beginPath();
    ctx.ellipse(x, y - 29 * scale, 4 * scale, 2 * scale, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // lava streaks down the side
    ctx.strokeStyle = "#b53d00";
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(x - 4 * scale, y - 26 * scale);
    ctx.lineTo(x - 10 * scale, y + 10 * scale);
    ctx.stroke();
    ctx.strokeStyle = "#ff7c28";
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
  }

  function drawLakeInRegion(r, seed, rx, ry) {
    if (hash(seed * 43) < 0.92) return;
    const lx = r.x + (hash(seed * 47) - 0.5) * rx * 0.72;
    const ly = r.y + (hash(seed * 53) - 0.5) * ry * 0.58;
    const lrx = Math.max(16, rx * (0.12 + hash(seed * 59) * 0.07));
    const lry = Math.max(10, ry * (0.08 + hash(seed * 61) * 0.05));
    const lake = organicPath(lx, ly, lrx, lry, seed * 2.1);

    fillPath(organicPath(lx + 2, ly + 3, lrx + 5, lry + 4, seed * 2.1 + 1), "rgba(24,38,30,0.48)");
    fillPath(lake, "#1d6c8f");
    const innerLake = organicPath(lx, ly, lrx * 0.72, lry * 0.72, seed * 2.1 + 0.3);
    fillPath(innerLake, "#2d8ab5");

    ctx.strokeStyle = "#0e394f";
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.strokeStyle = "rgba(180, 240, 255, 0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const padX = lx + lrx * 0.3;
    const padY = ly + lry * 0.15;
    pxRect(padX - 2, padY - 2, 5, 4, "#245e2a");
    pxRect(padX + 1, padY - 1, 2, 2, "#1d6c8f");
    pxRect(padX - 1, padY - 3, 3, 3, "#f855a5");
    pxRect(padX, padY - 2, 1, 1, "#ffff80");
  }

  function drawRiverInRegion(r, seed, rx, ry) {
    if (hash(seed * 19) < 0.88) return;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.setLineDash([]);
    ctx.lineCap = "round";
    const sx = r.x - rx * 0.44;
    const ex = r.x + rx * 0.44;
    const cy = r.y + (hash(seed * 23) - 0.5) * ry * 0.45;
    
    ctx.strokeStyle = "#0e2947";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(sx, cy);
    ctx.bezierCurveTo(r.x - rx * 0.25, cy - ry * 0.35, r.x + rx * 0.22, cy + ry * 0.3, ex, cy + (hash(seed * 29) - 0.5) * ry * 0.25);
    ctx.stroke();

    ctx.strokeStyle = "#1d6c9f";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = "#7ad4ef";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.restore();
  }

  function drawRegionTerrain(r, seed, rx, ry, originalBiome, terrainBiome = originalBiome) {
    drawLakeInRegion(r, seed, rx, ry);
    drawRiverInRegion(r, seed, rx, ry);

    const count = 22;

    const items: Array<{
      type: "resource" | "sprite";
      x: number;
      y: number;
      pick: number;
      pick2: number;
      resType?: string;
    }> = [];

    for (let i = 0; i < count; i++) {
      const a = hash(seed * 61 + i * 17) * TAU;
      const rr = Math.sqrt(hash(seed * 67 + i * 23)) * 0.76;
      const x = Math.round((r.x + Math.cos(a) * rx * rr) / 4) * 4;
      const y = Math.round((r.y + Math.sin(a) * ry * rr) / 4) * 4;
      const pick = hash(seed * 73 + i * 31);
      const pick2 = hash(seed * 101 + i * 43);

      if (pick < 0.14) {
        let resType = "gold";
        if (originalBiome === 0 || originalBiome === 6 || originalBiome === 7) {
          resType = pick < 0.08 ? "wood" : "gold";
        } else if (originalBiome === 1 || originalBiome === 3) {
          resType = pick < 0.07 ? "gold" : "stone";
        } else if (originalBiome === 4 || originalBiome === 5) {
          resType = "gems";
        } else if (originalBiome === 2) {
          resType = pick < 0.05 ? "stone" : "gems";
        }
        items.push({ type: "resource", x, y, pick, pick2, resType });
      } else {
        items.push({ type: "sprite", x, y, pick, pick2 });
      }
    }

    items.sort((a, b) => a.y - b.y);

    items.forEach((item) => {
      const { x, y, pick, pick2, type, resType } = item;
      if (type === "resource" && resType) {
        drawResourceIcon(resType, x, y);
        return;
      }

      // --- BIOME-ACCURATE RESOURCE & TERRAIN DECORATIONS ---
      // 1. Desert Biome (Sa Mạc - Orange land)
      if (terrainBiome === 1) {
        if (pick > 0.62) drawPalmTree(x, y, pick > 0.85 ? 0.75 : 0.58);
        else if (pick > 0.35) drawCoin(x, y, 1.25);
        else if (pick > 0.18) drawMountain(x, y, pick > 0.28 ? 0.52 : 0.38);
        else if (pick > 0.08) drawChest(x, y, 0.9);
        else drawDune(x, y, 0.65);

      // 2. Snow Biome
      } else if (terrainBiome === 2) {
        if (pick > 0.55) drawRockPile(x, y, pick > 0.75 ? 1.2 : 0.85);
        else if (pick > 0.28) drawMountain(x, y, pick > 0.45 ? 0.52 : 0.38);
        else if (pick > 0.14) drawSnowTree(x, y, 0.58);
        else drawBush(x, y, 0.5);

      // 3. Volcanic Biome
      } else if (terrainBiome === 3) {
        if (pick > 0.65) drawVolcano(x, y, pick > 0.85 ? 0.58 : 0.42);
        else if (pick > 0.35) drawMountain(x, y, pick > 0.55 ? 0.55 : 0.40);
        else if (pick > 0.18) drawCoin(x, y, 1.2);
        else drawRockPile(x, y, 1.15);

      // 4. Crystal Biome
      } else if (terrainBiome === 4) {
        if (pick > 0.50) drawRockPile(x, y, pick > 0.75 ? 1.25 : 0.9);
        else if (pick > 0.25) drawTree(x, y, 0.65);
        else if (pick > 0.12) drawCoin(x, y, 1.2);
        else drawFlower(x, y, 0.8, "#4cf0ff", "#ffffff");

      // 5. Autumn Biome
      } else if (terrainBiome === 5) {
        if (pick > 0.55) drawTree(x, y, pick > 0.78 ? 0.75 : 0.58);
        else if (pick > 0.30) drawCoin(x, y, 1.25);
        else if (pick > 0.14) drawMountain(x, y, 0.45);
        else drawChest(x, y, 0.85);

      // 6. Pine Forest Biome
      } else if (terrainBiome === 6) {
        if (pick > 0.45) drawOakTree(x, y, pick > 0.72 ? 0.85 : 0.60);
        else if (pick > 0.24) drawCoin(x, y, 1.25);
        else if (pick > 0.10) drawMountain(x, y, 0.48);
        else drawChest(x, y, 0.85);

      // 7. Mint Swamp Biome
      } else if (terrainBiome === 7) {
        if (pick > 0.45) drawSwampTree(x, y, pick > 0.75 ? 0.75 : 0.58);
        else if (pick > 0.24) drawCoin(x, y, 1.2);
        else if (pick > 0.10) drawMountain(x, y, 0.45);
        else drawBush(x, y, 0.65);

      // 0. Grassland Biome (Green land)
      } else {
        if (pick > 0.46) drawOakTree(x, y, pick > 0.75 ? 0.82 : 0.60);
        else if (pick > 0.24) drawCoin(x, y, 1.25);
        else if (pick > 0.12) drawMountain(x, y, 0.48);
        else if (pick > 0.05) drawChest(x, y, 0.85);
        else drawFlower(x, y, 0.72, pick2 > 0.5 ? "#ff6090" : "#f0d040", "#ffffff");
      }
    });

    if (terrainBiome === 0 || terrainBiome === 6 || terrainBiome === 7 || terrainBiome === 5) {
      const fcount = 4;
      for (let i = 0; i < fcount; i++) {
        const fa = hash(seed * 137 + i * 53) * TAU;
        const frr = Math.sqrt(hash(seed * 139 + i * 57)) * 0.65;
        const fx = Math.round((r.x + Math.cos(fa) * rx * frr) / 4) * 4;
        const fy = Math.round((r.y + Math.sin(fa) * ry * frr) / 4) * 4;
        const fpick = hash(seed * 149 + i * 61);
        if (fpick > 0.5) {
          drawBush(fx, fy, 0.52);
        } else {
          drawFlower(fx, fy, 0.6, "#ff6090", "#ffffff");
        }
      }
    }
  }

  function getRegionBattleState(idx: number) {
    const hasBattle = state.activeBattles?.some((b: any) => 
      b.regionId === idx || (b.townId !== undefined && towns.find((t: any) => t.id === b.townId && regionAtCoords(t.x, t.y) === idx))
    );
    if (hasBattle) return { type: "battle", label: "🔥 ĐANG GIAO TRANH!" };

    let hasIncomingAttack = false;
    let hasOutgoingAttack = false;

    state.voyages?.forEach((v: any) => {
      if (!v.isAttack) return;
      let targetReg = v.targetRegionId;
      if (targetReg === undefined || targetReg < 0) {
        if (v.target) targetReg = regionAtCoords(v.target.x, v.target.y);
      }
      let sourceReg = v.sourceRegionId;
      if (sourceReg === undefined || sourceReg < 0) {
        if (v.source) sourceReg = regionAtCoords(v.source.x, v.source.y);
      }

      if (targetReg === idx) hasIncomingAttack = true;
      if (sourceReg === idx) hasOutgoingAttack = true;
    });

    if (hasIncomingAttack) return { type: "under_attack", label: "⚠️ BỊ TẤN CÔNG!" };
    if (hasOutgoingAttack) return { type: "attacking", label: "⚔️ ĐANG TẤN CÔNG!" };

    return null;
  }

  function getRegionAllianceRelation(idx: number, ownerCode: number, ownerName?: string): "own" | "ally" | "enemy" {
    if (ownerCode === 1) return "own";
    if (!ownerCode) return "enemy";

    const tag = state.regionOwnerAllianceTags[idx];
    const myTag = state.myAllianceTag || state.myAlliance?.tag;

    if (tag && myTag && typeof tag === "string" && typeof myTag === "string" && tag.toLowerCase() === myTag.toLowerCase()) {
      return "ally";
    }

    const nameUpper = String(ownerName || "").toUpperCase();
    const tagUpper = String(tag || "").toUpperCase();

    if (
      (myTag && tagUpper && tagUpper === myTag.toUpperCase()) ||
      nameUpper.startsWith("[LIÊN MINH]") || nameUpper.includes("LIÊN MINH") || nameUpper.includes("ALLY") || nameUpper.includes("DONGBINH")
    ) {
      return "ally";
    }

    return "enemy";
  }

  function drawRegion(r, idx, pass, isIslet) {
    const biomeId = visualBiomeIndex(r, idx, isIslet);
    const biome = BIOMES[biomeId] || BIOMES[0];
    const seed = r.seed || idx + 1;
    const scale = isIslet ? 0.82 : 0.995;

    // Use the exact same baseRx/baseRy as getSharedRegionPolygon for perfect coastal alignment
    const sizeFactor = 0.99 + hash(seed * 31) * 0.20;
    const rx = (r.rx || 230) * sizeFactor * scale;
    const ry = rx * 0.78;

    const cachePrefix = isIslet ? `islet_${idx}` : `region_${idx}`;

    // Get the shared land polygon first so we can base our cliffs/beaches/foams on it!
    const land = getSharedRegionPolygon(r, idx, isIslet);

    function getOffsetPolygon(offset: number): Array<[number, number]> {
      return land.map(([px, py]) => {
        const dx = px - r.x;
        const dy = py - r.y;
        const dist = Math.hypot(dx, dy) || 1;
        return [
          Math.round(r.x + (dx / dist) * (dist + offset)),
          Math.round(r.y + (dy / dist) * (dist + offset * 0.78))
        ];
      });
    }

    const isCoastal = isIslet || mainlandCoastalRegionIds.has(r.id);

    if (pass === 0) {
      // Pass 0: Animated Sky Blue Ocean Foam (Only for outer coastal facing edges!)
      if (isCoastal) {
        const wavePulse = Math.sin(state.tick * 3.2 + seed * 0.5) * 3.2;
        const shallow = getOffsetPolygon(38 + wavePulse);
        fillPath(shallow, "rgba(56, 189, 248, 0.85)");

        const waveCrest = getOffsetPolygon(30 + wavePulse * 0.8);
        fillPath(waveCrest, "rgba(255, 255, 255, 0.70)");
      } else {
        // Vẽ lớp nền đất rộng ra 12px trùng màu với sinh cảnh để che phủ hoàn toàn các rãnh phân tách nội địa
        const continentBase = getOffsetPolygon(12);
        fillPath(continentBase, biome.a);
      }
      return;
    }

    if (pass === 1) {
      // Pass 1: Tall 3D Sand Cliff Base & Vibrant Golden Beach Rim (Only for outer coastal facing edges!)
      if (isCoastal) {
        // Fetch biome-specific colors for cliffs and beach
        const cDeep = biome.cliffDeep || "#0f0a05";
        const cMid = biome.cliffMid || "#21160a";
        const cUpper = biome.cliffUpper || "#3e2e18";
        const bColor = biome.beach || "#e8b94a";

        // 1. Deepest shadow base (+12px down for max 3D elevation depth)
        const cliffDeep = getOffsetPolygon(26).map(([px, py]) => [px + 5, py + 12] as [number, number]);
        fillPath(cliffDeep, cDeep);

        // Draw a bright shoreline foam highlight along the outer edge of cliffDeep to make the bottom pop
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cliffDeep[0][0], cliffDeep[0][1]);
        for (let i = 1; i < cliffDeep.length; i++) ctx.lineTo(cliffDeep[i][0], cliffDeep[i][1]);
        ctx.closePath();
        ctx.stroke();

        // 2. Mid cliff dark shadow
        const cliffBase = getOffsetPolygon(20).map(([px, py]) => [px + 3, py + 8] as [number, number]);
        
        // Use a vertical/diagonal gradient for the mid-cliff to simulate lighting
        const baseGrad = ctx.createLinearGradient(r.x - rx * 0.4, r.y - ry * 0.4, r.x + rx * 0.2, r.y + ry + 12);
        baseGrad.addColorStop(0, cMid);
        baseGrad.addColorStop(1, cDeep);
        fillPath(cliffBase, baseGrad);

        // 3. Upper rocky cliff face
        const coast = getOffsetPolygon(14).map(([px, py]) => [px + 2, py + 4.5] as [number, number]);
        
        const coastGrad = ctx.createLinearGradient(r.x - rx * 0.4, r.y - ry * 0.4, r.x + rx * 0.2, r.y + ry + 8);
        coastGrad.addColorStop(0, cUpper);
        coastGrad.addColorStop(0.5, cMid);
        coastGrad.addColorStop(1, cDeep);
        fillPath(coast, coastGrad);

        // Draw vertical/diagonal rocky crevice lines (striations) running down the cliff face
        ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < coast.length; i += 3) {
          // Draw from the upper rocky cliff point (coast[i]) to the lower shadow base point (cliffDeep[i])
          ctx.moveTo(coast[i][0], coast[i][1]);
          ctx.lineTo(cliffDeep[i][0], cliffDeep[i][1]);
        }
        ctx.stroke();

        // Draw rock highlights to capture sunlight on top-left facing ridges
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        for (let i = 1; i < coast.length; i += 3) {
          ctx.moveTo(coast[i][0], coast[i][1]);
          ctx.lineTo(cliffDeep[i][0], cliffDeep[i][1]);
        }
        ctx.stroke();

        // 4. Sandy shore/beach rim top face (wide & vivid)
        const sandRim = getOffsetPolygon(8);
        fillPath(sandRim, bColor);

        // Add a soft highlight overlay on the inner side of the beach rim to make it feel sandy & sunlit
        const sandHighlight = getOffsetPolygon(4);
        ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
        fillPath(sandHighlight);
      }
      return;
    }

    if (r.isWater) {
      if (pass === 0) {
        const wavePulse = Math.sin(state.tick * 2.8 + seed) * 2.2;
        const waterPoly = getOrganicPath(r.x, r.y, rx + 14, ry + 11, seed * 1.7, `${cachePrefix}_water_poly`);
        fillPath(waterPoly, "#0369a1"); // Deep lake blue

        const waveFoam = getOrganicPath(r.x, r.y, rx + 10 + wavePulse, ry + 8 + wavePulse, seed * 1.7 + 0.1, `${cachePrefix}_water_foam`);
        fillPath(waveFoam, "rgba(56, 189, 248, 0.75)"); // Cyan lake foam
      } else if (pass === 1) {
        const sandRim = getOrganicPath(r.x, r.y, rx + 4, ry + 3, seed * 1.7 + 0.25, `${cachePrefix}_water_sand`);
        fillPath(sandRim, "#e0b257"); // Golden lake sand rim
      }
      return;
    }

    // Pass 2: Main land body using Shared Edge Mesh (Flat and unified)

    const ownerCode = derivedRegionOwnership(idx);
    const isWildBase = ownerCode === 0;

    // Draw Main Province Body
    fillPath(land, biome.a);

    // Define land path (straight polygon line path for clip region)
    ctx.beginPath();
    ctx.moveTo(land[0][0], land[0][1]);
    for (let i = 1; i < land.length; i++) {
      ctx.lineTo(land[i][0], land[i][1]);
    }
    ctx.closePath();

    // 1. Draw textures & Terrain Color Gradient (clipped inside territory)
    ctx.save();
    ctx.clip();

    // Dark outer rim → bright mid-tone highlight → dark inner vignette
    // Creates a natural "hill" look: dark at edges, light in center, subtle depth
    const rg = ctx.createRadialGradient(r.x, r.y, rx * 0.08, r.x, r.y, rx * 1.05);
    rg.addColorStop(0,    "rgba(255, 255, 255, 0.12)"); // slightly bright center
    rg.addColorStop(0.38, "rgba(255, 255, 255, 0.06)"); // midfield open
    rg.addColorStop(0.72, "rgba(0, 0, 0, 0)");           // transparent mid
    rg.addColorStop(1,    `rgba(0, 0, 0, ${isCoastal ? 0.18 : isWildBase ? 0.04 : 0.10})`);
    ctx.fillStyle = rg;
    ctx.fillRect(r.x - rx - 20, r.y - ry - 20, rx * 2 + 40, ry * 2 + 40);

    // Sparse soft pixel grain
    for (let y = r.y - ry - 10; y < r.y + ry + 10; y += 16) {
      for (let x = r.x - rx - 10; x < r.x + rx + 10; x += 16) {
        const val = Math.sin(x * 0.05 + seed) + Math.cos(y * 0.06 - seed);
        const noise = hash(x * 17 + y * 31 + seed * 7);
        if (noise > 0.93 || val > 1.48) {
          const col = noise > 0.85 ? biome.hi : val < 0.2 ? biome.dark : biome.b;
          pxRect(x, y, 5, 3, col);
        }
      }
    }

    // Natural pixel noise detail & grass/stone tufts
    for (let i = 0; i < 18; i++) {
      const a = (i * 2.399 + seed) % TAU;
      const rr = Math.sqrt(hash(seed * 41 + i * 11));
      const px = Math.round((r.x + Math.cos(a) * rx * rr) / 4) * 4;
      const py = Math.round((r.y + Math.sin(a) * ry * rr) / 4) * 4;
      const pick = hash(seed * 900 + i * 19);
      const c = pick > 0.82 ? biome.hi : pick > 0.42 ? biome.b : biome.dark;
      const bw = pick > 0.9 ? 5 : 3;
      const bh = pick > 0.9 ? 3 : 2;
      pxRect(px, py, bw, bh, c);
    }

    drawRegionTerrain(r, seed, rx, ry, r.biome, biomeId);

    // Restore clip context early so highlights and borders can draw outwards without clipping
    ctx.restore();

    const conflict = getRegionBattleState(idx);
    const isClearing = state.regionInProgress === idx ||
      Boolean(state.activeClearingTimings?.[idx]) ||
      (state.regionClearing[idx] > 0 && state.regionClearing[idx] < 1) ||
      state.regionOwnerNames[idx] === "ĐANG KHAI HOANG";

    const isLocalClearing = isClearing && (
      state.regionInProgress === idx ||
      state.regionOwnerIds[idx] === state.localPlayerId ||
      state.activeClearingTimings?.[idx]?.playerId === state.localPlayerId
    );
    const isRemoteClearing = isClearing && !isLocalClearing;

    const rel = getRegionAllianceRelation(idx, ownerCode, state.regionOwnerNames[idx]);

    // Fill overlay based on state
    if (conflict) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(state.tick * 8) * 0.1;
      fillPath(land, "#ef4444");
      ctx.restore();
    } else if (isLocalClearing) {
      ctx.save();
      ctx.globalAlpha = 0.30 + Math.sin(state.tick * 5) * 0.08;
      fillPath(land, "#10b981");
      ctx.restore();
    } else if (isRemoteClearing) {
      ctx.save();
      ctx.globalAlpha = 0.32 + Math.sin(state.tick * 5) * 0.08;
      fillPath(land, "#ef4444"); // Red overlay for other players building
      ctx.restore();
    } else if (rel === "own") {
      ctx.save();
      ctx.globalAlpha = 0.24 + Math.sin(state.tick * 4) * 0.05;
      fillPath(land, "#0284c7");
      ctx.restore();
    } else if (rel === "ally") {
      ctx.save();
      ctx.globalAlpha = 0.14;
      fillPath(land, "#eab308");
      ctx.restore();
    } else if (rel === "enemy" && ownerCode > 1) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      fillPath(land, "#ef4444");
      ctx.restore();
    }

    if (state.selectedRegion === idx) {
      ctx.save();
      // Clip to region path
      ctx.beginPath();
      ctx.moveTo(land[0][0], land[0][1]);
      for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
      ctx.closePath();
      ctx.clip();

      const pulse = Math.sin(state.tick * 5.0) * 0.12 + 0.38;

      let colorCenter, colorEdge;
      if (isClearing) {
        if (isLocalClearing) {
          colorCenter = `rgba(52, 211, 153, ${pulse * 1.1})`; // Emerald green
          colorEdge = `rgba(16, 185, 129, 0.03)`;
        } else {
          colorCenter = `rgba(252, 167, 167, ${pulse * 1.1})`; // Light crimson
          colorEdge = `rgba(239, 68, 68, 0.03)`;
        }
      } else {
        colorCenter = `rgba(255, 235, 90, ${pulse})`; // Gold
        colorEdge = `rgba(216, 155, 33, 0.03)`;
      }

      // Radial Glow
      const maxRadius = Math.max(rx, ry) * 1.4;
      const grad = ctx.createRadialGradient(r.x, r.y, 4, r.x, r.y, maxRadius);
      grad.addColorStop(0, colorCenter);
      grad.addColorStop(0.6, colorCenter);
      grad.addColorStop(1, colorEdge);
      ctx.fillStyle = grad;
      ctx.fill();

      // Energy sweep effect
      const sweepPos = ((state.tick * 60) % (rx * 4)) - rx * 2;
      const sweepGrad = ctx.createLinearGradient(
        r.x + sweepPos - 20, r.y,
        r.x + sweepPos + 20, r.y
      );
      if (isClearing) {
        if (isLocalClearing) {
          sweepGrad.addColorStop(0, "rgba(52, 211, 153, 0)");
          sweepGrad.addColorStop(0.5, "rgba(167, 243, 208, 0.25)");
          sweepGrad.addColorStop(1, "rgba(52, 211, 153, 0)");
        } else {
          sweepGrad.addColorStop(0, "rgba(252, 167, 167, 0)");
          sweepGrad.addColorStop(0.5, "rgba(254, 202, 202, 0.25)");
          sweepGrad.addColorStop(1, "rgba(252, 167, 167, 0)");
        }
      } else {
        sweepGrad.addColorStop(0, "rgba(255, 235, 90, 0)");
        sweepGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.35)");
        sweepGrad.addColorStop(1, "rgba(255, 235, 90, 0)");
      }
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      ctx.restore();
    }

    const borderAlpha = 0;
    const borderWidth = 0;
    const borderColor = "rgba(20, 34, 21, 0.58)";
    ctx.save();
    ctx.globalAlpha = borderAlpha;
    if (borderAlpha > 0.02 && borderWidth > 0) strokePath(land, borderColor, borderWidth);
    ctx.restore();

    // 1. RED DANGER BORDER FOR TERRITORY IN ATTACK OR BATTLE!
    if (conflict) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(land[0][0], land[0][1]);
      for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
      ctx.closePath();

      // Outer Glowing Crimson Red Shadow
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 32;
      ctx.globalAlpha = 0.95 + Math.sin(state.tick * 8) * 0.05;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 7.5;
      ctx.stroke();

      // Inner Rapidly Moving Dashed Danger Line
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.lineDashOffset = -state.tick * 35;
      ctx.stroke();
      ctx.restore();
    }
    // 1.5. Dynamic Emerald-Gold Animated Construction Border for Local Territory Under Clearing!
    else if (isLocalClearing) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(land[0][0], land[0][1]);
      for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
      ctx.closePath();

      // Outer Glowing Emerald Green Aura
      ctx.shadowColor = "#34d399";
      ctx.shadowBlur = 32;
      ctx.globalAlpha = 0.95 + Math.sin(state.tick * 5) * 0.05;
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 7.5;
      ctx.stroke();

      // Inner Rapidly Moving Amber-Gold Dashed Construction Line
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffd34d";
      ctx.lineWidth = 3.5;
      ctx.setLineDash([12, 6]);
      ctx.lineDashOffset = -state.tick * 28;
      ctx.stroke();
      ctx.restore();
    }
    // 1.6. Dynamic Crimson-Red Animated Construction Border for Remote Territory Under Clearing!
    else if (isRemoteClearing) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(land[0][0], land[0][1]);
      for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
      ctx.closePath();

      // Outer Glowing Crimson Red Aura
      ctx.shadowColor = "#f87171";
      ctx.shadowBlur = 32;
      ctx.globalAlpha = 0.95 + Math.sin(state.tick * 5) * 0.05;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 7.5;
      ctx.stroke();

      // Inner Rapidly Moving White-Red Dashed Construction Line
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 3.5;
      ctx.setLineDash([12, 6]);
      ctx.lineDashOffset = -state.tick * 28;
      ctx.stroke();
      ctx.restore();
    }
    // Ownership is shown by soft fill tint only; adjacent territories should not draw internal borders.

    if (state.selectedRegion === idx) {
      ctx.save();
      
      // Recreate land path for the double neon glowing border stroke
      ctx.beginPath();
      ctx.moveTo(land[0][0], land[0][1]);
      for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
      ctx.closePath();

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
  }

  function drawRoutes() {
    routes.forEach((route) => {
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(10, 45, 70, 0.5)";
      ctx.beginPath();
      ctx.moveTo(route[0], route[1] + 2);
      for (let i = 2; i < route.length; i += 2) ctx.lineTo(route[i], route[i + 1] + 2);
      ctx.stroke();
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#e1f7fc";
      ctx.beginPath();
      ctx.moveTo(route[0], route[1]);
      for (let i = 2; i < route.length; i += 2) ctx.lineTo(route[i], route[i + 1]);
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
    // Base shadow
    pxRect(x - 11 * sc, y + 8 * sc, 22 * sc, 5 * sc, "rgba(0,0,0,0.25)");
    // Trunk
    pxRect(x - 3 * sc, y - 4 * sc, 6 * sc, 13 * sc, "#78350f");
    pxRect(x - 2 * sc, y - 2 * sc, 4 * sc, 10 * sc, "#92400e");
    // Foliage Tier 1 (Dark base)
    pxRect(x - 13 * sc, y - 10 * sc, 26 * sc, 10 * sc, "#14532d");
    // Foliage Tier 2 (Mid lush green)
    pxRect(x - 11 * sc, y - 17 * sc, 22 * sc, 11 * sc, "#16a34a");
    // Foliage Tier 3 (Top bright highlight)
    pxRect(x - 7 * sc, y - 22 * sc, 14 * sc, 9 * sc, "#22c55e");
    pxRect(x - 4 * sc, y - 20 * sc, 5 * sc, 5 * sc, "#86efac");
  }

  function drawRockPile(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    pxRect(x - 10 * sc, y + 6 * sc, 20 * sc, 4 * sc, "rgba(0,0,0,0.25)");
    pxRect(x - 8 * sc, y - 2 * sc, 10 * sc, 8 * sc, "#4b5563");
    pxRect(x - 6 * sc, y - 5 * sc, 7 * sc, 5 * sc, "#6b7280");
    pxRect(x + 1 * sc, y + 1 * sc, 8 * sc, 6 * sc, "#374151");
    pxRect(x + 2 * sc, y - 2 * sc, 5 * sc, 4 * sc, "#9ca3af");
  }

  function drawTree(x: number, y: number, scale?: number) {
    const sc = scale || 1;
    const rnd = Math.abs(Math.sin(x * 12.9898 + y * 78.233));
    if (rnd > 0.65) {
      drawPalmTree(x, y, sc * 0.9);
    } else {
      drawOakTree(x, y, sc);
    }
  }

  function drawMountain(x, y, scale) {
    const sc = scale || 1;
    // Drop shadow
    pxRect(x - 22 * sc, y + 14 * sc, 44 * sc, 6 * sc, "rgba(0,0,0,0.28)");

    // Left shadow slope
    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.moveTo(x, y - 28 * sc);
    ctx.lineTo(x - 20 * sc, y + 15 * sc);
    ctx.lineTo(x, y + 15 * sc);
    ctx.closePath();
    ctx.fill();

    // Right light slope
    ctx.fillStyle = "#6b7280";
    ctx.beginPath();
    ctx.moveTo(x, y - 28 * sc);
    ctx.lineTo(x, y + 15 * sc);
    ctx.lineTo(x + 20 * sc, y + 15 * sc);
    ctx.closePath();
    ctx.fill();

    // Center ridge line
    pxRect(x - 1 * sc, y - 26 * sc, 2 * sc, 40 * sc, "#9ca3af");

    // Snow cap left
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(x, y - 28 * sc);
    ctx.lineTo(x - 8 * sc, y - 8 * sc);
    ctx.lineTo(x, y - 11 * sc);
    ctx.closePath();
    ctx.fill();

    // Snow cap right (bright white)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x, y - 28 * sc);
    ctx.lineTo(x, y - 11 * sc);
    ctx.lineTo(x + 8 * sc, y - 8 * sc);
    ctx.closePath();
    ctx.fill();

    // Dark base boundary line
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 1.8 * sc;
    ctx.strokeRect(x - 18 * sc, y + 14 * sc, 36 * sc, 2 * sc);
  }

  function drawHill(x, y, scale, _color?: string) {
    drawBush(x, y, (scale || 1) * 0.9);
  }

  function drawIceField(x: number, y: number, scale?: number) {
    drawRockPile(x, y, (scale || 1) * 1.1);
  }

  function drawDune(x, y, scale) {
    scale = scale || 1;
    pxRect(x - 24 * scale, y + 9 * scale, 48 * scale, 7 * scale, "rgba(80,48,16,0.16)");
    ctx.strokeStyle = "#f0c760";
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.moveTo(x - 25 * scale, y + 7 * scale);
    ctx.quadraticCurveTo(x - 5 * scale, y - 10 * scale, x + 24 * scale, y + 4 * scale);
    ctx.stroke();
    ctx.strokeStyle = "#9a6b28";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x - 18 * scale, y + 11 * scale);
    ctx.quadraticCurveTo(x + 2 * scale, y + 2 * scale, x + 20 * scale, y + 10 * scale);
    ctx.stroke();
  }

  function drawVolcano(x, y, scale) {
    scale = scale || 1;
    pxRect(x - 28 * scale, y + 18 * scale, 56 * scale, 8 * scale, "rgba(0,0,0,0.32)");
    ctx.fillStyle = "#5a3024";
    ctx.beginPath();
    ctx.moveTo(x, y - 30 * scale);
    ctx.lineTo(x - 26 * scale, y + 20 * scale);
    ctx.lineTo(x + 26 * scale, y + 20 * scale);
    ctx.closePath();
    ctx.fill();
    pxRect(x - 8 * scale, y - 20 * scale, 16 * scale, 7 * scale, "#201514");
    pxRect(x - 4 * scale, y - 17 * scale, 8 * scale, 28 * scale, "#ff5a2a");
    pxRect(x - 2 * scale, y - 14 * scale, 4 * scale, 26 * scale, "#ffd34d");
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
        drawTerrainPatch(c, -0.18, -0.22, c.rx * 0.58, c.ry * 0.34, "#f1f3e7", c.seed + 90);
        drawTerrainPatch(c, 0.26, 0.18, c.rx * 0.38, c.ry * 0.28, "#cbd9da", c.seed + 91);
      } else if (c.climate === "desert") {
        drawTerrainPatch(c, -0.18, 0.04, c.rx * 0.62, c.ry * 0.48, "#d8ad36", c.seed + 90);
        drawTerrainPatch(c, 0.36, -0.18, c.rx * 0.32, c.ry * 0.26, "#efc75a", c.seed + 91);
      } else if (c.climate === "volcanic") {
        drawTerrainPatch(c, -0.12, -0.04, c.rx * 0.58, c.ry * 0.46, "#cf6337", c.seed + 90);
        drawTerrainPatch(c, 0.28, 0.24, c.rx * 0.38, c.ry * 0.3, "#6c2d24", c.seed + 91);
      } else if (c.climate === "forest" || c.climate === "isles") {
        drawTerrainPatch(c, -0.16, 0.18, c.rx * 0.5, c.ry * 0.38, "#428a3f", c.seed + 90);
        drawTerrainPatch(c, 0.26, -0.22, c.rx * 0.34, c.ry * 0.3, "#86c252", c.seed + 91);
      } else {
        drawTerrainPatch(c, -0.28, -0.18, c.rx * 0.42, c.ry * 0.32, "#d8ad36", c.seed + 90);
        drawTerrainPatch(c, 0.3, 0.2, c.rx * 0.4, c.ry * 0.3, "#66aa42", c.seed + 91);
      }

      for (let i = 0; i < 18; i++) {
        const a = hash(c.seed * 19 + i * 11) * TAU;
        const rr = Math.sqrt(hash(c.seed * 23 + i * 17)) * 0.72;
        const x = c.x + Math.cos(a) * c.rx * rr;
        const y = c.y + Math.sin(a) * c.ry * rr;
        const pick = hash(c.seed * 31 + i * 13);
        if (c.climate === "ice") drawIceField(x, y, pick > 0.65 ? 0.82 : 0.58);
        else if (c.climate === "desert") drawDune(x, y, pick > 0.65 ? 0.92 : 0.62);
        else if (c.climate === "volcanic" && pick > 0.45) drawVolcano(x, y, pick > 0.75 ? 0.86 : 0.62);
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
    if (owner === 0) return "rgba(47,112,215,0.34)";
    if (owner === 1) return "rgba(215,70,53,0.32)";
    if (owner === 2) return "rgba(68,161,61,0.32)";
    if (owner === 3) return "rgba(216,155,33,0.34)";
    return "rgba(142,69,188,0.34)";
  }

  function drawTerritoryZones() {
    towns.forEach((t) => {
      const seed = 800 + t.id * 17;
      let near = 9999;
      for (const other of towns) {
        if (other === t) continue;
        const d = Math.hypot(other.x - t.x, other.y - t.y);
        if (d < near) near = d;
      }
      const base = Math.max(34, Math.min(82, near * 0.34));
      const rx = base + t.lvl * 3;
      const ry = base * 0.72 + t.lvl * 2;
      const pts = organicPath(t.x, t.y + 8, rx, ry, seed);
      ctx.globalAlpha = 1;
      fillPath(pts, ownerTint(t.owner));
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = t.owner === 0 ? "rgba(145,195,255,0.78)" : "rgba(20,18,14,0.42)";
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

  function drawDecoration() {
    const items: Array<{
      type: "tree" | "mountain" | "stone";
      x: number;
      y: number;
      scale?: number;
    }> = [];

    const treeClusters = [
      [300, 382, 18, 5], [360, 461, 24, 7], [489, 411, 22, 8], [555, 226, 16, 4],
      [692, 430, 18, 4], [470, 705, 30, 8], [620, 730, 28, 9], [820, 612, 16, 4],
      [345, 610, 22, 7], [787, 245, 18, 4], [591, 563, 22, 6], [410, 526, 18, 5],
      [703, 816, 24, 7], [902, 796, 18, 6], [318, 746, 18, 5], [739, 684, 16, 4],
      [424, 1004, 26, 8], [566, 1058, 28, 9], [706, 1034, 30, 10], [846, 1108, 24, 7],
      [740, 1218, 24, 8], [640, 1260, 20, 6], [970, 1024, 18, 5], [520, 1164, 22, 6],
      [340, 880, 24, 6], [260, 1020, 20, 5], [1040, 500, 18, 4], [750, 140, 20, 5],
    ];
    treeClusters.forEach(([cx, cy, spread, count], ci) => {
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
      [462, 91, 1.22], [517, 96, 1], [570, 108, 1.18], [630, 102, 0.9], [410, 131, 0.74],
      [859, 704, 1.25], [914, 698, 1], [891, 746, 0.9], [642, 286, 0.45], [578, 430, 0.48],
      [716, 520, 0.45], [374, 269, 0.43], [836, 552, 0.46], [866, 932, 1.2], [916, 946, 1.0],
      [970, 970, 0.88], [650, 1190, 0.52], [710, 1196, 0.48], [330, 160, 0.9], [770, 145, 0.85],
      [380, 900, 1.1], [270, 860, 0.95],
    ];
    mountains.forEach((m) => {
      items.push({ type: "mountain", x: m[0], y: m[1], scale: m[2] });
    });

    const stones = [[602, 526], [628, 523], [651, 523], [548, 292], [565, 302], [759, 466], [784, 464], [691, 585], [876, 770], [842, 794], [970, 292], [326, 517], [506, 847], [546, 850], [580, 1070], [608, 1084], [808, 1010], [834, 1014], [720, 1268], [300, 910], [1060, 710]];
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
        pxRect(x - 6, y - 4, 12, 8, i % 2 ? "#5b6056" : "#94907a");
        pxRect(x - 2, y - 7, 8, 4, "#c7be9e");
      }
    });
  }

  function drawFlagEmblem(x: number, y: number, emblem: string, scale = 1) {
    const s = scale;
    ctx.fillStyle = "#fff7d6";
    if (emblem === "shield") {
      pxRect(x - 4 * s, y - 6 * s, 8 * s, 9 * s, "#fff7d6");
      pxRect(x - 2 * s, y + 3 * s, 4 * s, 3 * s, "#fff7d6");
    } else if (emblem === "tree") {
      pxRect(x - 2 * s, y - 7 * s, 4 * s, 12 * s, "#fff7d6");
      pxRect(x - 6 * s, y - 6 * s, 12 * s, 5 * s, "#fff7d6");
      pxRect(x - 4 * s, y - 11 * s, 8 * s, 5 * s, "#fff7d6");
    } else if (emblem === "mountain") {
      pxRect(x - 8 * s, y + 1 * s, 16 * s, 5 * s, "#fff7d6");
      pxRect(x - 4 * s, y - 5 * s, 8 * s, 6 * s, "#fff7d6");
    } else if (emblem === "anchor") {
      pxRect(x - 2 * s, y - 9 * s, 4 * s, 15 * s, "#fff7d6");
      pxRect(x - 7 * s, y + 2 * s, 14 * s, 4 * s, "#fff7d6");
      pxRect(x - 5 * s, y - 8 * s, 10 * s, 3 * s, "#fff7d6");
    } else if (emblem === "crown") {
      pxRect(x - 9 * s, y - 2 * s, 18 * s, 7 * s, "#fff7d6");
      pxRect(x - 7 * s, y - 7 * s, 4 * s, 5 * s, "#fff7d6");
      pxRect(x - 2 * s, y - 10 * s, 4 * s, 8 * s, "#fff7d6");
      pxRect(x + 3 * s, y - 7 * s, 4 * s, 5 * s, "#fff7d6");
    } else {
      pxRect(x - 5 * s, y - 5 * s, 10 * s, 10 * s, "#fff7d6");
    }
  }

  function drawEmpireCastleSprite(x: number, y: number, flagColor: string, emblem: string, scale = 1, relation: "own" | "ally" | "enemy" = "enemy") {
    const s = scale;
    const r = (dx: number, dy: number, w: number, h: number, color: string) => pxRect(x + dx * s, y + dy * s, w * s, h * s, color);
    const roof = (points: number[][], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x + points[0][0] * s, y + points[0][1] * s);
      for (let i = 1; i < points.length; i++) ctx.lineTo(x + points[i][0] * s, y + points[i][1] * s);
      ctx.closePath();
      ctx.fill();
    };

    // Roof colors based on relationship
    let roofBaseColor = "#7f1d1d"; // Deep Crimson
    let roofHighlightColor = "#b91c1c";
    let mainRoofBaseColor = "#991b1b";
    let mainRoofHighlightColor = "#ef4444";

    if (relation === "own") {
      roofBaseColor = "#1e3a8a"; // Deep Royal Blue
      roofHighlightColor = "#3b82f6";
      mainRoofBaseColor = "#1e40af";
      mainRoofHighlightColor = "#60a5fa";
    } else if (relation === "ally") {
      roofBaseColor = "#c2410c"; // Deep Bronze Orange
      roofHighlightColor = "#f97316";
      mainRoofBaseColor = "#ea580c";
      mainRoofHighlightColor = "#fb923c";
    }

    // Render different building styles based on the flag emblem
    if (emblem === "crown") {
      // --- STYLE 1: GRAND MEDIEVAL CASTLE (Default Crown) ---
      r(-90, 44, 180, 18, "rgba(0,0,0,0.36)");

      // High Back Towers
      r(-42, -80, 18, 100, "#161c22");
      r(-38, -76, 14, 96, "#334155");
      r(-36, -76, 6, 96, "#475569");
      roof([[-44, -76], [-33, -106], [-22, -76]], roofBaseColor);
      roof([[-33, -106], [-33, -76], [-22, -76]], roofHighlightColor);
      r(-34, -112, 2, 6, "#ffd700");

      r(24, -80, 18, 100, "#161c22");
      r(24, -76, 14, 96, "#334155");
      r(26, -76, 6, 96, "#475569");
      roof([[22, -76], [33, -106], [44, -76]], roofBaseColor);
      roof([[33, -106], [33, -76], [44, -76]], roofHighlightColor);
      r(32, -112, 2, 6, "#ffd700");

      // Main Fortress Curtain Wall
      r(-68, 0, 136, 48, "#20272f");
      r(-64, -4, 128, 52, "#475569");
      r(-64, -4, 128, 4, "#94a3b8");
      for (let i = -6; i <= 6; i++) {
        r(i * 10 - 4, -12, 8, 10, "#475569");
        r(i * 10 - 2, -12, 4, 3, "#cbd5e1");
      }
      r(-50, 14, 100, 8, "#1a202c");

      // Massive Front Left Barbican Tower
      r(-82, -44, 26, 88, "#1e293b");
      r(-78, -40, 22, 84, "#475569");
      r(-72, -40, 10, 84, "#64748b");
      roof([[-84, -48], [-68, -82], [-52, -48]], roofBaseColor);
      roof([[-68, -82], [-68, -48], [-52, -48]], roofHighlightColor);
      r(-69, -88, 2, 6, "#ffd700");

      // Massive Front Right Barbican Tower
      r(56, -44, 26, 88, "#1e293b");
      r(56, -40, 22, 84, "#475569");
      r(62, -40, 10, 84, "#64748b");
      roof([[52, -48], [68, -82], [84, -48]], roofBaseColor);
      roof([[68, -82], [68, -48], [84, -48]], roofHighlightColor);
      r(67, -88, 2, 6, "#ffd700");

      // Central Keep
      r(-32, -80, 64, 124, "#1a202c");
      r(-28, -76, 56, 120, "#475569");
      r(-10, -76, 32, 120, "#64748b");
      r(-30, -88, 60, 10, "#334155");
      roof([[-36, -86], [0, -135], [36, -86]], mainRoofBaseColor);
      roof([[0, -135], [0, -86], [36, -86]], mainRoofHighlightColor);
      r(-2, -141, 4, 6, "#ffd700");

      // Stained Glass Windows
      r(-72, -14, 8, 14, "#1a202c"); r(-71, -12, 6, 10, "#d97706"); r(-70, -10, 4, 6, "#fef08a");
      r(64, -14, 8, 14, "#1a202c"); r(65, -12, 6, 10, "#d97706"); r(66, -10, 4, 6, "#fef08a");
      r(-16, -56, 10, 18, "#1a202c"); r(-14, -54, 6, 14, "#d97706"); r(-13, -52, 4, 10, "#fef08a");
      r(6, -56, 10, 18, "#1a202c"); r(8, -54, 6, 14, "#d97706"); r(9, -52, 4, 10, "#fef08a");

      // Grand Entryway
      r(-22, 10, 44, 38, "#1e293b"); r(-18, 14, 36, 34, "#334155"); r(-14, 18, 28, 30, "#0b0f19");
      r(-14, 18, 14, 30, "#5c2505"); r(0, 18, 14, 30, "#7c2d12");
      for (let dy = 22; dy <= 42; dy += 8) {
        r(-10, dy, 2, 2, "#ffd700"); r(-5, dy, 2, 2, "#ffd700");
        r(4, dy, 2, 2, "#ffd700"); r(9, dy, 2, 2, "#ffd700");
      }
      for (let i = -12; i <= 12; i += 6) r(i, 18, 2, 12, "#334155");

      // Climbing Ivy
      r(-80, 20, 4, 24, "#15803d"); r(-77, 26, 5, 18, "#16a34a");
      r(76, 16, 4, 28, "#15803d"); r(72, 22, 5, 22, "#16a34a");
    }
    else if (emblem === "eagle" || emblem === "anchor") {
      // --- STYLE 2: ANCIENT GREEK/ROMAN TEMPLE (Eagle) ---
      // Crepidoma
      r(-76, 32, 152, 12, "#dfd8c4");
      r(-76, 32, 4, 12, "#b2a895");
      r(72, 32, 4, 12, "#b2a895");
      r(-70, 22, 140, 10, "#eae5d8");
      r(-64, 14, 128, 8, "#fdfbf7");

      // Cella
      r(-48, -46, 96, 60, "#d5cbb8");
      r(-14, -20, 28, 34, "#2d1f10"); r(-10, -18, 20, 32, "#b45309"); r(-1, -18, 2, 32, "#5c2505");

      // Left Tower
      r(-76, -26, 16, 76, "#eae5d8"); r(-76, -26, 6, 76, "#b2a895"); r(-74, -36, 12, 10, "#d5cbb8");
      roof([[-78, -36], [-68, -58], [-68, -36]], roofBaseColor);
      roof([[-68, -58], [-68, -36], [-58, -36]], roofHighlightColor);
      r(-69, -62, 2, 4, "#ffd700");

      // Right Tower
      r(60, -26, 16, 76, "#eae5d8"); r(60, -26, 6, 76, "#b2a895"); r(62, -36, 12, 10, "#d5cbb8");
      roof([[58, -36], [68, -58], [68, -36]], roofBaseColor);
      roof([[68, -58], [68, -36], [78, -36]], roofHighlightColor);
      r(67, -62, 2, 4, "#ffd700");

      // Columns
      const columns = [-48, -29, -10, 9, 28, 47];
      columns.forEach((offset) => {
        r(offset - 1, 12, 10, 2, "#b2a895");
        r(offset, -40, 8, 52, "#fdfbf7");
        r(offset + 4, -40, 4, 52, "#e5dec9");
        r(offset - 2, -43, 12, 3, "#fcf9f2");
      });

      // Entablature
      r(-54, -49, 108, 6, "#fdfbf7");
      r(-54, -53, 108, 4, "#eae5d8");
      for (let dx = -50; dx <= 50; dx += 10) r(dx - 1, -53, 2, 4, "#d97706");

      // Pediment
      r(-58, -55, 116, 2, "#ffd700");
      roof([[-58, -53], [0, -85], [0, -53]], mainRoofBaseColor);
      roof([[0, -85], [0, -53], [58, -53]], mainRoofHighlightColor);
      roof([[-48, -53], [0, -80], [0, -53]], "#7c2d12");
      roof([[0, -80], [0, -53], [48, -53]], "#d97706");
      ctx.fillStyle = "#ffd700"; ctx.beginPath(); ctx.arc(x, y - 61 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      r(-57, -59, 2, 6, "#ffd700"); r(55, -59, 2, 6, "#ffd700"); r(-2, -92, 4, 7, "#ffd700");

      // Vines
      r(-62, 18, 4, 32, "#15803d"); r(-58, 26, 6, 22, "#16a34a");
      r(54, 12, 4, 38, "#15803d"); r(48, 22, 6, 28, "#16a34a");
    }
    else if (emblem === "dragon") {
      // --- STYLE 3: EAST ASIAN DYNASTIC PAGODA (Dragon) ---
      r(-76, 26, 152, 18, "#2d3748");
      r(-70, 18, 140, 8, "#4a5568");
      r(-16, 18, 32, 16, "#1a202c");
      r(-12, 22, 24, 12, "#718096");

      // Side Walls and gates
      r(-66, -10, 132, 28, "#edf2f7");
      r(-50, -4, 12, 22, "#1a202c"); r(-48, -2, 8, 20, "#7b241c");
      r(38, -4, 12, 22, "#1a202c"); r(40, -2, 8, 20, "#7b241c");

      // First Pagoda Roof Tier (Curved flared roof)
      roof([[-74, -10], [0, -28], [74, -10], [60, -6], [0, -18], [-60, -6]], roofBaseColor);
      roof([[0, -28], [0, -18], [74, -10]], roofHighlightColor);
      r(-74, -13, 3, 4, "#ffd700");
      r(71, -13, 3, 4, "#ffd700");

      // Second Tier Chamber
      r(-36, -56, 72, 38, "#edf2f7");
      r(-32, -56, 5, 38, "#991b1b");
      r(-16, -56, 5, 38, "#991b1b");
      r(11, -56, 5, 38, "#991b1b");
      r(27, -56, 5, 38, "#991b1b");
      r(-8, -46, 16, 20, "#1a202c");
      r(-6, -44, 12, 18, "#ffd700");
      r(-2, -44, 4, 18, "#78350f");

      // Second Pagoda Roof Tier
      roof([[-44, -56], [0, -78], [44, -56], [32, -52], [0, -66], [-32, -52]], mainRoofBaseColor);
      roof([[0, -78], [0, -66], [44, -56]], mainRoofHighlightColor);
      r(-44, -59, 3, 4, "#ffd700");
      r(41, -59, 3, 4, "#ffd700");

      // Top Tier Sanctuary
      r(-18, -94, 36, 28, "#edf2f7");
      r(-16, -94, 4, 28, "#991b1b");
      r(12, -94, 4, 28, "#991b1b");
      r(-4, -86, 8, 12, "#1a202c");
      r(-3, -85, 6, 10, "#ffd700");

      // Top Pagoda Roof
      roof([[-24, -94], [0, -120], [24, -94], [18, -91], [0, -104], [-18, -91]], roofBaseColor);
      roof([[0, -120], [0, -104], [24, -94]], roofHighlightColor);
      r(-2, -128, 4, 8, "#ffd700");
    }
    else if (emblem === "lion" || emblem === "tree") {
      // --- STYLE 4: NORDIC VIKING LONGHOUSE (Lion) ---
      r(-80, 36, 160, 14, "rgba(0,0,0,0.4)");
      
      // Outer Log Palisades
      for (let i = -70; i <= 70; i += 8) {
        r(i - 3, 8, 6, 32, "#4a3728");
        r(i - 1, 8, 2, 28, "#78583e");
        roof([[i - 3, 8], [i, -2], [i + 3, 8]], "#36261c");
      }
      r(-74, 18, 148, 4, "#2f231a");
      r(-74, 28, 148, 4, "#2f231a");

      // Center wooden gatehouse
      r(-16, -2, 32, 42, "#2f231a");
      r(-12, 2, 24, 38, "#5c4033");
      r(-8, 12, 16, 28, "#1a202c");
      r(-8, 12, 8, 28, "#78583e");
      r(0, 12, 8, 28, "#8c6210");

      // Main Longhouse Keep
      r(-48, -48, 96, 68, "#3a2a1c");
      r(-44, -44, 88, 64, "#5c4033");
      r(-40, -44, 6, 64, "#2f231a");
      r(-18, -44, 6, 64, "#2f231a");
      r(12, -44, 6, 64, "#2f231a");
      r(34, -44, 6, 64, "#2f231a");

      // Thatch Roof (steep A-frame)
      roof([[-54, -44], [0, -96], [54, -44]], "#8c6210");
      roof([[0, -96], [0, -44], [54, -44]], "#b48a30");
      
      // Dragon head gables
      roof([[-54, -44], [-62, -54], [-52, -50]], "#8c6210");
      roof([[54, -44], [62, -54], [52, -50]], "#b48a30");

      // Watchtower behind longhouse
      r(18, -78, 22, 40, "#2f231a");
      r(20, -74, 18, 36, "#5c4033");
      r(18, -84, 22, 10, "#2f231a");
      r(20, -84, 3, 10, "#b48a30");
      r(37, -84, 3, 10, "#b48a30");
      roof([[16, -84], [29, -108], [42, -84]], "#8c6210");
      roof([[29, -108], [29, -84], [42, -84]], "#b48a30");
    }
    else if (emblem === "swords" || emblem === "mountain") {
      // --- STYLE 5: GOTHIC SPIRED CASTLE (Swords) ---
      r(-82, 44, 164, 18, "rgba(0,0,0,0.36)");

      // Center Spired Keep
      r(-24, -96, 48, 140, "#1f1d24");
      r(-20, -92, 40, 136, "#3a3542");
      r(-10, -92, 20, 136, "#534c5e");
      roof([[-28, -96], [0, -145], [28, -96]], roofBaseColor);
      roof([[0, -145], [0, -96], [28, -96]], roofHighlightColor);
      r(-1, -152, 2, 8, "#ffd700");

      // Left Spired Tower
      r(-68, -48, 20, 92, "#1f1d24");
      r(-64, -44, 16, 88, "#3a3542");
      r(-60, -44, 8, 88, "#534c5e");
      roof([[-72, -48], [-58, -88], [-44, -48]], mainRoofBaseColor);
      roof([[-58, -88], [-58, -48], [-44, -48]], mainRoofHighlightColor);
      r(-59, -94, 2, 6, "#ffd700");

      // Right Spired Tower
      r(48, -48, 20, 92, "#1f1d24");
      r(48, -44, 16, 88, "#3a3542");
      r(52, -44, 8, 88, "#534c5e");
      roof([[44, -48], [58, -88], [72, -48]], mainRoofBaseColor);
      roof([[58, -88], [58, -48], [72, -48]], mainRoofHighlightColor);
      r(57, -94, 2, 6, "#ffd700");

      // Gothic Wall with pointed windows
      r(-48, 0, 96, 44, "#27242c");
      r(-44, -4, 88, 48, "#3a3542");
      r(-36, 6, 8, 22, "#1a202c"); r(-35, 8, 6, 18, "#a855f7");
      r(28, 6, 8, 22, "#1a202c"); r(27, 8, 6, 18, "#a855f7");

      // Gate
      r(-14, 16, 28, 28, "#1f1d24");
      r(-10, 20, 20, 24, "#0b0f19");
      for (let i = -8; i <= 8; i += 4) r(i, 20, 1.5, 24, "#b45309");
    }
    else {
      // --- STYLE 6: FORTIFIED BASTION / CITADEL (Default Shield / AI Factions) ---
      r(-86, 44, 172, 18, "rgba(0,0,0,0.45)");

      // Low Thick Stone Ramparts
      r(-76, 2, 152, 42, "#2d3748");
      r(-72, -2, 144, 46, "#4a5568");
      r(-72, -2, 144, 5, "#718096");
      for (let dx = -66; dx <= 66; dx += 12) {
        r(dx - 1, 10, 2, 2, "#1a202c");
        r(dx - 1, 26, 2, 2, "#1a202c");
      }

      // Left Front Bastion Wall
      r(-78, -12, 34, 56, "#2d3748");
      r(-74, -10, 30, 54, "#4a5568");
      r(-74, -10, 30, 4, "#718096");
      r(-76, -18, 34, 8, "#1a202c");
      r(-72, -18, 6, 8, "#94a3b8");
      r(-52, -18, 6, 8, "#94a3b8");

      // Right Front Bastion Wall
      r(44, -12, 34, 56, "#2d3748");
      r(44, -10, 30, 54, "#4a5568");
      r(44, -10, 30, 4, "#718096");
      r(42, -18, 34, 8, "#1a202c");
      r(46, -18, 6, 8, "#94a3b8");
      r(66, -18, 6, 8, "#94a3b8");

      // Central Heavy Keep
      r(-36, -46, 72, 90, "#1a202c");
      r(-32, -42, 64, 86, "#334155");
      r(-32, -42, 64, 5, "#475569");
      r(-16, 6, 32, 38, "#1a202c");
      r(-12, 10, 24, 34, "#475569");
      r(-1, 10, 2, 34, "#1a202c");

      // Heavy Cannon
      r(-6, -58, 12, 16, "#1a202c");
      r(-4, -56, 8, 14, "#475569");
      r(-2, -62, 4, 6, "#0f172a");
    }

    // 10. Flagpole and Big Waving Banner (AoE Style)
    const fy = y - 131 * s;
    const fs = 0.98;
    const flagR = (dx: number, dy: number, w: number, h: number, color: string) => pxRect(x + dx * fs, fy + dy * fs, w * fs, h * fs, color);

    // Flagpole (Bronze rod)
    flagR(-1, -44, 2, 44, "#7c2d12");
    
    // Wave calculations
    const wave = Math.round(Math.sin(state.tick * 0.15) * 3);
    const wave2 = Math.round(Math.sin(state.tick * 0.15 + 1.2) * 3);

    // Waving Banner (with gold fringes)
    flagR(1, -43, 28, 18, flagColor); 
    flagR(29, -40 + wave, 10, 13, flagColor); 
    flagR(39, -37 + wave2, 8, 8, flagColor);  

    // Gold borders/fret lines on flag
    flagR(1, -43, 28, 1.5, "#ffd700");
    flagR(1, -26.5, 28, 1.5, "#ffd700");

    drawFlagEmblem(x + 15 * fs, fy - 34 * fs, emblem, 1.2 * fs);
  }

  function drawRelationRing(x: number, y: number, ownerType: "own" | "ally" | "enemy", scale = 1) {
    ctx.save();
    
    let strokeColor, fillColor;
    if (ownerType === 'own') {
      strokeColor = "#00f0ff"; // Electric Royal Cyan
      fillColor = "rgba(0, 240, 255, 0.30)";
    } else if (ownerType === 'ally') {
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

  function resolveCastleEmblem(ownerName?: string, regionId?: number, explicitEmblem?: string): string {
    const validStyles = ["crown", "eagle", "dragon", "lion", "swords", "shield", "tree", "mountain", "anchor"];
    if (explicitEmblem && validStyles.includes(explicitEmblem)) {
      return explicitEmblem;
    }
    if (regionId !== undefined && state.regionOwnerEmblems[regionId] && validStyles.includes(state.regionOwnerEmblems[regionId])) {
      return state.regionOwnerEmblems[regionId];
    }
    const seed = String(ownerName || (regionId !== undefined ? `region-${regionId}` : "castle"));
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return validStyles[hash % validStyles.length];
  }

  function drawAllianceMiniEmblem(cx: number, cy: number, emblem: string, scale = 1) {
    const s = scale;
    const r = (dx: number, dy: number, w: number, h: number, color: string) => pxRect(cx + dx * s, cy + dy * s, w * s, h * s, color);
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

  function drawAllianceBadge(x: number, y: number, tag: string, emblem: string, scale = 1) {
    if (!tag) return;
    const s = scale;
    const cleanTag = String(tag).slice(0, 6).toUpperCase();
    const w = Math.max(54, cleanTag.length * 12 + 30) * s;
    const h = 24 * s;
    pxRect(x - w / 2 + 3 * s, y + 3 * s, w, h, "rgba(0,0,0,0.45)");
    pxRect(x - w / 2, y, w, h, "rgba(6,14,20,0.96)");
    ctx.strokeStyle = "#57d3ff";
    ctx.lineWidth = 2 * s;
    ctx.strokeRect(Math.round(x - w / 2), Math.round(y), Math.round(w), Math.round(h));
    drawAllianceMiniEmblem(x - w / 2 + 14 * s, y + 12 * s, emblem || "shield", s);
    text(cleanTag, x + 9 * s, y + 7 * s, 22 * s, "#dff7ff", "center");
  }

  function drawCastle(t) {
    const castleRegionId = regionAtCoords(t.x, t.y);
    const castleLand = castleRegionId >= 0 ? landById(castleRegionId) : null;
    const drawX = castleLand ? castleLand.x : t.x;
    const drawY = castleLand ? castleLand.y : t.y;
    const owner = factions[t.owner] || factions[0];

    // Draw relationship ring
    let relation: "own" | "ally" | "enemy" = 'enemy';
    if (t.owner === 0) {
      relation = 'own';
    } else if (t.owner === 2 || t.owner === 4 || t.owner === 6) {
      relation = 'ally';
    }
    drawRelationRing(drawX, drawY, relation, 0.7);

    const sel = t.id === state.selected;
    if (sel) {
      ctx.save();
      ctx.shadowColor = "#ffe85a";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(255, 230, 90, 0.35)";
      ctx.beginPath();
      ctx.ellipse(drawX, drawY + 24, 48, 16, 0, 0, TAU);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffe24a";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -state.tick * 15;
      ctx.stroke();
      ctx.restore();
    }
    const regionId = castleRegionId;
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
    const emblem = resolveCastleEmblem(ownerName, regionId >= 0 ? regionId : undefined, rawEmblem);
    drawEmpireCastleSprite(drawX, drawY, flagColor, emblem, 0.7, relation);

    pxRect(drawX - 15, drawY + 32, 30, 24, "#121921");
    ctx.strokeStyle = "#384756";
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX - 15, drawY + 32, 30, 24);
    text(String(t.lvl), drawX, drawY + 35, 18, "#ffffff", "center");

    // Draw Castle Name Plate
    const nameText = cleanOwnerName(ownerName, t.owner === 0 ? 1 : 2, regionId);
    const textSz = 34;
    
    ctx.save();
    ctx.font = `bold ${textSz}px "Courier New", monospace`;
    const tw = ctx.measureText(nameText).width || 80;
    const padX = 16;
    const padY = 8;
    const bx = drawX - tw / 2 - padX;
    const by = drawY - 170;
    const bw = tw + padX * 2;
    const bh = textSz + padY * 2;

    // Drop shadow
    pxRect(bx + 4, by + 4, bw, bh, "rgba(0,0,0,0.48)");
    // Plate body
    pxRect(bx, by, bw, bh, "#111827");
    pxRect(bx + 4, by + 4, bw - 8, 5, "rgba(255,255,255,0.16)");
    // Border matches flag color
    ctx.strokeStyle = flagColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    // Corner rivets
    pxRect(bx + 1, by + 1, 2, 2, "#ffd700");
    pxRect(bx + bw - 3, by + 1, 2, 2, "#ffd700");
    pxRect(bx + 1, by + bh - 3, 2, 2, "#ffd700");
    pxRect(bx + bw - 3, by + bh - 3, 2, 2, "#ffd700");

    ctx.restore();
    text(nameText, drawX, by + padY + 1, textSz, t.owner === 0 ? "#ffd34d" : "#e2e8f0", "center");

    const activeBattle = state.activeBattles?.find((b: any) => b.townId === t.id);
    if (activeBattle) {
      drawDualFlagBattle(drawX, drawY, activeBattle.attackerOwner ?? 1, t.owner, t.id);
    }
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

  function drawDualFlagBattle(x: number, y: number, attackerOwner: number, defenderOwner: number, territoryId?: number) {
    ctx.save();
    const localFlagColor = state.newbieFlagColor || "#ef4444";
    const attColor = attackerOwner === 0 ? localFlagColor : (factions[attackerOwner]?.color || "#ef4444");
    const defColor = territoryId != null && state.regionOwnerFlagColors?.[territoryId] ? state.regionOwnerFlagColors[territoryId] : (factions[defenderOwner]?.color || "#3b82f6");
    const animPulse = Math.sin(state.tick * 8) * 3;
    const by = y - 155 + animPulse;
    const CX = x;

    // ─── SMOKE PUFFS ────────────────────────────────────────────────────────
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + state.tick * 0.35;
      const t = Math.max(0, ((state.tick * 0.85 + i * 0.25) % 1 + 1) % 1);
      ctx.fillStyle = `rgba(200, 200, 210, ${(1 - t) * 0.5})`;
      ctx.beginPath();
      ctx.arc(CX + Math.cos(angle) * t * 36, by - 20 + Math.sin(angle) * t * 30, Math.max(0, 6 + t * 18), 0, Math.PI * 2);
      ctx.fill();
    }

    // ─── CROSSED SWORDS ─────────────────────────────────────────────────────
    const swordVib = Math.sin(state.tick * 14) * 0.07;
    for (const dir of [1, -1]) {
      ctx.save();
      ctx.translate(CX, by - 20);
      ctx.rotate(dir * (0.62 + swordVib));
      pxRect(-42, -4, 84, 8, "#cbd5e1");
      pxRect(-42, -4, 84, 2, "#ffffff");
      pxRect(22, -10, 6, 20, "#d4af37");
      pxRect(28, -3, 14, 6, "#5c4033");
      pxRect(42, -5, 6, 10, "#ffd700");
      ctx.restore();
    }

    // ─── SPARK PARTICLES ─────────────────────────────────────────────────────
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - state.tick * 1.6;
      const t = Math.max(0, ((state.tick * 2.6 + i * 0.17) % 1 + 1) % 1);
      const sz = Math.max(1, (1 - t) * 7);
      const col = t < 0.25 ? "#fff" : t < 0.55 ? "#ffd700" : t < 0.8 ? "#f97316" : "#ef4444";
      pxRect(CX + Math.cos(angle) * t * 48 - sz / 2, by - 20 + Math.sin(angle) * t * 40 - sz / 2, sz, sz, col);
    }

    // ─── SHOCKWAVE RING ───────────────────────────────────────────────────────
    const wT = Math.max(0, ((state.tick * 1.4) % 1 + 1) % 1);
    ctx.strokeStyle = `rgba(255, 224, 80, ${(1 - wT) * 0.85})`;
    ctx.lineWidth = Math.max(0.1, 4 * (1 - wT));
    ctx.beginPath();
    ctx.arc(CX, by - 20, Math.max(0, wT * 58), 0, Math.PI * 2);
    ctx.stroke();

    // ─── FLAG PANELS (attacker LEFT, defender RIGHT) ──────────────────────────
    const drawFlagPanel = (px: number, color: string, flip: boolean) => {
      ctx.save();
      ctx.translate(px, by - 18);
      ctx.rotate(flip ? 0.18 : -0.18);
      pxRect(-2, -48, 4, 60, "#3e2723");
      const fx = flip ? 2 : -40;
      pxRect(fx, -48, 38, 24, color);
      pxRect(fx, -48, 38, 4, "rgba(255,255,255,0.4)");
      pxRect(flip ? 2 : -40, -48, 4, 24, "rgba(255,255,255,0.2)");
      ctx.restore();
    };
    drawFlagPanel(CX - 70, attColor, true);
    drawFlagPanel(CX + 70, defColor, false);

    ctx.restore();
  }

  function drawTroopFootRing(x: number, y: number, color: string) {
    ctx.save();
    const pulse = 1 + Math.sin(state.tick * 6) * 0.08;
    const ringColor = color || "#00f0ff";
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = 10;
    
    // Clear 3D glowing foot ring fill
    ctx.fillStyle = ringColor === "#00f0ff" || ringColor.includes("2563eb") ? "rgba(0, 240, 255, 0.35)" : "rgba(239, 68, 68, 0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 22 * pulse, 8 * pulse, 0, 0, TAU);
    ctx.fill();

    // Outer glowing dashed ring
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 3]);
    ctx.lineDashOffset = -state.tick * 12;
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 22 * pulse, 8 * pulse, 0, 0, TAU);
    ctx.stroke();

    ctx.restore();
  }

  function drawPixelInfantry(x: number, y: number, color: string, emblem = "crown") {
    ctx.save();
    drawTroopFootRing(x, y, color);

    const step = Math.round(Math.sin(state.tick * 10) * 2);
    // Shadow under feet
    pxRect(x - 12, y + 8, 24, 5, "rgba(0,0,0,0.32)");

    // Legs in steel armor
    pxRect(x - 5 + step, y + 1, 4, 10, "#334155");
    pxRect(x + 1 - step, y + 1, 4, 10, "#334155");

    // Body armor (Plated Steel Chestplate)
    pxRect(x - 7, y - 12, 14, 14, "#475569");
    pxRect(x - 5, y - 10, 10, 11, "#94a3b8");
    pxRect(x - 3, y - 9, 6, 8, color);

    // Left Arm & Shield with Gold Border
    pxRect(x - 14, y - 12, 7, 14, color);
    pxRect(x - 15, y - 12, 1.5, 14, "#ffd700");
    pxRect(x - 8, y - 12, 1.5, 14, "#ffd700");

    // Helmet & Visor
    pxRect(x - 5, y - 20, 10, 8, "#64748b");
    pxRect(x - 6, y - 18, 12, 3, "#1e293b"); // Visor slit
    pxRect(x - 2, y - 24, 4, 4, color); // Helmet Crest / Plume

    // Tall Spear / Flagpole held in Right Hand
    const flagX = x + 8;
    const flagY = y - 32;
    pxRect(flagX, y - 36, 3, 46, "#78350f"); // Spear shaft
    pxRect(flagX - 1, y - 40, 5, 5, "#cbd5e1"); // Spear tip

    // Waving Banner with User's Color & Emblem
    const wave = Math.round(Math.sin(state.tick * 0.15) * 2.5);
    pxRect(flagX + 3, flagY + wave, 20, 12, color);
    pxRect(flagX + 3, flagY + wave, 20, 1.5, "#ffd700");
    pxRect(flagX + 3, flagY + wave + 10.5, 20, 1.5, "#ffd700");
    drawFlagEmblem(flagX + 13, flagY + wave + 6, emblem, 0.85);

    ctx.restore();
  }

  function drawPixelCavalry(x: number, y: number, color: string, emblem = "crown") {
    ctx.save();
    drawTroopFootRing(x, y, color);

    const bob = Math.round(Math.sin(state.tick * 8) * 1.5);
    const leg = Math.round(Math.sin(state.tick * 12) * 1.5);

    // Shadow under horse
    pxRect(x - 16, y + 10, 32, 6, "rgba(0,0,0,0.32)");

    // Horse Body (Chestnut Warhorse)
    pxRect(x - 14, y - 4 + bob, 28, 12, "#78350f");
    pxRect(x - 18, y - 10 + bob, 10, 11, "#5c2505"); // Horse head
    pxRect(x + 12, y - 6 + bob, 7, 7, "#5c2505"); // Tail

    // Horse legs
    pxRect(x - 13 + leg, y + 7, 3.5, 8, "#3b1705");
    pxRect(x - 5 - leg, y + 7, 3.5, 8, "#3b1705");
    pxRect(x + 3 + leg, y + 7, 3.5, 8, "#3b1705");
    pxRect(x + 11 - leg, y + 7, 3.5, 8, "#3b1705");

    // Saddle / Caparison in User Color
    pxRect(x - 6, y - 6 + bob, 13, 8, color);
    pxRect(x - 5, y - 5 + bob, 11, 2, "#ffd700");

    // Mounted Knight Rider
    pxRect(x - 4, y - 15 + bob, 9, 10, "#475569");
    pxRect(x - 3, y - 21 + bob, 8, 6, "#94a3b8"); // Helmet
    pxRect(x - 1, y - 23 + bob, 4, 2, color); // Plume

    // Knight's Lance with User's Flag Banner & Emblem
    const flagX = x + 7;
    const flagY = y - 30 + bob;
    pxRect(flagX, y - 32 + bob, 3, 44, "#78350f"); // Lance
    pxRect(flagX - 1, y - 36 + bob, 5, 5, "#cbd5e1"); // Spear tip

    const wave = Math.round(Math.sin(state.tick * 0.15) * 2.5);
    pxRect(flagX + 3, flagY + wave, 18, 11, color);
    pxRect(flagX + 3, flagY + wave, 18, 1.5, "#ffd700");
    pxRect(flagX + 3, flagY + wave + 9.5, 18, 1.5, "#ffd700");
    drawFlagEmblem(flagX + 12, flagY + wave + 5.5, emblem, 0.75);

    ctx.restore();
  }

  function drawPixelArtillery(x: number, y: number, color: string, emblem = "crown") {
    ctx.save();
    drawTroopFootRing(x, y, color);

    const recoil = Math.round(Math.sin(state.tick * 7) * 1.5);
    pxRect(x - 16, y + 10, 32, 6, "rgba(0,0,0,0.32)");

    // Cannon Wheels
    pxRect(x - 15, y + 1, 8, 8, "#451a03");
    pxRect(x + 8, y + 1, 8, 8, "#451a03");
    pxRect(x - 13, y + 3, 4, 4, "#94a3b8");
    pxRect(x + 10, y + 3, 4, 4, "#94a3b8");

    // Cannon Carriage / Base
    pxRect(x - 14, y - 3, 28, 6, "#78350f");

    // Heavy Cannon Barrel
    pxRect(x - 3 + recoil, y - 12, 22, 8, "#1e293b");
    pxRect(x + 18 + recoil, y - 11, 7, 6, "#0f172a");
    pxRect(x - 5 + recoil, y - 10, 5, 4, "#b45309");

    // Muzzle Flash
    pxRect(x + 25 + recoil, y - 11, 5, 5, "#f59e0b");
    pxRect(x + 28 + recoil, y - 10, 3, 3, "#fef08a");

    // Flagpole behind Cannon
    const flagX = x - 11;
    const flagY = y - 28;
    pxRect(flagX, y - 30, 3, 38, "#78350f");
    const wave = Math.round(Math.sin(state.tick * 0.15) * 2.5);
    pxRect(flagX + 3, flagY + wave, 18, 11, color);
    pxRect(flagX + 3, flagY + wave, 18, 1.5, "#ffd700");
    pxRect(flagX + 3, flagY + wave + 9.5, 18, 1.5, "#ffd700");
    drawFlagEmblem(flagX + 12, flagY + wave + 5.5, emblem, 0.75);

    ctx.restore();
  }

  function drawVoyageShip(x, y, color) {
    ctx.save();
    pxRect(x - 24, y + 16, 48, 8, "rgba(0,0,0,0.34)");
    pxRect(x - 20, y + 5, 40, 14, "#4a2912");
    pxRect(x - 14, y + 16, 28, 6, "#211106");
    pxRect(x - 2, y - 24, 5, 32, "#2b1709");
    pxRect(x + 3, y - 20, 24, 18, "#f7ead0");
    pxRect(x - 16, y - 8, 16, 14, "#eee0c2");
    pxRect(x + 4, y - 34, 20, 11, color);
    pxRect(x + 20, y - 30, 6, 5, color);
    ctx.restore();
  }

  function renderTroopSprites(x: number, y: number, v: any, factionColor: string) {
    const hasInfantry = v.infantry && v.infantry > 0;
    const hasCavalry = v.cavalry && v.cavalry > 0;
    const hasArtillery = v.artillery && v.artillery > 0;

    const ownerName = v.ownerName || (v.owner === 0 ? (state.localPlayerName || "BẠN") : undefined);
    const explicitEmblem = v.owner === 0 ? state.newbieEmblem : (v.sourceRegionId !== undefined ? state.regionOwnerEmblems[v.sourceRegionId] : undefined);
    const emblem = resolveCastleEmblem(ownerName, v.sourceRegionId, explicitEmblem);
    const troopColor = v.owner === 0 ? (state.newbieFlagColor || "#00f0ff") : factionColor;

    ctx.save();
    // Scale 1.5x for bold, crystal-clear troop visibility on the world map
    const pulse = 1.5 * (1 + Math.sin(state.tick * 8) * 0.04);
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);

    if (hasInfantry && hasCavalry && hasArtillery) {
      drawPixelCavalry(-16, -4, troopColor, emblem);
      drawPixelInfantry(14, -2, troopColor, emblem);
      drawPixelArtillery(0, 14, troopColor, emblem);
    } else if (hasInfantry && hasCavalry) {
      drawPixelCavalry(-12, -4, troopColor, emblem);
      drawPixelInfantry(12, 0, troopColor, emblem);
    } else if (hasInfantry && hasArtillery) {
      drawPixelInfantry(-12, -2, troopColor, emblem);
      drawPixelArtillery(12, 10, troopColor, emblem);
    } else if (hasCavalry && hasArtillery) {
      drawPixelCavalry(-12, -4, troopColor, emblem);
      drawPixelArtillery(12, 10, troopColor, emblem);
    } else if (hasInfantry) {
      drawPixelInfantry(0, 0, troopColor, emblem);
    } else if (hasCavalry) {
      drawPixelCavalry(0, 0, troopColor, emblem);
    } else if (hasArtillery) {
      drawPixelArtillery(0, 0, troopColor, emblem);
    } else {
      drawPixelInfantry(0, 0, troopColor, emblem);
    }

    ctx.restore();
  }

  function drawPortIcon(x: number, y: number) {
    pxRect(x - 8, y - 4, 16, 8, "#5c3d2e");
    pxRect(x - 6, y - 8, 3, 5, "#3d271d");
    pxRect(x + 3, y - 8, 3, 5, "#3d271d");
    pxRect(x - 4, y - 3, 8, 2, "#948270");
    text("⚓ CẢNG", x, y - 10, 9, "#ffd34d", "center");
  }

  function voyageRouteColors(v: any) {
    const isAlliance = v.relation === "ally" || v.alliance === true || v.ownerType === "ally";
    if (isAlliance) return { main: "rgba(59, 130, 246, 0.94)", glow: "rgba(59, 130, 246, 0.24)" };
    if (v.owner === 0) return { main: "rgba(34, 197, 94, 0.94)", glow: "rgba(34, 197, 94, 0.24)" };
    return { main: "rgba(239, 68, 68, 0.94)", glow: "rgba(239, 68, 68, 0.24)" };
  }

  function strokeVoyagePath(v: any, drawPath: () => void) {
    const colors = voyageRouteColors(v);
    ctx.save();
    ctx.setLineDash([]);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 9;
    ctx.strokeStyle = colors.glow;
    drawPath();
    ctx.stroke();
    ctx.setLineDash([12, 9]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = colors.main;
    drawPath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawVoyages() {
    state.voyages.forEach((v) => {
      const t = Math.min(1, v.t / v.duration);
      const factionColor = factions[v.owner ?? 0]?.color || factions[0].color;
      
      if (v.crossingSea) {
        const sPort = v.sourcePort || { x: lerp(v.from.x, v.to.x, 0.2), y: lerp(v.from.y, v.to.y, 0.2) };
        const tPort = v.targetPort || { x: lerp(v.from.x, v.to.x, 0.8), y: lerp(v.from.y, v.to.y, 0.8) };
        const ctrl = v.control || { x: (sPort.x + tPort.x) / 2, y: (sPort.y + tPort.y) / 2 };

        // Render Port Icons at coastal water edges
        drawPortIcon(sPort.x, sPort.y);
        drawPortIcon(tPort.x, tPort.y);

        // Path line: land (from -> sPort), sea curve (sPort -> tPort), land (tPort -> to)
        strokeVoyagePath(v, () => {
          ctx.beginPath();
          ctx.moveTo(v.from.x, v.from.y);
          ctx.lineTo(sPort.x, sPort.y);
          ctx.quadraticCurveTo(ctrl.x, ctrl.y, tPort.x, tPort.y);
          ctx.lineTo(v.to.x, v.to.y);
        });

        if (t <= 0.20) {
          // Phase 1: Land March from interior source town to coastal departure port
          const p = t / 0.20;
          const xLand = lerp(v.from.x, sPort.x, p);
          const yLand = lerp(v.from.y, sPort.y, p);
          renderTroopSprites(xLand, yLand, v, factionColor);
        } else if (t <= 0.80) {
          // Phase 2: Pure Sea Voyage on Transport Ship (from sPort to tPort along ctrl in ocean)
          const seaP = (t - 0.20) / 0.60;
          const xSea = (1 - seaP) * (1 - seaP) * sPort.x + 2 * (1 - seaP) * seaP * ctrl.x + seaP * seaP * tPort.x;
          const ySea = (1 - seaP) * (1 - seaP) * sPort.y + 2 * (1 - seaP) * seaP * ctrl.y + seaP * seaP * tPort.y;
          drawVoyageShip(xSea, ySea, factionColor);
        } else {
          // Phase 3: Ship remains anchored at coastal arrival port in water, troops disembark & march to interior target town
          drawVoyageShip(tPort.x, tPort.y, factionColor);

          const landP = (t - 0.80) / 0.20;
          const xLand = lerp(tPort.x, v.to.x, landP);
          const yLand = lerp(tPort.y, v.to.y, landP);
          renderTroopSprites(xLand, yLand, v, factionColor);
        }
      } else {
        // Straight line land march
        const x = lerp(v.from.x, v.to.x, t);
        const y = lerp(v.from.y, v.to.y, t);

        strokeVoyagePath(v, () => {
          ctx.beginPath();
          ctx.moveTo(v.from.x, v.from.y);
          ctx.lineTo(v.to.x, v.to.y);
        });

        renderTroopSprites(x, y, v, factionColor);
      }
    });
  }

  function getNearestPlayerTown(targetX: number, targetY: number) {
    const playerTowns = towns.filter((t) => t.owner === 0);
    if (playerTowns.length === 0) return null;
    let nearest = playerTowns[0];
    let minD = Math.hypot(targetX - nearest.x, targetY - nearest.y);
    for (let i = 1; i < playerTowns.length; i++) {
      const d = Math.hypot(targetX - playerTowns[i].x, targetY - playerTowns[i].y);
      if (d < minD) {
        minD = d;
        nearest = playerTowns[i];
      }
    }
    return nearest;
  }

  function settlerOriginForRegion(regionId: number) {
    const r = landById(regionId);
    if (!r) return { originTownId: null, originX: 0, originY: 0, x: 0, y: 0, fromCamp: true };
    const nearestTown = getNearestPlayerTown(r.x, r.y);
    if (nearestTown) {
      return { originTownId: nearestTown.id, originX: nearestTown.x, originY: nearestTown.y, x: nearestTown.x, y: nearestTown.y, fromCamp: false };
    }
    const ox = r.x - Math.min(120, Math.max(45, (r.rx || r.r || 100) * 0.42));
    const oy = r.y + Math.min(70, Math.max(24, (r.ry || r.r || 80) * 0.18));
    return { originTownId: null, originX: ox, originY: oy, x: ox, y: oy, fromCamp: true };
  }

  function campOriginForRegion(regionId: number) {
    const r = landById(regionId);
    if (!r) return { originTownId: null, originX: 0, originY: 0, x: 0, y: 0, fromCamp: true };
    const ox = r.x - Math.min(120, Math.max(45, (r.rx || r.r || 100) * 0.42));
    const oy = r.y + Math.min(70, Math.max(24, (r.ry || r.r || 80) * 0.18));
    return { originTownId: null, originX: ox, originY: oy, x: ox, y: oy, fromCamp: true };
  }

  function settlerRouteForRegion(origin: any, regionId: number) {
    const r = landById(regionId);
    if (!r) return { requiresShip: false };
    const source = { x: origin.x, y: origin.y };
    const sourceRegionId = regionAtCoords(source.x, source.y);
    const crossesSea = segmentTouchesSea(source, r);
    if (!crossesSea || landTravelAllowed(sourceRegionId, regionId)) {
      return { requiresShip: false };
    }
    const seaRoute = findBestSeaRoute(sourceRegionId, regionId, source, r);
    if (seaRoute.error || !seaRoute.sourcePort || !seaRoute.targetPort || !seaRoute.control) {
      return { requiresShip: true, blocked: true };
    }
    return {
      requiresShip: true,
      sourcePort: seaRoute.sourcePort,
      targetPort: seaRoute.targetPort,
      control: seaRoute.control,
    };
  }

  function seaEntryExitPoints(a: { x: number; y: number }, b: { x: number; y: number }) {
    const steps = Math.max(24, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 28));
    let firstSea: { x: number; y: number } | null = null;
    let lastSea: { x: number; y: number } | null = null;
    for (let i = 1; i < steps; i++) {
      const p = i / steps;
      const point = { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p) };
      if (regionAtCoords(point.x, point.y) < 0) {
        if (!firstSea) firstSea = point;
        lastSea = point;
      }
    }
    return {
      sourcePort: firstSea || { x: lerp(a.x, b.x, 0.22), y: lerp(a.y, b.y, 0.22) },
      targetPort: lastSea || { x: lerp(a.x, b.x, 0.78), y: lerp(a.y, b.y, 0.78) },
    };
  }

  function drawSettlerForRegion(regionId: number) {
    const r = landById(regionId);
    if (!r) return;
    const travel = state.settlerTravel?.targetRegionId === regionId ? state.settlerTravel : null;
    const rawProgress = travel?.returning ? (travel.returnProgress || 0) : (state.regionClearing[regionId] || 0);
    const p = travel?.returning ? Math.max(0, 1 - Math.min(1, rawProgress)) : Math.min(1, rawProgress);

    const timing = state.activeClearingTimings?.[regionId];
    const isMine = timing?.playerId && timing.playerId === state.localPlayerId;
    const origin = travel?.active
      ? { x: travel.originX ?? r.x, y: travel.originY ?? r.y, fromCamp: travel.originTownId === null || travel.originTownId === undefined }
      : isMine ? settlerOriginForRegion(regionId) : campOriginForRegion(regionId);
    const route = settlerRouteForRegion(origin, regionId);
    if (route.blocked) return;

    if (route.requiresShip) {
      strokeVoyagePath({ owner: 0, relation: "ally" }, () => {
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(route.sourcePort.x, route.sourcePort.y);
        ctx.quadraticCurveTo(route.control.x, route.control.y, route.targetPort.x, route.targetPort.y);
        ctx.lineTo(r.x, r.y);
      });
      drawPortIcon(route.sourcePort.x, route.sourcePort.y);
      drawPortIcon(route.targetPort.x, route.targetPort.y);
    } else {
      // Draw golden travel route from nearest town to target region
      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 211, 77, 0.6)";
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
      ctx.restore();
    }

    if (origin.fromCamp) {
      drawBush(origin.x, origin.y, 0.75);
      drawTree(origin.x + 6, origin.y - 4, 0.65);
    }

    // Interpolated settler position. If crossing sea, he boards a ship instead of walking through water.
    let x = lerp(origin.x, r.x, p);
    let y = lerp(origin.y, r.y, p);
    let onShip = false;
    if (route.requiresShip && route.sourcePort && route.targetPort && route.control) {
      if (p <= 0.22) {
        const landP = p / 0.22;
        x = lerp(origin.x, route.sourcePort.x, landP);
        y = lerp(origin.y, route.sourcePort.y, landP);
        onShip = false;
      } else if (p <= 0.78) {
        const seaP = (p - 0.22) / 0.56;
        x = (1 - seaP) * (1 - seaP) * route.sourcePort.x + 2 * (1 - seaP) * seaP * route.control.x + seaP * seaP * route.targetPort.x;
        y = (1 - seaP) * (1 - seaP) * route.sourcePort.y + 2 * (1 - seaP) * seaP * route.control.y + seaP * seaP * route.targetPort.y;
        onShip = true;
      } else {
        const landP = (p - 0.78) / 0.22;
        x = lerp(route.targetPort.x, r.x, landP);
        y = lerp(route.targetPort.y, r.y, landP);
        onShip = false;
      }
    }

    // Work animation at target land when near completion (MUST be on land, NOT on ship!)
    if (!travel?.returning && p > 0.85) {
      onShip = false;
      const workP = (p - 0.85) / 0.15;
      x = r.x - 20 + workP * 40 + Math.sin(state.tick * 6) * 3;
      y = r.y + Math.sin(state.tick * 9) * 2;
    }

    const walk = Math.round(Math.sin(state.tick * 10) * 2);
    const bob = Math.round(Math.sin(state.tick * 8) * 1.5);
    const flagColor = state.newbieFlagColor || "#2563eb";

    if (onShip) {
      drawVoyageShip(x, y, flagColor);
      text("NÔNG DÂN ĐI THUYỀN", x, y - 72, 14, "#dbeafe", "center");
      return;
    }

    // Settler shadow
    pxRect(x - 13, y + 14, 26, 6, "rgba(0,0,0,0.28)");

    // Flag pole held in both hands
    pxRect(x + 6, y - 33 + bob, 3, 47, "#5c351a");
    pxRect(x + 9, y - 33 + bob, 28, 17, flagColor);
    pxRect(x + 33, y - 27 + bob, 7, 6, flagColor);
    pxRect(x + 9, y - 17 + bob, 31, 3, "rgba(0,0,0,0.35)");
    drawFlagEmblem(x + 23, y - 24 + bob, state.newbieEmblem || "crown", 0.55);

    // Legs and boots
    pxRect(x - 6 + walk, y + 6, 4, 10, "#3a2a1f");
    pxRect(x + 2 - walk, y + 6, 4, 10, "#3a2a1f");
    pxRect(x - 8 + walk, y + 15, 7, 3, "#21150d");
    pxRect(x + 1 - walk, y + 15, 7, 3, "#21150d");

    // Body, satchel and arms
    pxRect(x - 7, y - 10 + bob, 14, 17, "#7c4a22");
    pxRect(x - 5, y - 8 + bob, 10, 13, "#c18445");
    pxRect(x - 9, y - 6 + bob, 4, 10, "#d19a68");
    pxRect(x + 5, y - 6 + bob, 4, 10, "#d19a68");
    pxRect(x - 10, y - 3 + bob, 5, 5, "#5c351a");
    pxRect(x + 6, y - 3 + bob, 5, 5, "#5c351a");
    pxRect(x - 10, y - 7 + bob, 4, 11, "#5b351c");

    // Head, hair and straw hat
    pxRect(x - 4, y - 18 + bob, 8, 8, "#d6a06a");
    pxRect(x - 5, y - 21 + bob, 10, 4, "#5c351a");
    pxRect(x - 11, y - 24 + bob, 22, 4, "#e5c46b");
    pxRect(x - 7, y - 29 + bob, 14, 6, "#b98538");
    pxRect(x - 4, y - 31 + bob, 8, 3, "#f0d989");

    // 3D Clearing Progress & Countdown Badge above settler
    const dur = clearingDuration(r);
    let remainingSec = Math.max(0, Math.ceil((1 - p) * dur));
    if (timing?.completesAt) {
      const completesMs = typeof timing.completesAt === "number" ? timing.completesAt : new Date(timing.completesAt).getTime();
      if (Number.isFinite(completesMs)) {
        remainingSec = Math.max(0, Math.ceil((completesMs - Date.now()) / 1000));
      }
    }
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const pctStr = travel?.returning ? "VỀ" : `${Math.round(p * 100)}%`;

    const bw = 92;
    const bh = 22;
    const by = y - 48 + bob;
    
    pxRect(x - bw / 2 + 2, by + 2, bw, bh, "rgba(0, 0, 0, 0.45)");
    pxRect(x - bw / 2, by, bw, bh, "rgba(9, 18, 28, 0.95)");
    ctx.strokeStyle = "#ffd34d";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(Math.round(x - bw / 2), Math.round(by), bw, bh);

    // Mini Progress fill inside badge
    pxRect(x - bw / 2 + 3, by + bh - 4, (bw - 6) * p, 3, "#10b981");

    // Dynamic Text display
    text(`⏳ ${timeStr} (${pctStr})`, x, by + 12, 11, "#ffd34d", "center");
  }

  function getNewbieShieldRemainingMs() {
    const until = state.newbieShieldUntil || Number(localStorage.getItem("island_empire_newbie_shield_until") || 0);
    if (!until) return 0;
    const remaining = until - Date.now();
    return Math.max(0, remaining);
  }

  function formatShieldTimer(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function drawNewbiePeaceShield(x: number, y: number, sc: number, remainingMs: number) {
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
    const grad = ctx.createRadialGradient(x, centerY - domeR * 0.3, 4, x, centerY, domeR);
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
    ctx.strokeRect(Math.round(x - badgeW / 2), Math.round(badgeY), Math.round(badgeW), Math.round(badgeH));

    // Shield Emblem & Timer Text
    text("🛡️ BẢO VỆ TÂN THỦ", x, badgeY + 9 * sc, 14 * sc, "#38bdf8", "center");
    text(`⏱️ ${timeStr}`, x, badgeY + 21 * sc, 13 * sc, "#fbbf24", "center");

    ctx.restore();
  }

  function cleanOwnerName(rawName: any, ownerCode: number, regionId: number): string {
    const rawTag = state.regionOwnerAllianceTags[regionId];
    const tag = rawTag && typeof rawTag === "string" && /^[A-Za-z0-9]{2,8}$/.test(rawTag) && !/^\d+$/.test(rawTag)
      ? `[${rawTag.toUpperCase()}] `
      : "";

    if (ownerCode === 1) {
      const myName = state.localPlayerName || "BẠN";
      return `${tag}${myName}`.toUpperCase();
    }

    if (!rawName) return `${tag}NGƯỜI CHƠI`.toUpperCase();

    let str = String(rawName).trim();
    if (str.toLowerCase().startsWith("guest:")) str = str.slice(6);
    if (str.toLowerCase().startsWith("player:")) str = str.slice(7);

    // Format raw Mongo DB IDs or numeric IDs nicely into readable player names (e.g. "USER 2121" instead of raw DB string)
    if (/^[0-9a-fA-F]{8,}$/.test(str)) {
      str = `LÃNH CHÚA ${str.slice(0, 6).toUpperCase()}`;
    } else if (/^\d{8,}$/.test(str)) {
      str = `LÃNH CHÚA ${str.slice(0, 6)}`;
    }

    return `${tag}${str}`.toUpperCase();
  }

  function drawTerritoryFlagMarker(x: number, y: number, color: string, label: string, relation: string, sc: number) {
    ctx.save();
    const ratio = sc / 0.7;
    const flagCol = relation === "own" ? "#00f0ff" : relation === "ally" ? "#10b981" : color;

    // Flag Pole
    pxRect(x - 2 * ratio, y - 25 * sc, 4 * ratio, 36 * sc, "#334155");

    // Banner Flag
    pxRect(x + 2 * ratio, y - 25 * sc, 26 * ratio, 16 * sc, flagCol);
    pxRect(x + 2 * ratio, y - 25 * sc, 26 * ratio, 3 * sc, "rgba(255, 255, 255, 0.4)");
    pxRect(x + 2 * ratio, y - 9 * sc, 26 * ratio, 3 * sc, "rgba(0, 0, 0, 0.3)");

    // Label Badge below flag
    const lbl = label.slice(0, 14);
    const tw = Math.max(70, lbl.length * 10 + 16) * ratio;
    const th = 22 * sc;

    pxRect(x - tw / 2 + 2, y + 12 * sc + 2, tw, th, "rgba(0, 0, 0, 0.4)");
    pxRect(x - tw / 2, y + 12 * sc, tw, th, "rgba(9, 18, 28, 0.9)");
    ctx.strokeStyle = flagCol;
    ctx.lineWidth = 1.5 * ratio;
    ctx.strokeRect(Math.round(x - tw / 2), Math.round(y + 12 * sc), Math.round(tw), Math.round(th));

    text(lbl, x, y + 18 * sc, 16 * sc, relation === "own" ? "#7dd3fc" : "#fff3d2", "center");
    ctx.restore();
  }

  function drawTerritoryCastle(regionId, ownerCode, ownerName) {
    const r = landById(regionId);
    if (!r) return;

    // Center castle inside territory polygon using optimal non-overlapping position
    const townInRegion = towns.find((t) => regionAtCoords(t.x, t.y) === regionId);
    const pt = townInRegion ? { x: townInRegion.x, y: townInRegion.y } : getOptimalTownCenter(regionId);
    const x = pt.x;
    const y = pt.y;

    const relation = getRegionAllianceRelation(regionId, ownerCode, ownerName);
    const sc = r.isIslet ? 0.35 : 0.52;
    const color = ownerCode === 1 
      ? (state.newbieFlagColor || "#2f70d7") 
      : (state.regionOwnerFlagColors[regionId] || (relation === "ally" ? "#10b981" : "#ef4444"));

    const rawTag = state.regionOwnerAllianceTags[regionId];
    const allianceTag = rawTag && typeof rawTag === "string" && /^[A-Za-z0-9]{2,8}$/.test(rawTag) && !/^\d+$/.test(rawTag)
      ? rawTag.toUpperCase()
      : "";
    const allianceEmblem = state.regionOwnerAllianceEmblems[regionId] || "shield";

    const cleanLabel = cleanOwnerName(ownerName, ownerCode, regionId);

    // For Player (ownerCode === 1): Render Castle ONLY on Capital Town (townInRegion)
    // For Opponents (ownerCode > 1): Render Castle Sprite for all opponent bases!
    const isCastleTerritory = ownerCode === 1 ? Boolean(townInRegion) : ownerCode > 1;

    if (!isCastleTerritory) {
      drawRelationRing(x, y, relation, sc * 0.7);
      drawTerritoryFlagMarker(x, y, color, cleanLabel, relation, sc);
      return;
    }

    // Capital Town: Render full Imperial Castle Sprite, Peace Shield & Nameplate!
    drawRelationRing(x, y, relation, sc);

    // Draw the castle sprite with scaled size
    const rawEmblem = ownerCode === 1 ? state.newbieEmblem : state.regionOwnerEmblems[regionId];
    const emblem = resolveCastleEmblem(ownerName, regionId, rawEmblem);
    drawEmpireCastleSprite(x, y, color, emblem, sc, relation);

    // Render 3D Peace Shield Energy Dome & Countdown Timer for Protected Town
    if (ownerCode === 1) {
      const shieldMs = getNewbieShieldRemainingMs();
      if (shieldMs > 0) {
        drawNewbiePeaceShield(x, y, sc, shieldMs);
      }
    }

    const label = cleanLabel.slice(0, 18);
    
    // Proportional scaling for nameplate
    const baseW = Math.max(116, label.length * 16 + 26);
    const w = baseW * (sc / 0.7);
    const h = 60 * sc;
    const ratio = sc / 0.7;

    const conflict = getRegionBattleState(regionId);

    if (conflict) {
      // Red Danger Warning Banner above castle
      pxRect(x - 76 * ratio, y + 44 * sc, 152 * ratio, 22 * sc, "#450a0a");
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5 * ratio;
      ctx.strokeRect(Math.round(x - 76 * ratio), Math.round(y + 44 * sc), Math.round(152 * ratio), Math.round(22 * sc));
      text(conflict.label, x, y + 49 * sc, 23 * sc, "#fca5a5", "center");
    } else if (ownerCode === 1) {
      // Royal Kingdom Crown Banner above nameplate with Cyan & Gold
      pxRect(x - 72 * ratio, y + 44 * sc, 144 * ratio, 22 * sc, "#0f172a");
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 2 * ratio;
      ctx.strokeRect(Math.round(x - 72 * ratio), Math.round(y + 44 * sc), Math.round(144 * ratio), Math.round(22 * sc));
      text("👑 THÀNH TRÌ BẠN", x, y + 49 * sc, 23 * sc, "#7dd3fc", "center");
    } else if (relation === "ally") {
      // Gold-Yellow Alliance Crown Banner
      pxRect(x - 72 * ratio, y + 44 * sc, 144 * ratio, 22 * sc, "#2d240d");
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2 * ratio;
      ctx.strokeRect(Math.round(x - 72 * ratio), Math.round(y + 44 * sc), Math.round(144 * ratio), Math.round(22 * sc));
      text("🤝 CÙNG LIÊN MINH", x, y + 49 * sc, 23 * sc, "#fef08a", "center");
    } else if (ownerCode > 1) {
      // Crimson Red Enemy Crown Banner
      pxRect(x - 72 * ratio, y + 44 * sc, 144 * ratio, 22 * sc, "#2d1212");
      ctx.strokeRect(Math.round(x - 72 * ratio), Math.round(y + 44 * sc), Math.round(144 * ratio), Math.round(22 * sc));
      text("👑 THÀNH TRÌ ĐỊCH", x, y + 49 * sc, 23 * sc, "#fca5a5", "center");
    }

    pxRect(x - w / 2 + 4 * ratio, y + 70 * sc + 5 * ratio, w, h, "rgba(0,0,0,0.42)");
    pxRect(x - w / 2, y + 70 * sc, w, h, "rgba(9,18,28,0.92)");
    pxRect(x - w / 2 + 7 * ratio, y + 70 * sc + 6 * ratio, w - 14 * ratio, 6 * ratio, "rgba(255,255,255,0.14)");
    ctx.strokeStyle = conflict ? "#ef4444" : (ownerCode === 1 ? "#00f0ff" : "#d85a4c");
    ctx.lineWidth = (conflict || ownerCode === 1) ? 3 * ratio : 2 * ratio;
    ctx.strokeRect(Math.round(x - w / 2), Math.round(y + 70 * sc), Math.round(w), h);
    pxRect(x - w / 2 + 7 * ratio, y + 70 * sc + 8 * ratio, 6 * ratio, 6 * ratio, ownerCode === 1 ? "#00f0ff" : "#f8d15a");
    pxRect(x + w / 2 - 13 * ratio, y + 70 * sc + 8 * ratio, 6 * ratio, 6 * ratio, ownerCode === 1 ? "#00f0ff" : "#f8d15a");
    text(label, x, y + 83 * sc, 40 * sc, ownerCode === 1 ? "#e0f2fe" : "#fff3d2", "center");
    if (allianceTag) {
      drawAllianceBadge(x - w / 2 - 38 * ratio, y + 74 * sc, allianceTag, allianceEmblem, Math.max(0.42, sc * 0.86));
    }

    const activeBattle = state.activeBattles?.find((b: any) => b.regionId === regionId);
    if (activeBattle) {
      const defenderOwner = ownerCode === 1 ? 0 : Math.max(1, ownerCode || 1);
      drawDualFlagBattle(x, y, activeBattle.attackerOwner ?? 1, defenderOwner, regionId);
    }
  }

  function drawClaimedTerritoryMarkers() {
    Object.keys(state.regionOwnership).forEach((key) => {
      const regionId = Number(key);
      const ownerCode = derivedRegionOwnership(regionId);
      if (!ownerCode) return;
      drawTerritoryCastle(regionId, ownerCode, state.regionOwnerNames[regionId]);
    });
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
    const hulls = [
      [
        [450, 62], [612, 72], [752, 150], [840, 272], [884, 420], [980, 562],
        [912, 704], [778, 824], [618, 892], [468, 840], [330, 748], [260, 602],
        [206, 450], [254, 300], [328, 172],
      ],
      [
        [390, 900], [560, 846], [736, 862], [930, 940], [1060, 1078], [1010, 1240],
        [830, 1338], [628, 1362], [448, 1278], [310, 1152], [286, 1020],
      ],
      [
        [866, 254], [1036, 274], [1116, 398], [1048, 520], [904, 530], [810, 420],
      ],
      [
        [936, 632], [1108, 690], [1110, 842], [1002, 950], [862, 918], [812, 774],
      ],
      [
        [1002, 1032], [1142, 1112], [1100, 1260], [952, 1302], [870, 1194],
      ],
      [
        [1260, 130], [1510, 92], [1770, 164], [1995, 326], [2080, 542], [1960, 680],
        [1708, 626], [1480, 574], [1282, 430], [1206, 252],
      ],
      [
        [1238, 684], [1460, 646], [1748, 674], [2028, 764], [2120, 936], [1960, 1168],
        [1682, 1206], [1390, 1082], [1190, 894],
      ],
      [
        [1058, 1374], [1278, 1280], [1588, 1308], [1884, 1380], [2108, 1548],
        [1810, 1588], [1372, 1542], [1110, 1500],
      ],
    ];
    hulls.length = 0;
    megaContinents.forEach((m, mi) => {
      const pts = [];
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * TAU;
        const seed = m.seed + i * 23;
        const wob = 0.84 + hash(seed) * 0.28 + Math.sin(a * 3 + m.seed) * 0.08;
        pts.push([m.x + Math.cos(a) * m.rx * wob, m.y + Math.sin(a) * m.ry * wob]);
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
    const margin = 200; // Thêm lề để không bị khuyết viền khi cuộn
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

  function isFastPanning() {
    return Boolean(state.drag) || Math.abs(panVelX) > 0.35 || Math.abs(panVelY) > 0.35 || minimapDragging;
  }

  function drawWorld() {
    const fastPan = isFastPanning();
    drawOcean();
    // drawRoutes(); // routes hidden
    ctx.save();
    ctx.translate((1 - state.zoom) * W * 0.48 + state.panX, (1 - state.zoom) * H * 0.48 + state.panY);
    ctx.scale(state.zoom, state.zoom);

    // Draw world space ocean texture & details (moves with pan/zoom)
    drawWorldOceanTexture();
    if (!fastPan) drawWorldOceanDetails();

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

    // Layer 2: continuous mainland foundation below all province polygons.
    drawStrategyContinentLayer(visibleRegions, visibleIslets);

    // Pass 0/1 only for standalone islets. Mainland territories sit on the shared land base,
    // otherwise every province draws its own coastline and the continent looks broken apart.
    visibleIslets.forEach(([r, id]) => drawRegion(r, id, 0, true));

    visibleIslets.forEach(([r, id]) => drawRegion(r, id, 1, true));

    // Pass 2: Draw main land bodies, terrain details and borders
    visibleIslets.forEach(([r, id]) => drawRegion(r, id, 2, true));
    visibleRegions.forEach(([r, id]) => drawRegion(r, id, 2, false));

    drawDecoration();
    drawVoyages();
    drawClaimedTerritoryMarkers();
    activeClearingRegionIds().forEach((regionId) => drawSettlerForRegion(regionId));
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

    // World Map Premium 3D Resource Sprites
    ctx.save();
    if (type === "gold") {
      // 3D Gold Ore Nuggets with sparkles
      // Base shadow
      pxRect(x - 12, y + 2, 24, 6, "rgba(0,0,0,0.22)");
      // Nugget 1
      pxRect(x - 10, y - 6, 12, 10, "#92400e");
      pxRect(x - 8, y - 8, 8, 10, "#d97706");
      pxRect(x - 6, y - 7, 4, 6, "#fbbf24");
      // Nugget 2
      pxRect(x + 1, y - 8, 10, 12, "#78350f");
      pxRect(x + 2, y - 10, 8, 10, "#f59e0b");
      pxRect(x + 3, y - 9, 5, 6, "#fef08a");
      // Nugget 3 (front center)
      pxRect(x - 4, y - 3, 10, 8, "#92400e");
      pxRect(x - 3, y - 4, 8, 8, "#fbbf24");
      pxRect(x - 1, y - 3, 4, 4, "#ffffff");
      // Sparkles
      pxRect(x - 14, y - 12, 2, 2, "#fef08a");
      pxRect(x + 14, y - 5, 2, 2, "#ffffff");
    }
    if (type === "wood") {
      // 3D Pile of logs tied with rope
      pxRect(x - 14, y + 2, 28, 5, "rgba(0,0,0,0.22)");
      // Log 1 (bottom left)
      pxRect(x - 12, y - 5, 12, 8, "#78350f");
      pxRect(x - 12, y - 5, 3, 8, "#fde68a"); // ring face
      pxRect(x - 11, y - 3, 1, 4, "#92400e");
      // Log 2 (bottom right)
      pxRect(x + 1, y - 5, 12, 8, "#78350f");
      pxRect(x + 10, y - 5, 3, 8, "#fde68a"); // ring face
      pxRect(x + 11, y - 3, 1, 4, "#92400e");
      // Log 3 (top middle)
      pxRect(x - 5, y - 11, 11, 8, "#92400e");
      pxRect(x - 5, y - 11, 3, 8, "#fef3c7"); // ring face
      pxRect(x - 4, y - 9, 1, 4, "#78350f");
      // Rope tie wraps
      pxRect(x - 4, y - 6, 2, 9, "#fbbf24");
      pxRect(x + 3, y - 6, 2, 9, "#fbbf24");
    }
    if (type === "stone") {
      // Layered Granite & Slate Stone Boulders with Crystal Veins
      pxRect(x - 13, y + 2, 26, 6, "rgba(0,0,0,0.22)");
      // Boulder 1
      pxRect(x - 11, y - 8, 12, 11, "#374151");
      pxRect(x - 9, y - 10, 8, 10, "#6b7280");
      pxRect(x - 7, y - 9, 4, 6, "#9ca3af");
      // Boulder 2
      pxRect(x + 1, y - 10, 11, 13, "#1f2937");
      pxRect(x + 2, y - 12, 9, 11, "#4b5563");
      pxRect(x + 4, y - 11, 5, 8, "#9ca3af");
      // Crystal Vein highlights
      pxRect(x - 3, y - 6, 8, 2, "#e5e7eb");
      pxRect(x + 5, y - 8, 4, 2, "#ffffff");
    }
    if (type === "gems") {
      // 3D Emerald Crystal Cluster
      pxRect(x - 10, y + 2, 20, 5, "rgba(0,0,0,0.25)");
      // Base obsidian rock
      pxRect(x - 8, y - 4, 16, 7, "#111827");
      // Crystal 1 (left pointing)
      pxRect(x - 7, y - 11, 6, 9, "#047857");
      pxRect(x - 6, y - 13, 4, 10, "#10b981");
      pxRect(x - 5, y - 12, 2, 6, "#a7f3d0");
      // Crystal 2 (main center vertical)
      pxRect(x - 2, y - 15, 6, 13, "#065f46");
      pxRect(x - 1, y - 18, 4, 15, "#10b981");
      pxRect(x, y - 17, 2, 10, "#ffffff");
      // Crystal 3 (right pointing)
      pxRect(x + 3, y - 9, 5, 8, "#047857");
      pxRect(x + 4, y - 11, 3, 9, "#34d399");
      // Glow sparkles
      pxRect(x - 11, y - 16, 2, 2, "#a7f3d0");
      pxRect(x + 10, y - 12, 2, 2, "#ffffff");
    }
    ctx.restore();
  }

  function drawTopBar() {
    panel(12, 12, 360, 62);
    ctx.save();
    ctx.beginPath();
    ctx.arc(57, 43, 31, 0, TAU);
    ctx.clip();
    pxRect(26, 12, 62, 62, "#76b94d");
    drawCastle({ x: 57, y: 45, lvl: 1, owner: 0, id: -1 });
    ctx.restore();
    ctx.strokeStyle = "#d6a134";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(57, 43, 32, 0, TAU);
    ctx.stroke();
    text("LV. 25", 112, 25, 20, "#ffe36e");
    pxRect(192, 26, 116, 20, "#071018");
    pxRect(198, 30, state.xp, 12, "#ffb83d");
    text("68%", 322, 25, 20, "#ffe36e");

    const gearX = W - 62 - 12;
    const startX = 420;
    const endX = gearX - 20;
    const availableWidth = endX - startX;
    const itemWidth = 150;
    const gap = (availableWidth - itemWidth * 4) / 3;

    const keys = ["gold", "wood", "stone", "gems"];
    const items = keys.map((key, i) => {
      const itemX = startX + i * (itemWidth + gap) + 40;
      return [key, itemX] as [string, number];
    });

    items.forEach(([key, x]) => {
      panel(x - 40, 12, 150, 54);
      drawResourceIcon(key, x - 12, 38);
      text(String(Math.floor(state.resources[key])), x + 22, 27, 23, "#fff3d2");
    });

    panel(gearX, 12, 62, 54);
    if (state.hover === "fullscreen") pxRect(gearX + 8, 20, 46, 38, "rgba(255,211,77,0.14)");
    drawGear(gearX + 31, 39);
  }

  function drawGear(x, y) {
    ctx.strokeStyle = "#fff0d0";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      pxRect(x + Math.cos(a) * 16 - 3, y + Math.sin(a) * 16 - 3, 6, 6, "#fff0d0");
    }
    ctx.fillStyle = "#102633";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, TAU);
    ctx.fill();
  }

  function getDynamicButtons() {
    const rightX = W - 134;
    return [
      { id: "army", x: 24, y: H - 230, w: 104, h: 86, label: "QUÂN ĐỘI" },
      { id: "build", x: 24, y: H - 130, w: 104, h: 86, label: "XÂY DỰNG" },
      { id: "research", x: 140, y: H - 130, w: 104, h: 86, label: "NGHIÊN CỨU" },
      { id: "treasure", x: rightX, y: 92, w: 110, h: 82, label: "BẢO VẬT" },
      { id: "ally", x: rightX, y: 186, w: 110, h: 82, label: "LIÊN MINH" },
      { id: "map", x: rightX, y: 280, w: 110, h: 82, label: "BẢN ĐỒ" },
      { id: "event", x: rightX, y: 374, w: 110, h: 82, label: "SỰ KIỆN" },
      { id: "home", x: rightX, y: 468, w: 110, h: 82, label: "THỦ ĐÔ" },
    ];
  }

  function drawSidePanels() {
    // Dynamically calculate mission values
    const ownedTowns = towns.filter((t) => t.owner === 0);
    const ownedTownsCount = ownedTowns.length;
    const ownedRegionsCount = state.regionOwnership.filter((o) => o === 1).length;
    const barracksCount = ownedTowns.reduce((a, t) => a + (t.buildings?.barracks || 0), 0);
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
    const voyageTroops = state.voyages.filter((v) => v.owner === 0).reduce((a, v) => a + v.power, 0);
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
      text(`THÀNH ${t.id} - ${factions[t.owner].name}`, 404, H - 90, 19, factions[t.owner].color);
      text(`CẤP ${t.lvl}  |  QUÂN ${t.troops}`, 404, H - 60, 16, "#fff3d2");
      text(state.toast, 610, H - 60, 15, "#ffd34d");
    }
  }

  function drawButton(b) {
    const hot = state.hover === b.id;
    panel(b.x, b.y, b.w, b.h);
    if (hot) pxRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16, "rgba(255,211,77,0.12)");
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
    else if (b.id === "zoomIn" || b.id === "zoomOut") text(b.label, cx, b.y + 12, 32, "#fff3d2", "center");
    if (!["zoomIn", "zoomOut"].includes(b.id)) text(b.label, cx, b.y + b.h - 28, 17, "#fff3d2", "center");
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
    if (state.settlerTravel?.returning && state.settlerTravel.targetRegionId >= 0) {
      ids.add(state.settlerTravel.targetRegionId);
    }
    Object.entries(state.activeClearingTimings || {}).forEach(([key, timing]: any) => {
      const id = Number(key);
      if (!Number.isFinite(id)) return;
      const progress = timing?.startedAt && timing?.completesAt
        ? timingProgress(timing.startedAt, timing.completesAt)
        : state.regionClearing[id] || 0;
      if (progress < 1) ids.add(id);
    });
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
      const a = -Math.PI / 2 + i / 10 * TAU;
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
        [450, 62], [612, 72], [752, 150], [840, 272], [884, 420], [980, 562],
        [912, 704], [778, 824], [618, 892], [468, 840], [330, 748], [260, 602],
        [206, 450], [254, 300], [328, 172],
      ],
      [
        [390, 900], [560, 846], [736, 862], [930, 940], [1060, 1078], [1010, 1240],
        [830, 1338], [628, 1362], [448, 1278], [310, 1152], [286, 1020],
      ],
      [
        [866, 254], [1036, 274], [1116, 398], [1048, 520], [904, 530], [810, 420],
      ],
      [
        [936, 632], [1108, 690], [1110, 842], [1002, 950], [862, 918], [812, 774],
      ],
      [
        [1002, 1032], [1142, 1112], [1100, 1260], [952, 1302], [870, 1194],
      ],
      [
        [1260, 130], [1510, 92], [1770, 164], [1995, 326], [2080, 542], [1960, 680],
        [1708, 626], [1480, 574], [1282, 430], [1206, 252],
      ],
      [
        [1238, 684], [1460, 646], [1748, 674], [2028, 764], [2120, 936], [1960, 1168],
        [1682, 1206], [1390, 1082], [1190, 894],
      ],
      [
        [1058, 1374], [1278, 1280], [1588, 1308], [1884, 1380], [2108, 1548],
        [1810, 1588], [1372, 1542], [1110, 1500],
      ],
      [
        [1280, 132], [1510, 96], [1768, 166], [1992, 326], [2078, 542], [1960, 680],
        [1708, 626], [1480, 574], [1282, 430], [1206, 252],
      ],
      [
        [1240, 686], [1460, 646], [1748, 674], [2024, 764], [2116, 936], [1960, 1168],
        [1682, 1206], [1390, 1082], [1190, 894],
      ],
      [
        [1058, 1374], [1278, 1280], [1588, 1308], [1884, 1380], [2108, 1548], [2014, 1776],
        [1710, 1844], [1372, 1818], [1110, 1680],
      ],
    ];
    hulls.length = 0;
    megaContinents.forEach((m, mi) => {
      const pts = [];
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * TAU;
        const seed = m.seed + i * 23;
        const wob = 0.84 + hash(seed) * 0.28 + Math.sin(a * 3 + m.seed) * 0.08;
        pts.push([m.x + Math.cos(a) * m.rx * wob, m.y + Math.sin(a) * m.ry * wob]);
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
        if (p > 0.84) pxRect(x, y, p > 0.9 ? 5 : 3, p > 0.9 ? 3 : 2, p > 0.9 ? "#b9b98d" : "#626d51");
      }
      ctx.restore();
    });
  }

  function drawWorldFullDeprecated() {
    drawOcean();
    // drawRoutes(); // routes hidden
    ctx.save();
    ctx.translate((1 - state.zoom) * W * 0.48 + state.panX, (1 - state.zoom) * H * 0.48 + state.panY);
    ctx.scale(state.zoom, state.zoom);

    // Pass 0: Draw shallow water foam for all islands
    islets.forEach((r) => drawRegion(r, r.id, 0, true));
    regions.forEach((r) => drawRegion(r, r.id, 0, false));

    // Pass 1: Draw sand rims and coast lines for all islands
    islets.forEach((r) => drawRegion(r, r.id, 1, true));
    regions.forEach((r) => drawRegion(r, r.id, 1, false));

    // Pass 2: Draw main land bodies, terrain details and borders
    islets.forEach((r) => drawRegion(r, r.id, 2, true));
    regions.forEach((r) => drawRegion(r, r.id, 2, false));

    drawDecoration();
    drawVoyages();
    drawClaimedTerritoryMarkers();
    activeClearingRegionIds().forEach((regionId) => drawSettlerForRegion(regionId));
    ctx.restore();
  }

  function mapToScreen(x, y) {
    return {
      x: x * state.zoom + (1 - state.zoom) * W * 0.48 + state.panX,
      y: y * state.zoom + (1 - state.zoom) * H * 0.48 + state.panY,
    };
  }

  function drawFrame() {
    drawWorld();
    const now = performance.now();
    if (!isFastPanning() || minimapDragging || now - lastMinimapDrawAt > 180) {
      drawMinimap();
      lastMinimapDrawAt = now;
    }
    // drawTopBar();
    // drawSidePanels();
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

  let minimapDragging = false;
  let lastMinimapDrawAt = 0;
  let uiOverlayActive = false;
  let lastOverlayFrameAt = 0;
  let lastOverlayUpdateAt = 0;
  
  function panToMinimapCoords(e) {
    if (!minimapCanvas) return;
    const rect = minimapCanvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (160 / rect.width);
    const my = (e.clientY - rect.top) * (120 / rect.height);
    // Map to world coordinates (0 to 24000, 0 to 18000)
    const worldX = Math.max(0, Math.min(24000, mx * 150));
    const worldY = Math.max(0, Math.min(18000, my * 150));
    
    // Center camera on this world coordinate
    state.panX = -worldX * state.zoom + W * 0.5 - (1 - state.zoom) * W * 0.48;
    state.panY = -worldY * state.zoom + H * 0.5 - (1 - state.zoom) * H * 0.48;
    clampPan();
    saveCamera();
  }

  const onMinimapMouseMove = (e) => {
    if (minimapDragging) panToMinimapCoords(e);
  };
  const onMinimapMouseUp = () => {
    minimapDragging = false;
    window.removeEventListener("mousemove", onMinimapMouseMove);
    window.removeEventListener("mouseup", onMinimapMouseUp);
  };
  const onMinimapMouseDown = (e) => {
    minimapDragging = true;
    panToMinimapCoords(e);
    window.addEventListener("mousemove", onMinimapMouseMove);
    window.addEventListener("mouseup", onMinimapMouseUp);
  };

  if (minimapCanvas) {
    minimapCanvas.addEventListener("mousedown", onMinimapMouseDown);
  }

  function drawMinimap() {
    if (!minimapCanvas || !minimapCtx) return;
    
    // Clear background (subtle radial ocean depth gradient)
    const oceanGrad = minimapCtx.createRadialGradient(80, 60, 10, 80, 60, 100);
    oceanGrad.addColorStop(0, "#104f75");
    oceanGrad.addColorStop(1, "#082f49");
    minimapCtx.fillStyle = oceanGrad;
    minimapCtx.fillRect(0, 0, 160, 120);

    // Draw tactical coordinate grid lines (every 3000 units: 3000, 6000, 9000)
    minimapCtx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    minimapCtx.lineWidth = 0.5;
    // Horizontal lines
    for (let gy = 40; gy < 120; gy += 40) {
      minimapCtx.beginPath();
      minimapCtx.moveTo(0, gy);
      minimapCtx.lineTo(160, gy);
      minimapCtx.stroke();
    }
    // Vertical lines
    for (let gx = 40; gx < 160; gx += 40) {
      minimapCtx.beginPath();
      minimapCtx.moveTo(gx, 0);
      minimapCtx.lineTo(gx, 120);
      minimapCtx.stroke();
    }
    
    // Draw all regions (continents)
    regions.forEach((r) => {
      minimapCtx.fillStyle = BIOME_COLORS[visualBiomeIndex(r, r.id, false)] || "#557a46";
      minimapCtx.beginPath();
      const mx = r.x / 150;
      const my = r.y / 150;
      const mrx = (r.rx || r.r) / 150 * 1.02;
      const mry = (r.ry || r.r * 0.78) / 150 * 1.02;
      minimapCtx.ellipse(mx, my, mrx, mry, 0, 0, TAU);
      minimapCtx.fill();
    });

    // Draw all islets
    islets.forEach((r) => {
      minimapCtx.fillStyle = BIOME_COLORS[visualBiomeIndex(r, r.id, true)] || "#557a46";
      minimapCtx.beginPath();
      const mx = r.x / 150;
      const my = r.y / 150;
      const mrx = (r.rx || r.r) / 150 * 0.82;
      const mry = (r.ry || r.r * 0.78) / 150 * 0.82;
      minimapCtx.ellipse(mx, my, mrx, mry, 0, 0, TAU);
      minimapCtx.fill();
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

    minimapCtx.strokeStyle = "#ffd34d"; // bright gold viewport boundary box
    minimapCtx.lineWidth = 1.5;
    minimapCtx.setLineDash([4, 2]);
    minimapCtx.strokeRect(vx, vy, vw, vh);
    minimapCtx.setLineDash([]);

    // Draw coordinate overlay panel at the bottom of the minimap
    const cx = Math.round(viewX + viewW / 2);
    const cy = Math.round(viewY + viewH / 2);

    minimapCtx.fillStyle = "rgba(7, 16, 24, 0.82)";
    minimapCtx.fillRect(0, 106, 160, 14);

    minimapCtx.fillStyle = "#ffd34d";
    minimapCtx.font = "bold 9px Courier New, monospace";
    minimapCtx.textAlign = "center";
    minimapCtx.fillText(`X:${cx} Y:${cy}`, 80, 116);

    // Draw user capital status indicator
    const playerCapital = towns.find(t => t.owner === 0);
    if (playerCapital) {
      minimapCtx.fillStyle = "#10b981";
      minimapCtx.font = "bold 8px Courier New, monospace";
      minimapCtx.textAlign = "left";
      minimapCtx.fillText("★ TA", 4, 12);
    }
  }

  function buttonAt(x, y) {
    return getDynamicButtons().find((b) => x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h);
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

  function pointInPolygon(px: number, py: number, polygon: Array<[number, number]>) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > py) !== (yj > py)) &&
          (px < (xj - xi) * (py - yi) / (yj - yi || 1) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function regionAtCoords(x: number, y: number): number {
    let bestRegion: { id: number; d: number } | null = null;
    regions.forEach((r) => {
      const brx = (r.rx || r.r || 180) * 1.35;
      const bry = (r.ry || (r.r || 180) * 0.78) * 1.35;
      if (x < r.x - brx || x > r.x + brx || y < r.y - bry || y > r.y + bry) return;
      const poly = getSharedRegionPolygon(r, r.id, false);
      if (pointInPolygon(x, y, poly)) {
        const d = Math.hypot(x - r.x, y - r.y);
        if (!bestRegion || d < bestRegion.d) bestRegion = { id: r.id, d };
      }
    });

    if (bestRegion !== null) return bestRegion.id;

    let bestIslet: { id: number; d: number } | null = null;
    islets.forEach((r) => {
      const brx = (r.rx || r.r || 120) * 1.05;
      const bry = (r.ry || (r.r || 120) * 0.78) * 1.05;
      if (x < r.x - brx || x > r.x + brx || y < r.y - bry || y > r.y + bry) return;
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

    const townsInRegion = towns.filter((t) => regionAtCoords(t.x, t.y) === regionId);
    if (townsInRegion.some((t) => t.owner === 0)) return 1;
    if (townsInRegion.length > 0) return 2;
    return 0;
  }

  function getOptimalTownCenter(regionId: number): { x: number; y: number } {
    const r = landById(regionId);
    if (!r) return { x: 0, y: 0 };

    const rx = r.rx || r.r || 100;
    const ry = r.ry || r.r * 0.78;

    // Check distance to all other regions to avoid overlapping borders
    const isPositionSafe = (px: number, py: number) => {
      if (regionAtCoords(px, py) !== regionId) return false;

      const otherLands = [...regions, ...islets];
      for (let i = 0; i < otherLands.length; i++) {
        const otherId = otherLands[i].id;
        if (otherId === regionId) continue;
        const o = otherLands[i];
        const dist = Math.hypot(px - o.x, py - o.y);
        const oRx = o.rx || o.r || 100;
        if (dist < oRx * 0.70) return false;
      }
      return true;
    };

    if (isPositionSafe(r.x, r.y)) {
      return { x: r.x, y: r.y };
    }

    let bestPoint = { x: r.x, y: r.y };
    let maxSafetyScore = -Infinity;

    const stepSize = Math.min(rx, ry) * 0.12;
    for (let radius = stepSize; radius <= Math.min(rx, ry) * 0.85; radius += stepSize) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const testX = r.x + Math.cos(angle) * radius;
        const testY = r.y + Math.sin(angle) * radius;

        if (regionAtCoords(testX, testY) === regionId) {
          let minNeighborDist = Infinity;
          const otherLands = [...regions, ...islets];
          for (let i = 0; i < otherLands.length; i++) {
            const otherId = otherLands[i].id;
            if (otherId === regionId) continue;
            const o = otherLands[i];
            const d = Math.hypot(testX - o.x, testY - o.y);
            if (d < minNeighborDist) minNeighborDist = d;
          }

          const centerDist = Math.hypot(testX - r.x, testY - r.y);
          const score = minNeighborDist - centerDist * 0.4;

          if (score > maxSafetyScore) {
            maxSafetyScore = score;
            bestPoint = { x: Math.round(testX), y: Math.round(testY) };
          }
        }
      }
    }

    return bestPoint;
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
      if (ownerCode === 0) {
        for (let i = towns.length - 1; i >= 0; i--) {
          const t = towns[i];
          if (regionAtCoords(t.x, t.y) === regionId || t.id === 9000 + regionId) {
            towns.splice(i, 1);
          }
        }
        return;
      }
      let hasTownInRegion = false;
      towns.forEach((town) => {
        const isMatch = regionAtCoords(town.x, town.y) === regionId || town.id === 9000 + regionId;
        if (!isMatch) return;
        hasTownInRegion = true;
        centerTownInRegion(town, regionId);
        if (ownerCode === 1) {
          town.owner = 0;
          town.troops = Math.max(town.troops || 0, 24);
          town.population = Math.max(town.population || 0, territoryStartingPopulation(regionId, 1));
        } else if (ownerCode > 1 && town.owner === 0) {
          town.owner = ownerCode;
        }
      });
      if (ownerCode === 1 && !hasTownInRegion) {
        ensureTownForRegion(regionId, 1);
      }
    });
  }

  function triggerSettlerClearing(canvasId) {
    const r = landById(canvasId);
    if (!r) return toast("KHÔNG TÌM THẤY MẢNH ĐẤT");
    if (derivedRegionOwnership(canvasId) !== 0) return toast("MẢNH ĐẤT NÀY ĐÃ CÓ CHỦ");
    state.selectedRegion = canvasId;
    if (state.newbieMode && state.newbiePhase === "select_land") {
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
    let town = towns.find((t) => regionAtCoords(t.x, t.y) === regionId);
    if (town) {
      normalizeTown(town);
      centerTownInRegion(town, regionId);
      town.owner = ownerCode === 1 ? 0 : Math.max(1, ownerCode || 2);
      town.troops = Math.max(town.troops || 0, ownerCode === 1 ? 24 : 72);
      town.population = Math.max(town.population || 0, territoryStartingPopulation(regionId, ownerCode));
      return town;
    }
    const pt = getOptimalTownCenter(regionId);
    town = {
      id: 9000 + regionId,
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
      const regionId = Number.isFinite(x) && Number.isFinite(y)
        ? regionAtCoords(x, y)
        : (Number.isInteger(snapshot?.id) && snapshot.id >= 9000 ? snapshot.id - 9000 : -1);
      if (regionId < 0 || derivedRegionOwnership(regionId) !== 1) return;
      const town = ensureTownForRegion(regionId, 1);
      if (!town) return;
      town.id = Number.isInteger(snapshot.id) ? snapshot.id : town.id;
      town.lvl = Math.max(1, Math.floor(Number(snapshot.lvl ?? snapshot.level ?? town.lvl ?? 1) || 1));
      town.troops = Math.max(0, Math.floor(Number(snapshot.troops ?? town.troops ?? 0) || 0));
      town.population = Math.max(0, Math.floor(Number(snapshot.population ?? town.population ?? 32) || 32));
      town.infantryCount = Math.max(0, Math.floor(Number(snapshot.infantryCount ?? town.infantryCount ?? town.troops ?? 0) || 0));
      town.cavalryCount = Math.max(0, Math.floor(Number(snapshot.cavalryCount ?? town.cavalryCount ?? 0) || 0));
      town.artilleryCount = Math.max(0, Math.floor(Number(snapshot.artilleryCount ?? town.artilleryCount ?? 0) || 0));
      town.buildings = { ...defaultBuildings(), ...(snapshot.buildings || town.buildings || {}) };
      town.storage = { ...defaultStorage(), ...(snapshot.storage || town.storage || {}) };
      centerTownInRegion(town, regionId);
    });
  }

  function spend(cost) {
    for (const key in cost) if (state.resources[key] < cost[key]) return false;
    for (const key in cost) state.resources[key] -= cost[key];
    return true;
  }

  function handleButton(id) {
    if (id === "zoomIn" || id === "zoomOut") return;
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
        state.zoom = FIXED_FAR_ZOOM;
        state.targetZoom = FIXED_FAR_ZOOM;
        state.panX = W / 2 - capital.x * state.zoom - (1 - state.zoom) * W * 0.48;
        state.panY = H / 2 - capital.y * state.zoom - (1 - state.zoom) * H * 0.48;
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
        launchVoyage(source, t, power, regionAtCoords(t.x, t.y), true, maxInfantry, 0, 0);
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
    const regionId = regionAtCoords(town.x, town.y);
    return regionId >= 0 && derivedRegionOwnership(regionId) === 1;
  }

  function sourceTown() {
    const selected = towns.find((it) => it.id === state.selected && isPlayerOwnedTown(it));
    if (selected) return selected;
    return towns.filter(isPlayerOwnedTown).sort((a, b) => b.troops - a.troops)[0];
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

  function segmentTouchesSea(a: { x: number; y: number }, b: { x: number; y: number }) {
    const steps = Math.max(12, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 42));
    for (let i = 1; i < steps; i++) {
      const p = i / steps;
      const x = lerp(a.x, b.x, p);
      const y = lerp(a.y, b.y, p);
      if (regionAtCoords(x, y) < 0) return true;
    }
    return false;
  }

  function segmentCrossesLand(a: { x: number; y: number }, b: { x: number; y: number }) {
    const steps = Math.max(12, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 42));
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

  function findCoastPortCandidates(regionId: number, toward: { x: number; y: number }, limit = 10) {
    const r = landById(regionId);
    if (!r) return [];
    const rx = r.rx || r.r || 120;
    const ry = r.ry || (r.r || 120) * 0.78;
    const baseAngle = Math.atan2(toward.y - r.y, toward.x - r.x);
    const candidates: { score: number; land: { x: number; y: number }; water: { x: number; y: number }; dir: { x: number; y: number } }[] = [];
    for (let i = 0; i < 96; i++) {
      const offset = (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 48);
      const a = baseAngle + offset;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const land = { x: r.x + dx * rx * 0.82, y: r.y + dy * ry * 0.82 };
      let firstWater: { x: number; y: number; distance: number } | null = null;
      for (const distance of [1.20, 1.32, 1.48, 1.68, 1.92, 2.25, 2.65, 3.15]) {
        const water = { x: r.x + dx * rx * distance, y: r.y + dy * ry * distance };
        if (isWaterAt(water.x, water.y)) {
          firstWater = { ...water, distance };
          break;
        }
      }
      if (!firstWater) continue;
      const coastBias = firstWater.distance <= 1.42 ? 0 : 0.35;
      const score = Math.abs(offset) + coastBias + Math.hypot(firstWater.x - toward.x, firstWater.y - toward.y) / 2400;
      candidates.push({ score, land, water: { x: firstWater.x, y: firstWater.y }, dir: { x: dx, y: dy } });
    }
    candidates.sort((a, b) => a.score - b.score);
    return candidates.slice(0, limit);
  }

  function findCoastPort(regionId: number, toward: { x: number; y: number }) {
    return findCoastPortCandidates(regionId, toward, 1)[0] || null;
  }

  function findSeaControlPoint(sourcePort: { x: number; y: number }, targetPort: { x: number; y: number }, sourceDir: { x: number; y: number }, targetDir: { x: number; y: number }) {
    const midX = (sourcePort.x + targetPort.x) / 2;
    const midY = (sourcePort.y + targetPort.y) / 2;
    const dx = targetPort.x - sourcePort.x;
    const dy = targetPort.y - sourcePort.y;
    const len = Math.hypot(dx, dy) || 1;
    const normals = [
      { x: -dy / len, y: dx / len },
      { x: dy / len, y: -dx / len },
      { x: sourceDir.x + targetDir.x, y: sourceDir.y + targetDir.y },
      { x: sourceDir.x, y: sourceDir.y },
      { x: targetDir.x, y: targetDir.y },
    ];
    const distances = [180, 280, 420, 620, 860, 1180, 1560, 2040];
    const validCurve = (control: { x: number; y: number }) => {
      for (let i = 1; i < 24; i++) {
        const p = i / 24;
        const x = (1 - p) * (1 - p) * sourcePort.x + 2 * (1 - p) * p * control.x + p * p * targetPort.x;
        const y = (1 - p) * (1 - p) * sourcePort.y + 2 * (1 - p) * p * control.y + p * p * targetPort.y;
        if (regionAtCoords(x, y) >= 0) return false;
      }
      return true;
    };
    for (const n of normals) {
      const nLen = Math.hypot(n.x, n.y) || 1;
      for (const d of distances) {
        const control = { x: midX + (n.x / nLen) * d, y: midY + (n.y / nLen) * d };
        if (validCurve(control)) return control;
      }
    }
    for (const d of distances) {
      for (let i = 0; i < 48; i++) {
        const a = (Math.PI * 2 * i) / 48;
        const control = { x: midX + Math.cos(a) * d, y: midY + Math.sin(a) * d };
        if (validCurve(control)) return control;
      }
    }
    return null;
  }

  function findBestSeaRoute(sourceRegionId: number, targetRegionId: number, sourcePoint: { x: number; y: number }, targetPoint: { x: number; y: number }) {
    const sourcePorts = findCoastPortCandidates(sourceRegionId, targetPoint, 14);
    const targetPorts = findCoastPortCandidates(targetRegionId, sourcePoint, 14);
    if (sourcePorts.length === 0) return { error: "source_port" };
    if (targetPorts.length === 0) return { error: "target_port" };
    let fallback = null;
    for (const sourceCoast of sourcePorts) {
      for (const targetCoast of targetPorts) {
        const control = findSeaControlPoint(sourceCoast.water, targetCoast.water, sourceCoast.dir, targetCoast.dir);
        const score = sourceCoast.score + targetCoast.score + Math.hypot(sourceCoast.water.x - targetCoast.water.x, sourceCoast.water.y - targetCoast.water.y) / 3200;
        const route = { sourceCoast, targetCoast, sourcePort: sourceCoast.water, targetPort: targetCoast.water, control, score };
        if (control) return route;
        if (!fallback || score < fallback.score) fallback = route;
      }
    }
    return fallback ? { ...fallback, error: "blocked" } : { error: "blocked" };
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
    if (!source || !targetLand) return { ok: false, message: "Không tìm thấy điểm xuất quân hoặc lãnh thổ đích", requiresShip: false };
    const targetPoint = { x: targetLand.x, y: targetLand.y };
    const sourceRegionId = regionAtCoords(source.x, source.y);
    if (landTravelAllowed(sourceRegionId, targetRegionId)) {
      return { ok: true, message: "Đường bộ trong cùng cụm lục địa hợp lệ", requiresShip: false };
    }
    const crossesSea = segmentTouchesSea(source, targetPoint);
    if (!crossesSea) return { ok: true, message: "Đường bộ hợp lệ", requiresShip: false };
    if (sourceRegionId < 0) {
      return { ok: false, message: "Không xác định được lãnh thổ xuất phát", requiresShip: true };
    }
    if (derivedRegionOwnership(sourceRegionId) !== 1) {
      return { ok: false, message: `Thành xuất quân đang nằm trên lãnh thổ #${sourceRegionId + 1} chưa thuộc về bạn trên server`, requiresShip: true };
    }
    const route = findBestSeaRoute(sourceRegionId, targetRegionId, source, targetPoint);
    if (route.error === "source_port") return { ok: false, message: "Lãnh thổ xuất phát chưa có bờ biển/cảng để đóng thuyền", requiresShip: true };
    if (route.error === "target_port") return { ok: false, message: "Đích không phải vùng ven biển, phải chiếm bờ biển trước", requiresShip: true };
    if (route.error === "blocked") return { ok: false, message: "Tuyến biển đang bị lục địa chắn, hãy chọn cảng/vùng ven biển khác gần đường biển hơn", requiresShip: true };
    return { ok: true, message: "Tuyến thuyền hợp lệ", requiresShip: true };
  }

  function launchVoyage(source, target, power, targetRegionId, isAttack, infantry = 0, cavalry = 0, artillery = 0, battleSide: "attacker" | "defender" | null = null, backendTiming: any = null) {
    if (!source || !target) return false;
    normalizeTown(source);
    if (!power || power <= 0) {
      toast("VUI LÒNG CHỌN QUÂN ĐỂ XUẤT BINH");
      return false;
    }
    const selectedUnitCount = Math.max(0, Math.floor((infantry || 0) + (cavalry || 0) + (artillery || 0))) || power;
    const availableUnitCount = Math.max(0, (source.infantryCount || 0) + (source.cavalryCount || 0) + (source.artilleryCount || 0));
    if (availableUnitCount <= 1 || selectedUnitCount >= availableUnitCount) {
      toast("THÀNH PHỐ KHÔNG ĐỦ QUÂN ĐỂ XUẤT BINH");
      return false;
    }
    if ((infantry || 0) > (source.infantryCount || 0) || (cavalry || 0) > (source.cavalryCount || 0) || (artillery || 0) > (source.artilleryCount || 0)) {
      toast("SỐ LƯỢNG QUÂN XUẤT CHIẾN VƯỢT QUÁ QUÂN ĐANG CÓ TRONG THÀNH");
      return false;
    }
    const sourceRegionId = regionAtCoords(source.x, source.y);
    const targetRegionFromTown = regionAtCoords(target.x, target.y);
    const effectiveTargetRegionId = targetRegionId ?? targetRegionFromTown;

    if (isAttack) {
      const targetOwner = derivedRegionOwnership(effectiveTargetRegionId);
      if (targetOwner === 1) {
        const shieldMs = getNewbieShieldRemainingMs();
        if (shieldMs > 0) {
          toast(`⚠️ THÀNH NÀY ĐANG TRONG THỜI GIAN BẢO VỆ TÂN THỦ! (Còn ${formatShieldTimer(shieldMs)})`);
          return false;
        }
      }
    }

    const routeStatus = getMarchRouteStatus(source, effectiveTargetRegionId);
    if (!routeStatus.ok && !backendTiming) {
      toast(routeStatus.message);
      return false;
    }
    const crossingSea = routeStatus.ok ? routeStatus.requiresShip : segmentTouchesSea(source, target);
    if (crossingSea) {
      if (!backendTiming && (sourceRegionId < 0 || derivedRegionOwnership(sourceRegionId) !== 1)) {
        toast("KHÔNG CÓ CẢNG XUẤT PHÁT: HÃY CHỌN THÀNH/LÃNH THỔ VEN BIỂN CỦA BẠN");
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
        const ownedRegions = state.regionOwnership.filter(o => o === 1).length;
        if (ownedRegions >= 5) shipSpeed *= 1.20;
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
        speeds.push(gameConfig.cavalrySpeed * (1 + stirrupsLvl * 0.20));
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
      speed *= (1 + travelLvl * 0.15);
    }

    const dist = Math.hypot(source.x - target.x, source.y - target.y);
    const distanceKm = Math.max(1, Math.round(dist * MAP_UNITS_TO_KM));
    const localDuration = Math.max(6, Math.round((distanceKm / speed) * gameConfig.gameHourSeconds));
    const duration = backendTiming?.duration ?? localDuration;
    const elapsed = backendTiming?.elapsed ?? 0;

    let sourcePort: { x: number; y: number } | null = null;
    let targetPort: { x: number; y: number } | null = null;
    let control: { x: number; y: number } | null = null;

    if (crossingSea) {
      const route = findBestSeaRoute(sourceRegionId, effectiveTargetRegionId, source, target);
      if (route.error === "source_port") {
        if (backendTiming) {
          sourcePort = { x: lerp(source.x, target.x, 0.22), y: lerp(source.y, target.y, 0.22) };
        } else {
          toast("LÃNH THỔ XUẤT PHÁT KHÔNG CÓ BỜ BIỂN/CẢNG - KHÔNG THỂ ĐI THUYỀN");
          return false;
        }
      }
      if (route.error === "target_port") {
        if (backendTiming) {
          targetPort = { x: lerp(source.x, target.x, 0.78), y: lerp(source.y, target.y, 0.78) };
        } else {
          toast("ĐÍCH KHÔNG PHẢI VÙNG VEN BIỂN - PHẢI CHIẾM BỜ BIỂN TRƯỚC");
          return false;
        }
      }
      sourcePort = sourcePort || route.sourcePort;
      targetPort = targetPort || route.targetPort;
      control = route.control;
      if (!control || route.error === "blocked") {
        if (backendTiming) {
          control = { x: (sourcePort.x + targetPort.x) / 2, y: (sourcePort.y + targetPort.y) / 2 };
        } else {
          toast("TUYẾN BIỂN BỊ LỤC ĐỊA CHẶN - HÃY CHỌN CẢNG/VÙNG VEN BIỂN KHÁC");
          return false;
        }
      }
    }

    state.voyages.push({
      from: { x: source.x, y: source.y },
      to: { x: target.x, y: target.y },
      sourcePort: sourcePort,
      targetPort: targetPort,
      control: control,
      targetId: target.id,
      t: Math.min(duration, elapsed),
      duration: duration,
      startedAt: backendTiming?.startedAt || null,
      arrivesAt: backendTiming?.arrivesAt || null,
      backendMarchId: backendTiming?.marchId || null,
      owner: source.owner,
      power: power,
      targetRegionId: targetRegionId,
      isAttack: isAttack,
      infantry: infantry,
      cavalry: cavalry,
      artillery: artillery,
      battleSide: battleSide || backendTiming?.battleSide || null,
      crossingSea: crossingSea
    });
    if (!backendTiming?.noTroopDebit) {
      source.infantryCount = Math.max(0, (source.infantryCount || 0) - (infantry || 0));
      source.cavalryCount = Math.max(0, (source.cavalryCount || 0) - (cavalry || 0));
      source.artilleryCount = Math.max(0, (source.artilleryCount || 0) - (artillery || 0));
      source.troops = Math.max(1, source.troops - power);
    }
    toast(isAttack ? `XUẤT BINH CHIẾM THÀNH (${power} QUÂN | HÀNH QUÂN: ${Math.round(duration)}s)` : `XUẤT BINH TIẾP VIỆN (${power} QUÂN | HÀNH QUÂN: ${Math.round(duration)}s)`);
    pushLog(isAttack
      ? `PLAYER1: ĐÃ XUẤT BINH TẤN CÔNG LÃNH THỔ ${targetRegionId + 1} (${power} QUÂN)`
      : `PLAYER1: ĐÃ GỬI TIẾP VIỆN ĐẾN LÃNH THỔ ${targetRegionId + 1} (${power} QUÂN)`);
    save();
    return true;
  }

  function applyBackendClearing(clearing: any) {
    const regionId = reactToCanvasRegionId(clearing?.territoryId);
    const r = landById(regionId);
    if (!r) return;
    const isMine = clearing.playerId && clearing.playerId === state.localPlayerId;
    state.regionOwnership[regionId] = 0;
    state.regionOwnerIds[regionId] = clearing.playerId || null;
    state.regionOwnerNames[regionId] = "ĐANG KHAI HOANG";
    state.activeClearingTimings[regionId] = {
      playerId: clearing.playerId,
      startedAt: clearing.startedAt,
      completesAt: clearing.completesAt,
    };
    state.regionClearing[regionId] = timingProgress(clearing.startedAt, clearing.completesAt);
    if (isMine) {
      const origin = settlerOriginForRegion(regionId);
      if (!origin.fromCamp) {
        const sourceTown = towns.find((town) => town.id === origin.originTownId);
        const routeStatus = getMarchRouteStatus(sourceTown, regionId);
        if (!routeStatus.ok) {
          toast(routeStatus.message);
          return;
        }
      }
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
    if (!march?.id) return false;
    if (state.voyages.some((v) => v.backendMarchId === march.id)) return true;
    const sourceRegionId = reactToCanvasRegionId(march.fromTerritoryId);
    const targetRegionId = reactToCanvasRegionId(march.toTerritoryId);
    const ownerCode = march.ownerId === state.localPlayerId ? 1 : 2;
    const source = ensureTownForRegion(sourceRegionId, ownerCode);
    const targetOwner = derivedRegionOwnership(targetRegionId) || (march.kind === "reinforce" ? ownerCode : 2);
    const target = ensureTownForRegion(targetRegionId, targetOwner);
    const timing = timingElapsedSeconds(march.startedAt, march.arrivesAt);
    const elapsed = Math.min(timing.duration - 0.05, timing.elapsed);
    if (!source || !target) return false;
    return launchVoyage(
      source,
      target,
      march.troops,
      targetRegionId,
      march.kind !== "reinforce",
      unitMix.infantry ?? march.infantry ?? Math.max(1, Math.floor((march.troops || 0) / 15)),
      unitMix.cavalry ?? march.cavalry ?? 0,
      unitMix.artillery ?? march.artillery ?? 0,
      march.battleSide || unitMix.battleSide || (march.kind === "reinforce" ? "defender" : null),
      {
        ...timing,
        elapsed: Math.max(0, elapsed),
        startedAt: march.startedAt,
        arrivesAt: march.arrivesAt,
        marchId: march.id,
        noTroopDebit: true,
      }
    );
  }

  let toastTimeout: any = null;
  function toast(msg) {
    state.toast = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    if (msg && msg !== "TÂN THỦ: CHỌN MẢNH ĐẤT HOANG ĐỂ XÂY THÀNH" && msg !== "CHỌN CỜ VÀ BIỂU TƯỢNG RỒI XÁC NHẬN XÂY THÀNH") {
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
    return getDynamicButtons().find((b) => x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h);
  }

  function setZoom(value) {
    state.zoom = FIXED_FAR_ZOOM;
    state.targetZoom = FIXED_FAR_ZOOM;
    clampPan();
    saveCamera();
  }

  function clampPan() {
    state.zoom = FIXED_FAR_ZOOM;
    state.targetZoom = FIXED_FAR_ZOOM;
    const b = worldContentBounds();
    const minPanX = -b.maxX * state.zoom + W * 0.72 - (1 - state.zoom) * W * 0.48;
    const maxPanX = W * 0.28 - b.minX * state.zoom - (1 - state.zoom) * W * 0.48;
    const minPanY = -b.maxY * state.zoom + H * 0.72 - (1 - state.zoom) * H * 0.48;
    const maxPanY = H * 0.28 - b.minY * state.zoom - (1 - state.zoom) * H * 0.48;
    if (minPanX > maxPanX) state.panX = (minPanX + maxPanX) / 2;
    else state.panX = Math.max(minPanX, Math.min(maxPanX, state.panX));
    if (minPanY > maxPanY) state.panY = (minPanY + maxPanY) / 2;
    else state.panY = Math.max(minPanY, Math.min(maxPanY, state.panY));
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      toast("FULL MÀN HÌNH - CUỘN CHUỘT ĐỂ ZOOM");
    } else {
      document.exitFullscreen?.();
      toast("THOÁT FULL MÀN HÌNH");
    }
  }

  function gearAt(x, y) {
    const gearX = W - 62 - 12;
    return x >= gearX && y >= 12 && x <= gearX + 62 && y <= 66;
  }

  function pointer(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  let dragStartPos = { x: 0, y: 0 };
  let panVelX = 0;
  let panVelY = 0;
  let lastDragTime = 0;
  let clickStartTime = 0;

  canvas.addEventListener("mousemove", (e) => {
    const p = pointer(e);
    if (state.drag) {
      const now = performance.now();
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
      const totalDist = Math.hypot(p.x - dragStartPos.x, p.y - dragStartPos.y);
      if (totalDist > 4) state.dragMoved = true;
      clampPan();
      return;
    }
    const b = buttonAt(p.x, p.y);
    const t = townAt(p.x, p.y);
    state.hover = gearAt(p.x, p.y) ? "fullscreen" : b ? b.id : t ? `town-${t.id}` : null;
  });

  canvas.addEventListener("mousedown", (e) => {
    const p = pointer(e);
    dragStartPos = p;
    state.dragMoved = false;
    panVelX = 0;
    panVelY = 0;
    lastDragTime = performance.now();
    clickStartTime = performance.now();
    state.targetPanX = null;
    state.targetPanY = null;
    if (!buttonAt(p.x, p.y) && !gearAt(p.x, p.y)) state.drag = p;
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

  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const p = pointer({ clientX: touch.clientX, clientY: touch.clientY });
      dragStartPos = p;
      state.dragMoved = false;
      panVelX = 0;
      panVelY = 0;
      lastDragTime = performance.now();
      clickStartTime = performance.now();
      if (!buttonAt(p.x, p.y) && !gearAt(p.x, p.y)) state.drag = p;
    }
  }, { passive: true });

  canvas.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1 && state.drag) {
      const touch = e.touches[0];
      const p = pointer({ clientX: touch.clientX, clientY: touch.clientY });
      const now = performance.now();
      const dtMs = Math.max(1, now - lastDragTime);
      const dx = p.x - state.drag.x;
      const dy = p.y - state.drag.y;

      panVelX = panVelX * 0.35 + (dx / dtMs) * 16 * 0.65;
      panVelY = panVelY * 0.35 + (dy / dtMs) * 16 * 0.65;
      lastDragTime = now;

      state.panX += dx;
      state.panY += dy;
      state.drag = p;
      const totalDist = Math.hypot(p.x - dragStartPos.x, p.y - dragStartPos.y);
      if (totalDist > 4) state.dragMoved = true;
      clampPan();
    }
  }, { passive: true });

  window.addEventListener("touchend", () => {
    if (state.drag) {
      if (performance.now() - lastDragTime > 60) {
        panVelX = 0;
        panVelY = 0;
      }
      state.drag = null;
      saveCamera();
    }
  }, { passive: true });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    state.zoom = FIXED_FAR_ZOOM;
    state.targetZoom = FIXED_FAR_ZOOM;
  }, { passive: false });

  canvas.addEventListener("click", (e) => {
    const p = pointer(e);
    const clickDuration = performance.now() - clickStartTime;
    const totalDist = Math.hypot(p.x - dragStartPos.x, p.y - dragStartPos.y);
    if (state.dragMoved || totalDist > 4 || clickDuration > 220) {
      state.dragMoved = false;
      return;
    }

    // Chat click detection
    const isChatInput = (p.x >= 34 && p.y >= H - 70 && p.x <= 34 + 253 && p.y <= H - 70 + 36);
    const isChatSend = (p.x >= 302 && p.y >= H - 74 && p.x <= 302 + 42 && p.y <= H - 74 + 42);
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

    // Territory clearing / selection logic
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
    if (e.key === "0") {
      centerCameraOnWorldContent();
      toast("CAMERA XA ĐÃ RESET");
      saveCamera();
    }
  });

  function sim(dt) {
    state.tick += dt;
    state.zoom = FIXED_FAR_ZOOM;
    state.targetZoom = FIXED_FAR_ZOOM;
    
    if (state.targetPanX !== null && state.targetPanY !== null) {
      state.panX = lerp(state.panX, state.targetPanX, Math.min(1, dt * 8));
      state.panY = lerp(state.panY, state.targetPanY, Math.min(1, dt * 8));
      if (Math.abs(state.panX - state.targetPanX) < 0.5 && Math.abs(state.panY - state.targetPanY) < 0.5) {
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
        v.t = Math.min(v.duration, timing.elapsed);
      } else {
        v.t += dt;
      }
      if (v.t >= v.duration) {
        state.voyages.splice(i, 1);
        toast("ĐẠO QUÂN ĐÃ ĐẾN NƠI, ĐANG CHỜ SERVER TỔNG KẾT");
      }
    }

    state.activeBattles = [];

	    cancelClearingIfOriginLost();
	    if (state.settlerTravel?.returning) {
	      const settlerReturnSeconds = Math.max(2, 12 * (18 / Math.max(1, gameConfig.settlerSpeed || 18)) * ((gameConfig.gameHourSeconds || 60) / 60));
	      state.settlerTravel.returnProgress = Math.min(1, (state.settlerTravel.returnProgress || 0) + dt / settlerReturnSeconds);
	      if (state.settlerTravel.returnProgress >= 1) {
	        clearSettlerReturn();
	      }
	    }

    // ── Clearing progress ──────────────────────────────────────────────────
    Object.entries(state.activeClearingTimings || {}).forEach(([key, timing]: any) => {
      const regionId = Number(key);
      if (!Number.isFinite(regionId)) return;
      state.regionClearing[regionId] = timingProgress(timing.startedAt, timing.completesAt);
      if (state.regionClearing[regionId] >= 1 && timing.playerId !== state.localPlayerId) {
        delete state.activeClearingTimings[regionId];
        state.regionClearing[regionId] = 0;
      }
    });
	    const ip = state.regionInProgress;
	    if (ip >= 0) {
	      const r = landById(ip);
	      if (r) {
	        const serverTiming = state.activeClearingTimings[ip];
	        if (serverTiming?.startedAt && serverTiming?.completesAt) {
	          state.regionClearing[ip] = timingProgress(serverTiming.startedAt, serverTiming.completesAt);
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
      panVelX *= 0.88;
      panVelY *= 0.88;
      clampPan();
      if (Math.abs(panVelX) <= 0.05 && Math.abs(panVelY) <= 0.05) {
        panVelX = 0;
        panVelY = 0;
        saveCamera();
      }
    }
  }

  let last = performance.now();
  function loop(now) {
    if (destroyed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    sim(dt);
    if (!uiOverlayActive || now - lastOverlayFrameAt >= 250) {
      drawFrame();
      lastOverlayFrameAt = now;
    }
    if (!isFastPanning() && cameraSavePending && now - lastCameraSaveAt >= 500) saveCamera();
    if (onUpdate && !isFastPanning() && (!uiOverlayActive || now - lastOverlayUpdateAt >= 250)) {
      lastOverlayUpdateAt = now;
      onUpdate(state, towns);
    }
    raf = requestAnimationFrame(loop);
  }

  load();
  resetStarterTownsForNewbie();
  initTerritoryArrays();
  loadCamera();
  raf = requestAnimationFrame(loop);

  return {
    destroy: () => {
      destroyed = true;
      saveCamera(true);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pagehide", flushCameraOnPageHide);
      window.removeEventListener("mousemove", onMinimapMouseMove);
      window.removeEventListener("mouseup", onMinimapMouseUp);
      if (raf) cancelAnimationFrame(raf);
    },
    getState: () => state,
    getTowns: () => towns,
    getRegions: () => regions,
    getIslets: () => islets,
    mapToScreen: (x: number, y: number) => mapToScreen(x, y),
    getRegionOwnership: (id: number) => derivedRegionOwnership(id),
    getSourceTown: () => sourceTown(),
    getPlayerOwnedTowns: () => towns.filter(isPlayerOwnedTown),
    getTownRegionId: (town: any) => town ? regionAtCoords(town.x, town.y) : -1,
    getRegion: (id: number) => landById(reactToCanvasRegionId(id)),
    getRegionCenter: (id: number) => {
      const r = landById(reactToCanvasRegionId(id));
      if (!r) return null;
      return mapToScreen(r.x, r.y);
    },
    getTerritorySpecialResources: (id: number) => territorySpecialResources(reactToCanvasRegionId(id)),
    getActiveBattleForRegion: (id: number) => state.activeBattles.find((battle: any) => battle.regionId === reactToCanvasRegionId(id)) || null,
    isPlayerOwnedTown: (town: any) => isPlayerOwnedTown(town),
    getMarchRouteStatus: (sourceTown: any, targetRegionId: number) => getMarchRouteStatus(sourceTown, reactToCanvasRegionId(targetRegionId)),
    sendChat: (msg: string) => {
      pushLog(`PLAYER1: ${msg}`);
      save();

      // AI Faction responses
      setTimeout(() => {
        if (destroyed) return;
        const msgClean = msg.toLowerCase().trim();
        const opponentFactions = factions.filter((_, idx) => idx > 0);
        const f = opponentFactions[Math.floor(Math.random() * opponentFactions.length)];
        
        let reply = "";
        if (msgClean.includes("chào") || msgClean.includes("hello")) {
          reply = "Chào mừng sứ giả PLAYER1! Bản xứ không đón tiếp kẻ thù.";
        } else if (msgClean.includes("đánh") || msgClean.includes("chiếm") || msgClean.includes("cướp") || msgClean.includes("tấn công")) {
          reply = "Muốn động binh đao sao? Kiếm sắc của chúng ta đã khát máu lâu rồi!";
        } else if (msgClean.includes("xin") || msgClean.includes("đổi") || msgClean.includes("giao thương") || msgClean.includes("vàng")) {
          reply = "Hãy gửi vàng sang đây, chúng ta sẽ xem xét thông thương hữu nghị!";
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
        minimapCtx = minimapCanvas?.getContext("2d") || null;
        if (minimapCanvas) {
          minimapCanvas.addEventListener("mousedown", onMinimapMouseDown);
        }
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
      if (id === "setToast") {
        toast(payload?.message || "KHÔNG THỂ THỰC HIỆN LỆNH");
        return;
      }
      if (id === "setLocalPlayer") {
        state.localPlayerId = payload?.playerId || null;
        state.localPlayerName = payload?.playerName || "BẠN";
        return;
      }
      if (id === "syncResources") {
        if (payload?.resources) state.resources = { ...state.resources, ...payload.resources };
        return;
      }
      if (id === "applyRecruitment") {
        const targetTown = towns.find((town) => town.id === payload?.townId);
        if (!targetTown) return false;
        normalizeTown(targetTown);
        const unitCount = Math.max(0, Math.floor(payload?.unitCountAdded || payload?.count || 1));
        const troopsAdded = Math.max(0, Math.floor(payload?.troopsAdded || 0));
        if (payload?.resources) state.resources = { ...state.resources, ...payload.resources };
        if (payload?.unitType === "infantry") targetTown.infantryCount = (targetTown.infantryCount || 0) + unitCount;
        else if (payload?.unitType === "cavalry") targetTown.cavalryCount = (targetTown.cavalryCount || 0) + unitCount;
        else if (payload?.unitType === "artillery") targetTown.artilleryCount = (targetTown.artilleryCount || 0) + unitCount;
        targetTown.troops += troopsAdded;
        toast(payload?.message || `CHIÊU MỘ THÀNH CÔNG +${troopsAdded} QUÂN`);
        save();
        return true;
      }
      if (id === "rollbackRecruitment") {
        const targetTown = towns.find((town) => town.id === payload?.townId);
        if (!targetTown) return false;
        normalizeTown(targetTown);
        const unitCount = Math.max(0, Math.floor(payload?.unitCountAdded || payload?.count || 1));
        const troopsAdded = Math.max(0, Math.floor(payload?.troopsAdded || 0));
        if (payload?.resources) state.resources = { ...state.resources, ...payload.resources };
        if (payload?.unitType === "infantry") targetTown.infantryCount = Math.max(0, (targetTown.infantryCount || 0) - unitCount);
        else if (payload?.unitType === "cavalry") targetTown.cavalryCount = Math.max(0, (targetTown.cavalryCount || 0) - unitCount);
        else if (payload?.unitType === "artillery") targetTown.artilleryCount = Math.max(0, (targetTown.artilleryCount || 0) - unitCount);
        targetTown.troops = Math.max(0, (targetTown.troops || 0) - troopsAdded);
        toast(payload?.message || "SERVER TỪ CHỐI MỘ BINH, ĐÃ HOÀN STATE");
        save();
        return true;
      }
      if (id === "applyConfig") {
        if (payload?.config) Object.assign(gameConfig, payload.config);
        return;
      }
      if (id === "prepareBackendWorld") {
        state.hasAuthoritativeOwnership = true;
        state.regionOwnership = [];
        state.regionOwnerIds = {};
        state.regionOwnerNames = {};
        state.regionOwnerFlagColors = {};
        state.regionOwnerEmblems = {};
        state.regionOwnerAllianceTags = {};
        state.regionOwnerAllianceEmblems = {};
        state.regionClearing = [];
        state.activeClearingTimings = {};
        state.regionInProgress = -1;
        state.selected = null;
        state.selectedRegion = null;
        state.settlerTravel = { active: false, targetRegionId: -1, originTownId: null, originX: 0, originY: 0 };
        towns.splice(0, towns.length);
        initTerritoryArrays();
        state.toast = "ĐANG ĐỒNG BỘ DỮ LIỆU SERVER";
        return;
      }
      if (id === "updateNewbieShield") {
        const until = payload?.until ? new Date(payload.until).getTime() : 0;
        state.newbieShieldUntil = until;
        localStorage.setItem("island_empire_newbie_shield_until", String(until));
        return;
      }
      if (id === "applyGameState") {
        if (payload?.resources) {
          state.resources = { ...state.resources, ...payload.resources };
        }
        if (payload?.newbieShieldUntil !== undefined) {
          state.newbieShieldUntil = payload.newbieShieldUntil ? new Date(payload.newbieShieldUntil).getTime() : 0;
          localStorage.setItem("island_empire_newbie_shield_until", String(state.newbieShieldUntil));
        }
        if (payload?.playerProfile) {
          state.newbieFlagColor = payload.playerProfile.flagColor;
          state.newbieEmblem = payload.playerProfile.emblem;
        }
        const touchedRegionIds = [];
        state.hasAuthoritativeOwnership = true;
        state.regionOwnerIds = {};
        state.regionOwnerNames = {};
        state.regionOwnerFlagColors = {};
        state.regionOwnerEmblems = {};
        state.regionOwnerAllianceTags = {};
        state.regionOwnerAllianceEmblems = {};
        state.activeClearingTimings = {};
        state.regionInProgress = -1;
        state.settlerTravel = { active: false, targetRegionId: -1, originTownId: null, originX: 0, originY: 0 };
        let hasOwnedTerritory = false;
        (payload?.territories || []).forEach((territory) => {
          const ownerId = territory.ownerId || null;
          const ownerCode = ownerId ? (ownerId === state.localPlayerId ? 1 : 2) : (territory.ownerCode || 0);
          if (ownerCode === 1) {
            hasOwnedTerritory = true;
          }
          touchedRegionIds.push(territory.id);
          state.regionOwnership[territory.id] = ownerCode;
          if (ownerId) state.regionOwnerIds[territory.id] = ownerId;
          if (territory.ownerName) state.regionOwnerNames[territory.id] = ownerCode === 1 ? (state.localPlayerName || "BẠN") : territory.ownerName;
          if (territory.ownerFlagColor) state.regionOwnerFlagColors[territory.id] = territory.ownerFlagColor;
          if (territory.ownerEmblem) state.regionOwnerEmblems[territory.id] = territory.ownerEmblem;
          if (territory.ownerAllianceTag) state.regionOwnerAllianceTags[territory.id] = territory.ownerAllianceTag;
          if (territory.ownerAllianceEmblem) state.regionOwnerAllianceEmblems[territory.id] = territory.ownerAllianceEmblem;
        });
        if (hasOwnedTerritory && state.newbieMode) {
          state.newbieMode = false;
          state.newbiePhase = "done";
          localStorage.removeItem(ONBOARDING_KEY);
        }
        syncTownOwnersForRegions(touchedRegionIds);
        applyBackendTownSnapshots(payload?.towns || []);
        cancelClearingIfTargetTaken(touchedRegionIds);
        cancelClearingIfOriginLost();
        (payload?.clearings || []).forEach((clearing) => applyBackendClearing(clearing));
        state.voyages = state.voyages.filter((voyage) => !voyage.backendMarchId);
        (payload?.marches || []).forEach((march) => applyBackendMarch(march));
        state.activeBattles = [];
        save();
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
          state.regionOwnerAllianceTags = {};
          state.regionOwnerAllianceEmblems = {};
        }
        (payload?.territories || []).forEach((territory) => {
          const ownerId = territory.ownerId || null;
          const ownerCode = ownerId ? (ownerId === state.localPlayerId ? 1 : 2) : (territory.ownerCode || 0);
          touchedRegionIds.push(territory.id);
          state.regionOwnership[territory.id] = ownerCode;
          if (ownerId) state.regionOwnerIds[territory.id] = ownerId;
          else delete state.regionOwnerIds[territory.id];
          if (territory.ownerName) state.regionOwnerNames[territory.id] = ownerCode === 1 ? (state.localPlayerName || "BẠN") : territory.ownerName;
          else delete state.regionOwnerNames[territory.id];
          if (territory.ownerFlagColor) state.regionOwnerFlagColors[territory.id] = territory.ownerFlagColor;
          else delete state.regionOwnerFlagColors[territory.id];
          if (territory.ownerEmblem) state.regionOwnerEmblems[territory.id] = territory.ownerEmblem;
          else delete state.regionOwnerEmblems[territory.id];
          if (territory.ownerAllianceTag) state.regionOwnerAllianceTags[territory.id] = territory.ownerAllianceTag;
          else delete state.regionOwnerAllianceTags[territory.id];
          if (territory.ownerAllianceEmblem) state.regionOwnerAllianceEmblems[territory.id] = territory.ownerAllianceEmblem;
          else delete state.regionOwnerAllianceEmblems[territory.id];
        });
        syncTownOwnersForRegions(touchedRegionIds);
        cancelClearingIfTargetTaken(touchedRegionIds);
        cancelClearingIfOriginLost();
        save();
        return;
      }
      if (id === "applyBackendClearing") {
        applyBackendClearing(payload?.clearing || payload);
        save();
        return;
      }
      if (id === "applyBackendMarch") {
        const applied = applyBackendMarch(payload?.march || payload, payload?.unitMix || payload);
        save();
        return applied;
      }
      if (id === "markClearingRejected") {
        const regionId = payload?.regionId;
        if (regionId !== undefined && regionId !== null) {
          refundSettlerPopulationForRegion(regionId);
          refundBuildCostForRegion(regionId);
          state.regionOwnership[regionId] = 0;
          delete state.regionOwnerIds[regionId];
          delete state.regionOwnerNames[regionId];
          delete state.regionOwnerAllianceTags[regionId];
          delete state.regionOwnerAllianceEmblems[regionId];
          state.regionClearing[regionId] = 0;
          delete state.activeClearingTimings[regionId];
          if (state.regionInProgress === regionId) state.regionInProgress = -1;
        }
        state.settlerTravel = { active: false, targetRegionId: -1, originTownId: null, originX: 0, originY: 0 };
        state.pendingBackendClearingStarts = state.pendingBackendClearingStarts.filter((id) => id !== regionId);
        toast(payload?.message || "SERVER TỪ CHỐI XÂY THÀNH, ĐÃ HOÀN TÀI NGUYÊN");
        return;
      }
	      if (id === "consumeBackendClaims") {
	        state.pendingBackendClaims = [];
	        return;
	      }
	      if (id === "consumeBackendClaim") {
	        const regionId = payload?.regionId ?? payload;
	        state.pendingBackendClaims = state.pendingBackendClaims.filter((id) => id !== regionId);
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
            if (towns[i].owner === 0 && regionAtCoords(towns[i].x, towns[i].y) === regionId) towns.splice(i, 1);
          }
        }
        state.pendingBackendClaims = state.pendingBackendClaims.filter((id) => id !== regionId);
        toast("SERVER TỪ CHỐI: LÃNH THỔ NÀY ĐÃ CÓ NGƯỜI CHIẾM");
        return;
      }
    if (id === "claimRegion") {
      toast("XÂY THÀNH PHẢI ĐƯỢC SERVER XÁC NHẬN");
      return;
    }
      if (id === "cancelClaimRegion") {
        const canvasId = reactToCanvasRegionId(payload);
        refundBuildCostForRegion(canvasId);
        state.regionInProgress = -1;
        state.regionClearing[canvasId] = 0;
        delete state.activeClearingTimings[canvasId];
        beginSettlerReturn(canvasId, "BẠN ĐÃ HỦY XÂY THÀNH, ĐỘI THỢ ĐANG QUAY VỀ");
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
        const x = Math.max(b.minX, Math.min(b.maxX, Number(payload?.x) || b.cx));
        const y = Math.max(b.minY, Math.min(b.maxY, Number(payload?.y) || b.cy));
        state.zoom = FIXED_FAR_ZOOM;
        state.targetZoom = FIXED_FAR_ZOOM;
        state.panX = W / 2 - x * state.zoom - (1 - state.zoom) * W * 0.48;
        state.panY = H / 2 - y * state.zoom - (1 - state.zoom) * H * 0.48;
        state.selected = null;
        state.selectedRegion = null;
        clampPan();
        toast(payload?.label ? `ĐÃ NHẢY ĐẾN ${payload.label}` : `ĐÃ NHẢY ĐẾN X:${Math.round(x)} Y:${Math.round(y)}`);
        saveCamera();
        save();
        return;
      }
      if (id === "setStarterRegion") {
        if (state.cameraRestored && !payload?.force) return;
        const regionId = reactToCanvasRegionId(payload.regionId);
        const r = landById(regionId);
        if (!r) return;
        state.zoom = FIXED_FAR_ZOOM;
        state.targetZoom = FIXED_FAR_ZOOM;
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
      if (id === "upgradeResearch") {
        toast("TÍNH NĂNG NGHIÊN CỨU ĐÃ TẠM ẨN ĐỂ CHỜ ĐỒNG BỘ SERVER");
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
    startNewbieOnboarding: (flagColor: string, emblem: string) => {
      state.newbieFlagColor = flagColor;
      state.newbieEmblem = emblem;
      const region = state.newbieSelectedRegion ?? NEWBIE_DEFAULT_REGION;
      state.newbieSelectedRegion = region;
      toast("XÁC NHẬN XÂY THÀNH TRÊN SERVER ĐỂ BẮT ĐẦU");
    },
    cancelNewbieOnboarding: () => {
      state.newbiePhase = "select_land";
      state.newbieSelectedRegion = null;
    },
    getConfig: () => gameConfig,
    territoryYield,
    clearingDuration,
    territoryBuildCost
  };
}
