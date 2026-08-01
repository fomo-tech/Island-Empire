import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createIslandEmpireGame, type GameEngineHandle } from "../game/engine";
import {
  cancelClearing,
  clearPlayerMail,
  completeClearing,
  createMarch,
  deletePlayerMail,
  getMarchSourceOptions,
  getGameConfig,
  getChatHistory,
  getPlayerSync,
  getServerStatus,
  getWorldTerritories,
  markBattleReportRead,
  markPlayerMailRead,
  sendPlayerMail,
  startClearing,
  updatePlayerProfile,
} from "../game/api";
import { connectGameSocket, sendWorldChat } from "../game/realtime";
import {
  detectDeviceLanguage,
  saveLanguage,
  translate,
  type GameLanguage,
} from "../game/i18n";
import { LoginScreen } from "./LoginScreen";
import { TerritoryTooltip } from "./TerritoryTooltip";
import { NewbieOnboardingModal } from "./NewbieOnboardingModal";
import { KingdomCreationModal } from "./KingdomCreationModal";
import { TownManagementModal } from "./TownManagementModal";
import { TroopDeploymentModal } from "./TroopDeploymentModal";
import { ArmyModal } from "./ArmyModal";
import { TreasureModal } from "./TreasureModal";
import { AllyModal } from "./AllyModal";
import { ShopModal } from "./ShopModal";
import { ChatInputModal } from "./ChatInputModal";
import { ChatPanel } from "./ChatPanel";
import { SettingsModal } from "./SettingsModal";
import { BattleReportModal, type BattleReportData } from "./BattleReportModal";
import { NationModal } from "./NationModal";
import { RankingModal } from "./RankingModal";
import { useGameStore } from "../store/gameStore";
import type {
  BattleReport,
  MarchSourceOption,
  PlayerMail,
  PlayerSyncResult,
  ResourceBag,
  ChatMessage,
} from "@island/shared";

const CAMERA_KEY = "island_empire_camera_v1";
const TOKEN_KEY = "island_empire_token";
const PLAYER_ID_KEY = "island_empire_playerId";
const CLAIM_KEY = "island_empire_onboarding_claim";
const ONBOARDING_KEY = "island_empire_onboarding_pending";
let didApplyNewbieReset = false;

type HudIconName =
  | "scroll"
  | "chart"
  | "swords"
  | "pickaxe"
  | "shield"
  | "hammer"
  | "flask"
  | "crown"
  | "handshake"
  | "banner"
  | "castle"
  | "map"
  | "door"
  | "key"
  | "chat"
  | "mail"
  | "star"
  | "bell"
  | "gear"
  | "book"
  | "bag"
  | "gift"
  | "pin"
  | "helmet"
  | "globe"
  | "info"
  | "anchor"
  | "food"
  | "wood"
  | "stone"
  | "iron"
  | "gems"
  | "gold"
  | "diamonds"
  | "search"
  | "target"
  | "clock"
  | "lightning"
  | "fullscreen"
  | "logout"
  | "chevronUp"
  | "minus";

