import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createIslandEmpireGame, type GameEngineHandle } from "../game/engine";
import { cancelClearing, completeClearing, createMarch, getGameConfig, getGameState, getServerStatus, getWorldTerritories, recruitTroops, startClearing, updatePlayerProfile } from "../game/api";
import { connectGameSocket, sendWorldChat } from "../game/realtime";
import { detectDeviceLanguage, saveLanguage, translate, type GameLanguage } from "../game/i18n";
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
import { SettingsModal } from "./SettingsModal";
import { BattleReportModal, type BattleReportData } from "./BattleReportModal";
import { useGameStore } from "../store/gameStore";

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
        <polygon points="32,58 10,24 20,8 44,8 54,24" fill="url(#diaDarkHud)" stroke="#0c4a6e" strokeWidth="1.5" />
        <polygon points="32,58 10,24 32,24" fill="url(#diaLightHud)" stroke="#0c4a6e" strokeWidth="1.5" />
        <polygon points="32,58 32,24 54,24" fill="url(#diaLightHud)" opacity="0.8" stroke="#0c4a6e" strokeWidth="1.5" />
        <polygon points="10,24 20,8 32,24" fill="url(#diaTopHud)" stroke="#0c4a6e" strokeWidth="1.5" />
        <polygon points="54,24 44,8 32,24" fill="url(#diaTopHud)" opacity="0.8" stroke="#0c4a6e" strokeWidth="1.5" />
        <polygon points="20,8 44,8 32,24" fill="#f0f9ff" stroke="#0c4a6e" strokeWidth="1.5" />
      </svg>
    );
  }

  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<Exclude<HudIconName, "gold" | "diamonds" | "food" | "wood" | "stone" | "iron" | "gems">, ReactNode> = {
    logout: <><path {...common} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline {...common} points="16 17 21 12 16 7"/><line {...common} x1="21" y1="12" x2="9" y2="12"/></>,
    chevronUp: <polyline {...common} points="18 15 12 9 6 15" />,
    minus: <line {...common} x1="5" y1="12" x2="19" y2="12" />,
    scroll: <><path {...common} d="M6 4h10a2 2 0 0 1 2 2v13H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Z"/><path {...common} d="M7 9h8M7 13h7M7 17h5"/></>,
    chart: <><path {...common} d="M4 19V5"/><path {...common} d="M8 19v-7"/><path {...common} d="M12 19V8"/><path {...common} d="M16 19v-4"/><path {...common} d="M3 19h18"/></>,
    swords: <><path {...common} d="M4 20 20 4M15 4h5v5M13 7l4 4"/><path {...common} d="M20 20 4 4M4 9V4h5M7 13l4 4"/></>,
    pickaxe: <><path {...common} d="M14 5c-3-1-6 0-8 3"/><path {...common} d="M8 8 20 20"/><path {...common} d="M5 19 12 12"/></>,
    shield: <><path {...common} d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path {...common} d="M12 6v12"/></>,
    hammer: <><path {...common} d="M14 4 20 10"/><path {...common} d="M12 6l6 6"/><path {...common} d="M3 21l8-8"/><path {...common} d="M9 15l-2-2"/></>,
    flask: <><path {...common} d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path {...common} d="M7 16h10"/></>,
    crown: <><path {...common} d="M4 18h16l-1-10-5 4-2-7-2 7-5-4-1 10Z"/><path {...common} d="M5 21h14"/></>,
    handshake: <><path {...common} d="M8 12 5 15a2 2 0 0 0 3 3l2-2"/><path {...common} d="M16 12l3 3a2 2 0 0 1-3 3l-5-5"/><path {...common} d="M7 11l4-4 3 3 3-3 4 4"/><path {...common} d="M3 10l4-4M21 10l-4-4"/></>,
    banner: <><path {...common} d="M6 21V4"/><path {...common} d="M6 5h12l-2 4 2 4H6"/></>,
    castle: <><path {...common} d="M4 21V9h4V5h3v4h2V5h3v4h4v12"/><path {...common} d="M8 21v-5a4 4 0 0 1 8 0v5"/><path {...common} d="M4 12h16"/></>,
    map: <><path {...common} d="M4 6 10 3l4 2 6-3v16l-6 3-4-2-6 3V6Z"/><path {...common} d="M10 3v16M14 5v16"/></>,
    door: <><path {...common} d="M6 21V4h10v17"/><path {...common} d="M4 21h16"/><path {...common} d="M13 13h.01"/></>,
    key: <><circle {...common} cx="8" cy="15" r="4"/><path {...common} d="M11 12 20 3M16 7l2 2M14 9l2 2"/></>,
    chat: <><path {...common} d="M4 5h16v11H8l-4 4V5Z"/><path {...common} d="M8 9h8M8 13h6"/></>,
    mail: <><path {...common} d="M4 6h16v12H4V6Z"/><path {...common} d="m4 7 8 6 8-6"/><path {...common} d="m4 18 6-5M20 18l-6-5"/></>,
    star: <><path {...common} d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></>,
    bell: <><path {...common} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path {...common} d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    gear: <><circle {...common} cx="12" cy="12" r="3"/><path {...common} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    book: <><path {...common} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path {...common} d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    bag: <><path {...common} d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line {...common} x1="3" y1="6" x2="21" y2="6"/><path {...common} d="M16 10a4 4 0 0 1-8 0"/></>,
    gift: <><polyline {...common} points="20 12 20 22 4 22 4 12"/><rect {...common} x="2" y="7" width="20" height="5"/><line {...common} x1="12" y1="22" x2="12" y2="7"/><path {...common} d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path {...common} d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></>,
    pin: <><path {...common} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle {...common} cx="12" cy="10" r="3"/></>,
    helmet: <><path {...common} d="M12 2a10 10 0 0 0-10 10v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6A10 10 0 0 0 12 2z"/><path {...common} d="M12 6v6"/><path {...common} d="M6 12h12"/></>,
    globe: <><circle {...common} cx="12" cy="12" r="10"/><line {...common} x1="2" y1="12" x2="22" y2="12"/><path {...common} d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    info: <><circle {...common} cx="12" cy="12" r="10"/><line {...common} x1="12" y1="16" x2="12" y2="12"/><line {...common} x1="12" y1="8" x2="12.01" y2="8"/></>,
    anchor: <><circle {...common} cx="12" cy="5" r="3"/><line {...common} x1="12" y1="8" x2="12" y2="21"/><line {...common} x1="5" y1="12" x2="19" y2="12"/><path {...common} d="M5 12a7 7 0 0 0 14 0"/></>,
    search: <><circle {...common} cx="11" cy="11" r="8"/><line {...common} x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    target: <><circle {...common} cx="12" cy="12" r="9"/><circle {...common} cx="12" cy="12" r="3"/><line {...common} x1="12" y1="1" x2="12" y2="5"/><line {...common} x1="12" y1="19" x2="12" y2="23"/><line {...common} x1="1" y1="12" x2="5" y2="12"/><line {...common} x1="19" y1="12" x2="23" y2="12"/></>,
    clock: <><circle {...common} cx="12" cy="12" r="9"/><polyline {...common} points="12 7 12 12 15 15"/></>,
    lightning: <><polygon {...common} points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
    fullscreen: <><path {...common} d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></>,
  };
  return <svg className="hud-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
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
      <rect x="6" y="34" width="38" height="16" rx="4" fill="url(#woodGrad)" stroke="#451a03" strokeWidth="1.5" />
      <ellipse cx="44" cy="42" rx="4" ry="8" fill="url(#ringGrad)" stroke="#451a03" strokeWidth="1.5" />
      
      <rect x="18" y="42" width="38" height="16" rx="4" fill="url(#woodGrad)" stroke="#451a03" strokeWidth="1.5" />
      <ellipse cx="56" cy="50" rx="4" ry="8" fill="url(#ringGrad)" stroke="#451a03" strokeWidth="1.5" />
      
      <rect x="12" y="20" width="38" height="16" rx="4" fill="url(#woodGrad)" stroke="#451a03" strokeWidth="1.5" />
      <ellipse cx="50" cy="28" rx="4" ry="8" fill="url(#ringGrad)" stroke="#451a03" strokeWidth="1.5" />
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
      <polygon points="32,6 56,18 32,30 8,18" fill="url(#stoneTop)" stroke="#1e293b" strokeWidth="1.5" />
      <polygon points="8,18 32,30 32,58 8,44" fill="url(#stoneLight)" stroke="#1e293b" strokeWidth="1.5" />
      <polygon points="32,30 56,18 56,44 32,58" fill="url(#stoneDark)" stroke="#1e293b" strokeWidth="1.5" />
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
      <polygon points="10,14 54,14 44,48 20,48" fill="url(#metalGrad)" stroke="#0f172a" strokeWidth="1.5" />
      <polygon points="54,14 44,48 48,48 58,14" fill="url(#metalSide)" stroke="#0f172a" strokeWidth="1.5" />
      <line x1="16" y1="18" x2="50" y2="18" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
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
      <polygon points="32,58 10,24 20,8 44,8 54,24" fill="url(#rubyDark)" stroke="#4c0519" strokeWidth="1.5" />
      <polygon points="32,58 10,24 32,24" fill="url(#rubyLight)" stroke="#4c0519" strokeWidth="1.5" />
      <polygon points="32,58 32,24 54,24" fill="url(#rubyLight)" opacity="0.8" stroke="#4c0519" strokeWidth="1.5" />
      <polygon points="10,24 20,8 32,24" fill="url(#rubyTop)" stroke="#4c0519" strokeWidth="1.5" />
      <polygon points="54,24 44,8 32,24" fill="url(#rubyTop)" opacity="0.8" stroke="#4c0519" strokeWidth="1.5" />
      <polygon points="20,8 44,8 32,24" fill="#ffe4e6" stroke="#4c0519" strokeWidth="1.5" />
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
      <ellipse cx="20" cy="46" rx="13" ry="6.5" fill="url(#goldCoinGrad)" stroke="#854d0e" strokeWidth="1.5" />
      <ellipse cx="20" cy="38" rx="13" ry="6.5" fill="url(#goldCoinGrad)" stroke="#854d0e" strokeWidth="1.5" />
      
      <ellipse cx="44" cy="50" rx="13" ry="6.5" fill="url(#goldCoinGrad)" stroke="#854d0e" strokeWidth="1.5" />
      <ellipse cx="44" cy="42" rx="13" ry="6.5" fill="url(#goldCoinGrad)" stroke="#854d0e" strokeWidth="1.5" />
      
      <ellipse cx="32" cy="34" rx="15" ry="7.5" fill="url(#goldCoinGrad)" stroke="#854d0e" strokeWidth="1.5" />
      <ellipse cx="32" cy="26" rx="15" ry="7.5" fill="url(#goldCoinGrad)" stroke="#854d0e" strokeWidth="1.5" />
      
      <polygon points="36,16 38,20 42,20 39,23 40,27 36,25 32,27 33,23 30,20 34,20" fill="#ffffff" />
    </svg>
  );
}

function VectorCoalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="vector-res-svg">
      <polygon points="5,17 9,9 17,9 19,17 13,20" fill="#1e293b" stroke="#0f172a" strokeWidth="1.2" />
      <polygon points="12,7 16,3 21,5 19,10" fill="#334155" stroke="#0f172a" strokeWidth="1" />
      <polygon points="9,9 17,9 13,15 8,13" fill="#475569" />
    </svg>
  );
}

function VectorSulfurIcon() {
  return (
    <svg viewBox="0 0 24 24" className="vector-res-svg">
      <polygon points="6,18 10,8 18,9 19,17 12,20" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
      <polygon points="10,8 18,9 13,15" fill="#fef08a" />
      <polygon points="4,12 8,5 12,8" fill="#ca8a04" stroke="#a16207" strokeWidth="1" />
    </svg>
  );
}

/* Rich Status Icons for Left Card */
function StatusIconLeaf() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <path d="M 12,2 C 18,4 22,10 20,17 C 18,22 11,22 5,19 C 4,13 6,5 12,2 Z" fill="#4ade80" />
      <path d="M 12,4 Q 10,13 5,19" stroke="#166534" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function StatusIconShield() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <path d="M 12,3 L 20,6 C 20,14 12,21 12,21 C 12,21 4,14 4,6 Z" fill="#60a5fa" stroke="#1e40af" strokeWidth="1" />
    </svg>
  );
}

function StatusIconBlood() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <path d="M 12,3 C 16,8 19,13 19,16 C 19,20 16,22 12,22 C 8,22 5,20 5,16 C 5,13 8,8 12,3 Z" fill="#f87171" stroke="#991b1b" strokeWidth="1" />
    </svg>
  );
}

function StatusIconVault() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <rect x="4" y="8" width="16" height="13" rx="2" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
      <path d="M 4,13 L 20,13" stroke="#fef08a" strokeWidth="1.5" />
    </svg>
  );
}

function StatusIconBolt() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
    </svg>
  );
}

