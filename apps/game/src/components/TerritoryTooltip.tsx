import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// --- 100% PREMIUM HIGH DEFINITION VECTOR SVGS (NO RAW EMOJIS) ---
function SwordsIcon() {
  return (
    <svg viewBox="0 0 64 64" width="22" height="22" style={{ marginRight: 8, verticalAlign: "middle", filter: "drop-shadow(0 0 4px rgba(255,255,255,0.6))" }}>
      <defs>
        <linearGradient id="swordBlade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="swordGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe082" />
          <stop offset="100%" stopColor="#ffb300" />
        </linearGradient>
      </defs>
      {/* Sword 1 */}
      <g transform="rotate(45 32 32)">
        <path d="M30 6h4v42h-4z" fill="url(#swordBlade)" stroke="#0f172a" strokeWidth="2" />
        <path d="M22 42h20v4H22z" fill="url(#swordGold)" stroke="#0f172a" strokeWidth="2" />
        <path d="M30 46h4v10h-4z" fill="#78350f" stroke="#0f172a" strokeWidth="1.5" />
        <circle cx="32" cy="58" r="3" fill="url(#swordGold)" stroke="#0f172a" strokeWidth="1.5" />
      </g>
      {/* Sword 2 */}
      <g transform="rotate(-45 32 32)">
        <path d="M30 6h4v42h-4z" fill="url(#swordBlade)" stroke="#0f172a" strokeWidth="2" />
        <path d="M22 42h20v4H22z" fill="url(#swordGold)" stroke="#0f172a" strokeWidth="2" />
        <path d="M30 46h4v10h-4z" fill="#78350f" stroke="#0f172a" strokeWidth="1.5" />
        <circle cx="32" cy="58" r="3" fill="url(#swordGold)" stroke="#0f172a" strokeWidth="1.5" />
      </g>
      {/* Central Gem */}
      <circle cx="32" cy="32" r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
    </svg>
  );
}

