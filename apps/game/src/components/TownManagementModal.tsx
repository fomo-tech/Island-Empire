import React from "react";
import { ResourceBag } from "@island/shared";

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
  };
  resources: ResourceBag;
  gameConfig?: any;
  specialResources?: string[];
  onTrainInfantry: () => void;
  onTrainCavalry: () => void;
  onTrainArtillery: () => void;
  onUpgradeTown: () => void;
  onClose: () => void;
}

const UPGRADE_COST = { wood: 160, stone: 120 };
const UNIT_EXTRA_COSTS = {
  infantry: { food: 55 },
  cavalry: { food: 90, iron: 12 },
  artillery: { iron: 85, sulfur: 25 },
};

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
    Sắt: "iron",
    "Lưu huỳnh": "sulfur",
  };
  return (
    <span className={`cost-pill ${enough ? "" : "insufficient"}`}>
      <span className={`res-dot res-dot-${dotClass[label] || "gold"}`} />
      {value} {label}
    </span>
  );
}

/* High-Definition Stylized Circular Gold Ring Badge Artwork with Waving War Flag Banner in Background matching User Photo 1 */
function InfantryArt() {
  return (
    <svg viewBox="0 0 100 100" className="unit-art-svg">
      <defs>
        <radialGradient id="circleDarkBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="80%" stopColor="#0b1422" />
          <stop offset="100%" stopColor="#040810" />
        </radialGradient>
        <linearGradient id="goldRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff099" />
          <stop offset="40%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <linearGradient id="knightSteelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="royalFlagRed" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="royalBlueShieldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      {/* 1. Dark Inner Disc & Gold Outer Ring */}
      <circle cx="50" cy="50" r="41" fill="url(#circleDarkBg)" stroke="url(#goldRingGrad)" strokeWidth="3" />
      <circle cx="50" cy="50" r="37.5" fill="none" stroke="rgba(254,240,138,0.4)" strokeWidth="1.2" />

      {/* 2. CỜ PHÍA SAU (Waving Royal Red War Flag Banner in Background) */}
      <g className="bg-flag">
        {/* Wooden Flag Pole */}
        <rect x="24" y="8" width="3.5" height="82" fill="url(#goldRingGrad)" rx="1" />
        <polygon points="25.75,2 30.5,14 21,14" fill="#f8fafc" stroke="url(#goldRingGrad)" strokeWidth="0.8" />
        
        {/* Waving Red Silk Banner */}
        <path d="M 27.5,14 Q 48,8 68,16 Q 84,24 64,28 Q 44,32 27.5,28 Z" fill="url(#royalFlagRed)" stroke="url(#goldRingGrad)" strokeWidth="1" />
        {/* Flag Gold Emblem Cross */}
        <polygon points="46,16 50,16 50,26 46,26" fill="url(#goldRingGrad)" />
        <polygon points="42,20 54,20 54,23 42,23" fill="url(#goldRingGrad)" />
      </g>

      {/* 3. FOREGROUND KNIGHT SPRITE */}
      {/* Armor Torso & Pauldrons */}
      <path d="M 38,44 L 62,44 L 66,75 L 34,75 Z" fill="url(#knightSteelGrad)" stroke="#cbd5e1" strokeWidth="1" />
      <circle cx="36" cy="46" r="7.5" fill="url(#knightSteelGrad)" stroke="url(#goldRingGrad)" strokeWidth="1" />
      <circle cx="64" cy="46" r="7.5" fill="url(#knightSteelGrad)" stroke="url(#goldRingGrad)" strokeWidth="1" />

      {/* Great Helm */}
      <rect x="41" y="24" width="18" height="20" rx="4" fill="url(#knightSteelGrad)" stroke="url(#goldRingGrad)" strokeWidth="1.5" />
      <rect x="43" y="31" width="14" height="3" fill="#020617" />
      <rect x="49" y="34" width="2.5" height="7" fill="#020617" />

      {/* Royal Blue Shield with Gold Cross on Right */}
      <path d="M 54,46 L 78,46 C 78,46 80,72 66,84 C 52,72 54,46 54,46 Z" fill="url(#royalBlueShieldGrad)" stroke="url(#goldRingGrad)" strokeWidth="2" />
      <rect x="63" y="50" width="6" height="26" fill="url(#goldRingGrad)" />
      <rect x="56" y="60" width="20" height="6" fill="url(#goldRingGrad)" />
    </svg>
  );
}

