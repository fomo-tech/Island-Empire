(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;
  const H = canvas.height;
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

  const factions = [
    { name: "PLAYER1", color: COLORS.blue, chat: "CÙNG NHAU CHIẾN THẮNG!" },
    { name: "PLAYER2", color: COLORS.red, chat: "TÔI ĐÃ CHIẾM ĐƯỢC THÀNH PHỐ A" },
    { name: "PLAYER3", color: COLORS.green, chat: "CẦN THĂM DÒ PHÍA BẮC." },
    { name: "PLAYER4", color: COLORS.gold, chat: "TẤN CÔNG KẺ ĐỊCH!" },
    { name: "PLAYER5", color: COLORS.purple, chat: "LIÊN MINH ĐANG TẬP KẾT." },
  ];

  const regions = [
    // --- 1. LỤC ĐỊA BẮC (Tuyệt Đỉnh Băng Tuyết / Snow Continent) ---
    { x: 485, y: 142, rx: 136, ry: 92, biome: 2, seed: 1 },
    { x: 620, y: 149, rx: 140, ry: 88, biome: 2, seed: 2 },
    { x: 760, y: 160, rx: 120, ry: 75, biome: 2, seed: 27 },
    { x: 350, y: 180, rx: 110, ry: 70, biome: 2, seed: 28 },

    // --- 2. LỤC ĐỊA TRUNG TÂM (Đồng Bằng & Rừng Xanh / Main Continent) ---
    { x: 455, y: 275, rx: 132, ry: 98, biome: 3, seed: 3 },
    { x: 334, y: 348, rx: 156, ry: 114, biome: 5, seed: 4 },
    { x: 501, y: 374, rx: 148, ry: 126, biome: 0, seed: 5 },
    { x: 679, y: 299, rx: 136, ry: 108, biome: 4, seed: 6 },
    { x: 643, y: 481, rx: 150, ry: 122, biome: 1, seed: 7 },
    { x: 444, y: 535, rx: 136, ry: 133, biome: 6, seed: 8 },
    { x: 567, y: 642, rx: 145, ry: 134, biome: 0, seed: 9 },
    { x: 752, y: 578, rx: 152, ry: 112, biome: 5, seed: 10 },
    { x: 810, y: 414, rx: 124, ry: 101, biome: 4, seed: 11 },
    { x: 711, y: 733, rx: 138, ry: 115, biome: 6, seed: 12 },

    // --- 3. LỤC ĐỊA TÂY NAM (Đất Đỏ Ember & Hỏa Sơn / Ember Continent) ---
    { x: 280, y: 880, rx: 130, ry: 95, biome: 3, seed: 29 },
    { x: 410, y: 920, rx: 145, ry: 110, biome: 3, seed: 30 },
    { x: 260, y: 1040, rx: 125, ry: 90, biome: 3, seed: 31 },

    // --- 4. LỤC ĐỊA NAM (Đảo Ngọc & Rừng Mint / South Continent) ---
    { x: 561, y: 831, rx: 150, ry: 122, biome: 1, seed: 13 },
    { x: 745, y: 865, rx: 158, ry: 109, biome: 7, seed: 14 },
    { x: 902, y: 786, rx: 132, ry: 104, biome: 3, seed: 15 },
    { x: 912, y: 642, rx: 128, ry: 94, biome: 2, seed: 16 },
    { x: 448, y: 1042, rx: 152, ry: 118, biome: 5, seed: 20 },
    { x: 590, y: 1110, rx: 146, ry: 126, biome: 1, seed: 21 },
    { x: 742, y: 1082, rx: 156, ry: 126, biome: 6, seed: 22 },
    { x: 878, y: 1030, rx: 144, ry: 106, biome: 2, seed: 23 },
    { x: 1012, y: 1140, rx: 128, ry: 96, biome: 3, seed: 24 },
    { x: 610, y: 1250, rx: 138, ry: 108, biome: 4, seed: 25 },
    { x: 780, y: 1290, rx: 145, ry: 115, biome: 7, seed: 26 },

    // --- 5. ĐẢO ĐÔNG BẮC & ĐẢO ĐÔNG (Violet Isles Archipelago) ---
    { x: 981, y: 300, rx: 96, ry: 76, biome: 4, seed: 17 },
    { x: 1046, y: 513, rx: 90, ry: 77, biome: 5, seed: 18 },
    { x: 1080, y: 720, rx: 95, ry: 80, biome: 4, seed: 32 },
  ];

  const islets = [
    { x: 100, y: 250, rx: 58, ry: 44, biome: 2, seed: 41 },
    { x: 110, y: 570, rx: 58, ry: 46, biome: 6, seed: 31 },
    { x: 110, y: 730, rx: 52, ry: 40, biome: 6, seed: 32 },
    { x: 70, y: 920, rx: 48, ry: 38, biome: 3, seed: 42 },
    { x: 1056, y: 405, rx: 50, ry: 42, biome: 4, seed: 33 },
    { x: 1125, y: 642, rx: 60, ry: 48, biome: 5, seed: 34 },
    { x: 1013, y: 166, rx: 68, ry: 50, biome: 4, seed: 35 },
    { x: 880, y: 80, rx: 42, ry: 34, biome: 4, seed: 36 },
    { x: 150, y: 90, rx: 52, ry: 38, biome: 2, seed: 37 },
    { x: 80, y: 1140, rx: 62, ry: 48, biome: 6, seed: 38 },
    { x: 1130, y: 910, rx: 76, ry: 58, biome: 5, seed: 39 },
    { x: 1200, y: 1280, rx: 58, ry: 46, biome: 3, seed: 40 },
    { x: 1050, y: 1420, rx: 64, ry: 48, biome: 7, seed: 43 },
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
  ];

  const towns = [
    { id: 1, x: 615, y: 336, lvl: 1, owner: 2, troops: 36 },
    { id: 2, x: 684, y: 340, lvl: 2, owner: 0, troops: 54 },
    { id: 3, x: 520, y: 290, lvl: 2, owner: 1, troops: 49 },
    { id: 4, x: 404, y: 332, lvl: 3, owner: 1, troops: 62 },
    { id: 5, x: 351, y: 471, lvl: 2, owner: 0, troops: 42 },
    { id: 6, x: 529, y: 491, lvl: 3, owner: 4, troops: 70 },
    { id: 7, x: 624, y: 467, lvl: 5, owner: 0, troops: 112 },
    { id: 8, x: 540, y: 612, lvl: 1, owner: 2, troops: 31 },
    { id: 9, x: 458, y: 612, lvl: 2, owner: 0, troops: 47 },
    { id: 10, x: 676, y: 660, lvl: 3, owner: 0, troops: 68 },
    { id: 11, x: 636, y: 789, lvl: 3, owner: 0, troops: 75 },
    { id: 12, x: 425, y: 823, lvl: 2, owner: 1, troops: 48 },
    { id: 13, x: 570, y: 853, lvl: 2, owner: 4, troops: 55 },
    { id: 14, x: 735, y: 843, lvl: 3, owner: 2, troops: 61 },
    { id: 15, x: 895, y: 803, lvl: 2, owner: 0, troops: 50 },
    { id: 16, x: 963, y: 304, lvl: 1, owner: 4, troops: 26 },
    { id: 17, x: 1058, y: 573, lvl: 2, owner: 1, troops: 44 },
    { id: 18, x: 781, y: 507, lvl: 4, owner: 0, troops: 86 },
    { id: 19, x: 430, y: 1050, lvl: 2, owner: 1, troops: 48 },
    { id: 20, x: 575, y: 1160, lvl: 2, owner: 4, troops: 54 },
    { id: 21, x: 798, y: 1078, lvl: 3, owner: 2, troops: 72 },
    { id: 22, x: 968, y: 1112, lvl: 2, owner: 0, troops: 50 },
    { id: 23, x: 644, y: 1300, lvl: 2, owner: 4, troops: 58 },
    { id: 24, x: 350, y: 180, lvl: 4, owner: 3, troops: 95 },
    { id: 25, x: 760, y: 160, lvl: 3, owner: 2, troops: 64 },
    { id: 26, x: 280, y: 880, lvl: 2, owner: 1, troops: 52 },
    { id: 27, x: 1080, y: 720, lvl: 3, owner: 3, troops: 78 },
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
  ];

  const buttons = [
    { id: "army", x: 34, y: 760, w: 116, h: 98, label: "QUÂN ĐỘI" },
    { id: "build", x: 34, y: 890, w: 116, h: 98, label: "XÂY DỰNG" },
    { id: "research", x: 34, y: 1020, w: 116, h: 98, label: "NGHIÊN CỨU" },
    { id: "treasure", x: 1110, y: 92, w: 118, h: 92, label: "BẢO VẬT" },
    { id: "ally", x: 1110, y: 196, w: 118, h: 92, label: "LIÊN MINH" },
    { id: "map", x: 1110, y: 300, w: 118, h: 92, label: "BẢN ĐỒ" },
    { id: "event", x: 1110, y: 404, w: 118, h: 92, label: "SỰ KIỆN" },
    { id: "zoomIn", x: 1150, y: 1140, w: 54, h: 54, label: "+" },
    { id: "zoomOut", x: 1150, y: 1210, w: 54, h: 54, label: "-" },
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
    targetPanX: null,
    targetPanY: null,
    drag: null,
    dragMoved: false,
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

  function findRegionAt(x, y) {
    let best = null;
    regions.forEach((r, idx) => {
      const rx = r.rx || r.r;
      const ry = r.ry || r.r * 0.78;
      const dx = x - r.x;
      const dy = y - r.y;
      const val = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (val <= 1.25) {
        if (!best || val < best.val) best = { idx, val };
      }
    });
    let bestIslet = null;
    islets.forEach((r, idx) => {
      const rx = r.rx || r.r;
      const ry = r.ry || r.r * 0.78;
      const dx = x - r.x;
      const dy = y - r.y;
      const val = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (val <= 1.25) {
        if (!bestIslet || val < bestIslet.val) bestIslet = { idx: idx + 60, val };
      }
    });
    return bestIslet ? bestIslet.idx : (best ? best.idx : null);
  }

  function panCameraTo(cx, cy) {
    state.targetPanX = W / 2 - cx * state.zoom - (1 - state.zoom) * W * 0.48;
    state.targetPanY = H / 2 - cy * state.zoom - (1 - state.zoom) * H * 0.48;
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
    // 1. Sea base gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#071825");
    g.addColorStop(0.48, "#0a263b");
    g.addColorStop(1, "#061521");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Light radial gradient (sunlight shining on the sea)
    const lightG = ctx.createRadialGradient(W / 2, H / 3, 50, W / 2, H / 3, W);
    lightG.addColorStop(0, "rgba(56, 189, 248, 0.12)");
    lightG.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = lightG;
    ctx.fillRect(0, 0, W, H);

    // Sea floor grid details
    ctx.save();
    for (let y = 0; y < H; y += 18) {
      for (let x = 0; x < W; x += 18) {
        const n = hash(x * 13 + y * 29 + 17);
        if (n > 0.88) {
          pxRect(x + (n > 0.94 ? 6 : 0), y + (n > 0.91 ? 4 : 0), n > 0.94 ? 8 : 4, 2, "rgba(43, 132, 168, 0.25)");
        } else if (n < 0.055) {
          pxRect(x + 4, y + 8, 3, 3, "rgba(2, 48, 72, 0.45)");
        }
      }
    }
    ctx.restore();

    // 2. Animated waves (denser grid and organic fading)
    for (let y = 8; y < H; y += 48) {
      for (let x = -20; x < W + 40; x += 64) {
        const waveCycle = state.tick * 1.2 + hash(x * 37 + y * 43) * Math.PI * 2;
        const fade = Math.max(0, Math.sin(waveCycle)); // 0 to 1
        if (fade > 0.08) {
          const waveOffset = Math.sin((x * 0.015) + state.tick * 1.5) * 5;
          const py = y + waveOffset;
          const waveType = hash(x * 9 + y * 17);

          if (waveType > 0.6) {
            // Major cresting wave
            const alphaBase = 0.65 * fade;
            const alphaCrest = 0.92 * fade;
            const alphaShadow = 0.70 * fade;
            
            const wx = x + (y % 17);
            
            // Deep blue shadow
            pxRect(wx - 2, py + 2, 36, 2, `rgba(2, 32, 54, ${alphaShadow})`);
            // Light blue wave body
            pxRect(wx, py, 32, 2, `rgba(14, 165, 233, ${alphaBase})`);
            // Bright white crest highlight
            pxRect(wx + 8, py - 1.5, 16, 1.5, `rgba(255, 255, 255, ${alphaCrest})`);
          } else if (waveType > 0.25) {
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

  function drawRegion(r, idx, inland) {
    const biome = BIOMES[r.biome];
    const seed = r.seed || idx + 1;
    const rx = r.rx || r.r;
    const ry = r.ry || r.r * 0.78;

    // Determine if this region is selected (active) in the demo
    const selectedTown = towns.find(t => t.id === state.selected);
    const activeRegionIdx = selectedTown ? findRegionAt(selectedTown.x, selectedTown.y) : null;
    const isActive = activeRegionIdx === idx;

    if (!inland) {
      // Fetch biome-specific colors or defaults
      const cDeep = biome.cliffDeep || "#0f0a05";
      const cMid = biome.cliffMid || "#21160a";
      const cUpper = biome.cliffUpper || "#3e2e18";
      const bColor = biome.beach || "#d5a549";

      // 1. Shallow water outline / foam (light cyan pixel border around island)
      const shallow = organicPath(r.x, r.y, rx + 18, ry + 16, seed * 1.7);
      fillPath(shallow, "#289db9");

      // 2. Tall 3D Cliff shadow base (+8px down)
      const cliffDeep = organicPath(r.x + 3, r.y + 7, rx + 8, ry + 8, seed * 1.7 + 0.1);
      fillPath(cliffDeep, cDeep);

      // Shoreline highlight
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(cliffDeep[0][0], cliffDeep[0][1]);
      for (let i = 1; i < cliffDeep.length; i++) ctx.lineTo(cliffDeep[i][0], cliffDeep[i][1]);
      ctx.closePath();
      ctx.stroke();

      // 3. Mid/upper cliff face (gradient)
      const coast = organicPath(r.x + 1.5, r.y + 3.5, rx + 5, ry + 5, seed * 1.7 + 0.2);
      const cliffGrad = ctx.createLinearGradient(r.x - rx * 0.4, r.y - ry * 0.4, r.x + rx * 0.2, r.y + ry + 7);
      cliffGrad.addColorStop(0, cUpper);
      cliffGrad.addColorStop(0.5, cMid);
      cliffGrad.addColorStop(1, cDeep);
      fillPath(coast, cliffGrad);

      // Crevice lines running down
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < coast.length; i += 4) {
        ctx.moveTo(coast[i][0], coast[i][1]);
        ctx.lineTo(cliffDeep[i][0], cliffDeep[i][1]);
      }
      ctx.stroke();

      // 4. Sand rim
      const sandRim = organicPath(r.x, r.y, rx + 3, ry + 3, seed * 1.7 + 0.25);
      fillPath(sandRim, bColor);

      // Sand highlight
      const sandHighlight = organicPath(r.x, r.y, rx + 1, ry + 1, seed * 1.7 + 0.3);
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      fillPath(sandHighlight);
    } else {
      // Internal region border shadow / separation between biomes
      const boundary = organicPath(r.x + 2, r.y + 4, rx + 3, ry + 3, seed * 1.7 + 0.25);
      fillPath(boundary, "rgba(20, 26, 22, 0.35)");
    }

    // Main territory body shape
    const land = organicPath(r.x, r.y, rx, ry, seed * 1.7 + 0.4);
    fillPath(land, biome.a);

    ctx.save();
    // Clip to territory boundary for smooth internal pixel texturing
    ctx.beginPath();
    ctx.moveTo(land[0][0], land[0][1]);
    for (let i = 1; i < land.length; i++) ctx.lineTo(land[i][0], land[i][1]);
    ctx.closePath();
    ctx.clip();

    // Smooth organic pixel dithering & color variation (without hex grid lines)
    for (let y = r.y - ry - 10; y < r.y + ry + 10; y += 8) {
      for (let x = r.x - rx - 10; x < r.x + rx + 10; x += 8) {
        const val = Math.sin(x * 0.05 + seed) + Math.cos(y * 0.06 - seed);
        const noise = hash(x * 17 + y * 31 + seed * 7);
        if (val > 0.45 || noise > 0.72) {
          const col = noise > 0.85 ? biome.hi : val < 0.2 ? biome.dark : biome.b;
          pxRect(x, y, 8, 8, col);
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
    for (let i = 0; i < 200; i++) {
      const a = (i * 2.399 + seed) % TAU;
      const rr = Math.sqrt(hash(seed * 41 + i * 11));
      const px = Math.round((r.x + Math.cos(a) * rx * rr) / 4) * 4;
      const py = Math.round((r.y + Math.sin(a) * ry * rr) / 4) * 4;
      const pick = hash(seed * 900 + i * 19);
      const c = pick > 0.82 ? biome.hi : pick > 0.4 ? biome.b : biome.dark;
      const bw = pick > 0.9 ? 8 : 4;
      const bh = pick > 0.9 ? 4 : 4;
      pxRect(px, py, bw, bh, c);
    }

    if (isActive) {
      // Radial glow inside region (matching the main app style)
      const maxRadius = Math.max(rx, ry) * 1.4;
      const pulse = Math.sin(state.tick * 5.0) * 0.12 + 0.38;
      const colorCenter = `rgba(255, 235, 90, ${pulse})`;
      const colorEdge = `rgba(216, 155, 33, 0.03)`;
      const grad = ctx.createRadialGradient(r.x, r.y, 4, r.x, r.y, maxRadius);
      grad.addColorStop(0, colorCenter);
      grad.addColorStop(0.6, colorCenter);
      grad.addColorStop(1, colorEdge);
      ctx.fillStyle = grad;
      ctx.fillRect(r.x - rx - 16, r.y - ry - 16, rx * 2 + 32, ry * 2 + 32);

      // Light sweep
      const sweepPos = ((state.tick * 60) % (rx * 4)) - rx * 2;
      const sweepGrad = ctx.createLinearGradient(
        r.x + sweepPos - 20, r.y,
        r.x + sweepPos + 20, r.y
      );
      sweepGrad.addColorStop(0, "rgba(255, 235, 90, 0)");
      sweepGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.35)");
      sweepGrad.addColorStop(1, "rgba(255, 235, 90, 0)");
      ctx.fillStyle = sweepGrad;
      ctx.fillRect(r.x - rx - 16, r.y - ry - 16, rx * 2 + 32, ry * 2 + 32);
    }

    // Outer pixel border around region line
    ctx.strokeStyle = biome.edge;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    if (isActive) {
      ctx.save();
      // Re-create the organic land path
      const landPath = organicPath(r.x, r.y, rx, ry, seed * 1.7 + 0.4);
      ctx.beginPath();
      ctx.moveTo(landPath[0][0], landPath[0][1]);
      for (let i = 1; i < landPath.length; i++) ctx.lineTo(landPath[i][0], landPath[i][1]);
      ctx.closePath();

      const glowColor = "#ffe85a";
      const strokeColor = "#fff06a";
      const innerColor = "#ffffff";

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
      
      ctx.strokeStyle = "#ffd34d";
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // 4. Corner target brackets
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
      ctx.save();
      ctx.shadowColor = "#ffe85a";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(255, 230, 90, 0.35)";
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + 24, 44, 18, 0, 0, TAU);
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
    ];
    hulls.forEach((hull, hi) => {
      pathFromPoints(hull, 0, 0, 11 + hi, 22);
      ctx.fillStyle = "#269bb7";
      ctx.fill();
      pathFromPoints(hull, 8, 12, 24 + hi, 18);
      ctx.fillStyle = "rgba(2, 50, 70, 0.38)";
      ctx.fill();
      pathFromPoints(hull, 2, 6, 37 + hi, 16);
      ctx.fillStyle = hi % 2 ? "#427a32" : "#44a13d";
      ctx.fill();
    });
  }

  function drawWorld() {
    drawOcean();
    drawRoutes();
    ctx.save();
    ctx.translate((1 - state.zoom) * W * 0.48 + state.panX, (1 - state.zoom) * H * 0.48 + state.panY);
    ctx.scale(state.zoom, state.zoom);
    islets.forEach((r, i) => drawRegion(r, i + 60));
    drawMainCoast();
    regions.forEach((r, i) => drawRegion(r, i, true));
    drawDecoration();
    drawVoyages();
    ships.forEach(drawShip);
    towns.forEach(drawCastle);
    drawLighthouse(1092, 558);
    drawLighthouse(1120, 920);
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

    const items = [["gold", 450], ["wood", 612], ["stone", 774], ["gems", 936]];
    items.forEach(([key, x]) => {
      panel(x - 40, 12, 150, 54);
      drawResourceIcon(key, x - 12, 38);
      text(String(Math.floor(state.resources[key])), x + 22, 27, 23, "#fff3d2");
    });
    panel(1102, 12, 62, 54);
    if (state.hover === "fullscreen") pxRect(1110, 20, 46, 38, "rgba(255,211,77,0.14)");
    drawGear(1133, 39);
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

    panel(14, 1146, 354, 232, "TRÒ CHUYỆN");
    state.log.slice(-4).forEach((line, i) => {
      const color = factions[i % factions.length].color;
      text(line, 34, 1191 + i * 27, 18, color);
    });
    pxRect(34, 1326, 253, 36, "#071018");
    text("NHẬP TIN NHẮN...", 44, 1334, 16, "#8196a3");
    pxRect(302, 1322, 42, 42, "#2b3b45");
    text(">", 323, 1328, 30, "#ffd34d", "center");

    const t = towns.find((it) => it.id === state.selected);
    if (t) {
      panel(386, 1282, 512, 96);
      text(`THÀNH ${t.id} - ${factions[t.owner].name}`, 404, 1306, 19, factions[t.owner].color);
      text(`CẤP ${t.lvl}  |  QUÂN ${t.troops}`, 404, 1336, 16, "#fff3d2");
      text(state.toast, 610, 1336, 15, "#ffd34d");
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
    ];
    hulls.forEach((hull, hi) => {
      pathFromPoints(hull, 0, 0, 11 + hi, 22);
      ctx.fillStyle = "#31c6cf";
      ctx.fill();
      pathFromPoints(hull, 8, 12, 24 + hi, 18);
      ctx.fillStyle = "rgba(2,62,78,0.32)";
      ctx.fill();
      pathFromPoints(hull, 2, 6, 37 + hi, 16);
      ctx.fillStyle = hi % 2 ? "#4e8c3d" : "#5f9b41";
      ctx.fill();
      ctx.save();
      pathFromPoints(hull, 2, 6, 37 + hi, 16);
      ctx.clip();
      const minX = Math.min(...hull.map((p) => p[0])) - 20;
      const maxX = Math.max(...hull.map((p) => p[0])) + 20;
      const minY = Math.min(...hull.map((p) => p[1])) - 20;
      const maxY = Math.max(...hull.map((p) => p[1])) + 20;
      const g = ctx.createLinearGradient(minX, minY, maxX, maxY);
      g.addColorStop(0, "#82b852");
      g.addColorStop(0.55, "#548f3e");
      g.addColorStop(1, "#7dac4d");
      ctx.fillStyle = g;
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
      for (let i = 0; i < 260; i++) {
        const x = minX + hash(hi * 701 + i * 17) * (maxX - minX);
        const y = minY + hash(hi * 907 + i * 29) * (maxY - minY);
        const p = hash(hi * 311 + i * 37);
        pxRect(x, y, p > 0.9 ? 7 : 4, p > 0.9 ? 5 : 3, p > 0.72 ? "#90bf59" : p > 0.36 ? "#4f873b" : "#356a35");
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
    islets.forEach((r, i) => drawRegion(r, i + 60));
    drawMainCoast();
    regions.forEach((r, i) => drawRegion(r, i, true));
    drawDecoration();
    drawVoyages();
    ships.forEach(drawShip);
    towns.forEach(drawCastle);
    drawLighthouse(1092, 558);
    drawLighthouse(1120, 920);
    ctx.restore();
  }

  function drawFrame() {
    drawWorld();
    drawTopBar();
    drawSidePanels();
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
    const extraX = Math.max(0, (state.targetZoom - 1) * W * 0.42);
    const extraY = Math.max(0, (state.targetZoom - 1) * H * 0.42);
    state.panX = Math.max(-extraX, Math.min(extraX, state.panX));
    state.panY = Math.max(-extraY, Math.min(extraY, state.panY));
    if (state.targetZoom <= 1) {
      state.panX *= 0.72;
      state.panY *= 0.72;
    }
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
    return x >= 1102 && y >= 12 && x <= 1164 && y <= 66;
  }

  function pointer(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  let dragStartPos = { x: 0, y: 0 };
  let clickStartTime = 0;

  canvas.addEventListener("mousemove", (e) => {
    const p = pointer(e);
    if (state.drag) {
      const dx = p.x - state.drag.x;
      const dy = p.y - state.drag.y;
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
    clickStartTime = performance.now();
    state.targetPanX = null;
    state.targetPanY = null;
    if (!buttonAt(p.x, p.y) && !gearAt(p.x, p.y) && state.targetZoom > BASE_ZOOM + 0.08) state.drag = p;
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
    const p = pointer(e);
    const clickDuration = performance.now() - clickStartTime;
    const totalDist = Math.hypot(p.x - dragStartPos.x, p.y - dragStartPos.y);
    if (state.dragMoved || totalDist > 4 || clickDuration > 220) {
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
      panCameraTo(t.x, t.y);
      if (t.owner === 0) toast("THÀNH CỦA BẠN: CÓ THỂ TUYỂN QUÂN/NÂNG CẤP");
      else attack(t);
      return;
    }

    // Check if clicked on a region/islet
    const wx = (p.x - (1 - state.zoom) * W * 0.48 - state.panX) / state.zoom;
    const wy = (p.y - (1 - state.zoom) * H * 0.48 - state.panY) / state.zoom;
    const regionIdx = findRegionAt(wx, wy);
    if (regionIdx !== null) {
      const r = regionIdx >= 60 ? islets[regionIdx - 60] : regions[regionIdx];
      if (r) {
        const townInRegion = towns.find(town => findRegionAt(town.x, town.y) === regionIdx);
        if (townInRegion) {
          state.selected = townInRegion.id;
        } else {
          state.selected = null;
        }
        panCameraTo(r.x, r.y);
      }
    } else {
      state.selected = null;
    }
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
    
    if (state.targetPanX !== null && state.targetPanY !== null) {
      state.panX = lerp(state.panX, state.targetPanX, Math.min(1, dt * 8));
      state.panY = lerp(state.panY, state.targetPanY, Math.min(1, dt * 8));
      if (Math.abs(state.panX - state.targetPanX) < 0.5 && Math.abs(state.panY - state.targetPanY) < 0.5) {
        state.panX = state.targetPanX;
        state.panY = state.targetPanY;
        state.targetPanX = null;
        state.targetPanY = null;
      }
    }

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
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    sim(dt);
    drawFrame();
    requestAnimationFrame(loop);
  }

  load();
  requestAnimationFrame(loop);
})();