function PickaxeIcon() {
  return (
    <svg viewBox="0 0 64 64" width="20" height="20" style={{ marginRight: 8, verticalAlign: "middle" }}>
      <defs>
        <linearGradient id="pickSteel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <g stroke="#0f172a" strokeWidth="2" strokeLinejoin="round">
        <path d="M12 52l32-32 8 8-32 32z" fill="#b45309" />
        <path d="M40 12c4 6 12 12 16 10s4-12-2-16-12-2-14 6z" fill="url(#pickSteel)" />
      </g>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 64 64" width="16" height="16" style={{ marginRight: 6, verticalAlign: "middle" }}>
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <path d="M32 6 C18 10 12 18 12 32 C12 46 22 54 32 58 C42 54 52 46 52 32 C52 18 46 10 32 6 Z" fill="url(#shieldGrad)" stroke="#fef08a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 10v42c6-3 14-9 14-20 0-10-4-16-14-22z" fill="#60a5fa" opacity="0.8" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 64 64" width="18" height="18" style={{ marginRight: 8, verticalAlign: "middle" }}>
      <circle cx="32" cy="32" r="26" fill="#ef4444" stroke="#7f1d1d" strokeWidth="3" />
      <path d="M20 20l24 24M44 20l-24 24" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function HammerIcon() {
  return (
    <svg viewBox="0 0 64 64" width="16" height="16" style={{ marginRight: 6, verticalAlign: "middle" }}>
      <path d="M14 50l26-26 8 8-26 26z" fill="#b45309" stroke="#451a03" strokeWidth="1.5" />
      <path d="M36 14l14-14 8 8-14 14z" fill="#cbd5e1" stroke="#1e293b" strokeWidth="2" />
      <path d="M44 8l6 6" stroke="#475569" strokeWidth="1.5" />
    </svg>
  );
}

function ShieldAlertIcon() {
  return (
    <svg viewBox="0 0 64 64" width="16" height="16" style={{ marginRight: 6, verticalAlign: "middle" }}>
      <path d="M32 6 C18 10 12 18 12 32 C12 46 22 54 32 58 C42 54 52 46 52 32 C52 18 46 10 32 6 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" />
      <path d="M32 16v18M32 44h.02" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function HourglassMiniIcon() {
  return (
    <svg viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 4, verticalAlign: "middle" }}>
      <path d="M16 12h32v4L36 32l12 16v4H16v-4l12-16L16 16z" fill="none" stroke="#fbbf24" strokeWidth="3" />
      <path d="M22 16h20v2L32 30 22 18z" fill="#fef08a" />
      <path d="M22 48h20v-2L32 34 22 46z" fill="#fbbf24" />
    </svg>
  );
}

function WoodIcon() {
  return (
    <svg viewBox="0 0 64 64" width="18" height="18" style={{ flexShrink: 0 }}>
      <path d="M12 24c0-4 4-8 10-8h28c4 0 8 4 8 8v16c0 4-4 8-8 8H22c-6 0-10-4-10-8V24z" fill="#b45309" stroke="#451a03" strokeWidth="2" />
      <ellipse cx="16" cy="32" rx="4" ry="8" fill="#f59e0b" stroke="#451a03" strokeWidth="1.5" />
    </svg>
  );
}

const StoneIcon = () => (
  <svg viewBox="0 0 64 64" width="18" height="18" style={{ flexShrink: 0 }}>
    <polygon points="16,44 24,18 48,22 52,44" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
    <line x1="24" y1="18" x2="32" y2="44" stroke="#cbd5e1" strokeWidth="1.5" />
  </svg>
);

const FoodIcon = () => (
  <svg viewBox="0 0 64 64" width="18" height="18" style={{ flexShrink: 0 }}>
    <path d="M32 6v52M20 18c12-8 24 0 24 0M12 32c12-8 24 0 24 0M32 32c12-8 24 0 24 0" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" fill="none" />
  </svg>
);

const IronIcon = () => (
  <svg viewBox="0 0 64 64" width="18" height="18" style={{ flexShrink: 0 }}>
    <path d="M8 26l16-14h24l10 14-14 26H8z" fill="#64748b" stroke="#1e293b" strokeWidth="2" />
    <path d="M8 26h50v6H8z" fill="#cbd5e1" />
  </svg>
);

const CoalIcon = () => (
  <svg viewBox="0 0 64 64" width="18" height="18" style={{ flexShrink: 0 }}>
    <path d="M16 16l20-8 16 12-4 24-24 8-16-16z" fill="#1e293b" stroke="#0f172a" strokeWidth="2.5" />
    <circle cx="28" cy="24" r="3" fill="#64748b" />
  </svg>
);

const CoinIcon = () => (
  <svg viewBox="0 0 64 64" width="18" height="18" style={{ flexShrink: 0 }}>
    <circle cx="32" cy="32" r="26" fill="#f59e0b" stroke="#78350f" strokeWidth="2.5" />
    <circle cx="32" cy="32" r="16" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
    <path d="M32 20v24M26 26h12M26 38h12" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SulfurIcon = () => (
  <svg viewBox="0 0 64 64" width="18" height="18" style={{ flexShrink: 0 }}>
    <path d="M32 6C20 20 12 32 12 44a20 20 0 0 0 40 0C52 32 44 20 32 6z" fill="#eab308" stroke="#854d0e" strokeWidth="2" />
    <circle cx="28" cy="38" r="4" fill="#fef08a" />
  </svg>
);

const GemIcon = () => (
  <svg viewBox="0 0 64 64" width="18" height="18" style={{ flexShrink: 0 }}>
    <path d="M32 6L8 24l24 36 24-36z" fill="#0284c7" stroke="#0369a1" strokeWidth="2" />
    <path d="M32 6L18 24h28z" fill="#38bdf8" />
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 64 64" width="15" height="15" style={{ marginRight: 6, verticalAlign: "middle" }}>
    <path d="M32 6C20 6 12 14 12 26c0 14 20 32 20 32s20-18 20-32c0-12-8-20-20-20z" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
    <circle cx="32" cy="24" r="7" fill="#ffffff" />
  </svg>
);

const HourglassIcon = () => (
  <svg viewBox="0 0 64 64" width="15" height="15" style={{ marginRight: 6, verticalAlign: "middle" }}>
    <path d="M14 10h36v6c0 10-10 14-16 16 6 2 16 6 16 16v6H14v-6c0-10 10-14 16-16-6-2-16-6-16-16z" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
    <path d="M20 14h24M20 50h24" stroke="#475569" strokeWidth="3" />
  </svg>
);

const BannerFlagIcon = () => (
  <svg viewBox="0 0 40 60" width="32" height="48" style={{ flexShrink: 0, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))" }}>
    <path d="M4 2h32v44l-16-10-16 10V2z" fill="#8c2a1e" stroke="#ca8a04" strokeWidth="2" />
    <rect x="2" y="0" width="36" height="5" fill="#ffd34d" rx="1" />
    <path d="M14 14h12v14h-12z" fill="#ffd34d" stroke="#ca8a04" strokeWidth="1" />
  </svg>
);

const BookIcon = () => (
  <svg viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 5, verticalAlign: "middle" }}>
    <path d="M8 12c12-4 24 0 24 0s12-4 24 0v40c-12-4-24 0-24 0S16 48 8 52V12z" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
    <line x1="32" y1="12" x2="32" y2="52" stroke="#ca8a04" strokeWidth="2" />
  </svg>
);

const CastleIcon = () => (
  <svg viewBox="0 0 64 64" width="18" height="18" style={{ marginRight: 8, verticalAlign: "middle" }}>
    <path d="M12 20h8v8h8v-8h8v8h8v-8h8v36H12z" fill="#cbd5e1" stroke="#334155" strokeWidth="2" />
    <path d="M26 40h12v16H26z" fill="#1e293b" stroke="#ffd34d" strokeWidth="1.5" />
  </svg>
);

const HorseIcon = () => (
  <svg viewBox="0 0 64 64" width="20" height="20" style={{ marginRight: 8, flexShrink: 0 }}>
    <path d="M16 48c0-16 12-28 28-28l8-12h-8c-12 0-20 8-24 16l-4 24z" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
    <circle cx="38" cy="20" r="2.5" fill="#fff" />
  </svg>
);

const GoldVeinIcon = () => (
  <svg viewBox="0 0 64 64" width="20" height="20" style={{ marginRight: 8, flexShrink: 0 }}>
    <polygon points="12,48 24,16 40,24 52,12 44,48" fill="#ffd34d" stroke="#78350f" strokeWidth="2" />
    <circle cx="28" cy="28" r="3" fill="#fff" />
  </svg>
);

const IronMineIcon = () => (
  <svg viewBox="0 0 64 64" width="20" height="20" style={{ marginRight: 8, flexShrink: 0 }}>
    <rect x="12" y="24" width="40" height="24" rx="4" fill="#64748b" stroke="#1e293b" strokeWidth="2.5" />
    <path d="M16 28h32v6H16z" fill="#cbd5e1" />
  </svg>
);

const StoneQuarryIcon = () => (
  <svg viewBox="0 0 64 64" width="20" height="20" style={{ marginRight: 8, flexShrink: 0 }}>
    <polygon points="16,48 28,16 48,24 52,48" fill="#94a3b8" stroke="#334155" strokeWidth="2.5" />
    <path d="M28 16l10 8-4 24" stroke="#cbd5e1" strokeWidth="2" fill="none" />
  </svg>
);

const CoalSeamIcon = () => (
  <svg viewBox="0 0 64 64" width="20" height="20" style={{ marginRight: 8, flexShrink: 0 }}>
    <polygon points="16,16 44,12 52,36 32,52 12,36" fill="#334155" stroke="#0f172a" strokeWidth="2.5" />
    <polygon points="24,20 38,18 44,32 30,42" fill="#1e293b" />
  </svg>
);

const SpecialStarIcon = () => (
  <svg viewBox="0 0 64 64" width="20" height="20" style={{ marginRight: 8, flexShrink: 0 }}>
    <polygon points="32,4 40,22 60,22 44,34 50,54 32,42 14,54 20,34 4,22 24,22" fill="#ffd34d" stroke="#78350f" strokeWidth="2" />
  </svg>
);

const BiomeIconTree = () => (
  <svg viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 6, verticalAlign: "middle" }}>
    <polygon points="32,8 14,32 24,32 10,48 54,48 40,32 50,32" fill="#10b981" stroke="#047857" strokeWidth="2" />
    <rect x="28" y="48" width="8" height="10" fill="#78350f" />
  </svg>
);