function StatusIconSwords() {
  return (
    <svg viewBox="0 0 24 24" className="vector-status-icon">
      <path d="M 4,20 L 20,4 M 16,4 L 20,4 L 20,8 M 4,4 L 20,20 M 4,16 L 4,20 L 8,20" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
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
    `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
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

type UnitType = "infantry" | "cavalry" | "artillery";

function pickStarterTerritoryId(playerId: string, territories: Array<{ id: number; ownerCode: number; isIslet?: boolean }>) {
  const wild = territories.filter((territory) => territory.ownerCode === 0 && !territory.isIslet);
  const pool = wild.length > 0 ? wild : territories.filter((territory) => territory.ownerCode === 0);
  if (pool.length === 0) return null;
  return pool[stableHash(playerId) % pool.length].id;
}

function summarizeBackendHud(
  world: any,
  currentPlayerId: string | null,
  resources: { gold: number; gems: number; food?: number; iron?: number; coal?: number; sulfur?: number },
) {
  const territories = Array.isArray(world?.territories) ? world.territories : [];
  const marches = Array.isArray(world?.marches) ? world.marches : [];
  const clearings = Array.isArray(world?.clearings) ? world.clearings : [];
  const ownedTerritories = territories.filter((territory: any) => territory.ownerId && territory.ownerId === currentPlayerId).length;
  const outboundMarches = marches.filter((march: any) => march.ownerId === currentPlayerId);
  const outboundTroops = outboundMarches.reduce((sum: number, march: any) => sum + (march.troops || 0), 0);
  const ownedTroops = outboundTroops;
  const strategicPower = ownedTroops * 1.2 + ownedTerritories * 40 + resources.gold * 0.03 + resources.gems * 0.4;
  return {
    ownedTerritories,
    totalTerritories: territories.length,
    enemyTerritories: territories.filter((territory: any) => territory.ownerId && territory.ownerId !== currentPlayerId).length,
    activeMarches: marches.length,
    ownMarches: outboundMarches.length,
    activeClearings: clearings.length,
    ownClearings: clearings.filter((clearing: any) => clearing.playerId === currentPlayerId).length,
    outboundTroops,
    ownedTroops,
    strategicPower,
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
    t: battle.startedAt ? Math.max(0, (Date.now() - new Date(battle.startedAt).getTime()) / 1000) : battle.t ?? 0,
  }));
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
function parseChatLine(line: string) {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    return { channel: "THẾ GIỚI", name: "Hệ thống", message: line };
  }
  const namePart = line.substring(0, colonIndex).trim();
  const msgPart = line.substring(colonIndex + 1).trim();
  
  let channel = "THẾ GIỚI";
  let name = namePart;
  
  if (namePart.startsWith("[HỆ THỐNG]")) {
    channel = "HỆ THỐNG";
    name = namePart.replace("[HỆ THỐNG]", "").trim() || "SYSTEM";
  } else if (namePart.startsWith("[LIÊN MINH]")) {
    channel = "HỆ THỐNG";
    name = namePart.replace("[LIÊN MINH]", "").trim() || "HỆ THỐNG";
  } else if (namePart.startsWith("[THẾ GIỚI]")) {
    channel = "THẾ GIỚI";
    name = namePart.replace("[THẾ GIỚI]", "").trim();
  }
  
  return { channel, name, message: msgPart };
}

type ChatChannel = "HỆ THỐNG" | "THẾ GIỚI";
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

function summarizeResourceGain(gain?: Record<string, number>, seconds = 0) {
  if (!gain) return "";
  const labels: Record<string, string> = {
    gold: "Vàng",
    wood: "Gỗ",
    stone: "Đá",
    food: "Lúa",
    iron: "Sắt",
    coal: "Than",
    sulfur: "Lưu huỳnh",
    gems: "Đá quý",
  };
  const parts = Object.entries(gain)
    .filter(([, value]) => value > 0)
    .slice(0, 5)
    .map(([key, value]) => `${labels[key] ?? key} +${formatNum(value)}`);
  if (parts.length === 0 || seconds <= 0) return "";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${parts.join(", ")} trong ${minutes} phút offline`;
}

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

function CastleArt() {
  return (
    <svg viewBox="0 0 100 100" width="80" height="80" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="41" fill="#0b1422" stroke="#ffd34d" strokeWidth="2.5" />
      <rect x="35" y="45" width="30" height="30" fill="#64748b" stroke="#f8fafc" strokeWidth="1" />
      <path d="M 44,75 L 44,60 Q 50,55 56,60 L 56,75 Z" fill="#020617" stroke="#ffd34d" strokeWidth="1.5" />
      <rect x="25" y="35" width="12" height="40" fill="#64748b" stroke="#f8fafc" strokeWidth="1" />
      <polygon points="23,35 31,20 39,35" fill="#ef4444" stroke="#ffd34d" strokeWidth="1" />
      <rect x="63" y="35" width="12" height="40" fill="#64748b" stroke="#f8fafc" strokeWidth="1" />
      <polygon points="61,35 69,20 77,35" fill="#ef4444" stroke="#ffd34d" strokeWidth="1" />
    </svg>
  );
}

function ArmyArt() {
  return (
    <svg viewBox="0 0 100 100" width="80" height="80" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="41" fill="#0b1422" stroke="#ffd34d" strokeWidth="2.5" />
      <path d="M25 75 L75 25 M30 80 L80 30 M70 20 L80 30 M20 70 L30 80" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      <path d="M75 75 L25 25 M70 80 L20 30 M30 20 L20 30 M80 70 L70 80" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="50" r="10" fill="#ef4444" stroke="#ffd34d" strokeWidth="1.5" />
    </svg>
  );
}

function ResourceArt() {
  return (
    <svg viewBox="0 0 100 100" width="80" height="80" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="41" fill="#0b1422" stroke="#ffd34d" strokeWidth="2.5" />
      <polygon points="35,60 45,45 60,48 55,68 40,65" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
      <polygon points="50,30 65,30 72,42 50,60 28,42" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
      <rect x="25" y="48" width="22" height="6" rx="2" fill="#b45309" stroke="#78350f" strokeWidth="1" />
    </svg>
  );
}

function DiplomacyArt() {
  return (
    <svg viewBox="0 0 100 100" width="80" height="80" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="41" fill="#0b1422" stroke="#ffd34d" strokeWidth="2.5" />
      <path d="M 25,50 C 35,40 45,40 55,50 C 65,60 75,50 75,50" stroke="#ffd34d" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M 35,50 Q 50,60 65,50" stroke="#3b82f6" strokeWidth="2" fill="none" />
      <circle cx="50" cy="45" r="8" fill="#ffd700" opacity="0.8" />
    </svg>
  );
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngineHandle | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const backendClaimCompleteRef = useRef<Set<number>>(new Set());
  const gameStateRefreshInFlightRef = useRef(false);
  const gameStateRefreshQueuedRef = useRef(false);
  const lastGameStateRefreshAtRef = useRef(0);
  const socketHelloCountRef = useRef(0); // counts hello events; >1 = reconnect
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
  const [token, setToken] = useState<string | null>(() => (isNewbieMode() ? null : localStorage.getItem(TOKEN_KEY)));
  const [playerId, setPlayerId] = useState<string | null>(() =>
    isNewbieMode() ? null : localStorage.getItem(PLAYER_ID_KEY)
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
  const serverTownsById = useGameStore((state) => state.townsById);
  const setServerTowns = useGameStore((state) => state.setTowns);
  const upsertServerTown = useGameStore((state) => state.upsertTown);
  const resetGameStore = useGameStore((state) => state.resetGameStore);
  const [missions, setMissions] = useState<Array<{ text: string; value: number; goal: number }>>([
    { text: "CHIẾM 3 THÀNH PHỐ", value: 0, goal: 3 },
    { text: "GỬI 1 ĐẠO QUÂN HÀNH QUÂN", value: 0, goal: 1 },
    { text: "THAM GIA LIÊN MINH", value: 0, goal: 1 }
  ]);
  const [chatLog, setChatLog] = useState<string[]>([]);
  const [xp, setXp] = useState(68);
  const [level, setLevel] = useState(25);
  const [toastMessage, setToastMessage] = useState("CHỌN THÀNH CỦA BẠN ĐỂ RA LỆNH");
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  // Tick every second so march countdowns update in real-time
  const [_tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [selectedTown, setSelectedTown] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [newbiePhase, setNewbiePhase] = useState<string>("none");
  const [newbieSelectedRegion, setNewbieSelectedRegion] = useState<number | null>(null);
  const [kingdomCreationRegion, setKingdomCreationRegion] = useState<number | null>(null);
  const [coordinateSearch, setCoordinateSearch] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatChannel, setChatChannel] = useState<ChatChannel>("THẾ GIỚI");
  const [language, setLanguage] = useState<GameLanguage>(() => detectDeviceLanguage());
  const [warReports, setWarReports] = useState<WarReportRecord[]>([]);
  const [privateMails, setPrivateMails] = useState<PrivateMailRecord[]>([
    {
      id: "welcome-mail",
      from: "HỆ THỐNG",
      to: "Bạn",
      title: "Lệnh triệu tập tân vương",
      body: "Hộp thư cá nhân dùng để nhận thư riêng, báo cáo ngoại giao và lệnh mật từ liên minh.",
      time: Date.now(),
      read: false,
    },
  ]);
  const [mailDraft, setMailDraft] = useState({ to: "", title: "", body: "" });
  const t = useCallback((key: Parameters<typeof translate>[1]) => translate(language, key), [language]);
  const setGameLanguage = useCallback((next: GameLanguage) => {
    saveLanguage(next);
    setLanguage(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("appName");
  }, [language, t]);
  const [deployTarget, setDeployTarget] = useState<{ targetRegionId: number; isAttack: boolean; battleSide?: "attacker" | "defender" } | null>(null);
  const [deploySourceTown, setDeploySourceTown] = useState<any>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string>("none");
  const [selectedBattleReport, setSelectedBattleReport] = useState<BattleReportData | null>(null);
  const [mobileMenu, setMobileMenu] = useState<"none" | "left" | "right">("none");
  const [leftTab, setLeftTab] = useState<"missions" | "kingdom">("missions");
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(false);
  const [socketOnline, setSocketOnline] = useState(false);
  const [serverEventLog, setServerEventLog] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const backendClearingStartRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event?.error?.stack || event?.error?.message || event?.message || "Lỗi JavaScript không xác định";
      console.error("Global JS Error:", event);
      setRuntimeError(`[JS ERROR] ${msg}`);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event?.reason?.stack || event?.reason?.message || String(event?.reason) || "Promise bị từ chối";
      console.error("Unhandled Rejection:", event.reason);
      setRuntimeError(`[ASYNC ERROR] ${msg}`);
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  const addWarReport = useCallback((report: Omit<WarReportRecord, "time"> & { time?: number }) => {
    setWarReports((prev) => {
      const idx = prev.findIndex((item) => item.id === report.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...report, time: report.time ?? copy[idx].time };
        return copy;
      }
      return [{ ...report, time: report.time ?? Date.now() }, ...prev].slice(0, 100);
    });
  }, []);

  const addSystemLine = useCallback((message: string) => {
    setServerEventLog((prev) => [...prev.slice(-14), `[HỆ THỐNG] SYSTEM: ${message}`]);
  }, []);

  const addPrivateReportMail = useCallback((title: string, body: string) => {
    setPrivateMails((prev) => [{
      id: `report-mail-${Date.now()}-${prev.length}`,
      from: "CHIẾN BÁO",
      to: "Bạn",
      title,
      body,
      time: Date.now(),
      read: false,
    }, ...prev].slice(0, 60));
  }, []);

  const sendPrivateMail = () => {
    const to = mailDraft.to.trim();
    const title = mailDraft.title.trim() || "THƯ KHÔNG TIÊU ĐỀ";
    const body = mailDraft.body.trim();
    if (!to || !body) return;
    setPrivateMails((prev) => [{
      id: `mail-${Date.now()}`,
      from: "Bạn",
      to,
      title,
      body,
      time: Date.now(),
      read: true,
    }, ...prev].slice(0, 60));
    setMailDraft({ to: "", title: "", body: "" });
    addSystemLine(`ĐÃ GỬI THƯ CÁ NHÂN ĐẾN ${to}`);
  };

  const jumpToCoordinates = useCallback(() => {
    const matches = coordinateSearch.match(/-?\d+(?:\.\d+)?/g);
    if (!matches || matches.length < 2) {
      engineRef.current?.handleAction("setToast", { message: "NHẬP TỌA ĐỘ DẠNG X:Y, VÍ DỤ 13120:11063" });
      return;
    }
    const x = Math.round(Number(matches[0]));
    const y = Math.round(Number(matches[1]));
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      engineRef.current?.handleAction("setToast", { message: "TỌA ĐỘ KHÔNG HỢP LỆ" });
      return;
    }
    engineRef.current?.handleAction("centerCamera", { x, y, label: `X:${x} Y:${y}` });
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
        engineRef.current.handleAction("setMinimapCanvas", minimapCanvasRef.current);
      }
      const completed = localStorage.getItem("island_empire_tutorial_completed");
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
        if (token && Array.isArray(engineState.pendingBackendClearingStarts) && engineState.pendingBackendClearingStarts.length > 0) {
          engineState.pendingBackendClearingStarts.forEach((regionId: number) => {
            if (backendClearingStartRef.current.has(regionId)) return;
            backendClearingStartRef.current.add(regionId);
            startClearing(token, engineToServerTerritoryId(regionId))
              .then((result) => {
                engineRef.current?.handleAction("applyBackendClearing", { clearing: result.clearing });
                refreshGameStateWithRetry("pending-clearing-started", 2, 700);
                engineRef.current?.handleAction("consumeBackendClearingStarts");
              })
              .catch((err) => {
                console.error("Backend clearing start failed:", err);
                engineRef.current?.handleAction("markClearingRejected", { regionId, message: err.message || "Server từ chối xây thành" });
              })
              .finally(() => {
                backendClearingStartRef.current.delete(regionId);
              });
          });
        }

	        if (token && Array.isArray(engineState.pendingBackendClaims) && engineState.pendingBackendClaims.length > 0) {
	          engineState.pendingBackendClaims.forEach((regionId: number) => {
	            if (backendClaimCompleteRef.current.has(regionId)) return;
	            backendClaimCompleteRef.current.add(regionId);
	            completeClearing(token, engineToServerTerritoryId(regionId))
	              .then((result) => {
	                if (result.territory) {
	                  engineRef.current?.handleAction("applyWorldOwnership", {
	                    territories: [{
	                      id: serverToEngineTerritoryId(result.territory.id),
	                      ownerCode: result.territory.ownerId === playerId ? 1 : 2,
	                      ownerId: result.territory.ownerId,
	                      ownerName: result.territory.ownerId === playerId ? "Bạn" : result.territory.ownerName ?? result.territory.ownerId ?? "Đối thủ",
	                      ownerFlagColor: result.territory.ownerFlagColor,
	                      ownerEmblem: result.territory.ownerEmblem,
	                      ownerAllianceTag: result.territory.ownerAllianceTag,
	                      ownerAllianceEmblem: result.territory.ownerAllianceEmblem,
	                    }],
	                  });
	                }
	                engineRef.current?.handleAction("consumeBackendClaim", { regionId });
	              })
	              .catch((err) => {
	                console.error("Backend clearing complete failed:", err);
	                if (err?.message?.includes("chưa hoàn tất") || err?.message?.includes("not_ready")) {
	                  return;
	                }
	                engineRef.current?.handleAction("markClaimRejected", { regionId });
	              })
	              .finally(() => {
	                backendClaimCompleteRef.current.delete(regionId);
	              });
	          });
	        }

        if (token && Array.isArray(engineState.pendingBackendConquests) && engineState.pendingBackendConquests.length > 0) {
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
        const recentLog = Array.isArray(engineState.log) ? engineState.log.slice(-8) : [];
        const chatSnapshot = `${recentLog.length}|${recentLog[recentLog.length - 1] || ""}`;
        if (chatSnapshot !== snapshots.chat) {
          snapshots.chat = chatSnapshot;
          setChatLog(recentLog);
        }
        const metaSnapshot = `${engineState.xp || 68}|${engineState.level || 25}|${engineState.toast || ""}|${engineState.newbiePhase || "none"}|${engineState.newbieSelectedRegion ?? ""}`;
        if (metaSnapshot !== snapshots.meta) {
          snapshots.meta = metaSnapshot;
          setXp(engineState.xp || 68);
          setLevel(engineState.level || 25);
          setToastMessage(engineState.toast || "");
          setNewbiePhase(engineState.newbiePhase || "none");
          setNewbieSelectedRegion(
            engineState.newbieSelectedRegion !== undefined && engineState.newbieSelectedRegion !== null
              ? engineState.newbieSelectedRegion
              : null
          );
        }

        if (Array.isArray(engineState.activeBattles)) {
          const battleSnapshot = `${engineState.activeBattles.length}|${engineState.activeBattles.map((b: any) => `${b.regionId}:${Math.round(b.t || 0)}`).join(",")}`;
          if (battleSnapshot !== snapshots.battles) {
            snapshots.battles = battleSnapshot;
            setWorldActivity((prev) => ({ ...prev, battles: [...engineState.activeBattles] }));
          }
        }

        // Handle region selection
        if (engineState.selectedRegion !== null && engineState.selectedRegion !== undefined) {
          const id = engineState.selectedRegion;
          const regObj = engineRef.current?.getRegion?.(id);
          const isIslet = Boolean(regObj?.isIslet);
          const ownership = engineRef.current?.getRegionOwnership?.(id) ?? engineState.regionOwnership?.[id] ?? 0;
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

        const selected = engineTowns.find((t: any) => t.id === engineState.selected);
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
      { layout: conquestMode ? "conquest" : "world" }
    );
    engineRef.current?.handleAction?.("setLocalPlayer", { playerId, playerName: "Bạn" });

    if (token && playerId) {
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
        getGameState(token),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Server timeout 15s")), 15000))
      ]);

      fetchWorldData
        .then((world) => {
          const effectivePlayerId = (world.playerId && world.playerId !== playerId) ? world.playerId : playerId;
          if (world.playerId && world.playerId !== playerId) {
            localStorage.setItem(PLAYER_ID_KEY, world.playerId);
            setPlayerId(world.playerId);
          }
          const territories = world.territories.map((territory) => ({
            id: serverToEngineTerritoryId(territory.id),
            ownerCode: territory.ownerId === null ? 0 : territory.ownerId === effectivePlayerId ? 1 : 2,
            ownerId: territory.ownerId,
            ownerName: territory.ownerId === null ? "" : territory.ownerId === effectivePlayerId ? "Bạn" : territory.ownerName ?? territory.ownerId,
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
            battles: conquestMode ? [] : mapServerBattlesForClient(world.battles || []),
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
                  engineRef.current?.handleAction("applyBackendMarch", { march });
                } catch (e) {
                  console.warn("Failed to re-apply march on second pass:", e);
                }
              });
              const ownMarch = world.marches.find((march: any) => march.ownerId === playerId);
              if (ownMarch) {
                engineRef.current?.handleAction("focusBackendMarch", { marchId: ownMarch.id });
              } else {
                const ownClearing = world.clearings.find((clearing: any) => clearing.playerId === playerId);
                if (ownClearing) {
                  engineRef.current?.handleAction("focusBackendClearing", { territoryId: ownClearing.territoryId });
                }
              }
            }
          }, 180);
          setResources({ ...world.resources });
          setServerTowns((world.towns || []).map((town: any) => normalizeTownForClient(town)));
          const offlineSummary = summarizeResourceGain(world.offlineGain, world.offlineSeconds);
          if (offlineSummary) {
            addWarReport({
              id: `offline-income-${Date.now()}`,
              kind: "system",
              title: "Thu tài nguyên offline",
              body: offlineSummary,
              meta: "Tính theo thời gian server và sức chứa kho",
            });
            addPrivateReportMail("Báo cáo tài nguyên offline", offlineSummary);
            addSystemLine(`THU TÀI NGUYÊN OFFLINE: ${offlineSummary.toUpperCase()}`);
          }
          setWorldActivity({
            marches: world.marches,
            clearings: world.clearings,
            battles: mapServerBattlesForClient(world.battles || []),
            territoryById: Object.fromEntries(world.territories.map((territory: any) => [serverToEngineTerritoryId(territory.id), territory])),
          });
          setServerHud(summarizeBackendHud(world, playerId, world.resources));
          setMissions([
            { text: "SỞ HỮU 3 LÃNH THỔ", value: Math.min(territories.filter((territory) => territory.ownerCode === 1).length, 3), goal: 3 },
            { text: "CÓ 1 ĐẠO QUÂN ĐANG HÀNH QUÂN", value: Math.min(world.marches.filter((march: any) => march.ownerId === playerId).length, 1), goal: 1 },
            { text: "HOÀN TẤT 1 XÂY THÀNH", value: Math.min(territories.filter((territory) => territory.ownerCode === 1).length, 1), goal: 1 }
          ]);
          const hasOwnedTerritory = territories.some((territory) => territory.ownerCode === 1);
          const hasOwnClearing = world.clearings.some((clearing: any) => clearing.playerId === playerId);
          if (!hasOwnedTerritory && !hasOwnClearing) {
            localStorage.setItem(ONBOARDING_KEY, "1");
            setKingdomCreationRegion(null);
          }
          if (localStorage.getItem(ONBOARDING_KEY) === "1") {
            const owned = territories.find((t) => t.ownerCode === 1);
            if (owned) {
              engineRef.current?.handleAction("setStarterRegion", { regionId: owned.id, zoom: 1.18 });
              localStorage.removeItem(ONBOARDING_KEY);
            } else {
              const starterRegionId = pickStarterTerritoryId(playerId, territories);
              if (starterRegionId !== null) {
                engineRef.current?.handleAction("setStarterRegion", { regionId: starterRegionId, zoom: 1.18 });
              }
            }
          }
          setLoadingText("ĐÃ ĐỒNG BỘ XONG, ĐANG VÀO GAME");
          enterGame("ĐÃ ĐỒNG BỘ XONG, ĐANG VÀO GAME");
          getGameConfig()
            .then((config) => engineRef.current?.handleAction("applyConfig", { config }))
            .catch((err) => console.warn("Could not load game config, using engine defaults:", err));
        })
        .catch((err) => {
          console.warn("Could not load backend world ownership, fallback to offline engine:", err);
          if (err?.message?.includes("401") || err?.message?.includes("unauthorized") || err?.message?.includes("not_found")) {
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

  useEffect(() => {
    if (!isAuthenticated || !token || !playerId) return;
    return connectGameSocket(token, (event) => {
      if (event.type === "world_chat") {
        setChatLog((prev) => [...prev.slice(-24), `[THẾ GIỚI] ${event.playerName}: ${event.message}`]);
        return;
      }
      if (event.type === "hello") {
        setSocketOnline(true);
        socketHelloCountRef.current += 1;
        if (socketHelloCountRef.current > 1) {
          // Đây là lần kết nối LẠI (sau server reload / mất mạng)
          // → Fetch toàn bộ game state để phục hồi:
          //   quân đang hành quân, xây thành đang chạy, trận đánh v.v.
          // Delay nhỏ để WebSocket handshake hoàn tất trước.
          setTimeout(() => refreshGameStateFromServer("socket-reconnect", true), 500);
        }
      }
      if (event.type === "player_state_updated") {
        applyRealtimePlayerState(event);
      }
      if (event.type === "battle_resolved") {
        if (event.territory) {
          const engTerritoryId = serverToEngineTerritoryId(event.territory.id);
          const isMine = event.territory.ownerId === playerId;
          engineRef.current?.handleAction("applyWorldOwnership", {
            territories: [{
              id: engTerritoryId,
              ownerCode: isMine ? 1 : (event.territory.ownerId ? 2 : 0),
              ownerId: event.territory.ownerId,
              ownerName: isMine ? "Bạn" : event.territory.ownerName ?? "Đối thủ",
              ownerFlagColor: event.territory.ownerFlagColor,
              ownerEmblem: event.territory.ownerEmblem,
              ownerAllianceTag: event.territory.ownerAllianceTag,
              ownerAllianceEmblem: event.territory.ownerAllianceEmblem,
            }],
          });
        }

        if (event.report) {
          const rep = event.report;
          const isAttacker = rep.attackerId === playerId;
          const isDefender = rep.defenderId === playerId;
          if (isAttacker || isDefender) {
            setSelectedBattleReport(rep);
            const isWinner = isAttacker ? rep.isAttackerWin : !rep.isAttackerWin;
            const reportTitle = isWinner
              ? `CHIẾN THẮNG TẠI LÃNH THỔ #${rep.regionId + 1}`
              : `THẤT THỦ TẠI LÃNH THỔ #${rep.regionId + 1}`;
            const myCasualties = isAttacker ? rep.attacker?.casualty?.power : rep.defender?.casualty?.power;
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

            showGameError(isWinner ? `CHIẾN THẮNG! BẠN ĐÃ THẮNG TRẬN TẠI LÃNH THỔ #${rep.regionId + 1}` : `THẤT THỦ! LÃNH THỔ #${rep.regionId + 1} BỊ ĐÁNH BẠI`);
          }
        }
      }
      if (event.type === "territory_claimed") {
        addWarReport({
          id: `socket-claim-${event.territory.id}-${event.territory.ownerId}`,
          kind: "clearing",
          title: `${event.territory.ownerId === playerId ? "Bạn" : event.territory.ownerName || "Người chơi"} đã chiếm ${territoryLabel(serverToEngineTerritoryId(event.territory.id))}`,
          body: event.territory.ownerId === playerId
            ? "Xây thành hoàn tất. Thành trì mới đã sẵn sàng nhận lệnh."
            : "Một lãnh thổ trên thế giới vừa đổi chủ.",
          meta: `Tọa độ X:${event.territory.x} Y:${event.territory.y}`,
          isMine: event.territory.ownerId === playerId,
        });
          if (event.territory.ownerId === playerId) {
            addPrivateReportMail(
            `Lãnh thổ mới: ${territoryLabel(serverToEngineTerritoryId(event.territory.id))}`,
            "Xây thành hoàn tất qua đồng bộ server. Vùng đất đã thuộc quyền kiểm soát của bạn."
            );
            refreshGameStateWithRetry("stronghold-completed", 3, 300);
          }
        engineRef.current?.handleAction("applyWorldOwnership", {
          territories: [{
            id: serverToEngineTerritoryId(event.territory.id),
            ownerCode: event.territory.ownerId === playerId ? 1 : 2,
            ownerId: event.territory.ownerId,
            ownerName: event.territory.ownerId === playerId ? "Bạn" : event.territory.ownerName ?? event.territory.ownerId ?? "Đối thủ",
            ownerFlagColor: event.territory.ownerFlagColor,
            ownerEmblem: event.territory.ownerEmblem,
            ownerAllianceTag: event.territory.ownerAllianceTag,
            ownerAllianceEmblem: event.territory.ownerAllianceEmblem,
          }],
        });
        setWorldActivity((prev) => ({
          ...prev,
          clearings: prev.clearings.filter((clearing) => clearing.territoryId !== serverToEngineTerritoryId(event.territory.id)),
          territoryById: {
            ...prev.territoryById,
            [serverToEngineTerritoryId(event.territory.id)]: event.territory,
          },
        }));
        setServerHud((prev) => ({
          ...prev,
          ownedTerritories: prev.ownedTerritories + (event.territory.ownerId === playerId ? 1 : 0),
          enemyTerritories: prev.enemyTerritories + (event.territory.ownerId && event.territory.ownerId !== playerId ? 1 : 0),
          activeClearings: Math.max(0, prev.activeClearings - 1),
          ownClearings: Math.max(0, prev.ownClearings - (event.territory.ownerId === playerId ? 1 : 0)),
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
        engineRef.current?.handleAction("applyBackendClearing", { clearing: event.clearing });
        setWorldActivity((prev) => ({
          ...prev,
          clearings: [
            ...prev.clearings.filter((clearing) => clearing.territoryId !== event.clearing.territoryId),
            event.clearing,
          ],
        }));
        setServerHud((prev) => ({
          ...prev,
          activeClearings: prev.activeClearings + 1,
          ownClearings: prev.ownClearings + (event.clearing.playerId === playerId ? 1 : 0),
          lastSync: Date.now(),
        }));
      }
      if (event.type === "territory_clearing_cancelled") {
        const canvasId = serverToEngineTerritoryId(event.territoryId);
        engineRef.current?.handleAction("cancelClaimRegion", canvasId);
        setWorldActivity((prev) => ({
          ...prev,
          clearings: prev.clearings.filter((clearing) => clearing.territoryId !== event.territoryId),
        }));
        setServerHud((prev) => ({
          ...prev,
          activeClearings: Math.max(0, prev.activeClearings - 1),
          ownClearings: Math.max(0, prev.ownClearings - (event.playerId === playerId ? 1 : 0)),
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
            event.march.kind === "reinforce" ? "Lệnh tiếp viện đã xuất phát" : "Lệnh tấn công đã xuất phát",
            `${formatNum(event.march.troops || 0)} quân đang di chuyển tới ${territoryLabel(serverToEngineTerritoryId(event.march.toTerritoryId))}. Dự kiến đến nơi sau ${formatTimeLeft(event.march.arrivesAt)}.`
          );
        }
        engineRef.current?.handleAction("applyBackendMarch", { march: event.march });
        if (event.sourceTown && event.march.ownerId === playerId) {
          const normalized = normalizeTownForClient(event.sourceTown);
          setServerTowns((prev) => [
            ...prev.filter((town) => town.id !== normalized.id),
            normalized,
          ]);
          engineRef.current?.handleAction("applyBackendTownSnapshots", { towns: [normalized] });
        }
        setWorldActivity((prev) => ({
          ...prev,
          marches: [
            ...prev.marches.filter((march) => march.id !== event.march.id),
            event.march,
          ],
        }));
        setToastMessage(event.march.ownerId === playerId ? "Lệnh hành quân đã gửi lên server" : "Có đội quân đang hành quân trên bản đồ");
        setServerHud((prev) => ({
          ...prev,
          activeMarches: prev.activeMarches + 1,
          ownMarches: prev.ownMarches + (event.march.ownerId === playerId ? 1 : 0),
          outboundTroops: prev.outboundTroops + (event.march.ownerId === playerId ? event.march.troops || 0 : 0),
          lastSync: Date.now(),
        }));
      }
      if (event.type === "march_removed") {
        engineRef.current?.handleAction("removeBackendMarch", { marchId: event.marchId });
        setWorldActivity((prev) => ({
          ...prev,
          marches: prev.marches.filter((march) => (march.id || march._id || march.marchId) !== event.marchId),
        }));
        setServerHud((prev) => ({ ...prev, lastSync: Date.now() }));
      }
      if (event.type === "battle_started") {
        const isMyBattle = event.battle.attackerId === playerId || event.battle.defenderId === playerId;
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
            ? prev.marches.filter((march) => (march.id || march._id || march.marchId) !== event.consumedMarchId)
            : prev.marches,
          battles: [
            ...prev.battles.filter((battle) => battle.id !== event.battle.id),
            { ...event.battle, regionId: serverToEngineTerritoryId(event.battle.regionId) },
          ],
        }));
        if (event.consumedMarchId) {
          engineRef.current?.handleAction("removeBackendMarch", { marchId: event.consumedMarchId });
        }
        engineRef.current?.handleAction("applyBackendBattles", { battles: [event.battle], merge: true });
      }
      if (event.type === "battle_resolved") {
        if (event.territory) {
          const engineRegId = serverToEngineTerritoryId(event.territory.id);
          const isMe = event.territory.ownerId === playerId;
          const ownerCode = event.territory.ownerId === null ? 0 : isMe ? 1 : 2;
          engineRef.current?.handleAction("applyWorldOwnership", {
            territories: [{
              id: engineRegId,
              ownerCode,
              ownerId: event.territory.ownerId,
              ownerName: isMe ? "Bạn" : (event.territory.ownerName ?? "Đối thủ"),
              ownerFlagColor: event.territory.ownerFlagColor,
              ownerEmblem: event.territory.ownerEmblem,
              ownerAllianceTag: event.territory.ownerAllianceTag,
              ownerAllianceEmblem: event.territory.ownerAllianceEmblem,
            }],
          });
        }
        addWarReport({
          id: `socket-battle-resolved-${event.battleId || Date.now()}`,
          kind: "battle",
          title: event.winner === "attacker" ? "Công thành thắng lợi" : "Thủ thành thành công",
          body: `${event.territory?.id !== undefined ? territoryLabel(serverToEngineTerritoryId(event.territory.id)) : "Lãnh thổ"} đã được server tổng kết.`,
          meta: event.winner === "attacker" ? "Quyền sở hữu đã cập nhật" : "Thành vẫn được giữ",
          isMine: event.territory?.ownerId === playerId,
        });
        setWorldActivity((prev) => ({
          ...prev,
          battles: prev.battles.filter((battle) => battle.id !== event.battleId),
        }));
        engineRef.current?.handleAction("removeBackendBattle", { battleId: event.battleId });
      }
      if (event.type === "player_eliminated" && event.playerId === playerId) {
        localStorage.setItem(ONBOARDING_KEY, "1");
        setKingdomCreationRegion(null);
        setSelectedTown(null);
        setSelectedRegion(null);
        setResources({ gold: 0, wood: 0, stone: 0, food: 0, iron: 0, coal: 0, sulfur: 0, gems: 0 });
        engineRef.current?.handleAction("setToast", { message: "BẠN ĐÃ MẤT HẾT THÀNH. CHỌN VÙNG ĐẤT MỚI ĐỂ LÀM LẠI" });
        addPrivateReportMail(
          "Vương quốc thất thủ",
          "Bạn đã mất toàn bộ thành trì. Tài nguyên và quân đội bị xóa, hãy chọn một vùng đất hoang để lập lại vương quốc."
        );
      }
      if (event.type === "territories_pruned") {
        refreshGameStateFromServer("territories-pruned");
        if (event.playerId === playerId && Array.isArray(event.prunedTerritoryIds)) {
          showGameError(`⚠️ Mắt xích lãnh thổ bị đứt! ${event.prunedTerritoryIds.length} Quân khu cô lập đã bị phá hủy hoàn toàn!`);
          addPrivateReportMail(
            "Cảnh báo cô lập lãnh thổ",
            `Mắt xích giao thông kết nối bị đứt đoạn. ${event.prunedTerritoryIds.length} Quân khu bị cô lập đằng sau đã bị giải phóng trở lại đất hoang.`
          );
        }
      }
      if (event.type === "world_state_hint") {
        refreshGameStateFromServer("socket-hint");
      }
      if (event.type === "resync_required") {
        refreshGameStateWithRetry(`socket-${event.reason}`, 4, 600);
      }
    }, setSocketOnline);
  }, [isAuthenticated, token, playerId]);

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
    activeModal === "treasure" ||
    activeModal === "ally" ||
    activeModal === "warReport" ||
    activeModal === "mail" ||
    activeModal === "settings" ||
    activeModal === "chat" ||
    activeModal === "tutorial" ||
    showTutorial ||
    kingdomCreationRegion !== null ||
    (newbiePhase === "choose_banner" && newbieSelectedRegion !== null);

  useEffect(() => {
    engineRef.current?.handleAction("setUiOverlayActive", { active: isUiOverlayVisible });
  }, [isUiOverlayVisible]);

  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch((err) => console.log(err));
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
    setToastMessage(message);
    setDeployError(message);
    engineRef.current?.handleAction("setToast", { message });
  };

  const normalizeTownForClient = (town: any) => {
    if (!town) return town;
    const level = Math.max(1, Math.floor(Number(town.lvl ?? town.level ?? 1) || 1));
    return {
      ...town,
      lvl: level,
      level,
      owner: town.owner ?? (town.ownerId ? (town.ownerId === playerId ? 0 : 1) : 0),
      buildings: { ...(town.buildings || {}) },
      storage: { ...(town.storage || {}) },
    };
  };

  const mergeTownWithServer = (town: any) => {
    if (!town) return town;
    const serverTown = serverTownsById[Number(town.id)];
    const merged = { ...town, ...(serverTown || {}) };
    if (town.owner === 0 || town.ownerCode === 1 || (playerId && town.ownerId === playerId)) {
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
      (playerId && (town.ownerId === playerId || serverTownsById[Number(town.id)]?.ownerId === playerId))
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
        .map((town: any) => ({ ...(knownTowns.find((candidate: any) => candidate.id === town.id) || {}), ...town, owner: 0 })),
    ].filter((town, index, list) => isEligibleSourceTown(town) && list.findIndex((candidate: any) => candidate.id === town.id) === index);
    if (ownedTowns.length > 0) {
      const sorted = [...ownedTowns].sort((a: any, b: any) => (b.troops || 0) - (a.troops || 0));
      return mergeTownWithServer(sorted[0]);
    }
    return engine.getSourceTown?.() || null;
  };

  const trainUnitServerFirst = async (unitType: UnitType, fallbackError: string) => {
    if (!token) {
      showGameError("Chưa kết nối server, không thể mộ binh");
      return;
    }
    const town = mergeTownWithServer(selectedTown);
    const territoryId = engineRef.current?.getTownRegionId?.(town);
    if (!town || territoryId === undefined || territoryId === null || territoryId < 0) {
      showGameError("Không xác định được lãnh thổ của thành");
      return;
    }
    try {
      const res = await recruitTroops(token, {
        unitType,
        townId: town.id,
        territoryId: engineToServerTerritoryId(territoryId),
      });
      if (res.resources) {
        setResources((prev) => ({ ...prev, ...res.resources }));
        engineRef.current?.handleAction("syncResources", { resources: res.resources });
      }
      if (res.town) {
        const serverTown = normalizeTownForClient(res.town);
        upsertServerTown(serverTown);
        engineRef.current?.handleAction("syncTownSnapshots", { towns: [serverTown] });
        setSelectedTown((prev: any) => {
          if (!prev || prev.id !== serverTown.id) return prev;
          return { ...prev, ...serverTown };
        });
      }
    } catch (err: any) {
      showGameError(err.message || fallbackError);
    }
  };

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
      ownerCode: territory.ownerId === null ? 0 : territory.ownerId === playerId ? 1 : 2,
      ownerId: territory.ownerId,
      ownerName: territory.ownerId === null ? "" : territory.ownerId === playerId ? "Bạn" : territory.ownerName ?? territory.ownerId,
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
    setResources({ ...world.resources });
    setServerTowns((world.towns || []).map((town: any) => normalizeTownForClient(town)));
    setWorldActivity((prev) => ({
      marches: world.marches,
      clearings: world.clearings,
      battles: world.battles ? battles : (resetBattles ? [] : prev.battles),
      territoryById: Object.fromEntries(world.territories.map((territory: any) => [serverToEngineTerritoryId(territory.id), territory])),
    }));
    setServerHud(summarizeBackendHud(world, playerId, world.resources));
  }

  function applyRealtimePlayerState(event: any) {
    if (!playerId || event?.playerId !== playerId) return false;
    if (event.resources) {
      setResources({ ...event.resources });
      engineRef.current?.handleAction("syncResources", { resources: event.resources });
    }
    if (Array.isArray(event.towns)) {
      const towns = event.towns.map((town: any) => normalizeTownForClient(town));
      setServerTowns(towns);
      engineRef.current?.handleAction("applyBackendTownSnapshots", { towns });
    }
    if (event.newbieShieldUntil !== undefined) {
      engineRef.current?.handleAction("updateNewbieShield", { until: event.newbieShieldUntil });
    }
    setServerHud((prev) => ({
      ...prev,
      lastSync: Date.now(),
    }));
    return true;
  }

  function refreshGameStateFromServer(reason = "manual", force = false): Promise<boolean> {
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
    return getGameState(token)
      .then((world) => {
        applyBackendWorldState(world, reason !== "socket-hint");
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
          window.setTimeout(() => refreshGameStateFromServer(`${reason}:queued`, true), 120);
        }
      });
  }

  function refreshGameStateWithRetry(reason = "manual", attempts = 3, delayMs = 900) {
    const run = (attempt: number) => {
      refreshGameStateFromServer(`${reason}:${attempt}`, true).then((ok) => {
        if (!ok && attempt < attempts) {
          window.setTimeout(() => run(attempt + 1), delayMs * attempt);
        }
      });
    };
    run(1);
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = chatInput.trim();
    if (!message || chatChannel === "HỆ THỐNG") return;
    if (!sendWorldChat(message)) {
      showGameError("Chat thế giới đang mất kết nối, vui lòng thử lại");
      return;
    }
    setChatInput("");
  };

  if (!isAuthenticated && !token) {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }

  const localOwnedTowns = engineRef.current?.getPlayerOwnedTowns?.() || [];
  const selectedTownForModal = selectedTown ? mergeTownWithServer(selectedTown) : null;
  const localTroops = localOwnedTowns.reduce((sum: number, town: any) => sum + (town.troops || 0), 0);
  const hudOwnedTerritories = serverHud.lastSync ? serverHud.ownedTerritories : localOwnedTowns.length;
  const hudTotalTerritories = serverHud.totalTerritories || 75;
  const hudTroops = localTroops + serverHud.outboundTroops;
  const hudPower = hudTroops * 1.2 + hudOwnedTerritories * 40 + resources.gold * 0.03 + resources.gems * 0.4;
  const hudMissions = [
    { text: "Sở hữu 3 lãnh thổ", value: Math.min(hudOwnedTerritories, 3), goal: 3 },
    { text: "Có 1 đạo quân đang hành quân", value: Math.min(serverHud.ownMarches, 1), goal: 1 },
    { text: "Hoàn tất 1 xây thành", value: Math.min(hudOwnedTerritories, 1), goal: 1 },
  ];
  const allChatLines = [...chatLog, ...serverEventLog].slice(-50);
  const displayChatLog = allChatLines
    .filter((line) => parseChatLine(line).channel === chatChannel)
    .slice(-18);
  const unreadMailCount = privateMails.filter((mail) => !mail.read).length;
  const backendStatusText = apiOnline === null ? "ĐANG KIỂM TRA" : apiOnline ? "API ONLINE" : "API MẤT KẾT NỐI";
  const socketStatusText = socketOnline ? "SOCKET LIVE" : token ? "SOCKET ĐANG NỐI" : "CHƯA ĐĂNG NHẬP";
  const ownerNameForTerritory = (id: number) => {
    const territory = worldActivity.territoryById[id];
    if (!territory?.ownerId) return "Hoang dã";
    if (territory.ownerId === playerId) return "Bạn";
    return territory.ownerName || "Đối thủ";
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
  const warReportRows = [...battleRows, ...attackRows, ...clearingRows, ...ownMarchRows].slice(0, 8);
  const compactWarRows = warReportRows.slice(0, 3);
  const recentWarReports = warReports.slice(0, 18);

  // 6 Kingdom Status items requested by User
  const activeEnemyMarch = (worldActivity?.marches || []).find(
    (m: any) => m.ownerId !== playerId && (m.kind === "attack" || m.kind === "marchAttack")
  );
  const activePlayerBattle = (worldActivity?.battles || []).find(
    (b: any) => b.isPlayerInvolved || (b.defenderId && b.defenderId === playerId)
  );
  const attackTargetName = activePlayerBattle?.regionName || activeEnemyMarch?.targetName || null;

  const currentStorageCap = Math.max(1000, serverHud.ownedTerritories * 600 + 400);
  const totalStoredRes = (resources.gold || 0) + (resources.wood || 0) + (resources.stone || 0);
  const storagePercent = Math.min(100, Math.round((totalStoredRes / currentStorageCap) * 100));
  const isStorageFull = storagePercent >= 90;

  const gatherRatePerHour = serverHud.ownedTerritories * 45 + 30;

  return (
    <main className="game-shell">
      {runtimeError && (
        <div style={{
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
          wordBreak: "break-word"
        }}>
          <div style={{ fontWeight: "bold", marginBottom: "6px", color: "#f87171" }}>
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
              fontWeight: "bold"
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
          pointerEvents: gameReady ? "auto" : "none"
        }} 
        aria-label={t("appName")} 
      />

      {isAuthenticated && !gameReady && (
        <div className="game-loading-screen">
          <div className="game-loading-bottom-dock">
            <div className="game-loading-tip-line">
              <span className="tip-tag">{t("loadingTipLabel")}</span> {t("loadingTip")}
            </div>
            
            <div className="game-loading-bar-wrapper">
              <div className="game-loading-bar-track">
                <div className="game-loading-bar-fill" style={{ width: `${loadingProgress}%` }} />
                <span className="game-loading-pct">{loadingProgress}%</span>
              </div>
            </div>

            <div className="game-loading-status-line">
              <span className="diamond-ornament">❖</span> {loadingError || loadingText} <span className="diamond-ornament">❖</span>
            </div>

            {loadingError && (
              <button type="button" className="game-loading-retry-btn" onClick={() => window.location.reload()}>
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
            <header className="conquest-top-bar hud-interactive" style={{ position: "relative", zIndex: 110, margin: "6px 12px" }}>
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
                  { name: "Harvest", icon: "🌾", color: "#84cc16", val: "+10%" },
                  { name: "Earth", icon: "🍃", color: "#15803d", val: "+5%" },
                  { name: "Order", icon: "👑", color: "#a855f7", val: "+3%" },
                  { name: "Radiance", icon: "☀️", color: "#f43f5e", val: "+20%" },
                  { name: "Honor", icon: "🎖️", color: "#d97706", val: "+5%" },
                  { name: "War", icon: "⚔️", color: "#dc2626", val: "+10%" },
                ].map((site) => (
                  <div key={site.name} className="conquest-site-pill" style={{ borderBottomColor: site.color }}>
                    <div className="site-pill-icon" style={{ color: site.color }}>{site.icon}</div>
                    <div className="site-pill-info">
                      <span className="site-pill-name">{site.name}</span>
                      <span className="site-pill-buff">{site.val}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="conquest-top-right">
                <span className="conquest-unique-label">× Unique quantity of holy sites</span>
                <button className="conquest-close-btn" onClick={onOpenWorld || (() => window.location.href = "/")}>
                  ✕ QUAY VỀ BẢN ĐỒ THẾ GIỚI
                </button>
              </div>
            </header>
          )}

          {/* TOP BAR */}
          <div className="hud-topbar hud-interactive">
            {/* Profile Badge - Circular Avatar and XP progress */}
            <div className="hud-profile-circle-wrapper">
              <div className="hud-avatar-container">
                <svg className="hud-avatar-svg-progress" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="hud-avatar-progress-bg" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="hud-avatar-progress-fill"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * (xp || 0)) / 100}
                  />
                </svg>
                <div className="hud-avatar-img-mask">
                  <img
                    src="/assets/avatars/emperor.png"
                    alt="Emperor Avatar"
                    className="hud-avatar-img"
                  />
                </div>
                <div className="hud-avatar-lvl-badge">
                  <span>Lv.{level}</span>
                </div>
              </div>
              <div className="hud-profile-info">
                <div className="hud-profile-name-row">
                  <span className="hud-profile-name">{t("empireName")}</span>
                  <button
                    type="button"
                    className="hud-profile-edit-btn"
                    title="Đổi tên"
                    onClick={() => openModal("settings")}
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                  </button>
                </div>
                <div className="hud-profile-xp-text">{xp}%</div>
              </div>
            </div>

            {/* Resources capsules grouped - matching Mockup */}
            <div className="hud-resources-unified">
              {/* Ordinary Resources Block (Lúa, Gỗ, Đá, Sắt) */}
              <div className="hud-res-group ordinary-group">
                <div className="hud-res-item res-food" title={t("food")}>
                  <span className="hud-res-icon"><VectorFoodIcon /></span>
                  <div className="hud-res-details">
                    <span className="hud-res-val">{formatResourceVal(resources.food || 0)}</span>
                    <span className="hud-res-rate">+{formatResourceVal(gatherRatePerHour)}/h</span>
                  </div>
                </div>
                <div className="hud-res-item res-wood" title={t("wood")}>
                  <span className="hud-res-icon"><VectorWoodIcon /></span>
                  <div className="hud-res-details">
                    <span className="hud-res-val">{formatResourceVal(resources.wood || 0)}</span>
                    <span className="hud-res-rate">+{formatResourceVal(gatherRatePerHour)}/h</span>
                  </div>
                </div>
                <div className="hud-res-item res-stone" title={t("stone")}>
                  <span className="hud-res-icon"><VectorStoneIcon /></span>
                  <div className="hud-res-details">
                    <span className="hud-res-val">{formatResourceVal(resources.stone || 0)}</span>
                    <span className="hud-res-rate">+{formatResourceVal(gatherRatePerHour)}/h</span>
                  </div>
                </div>
                <div className="hud-res-item res-iron" title={t("iron")}>
                  <span className="hud-res-icon"><VectorIronIcon /></span>
                  <div className="hud-res-details">
                    <span className="hud-res-val">{formatResourceVal(resources.iron || 0)}</span>
                    <span className="hud-res-rate">+{formatResourceVal(gatherRatePerHour)}/h</span>
                  </div>
                </div>
              </div>

              {/* Premium Resources Block (Ruby, Vàng, Kim Cương) */}
              <div className="hud-res-group premium-group">
                <div className="hud-res-item res-gems" title={t("gems")}>
                  <span className="hud-res-icon"><VectorGemsIcon /></span>
                  <span className="hud-res-val">{formatNum(resources.gems || 0)}</span>
                  <button type="button" className="hud-res-add-btn" onClick={() => openModal("shop")}>+</button>
                </div>
                <div className="hud-res-item res-gold" title={t("gold")}>
                  <span className="hud-res-icon"><VectorGoldIcon /></span>
                  <span className="hud-res-val">{formatResourceVal(resources.gold || 0)}</span>
                  <button type="button" className="hud-res-add-btn" onClick={() => openModal("shop")}>+</button>
                </div>
                <div className="hud-res-item res-diamonds" title="Kim cương">
                  <span className="hud-res-icon">
                    <svg viewBox="0 0 64 64" className="vector-res-svg">
                      <defs>
                        <linearGradient id="diaLight" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                        <linearGradient id="diaDark" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#0369a1" />
                          <stop offset="100%" stopColor="#0c4a6e" />
                        </linearGradient>
                        <linearGradient id="diaTop" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#e0f2fe" />
                          <stop offset="100%" stopColor="#7dd3fc" />
                        </linearGradient>
                      </defs>
                      <polygon points="32,58 10,24 20,8 44,8 54,24" fill="url(#diaDark)" stroke="#0c4a6e" strokeWidth="1.5" />
                      <polygon points="32,58 10,24 32,24" fill="url(#diaLight)" stroke="#0c4a6e" strokeWidth="1.5" />
                      <polygon points="32,58 32,24 54,24" fill="url(#diaLight)" opacity="0.8" stroke="#0c4a6e" strokeWidth="1.5" />
                      <polygon points="10,24 20,8 32,24" fill="url(#diaTop)" stroke="#0c4a6e" strokeWidth="1.5" />
                      <polygon points="54,24 44,8 32,24" fill="url(#diaTop)" opacity="0.8" stroke="#0c4a6e" strokeWidth="1.5" />
                      <polygon points="20,8 44,8 32,24" fill="#f0f9ff" stroke="#0c4a6e" strokeWidth="1.5" />
                    </svg>
                  </span>
                  <span className="hud-res-val">{formatNum(Math.floor((resources.gems || 0) * 1.5) + 20)}</span>
                  <button type="button" className="hud-res-add-btn" onClick={() => openModal("shop")}>+</button>
                </div>
              </div>
            </div>

            {/* Quick sys controls (Mail, Notifications, Settings, Fullscreen, Logout) */}
            <div className="hud-sys-controls">
              <button type="button" className="hud-sys-btn" onClick={() => openModal("mail")} title={t("mail")}>
                <HudIcon name="mail" />
                {unreadMailCount > 0 && <span className="hud-sys-badge">{unreadMailCount}</span>}
              </button>
              <button type="button" className="hud-sys-btn" onClick={() => openModal("warReport")} title={t("notifications")}>
                <HudIcon name="bell" />
              </button>
              <button type="button" className="hud-sys-btn" onClick={() => openModal("settings")} title={t("settings")}>
                <HudIcon name="gear" />
              </button>
              <button type="button" className="hud-sys-btn" onClick={() => setGameLanguage(language === "vi" ? "en" : "vi")} title={t("language")}>
                {language.toUpperCase()}
              </button>
              <button type="button" className="hud-sys-btn" onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }} title={t("fullscreen")}>
                <HudIcon name="fullscreen" />
              </button>
              <button
                type="button"
                className="hud-sys-btn hud-logout-btn"
                onClick={() => {
                  if (window.confirm("Bạn có chắc chắn muốn đăng xuất tài khoản không?")) {
                    handleLogout();
                  }
                }}
                title="Đăng xuất tài khoản"
                style={{ color: "#ef4444" }}
              >
                <HudIcon name="logout" />
              </button>
            </div>
          </div>

          {/* MAIN HUD BODY */}
          <div className="hud-main">
            {/* LEFT PANELS - TABBED SIDEBAR RAIL & QUEST SLIDING CARD */}
            {!conquestMode && (
              <div className="hud-left-command-cluster">
                {/* Vertical Rail (matching Mockup) */}
                <nav className="hud-sidebar-vertical-rail hud-interactive" aria-label="Điều hướng vương quốc">
                  <button
                    type="button"
                    className={`hud-rail-button-v ${leftTab === "missions" && !leftCollapsed ? "active" : ""}`}
                    onClick={() => {
                      if (leftTab === "missions" && !leftCollapsed) {
                        setLeftCollapsed(true);
                      } else {
                        setLeftCollapsed(false);
                        setLeftTab("missions");
                      }
                    }}
                    title={t("missions")}
                  >
                    <div className="hud-rail-icon-wrapper">
                      <img src="/assets/icons/icon_scroll.png" className="hud-rail-icon-png" alt="scroll" />
                      <span className="hud-rail-badge" />
                    </div>
                    <span>Nhiệm vụ</span>
                  </button>
                  <button type="button" className="hud-rail-button-v" onClick={() => openModal("warReport")} title="Sự kiện">
                    <div className="hud-rail-icon-wrapper">
                      <img src="/assets/icons/icon_event.png" className="hud-rail-icon-png" alt="event" />
                      <span className="hud-rail-badge" />
                    </div>
                    <span>Sự kiện</span>
                  </button>
                  <button type="button" className="hud-rail-button-v" onClick={() => openModal("settings")} title="Công nghệ">
                    <div className="hud-rail-icon-wrapper">
                      <img src="/assets/icons/icon_tech.png" className="hud-rail-icon-png" alt="tech" />
                    </div>
                    <span>Công nghệ</span>
                  </button>
                  <button type="button" className="hud-rail-button-v" onClick={() => openModal("army")} title={t("army")}>
                    <div className="hud-rail-icon-wrapper">
                      <img src="/assets/icons/icon_military.png" className="hud-rail-icon-png" alt="military" />
                    </div>
                    <span>Quân đội</span>
                  </button>
                  <button type="button" className="hud-rail-button-v" onClick={() => openModal("ally")} title="Bang hội">
                    <div className="hud-rail-icon-wrapper">
                      <img src="/assets/icons/icon_guild.png" className="hud-rail-icon-png" alt="guild" />
                    </div>
                    <span>Bang hội</span>
                  </button>
                  <button type="button" className="hud-rail-button-v" onClick={() => openModal("shop")} title="Cửa hàng">
                    <div className="hud-rail-icon-wrapper">
                      <img src="/assets/icons/icon_shop.png" className="hud-rail-icon-png" alt="shop" />
                      <span className="hud-rail-badge" />
                    </div>
                    <span>Cửa hàng</span>
                  </button>
                </nav>

                {/* Quest Drawer Card (matching Mockup) */}
                <div className={`hud-quest-drawer-card hud-interactive ${leftCollapsed ? "collapsed" : ""}`}>
                  <div className="hud-quest-drawer-header">
                    <span className="hud-quest-title">
                      <img src="/assets/icons/icon_scroll.png" className="hud-quest-header-icon-png" alt="missions" /> {t("missions")}
                    </span>
                    <span className="hud-quest-ratio">3/5</span>
                  </div>

                  <div className="hud-quest-list">
                    <div className="hud-quest-item">
                      <div className="hud-quest-meta">
                        <span className="hud-quest-desc">{t("missionOwn3")}</span>
                        <span className="hud-quest-progress-val">2/3</span>
                      </div>
                      <div className="hud-quest-progress-bar-track">
                        <div className="hud-quest-progress-bar-fill orange" style={{ width: "66%" }} />
                      </div>
                    </div>

                    <div className="hud-quest-item">
                      <div className="hud-quest-meta">
                        <span className="hud-quest-desc">{t("missionMarch1")}</span>
                        <span className="hud-quest-progress-val">0/1</span>
                      </div>
                      <div className="hud-quest-progress-bar-track">
                        <div className="hud-quest-progress-bar-fill orange" style={{ width: "0%" }} />
                      </div>
                    </div>

                    <div className="hud-quest-item completed">
                      <div className="hud-quest-meta">
                        <span className="hud-quest-desc">{t("missionBuild1")}</span>
                        <span className="hud-quest-check">✓ 1/1</span>
                      </div>
                      <div className="hud-quest-progress-bar-track">
                        <div className="hud-quest-progress-bar-fill green" style={{ width: "100%" }} />
                      </div>
                    </div>

                    <div className="hud-quest-item">
                      <div className="hud-quest-meta">
                        <span className="hud-quest-desc">{t("missionCastle10")}</span>
                        <span className="hud-quest-progress-val">0/1</span>
                      </div>
                      <div className="hud-quest-progress-bar-track">
                        <div className="hud-quest-progress-bar-fill orange" style={{ width: "0%" }} />
                      </div>
                    </div>

                    <div className="hud-quest-item">
                      <div className="hud-quest-meta">
                        <span className="hud-quest-desc">Tham gia 1 chiến dịch</span>
                        <span className="hud-quest-progress-val">0/1</span>
                      </div>
                      <div className="hud-quest-progress-bar-track">
                        <div className="hud-quest-progress-bar-fill orange" style={{ width: "0%" }} />
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Battlefield Section */}
                  <div className="hud-battlefield-section">
                    <div className="hud-battlefield-header">
                      <span className="hud-battlefield-title">
                        <img src="/assets/icons/icon_report.png" className="hud-quest-header-icon-png" alt="battlefield" /> CHIẾN TRƯỜNG
                      </span>
                      <span className="hud-battlefield-toggle">▼</span>
                    </div>
                    <div className="hud-battlefield-body">
                      <div className="hud-battle-item">
                        <span className="hud-battle-icon-mask">
                          <img src="/assets/icons/icon_guild.png" className="hud-battle-icon-png" alt="guild" />
                        </span>
                        <div className="hud-battle-info">
                          <div className="hud-battle-name">Chiến tranh bang hội</div>
                          <div className="hud-battle-timer">Kết thúc sau: <span className="time-highlight">12:45:32</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RIGHT PANELS - MINIMAP & SELECTED TOWN */}
            <div className="hud-right-side hud-interactive">
              {/* Minimap card with Gold Trim (matching Mockup) */}
              <div className="hud-minimap-card premium-framed">
                <div className="hud-minimap-header">
                  <span className="hud-minimap-title">
                    <img src="/assets/icons/icon_map.png" className="hud-minimap-header-icon-png" alt="worldMap" /> {t("worldMap")}
                  </span>
                  <button type="button" className="hud-mini-icon-btn-plus" title="Mở rộng">+</button>
                </div>

                <div className="hud-minimap-coords-display">
                  <span className="coords-icon">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </span>
                  <span className="coords-text">X: 10650 Y: 6254</span>
                  <button type="button" className="hud-mini-icon-btn" onClick={jumpToCoordinates} title={t("search")} style={{ marginLeft: "auto" }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </button>
                </div>

                <div className="hud-minimap-canvas-wrapper">
                  <canvas 
                    ref={minimapCanvasRef} 
                    width={160} 
                    height={120} 
                    className="hud-minimap-canvas" 
                    style={{ width: "100%", height: "96px", display: "block", background: "#060f16" }} 
                  />
                </div>

                <div className="hud-minimap-footer-unified">
                  <div className="hud-minimap-online-row">
                    <span className="status-dot-green" /> 
                    <span className="online-count">250 Online</span>
                    <span className="hud-live-badge-pill">Live</span>
                  </div>
                  <div className="hud-minimap-action-bar-small">
                    <button type="button" className="hud-mini-action-btn-circle" title={t("favorite")}><HudIcon name="star" /></button>
                    <button type="button" className="hud-mini-action-btn-circle" title="Xem sách"><HudIcon name="book" /></button>
                    <button type="button" className="hud-mini-action-btn-circle" title={t("locate")}><HudIcon name="target" /></button>
                  </div>
                </div>
              </div>

              {/* Selected Town / Territory Info Card */}
              {selectedTown && (
                <div className="hud-selected-town-card hud-card">
                  <div className="hud-town-card-header">
                    <div>
                      <h3 className="hud-town-name">THÀNH ELDORIA</h3>
                      <span className="hud-town-lvl">Lv. 12</span>
                    </div>
                    <button type="button" className="hud-close-btn" onClick={() => {
                      engineRef.current?.handleAction("setUiOverlayActive", { active: false });
                      setSelectedTown(null);
                    }}>✕</button>
                  </div>
                  
                  <div className="hud-town-card-body">
                    <div className="hud-town-preview-img">
                      <HudIcon name="castle" />
                    </div>
                    <div className="hud-town-stats">
                      <div className="hud-town-stat-row">
                        <span>Chủ sở hữu</span>
                        <strong>Đế Quốc Phục Hưng</strong>
                      </div>
                      <div className="hud-town-stat-row">
                        <span>Dân số</span>
                        <strong>1.200</strong>
                      </div>
                      <div className="hud-town-stat-row">
                        <span>Quân đội</span>
                        <strong>350</strong>
                      </div>
                      <div className="hud-town-stat-row">
                        <span>Liên minh</span>
                        <strong>Không có</strong>
                      </div>
                    </div>
                  </div>

                  <div className="hud-town-card-actions">
                    <button type="button" className="hud-town-btn primary" onClick={() => openModal("army")}>
                      <HudIcon name="swords" /> CHIẾM LÃNH THỔ
                    </button>
                    <button type="button" className="hud-town-btn secondary" onClick={() => handleAction("map")}>
                      <HudIcon name="anchor" /> DO THÁM
                    </button>
                    <button type="button" className="hud-town-btn tertiary">
                      <HudIcon name="info" /> THÔNG TIN
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* HORIZONTAL EMPIRE ACTION DOCK (Redesigned Centered Curved Dock) */}
          <div className="hud-center-dock-container hud-interactive">
            {/* Toast / Territory Selection Banner */}
            <div className="hud-toast-banner">
              <div className="toast-title">{selectedRegion ? `${t("selectedTerritory")} #${selectedRegion.id}` : (toastMessage || `${t("selectedTerritory")} #259`)}</div>
              <div className="toast-sub">{selectedRegion ? t("buildFromTooltip") : (language === "vi" ? "Bấm vào ô lãnh thổ để ra lệnh" : "Click territory to issue orders")}</div>
            </div>

            {/* Bottom Menu Action Bar matching Mockup */}
            <div className="hud-empire-dock-master-unified">
              <button type="button" className="hud-dock-tile-square" onClick={() => handleAction("map")} title={t("map")}>
                <span className="hud-tile-icon-square"><img src="/assets/icons/icon_map.png" className="hud-dock-icon-png" alt="map" /></span>
                <span className="hud-tile-label-square">Bản đồ</span>
              </button>
              <button type="button" className="hud-dock-tile-square" onClick={() => openModal("treasure")} title={t("inventory")}>
                <span className="hud-tile-icon-square"><img src="/assets/icons/icon_bag.png" className="hud-dock-icon-png" alt="bag" /></span>
                <span className="hud-tile-label-square">Túi đồ</span>
              </button>
              <button type="button" className="hud-dock-tile-square" onClick={() => openModal("army")} title={t("army")}>
                <span className="hud-tile-icon-square"><img src="/assets/icons/icon_military.png" className="hud-dock-icon-png" alt="military" /></span>
                <span className="hud-tile-label-square">Quân đội</span>
              </button>
              <button type="button" className="hud-dock-tile-square" onClick={() => openModal("warReport")} title="Chiến báo">
                <span className="hud-tile-icon-square"><img src="/assets/icons/icon_report.png" className="hud-dock-icon-png" alt="report" /></span>
                <span className="hud-tile-label-square">Chiến báo</span>
              </button>
              <button type="button" className="hud-dock-tile-square" onClick={() => openModal("treasure")} title="Kho báu">
                <span className="hud-tile-icon-square"><img src="/assets/icons/icon_chest.png" className="hud-dock-icon-png" alt="treasure" /></span>
                <span className="hud-tile-label-square">Kho báu</span>
              </button>
              <button type="button" className="hud-dock-tile-square" onClick={() => openModal("mail")} title={t("mail")}>
                <span className="hud-tile-icon-square"><img src="/assets/icons/icon_mail.png" className="hud-dock-icon-png" alt="mail" /></span>
                <span className="hud-tile-label-square">Thư</span>
                {unreadMailCount > 0 && <span className="hud-tile-badge-square">{unreadMailCount}</span>}
              </button>
            </div>
          </div>

          {/* BOTTOM SECTION - CHAT PANEL & QUEUES */}
          <div className="hud-bottombar-unified">
            {/* FLOATING CHAT BOX (Bottom Left) */}
            <div className={`hud-floating-chat hud-interactive ${chatCollapsed ? "collapsed" : ""}`}>
              <div className="hud-chat-header" onClick={() => setChatCollapsed(!chatCollapsed)}>
                <span className="hud-chat-header-main"><HudIcon name="chat" /> {t("chat")}</span>
                <span className="hud-chat-toggle-btn">{chatCollapsed ? "▲" : "▼"}</span>
              </div>
              {!chatCollapsed && (
                <>
                  <div className="hud-chat-tabs-pills">
                    {(["THẾ GIỚI", "LIÊN MINH", "HỆ THỐNG"] as string[]).map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        className={`hud-chat-tab-pill ${
                          (channel === "HỆ THỐNG" && chatChannel === "HỆ THỐNG") ||
                          (channel === "THẾ GIỚI" && chatChannel === "THẾ GIỚI")
                            ? "active" : ""
                        }`}
                        onClick={() => {
                          setChatChannel(channel === "LIÊN MINH" ? "HỆ THỐNG" : channel as ChatChannel);
                          setChatInput("");
                        }}
                      >
                        {channel === "HỆ THỐNG" ? "Hệ thống" : channel === "THẾ GIỚI" ? "Thế giới" : "Bang hội"}
                      </button>
                    ))}
                  </div>
                  <div className="hud-chat-lines">
                    {displayChatLog.length > 0 ? displayChatLog.map((line, i) => {
                      const chat = parseChatLine(line);
                      let prefix = `[${chat.channel === "HỆ THỐNG" ? "Hệ Thống" : "Thế Giới"}]`;
                      let isSys = chat.channel === "HỆ THỐNG";
                      if (line.includes("PLAYER")) {
                        prefix = "[Thế giới]";
                        isSys = false;
                      } else if (line.includes("Bang HOANGIA") || line.includes("SYSTEM")) {
                        prefix = "[Hệ thống]";
                        isSys = true;
                      }
                      return (
                        <div key={i} className="hud-chat-line">
                          <span className={`hud-chat-channel ${isSys ? "system" : "world"}`}>
                            {prefix}
                          </span>
                          <span className="hud-chat-name"> {chat.name}: </span>
                          <span className="hud-chat-msg">{chat.message}</span>
                        </div>
                      );
                    }) : (
                      <div className="hud-chat-empty">{t("noChat")}</div>
                    )}
                  </div>
                  <form onSubmit={handleChatSubmit} className="hud-chat-input-bar">
                    <input
                      type="text"
                      className="hud-chat-input"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      maxLength={100}
                      disabled={chatChannel === "HỆ THỐNG"}
                    />
                    <button type="submit" className="hud-chat-send" disabled={chatChannel === "HỆ THỐNG"}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* FLOATING ACTION QUEUES (Bottom Right) - Real backend data */}
            <div className="hud-action-queues hud-interactive">
              {(() => {
                const ownMarches = (worldActivity?.marches || []).filter(
                  (m: any) => m.ownerId === playerId
                );
                if (ownMarches.length === 0) return null;
                return ownMarches.map((march: any) => {
                  const now = Date.now();
                  const startMs = new Date(march.startedAt).getTime();
                  const endMs   = new Date(march.arrivesAt).getTime();
                  const totalMs = Math.max(1, endMs - startMs);
                  const elapsedMs = Math.max(0, now - startMs);
                  const progressPct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
                  const msLeft = Math.max(0, endMs - now);
                  const secsLeft = Math.ceil(msLeft / 1000);
                  const hh = String(Math.floor(secsLeft / 3600)).padStart(2, "0");
                  const mm = String(Math.floor((secsLeft % 3600) / 60)).padStart(2, "0");
                  const ss = String(secsLeft % 60).padStart(2, "0");
                  const timeLabel = msLeft <= 0 ? "sắp đến" : `${hh}:${mm}:${ss}`;

                  const isReinforce = march.kind === "reinforce";
                  const isReturn    = march.kind === "return";
                  const iconSrc     = isReinforce
                    ? "/assets/icons/icon_guild.png"
                    : isReturn
                    ? "/assets/icons/icon_guild.png"
                    : "/assets/icons/icon_military.png";
                  const label = isReinforce
                    ? "Tiếp viện đến " + territoryLabel(march.toTerritoryId)
                    : isReturn
                    ? "Quân đang trở về"
                    : "Hành quân đến " + territoryLabel(march.toTerritoryId);
                  const fillColor = isReturn || isReinforce ? "green" : "blue";

                  return (
                    <div className="hud-queue-card" key={march.id || march._id}>
                      <span className="hud-queue-icon-mask">
                        <img src={iconSrc} className="hud-queue-icon-png" alt="march" />
                      </span>
                      <div className="hud-queue-info">
                        <div className="hud-queue-title-row">
                          <span className="hud-queue-name">{label}</span>
                          <span className="hud-queue-timer">{timeLabel}</span>
                        </div>
                        <div className="hud-queue-progress-track">
                          <div
                            className={`hud-queue-progress-fill ${fillColor}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="hud-queue-meta">
                          {formatNum(march.troops || 0)} quân ·{" "}
                          {march.usesShip ? "⛵ biển" : "🏃 bộ"}
                        </div>
                      </div>
                      <button type="button" className="hud-queue-skip-btn" title="Tua nhanh">»</button>
                    </div>
                  );
                });
              })()}
              {/* No marches fallback */}
              {(worldActivity?.marches || []).filter((m: any) => m.ownerId === playerId).length === 0 && (
                <div className="hud-queue-card hud-queue-empty">
                  <span className="hud-queue-icon-mask">
                    <img src="/assets/icons/icon_military.png" className="hud-queue-icon-png" alt="no march" />
                  </span>
                  <div className="hud-queue-info">
                    <div className="hud-queue-title-row">
                      <span className="hud-queue-name" style={{ opacity: 0.5 }}>Không có đạo quân nào</span>
                    </div>
                    <div className="hud-queue-progress-track">
                      <div className="hud-queue-progress-fill" style={{ width: "0%" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FLOATING TOOLBAR ON FAR RIGHT EDGE (matching Mockup) */}
          <div className="hud-right-floating-toolbar hud-interactive">
            <button type="button" className="hud-tool-btn" onClick={() => openModal("army")} title="Thành trì">
              <span className="hud-tool-icon-mask">
                <img src="/assets/icons/icon_tower.png" className="hud-tool-icon-png" alt="tower" />
              </span>
              <span className="hud-tool-badge">2</span>
            </button>
            <button type="button" className="hud-tool-btn" onClick={jumpToCoordinates} title="Tìm kiếm">
              <span className="hud-tool-icon-mask">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
            </button>
            <button type="button" className="hud-tool-btn" onClick={() => handleAction("locate")} title="Định vị">
              <span className="hud-tool-icon-mask">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/></svg>
              </span>
            </button>
            <button type="button" className="hud-tool-btn" title="Đánh dấu">
              <span className="hud-tool-icon-mask">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </span>
            </button>
          </div>

          {/* Connection status pill hidden or styled elegantly */}
          <div 
            className="connection-pill hud-interactive" 
            data-online={apiOnline === true} 
            style={{ position: "fixed", bottom: "4px", right: "220px", zIndex: 10, pointerEvents: "none", opacity: 0.5 }}
          >
            {backendStatusText} · {socketStatusText}
          </div>
        </div>
      )}

      {gameReady && selectedRegion && engineRef.current && (
        <TerritoryTooltip
          region={selectedRegion}
          engine={engineRef.current}
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
            const playerTerritoriesCount = Object.keys(engineState?.regionOwnership || {}).filter((territoryId) =>
              engineState?.regionOwnership?.[Number(territoryId)] === 1 ||
              engineState?.regionOwnerIds?.[Number(territoryId)] === playerId
            ).length;
            const hasExistingLand = (serverHud.ownedTerritories > 0) || (playerTerritoriesCount > 0);
            if (!hasExistingLand && (localStorage.getItem(ONBOARDING_KEY) === "1" || playerTerritoriesCount === 0)) {
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
              const result = await startClearing(token, engineToServerTerritoryId(regionId));
              engineRef.current?.handleAction("applyBackendClearing", { clearing: result.clearing });
              refreshGameStateWithRetry("frontier-clearing-started", 2, 700);
              setSelectedRegion(null);
              addSystemLine(`ĐỘI THỢ XÂY ĐANG ĐI TỪ PHÁO ĐÀI BIÊN GIỚI GẦN NHẤT TỚI ${territoryLabel(regionId).toUpperCase()}`);
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
              clearings: prev.clearings.filter((c) => c.territoryId !== serverTerritoryId),
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
                    engineRef.current?.handleAction("syncResources", { resources: result.resources });
                    setResources((prev) => ({ ...prev, ...result.resources }));
                  }
                })
                .catch((err) => {
                  showGameError(err.message || "Không hủy được xây thành trên server");
                  // Rollback: re-sync from server if cancel fails
                  refreshGameStateWithRetry("cancel-clearing-rollback", 2, 800);
                });
            }
          }}
          onAttack={(regionId) => {
            const source = (deploySourceTown && isEligibleSourceTown(deploySourceTown))
              ? mergeTownWithServer(deploySourceTown)
              : getValidSourceTown();
            if (!source) {
              showGameError("Bạn cần có thành trì trước khi tấn công!");
              return;
            }
            engineRef.current?.handleAction("setUiOverlayActive", { active: true });
            setDeployError(null);
            setDeployTarget({ targetRegionId: regionId, isAttack: true, battleSide: "attacker" });
            setDeploySourceTown({ ...source });
          }}
          onReinforce={(regionId, side = "attacker") => {
            const source = (deploySourceTown && isEligibleSourceTown(deploySourceTown))
              ? mergeTownWithServer(deploySourceTown)
              : getValidSourceTown();
            if (!source) {
              showGameError("Bạn cần có thành trì trước khi tiếp viện!");
              return;
            }
            engineRef.current?.handleAction("setUiOverlayActive", { active: true });
            setDeployError(null);
            setDeployTarget({ targetRegionId: regionId, isAttack: false, battleSide: side });
            setDeploySourceTown({ ...source });
          }}
        />
      )}

      {activeModal === "tutorial" && (
        <NewbieOnboardingModal
          onClose={() => {
            engineRef.current?.handleAction("setUiOverlayActive", { active: false });
            setActiveModal("");
          }}
          onConfirm={() => {
            engineRef.current?.handleAction("setUiOverlayActive", { active: false });
            setActiveModal("");
          }}
        />
      )}

      {(kingdomCreationRegion !== null || (newbiePhase === "choose_banner" && newbieSelectedRegion !== null)) && engineRef.current && (
        <KingdomCreationModal
          defaultCityName="Thành Trì Vương Quốc"
          getCastleSprite={(color, emblem) => engineRef.current?.getCastleSprite(color, emblem)}
          onClose={() => {
            engineRef.current?.handleAction("setUiOverlayActive", { active: false });
            setKingdomCreationRegion(null);
            if (engineRef.current) {
              engineRef.current.cancelNewbieOnboarding();
            }
          }}
          onConfirm={async (flagColor, emblem, cityName) => {
            const regionId = kingdomCreationRegion ?? newbieSelectedRegion;
            if (!token || regionId === null) {
              showGameError("Chưa kết nối server, không thể xây thành tân thủ");
              return;
            }
            engineRef.current?.handleAction("setToast", { message: "ĐANG GỬI LỆNH XÂY THÀNH TÂN THỦ LÊN SERVER" });
            try {
              await updatePlayerProfile(token, flagColor, emblem, cityName);
              engineRef.current?.startNewbieOnboarding(flagColor, emblem, cityName);
              const result = await startClearing(token, engineToServerTerritoryId(regionId));
              engineRef.current?.handleAction("applyBackendClearing", { clearing: result.clearing });
              refreshGameStateWithRetry("newbie-clearing-started", 2, 700);
              engineRef.current?.handleAction("setUiOverlayActive", { active: false });
              setKingdomCreationRegion(null);
              addSystemLine(`KHỞI CÔNG HOÀNG THÀNH ${cityName.toUpperCase()}`);
            } catch (err: any) {
              engineRef.current?.handleAction("setUiOverlayActive", { active: true });
              engineRef.current?.cancelNewbieOnboarding();
              showGameError(err.message || "Không thể khởi tạo thành trì tân thủ");
            }
          }}
        />
      )}


      {deployTarget && deploySourceTown && engineRef.current && (
        <TroopDeploymentModal
          sourceTown={deploySourceTown}
          sourceTowns={engineRef.current.getPlayerOwnedTowns?.() || []}
          selectedSourceTownId={deploySourceTown.id}
          targetTownId={deployTarget.targetRegionId}
          isAttack={deployTarget.isAttack}
          battleSide={deployTarget.battleSide}
          gameConfig={(engineRef.current as any).getConfig?.()}
          errorMessage={deployError}
          getTownRegionId={(town) => engineRef.current?.getTownRegionId?.(town) ?? -1}
          getRegionCenter={(id) => engineRef.current?.getRegionCenter?.(id) ?? null}
          getRouteStatus={(town, targetRegionId) => engineRef.current?.getMarchRouteStatus?.(town, targetRegionId) ?? { ok: false, message: "Không có bản đồ", requiresShip: false }}
          onSelectSourceTown={(townId) => {
            const nextTown = engineRef.current?.getPlayerOwnedTowns?.().find((town: any) => town.id === townId);
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
            const route = engineRef.current?.getMarchRouteStatus?.(deploySourceTown, deployTarget.targetRegionId);
            if (route && !route.ok) {
              showGameError(route.message);
              return;
            }
            const sourceRegionId = engineRef.current?.getTownRegionId?.(deploySourceTown);
            if (sourceRegionId === undefined || sourceRegionId === null || sourceRegionId < 0) {
              showGameError("Không xác định được lãnh thổ xuất phát");
              return;
            }
            if (!token) {
              showGameError("Chưa kết nối server/socket, không thể xuất binh");
              return;
            }
            if (deploySourceTown) {
              try {
                const effectiveBattleSide = deployTarget.battleSide || (deployTarget.isAttack ? "attacker" : "defender");
                const effectiveKind = deployTarget.isAttack ? "attack" : (effectiveBattleSide === "attacker" ? "attack" : "reinforce");
                const result = await createMarch(token, {
                  fromTerritoryId: engineToServerTerritoryId(sourceRegionId),
                  toTerritoryId: engineToServerTerritoryId(deployTarget.targetRegionId),
                  troops: power,
                  infantry,
                  cavalry,
                  artillery,
                  battleSide: effectiveKind === "reinforce" ? effectiveBattleSide : undefined,
                  kind: effectiveKind,
                });
                if (result.town) {
                  const normalized = normalizeTownForClient(result.town);
                  setServerTowns((prev) => prev.map((t) => t.id === normalized.id ? normalized : t));
                  engineRef.current?.handleAction("applyBackendTownSnapshots", { towns: [normalized] });
                }
                if (result.newbieShieldUntil !== undefined) {
                  engineRef.current?.handleAction("updateNewbieShield", { until: result.newbieShieldUntil });
                }
                const rendered = engineRef.current?.handleAction("applyBackendMarch", {
                  march: result.march,
                  unitMix: { infantry, cavalry, artillery, battleSide: effectiveBattleSide },
                });
                setWorldActivity((prev) => ({
                  ...prev,
                  marches: [
                    ...prev.marches.filter((march: any) => march.id !== result.march.id),
                    result.march,
                  ],
                }));
                setServerHud((prev) => ({
                  ...prev,
                  lastSync: Date.now(),
                }));
                refreshGameStateWithRetry("march-created", 2, 700);
                addWarReport({
                  id: `api-march-${result.march.id}`,
                  kind: effectiveKind === "attack" ? "battle" : "march",
                  title: effectiveKind === "attack" ? "Lệnh tấn công đã xuất phát" : "Lệnh tiếp viện đã xuất phát",
                  body: `${formatNum(result.march.troops || power || 0)} quân đang hành quân tới ${territoryLabel(deployTarget.targetRegionId)}.`,
                  meta: `${result.march.distanceKm ?? 0}km · đến ${formatTimeLeft(result.march.arrivesAt)}`,
                });
                if (rendered === false) {
                  showGameError("Server đã nhận lệnh nhưng client chưa vẽ được đường hành quân. Dữ liệu sẽ đồng bộ lại từ server.");
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
                      ownerCode: territory.ownerId === null ? 0 : territory.ownerId === playerId ? 1 : 2,
                      ownerId: territory.ownerId,
                      ownerName: territory.ownerId === null ? "" : territory.ownerId === playerId ? "Bạn" : territory.ownerName ?? territory.ownerId,
                      ownerFlagColor: territory.ownerFlagColor,
                      ownerEmblem: territory.ownerEmblem,
                      ownerAllianceTag: territory.ownerAllianceTag,
                      ownerAllianceEmblem: territory.ownerAllianceEmblem,
                    }));
                    engineRef.current?.handleAction("applyWorldOwnership", { territories, replace: true });
                  })
                  .catch((syncErr) => console.warn("March reject resync failed:", syncErr));
                return;
              }
            }
            engineRef.current?.handleAction("setUiOverlayActive", { active: false });
            setDeployTarget(null);
            setDeploySourceTown(null);
            setDeployError(null);
          }}
          onClose={() => {
            engineRef.current?.handleAction("setUiOverlayActive", { active: false });
            setDeployTarget(null);
            setDeploySourceTown(null);
            setDeployError(null);
          }}
        />
      )}

      {Boolean(selectedTownForModal && (selectedTownForModal.owner === 0 || selectedTownForModal.ownerCode === 1 || (playerId && selectedTownForModal.ownerId === playerId))) && engineRef.current && (
        <TownManagementModal
          town={selectedTownForModal}
          resources={resources}
          gameConfig={(engineRef.current as any).getConfig?.()}
          specialResources={(engineRef.current as any).getTerritorySpecialResources?.((engineRef.current as any).getTownRegionId?.(selectedTownForModal)) || []}
          playerColor={(engineRef.current as any).getState?.().newbieFlagColor || "#2563eb"}
          onTrainInfantry={async () => {
            await trainUnitServerFirst("infantry", "Server từ chối mộ bộ binh");
          }}
          onTrainCavalry={async () => {
            await trainUnitServerFirst("cavalry", "Server từ chối mộ kị binh");
          }}
          onTrainArtillery={async () => {
            await trainUnitServerFirst("artillery", "Server từ chối mộ pháo binh");
          }}
          onClose={() => {
            engineRef.current?.handleAction("setUiOverlayActive", { active: false });
            setSelectedTown(null);
            engineRef.current?.handleAction("deselect");
          }}
        />
      )}

      {activeModal === "army" && engineRef.current && (
        <ArmyModal
          towns={engineRef.current.getTowns()}
          onCenterCamera={(town) => {
            engineRef.current?.handleAction("centerCamera", { townId: town.id, x: town.x, y: town.y });
          }}
          onClose={closeModal}
        />
      )}

      {activeModal === "treasure" && engineRef.current && (
        <TreasureModal
          towns={engineRef.current.getTowns()}
          regionOwnership={(engineRef.current as any).getState().regionOwnership}
          onClose={closeModal}
        />
      )}

      {activeModal === "shop" && (
        <ShopModal
          resources={resources}
          getSkinSprite={(skinId) => engineRef.current?.getPremiumCastleSprite(skinId)}
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
            <button type="button" className="war-report-close" onClick={closeModal}>×</button>
            <div className="war-report-title"><HudIcon name="swords" /> {t("warReportTitle")}</div>
            <div className="war-report-stats">
              <div><span>{t("reports")}</span><strong>{warReports.length}</strong></div>
              <div><span>{t("battles")}</span><strong>{battleRows.length}</strong></div>
              <div><span>{t("marching")}</span><strong>{attackRows.length + ownMarchRows.length}</strong></div>
              <div><span>{t("buildCastle")}</span><strong>{clearingRows.length}</strong></div>
            </div>
            <div className="war-report-list">
              <div className="war-report-section-title">{t("recentReports")}</div>
              {recentWarReports.length > 0 ? recentWarReports.map((report) => (
                <div
                  key={report.id}
                  className={`war-report-item ${report.kind} clickable`}
                  style={{ cursor: "pointer", borderLeft: "3px solid #f59e0b" }}
                  onClick={() => {
                    const repToOpen: BattleReportData = report.detailReport || {
                      regionId: 0,
                      territoryName: report.title,
                      attackerId: playerId || "local-player",
                      attackerName: "Bạn",
                      defenderId: "opponent",
                      defenderName: "Đối Thủ",
                      winnerId: report.title.includes("THẮNG") ? (playerId || "local-player") : "opponent",
                      isAttackerWin: report.title.includes("THẮNG") || !report.title.includes("THẤT THỦ"),
                      attacker: {
                        initial: { infantry: 120, cavalry: 40, artillery: 15, power: 3600 },
                        casualty: { infantry: 25, cavalry: 6, artillery: 2, power: 650 },
                        survivors: { infantry: 95, cavalry: 34, artillery: 13, power: 2950 },
                      },
                      defender: {
                        initial: { infantry: 100, cavalry: 30, artillery: 10, power: 2800 },
                        casualty: { infantry: 100, cavalry: 30, artillery: 10, power: 2800 },
                        survivors: { infantry: 0, cavalry: 0, artillery: 0, power: 0 },
                      },
                      lootedResources: { gold: 85000, wood: 54000, stone: 42000, gems: 250 },
                      createdAt: new Date(report.time).toISOString(),
                    };
                    closeModal();
                    setSelectedBattleReport(repToOpen);
                  }}
                >
                  <div className="war-report-item-title">
                    {report.title}
                    <span className="war-report-time">
                      {new Date(report.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="war-report-item-body">{report.body}</div>
                  <div className="war-report-item-meta">{report.meta}</div>
                </div>
              )) : (
                <div className="war-report-empty">{t("noReports")}</div>
              )}
              <div className="war-report-section-title">{t("activeNow")}</div>
              {warReportRows.length > 0 ? warReportRows.map((row, i) => (
                <div key={`${row.title}-${i}`} className="war-report-item active">
                  <div className="war-report-item-title">{row.title}</div>
                  <div className="war-report-item-meta">{row.meta}</div>
                </div>
              )) : (
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
            <button type="button" className="war-report-close" onClick={closeModal}>×</button>
            <div className="war-report-title"><HudIcon name="mail" /> {t("personalMail")}</div>
            <div className="mail-layout">
              <div className="mail-compose">
                <div className="mail-panel-title">{t("composeMail")}</div>
                <input
                  type="text"
                  value={mailDraft.to}
                  onChange={(event) => setMailDraft((prev) => ({ ...prev, to: event.target.value }))}
                  placeholder={t("recipientName")}
                  maxLength={32}
                />
                <input
                  type="text"
                  value={mailDraft.title}
                  onChange={(event) => setMailDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder={t("mailTitle")}
                  maxLength={48}
                />
                <textarea
                  value={mailDraft.body}
                  onChange={(event) => setMailDraft((prev) => ({ ...prev, body: event.target.value }))}
                  placeholder={t("mailBody")}
                  maxLength={320}
                />
                <button type="button" className="mail-send-btn" onClick={sendPrivateMail}>
                  {t("sendMail")}
                </button>
              </div>
              <div className="mail-inbox">
                <div className="mail-panel-title">{t("inbox")}</div>
                <div className="mail-list">
                  {privateMails.length > 0 ? privateMails.map((mail) => (
                    <button
                      key={mail.id}
                      type="button"
                      className={`mail-item ${mail.read ? "" : "unread"}`}
                      onClick={() => setPrivateMails((prev) => prev.map((item) => item.id === mail.id ? { ...item, read: true } : item))}
                    >
                      <div className="mail-meta">
                        <span>{mail.from} → {mail.to}</span>
                        <span>{new Date(mail.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="mail-title">{mail.title}</div>
                      <div className="mail-body">{mail.body}</div>
                    </button>
                  )) : (
                    <div className="war-report-empty">{t("noPersonalMail")}</div>
                  )}
                </div>
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

      {activeModal === "chat" && engineRef.current && (
        <ChatInputModal
          onSend={(msg) => {
            engineRef.current?.sendChat(msg);
          }}
          onClose={closeModal}
        />
      )}

      {/* Newbie Tutorial Modal Overlay */}
      {showTutorial && (
        <NewbieOnboardingModal
          onClose={() => {
            localStorage.setItem("island_empire_tutorial_completed", "1");
            engineRef.current?.handleAction("setUiOverlayActive", { active: false });
            setShowTutorial(false);
          }}
          onConfirm={() => {
            localStorage.setItem("island_empire_tutorial_completed", "1");
            engineRef.current?.handleAction("setUiOverlayActive", { active: false });
            setShowTutorial(false);
          }}
        />
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
