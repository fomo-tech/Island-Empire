import React, { useEffect, useMemo, useState } from "react";
import type { MarchSourceOption } from "@island/shared";
import { AssetIcon } from "./AssetIcon";
import { kingdomBuildingSpriteStyle } from "../game/kingdomArchitecture";

// Premium Vector SVGs
const SwordsIcon = () => {
  return <AssetIcon asset="army" size={20} />;
  return (
    <svg
      viewBox="0 0 64 64"
      width="20"
      height="20"
      style={{ verticalAlign: "middle" }}
    >
      <path
        d="M48 8l8 8-36 36-4 4-4-4 4-36z"
        fill="#cbd5e1"
        stroke="#475569"
        strokeWidth="2"
      />
      <path
        d="M12 48l-4 8 8-4z"
        fill="#f59e0b"
        stroke="#78350f"
        strokeWidth="2"
      />
      <path
        d="M16 8l-8 8 36 36 4 4 4-4-4-36z"
        fill="#cbd5e1"
        stroke="#475569"
        strokeWidth="2"
      />
      <circle cx="32" cy="24" r="5" fill="#fef08a" opacity="0.9" />
    </svg>
  );
};

const ShieldIcon = () => {
  return <AssetIcon asset="defender" size={16} />;
  return (
    <svg viewBox="0 0 64 64" width="16" height="16">
      <path
        d="M32 6C18 10 12 18 12 32c0 14 12 22 20 26 8-4 20-12 20-26 0-14-6-22-20-26z"
        fill="#2563eb"
        stroke="#1d4ed8"
        strokeWidth="2"
      />
      <path d="M32 10v42c6-3 14-9 14-20 0-10-4-16-14-22z" fill="#60a5fa" />
    </svg>
  );
};

const MapPinIcon = () => {
  return <AssetIcon asset="map" size={14} style={{ color: "#f59e0b" }} />;
  return (
    <svg
      viewBox="0 0 64 64"
      width="14"
      height="14"
      style={{ color: "#f59e0b" }}
    >
      <path
        d="M32 6C20 6 12 14 12 26c0 14 20 32 20 32s20-18 20-32c0-12-8-20-20-20z"
        fill="#f59e0b"
        stroke="#78350f"
        strokeWidth="1.5"
      />
      <circle cx="32" cy="24" r="8" fill="#ffffff" />
    </svg>
  );
};

const EyeIcon = () => {
  return <AssetIcon asset="info" size={14} />;
  return (
    <svg viewBox="0 0 64 64" width="14" height="14">
      <path
        d="M8 32s10-18 24-18 24 18 24 18-10 18-24 18S8 32 8 32z"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="3"
      />
      <circle cx="32" cy="32" r="8" fill="#38bdf8" />
    </svg>
  );
};

const FlagIcon = () => {
  return <AssetIcon asset="crown" size={14} />;
  return (
    <svg viewBox="0 0 64 64" width="14" height="14">
      <path
        d="M12 8v48M12 12h32l-8 12 8 12H12"
        stroke="#38bdf8"
        strokeWidth="3"
        fill="#0284c7"
      />
    </svg>
  );
};

const HourglassIcon = () => {
  return <AssetIcon asset="settingsInfo" size={16} />;
  return (
    <svg viewBox="0 0 64 64" width="16" height="16">
      <path
        d="M14 10h36v6c0 10-10 14-16 16 6 2 16 6 16 16v6H14v-6c0-10 10-14 16-16-6-2-16-6-16-16z"
        fill="#e2e8f0"
        stroke="#475569"
        strokeWidth="2.5"
      />
      <path
        d="M20 14h24v2L32 28 20 16zm0 34h24v-2L32 34 20 46z"
        fill="#f59e0b"
      />
    </svg>
  );
};

// 6 Overview Stat Vector SVGs (Zero Emojis)
const HelmetIconSVG = () => {
  return (
    <AssetIcon
      asset="troopTotal"
      size={16}
      style={{ marginRight: 4, verticalAlign: "middle" }}
    />
  );
  return (
    <svg
      viewBox="0 0 64 64"
      width="16"
      height="16"
      style={{ marginRight: 4, verticalAlign: "middle" }}
    >
      <path
        d="M32 8C18 8 12 18 12 32v16h8v8h24v-8h8V32c0-14-6-24-20-24z"
        fill="#d97706"
        stroke="#78350f"
        strokeWidth="2"
      />
      <rect x="20" y="28" width="24" height="4" rx="1" fill="#fef08a" />
      <rect x="30" y="32" width="4" height="10" rx="1" fill="#fef08a" />
    </svg>
  );
};

const CrossedSwordsSVG = () => {
  return (
    <AssetIcon
      asset="army"
      size={16}
      style={{ marginRight: 4, verticalAlign: "middle" }}
    />
  );
  return (
    <svg
      viewBox="0 0 64 64"
      width="16"
      height="16"
      style={{ marginRight: 4, verticalAlign: "middle" }}
    >
      <path
        d="M48 8l8 8-36 36-4 4-4-4 4-36z"
        fill="#f59e0b"
        stroke="#78350f"
        strokeWidth="2"
      />
      <path
        d="M16 8l-8 8 36 36 4 4 4-4-4-36z"
        fill="#f59e0b"
        stroke="#78350f"
        strokeWidth="2"
      />
      <circle cx="32" cy="24" r="5" fill="#fef08a" />
    </svg>
  );
};

