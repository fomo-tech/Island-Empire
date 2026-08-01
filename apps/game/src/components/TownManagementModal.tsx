import React from "react";
import { ResourceBag } from "@island/shared";
import {
  EuropeanArtilleryArt,
  EuropeanCavalryArt,
  EuropeanInfantryArt
} from "./EuropeanUnitArt";

interface TownManagementModalProps {
  town: {
    id: number;
    lvl: number;
    owner: number;
    troops: number;
    population: number;
    buildings?: {
      barracks?: number;
      lumberCamp?: number;
      quarry?: number;
      goldMine?: number;
      gemCutter?: number;
      fort?: number;
      siegeWorkshop?: number;
      warehouse?: number;
    };
    storage?: Partial<ResourceBag>;
    storageCapacity?: number | ResourceBag;
    populationCapacity?: number;
    populationPerSecond?: number;
    maxTroops?: number;
    troopCapacity?: number;
    reservedTroops?: number;
    infantryCount?: number;
    cavalryCount?: number;
    artilleryCount?: number;
    trainingSpecialty?: "infantry" | "cavalry" | "artillery";
    nextTroopRecoveryAt?: string;
    troopRecoverySeconds?: number;
    troopRecoveryBlockedReason?: "full" | "resources" | "battle" | "isolated" | null;
    recoveryCost?: Partial<ResourceBag>;
    kind?: "capital" | "sub_capital" | "stronghold";
  };
  resources: ResourceBag;
  gameConfig?: any;
  specialResources?: string[];
  playerColor?: string;
  onClose: () => void;
}

function populationCost(troopValue: number) {
  return Math.max(1, Math.ceil((troopValue || 0) / 5));
}

function ResourceCost({
  label,
  value,
  enough
}: {
  label: string;
  value: number;
  enough: boolean;
}) {
  const dotClass: Record<string, string> = {
    Vàng: "gold",
    Gỗ: "wood",
    Đá: "stone",
    Lương: "food",
  };
  return (
    <span className={`cost-pill ${enough ? "" : "insufficient"}`}>
      <span className={`res-dot res-dot-${dotClass[label] || "gold"}`} />
      {value} {label}
    </span>
  );
}

function TrainingEffect({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="training-rally-effect" aria-hidden="true">
      <span className="training-progress" />
      <span className="rally-plus">+1</span>
      <span className="rally-spark spark-a" />
      <span className="rally-spark spark-b" />
      <span className="rally-spark spark-c" />
      <span className="rally-spark spark-d" />
    </div>
  );
}

