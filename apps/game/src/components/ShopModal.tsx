import React, { useEffect, useId, useRef, useState } from "react";
import {
  activateNewbieSkinTrial,
  createClientId,
  equipProfileCosmetic,
  equipShopSkin,
  getNewbieSkinTrial,
  getShopInventory,
  purchaseShopProduct,
  type ProfileCosmeticKind,
} from "../game/api";
import type {
  NewbieSkinTrialState,
  ResourceBag,
  ResourceKey,
  ShopGemPack,
  ShopInventory,
  ShopProduct,
} from "@island/shared";
import { MedievalModal } from "./MedievalModal";
import {
  EuroInfoIcon,
} from "./EuroIcons";
import { kingdomArchitectureFromSkin } from "../game/kingdomArchitecture";
import { KingdomBuildingSprite } from "./KingdomBuildingSprite";
import { AssetIcon } from "./AssetIcon";
import { RESOURCE_META, ResourceIcon } from "./ResourceDisplay";

type SkinVariant = "gold" | "fire" | "wind" | "ice" | "shadow" | "storm";

const SKIN_PRESENTATION: Record<
  string,
  { variant: SkinVariant; themeColor: string }
> = {
  skin_long_bao_thanh: { variant: "gold", themeColor: "#d7b56b" },
  skin_hoa_long_dien: { variant: "fire", themeColor: "#d06b50" },
  skin_phong_long_cac: { variant: "wind", themeColor: "#73aeb8" },
  skin_bang_vuong: { variant: "ice", themeColor: "#69c8ed" },
  skin_hac_nguyet: { variant: "shadow", themeColor: "#a987ef" },
  skin_thien_loi_than_dien: { variant: "storm", themeColor: "#73e8ff" },
  skin_thien_long_de_do: { variant: "gold", themeColor: "#f6bd55" },
};

function skinTargetLabel(target?: ShopProduct["skinTarget"]) {
  if (target === "capital") return "HOÀNG THÀNH";
  if (target === "military_district") return "QUÂN KHU";
  return "BỘ VƯƠNG QUỐC";
}

const PROFILE_FRAME_ASSETS: Record<string, string> = {
  vip: "/assets/ui/vip-avatar-frame.webp",
  gold: "/assets/leaderboard/leaderboard_frame_gold.png",
  silver: "/assets/leaderboard/leaderboard_frame_silver.png",
  bronze: "/assets/leaderboard/leaderboard_frame_bronze.png",
  dragonfire: "/assets/cosmetics/frames/dragonfire.png",
  stormcrown: "/assets/cosmetics/frames/stormcrown.png",
  voidmoon: "/assets/cosmetics/frames/voidmoon.png",
  dragon_sovereign: "/assets/cosmetics/generated/dragon-sovereign-frame.png",
  eclipse_warden: "/assets/cosmetics/generated/eclipse-warden-frame.png",
};

const PROFILE_NAME_FRAME_ASSETS: Record<string, string> = {
  imperial: "/assets/cosmetics/nameplates/imperial.png",
  tempest: "/assets/cosmetics/nameplates/tempest.png",
  astral: "/assets/cosmetics/nameplates/astral.png",
  celestial_tempest: "/assets/cosmetics/generated/celestial-tempest-nameplate.png",
  imperial_dragon: "/assets/cosmetics/generated/imperial-dragon-nameplate.png",
};

function KingdomSkinAsset({
  skinId,
  variant,
  large = false,
}: {
  skinId: string;
  variant: SkinVariant;
  large?: boolean;
}) {
  const architectureId = kingdomArchitectureFromSkin(skinId) || "goldencrown";
  return (
    <div
      className={`premium-castle-preview premium-castle-preview--${variant} ${large ? "is-large" : ""}`}
    >
      <div className="premium-castle-aura" />
      <KingdomBuildingSprite
        className="premium-castle-building"
        architectureId={architectureId}
        buildingType="capital"
        skinId={skinId}
      />
      <div className="premium-castle-fx" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      {variant === "gold" && (
        <div className="premium-gold-runes" aria-hidden="true" />
      )}
      {variant === "fire" && (
        <>
          <div className="premium-fire-flame flame-left" />
          <div className="premium-fire-flame flame-right" />
        </>
      )}
      {variant === "wind" && (
        <>
          <div className="premium-wind-ring ring-one" />
          <div className="premium-wind-ring ring-two" />
        </>
      )}
    </div>
  );
}

const TransparentChestImage: React.FC<{
  src: string;
  alt: string;
  className: string;
}> = ({ src, alt, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r < 45 && g < 45 && b < 52) {
          const avg = (r + g + b) / 3;
          data[i + 3] = Math.max(0, Math.floor((avg - 15) * 5));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };
  }, [src]);

  return <canvas ref={canvasRef} className={className} title={alt} />;
};