const ShieldIconSVG = () => {
  return (
    <AssetIcon
      asset="defender"
      size={16}
      style={{ marginRight: 4, verticalAlign: "middle" }}
    />
  );
  return (
    <svg
      viewBox="0 0 64 64"
      width="16"
      height="16"
      style={{ marginRight: 4, verticalAlign: "middle" }}
    >
      <path
        d="M32 6C18 10 12 18 12 32c0 14 12 22 20 26 8-4 20-12 20-26 0-14-6-22-20-26z"
        fill="#d97706"
        stroke="#78350f"
        strokeWidth="2"
      />
      <path
        d="M32 10v42c6-3 14-9 14-20 0-10-4-16-14-22z"
        fill="#fef08a"
        opacity="0.6"
      />
      <rect x="30" y="16" width="4" height="28" fill="#78350f" />
      <rect x="18" y="28" width="28" height="4" fill="#78350f" />
    </svg>
  );
};

const HorseHeadSVG = () => {
  return (
    <AssetIcon
      asset="troopCavalry"
      size={16}
      style={{ marginRight: 4, verticalAlign: "middle" }}
    />
  );
  return (
    <svg
      viewBox="0 0 64 64"
      width="16"
      height="16"
      style={{ marginRight: 4, verticalAlign: "middle" }}
    >
      <path
        d="M16 48c0-16 12-28 28-28l8-12h-8c-12 0-20 8-24 16l-4 24z"
        fill="#d97706"
        stroke="#78350f"
        strokeWidth="2"
      />
    </svg>
  );
};

const TargetIconSVG = () => {
  return (
    <AssetIcon
      asset="army"
      size={16}
      style={{ marginRight: 4, verticalAlign: "middle" }}
    />
  );
  return (
    <svg
      viewBox="0 0 64 64"
      width="16"
      height="16"
      style={{ marginRight: 4, verticalAlign: "middle" }}
    >
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="#ef4444"
        stroke="#991b1b"
        strokeWidth="2"
      />
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="#ffffff"
        stroke="#991b1b"
        strokeWidth="1.5"
      />
      <circle
        cx="32"
        cy="32"
        r="10"
        fill="#ef4444"
        stroke="#991b1b"
        strokeWidth="1.5"
      />
      <circle cx="32" cy="32" r="4" fill="#ffd34d" />
    </svg>
  );
};

const ScalesIconSVG = () => {
  return (
    <AssetIcon
      asset="settingsInfo"
      size={16}
      style={{ marginRight: 4, verticalAlign: "middle" }}
    />
  );
  return (
    <svg
      viewBox="0 0 64 64"
      width="16"
      height="16"
      style={{ marginRight: 4, verticalAlign: "middle" }}
    >
      <path
        d="M32 8v44M16 18h32M16 18l-8 20h16zM48 18l-8 20h16z"
        stroke="#f59e0b"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="24" y="52" width="16" height="4" fill="#d97706" rx="1" />
    </svg>
  );
};

function InfantryAvatar() {
  return (
    <AssetIcon
      asset="troopInfantry"
      size={46}
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}
    />
  );
  return (
    <svg
      viewBox="0 0 100 100"
      width="46"
      height="46"
      style={{
        flexShrink: 0,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
      }}
    >
      <defs>
        <radialGradient id="circleDarkBgModal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="80%" stopColor="#0b1422" />
          <stop offset="100%" stopColor="#040810" />
        </radialGradient>
        <linearGradient id="goldRingGradModal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff099" />
          <stop offset="40%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <linearGradient id="knightSteelGradModal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="royalFlagRedModal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient
          id="royalBlueShieldGradModal"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      <circle
        cx="50"
        cy="50"
        r="41"
        fill="url(#circleDarkBgModal)"
        stroke="url(#goldRingGradModal)"
        strokeWidth="3"
      />
      <circle
        cx="50"
        cy="50"
        r="37.5"
        fill="none"
        stroke="rgba(254,240,138,0.4)"
        strokeWidth="1.2"
      />

      <g className="bg-flag">
        <rect
          x="20"
          y="4"
          width="4"
          height="86"
          fill="url(#goldRingGradModal)"
          rx="1"
        />
        <polygon
          points="22,0 27,10 17,10"
          fill="#f8fafc"
          stroke="url(#goldRingGradModal)"
          strokeWidth="0.8"
        />
        <path
          d="M 22,10 Q 52,4 82,14 Q 92,26 68,32 Q 44,38 22,30 Z"
          fill="url(#royalFlagRedModal)"
          stroke="url(#goldRingGradModal)"
          strokeWidth="1.2"
        />
        {/* Crown emblem on flag */}
        <path
          d="M 40,17 L 45,23 L 50,17 L 55,23 L 60,17 L 58,27 L 42,27 Z"
          fill="#fff7d6"
        />
      </g>

      <path
        d="M 38,44 L 62,44 L 66,75 L 34,75 Z"
        fill="url(#knightSteelGradModal)"
        stroke="#cbd5e1"
        strokeWidth="1"
      />
      <circle
        cx="36"
        cy="46"
        r="7.5"
        fill="url(#knightSteelGradModal)"
        stroke="url(#goldRingGradModal)"
        strokeWidth="1"
      />
      <circle
        cx="64"
        cy="46"
        r="7.5"
        fill="url(#knightSteelGradModal)"
        stroke="url(#goldRingGradModal)"
        strokeWidth="1"
      />

      <rect
        x="41"
        y="24"
        width="18"
        height="20"
        rx="4"
        fill="url(#knightSteelGradModal)"
        stroke="url(#goldRingGradModal)"
        strokeWidth="1.5"
      />
      <rect x="43" y="31" width="14" height="3" fill="#020617" />
      <rect x="49" y="34" width="2.5" height="7" fill="#020617" />

      <path
        d="M 54,46 L 78,46 C 78,46 80,72 66,84 C 52,72 54,46 54,46 Z"
        fill="url(#royalBlueShieldGradModal)"
        stroke="url(#goldRingGradModal)"
        strokeWidth="2"
      />
      <rect
        x="63"
        y="50"
        width="6"
        height="26"
        fill="url(#goldRingGradModal)"
      />
      <rect
        x="56"
        y="60"
        width="20"
        height="6"
        fill="url(#goldRingGradModal)"
      />
    </svg>
  );
}

