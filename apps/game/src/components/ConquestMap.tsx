import React, { useEffect, useRef, useState } from "react";
import { generateConquestTerritories } from "@island/shared";

// ── 14 HOLY SITE DEFINITIONS MATCHING SCREENSHOT ──
export interface HolySiteType {
  id: string;
  name: string;
  vnName: string;
  icon: string;
  color: string;
  bgGlow: string;
  buffs: { label: string; val: string }[];
}

export const HOLY_SITE_TYPES: Record<string, HolySiteType> = {
  hope: {
    id: "hope",
    name: "Hope",
    vnName: "Hy Vọng",
    icon: "💎",
    color: "#3b82f6",
    bgGlow: "rgba(59, 130, 246, 0.25)",
    buffs: [
      { label: "Gathering Speed", val: "+3%" },
      { label: "March Speed", val: "+5%" },
    ],
  },
  wind: {
    id: "wind",
    name: "Wind",
    vnName: "Phong Linh",
    icon: "⭐",
    color: "#eab308",
    bgGlow: "rgba(234, 179, 8, 0.25)",
    buffs: [
      { label: "Troop Health", val: "+2%" },
      { label: "Commander EXP Gain", val: "+10%" },
    ],
  },
  blood: {
    id: "blood",
    name: "Blood",
    vnName: "Huyết Thạch",
    icon: "💧",
    color: "#ef4444",
    bgGlow: "rgba(239, 68, 68, 0.25)",
    buffs: [
      { label: "Research Speed", val: "+5%" },
      { label: "Troop Defense", val: "+3%" },
    ],
  },
  courage: {
    id: "courage",
    name: "Courage",
    vnName: "Dũng Cảm",
    icon: "🛡️",
    color: "#22c55e",
    bgGlow: "rgba(34, 197, 94, 0.25)",
    buffs: [
      { label: "Training Speed", val: "+5%" },
      { label: "Troop Attack", val: "+3%" },
    ],
  },
  wisdom: {
    id: "wisdom",
    name: "Wisdom",
    vnName: "Trí Tuệ",
    icon: "⚛️",
    color: "#10b981",
    bgGlow: "rgba(16, 185, 129, 0.25)",
    buffs: [
      { label: "Resource Prod.", val: "+10%" },
      { label: "Building Speed", val: "+5%" },
    ],
  },
  surge: {
    id: "surge",
    name: "Surge",
    vnName: "Triều Cường",
    icon: "🔮",
    color: "#0284c7",
    bgGlow: "rgba(2, 132, 199, 0.25)",
    buffs: [
      { label: "Troop Defense", val: "+3%" },
      { label: "Troop Health", val: "+3%" },
    ],
  },
  storm: {
    id: "storm",
    name: "Storm",
    vnName: "Bão Tố",
    icon: "🌀",
    color: "#06b6d4",
    bgGlow: "rgba(6, 182, 212, 0.25)",
    buffs: [
      { label: "AP Recovery", val: "+20%" },
      { label: "Healing Speed", val: "+30%" },
    ],
  },
  flame: {
    id: "flame",
    name: "Flame",
    vnName: "Xích Thao",
    icon: "🔥",
    color: "#f97316",
    bgGlow: "rgba(249, 115, 22, 0.25)",
    buffs: [
      { label: "Rallied Army Atk", val: "+5%" },
      { label: "Gathering Speed", val: "+5%" },
    ],
  },
  harvest: {
    id: "harvest",
    name: "Harvest",
    vnName: "Phong Thu",
    icon: "🌾",
    color: "#84cc16",
    bgGlow: "rgba(132, 204, 22, 0.25)",
    buffs: [
      { label: "Troop Attack", val: "+3%" },
      { label: "Training Speed", val: "+10%" },
    ],
  },
  earth: {
    id: "earth",
    name: "Earth",
    vnName: "Đất Mẹ",
    icon: "🍃",
    color: "#15803d",
    bgGlow: "rgba(21, 128, 61, 0.25)",
    buffs: [
      { label: "Troop Health", val: "+3%" },
      { label: "Gathering Speed", val: "+5%" },
    ],
  },
  order: {
    id: "order",
    name: "Order",
    vnName: "Trật Tự",
    icon: "👑",
    color: "#a855f7",
    bgGlow: "rgba(168, 85, 247, 0.25)",
    buffs: [
      { label: "Troop Defense", val: "+3%" },
      { label: "Troop Health", val: "+3%" },
    ],
  },
  radiance: {
    id: "radiance",
    name: "Radiance",
    vnName: "Hào Quang",
    icon: "☀️",
    color: "#f43f5e",
    bgGlow: "rgba(244, 63, 94, 0.25)",
    buffs: [
      { label: "AP Recovery", val: "+20%" },
      { label: "Healing Speed", val: "+30%" },
    ],
  },
  honor: {
    id: "honor",
    name: "Honor",
    vnName: "Vinh Quang",
    icon: "🎖️",
    color: "#d97706",
    bgGlow: "rgba(217, 119, 6, 0.25)",
    buffs: [
      { label: "Rallied Army Atk", val: "+5%" },
      { label: "Gathering Speed", val: "+5%" },
    ],
  },
  war: {
    id: "war",
    name: "War",
    vnName: "Chiến Tranh",
    icon: "⚔️",
    color: "#dc2626",
    bgGlow: "rgba(220, 38, 38, 0.25)",
    buffs: [
      { label: "Troop Attack", val: "+3%" },
      { label: "Training Speed", val: "+10%" },
    ],
  },
};

