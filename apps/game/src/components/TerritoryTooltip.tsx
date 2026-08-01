import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ActiveBattle, ActiveClearing, TerritoryInfo, TownSnapshot } from "@island/shared";
import { RESOURCE_META, ResourceIcon } from "./ResourceDisplay";
import { SPECIAL_RESOURCE_META, SpecialResourceIcon, getSpecialResourceMeta } from "./SpecialResourceDisplay";

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

const BannerFlagIcon = ({ color }: { color?: string }) => {
  const flagColor = color || "#8c2a1e";
  return (
    <svg viewBox="0 0 40 60" width="32" height="48" style={{ flexShrink: 0, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))" }}>
      <path d="M4 2h32v44l-16-10-16 10V2z" fill={flagColor} stroke="#ca8a04" strokeWidth="2" />
      <rect x="2" y="0" width="36" height="5" fill="#ffd34d" rx="1" />
      <path d="M14 14h12v14h-12z" fill="#ffd34d" stroke="#ca8a04" strokeWidth="1" />
    </svg>
  );
};

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
  territory?: TerritoryInfo;
  town?: TownSnapshot;
  clearing?: ActiveClearing;
  battle?: ActiveBattle;
  playerId?: string | null;
  ownedTowns?: TownSnapshot[];
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
  return <SpecialResourceIcon name={rawName} className="rt-special-png-icon" />;
}