function CavalryAvatar() {
  return (
    <AssetIcon
      asset="troopCavalry"
      size={46}
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}
    />
  );
  return (
    <svg
      viewBox="0 0 100 100"
      width="46"
      height="46"
      style={{
        flexShrink: 0,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
      }}
    >
      <defs>
        <radialGradient id="circleDarkBgCavalryModal" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="80%" stopColor="#0b1422" />
          <stop offset="100%" stopColor="#040810" />
        </radialGradient>
        <linearGradient id="goldLanceGradModal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff099" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <linearGradient id="flagBlueGradModal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="horseBrownGradModal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
      </defs>

      <circle
        cx="50"
        cy="50"
        r="41"
        fill="url(#circleDarkBgCavalryModal)"
        stroke="url(#goldLanceGradModal)"
        strokeWidth="3"
      />
      <circle
        cx="50"
        cy="50"
        r="37.5"
        fill="none"
        stroke="rgba(254,240,138,0.4)"
        strokeWidth="1.2"
      />

      <g className="bg-flag">
        <rect
          x="18"
          y="4"
          width="4"
          height="86"
          fill="url(#goldLanceGradModal)"
          rx="1"
        />
        <path
          d="M 20,10 Q 50,4 80,14 Q 90,26 66,32 Q 42,38 20,30 Z"
          fill="url(#flagBlueGradModal)"
          stroke="url(#goldLanceGradModal)"
          strokeWidth="1.2"
        />
        {/* Shield emblem on Cavalry flag */}
        <path
          d="M 42,17 L 54,17 L 54,23 Q 54,29 48,32 Q 42,29 42,23 Z"
          fill="#fff7d6"
        />
      </g>

      <path
        d="M 18,62 Q 28,36 54,44 Q 76,40 86,58 Q 68,82 43,76 Z"
        fill="url(#horseBrownGradModal)"
        stroke="#78350f"
        strokeWidth="1"
      />
      <path
        d="M 43,46 Q 34,22 20,28 Q 12,35 24,50 Z"
        fill="url(#horseBrownGradModal)"
      />
      <path
        d="M 34,22 Q 38,34 42,44"
        stroke="#1c1917"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M 36,54 Q 53,50 70,56 Q 66,74 40,72 Z"
        fill="#1d4ed8"
        stroke="url(#goldLanceGradModal)"
        strokeWidth="1.5"
      />

      <circle
        cx="52"
        cy="32"
        r="7.5"
        fill="#64748b"
        stroke="url(#goldLanceGradModal)"
        strokeWidth="1"
      />
      <path d="M 44,39 L 60,39 L 62,55 L 42,55 Z" fill="#475569" />

      <line
        x1="8"
        y1="58"
        x2="94"
        y2="16"
        stroke="url(#goldLanceGradModal)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <polygon points="94,16 99,13 96,20" fill="#f8fafc" />
    </svg>
  );
}