// Map Size dimensions
const MAP_WIDTH = 2800;
const MAP_HEIGHT = 2000;

export interface NumberedPassNode {
  id: string;
  gateNumber: number;
  color: string;
  bgColor: string;
  borderColor: string;
  x: number;
  y: number;
  name: string;
  allianceTag?: string;
  durability: number;
  maxDurability: number;
}

export interface StoneShrineNode {
  id: string;
  typeId: string;
  name: string;
  x: number;
  y: number;
  zone: 1 | 2 | 3 | 4;
  allianceTag?: string;
  status: "controlled" | "unlocked" | "locked";
  coords: string;
}

// 1,000 Territories generated directly from shared map algorithm
const MEGACONTINENT_TERRITORIES = generateConquestTerritories();

// 3D Extruded Polygon Path matching exact sample rectangular jagged continent slab
const CONTINENT_POINTS = [
  [300, 300], [500, 280], [800, 290], [1200, 270], [1600, 280], [2000, 270], [2400, 290], [2500, 300],
  [2520, 500], [2510, 900], [2530, 1300], [2510, 1600], [2490, 1750],
  [2200, 1770], [1800, 1760], [1400, 1780], [1000, 1760], [600, 1770], [300, 1750],
  [280, 1500], [290, 1100], [270, 700], [290, 450]
];