function getDarkerColor(hex: string) {
  if (!hex || !hex.startsWith("#")) return "#1e3a8a";
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.floor(r * 0.6));
  g = Math.max(0, Math.floor(g * 0.6));
  b = Math.max(0, Math.floor(b * 0.6));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function InfantryArt({ color }: { color?: string }) {
  const flagColor = color || "#2563eb";
  const flagDarkColor = getDarkerColor(flagColor);

  return (
    <svg viewBox="0 0 120 82" className="unit-art-svg" aria-label="Bộ binh châu Âu">
      <defs>
        <radialGradient id="inf-bg" cx="50%" cy="42%" r="66%">
          <stop offset="0%" stopColor="#294055" />
          <stop offset="72%" stopColor="#0b1723" />
          <stop offset="100%" stopColor="#03070b" />
        </radialGradient>
        <linearGradient id="inf-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="22%" stopColor="#aeb8c5" />
          <stop offset="58%" stopColor="#4a5969" />
          <stop offset="100%" stopColor="#1d2732" />
        </linearGradient>
        <linearGradient id="inf-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff0a6" />
          <stop offset="48%" stopColor="#d5a437" />
          <stop offset="100%" stopColor="#6e4510" />
        </linearGradient>
        <linearGradient id="inf-cloth" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={flagColor} />
          <stop offset="100%" stopColor={flagDarkColor} />
        </linearGradient>
      </defs>
      <path d="M8 68 Q60 78 112 68 L108 76 Q60 84 12 76Z" fill="#05090d" opacity=".75" />
      <ellipse cx="60" cy="42" rx="54" ry="35" fill="url(#inf-bg)" stroke="url(#inf-gold)" strokeWidth="2" />
      <path d="M24 64 L27 13" stroke="#765128" strokeWidth="3" />
      <path d="M28 14 Q46 8 60 16 L56 32 Q42 25 28 31Z" fill="url(#inf-cloth)" stroke="#e8c566" strokeWidth="1.2" />
      <path d="M43 15 L47 22 L41 24Z" fill="#f5d477" />

      <path d="M55 42 L79 41 L84 72 L48 72Z" fill="url(#inf-steel)" stroke="#dbe4ec" strokeWidth="1.2" />
      <path d="M51 44 Q43 47 44 56 L53 58 L59 47Z" fill="url(#inf-steel)" stroke="#c9d2dc" />
      <path d="M79 43 Q88 45 88 55 L80 59 L74 47Z" fill="url(#inf-steel)" stroke="#c9d2dc" />
      <path d="M57 51 L76 51 L78 71 L54 71Z" fill="url(#inf-cloth)" opacity=".92" />
      <path d="M59 55 H75 M61 61 H77 M62 67 H78" stroke="#d8e0e7" strokeWidth="1" opacity=".7" />

      <path d="M55 22 Q67 15 78 23 L80 39 Q70 47 56 39Z" fill="url(#inf-steel)" stroke="#e8c566" strokeWidth="1.4" />
      <path d="M57 29 H78 L77 34 H57Z" fill="#071018" />
      <path d="M64 29 V39 M71 29 V39" stroke="#98a7b7" strokeWidth="1" />
      <path d="M60 21 Q67 10 74 21" fill="url(#inf-cloth)" stroke="#e8c566" />
      <path d="M66 17 Q70 7 79 11 Q72 13 71 22Z" fill={flagColor} />

      <path d="M78 49 L103 43 L106 64 Q96 75 83 73Z" fill="url(#inf-cloth)" stroke="url(#inf-gold)" strokeWidth="2" />
      <path d="M91 47 V68 M82 56 H102" stroke="#f4d77d" strokeWidth="3" />
      <path d="M48 44 L32 66" stroke="#d7dee5" strokeWidth="3" />
      <path d="M28 69 L33 59 L38 65Z" fill="url(#inf-steel)" />
      <path d="M49 72 L45 78 H59 L61 72 M75 72 L74 78 H88 L84 71" fill="#202a34" />
    </svg>
  );
}