function ArtilleryAvatar() {
  return (
    <AssetIcon
      asset="troopArtillery"
      size={46}
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}
    />
  );
  return (
    <svg
      viewBox="0 0 100 100"
      width="46"
      height="46"
      style={{
        flexShrink: 0,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
      }}
    >
      <defs>
        <radialGradient
          id="circleDarkBgArtilleryModal"
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="80%" stopColor="#0b1422" />
          <stop offset="100%" stopColor="#040810" />
        </radialGradient>
        <linearGradient id="bronzeCannonGradModal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff099" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        <linearGradient id="flagGoldGradModal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>

      <circle
        cx="50"
        cy="50"
        r="41"
        fill="url(#circleDarkBgArtilleryModal)"
        stroke="url(#bronzeCannonGradModal)"
        strokeWidth="3"
      />
      <circle
        cx="50"
        cy="50"
        r="37.5"
        fill="none"
        stroke="rgba(254,240,138,0.4)"
        strokeWidth="1.2"
      />

      <g className="bg-flag">
        <rect
          x="74"
          y="4"
          width="4"
          height="86"
          fill="url(#bronzeCannonGradModal)"
          rx="1"
        />
        <path
          d="M 76,10 Q 46,4 16,14 Q 6,26 30,32 Q 54,38 76,30 Z"
          fill="url(#flagGoldGradModal)"
          stroke="url(#bronzeCannonGradModal)"
          strokeWidth="1.2"
        />
        {/* Star emblem on Artillery flag */}
        <polygon
          points="46,15 49,21 55,21 50,25 52,31 46,27 40,31 42,25 37,21 43,21"
          fill="#fff099"
        />
      </g>

      <rect
        x="22"
        y="60"
        width="56"
        height="13"
        rx="3"
        fill="#78350f"
        stroke="#451a03"
        strokeWidth="1.5"
      />

      <g transform="rotate(-16, 50, 50)">
        <polygon
          points="26,38 78,34 78,54 26,50"
          fill="url(#bronzeCannonGradModal)"
          stroke="#78350f"
          strokeWidth="1.5"
        />
        <ellipse
          cx="26"
          cy="44"
          rx="4"
          ry="7"
          fill="#1c1917"
          stroke="url(#bronzeCannonGradModal)"
          strokeWidth="1.5"
        />
        <rect
          x="74"
          y="32"
          width="6"
          height="24"
          rx="2"
          fill="url(#bronzeCannonGradModal)"
          stroke="#78350f"
          strokeWidth="1"
        />
      </g>

      <circle
        cx="34"
        cy="68"
        r="12"
        fill="url(#bronzeCannonGradModal)"
        stroke="#451a03"
        strokeWidth="2"
      />
      <circle cx="34" cy="68" r="4" fill="#1c1917" />
      <circle
        cx="66"
        cy="68"
        r="12"
        fill="url(#bronzeCannonGradModal)"
        stroke="#451a03"
        strokeWidth="2"
      />
      <circle cx="66" cy="68" r="4" fill="#1c1917" />
    </svg>
  );
}

const CastleThumbnail = ({
  architectureId = "vietnam",
  buildingType = "capital",
}: {
  architectureId?: string;
  buildingType?: "capital" | "district" | "flag";
}) => {
  const nationAtlas: Record<string, string> = {
    vietnam: "/assets/kingdoms/nations/vietnam.webp",
    china: "/assets/kingdoms/nations/china.webp",
    japan: "/assets/kingdoms/nations/japan.webp",
    england: "/assets/kingdoms/nations/gothic.webp",
    ottoman: "/assets/kingdoms/nations/persia.webp",
    rome: "/assets/kingdoms/nations/rome.webp",
  };
  const atlas = nationAtlas[architectureId];
  const spriteStyle = buildingType === "flag"
    ? kingdomBuildingSpriteStyle(architectureId, "flag")
    : atlas
      ? {
        backgroundImage: `url(${atlas})`,
        backgroundSize: "200% 200%",
        // Nation atlases are 2x2: capital (top-left), district (top-right).
        backgroundPosition: buildingType === "district" ? "100% 0%" : "0% 0%",
        backgroundRepeat: "no-repeat",
      }
      : kingdomBuildingSpriteStyle(architectureId, buildingType);
  return (
    <span
      className="town-sprite-thumbnail"
      aria-hidden="true"
      style={{
        ...spriteStyle,
      }}
    />
  );
};

interface TroopDeploymentModalProps {
  sourceTown: {
    id: number;
    lvl: number;
    troops: number;
    x?: number;
    y?: number;
    population?: number;
    infantryCount?: number;
    cavalryCount?: number;
    artilleryCount?: number;
  };
  sourceTowns?: Array<{
    id: number;
    lvl: number;
    troops: number;
    x?: number;
    y?: number;
    population?: number;
    infantryCount?: number;
    cavalryCount?: number;
    artilleryCount?: number;
  }>;
  sourceOptions?: MarchSourceOption[] | null;
  selectedSourceTownId?: number;
  targetTownId: number;
  isAttack: boolean;
  battleSide?: "attacker" | "defender";
  targetBattleActive?: boolean;
  gameConfig?: any;
  architectureId?: string;
  getTownBuildingType?: (town: any) => "capital" | "district" | "flag";
  errorMessage?: string | null;
  getTownRegionId?: (town: any) => number;
  getRegionCenter?: (id: number) => { x: number; y: number } | null;
  getRouteStatus?: (
    town: any,
    targetRegionId: number,
  ) => { ok: boolean; message: string; requiresShip: boolean };
  onSelectSourceTown?: (townId: number) => void;
  onConfirm: (
    infantryCount: number,
    cavalryCount: number,
    artilleryCount: number,
  ) => void;
  onClose: () => void;
}