// Numbered Passes matching sample image (8, 5, 4, 6, 7)
const NUMBERED_PASSES: NumberedPassNode[] = [
  { id: "p8_1", gateNumber: 8, color: "#00d2fe", bgColor: "#052d3d", borderColor: "#00d2fe", x: 1250, y: 280, name: "Cửa Ải 8 (Bắc 1)", allianceTag: "DRG", durability: 50000, maxDurability: 50000 },
  { id: "p8_2", gateNumber: 8, color: "#00d2fe", bgColor: "#052d3d", borderColor: "#00d2fe", x: 1750, y: 280, name: "Cửa Ải 8 (Bắc 2)", allianceTag: "VAL", durability: 50000, maxDurability: 50000 },
  { id: "p8_3", gateNumber: 8, color: "#00d2fe", bgColor: "#052d3d", borderColor: "#00d2fe", x: 520, y: 650, name: "Cửa Ải 8 (Tây Bắc)", allianceTag: "DRG", durability: 50000, maxDurability: 50000 },
  { id: "p8_4", gateNumber: 8, color: "#00d2fe", bgColor: "#052d3d", borderColor: "#00d2fe", x: 480, y: 1300, name: "Cửa Ải 8 (Tây Nam)", allianceTag: "PHX", durability: 50000, maxDurability: 50000 },
  { id: "p8_5", gateNumber: 8, color: "#00d2fe", bgColor: "#052d3d", borderColor: "#00d2fe", x: 2320, y: 650, name: "Cửa Ải 8 (Đông Bắc)", allianceTag: "VAL", durability: 50000, maxDurability: 50000 },
  { id: "p8_6", gateNumber: 8, color: "#00d2fe", bgColor: "#052d3d", borderColor: "#00d2fe", x: 2320, y: 1350, name: "Cửa Ải 8 (Đông Nam)", allianceTag: "SPT", durability: 50000, maxDurability: 50000 },
  { id: "p8_7", gateNumber: 8, color: "#00d2fe", bgColor: "#052d3d", borderColor: "#00d2fe", x: 1050, y: 1770, name: "Cửa Ải 8 (Nam 1)", allianceTag: "PHX", durability: 50000, maxDurability: 50000 },
  { id: "p8_8", gateNumber: 8, color: "#00d2fe", bgColor: "#052d3d", borderColor: "#00d2fe", x: 1750, y: 1770, name: "Cửa Ải 8 (Nam 2)", allianceTag: "SPT", durability: 50000, maxDurability: 50000 },
  { id: "p5_1", gateNumber: 5, color: "#ff8c00", bgColor: "#3d1f05", borderColor: "#ff8c00", x: 800, y: 550, name: "Cửa Ải 5 (Tây Bắc)", allianceTag: "DRG", durability: 80000, maxDurability: 80000 },
  { id: "p5_2", gateNumber: 5, color: "#ff8c00", bgColor: "#3d1f05", borderColor: "#ff8c00", x: 1200, y: 520, name: "Cửa Ải 5 (Bắc Trung)", allianceTag: "VNM", durability: 80000, maxDurability: 80000 },
  { id: "p5_3", gateNumber: 5, color: "#ff8c00", bgColor: "#3d1f05", borderColor: "#ff8c00", x: 1980, y: 550, name: "Cửa Ải 5 (Đông Bắc)", allianceTag: "VAL", durability: 80000, maxDurability: 80000 },
  { id: "p5_4", gateNumber: 5, color: "#ff8c00", bgColor: "#3d1f05", borderColor: "#ff8c00", x: 750, y: 1450, name: "Cửa Ải 5 (Tây Nam)", allianceTag: "PHX", durability: 80000, maxDurability: 80000 },
  { id: "p5_5", gateNumber: 5, color: "#ff8c00", bgColor: "#3d1f05", borderColor: "#ff8c00", x: 880, y: 1550, name: "Cửa Ải 5 (Nam Tây)", allianceTag: "PHX", durability: 80000, maxDurability: 80000 },
  { id: "p5_6", gateNumber: 5, color: "#ff8c00", bgColor: "#3d1f05", borderColor: "#ff8c00", x: 1850, y: 1550, name: "Cửa Ải 5 (Nam Đông)", allianceTag: "SPT", durability: 80000, maxDurability: 80000 },
  { id: "p4_1", gateNumber: 4, color: "#ffd700", bgColor: "#383005", borderColor: "#ffd700", x: 620, y: 730, name: "Cửa Ải 4 (Tây Bắc 1)", allianceTag: "DRG", durability: 60000, maxDurability: 60000 },
  { id: "p4_2", gateNumber: 4, color: "#ffd700", bgColor: "#383005", borderColor: "#ffd700", x: 620, y: 880, name: "Cửa Ải 4 (Tây Bắc 2)", allianceTag: "DRG", durability: 60000, maxDurability: 60000 },
  { id: "p4_3", gateNumber: 4, color: "#ffd700", bgColor: "#383005", borderColor: "#ffd700", x: 1600, y: 440, name: "Cửa Ải 4 (Bắc Đông 1)", allianceTag: "VAL", durability: 60000, maxDurability: 60000 },
  { id: "p4_4", gateNumber: 4, color: "#ffd700", bgColor: "#383005", borderColor: "#ffd700", x: 1720, y: 440, name: "Cửa Ải 4 (Bắc Đông 2)", allianceTag: "VAL", durability: 60000, maxDurability: 60000 },
  { id: "p4_5", gateNumber: 4, color: "#ffd700", bgColor: "#383005", borderColor: "#ffd700", x: 2020, y: 1100, name: "Cửa Ải 4 (Đông 1)", allianceTag: "VAL", durability: 60000, maxDurability: 60000 },
  { id: "p4_6", gateNumber: 4, color: "#ffd700", bgColor: "#383005", borderColor: "#ffd700", x: 2020, y: 1250, name: "Cửa Ải 4 (Đông 2)", allianceTag: "VAL", durability: 60000, maxDurability: 60000 },
  { id: "p4_7", gateNumber: 4, color: "#ffd700", bgColor: "#383005", borderColor: "#ffd700", x: 1020, y: 1620, name: "Cửa Ải 4 (Nam 1)", allianceTag: "PHX", durability: 60000, maxDurability: 60000 },
  { id: "p4_8", gateNumber: 4, color: "#ffd700", bgColor: "#383005", borderColor: "#ffd700", x: 1150, y: 1620, name: "Cửa Ải 4 (Nam 2)", allianceTag: "PHX", durability: 60000, maxDurability: 60000 },
  { id: "p6_1", gateNumber: 6, color: "#39ff14", bgColor: "#093d05", borderColor: "#39ff14", x: 820, y: 780, name: "Cửa Ải 6 (Tây 1)", allianceTag: "DRG", durability: 120000, maxDurability: 120000 },
  { id: "p6_2", gateNumber: 6, color: "#39ff14", bgColor: "#093d05", borderColor: "#39ff14", x: 1050, y: 720, name: "Cửa Ải 6 (Bắc Tây)", allianceTag: "VNM", durability: 120000, maxDurability: 120000 },
  { id: "p6_3", gateNumber: 6, color: "#39ff14", bgColor: "#093d05", borderColor: "#39ff14", x: 1400, y: 650, name: "Cửa Ải 6 (Bắc)", allianceTag: "VNM", durability: 120000, maxDurability: 120000 },
  { id: "p6_4", gateNumber: 6, color: "#39ff14", bgColor: "#093d05", borderColor: "#39ff14", x: 1850, y: 720, name: "Cửa Ải 6 (Bắc Đông)", allianceTag: "VAL", durability: 120000, maxDurability: 120000 },
  { id: "p6_5", gateNumber: 6, color: "#39ff14", bgColor: "#093d05", borderColor: "#39ff14", x: 1980, y: 880, name: "Cửa Ải 6 (Đông 1)", allianceTag: "VAL", durability: 120000, maxDurability: 120000 },
  { id: "p6_6", gateNumber: 6, color: "#39ff14", bgColor: "#093d05", borderColor: "#39ff14", x: 1950, y: 1080, name: "Cửa Ải 6 (Đông 2)", allianceTag: "VAL", durability: 120000, maxDurability: 120000 },
  { id: "p6_7", gateNumber: 6, color: "#39ff14", bgColor: "#093d05", borderColor: "#39ff14", x: 820, y: 1100, name: "Cửa Ải 6 (Tây 2)", allianceTag: "PHX", durability: 120000, maxDurability: 120000 },
  { id: "p6_8", gateNumber: 6, color: "#39ff14", bgColor: "#093d05", borderColor: "#39ff14", x: 920, y: 1250, name: "Cửa Ải 6 (Tây Nam 1)", allianceTag: "PHX", durability: 120000, maxDurability: 120000 },
  { id: "p6_9", gateNumber: 6, color: "#39ff14", bgColor: "#093d05", borderColor: "#39ff14", x: 1080, y: 1350, name: "Cửa Ải 6 (Nam Tây)", allianceTag: "KVK", durability: 120000, maxDurability: 120000 },
  { id: "p6_10", gateNumber: 6, color: "#39ff14", bgColor: "#093d05", borderColor: "#39ff14", x: 1680, y: 1350, name: "Cửa Ải 6 (Nam Đông)", allianceTag: "KVK", durability: 120000, maxDurability: 120000 },
  { id: "p7_1", gateNumber: 7, color: "#ff3333", bgColor: "#400808", borderColor: "#ff3333", x: 1400, y: 860, name: "Ải 7 (Bắc Thần Điện)", allianceTag: "ROY", durability: 300000, maxDurability: 300000 },
  { id: "p7_2", gateNumber: 7, color: "#ff3333", bgColor: "#400808", borderColor: "#ff3333", x: 1560, y: 900, name: "Ải 7 (Đông Bắc)", allianceTag: "ROY", durability: 300000, maxDurability: 300000 },
  { id: "p7_3", gateNumber: 7, color: "#ff3333", bgColor: "#400808", borderColor: "#ff3333", x: 1640, y: 1050, name: "Ải 7 (Đông Thần Điện)", allianceTag: "ROY", durability: 300000, maxDurability: 300000 },
  { id: "p7_4", gateNumber: 7, color: "#ff3333", bgColor: "#400808", borderColor: "#ff3333", x: 1560, y: 1200, name: "Ải 7 (Đông Nam)", allianceTag: "ROY", durability: 300000, maxDurability: 300000 },
  { id: "p7_5", gateNumber: 7, color: "#ff3333", bgColor: "#400808", borderColor: "#ff3333", x: 1400, y: 1240, name: "Ải 7 (Nam Thần Điện)", allianceTag: "ROY", durability: 300000, maxDurability: 300000 },
  { id: "p7_6", gateNumber: 7, color: "#ff3333", bgColor: "#400808", borderColor: "#ff3333", x: 1240, y: 1200, name: "Ải 7 (Tây Nam)", allianceTag: "ROY", durability: 300000, maxDurability: 300000 },
  { id: "p7_7", gateNumber: 7, color: "#ff3333", bgColor: "#400808", borderColor: "#ff3333", x: 1160, y: 1050, name: "Ải 7 (Tây Thần Điện)", allianceTag: "ROY", durability: 300000, maxDurability: 300000 },
  { id: "p7_8", gateNumber: 7, color: "#ff3333", bgColor: "#400808", borderColor: "#ff3333", x: 1240, y: 900, name: "Ải 7 (Tây Bắc)", allianceTag: "ROY", durability: 300000, maxDurability: 300000 },
];