function CavalryArt({ color }: { color?: string }) {
  const flagColor = color || "#2563eb";
  const flagDarkColor = getDarkerColor(flagColor);

  return (
    <svg viewBox="0 0 120 82" className="unit-art-svg" aria-label="Kị binh châu Âu">
      <defs>
        <radialGradient id="cav-bg" cx="48%" cy="40%" r="68%">
          <stop offset="0%" stopColor="#354758" />
          <stop offset="72%" stopColor="#101923" />
          <stop offset="100%" stopColor="#04070b" />
        </radialGradient>
        <linearGradient id="cav-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff1a8" />
          <stop offset="48%" stopColor="#d29c31" />
          <stop offset="100%" stopColor="#67400e" />
        </linearGradient>
        <linearGradient id="cav-cloth" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={flagColor} />
          <stop offset="100%" stopColor={flagDarkColor} />
        </linearGradient>
        <linearGradient id="cav-horse" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9a6338" />
          <stop offset="56%" stopColor="#58321d" />
          <stop offset="100%" stopColor="#21140e" />
        </linearGradient>
        <linearGradient id="cav-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eef2f5" />
          <stop offset="45%" stopColor="#8795a3" />
          <stop offset="100%" stopColor="#26323d" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="42" rx="55" ry="35" fill="url(#cav-bg)" stroke="url(#cav-gold)" strokeWidth="2" />
      <path d="M10 73 Q61 79 112 71" stroke="#050709" strokeWidth="7" opacity=".8" />
      <path d="M24 56 Q35 38 60 42 Q82 39 100 55 L91 67 Q66 72 38 66Z" fill="url(#cav-horse)" stroke="#b17848" strokeWidth="1.2" />
      <path d="M34 50 Q26 27 14 29 L8 38 L19 48 L24 60Z" fill="url(#cav-horse)" stroke="#a56c42" />
      <path d="M14 31 L8 24 L18 28 M23 33 Q30 39 34 50" stroke="#17100c" strokeWidth="4" />
      <circle cx="15" cy="36" r="1.6" fill="#f5c968" />
      <path d="M21 48 Q14 53 13 58" stroke="#d4b06b" strokeWidth="1.5" fill="none" />

      <path d="M35 46 Q57 39 80 46 L83 65 Q61 72 38 64Z" fill="url(#cav-cloth)" stroke="url(#cav-gold)" strokeWidth="1.5" />
      <path d="M53 45 V66 M39 54 H81" stroke="#efcf72" strokeWidth="2" opacity=".9" />
      <circle cx="60" cy="54" r="4" fill="#efcf72" />

      <path d="M48 34 L66 34 L70 52 L47 52Z" fill="url(#cav-steel)" stroke="#d6dde3" />
      <path d="M50 18 Q59 12 68 19 L69 34 Q60 40 50 34Z" fill="url(#cav-steel)" stroke="url(#cav-gold)" strokeWidth="1.2" />
      <path d="M51 24 H68 L67 28 H51Z" fill="#070b0f" />
      <path d="M55 17 Q59 7 65 17" fill="url(#cav-cloth)" />
      <path d="M60 12 Q66 4 75 10 Q66 11 64 19Z" fill={flagColor} />
      <path d="M66 39 L79 45 L75 57 L64 50Z" fill="url(#cav-cloth)" stroke="#e7c568" />

      <path d="M13 64 L108 16" stroke="#d6b15d" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M108 16 L117 11 L112 21Z" fill="url(#cav-steel)" stroke="#f8fafc" />
      <path d="M43 64 L38 78 M55 67 L54 79 M78 66 L83 78 M91 62 L99 74" stroke="#3b2417" strokeWidth="4" />
      <path d="M34 78 H44 M50 79 H59 M79 78 H88 M95 74 H104" stroke="#16100c" strokeWidth="3" />
    </svg>
  );
}

function ArtilleryArt({ color }: { color?: string }) {
  const flagColor = color || "#2563eb";
  const flagDarkColor = getDarkerColor(flagColor);

  return (
    <svg viewBox="0 0 120 82" className="unit-art-svg" aria-label="Pháo binh châu Âu">
      <defs>
        <radialGradient id="art-bg" cx="50%" cy="44%" r="68%">
          <stop offset="0%" stopColor="#3f4143" />
          <stop offset="65%" stopColor="#151a1f" />
          <stop offset="100%" stopColor="#050708" />
        </radialGradient>
        <linearGradient id="art-bronze" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe39a" />
          <stop offset="28%" stopColor="#c98a32" />
          <stop offset="70%" stopColor="#76501f" />
          <stop offset="100%" stopColor="#2a1a0a" />
        </linearGradient>
        <linearGradient id="art-cloth" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={flagColor} />
          <stop offset="100%" stopColor={flagDarkColor} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="42" rx="55" ry="35" fill="url(#art-bg)" stroke="url(#art-bronze)" strokeWidth="2" />
      <path d="M88 18 Q96 10 104 17 Q113 13 116 21 Q112 28 102 27 Q95 31 89 26Z" fill="#d7dde0" opacity=".5" />
      <path d="M19 68 Q62 76 108 68" stroke="#050708" strokeWidth="7" opacity=".8" />

      <path d="M22 51 L81 45 L91 53 L37 61Z" fill="url(#art-bronze)" stroke="#f2cf79" strokeWidth="1.3" />
      <path d="M76 43 L102 38 L108 46 L85 52Z" fill="url(#art-bronze)" stroke="#f6d887" strokeWidth="1.4" />
      <ellipse cx="106" cy="42" rx="6" ry="5" fill="#2b1a0a" stroke="#dca653" strokeWidth="2" />
      <rect x="28" y="56" width="58" height="8" rx="2" fill="#68401f" stroke="#b77b39" />

      <g stroke="#c99a53" fill="#171b20">
        <circle cx="41" cy="65" r="15" strokeWidth="3" />
        <circle cx="82" cy="63" r="13" strokeWidth="3" />
      </g>
      <g stroke="#9da7ae" strokeWidth="1.5">
        <path d="M41 50 V80 M26 65 H56 M30 54 L52 76 M30 76 L52 54" />
        <path d="M82 50 V76 M69 63 H95 M73 54 L91 72 M73 72 L91 54" />
      </g>
      <circle cx="41" cy="65" r="4" fill="url(#art-bronze)" />
      <circle cx="82" cy="63" r="4" fill="url(#art-bronze)" />

      <path d="M15 42 L25 42 L28 65 L13 65Z" fill="url(#art-cloth)" stroke="#d8b35a" />
      <circle cx="20" cy="33" r="7" fill="#9ba5ae" stroke="#d9c07a" />
      <path d="M13 31 Q20 22 27 31" fill="#48535d" stroke="#d9c07a" />
      <path d="M24 45 L35 53" stroke="#c89154" strokeWidth="4" />
      <path d="M12 65 L10 77 M25 65 L29 77" stroke="#332319" strokeWidth="4" />
      <path d="M89 23 L91 61" stroke="#775024" strokeWidth="2.5" />
      <path d="M92 24 Q106 18 114 24 L110 36 Q100 31 92 35Z" fill="url(#art-cloth)" stroke="#e5c36b" />
      <path d="M99 25 L104 30 L99 34" fill="none" stroke="#f4d983" strokeWidth="2" />
    </svg>
  );
}

/* Stat Icons */
function IconCastle() {
  return (
    <svg viewBox="0 0 40 40" className="stat-svg-icon">
      <path d="M 10,34 L 10,16 L 15,16 L 15,20 L 20,20 L 20,16 L 25,16 L 25,20 L 30,20 L 30,16 L 30,34 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
      <rect x="16" y="25" width="8" height="9" rx="4" fill="#451a03" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 40 40" className="stat-svg-icon">
      <path d="M 20,4 L 34,10 C 34,26 20,36 20,36 C 20,36 6,26 6,10 Z" fill="#1e3a8a" stroke="#fef08a" strokeWidth="2" />
      <polygon points="20,10 23,17 30,17 24,21 26,28 20,24 14,28 16,21 10,17 17,17" fill="#fef08a" />
    </svg>
  );
}

function IconBanner() {
  return (
    <svg viewBox="0 0 40 40" className="stat-svg-icon">
      <line x1="12" y1="4" x2="12" y2="36" stroke="#ca8a04" strokeWidth="3" strokeLinecap="round" />
      <path d="M 12,8 L 32,8 L 24,18 L 32,28 L 12,28 Z" fill="#b45309" stroke="#fef08a" strokeWidth="1.5" />
    </svg>
  );
}

function IconCrate() {
  return (
    <svg viewBox="0 0 40 40" className="stat-svg-icon">
      <rect x="6" y="10" width="28" height="24" rx="3" fill="#78350f" stroke="#fef08a" strokeWidth="2" />
      <line x1="6" y1="22" x2="34" y2="22" stroke="#fef08a" strokeWidth="1.5" />
      <line x1="20" y1="10" x2="20" y2="34" stroke="#fef08a" strokeWidth="1.5" />
      <circle cx="20" cy="22" r="3" fill="#fef08a" />
    </svg>
  );
}

export function TownManagementModal({
  town,
  resources,
  gameConfig,
  specialResources = [],
  playerColor,
  onClose
}: TownManagementModalProps) {
  const config = gameConfig || {
    infantryCostGold: 100,
    infantryCostWood: 30,
    infantryCostFood: 55,
    infantryTroopsValue: 18,
    cavalryCostGold: 170,
    cavalryCostWood: 40,
    cavalryCostStone: 45,
    cavalryCostFood: 90,
    cavalryCostIron: 12,
    cavalryTroopsValue: 34,
    artilleryCostGold: 240,
    artilleryCostStone: 120,
    artilleryCostIron: 85,
    artilleryCostCoal: 35,
    artilleryCostSulfur: 25,
    artilleryTroopsValue: 58,
  };
  const extraCosts = {
    infantry: { food: config.infantryCostFood || 0 },
    cavalry: { food: config.cavalryCostFood || 0 },
    artillery: {},
  };

  const population = Math.max(0, Math.floor(town.population || 32));
  const buildings = town.buildings || {};
  const hasHorsePasture = specialResources.includes("Bãi ngựa");
  const hasSiegeWorkshop = (buildings.siegeWorkshop || 0) > 0 || specialResources.includes("Xưởng rèn");
  const warehouseLevel = buildings.warehouse || 0;
  const maxDefending = Math.max(10, Math.floor(town.maxTroops ?? population * 10));
  const storageCap = typeof town.storageCapacity === "number"
    ? Math.max(1, Math.floor(town.storageCapacity))
    : Math.max(
        1,
        Object.values(town.storageCapacity || {}).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value) || 0)), 0),
      );
  const storedTotal = Object.values(town.storage || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const storageCapacityByType = typeof town.storageCapacity === "number"
    ? null
    : town.storageCapacity;
  const storageRows = storageCapacityByType
    ? [
        [
          ["Vàng", "gold"],
          ["Gỗ", "wood"],
          ["Đá", "stone"],
          ["Lương", "food"],
        ],
      ].map((row) => row.map(([label, key]) => {
        const resourceKey = key as keyof ResourceBag;
        return `${label} ${Math.floor(Number(town.storage?.[resourceKey] || 0))}/${Math.floor(Number(storageCapacityByType[resourceKey] || 0))}`;
      }).join(" · "))
    : [];
  const specialText = specialResources.length ? specialResources.join(" · ") : "Chưa có";

  const specialty = town.trainingSpecialty || (hasHorsePasture ? "cavalry" : hasSiegeWorkshop ? "artillery" : "infantry");
  const specialtyMeta = {
    infantry: {
      title: "BỘ BINH THIẾT GIÁP",
      detail: "Đất thường bổ sung bộ binh giữ tuyến.",
      art: <EuropeanInfantryArt color={playerColor} />,
      owned: town.infantryCount || 0,
    },
    cavalry: {
      title: "KỊ SĨ THIẾT GIÁP",
      detail: "Bãi ngựa bổ sung kị binh cơ động.",
      art: <EuropeanCavalryArt color={playerColor} />,
      owned: town.cavalryCount || 0,
    },
    artillery: {
      title: "PHÁO BINH DÃ CHIẾN",
      detail: "Xưởng rèn bổ sung pháo binh công thành.",
      art: <EuropeanArtilleryArt color={playerColor} />,
      owned: town.artilleryCount || 0,
    },
  }[specialty];
  const totalTroops = Math.max(0, Number(town.infantryCount || 0) + Number(town.cavalryCount || 0) + Number(town.artilleryCount || 0));
  const reservedTroops = Math.max(0, Number(town.reservedTroops || 0));
  const troopCapacity = Math.max(1, Number(town.troopCapacity ?? town.maxTroops ?? maxDefending));
  const recoveryCost = town.recoveryCost || (specialty === "infantry"
    ? { gold: config.infantryCostGold, wood: config.infantryCostWood, food: extraCosts.infantry.food }
    : specialty === "cavalry"
      ? { gold: config.cavalryCostGold, wood: config.cavalryCostWood, food: extraCosts.cavalry.food }
      : { gold: config.artilleryCostGold, stone: config.artilleryCostStone });
  const secondsLeft = town.nextTroopRecoveryAt
    ? Math.max(0, Math.ceil((new Date(town.nextTroopRecoveryAt).getTime() - Date.now()) / 1000))
    : Math.max(0, town.troopRecoverySeconds || config.troopRecoverySeconds || 600);
  const recoveryClock = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const blockedLabels: Record<string, string> = {
    full: "ĐÃ ĐẦY SỨC CHỨA",
    resources: "THIẾU TÀI NGUYÊN",
    battle: "TẠM DỪNG KHI GIAO TRANH",
    isolated: "PHÁO ĐÀI ĐANG BỊ CÔ LẬP",
  };
  const blockedText = blockedLabels[town.troopRecoveryBlockedReason || ""] || `BỔ SUNG SAU ${recoveryClock}`;
  const costLabels: Record<string, string> = {
    gold: "Vàng", wood: "Gỗ", stone: "Đá", food: "Lương", gems: "Ngọc",
  };

  return (
    <div className="ob-modal-overlay town-modal-overlay" onClick={onClose}>
      <div className="ob-modal-container town-modal" onClick={(e) => e.stopPropagation()}>
        {/* Sleek Gold Filigree Close Button */}
        <button type="button" className="town-close-btn" onClick={onClose} aria-label="Đóng quản lý">
          ✕
        </button>

        {/* Epic Top Heraldic Crest */}
        <div className="town-modal-crest" aria-hidden="true">
          <div className="crest-lion-badge">
            <svg viewBox="0 0 60 60" className="crest-svg">
              <path d="M 30,4 L 52,14 C 52,40 30,56 30,56 C 30,56 8,40 8,14 Z" fill="#0f172a" stroke="#ca8a04" strokeWidth="3" />
              <path d="M 30,8 L 48,16 C 48,37 30,51 30,51 C 30,51 12,37 12,16 Z" fill="#1e3a8a" />
              {/* Lion Heraldry Emblem */}
              <path d="M 25,20 C 25,16 35,16 35,20 C 35,24 28,24 28,28 L 36,28 L 36,36 L 24,36 L 24,42 L 36,42" stroke="#fef08a" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="30" cy="18" r="2.5" fill="#fef08a" />
            </svg>
          </div>
        </div>

        <div className="ob-modal-header town-modal-header">
          <h2 className="ob-modal-title town-title">QUẢN LÝ THÀNH TRÌ #{town.id}</h2>
          <p className="ob-modal-subtitle town-subtitle">TRỰC THUỘC LÃNH THỔ CỦA BẠN</p>
        </div>

        <div className="town-divider" />

        {/* Top 4 Stat Cards Grid */}
        <div className="town-stats-grid">
          <div className="town-stat-card">
            <div className="stat-icon-wrapper"><IconCastle /></div>
            <div className="stat-info">
              <span className="stat-label">CẤP ĐỘ / DÂN SỐ</span>
              <div className="stat-val-row">
                <span className="stat-val text-gold">Lv. {town.lvl}</span>
                <span className="stat-val-inline">
                  {Math.floor(population)} / {Math.floor(town.populationCapacity || population)} dân
                  {(town.populationPerSecond || 0) > 0 ? ` · +${((town.populationPerSecond || 0) * 3600).toFixed(0)}/giờ` : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="town-stat-card">
            <div className="stat-icon-wrapper"><IconShield /></div>
            <div className="stat-info">
              <span className="stat-label">SỨC CHỨA QUÂN LÃNH THỔ</span>
              <span className="stat-val">{totalTroops + reservedTroops} / {troopCapacity} quân</span>
              <span className="stat-subline">Đồn trú {totalTroops} · hành quân {reservedTroops}{town.kind === "capital" ? " · Hoàng Thành x2 dân số" : ""}</span>
            </div>
          </div>

          <div className="town-stat-card">
            <div className="stat-icon-wrapper"><IconBanner /></div>
            <div className="stat-info">
              <span className="stat-label">ĐẶC BIỆT LÃNH THỔ</span>
              <span className="stat-val text-gold">{specialText}</span>
            </div>
          </div>

          <div className="town-stat-card">
            <div className="stat-icon-wrapper"><IconCrate /></div>
            <div className="stat-info">
              <span className="stat-label">KHO TÀI NGUYÊN</span>
              <span className="stat-val">{Math.floor(storedTotal)} / {storageCap} tài nguyên</span>
              {storageRows.map((row) => (
                <span className="stat-subline" key={row}>{row}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="recruitment-section">
          <div className="section-header-line">
            <span className="star-left">✢</span>
            <h3 className="section-title">BỔ SUNG QUÂN TỰ ĐỘNG</h3>
            <span className="line-fill" />
            <span className="star-right">✢</span>
          </div>
          <div className={`recruit-option auto-recovery-option ${town.troopRecoveryBlockedReason ? "is-blocked" : ""}`}>
            <div className="unit-art-box">{specialtyMeta.art}</div>
            <div className="option-info">
              <span className="option-name">{specialtyMeta.title}</span>
              <span className="option-desc">{specialtyMeta.detail}</span>
              <div className="cost-row">
                {(Object.entries(recoveryCost) as Array<[keyof ResourceBag, number]>).filter(([, value]) => value > 0).map(([key, value]) => (
                  <ResourceCost key={key} label={costLabels[key]} value={value} enough={(resources[key] || 0) >= value} />
                ))}
              </div>
            </div>
            <div className="recruit-action-col auto-recovery-status">
              <strong>{blockedText}</strong>
              <span className="owned-count">Loại quân: {specialtyMeta.owned}</span>
              <span className="owned-count">Sức chứa: {totalTroops + reservedTroops}/{troopCapacity}</span>
            </div>
          </div>
          <p className="auto-recovery-note">Máy chủ tự bổ sung 1 quân mỗi {Math.max(1, Math.round((town.troopRecoverySeconds || config.troopRecoverySeconds || 600) / 60))} phút và tự trừ tài nguyên. Dân số là sức chứa quân, không bị tiêu hao.</p>
        </div>

        <div className="ob-modal-actions town-modal-actions">
          <button type="button" className="ob-action-btn secondary town-footer-btn" onClick={onClose}>
            ĐÓNG QUẢN LÝ
          </button>
        </div>
      </div>
    </div>
  );
}