export function TroopDeploymentModal({
  sourceTown,
  sourceTowns,
  sourceOptions,
  selectedSourceTownId,
  targetTownId,
  isAttack,
  battleSide,
  targetBattleActive = false,
  gameConfig,
  architectureId,
  getTownBuildingType,
  errorMessage,
  getTownRegionId,
  getRegionCenter,
  getRouteStatus,
  onSelectSourceTown,
  onConfirm,
  onClose,
}: TroopDeploymentModalProps) {
  const config = gameConfig || {
    infantryTroopsValue: 18,
    cavalryTroopsValue: 34,
    artilleryTroopsValue: 58,
    infantrySpeed: 24,
    cavalrySpeed: 42,
    artillerySpeed: 14,
    shipSpeed: 12,
    gameHourSeconds: 60,
  };
  const infantryPower = config.infantryTroopsValue || 18;
  const cavalryPower = config.cavalryTroopsValue || 34;
  const artilleryPower = config.artilleryTroopsValue || 58;
  const actionLabel = isAttack
    ? "PHÁT ĐỘNG TẤN CÔNG"
    : battleSide === "attacker"
      ? "TIẾP VIỆN TẤN CÔNG"
      : "TIẾP VIỆN PHÒNG THỦ";
  const hasServerSourceDecision =
    sourceOptions !== undefined && sourceOptions !== null;

  const availableSourceTowns = useMemo(() => {
    const byId = new Map<number, any>();
    [...(sourceTowns || []), sourceTown].forEach((town) => {
      if (town?.id !== undefined && town?.id !== null) byId.set(town.id, town);
    });
    const selected = byId.get(selectedSourceTownId ?? sourceTown.id);
    const optionForTown = (town: any) =>
      sourceOptions?.find(
        (option) =>
          option.townId === town.id ||
          option.territoryId === (getTownRegionId?.(town) ?? -1),
      );
    const top = Array.from(byId.values())
      .sort((a, b) => {
        const optionA = optionForTown(a);
        const optionB = optionForTown(b);
        if (optionA || optionB) {
          return (
            Number(optionB?.valid || false) - Number(optionA?.valid || false) ||
            (optionA?.travelSeconds ?? Infinity) -
              (optionB?.travelSeconds ?? Infinity) ||
            (optionB?.troops ?? 0) - (optionA?.troops ?? 0)
          );
        }
        return (b.troops || 0) - (a.troops || 0);
      })
      .slice(0, 120);
    if (selected && !top.some((town) => town.id === selected.id))
      top.unshift(selected);
    return top;
  }, [
    sourceTowns,
    sourceTown,
    sourceOptions,
    getTownRegionId,
    selectedSourceTownId,
  ]);

  const targetCenter = useMemo(
    () => getRegionCenter?.(targetTownId) || null,
    [getRegionCenter, targetTownId],
  );
  const sourceRegionId = useMemo(
    () => getTownRegionId?.(sourceTown) ?? -1,
    [getTownRegionId, sourceTown],
  );
  const currentSourceOption = useMemo(
    () =>
      sourceOptions?.find(
        (option) =>
          option.townId === sourceTown.id ||
          option.territoryId === sourceRegionId,
      ) || null,
    [sourceOptions, sourceTown.id, sourceRegionId],
  );
  const currentSourceValid =
    !hasServerSourceDecision || Boolean(currentSourceOption?.valid);
  const distanceKm = useMemo(
    () =>
      currentSourceOption?.distanceKm ??
      (targetCenter && sourceTown.x !== undefined && sourceTown.y !== undefined
        ? Math.max(
            1,
            Math.round(
              Math.hypot(
                sourceTown.x - targetCenter.x,
                sourceTown.y - targetCenter.y,
              ) * 0.18,
            ),
          )
        : 2303),
    [currentSourceOption, sourceTown.x, sourceTown.y, targetCenter],
  );

  const townOptions = useMemo(
    () =>
      availableSourceTowns.map((town) => {
        const townUnitCount = Math.max(
          0,
          Math.floor(
            (town.infantryCount ?? town.troops ?? 0) +
              (town.cavalryCount ?? 0) +
              (town.artilleryCount ?? 0),
          ),
        );
        const regionId = getTownRegionId?.(town) ?? -1;
        const option = sourceOptions?.find(
          (item) => item.townId === town.id || item.territoryId === regionId,
        );
        const routeLabel =
          option?.routeType === "sea"
            ? "Đường biển"
            : option?.routeType === "land"
              ? "Đường bộ"
              : hasServerSourceDecision
                ? "Không hợp lệ"
                : "Đang kiểm tra";
        return {
          id: town.id,
          town,
          option,
          unitCount: townUnitCount,
          routeLabel,
          disabled: hasServerSourceDecision ? !option?.valid : false,
          label: `Thành #${town.id} - ${townUnitCount} quân - ${routeLabel}${option ? ` - ${option.travelSeconds}s` : ""}`,
        };
      }),
    [
      availableSourceTowns,
      sourceOptions,
      getTownRegionId,
      hasServerSourceDecision,
    ],
  );
  const hasValidSource =
    !hasServerSourceDecision || townOptions.some((town) => !town.disabled);

  const infantryAvailable = Math.max(
    0,
    currentSourceValid ? Math.floor(
      currentSourceOption?.infantry ??
        sourceTown.infantryCount ??
        sourceTown.troops ??
        0,
    ) : 0,
  );
  const cavalryAvailable = Math.max(
    0,
    currentSourceValid
      ? Math.floor(currentSourceOption?.cavalry ?? sourceTown.cavalryCount ?? 0)
      : 0,
  );
  const artilleryAvailable = Math.max(
    0,
    currentSourceValid ? Math.floor(
      currentSourceOption?.artillery ?? sourceTown.artilleryCount ?? 0,
    ) : 0,
  );
  const totalUnitsAvailable = Math.max(
    0,
    infantryAvailable + cavalryAvailable + artilleryAvailable,
  );
  const maxDeployUnits = totalUnitsAvailable;

  const maxInfantry = infantryAvailable;
  const maxCavalry = cavalryAvailable;
  const maxArtillery = artilleryAvailable;

  const [infantry, setInfantry] = useState(() =>
    Math.min(maxInfantry, Math.max(1, maxInfantry)),
  );
  const [cavalry, setCavalry] = useState(0);
  const [artillery, setArtillery] = useState(0);

  useEffect(() => {
    setInfantry(maxInfantry > 0 ? maxInfantry : 0);
    setCavalry(maxInfantry > 0 ? 0 : maxCavalry);
    setArtillery(maxInfantry > 0 || maxCavalry > 0 ? 0 : maxArtillery);
  }, [sourceTown.id, maxInfantry, maxCavalry, maxArtillery]);

  const currentPowerSent =
    infantry * infantryPower +
    cavalry * cavalryPower +
    artillery * artilleryPower;
  const currentUnitsSent = infantry + cavalry + artillery;
  const unitsRemaining = Math.max(0, totalUnitsAvailable - currentUnitsSent);

  const handleInfantryChange = (val: number) => {
    const cleanVal = Math.max(0, Math.min(maxInfantry, val));
    setInfantry(cleanVal);
  };

  const handleCavalryChange = (val: number) => {
    const cleanVal = Math.max(0, Math.min(maxCavalry, val));
    setCavalry(cleanVal);
  };

  const handleArtilleryChange = (val: number) => {
    const cleanVal = Math.max(0, Math.min(maxArtillery, val));
    setArtillery(cleanVal);
  };

  const applyTroopPreset = (ratio: number) => {
    setInfantry(Math.floor(maxInfantry * ratio));
    setCavalry(Math.floor(maxCavalry * ratio));
    setArtillery(Math.floor(maxArtillery * ratio));
  };

  const handleConfirm = () => {
    if (hasServerSourceDecision && !currentSourceOption) {
      alert("Thành này chưa được server xác nhận là nguồn xuất quân hợp lệ!");
      return;
    }
    if (currentSourceOption && !currentSourceOption.valid) {
      alert(
        currentSourceOption.reason ||
          "Thành này không có tuyến tấn công hợp lệ!",
      );
      return;
    }
    if (currentPowerSent <= 0) {
      alert("Vui lòng chọn ít nhất 1 binh sĩ để xuất binh!");
      return;
    }
    if (currentUnitsSent > totalUnitsAvailable) {
      alert("Số lượng quân xuất chiến vượt quá số quân hiện có trong thành!");
      return;
    }
    onConfirm(infantry, cavalry, artillery);
  };

  const selectedSpeeds: number[] = [];
  if (infantry > 0) selectedSpeeds.push(config.infantrySpeed);
  if (cavalry > 0) selectedSpeeds.push(config.cavalrySpeed);
  if (artillery > 0) selectedSpeeds.push(config.artillerySpeed);
  const fallbackRoute = getRouteStatus?.(sourceTown, targetTownId);
  const usesShip =
    currentSourceOption?.usesShip ?? fallbackRoute?.requiresShip ?? false;
  const marchSpeed = usesShip
    ? config.shipSpeed
    : selectedSpeeds.length > 0
      ? Math.min(...selectedSpeeds)
      : 24;
  const slowestUnit = usesShip
    ? "Thuyền vận tải"
    : artillery > 0 && marchSpeed === config.artillerySpeed
      ? "Pháo binh"
      : infantry > 0 && marchSpeed === config.infantrySpeed
        ? "Bộ binh"
        : cavalry > 0 && marchSpeed === config.cavalrySpeed
          ? "Kị binh"
          : "Chưa chọn quân";
  const gameHourSeconds = config.gameHourSeconds || 60;
  const travelSeconds =
    currentSourceOption?.travelSeconds ??
    (distanceKm !== null && marchSpeed > 0
      ? Math.max(6, Math.round((distanceKm / marchSpeed) * gameHourSeconds))
      : null);
  const travelText =
    travelSeconds === null
      ? "95p 58s"
      : travelSeconds >= 60
        ? `${Math.floor(travelSeconds / 60)}p ${travelSeconds % 60}s`
        : `${travelSeconds}s`;
  const battleForecast = currentSourceOption?.forecast;
  const forecastLabel =
    battleForecast === "favored"
      ? "LỢI THẾ"
      : battleForecast === "even"
        ? "CÂN BẰNG"
        : battleForecast === "risky"
          ? "RỦI RO CAO"
          : "CHƯA CÓ DỮ LIỆU";

  return (
    <div className="ob-modal-overlay" onMouseDown={onClose}>
      <div
        className="ob-modal-container town-modal attack-dispatch-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner (100% Matching Reference Art) */}
        <div className="rt-attack-header">
          <div className="rt-attack-header-title-box">
            <span className="swords-icon">
              <FlagIcon />
            </span>
            <h2 className="title">{actionLabel}</h2>
            <span className="swords-icon">
              <FlagIcon />
            </span>
          </div>
          <p className="subtitle">
            Từ Thành trì #{sourceTown.id} đến LÃNH THỔ #{targetTownId + 1}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rt-close-btn pos-top-right"
          >
            ✕
          </button>
        </div>

        {/* Section 1: CHỌN THÀNH XUẤT QUÂN */}
        <div className="rt-dispatch-section rt-source-section">
          <div className="rt-dispatch-section-title">CHỌN THÀNH XUẤT QUÂN</div>
          <div
            className="rt-source-card-grid"
            role="list"
            aria-label="Chọn thành xuất quân"
          >
            {townOptions.map((town) => {
              const selected = !town.disabled &&
                Number(selectedSourceTownId ?? sourceTown.id) ===
                Number(town.id);
              return (
                <button
                  key={town.id}
                  type="button"
                  role="listitem"
                  className={`rt-source-card${selected ? " is-selected" : ""}${town.disabled ? " is-disabled" : ""}`}
                  disabled={town.disabled}
                  onClick={() => onSelectSourceTown?.(town.id)}
                  title={
                    town.disabled
                      ? town.option?.reason ||
                        "Thành không đủ điều kiện xuất quân"
                      : `Chọn thành #${town.id}`
                  }
                >
                  <span className="rt-source-card-emblem">
                    <CastleThumbnail
                      architectureId={architectureId}
                      buildingType={getTownBuildingType?.(town) || "capital"}
                    />
                  </span>
                  <span className="rt-source-card-copy">
                    <strong>Thành #{town.id}</strong>
                    <span>{town.unitCount} quân</span>
                    <small>
                      {town.routeLabel} ·{" "}
                      {town.option
                        ? `${town.option.distanceKm} km · ${town.option.travelSeconds}s`
                        : "Đang kiểm tra"}
                    </small>
                    {town.disabled && (
                      <em>{town.option?.reason || "Không thể xuất quân"}</em>
                    )}
                  </span>
                  <span className="rt-source-card-check" aria-hidden="true">
                    {selected ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {targetBattleActive && isAttack && (
          <div className="rt-join-battle-note">
            Mục tiêu đang bị vây. Đạo quân này chỉ được cộng vào lực công sau
            khi hành quân tới nơi.
          </div>
        )}

        {errorMessage && <div className="rt-error-banner">{errorMessage}</div>}

        {hasValidSource && (
          <>
        {/* Section 2: 6 Overview Stat Cards Grid (Zero Emojis - 100% Vector SVGs) */}
        <div className="rt-army-overview-grid">
          <div className="rt-army-stat-card">
            <span className="label">
              <HelmetIconSVG /> QUÂN TRONG THÀNH
            </span>
            <span className="val text-gold">{totalUnitsAvailable} quân</span>
          </div>
          <div className="rt-army-stat-card">
            <span className="label">
              <FlagIcon /> LỰC LƯỢNG XUẤT CHINH
            </span>
            <span className="val text-gold">{currentUnitsSent} quân</span>
          </div>
          <div className="rt-army-stat-card">
            <span className="label">
              <ShieldIconSVG /> BÌNH LÍNH Ở LẠI THỦ THÀNH
            </span>
            <span className="val text-gold">{unitsRemaining} quân</span>
          </div>
          <div className="rt-army-stat-card">
            <span className="label">
              <HorseHeadSVG /> BÌNH LÍNH HÀNH QUÂN
            </span>
            <span className="val text-gold">{currentUnitsSent} quân</span>
          </div>
          <div className="rt-army-stat-card">
            <span className="label">
              <TargetIconSVG /> SỨC MẠNH XUẤT CHIẾN
            </span>
            <span className="val text-gold">{currentPowerSent}</span>
          </div>
          <div className="rt-army-stat-card">
            <span className="label">
              <ScalesIconSVG /> TẢI TRỌNG HÀNH QUÂN
            </span>
            <span className="val text-gold">
              {currentUnitsSent * 23} / {totalUnitsAvailable * 100}
            </span>
          </div>
        </div>

        {/* Section 3: CHỈNH ĐỊNH LỰC LƯỢNG (Sliders) */}
        <div className="rt-dispatch-section margin-top">
          <div className="rt-dispatch-section-heading">
            <div className="rt-dispatch-section-title">CHỈNH ĐỊNH LỰC LƯỢNG</div>
            <div className="rt-troop-presets" aria-label="Chọn nhanh số quân">
              {[0.25, 0.5, 1].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => applyTroopPreset(ratio)}
                >
                  {ratio === 1 ? "Tất cả" : `${ratio * 100}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Infantry Row */}
          {maxInfantry > 0 && (
            <div className="rt-troop-slider-row">
              <div className="rt-troop-avatar-card">
                <InfantryAvatar />
              </div>
              <div className="rt-slider-content">
                <div className="rt-slider-header">
                  <span className="unit-name blue">
                    Bộ binh ({config.infantrySpeed} km/h)
                  </span>
                  <span className="unit-count">
                    {infantry} / {maxInfantry} sĩ
                  </span>
                </div>
                <div className="rt-slider-track-box">
                  <input
                    type="range"
                    min="0"
                    max={maxInfantry}
                    value={infantry}
                    onChange={(e) =>
                      handleInfantryChange(Number(e.target.value))
                    }
                    className="rt-range-slider blue"
                  />
                </div>
              </div>
              <input
                type="number"
                min="0"
                max={maxInfantry}
                value={infantry}
                onChange={(e) => handleInfantryChange(Number(e.target.value))}
                className="rt-num-input"
              />
            </div>
          )}

          {/* Cavalry Row */}
          {maxCavalry > 0 && (
            <div className="rt-troop-slider-row">
              <div className="rt-troop-avatar-card">
                <CavalryAvatar />
              </div>
              <div className="rt-slider-content">
                <div className="rt-slider-header">
                  <span className="unit-name green">
                    Kị binh ({config.cavalrySpeed} km/h)
                  </span>
                  <span className="unit-count">
                    {cavalry} / {maxCavalry} sĩ
                  </span>
                </div>
                <div className="rt-slider-track-box">
                  <input
                    type="range"
                    min="0"
                    max={maxCavalry}
                    value={cavalry}
                    onChange={(e) =>
                      handleCavalryChange(Number(e.target.value))
                    }
                    className="rt-range-slider green"
                  />
                </div>
              </div>
              <input
                type="number"
                min="0"
                max={maxCavalry}
                value={cavalry}
                onChange={(e) => handleCavalryChange(Number(e.target.value))}
                className="rt-num-input"
              />
            </div>
          )}

          {/* Artillery Row */}
          {maxArtillery > 0 && (
            <div className="rt-troop-slider-row">
              <div className="rt-troop-avatar-card">
                <ArtilleryAvatar />
              </div>
              <div className="rt-slider-content">
                <div className="rt-slider-header">
                  <span className="unit-name red">
                    Pháo binh ({config.artillerySpeed} km/h)
                  </span>
                  <span className="unit-count">
                    {artillery} / {maxArtillery} sĩ
                  </span>
                </div>
                <div className="rt-slider-track-box">
                  <input
                    type="range"
                    min="0"
                    max={maxArtillery}
                    value={artillery}
                    onChange={(e) =>
                      handleArtilleryChange(Number(e.target.value))
                    }
                    className="rt-range-slider red"
                  />
                </div>
              </div>
              <input
                type="number"
                min="0"
                max={maxArtillery}
                value={artillery}
                onChange={(e) => handleArtilleryChange(Number(e.target.value))}
                className="rt-num-input"
              />
            </div>
          )}
        </div>

        {isAttack && currentSourceOption && (
          <div className={`rt-battle-forecast is-${battleForecast || "unknown"}`}>
            <span>
              <ScalesIconSVG /> DỰ BÁO NẾU XUẤT TOÀN BỘ QUÂN
            </span>
            <strong>{forecastLabel}</strong>
            <small>
              Công {Math.round(currentSourceOption.attackerPowerEstimate || 0)}
              {" · "}Thủ {Math.round(currentSourceOption.defenderPowerEstimate || 0)}
              {" · "}Tỷ lệ {Number(currentSourceOption.advantageRatio || 0).toFixed(2)}x
            </small>
          </div>
        )}

        {/* Section 4: THỜI GIAN HÀNH QUÂN */}
        <div className="rt-march-time-row">
          <div className="time-card">
            <span className="label">
              <HourglassIcon /> THỜI GIAN HÀNH QUÂN
            </span>
            <span className="val text-gold">{travelText}</span>
          </div>
          <div className="info-card">
            <div className="info-line">
              Khoảng cách: {distanceKm} km &nbsp;|&nbsp; Tốc độ hiệu dụng:{" "}
              {marchSpeed} km/h &nbsp;|&nbsp; Chậm nhất: {slowestUnit}.
            </div>
            <div className="info-sub">
              &gt; Nếu vượt biển sẽ dùng thuyền (12 km/h), 1 giờ game = 60 giây
              thật.
            </div>
          </div>
        </div>

        {/* Bottom Banner Button (100% Match Reference Art) */}
        <div className="rt-attack-footer">
          <button
            type="button"
            onClick={handleConfirm}
            className="rt-gold-banner-btn"
            disabled={
              hasServerSourceDecision &&
              (!currentSourceOption || !currentSourceOption.valid)
            }
            title={
              hasServerSourceDecision &&
              (!currentSourceOption || !currentSourceOption.valid)
                ? currentSourceOption?.reason ||
                  "Không có thành xuất quân hợp lệ"
                : actionLabel
            }
          >
            {isAttack ? (
              <AssetIcon asset="attackButton" size={32} />
            ) : (
              <FlagIcon />
            )}{" "}
            <span>{actionLabel}</span>
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