function CavalryArt() {
  return (
    <svg viewBox="0 0 100 100" className="unit-art-svg">
      <defs>
        <radialGradient id="circleDarkBgCavalry" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="80%" stopColor="#0b1422" />
          <stop offset="100%" stopColor="#040810" />
        </radialGradient>
        <linearGradient id="goldLanceGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff099" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <linearGradient id="flagBlueGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="horseBrownGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
      </defs>

      {/* 1. Dark Inner Disc & Gold Outer Ring */}
      <circle cx="50" cy="50" r="41" fill="url(#circleDarkBgCavalry)" stroke="url(#goldLanceGrad)" strokeWidth="3" />
      <circle cx="50" cy="50" r="37.5" fill="none" stroke="rgba(254,240,138,0.4)" strokeWidth="1.2" />

      {/* 2. CỜ PHÍA SAU (Waving Royal Blue Cavalry Flag Banner in Background) */}
      <g className="bg-flag">
        <rect x="22" y="10" width="3" height="78" fill="url(#goldLanceGrad)" rx="1" />
        <path d="M 25,16 Q 44,10 64,18 Q 80,26 60,30 Q 40,34 25,28 Z" fill="url(#flagBlueGrad)" stroke="url(#goldLanceGrad)" strokeWidth="1" />
        <circle cx="44" cy="22" r="4" fill="url(#goldLanceGrad)" />
      </g>

      {/* 3. FOREGROUND CAVALRY SPRITE */}
      {/* Horse Body */}
      <path d="M 18,62 Q 28,36 54,44 Q 76,40 86,58 Q 68,82 43,76 Z" fill="url(#horseBrownGrad)" stroke="#78350f" strokeWidth="1" />
      {/* Horse Head & Neck */}
      <path d="M 43,46 Q 34,22 20,28 Q 12,35 24,50 Z" fill="url(#horseBrownGrad)" />
      {/* Horse Mane */}
      <path d="M 34,22 Q 38,34 42,44" stroke="#1c1917" strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* Blue Saddle Barding */}
      <path d="M 36,54 Q 53,50 70,56 Q 66,74 40,72 Z" fill="#1d4ed8" stroke="url(#goldLanceGrad)" strokeWidth="1.5" />

      {/* Knight Rider */}
      <circle cx="52" cy="32" r="7.5" fill="#64748b" stroke="url(#goldLanceGrad)" strokeWidth="1" />
      <path d="M 44,39 L 60,39 L 62,55 L 42,55 Z" fill="#475569" />

      {/* Long Tilted Lance Spear extending across and past the Gold Ring! */}
      <line x1="8" y1="58" x2="94" y2="16" stroke="url(#goldLanceGrad)" strokeWidth="4" strokeLinecap="round" />
      <polygon points="94,16 99,13 96,20" fill="#f8fafc" />
    </svg>
  );
}

function ArtilleryArt() {
  return (
    <svg viewBox="0 0 100 100" className="unit-art-svg">
      <defs>
        <radialGradient id="circleDarkBgArtillery" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="80%" stopColor="#0b1422" />
          <stop offset="100%" stopColor="#040810" />
        </radialGradient>
        <linearGradient id="bronzeCannonGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff099" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        <linearGradient id="flagGoldGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>

      {/* 1. Dark Inner Disc & Gold Outer Ring */}
      <circle cx="50" cy="50" r="41" fill="url(#circleDarkBgArtillery)" stroke="url(#bronzeCannonGrad)" strokeWidth="3" />
      <circle cx="50" cy="50" r="37.5" fill="none" stroke="rgba(254,240,138,0.4)" strokeWidth="1.2" />

      {/* 2. CỜ PHÍA SAU (Waving Crimson Siege Guild Flag Banner in Background) */}
      <g className="bg-flag">
        <rect x="68" y="10" width="3" height="78" fill="url(#bronzeCannonGrad)" rx="1" />
        <path d="M 68,16 Q 48,10 28,18 Q 12,26 32,30 Q 52,34 68,28 Z" fill="url(#flagGoldGrad)" stroke="url(#bronzeCannonGrad)" strokeWidth="1" />
        <polygon points="46,18 52,24 46,30" fill="#fff099" />
      </g>

      {/* 3. FOREGROUND ARTILLERY CANNON SPRITE */}
      <rect x="22" y="60" width="56" height="13" rx="3" fill="#78350f" stroke="#451a03" strokeWidth="1.5" />

      {/* Cannon Barrel tilted at 16 degrees */}
      <g transform="rotate(-16, 50, 48)">
        <rect x="18" y="38" width="8" height="22" rx="2" fill="url(#bronzeCannonGrad)" stroke="#fef08a" strokeWidth="1" />
        <polygon points="24,40 78,44 78,54 24,58" fill="url(#bronzeCannonGrad)" stroke="#fef08a" strokeWidth="1" />
        <rect x="62" y="42" width="6" height="14" fill="url(#bronzeCannonGrad)" stroke="#fef08a" strokeWidth="0.8" />
        <rect x="74" y="41" width="8" height="16" rx="2" fill="url(#bronzeCannonGrad)" />
        <circle cx="84" cy="49" r="5" fill="url(#bronzeCannonGrad)" />
      </g>

      {/* Spoked Iron Wheel with Gold Hub */}
      <circle cx="48" cy="68" r="18" fill="#334155" stroke="url(#bronzeCannonGrad)" strokeWidth="2.2" />
      <circle cx="48" cy="68" r="13" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
      <circle cx="48" cy="68" r="4.5" fill="url(#bronzeCannonGrad)" />
      <line x1="48" y1="50" x2="48" y2="86" stroke="#f8fafc" strokeWidth="2" />
      <line x1="30" y1="68" x2="66" y2="68" stroke="#f8fafc" strokeWidth="2" />
      <line x1="35" y1="55" x2="61" y2="81" stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1="35" y1="81" x2="61" y2="55" stroke="#cbd5e1" strokeWidth="1.5" />
    </svg>
  );
}