const EarthLandIcon = () => (
  <svg viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 6, verticalAlign: "middle" }}>
    <circle cx="32" cy="32" r="26" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
    <path d="M12 28c8-4 14 0 18 6s12-2 16-10" stroke="#10b981" strokeWidth="4" strokeLinecap="round" fill="none" />
  </svg>
);

const StatusShieldIcon = () => (
  <svg viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 6, verticalAlign: "middle" }}>
    <path d="M32 6C18 10 12 18 12 32c0 14 12 22 20 26 8-4 20-12 20-26 0-14-6-22-20-26z" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
  </svg>
);

// Isometric 3D Hex Biome Terrain Preview Card
const BiomeIsometricCard = ({ biome }: { biome: number }) => {
  return (
    <div className="rt-biome-3d-card">
      <svg viewBox="0 0 120 100" width="105" height="90">
        <defs>
          <linearGradient id="hexTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={biome === 2 ? "#e2e8f0" : biome === 1 ? "#d8ad36" : biome === 3 ? "#cf6337" : "#4a7c36"} />
            <stop offset="100%" stopColor={biome === 2 ? "#cbd5e1" : biome === 1 ? "#a88020" : biome === 3 ? "#993315" : "#2a4c20"} />
          </linearGradient>
          <linearGradient id="hexSide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d2a1a" />
            <stop offset="100%" stopColor="#1a110a" />
          </linearGradient>
        </defs>
        <polygon points="60,35 105,52 105,72 60,90 15,72 15,52" fill="url(#hexSide)" stroke="#ca8a04" strokeWidth="1.5" />
        <polygon points="60,20 105,37 60,54 15,37" fill="url(#hexTop)" stroke="#ca8a04" strokeWidth="1.5" />

        {biome === 2 ? (
          <>
            <polygon points="38,25 30,40 46,40" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
            <polygon points="65,22 55,42 75,42" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
            <circle cx="85" cy="30" r="5" fill="#ffffff" />
          </>
        ) : (
          <>
            <circle cx="60" cy="35" r="10" fill="#fbbf24" opacity="0.6" />
          </>
        )}
      </svg>
    </div>
  );
};

