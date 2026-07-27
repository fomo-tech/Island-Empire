// Generated from demo/js/game.js so the main app matches the demo map exactly.
// @ts-nocheck
export type GameEngineHandle = {
  destroy: () => void;
  getState: () => any;
  getTowns: () => any[];
  sendChat: (msg: string) => void;
  handleAction: (id: string) => void;
};

export function createIslandEmpireGame(
  canvas: HTMLCanvasElement, 
  onUpdate?: (state: any, towns: any[]) => void,
  minimapCanvas?: HTMLCanvasElement | null
): GameEngineHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy: () => {} };
  ctx.imageSmoothingEnabled = false;

  const minimapCtx = minimapCanvas?.getContext("2d");

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
  window.addEventListener("resize", resizeCanvas);

  const TAU = Math.PI * 2;
  const SAVE_KEY = "island_empire_pixel_v1";
  const BASE_ZOOM = 1;

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
    { id: "grass", a: "#7fbd45", b: "#5f9f36", hi: "#9fd25a", dark: "#427a32", edge: "#2e6b35" },
    { id: "sand", a: "#d8ad36", b: "#c38f26", hi: "#efc75a", dark: "#906b25", edge: "#795925" },
    { id: "snow", a: "#ece5d3", b: "#cdd3d8", hi: "#fff7e6", dark: "#879aaa", edge: "#748897" },
    { id: "ember", a: "#cf6337", b: "#a7482e", hi: "#e78348", dark: "#793126", edge: "#65302a" },
    { id: "violet", a: "#8654b9", b: "#66429a", hi: "#9d68cf", dark: "#45316e", edge: "#352858" },
    { id: "rose", a: "#c75d80", b: "#a24764", hi: "#de7597", dark: "#73374c", edge: "#633244" },
    { id: "pine", a: "#66aa42", b: "#428a3f", hi: "#86c252", dark: "#2d6935", edge: "#24552e" },
    { id: "mint", a: "#a4d28b", b: "#75b869", hi: "#bee3a2", dark: "#5d8f55", edge: "#4c7447" },
  ];

  const OWNER_BIOMES = [
    { a: "#2f70d7", b: "#265bb5", hi: "#578ff7", dark: "#193d8a", edge: "#112b63" }, // Blue (0)
    { a: "#d74635", b: "#b83526", hi: "#f76957", dark: "#8a2419", edge: "#631711" }, // Red (1)
    { a: "#44a13d", b: "#358a30", hi: "#6be263", dark: "#205c1c", edge: "#154212" }, // Green (2)
    { a: "#d89b21", b: "#b88017", hi: "#f9bc48", dark: "#8a5e0f", edge: "#634208" }, // Gold (3)
    { a: "#8e45bc", b: "#72329c", hi: "#b66eeb", dark: "#542177", edge: "#3d1358" }, // Purple (4)
    { a: "#c75d80", b: "#a24764", hi: "#de7597", dark: "#73374c", edge: "#633244" }, // Pink (5)
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

  const regions = [
    // --- 1. LỤC ĐỊA BĂNG TUYẾT PHÍA BẮC (North Snow Continent) ---
    { x: 2500, y: 350, rx: 200, ry: 140, biome: 2, seed: 1 },
    { x: 2720, y: 300, rx: 220, ry: 150, biome: 2, seed: 2 },
    { x: 2940, y: 380, rx: 210, ry: 140, biome: 2, seed: 3 },
    { x: 3160, y: 320, rx: 220, ry: 150, biome: 2, seed: 4 },
    { x: 3380, y: 400, rx: 210, ry: 140, biome: 2, seed: 5 },
    { x: 3600, y: 350, rx: 220, ry: 150, biome: 2, seed: 6 },
    { x: 3820, y: 420, rx: 200, ry: 140, biome: 2, seed: 7 },
    { x: 4040, y: 380, rx: 210, ry: 140, biome: 2, seed: 8 },

    // --- 2. ĐẠI LỤC ĐỊA RỪNG XANH TRUNG TÂM (Central Forest Continent) ---
    // Hàng 1
    { x: 2400, y: 1500, rx: 220, ry: 160, biome: 0, seed: 9 },
    { x: 2620, y: 1450, rx: 230, ry: 165, biome: 6, seed: 10 },
    { x: 2840, y: 1600, rx: 240, ry: 170, biome: 0, seed: 11 },
    { x: 3060, y: 1500, rx: 220, ry: 160, biome: 6, seed: 12 },
    { x: 3280, y: 1650, rx: 230, ry: 165, biome: 0, seed: 13 },
    { x: 3500, y: 1550, rx: 220, ry: 160, biome: 7, seed: 14 },
    { x: 3720, y: 1700, rx: 240, ry: 170, biome: 0, seed: 15 },
    // Hàng 2
    { x: 2500, y: 2100, rx: 210, ry: 150, biome: 0, seed: 16 },
    { x: 2720, y: 2250, rx: 230, ry: 160, biome: 6, seed: 17 },
    { x: 2940, y: 2200, rx: 220, ry: 155, biome: 0, seed: 18 },
    { x: 3160, y: 2350, rx: 240, ry: 170, biome: 6, seed: 19 },
    { x: 3380, y: 2250, rx: 230, ry: 160, biome: 0, seed: 20 },
    { x: 3600, y: 2400, rx: 240, ry: 170, biome: 7, seed: 21 },
    { x: 3820, y: 2300, rx: 220, ry: 155, biome: 0, seed: 22 },

    // --- 3. LỤC ĐỊA HỎA SƠN ĐẤT ĐỎ (Southwest Volcanic Continent) ---
    { x: 450, y: 4200, rx: 210, ry: 150, biome: 3, seed: 23 },
    { x: 670, y: 4150, rx: 220, ry: 160, biome: 3, seed: 24 },
    { x: 890, y: 4250, rx: 210, ry: 150, biome: 3, seed: 25 },
    { x: 400, y: 4600, rx: 220, ry: 160, biome: 3, seed: 26 },
    { x: 620, y: 4650, rx: 230, ry: 165, biome: 3, seed: 27 },
    { x: 840, y: 4550, rx: 210, ry: 150, biome: 3, seed: 28 },
    { x: 550, y: 4950, rx: 220, ry: 160, biome: 3, seed: 29 },
    { x: 770, y: 5000, rx: 210, ry: 150, biome: 3, seed: 30 },

    // --- 4. LỤC ĐỊA SA MẠC CÁT VÀNG (Southeast Desert Continent) ---
    { x: 6800, y: 4300, rx: 220, ry: 160, biome: 1, seed: 31 },
    { x: 7020, y: 4250, rx: 230, ry: 165, biome: 1, seed: 32 },
    { x: 7240, y: 4350, rx: 210, ry: 150, biome: 1, seed: 33 },
    { x: 7460, y: 4300, rx: 200, ry: 145, biome: 1, seed: 34 },
    { x: 6950, y: 4700, rx: 220, ry: 160, biome: 1, seed: 35 },
    { x: 7170, y: 4750, rx: 230, ry: 165, biome: 1, seed: 36 },
    { x: 7390, y: 4650, rx: 210, ry: 150, biome: 1, seed: 37 },
    { x: 7100, y: 5050, rx: 220, ry: 160, biome: 1, seed: 38 },
    { x: 7320, y: 5100, rx: 210, ry: 150, biome: 1, seed: 39 },

    // --- 5. QUẦN ĐẢO PHÙ THỦY MA THUẬT (Northeast Wizard Isles) ---
    { x: 6800, y: 350, rx: 180, ry: 130, biome: 4, seed: 40 },
    { x: 7100, y: 300, rx: 170, ry: 125, biome: 4, seed: 41 },
    { x: 7400, y: 400, rx: 190, ry: 140, biome: 5, seed: 42 },
    { x: 7700, y: 350, rx: 180, ry: 135, biome: 5, seed: 43 },
    { x: 6950, y: 700, rx: 185, ry: 140, biome: 4, seed: 44 },
    { x: 7250, y: 750, rx: 190, ry: 140, biome: 5, seed: 45 },
    { x: 7550, y: 650, rx: 170, ry: 125, biome: 4, seed: 46 },
    { x: 7300, y: 900, rx: 160, ry: 120, biome: 5, seed: 47 },

    // --- 6. LỤC ĐỊA ĐẦM LẦY BẠC HÀ (South Mint Swamp Continent) ---
    { x: 3500, y: 4300, rx: 220, ry: 160, biome: 7, seed: 48 },
    { x: 3720, y: 4250, rx: 230, ry: 165, biome: 7, seed: 49 },
    { x: 3940, y: 4400, rx: 210, ry: 150, biome: 7, seed: 50 },
    { x: 4160, y: 4350, rx: 240, ry: 170, biome: 7, seed: 51 },
    { x: 4380, y: 4450, rx: 220, ry: 160, biome: 7, seed: 52 },
    { x: 3650, y: 4700, rx: 230, ry: 165, biome: 7, seed: 53 },
    { x: 3870, y: 4800, rx: 240, ry: 170, biome: 7, seed: 54 },
    { x: 4090, y: 4750, rx: 220, ry: 160, biome: 7, seed: 55 },
    { x: 4310, y: 4850, rx: 230, ry: 165, biome: 7, seed: 56 },
    { x: 4530, y: 4700, rx: 210, ry: 150, biome: 7, seed: 57 },

    // --- 7. CHUỖI ĐẢO HẢI TẶC PHÍA TÂY BẮC (Northwest Pirate Archipelago) ---
    { x: 450, y: 300, rx: 140, ry: 105, biome: 0, seed: 58 },
    { x: 750, y: 250, rx: 150, ry: 110, biome: 1, seed: 59 },
    { x: 1050, y: 350, rx: 130, ry: 100, biome: 0, seed: 60 },
    { x: 400, y: 600, rx: 145, ry: 110, biome: 1, seed: 61 },
    { x: 700, y: 650, rx: 160, ry: 120, biome: 0, seed: 62 },
    { x: 1000, y: 550, rx: 135, ry: 105, biome: 1, seed: 63 },
    { x: 550, y: 850, rx: 150, ry: 115, biome: 0, seed: 64 },
    { x: 850, y: 900, rx: 140, ry: 105, biome: 1, seed: 65 },
    { x: 300, y: 450, rx: 120, ry: 95, biome: 0, seed: 66 },
    { x: 1150, y: 480, rx: 130, ry: 100, biome: 1, seed: 67 },
    { x: 480, y: 1150, rx: 140, ry: 105, biome: 0, seed: 68 },
    { x: 780, y: 1200, rx: 150, ry: 110, biome: 1, seed: 69 },

    // --- 8. LỤC ĐỊA CỔ ĐẠI PHÍA ĐÔNG CỰC (Far East Ancient Continent) ---
    { x: 7000, y: 1550, rx: 210, ry: 150, biome: 4, seed: 70 },
    { x: 7220, y: 1500, rx: 220, ry: 160, biome: 4, seed: 71 },
    { x: 7440, y: 1600, rx: 210, ry: 150, biome: 5, seed: 72 },
    { x: 7050, y: 1950, rx: 220, ry: 160, biome: 5, seed: 73 },
    { x: 7270, y: 2000, rx: 230, ry: 165, biome: 1, seed: 74 },
    { x: 7490, y: 1900, rx: 210, ry: 150, biome: 1, seed: 75 },
    { x: 7100, y: 2350, rx: 220, ry: 160, biome: 4, seed: 76 },
    { x: 7320, y: 2400, rx: 210, ry: 150, biome: 5, seed: 77 },
    { x: 7540, y: 2300, rx: 200, ry: 145, biome: 1, seed: 78 },
    { x: 7400, y: 2750, rx: 220, ry: 160, biome: 4, seed: 79 },

    // --- 9. LỤC ĐỊA TÍM HUYỀN BÍ PHÍA TÂY (Mystic Purple Continent) ---
    { x: 300, y: 2000, rx: 210, ry: 150, biome: 4, seed: 80 },
    { x: 520, y: 1950, rx: 220, ry: 160, biome: 4, seed: 81 },
    { x: 740, y: 2050, rx: 210, ry: 150, biome: 4, seed: 82 },
    { x: 960, y: 2000, rx: 200, ry: 145, biome: 4, seed: 83 },
    { x: 410, y: 2350, rx: 220, ry: 160, biome: 4, seed: 84 },
    { x: 630, y: 2400, rx: 230, ry: 165, biome: 4, seed: 85 },
    { x: 850, y: 2300, rx: 210, ry: 150, biome: 4, seed: 86 },
    { x: 740, y: 2700, rx: 220, ry: 160, biome: 4, seed: 87 },

    // --- 10. LỤC ĐỊA HOA HỒNG PHÍA NAM CỰC (Antarctic Rose Continent) ---
    { x: 6500, y: 2900, rx: 210, ry: 150, biome: 5, seed: 88 },
    { x: 6720, y: 2850, rx: 220, ry: 160, biome: 5, seed: 89 },
    { x: 6940, y: 2950, rx: 210, ry: 150, biome: 5, seed: 90 },
    { x: 7160, y: 2900, rx: 200, ry: 145, biome: 5, seed: 91 },
    { x: 6610, y: 3250, rx: 220, ry: 160, biome: 5, seed: 92 },
    { x: 6830, y: 3300, rx: 230, ry: 165, biome: 5, seed: 93 },
    { x: 7050, y: 3200, rx: 210, ry: 150, biome: 5, seed: 94 },
    { x: 7270, y: 3350, rx: 220, ry: 160, biome: 5, seed: 95 },

    // --- 11. LỤC ĐỊA NÚI BĂNG TÂY BẮC (Northwest Ice Peaks) ---
    { x: 500, y: 1500, rx: 210, ry: 150, biome: 2, seed: 150 },
    { x: 720, y: 1450, rx: 220, ry: 160, biome: 2, seed: 151 },
    { x: 940, y: 1550, rx: 210, ry: 150, biome: 2, seed: 152 },
    { x: 1160, y: 1500, rx: 220, ry: 160, biome: 2, seed: 153 },
    { x: 1380, y: 1600, rx: 210, ry: 150, biome: 2, seed: 154 },
    { x: 610, y: 1850, rx: 230, ry: 165, biome: 2, seed: 155 },
    { x: 830, y: 1900, rx: 220, ry: 160, biome: 2, seed: 156 },
    { x: 1050, y: 1800, rx: 240, ry: 170, biome: 2, seed: 157 },
    { x: 1270, y: 1950, rx: 230, ry: 165, biome: 2, seed: 158 },
    { x: 940, y: 2200, rx: 220, ry: 160, biome: 2, seed: 159 },

    // --- 12. QUẦN ĐẢO THẠCH ANH CỰC NAM (South Quartz Isles) ---
    { x: 2300, y: 5200, rx: 180, ry: 130, biome: 4, seed: 160 },
    { x: 2520, y: 5150, rx: 190, ry: 140, biome: 4, seed: 161 },
    { x: 2740, y: 5250, rx: 185, ry: 135, biome: 5, seed: 162 },
    { x: 2960, y: 5200, rx: 180, ry: 130, biome: 5, seed: 163 },
    { x: 2410, y: 5550, rx: 190, ry: 140, biome: 4, seed: 164 },
    { x: 2630, y: 5600, rx: 200, ry: 145, biome: 5, seed: 165 },
    { x: 2850, y: 5500, rx: 185, ry: 135, biome: 4, seed: 166 },
    { x: 3070, y: 5550, rx: 180, ry: 130, biome: 5, seed: 167 },
    { x: 2740, y: 5800, rx: 190, ry: 140, biome: 4, seed: 168 },
    { x: 2960, y: 5850, rx: 185, ry: 135, biome: 5, seed: 169 },

    // --- 13. LỤC ĐỊA RỪNG THÔNG ĐÔNG NAM (Southeast Pine Continent) ---
    { x: 6100, y: 5200, rx: 210, ry: 150, biome: 6, seed: 170 },
    { x: 6320, y: 5150, rx: 220, ry: 160, biome: 6, seed: 171 },
    { x: 6540, y: 5250, rx: 210, ry: 150, biome: 0, seed: 172 },
    { x: 6760, y: 5200, rx: 230, ry: 165, biome: 0, seed: 173 },
    { x: 6210, y: 5550, rx: 220, ry: 160, biome: 6, seed: 174 },
    { x: 6430, y: 5600, rx: 230, ry: 165, biome: 0, seed: 175 },
    { x: 6650, y: 5500, rx: 210, ry: 150, biome: 6, seed: 176 },
    { x: 6870, y: 5550, rx: 220, ry: 160, biome: 0, seed: 177 },
    { x: 6540, y: 5800, rx: 230, ry: 165, biome: 6, seed: 178 },
    { x: 6760, y: 5850, rx: 210, ry: 150, biome: 0, seed: 179 },

    // --- 14. LỤC ĐỊA PHA LÊ ĐÔNG CỰC (Far East Crystal Continent - MỚI) ---
    { x: 7100, y: 1000, rx: 200, ry: 140, biome: 4, seed: 200 },
    { x: 7320, y: 950, rx: 210, ry: 150, biome: 4, seed: 201 },
    { x: 7540, y: 1050, rx: 220, ry: 160, biome: 5, seed: 202 },
    { x: 7760, y: 1000, rx: 200, ry: 145, biome: 5, seed: 203 },
    { x: 7210, y: 1300, rx: 210, ry: 150, biome: 4, seed: 204 },
    { x: 7430, y: 1350, rx: 220, ry: 160, biome: 5, seed: 205 },
    { x: 7650, y: 1250, rx: 210, ry: 150, biome: 4, seed: 206 },
    { x: 7870, y: 1300, rx: 200, ry: 145, biome: 5, seed: 207 },
    { x: 7320, y: 1600, rx: 210, ry: 150, biome: 4, seed: 208 },
    { x: 7540, y: 1650, rx: 220, ry: 160, biome: 5, seed: 209 },
    { x: 7760, y: 1550, rx: 210, ry: 150, biome: 4, seed: 210 },
    { x: 7540, y: 1900, rx: 200, ry: 145, biome: 5, seed: 211 },

    // --- 15. QUẦN ĐẢO ĐẦM LẦY PHÍA TÂY (West Swamp Archipelago - MỚI) ---
    { x: 500, y: 3000, rx: 180, ry: 130, biome: 7, seed: 212 },
    { x: 720, y: 2950, rx: 190, ry: 140, biome: 7, seed: 213 },
    { x: 940, y: 3050, rx: 185, ry: 135, biome: 7, seed: 214 },
    { x: 1160, y: 3000, rx: 180, ry: 130, biome: 7, seed: 215 },
    { x: 610, y: 3350, rx: 190, ry: 140, biome: 7, seed: 216 },
    { x: 830, y: 3400, rx: 200, ry: 145, biome: 7, seed: 217 },
    { x: 1050, y: 3300, rx: 185, ry: 135, biome: 7, seed: 218 },
    { x: 1270, y: 3350, rx: 180, ry: 130, biome: 7, seed: 219 },
    { x: 720, y: 3700, rx: 190, ry: 140, biome: 7, seed: 220 },
    { x: 940, y: 3750, rx: 185, ry: 135, biome: 7, seed: 221 },
    { x: 1160, y: 3650, rx: 180, ry: 130, biome: 7, seed: 222 },
    { x: 940, y: 4000, rx: 190, ry: 140, biome: 7, seed: 223 },

    // --- 16. LỤC ĐỊA CÁT ĐỎ PHÍA TÂY NAM (Southwest Red Sand Continent - MỚI) ---
    { x: 1200, y: 4500, rx: 210, ry: 150, biome: 3, seed: 224 },
    { x: 1420, y: 4450, rx: 220, ry: 160, biome: 3, seed: 225 },
    { x: 1640, y: 4550, rx: 210, ry: 150, biome: 1, seed: 226 },
    { x: 1860, y: 4500, rx: 230, ry: 165, biome: 1, seed: 227 },
    { x: 1310, y: 4850, rx: 220, ry: 160, biome: 3, seed: 228 },
    { x: 1530, y: 4900, rx: 230, ry: 165, biome: 1, seed: 229 },
    { x: 1750, y: 4800, rx: 210, ry: 150, biome: 3, seed: 230 },
    { x: 1970, y: 4850, rx: 220, ry: 160, biome: 1, seed: 231 },
    { x: 1540, y: 5200, rx: 230, ry: 165, biome: 3, seed: 232 },
    { x: 1760, y: 5250, rx: 210, ry: 150, biome: 1, seed: 233 },
    { x: 1980, y: 5150, rx: 220, ry: 160, biome: 3, seed: 234 },
    { x: 1760, y: 5550, rx: 230, ry: 165, biome: 1, seed: 235 },

    // --- 17. LỤC ĐỊA THÔNG XANH PHÍA ĐÔNG NAM (Southeast Green Pine Continent - MỚI) ---
    { x: 5100, y: 4400, rx: 210, ry: 150, biome: 6, seed: 236 },
    { x: 5320, y: 4350, rx: 220, ry: 160, biome: 6, seed: 237 },
    { x: 5540, y: 4450, rx: 210, ry: 150, biome: 0, seed: 238 },
    { x: 5760, y: 4400, rx: 230, ry: 165, biome: 0, seed: 239 },
    { x: 5210, y: 4750, rx: 220, ry: 160, biome: 6, seed: 240 },
    { x: 5430, y: 4800, rx: 230, ry: 165, biome: 0, seed: 241 },
    { x: 5650, y: 4700, rx: 210, ry: 150, biome: 6, seed: 242 },
    { x: 5870, y: 4750, rx: 220, ry: 160, biome: 0, seed: 243 },
    { x: 5320, y: 5100, rx: 230, ry: 165, biome: 6, seed: 244 },
    { x: 5540, y: 5150, rx: 210, ry: 150, biome: 0, seed: 245 },
    { x: 5760, y: 5050, rx: 220, ry: 160, biome: 6, seed: 246 },
    { x: 5430, y: 5450, rx: 230, ry: 165, biome: 0, seed: 247 },
    { x: 5650, y: 5500, rx: 210, ry: 150, biome: 6, seed: 248 },
    { x: 5870, y: 5400, rx: 220, ry: 160, biome: 0, seed: 249 },
  ];

  const islets = [
    { x: 200, y: 200, rx: 50, ry: 40, biome: 2, seed: 100 },
    { x: 600, y: 100, rx: 45, ry: 35, biome: 2, seed: 101 },
    { x: 1200, y: 150, rx: 55, ry: 45, biome: 2, seed: 102 },
    { x: 1600, y: 100, rx: 48, ry: 38, biome: 2, seed: 103 },
    { x: 3500, y: 150, rx: 52, ry: 42, biome: 4, seed: 104 },
    { x: 4900, y: 100, rx: 45, ry: 35, biome: 4, seed: 105 },
    { x: 4950, y: 600, rx: 60, ry: 48, biome: 5, seed: 106 },
    { x: 4900, y: 1400, rx: 50, ry: 40, biome: 1, seed: 107 },
    { x: 4980, y: 2200, rx: 55, ry: 45, biome: 4, seed: 108 },
    { x: 4900, y: 3000, rx: 48, ry: 38, biome: 1, seed: 109 },
    { x: 4950, y: 3700, rx: 52, ry: 42, biome: 1, seed: 110 },
    { x: 3200, y: 3750, rx: 45, ry: 35, biome: 7, seed: 111 },
    { x: 2200, y: 3780, rx: 60, ry: 48, biome: 7, seed: 112 },
    { x: 1200, y: 3750, rx: 50, ry: 40, biome: 7, seed: 113 },
    { x: 100, y: 3700, rx: 55, ry: 45, biome: 3, seed: 114 },
    { x: 150, y: 2900, rx: 48, ry: 38, biome: 3, seed: 115 },
    { x: 100, y: 2100, rx: 52, ry: 42, biome: 3, seed: 116 },
    { x: 150, y: 1300, rx: 45, ry: 35, biome: 0, seed: 117 },
    { x: 200, y: 700, rx: 60, ry: 48, biome: 0, seed: 118 },
    { x: 100, y: 100, rx: 50, ry: 40, biome: 2, seed: 119 },
    { x: 2500, y: 900, rx: 70, ry: 50, biome: 6, seed: 120 },
    { x: 3500, y: 1600, rx: 65, ry: 48, biome: 7, seed: 121 },
    { x: 1500, y: 2500, rx: 58, ry: 44, biome: 0, seed: 122 },
    { x: 800, y: 1800, rx: 62, ry: 46, biome: 1, seed: 123 },
    { x: 4200, y: 2500, rx: 68, ry: 52, biome: 4, seed: 124 },
    { x: 2800, y: 2200, rx: 54, ry: 42, biome: 0, seed: 125 },
    { x: 3200, y: 2500, rx: 60, ry: 48, biome: 6, seed: 126 },
    { x: 1100, y: 2200, rx: 48, ry: 38, biome: 1, seed: 127 },
    { x: 2700, y: 700,  rx: 52, ry: 42, biome: 2, seed: 128 },
    { x: 3100, y: 800,  rx: 58, ry: 44, biome: 6, seed: 129 },
    { x: 3700, y: 1100, rx: 62, ry: 46, biome: 7, seed: 130 },
    { x: 1100, y: 1500, rx: 50, ry: 40, biome: 0, seed: 131 },
    { x: 900, y: 1300,  rx: 55, ry: 45, biome: 1, seed: 132 },
    { x: 1300, y: 900,  rx: 48, ry: 38, biome: 7, seed: 133 },
    { x: 300, y: 2300,  rx: 52, ry: 42, biome: 3, seed: 134 },
  ];

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
    selected: 7,
    hover: null,
    tick: 0,
    level: 25,
    xp: 68,
    zoom: BASE_ZOOM,
    targetZoom: BASE_ZOOM,
    panX: 0,
    panY: 0,
    drag: null,
    dragMoved: false,
    selectedRegion: null,
    voyages: [],
    resources: { gold: 1250, wood: 830, stone: 670, gems: 420 },
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
    toast: "CHỌN THÀNH CỦA BẠN ĐỂ RA LỆNH",
  };

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.resources) state.resources = Object.assign(state.resources, saved.resources);
      if (Array.isArray(saved.towns)) {
        saved.towns.forEach((s) => {
          const t = towns.find((it) => it.id === s.id);
          if (t) Object.assign(t, { lvl: s.lvl || t.lvl, owner: s.owner ?? t.owner, troops: s.troops || t.troops });
        });
      }
    } catch (e) {}
  }

  function save() {
    const data = {
      resources: state.resources,
      towns: towns.map(({ id, lvl, owner, troops }) => ({ id, lvl, owner, troops })),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
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
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0c446b");
    g.addColorStop(0.5, "#0b5883");
    g.addColorStop(1, "#07486f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(42, 138, 186, 0.25)";
    for (let y = 0; y < H; y += 16) {
      for (let x = 0; x < W; x += 16) {
        if ((x / 16 + y / 16) % 2 === 0) {
          pxRect(x, y, 16, 16, "rgba(255, 255, 255, 0.02)");
        }
      }
    }
    for (let y = 8; y < H; y += 28) {
      for (let x = -10; x < W + 20; x += 42) {
        const offset = Math.sin((x * 0.02) + state.tick * 1.2) * 4;
        const py = y + offset;
        const waveType = hash(x * 7 + y * 13);
        if (waveType > 0.6) {
          pxRect(x + (y % 17), py, 14, 2, "rgba(100, 205, 240, 0.35)");
          pxRect(x + (y % 17) + 2, py + 2, 10, 2, "rgba(20, 95, 140, 0.4)");
        } else if (waveType > 0.3) {
          pxRect(x, py, 6, 2, "rgba(140, 220, 255, 0.25)");
        }
      }
    }
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
    const pts = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      const chip = hash(seed * 97 + i * 13) * 0.18 - 0.09;
      const wave = 1 + Math.sin(a * 4 + seed) * 0.12 + Math.cos(a * 8 - seed * 0.5) * 0.08 + chip;
      const x = Math.round((cx + Math.cos(a) * rx * wave) / 4) * 4;
      const y = Math.round((cy + Math.sin(a) * ry * wave) / 4) * 4;
      pts.push([x, y]);
    }
    return pts;
  }

  const organicPathCache = new Map();
  function getOrganicPath(cx, cy, rx, ry, seed, key) {
    const cacheKey = `${key}_${Math.round(cx)}_${Math.round(cy)}_${Math.round(rx)}_${Math.round(ry)}`;
    let pts = organicPathCache.get(cacheKey);
    if (!pts) {
      pts = organicPath(cx, cy, rx, ry, seed);
      organicPathCache.set(cacheKey, pts);
    }
    return pts;
  }

  function fillPath(points, color) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function pathFromPoints(points, dx, dy, wobbleSeed, wobble) {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      const wob = wobble ? (hash(wobbleSeed + i * 19) - 0.5) * wobble : 0;
      const px = Math.round((x + (dx || 0) + wob) / 4) * 4;
      const py = Math.round((y + (dy || 0) + wob * 0.35) / 4) * 4;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
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

  function drawHill(x, y, scale, color) {
    scale = scale || 1;
    pxRect(x - 16 * scale, y + 10 * scale, 32 * scale, 6 * scale, "rgba(0,0,0,0.2)");
    ctx.fillStyle = color || "#6fa044";
    ctx.beginPath();
    ctx.ellipse(x, y + 8 * scale, 20 * scale, 14 * scale, 0, Math.PI, 0);
    ctx.fill();
    pxRect(x - 10 * scale, y + 2 * scale, 8 * scale, 4 * scale, "rgba(255,255,255,0.18)");
    pxRect(x + 4 * scale, y + 8 * scale, 10 * scale, 4 * scale, "rgba(0,0,0,0.12)");
  }

  function drawBush(x, y, scale) {
    scale = scale || 1;
    pxRect(x - 8 * scale, y + 6 * scale, 16 * scale, 5 * scale, "rgba(0,0,0,0.16)");
    pxRect(x - 9 * scale, y - 1 * scale, 8 * scale, 8 * scale, "#315c34");
    pxRect(x - 2 * scale, y - 5 * scale, 10 * scale, 10 * scale, "#477a3e");
    pxRect(x + 6 * scale, y, 7 * scale, 7 * scale, "#2f6338");
    pxRect(x - 1 * scale, y - 3 * scale, 4 * scale, 3 * scale, "#7fb467");
  }

  function drawLakeInRegion(r, seed, rx, ry) {
    if (hash(seed * 43) < 0.78) return;
    const lx = r.x + (hash(seed * 47) - 0.5) * rx * 0.72;
    const ly = r.y + (hash(seed * 53) - 0.5) * ry * 0.58;
    const lrx = Math.max(16, rx * (0.12 + hash(seed * 59) * 0.07));
    const lry = Math.max(10, ry * (0.08 + hash(seed * 61) * 0.05));
    const lake = organicPath(lx, ly, lrx, lry, seed * 2.1);
    fillPath(organicPath(lx + 2, ly + 3, lrx + 5, lry + 4, seed * 2.1 + 1), "rgba(36,55,45,0.42)");
    fillPath(lake, "#2d7fa0");
    ctx.strokeStyle = "#164f6b";
    ctx.lineWidth = 3;
    ctx.stroke();
    pxRect(lx - lrx * 0.3, ly - 2, lrx * 0.42, 2, "rgba(150,225,230,0.7)");
  }

  function drawRiverInRegion(r, seed, rx, ry) {
    if (hash(seed * 19) < 0.72) return;
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.setLineDash([]);
    ctx.lineCap = "square";
    const sx = r.x - rx * 0.44;
    const ex = r.x + rx * 0.44;
    const cy = r.y + (hash(seed * 23) - 0.5) * ry * 0.45;
    ctx.strokeStyle = "#173f6b";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sx, cy);
    ctx.bezierCurveTo(r.x - rx * 0.25, cy - ry * 0.35, r.x + rx * 0.22, cy + ry * 0.3, ex, cy + (hash(seed * 29) - 0.5) * ry * 0.25);
    ctx.stroke();
    ctx.strokeStyle = "#6dc8e5";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawRegionTerrain(r, seed, rx, ry, originalBiome) {
    drawLakeInRegion(r, seed, rx, ry);
    drawRiverInRegion(r, seed, rx, ry);
    const count = originalBiome === 6 ? 24 : originalBiome === 2 ? 18 : originalBiome === 0 || originalBiome === 7 ? 22 : 16;
    for (let i = 0; i < count; i++) {
      const a = hash(seed * 61 + i * 17) * TAU;
      const rr = Math.sqrt(hash(seed * 67 + i * 23)) * 0.72;
      const x = Math.round((r.x + Math.cos(a) * rx * rr) / 4) * 4;
      const y = Math.round((r.y + Math.sin(a) * ry * rr) / 4) * 4;
      const pick = hash(seed * 73 + i * 31);
      
      if (pick < 0.16) {
        // Strategic resource zones depending on biomes
        let resType = "gold";
        if (originalBiome === 0 || originalBiome === 6 || originalBiome === 7) {
          // Rich Forestry & Gold Zone (Forests, Pine, Mint)
          resType = pick < 0.12 ? "wood" : "gold";
        } else if (originalBiome === 1 || originalBiome === 3) {
          // Rich Mining Zone (Sa mạc, Hỏa sơn)
          resType = pick < 0.10 ? "gold" : "stone";
        } else if (originalBiome === 4 || originalBiome === 5) {
          // Rich Gem Zone (Phù thủy, Đất tím)
          resType = "gems";
        } else if (originalBiome === 2) {
          // Cold Snow Wasteland
          resType = pick < 0.08 ? "stone" : "gems";
        }
        drawResourceIcon(resType, x, y);
      } else if (originalBiome === 2 || pick > 0.86) {
        drawMountain(x, y, originalBiome === 2 ? 0.44 : 0.34);
      } else if (pick > 0.58 || originalBiome === 6 || originalBiome === 0 || originalBiome === 7) {
        drawTree(x, y, pick > 0.42 ? 0.68 : 0.5);
      } else if (pick > 0.28) {
        drawBush(x, y, pick > 0.45 ? 0.75 : 0.56);
      } else {
        drawHill(x, y, pick > 0.55 ? 0.5 : 0.4, originalBiome === 3 ? "#8a6b52" : "#7d8760");
      }
    }
  }

  function drawRegion(r, idx, pass, isIslet) {
    const biome = BIOMES[r.biome] || BIOMES[0];
    const seed = r.seed || idx + 1;
    const scale = isIslet ? 0.82 : 1.02;
    const rx = (r.rx || r.r) * scale;
    const ry = (r.ry || r.r * 0.78) * scale;

    const cachePrefix = isIslet ? `islet_${idx}` : `region_${idx}`;

    if (pass === 0) {
      // Shallow water outline / foam (light cyan pixel border around island)
      const shallow = getOrganicPath(r.x, r.y, rx + 16, ry + 14, seed * 1.7, `${cachePrefix}_shallow`);
      fillPath(shallow, "#289db9");
      return;
    }

    if (pass === 1) {
      // Dark shoreline base & Sand rim
      const coast = getOrganicPath(r.x + 1.5, r.y + 2, rx + 7, ry + 7, seed * 1.7 + 0.15, `${cachePrefix}_coast`);
      fillPath(coast, "#393529");

      const sandRim = getOrganicPath(r.x, r.y, rx + 3, ry + 3, seed * 1.7 + 0.25, `${cachePrefix}_sand`);
      fillPath(sandRim, "#d5a549");
      return;
    }

    // Pass 2: Main land body and details
    const land = getOrganicPath(r.x, r.y, rx, ry, seed * 1.7 + 0.4, `${cachePrefix}_land`);
    fillPath(land, biome.a);

    ctx.save();
    // Clip to territory boundary for smooth internal pixel texturing
    ctx.beginPath();
    ctx.moveTo(land[0][0], land[0][1]);
    for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
    ctx.closePath();
    ctx.clip();

    // Sparse soft pixel grain, not a full noisy blanket.
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

    // Top-left light highlight & bottom-right depth gradient
    const vg = ctx.createLinearGradient(r.x - rx, r.y - ry, r.x + rx, r.y + ry);
    vg.addColorStop(0, "rgba(255, 255, 255, 0.18)");
    vg.addColorStop(0.5, "rgba(0, 0, 0, 0)");
    vg.addColorStop(1, "rgba(0, 0, 0, 0.25)");
    ctx.fillStyle = vg;
    ctx.fillRect(r.x - rx - 16, r.y - ry - 16, rx * 2 + 32, ry * 2 + 32);

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

    drawRegionTerrain(r, seed, rx, ry, r.biome);

    // Restore clip context early so highlights and borders can draw outwards without clipping
    ctx.restore();

    if (state.selectedRegion === idx) {
      ctx.save();
      // Draw smooth transparent gold highlight matching exactly the land path shape
      ctx.globalAlpha = 0.22 + Math.sin(state.tick * 5) * 0.05;
      fillPath(land, "#ffe85a");
      ctx.restore();
    }

    // Recreate land path for border stroke outside the clipped context
    ctx.beginPath();
    ctx.moveTo(land[0][0], land[0][1]);
    for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
    ctx.closePath();

    // Dark outer province line + soft bright inner line.
    ctx.strokeStyle = "rgba(38, 45, 30, 0.82)";
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.strokeStyle = "rgba(218, 220, 178, 0.38)";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (state.selectedRegion === idx) {
      ctx.save();
      
      // Recreate land path for the double golden neon glowing border stroke
      ctx.beginPath();
      ctx.moveTo(land[0][0], land[0][1]);
      for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
      ctx.closePath();

      ctx.shadowColor = "#ffe85a";
      ctx.shadowBlur = 24;
      ctx.globalAlpha = 0.86 + Math.sin(state.tick * 5) * 0.14;
      ctx.strokeStyle = "#fff06a";
      ctx.lineWidth = 5.5;
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
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

  function drawTree(x, y, scale) {
    scale = scale || 1;
    pxRect(x - 8 * scale, y + 8 * scale, 16 * scale, 6 * scale, "rgba(0,0,0,0.25)");
    pxRect(x - 2 * scale, y + 6 * scale, 4 * scale, 8 * scale, "#4a2a18");
    pxRect(x - 9 * scale, y + 1 * scale, 18 * scale, 8 * scale, "#1c4a22");
    pxRect(x - 7 * scale, y - 5 * scale, 14 * scale, 8 * scale, "#276830");
    pxRect(x - 5 * scale, y - 11 * scale, 10 * scale, 7 * scale, "#388c42");
    pxRect(x - 2 * scale, y - 15 * scale, 4 * scale, 5 * scale, "#54b05e");
    pxRect(x - 4 * scale, y - 9 * scale, 4 * scale, 4 * scale, "#78d482");
  }

  function drawMountain(x, y, scale) {
    scale = scale || 1;
    pxRect(x - 24 * scale, y + 16 * scale, 48 * scale, 8 * scale, "rgba(0,0,0,0.28)");
    ctx.fillStyle = "#48535e";
    ctx.beginPath();
    ctx.moveTo(x, y - 28 * scale);
    ctx.lineTo(x - 22 * scale, y + 18 * scale);
    ctx.lineTo(x, y + 18 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7a8895";
    ctx.beginPath();
    ctx.moveTo(x, y - 28 * scale);
    ctx.lineTo(x, y + 18 * scale);
    ctx.lineTo(x + 22 * scale, y + 18 * scale);
    ctx.closePath();
    ctx.fill();
    pxRect(x - 1 * scale, y - 26 * scale, 2 * scale, 44 * scale, "#a5b4c2");
    ctx.fillStyle = "#f4f6f8";
    ctx.beginPath();
    ctx.moveTo(x, y - 28 * scale);
    ctx.lineTo(x - 9 * scale, y - 4 * scale);
    ctx.lineTo(x - 3 * scale, y - 8 * scale);
    ctx.lineTo(x + 4 * scale, y - 3 * scale);
    ctx.lineTo(x + 9 * scale, y - 6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c5d2dc";
    ctx.fillRect(x - 8 * scale, y - 4 * scale, 7 * scale, 3 * scale);
    ctx.strokeStyle = "#252c33";
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(x - 20 * scale, y + 16 * scale, 40 * scale, 2 * scale);
  }

  function drawDecoration() {
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
        drawTree(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, hash(ci * 23 + i) > 0.68 ? 1.15 : 0.86);
      }
    });
    const mountains = [
      [462, 91, 1.22], [517, 96, 1], [570, 108, 1.18], [630, 102, 0.9], [410, 131, 0.74],
      [859, 704, 1.25], [914, 698, 1], [891, 746, 0.9], [642, 286, 0.45], [578, 430, 0.48],
      [716, 520, 0.45], [374, 269, 0.43], [836, 552, 0.46], [866, 932, 1.2], [916, 946, 1.0],
      [970, 970, 0.88], [650, 1190, 0.52], [710, 1196, 0.48], [330, 160, 0.9], [770, 145, 0.85],
      [380, 900, 1.1], [270, 860, 0.95],
    ];
    mountains.forEach((m) => drawMountain(m[0], m[1], m[2]));
    const stones = [[602, 526], [628, 523], [651, 523], [548, 292], [565, 302], [759, 466], [784, 464], [691, 585], [876, 770], [842, 794], [970, 292], [326, 517], [506, 847], [546, 850], [580, 1070], [608, 1084], [808, 1010], [834, 1014], [720, 1268], [300, 910], [1060, 710]];
    stones.forEach(([x, y], i) => {
      pxRect(x - 6, y - 4, 12, 8, i % 2 ? "#5b6056" : "#94907a");
      pxRect(x - 2, y - 7, 8, 4, "#c7be9e");
    });
  }

  function drawCastle(t) {
    const owner = factions[t.owner];
    const sel = t.id === state.selected;
    if (sel) {
      ctx.fillStyle = "rgba(255, 230, 90, 0.35)";
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + 24, 44, 18, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#ffe24a";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    pxRect(t.x - 30, t.y + 16, 60, 14, "rgba(0,0,0,0.3)");
    pxRect(t.x - 26, t.y + 12, 52, 12, "#3d362e");
    pxRect(t.x - 22, t.y - 12, 44, 28, "#635c52");
    pxRect(t.x - 18, t.y - 8, 36, 24, "#8a8174");
    pxRect(t.x - 26, t.y - 18, 12, 32, "#736b5e");
    pxRect(t.x + 14, t.y - 18, 12, 32, "#736b5e");
    pxRect(t.x - 24, t.y - 14, 8, 26, "#9e9485");
    pxRect(t.x + 16, t.y - 14, 8, 26, "#9e9485");
    pxRect(t.x - 27, t.y - 22, 14, 4, "#3d362e");
    pxRect(t.x + 13, t.y - 22, 14, 4, "#3d362e");
    pxRect(t.x - 12, t.y - 32, 24, 38, "#9e9485");
    pxRect(t.x - 8, t.y - 28, 16, 32, "#b8ad9c");
    pxRect(t.x - 7, t.y + 2, 14, 18, "#261c16");
    pxRect(t.x - 5, t.y + 4, 10, 14, "#473224");
    for (let i = -2; i <= 2; i++) {
      pxRect(t.x + i * 10 - 3, t.y - 36, 6, 6, "#d1c5b4");
    }
    pxRect(t.x - 1, t.y - 58, 3, 24, "#241d17");
    pxRect(t.x + 2, t.y - 57, 26, 15, owner.color);
    pxRect(t.x + 24, t.y - 53, 6, 7, owner.color);
    pxRect(t.x + 2, t.y - 43, 28, 2, "rgba(0,0,0,0.4)");
    pxRect(t.x - 12, t.y + 22, 24, 20, "#121921");
    ctx.strokeStyle = "#384756";
    ctx.lineWidth = 2;
    ctx.strokeRect(t.x - 12, t.y + 22, 24, 20);
    text(String(t.lvl), t.x, t.y + 24, 16, "#ffffff", "center");
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

  function drawVoyageShip(x, y, color) {
    pxRect(x - 16, y + 8, 32, 9, "#4a2912");
    pxRect(x - 12, y + 15, 24, 5, "#211106");
    pxRect(x - 2, y - 20, 4, 30, "#2b1709");
    pxRect(x + 3, y - 17, 18, 14, "#f7ead0");
    pxRect(x - 14, y - 5, 14, 13, "#eee0c2");
    pxRect(x + 4, y - 25, 16, 8, color);
  }

  function drawVoyages() {
    state.voyages.forEach((v) => {
      const t = Math.min(1, v.t / v.duration);
      const bend = Math.sin(t * Math.PI) * -46;
      const x = lerp(v.from.x, v.to.x, t);
      const y = lerp(v.from.y, v.to.y, t) + bend;
      ctx.setLineDash([8, 9]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(238,249,246,0.82)";
      ctx.beginPath();
      ctx.moveTo(v.from.x, v.from.y);
      ctx.quadraticCurveTo((v.from.x + v.to.x) / 2, (v.from.y + v.to.y) / 2 - 84, v.to.x, v.to.y);
      ctx.stroke();
      ctx.setLineDash([]);
      drawVoyageShip(x, y, factions[0].color);
    });
  }

  function drawCoin(x, y, scale) {
    const r = 9 * scale;
    ctx.fillStyle = "#ffd25a";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#8c5b0d";
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();
    pxRect(x - 1.5 * scale, y - 4 * scale, 3 * scale, 8 * scale, "#fff3b3");
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

  function drawWorld() {
    drawOcean();
    drawRoutes();
    ctx.save();
    ctx.translate((1 - state.zoom) * W * 0.48 + state.panX, (1 - state.zoom) * H * 0.48 + state.panY);
    ctx.scale(state.zoom, state.zoom);

    // Pass 0: Draw shallow water foam for all islands
    islets.forEach((r, i) => drawRegion(r, i + 200, 0, true));
    regions.forEach((r, i) => drawRegion(r, i, 0, false));

    // Pass 1: Draw sand rims and coast lines for all islands
    islets.forEach((r, i) => drawRegion(r, i + 200, 1, true));
    regions.forEach((r, i) => drawRegion(r, i, 1, false));

    // Pass 2: Draw main land bodies, terrain details and borders
    islets.forEach((r, i) => drawRegion(r, i + 200, 2, true));
    regions.forEach((r, i) => drawRegion(r, i, 2, false));

    drawDecoration();
    drawVoyages();
    // Hide map object icons while reviewing the terrain-only world map.
    // Hide world castle icons while testing territory color ownership.
    // Hide lighthouse icons while reviewing the terrain-only world map.
    ctx.restore();
  }

  function drawResourceIcon(type, x, y) {
    if (type === "gold") drawCoin(x, y, 0.9);
    if (type === "wood") {
      pxRect(x - 14, y - 4, 28, 9, "#a8662c");
      pxRect(x - 8, y - 12, 28, 9, "#c7813a");
      pxRect(x + 10, y - 13, 7, 7, "#6c3b1e");
    }
    if (type === "stone") {
      pxRect(x - 13, y - 3, 17, 14, "#aeb7c0");
      pxRect(x + 2, y - 11, 17, 18, "#78858f");
      pxRect(x - 3, y - 14, 12, 9, "#d3d9de");
    }
    if (type === "gems") {
      pxRect(x - 14, y - 3, 28, 16, "#c04cff");
      pxRect(x - 8, y - 13, 16, 10, "#ef9aff");
      pxRect(x - 2, y + 13, 7, 8, "#7d27b7");
    }
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

  function drawSidePanels() {
    panel(12, 94, 248, 158, "NHIỆM VỤ");
    state.missions.forEach((m, i) => {
      text(m.text, 28, 151 + i * 42, 17, "#f3f0db");
      text(`${m.value}/${m.goal}`, 225, 151 + i * 42, 18, "#ffd34d", "right");
    });
    panel(12, 274, 180, 158, "THÔNG TIN");
    const owned = towns.filter((t) => t.owner === 0).length;
    const troops = towns.filter((t) => t.owner === 0).reduce((a, t) => a + t.troops, 0);
    text(`LÃNH THỔ: ${owned + 4}/24`, 28, 330, 18);
    text(`THÀNH PHỐ: ${owned}`, 28, 372, 18);
    text(`QUÂN ĐỘI: ${troops}`, 28, 414, 18);

    buttons.forEach(drawButton);

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
    else if (b.id === "zoomIn" || b.id === "zoomOut") text(b.label, cx, b.y + 12, 32, "#fff3d2", "center");
    if (!["zoomIn", "zoomOut"].includes(b.id)) text(b.label, cx, b.y + b.h - 28, 17, "#fff3d2", "center");
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
    ];
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

  function drawWorld() {
    drawOcean();
    drawRoutes();
    ctx.save();
    ctx.translate((1 - state.zoom) * W * 0.48 + state.panX, (1 - state.zoom) * H * 0.48 + state.panY);
    ctx.scale(state.zoom, state.zoom);

    // Pass 0: Draw shallow water foam for all islands
    islets.forEach((r, i) => drawRegion(r, i + 200, 0, true));
    regions.forEach((r, i) => drawRegion(r, i, 0, false));

    // Pass 1: Draw sand rims and coast lines for all islands
    islets.forEach((r, i) => drawRegion(r, i + 200, 1, true));
    regions.forEach((r, i) => drawRegion(r, i, 1, false));

    // Pass 2: Draw main land bodies, terrain details and borders
    islets.forEach((r, i) => drawRegion(r, i + 200, 2, true));
    regions.forEach((r, i) => drawRegion(r, i, 2, false));

    drawDecoration();
    drawVoyages();
    // Hide map object icons while reviewing the terrain-only world map.
    // Hide world castle icons while testing territory color ownership.
    // Hide lighthouse icons while reviewing the terrain-only world map.
    ctx.restore();
  }

  function drawFrame() {
    drawWorld();
    drawMinimap();
    // drawTopBar();
    // drawSidePanels();
  }

  const BIOME_COLORS = {
    0: "#557a46", // grass
    1: "#dfd19f", // sand
    2: "#e2ebf0", // snow
    3: "#a03c28", // ember
    4: "#884ea0", // violet
    5: "#f48fb1", // rose
    6: "#2d5a27", // pine
    7: "#70db93", // mint
  };

  let minimapDragging = false;
  
  function panToMinimapCoords(e) {
    if (!minimapCanvas) return;
    const rect = minimapCanvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (160 / rect.width);
    const my = (e.clientY - rect.top) * (120 / rect.height);
    
    // Map to world coordinates (0 to 8000, 0 to 6000)
    const worldX = Math.max(0, Math.min(8000, mx * 50));
    const worldY = Math.max(0, Math.min(6000, my * 50));
    
    // Center camera on this world coordinate
    state.panX = -worldX * state.zoom + W * 0.5 - (1 - state.zoom) * W * 0.48;
    state.panY = -worldY * state.zoom + H * 0.5 - (1 - state.zoom) * H * 0.48;
    clampPan();
  }

  const onMinimapMouseMove = (e) => {
    if (minimapDragging) panToMinimapCoords(e);
  };
  const onMinimapMouseUp = () => {
    minimapDragging = false;
  };

  if (minimapCanvas) {
    minimapCanvas.addEventListener("mousedown", (e) => {
      minimapDragging = true;
      panToMinimapCoords(e);
    });
    window.addEventListener("mousemove", onMinimapMouseMove);
    window.addEventListener("mouseup", onMinimapMouseUp);
  }

  function drawMinimap() {
    if (!minimapCanvas || !minimapCtx) return;
    
    // Clear background (ocean color)
    minimapCtx.fillStyle = "#0b6f95";
    minimapCtx.fillRect(0, 0, 160, 120);
    
    // Draw all regions (continents)
    regions.forEach((r) => {
      minimapCtx.fillStyle = BIOME_COLORS[r.biome] || "#557a46";
      minimapCtx.beginPath();
      const mx = r.x / 50;
      const my = r.y / 50;
      const mrx = (r.rx || r.r) / 50 * 1.02;
      const mry = (r.ry || r.r * 0.78) / 50 * 1.02;
      minimapCtx.ellipse(mx, my, mrx, mry, 0, 0, TAU);
      minimapCtx.fill();
    });

    // Draw all islets
    islets.forEach((r) => {
      minimapCtx.fillStyle = BIOME_COLORS[r.biome] || "#557a46";
      minimapCtx.beginPath();
      const mx = r.x / 50;
      const my = r.y / 50;
      const mrx = (r.rx || r.r) / 50 * 0.82;
      const mry = (r.ry || r.r * 0.78) / 50 * 0.82;
      minimapCtx.ellipse(mx, my, mrx, mry, 0, 0, TAU);
      minimapCtx.fill();
    });

    // Draw all towns
    towns.forEach((t) => {
      let color = "#ffdf00"; // player (gold)
      if (t.owner !== 0) {
        const fac = factions[t.owner];
        color = fac ? fac.color : "#ff3b30";
      }
      minimapCtx.fillStyle = color;
      const tx = t.x / 50 - 1.5;
      const ty = t.y / 50 - 1.5;
      minimapCtx.fillRect(tx, ty, 3, 3);
    });

    // Draw viewport boundary box
    const viewW = W / state.zoom;
    const viewH = H / state.zoom;
    const viewX = -(state.panX + (1 - state.zoom) * W * 0.48) / state.zoom;
    const viewY = -(state.panY + (1 - state.zoom) * H * 0.48) / state.zoom;

    const vx = viewX / 50;
    const vy = viewY / 50;
    const vw = viewW / 50;
    const vh = viewH / 50;

    minimapCtx.strokeStyle = "#ffe85a"; // yellow viewport box
    minimapCtx.lineWidth = 1;
    minimapCtx.setLineDash([4, 2]);
    minimapCtx.strokeRect(vx, vy, vw, vh);
    minimapCtx.setLineDash([]);
  }

  function buttonAt(x, y) {
    return buttons.find((b) => x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h);
  }

  function townAt(x, y) {
    const wx = (x - (1 - state.zoom) * W * 0.48 - state.panX) / state.zoom;
    const wy = (y - (1 - state.zoom) * H * 0.48 - state.panY) / state.zoom;
    let best = null;
    towns.forEach((t) => {
      const d = Math.hypot(t.x - wx, t.y - wy);
      if (d < 48 && (!best || d < best.d)) best = { t, d };
    });
    return best && best.t;
  }

  function screenToMap(x, y) {
    return {
      x: (x - (1 - state.zoom) * W * 0.48 - state.panX) / state.zoom,
      y: (y - (1 - state.zoom) * H * 0.48 - state.panY) / state.zoom,
    };
  }

  function regionAt(x, y) {
    const p = screenToMap(x, y);
    let best = null;
    const scan = (r, id, isIslet) => {
      const scale = isIslet ? 0.82 : 1.02;
      const rx = (r.rx || r.r) * scale;
      const ry = (r.ry || r.r * 0.78) * scale;
      const nx = (p.x - r.x) / rx;
      const ny = (p.y - r.y) / ry;
      const d = nx * nx + ny * ny;
      if (d <= 1 && (!best || d < best.d)) best = { id, d };
    };
    regions.forEach((r, i) => scan(r, i, false));
    islets.forEach((r, i) => scan(r, i + 200, true));
    return best !== null ? best.id : null;
  }

  function spend(cost) {
    for (const key in cost) if (state.resources[key] < cost[key]) return false;
    for (const key in cost) state.resources[key] -= cost[key];
    return true;
  }

  function handleButton(id) {
    const t = towns.find((it) => it.id === state.selected);
    if (id === "zoomIn") setZoom(state.targetZoom + 0.14);
    if (id === "zoomOut") setZoom(state.targetZoom - 0.14);
    if (!t) return;
    if (id === "army") {
      if (t.owner !== 0) return toast("CHỈ TUYỂN QUÂN Ở THÀNH CỦA BẠN");
      if (spend({ gold: 120, wood: 40 })) {
        t.troops += 24;
        toast("+24 QUÂN ĐÃ SẴN SÀNG");
      } else toast("KHÔNG ĐỦ VÀNG/GỖ");
    }
    if (id === "build") {
      if (t.owner !== 0) return toast("CHỈ NÂNG CẤP THÀNH CỦA BẠN");
      if (spend({ wood: 160, stone: 120 })) {
        t.lvl += 1;
        t.troops += 12;
        state.missions[2].value = Math.min(3, state.missions[2].value + 1);
        toast(`THÀNH ${t.id} LÊN CẤP ${t.lvl}`);
      } else toast("KHÔNG ĐỦ GỖ/ĐÁ");
    }
    if (id === "research") {
      if (spend({ gems: 45, gold: 90 })) toast("NGHIÊN CỨU TĂNG SẢN LƯỢNG");
      else toast("KHÔNG ĐỦ KIM CƯƠNG");
    }
    if (id === "treasure") toast("BẢO VẬT: KIẾM BÃO BIỂN +8% TẤN CÔNG");
    if (id === "ally") toast("LIÊN MINH ĐÃ GỬI 15 QUÂN VIỆN TRỢ");
    if (id === "map") toast("BẢN ĐỒ: TUYẾN BIỂN AN TOÀN ĐÃ HIỆN");
    if (id === "event") toast("SỰ KIỆN: MƯA VÀNG TRONG 30 GIÂY");
    save();
  }

  function attack(t) {
    const source = sourceTown();
    if (source && islandOfTown(source) !== islandOfTown(t)) {
      launchVoyage(source, t);
      return;
    }
    resolveAttack(t);
  }

  function resolveAttack(t) {
    const owned = towns.filter((it) => it.owner === 0);
    const power = owned.reduce((a, it) => a + it.troops, 0);
    const defense = t.troops + t.lvl * 18;
    if (power <= defense) {
      toast("QUÂN LỰC CHƯA ĐỦ ĐỂ CHIẾM");
      return;
    }
    owned.forEach((it) => {
      it.troops = Math.max(12, Math.floor(it.troops * 0.78));
    });
    t.owner = 0;
    t.troops = Math.max(28, Math.floor(defense * 0.36));
    state.missions[0].value = Math.min(3, state.missions[0].value + 1);
    pushLog(`PLAYER1: ĐÃ CHIẾM THÀNH ${t.id}!`);
    toast(`THÀNH ${t.id} THUỘC VỀ BẠN`);
    save();
  }

  function sourceTown() {
    const selected = towns.find((it) => it.id === state.selected && it.owner === 0);
    if (selected) return selected;
    return towns.filter((it) => it.owner === 0).sort((a, b) => b.troops - a.troops)[0];
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

  function launchVoyage(source, target) {
    if (state.voyages.some((v) => v.targetId === target.id)) {
      toast("ĐỘI THUYỀN ĐANG TRÊN ĐƯỜNG");
      return;
    }
    const dist = Math.hypot(source.x - target.x, source.y - target.y);
    state.voyages.push({
      from: { x: source.x, y: source.y },
      to: { x: target.x, y: target.y },
      targetId: target.id,
      t: 0,
      duration: Math.max(2.1, dist / 190),
    });
    source.troops = Math.max(12, Math.floor(source.troops * 0.88));
    toast(`THUYỀN XUẤT PHÁT TỪ THÀNH ${source.id} SANG ĐẢO ${target.id}`);
  }

  function toast(msg) {
    state.toast = msg;
  }

  function pushLog(msg) {
    state.log.push(msg);
    if (state.log.length > 8) state.log.shift();
  }

  function setZoom(value) {
    state.targetZoom = Math.max(0.52, Math.min(1.75, value));
    clampPan();
  }

  function clampPan() {
    const mapW = 8000;
    const mapH = 6000;
    
    // Generous pan limits so edge territories can be scrolled fully to the center of the screen
    const minPanX = -mapW * state.zoom + W * 0.5;
    const maxPanX = W * 0.5;
    const minPanY = -mapH * state.zoom + H * 0.5;
    const maxPanY = H * 0.5;
    
    state.panX = Math.max(minPanX, Math.min(maxPanX, state.panX));
    state.panY = Math.max(minPanY, Math.min(maxPanY, state.panY));
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

  canvas.addEventListener("mousemove", (e) => {
    const p = pointer(e);
    if (state.drag) {
      const dx = p.x - state.drag.x;
      const dy = p.y - state.drag.y;
      state.panX += dx;
      state.panY += dy;
      state.drag = p;
      if (Math.abs(dx) + Math.abs(dy) > 2) state.dragMoved = true;
      clampPan();
      return;
    }
    const b = buttonAt(p.x, p.y);
    const t = townAt(p.x, p.y);
    state.hover = gearAt(p.x, p.y) ? "fullscreen" : b ? b.id : t ? `town-${t.id}` : null;
  });

  canvas.addEventListener("mousedown", (e) => {
    const p = pointer(e);
    state.dragMoved = false;
    if (!buttonAt(p.x, p.y) && !gearAt(p.x, p.y)) state.drag = p;
  });

  window.addEventListener("mouseup", () => {
    state.drag = null;
  });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const p = pointer(e);
    if (buttonAt(p.x, p.y) || gearAt(p.x, p.y)) return;
    const beforeX = (p.x - (1 - state.zoom) * W * 0.48 - state.panX) / state.zoom;
    const beforeY = (p.y - (1 - state.zoom) * H * 0.48 - state.panY) / state.zoom;
    setZoom(state.targetZoom + (e.deltaY < 0 ? 0.12 : -0.12));
    state.zoom = state.targetZoom;
    state.panX = p.x - (1 - state.zoom) * W * 0.48 - beforeX * state.zoom;
    state.panY = p.y - (1 - state.zoom) * H * 0.48 - beforeY * state.zoom;
    clampPan();
  }, { passive: false });

  canvas.addEventListener("click", (e) => {
    if (state.dragMoved) {
      state.dragMoved = false;
      return;
    }
    const p = pointer(e);
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
      state.selected = t.id;
      state.selectedRegion = regionAt(p.x, p.y);
      if (t.owner === 0) toast("THÀNH CỦA BẠN: CÓ THỂ TUYỂN QUÂN/NÂNG CẤP");
      else attack(t);
      return;
    }
    const region = regionAt(p.x, p.y);
    if (region === null) return;
    state.selectedRegion = region;
    toast(`ĐÃ CHỌN MẢNH ĐẤT ${region + 1}`);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "+" || e.key === "=") setZoom(state.targetZoom + 0.14);
    if (e.key === "-" || e.key === "_") setZoom(state.targetZoom - 0.14);
    if (e.key.toLowerCase() === "f") toggleFullscreen();
    if (e.key === "0") {
      state.targetZoom = BASE_ZOOM;
      state.panX = 0;
      state.panY = 0;
      toast("CAMERA XA ĐÃ RESET");
    }
  });

  function sim(dt) {
    state.tick += dt;
    state.zoom = lerp(state.zoom, state.targetZoom, Math.min(1, dt * 12));
    clampPan();
    for (let i = state.voyages.length - 1; i >= 0; i--) {
      const v = state.voyages[i];
      v.t += dt;
      if (v.t >= v.duration) {
        const target = towns.find((t) => t.id === v.targetId);
        state.voyages.splice(i, 1);
        if (target && target.owner !== 0) resolveAttack(target);
      }
    }
    const income = dt * (1 + towns.filter((t) => t.owner === 0).length * 0.12);
    state.resources.gold += income * 2.4;
    state.resources.wood += income * 1.4;
    state.resources.stone += income * 1.1;
    state.resources.gems += income * 0.18;
    if (Math.floor(state.tick) % 17 === 0 && Math.random() < dt * 0.08) {
      const f = factions[1 + Math.floor(Math.random() * (factions.length - 1))];
      pushLog(`${f.name}: ${f.chat}`);
    }
  }

  let last = performance.now();
  function loop(now) {
    if (destroyed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    sim(dt);
    drawFrame();
    if (onUpdate) {
      onUpdate(state, towns);
    }
    raf = requestAnimationFrame(loop);
  }

  load();
  raf = requestAnimationFrame(loop);

  return {
    destroy: () => {
      destroyed = true;
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", onMinimapMouseMove);
      window.removeEventListener("mouseup", onMinimapMouseUp);
      if (raf) cancelAnimationFrame(raf);
    },
    getState: () => state,
    getTowns: () => towns,
    sendChat: (msg: string) => {
      pushLog(`PLAYER1: ${msg}`);
    },
    handleAction: (id: string) => {
      handleButton(id);
    }
  };
}