function CastleUpgradeArt() {
  return (
    <svg viewBox="0 0 100 100" className="unit-art-svg">
      <defs>
        <radialGradient id="circleDarkBgCastle" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="80%" stopColor="#0b1422" />
          <stop offset="100%" stopColor="#040810" />
        </radialGradient>
        <linearGradient id="castleGoldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff099" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <linearGradient id="castleStoneGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* 1. Dark Inner Disc & Gold Outer Ring */}
      <circle cx="50" cy="50" r="41" fill="url(#circleDarkBgCastle)" stroke="url(#castleGoldGrad)" strokeWidth="3" />
      <circle cx="50" cy="50" r="37.5" fill="none" stroke="rgba(254,240,138,0.4)" strokeWidth="1.2" />

      {/* 2. CỜ PHÍA SAU (Twin Waving Imperial Royal Banners in Background) */}
      <g className="bg-flag">
        <line x1="28" y1="12" x2="28" y2="44" stroke="url(#castleGoldGrad)" strokeWidth="2" />
        <polygon points="28,14 42,19 28,24" fill="#ef4444" stroke="url(#castleGoldGrad)" strokeWidth="0.8" />
        <line x1="72" y1="12" x2="72" y2="44" stroke="url(#castleGoldGrad)" strokeWidth="2" />
        <polygon points="72,14 86,19 72,24" fill="#ef4444" stroke="url(#castleGoldGrad)" strokeWidth="0.8" />
      </g>

      {/* 3. FOREGROUND FORTRESS KEEP */}
      <rect x="30" y="44" width="40" height="36" fill="url(#castleStoneGrad)" stroke="#f8fafc" strokeWidth="1" />
      <path d="M 42,80 L 42,62 Q 50,55 58,62 L 58,80 Z" fill="#020617" stroke="url(#castleGoldGrad)" strokeWidth="1.5" />
      <line x1="50" y1="57" x2="50" y2="80" stroke="url(#castleGoldGrad)" strokeWidth="1" />

      <rect x="20" y="32" width="18" height="48" fill="url(#castleStoneGrad)" stroke="#f8fafc" strokeWidth="1" />
      <polygon points="17,32 29,14 41,32" fill="#ef4444" stroke="url(#castleGoldGrad)" strokeWidth="1" />

      <rect x="62" y="32" width="18" height="48" fill="url(#castleStoneGrad)" stroke="#f8fafc" strokeWidth="1" />
      <polygon points="59,32 71,14 83,32" fill="#ef4444" stroke="url(#castleGoldGrad)" strokeWidth="1" />
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
  onTrainInfantry,
  onTrainCavalry,
  onTrainArtillery,
  onUpgradeTown,
  onClose
}: TownManagementModalProps) {
  const config = gameConfig || {
    infantryCostGold: 100,
    infantryCostWood: 30,
    infantryTroopsValue: 15,
    cavalryCostGold: 170,
    cavalryCostWood: 40,
    cavalryCostStone: 45,
    cavalryTroopsValue: 40,
    artilleryCostGold: 240,
    artilleryCostStone: 120,
    artilleryTroopsValue: 80,
  };

  const population = Math.max(0, Math.floor(town.population || 32));
  const maxDefending = population * 10;
  const buildings = town.buildings || {};
  const hasHorsePasture = specialResources.includes("Bãi ngựa");
  const hasSiegeWorkshop = (buildings.siegeWorkshop || 0) > 0;
  const warehouseLevel = buildings.warehouse || 0;
  const storageCap = 250 + warehouseLevel * 650 + (buildings.fort || 0) * 180 + (town.lvl || 1) * 120;
  const storedTotal = Object.values(town.storage || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const specialText = specialResources.length ? specialResources.join(" · ") : "Chưa có";

  const infantryPop = populationCost(config.infantryTroopsValue);
  const cavalryPop = populationCost(config.cavalryTroopsValue);
  const artilleryPop = populationCost(config.artilleryTroopsValue);

  // Derived troop counts for ownership labels matching Screenshot 2 ("Sở hữu: 62")
  const totalTroops = town.troops || 0;
  const infantryOwned = (town as any).infantryCount ?? (totalTroops > 0 ? Math.max(1, Math.round(totalTroops * 0.65)) : 0);
  const cavalryOwned = (town as any).cavalryCount ?? (totalTroops > 0 ? Math.round(totalTroops * 0.25) : 0);
  const artilleryOwned = (town as any).artilleryCount ?? (totalTroops > 0 ? Math.round(totalTroops * 0.10) : 0);

  const canAffordInfantry =
    resources.gold >= config.infantryCostGold &&
    resources.wood >= config.infantryCostWood &&
    resources.food >= UNIT_EXTRA_COSTS.infantry.food;
  const canTrainInfantry =
    canAffordInfantry && population >= infantryPop && town.troops + config.infantryTroopsValue <= maxDefending;

  const canAffordCavalry =
    resources.gold >= config.cavalryCostGold &&
    resources.wood >= config.cavalryCostWood &&
    resources.stone >= config.cavalryCostStone &&
    resources.food >= UNIT_EXTRA_COSTS.cavalry.food &&
    resources.iron >= UNIT_EXTRA_COSTS.cavalry.iron;
  const canTrainCavalry =
    hasHorsePasture &&
    canAffordCavalry &&
    population >= cavalryPop &&
    town.troops + config.cavalryTroopsValue <= maxDefending;

  const canAffordArtillery =
    resources.gold >= config.artilleryCostGold &&
    resources.stone >= config.artilleryCostStone &&
    resources.iron >= UNIT_EXTRA_COSTS.artillery.iron &&
    resources.sulfur >= UNIT_EXTRA_COSTS.artillery.sulfur;
  const canTrainArtillery =
    hasSiegeWorkshop &&
    canAffordArtillery &&
    population >= artilleryPop &&
    town.troops + config.artilleryTroopsValue <= maxDefending;

  const canAffordUpgrade = resources.wood >= UPGRADE_COST.wood && resources.stone >= UPGRADE_COST.stone;

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
                <span className="stat-val-inline">{population} dân</span>
              </div>
            </div>
          </div>

          <div className="town-stat-card">
            <div className="stat-icon-wrapper"><IconShield /></div>
            <div className="stat-info">
              <span className="stat-label">QUÂN ĐỒN TRÚ / TỐI ĐA</span>
              <span className="stat-val">{town.troops} / {maxDefending} sĩ</span>
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
            </div>
          </div>
        </div>

        <div className="recruitment-section">
          <div className="section-header-line">
            <span className="star-left">✢</span>
            <h3 className="section-title">CHIÊU MỘ BINH SĨ</h3>
            <span className="line-fill" />
            <span className="star-right">✢</span>
          </div>

          {/* Row 1: Infantry */}
          <div className="recruit-option">
            <div className="unit-art-box"><InfantryArt /></div>
            <div className="option-info">
              <span className="option-name">BỘ BINH (INFANTRY)</span>
              <span className="option-desc">Tăng cường tấn công phòng thủ/cận công</span>
              <div className="cost-row">
                <ResourceCost label="Vàng" value={config.infantryCostGold} enough={resources.gold >= config.infantryCostGold} />
                <ResourceCost label="Gỗ" value={config.infantryCostWood} enough={resources.wood >= config.infantryCostWood} />
                <ResourceCost label="Lương" value={UNIT_EXTRA_COSTS.infantry.food} enough={resources.food >= UNIT_EXTRA_COSTS.infantry.food} />
              </div>
            </div>
            <div className="recruit-action-col">
              <button type="button" className="recruit-btn primary-action" disabled={!canTrainInfantry} onClick={onTrainInfantry}>
                MỘ BINH
              </button>
              <span className="owned-count">Sở hữu: {infantryOwned}</span>
            </div>
          </div>

          {/* Row 2: Cavalry */}
          <div className="recruit-option">
            <div className="unit-art-box"><CavalryArt /></div>
            <div className="option-info">
              <span className="option-name">KỊ BINH (CAVALRY)</span>
              <span className="option-desc">{hasHorsePasture ? "Cận chiến tốc độ cao, hiệu quả để huấn luyện" : "Cần lãnh thổ có Bãi ngựa để huấn luyện."}</span>
              <div className="cost-row">
                <ResourceCost label="Vàng" value={config.cavalryCostGold} enough={resources.gold >= config.cavalryCostGold} />
                <ResourceCost label="Gỗ" value={config.cavalryCostWood} enough={resources.wood >= config.cavalryCostWood} />
                <ResourceCost label="Đá" value={config.cavalryCostStone} enough={resources.stone >= config.cavalryCostStone} />
                <ResourceCost label="Lương" value={UNIT_EXTRA_COSTS.cavalry.food} enough={resources.food >= UNIT_EXTRA_COSTS.cavalry.food} />
                <ResourceCost label="Sắt" value={UNIT_EXTRA_COSTS.cavalry.iron} enough={resources.iron >= UNIT_EXTRA_COSTS.cavalry.iron} />
              </div>
            </div>
            <div className="recruit-action-col">
              <button type="button" className="recruit-btn primary-action" disabled={!canTrainCavalry} onClick={onTrainCavalry}>
                MỘ KỊ BINH
              </button>
              <span className="owned-count">Sở hữu: {cavalryOwned}</span>
            </div>
          </div>

          {/* Row 3: Artillery */}
          <div className="recruit-option">
            <div className="unit-art-box"><ArtilleryArt /></div>
            <div className="option-info">
              <span className="option-name">PHÁO BINH (ARTILLERY)</span>
              <span className="option-desc">{hasSiegeWorkshop ? "Càn quét tường thành xa trước" : "Cần xây Xưởng chiến xa trước"}</span>
              <div className="cost-row">
                <ResourceCost label="Vàng" value={config.artilleryCostGold} enough={resources.gold >= config.artilleryCostGold} />
                <ResourceCost label="Đá" value={config.artilleryCostStone} enough={resources.stone >= config.artilleryCostStone} />
                <ResourceCost label="Sắt" value={UNIT_EXTRA_COSTS.artillery.iron} enough={resources.iron >= UNIT_EXTRA_COSTS.artillery.iron} />
                <ResourceCost label="Lưu huỳnh" value={UNIT_EXTRA_COSTS.artillery.sulfur} enough={resources.sulfur >= UNIT_EXTRA_COSTS.artillery.sulfur} />
              </div>
            </div>
            <div className="recruit-action-col">
              <button type="button" className="recruit-btn primary-action" disabled={!canTrainArtillery} onClick={onTrainArtillery}>
                MỘ PHÁO BINH
              </button>
              <span className="owned-count">Sở hữu: {artilleryOwned}</span>
            </div>
          </div>

          <div className="section-header-line margin-top-line">
            <span className="star-left">✢</span>
            <h3 className="section-title">NÂNG CẤP KIẾN TRÚC</h3>
            <span className="line-fill" />
            <span className="star-right">✢</span>
          </div>

          {/* Row 4: Castle Upgrade */}
          <div className="recruit-option upgrade-row">
            <div className="unit-art-box"><CastleUpgradeArt /></div>
            <div className="option-info">
              <span className="option-name">NÂNG CẤP LÂU ĐÀI</span>
              <span className="option-desc">Gia cố thành lũy vững chắc ( +1 cấp, +12 lính )</span>
              <div className="cost-row">
                <ResourceCost label="Gỗ" value={UPGRADE_COST.wood} enough={resources.wood >= UPGRADE_COST.wood} />
                <ResourceCost label="Đá" value={UPGRADE_COST.stone} enough={resources.stone >= UPGRADE_COST.stone} />
              </div>
            </div>
            <div className="recruit-action-col">
              <button type="button" className="recruit-btn upgrade-action" disabled={!canAffordUpgrade} onClick={onUpgradeTown}>
                NÂNG CẤP
              </button>
            </div>
          </div>
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