interface TerritoryTooltipProps {
  region: {
    id: number;
    isIslet: boolean;
    ownership: number;
  };
  engine: any;
  onClose?: () => void;
  onKhaiHoang: (regionId: number) => void;
  onHuyKhaiHoang: (regionId: number) => void;
  onAttack: (regionId: number) => void;
  onReinforce: (regionId: number, side?: "attacker" | "defender") => void;
}

function cleanSpecialResourceName(name: string): string {
  if (!name) return "";
  return name.replace(/^[^\w\s\u00C0-\u024F\u1EA0-\u1EFF]+/g, "").trim();
}

function getSpecialResourceIcon(rawName: string) {
  const clean = cleanSpecialResourceName(rawName).toLowerCase();
  if (clean.includes("ngựa") || clean.includes("bãi ngựa")) return <HorseIcon />;
  if (clean.includes("vàng") || clean.includes("mạch vàng")) return <GoldVeinIcon />;
  if (clean.includes("sắt") || clean.includes("mỏ sắt")) return <IronMineIcon />;
  if (clean.includes("đá") || clean.includes("mỏ đá")) return <StoneQuarryIcon />;
  if (clean.includes("than") || clean.includes("vỉa than")) return <CoalSeamIcon />;
  if (clean.includes("ngọc") || clean.includes("mỏ ngọc")) return <GemIcon />;
  return <SpecialStarIcon />;
}