const STONE_SHRINES: StoneShrineNode[] = [
  { id: "sh_1", typeId: "hope", name: "Đền Đá Hy Vọng", x: 480, y: 450, zone: 1, allianceTag: "DRG", status: "controlled", coords: "X: 480, Y: 450" },
  { id: "sh_2", typeId: "wind", name: "Đền Đá Phong Linh", x: 1050, y: 380, zone: 1, allianceTag: "DRG", status: "controlled", coords: "X: 1050, Y: 380" },
  { id: "sh_3", typeId: "blood", name: "Đền Đá Huyết Thạch", x: 2150, y: 420, zone: 1, allianceTag: "VAL", status: "controlled", coords: "X: 2150, Y: 420" },
  { id: "sh_4", typeId: "courage", name: "Đền Đá Dũng Cảm", x: 2350, y: 900, zone: 1, allianceTag: "VAL", status: "controlled", coords: "X: 2350, Y: 900" },
  { id: "sh_5", typeId: "wisdom", name: "Đền Đá Trí Tuệ", x: 420, y: 1100, zone: 1, allianceTag: "PHX", status: "controlled", coords: "X: 420, Y: 1100" },
  { id: "sh_6", typeId: "surge", name: "Đền Đá Triều Cường", x: 550, y: 1550, zone: 1, allianceTag: "PHX", status: "controlled", coords: "X: 550, Y: 1550" },
  { id: "sh_7", typeId: "storm", name: "Đền Đá Bão Tố", x: 2280, y: 1550, zone: 1, allianceTag: "SPT", status: "controlled", coords: "X: 2280, Y: 1550" },
  { id: "sh_8", typeId: "harvest", name: "Đền Đá Thu Hoạch", x: 1150, y: 780, zone: 2, allianceTag: "VNM", status: "controlled", coords: "X: 1150, Y: 780" },
  { id: "sh_9", typeId: "earth", name: "Đền Đá Đất Mẹ", x: 1650, y: 780, zone: 2, allianceTag: "VNM", status: "controlled", coords: "X: 1650, Y: 780" },
  { id: "sh_10", typeId: "order", name: "Đền Đá Trật Tự", x: 1050, y: 1220, zone: 2, allianceTag: "KVK", status: "controlled", coords: "X: 1050, Y: 1220" },
  { id: "sh_11", typeId: "radiance", name: "Đền Đá Hào Quang", x: 1750, y: 1220, zone: 2, allianceTag: "KVK", status: "controlled", coords: "X: 1750, Y: 1220" },
  { id: "sh_12", typeId: "honor", name: "Đền Đá Vinh Quang", x: 1300, y: 920, zone: 3, allianceTag: "ROY", status: "controlled", coords: "X: 1300, Y: 920" },
  { id: "sh_13", typeId: "war", name: "Đền Đá Chiến Tranh", x: 1500, y: 920, zone: 3, allianceTag: "ROY", status: "controlled", coords: "X: 1500, Y: 920" },
  { id: "sh_14", typeId: "flame", name: "Đền Đá Xích Thao", x: 1300, y: 1180, zone: 3, allianceTag: "ROY", status: "controlled", coords: "X: 1300, Y: 1180" },
  { id: "sh_15", typeId: "surge", name: "Đền Đá Hoàng Gia", x: 1500, y: 1180, zone: 3, allianceTag: "ROY", status: "controlled", coords: "X: 1500, Y: 1180" },
];