function CastleSkinArt({ variant }: { variant: SkinVariant }) {
  return <KingdomSkinAsset skinId="skin_long_bao_thanh" variant={variant} />;
  const uid = useId().replace(/:/g, "");
  const wallId = `skin-wall-${variant}-${uid}`;
  const roofId = `skin-roof-${variant}-${uid}`;
  const auraId = `skin-aura-${variant}-${uid}`;
  const glowId = `skin-glow-${variant}-${uid}`;
  const palettes = {
    gold: {
      wallA: "#5d4824",
      wallB: "#c99c42",
      roofA: "#7b3d12",
      roofB: "#ffd76a",
      auraA: "#fff4a8",
      auraB: "#d89616",
    },
    fire: {
      wallA: "#161419",
      wallB: "#51414a",
      roofA: "#5f100d",
      roofB: "#f04a1d",
      auraA: "#ffb02e",
      auraB: "#9f1610",
    },
    wind: {
      wallA: "#35535c",
      wallB: "#b4d1cf",
      roofA: "#075b70",
      roofB: "#3dd9e8",
      auraA: "#b9fbff",
      auraB: "#158ca4",
    },
    ice: {
      wallA: "#385a75",
      wallB: "#d7f3ff",
      roofA: "#176ca0",
      roofB: "#7ee7ff",
      auraA: "#e7fbff",
      auraB: "#2599d1",
    },
    shadow: {
      wallA: "#171329",
      wallB: "#55447d",
      roofA: "#20143e",
      roofB: "#7957bd",
      auraA: "#d8c4ff",
      auraB: "#6336aa",
    },
    storm: {
      wallA: "#132c3a",
      wallB: "#d3f8ff",
      roofA: "#125a7b",
      roofB: "#50e8ff",
      auraA: "#e2fcff",
      auraB: "#159be1",
    },
  } as const;
  const palette = palettes[variant];

  return (
    <svg
      viewBox="0 0 320 260"
      className={`castle-skin-art castle-skin-art--${variant}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={wallId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.wallB} />
          <stop offset="0.48" stopColor={palette.wallA} />
          <stop offset="1" stopColor="#111820" />
        </linearGradient>
        <linearGradient id={roofId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.roofB} />
          <stop offset="0.58" stopColor={palette.roofA} />
          <stop offset="1" stopColor="#24150d" />
        </linearGradient>
        <radialGradient id={auraId}>
          <stop offset="0" stopColor={palette.auraA} stopOpacity=".72" />
          <stop offset=".48" stopColor={palette.auraB} stopOpacity=".28" />
          <stop offset="1" stopColor={palette.auraB} stopOpacity="0" />
        </radialGradient>
        <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse
        className="skin-aura-pulse"
        cx="160"
        cy="190"
        rx="135"
        ry="83"
        fill={`url(#${auraId})`}
      />
      <ellipse cx="160" cy="226" rx="119" ry="22" fill="rgba(0,0,0,.58)" />

      {variant === "gold" && (
        <>
          <g className="skin-orbit-runes" fill="none" stroke="#ffd867">
            <ellipse
              cx="160"
              cy="200"
              rx="124"
              ry="28"
              strokeWidth="2"
              strokeDasharray="9 8"
            />
            <path
              d="M45 198l9-8 9 8-9 8zm202 0l9-8 9 8-9 8zM151 224l9-8 9 8-9 8z"
              fill="#ffd867"
            />
          </g>
          <g className="skin-castle-body">
            <path
              d="M42 205l118 27 118-27-118-31z"
              fill="#47361e"
              stroke="#e9bc55"
              strokeWidth="2"
            />
            <path
              d="M54 147l106 24 106-24v61l-106 24-106-24z"
              fill={`url(#${wallId})`}
              stroke="#f2c55e"
              strokeWidth="2"
            />
            <path d="M54 147l106 24 106-24-106-27z" fill="#d1a44c" />
            <path
              d="M73 102h42v108H73zM205 102h42v108h-42z"
              fill={`url(#${wallId})`}
              stroke="#f3c85f"
              strokeWidth="2"
            />
            <path
              d="M65 104l29-45 29 45zm132 0l29-45 29 45z"
              fill={`url(#./assets/icons/resource_wood_european.png)`}
              stroke="#ffe58a"
              strokeWidth="2"
            />
            <path
              d="M119 119h82v99h-82z"
              fill={`url(#${wallId})`}
              stroke="#f3c85f"
              strokeWidth="2"
            />
            <path
              d="M108 121l52-61 52 61z"
              fill={`url(#./assets/icons/resource_wood_european.png)`}
              stroke="#ffe58a"
              strokeWidth="2"
            />
            <path
              d="M137 79h46v42h-46z"
              fill="#8d641f"
              stroke="#ffd867"
              strokeWidth="2"
            />
            <path
              d="M128 80l32-35 32 35z"
              fill={`url(#./assets/icons/resource_wood_european.png)`}
              stroke="#fff0a5"
              strokeWidth="2"
            />
            <path
              d="M143 218v-33c0-24 34-24 34 0v33z"
              fill="#24170f"
              stroke="#eebd54"
              strokeWidth="2"
            />
            <g
              className="skin-lit-windows"
              fill="#fff1a1"
              filter={`url(#${glowId})`}
            >
              <rect x="86" y="125" width="13" height="22" rx="6" />
              <rect x="221" y="125" width="13" height="22" rx="6" />
              <rect x="146" y="139" width="12" height="23" rx="6" />
              <rect x="166" y="139" width="12" height="23" rx="6" />
            </g>
            <path
              className="skin-banner"
              d="M159 45V18m2 2l31 8-31 11z"
              stroke="#ffe98e"
              strokeWidth="3"
              fill="#b4232f"
            />
            <path
              d="M148 96l12-9 12 9-4 16h-16z"
              fill="#f8d66e"
              stroke="#fff2ae"
              strokeWidth="2"
            />
          </g>
          <g
            className="skin-guardian skin-guardian--gold"
            fill="#ffd867"
            filter={`url(#${glowId})`}
          >
            <path
              className="skin-dragon-wing skin-dragon-wing--left"
              d="M43 67c-22-15-30-3-34 10 17-8 30 4 43 14z"
            />
            <path
              className="skin-dragon-wing skin-dragon-wing--right"
              d="M69 67c22-15 30-3 34 10-17-8-30 4-43 14z"
            />
            <path d="M48 66c7-13 17-13 24 0l-5 24-9 12-8-13z" />
            <circle cx="60" cy="57" r="8" />
            <path d="M64 51l11-7-5 12zM55 50l-8-8 2 13z" />
          </g>
          {[44, 76, 111, 214, 248, 276].map((x, index) => (
            <circle
              key={x}
              className="skin-particle skin-particle--gold"
              cx={x}
              cy={190 - (index % 3) * 35}
              r={index % 2 ? 3 : 2}
              style={{ animationDelay: `${index * -0.45}s` }}
            />
          ))}
        </>
      )}

      {variant === "fire" && (
        <>
          <g className="skin-castle-body">
            <path
              d="M38 207l122 27 122-27-122-35z"
              fill="#170f11"
              stroke="#9f2819"
              strokeWidth="2"
            />
            <path
              d="M51 147l109 26 109-26v62l-109 25-109-25z"
              fill={`url(#${wallId})`}
              stroke="#9d2b1d"
              strokeWidth="2"
            />
            <path
              d="M66 96h46v116H66zM208 96h46v116h-46z"
              fill={`url(#${wallId})`}
              stroke="#c83a22"
              strokeWidth="2"
            />
            <path
              d="M59 98l30-55 30 55zm142 0l30-55 30 55z"
              fill={`url(#./assets/icons/resource_wood_european.png)`}
            />
            <path
              d="M112 122h96v101h-96z"
              fill="#211b20"
              stroke="#d33d23"
              strokeWidth="2"
            />
            <path
              d="M102 124l58-69 58 69z"
              fill={`url(#./assets/icons/resource_wood_european.png)`}
            />
            <path
              d="M137 92h46v35h-46z"
              fill="#35191b"
              stroke="#df4928"
              strokeWidth="2"
            />
            <path d="M128 94l32-51 32 51z" fill="#8e1e14" />
            <path
              d="M141 222v-34c0-26 38-26 38 0v34z"
              fill="#090708"
              stroke="#f15a26"
              strokeWidth="2"
            />
            <g
              className="skin-lava-cracks"
              fill="none"
              stroke="#ff6b26"
              strokeWidth="3"
              filter={`url(#${glowId})`}
            >
              <path d="M67 160l18 12-9 14 20 17M237 151l-17 17 10 12-18 20M136 143l14 16-7 17m40-35l-14 18 8 15" />
            </g>
            <g
              className="skin-lit-windows"
              fill="#ffad37"
              filter={`url(#${glowId})`}
            >
              <rect x="82" y="120" width="13" height="25" rx="6" />
              <rect x="225" y="120" width="13" height="25" rx="6" />
              <rect x="144" y="138" width="12" height="25" rx="6" />
              <rect x="166" y="138" width="12" height="25" rx="6" />
            </g>
            <path
              className="skin-banner"
              d="M159 43V16m2 2l31 8-31 12z"
              stroke="#ff9a3c"
              strokeWidth="3"
              fill="#6f0c0c"
            />
          </g>
          <g className="skin-flames" fill="#ff6a21" filter={`url(#${glowId})`}>
            <path
              className="skin-flame skin-flame--one"
              d="M69 100c-9-16 5-22 1-37 18 17 22 28 12 42z"
            />
            <path
              className="skin-flame skin-flame--two"
              d="M226 99c-9-17 8-24 3-39 18 18 20 30 10 44z"
            />
            <path
              className="skin-flame skin-flame--three"
              d="M151 95c-8-18 7-26 4-44 19 20 20 34 9 48z"
            />
          </g>
          <g className="skin-smoke" fill="#66545b">
            <circle cx="72" cy="53" r="12" />
            <circle cx="81" cy="40" r="9" />
            <circle cx="228" cy="48" r="13" />
            <circle cx="238" cy="33" r="8" />
          </g>
          {[43, 69, 101, 215, 247, 280].map((x, index) => (
            <circle
              key={x}
              className="skin-particle skin-particle--fire"
              cx={x}
              cy={205 - (index % 3) * 28}
              r={index % 2 ? 3 : 2}
              style={{ animationDelay: `${index * -0.38}s` }}
            />
          ))}
        </>
      )}

      {variant === "wind" && (
        <>
          <g className="skin-wind-rings" fill="none" stroke="#69f4ff">
            <ellipse
              cx="160"
              cy="184"
              rx="130"
              ry="34"
              strokeWidth="3"
              strokeDasharray="34 16"
            />
            <ellipse
              cx="160"
              cy="164"
              rx="105"
              ry="25"
              strokeWidth="2"
              strokeDasharray="17 12"
              opacity=".7"
            />
          </g>
          <g className="skin-clouds" fill="#d8fbff">
            <path d="M28 199c9-18 28-14 33-2 13-13 35-3 34 12H28zM224 194c8-16 26-13 31-2 13-11 33-2 32 12h-63z" />
          </g>
          <g className="skin-castle-body">
            <path
              d="M53 207l107 26 107-26-107-29z"
              fill="#244850"
              stroke="#7ceef4"
              strokeWidth="2"
            />
            <path
              d="M67 148l93 23 93-23v61l-93 24-93-24z"
              fill={`url(#${wallId})`}
              stroke="#86edf1"
              strokeWidth="2"
            />
            <path
              d="M80 106h40v105H80zM200 106h40v105h-40z"
              fill={`url(#${wallId})`}
              stroke="#8ff4f5"
              strokeWidth="2"
            />
            <path
              d="M72 108l28-46 28 46zm120 0l28-46 28 46z"
              fill={`url(#./assets/icons/resource_wood_european.png)`}
              stroke="#a6fbff"
              strokeWidth="2"
            />
            <path
              d="M119 119h82v103h-82z"
              fill={`url(#${wallId})`}
              stroke="#91f0f1"
              strokeWidth="2"
            />
            <path
              d="M108 121l52-64 52 64z"
              fill={`url(#./assets/icons/resource_wood_european.png)`}
              stroke="#b7fdff"
              strokeWidth="2"
            />
            <path
              d="M140 83h40v39h-40z"
              fill="#2c727d"
              stroke="#8ef5f6"
              strokeWidth="2"
            />
            <path
              d="M131 85l29-42 29 42z"
              fill="#0d8498"
              stroke="#abfbff"
              strokeWidth="2"
            />
            <path
              d="M143 222v-33c0-24 34-24 34 0v33z"
              fill="#102f36"
              stroke="#83e7e9"
              strokeWidth="2"
            />
            <g
              className="skin-lit-windows"
              fill="#b8ffff"
              filter={`url(#${glowId})`}
            >
              <rect x="94" y="130" width="12" height="22" rx="6" />
              <rect x="214" y="130" width="12" height="22" rx="6" />
              <rect x="145" y="143" width="11" height="23" rx="6" />
              <rect x="165" y="143" width="11" height="23" rx="6" />
            </g>
            <path
              className="skin-banner"
              d="M159 43V17m2 2l30 8-30 11z"
              stroke="#c6ffff"
              strokeWidth="3"
              fill="#147f91"
            />
          </g>
          <g className="skin-crystal" filter={`url(#${glowId})`}>
            <path
              d="M160 24l10 18-10 17-10-17z"
              fill="#baffff"
              stroke="#54e5f2"
              strokeWidth="2"
            />
          </g>
          {[39, 70, 109, 212, 250, 282].map((x, index) => (
            <circle
              key={x}
              className="skin-particle skin-particle--wind"
              cx={x}
              cy={202 - (index % 3) * 31}
              r={index % 2 ? 3 : 2}
              style={{ animationDelay: `${index * -0.5}s` }}
            />
          ))}
        </>
      )}
    </svg>
  );
}

function PremiumCastleCanvas({
  skinId,
  variant,
  getSkinSprite,
  large = false,
}: {
  skinId: string;
  variant: SkinVariant;
  getSkinSprite?: (skinId: string) => HTMLCanvasElement | undefined;
  large?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sprite = getSkinSprite?.(skinId);
    if (!canvas || !sprite) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  }, [getSkinSprite, skinId]);

  return (
    <div
      className={`premium-castle-preview premium-castle-preview--${variant} ${large ? "is-large" : ""}`}
    >
      <div className="premium-castle-aura" />
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        aria-label={`Xem trước skin ${skinId}`}
      />
      <div className="premium-castle-fx" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      {variant === "gold" && (
        <div className="premium-gold-runes" aria-hidden="true" />
      )}
      {variant === "fire" && (
        <>
          <div className="premium-fire-flame flame-left" />
          <div className="premium-fire-flame flame-right" />
        </>
      )}
      {variant === "wind" && (
        <>
          <div className="premium-wind-ring ring-one" />
          <div className="premium-wind-ring ring-two" />
        </>
      )}
    </div>
  );
}

const ResFoodIcon = () => {
  return <AssetIcon asset="food" size={20} />;
  return (
    <svg viewBox="0 0 64 64" width="20" height="20">
      <path
        d="M32 6v52M32 16q10-8 20 0M32 30q10-8 20 0M32 44q10-8 20 0M32 16q-10-8-20 0M32 30q-10-8-20 0M32 44q-10-8-20 0"
        stroke="#facc15"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

const ResWoodIcon = () => {
  return <AssetIcon asset="wood" size={20} />;
  return (
    <svg viewBox="0 0 64 64" width="20" height="20">
      <path
        d="M12 16h40M8 32h48M14 48h36"
        stroke="#ca8a04"
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="16" r="3" fill="#854d0e" />
      <circle cx="52" cy="16" r="3" fill="#854d0e" />
      <circle cx="8" cy="32" r="3" fill="#854d0e" />
      <circle cx="56" cy="32" r="3" fill="#854d0e" />
    </svg>
  );
};

const ResStoneIcon = () => {
  return <AssetIcon asset="stone" size={20} />;
  return (
    <svg viewBox="0 0 64 64" width="20" height="20">
      <polygon
        points="32,8 54,22 54,48 32,58 10,48 10,22"
        fill="#94a3b8"
        stroke="#475569"
        strokeWidth="3"
      />
      <polygon points="32,8 32,58 10,48" fill="#cbd5e1" />
      <polygon points="32,8 54,22 32,58" fill="#64748b" opacity="0.6" />
    </svg>
  );
};

const ResIronIcon = () => {
  return <AssetIcon asset="iron" size={20} />;
  return (
    <svg viewBox="0 0 64 64" width="20" height="20">
      <polygon
        points="8,26 32,8 56,26 56,48 8,48"
        fill="#e2e8f0"
        stroke="#475569"
        strokeWidth="2.5"
      />
      <polygon points="8,26 32,26 32,48 8,48" fill="#94a3b8" />
      <polygon points="32,8 56,26 32,26" fill="#ffffff" opacity="0.75" />
    </svg>
  );
};

const ResGoldIcon = () => {
  return <AssetIcon asset="gold" size={20} />;
  return (
    <svg viewBox="0 0 64 64" width="20" height="20">
      <circle
        cx="24"
        cy="40"
        r="16"
        fill="#eab308"
        stroke="#ca8a04"
        strokeWidth="2.5"
      />
      <circle cx="24" cy="40" r="10" fill="#facc15" />
      <circle
        cx="40"
        cy="24"
        r="16"
        fill="#facc15"
        stroke="#eab308"
        strokeWidth="2.5"
      />
      <circle cx="40" cy="24" r="10" fill="#fef08a" />
      <text
        x="36"
        y="29"
        fill="#ca8a04"
        fontSize="15"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        $
      </text>
    </svg>
  );
};

interface ShopModalProps {
  onClose: () => void;
  token: string;
  resources: ResourceBag;
  catalog: ShopProduct[];
  gemPacks: ShopGemPack[];
  gemPackPaymentConfigured: boolean;
  initialResource?: ResourceKey | null;
  inventory: ShopInventory;
  purchasedProductIds: string[];
  onResources: (resources: ResourceBag) => void;
  onInventory: (inventory: ShopInventory) => void;
  onPurchaseCompleted?: (productId: string) => void;
  currentAvatarId?: string;
  onProfileCosmeticEquipped?: (profile: {
    avatarId?: string;
    avatarFrameId?: string;
    nameFrameId?: string;
  }) => void;
  onVipProgress?: (level: number, points: number) => void;
  onClaimGemPack: (sku: string) => Promise<void>;
  onNotify: (message: string) => void;
}

const MERCHANT_QUOTES = [
  "Quân nhu đầy kho, vạn dặm viễn chinh không lo đói kém!",
  "Ngoại trang hoàng kim này chỉ thuộc về những lãnh chúa kiệt xuất nhất.",
  "Mỗi giao dịch Hoàng Gia đều được các vị thần bảo hộ chiến tranh ghi nhận.",
  "Đầu tư quân nhu là chìa khóa mở lối chiến thắng vẻ vang!",
];

type ShopTab = "gems" | "resources" | "offers" | "skins" | "profile";

const SHOP_TABS: Array<{
  id: ShopTab;
  label: string;
  sublabel: string;
  icon: string;
}> = [
  {
    id: "gems",
    label: "NẠP GEM",
    sublabel: "MỘT LOẠI TIỀN TỆ",
    icon: "/assets/store/gem.png",
  },
  {
    id: "resources",
    label: "QUÂN NHU",
    sublabel: "KHO TÀI NGUYÊN",
    icon: "/assets/store/resource.png",
  },
  {
    id: "offers",
    label: "KHAI QUỐC",
    sublabel: "ƯU ĐÃI TÂN THỦ",
    icon: "/assets/store/profile.png",
  },
  {
    id: "skins",
    label: "NGOẠI TRANG",
    sublabel: "THÀNH TRÌ",
    icon: "/assets/store/skin.png",
  },
  {
    id: "profile",
    label: "KHUNG HỒ SƠ",
    sublabel: "KHUNG AVATAR & TÊN",
    icon: "/assets/store/profile.png",
  },
];

type ShopPhase = "newbie" | "royal";

const SHOP_PHASE_STEPS = [
  { id: "supply", label: "Nhận quân nhu", shortLabel: "QUÂN NHU" },
  { id: "skin", label: "Chọn skin thử", shortLabel: "NGOẠI TRANG" },
  { id: "build", label: "Dựng vương quốc", shortLabel: "KHAI QUỐC" },
] as const;

export const ShopModal: React.FC<ShopModalProps> = ({
  onClose,
  token,
  resources,
  catalog,
  gemPacks,
  gemPackPaymentConfigured,
  initialResource,
  inventory,
  purchasedProductIds,
  onResources,
  onInventory,
  onPurchaseCompleted,
  currentAvatarId,
  onProfileCosmeticEquipped,
  onVipProgress,
  onClaimGemPack,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<ShopTab>("resources");
  const [previewSkin, setPreviewSkin] = useState<any | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [trial, setTrial] = useState<NewbieSkinTrialState | null>(null);
  const [trialLoaded, setTrialLoaded] = useState(false);
  const [trialNow, setTrialNow] = useState(Date.now());
  const [pendingTrialSkin, setPendingTrialSkin] = useState<any | null>(null);
  const expirySyncRef = useRef(false);

  const [rewardModalPack, setRewardModalPack] = useState<any | null>(null);
  const [quote, setQuote] = useState(MERCHANT_QUOTES[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MERCHANT_QUOTES.length);
    setQuote(MERCHANT_QUOTES[randomIndex]);
  }, [activeTab]);

  useEffect(() => {
    if (initialResource === "gems") {
      setActiveTab("gems");
    } else if (initialResource) {
      setActiveTab("resources");
    }
  }, [initialResource]);

  useEffect(() => {
    let cancelled = false;
    void getNewbieSkinTrial(token)
      .then((result) => {
        if (!cancelled) setTrial(result.trial);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setTrialLoaded(true);
      });
    const timer = window.setInterval(() => setTrialNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  const trialRemainingMs = trial?.expiresAt
    ? Math.max(0, new Date(trial.expiresAt).getTime() - trialNow)
    : 0;
  const trialRemainingLabel = (() => {
    const totalSeconds = Math.floor(trialRemainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return days > 0
      ? `${days} ngày ${hours} giờ`
      : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  })();

  useEffect(() => {
    if (
      trial?.status !== "active" ||
      trialRemainingMs > 0 ||
      expirySyncRef.current
    )
      return;
    expirySyncRef.current = true;
    void Promise.all([getNewbieSkinTrial(token), getShopInventory(token)])
      .then(([trialResult, inventoryResult]) => {
        setTrial(trialResult.trial);
        onInventory(inventoryResult.inventory);
        onNotify(
          "Skin dùng thử đã hết hạn; trang bị trước đó đã được khôi phục",
        );
      })
      .finally(() => {
        expirySyncRef.current = false;
      });
  }, [onInventory, onNotify, token, trial?.status, trialRemainingMs]);

  const activateTrial = async (skinId: string) => {
    if (busyProductId) return;
    setBusyProductId(skinId);
    try {
      const result = await activateNewbieSkinTrial(token, skinId);
      onInventory(result.inventory);
      setTrial(result.trial);
      setTrialNow(Date.now());
      setPendingTrialSkin(null);
      setPreviewSkin(null);
      onNotify("Đã kích hoạt bộ skin dùng thử trong 7 ngày");
    } catch (error: any) {
      onNotify(error?.message || "Không thể kích hoạt dùng thử");
    } finally {
      setBusyProductId(null);
    }
  };

  const buyProduct = async (productId: string) => {
    if (busyProductId) return;
    setBusyProductId(productId);
    try {
      const product = effectiveCatalog.find((item) => item.id === productId);
      const result = await purchaseShopProduct(
        token,
        productId,
        createClientId("shop"),
        product?.skinId ? product.skinTarget || "capital" : undefined,
      );
      onResources(result.resources);
      onInventory(result.inventory);
      if (result.vipLevel !== undefined && result.vipPoints !== undefined) {
        onVipProgress?.(result.vipLevel, result.vipPoints);
      }
      onPurchaseCompleted?.(productId);
      if (product?.type === "profile_cosmetic") {
        onProfileCosmeticEquipped?.({
          avatarId: product.avatarId,
          avatarFrameId: product.avatarFrameId,
          nameFrameId: product.nameFrameId,
        });
        onNotify(
          result.duplicate
            ? "Đã trang bị vật phẩm hồ sơ"
            : "Mua và trang bị vật phẩm hồ sơ thành công",
        );
      } else if (product?.skinId) {
        onNotify(
          result.duplicate
            ? "Ngoại trang đã được trang bị"
            : "Mua và trang bị ngoại trang thành công",
        );
      } else {
        const packObj = resourcePacks.find((p) => p.id === productId);
        if (packObj) {
          setRewardModalPack(packObj);
        } else {
          onNotify(
            result.duplicate
              ? "Giao dịch đã được xử lý trước đó"
              : "Mua hàng thành công",
          );
        }
      }
    } catch (error: any) {
      onNotify(error?.message || "Không thể hoàn tất giao dịch");
    } finally {
      setBusyProductId(null);
    }
  };

  const equipProfile = async (
    kind: ProfileCosmeticKind,
    cosmeticId: string,
  ) => {
    if (busyProductId) return;
    setBusyProductId(cosmeticId);
    try {
      const result = await equipProfileCosmetic(token, kind, cosmeticId);
      onInventory(result.inventory);
      onProfileCosmeticEquipped?.({
        avatarId: kind === "avatar" ? cosmeticId : result.avatarId,
        avatarFrameId: kind === "avatar_frame" ? cosmeticId : undefined,
        nameFrameId: kind === "name_frame" ? cosmeticId : undefined,
      });
      onNotify("Đã trang bị vật phẩm hồ sơ");
    } catch (error: any) {
      onNotify(error?.message || "Không thể trang bị vật phẩm hồ sơ");
    } finally {
      setBusyProductId(null);
    }
  };

  const equipSkin = async (skinId: string) => {
    if (busyProductId) return;
    setBusyProductId(skinId);
    try {
      const result = await equipShopSkin(token, skinId, "kingdom");
      onInventory(result.inventory);
      onNotify("Đã trang bị skin cho Hoàng Thành và Quân Khu");
    } catch (error: any) {
      onNotify(error?.message || "Không thể trang bị ngoại trang");
    } finally {
      setBusyProductId(null);
    }
  };

  const effectiveCatalog = catalog;
  const newbieResourceOffer = effectiveCatalog.find(
    (product) => product.type === "resource_pack" && product.isNewbiePrice,
  );
  const newbieSkinOffer = effectiveCatalog.find(
    (product) => product.type === "skin" && product.isNewbieFree,
  );
  const newbieOfferExpiresAt =
    newbieSkinOffer?.newbieFreeExpiresAt ||
    newbieResourceOffer?.newbiePriceExpiresAt;
  const newbieOfferDate = newbieOfferExpiresAt
    ? new Date(newbieOfferExpiresAt).toLocaleDateString("vi-VN")
    : null;

  const resourceIcons: Partial<Record<keyof ResourceBag, React.ReactNode>> = {
    food: <ResourceIcon resource="food" className="shop-resource-icon" />,
    wood: <ResourceIcon resource="wood" className="shop-resource-icon" />,
    stone: <ResourceIcon resource="stone" className="shop-resource-icon" />,
    gold: <ResourceIcon resource="gold" className="shop-resource-icon" />,
  };
  const resourceNames: Partial<Record<keyof ResourceBag, string>> = {
    food: RESOURCE_META.food.label,
    wood: RESOURCE_META.wood.label,
    stone: RESOURCE_META.stone.label,
    gold: RESOURCE_META.gold.label,
  };
  const resourcePacks = effectiveCatalog
    .filter((product) => product.type === "resource_pack")
    .map((product, index) => ({
      ...product,
      desc: product.description,
      price: product.priceGems,
      isNewbiePrice: Boolean(product.isNewbiePrice),
      badge: product.testPrice
        ? "GIÁ THỬ NGHIỆM"
        : index === 0
          ? "Phổ biến"
          : "Hoàng gia",
      color: index === 0 ? "#f59e0b" : "#ffd700",
      contents: Object.entries(product.resources || {}).map(
        ([key, amount]) => ({
          name: resourceNames[key as keyof ResourceBag] || key,
          amount: Number(amount || 0),
          icon: resourceIcons[key as keyof ResourceBag],
        }),
      ),
    }));

  const skinPacks = effectiveCatalog
    .filter(
      (product): product is ShopProduct & { skinId: string } =>
        product.type === "skin" && Boolean(product.skinId),
    )
    .map((product) => {
      const skinId = product.skinId;
      const presentation =
        SKIN_PRESENTATION[skinId] || SKIN_PRESENTATION.skin_long_bao_thanh;
      return {
        ...product,
        skinId,
        price: product.priceGems,
        desc: product.description,
        themeColor: presentation.themeColor,
        variant: presentation.variant,
      };
    });

  const profilePacks = effectiveCatalog.filter(
    (
      product,
    ): product is ShopProduct & {
      profileCosmeticKind: "avatar_frame" | "name_frame";
    } =>
      product.type === "profile_cosmetic" &&
      (product.profileCosmeticKind === "avatar_frame" ||
        product.profileCosmeticKind === "name_frame"),
  );

  const liveOfferResourcePacks = resourcePacks.filter(
    (pack) => pack.isNewbiePrice && !purchasedProductIds.includes(pack.id),
  );
  const isNewbiePhase =
    trial?.status === "eligible" ||
    trial?.status === "active" ||
    liveOfferResourcePacks.length > 0;
  const shopPhase: ShopPhase =
    trialLoaded && isNewbiePhase ? "newbie" : "royal";
  const hasBoughtNewbieResource = resourcePacks.some(
    (pack) =>
      pack.isNewbiePrice && purchasedProductIds.includes(pack.id),
  );
  const newbiePhaseStep =
    trial?.status === "active"
      ? 1
      : hasBoughtNewbieResource
        ? 1
        : 0;
  const visibleResourcePacks =
    activeTab === "offers" && liveOfferResourcePacks.length > 0
      ? liveOfferResourcePacks
      : resourcePacks;
  const focusedResourcePackId =
    initialResource && initialResource !== "gems"
      ? `pack_${initialResource}`
      : null;
  const orderedVisibleResourcePacks = focusedResourcePackId
    ? [...visibleResourcePacks].sort((left, right) => {
        if (left.id === focusedResourcePackId) return -1;
        if (right.id === focusedResourcePackId) return 1;
        return 0;
      })
    : visibleResourcePacks;
  const showingSkinCatalog = activeTab === "skins";
  const showingProfileCatalog = activeTab === "profile";
  const showingGemCatalog = activeTab === "gems";
  const enabledGemPacks = gemPacks.filter((pack) => pack.enabled);
  const availableTabs = SHOP_TABS.filter((tab) => {
    if (tab.id === "gems")
      return enabledGemPacks.length > 0 && gemPackPaymentConfigured;
    if (tab.id === "offers") return liveOfferResourcePacks.length > 0;
    return true;
  });
  // Keep effects keyed by the actual catalog shape, not by a freshly-created
  // array reference. Otherwise clicking a tab triggers the newbie default-tab
  // effect again and immediately jumps back to the first tab.
  const availableTabIds = availableTabs.map((tab) => tab.id).join("|");
  const firstAvailableTab = availableTabs[0]?.id;
  const activeTabDetails =
    availableTabs.find((tab) => tab.id === activeTab) || availableTabs[0];
  const visibleProductCount = showingGemCatalog
    ? enabledGemPacks.length
    : showingProfileCatalog
      ? profilePacks.length
      : showingSkinCatalog
        ? skinPacks.length
        : orderedVisibleResourcePacks.length;
  const ownedCollectibleCount =
    (inventory.ownedSkins?.length || 0) +
    (inventory.ownedAvatars?.length || 0) +
    (inventory.ownedAvatarFrames?.length || 0) +
    (inventory.ownedNameFrames?.length || 0);

  useEffect(() => {
    if (
      firstAvailableTab &&
      !availableTabIds.split("|").includes(activeTab)
    ) {
      setActiveTab(firstAvailableTab);
    }
  }, [activeTab, availableTabIds, firstAvailableTab]);

  useEffect(() => {
    if (initialResource || !trialLoaded) return;
    const nextTab =
      shopPhase === "newbie" && availableTabIds.split("|").includes("offers")
        ? "offers"
        : "resources";
    setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
  }, [availableTabIds, initialResource, shopPhase, trialLoaded]);

  const handleBuy = async (productId: string) => {
    setBusyProductId(productId);
    try {
      await buyProduct(productId);
    } finally {
      setBusyProductId(null);
    }
  };

  const handleClaimGemPack = async (sku: string) => {
    if (busyProductId) return;
    setBusyProductId(sku);
    try {
      await onClaimGemPack(sku);
    } finally {
      setBusyProductId(null);
    }
  };

  return (
    <MedievalModal
      title="Cửa hàng Hoàng gia"
      subtitle="Quân nhu và ngoại trang"
      onClose={onClose}
      width="95vw"
      maxWidth="1180px"
      className="shop-modal-v2 shop-v3"
      fitViewport={false}
    >
      <div
        className={`euro-shop-modal-body euro-shop-split-layout medieval-wood-panel shop-modal-v2__body shop-phase--${shopPhase}`}
      >
        {/* Left Side: Merchant Character Panel (Hidden on mobile) */}
        <div className="euro-shop-sidebar shop-modal-v2__sidebar">
          {/* Scroll themed merchant bubble */}
          <div className="merchant-bubble scroll-bubble">
            <div className="scroll-roller left-roller" />
            <div className="scroll-roller right-roller" />
            <div className="scroll-cap top-cap" />
            <p className="bubble-text">{quote}</p>
            <div className="scroll-cap bottom-cap" />
          </div>
          {/* Gothic Window frame for Merchant avatar */}
          <div className="gothic-arched-frame">
            <div className="gothic-frame-inner">
              <img
                src="/assets/ui/merchant_avatar.webp"
                alt="Merchant Lady"
                className="merchant-avatar-img"
              />
              <div className="gothic-vignette" />
            </div>
            <div className="gothic-gold-trim trim-top" />
            <div className="gothic-gold-trim trim-bottom" />
          </div>

          <nav
            className="euro-shop-tabs wood-slate-tabs shop-modal-v2__tabs"
            aria-label="Danh mục cửa hàng"
          >
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`euro-tab-btn euro-tab-btn--${tab.id} ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
              >
                <img src={tab.icon} alt="" aria-hidden="true" />
                <span className="shop-tab-copy">
                  <strong>{tab.label}</strong>
                  <small>{tab.sublabel}</small>
                </span>
                <span className="tab-indicator" />
              </button>
            ))}
          </nav>
        </div>

        {/* Right Side: Main Shop Panel */}
        <div className="euro-shop-main shop-modal-v2__main">
          {/* Top Hero Castle Banner Card */}
          <div className="euro-hero-banner royal-velvet-banner shop-modal-v2__hero">
            <div className="royal-shield-emblem">
              <div className="shield-cross" />
            </div>

            {/* Round merchant avatar visible only on mobile/small screens */}
            <div className="mobile-merchant-badge">
              <img
                src="/assets/ui/merchant_avatar.webp"
                alt="Merchant Lady"
                className="mobile-merchant-img"
              />
              <div className="mobile-merchant-bubble">
                <p className="mobile-bubble-text">{quote}</p>
              </div>
            </div>

            <div className="euro-hero-content">
              <div className="euro-hero-title-group">
                <img
                  src="/assets/icons/icon_gold_crown.webp"
                  alt="Crown"
                  className="euro-crown-icon"
                />
                <div>
                  <span className="shop-hero-kicker">GIAO DỊCH HOÀNG GIA</span>
                  <h2 className="euro-hero-title">
                    {shopPhase === "newbie" ? "KHO KHAI QUỐC" : "CHỢ HOÀNG GIA"}
                  </h2>
                  <p className="euro-hero-subtitle">
                    {shopPhase === "newbie"
                      ? "Bắt đầu đủ mạnh • chọn dấu ấn cho vương quốc"
                      : "Quân nhu, ngoại trang và vật phẩm hồ sơ cho lãnh chúa"}
                  </p>
                </div>
              </div>
            </div>

            {/* Gem Balance Pill Overlapping Hero Bottom */}
            <div className="euro-gems-capsule 3d-capsule">
              <span className="euro-gems-label">NGỌC CỦA BẠN:</span>
              <ResourceIcon
                resource="gems"
                className="euro-red-gem-icon gem-glow"
              />
              <strong className="euro-gems-val">
                {Math.floor(resources.gems || 0).toLocaleString()}
              </strong>
            </div>
          </div>

          {(newbieOfferDate || trial?.status === "active") && (
            <div className="shop-newbie-offer-strip" role="status">
              <span className="shop-newbie-offer-mark">TÂN THỦ</span>
              <span className="shop-newbie-offer-copy">
                {trial?.status === "active" ? (
                  <>
                    Đang dùng thử <strong>{trial.skinId}</strong>. Mua vĩnh viễn
                    để giữ skin sau khi hết hạn.
                  </>
                ) : (
                  <>
                    Gói quân nhu chỉ <strong>1 ngọc</strong>; chọn duy nhất một
                    ngoại trang để dùng thử miễn phí 7 ngày.
                  </>
                )}
              </span>
              <span className="shop-newbie-offer-expiry">
                {trial?.status === "active"
                  ? `Còn ${trialRemainingLabel}`
                  : `Đến ${newbieOfferDate}`}
              </span>
            </div>
          )}

          <section
            className={`shop-phase-card shop-phase-card--${shopPhase}`}
            aria-label={
              shopPhase === "newbie"
                ? "Hành trình khai quốc"
                : "Trạng thái cửa hàng hoàng gia"
            }
          >
            <div className="shop-phase-card__copy">
              <span className="shop-phase-card__eyebrow">
                {shopPhase === "newbie"
                  ? "HÀNH TRÌNH TÂN THỦ"
                  : "CỬA HÀNG ĐỊNH KỲ"}
              </span>
              <h3>
                {shopPhase === "newbie"
                  ? "Ba bước dựng cơ đồ"
                  : "Sẵn sàng cho chiến dịch tiếp theo"}
              </h3>
              <p>
                {shopPhase === "newbie"
                  ? "Mỗi lựa chọn đều có giá trị: lấy quân nhu, thử một ngoại trang và bắt đầu xây lãnh địa."
                  : "Mua đúng thứ cần, trang bị bộ sưu tập và tích lũy lợi thế cho các trận chiến lớn hơn."}
              </p>
            </div>
            {shopPhase === "newbie" ? (
              <ol className="shop-phase-steps">
                {SHOP_PHASE_STEPS.map((step, index) => {
                  const isDone = index < newbiePhaseStep;
                  const isCurrent = index === newbiePhaseStep;
                  return (
                    <li
                      className={`${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
                      key={step.id}
                    >
                      <span className="shop-phase-step__number">
                        {isDone ? "✓" : index + 1}
                      </span>
                      <span className="shop-phase-step__label">
                        <strong>{step.shortLabel}</strong>
                        <small>{step.label}</small>
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="shop-royal-highlights" aria-label="Danh mục cửa hàng">
                <span>QUÂN NHU</span>
                <span>NGOẠI TRANG</span>
                <span>HỒ SƠ</span>
              </div>
            )}
          </section>

          {/* Independent scrollable body container */}
          <div className="shop-scrollable-content parchment-bg-scroll shop-modal-v2__content">
            <header className="shop-catalog-header">
              <div className="shop-catalog-heading">
                <span>{activeTabDetails?.sublabel || "VẬT PHẨM"}</span>
                <h3>{activeTabDetails?.label || "CỬA HÀNG"}</h3>
              </div>
              <div className="shop-catalog-summary" aria-label="Thông tin danh mục">
                <span>
                  <strong>{visibleProductCount}</strong> vật phẩm
                </span>
                <span>
                  <strong>{ownedCollectibleCount}</strong> đã sở hữu
                </span>
              </div>
            </header>
            {showingGemCatalog ? (
              <div className="euro-cards-grid">
                {enabledGemPacks.length > 0 ? (
                  enabledGemPacks.map((pack) => (
                    <div
                      className="rk-card rk-card--blue gem-pack-card"
                      key={pack.id}
                    >
                      <span className="rk-badge rk-badge--hot">GÓI GEM</span>
                      <div className="rk-card-top">
                        <div
                          className="rk-chest-slot gem-pack-icon"
                          aria-hidden="true"
                        >
                          <ResourceIcon
                            resource="gems"
                            className="shop-resource-icon"
                          />
                        </div>
                        <div className="rk-card-info">
                          <h3 className="rk-card-title">{pack.name}</h3>
                          <p className="rk-card-desc">
                            +{pack.gems.toLocaleString()} Gem
                            {pack.bonusGems > 0
                              ? ` + ${pack.bonusGems} thưởng`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="rk-btn-area">
                        <button
                          type="button"
                          className="rk-btn rk-btn--green"
                          disabled={
                            !gemPackPaymentConfigured || busyProductId !== null
                          }
                          onClick={() => handleClaimGemPack(pack.sku)}
                        >
                          <span className="rk-btn-label">
                            {busyProductId === pack.sku
                              ? "ĐANG XỬ LÝ..."
                              : gemPackPaymentConfigured
                                ? "MUA GÓI GEM"
                                : "CHỜ CẤU HÌNH THANH TOÁN"}
                          </span>
                        </button>
                        <p className="rk-limit">{pack.priceLabel}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="shop-empty-state">
                    <strong>CHƯA CÓ GÓI GEM</strong>
                    <span>Catalog Gem đang được cập nhật.</span>
                  </div>
                )}
              </div>
            ) : showingProfileCatalog && profilePacks.length > 0 ? (
              <div className="profile-shop-grid">
                {profilePacks.map((profile) => {
                  const kind = profile.profileCosmeticKind;
                  const isNameFrame = kind === "name_frame";
                  const cosmeticId = isNameFrame
                    ? profile.nameFrameId
                    : profile.avatarFrameId;
                  if (!cosmeticId) return null;
                  const isOwned = isNameFrame
                    ? inventory.ownedNameFrames.includes(cosmeticId)
                    : inventory.ownedAvatarFrames.includes(cosmeticId);
                  const isEquipped = isNameFrame
                    ? inventory.equippedNameFrameId === cosmeticId
                    : inventory.equippedAvatarFrameId === cosmeticId;

                  return (
                    <article
                      className={`profile-shop-card ${isEquipped ? "is-equipped" : ""}`}
                      key={profile.id}
                    >
                      <span className="profile-shop-badge">
                        {isNameFrame ? "KHUNG TÊN PREMIUM" : "KHUNG AVATAR PREMIUM"}
                      </span>
                      <div
                        className={`profile-shop-preview ${isNameFrame ? "is-name-frame" : "is-frame"} premium-${cosmeticId}`}
                      >
                        {isNameFrame ? (
                          <div className="premium-nameplate">
                            <img src={PROFILE_NAME_FRAME_ASSETS[cosmeticId]} alt={profile.name} />
                            <span>LÃNH CHÚA</span>
                            <strong>HEX RIVALS</strong>
                          </div>
                        ) : (
                          <>
                            <img
                              src="/assets/avatars/emperor.png"
                              alt=""
                              className="profile-shop-preview-avatar"
                            />
                            <img src={PROFILE_FRAME_ASSETS[cosmeticId]} alt={profile.name} className="profile-shop-preview-frame" />
                          </>
                        )}
                      </div>
                      <div className="profile-shop-info">
                        <h3>{profile.name}</h3>
                        <p>{profile.description}</p>
                      </div>
                      <button
                        type="button"
                        className="profile-shop-buy"
                        disabled={busyProductId !== null || (isOwned && isEquipped)}
                        onClick={() => {
                          if (isOwned) {
                            void equipProfile(kind, cosmeticId);
                          } else {
                            void buyProduct(profile.id);
                          }
                        }}
                      >
                        {isOwned ? (
                          <span>{isEquipped ? "ĐANG DÙNG" : "TRANG BỊ"}</span>
                        ) : (
                          <>
                            <ResourceIcon
                              resource="gems"
                              className="profile-shop-gem"
                            />
                            <strong>
                              {profile.priceGems.toLocaleString()}
                            </strong>
                            <span>MUA & TRANG BỊ</span>
                          </>
                        )}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : !showingSkinCatalog && orderedVisibleResourcePacks.length > 0 ? (
              <div className="euro-cards-grid">
                {orderedVisibleResourcePacks.map((pack, packIndex) => {
                  const isStarter = packIndex % 2 === 0;
                  const isFocused = pack.id === focusedResourcePackId;
                  const isBought = Boolean(
                    pack.isNewbiePrice && purchasedProductIds.includes(pack.id),
                  );
                  const isNewbiePrice = Boolean(
                    pack.isNewbiePrice && !isBought,
                  );

                  return (
                    <div
                      className={`rk-card ${isStarter ? "rk-card--blue" : "rk-card--gold"} ${isBought ? "rk-card--sold" : ""} ${isFocused ? "rk-card--focused" : ""}`}
                      key={pack.id}
                    >
                      {/* Corner ribbon badge */}
                      <span
                        className={`rk-badge ${isNewbiePrice ? "rk-badge--newbie" : isStarter ? "rk-badge--sale" : "rk-badge--hot"}`}
                      >
                        {isNewbiePrice
                          ? "TÂN THỦ · 1 NGỌC"
                          : isStarter
                            ? "SALE -30%"
                            : "HOT"}
                      </span>

                      {/* Header: chest image + title side by side */}
                      <div className="rk-card-top">
                        <button
                          type="button"
                          className="rk-chest-slot"
                          onClick={() => !isBought && setRewardModalPack(pack)}
                          disabled={isBought}
                          aria-label={
                            isBought
                              ? `${pack.name} đã mua`
                              : `Xem phần thưởng ${pack.name}`
                          }
                        >
                          <img
                            src={
                              isBought
                                ? isStarter
                                  ? "/assets/ui/shop_chest_starter_open.png"
                                  : "/assets/ui/shop_chest_royal_open.png"
                                : isStarter
                                  ? "/assets/ui/shop_chest_starter_closed.png"
                                  : "/assets/ui/shop_chest_royal_closed.png"
                            }
                            alt={pack.name}
                            className={`rk-chest-img ${isBought ? "is-opened" : ""}`}
                          />
                        </button>
                        <div className="rk-card-info">
                          <h3 className="rk-card-title">{pack.name}</h3>
                          <p className="rk-card-desc">{pack.desc}</p>
                        </div>
                      </div>

                      {/* Resource grid */}
                      <div className="rk-res-grid">
                        {pack.contents.map((item, idx) => (
                          <div key={idx} className="rk-res-cell">
                            <span className="rk-res-icon">{item.icon}</span>
                            <div className="rk-res-text">
                              <span className="rk-res-name">{item.name}</span>
                              <strong className="rk-res-amount">
                                +{item.amount.toLocaleString()}
                              </strong>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <div className="rk-btn-area">
                        {isBought ? (
                          <button
                            type="button"
                            className="rk-btn rk-btn--owned"
                            disabled
                          >
                            ✓ ĐÃ SỞ HỮU
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`rk-btn ${isStarter ? "rk-btn--green" : "rk-btn--amber"}`}
                            disabled={busyProductId !== null}
                            onClick={() => buyProduct(pack.id)}
                          >
                            <ResourceIcon
                              resource="gems"
                              className="rk-btn-gem"
                            />
                            <span className="rk-btn-price">
                              {busyProductId === pack.id
                                ? "..."
                                : pack.price.toLocaleString()}
                            </span>
                            <span className="rk-btn-label">MUA NGAY</span>
                          </button>
                        )}
                        <p className="rk-limit">
                          {pack.isNewbiePrice
                            ? "Giới hạn: 1 lần tân thủ"
                            : "Giới hạn: 3/ngày · 6/tuần"}
                        </p>
                      </div>

                      {/* Sold out overlay */}
                      {isBought && (
                        <div className="sold-out-overlay">
                          <div className="sold-out-stamp-wax">ĐÃ MUA</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : skinPacks.length > 0 ? (
              <div className="sk-grid">
                {skinPacks.map((skin) => {
                  const isEquipped =
                    inventory.equippedCapitalSkin === skin.skinId &&
                    inventory.equippedDistrictSkin === skin.skinId;
                  const isOwned = (inventory.ownedSkins || []).includes(
                    skin.skinId,
                  );
                  const isNewbieFree = Boolean(
                    skin.isNewbieFree && trial?.status === "eligible",
                  );
                  const isActiveTrial = Boolean(
                    trial?.status === "active" && trial.skinId === skin.skinId,
                  );
                  const badgeText = skin.testPrice
                    ? "GIÁ THỬ NGHIỆM"
                    : isNewbieFree
                      ? "TÂN THỦ"
                      : "NGOẠI TRANG";

                  return (
                    <div
                      className={`sk-card sk-card--${skin.variant} ${isEquipped ? "sk-card--equipped" : ""}`}
                      key={skin.id}
                    >
                      {/* Ribbon badge */}
                      <span className={`sk-badge sk-badge--${skin.variant}`}>
                        {isActiveTrial
                          ? `DÙNG THỬ · ${trialRemainingLabel}`
                          : isNewbieFree
                            ? "MIỄN PHÍ 7 NGÀY"
                            : badgeText}
                      </span>
                      {isEquipped && (
                        <span className="sk-equipped-indicator">
                          ✓ ĐANG SỬ DỤNG
                        </span>
                      )}

                      {/* Top Preview */}
                      <div
                        className={`sk-preview sk-preview--${skin.variant}`}
                        onClick={() => setPreviewSkin(skin)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setPreviewSkin(skin);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Xem trước ${skin.name}`}
                      >
                        <KingdomSkinAsset
                          skinId={skin.skinId}
                          variant={skin.variant}
                        />
                        <div className="sk-preview-vignette" />
                        <div className="sk-preview-zoom">🔍 PHÓNG TO</div>
                      </div>

                      {/* Info & Perks below */}
                      <div className="sk-info">
                        <div className="sk-rarity-row">
                          <span className="sk-rarity-tag">
                            {skinTargetLabel(skin.skinTarget)}
                          </span>
                        </div>
                        <h4
                          className="sk-title"
                          style={{ color: skin.themeColor }}
                        >
                          {skin.name}
                        </h4>
                        <p className="sk-desc">{skin.desc}</p>
                      </div>

                      {/* Bottom Button */}
                      <div className="sk-btn-wrap">
                        {isActiveTrial ? (
                          <button
                            type="button"
                            className={`sk-btn sk-btn--buy sk-btn--buy-${skin.variant}`}
                            disabled={busyProductId !== null}
                            onClick={() => buyProduct(skin.id)}
                          >
                            <ResourceIcon
                              resource="gems"
                              className="sk-btn-gem"
                            />
                            <span className="sk-btn-price">
                              {skin.price.toLocaleString()}
                            </span>
                            <span className="sk-btn-cta">MUA VĨNH VIỄN</span>
                          </button>
                        ) : isEquipped ? (
                          <button
                            type="button"
                            className="sk-btn sk-btn--equipped"
                            disabled
                          >
                            ✓ ĐANG SỬ DỤNG
                          </button>
                        ) : isOwned ? (
                          <button
                            type="button"
                            className="sk-btn sk-btn--equip"
                            disabled={busyProductId !== null}
                            onClick={() => equipSkin(skin.skinId)}
                          >
                            {busyProductId === skin.skinId
                              ? "..."
                              : "⚔ TRANG BỊ"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`sk-btn sk-btn--buy sk-btn--buy-${skin.variant}`}
                            disabled={busyProductId !== null}
                            onClick={() =>
                              isNewbieFree
                                ? setPendingTrialSkin(skin)
                                : buyProduct(skin.id)
                            }
                          >
                            {isNewbieFree ? (
                              <span className="sk-btn-free">NHẬN MIỄN PHÍ</span>
                            ) : (
                              <>
                                <ResourceIcon
                                  resource="gems"
                                  className="sk-btn-gem"
                                />
                                <span className="sk-btn-price">
                                  {busyProductId === skin.id
                                    ? "..."
                                    : skin.price.toLocaleString()}
                                </span>
                                <span className="sk-btn-cta">MUA NGAY</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="shop-empty-state">
                <img
                  src={activeTabDetails?.icon || "/assets/store/resource.png"}
                  alt=""
                  aria-hidden="true"
                />
                <strong>
                  {showingProfileCatalog
                    ? "CHƯA CÓ VẬT PHẨM HỒ SƠ"
                    : showingSkinCatalog
                      ? "CHƯA CÓ NGOẠI TRANG"
                      : "CHƯA CÓ GÓI QUÂN NHU"}
                </strong>
                <span>Danh mục này đang được cập nhật. Hãy quay lại sau.</span>
              </div>
            )}
          </div>

          {/* Footer Info Bar */}
          <footer className="euro-shop-footer shop-modal-v2__footer">
            <div className="euro-footer-info">
              <EuroInfoIcon size={18} />
              <span>
                Vật phẩm được chuyển vào kho ngay sau khi giao dịch hoàn tất.
              </span>
            </div>
            <div className="shop-footer-balance" aria-label="Số dư ngọc">
              <span>Số dư</span>
              <ResourceIcon resource="gems" />
              <strong>{Math.floor(resources.gems || 0).toLocaleString()}</strong>
            </div>
          </footer>
        </div>
      </div>

      {/* Chest Reward Celebration Modal */}
      {rewardModalPack && (
        <div
          className="chest-reward-overlay"
          onClick={() => setRewardModalPack(null)}
        >
          <div
            className="chest-reward-modal parchment-scroll-theme"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="chest-reward-close"
              onClick={() => setRewardModalPack(null)}
            >
              ×
            </button>

            <div className="chest-reward-stage">
              <div className="chest-reward-glow-aura" />
              <img
                src={
                  rewardModalPack.id.includes("royal")
                    ? "/assets/ui/shop_chest_royal_open.png"
                    : "/assets/ui/shop_chest_starter_open.png"
                }
                alt="Open Chest"
                className="chest-reward-img-open"
              />
            </div>

            <h3 className="chest-reward-title">MỞ RƯƠNG THÀNH CÔNG!</h3>
            <p className="chest-reward-sub">
              Bạn đã nhận được các vật phẩm quân nhu từ {rewardModalPack.name}:
            </p>

            <div className="chest-reward-divider" />

            <div className="chest-reward-items-grid">
              {rewardModalPack.contents.map((item: any, idx: number) => (
                <div className="chest-reward-item-card" key={idx}>
                  <div className="chest-reward-item-icon">{item.icon}</div>
                  <span className="chest-reward-item-name">{item.name}</span>
                  <strong className="chest-reward-item-val">
                    +{item.amount.toLocaleString()}
                  </strong>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="chest-reward-claim-btn btn-3d btn-3d-amber"
              onClick={() => setRewardModalPack(null)}
            >
              ✦ XÁC NHẬN NHẬN VẬT PHẨM ✦
            </button>
            <div style={{ height: 22 }} />
          </div>
        </div>
      )}

      {/* Enlarged Interactive Preview Modal */}
      {previewSkin && (
        <div
          className="skin-modal-overlay"
          onClick={() => setPreviewSkin(null)}
        >
          <div
            className="skin-modal-content parchment-scroll-theme"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="skin-modal-close"
              onClick={() => setPreviewSkin(null)}
              aria-label="Đóng"
            >
              ×
            </button>

            <div className="skin-modal-body">
              <div
                className={`skin-modal-preview-stage skin-modal-preview-stage--${previewSkin.variant} gothic-shield-frame`}
              >
                <KingdomSkinAsset
                  skinId={previewSkin.skinId}
                  variant={previewSkin.variant}
                  large
                />
                <div className="skin-modal-vignette" />
              </div>

              <div className="skin-modal-info">
                <span className="skin-rarity-tag">
                  {skinTargetLabel(previewSkin.skinTarget)}
                </span>
                <h3
                  className="skin-modal-title"
                  style={{ color: previewSkin.themeColor }}
                >
                  {previewSkin.name}
                </h3>
                <p className="skin-modal-desc">{previewSkin.desc}</p>

                <div className="skin-modal-actions">
                  {trial?.status === "active" &&
                  trial.skinId === previewSkin.skinId ? (
                    <button
                      type="button"
                      className="euro-emerald-btn btn-3d btn-3d-emerald"
                      disabled={busyProductId !== null}
                      onClick={async () => {
                        await buyProduct(previewSkin.id);
                        setPreviewSkin(null);
                      }}
                    >
                      <ResourceIcon
                        resource="gems"
                        className="euro-btn-gem-icon"
                      />
                      MUA VĨNH VIỄN · {previewSkin.price.toLocaleString()}
                    </button>
                  ) : inventory.equippedCapitalSkin === previewSkin.skinId &&
                    inventory.equippedDistrictSkin === previewSkin.skinId ? (
                    <button
                      type="button"
                      className="euro-btn-equipped btn-3d-grey"
                      disabled
                    >
                      ✓ ĐANG TRANG BỊ
                    </button>
                  ) : (inventory.ownedSkins || []).includes(
                      previewSkin.skinId,
                    ) ? (
                    <button
                      type="button"
                      className="euro-btn-equip btn-3d btn-3d-blue"
                      disabled={busyProductId !== null}
                      onClick={async () => {
                        await equipSkin(previewSkin.skinId);
                        setPreviewSkin(null);
                      }}
                    >
                      {busyProductId === previewSkin.skinId
                        ? "..."
                        : "TRANG BỊ NGAY"}
                    </button>
                  ) : previewSkin.isNewbieFree &&
                    trial?.status === "eligible" ? (
                    <button
                      type="button"
                      className="euro-emerald-btn btn-3d btn-3d-emerald"
                      disabled={busyProductId !== null}
                      onClick={() => setPendingTrialSkin(previewSkin)}
                    >
                      <span className="sk-btn-free">
                        NHẬN MIỄN PHÍ · 7 NGÀY
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="euro-emerald-btn btn-3d btn-3d-emerald"
                      disabled={busyProductId !== null}
                      onClick={async () => {
                        await buyProduct(previewSkin.id);
                        setPreviewSkin(null);
                      }}
                    >
                      <ResourceIcon
                        resource="gems"
                        className="euro-btn-gem-icon"
                      />
                      <span className="euro-btn-price">
                        {busyProductId === previewSkin.id
                          ? "..."
                          : `MUA (${previewSkin.price.toLocaleString()} NGỌC)`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {pendingTrialSkin && (
        <div
          className="skin-trial-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skin-trial-title"
        >
          <div className="skin-trial-confirm__card">
            <span className="skin-trial-confirm__eyebrow">
              ĐẶC QUYỀN TÂN THỦ
            </span>
            <h3 id="skin-trial-title">Dùng thử {pendingTrialSkin.name}?</h3>
            <KingdomSkinAsset
              skinId={pendingTrialSkin.skinId}
              variant={pendingTrialSkin.variant}
            />
            <ul>
              <li>
                Được sử dụng miễn phí trong đúng 7 ngày kể từ lúc xác nhận.
              </li>
              <li>Chỉ được chọn một bộ skin duy nhất cho tài khoản này.</li>
              <li>Không tự gia hạn và không tự động trừ ngọc.</li>
              <li>Hết hạn sẽ trở về skin hợp lệ đã dùng trước đó.</li>
            </ul>
            <div className="skin-trial-confirm__actions">
              <button type="button" onClick={() => setPendingTrialSkin(null)}>
                CHỌN LẠI
              </button>
              <button
                type="button"
                className="is-primary"
                disabled={busyProductId !== null}
                onClick={() => activateTrial(pendingTrialSkin.skinId)}
              >
                {busyProductId ? "ĐANG KÍCH HOẠT..." : "XÁC NHẬN DÙNG THỬ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MedievalModal>
  );
};