function HudIcon({ name }: { name: HudIconName }) {
  if (name === "food") return <VectorFoodIcon />;
  if (name === "wood") return <VectorWoodIcon />;
  if (name === "stone") return <VectorStoneIcon />;
  if (name === "iron") return <VectorIronIcon />;
  if (name === "gems") return <VectorGemsIcon />;
  if (name === "gold") return <VectorGoldIcon />;
  if (name === "diamonds") {
    return (
      <svg viewBox="0 0 64 64" className="vector-res-svg">
        <defs>
          <linearGradient id="diaLightHud" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="diaDarkHud" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#0c4a6e" />
          </linearGradient>
          <linearGradient id="diaTopHud" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>
        <polygon
          points="32,58 10,24 20,8 44,8 54,24"
          fill="url(#diaDarkHud)"
          stroke="#0c4a6e"
          strokeWidth="1.5"
        />
        <polygon
          points="32,58 10,24 32,24"
          fill="url(#diaLightHud)"
          stroke="#0c4a6e"
          strokeWidth="1.5"
        />
        <polygon
          points="32,58 32,24 54,24"
          fill="url(#diaLightHud)"
          opacity="0.8"
          stroke="#0c4a6e"
          strokeWidth="1.5"
        />
        <polygon
          points="10,24 20,8 32,24"
          fill="url(#diaTopHud)"
          stroke="#0c4a6e"
          strokeWidth="1.5"
        />
        <polygon
          points="54,24 44,8 32,24"
          fill="url(#diaTopHud)"
          opacity="0.8"
          stroke="#0c4a6e"
          strokeWidth="1.5"
        />
        <polygon
          points="20,8 44,8 32,24"
          fill="#f0f9ff"
          stroke="#0c4a6e"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<
    Exclude<
      HudIconName,
      "gold" | "diamonds" | "food" | "wood" | "stone" | "iron" | "gems"
    >,
    ReactNode
  > = {
    logout: (
      <>
        <path {...common} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline {...common} points="16 17 21 12 16 7" />
        <line {...common} x1="21" y1="12" x2="9" y2="12" />
      </>
    ),
    chevronUp: <polyline {...common} points="18 15 12 9 6 15" />,
    minus: <line {...common} x1="5" y1="12" x2="19" y2="12" />,
    scroll: (
      <>
        <path
          {...common}
          d="M6 4h10a2 2 0 0 1 2 2v13H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Z"
        />
        <path {...common} d="M7 9h8M7 13h7M7 17h5" />
      </>
    ),
    chart: (
      <>
        <path {...common} d="M4 19V5" />
        <path {...common} d="M8 19v-7" />
        <path {...common} d="M12 19V8" />
        <path {...common} d="M16 19v-4" />
        <path {...common} d="M3 19h18" />
      </>
    ),
    swords: (
      <>
        <path {...common} d="M4 20 20 4M15 4h5v5M13 7l4 4" />
        <path {...common} d="M20 20 4 4M4 9V4h5M7 13l4 4" />
      </>
    ),
    pickaxe: (
      <>
        <path {...common} d="M14 5c-3-1-6 0-8 3" />
        <path {...common} d="M8 8 20 20" />
        <path {...common} d="M5 19 12 12" />
      </>
    ),
    shield: (
      <>
        <path {...common} d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
        <path {...common} d="M12 6v12" />
      </>
    ),
    hammer: (
      <>
        <path {...common} d="M14 4 20 10" />
        <path {...common} d="M12 6l6 6" />
        <path {...common} d="M3 21l8-8" />
        <path {...common} d="M9 15l-2-2" />
      </>
    ),
    flask: (
      <>
        <path
          {...common}
          d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"
        />
        <path {...common} d="M7 16h10" />
      </>
    ),
    crown: (
      <>
        <path {...common} d="M4 18h16l-1-10-5 4-2-7-2 7-5-4-1 10Z" />
        <path {...common} d="M5 21h14" />
      </>
    ),
    handshake: (
      <>
        <path {...common} d="M8 12 5 15a2 2 0 0 0 3 3l2-2" />
        <path {...common} d="M16 12l3 3a2 2 0 0 1-3 3l-5-5" />
        <path {...common} d="M7 11l4-4 3 3 3-3 4 4" />
        <path {...common} d="M3 10l4-4M21 10l-4-4" />
      </>
    ),
    banner: (
      <>
        <path {...common} d="M6 21V4" />
        <path {...common} d="M6 5h12l-2 4 2 4H6" />
      </>
    ),
    castle: (
      <>
        <path {...common} d="M4 21V9h4V5h3v4h2V5h3v4h4v12" />
        <path {...common} d="M8 21v-5a4 4 0 0 1 8 0v5" />
        <path {...common} d="M4 12h16" />
      </>
    ),
    map: (
      <>
        <path {...common} d="M4 6 10 3l4 2 6-3v16l-6 3-4-2-6 3V6Z" />
        <path {...common} d="M10 3v16M14 5v16" />
      </>
    ),
    door: (
      <>
        <path {...common} d="M6 21V4h10v17" />
        <path {...common} d="M4 21h16" />
        <path {...common} d="M13 13h.01" />
      </>
    ),
    key: (
      <>
        <circle {...common} cx="8" cy="15" r="4" />
        <path {...common} d="M11 12 20 3M16 7l2 2M14 9l2 2" />
      </>
    ),
    chat: (
      <>
        <path {...common} d="M4 5h16v11H8l-4 4V5Z" />
        <path {...common} d="M8 9h8M8 13h6" />
      </>
    ),
    mail: (
      <>
        <path {...common} d="M4 6h16v12H4V6Z" />
        <path {...common} d="m4 7 8 6 8-6" />
        <path {...common} d="m4 18 6-5M20 18l-6-5" />
      </>
    ),
    star: (
      <>
        <path
          {...common}
          d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"
        />
      </>
    ),
    bell: (
      <>
        <path {...common} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path {...common} d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    gear: (
      <>
        <circle {...common} cx="12" cy="12" r="3" />
        <path
          {...common}
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        />
      </>
    ),
    book: (
      <>
        <path {...common} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path
          {...common}
          d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        />
      </>
    ),
    bag: (
      <>
        <path
          {...common}
          d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"
        />
        <line {...common} x1="3" y1="6" x2="21" y2="6" />
        <path {...common} d="M16 10a4 4 0 0 1-8 0" />
      </>
    ),
    gift: (
      <>
        <polyline {...common} points="20 12 20 22 4 22 4 12" />
        <rect {...common} x="2" y="7" width="20" height="5" />
        <line {...common} x1="12" y1="22" x2="12" y2="7" />
        <path {...common} d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path {...common} d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </>
    ),
    pin: (
      <>
        <path {...common} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle {...common} cx="12" cy="10" r="3" />
      </>
    ),
    helmet: (
      <>
        <path
          {...common}
          d="M12 2a10 10 0 0 0-10 10v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6A10 10 0 0 0 12 2z"
        />
        <path {...common} d="M12 6v6" />
        <path {...common} d="M6 12h12" />
      </>
    ),
    globe: (
      <>
        <circle {...common} cx="12" cy="12" r="10" />
        <line {...common} x1="2" y1="12" x2="22" y2="12" />
        <path
          {...common}
          d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        />
      </>
    ),
    info: (
      <>
        <circle {...common} cx="12" cy="12" r="10" />
        <line {...common} x1="12" y1="16" x2="12" y2="12" />
        <line {...common} x1="12" y1="8" x2="12.01" y2="8" />
      </>
    ),
    anchor: (
      <>
        <circle {...common} cx="12" cy="5" r="3" />
        <line {...common} x1="12" y1="8" x2="12" y2="21" />
        <line {...common} x1="5" y1="12" x2="19" y2="12" />
        <path {...common} d="M5 12a7 7 0 0 0 14 0" />
      </>
    ),
    search: (
      <>
        <circle {...common} cx="11" cy="11" r="8" />
        <line {...common} x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
    target: (
      <>
        <circle {...common} cx="12" cy="12" r="9" />
        <circle {...common} cx="12" cy="12" r="3" />
        <line {...common} x1="12" y1="1" x2="12" y2="5" />
        <line {...common} x1="12" y1="19" x2="12" y2="23" />
        <line {...common} x1="1" y1="12" x2="5" y2="12" />
        <line {...common} x1="19" y1="12" x2="23" y2="12" />
      </>
    ),
    clock: (
      <>
        <circle {...common} cx="12" cy="12" r="9" />
        <polyline {...common} points="12 7 12 12 15 15" />
      </>
    ),
    lightning: (
      <>
        <polygon {...common} points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </>
    ),
    fullscreen: (
      <>
        <path
          {...common}
          d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"
        />
      </>
    ),
  };
  return (
    <svg className="hud-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

/* Rich Vector Color Icons matching Mockup Screenshot 3 */
function VectorFoodIcon() {
  return (
    <svg viewBox="0 0 64 64" className="vector-res-svg">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>
      <g fill="url(#goldGrad)" stroke="#f59e0b" strokeWidth="1">
        <path d="M32 58 L32 20" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M22 45 C 22 45, 14 35, 26 28 C 30 25, 30 35, 24 40" />
        <path d="M20 35 C 20 35, 12 25, 24 18 C 28 15, 28 25, 22 30" />
        <path d="M42 45 C 42 45, 50 35, 38 28 C 34 25, 34 35, 40 40" />
        <path d="M44 35 C 44 35, 52 25, 40 18 C 36 15, 36 25, 42 30" />
        <path d="M32 18 C 32 18, 24 8, 32 2 C 40 8, 32 18, 32 18" />
      </g>
    </svg>
  );
}

function VectorWoodIcon() {
  return (
    <svg viewBox="0 0 64 64" className="vector-res-svg">
      <defs>
        <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="50%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
        <radialGradient id="ringGrad">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="70%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
      </defs>
      <rect
        x="6"
        y="34"
        width="38"
        height="16"
        rx="4"
        fill="url(#woodGrad)"
        stroke="#451a03"
        strokeWidth="1.5"
      />
      <ellipse
        cx="44"
        cy="42"
        rx="4"
        ry="8"
        fill="url(#ringGrad)"
        stroke="#451a03"
        strokeWidth="1.5"
      />

      <rect
        x="18"
        y="42"
        width="38"
        height="16"
        rx="4"
        fill="url(#woodGrad)"
        stroke="#451a03"
        strokeWidth="1.5"
      />
      <ellipse
        cx="56"
        cy="50"
        rx="4"
        ry="8"
        fill="url(#ringGrad)"
        stroke="#451a03"
        strokeWidth="1.5"
      />

      <rect
        x="12"
        y="20"
        width="38"
        height="16"
        rx="4"
        fill="url(#woodGrad)"
        stroke="#451a03"
        strokeWidth="1.5"
      />
      <ellipse
        cx="50"
        cy="28"
        rx="4"
        ry="8"
        fill="url(#ringGrad)"
        stroke="#451a03"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function VectorStoneIcon() {
  return (
    <svg viewBox="0 0 64 64" className="vector-res-svg">
      <defs>
        <linearGradient id="stoneLight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="stoneDark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="stoneTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <polygon
        points="32,6 56,18 32,30 8,18"
        fill="url(#stoneTop)"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      <polygon
        points="8,18 32,30 32,58 8,44"
        fill="url(#stoneLight)"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
      <polygon
        points="32,30 56,18 56,44 32,58"
        fill="url(#stoneDark)"
        stroke="#1e293b"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function VectorIronIcon() {
  return (
    <svg viewBox="0 0 64 64" className="vector-res-svg">
      <defs>
        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="metalSide" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <polygon
        points="10,14 54,14 44,48 20,48"
        fill="url(#metalGrad)"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      <polygon
        points="54,14 44,48 48,48 58,14"
        fill="url(#metalSide)"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      <line
        x1="16"
        y1="18"
        x2="50"
        y2="18"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

function VectorGemsIcon() {
  return (
    <svg viewBox="0 0 64 64" className="vector-res-svg">
      <defs>
        <linearGradient id="rubyLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <linearGradient id="rubyDark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#9f1239" />
          <stop offset="100%" stopColor="#4c0519" />
        </linearGradient>
        <linearGradient id="rubyTop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
      </defs>
      <polygon
        points="32,58 10,24 20,8 44,8 54,24"
        fill="url(#rubyDark)"
        stroke="#4c0519"
        strokeWidth="1.5"
      />
      <polygon
        points="32,58 10,24 32,24"
        fill="url(#rubyLight)"
        stroke="#4c0519"
        strokeWidth="1.5"
      />
      <polygon
        points="32,58 32,24 54,24"
        fill="url(#rubyLight)"
        opacity="0.8"
        stroke="#4c0519"
        strokeWidth="1.5"
      />
      <polygon
        points="10,24 20,8 32,24"
        fill="url(#rubyTop)"
        stroke="#4c0519"
        strokeWidth="1.5"
      />
      <polygon
        points="54,24 44,8 32,24"
        fill="url(#rubyTop)"
        opacity="0.8"
        stroke="#4c0519"
        strokeWidth="1.5"
      />
      <polygon
        points="20,8 44,8 32,24"
        fill="#ffe4e6"
        stroke="#4c0519"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function VectorGoldIcon() {
  return (
    <svg viewBox="0 0 64 64" className="vector-res-svg">
      <defs>
        <linearGradient id="goldCoinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="85%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
      </defs>
      <ellipse
        cx="20"
        cy="46"
        rx="13"
        ry="6.5"
        fill="url(#goldCoinGrad)"
        stroke="#854d0e"
        strokeWidth="1.5"
      />
      <ellipse
        cx="20"
        cy="38"
        rx="13"
        ry="6.5"
        fill="url(#goldCoinGrad)"
        stroke="#854d0e"
        strokeWidth="1.5"
      />

      <ellipse
        cx="44"
        cy="50"
        rx="13"
        ry="6.5"
        fill="url(#goldCoinGrad)"
        stroke="#854d0e"
        strokeWidth="1.5"
      />
      <ellipse
        cx="44"
        cy="42"
        rx="13"
        ry="6.5"
        fill="url(#goldCoinGrad)"
        stroke="#854d0e"
        strokeWidth="1.5"
      />

      <ellipse
        cx="32"
        cy="34"
        rx="15"
        ry="7.5"
        fill="url(#goldCoinGrad)"
        stroke="#854d0e"
        strokeWidth="1.5"
      />
      <ellipse
        cx="32"
        cy="26"
        rx="15"
        ry="7.5"
        fill="url(#goldCoinGrad)"
        stroke="#854d0e"
        strokeWidth="1.5"
      />

      <polygon
        points="36,16 38,20 42,20 39,23 40,27 36,25 32,27 33,23 30,20 34,20"
        fill="#ffffff"
      />
    </svg>
  );
}

function VectorCoalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="vector-res-svg">
      <polygon
        points="5,17 9,9 17,9 19,17 13,20"
        fill="#1e293b"
        stroke="#0f172a"
        strokeWidth="1.2"
      />
      <polygon
        points="12,7 16,3 21,5 19,10"
        fill="#334155"
        stroke="#0f172a"
        strokeWidth="1"
      />
      <polygon points="9,9 17,9 13,15 8,13" fill="#475569" />
    </svg>
  );
}

function VectorSulfurIcon() {
  return (
    <svg viewBox="0 0 24 24" className="vector-res-svg">
      <polygon
        points="6,18 10,8 18,9 19,17 12,20"
        fill="#eab308"
        stroke="#ca8a04"
        strokeWidth="1"
      />
      <polygon points="10,8 18,9 13,15" fill="#fef08a" />
      <polygon
        points="4,12 8,5 12,8"
        fill="#ca8a04"
        stroke="#a16207"
        strokeWidth="1"
      />
    </svg>
  );
}

/* Rich Status Icons for Left Card */
function StatusIconLeaf() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <path
        d="M 12,2 C 18,4 22,10 20,17 C 18,22 11,22 5,19 C 4,13 6,5 12,2 Z"
        fill="#4ade80"
      />
      <path
        d="M 12,4 Q 10,13 5,19"
        stroke="#166534"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

function StatusIconShield() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <path
        d="M 12,3 L 20,6 C 20,14 12,21 12,21 C 12,21 4,14 4,6 Z"
        fill="#60a5fa"
        stroke="#1e40af"
        strokeWidth="1"
      />
    </svg>
  );
}

function StatusIconBlood() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <path
        d="M 12,3 C 16,8 19,13 19,16 C 19,20 16,22 12,22 C 8,22 5,20 5,16 C 5,13 8,8 12,3 Z"
        fill="#f87171"
        stroke="#991b1b"
        strokeWidth="1"
      />
    </svg>
  );
}

function StatusIconVault() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <rect
        x="4"
        y="8"
        width="16"
        height="13"
        rx="2"
        fill="#ef4444"
        stroke="#991b1b"
        strokeWidth="1"
      />
      <path d="M 4,13 L 20,13" stroke="#fef08a" strokeWidth="1.5" />
    </svg>
  );
}

function StatusIconBolt() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <polygon
        points="13,2 3,14 12,14 11,22 21,10 12,10"
        fill="#facc15"
        stroke="#ca8a04"
        strokeWidth="1"
      />
    </svg>
  );
}

function StatusIconSwords() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <path
        d="M 4,20 L 20,4 M 16,4 L 20,4 L 20,8 M 4,4 L 20,20 M 4,16 L 4,20 L 8,20"
        stroke="#f59e0b"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function applyNewbieResetOnce() {
  if (didApplyNewbieReset) return;
  didApplyNewbieReset = true;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("newbie")) return;
  localStorage.removeItem(CAMERA_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PLAYER_ID_KEY);
  localStorage.removeItem(CLAIM_KEY);
  params.delete("newbie");
  const nextSearch = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`,
  );
}

function isNewbieMode() {
  return new URLSearchParams(window.location.search).has("newbie");
}

function serverToEngineTerritoryId(id: number) {
  return id;
}

function engineToServerTerritoryId(id: number) {
  return id;
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickStarterTerritoryId(
  playerId: string,
  territories: Array<{ id: number; ownerCode: number; isIslet?: boolean }>,
) {
  const wild = territories.filter(
    (territory) => territory.ownerCode === 0 && !territory.isIslet,
  );
  const pool =
    wild.length > 0
      ? wild
      : territories.filter((territory) => territory.ownerCode === 0);
  if (pool.length === 0) return null;
  return pool[stableHash(playerId) % pool.length].id;
}

function summarizeBackendHud(
  world: any,
  currentPlayerId: string | null,
  _resources: {
    gold: number;
    gems: number;
    food?: number;
    iron?: number;
    coal?: number;
    sulfur?: number;
  },
) {
  const territories = Array.isArray(world?.territories)
    ? world.territories
    : [];
  const marches = Array.isArray(world?.marches) ? world.marches : [];
  const clearings = Array.isArray(world?.clearings) ? world.clearings : [];
  const ownedTerritories = territories.filter(
    (territory: any) =>
      territory.ownerId && territory.ownerId === currentPlayerId,
  ).length;
  const outboundMarches = marches.filter(
    (march: any) => march.ownerId === currentPlayerId,
  );
  const outboundTroops = outboundMarches.reduce(
    (sum: number, march: any) => sum + (march.troops || 0),
    0,
  );
  const ownedTroops = outboundTroops;
  return {
    ownedTerritories,
    totalTerritories: territories.length,
    enemyTerritories: territories.filter(
      (territory: any) =>
        territory.ownerId && territory.ownerId !== currentPlayerId,
    ).length,
    activeMarches: marches.length,
    ownMarches: outboundMarches.length,
    activeClearings: clearings.length,
    ownClearings: clearings.filter(
      (clearing: any) => clearing.playerId === currentPlayerId,
    ).length,
    outboundTroops,
    ownedTroops,
    strategicPower: 0,
    lastSync: Date.now(),
  };
}

function mapServerBattlesForClient(battles: any[] = []) {
  return battles.map((battle) => ({
    ...battle,
    regionId: serverToEngineTerritoryId(battle.regionId),
    attPower: battle.attackerPower ?? battle.attPower ?? 0,
    defPower: battle.defenderPower ?? battle.defPower ?? 0,
    duration: battle.durationSeconds ?? battle.duration ?? 1,
    t: battle.startedAt
      ? Math.max(0, (Date.now() - new Date(battle.startedAt).getTime()) / 1000)
      : (battle.t ?? 0),
  }));
}

function isNewerBattleSnapshot(next: any, current: any) {
  if (!current) return true;
  const nextVersion = Number(next?.battleVersion || 0);
  const currentVersion = Number(current?.battleVersion || 0);
  if (nextVersion !== currentVersion) return nextVersion > currentVersion;
  return (
    new Date(next?.hpUpdatedAt || 0).getTime() >=
    new Date(current?.hpUpdatedAt || 0).getTime()
  );
}

// Helper to format numbers with dot separators, e.g. 13.718
const formatNum = (num: number) => Math.floor(num).toLocaleString("vi-VN");

const formatResourceVal = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return Math.floor(num).toString();
};

// Parse log lines into formatted chat objects
type WarReportRecord = {
  id: string;
  kind: "battle" | "march" | "clearing" | "system";
  title: string;
  body: string;
  meta: string;
  time: number;
  isMine?: boolean; // true = liên quan trực tiếp đến người chơi hiện tại
  detailReport?: BattleReportData;
};
type PrivateMailRecord = {
  id: string;
  from: string;
  to: string;
  title: string;
  body: string;
  time: number;
  read: boolean;
};

type BattlefieldActivityItem = {
  id: string;
  title: string;
  meta: string;
  icon: string;
  tone: "danger" | "warning" | "active" | "building" | "calm";
  priority: number;
  territoryId?: number;
  marchId?: string;
  focus?: "territory" | "march";
};

function formatTimeLeft(iso?: string) {
  if (!iso) return "--";
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "sắp xong";
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return `${minutes}p ${remain}s`;
}

function territoryLabel(id: number) {
  return `Lãnh thổ #${id + 1}`;
}

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

function CastleArt() {
  return (
    <svg
      viewBox="0 0 100 100"
      width="80"
      height="80"
      style={{ display: "block" }}
    >
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="#0b1422"
        stroke="#ffd34d"
        strokeWidth="2.5"
      />
      <rect
        x="35"
        y="45"
        width="30"
        height="30"
        fill="#64748b"
        stroke="#f8fafc"
        strokeWidth="1"
      />
      <path
        d="M 44,75 L 44,60 Q 50,55 56,60 L 56,75 Z"
        fill="#020617"
        stroke="#ffd34d"
        strokeWidth="1.5"
      />
      <rect
        x="25"
        y="35"
        width="12"
        height="40"
        fill="#64748b"
        stroke="#f8fafc"
        strokeWidth="1"
      />
      <polygon
        points="23,35 31,20 39,35"
        fill="#ef4444"
        stroke="#ffd34d"
        strokeWidth="1"
      />
      <rect
        x="63"
        y="35"
        width="12"
        height="40"
        fill="#64748b"
        stroke="#f8fafc"
        strokeWidth="1"
      />
      <polygon
        points="61,35 69,20 77,35"
        fill="#ef4444"
        stroke="#ffd34d"
        strokeWidth="1"
      />
    </svg>
  );
}

function ArmyArt() {
  return (
    <svg
      viewBox="0 0 100 100"
      width="80"
      height="80"
      style={{ display: "block" }}
    >
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="#0b1422"
        stroke="#ffd34d"
        strokeWidth="2.5"
      />
      <path
        d="M25 75 L75 25 M30 80 L80 30 M70 20 L80 30 M20 70 L30 80"
        stroke="#cbd5e1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M75 75 L25 25 M70 80 L20 30 M30 20 L20 30 M80 70 L70 80"
        stroke="#cbd5e1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="50"
        cy="50"
        r="10"
        fill="#ef4444"
        stroke="#ffd34d"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ResourceArt() {
  return (
    <svg
      viewBox="0 0 100 100"
      width="80"
      height="80"
      style={{ display: "block" }}
    >
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="#0b1422"
        stroke="#ffd34d"
        strokeWidth="2.5"
      />
      <polygon
        points="35,60 45,45 60,48 55,68 40,65"
        fill="#facc15"
        stroke="#ca8a04"
        strokeWidth="1.5"
      />
      <polygon
        points="50,30 65,30 72,42 50,60 28,42"
        fill="#10b981"
        stroke="#047857"
        strokeWidth="1.5"
      />
      <rect
        x="25"
        y="48"
        width="22"
        height="6"
        rx="2"
        fill="#b45309"
        stroke="#78350f"
        strokeWidth="1"
      />
    </svg>
  );
}

function DiplomacyArt() {
  return (
    <svg
      viewBox="0 0 100 100"
      width="80"
      height="80"
      style={{ display: "block" }}
    >
      <circle
        cx="50"
        cy="50"
        r="41"
        fill="#0b1422"
        stroke="#ffd34d"
        strokeWidth="2.5"
      />
      <path
        d="M 25,50 C 35,40 45,40 55,50 C 65,60 75,50 75,50"
        stroke="#ffd34d"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 35,50 Q 50,60 65,50"
        stroke="#3b82f6"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="50" cy="45" r="8" fill="#ffd700" opacity="0.8" />
    </svg>
  );
}

/**
 * Hook: Disabled – no longer forcing landscape rotation.
 * App now runs in natural portrait orientation on mobile.
 * CSS landscape media queries still apply when user physically rotates device.
 */
function useMobileForcedLandscape(): boolean {
  // Always return false – no CSS rotation applied
  return false;
}

export function GameApp({
  onOpenConquest,
  conquestMode = false,
  onOpenWorld,
}: {
  onOpenConquest: () => void;
  conquestMode?: boolean;
  onOpenWorld?: () => void;
}) {
  applyNewbieResetOnce();
  const isMobileLandscape = useMobileForcedLandscape();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngineHandle | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const backendClaimCompleteRef = useRef<Set<number>>(new Set());
  const gameStateRefreshInFlightRef = useRef(false);
  const gameStateRefreshQueuedRef = useRef(false);
  const lastGameStateRefreshAtRef = useRef(0);
  const socketHelloCountRef = useRef(0); // counts hello events; >1 = reconnect
  const economyClockRef = useRef<{
    resources: ResourceBag;
    capacity: ResourceBag;
    productionPerSecond: ResourceBag;
    updatedAt: number;
  }>({
    resources: {
      gold: 0,
      wood: 0,
      stone: 0,
      food: 0,
      iron: 0,
      coal: 0,
      sulfur: 0,
      gems: 0,
    },
    capacity: {
      gold: 0,
      wood: 0,
      stone: 0,
      food: 0,
      iron: 0,
      coal: 0,
      sulfur: 0,
      gems: 0,
    },
    productionPerSecond: {
      gold: 0,
      wood: 0,
      stone: 0,
      food: 0,
      iron: 0,
      coal: 0,
      sulfur: 0,
      gems: 0,
    },
    updatedAt: Date.now(),
  });
  const lastHudSnapshotRef = useRef({
    resources: "",
    missions: "",
    chat: "",
    battles: "",
    selectedRegion: "",
    selectedTown: "",
    meta: "",
    research: "",
    events: "",
    prevToast: "",
  });

  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    isNewbieMode() ? null : localStorage.getItem(TOKEN_KEY),
  );
  const [playerId, setPlayerId] = useState<string | null>(() =>
    isNewbieMode() ? null : localStorage.getItem(PLAYER_ID_KEY),
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [gameReady, setGameReady] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState("ĐANG KIỂM TRA MÁY CHỦ");
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [targetProgress, setTargetProgress] = useState<number>(20);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Smoothly interpolate loadingProgress towards targetProgress
  useEffect(() => {
    if (gameReady) return;
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev < targetProgress) {
          const gap = targetProgress - prev;
          const step = gap > 20 ? 2 : 1;
          return Math.min(targetProgress, prev + step);
        }
        return prev;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [targetProgress, gameReady]);

  // Ensure game becomes ready ONLY after loadingProgress has fully animated to 100%
  // AND the engine is ready, ensuring full first frame render before entrance.
  useEffect(() => {
    if (loadingProgress >= 100 && !gameReady && isAuthenticated) {
      const t = setTimeout(() => {
        setGameReady(true);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [loadingProgress, gameReady, isAuthenticated]);

  // Game states captured from Engine Loop
  const resources = useGameStore((state) => state.resources);
  const setResources = useGameStore((state) => state.setResources);
  const worldActivity = useGameStore((state) => state.worldActivity);
  const setWorldActivity = useGameStore((state) => state.setWorldActivity);
  const serverHud = useGameStore((state) => state.serverHud);
  const setServerHud = useGameStore((state) => state.setServerHud);
  const nationStatus = useGameStore((state) => state.nationStatus);
  const setNationStatus = useGameStore((state) => state.setNationStatus);
  const armyState = useGameStore((state) => state.armyState);
  const setArmyState = useGameStore((state) => state.setArmyState);
  const battleReports = useGameStore((state) => state.battleReports);
  const setBattleReports = useGameStore((state) => state.setBattleReports);
  const reportUnreadCount = useGameStore((state) => state.reportUnreadCount);
  const setReportUnreadCount = useGameStore(
    (state) => state.setReportUnreadCount,
  );
  const inbox = useGameStore((state) => state.inbox);
  const setInbox = useGameStore((state) => state.setInbox);
  const sentMail = useGameStore((state) => state.sentMail);
  const setSentMail = useGameStore((state) => state.setSentMail);
  const mailUnreadCount = useGameStore((state) => state.mailUnreadCount);
  const setMailUnreadCount = useGameStore((state) => state.setMailUnreadCount);
  const shopCatalog = useGameStore((state) => state.shopCatalog);
  const setShopCatalog = useGameStore((state) => state.setShopCatalog);
  const shopInventory = useGameStore((state) => state.shopInventory);
  const setShopInventory = useGameStore((state) => state.setShopInventory);
  const syncVersion = useGameStore((state) => state.syncVersion);
  const setSyncVersion = useGameStore((state) => state.setSyncVersion);
  const serverTownsById = useGameStore((state) => state.townsById);
  const setServerTowns = useGameStore((state) => state.setTowns);
  const upsertServerTown = useGameStore((state) => state.upsertTown);
  const resetGameStore = useGameStore((state) => state.resetGameStore);
  const [, setMissions] = useState<
    Array<{ text: string; value: number; goal: number }>
  >([
    { text: "CHIẾM 3 THÀNH PHỐ", value: 0, goal: 3 },
    { text: "GỬI 1 ĐẠO QUÂN HÀNH QUÂN", value: 0, goal: 1 },
    { text: "THAM GIA LIÊN MINH", value: 0, goal: 1 },
  ]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    () => localStorage.getItem("island_empire_avatar") || "emperor",
  );
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [toastMessage, setToastMessage] = useState(
    "CHỌN THÀNH CỦA BẠN ĐỂ RA LỆNH",
  );
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  function applyResourceSnapshot(snapshot: {
    resources?: Partial<ResourceBag>;
    resourceCapacity?: Partial<ResourceBag>;
    productionPerSecond?: Partial<ResourceBag>;
    resourceUpdatedAt?: string;
    serverTime?: string;
  }) {
    if (!snapshot.resources) return;
    const previous = economyClockRef.current;
    const resources = { ...previous.resources, ...snapshot.resources };
    const capacity = {
      ...previous.capacity,
      ...(snapshot.resourceCapacity || {}),
    };
    const productionPerSecond = {
      ...previous.productionPerSecond,
      ...(snapshot.productionPerSecond || {}),
    };
    economyClockRef.current = {
      resources,
      capacity,
      productionPerSecond,
      updatedAt: Date.now(),
    };
    setResources(resources);
  }

  // Tick every second for countdowns and smooth server-authoritative economy display.
  const [_tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      const economy = economyClockRef.current;
      const elapsedSeconds = Math.max(
        0,
        (Date.now() - economy.updatedAt) / 1000,
      );
      const next = { ...economy.resources };
      (Object.keys(next) as Array<keyof ResourceBag>).forEach((key) => {
        const capacity = Math.max(0, economy.capacity[key] || 0);
        const estimated =
          economy.resources[key] +
          (economy.productionPerSecond[key] || 0) * elapsedSeconds;
        const capped =
          capacity > 0 && economy.resources[key] < capacity
            ? Math.min(capacity, estimated)
            : economy.resources[key];
        next[key] = Math.floor(capped * 100) / 100;
      });
      setResources(next);
      setServerTowns((towns) =>
        towns.map((town: any) => {
          const rate = Math.max(0, Number(town.populationPerSecond || 0));
          const capacity = Math.max(
            0,
            Number(town.populationCapacity || town.population || 0),
          );
          if (
            rate <= 0 ||
            capacity <= 0 ||
            Number(town.population || 0) >= capacity
          )
            return town;
          return {
            ...town,
            population: Math.min(
              capacity,
              Math.floor((Number(town.population || 0) + rate) * 100) / 100,
            ),
            lastPopulationAt: new Date().toISOString(),
          };
        }),
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [selectedTown, setSelectedTown] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [newbiePhase, setNewbiePhase] = useState<string>("none");
  const [newbieSelectedRegion, setNewbieSelectedRegion] = useState<
    number | null
  >(null);
  const [kingdomCreationRegion, setKingdomCreationRegion] = useState<
    number | null
  >(null);
  const [coordinateSearch, setCoordinateSearch] = useState("");
  const [language, setLanguage] = useState<GameLanguage>(() =>
    detectDeviceLanguage(),
  );
  const [warReports, setWarReports] = useState<WarReportRecord[]>([]);
  const [mailDraft, setMailDraft] = useState({ to: "", title: "", body: "" });
  const [mailTab, setMailTab] = useState<"inbox" | "sent">("inbox");
  const [mailDetail, setMailDetail] = useState<PlayerMail | null>(null);
  const [mailBusyId, setMailBusyId] = useState<string | null>(null);
  const [initialSyncReady, setInitialSyncReady] = useState(false);
  const [realtimeToasts, setRealtimeToasts] = useState<
    Array<{ id: string; title: string; body: string; report?: BattleReport }>
  >([]);
  const t = useCallback(
    (key: Parameters<typeof translate>[1]) => translate(language, key),
    [language],
  );
  const setGameLanguage = useCallback((next: GameLanguage) => {
    saveLanguage(next);
    setLanguage(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("appName");
  }, [language, t]);
  const [deployTarget, setDeployTarget] = useState<{
    targetRegionId: number;
    isAttack: boolean;
    battleSide?: "attacker" | "defender";
  } | null>(null);
  const [deploySourceTown, setDeploySourceTown] = useState<any>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [marchSourceOptions, setMarchSourceOptions] = useState<
    MarchSourceOption[] | null
  >(null);
  const [activeModal, setActiveModal] = useState<string>("none");
  const [selectedBattleReport, setSelectedBattleReport] =
    useState<BattleReportData | null>(null);
  const [mobileMenu, setMobileMenu] = useState<"none" | "left" | "right">(
    "none",
  );
  const [leftTab, setLeftTab] = useState<"missions" | "kingdom">("missions");
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [minimapCollapsed, setMinimapCollapsed] = useState<boolean>(false);
  const [socketOnline, setSocketOnline] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const backendClearingStartRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const msg =
        event?.error?.stack ||
        event?.error?.message ||
        event?.message ||
        "Lỗi JavaScript không xác định";
      console.error("Global JS Error:", event);
      setRuntimeError(`[JS ERROR] ${msg}`);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg =
        event?.reason?.stack ||
        event?.reason?.message ||
        String(event?.reason) ||
        "Promise bị từ chối";
      console.error("Unhandled Rejection:", event.reason);
      setRuntimeError(`[ASYNC ERROR] ${msg}`);
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  const addWarReport = useCallback(
    (report: Omit<WarReportRecord, "time"> & { time?: number }) => {
      setWarReports((prev) => {
        const idx = prev.findIndex((item) => item.id === report.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = {
            ...copy[idx],
            ...report,
            time: report.time ?? copy[idx].time,
          };
          return copy;
        }
        return [{ ...report, time: report.time ?? Date.now() }, ...prev].slice(
          0,
          100,
        );
      });
    },
    [],
  );

  const addSystemLine = useCallback((message: string, level: "info" | "success" | "warning" | "battle" = "info") => {
    const next: ChatMessage = {
      id: crypto.randomUUID(),
      kind: "system",
      level,
      text: message,
      sentAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, next].slice(-150));
  }, []);

  const pushRealtimeToast = useCallback(
    (toast: {
      id: string;
      title: string;
      body: string;
      report?: BattleReport;
    }) => {
      setRealtimeToasts((current) =>
        [toast, ...current.filter((item) => item.id !== toast.id)].slice(0, 3),
      );
      window.setTimeout(() => {
        setRealtimeToasts((current) =>
          current.filter((item) => item.id !== toast.id),
        );
      }, 8000);
    },
    [],
  );

  const addPrivateReportMail = useCallback(
    (title: string, body: string) => {
      pushRealtimeToast({ id: `system-${Date.now()}`, title, body });
    },
    [pushRealtimeToast],
  );

  const sendPrivateMail = async () => {
    const to = mailDraft.to.trim();
    const title = mailDraft.title.trim() || "THƯ KHÔNG TIÊU ĐỀ";
    const body = mailDraft.body.trim();
    if (!token || !to || !body) return;
    try {
      const result = await sendPlayerMail(token, {
        recipientId: to,
        title,
        body,
        requestId: crypto.randomUUID(),
      });
      setSentMail((current) => [
        result.mail,
        ...current.filter((mail) => mail.id !== result.mail.id),
      ]);
      setMailDraft({ to: "", title: "", body: "" });
      setMailTab("sent");
      addSystemLine(`ĐÃ GỬI THƯ CÁ NHÂN ĐẾN ${result.mail.recipientName}`);
    } catch (error: any) {
      showGameError(error?.message || "Không thể gửi thư");
    }
  };

  const deleteMailItem = async (mail: PlayerMail) => {
    if (!token || mailBusyId) return;
    setMailBusyId(mail.id);
    try {
      await deletePlayerMail(token, mail.id);
      if (mailTab === "inbox") {
        setInbox((current) => current.filter((item) => item.id !== mail.id));
        if (!mail.readAt) {
          setMailUnreadCount((count) => Math.max(0, count - 1));
        }
      } else {
        setSentMail((current) => current.filter((item) => item.id !== mail.id));
      }
      setMailDetail((current) => (current?.id === mail.id ? null : current));
    } catch (error: any) {
      showGameError(error?.message || "Không thể xoá thư");
    } finally {
      setMailBusyId(null);
    }
  };

  const clearAllMail = async () => {
    if (!token) return;
    const list = mailTab === "inbox" ? inbox : sentMail;
    if (list.length === 0) return;
    if (
      !window.confirm(
        "Xoá toàn bộ thư trong mục này? Hành động không thể hoàn tác.",
      )
    ) {
      return;
    }
    try {
      await clearPlayerMail(token, mailTab);
      if (mailTab === "inbox") {
        setInbox([]);
        setMailUnreadCount(0);
      } else {
        setSentMail([]);
      }
      setMailDetail(null);
    } catch (error: any) {
      showGameError(error?.message || "Không thể xoá thư");
    }
  };

  const jumpToCoordinates = useCallback(() => {
    const matches = coordinateSearch.match(/-?\d+(?:\.\d+)?/g);
    if (!matches || matches.length < 2) {
      engineRef.current?.handleAction("setToast", {
        message: "NHẬP TỌA ĐỘ DẠNG X:Y, VÍ DỤ 13120:11063",
      });
      return;
    }
    const x = Math.round(Number(matches[0]));
    const y = Math.round(Number(matches[1]));
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      engineRef.current?.handleAction("setToast", {
        message: "TỌA ĐỘ KHÔNG HỢP LỆ",
      });
      return;
    }
    engineRef.current?.handleAction("centerCamera", {
      x,
      y,
      label: `X:${x} Y:${y}`,
    });
    setMobileMenu("none");
  }, [coordinateSearch]);

  useEffect(() => {
    if (!isNewbieMode()) return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);
    localStorage.removeItem(CLAIM_KEY);
    setToken(null);
    setPlayerId(null);
    setIsAuthenticated(false);
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (gameReady) {
      if (engineRef.current && minimapCanvasRef.current) {
        engineRef.current.handleAction(
          "setMinimapCanvas",
          minimapCanvasRef.current,
        );
      }
      const completed = localStorage.getItem(
        "island_empire_tutorial_completed",
      );
      if (completed !== "1") {
        setShowTutorial(true);
      }
    }
  }, [gameReady]);

  // 1. Fetch API Health
  useEffect(() => {
    let cancelled = false;
    setTargetProgress(15);
    getServerStatus()
      .then(() => {
        if (!cancelled) {
          setApiOnline(true);
          setTargetProgress(35);
        }
      })
      .catch(() => {
        if (!cancelled) setApiOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Auth is backend-only; gameplay state comes from world API + socket.
  useEffect(() => {
    if (!token) return;
    setIsAuthenticated(true);
  }, [token]);

  // 3. Initialize Game Canvas Engine
  useEffect(() => {
    if (!isAuthenticated) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (engineRef.current) {
      setTargetProgress(100);
      return;
    }
    setLoadingError(null);
    setLoadingText("ĐANG KHỞI TẠO BẢN ĐỒ THẾ GIỚI");
    setTargetProgress(65);
    let cancelled = false;
    let enteredGame = false;
    let loadingGuard: number | null = null;
    const enterGame = (message = "ĐÃ VÀO GAME, SERVER ĐANG ĐỒNG BỘ NỀN") => {
      if (cancelled || enteredGame) return;
      enteredGame = true;
      setLoadingText(message);
      setTargetProgress(100);
    };

    // Start engine with update callback
    engineRef.current = createIslandEmpireGame(
      canvas,
      (engineState, engineTowns) => {
        if (
          token &&
          Array.isArray(engineState.pendingBackendClearingStarts) &&
          engineState.pendingBackendClearingStarts.length > 0
        ) {
          engineState.pendingBackendClearingStarts.forEach(
            (regionId: number) => {
              if (backendClearingStartRef.current.has(regionId)) return;
              backendClearingStartRef.current.add(regionId);
              startClearing(token, engineToServerTerritoryId(regionId))
                .then((result) => {
                  engineRef.current?.handleAction("applyBackendClearing", {
                    clearing: result.clearing,
                  });
                  engineRef.current?.handleAction(
                    "consumeBackendClearingStarts",
                  );
                })
                .catch((err) => {
                  console.error("Backend clearing start failed:", err);
                  engineRef.current?.handleAction("markClearingRejected", {
                    regionId,
                    message: err.message || "Server từ chối xây thành",
                  });
                })
                .finally(() => {
                  backendClearingStartRef.current.delete(regionId);
                });
            },
          );
        }

        if (
          token &&
          Array.isArray(engineState.pendingBackendClaims) &&
          engineState.pendingBackendClaims.length > 0
        ) {
          engineState.pendingBackendClaims.forEach((regionId: number) => {
            if (backendClaimCompleteRef.current.has(regionId)) return;
            backendClaimCompleteRef.current.add(regionId);
            completeClearing(token, engineToServerTerritoryId(regionId))
              .then((result) => {
                if (result.territory) {
                  engineRef.current?.handleAction("applyWorldOwnership", {
                    territories: [
                      {
                        id: serverToEngineTerritoryId(result.territory.id),
                        ownerCode:
                          result.territory.ownerId === playerId ? 1 : 2,
                        ownerId: result.territory.ownerId,
                        ownerName:
                          result.territory.ownerId === playerId
                            ? "Bạn"
                            : (result.territory.ownerName ??
                              result.territory.ownerId ??
                              "Đối thủ"),
                        ownerFlagColor: result.territory.ownerFlagColor,
                        ownerEmblem: result.territory.ownerEmblem,
                        ownerAllianceTag: result.territory.ownerAllianceTag,
                        ownerAllianceEmblem:
                          result.territory.ownerAllianceEmblem,
                      },
                    ],
                  });
                }
                engineRef.current?.handleAction("consumeBackendClaim", {
                  regionId,
                });
              })
              .catch((err) => {
                console.error("Backend clearing complete failed:", err);
                if (
                  err?.message?.includes("chưa hoàn tất") ||
                  err?.message?.includes("not_ready")
                ) {
                  return;
                }
                engineRef.current?.handleAction("markClaimRejected", {
                  regionId,
                });
              })
              .finally(() => {
                backendClaimCompleteRef.current.delete(regionId);
              });
          });
        }

        if (
          token &&
          Array.isArray(engineState.pendingBackendConquests) &&
          engineState.pendingBackendConquests.length > 0
        ) {
          engineRef.current?.handleAction("consumeBackendConquests");
          refreshGameStateFromServer();
        }

        const now = Date.now();
        if (now - lastUpdateRef.current < 500) return;
        lastUpdateRef.current = now;

        const snapshots = lastHudSnapshotRef.current;
        const missionSnapshot = `${(engineState.missions || []).length}|${(engineState.missions || []).map((m: any) => `${m.value}/${m.goal}`).join(",")}`;
        if (missionSnapshot !== snapshots.missions) {
          snapshots.missions = missionSnapshot;
          setMissions([...(engineState.missions || [])]);
        }
        const recentLog = Array.isArray(engineState.log)
          ? engineState.log.slice(-8)
          : [];
        const chatSnapshot = `${recentLog.length}|${recentLog[recentLog.length - 1] || ""}`;
        if (chatSnapshot !== snapshots.chat) {
          snapshots.chat = chatSnapshot;
          const latestLine = recentLog[recentLog.length - 1];
          if (latestLine) addSystemLine(latestLine);
        }
        const metaSnapshot = `${engineState.toast || ""}|${engineState.newbiePhase || "none"}|${engineState.newbieSelectedRegion ?? ""}`;
        if (metaSnapshot !== snapshots.meta) {
          snapshots.meta = metaSnapshot;
          setToastMessage(engineState.toast || "");
          setNewbiePhase(engineState.newbiePhase || "none");
          setNewbieSelectedRegion(
            engineState.newbieSelectedRegion !== undefined &&
              engineState.newbieSelectedRegion !== null
              ? engineState.newbieSelectedRegion
              : null,
          );
        }

        if (Array.isArray(engineState.activeBattles)) {
          const battleSnapshot = `${engineState.activeBattles.length}|${engineState.activeBattles.map((b: any) => `${b.regionId}:${Math.round(b.t || 0)}`).join(",")}`;
          if (battleSnapshot !== snapshots.battles) {
            snapshots.battles = battleSnapshot;
            setWorldActivity((prev) => ({
              ...prev,
              battles: [...engineState.activeBattles],
            }));
          }
        }

        // Handle region selection
        if (
          engineState.selectedRegion !== null &&
          engineState.selectedRegion !== undefined
        ) {
          const id = engineState.selectedRegion;
          const regObj = engineRef.current?.getRegion?.(id);
          const isIslet = Boolean(regObj?.isIslet);
          const ownership =
            engineRef.current?.getRegionOwnership?.(id) ??
            engineState.regionOwnership?.[id] ??
            0;
          const regionSnapshot = `${id}|${isIslet ? 1 : 0}|${ownership}`;
          if (regionSnapshot !== snapshots.selectedRegion) {
            snapshots.selectedRegion = regionSnapshot;
            setSelectedRegion({ id, isIslet, ownership });
          }
        } else {
          if (snapshots.selectedRegion !== "none") {
            snapshots.selectedRegion = "none";
            setSelectedRegion(null);
          }
        }

        const selected = engineTowns.find(
          (t: any) => t.id === engineState.selected,
        );
        const townSnapshot = selected
          ? `${selected.id}|${selected.owner}|${selected.troops}|${selected.lvl}|${selected.population || 0}|${selected.infantryCount || 0}|${selected.cavalryCount || 0}|${selected.artilleryCount || 0}`
          : "none";
        if (townSnapshot !== snapshots.selectedTown) {
          snapshots.selectedTown = townSnapshot;
          setSelectedTown(selected ? { ...selected } : null);
        }
      },
      minimapCanvasRef.current,
      (actionId, payload) => {
        engineRef.current?.handleAction("setUiOverlayActive", { active: true });
        setActiveModal(actionId);
      },
      (report: BattleReportData) => {
        setSelectedBattleReport(report);
      },
      { layout: conquestMode ? "conquest" : "world" },
    );
    engineRef.current?.handleAction?.("setLocalPlayer", {
      playerId,
      playerName: "Bạn",
    });

    if (token && playerId) {
      setInitialSyncReady(false);
      engineRef.current?.handleAction?.("prepareBackendWorld");
      setLoadingText("ĐANG TẢI LÃNH THỔ, TÀI NGUYÊN VÀ HÀNH QUÂN");
      setTargetProgress(85);
      // Wait for the authoritative state before showing the map. Entering
      // after 4s used to expose a reset client state while the server fetch
      // was still pending, which looked like marches had been lost on reload.
      loadingGuard = window.setTimeout(() => {
        enterGame("SERVER ĐANG ĐỒNG BỘ CHẬM, ĐANG TIẾP TỤC TẢI DỮ LIỆU");
      }, 12000);
      const fetchWorldData = Promise.race([
        getPlayerSync(token).then((sync) => {
          applyPlayerSync(sync);
          return sync.gameState;
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Server timeout 15s")), 15000),
        ),
      ]);

      fetchWorldData
        .then((world) => {
          const effectivePlayerId =
            world.playerId && world.playerId !== playerId
              ? world.playerId
              : playerId;
          if (world.playerId && world.playerId !== playerId) {
            localStorage.setItem(PLAYER_ID_KEY, world.playerId);
            setPlayerId(world.playerId);
          }
          const territories = world.territories.map((territory) => ({
            id: serverToEngineTerritoryId(territory.id),
            ownerCode:
              territory.ownerId === null
                ? 0
                : territory.ownerId === effectivePlayerId
                  ? 1
                  : 2,
            ownerId: territory.ownerId,
            ownerName:
              territory.ownerId === null
                ? ""
                : territory.ownerId === effectivePlayerId
                  ? "Bạn"
                  : (territory.ownerName ?? territory.ownerId),
            ownerFlagColor: territory.ownerFlagColor,
            ownerEmblem: territory.ownerEmblem,
            ownerAllianceTag: territory.ownerAllianceTag,
            ownerAllianceEmblem: territory.ownerAllianceEmblem,
            settlementKind: territory.settlementKind,
          }));
          engineRef.current?.handleAction("applyGameState", {
            territories: conquestMode ? [] : territories,
            clearings: conquestMode ? [] : world.clearings,
            marches: conquestMode ? [] : world.marches,
            battles: conquestMode
              ? []
              : mapServerBattlesForClient(world.battles || []),
            towns: conquestMode ? [] : world.towns,
            resources: world.resources,
            newbieShieldUntil: world.newbieShieldUntil,
            playerProfile: world.playerProfile,
          });
          // A second pass is intentional: town/ownership hydration can create
          // the endpoints required to render a persisted march after reload.
          window.setTimeout(() => {
            if (!cancelled && world.marches?.length) {
              world.marches.forEach((march: any) => {
                try {
                  engineRef.current?.handleAction("applyBackendMarch", {
                    march,
                  });
                } catch (e) {
                  console.warn("Failed to re-apply march on second pass:", e);
                }
              });
              const ownMarch = world.marches.find(
                (march: any) => march.ownerId === playerId,
              );
              if (ownMarch) {
                engineRef.current?.handleAction("focusBackendMarch", {
                  marchId: ownMarch.id,
                });
              } else {
                const ownClearing = world.clearings.find(
                  (clearing: any) => clearing.playerId === playerId,
                );
                if (ownClearing) {
                  engineRef.current?.handleAction("focusBackendClearing", {
                    territoryId: ownClearing.territoryId,
                  });
                }
              }
            }
          }, 180);
          applyResourceSnapshot(world);
          setNationStatus(world.nationStatus || null);
          setServerTowns(
            (world.towns || []).map((town: any) =>
              normalizeTownForClient(town),
            ),
          );
          setInitialSyncReady(true);
          setWorldActivity({
            marches: world.marches,
            clearings: world.clearings,
            battles: mapServerBattlesForClient(world.battles || []),
            territoryById: Object.fromEntries(
              world.territories.map((territory: any) => [
                serverToEngineTerritoryId(territory.id),
                territory,
              ]),
            ),
          });
          setServerHud(summarizeBackendHud(world, playerId, world.resources));
          setMissions([
            {
              text: "SỞ HỮU 3 LÃNH THỔ",
              value: Math.min(
                territories.filter((territory) => territory.ownerCode === 1)
                  .length,
                3,
              ),
              goal: 3,
            },
            {
              text: "CÓ 1 ĐẠO QUÂN ĐANG HÀNH QUÂN",
              value: Math.min(
                world.marches.filter((march: any) => march.ownerId === playerId)
                  .length,
                1,
              ),
              goal: 1,
            },
            {
              text: "HOÀN TẤT 1 XÂY THÀNH",
              value: Math.min(
                territories.filter((territory) => territory.ownerCode === 1)
                  .length,
                1,
              ),
              goal: 1,
            },
          ]);
          const hasOwnedTerritory = territories.some(
            (territory) => territory.ownerCode === 1,
          );
          const hasOwnClearing = world.clearings.some(
            (clearing: any) => clearing.playerId === playerId,
          );
          if (!hasOwnedTerritory && !hasOwnClearing) {
            localStorage.setItem(ONBOARDING_KEY, "1");
            setKingdomCreationRegion(null);
          }
          if (localStorage.getItem(ONBOARDING_KEY) === "1") {
            const owned = territories.find((t) => t.ownerCode === 1);
            if (owned) {
              engineRef.current?.handleAction("setStarterRegion", {
                regionId: owned.id,
                zoom: 1.18,
              });
              localStorage.removeItem(ONBOARDING_KEY);
            } else {
              const starterRegionId = pickStarterTerritoryId(
                playerId,
                territories,
              );
              if (starterRegionId !== null) {
                engineRef.current?.handleAction("setStarterRegion", {
                  regionId: starterRegionId,
                  zoom: 1.18,
                });
              }
            }
          }
          setLoadingText("ĐÃ ĐỒNG BỘ XONG, ĐANG VÀO GAME");
          enterGame("ĐÃ ĐỒNG BỘ XONG, ĐANG VÀO GAME");
          getGameConfig()
            .then((config) =>
              engineRef.current?.handleAction("applyConfig", { config }),
            )
            .catch((err) =>
              console.warn(
                "Could not load game config, using engine defaults:",
                err,
              ),
            );
        })
        .catch((err) => {
          console.warn(
            "Could not load backend world ownership, fallback to offline engine:",
            err,
          );
          if (
            err?.message?.includes("401") ||
            err?.message?.includes("unauthorized") ||
            err?.message?.includes("not_found")
          ) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(PLAYER_ID_KEY);
            setToken(null);
            setPlayerId(null);
          }
          enterGame("ĐÃ VÀO GAME CHẾ ĐỘ TRỰC TIẾP");
          refreshGameStateWithRetry("initial-load-retry", 4, 1200);
        });
    } else {
      setLoadingText("ĐANG VÀO CHẾ ĐỘ KHÁCH");
      window.setTimeout(() => enterGame("ĐÃ VÀO CHẾ ĐỘ KHÁCH"), 240);
    }

    return () => {
      cancelled = true;
      if (loadingGuard) window.clearTimeout(loadingGuard);
      engineRef.current?.destroy();
      engineRef.current = null;
      setGameReady(false);
    };
  }, [isAuthenticated, token, playerId]);

  const refreshChatHistory = useCallback(async () => {
    if (!token) return;
    try {
      const history = await getChatHistory(token);
      setChatMessages((current) => {
        const byId = new Map(current.map((message) => [message.id, message]));
        history.messages.forEach((message) => byId.set(message.id, message));
        return [...byId.values()]
          .sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt))
          .slice(-150);
      });
    } catch (error) {
      console.warn("Không tải được lịch sử chat:", error);
    }
  }, [token]);

  useEffect(() => {
    void refreshChatHistory();
  }, [refreshChatHistory]);

  useEffect(() => {
    if (!isAuthenticated || !token || !playerId || !initialSyncReady) return;
    return connectGameSocket(
      token,
      (event) => {
        if (event.type === "chat_message") {
          setChatMessages((prev) => {
            if (prev.some((message) => message.id === event.message.id)) return prev;
            return [...prev, event.message].slice(-150);
          });
          return;
        }
        if (event.type === "hello") {
          setSocketOnline(true);
          socketHelloCountRef.current += 1;
          if (socketHelloCountRef.current > 1) {
            void refreshChatHistory();
            // Đây là lần kết nối LẠI (sau server reload / mất mạng)
            // → Fetch toàn bộ game state để phục hồi:
            //   quân đang hành quân, xây thành đang chạy, trận đánh v.v.
            // Delay nhỏ để WebSocket handshake hoàn tất trước.
            setTimeout(
              () => refreshGameStateFromServer("socket-reconnect", true),
              500,
            );
          }
        }
        if (event.type === "player_state_updated") {
          applyRealtimePlayerState(event);
        }
        if (event.type === "troop_recovery_updated") {
          applyRealtimePlayerState(event);
          const recovered = event.updates.reduce(
            (sum, update) => sum + update.recovered,
            0,
          );
          if (recovered > 0) {
            setToastMessage(`ĐÃ BỔ SUNG ${recovered} QUÂN TỪ CÁC LÃNH THỔ`);
          }
          return;
        }
        if ("version" in event && typeof event.version === "number") {
          const currentVersion = useGameStore.getState().syncVersion;
          if (event.version < currentVersion) return;
          setSyncVersion(Math.max(currentVersion, event.version));
        }
        if (event.type === "nation_state_updated") {
          setNationStatus(event.state);
          syncShopInventoryToEngine(
            useGameStore.getState().shopInventory,
            event.state,
          );
          return;
        }
        if (event.type === "army_state_updated") {
          setArmyState(event.state);
          return;
        }
        if (event.type === "battle_report_created") {
          setBattleReports((current) => [
            event.report,
            ...current.filter((report) => report.id !== event.report.id),
          ]);
          setReportUnreadCount(event.unreadCount);
          const won = event.report.winnerId === playerId;
          pushRealtimeToast({
            id: `report-${event.report.id}`,
            title: won ? "CHIẾN THẮNG" : "CHIẾN BÁO MỚI",
            body: `${event.report.territoryName}: ${won ? "quân ta giành thắng lợi" : "trận đánh đã kết thúc"}.`,
            report: event.report,
          });
          return;
        }
        if (event.type === "battle_report_read") {
          setReportUnreadCount(event.unreadCount);
          if (event.reportId) {
            setBattleReports((current) =>
              current.map((report) =>
                report.id === event.reportId
                  ? { ...report, read: true }
                  : report,
              ),
            );
          }
          return;
        }
        if (event.type === "mail_received") {
          setInbox((current) => [
            event.mail,
            ...current.filter((mail) => mail.id !== event.mail.id),
          ]);
          setMailUnreadCount(event.unreadCount);
          if (event.mail.title !== "Báo cáo tài nguyên offline") {
            pushRealtimeToast({
              id: `mail-${event.mail.id}`,
              title: `THƯ MỚI TỪ ${event.mail.senderName}`,
              body: event.mail.title,
            });
          }
          return;
        }
        if (event.type === "mail_read") {
          setMailUnreadCount(event.unreadCount);
          if (event.mailId) {
            setInbox((current) =>
              current.map((mail) =>
                mail.id === event.mailId
                  ? { ...mail, readAt: event.serverTime }
                  : mail,
              ),
            );
          }
          return;
        }
        if (event.type === "shop_purchase_completed") {
          setShopInventory(event.inventory);
          syncShopInventoryToEngine(event.inventory);
          applyResourceSnapshot({ resources: event.resources });
          engineRef.current?.handleAction("syncResources", {
            resources: event.resources,
          });
          return;
        }
        if (event.type === "shop_inventory_updated") {
          setShopInventory(event.inventory);
          syncShopInventoryToEngine(event.inventory);
          return;
        }
        if (event.type === "battle_resolved") {
          if (event.territory) {
            const engTerritoryId = serverToEngineTerritoryId(
              event.territory.id,
            );
            const isMine = event.territory.ownerId === playerId;
            engineRef.current?.handleAction("applyWorldOwnership", {
              territories: [
                {
                  id: engTerritoryId,
                  ownerCode: isMine ? 1 : event.territory.ownerId ? 2 : 0,
                  ownerId: event.territory.ownerId,
                  ownerName: isMine
                    ? "Bạn"
                    : (event.territory.ownerName ?? "Đối thủ"),
                  ownerFlagColor: event.territory.ownerFlagColor,
                  ownerEmblem: event.territory.ownerEmblem,
                  ownerAllianceTag: event.territory.ownerAllianceTag,
                  ownerAllianceEmblem: event.territory.ownerAllianceEmblem,
                },
              ],
            });
          }

          if (event.report) {
            const rep = event.report;
            const isAttacker = rep.attackerId === playerId;
            const isDefender = rep.defenderId === playerId;
            if (isAttacker || isDefender) {
              const isWinner = isAttacker
                ? rep.isAttackerWin
                : !rep.isAttackerWin;
              const reportTitle = isWinner
                ? `CHIẾN THẮNG TẠI LÃNH THỔ #${rep.regionId + 1}`
                : `THẤT THỦ TẠI LÃNH THỔ #${rep.regionId + 1}`;
              const myCasualties = isAttacker
                ? rep.attacker?.casualty?.power
                : rep.defender?.casualty?.power;
              const reportBody = isWinner
                ? `Bạn đã dành chiến thắng! Tiêu diệt quân đối phương. Tổn thất của bạn: -${myCasualties || 0} quân.`
                : `Bị đánh bại tại trận địa. Quân số tổn thất: -${myCasualties || 0} quân.`;

              addWarReport({
                id: rep._id || `report-${Date.now()}`,
                kind: "battle",
                title: reportTitle,
                body: reportBody,
                meta: `Bấm để xem chi tiết tổn thất và quân còn lại`,
                detailReport: rep,
              });

              showGameError(
                isWinner
                  ? `CHIẾN THẮNG! BẠN ĐÃ THẮNG TRẬN TẠI LÃNH THỔ #${rep.regionId + 1}`
                  : `THẤT THỦ! LÃNH THỔ #${rep.regionId + 1} BỊ ĐÁNH BẠI`,
              );
            }
          }
        }
        if (event.type === "territory_claimed") {
          addWarReport({
            id: `socket-claim-${event.territory.id}-${event.territory.ownerId}`,
            kind: "clearing",
            title: `${event.territory.ownerId === playerId ? "Bạn" : event.territory.ownerName || "Người chơi"} đã chiếm ${territoryLabel(serverToEngineTerritoryId(event.territory.id))}`,
            body:
              event.territory.ownerId === playerId
                ? "Xây thành hoàn tất. Thành trì mới đã sẵn sàng nhận lệnh."
                : "Một lãnh thổ trên thế giới vừa đổi chủ.",
            meta: `Tọa độ X:${event.territory.x} Y:${event.territory.y}`,
            isMine: event.territory.ownerId === playerId,
          });
          if (event.territory.ownerId === playerId) {
            addPrivateReportMail(
              `Lãnh thổ mới: ${territoryLabel(serverToEngineTerritoryId(event.territory.id))}`,
              "Xây thành hoàn tất qua đồng bộ server. Vùng đất đã thuộc quyền kiểm soát của bạn.",
            );
            refreshGameStateWithRetry("stronghold-completed", 3, 300);
          }
          engineRef.current?.handleAction("applyWorldOwnership", {
            territories: [
              {
                id: serverToEngineTerritoryId(event.territory.id),
                ownerCode: event.territory.ownerId === playerId ? 1 : 2,
                ownerId: event.territory.ownerId,
                ownerName:
                  event.territory.ownerId === playerId
                    ? "Bạn"
                    : (event.territory.ownerName ??
                      event.territory.ownerId ??
                      "Đối thủ"),
                ownerFlagColor: event.territory.ownerFlagColor,
                ownerEmblem: event.territory.ownerEmblem,
                ownerAllianceTag: event.territory.ownerAllianceTag,
                ownerAllianceEmblem: event.territory.ownerAllianceEmblem,
                settlementKind: event.territory.settlementKind,
                equippedCapitalSkin: event.territory.equippedCapitalSkin,
                equippedDistrictSkin: event.territory.equippedDistrictSkin,
              },
            ],
          });
          setWorldActivity((prev) => ({
            ...prev,
            clearings: prev.clearings.filter(
              (clearing) =>
                clearing.territoryId !==
                serverToEngineTerritoryId(event.territory.id),
            ),
            territoryById: {
              ...prev.territoryById,
              [serverToEngineTerritoryId(event.territory.id)]: event.territory,
            },
          }));
          setServerHud((prev) => ({
            ...prev,
            ownedTerritories:
              prev.ownedTerritories +
              (event.territory.ownerId === playerId ? 1 : 0),
            enemyTerritories:
              prev.enemyTerritories +
              (event.territory.ownerId && event.territory.ownerId !== playerId
                ? 1
                : 0),
            activeClearings: Math.max(0, prev.activeClearings - 1),
            ownClearings: Math.max(
              0,
              prev.ownClearings -
                (event.territory.ownerId === playerId ? 1 : 0),
            ),
            lastSync: Date.now(),
          }));
        }
        if (event.type === "territory_clearing_started") {
          addWarReport({
            id: `socket-clearing-${event.clearing.territoryId}-${event.clearing.playerId}`,
            kind: "clearing",
            title: `${event.clearing.playerId === playerId ? "Bạn" : "Người chơi"} bắt đầu xây thành ${territoryLabel(serverToEngineTerritoryId(event.clearing.territoryId))}`,
            body: "Một nông dân đã được điều động tới vùng đất hoang. Khi hoàn tất, lãnh thổ sẽ đổi chủ.",
            meta: `Hoàn tất sau ${formatTimeLeft(event.clearing.completesAt)}`,
            isMine: event.clearing.playerId === playerId,
          });
          engineRef.current?.handleAction("applyBackendClearing", {
            clearing: event.clearing,
          });
          setWorldActivity((prev) => ({
            ...prev,
            clearings: [
              ...prev.clearings.filter(
                (clearing) =>
                  clearing.territoryId !== event.clearing.territoryId,
              ),
              event.clearing,
            ],
          }));
          setServerHud((prev) => ({
            ...prev,
            activeClearings: prev.activeClearings + 1,
            ownClearings:
              prev.ownClearings +
              (event.clearing.playerId === playerId ? 1 : 0),
            lastSync: Date.now(),
          }));
        }
        if (event.type === "territory_clearing_cancelled") {
          const canvasId = serverToEngineTerritoryId(event.territoryId);
          engineRef.current?.handleAction("cancelClaimRegion", canvasId);
          setWorldActivity((prev) => ({
            ...prev,
            clearings: prev.clearings.filter(
              (clearing) => clearing.territoryId !== event.territoryId,
            ),
          }));
          setServerHud((prev) => ({
            ...prev,
            activeClearings: Math.max(0, prev.activeClearings - 1),
            ownClearings: Math.max(
              0,
              prev.ownClearings - (event.playerId === playerId ? 1 : 0),
            ),
            lastSync: Date.now(),
          }));
        }
        if (event.type === "march_created") {
          addWarReport({
            id: `socket-march-${event.march.id}`,
            kind: event.march.kind === "attack" ? "battle" : "march",
            title: `${event.march.ownerId === playerId ? "Bạn" : "Đối thủ"} ${event.march.kind === "reinforce" ? "gửi tiếp viện" : "phát binh"} đến ${territoryLabel(serverToEngineTerritoryId(event.march.toTerritoryId))}`,
            body: `${formatNum(event.march.troops || 0)} quân đang hành quân bằng ${event.march.usesShip ? "đường biển" : "đường bộ"}.`,
            meta: `${event.march.distanceKm ?? 0}km · đến ${formatTimeLeft(event.march.arrivesAt)}`,
            isMine: event.march.ownerId === playerId,
          });
          if (event.march.ownerId === playerId) {
            addPrivateReportMail(
              event.march.kind === "reinforce"
                ? "Lệnh tiếp viện đã xuất phát"
                : "Lệnh tấn công đã xuất phát",
              `${formatNum(event.march.troops || 0)} quân đang di chuyển tới ${territoryLabel(serverToEngineTerritoryId(event.march.toTerritoryId))}. Dự kiến đến nơi sau ${formatTimeLeft(event.march.arrivesAt)}.`,
            );
          }
          engineRef.current?.handleAction("applyBackendMarch", {
            march: event.march,
          });
          if (event.sourceTown && event.march.ownerId === playerId) {
            const normalized = normalizeTownForClient(event.sourceTown);
            setServerTowns((prev) => [
              ...prev.filter((town) => town.id !== normalized.id),
              normalized,
            ]);
            engineRef.current?.handleAction("applyBackendTownSnapshots", {
              towns: [normalized],
            });
          }
          setWorldActivity((prev) => ({
            ...prev,
            marches: [
              ...prev.marches.filter((march) => march.id !== event.march.id),
              event.march,
            ],
          }));
          setToastMessage(
            event.march.ownerId === playerId
              ? "Lệnh hành quân đã gửi lên server"
              : "Có đội quân đang hành quân trên bản đồ",
          );
          setServerHud((prev) => ({
            ...prev,
            activeMarches: prev.activeMarches + 1,
            ownMarches:
              prev.ownMarches + (event.march.ownerId === playerId ? 1 : 0),
            outboundTroops:
              prev.outboundTroops +
              (event.march.ownerId === playerId ? event.march.troops || 0 : 0),
            lastSync: Date.now(),
          }));
        }
        if (event.type === "march_removed") {
          engineRef.current?.handleAction("removeBackendMarch", {
            marchId: event.marchId,
          });
          setWorldActivity((prev) => ({
            ...prev,
            marches: prev.marches.filter(
              (march) =>
                (march.id || march._id || march.marchId) !== event.marchId,
            ),
          }));
          setServerHud((prev) => ({ ...prev, lastSync: Date.now() }));
        }
        if (event.type === "battle_started") {
          const isMyBattle =
            event.battle.attackerId === playerId ||
            event.battle.defenderId === playerId;
          addWarReport({
            id: `socket-battle-${event.battle.id}`,
            kind: "battle",
            title: `Công thành ${territoryLabel(serverToEngineTerritoryId(event.battle.regionId))}`,
            body: `Công ${formatNum(event.battle.attackerPower)} / Thủ ${formatNum(event.battle.defenderPower)}. Trận đánh sẽ do server tổng kết.`,
            meta: `Kết thúc sau ${formatTimeLeft(event.battle.resolvesAt)}`,
            isMine: isMyBattle,
          });
          setWorldActivity((prev) => ({
            ...prev,
            marches: event.consumedMarchId
              ? prev.marches.filter(
                  (march) =>
                    (march.id || march._id || march.marchId) !==
                    event.consumedMarchId,
                )
              : prev.marches,
            battles: (() => {
              const incoming = {
                ...event.battle,
                regionId: serverToEngineTerritoryId(event.battle.regionId),
              };
              const current = prev.battles.find(
                (battle) => battle.id === event.battle.id,
              );
              if (!isNewerBattleSnapshot(incoming, current))
                return prev.battles;
              return [
                ...prev.battles.filter(
                  (battle) => battle.id !== event.battle.id,
                ),
                incoming,
              ];
            })(),
          }));
          if (event.consumedMarchId) {
            engineRef.current?.handleAction("removeBackendMarch", {
              marchId: event.consumedMarchId,
            });
          }
          engineRef.current?.handleAction("applyBackendBattles", {
            battles: [event.battle],
            merge: true,
          });
        }
        if (event.type === "battle_state_updated") {
          const battles = mapServerBattlesForClient(event.battles);
          setWorldActivity((prev) => {
            const currentById = new Map(
              prev.battles.map((battle: any) => [battle.id, battle]),
            );
            return {
              ...prev,
              battles: battles.map((battle: any) => {
                const current = currentById.get(battle.id);
                return isNewerBattleSnapshot(battle, current)
                  ? battle
                  : current;
              }),
            };
          });
          engineRef.current?.handleAction("applyBackendBattles", {
            battles: event.battles,
            merge: false,
          });
          return;
        }
        if (event.type === "battle_resolved") {
          if (event.territory) {
            const engineRegId = serverToEngineTerritoryId(event.territory.id);
            const isMe = event.territory.ownerId === playerId;
            const ownerCode =
              event.territory.ownerId === null ? 0 : isMe ? 1 : 2;
            engineRef.current?.handleAction("applyWorldOwnership", {
              territories: [
                {
                  id: engineRegId,
                  ownerCode,
                  ownerId: event.territory.ownerId,
                  ownerName: isMe
                    ? "Bạn"
                    : (event.territory.ownerName ?? "Đối thủ"),
                  ownerFlagColor: event.territory.ownerFlagColor,
                  ownerEmblem: event.territory.ownerEmblem,
                  ownerAllianceTag: event.territory.ownerAllianceTag,
                  ownerAllianceEmblem: event.territory.ownerAllianceEmblem,
                  settlementKind: event.territory.settlementKind,
                  equippedCapitalSkin: event.territory.equippedCapitalSkin,
                  equippedDistrictSkin: event.territory.equippedDistrictSkin,
                },
              ],
            });
          }
          addWarReport({
            id: `socket-battle-resolved-${event.battleId || Date.now()}`,
            kind: "battle",
            title:
              event.winner === "attacker"
                ? "Công thành thắng lợi"
                : "Thủ thành thành công",
            body: `${event.territory?.id !== undefined ? territoryLabel(serverToEngineTerritoryId(event.territory.id)) : "Lãnh thổ"} đã được server tổng kết.`,
            meta:
              event.winner === "attacker"
                ? "Quyền sở hữu đã cập nhật"
                : "Thành vẫn được giữ",
            isMine: event.territory?.ownerId === playerId,
          });
          setWorldActivity((prev) => ({
            ...prev,
            battles: prev.battles.filter(
              (battle) => battle.id !== event.battleId,
            ),
          }));
          engineRef.current?.handleAction("removeBackendBattle", {
            battleId: event.battleId,
          });
        }
        if (event.type === "player_eliminated" && event.playerId === playerId) {
          localStorage.setItem(ONBOARDING_KEY, "1");
          setKingdomCreationRegion(null);
          setSelectedTown(null);
          setSelectedRegion(null);
          applyResourceSnapshot({
            resources: {
              gold: 0,
              wood: 0,
              stone: 0,
              food: 0,
              iron: 0,
              coal: 0,
              sulfur: 0,
              gems: 0,
            },
            resourceCapacity: {
              gold: 0,
              wood: 0,
              stone: 0,
              food: 0,
              iron: 0,
              coal: 0,
              sulfur: 0,
              gems: 0,
            },
            productionPerSecond: {
              gold: 0,
              wood: 0,
              stone: 0,
              food: 0,
              iron: 0,
              coal: 0,
              sulfur: 0,
              gems: 0,
            },
          });
          engineRef.current?.handleAction("setToast", {
            message: "BẠN ĐÃ MẤT HẾT THÀNH. CHỌN VÙNG ĐẤT MỚI ĐỂ LÀM LẠI",
          });
          addPrivateReportMail(
            "Vương quốc thất thủ",
            "Bạn đã mất toàn bộ thành trì. Tài nguyên và quân đội bị xóa, hãy chọn một vùng đất hoang để lập lại vương quốc.",
          );
        }
        if (event.type === "territories_pruned") {
          refreshGameStateFromServer("territories-pruned");
          if (
            event.playerId === playerId &&
            Array.isArray(event.prunedTerritoryIds)
          ) {
            showGameError(
              `⚠️ Mắt xích lãnh thổ bị đứt! ${event.prunedTerritoryIds.length} Quân khu cô lập đã bị phá hủy hoàn toàn!`,
            );
            addPrivateReportMail(
              "Cảnh báo cô lập lãnh thổ",
              `Mắt xích giao thông kết nối bị đứt đoạn. ${event.prunedTerritoryIds.length} Quân khu bị cô lập đằng sau đã bị giải phóng trở lại đất hoang.`,
            );
          }
        }
        if (event.type === "world_state_hint") {
          refreshGameStateFromServer("socket-hint");
        }
        if (event.type === "resync_required") {
          refreshGameStateWithRetry(`socket-${event.reason}`, 4, 600);
        }
      },
      setSocketOnline,
    );
  }, [isAuthenticated, token, playerId, initialSyncReady, refreshChatHistory]);

  const handleLoginSuccess = (newToken: string, newPlayerId: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(PLAYER_ID_KEY, newPlayerId);
    setToken(newToken);
    setPlayerId(newPlayerId);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);
    setToken(null);
    setPlayerId(null);
    setIsAuthenticated(false);
    setGameReady(false);
    setLoadingError(null);
    setLoadingText("ĐANG KIỂM TRA MÁY CHỦ");
    resetGameStore();
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
  };

  const isUiOverlayVisible =
    Boolean(deployTarget) ||
    Boolean(selectedTown && selectedTown.owner === 0) ||
    activeModal === "army" ||
    activeModal === "kingdom" ||
    activeModal === "treasure" ||
    activeModal === "shop" ||
    activeModal === "ally" ||
    activeModal === "warReport" ||
    activeModal === "war_reports" ||
    activeModal === "mail" ||
    activeModal === "settings" ||
    activeModal === "chat" ||
    activeModal === "tutorial" ||
    showTutorial ||
    kingdomCreationRegion !== null ||
    (newbiePhase === "choose_banner" && newbieSelectedRegion !== null);

  useEffect(() => {
    engineRef.current?.handleAction("setUiOverlayActive", {
      active: isUiOverlayVisible,
    });
  }, [isUiOverlayVisible]);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen?.()
        .catch((err) => console.log(err));
    } else {
      document.exitFullscreen?.().catch((err) => console.log(err));
    }
  };

  const handleAction = (actionId: string) => {
    engineRef.current?.handleAction(actionId);
  };

  const openModal = useCallback((modalId: string) => {
    engineRef.current?.handleAction("setUiOverlayActive", { active: true });
    setActiveModal(modalId);
  }, []);

  const closeModal = useCallback(() => {
    engineRef.current?.handleAction("setUiOverlayActive", { active: false });
    setActiveModal("none");
  }, []);

  const showGameError = (message: string) => {
    pushRealtimeToast({
      id: `notice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: "THÔNG BÁO",
      body: message,
    });
  };

  const normalizeTownForClient = (town: any) => {
    if (!town) return town;
    const level = Math.max(
      1,
      Math.floor(Number(town.lvl ?? town.level ?? 1) || 1),
    );
    return {
      ...town,
      lvl: level,
      level,
      owner:
        town.owner ?? (town.ownerId ? (town.ownerId === playerId ? 0 : 1) : 0),
      buildings: { ...(town.buildings || {}) },
      storage: { ...(town.storage || {}) },
    };
  };

  const mergeTownWithServer = (town: any) => {
    if (!town) return town;
    const serverTown = serverTownsById[Number(town.id)];
    const merged = { ...town, ...(serverTown || {}) };
    if (
      town.owner === 0 ||
      town.ownerCode === 1 ||
      (playerId && town.ownerId === playerId)
    ) {
      merged.owner = 0;
      merged.ownerCode = 1;
      if (playerId) merged.ownerId = playerId;
    }
    return normalizeTownForClient(merged);
  };

  const isEligibleSourceTown = (town: any) => {
    if (!town) return false;
    return Boolean(
      engineRef.current?.isPlayerOwnedTown?.(town) ||
      (playerId &&
        (town.ownerId === playerId ||
          serverTownsById[Number(town.id)]?.ownerId === playerId)),
    );
  };

  const getValidSourceTown = () => {
    const engine = engineRef.current;
    if (!engine) return null;
    if (isEligibleSourceTown(deploySourceTown)) {
      return mergeTownWithServer(deploySourceTown);
    }
    if (isEligibleSourceTown(selectedTown)) {
      return mergeTownWithServer(selectedTown);
    }
    const knownTowns = engine.getTowns?.() || [];
    const ownedTowns = [
      ...(engine.getPlayerOwnedTowns?.() || []),
      ...Object.values(serverTownsById)
        .filter((town: any) => playerId && town?.ownerId === playerId)
        .map((town: any) => ({
          ...(knownTowns.find((candidate: any) => candidate.id === town.id) ||
            {}),
          ...town,
          owner: 0,
        })),
    ].filter(
      (town, index, list) =>
        isEligibleSourceTown(town) &&
        list.findIndex((candidate: any) => candidate.id === town.id) === index,
    );
    if (ownedTowns.length > 0) {
      const sorted = [...ownedTowns].sort(
        (a: any, b: any) => (b.troops || 0) - (a.troops || 0),
      );
      return mergeTownWithServer(sorted[0]);
    }
    return engine.getSourceTown?.() || null;
  };

  const loadRecommendedMarchSource = async (
    targetRegionId: number,
    kind: "attack" | "reinforce" | "move",
  ) => {
    if (!token || !engineRef.current) return null;
    const result = await getMarchSourceOptions(
      token,
      engineToServerTerritoryId(targetRegionId),
      kind,
    );
    setMarchSourceOptions(result.sources);
    const recommended =
      result.sources.find(
        (source) => source.townId === result.recommendedTownId,
      ) || result.sources.find((source) => source.valid);
    if (!recommended) {
      setDeployError(
        "Không có thành nào đủ điều kiện xuất quân tới lãnh thổ này",
      );
      return null;
    }
    const ownedTowns = engineRef.current.getPlayerOwnedTowns?.() || [];
    const town =
      ownedTowns.find(
        (candidate: any) => Number(candidate.id) === Number(recommended.townId),
      ) ||
      ownedTowns.find(
        (candidate: any) =>
          engineToServerTerritoryId(
            engineRef.current?.getTownRegionId?.(candidate) ?? -1,
          ) === recommended.territoryId,
      );
    return town ? mergeTownWithServer(town) : null;
  };

  function syncShopInventoryToEngine(
    inventory: typeof shopInventory,
    nation = useGameStore.getState().nationStatus,
  ) {
    const nationTowns = nation?.towns || [];
    const explicitCapitalTowns = nationTowns.filter(
      (town) => town.kind === "capital" || town.kind === "sub_capital",
    );
    const capitalTowns =
      explicitCapitalTowns.length > 0
        ? explicitCapitalTowns
        : nationTowns.slice(0, 1);
    const capitalTerritoryIds = capitalTowns
      .map((town) => serverToEngineTerritoryId(Number(town.territoryId)))
      .filter(Number.isFinite);
    const capitalTownIds = capitalTowns
      .map((town) => Number(town.townId))
      .filter(Number.isFinite);
    engineRef.current?.handleAction("setShopInventory", {
      inventory,
      capitalTerritoryIds,
      capitalTownIds,
    });
  }

  function applyPlayerSync(sync: PlayerSyncResult) {
    setNationStatus(sync.nationState);
    setArmyState(sync.armyState);
    setBattleReports(sync.reports);
    setReportUnreadCount(sync.reportUnreadCount);
    setInbox(sync.inbox);
    setSentMail(sync.sent);
    setMailUnreadCount(sync.mailUnreadCount);
    setShopCatalog(sync.shopCatalog);
    setShopInventory(sync.shopInventory);
    syncShopInventoryToEngine(sync.shopInventory, sync.nationState);
    setSyncVersion((current) => Math.max(current, sync.version));
  }

  function applyBackendWorldState(world: any, resetBattles = false) {
    if (!playerId) return;
    if (world.playerId && world.playerId !== playerId) {
      localStorage.setItem(PLAYER_ID_KEY, world.playerId);
      setPlayerId(world.playerId);
      return;
    }
    if (world.activeMap === "conquest") {
      onOpenConquest();
      return;
    }
    // Always hydrate battles through the same client shape used by the
    // initial load. Raw server battles do not have the render timing fields.
    const battles = mapServerBattlesForClient(world.battles || []);
    const territories = world.territories.map((territory: any) => ({
      id: serverToEngineTerritoryId(territory.id),
      ownerCode:
        territory.ownerId === null ? 0 : territory.ownerId === playerId ? 1 : 2,
      ownerId: territory.ownerId,
      ownerName:
        territory.ownerId === null
          ? ""
          : territory.ownerId === playerId
            ? "Bạn"
            : (territory.ownerName ?? territory.ownerId),
      ownerFlagColor: territory.ownerFlagColor,
      ownerEmblem: territory.ownerEmblem,
      ownerAllianceTag: territory.ownerAllianceTag,
      ownerAllianceEmblem: territory.ownerAllianceEmblem,
      settlementKind: territory.settlementKind,
    }));
    engineRef.current?.handleAction("applyGameState", {
      territories,
      clearings: world.clearings,
      marches: world.marches,
      battles,
      towns: world.towns,
      resources: world.resources,
      newbieShieldUntil: world.newbieShieldUntil,
      playerProfile: world.playerProfile,
    });
    if (Array.isArray(world.marches) && world.marches.length > 0) {
      window.setTimeout(() => {
        world.marches.forEach((march: any) => {
          engineRef.current?.handleAction("applyBackendMarch", { march });
        });
      }, 180);
    }
    applyResourceSnapshot(world);
    setNationStatus(world.nationStatus || null);
    setServerTowns(
      (world.towns || []).map((town: any) => normalizeTownForClient(town)),
    );
    setWorldActivity((prev) => ({
      marches: world.marches,
      clearings: world.clearings,
      battles: world.battles ? battles : resetBattles ? [] : prev.battles,
      territoryById: Object.fromEntries(
        world.territories.map((territory: any) => [
          serverToEngineTerritoryId(territory.id),
          territory,
        ]),
      ),
    }));
    setServerHud(summarizeBackendHud(world, playerId, world.resources));
  }

  function applyRealtimePlayerState(event: any) {
    if (!playerId || event?.playerId !== playerId) return false;
    if (event.nationStatus) {
      setNationStatus(event.nationStatus);
    }
    if (event.resources) {
      applyResourceSnapshot(event);
      engineRef.current?.handleAction("syncResources", {
        resources: event.resources,
      });
    }
    if (Array.isArray(event.towns)) {
      const towns = event.towns.map((town: any) =>
        normalizeTownForClient(town),
      );
      setServerTowns(towns);
      engineRef.current?.handleAction("applyBackendTownSnapshots", { towns });
    }
    if (event.newbieShieldUntil !== undefined) {
      engineRef.current?.handleAction("updateNewbieShield", {
        until: event.newbieShieldUntil,
      });
    }
    // Recalculate National Status HUD stats using latest world activity + fresh resources/towns
    setServerHud((prev) => {
      const activity = useGameStore.getState().worldActivity;
      const territories: any[] = Object.values(activity?.territoryById || {});
      const marches: any[] = Array.isArray(activity?.marches)
        ? activity.marches
        : [];
      const clearings: any[] = Array.isArray(activity?.clearings)
        ? activity.clearings
        : [];
      const ownedTerritories = territories.filter(
        (t: any) => t?.ownerId === playerId,
      ).length;
      const enemyTerritories = territories.filter(
        (t: any) => t?.ownerId && t.ownerId !== playerId,
      ).length;
      const outboundMarches = marches.filter(
        (m: any) => m?.ownerId === playerId,
      );
      const outboundTroops = outboundMarches.reduce(
        (sum: number, m: any) => sum + (m.troops || 0),
        0,
      );
      // Include garrisoned troops from towns received in this event
      const townTroops = Array.isArray(event.towns)
        ? event.towns.reduce((sum: number, t: any) => sum + (t.troops || 0), 0)
        : 0;
      const ownedTroops = outboundTroops + townTroops;
      return {
        ...prev,
        ownedTerritories:
          ownedTerritories > 0 ? ownedTerritories : prev.ownedTerritories,
        totalTerritories:
          territories.length > 0 ? territories.length : prev.totalTerritories,
        enemyTerritories:
          territories.length > 0 ? enemyTerritories : prev.enemyTerritories,
        activeMarches: marches.length,
        ownMarches: outboundMarches.length,
        activeClearings: clearings.length,
        ownClearings: clearings.filter((c: any) => c?.playerId === playerId)
          .length,
        outboundTroops,
        ownedTroops,
        strategicPower:
          event.nationStatus?.strategicPower ?? prev.strategicPower,
        lastSync: Date.now(),
      };
    });
    return true;
  }

  function refreshGameStateFromServer(
    reason = "manual",
    force = false,
  ): Promise<boolean> {
    if (!token || !playerId) return Promise.resolve(false);
    const now = Date.now();
    if (!force && now - lastGameStateRefreshAtRef.current < 4000) {
      return Promise.resolve(false);
    }
    if (gameStateRefreshInFlightRef.current) {
      gameStateRefreshQueuedRef.current = true;
      return Promise.resolve(false);
    }
    gameStateRefreshInFlightRef.current = true;
    lastGameStateRefreshAtRef.current = now;
    return getPlayerSync(token)
      .then((sync) => {
        applyPlayerSync(sync);
        applyBackendWorldState(sync.gameState, reason !== "socket-hint");
        setInitialSyncReady(true);
        return true;
      })
      .catch((err) => {
        console.warn("Game state resync failed:", err);
        return false;
      })
      .finally(() => {
        gameStateRefreshInFlightRef.current = false;
        if (gameStateRefreshQueuedRef.current) {
          gameStateRefreshQueuedRef.current = false;
          window.setTimeout(
            () => refreshGameStateFromServer(`${reason}:queued`, true),
            120,
          );
        }
      });
  }

  function refreshGameStateWithRetry(
    reason = "manual",
    attempts = 3,
    delayMs = 900,
  ) {
    const run = (attempt: number) => {
      refreshGameStateFromServer(`${reason}:${attempt}`, true).then((ok) => {
        if (!ok && attempt < attempts) {
          window.setTimeout(() => run(attempt + 1), delayMs * attempt);
        }
      });
    };
    run(1);
  }

  if (!isAuthenticated && !token) {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }

  const localOwnedTowns = engineRef.current?.getPlayerOwnedTowns?.() || [];
  const selectedTownForModal = selectedTown
    ? mergeTownWithServer(selectedTown)
    : null;
  const selectedTerritoryForTooltip = selectedRegion
    ? worldActivity.territoryById[Number(selectedRegion.id)]
    : undefined;
  const selectedServerTownForTooltip = selectedRegion
    ? Object.values(serverTownsById).find(
        (town: any) =>
          Number(town?.territoryId) === Number(selectedRegion.id) ||
          (selectedTerritoryForTooltip &&
            Math.hypot(
              Number(town?.x || 0) - Number(selectedTerritoryForTooltip.x || 0),
              Number(town?.y || 0) - Number(selectedTerritoryForTooltip.y || 0),
            ) < 96),
      )
    : undefined;
  const selectedClearingForTooltip = selectedRegion
    ? worldActivity.clearings.find(
        (clearing: any) =>
          Number(clearing?.territoryId) === Number(selectedRegion.id),
      )
    : undefined;
  const selectedBattleForTooltip = selectedRegion
    ? worldActivity.battles.find(
        (battle: any) => Number(battle?.regionId) === Number(selectedRegion.id),
      )
    : undefined;
  const ownedServerTowns = Object.values(serverTownsById).filter(
    (town: any) => !playerId || town?.ownerId === playerId,
  );
  const locateNationTown = (town: any, sourceTown?: any) => {
    engineRef.current?.handleAction("centerCamera", {
      townId: town.townId,
      x: sourceTown?.x ?? town.x,
      y: sourceTown?.y ?? town.y,
    });
    setLeftCollapsed(true);
  };
  const manageNationTown = (town: any, sourceTown?: any) => {
    setSelectedTown({
      ...(sourceTown || {}),
      id: town.townId,
      territoryId: town.territoryId,
      kind: town.kind,
      level: town.level,
      lvl: town.level,
      x: sourceTown?.x ?? town.x,
      y: sourceTown?.y ?? town.y,
      troops: town.troops,
      maxTroops: town.maxTroops,
      population: town.population,
      populationCapacity: town.populationCapacity,
      ownerId: playerId,
      ownerCode: 1,
    });
    setLeftCollapsed(true);
  };
  const hudOwnedTerritories = serverHud.lastSync
    ? serverHud.ownedTerritories
    : localOwnedTowns.length;
  const hudTotalTerritories = serverHud.totalTerritories || 75;
  const hudPower = nationStatus?.strategicPower ?? serverHud.strategicPower ?? 0;
  const vipLevel = nationStatus?.vipLevel ?? 0;
  const powerBreakdown = nationStatus?.strategicPowerBreakdown;
  const powerTooltip = powerBreakdown
    ? `Uy thế server: ${formatResourceVal(powerBreakdown.total)}\nQuân lực: ${formatResourceVal(powerBreakdown.military)}\nLãnh thổ: ${formatResourceVal(powerBreakdown.territory)}\nThành trì: ${formatResourceVal(powerBreakdown.settlements)}\nCông trình: ${formatResourceVal(powerBreakdown.buildings)}`
    : "Uy thế đang đồng bộ từ server";
  const hudMissions = [
    {
      text: "Sở hữu 3 lãnh thổ",
      value: Math.min(hudOwnedTerritories, 3),
      goal: 3,
    },
    {
      text: "Có 1 đạo quân đang hành quân",
      value: Math.min(serverHud.ownMarches, 1),
      goal: 1,
    },
    {
      text: "Hoàn tất 1 xây thành",
      value: Math.min(hudOwnedTerritories, 1),
      goal: 1,
    },
  ];
  const unreadMailCount = mailUnreadCount;
  const backendStatusText =
    apiOnline === null
      ? "ĐANG KIỂM TRA"
      : apiOnline
        ? "API ONLINE"
        : "API MẤT KẾT NỐI";
  const socketStatusText = socketOnline
    ? "SOCKET LIVE"
    : token
      ? "SOCKET ĐANG NỐI"
      : "CHƯA ĐĂNG NHẬP";
  const ownerNameForTerritory = (id: number) => {
    const territory = worldActivity.territoryById[id];
    if (!territory?.ownerId) return "Hoang dã";
    if (territory.ownerId === playerId) return "Bạn";
    return territory.ownerName || "Đối thủ";
  };
  const activityTerritoryLabel = (id: number) => {
    const territory = worldActivity.territoryById[id];
    const town = Object.values(serverTownsById).find(
      (item: any) => Number(item?.territoryId) === Number(id),
    ) as any;
    const kind = town?.kind || territory?.settlementKind;
    if (kind === "capital") return `Hoàng Thành #${id + 1}`;
    if (kind === "sub_capital") return `Thành trì #${id + 1}`;
    if (kind === "military" || kind === "military_district")
      return `Pháo đài #${id + 1}`;
    return territoryLabel(id);
  };
  const battleTimeLeft = (battle: any) => {
    if (battle?.resolvesAt) return formatTimeLeft(battle.resolvesAt);
    return `${Math.max(0, Math.ceil(Number(battle?.duration || 0) - Number(battle?.t || 0)))}s`;
  };
  const battlefieldActivities: BattlefieldActivityItem[] = [];
  const trackedBattleTerritories = new Set<number>();

  worldActivity.battles.forEach((battle: any) => {
    const territoryId = Number(battle.regionId);
    if (!Number.isFinite(territoryId)) return;
    if (battle.defenderId === playerId) {
      trackedBattleTerritories.add(territoryId);
      battlefieldActivities.push({
        id: `defend-${battle.id || territoryId}`,
        title: `${activityTerritoryLabel(territoryId)} đang bị công thành`,
        meta: `Địch ${formatNum(battle.attackerPower || battle.attPower || 0)} · còn ${battleTimeLeft(battle)}`,
        icon: "/assets/icons/icon_defender_dragon_shield.png",
        tone: "danger",
        priority: 0,
        territoryId,
        focus: "territory",
      });
    } else if (battle.attackerId === playerId) {
      trackedBattleTerritories.add(territoryId);
      battlefieldActivities.push({
        id: `attack-${battle.id || territoryId}`,
        title: `Quân ta đang công ${activityTerritoryLabel(territoryId)}`,
        meta: `Công ${formatNum(battle.attackerPower || battle.attPower || 0)} · còn ${battleTimeLeft(battle)}`,
        icon: "/assets/icons/icon_attacker_lion_shield.png",
        tone: "active",
        priority: 1,
        territoryId,
        focus: "territory",
      });
    }
  });

  worldActivity.marches.forEach((march: any) => {
    const territoryId = Number(march.toTerritoryId);
    if (!Number.isFinite(territoryId)) return;
    const marchId = march.id || march._id || march.marchId;
    const target = worldActivity.territoryById[territoryId];
    const incomingAttack =
      march.ownerId !== playerId &&
      march.kind === "attack" &&
      target?.ownerId === playerId;
    if (incomingAttack) {
      battlefieldActivities.push({
        id: `incoming-${marchId || territoryId}`,
        title: `Quân địch đang tiến đến ${activityTerritoryLabel(territoryId)}`,
        meta: `${formatNum(march.troops || 0)} quân · tới sau ${formatTimeLeft(march.arrivesAt)}`,
        icon: "/assets/icons/icon_defender_dragon_shield.png",
        tone: "danger",
        priority: 0,
        territoryId,
        focus: "territory",
      });
      return;
    }
    if (march.ownerId !== playerId) return;
    const isAttack = march.kind === "attack";
    const isReinforce = march.kind === "reinforce";
    battlefieldActivities.push({
      id: `march-${marchId || territoryId}`,
      title: isAttack
        ? `Quân đang tiến đánh ${activityTerritoryLabel(territoryId)}`
        : isReinforce
          ? `Tiếp viện đang đến ${activityTerritoryLabel(territoryId)}`
          : `Quân đang di chuyển đến ${activityTerritoryLabel(territoryId)}`,
      meta: `${formatNum(march.troops || 0)} quân · ${march.usesShip ? "đường biển" : "đường bộ"} · ${formatTimeLeft(march.arrivesAt)}`,
      icon: isAttack
        ? "/assets/icons/icon_battle_vs.png"
        : "/assets/icons/icon_military.png",
      tone: isAttack ? "warning" : "active",
      priority: isAttack ? 2 : 3,
      territoryId,
      marchId,
      focus: "march",
    });
  });

  worldActivity.clearings
    .filter((clearing: any) => clearing.playerId === playerId)
    .forEach((clearing: any) => {
      const territoryId = Number(clearing.territoryId);
      if (!Number.isFinite(territoryId)) return;
      const isTravelling =
        clearing.arrivesAt &&
        new Date(clearing.arrivesAt).getTime() > Date.now();
      battlefieldActivities.push({
        id: `clearing-${territoryId}`,
        title: isTravelling
          ? `Thợ xây đang đến ${activityTerritoryLabel(territoryId)}`
          : `Đang dựng pháo đài tại ${activityTerritoryLabel(territoryId)}`,
        meta: isTravelling
          ? `Đến nơi sau ${formatTimeLeft(clearing.arrivesAt)}`
          : `Hoàn tất sau ${formatTimeLeft(clearing.completesAt)}`,
        icon: "/assets/icons/icon_tower.png",
        tone: "building",
        priority: 4,
        territoryId,
        focus: "territory",
      });
    });

  (nationStatus?.towns || []).forEach((town: any) => {
    const territoryId = Number(town.territoryId);
    if (
      town.status !== "under_attack" ||
      trackedBattleTerritories.has(territoryId)
    )
      return;
    battlefieldActivities.push({
      id: `town-danger-${territoryId}`,
      title: `${activityTerritoryLabel(territoryId)} đang bị tấn công`,
      meta: "Phòng tuyến cần được kiểm tra ngay",
      icon: "/assets/icons/icon_defender_dragon_shield.png",
      tone: "danger",
      priority: 0,
      territoryId,
      focus: "territory",
    });
  });

  battlefieldActivities.sort((a, b) => a.priority - b.priority);
  const visibleBattlefieldActivities =
    battlefieldActivities.length > 0
      ? battlefieldActivities.slice(0, 4)
      : [
          {
            id: "frontier-calm",
            title: "Biên cương yên ổn",
            meta: "Không có hành quân hay giao tranh",
            icon: "/assets/icons/icon_tower.png",
            tone: "calm" as const,
            priority: 9,
          },
        ];
  const focusBattlefieldActivity = (activity: BattlefieldActivityItem) => {
    if (!activity.focus) return;
    if (activity.focus === "march" && activity.marchId) {
      engineRef.current?.handleAction("focusBackendMarch", {
        marchId: activity.marchId,
      });
    } else if (activity.territoryId !== undefined) {
      engineRef.current?.handleAction("focusTerritory", {
        territoryId: activity.territoryId,
        label: activityTerritoryLabel(activity.territoryId),
      });
    }
    setToastMessage(`Đã định vị ${activity.title.toLowerCase()}`);
  };
  const battleRows = worldActivity.battles.map((battle) => ({
    title: `${territoryLabel(battle.regionId ?? 0)} đang giao tranh`,
    meta: `Ta ${formatNum(battle.attPower || 0)} / Thủ ${formatNum(battle.defPower || 0)} · còn ${Math.max(0, Math.ceil((battle.duration || 0) - (battle.t || 0)))}s`,
  }));
  const attackRows = worldActivity.marches
    .filter((march) => march.kind === "attack")
    .map((march) => ({
      title: `${march.ownerId === playerId ? "Bạn" : "Đối thủ"} tấn công ${territoryLabel(march.toTerritoryId)}`,
      meta: `Đánh với ${ownerNameForTerritory(march.toTerritoryId)} · ${formatNum(march.troops || 0)} quân · đến ${formatTimeLeft(march.arrivesAt)}`,
    }));
  const clearingRows = worldActivity.clearings.map((clearing) => ({
    title: `${clearing.playerId === playerId ? "Bạn" : "Người chơi"} xây thành ${territoryLabel(clearing.territoryId)}`,
    meta: `Hoàn tất sau ${formatTimeLeft(clearing.completesAt)}`,
  }));
  const ownMarchRows = worldActivity.marches
    .filter((march) => march.ownerId === playerId)
    .map((march) => ({
      title: `${march.kind === "reinforce" ? "Tiếp viện" : "Hành quân"} đến ${territoryLabel(march.toTerritoryId)}`,
      meta: `${formatNum(march.troops || 0)} quân · ${march.usesShip ? "đường biển" : "đường bộ"} · ${formatTimeLeft(march.arrivesAt)}`,
    }));
  const warReportRows = [
    ...battleRows,
    ...attackRows,
    ...clearingRows,
    ...ownMarchRows,
  ].slice(0, 8);
  const compactWarRows = warReportRows.slice(0, 3);
  const recentWarReports = battleReports.slice(0, 40);

  // 6 Kingdom Status items requested by User
  const activeEnemyMarch = (worldActivity?.marches || []).find(
    (m: any) =>
      m.ownerId !== playerId &&
      (m.kind === "attack" || m.kind === "marchAttack"),
  );
  const activePlayerBattle = (worldActivity?.battles || []).find(
    (b: any) =>
      b.isPlayerInvolved || (b.defenderId && b.defenderId === playerId),
  );
  const attackTargetName =
    activePlayerBattle?.regionName || activeEnemyMarch?.targetName || null;

  const economyTelemetry = economyClockRef.current;
  const currentStorageCap = (
    Object.values(economyTelemetry.capacity) as number[]
  ).reduce((sum, value) => sum + Math.max(0, value || 0), 0);
  const totalStoredRes = (Object.values(resources) as number[]).reduce(
    (sum, value) => sum + Math.max(0, value || 0),
    0,
  );
  const storagePercent =
    currentStorageCap > 0
      ? Math.min(100, Math.round((totalStoredRes / currentStorageCap) * 100))
      : 0;
  const isStorageFull = storagePercent >= 90;
  const resourceCapacity = (key: keyof ResourceBag) =>
    Math.max(0, economyTelemetry.capacity[key] || 0);
  const resourceRatePerHour = (key: keyof ResourceBag) =>
    Math.max(0, (economyTelemetry.productionPerSecond[key] || 0) * 3600);
  return (
    <main
      className={`game-shell${isMobileLandscape ? " mobile-forced-landscape" : ""}`}
    >
      {runtimeError && (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
            background: "#450a0a",
            border: "2px solid #ef4444",
            color: "#fecaca",
            padding: "12px 18px",
            borderRadius: "8px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.85)",
            maxWidth: "92vw",
            fontSize: "12px",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "6px",
              color: "#f87171",
            }}
          >
            ⚠️ PHÁT HIỆN LỖI CHI TIẾT (DEBUG ERROR LOG):
          </div>
          <div>{runtimeError}</div>
          <button
            type="button"
            onClick={() => setRuntimeError(null)}
            style={{
              marginTop: "10px",
              background: "#991b1b",
              color: "#fff",
              border: "none",
              padding: "4px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            ĐÓNG THÔNG BÁO LỖI
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        id="game"
        style={{
          width: "100vw",
          height: "100dvh",
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: gameReady ? "auto" : "none",
        }}
        aria-label={t("appName")}
      />

      {isAuthenticated && !gameReady && (
        <div className="game-loading-screen">
          <div className="game-loading-bottom-dock">
            <div className="game-loading-tip-line">
              <span className="tip-tag">{t("loadingTipLabel")}</span>{" "}
              {t("loadingTip")}
            </div>

            <div className="game-loading-bar-wrapper">
              <div className="game-loading-bar-track">
                <div
                  className="game-loading-bar-fill"
                  style={{ width: `${loadingProgress}%` }}
                />
                <span className="game-loading-pct">{loadingProgress}%</span>
              </div>
            </div>

            <div className="game-loading-status-line">
              <span className="diamond-ornament">❖</span>{" "}
              {loadingError || loadingText}{" "}
              <span className="diamond-ornament">❖</span>
            </div>

            {loadingError && (
              <button
                type="button"
                className="game-loading-retry-btn"
                onClick={() => window.location.reload()}
              >
                {t("reloadPage")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* High Fidelity HTML Overlay HUD */}
      {gameReady && (
        <div className="hud-wrapper">
          {/* CONQUEST MODE 14 HOLY SITES HEADER BAR */}
          {conquestMode && (
            <header
              className="conquest-top-bar hud-interactive"
              style={{ position: "relative", zIndex: 110, margin: "6px 12px" }}
            >
              <div className="conquest-top-left-gate" title="Cửa Ải Đã Mở">
                <div className="conquest-gate-badge">
                  <span className="gate-icon">🏰</span>
                  <span className="gate-count">42/42</span>
                </div>
              </div>

              <div className="conquest-holy-sites-strip">
                {[
                  { name: "Hope", icon: "💎", color: "#3b82f6", val: "+3%" },
                  { name: "Wind", icon: "⭐", color: "#eab308", val: "+10%" },
                  { name: "Blood", icon: "💧", color: "#ef4444", val: "+5%" },
                  { name: "Courage", icon: "🛡️", color: "#22c55e", val: "+5%" },
                  { name: "Wisdom", icon: "⚛️", color: "#10b981", val: "+10%" },
                  { name: "Surge", icon: "🔮", color: "#0284c7", val: "+3%" },
                  { name: "Storm", icon: "🌀", color: "#06b6d4", val: "+20%" },
                  { name: "Flame", icon: "🔥", color: "#f97316", val: "+5%" },
                  {
                    name: "Harvest",
                    icon: "🌾",
                    color: "#84cc16",
                    val: "+10%",
                  },
                  { name: "Earth", icon: "🍃", color: "#15803d", val: "+5%" },
                  { name: "Order", icon: "👑", color: "#a855f7", val: "+3%" },
                  {
                    name: "Radiance",
                    icon: "☀️",
                    color: "#f43f5e",
                    val: "+20%",
                  },
                ].map((site) => (
                  <div
                    key={site.name}
                    className="conquest-site-pill"
                    style={{ borderBottomColor: site.color }}
                  >
                    <div
                      className="site-pill-icon"
                      style={{ color: site.color }}
                    >
                      {site.icon}
                    </div>
                    <div className="site-pill-info">
                      <span className="site-pill-name">{site.name}</span>
                      <span className="site-pill-buff">{site.val}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="conquest-top-right">
                <span className="conquest-unique-label">
                  × Unique quantity of holy sites
                </span>
                <button
                  className="conquest-close-btn"
                  onClick={onOpenWorld || (() => (window.location.href = "/"))}
                >
                  ✕ QUAY VỀ BẢN ĐỒ THẾ GIỚI
                </button>
              </div>
            </header>
          )}

          {/* TOP BAR - PIXEL PERFECT RISE OF KINGDOMS (ROK) HUD */}
          <div
            style={{
              position: "fixed",
              inset: "0 0 auto 0",
              zIndex: 1000,
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "8px 12px 0 12px",
              background: "transparent",
              border: "none",
              pointerEvents: "none",
            }}
            className="hud-topbar hud-interactive rok-hud-topbar"
          >
            {/* TOP-LEFT: ROK PROFILE CARD */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                pointerEvents: "auto",
                position: "relative",
                background: "transparent",
                border: "none",
                boxShadow: "none",
                padding: 0,
              }}
              className="rok-profile-card"
            >
              {/* Lightweight raster VIP frame over the selected portrait. */}
              <div
                className="hud-vip-avatar"
                onClick={() => setShowAvatarPicker(true)}
                title="Thay đổi đại diện"
              >
                <div className="hud-vip-avatar-portrait">
                  <img
                    src={`/assets/avatars/${selectedAvatarId}.png`}
                    alt="Player Avatar"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/assets/avatars/emperor.png";
                    }}
                  />
                </div>
                <img
                  className="hud-vip-avatar-frame"
                  src="/assets/ui/vip-avatar-frame.webp"
                  alt=""
                  aria-hidden="true"
                />
                <span className="hud-vip-avatar-edit" aria-hidden="true">
                  ✎
                </span>
              </div>

              <div className="hud-profile-details">
                <button
                  type="button"
                  className="hud-profile-ruler-name"
                  onClick={() => openModal("kingdom")}
                  title="Mở trạng thái quốc gia"
                >
                  {nationStatus?.playerName || "Rising Empire"}
                </button>

                <div className="hud-profile-metrics-row">
                  <div
                    className="hud-profile-stat hud-profile-power-stat"
                    title={powerTooltip}
                    onClick={() => openModal("kingdom")}
                  >
                    <img
                      src="/assets/ui/profile-power-emblem.webp"
                      alt="Uy thế"
                      className="hud-profile-power-emblem"
                    />
                    <span className="hud-profile-stat-copy">
                      <small>UY THẾ</small>
                      <strong>{formatResourceVal(Math.round(hudPower))}</strong>
                    </span>
                  </div>

                  <div
                    className="hud-profile-stat hud-profile-vip-stat"
                    title="VIP 0 · Tính năng đặc quyền sẽ được cập nhật sau"
                  >
                    <span className="hud-profile-vip-emblem">
                      <img src="/assets/ui/profile-vip-shield.webp" alt="VIP" />
                      <b>{vipLevel}</b>
                    </span>
                    <span className="hud-profile-stat-copy hud-profile-vip-label">
                      <small>ĐẶC QUYỀN</small>
                      <strong>VIP {vipLevel}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="hud-profile-upgrade-btn"
                    disabled
                    title="Tính năng VIP sẽ được cập nhật sau"
                  >
                    +
                  </button>
                </div>

                <div className="hud-profile-meta-row">
                  <span>{nationStatus?.rank || "Lãnh Chúa"}</span>
                  <time>
                    UTC {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
                  </time>
                </div>
              </div>
            </div>

            {/* TOP-RIGHT: ROK FLOATING RESOURCE BAR & QUICK ACTION BADGES */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 6,
                pointerEvents: "auto",
              }}
              className="rok-top-right-group"
            >
              {/* Row 1: Floating Resources Belt */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  background: "transparent",
                  padding: 0,
                }}
                className="rok-resources-belt"
              >
                <div
                  className="hud-res-item res-food rok-res-pill"
                  title={`${t("food")}: ${formatResourceVal(resources.food || 0)}`}
                >
                  <span className="hud-res-icon">
                    <img
                      src="/assets/icons/resource_food_european.png"
                      alt="Food"
                    />
                  </span>
                  <span className="hud-res-copy">
                    <strong>{formatResourceVal(resources.food || 0)}</strong>
                  </span>
                </div>
                <div
                  className="hud-res-item res-wood rok-res-pill"
                  title={`${t("wood")}: ${formatResourceVal(resources.wood || 0)}`}
                >
                  <span className="hud-res-icon">
                    <img
                      src="/assets/icons/resource_wood_european.png"
                      alt="Wood"
                    />
                  </span>
                  <span className="hud-res-copy">
                    <strong>{formatResourceVal(resources.wood || 0)}</strong>
                  </span>
                </div>
                <div
                  className="hud-res-item res-stone rok-res-pill"
                  title={`${t("stone")}: ${formatResourceVal(resources.stone || 0)}`}
                >
                  <span className="hud-res-icon">
                    <img
                      src="/assets/icons/resource_stone_european.png"
                      alt="Stone"
                    />
                  </span>
                  <span className="hud-res-copy">
                    <strong>{formatResourceVal(resources.stone || 0)}</strong>
                  </span>
                </div>
                <div
                  className="hud-res-item res-iron rok-res-pill"
                  title={`${t("iron")}: ${formatResourceVal(resources.iron || 0)}`}
                >
                  <span className="hud-res-icon">
                    <img
                      src="/assets/icons/resource_iron_european.png"
                      alt="Iron"
                    />
                  </span>
                  <span className="hud-res-copy">
                    <strong>{formatResourceVal(resources.iron || 0)}</strong>
                  </span>
                </div>
                <div
                  className="hud-res-item res-gold rok-res-pill"
                  title={`${t("gold")}: ${formatResourceVal(resources.gold || 0)}`}
                >
                  <span className="hud-res-icon">
                    <img
                      src="/assets/icons/resource_gold_european.png"
                      alt="Gold"
                    />
                  </span>
                  <span className="hud-res-copy">
                    <strong>{formatResourceVal(resources.gold || 0)}</strong>
                  </span>
                </div>
                <div
                  className="hud-res-item res-gems rok-res-pill rok-gem-pill rok-premium-pill"
                  title={t("gems")}
                >
                  <span className="hud-res-icon">
                    <img src="/assets/icons/icon_red_gem.png" alt="Gems" />
                  </span>
                  <span className="hud-res-copy premium">
                    <strong>{formatResourceVal(resources.gems || 0)}</strong>
                  </span>
                  <button
                    type="button"
                    className="hud-res-add-btn rok-add-btn"
                    onClick={() => openModal("shop")}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Row 2: Floating Quick Action Badges (Rise of Kingdoms Sub-Header Badges) */}
              <div className="rok-event-badges-row">
                {/* 1. Sự kiện (Events) */}
                <div
                  className="rok-badge-item"
                  onClick={() => openModal("treasure")}
                  title="Sự kiện đặc biệt"
                >
                  <div className="rok-badge-icon-wrap rok-badge-event">
                    <img
                      src="/assets/icons/icon_event.png"
                      alt="Sự kiện"
                      className="rok-badge-img"
                    />
                  </div>
                  <span className="rok-badge-subtext">Sự kiện</span>
                </div>

                {/* 2. Quân đội (Army / Military) */}
                <div
                  className="rok-badge-item"
                  onClick={() => openModal("army")}
                  title="Quản lý quân đội"
                >
                  <div className="rok-badge-icon-wrap rok-badge-army">
                    <img
                      src="/assets/icons/icon_military.png"
                      alt="Quân đội"
                      className="rok-badge-img"
                    />
                  </div>
                  <span className="rok-badge-subtext">Quân đội</span>
                </div>

                {/* 3. Chiến báo (Battle Reports) */}
                <div
                  className="rok-badge-item"
                  onClick={() => openModal("warReport")}
                  title="Chiến báo & Quân sự"
                >
                  <div className="rok-badge-icon-wrap rok-badge-war">
                    <img
                      src="/assets/icons/icon_report.png"
                      alt="Chiến báo"
                      className="rok-badge-img"
                    />
                    {reportUnreadCount > 0 ? (
                      <b className="rok-badge-notif">
                        {Math.min(99, reportUnreadCount)}
                      </b>
                    ) : (
                      <b className="rok-badge-notif">7</b>
                    )}
                  </div>
                  <span className="rok-badge-subtext">Chiến báo</span>
                </div>

                {/* 4. Thư tín (Mail) */}
                <div
                  className="rok-badge-item"
                  onClick={() => openModal("mail")}
                  title="Thư tín"
                >
                  <div className="rok-badge-icon-wrap rok-badge-mail">
                    <img
                      src="/assets/icons/icon_mail.png"
                      alt="Mail"
                      className="rok-badge-img"
                    />
                    {unreadMailCount > 0 ? (
                      <b className="rok-badge-notif">
                        {Math.min(99, unreadMailCount)}
                      </b>
                    ) : (
                      <b className="rok-badge-notif">5</b>
                    )}
                  </div>
                  <span className="rok-badge-subtext">Thư tín</span>
                </div>

                {/* 5. Cửa hàng (Shop / Offers) */}
                <div
                  className="rok-badge-item"
                  onClick={() => openModal("shop")}
                  title="Cửa hàng & Gói ưu đãi"
                >
                  <div className="rok-badge-icon-wrap rok-badge-shop">
                    <img
                      src="/assets/icons/icon_shop.png"
                      alt="Cửa hàng"
                      className="rok-badge-img"
                    />
                    <b className="rok-badge-notif">3</b>
                  </div>
                  <span className="rok-badge-subtext">Cửa hàng</span>
                </div>

                {/* 6. Bảng xếp hạng (Ranking) */}
                <div
                  className="rok-badge-item"
                  onClick={() => openModal("ranking")}
                  title="Bảng xếp hạng vương quốc"
                >
                  <div className="rok-badge-icon-wrap rok-badge-ranking">
                    <img
                      src="/assets/icons/icon_gold_crown.png"
                      alt="Bảng xếp hạng"
                      className="rok-badge-img"
                    />
                  </div>
                  <span className="rok-badge-subtext">BXH</span>
                </div>

                {/* 7. Cài đặt (Settings) */}
                <div
                  className="rok-badge-item"
                  onClick={() => openModal("settings")}
                  title="Cài đặt hệ thống"
                >
                  <div className="rok-badge-icon-wrap rok-badge-settings">
                    <img
                      src="/assets/icons/icon_settings_european.png"
                      alt="Settings"
                      className="rok-badge-img"
                    />
                  </div>
                  <span className="rok-badge-subtext">Cài đặt</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN HUD BODY */}
          <div className="hud-main">
            {/* LEFT PANELS - (Removed vertical side menu rail as requested) */}
            {!conquestMode && <div className="hud-left-command-cluster"></div>}
            {/* RIGHT PANELS - MINIMAP & SELECTED TOWN */}
            <div className="hud-right-side hud-interactive">
              {/* Minimap card with Gold Trim (matching Mockup) */}
              <div
                className={`hud-minimap-card premium-framed ${minimapCollapsed ? "collapsed" : ""}`}
              >
                <div className="hud-minimap-header">
                  <span className="hud-minimap-title">
                    <span className="hud-minimap-svg-icon">
                      <img src="/assets/icons/icon_map.png" alt="" />
                    </span>{" "}
                    {t("worldMap")}
                  </span>
                  <button
                    type="button"
                    className="hud-mini-icon-btn-plus"
                    title={
                      minimapCollapsed ? "Mở rộng bản đồ" : "Thu gọn bản đồ"
                    }
                    onClick={() => setMinimapCollapsed(!minimapCollapsed)}
                  >
                    <img
                      className={minimapCollapsed ? "is-collapsed" : ""}
                      src="/assets/icons/icon_collapse_european.png"
                      alt=""
                    />
                  </button>
                </div>

                <div className="hud-minimap-coords-display">
                  <span className="coords-text">X: 10650 Y: 6254</span>
                  <button
                    type="button"
                    className="hud-mini-icon-btn"
                    onClick={jumpToCoordinates}
                    title={t("search")}
                    style={{ marginLeft: "auto" }}
                  >
                    <img src="/assets/icons/icon_search_european.png" alt="" />
                  </button>
                </div>

                <div className="hud-minimap-canvas-wrapper">
                  <canvas
                    ref={minimapCanvasRef}
                    width={160}
                    height={120}
                    className="hud-minimap-canvas"
                    style={{
                      width: "100%",
                      height: "96px",
                      display: "block",
                      background: "#060f16",
                    }}
                  />
                </div>
                <section
                  className="hud-main-missions"
                  aria-label="Tình hình chiến trường"
                >
                  <div className="hud-main-missions-header">
                    <span>TÌNH HÌNH CHIẾN TRƯỜNG</span>
                    <i>
                      <img
                        src="/assets/icons/icon_collapse_european.png"
                        alt=""
                      />
                    </i>
                  </div>
                  <div className="hud-main-missions-list">
                    {visibleBattlefieldActivities.map((activity) => (
                      <button
                        type="button"
                        className={`hud-main-mission battlefield-${activity.tone}`}
                        key={activity.id}
                        disabled={!activity.focus}
                        onClick={() => focusBattlefieldActivity(activity)}
                        title={
                          activity.focus
                            ? `Định vị ${activity.title.toLowerCase()}`
                            : activity.meta
                        }
                      >
                        <span className="hud-main-mission-icon">
                          <img src={activity.icon} alt="" />
                        </span>
                        <span className="hud-main-mission-copy">
                          <b>{activity.title}</b>
                          <span className="hud-main-mission-meta">
                            {activity.meta}
                          </span>
                        </span>
                        {activity.focus && (
                          <span
                            className="hud-main-mission-locate"
                            aria-hidden="true"
                          >
                            <img
                              src="/assets/icons/icon_search_european.png"
                              alt=""
                            />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* HORIZONTAL EMPIRE ACTION DOCK (Redesigned Centered Curved Dock) */}
          <div className="hud-center-dock-container hud-interactive">
            {/* Toast / Territory Selection Banner */}
            <div className="hud-toast-banner">
              <div className="toast-title">
                {selectedRegion
                  ? `${t("selectedTerritory")} #${selectedRegion.id}`
                  : toastMessage || `${t("selectedTerritory")} #259`}
              </div>
              <div className="toast-sub">
                {selectedRegion
                  ? t("buildFromTooltip")
                  : language === "vi"
                    ? "Bấm vào ô lãnh thổ để ra lệnh"
                    : "Click territory to issue orders"}
              </div>
            </div>
          </div>

          {!conquestMode && (
            <nav
              className="hud-command-dock hud-interactive"
              aria-label="Lệnh nhanh"
            >
              <button
                type="button"
                className="hud-command-button"
                onClick={() => openModal("army")}
              >
                <img src="/assets/icons/icon_military.png" alt="" />
                <span>Quân đội</span>
              </button>
              <button
                type="button"
                className="hud-command-button"
                onClick={() => openModal("treasure")}
              >
                <img src="/assets/icons/icon_bag.png" alt="" />
                <span>Kho báu</span>
              </button>
              <button
                type="button"
                className="hud-command-button primary active"
                onClick={() => handleAction("map")}
              >
                <img src="/assets/icons/icon_map.png" alt="" />
                <span>Bản đồ</span>
              </button>
              <button
                type="button"
                className="hud-command-button"
                onClick={onOpenConquest}
              >
                <img src="/assets/icons/icon_tower.png" alt="" />
                <span>Chinh phạt</span>
              </button>
              <button
                type="button"
                className={`hud-command-button ${activeModal === "warReport" ? "active" : ""}`}
                onClick={() => openModal("warReport")}
              >
                <img src="/assets/icons/icon_report.png" alt="" />
                <span>Chiến báo</span>
                {reportUnreadCount > 0 && (
                  <b className="hud-command-badge">
                    {Math.min(99, reportUnreadCount)}
                  </b>
                )}
              </button>
              <button
                type="button"
                className={`hud-command-button ${activeModal === "mail" ? "active" : ""}`}
                onClick={() => openModal("mail")}
              >
                <img src="/assets/icons/icon_mail.png" alt="" />
                <span>Thư tín</span>
                {unreadMailCount > 0 && (
                  <b className="hud-command-badge">
                    {Math.min(99, unreadMailCount)}
                  </b>
                )}
              </button>
            </nav>
          )}

          {!conquestMode && (
            <button
              type="button"
              className="hud-capital-shortcut hud-interactive"
              onClick={() => openModal("kingdom")}
              title="Mở Thành chính"
            >
              <img src="/assets/icons/icon_tower.png" alt="" />
              <span>Thành chính</span>
              <b>
                <img src="/assets/icons/icon_collapse_european.png" alt="" />
              </b>
            </button>
          )}

          {/* BOTTOM SECTION - CHAT PANEL & QUEUES */}
          <div className="hud-bottombar-unified">
            <ChatPanel
              messages={chatMessages}
              currentUserId={playerId ?? undefined}
              online={socketOnline}
              onSend={(message) => {
                const sent = sendWorldChat(message);
                if (!sent) showGameError("Chat đang mất kết nối, vui lòng thử lại");
                return sent;
              }}
            />
          </div>

          {/* Connection status pill hidden or styled elegantly */}
          <div
            className="connection-pill hud-interactive"
            data-online={apiOnline === true}
            style={{
              position: "fixed",
              bottom: "4px",
              right: "220px",
              zIndex: 10,
              pointerEvents: "none",
              opacity: 0.5,
            }}
          >
            {backendStatusText} · {socketStatusText}
          </div>
        </div>
      )}

      {gameReady && selectedRegion && engineRef.current && (
        <TerritoryTooltip
          region={selectedRegion}
          engine={engineRef.current}
          territory={selectedTerritoryForTooltip}
          town={selectedServerTownForTooltip}
          clearing={selectedClearingForTooltip}
          battle={selectedBattleForTooltip}
          playerId={playerId}
          ownedTowns={ownedServerTowns}
          onClose={() => {
            if (engineRef.current) {
              const state = engineRef.current.getState();
              state.selectedRegion = null;
              state.selected = null;
            }
            setSelectedRegion(null);
          }}
          onKhaiHoang={async (regionId) => {
            if (!token) {
              showGameError("Chưa kết nối server, không thể xây thành");
              return;
            }
            const engineState = engineRef.current?.getState?.();
            const playerTerritoriesCount = Object.keys(
              engineState?.regionOwnership || {},
            ).filter(
              (territoryId) =>
                engineState?.regionOwnership?.[Number(territoryId)] === 1 ||
                engineState?.regionOwnerIds?.[Number(territoryId)] === playerId,
            ).length;
            const hasExistingLand =
              serverHud.ownedTerritories > 0 || playerTerritoriesCount > 0;
            if (
              !hasExistingLand &&
              (localStorage.getItem(ONBOARDING_KEY) === "1" ||
                playerTerritoriesCount === 0)
            ) {
              engineRef.current?.selectNewbieLand?.(regionId);
              if (engineState) {
                engineState.selectedRegion = null;
                engineState.selected = null;
              }
              setNewbiePhase("choose_banner");
              setNewbieSelectedRegion(regionId);
              setKingdomCreationRegion(regionId);
              setSelectedRegion(null);
              return;
            }
            try {
              const result = await startClearing(
                token,
                engineToServerTerritoryId(regionId),
              );
              engineRef.current?.handleAction("applyBackendClearing", {
                clearing: result.clearing,
              });
              setSelectedRegion(null);
              addSystemLine(
                `ĐỘI THỢ XÂY ĐANG ĐI TỪ PHÁO ĐÀI BIÊN GIỚI GẦN NHẤT TỚI ${territoryLabel(regionId).toUpperCase()}`,
              );
            } catch (err: any) {
              showGameError(err.message || "Server từ chối lệnh xây Pháo Đài");
            }
          }}
          onHuyKhaiHoang={(regionId) => {
            engineRef.current?.handleAction("cancelClaimRegion", regionId);
            setSelectedRegion(null);
            // Optimistic: reset territory state immediately, don't wait for socket event
            const serverTerritoryId = engineToServerTerritoryId(regionId);
            setWorldActivity((prev) => ({
              ...prev,
              clearings: prev.clearings.filter(
                (c) => c.territoryId !== serverTerritoryId,
              ),
            }));
            setServerHud((prev) => ({
              ...prev,
              activeClearings: Math.max(0, prev.activeClearings - 1),
              ownClearings: Math.max(0, prev.ownClearings - 1),
              lastSync: Date.now(),
            }));
            if (token) {
              cancelClearing(token, serverTerritoryId)
                .then((result) => {
                  if (result.resources) {
                    engineRef.current?.handleAction("syncResources", {
                      resources: result.resources,
                    });
                    applyResourceSnapshot(result);
                  }
                })
                .catch((err) => {
                  showGameError(
                    err.message || "Không hủy được xây thành trên server",
                  );
                  // Rollback: re-sync from server if cancel fails
                  refreshGameStateWithRetry("cancel-clearing-rollback", 2, 800);
                });
            }
          }}
          onAttack={(regionId) => {
            const source =
              deploySourceTown && isEligibleSourceTown(deploySourceTown)
                ? mergeTownWithServer(deploySourceTown)
                : getValidSourceTown();
            if (!source) {
              showGameError("Bạn cần có thành trì trước khi tấn công!");
              return;
            }
            engineRef.current?.handleAction("setUiOverlayActive", {
              active: true,
            });
            setDeployError(null);
            setMarchSourceOptions(null);
            setDeployTarget({
              targetRegionId: regionId,
              isAttack: true,
              battleSide: "attacker",
            });
            setDeploySourceTown({ ...source });
            void loadRecommendedMarchSource(regionId, "attack")
              .then((recommended) => {
                if (recommended) setDeploySourceTown({ ...recommended });
              })
              .catch((err) =>
                setDeployError(
                  err?.message || "Không tải được danh sách thành xuất quân",
                ),
              );
          }}
          onReinforce={(regionId, side = "attacker") => {
            const source =
              deploySourceTown && isEligibleSourceTown(deploySourceTown)
                ? mergeTownWithServer(deploySourceTown)
                : getValidSourceTown();
            if (!source) {
              showGameError("Bạn cần có thành trì trước khi tiếp viện!");
              return;
            }
            engineRef.current?.handleAction("setUiOverlayActive", {
              active: true,
            });
            setDeployError(null);
            setMarchSourceOptions(null);
            setDeployTarget({
              targetRegionId: regionId,
              isAttack: false,
              battleSide: side,
            });
            setDeploySourceTown({ ...source });
            void loadRecommendedMarchSource(regionId, "reinforce")
              .then((recommended) => {
                if (recommended) setDeploySourceTown({ ...recommended });
              })
              .catch((err) =>
                setDeployError(
                  err?.message || "Không tải được danh sách thành xuất quân",
                ),
              );
          }}
        />
      )}

      {activeModal === "tutorial" && (
        <NewbieOnboardingModal
          onClose={() => {
            engineRef.current?.handleAction("setUiOverlayActive", {
              active: false,
            });
            setActiveModal("");
          }}
          onConfirm={() => {
            engineRef.current?.handleAction("setUiOverlayActive", {
              active: false,
            });
            setActiveModal("");
          }}
        />
      )}

      {(kingdomCreationRegion !== null ||
        (newbiePhase === "choose_banner" && newbieSelectedRegion !== null)) &&
        engineRef.current && (
          <KingdomCreationModal
            defaultCityName="Thành Trì Vương Quốc"
            getCastleSprite={(color, emblem) =>
              engineRef.current?.getCastleSprite(color, emblem)
            }
            onClose={() => {
              engineRef.current?.handleAction("setUiOverlayActive", {
                active: false,
              });
              setKingdomCreationRegion(null);
              if (engineRef.current) {
                engineRef.current.cancelNewbieOnboarding();
              }
            }}
            onConfirm={async (flagColor, emblem, cityName) => {
              const regionId = kingdomCreationRegion ?? newbieSelectedRegion;
              if (!token || regionId === null) {
                showGameError(
                  "Chưa kết nối server, không thể xây thành tân thủ",
                );
                return;
              }
              engineRef.current?.handleAction("setToast", {
                message: "ĐANG GỬI LỆNH XÂY THÀNH TÂN THỦ LÊN SERVER",
              });
              try {
                await updatePlayerProfile(token, flagColor, emblem, cityName);
                engineRef.current?.startNewbieOnboarding(
                  flagColor,
                  emblem,
                  cityName,
                );
                const result = await startClearing(
                  token,
                  engineToServerTerritoryId(regionId),
                );
                engineRef.current?.handleAction("applyBackendClearing", {
                  clearing: result.clearing,
                });
                engineRef.current?.handleAction("setUiOverlayActive", {
                  active: false,
                });
                setKingdomCreationRegion(null);
                addSystemLine(
                  `KHỞI CÔNG HOÀNG THÀNH ${cityName.toUpperCase()}`,
                );
              } catch (err: any) {
                engineRef.current?.handleAction("setUiOverlayActive", {
                  active: true,
                });
                engineRef.current?.cancelNewbieOnboarding();
                showGameError(
                  err.message || "Không thể khởi tạo thành trì tân thủ",
                );
              }
            }}
          />
        )}

      {deployTarget && deploySourceTown && engineRef.current && (
        <TroopDeploymentModal
          sourceTown={deploySourceTown}
          sourceTowns={engineRef.current.getPlayerOwnedTowns?.() || []}
          sourceOptions={marchSourceOptions}
          selectedSourceTownId={deploySourceTown.id}
          targetTownId={deployTarget.targetRegionId}
          isAttack={deployTarget.isAttack}
          battleSide={deployTarget.battleSide}
          gameConfig={(engineRef.current as any).getConfig?.()}
          errorMessage={deployError}
          getTownRegionId={(town) =>
            engineRef.current?.getTownRegionId?.(town) ?? -1
          }
          getRegionCenter={(id) =>
            engineRef.current?.getRegionCenter?.(id) ?? null
          }
          getRouteStatus={(town, targetRegionId) =>
            engineRef.current?.getMarchRouteStatus?.(town, targetRegionId) ?? {
              ok: false,
              message: "Không có bản đồ",
              requiresShip: false,
            }
          }
          onSelectSourceTown={(townId) => {
            const option = marchSourceOptions?.find(
              (source) => source.townId === townId,
            );
            const nextTown =
              engineRef.current
                ?.getPlayerOwnedTowns?.()
                .find((town: any) => town.id === townId) ||
              engineRef.current
                ?.getPlayerOwnedTowns?.()
                .find(
                  (town: any) =>
                    option &&
                    engineToServerTerritoryId(
                      engineRef.current?.getTownRegionId?.(town) ?? -1,
                    ) === option.territoryId,
                );
            if (!nextTown) {
              showGameError("Không tìm thấy thành xuất quân thuộc về bạn");
              return;
            }
            setDeployError(null);
            setDeploySourceTown({ ...nextTown });
          }}
          onConfirm={async (infantry, cavalry, artillery) => {
            setDeployError(null);
            const config = (engineRef.current as any)?.getConfig?.() || {};
            const power =
              infantry * (config.infantryTroopsValue || 18) +
              cavalry * (config.cavalryTroopsValue || 34) +
              artillery * (config.artilleryTroopsValue || 58);
            const route = engineRef.current?.getMarchRouteStatus?.(
              deploySourceTown,
              deployTarget.targetRegionId,
            );
            if (route && !route.ok) {
              showGameError(route.message);
              return;
            }
            const sourceRegionId =
              engineRef.current?.getTownRegionId?.(deploySourceTown);
            if (
              sourceRegionId === undefined ||
              sourceRegionId === null ||
              sourceRegionId < 0
            ) {
              showGameError("Không xác định được lãnh thổ xuất phát");
              return;
            }
            if (!token) {
              showGameError("Chưa kết nối server/socket, không thể xuất binh");
              return;
            }
            if (deploySourceTown) {
              try {
                const effectiveBattleSide =
                  deployTarget.battleSide ||
                  (deployTarget.isAttack ? "attacker" : "defender");
                const effectiveKind = deployTarget.isAttack
                  ? "attack"
                  : effectiveBattleSide === "attacker"
                    ? "attack"
                    : "reinforce";
                const result = await createMarch(token, {
                  requestId: crypto.randomUUID(),
                  fromTerritoryId: engineToServerTerritoryId(sourceRegionId),
                  toTerritoryId: engineToServerTerritoryId(
                    deployTarget.targetRegionId,
                  ),
                  troops: power,
                  infantry,
                  cavalry,
                  artillery,
                  battleSide:
                    effectiveKind === "reinforce"
                      ? effectiveBattleSide
                      : undefined,
                  kind: effectiveKind,
                });
                if (result.town) {
                  const normalized = normalizeTownForClient(result.town);
                  setServerTowns((prev) =>
                    prev.map((t) => (t.id === normalized.id ? normalized : t)),
                  );
                  engineRef.current?.handleAction("applyBackendTownSnapshots", {
                    towns: [normalized],
                  });
                }
                if (result.newbieShieldUntil !== undefined) {
                  engineRef.current?.handleAction("updateNewbieShield", {
                    until: result.newbieShieldUntil,
                  });
                }
                const rendered = engineRef.current?.handleAction(
                  "applyBackendMarch",
                  {
                    march: result.march,
                    unitMix: {
                      infantry,
                      cavalry,
                      artillery,
                      battleSide: effectiveBattleSide,
                    },
                  },
                );
                setWorldActivity((prev) => ({
                  ...prev,
                  marches: [
                    ...prev.marches.filter(
                      (march: any) => march.id !== result.march.id,
                    ),
                    result.march,
                  ],
                }));
                setServerHud((prev) => ({
                  ...prev,
                  lastSync: Date.now(),
                }));
                addWarReport({
                  id: `api-march-${result.march.id}`,
                  kind: effectiveKind === "attack" ? "battle" : "march",
                  title:
                    effectiveKind === "attack"
                      ? "Lệnh tấn công đã xuất phát"
                      : "Lệnh tiếp viện đã xuất phát",
                  body: `${formatNum(result.march.troops || power || 0)} quân đang hành quân tới ${territoryLabel(deployTarget.targetRegionId)}.`,
                  meta: `${result.march.distanceKm ?? 0}km · đến ${formatTimeLeft(result.march.arrivesAt)}`,
                });
                if (rendered === false) {
                  showGameError(
                    "Server đã nhận lệnh nhưng client chưa vẽ được đường hành quân. Dữ liệu sẽ đồng bộ lại từ server.",
                  );
                  refreshGameStateFromServer();
                  return;
                }
              } catch (err: any) {
                console.error("Backend march failed:", err);
                showGameError(err.message || "Server từ chối lệnh hành quân");
                getWorldTerritories(token)
                  .then((world) => {
                    const territories = world.territories.map((territory) => ({
                      id: serverToEngineTerritoryId(territory.id),
                      ownerCode:
                        territory.ownerId === null
                          ? 0
                          : territory.ownerId === playerId
                            ? 1
                            : 2,
                      ownerId: territory.ownerId,
                      ownerName:
                        territory.ownerId === null
                          ? ""
                          : territory.ownerId === playerId
                            ? "Bạn"
                            : (territory.ownerName ?? territory.ownerId),
                      ownerFlagColor: territory.ownerFlagColor,
                      ownerEmblem: territory.ownerEmblem,
                      ownerAllianceTag: territory.ownerAllianceTag,
                      ownerAllianceEmblem: territory.ownerAllianceEmblem,
                    }));
                    engineRef.current?.handleAction("applyWorldOwnership", {
                      territories,
                      replace: true,
                    });
                  })
                  .catch((syncErr) =>
                    console.warn("March reject resync failed:", syncErr),
                  );
                return;
              }
            }
            engineRef.current?.handleAction("setUiOverlayActive", {
              active: false,
            });
            setDeployTarget(null);
            setDeploySourceTown(null);
            setDeployError(null);
            setMarchSourceOptions(null);
          }}
          onClose={() => {
            engineRef.current?.handleAction("setUiOverlayActive", {
              active: false,
            });
            setDeployTarget(null);
            setDeploySourceTown(null);
            setDeployError(null);
            setMarchSourceOptions(null);
          }}
        />
      )}

      {Boolean(
        selectedTownForModal &&
        (selectedTownForModal.owner === 0 ||
          selectedTownForModal.ownerCode === 1 ||
          (playerId && selectedTownForModal.ownerId === playerId)),
      ) &&
        engineRef.current && (
          <TownManagementModal
            town={selectedTownForModal}
            resources={resources}
            gameConfig={(engineRef.current as any).getConfig?.()}
            specialResources={
              (engineRef.current as any).getTerritorySpecialResources?.(
                (engineRef.current as any).getTownRegionId?.(
                  selectedTownForModal,
                ),
              ) || []
            }
            playerColor={
              (engineRef.current as any).getState?.().newbieFlagColor ||
              "#2563eb"
            }
            onClose={() => {
              engineRef.current?.handleAction("setUiOverlayActive", {
                active: false,
              });
              setSelectedTown(null);
              engineRef.current?.handleAction("deselect");
            }}
          />
        )}

      {activeModal === "army" && engineRef.current && (
        <ArmyModal
          army={armyState}
          onCenterCamera={(town) => {
            engineRef.current?.handleAction("centerCamera", {
              townId: town.id,
              x: town.x,
              y: town.y,
            });
          }}
          onClose={closeModal}
        />
      )}

      {activeModal === "kingdom" && (
        <NationModal
          nation={nationStatus}
          townsById={serverTownsById}
          onCenterCamera={locateNationTown}
          onManageTown={manageNationTown}
          onClose={closeModal}
        />
      )}

      {activeModal === "treasure" && engineRef.current && (
        <TreasureModal
          towns={engineRef.current.getTowns()}
          regionOwnership={
            (engineRef.current as any).getState().regionOwnership
          }
          onClose={closeModal}
        />
      )}

      {activeModal === "shop" && (
        <ShopModal
          token={token || ""}
          resources={resources}
          catalog={shopCatalog}
          inventory={shopInventory}
          onResources={(next) => {
            applyResourceSnapshot({ resources: next });
            engineRef.current?.handleAction("syncResources", {
              resources: next,
            });
          }}
          onInventory={(inventory) => {
            setShopInventory(inventory);
            syncShopInventoryToEngine(inventory);
          }}
          onNotify={(message) => {
            addSystemLine(message.toUpperCase());
            pushRealtimeToast({
              id: `shop-${Date.now()}`,
              title: "CỬA HÀNG HOÀNG GIA",
              body: message,
            });
          }}
          getSkinSprite={(skinId) =>
            engineRef.current?.getPremiumCastleSprite(skinId)
          }
          onClose={closeModal}
        />
      )}

      {activeModal === "ally" && engineRef.current && (
        <AllyModal
          token={token}
          playerId={playerId}
          onNotify={(message) => {
            addSystemLine(message.toUpperCase());
            addWarReport({
              id: `alliance-${Date.now()}`,
              kind: "system",
              title: "Cập nhật liên minh",
              body: message,
              meta: "Đồng bộ backend",
            });
            refreshGameStateFromServer();
          }}
          onClose={closeModal}
        />
      )}

      {(activeModal === "warReport" || activeModal === "war_reports") && (
        <div className="modal-overlay war-report-overlay">
          <div className="war-report-modal">
            <button
              type="button"
              className="war-report-close"
              onClick={closeModal}
            >
              ×
            </button>
            <div className="war-report-title">
              <HudIcon name="swords" /> {t("warReportTitle")}
            </div>
            <div className="war-report-stats">
              <div>
                <span>{t("reports")}</span>
                <strong>{battleReports.length}</strong>
              </div>
              <div>
                <span>Chưa đọc</span>
                <strong>{reportUnreadCount}</strong>
              </div>
              <div>
                <span>{t("battles")}</span>
                <strong>{battleRows.length}</strong>
              </div>
              <div>
                <span>{t("marching")}</span>
                <strong>{attackRows.length + ownMarchRows.length}</strong>
              </div>
            </div>
            <div className="war-report-list">
              <div className="war-report-section-title">
                {t("recentReports")}
              </div>
              {recentWarReports.length > 0 ? (
                recentWarReports.map((report) => {
                  const isAttacker = report.attackerId === playerId;
                  const won = report.winnerId === playerId;
                  const casualty = isAttacker
                    ? report.attacker?.casualty?.power
                    : report.defender?.casualty?.power;
                  return (
                    <button
                      type="button"
                      key={report.id}
                      className={`war-report-item battle clickable ${report.read ? "" : "unread"}`}
                      style={{
                        cursor: "pointer",
                        borderLeft: `3px solid ${won ? "#22c55e" : "#ef4444"}`,
                        width: "100%",
                        textAlign: "left",
                      }}
                      onClick={async () => {
                        if (token && !report.read) {
                          try {
                            const result = await markBattleReportRead(
                              token,
                              report.id,
                            );
                            setReportUnreadCount(result.unreadCount);
                            setBattleReports((current) =>
                              current.map((item) =>
                                item.id === report.id
                                  ? { ...item, read: true }
                                  : item,
                              ),
                            );
                          } catch {}
                        }
                        closeModal();
                        setSelectedBattleReport(report);
                      }}
                    >
                      <div className="war-report-item-title">
                        {won ? "CHIẾN THẮNG" : "THẤT BẠI"} ·{" "}
                        {report.territoryName}
                        <span className="war-report-time">
                          {new Date(report.createdAt).toLocaleString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="war-report-item-body">
                        {report.attackerName} giao chiến với{" "}
                        {report.defenderName}
                      </div>
                      <div className="war-report-item-meta">
                        Tổn thất của bạn: {formatNum(casualty || 0)} · Bấm để
                        xem chi tiết
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="war-report-empty">{t("noReports")}</div>
              )}
              <div className="war-report-section-title">{t("activeNow")}</div>
              {warReportRows.length > 0 ? (
                warReportRows.map((row, i) => (
                  <div
                    key={`${row.title}-${i}`}
                    className="war-report-item active"
                  >
                    <div className="war-report-item-title">{row.title}</div>
                    <div className="war-report-item-meta">{row.meta}</div>
                  </div>
                ))
              ) : (
                <div className="war-report-empty">{t("noActiveWar")}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedBattleReport && (
        <BattleReportModal
          report={selectedBattleReport}
          currentUserId={playerId || undefined}
          onClose={() => setSelectedBattleReport(null)}
        />
      )}

      {activeModal === "mail" && (
        <div className="modal-overlay war-report-overlay">
          <div className="war-report-modal mail-modal">
            <button
              type="button"
              className="war-report-close"
              onClick={closeModal}
            >
              ×
            </button>
            <div className="war-report-title">
              <HudIcon name="mail" /> {t("personalMail")}
            </div>
            <div className="mail-layout">
              <div className="mail-compose">
                <div className="mail-panel-title">{t("composeMail")}</div>
                <input
                  type="text"
                  value={mailDraft.to}
                  onChange={(event) =>
                    setMailDraft((prev) => ({
                      ...prev,
                      to: event.target.value,
                    }))
                  }
                  placeholder={t("recipientName")}
                  maxLength={32}
                />
                <input
                  type="text"
                  value={mailDraft.title}
                  onChange={(event) =>
                    setMailDraft((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder={t("mailTitle")}
                  maxLength={48}
                />
                <textarea
                  value={mailDraft.body}
                  onChange={(event) =>
                    setMailDraft((prev) => ({
                      ...prev,
                      body: event.target.value,
                    }))
                  }
                  placeholder={t("mailBody")}
                  maxLength={320}
                />
                <button
                  type="button"
                  className="mail-send-btn"
                  onClick={sendPrivateMail}
                >
                  {t("sendMail")}
                </button>
              </div>
              <div className="mail-inbox">
                <div className="mail-panel-title mail-tabs">
                  <div className="mail-tabs-group">
                    <button
                      type="button"
                      className={mailTab === "inbox" ? "active" : ""}
                      onClick={() => {
                        setMailTab("inbox");
                        setMailDetail(null);
                      }}
                    >
                      {t("inbox")}{" "}
                      {mailUnreadCount > 0 ? `(${mailUnreadCount})` : ""}
                    </button>
                    <button
                      type="button"
                      className={mailTab === "sent" ? "active" : ""}
                      onClick={() => {
                        setMailTab("sent");
                        setMailDetail(null);
                      }}
                    >
                      ĐÃ GỬI
                    </button>
                  </div>
                  <button
                    type="button"
                    className="mail-clear-all-btn"
                    onClick={clearAllMail}
                    disabled={
                      (mailTab === "inbox" ? inbox : sentMail).length === 0
                    }
                    title="Xoá toàn bộ thư trong mục này"
                  >
                    XOÁ TẤT CẢ
                  </button>
                </div>

                {mailDetail ? (
                  <div className="mail-detail">
                    <button
                      type="button"
                      className="mail-detail-back"
                      onClick={() => setMailDetail(null)}
                    >
                      ← Quay lại danh sách
                    </button>
                    <div className="mail-meta">
                      <span>
                        {mailDetail.senderName} → {mailDetail.recipientName}
                      </span>
                      <span>
                        {new Date(mailDetail.sentAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="mail-detail-title">{mailDetail.title}</div>
                    <div className="mail-detail-body">{mailDetail.body}</div>
                    <button
                      type="button"
                      className="mail-item-delete-btn"
                      onClick={() => deleteMailItem(mailDetail)}
                      disabled={mailBusyId === mailDetail.id}
                    >
                      XOÁ THƯ NÀY
                    </button>
                  </div>
                ) : (
                  <div className="mail-list">
                    {(mailTab === "inbox" ? inbox : sentMail).length > 0 ? (
                      (mailTab === "inbox" ? inbox : sentMail).map((mail) => (
                        <div
                          key={mail.id}
                          className={`mail-item ${mail.readAt || mailTab === "sent" ? "" : "unread"}`}
                        >
                          <button
                            type="button"
                            className="mail-item-main"
                            onClick={async () => {
                              if (
                                mailTab === "inbox" &&
                                !mail.readAt &&
                                token
                              ) {
                                try {
                                  const result = await markPlayerMailRead(
                                    token,
                                    mail.id,
                                  );
                                  setMailUnreadCount(result.unreadCount);
                                  setInbox((current) =>
                                    current.map((item) =>
                                      item.id === mail.id
                                        ? { ...item, readAt: result.readAt }
                                        : item,
                                    ),
                                  );
                                } catch {}
                              }
                              setMailDetail(mail);
                            }}
                          >
                            <div className="mail-meta">
                              <span>
                                {mail.senderName} → {mail.recipientName}
                              </span>
                              <span>
                                {new Date(mail.sentAt).toLocaleString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "2-digit",
                                  month: "2-digit",
                                })}
                              </span>
                            </div>
                            <div className="mail-title">{mail.title}</div>
                            <div className="mail-body mail-body-preview">
                              {mail.body}
                            </div>
                            <span className="mail-view-detail-hint">
                              Xem chi tiết →
                            </span>
                          </button>
                          <button
                            type="button"
                            className="mail-item-delete-btn mail-item-delete-icon"
                            onClick={() => deleteMailItem(mail)}
                            disabled={mailBusyId === mail.id}
                            title="Xoá thư"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="war-report-empty">
                        {t("noPersonalMail")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "settings" && (
        <SettingsModal
          language={language}
          onSetLanguage={(lang) => setGameLanguage(lang)}
          onLogout={handleLogout}
          onClose={closeModal}
        />
      )}

      {activeModal === "ranking" && token && (
        <RankingModal token={token} onClose={closeModal} />
      )}

      {activeModal === "chat" && engineRef.current && (
        <ChatInputModal
          onSend={(msg) => {
            engineRef.current?.sendChat(msg);
          }}
          onClose={closeModal}
        />
      )}

      {realtimeToasts.length > 0 && (
        <div className="realtime-toast-stack" aria-live="polite" aria-label="Thông báo">
          {realtimeToasts.map((toast) => {
            const typeClass = toast.report
              ? "realtime-toast--battle"
              : toast.id.startsWith("mail-")
              ? "realtime-toast--info"
              : toast.id.startsWith("shop-")
              ? "realtime-toast--success"
              : "";
            return (
              <button
                type="button"
                className={`realtime-toast ${typeClass}`}
                key={toast.id}
                onClick={async () => {
                  setRealtimeToasts((current) =>
                    current.filter((item) => item.id !== toast.id),
                  );
                  if (toast.report) {
                    if (token && !toast.report.read) {
                      try {
                        const result = await markBattleReportRead(
                          token,
                          toast.report.id,
                        );
                        setReportUnreadCount(result.unreadCount);
                        setBattleReports((current) =>
                          current.map((report) =>
                            report.id === toast.report?.id
                              ? { ...report, read: true }
                              : report,
                          ),
                        );
                      } catch {}
                    }
                    setSelectedBattleReport(toast.report);
                  } else if (toast.id.startsWith("mail-")) openModal("mail");
                }}
              >
                <strong>{toast.title}</strong>
                <span>{toast.body}</span>
                <span className="toast-close-icon" aria-hidden="true">×</span>
              </button>
            );
          })}
        </div>
      )}


      {/* Newbie Tutorial Modal Overlay */}
      {showTutorial && (
        <NewbieOnboardingModal
          onClose={() => {
            localStorage.setItem("island_empire_tutorial_completed", "1");
            engineRef.current?.handleAction("setUiOverlayActive", {
              active: false,
            });
            setShowTutorial(false);
          }}
          onConfirm={() => {
            localStorage.setItem("island_empire_tutorial_completed", "1");
            engineRef.current?.handleAction("setUiOverlayActive", {
              active: false,
            });
            setShowTutorial(false);
          }}
        />
      )}

      {/* ===== AVATAR PICKER MODAL ===== */}
      {showAvatarPicker && (
        <div
          className="avatar-picker-overlay"
          onClick={() => setShowAvatarPicker(false)}
        >
          <div
            className="avatar-picker-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="avatar-picker-header">
              <span className="avatar-picker-title">⚔️ Chọn Đại Diện</span>
              <button
                className="avatar-picker-close"
                onClick={() => setShowAvatarPicker(false)}
              >
                ✕
              </button>
            </div>
            <div className="avatar-picker-grid">
              {[
                { id: "emperor", label: "Hoàng Đế" },
                { id: "warlord", label: "Chiến Tướng" },
                { id: "merchant", label: "Thương Nhân" },
                { id: "scholar", label: "Học Giả" },
                { id: "knight", label: "Kị Sĩ" },
                { id: "queen", label: "Nữ Hoàng" },
                { id: "pirate", label: "Hải Tặc" },
                { id: "nomad", label: "Du Mục" },
                { id: "alchemist", label: "Giả Kim" },
                { id: "assassin", label: "Sát Thủ" },
              ].map((av) => (
                <button
                  key={av.id}
                  className={`avatar-option${selectedAvatarId === av.id ? " active" : ""}`}
                  onClick={() => {
                    setSelectedAvatarId(av.id);
                    localStorage.setItem("island_empire_avatar", av.id);
                    setShowAvatarPicker(false);
                  }}
                  title={av.label}
                >
                  <img
                    src={`/assets/avatars/${av.id}.png`}
                    alt={av.label}
                    className="avatar-option-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/assets/avatars/emperor.png";
                    }}
                  />
                  <span className="avatar-option-label">{av.label}</span>
                  {selectedAvatarId === av.id && (
                    <div className="avatar-option-check">✓</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );

  function townsCountText() {
    if (!engineRef.current) return "0/75";
    const towns = engineRef.current.getTowns();
    const owned = towns.filter((t) => t.owner === 0).length;
    return `${owned}/75`;
  }

  function troopsCountText() {
    if (!engineRef.current) return "0";
    const towns = engineRef.current.getTowns();
    const owned = towns.filter((t) => t.owner === 0);
    const count = owned.reduce((sum, t) => sum + t.troops, 0);
    return formatNum(count);
  }

  function battlePower() {
    if (!engineRef.current) return "0";
    const towns = engineRef.current.getTowns();
    const owned = towns.filter((t) => t.owner === 0);
    const count = owned.reduce((sum, t) => sum + t.troops, 0);
    // Simple dynamic formula for combat power based on troops + resources
    const power = count * 1.2 + resources.gold * 0.05 + resources.gems * 0.4;
    return formatNum(power);
  }
}