export function TerritoryTooltip({
  region,
  engine,
  territory,
  town,
  clearing,
  battle,
  playerId,
  ownedTowns = [],
  onClose,
  onKhaiHoang,
  onHuyKhaiHoang,
  onAttack,
  onReinforce
}: TerritoryTooltipProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [selectedYield, setSelectedYield] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const cardElement = document.querySelector(".rt-tooltip-card");
      const arrowPointer = document.querySelector(".rt-tooltip-arrow-pointer");
      
      // If clicking outside the tooltip box, close it smoothly
      if (
        cardElement && 
        !cardElement.contains(event.target as Node) &&
        (!arrowPointer || !arrowPointer.contains(event.target as Node))
      ) {
        onClose?.();
      }
    }
    
    // Register listener after a micro delay to avoid capturing the activation click
    const registerTimer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(registerTimer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const { id, ownership } = region;
  const engineState = engine.getState();
  const isIslet = territory?.isIslet ?? region.isIslet;
  const effectiveOwnership = territory
    ? territory.ownerId === null
      ? 0
      : territory.ownerId === playerId
        ? 1
        : 2
    : engine.getRegionOwnership?.(id) ?? ownership;

  const r = engine.getRegion?.(id);
  const specialResources = territory?.specialResources || engine.getTerritorySpecialResources?.(id) || [];

  if (!r) return null;

  const coords = engine.mapToScreen(r.x, r.y);

  const biome = territory?.biome ?? r.biome ?? 0;
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

  const bName = territory?.biomeName || biomeNames[biome] || "Hoang Dã";
  const bColor = ["#689f38", "#ddaa55", "#ccd7db", "#5a6065", "#4db6ac", "#cf7a57", "#2e7d32", "#809e52"][biome] || "#4db6ac";
  const bDesc = biomeDescriptions[biome] || "Vùng đất hoang dã chưa được khai phá.";

  const clientYield = engine.territoryYield ? engine.territoryYield(id) : { gold: 0, wood: 0, stone: 0, food: 0, gems: 0 };
  const y = territory ? {
    gold: territory.yieldGold * 2.5,
    wood: territory.yieldWood * 2.5,
    stone: territory.yieldStone * 2.5,
    food: territory.yieldFood * 2.5,
    gems: territory.yieldGems * 2.5,
  } : clientYield;
  const dur = territory?.clearingSeconds ?? (engine.clearingDuration ? engine.clearingDuration(id) : 45);
  const buildCost = engine.territoryBuildCost ? engine.territoryBuildCost(id) : { gold: 0, wood: 0, stone: 0, food: 0 };

  const formatYield = (value: number) => value >= 1 ? value.toFixed(1) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  const formatRate = (value: number) => {
    const safe = Math.max(0, value || 0);
    if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)}M`;
    if (safe >= 1_000) return `${(safe / 1_000).toFixed(safe >= 100_000 ? 0 : 1)}K`;
    if (safe >= 10) return Math.round(safe).toLocaleString("vi-VN");
    return safe.toFixed(safe >= 1 ? 1 : 2).replace(/0+$/, "").replace(/\.$/, "");
  };
  const resourceRows = (["food", "wood", "stone", "gold", "gems"] as const).map((key) => ({
    key,
    label: RESOURCE_META[key].label,
    value: y[key],
    hourly: y[key] * 3600,
    daily: y[key] * 86400,
    className: key,
    icon: <ResourceIcon resource={key} />,
  })).filter((row) => row.value > 0.00001);

  const localTowns = ownedTowns.length > 0
    ? ownedTowns
    : (engine.getTowns ? engine.getTowns().filter((item: any) => item.owner === 0) : []);
  const nearestTown = localTowns
    .filter((item: any) => Number.isFinite(Number(item?.x)) && Number.isFinite(Number(item?.y)))
    .sort((a: any, b: any) =>
      Math.hypot(Number(a.x) - r.x, Number(a.y) - r.y) -
      Math.hypot(Number(b.x) - r.x, Number(b.y) - r.y)
    )[0];
  const distanceKm = nearestTown
    ? Math.max(0, Math.round(Math.hypot(Number(nearestTown.x) - r.x, Number(nearestTown.y) - r.y) * 0.18))
    : null;

  const isClearingInProgress = engineState.regionInProgress === id;
  const isSettlerTraveling = engineState.settlerTravel?.active && engineState.settlerTravel.targetRegionId === id;
  const isNewbieSelecting = engineState.newbieMode && engineState.newbiePhase === "select_land";
  const playerTerritoriesCount = Object.keys(engineState.regionOwnership || {}).filter((regionId) =>
    engineState.regionOwnership[Number(regionId)] === 1 || engineState.regionOwnerIds?.[Number(regionId)] === engineState.localPlayerId
  ).length;
  const isStarterClaim = isNewbieSelecting || playerTerritoriesCount === 0;
  const canBuildStronghold = isStarterClaim || Boolean(engine.canBuildStronghold?.(id));

  const rawOwnerName = engineState.regionOwnerNames?.[id] || "";
  const isOwnClearing = Boolean(clearing?.playerId === playerId) || isClearingInProgress || isSettlerTraveling;
  const isRemoteClearing = effectiveOwnership === 0 && Boolean(
    clearing && clearing.playerId !== playerId
  ) || (effectiveOwnership === 0 && rawOwnerName === "ĐANG KHAI HOANG");

  const isCurrentlyClearing = Boolean(clearing) || isClearingInProgress || isSettlerTraveling || isRemoteClearing;
  const timing = clearing || engineState.activeClearingTimings?.[id];
  
  const formatTime = (secs: number) => {
    if (secs >= 60) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}ph ${s}s`;
    }
    return `${secs}s`;
  };

  const isUnderBattle = Boolean(battle) || engineState.activeBattles?.some((b: any) => b.regionId === id);
  const settlementKind = territory?.settlementKind ?? engineState.regionSettlementKinds?.[id];
  const isMilitaryDistrict = settlementKind === "military" || (settlementKind as string) === "military_district";
  const isSubCapital = settlementKind === "sub_capital";
  const settlementKindLabel = isSubCapital
    ? "Trung Tâm Thành Trì"
    : isMilitaryDistrict
    ? "Quân Khu"
    : "Thủ Đô";

  const statusText = isUnderBattle
    ? "Đang Giao Tranh"
    : isOwnClearing
    ? "Bạn đang dựng Pháo Đài"
    : isRemoteClearing
    ? "Đối thủ đang dựng Pháo Đài"
    : effectiveOwnership === 1
    ? `Đã Chiếm (${settlementKindLabel})`
    : effectiveOwnership > 1
    ? `Địch Chiếm (${settlementKindLabel})`
    : "Hoang Dã";
  const statusClass = isUnderBattle ? "battle" : isRemoteClearing ? "wild" : effectiveOwnership === 1 ? "owned" : effectiveOwnership > 1 ? "enemy" : "wild";
  const ownerName = effectiveOwnership === 0
    ? "Chưa có chủ"
    : effectiveOwnership === 1
      ? "Bạn"
      : territory?.ownerName || rawOwnerName || "Đối thủ";
  const storage = town?.storage && typeof town.storage === "object"
    ? Object.values(town.storage).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0)
    : 0;
  const storageCapacity = typeof town?.storageCapacity === "number"
    ? town.storageCapacity
    : town?.storageCapacity && typeof town.storageCapacity === "object"
      ? Object.values(town.storageCapacity).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0)
      : 0;

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

  const arrowOffsetY = Math.max(32, Math.min(estimatedH - 38, coords.y - top));

  const runAndClose = (action: () => void) => { action(); onClose?.(); };

  const renderActionButtons = () => {
    if (isUnderBattle) {
      const isPlayerOwned = effectiveOwnership === 1;
      const activeBattle = battle || engineState.activeBattles?.find((b: any) => b.regionId === id);
      const remSec = battle?.resolvesAt
        ? Math.max(0, Math.ceil((new Date(battle.resolvesAt).getTime() - now) / 1000))
        : activeBattle
          ? Math.max(0, Math.ceil((activeBattle.duration || activeBattle.durationSeconds || 25) - (activeBattle.t || 0)))
          : 15;
      const totalDur = Math.max(1, battle?.durationSeconds || activeBattle?.duration || activeBattle?.durationSeconds || 25);
      const progressPct = Math.round(Math.max(0, Math.min(1, 1 - remSec / totalDur)) * 100);
      const attackerMaxHp = Math.max(1, Number(activeBattle?.attackerMaxHp || activeBattle?.attackerPower || activeBattle?.attPower || 1));
      const defenderMaxHp = Math.max(1, Number(activeBattle?.defenderMaxHp || activeBattle?.defenderPower || activeBattle?.defPower || 1));
      const attackerHp = Math.max(0, Math.min(attackerMaxHp, Number(activeBattle?.attackerCurrentHp ?? attackerMaxHp)));
      const defenderHp = Math.max(0, Math.min(defenderMaxHp, Number(activeBattle?.defenderCurrentHp ?? defenderMaxHp)));
      const attackerLabel = activeBattle?.attackerId === playerId ? "QUÂN CỦA BẠN" : "QUÂN TẤN CÔNG";
      const defenderLabel = activeBattle?.defenderId === playerId ? "QUÂN CỦA BẠN" : "QUÂN PHÒNG THỦ";
      const hpRow = (label: string, hp: number, maxHp: number, color: string) => (
        <div style={{ display: "grid", gridTemplateColumns: "88px 1fr 116px", alignItems: "center", gap: 8, marginTop: 7 }}>
          <strong style={{ color, fontSize: 9 }}>{label}</strong>
          <span style={{ height: 7, overflow: "hidden", background: "rgba(0,0,0,.62)", border: "1px solid rgba(255,255,255,.12)" }}>
            <span style={{ display: "block", height: "100%", width: `${Math.round((hp / maxHp) * 100)}%`, background: color, transition: "width .35s linear" }} />
          </span>
          <span style={{ color: "#e8edf3", fontSize: 9, textAlign: "right" }}>
            {Math.ceil(hp)}/{Math.ceil(maxHp)} · {Math.round((hp / maxHp) * 100)}%
          </span>
        </div>
      );

      return (
        <>
          <div className="rt-clearing-box remote" style={{ borderColor: "#ef4444", marginBottom: 12, background: "rgba(30, 10, 10, 0.9)" }}>
            <div className="rt-clearing-header">
              <span className="rt-clearing-title-text" style={{ color: "#fca5a5" }}>
                CHIẾN SỰ ĐANG DIỄN RA KHỐC LIỆT
              </span>
              <span className="rt-clearing-pct-text" style={{ color: "#ffd34d" }}>Còn {remSec}s</span>
            </div>
            <div className="rt-clearing-bar-track">
              <div className="rt-clearing-bar-fill" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #ef4444 0%, #f59e0b 100%)" }} />
            </div>
            {hpRow(attackerLabel, attackerHp, attackerMaxHp, "#ef6a5b")}
            {hpRow(defenderLabel, defenderHp, defenderMaxHp, "#4aa3ff")}
            <div className="rt-clearing-subtext">Trận đánh đang đếm ngược tổng kết trên Server</div>
          </div>
          {isPlayerOwned ? (
            <>
              <button type="button" className="rt-main-action-btn defender" onClick={() => runAndClose(() => onReinforce(id, "defender"))}>
                <ShieldIcon /> <span className="text-gold-serif">VIỆN TRỢ THỦ THÀNH</span>
              </button>
              <button type="button" className="rt-main-action-btn build" onClick={() => engine.handleAction("selectTown", { regionId: id })}>
                <CastleIcon /> <span className="text-gold-serif">QUẢN LÝ VÀ XUẤT QUÂN</span>
              </button>
              <div className="rt-warning-note">Quân tới nơi sẽ cộng vào phe phòng thủ của thành trì</div>
            </>
          ) : (
            <>
              <button type="button" className="rt-main-action-btn attacker" onClick={() => runAndClose(() => onReinforce(id, "attacker"))}>
                <SwordsIcon /> <span className="text-gold-serif">THAM GIA TẤN CÔNG</span>
              </button>
              <div className="rt-warning-note">Quân tới nơi sẽ cộng vào phe tấn công đang giao tranh</div>
            </>
          )}
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

      if (isStarterClaim) {
        return (
          <>
            <button type="button" className="rt-main-action-btn build pulse" onClick={() => onKhaiHoang(id)}>
            <PickaxeIcon /> <span className="text-gold-serif">DỰNG HOÀNG THÀNH</span>
            </button>
            <div className="rt-note-info" style={{ color: "#4ade80", fontWeight: 700 }}><span className="info-icon">ⓘ</span> Xây dựng miễn phí dành cho tân thủ!</div>
          </>
        );
      }
      if (!canBuildStronghold) {
        return (
          <div className="rt-busy-builder-notice disconnected" style={{ background: "rgba(30, 15, 15, 0.9)", borderColor: "#ef4444", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <span className="icon" style={{ fontSize: 18 }}>🚫</span>
            <span className="text" style={{ color: "#fca5a5", fontSize: 12, fontWeight: 600 }}>
              CHƯA THỂ MỞ RỘNG: CẦN XÂY LIỀN KỀ, HOẶC DÙNG BẾN TÀU ĐỂ DỰNG ĐIỂM ĐỔ BỘ Ở VEN BIỂN
            </span>
          </div>
        );
      }
      return (
        <>
          <button type="button" className="rt-main-action-btn build" onClick={() => runAndClose(() => onKhaiHoang(id))}>
            <PickaxeIcon /> <span className="text-gold-serif">DỰNG PHÁO ĐÀI</span>
          </button>
          <div className="rt-cost-card">
            <div className="rt-cost-title-header"><span className="line" /><span className="title">CHI PHÍ DỰNG PHÁO ĐÀI</span><span className="line" /></div>
            <div className="rt-cost-chips-grid">
              <div className="rt-cost-chip-item"><CoinIcon /> <b>{buildCost.gold}</b></div>
              <div className="rt-cost-chip-item"><WoodIcon /> <b>{buildCost.wood}</b></div>
              <div className="rt-cost-chip-item"><StoneIcon /> <b>{buildCost.stone}</b></div>
              <div className="rt-cost-chip-item"><FoodIcon /> <b>{buildCost.food}</b></div>
            </div>
          </div>
          <div className="rt-note-info"><span className="info-icon">ⓘ</span> Pháo đài nối bằng đường bộ hoặc Hải Lộ từ một Bến tàu của bạn.</div>
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

  const territoryFlagColor = territory?.ownerFlagColor || engineState.regionOwnerFlagColors?.[id] || (effectiveOwnership === 1 ? (engineState.newbieFlagColor || "#2563eb") : undefined);

  const tooltipElement = (
    <div className={`rt-tooltip-container ${positionClass}`} style={{ position: "fixed", left: `${left}px`, top: `${top}px`, width: `${cardW}px`, zIndex: 99999, pointerEvents: "none", overflow: "visible" }}>
      {/* Dynamic 3D Golden Pointer Arrow pointing to Active Territory */}
      <div
        className={`rt-tooltip-arrow-pointer ${positionClass}`}
        style={{ top: `${arrowOffsetY}px` }}
        aria-hidden="true"
      >
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff08a" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <circle cx="22" cy="22" r="18" fill="rgba(251, 191, 36, 0.3)" stroke="#fbbf24" strokeWidth="2" className="pulse-halo" />
          {positionClass === "pointer-left" ? (
            <path d="M30 10 L10 22 L30 34 L23 22 Z" fill="url(#goldGrad)" stroke="#ffffff" strokeWidth="2" filter="url(#goldGlow)" />
          ) : (
            <path d="M14 10 L34 22 L14 34 L21 22 Z" fill="url(#goldGrad)" stroke="#ffffff" strokeWidth="2" filter="url(#goldGlow)" />
          )}
        </svg>
      </div>
      <div className="rt-tooltip-card" style={{ pointerEvents: "auto" }}>
        {/* Header */}
        <div className="rt-tooltip-header">
          <div className="rt-header-top-row">
            <BannerFlagIcon color={territoryFlagColor} />
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
            <div className="rt-guide-section-title">SỔ TAY QUÂN NHU</div>
            <div className="rt-guide-legend-grid">
              {(["food", "wood", "stone", "gold", "gems"] as const).map((key) => (
                <div className="rt-guide-legend-cell" key={key}>
                  <ResourceIcon resource={key} />
                  <span className="rt-guide-copy"><span className="res-name">{RESOURCE_META[key].label}</span><span className="res-use">{RESOURCE_META[key].purpose}</span></span>
                </div>
              ))}
            </div>
            <div className="rt-guide-section-title rt-guide-subtitle">ĐẶC ĐIỂM CHIẾN LƯỢC</div>
            <div className="rt-guide-special-grid">
              {Object.values(SPECIAL_RESOURCE_META).map((meta) => (
                <div className={`rt-guide-special-item tone-${meta.tone}`} key={meta.label}>
                  <img src={meta.icon} alt="" aria-hidden="true" />
                  <span><strong>{meta.label}</strong><small>{meta.guide}</small></span>
                </div>
              ))}
            </div>
            <p className="rt-guide-note">Chất lượng đất quyết định sản lượng. Kho đầy sẽ ngừng nhận tài nguyên thường; Ngọc không bị chiếm theo kho lãnh thổ.</p>
          </div>
        ) : (
          <>
            {/* Territory General Info Grid */}
            <div className="rt-stats-container">
              <div className="rt-stat-item">
                <span className="label"><EarthLandIcon /> Loại đất:</span>
                <span className="val">{isIslet ? "Đảo nhỏ" : "Lục địa lớn"}</span>
              </div>
              <div className="rt-stat-item">
                <span className="label"><StatusShieldIcon /> Chủ quyền:</span>
                <span className="val">{ownerName}</span>
              </div>
              {effectiveOwnership === 0 && (
                <>
                  {distanceKm !== null && (
                    <div className="rt-stat-item">
                      <span className="label"><MapPinIcon /> Từ thành gần nhất:</span>
                      <span className="val">{distanceKm} km</span>
                    </div>
                  )}
                  <div className="rt-stat-item">
                    <span className="label"><HourglassIcon /> Thời gian xây:</span>
                    <span className="val highlighted">{formatTime(dur)}</span>
                  </div>
                </>
              )}
              {town && (
                <>
                  <div className="rt-stat-item">
                    <span className="label"><CastleIcon /> Công trình:</span>
                    <span className="val">{settlementKindLabel} cấp {town.level ?? 1}</span>
                  </div>
                  <div className="rt-stat-item">
                    <span className="label"><SwordsIcon /> Quân đồn trú:</span>
                    <span className="val">{Math.floor((town.troops || 0) + (town.reservedTroops || 0)).toLocaleString("vi-VN")} / {Math.floor(town.troopCapacity || town.maxTroops || 0).toLocaleString("vi-VN")}</span>
                  </div>
                  <div className="rt-stat-item">
                    <span className="label"><ShieldIcon /> Bổ sung quân:</span>
                    <span className="val highlighted">{town.trainingSpecialty === "cavalry" ? "Kị binh" : town.trainingSpecialty === "artillery" ? "Pháo binh" : "Bộ binh"}{town.troopRecoveryBlockedReason ? ` · ${town.troopRecoveryBlockedReason === "full" ? "đã đầy" : town.troopRecoveryBlockedReason === "resources" ? "thiếu tài nguyên" : town.troopRecoveryBlockedReason === "battle" ? "đang giao tranh" : "bị cô lập"}` : ""}</span>
                  </div>
                  <div className="rt-stat-item">
                    <span className="label"><StatusShieldIcon /> Dân số:</span>
                    <span className="val">{Math.floor(town.population || 0).toLocaleString("vi-VN")} / {Math.floor(town.populationCapacity || 0).toLocaleString("vi-VN")}</span>
                  </div>
                  <div className="rt-stat-item">
                    <span className="label"><CoinIcon /> Kho lãnh thổ:</span>
                    <span className="val">{Math.floor(storage).toLocaleString("vi-VN")} / {Math.floor(storageCapacity).toLocaleString("vi-VN")}</span>
                  </div>
                </>
              )}
              <div className="rt-stat-item">
                <span className="label"><StatusShieldIcon /> Trạng thái:</span>
                <span className={`val ${statusClass}`}>{statusText}</span>
              </div>
              <div className="rt-stat-item">
                <span className="label"><CoinIcon /> Chất lượng đất:</span>
                <span className="val">{Math.round(Number(territory?.resourceQuality || 100))}%</span>
              </div>
            </div>

            {/* Compact server-authoritative yield ledger */}
            <div className="rt-section-divider margin-top">
              <span className="diamond">◇</span><span className="line" /><span className="title">SẢN LƯỢNG LÃNH THỔ</span><span className="line" /><span className="diamond">◇</span>
            </div>

            {/* Server-authoritative territory yields */}
            <div className="rt-yield-ledger">
              {resourceRows.map((row) => (
                <button type="button" key={row.key} className={`rt-yield-ledger-item ${row.className}${selectedYield === row.key ? " is-open" : ""}`} onClick={() => setSelectedYield((current) => current === row.key ? null : row.key)} aria-expanded={selectedYield === row.key}>
                  <span className="rt-yield-main">{row.icon}<span className="name">{row.label}</span></span>
                  <span className="rate">+{formatRate(row.hourly)}/giờ</span>
                  <span className="rt-yield-popover">
                    <strong>{row.label}</strong>
                    <span><b>Trong giờ</b><em>+{formatRate(row.hourly)}</em></span>
                    <span><b>Trong ngày</b><em>+{formatRate(row.daily)}</em></span>
                    <small>{RESOURCE_META[row.key].purpose}</small>
                  </span>
                </button>
              ))}
            </div>

            {/* Special Features / Deposits Section */}
            {specialResources.length > 0 && (
              <>
                <div className="rt-section-divider margin-top">
                  <span className="diamond">◇</span><span className="line" /><span className="title">ĐẶC ĐIỂM CHIẾN LƯỢC</span><span className="line" /><span className="diamond">◇</span>
                </div>
                <div className="rt-special-list-container">
                  {specialResources.map((item: string, idx: number) => {
                    const meta = getSpecialResourceMeta(item);
                    const cleanedName = meta?.label || cleanSpecialResourceName(item);
                    return (
                      <div key={idx} className={`rt-special-list-item${meta ? ` tone-${meta.tone}` : ""}`} title={meta?.guide || cleanedName}>
                        {getSpecialResourceIcon(item)}
                        <span className="rt-special-copy"><span className="item-name">{cleanedName}</span>{meta && <small>{meta.effect}</small>}</span>
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