export function ConquestMap({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fit ~90% screen area on load matching reference sample image
  const [scale, setScale] = useState(0.82);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);

  // Modals
  const [selectedShrine, setSelectedShrine] = useState<StoneShrineNode | null>(null);
  const [selectedPass, setSelectedPass] = useState<NumberedPassNode | null>(null);
  const [showTempleModal, setShowTempleModal] = useState(false);
  const [showBuffOverview, setShowBuffOverview] = useState(false);

  // DYNAMIC AUTO-CENTERING ON LOAD & WINDOW RESIZE
  const autoCenterMap = (currentScale: number) => {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const centerX = (winW - MAP_WIDTH * currentScale) / 2;
    const centerY = (winH - MAP_HEIGHT * currentScale) / 2 + 25;
    setPan({ x: centerX, y: centerY });
  };

  useEffect(() => {
    autoCenterMap(scale);
    const handleResize = () => autoCenterMap(scale);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 60FPS NATIVE HTML5 2D CANVAS RENDERING ENGINE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawRoundedRect = (rx: number, ry: number, rw: number, rh: number, rad: number) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(rx, ry, rw, rh, rad);
      } else {
        ctx.moveTo(rx + rad, ry);
        ctx.lineTo(rx + rw - rad, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
        ctx.lineTo(rx + rw, ry + rh - rad);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
        ctx.lineTo(rx + rad, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
        ctx.lineTo(rx, ry + rad);
        ctx.quadraticCurveTo(rx, ry, rx + rad, ry);
      }
    };

    const renderFrame = () => {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== Math.floor(winW * dpr) || canvas.height !== Math.floor(winH * dpr)) {
        canvas.width = Math.floor(winW * dpr);
        canvas.height = Math.floor(winH * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // ── STEP 1. PARCHMENT SAND MAP TAN BACKGROUND MATCHING SAMPLE EXACTLY ──
      const sandGrad = ctx.createLinearGradient(0, 0, winW, winH);
      sandGrad.addColorStop(0, "#cf9e5e");
      sandGrad.addColorStop(0.5, "#e6c88f");
      sandGrad.addColorStop(1, "#c29152");
      ctx.fillStyle = sandGrad;
      ctx.fillRect(0, 0, winW, winH);

      // Draw subtle compass & map contour lines on parchment sand
      ctx.strokeStyle = "rgba(138, 98, 48, 0.15)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= winW; x += 120) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, winH);
        ctx.stroke();
      }
      for (let y = 0; y <= winH; y += 120) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(winW, y);
        ctx.stroke();
      }

      // Apply Pan & Scale Transform for Map Content
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(scale, scale);

      // ── STEP 2. 3D JAGGED ROCK CLIFF SLAB SHADOW & FACES (VIỀN VÁCH ĐÁ 3D) ──
      ctx.fillStyle = "rgba(35, 20, 8, 0.65)"; // Soft 3D drop shadow
      ctx.beginPath();
      CONTINENT_POINTS.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py + 36);
        else ctx.lineTo(px, py + 36);
      });
      ctx.closePath();
      ctx.fill();

      // Extruded 3D Rock Cliff Walls (Dark Mossy Rock Face)
      const cliffGrad = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
      cliffGrad.addColorStop(0, "#2d5029");
      cliffGrad.addColorStop(1, "#173214");
      ctx.fillStyle = cliffGrad;
      ctx.strokeStyle = "#122610";
      ctx.lineWidth = 12;
      ctx.beginPath();
      CONTINENT_POINTS.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py + 26);
        else ctx.lineTo(px, py + 26);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // ── STEP 3. TOP CONTINENT GREEN PLATEAU SURFACE MATCHING SAMPLE ──
      const continentGrad = ctx.createLinearGradient(0, 0, MAP_WIDTH, MAP_HEIGHT);
      continentGrad.addColorStop(0, "#52994a");
      continentGrad.addColorStop(0.5, "#427a3a");
      continentGrad.addColorStop(1, "#34612e");
      ctx.fillStyle = continentGrad;
      ctx.strokeStyle = "#274822";
      ctx.lineWidth = 6;
      ctx.beginPath();
      CONTINENT_POINTS.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // ── STEP 4. PROCEDURAL 1,000 TERRITORY TILES GRID ──
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      MEGACONTINENT_TERRITORIES.forEach((tile) => {
        ctx.beginPath();
        const r = 22;
        for (let a = 0; a < 6; a++) {
          const angle = (a * Math.PI) / 3;
          const tx = tile.x + Math.cos(angle) * r;
          const ty = tile.y + Math.sin(angle) * r;
          if (a === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.closePath();
        if (tile.biome === 7) {
          ctx.fillStyle = "rgba(255, 200, 0, 0.28)";
          ctx.fill();
        } else if (tile.biome === 3) {
          ctx.fillStyle = "rgba(6, 182, 212, 0.24)";
          ctx.fill();
        }
        ctx.stroke();
      });

      // ── STEP 5. LIGHT SAGE-GREEN REGION BOUNDARY LINES MATCHING SAMPLE IMAGE ──
      ctx.strokeStyle = "#4f8a47";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const drawPath = (coords: number[][]) => {
        ctx.beginPath();
        coords.forEach(([x, y], i) => {
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      };

      drawPath([[300, 650], [520, 650], [800, 550], [1250, 280]]);
      drawPath([[1250, 280], [1200, 520], [1400, 650]]);
      drawPath([[1750, 280], [1600, 440], [1720, 440], [1980, 550], [2320, 650]]);
      drawPath([[300, 1300], [480, 1300], [750, 1450], [880, 1550], [1050, 1770]]);
      drawPath([[1050, 1770], [1020, 1620], [1150, 1620], [1400, 1720]]);
      drawPath([[1750, 1770], [1850, 1550], [2320, 1350]]);

      // Curved Boundary Paths
      ctx.beginPath();
      ctx.moveTo(800, 550);
      ctx.quadraticCurveTo(650, 700, 820, 780);
      ctx.quadraticCurveTo(1050, 720, 1400, 650);
      ctx.quadraticCurveTo(1850, 720, 1980, 880);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(750, 1450);
      ctx.quadraticCurveTo(820, 1100, 920, 1250);
      ctx.quadraticCurveTo(1080, 1350, 1400, 1320);
      ctx.quadraticCurveTo(1680, 1350, 1950, 1080);
      ctx.stroke();

      // Central Pass 7 Ring
      ctx.beginPath();
      ctx.lineWidth = 8;
      ctx.strokeStyle = "#4f8a47";
      ctx.ellipse(1400, 1050, 240, 190, 0, 0, Math.PI * 2);
      ctx.stroke();

      // ── STEP 6. NUMBERED PASS BADGES (8, 5, 4, 6, 7) MATCHING SAMPLE IMAGE ──
      NUMBERED_PASSES.forEach((pass) => {
        ctx.save();
        ctx.translate(pass.x, pass.y);

        // Circle Badge Fill & Border
        ctx.fillStyle = pass.bgColor;
        ctx.strokeStyle = pass.borderColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Number Text
        ctx.fillStyle = pass.color;
        ctx.font = "900 14px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(pass.gateNumber), 0, 1);
        ctx.restore();
      });

      // ── STEP 7. 3D SILVER STONE SHRINES MATCHING SAMPLE IMAGE ──
      STONE_SHRINES.forEach((shrine) => {
        ctx.save();
        ctx.translate(shrine.x, shrine.y);

        // 3D Silver Stone Base
        ctx.fillStyle = "#cbd5e1";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        drawRoundedRect(-14, -16, 28, 32, 5);
        ctx.fill();
        ctx.stroke();

        // Shrine Spire Top
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(10, -14);
        ctx.lineTo(-10, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      });

      // ── STEP 8. CENTRAL GREAT LOST TEMPLE MONUMENT INSIDE PASS 7 RING ──
      ctx.save();
      ctx.translate(1400, 1050);

      // Central Shrine Spire Base
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 3;
      drawRoundedRect(-22, -26, 44, 52, 6);
      ctx.fill();
      ctx.stroke();

      // Temple Spire Roof
      ctx.fillStyle = "#94a3b8";
      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(16, -24);
      ctx.lineTo(-16, -24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Scourge Project Notice Tag Below Temple
      ctx.fillStyle = "#78350f";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.5;
      drawRoundedRect(-110, 36, 220, 24, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fef08a";
      ctx.font = "800 10px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Brought to you by the scourge jumper project", 0, 48);

      ctx.restore();

      ctx.restore(); // Restore Map Transform
      ctx.restore(); // Restore Window Scale

      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [pan, scale]);

  const handleZoom = (delta: number) => {
    const nextScale = Math.min(Math.max(0.35, scale + delta), 2.2);
    setScale(nextScale);
    autoCenterMap(nextScale);
  };

  const handleResetView = () => {
    setScale(0.82);
    autoCenterMap(0.82);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".conquest-interactive-btn") || (e.target as HTMLElement).closest(".conquest-top-bar")) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
    const nextScale = Math.min(Math.max(0.35, scale + zoomFactor), 2.2);
    setScale(nextScale);
  };

  // Canvas Click Detection for Modals
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const mapX = (clickX - pan.x) / scale;
    const mapY = (clickY - pan.y) / scale;

    // Check click on Central Temple
    if (Math.hypot(mapX - 1400, mapY - 1050) < 90) {
      setShowTempleModal(true);
      return;
    }

    // Check click on Numbered Passes
    for (const pass of NUMBERED_PASSES) {
      if (Math.hypot(mapX - pass.x, mapY - pass.y) < 25) {
        setSelectedPass(pass);
        return;
      }
    }

    // Check click on Stone Shrines
    for (const shrine of STONE_SHRINES) {
      if (Math.hypot(mapX - shrine.x, mapY - shrine.y) < 25) {
        setSelectedShrine(shrine);
        return;
      }
    }
  };

  return (
    <div
      className="conquest-root native-canvas-mode"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* ── STICKY TOP BUFF BAR MATCHING SCREENSHOT EXACTLY ── */}
      <header className="conquest-top-bar">
        {/* Gate Fortress Icon */}
        <div className="conquest-top-left-gate" title="Cửa Ải Đã Mở">
          <div className="conquest-gate-badge">
            <span className="gate-icon">🏰</span>
            <span className="gate-count">42/42</span>
          </div>
        </div>

        {/* 14 Holy Sites Horizontal Scroll List */}
        <div className="conquest-holy-sites-strip">
          {Object.values(HOLY_SITE_TYPES).map((site) => (
            <div
              key={site.id}
              className="conquest-site-pill"
              onClick={() => setShowBuffOverview(true)}
              style={{ borderBottomColor: site.color }}
            >
              <div className="site-pill-icon" style={{ backgroundColor: site.bgGlow, color: site.color }}>
                {site.icon}
              </div>
              <div className="site-pill-info">
                <span className="site-pill-name">{site.name}</span>
                <span className="site-pill-buff">{site.buffs[0].label} {site.buffs[0].val}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Top Right Label & Close Button */}
        <div className="conquest-top-right">
          <span className="conquest-unique-label">× Unique quantity of holy sites</span>
          <button className="conquest-close-btn conquest-interactive-btn" onClick={onClose}>
            ✕ QUAY VỀ BẢN ĐỒ THẾ GIỚI
          </button>
        </div>
      </header>

      {/* ── NATIVE 60FPS HTML5 2D CANVAS ENGINE (100% PARCHMENT SAND MAP) ── */}
      <canvas
        ref={canvasRef}
        className="conquest-native-canvas"
        onClick={handleCanvasClick}
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          zIndex: 1,
          touchAction: "none",
          cursor: isDragging ? "grabbing" : "grab",
        }}
      />

      {/* ── MAP CONTROLS OVERLAY (BOTTOM LEFT) ── */}
      <div className="conquest-controls-panel conquest-interactive-btn" style={{ zIndex: 100 }}>
        <button onClick={() => handleZoom(0.15)} title="Phóng to">+</button>
        <button onClick={() => handleZoom(-0.15)} title="Thu nhỏ">−</button>
        <button onClick={handleResetView} title="Về Trung Tâm">🎯</button>
        <button onClick={() => setShowBuffOverview(true)} title="Danh Sách Buff">📜</button>
      </div>

      {/* ── STONE SHRINE DETAIL MODAL ── */}
      {selectedShrine && (
        <div className="conquest-modal-backdrop" onClick={() => setSelectedShrine(null)}>
          <div className="conquest-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderColor: HOLY_SITE_TYPES[selectedShrine.typeId]?.color }}>
              <div className="modal-title-wrap">
                <span className="modal-icon">{HOLY_SITE_TYPES[selectedShrine.typeId]?.icon}</span>
                <div>
                  <h3>{selectedShrine.name}</h3>
                  <span className="modal-subtitle">Thánh Địa {HOLY_SITE_TYPES[selectedShrine.typeId]?.vnName} • Vùng {selectedShrine.zone}</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedShrine(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="info-row">
                <span className="label">Tọa độ:</span>
                <span className="val">{selectedShrine.coords}</span>
              </div>
              <div className="info-row">
                <span className="label">Liên minh sở hữu:</span>
                <span className="val highlight">[{selectedShrine.allianceTag}] Royal Alliance</span>
              </div>
              <div className="info-row">
                <span className="label">Trạng thái:</span>
                <span className="val status-open">🟢 Đã Chiếm Giữ (Bảo Vệ)</span>
              </div>

              <div className="buff-section">
                <h4>✨ Chỉ Số Buff Toàn Liên Minh</h4>
                <div className="buff-grid">
                  {HOLY_SITE_TYPES[selectedShrine.typeId]?.buffs.map((b, i) => (
                    <div key={i} className="buff-card">
                      <span className="b-label">{b.label}</span>
                      <span className="b-val">{b.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedShrine(null)}>Đóng</button>
              <button className="btn-primary" onClick={() => alert(`Đang định vị tọa độ ${selectedShrine.coords}`)}>🎯 Định Vị</button>
            </div>
          </div>
        </div>
      )}

      {/* ── NUMBERED PASS DETAIL MODAL ── */}
      {selectedPass && (
        <div className="conquest-modal-backdrop" onClick={() => setSelectedPass(null)}>
          <div className="conquest-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderColor: selectedPass.color }}>
              <div className="modal-title-wrap">
                <span className="modal-icon" style={{ color: selectedPass.color }}>🏰</span>
                <div>
                  <h3>{selectedPass.name}</h3>
                  <span className="modal-subtitle">Cửa Ải Số {selectedPass.gateNumber}</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedPass(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="info-row">
                <span className="label">Độ bền pháo đài:</span>
                <span className="val">{selectedPass.durability.toLocaleString()} / {selectedPass.maxDurability.toLocaleString()} HP</span>
              </div>
              <div className="info-row">
                <span className="label">Liên minh kiểm soát:</span>
                <span className="val highlight">[{selectedPass.allianceTag}] Kingdom Guard</span>
              </div>
              <div className="info-row">
                <span className="label">Trạng thái thông hành:</span>
                <span className="val status-open">⚔️ Cho Phép Liên Minh Đi Qua</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedPass(null)}>Đóng</button>
              <button className="btn-primary" onClick={() => alert(`Chuẩn bị hành quân đến ${selectedPass.name}`)}>⚔️ Hành Quân</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CENTRAL SHRINE MODAL ── */}
      {showTempleModal && (
        <div className="conquest-modal-backdrop" onClick={() => setShowTempleModal(false)}>
          <div className="conquest-modal-card grand-temple-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderColor: "#06b6d4" }}>
              <div className="modal-title-wrap">
                <span className="modal-icon">👑</span>
                <div>
                  <h3>THẦN ĐIỆN TỐI CAO (LOST TEMPLE)</h3>
                  <span className="modal-subtitle">Trái Tim Vương Quốc Chinh Phạt</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowTempleModal(false)}>✕</button>
            </div>

            <div className="modal-body text-center">
              <div className="temple-crown-badge">
                <span className="crown-icon">👑</span>
                <h4>Vua Vương Quốc: High King Arthur</h4>
                <p className="alliance-tag">Liên Minh Làm Chủ: [ROY] Royal Guardians</p>
              </div>

              <div className="temple-project-notice">
                <p>Brought to you by the scourge jumper project</p>
              </div>

              <div className="buff-section">
                <h4>🏆 Đặc Quyền Quốc Vương & Buff Thần Điện</h4>
                <div className="buff-grid">
                  <div className="buff-card"><span className="b-label">Tốc Độ Tấn Công</span><span className="b-val">+15%</span></div>
                  <div className="buff-card"><span className="b-label">Tốc Độ Thu Hoạch</span><span className="b-val">+20%</span></div>
                  <div className="buff-card"><span className="b-label">Tốc Độ Nghiên Cứu</span><span className="b-val">+15%</span></div>
                  <div className="buff-card"><span className="b-label">Sức Chứa Bệnh Viện</span><span className="b-val">+50,000</span></div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" style={{ width: "100%" }} onClick={() => setShowTempleModal(false)}>XÁC NHẬN</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ALL BUFFS OVERVIEW MODAL ── */}
      {showBuffOverview && (
        <div className="conquest-modal-backdrop" onClick={() => setShowBuffOverview(false)}>
          <div className="conquest-modal-card grand-buff-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderColor: "#fbbf24" }}>
              <div className="modal-title-wrap">
                <span className="modal-icon">📜</span>
                <div>
                  <h3>TỔNG HỢP BUFF THÁNH ĐỊA CHINH PHẠT</h3>
                  <span className="modal-subtitle">14 Loại Thánh Địa & Tác Động Thụ Động</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowBuffOverview(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="all-buffs-list">
                {Object.values(HOLY_SITE_TYPES).map((site) => (
                  <div key={site.id} className="all-buff-item" style={{ borderLeftColor: site.color }}>
                    <div className="buff-item-head">
                      <span className="icon">{site.icon}</span>
                      <strong style={{ color: site.color }}>{site.name} ({site.vnName})</strong>
                    </div>
                    <div className="buff-item-details">
                      {site.buffs.map((b, i) => (
                        <span key={i} className="buff-tag">{b.label}: <strong>{b.val}</strong></span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" style={{ width: "100%" }} onClick={() => setShowBuffOverview(false)}>ĐÓNG</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