export function TerritoryTooltip({
  region,
  engine,
  onClose,
  onKhaiHoang,
  onHuyKhaiHoang,
  onAttack,
  onReinforce
}: TerritoryTooltipProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const { id, isIslet, ownership } = region;
  const engineState = engine.getState();
  const effectiveOwnership = engine.getRegionOwnership?.(id) ?? ownership;

  const r = engine.getRegion?.(id);
  const specialResources = engine.getTerritorySpecialResources?.(id) || [];

  if (!r) return null;

  const coords = engine.mapToScreen(r.x, r.y);

  const biome = r.biome ?? 0;
  const biomeNames = ["Cỏ Xanh", "Sa Mạc", "Băng Tuyết", "Hỏa Sơn", "Lục Lam", "Vàng Cam", "Rừng Thông", "Đầm Lầy"];
  const biomeDescriptions = [
    "Vùng đồng cỏ xanh tươi trù phú, thời tiết ôn hòa, thích hợp định cư lâu dài.",
    "Vùng đất khô cằn rộng lớn, giàu tài nguyên nhưng luôn tiềm ẩn nguy cơ xung đột.",
    "Vùng lãnh nguyên giá buốt, tuyết phủ quanh năm, địa hình khó di chuyển.",
    "Vùng đất lửa đầy khoáng sản quý hiếm, nhiệt độ cực cao vô cùng nguy hiểm.",
    "Đảo ngọc lục lam tuyệt đẹp giữa đại dương, dồi dào tài nguyên biển quý giá.",
    "Vũng vịnh vàng cam tráng lệ, giao thương thuận lợi, đất đai màu mỡ.",
    "Cánh rừng thông bạt ngàn hoang dã, nguồn gỗ dồi dào và nguyên liệu dã chiến.",
    "Vùng nước sâu đầm lầy u ám, ẩn giấu nhiều cạm bẫy và kho báu cổ xưa."
  ];

  const bName = biomeNames[biome] || "Hoang Dã";
  const bColor = ["#689f38", "#ddaa55", "#ccd7db", "#5a6065", "#4db6ac", "#cf7a57", "#2e7d32", "#809e52"][biome] || "#4db6ac";
  const bDesc = biomeDescriptions[biome] || "Vùng đất hoang dã chưa được khai phá.";

  const y = engine.territoryYield ? engine.territoryYield(id) : { gold: 0, wood: 0, stone: 0, food: 0, iron: 0, coal: 0, sulfur: 0, gems: 0 };
  const dur = engine.clearingDuration ? engine.clearingDuration(id) : 45;
  const buildCost = engine.territoryBuildCost ? engine.territoryBuildCost(id) : { gold: 0, wood: 0, stone: 0, food: 0 };

  const formatYield = (value: number) => value >= 1 ? value.toFixed(1) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  const resourceRows = [
    { key: "wood", label: "Gỗ", value: y.wood, className: "wood", icon: <WoodIcon /> },
    { key: "stone", label: "Đá", value: y.stone, className: "stone", icon: <StoneIcon /> },
    { key: "food", label: "Lương", value: y.food, className: "food", icon: <FoodIcon /> },
    { key: "iron", label: "Sắt", value: y.iron, className: "iron", icon: <IronIcon /> },
    { key: "coal", label: "Than", value: y.coal, className: "coal", icon: <CoalIcon /> },
    { key: "gold", label: "Vàng", value: y.gold, className: "gold", icon: <CoinIcon /> },
    { key: "sulfur", label: "Lưu huỳnh", value: y.sulfur, className: "sulfur", icon: <SulfurIcon /> },
    { key: "gems", label: "Đá quý", value: y.gems, className: "gems", icon: <GemIcon /> },
  ];

  const towns = engine.getTowns ? engine.getTowns() : [];
  const mainTown = towns.find((t: any) => t.owner === 0);
  const distanceKm = mainTown && r ? Math.round(Math.hypot(r.x - mainTown.x, r.y - mainTown.y)) : 100;
  const marchMinutes = Math.max(1, Math.round(distanceKm / 10));

  const isClearingInProgress = engineState.regionInProgress === id;
  const isSettlerTraveling = engineState.settlerTravel?.active && engineState.settlerTravel.targetRegionId === id;
  const isNewbieSelecting = engineState.newbieMode && engineState.newbiePhase === "select_land";
  const playerTownsCount = towns.filter((t: any) => t.owner === 0).length;
  const isStarterClaim = isNewbieSelecting || (playerTownsCount === 0);

  const ownerId = engineState.regionOwnerIds?.[id] || "";
  const rawOwnerName = engineState.regionOwnerNames?.[id] || "";
  const isLocalOwner = Boolean(ownerId && ownerId === engineState.localPlayerId);
  const isRemoteClearing = effectiveOwnership === 0 && rawOwnerName === "ĐANG KHAI HOANG";

  const isCurrentlyClearing = isClearingInProgress || isSettlerTraveling || isRemoteClearing;
  const timing = engineState.activeClearingTimings?.[id];
  
  const formatTime = (secs: number) => {
    if (secs >= 60) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}ph ${s}s`;
    }
    return `${secs}s`;
  };

  const isUnderBattle = engineState.activeBattles?.some((b: any) => b.regionId === id);

  const statusText = isUnderBattle ? "Đang Giao Tranh" : isRemoteClearing ? "Đang Xây Thành" : effectiveOwnership === 1 ? "Đã Chiếm" : effectiveOwnership > 1 ? "Địch Chiếm" : "Hoang Dã";
  const statusClass = isUnderBattle ? "battle" : isRemoteClearing ? "wild" : effectiveOwnership === 1 ? "owned" : effectiveOwnership > 1 ? "enemy" : "wild";

  const rx = r.rx || r.r || 100;
  const zoom = engineState.zoom || 1;
  const cardW = 420;
  const estimatedH = showGuide ? 580 : 520;

  let left = coords.x + rx * zoom + 16;
  let top = coords.y - estimatedH / 2;

  const winW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;

  let positionClass = "pointer-left";
  if (left + cardW > winW - 16) {
    left = coords.x - rx * zoom - cardW - 16;
    positionClass = "pointer-right";
  }

  if (left < 16) left = 16;
  if (top < 16) top = 16;
  if (top + estimatedH > winH - 16) top = Math.max(16, winH - estimatedH - 16);

  const runAndClose = (action: () => void) => { action(); onClose?.(); };

  const renderActionButtons = () => {
    if (isUnderBattle) {
      const isPlayerOwned = effectiveOwnership === 1;
      if (isPlayerOwned) {
        return (
          <>
            <button type="button" className="rt-main-action-btn defender" onClick={() => runAndClose(() => onReinforce(id, "defender"))}>
              <ShieldIcon /> <span className="text-gold-serif">VIỆN TRỢ THỦ THÀNH</span>
            </button>
            <div className="rt-warning-note">Quân tới nơi sẽ cộng vào phe phòng thủ của thành trì</div>
          </>
        );
      }
      return (
        <>
          <button type="button" className="rt-main-action-btn attacker" onClick={() => runAndClose(() => onReinforce(id, "attacker"))}>
            <SwordsIcon /> <span className="text-gold-serif">THAM GIA TẤN CÔNG</span>
          </button>
          <div className="rt-warning-note">Quân tới nơi sẽ cộng vào phe tấn công đang giao tranh</div>
        </>
      );
    }
    if (effectiveOwnership === 1) {
      return (
        <>
          <button type="button" className="rt-main-action-btn build" onClick={() => engine.handleAction("selectTown", { regionId: id })}>
            <CastleIcon /> <span className="text-gold-serif">QUẢN LÝ THÀNH PHỐ</span>
          </button>
          <div className="rt-warning-note">Quản lý quân đội, tài nguyên và nâng cấp công trình của thành phố</div>
        </>
      );
    }
    if (effectiveOwnership === 0) {
      if (isCurrentlyClearing) {
        const startMs = timing?.startedAt ? new Date(timing.startedAt).getTime() : now;
        const arrivesMs = timing?.arrivesAt ? new Date(timing.arrivesAt).getTime() : startMs;
        const completesMs = timing?.completesAt ? new Date(timing.completesAt).getTime() : now + 30000;
        
        const inTravel = timing?.arrivesAt ? now < arrivesMs : false;
        let pctVal = 0;
        let remSecs = 0;

        if (inTravel) {
          const totalTravel = Math.max(1000, arrivesMs - startMs);
          pctVal = Math.round(Math.max(0, Math.min(1, (now - startMs) / totalTravel)) * 100);
          remSecs = Math.max(0, Math.round((arrivesMs - now) / 1000));
        } else {
          const totalClearing = Math.max(1000, completesMs - arrivesMs);
          const elapsed = Math.max(0, now - arrivesMs);
          const dynamicPct = Math.min(1, elapsed / totalClearing);
          const p = Math.max(dynamicPct, engineState.regionClearing?.[id] || 0);
          pctVal = Math.round(Math.min(1, p) * 100);
          remSecs = timing?.completesAt ? Math.max(0, Math.round((completesMs - now) / 1000)) : 0;
        }

        const isLocal = isClearingInProgress || isSettlerTraveling || (timing?.playerId === engineState.localPlayerId);
        
        return (
          <>
            <div className={`rt-clearing-box ${isLocal ? "local" : "remote"}`}>
              <div className="rt-clearing-header">
                <span className="rt-clearing-title-text">
                  {isLocal ? (
                    inTravel ? <><HammerIcon /> ĐANG DI CHUYỂN THỢ XÂY</> : <><HammerIcon /> ĐANG XÂY THÀNH CỦA BẠN</>
                  ) : (
                    inTravel ? <><ShieldAlertIcon /> ĐỊCH ĐANG DI CHUYỂN THỢ XÂY</> : <><ShieldAlertIcon /> ĐỊCH ĐANG XÂY THÀNH</>
                  )}
                </span>
                <span className="rt-clearing-pct-text">{pctVal}%</span>
              </div>
              <div className="rt-clearing-bar-track">
                <div className="rt-clearing-bar-fill" style={{ width: `${pctVal}%`, backgroundColor: inTravel ? "#f59e0b" : "#10b981" }} />
              </div>
              {remSecs > 0 && (
                <div className="rt-clearing-timer">
                  <HourglassMiniIcon /> {inTravel ? "Đến nơi sau:" : "Thời gian còn lại:"} <span className="time-val">{formatTime(remSecs)}</span>
                </div>
              )}
            </div>

            {isLocal && (
              <button type="button" className="rt-main-action-btn attacker" onClick={() => runAndClose(() => onHuyKhaiHoang(id))}>
                <CancelIcon /> <span className="text-gold-serif">HỦY XÂY THÀNH</span>
              </button>
            )}
          </>
        );
      }
      if (engineState.regionInProgress >= 0) {
        return (
          <button type="button" className="rt-main-action-btn build disabled" disabled>
            <HourglassIcon /> <span className="text-gold-serif">ĐỘI THỢ ĐANG BẬN</span>
          </button>
        );
      }
      if (isStarterClaim) {
        return (
          <>
            <button type="button" className="rt-main-action-btn build pulse" onClick={() => onKhaiHoang(id)}>
              <PickaxeIcon /> <span className="text-gold-serif">XÂY THÀNH TÂN THỦ</span>
            </button>
            <div className="rt-note-info" style={{ color: "#4ade80", fontWeight: 700 }}><span className="info-icon">ⓘ</span> Xây dựng miễn phí dành cho tân thủ!</div>
          </>
        );
      }
      return (
        <>
          <button type="button" className="rt-main-action-btn build" onClick={() => runAndClose(() => onKhaiHoang(id))}>
            <PickaxeIcon /> <span className="text-gold-serif">XÂY THÀNH</span>
          </button>
          <div className="rt-cost-card">
            <div className="rt-cost-title-header"><span className="line" /><span className="title">CHI PHÍ XÂY THÀNH</span><span className="line" /></div>
            <div className="rt-cost-chips-grid">
              <div className="rt-cost-chip-item"><CoinIcon /> <b>{buildCost.gold}</b></div>
              <div className="rt-cost-chip-item"><WoodIcon /> <b>{buildCost.wood}</b></div>
              <div className="rt-cost-chip-item"><StoneIcon /> <b>{buildCost.stone}</b></div>
              <div className="rt-cost-chip-item"><FoodIcon /> <b>{buildCost.food}</b></div>
            </div>
          </div>
          <div className="rt-note-info"><span className="info-icon">ⓘ</span> Xây xong sẽ lập thành trì mới.</div>
        </>
      );
    }
    if (effectiveOwnership > 1) {
      return (
        <button type="button" className="rt-main-action-btn attacker" onClick={() => runAndClose(() => onAttack(id))}>
          <SwordsIcon /> <span className="text-gold-serif">PHÁT ĐỘNG TẤN CÔNG</span>
        </button>
      );
    }
    return null;
  };

  const tooltipElement = (
    <div className={`rt-tooltip-container ${positionClass}`} style={{ position: "fixed", left: `${left}px`, top: `${top}px`, width: `${cardW}px`, zIndex: 99999, pointerEvents: "none" }}>
      <div className="rt-tooltip-card" style={{ pointerEvents: "auto" }}>
        {/* Header */}
        <div className="rt-tooltip-header">
          <div className="rt-header-top-row">
            <BannerFlagIcon />
            <div className="rt-header-info">
              <div className="rt-header-title-bar">
                <div className="rt-zone-id">{isIslet ? `ĐẢO NHỎ #${id + 1}` : `LÃNH THỔ #${id + 1}`}</div>
                {onClose && <button type="button" onClick={onClose} className="rt-close-btn">✕</button>}
              </div>
              <div className="rt-badges-group">
                <div className="rt-biome-pill" style={{ color: bColor, borderColor: `${bColor}60` }}>
                  <BiomeIconTree /> {bName}
                </div>
                <button type="button" className="rt-guide-pill-btn" onClick={() => setShowGuide(!showGuide)}>
                  <BookIcon /> {showGuide ? "Đóng" : "HƯỚNG DẪN"}
                </button>
              </div>
            </div>
          </div>
          <div className="rt-header-body-row">
            <div className="rt-biome-desc-text">{bDesc}</div>
            <BiomeIsometricCard biome={biome} />
          </div>
        </div>

        {/* Section Divider */}
        <div className="rt-section-divider">
          <span className="diamond">◇</span><span className="line" /><span className="title">{showGuide ? "HƯỚNG DẪN & BIỂU TƯỢNG" : "THÔNG TIN LÃNH THỔ"}</span><span className="line" /><span className="diamond">◇</span>
        </div>

        {showGuide ? (
          <div className="rt-guide-content-box">
            <div className="rt-guide-section-title">GIAI THÍCH BIỂU TƯỢNG TÀI NGUYÊN:</div>
            <div className="rt-guide-legend-grid">
              <div className="rt-guide-legend-cell"><CoinIcon /> <span className="res-name">Vàng:</span> <span className="res-use">Mộ binh</span></div>
              <div className="rt-guide-legend-cell"><WoodIcon /> <span className="res-name">Gỗ:</span> <span className="res-use">Xây nhà</span></div>
              <div className="rt-guide-legend-cell"><StoneIcon /> <span className="res-name">Đá:</span> <span className="res-use">Tháp canh</span></div>
              <div className="rt-guide-legend-cell"><FoodIcon /> <span className="res-name">Lương:</span> <span className="res-use">Nuôi quân</span></div>
              <div className="rt-guide-legend-cell"><IronIcon /> <span className="res-name">Sắt:</span> <span className="res-use">Vũ khí</span></div>
              <div className="rt-guide-legend-cell"><CoalIcon /> <span className="res-name">Than:</span> <span className="res-use">Nhiên liệu</span></div>
              <div className="rt-guide-legend-cell"><SulfurIcon /> <span className="res-name">Lưu huỳnh:</span> <span className="res-use">Hỏa dược</span></div>
              <div className="rt-guide-legend-cell"><GemIcon /> <span className="res-name">Đá quý:</span> <span className="res-use">Giao thương</span></div>
            </div>
          </div>
        ) : (
          <>
            {/* Territory General Info Grid */}
            <div className="rt-stats-container">
              <div className="rt-stat-item">
                <span className="label"><EarthLandIcon /> Loại đất:</span>
                <span className="val">{isIslet ? "Đảo nhỏ" : "Lục địa lớn"}</span>
              </div>
              {effectiveOwnership === 0 && (
                <>
                  <div className="rt-stat-item">
                    <span className="label"><MapPinIcon /> Khoảng cách:</span>
                    <span className="val">{distanceKm} km</span>
                  </div>
                  <div className="rt-stat-item">
                    <span className="label"><HourglassIcon /> Thời gian chiếm:</span>
                    <span className="val highlighted">{marchMinutes} phút ({dur}s game)</span>
                  </div>
                </>
              )}
              <div className="rt-stat-item">
                <span className="label"><StatusShieldIcon /> Trạng thái:</span>
                <span className={`val ${statusClass}`}>{statusText}</span>
              </div>
            </div>

            {/* Resources per Second Header */}
            <div className="rt-section-divider margin-top">
              <span className="diamond">◇</span><span className="line" /><span className="title">TÀI NGUYÊN / GIÂY</span><span className="line" /><span className="diamond">◇</span>
            </div>

            {/* 8 Resources Grid */}
            <div className="rt-yield-4col-grid">
              {resourceRows.map((row) => (
                <div key={row.key} className={`rt-yield-4col-pill ${row.className}`} title={`${row.label}: +${formatYield(row.value)}/s`}>
                  {row.icon}
                  <span className="rate">+{formatYield(row.value)}/s</span>
                </div>
              ))}
            </div>

            {/* Special Features / Deposits Section */}
            {specialResources.length > 0 && (
              <>
                <div className="rt-section-divider margin-top">
                  <span className="diamond">◇</span><span className="line" /><span className="title">ĐẶC BIỆT</span><span className="line" /><span className="diamond">◇</span>
                </div>
                <div className="rt-special-list-container">
                  {specialResources.map((item: string, idx: number) => {
                    const cleanedName = cleanSpecialResourceName(item);
                    return (
                      <div key={idx} className="rt-special-list-item">
                        {getSpecialResourceIcon(item)}
                        <span className="item-name">{cleanedName}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* Action Button Section */}
        <div style={{ marginTop: "14px", width: "100%" }}>
          {renderActionButtons()}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(tooltipElement, document.body) : tooltipElement;
}
