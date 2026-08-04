import React, { useEffect, useId, useRef, useState } from "react";
import {
  createClientId,
  equipShopSkin,
  purchaseShopProduct,
} from "../game/api";
import type { ResourceBag, ShopInventory, ShopProduct } from "@island/shared";
import { MedievalModal } from "./MedievalModal";
import {
  EuroBullet,
  EuroFlourishLeft,
  EuroFlourishRight,
  EuroInfoIcon,
  EuroClockIcon,
  EuroRefreshIcon,
} from "./EuroIcons";
import { kingdomArchitectureFromSkin } from "../game/kingdomArchitecture";
import { KingdomBuildingSprite } from "./KingdomBuildingSprite";
import { AssetIcon } from "./AssetIcon";
import { RESOURCE_META, ResourceIcon } from "./ResourceDisplay";

type SkinVariant = "gold" | "fire" | "wind";

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
  inventory: ShopInventory;
  purchasedProductIds: string[];
  onResources: (resources: ResourceBag) => void;
  onInventory: (inventory: ShopInventory) => void;
  onPurchaseCompleted?: (productId: string) => void;
  onNotify: (message: string) => void;
}

const MERCHANT_QUOTES = [
  "Quân nhu đầy kho, vạn dặm viễn chinh không lo đói kém!",
  "Ngoại trang hoàng kim này chỉ thuộc về những lãnh chúa kiệt xuất nhất.",
  "Mỗi giao dịch Hoàng Gia đều được các vị thần bảo hộ chiến tranh ghi nhận.",
  "Đầu tư quân nhu là chìa khóa mở lối chiến thắng vẻ vang!",
];

type ShopTab =
  | "featured"
  | "resources"
  | "offers"
  | "skins"
  | "collection"
  | "vip";

const SHOP_TABS: Array<{
  id: ShopTab;
  label: string;
  sublabel: string;
  icon: string;
}> = [
  {
    id: "featured",
    label: "NỔI BẬT",
    sublabel: "ĐỀ XUẤT HÔM NAY",
    icon: "/assets/icons/icon_gold_crown.webp",
  },
  {
    id: "resources",
    label: "QUÂN NHU",
    sublabel: "KHO TÀI NGUYÊN",
    icon: "/assets/icons/icon_chest.webp",
  },
  {
    id: "offers",
    label: "ƯU ĐÃI",
    sublabel: "GIÁ TÂN THỦ",
    icon: "/assets/icons/icon_gold_crown.webp",
  },
  {
    id: "skins",
    label: "NGOẠI TRANG",
    sublabel: "THÀNH TRÌ",
    icon: "/assets/icons/icon_shop.webp",
  },
  {
    id: "collection",
    label: "BỘ SƯU TẬP",
    sublabel: "ĐÃ SỞ HỮU",
    icon: "/assets/icons/icon_shop.webp",
  },
  {
    id: "vip",
    label: "VIP HOÀNG GIA",
    sublabel: "NGOẠI TRANG CAO CẤP",
    icon: "/assets/icons/icon_gold_crown.webp",
  },
];

export const ShopModal: React.FC<ShopModalProps> = ({
  onClose,
  token,
  resources,
  catalog,
  inventory,
  purchasedProductIds,
  onResources,
  onInventory,
  onPurchaseCompleted,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<ShopTab>("featured");
  const [previewSkin, setPreviewSkin] = useState<any | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  const [rewardModalPack, setRewardModalPack] = useState<any | null>(null);
  const [quote, setQuote] = useState(MERCHANT_QUOTES[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MERCHANT_QUOTES.length);
    setQuote(MERCHANT_QUOTES[randomIndex]);
  }, [activeTab]);

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
      onPurchaseCompleted?.(productId);
      if (product?.skinId) {
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

  const equipSkin = async (skinId: string) => {
    if (busyProductId) return;
    setBusyProductId(skinId);
    try {
      const result = await equipShopSkin(token, skinId, "capital");
      onInventory(result.inventory);
      onNotify("Đã trang bị ngoại trang Hoàng Thành");
    } catch (error: any) {
      onNotify(error?.message || "Không thể trang bị ngoại trang");
    } finally {
      setBusyProductId(null);
    }
  };

  const defaultCatalog: ShopProduct[] = [
    {
      id: "pack_basic_all",
      type: "resource_pack",
      name: "Rương Quân Nhu Khởi Đầu",
      description: "Bổ sung đồng đều lương thực và vật liệu vào kho quốc gia.",
      priceGems: 199,
      testPrice: true,
      resources: { food: 1500, wood: 1500, stone: 1500, gold: 1200 },
    },
    {
      id: "pack_royal_all",
      type: "resource_pack",
      name: "Rương Quân Nhu Hoàng Gia",
      description: "Kho quân nhu lớn dành cho chiến dịch dài ngày.",
      priceGems: 499,
      testPrice: true,
      resources: { food: 3000, wood: 3000, stone: 3000, gold: 2400 },
    },
  ];

  const effectiveCatalog =
    catalog && catalog.length > 0 ? catalog : defaultCatalog;
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

  const skinPacks = [
    {
      id: "skin_long_bao_thanh",
      name: "Long Bảo Thành",
      price:
        effectiveCatalog.find((product) => product.id === "skin_long_bao_thanh")
          ?.priceGems ?? 1500,
      isNewbieFree: Boolean(
        effectiveCatalog.find((product) => product.id === "skin_long_bao_thanh")
          ?.isNewbieFree,
      ),
      newbieFreeExpiresAt: effectiveCatalog.find(
        (product) => product.id === "skin_long_bao_thanh",
      )?.newbieFreeExpiresAt,
      testPrice:
        effectiveCatalog.find((product) => product.id === "skin_long_bao_thanh")
          ?.testPrice ?? false,
      desc: "Thành trì rồng vàng hoàng kim tối thượng với vầng hào quang rực rỡ hộ vệ.",
      themeColor: "#d7b56b",
      variant: "gold" as SkinVariant,
      perks: [
        "Hào quang Long Vương (+5% phòng thủ)",
        "Rồng Vàng hộ thể lượn quanh thành trì",
        "Cờ phướn Hoàng Gia rực rỡ phất phơ",
      ],
    },
    {
      id: "skin_hoa_long_dien",
      name: "Hỏa Long Điện",
      price:
        effectiveCatalog.find((product) => product.id === "skin_hoa_long_dien")
          ?.priceGems ?? 2000,
      isNewbieFree: Boolean(
        effectiveCatalog.find((product) => product.id === "skin_hoa_long_dien")
          ?.isNewbieFree,
      ),
      newbieFreeExpiresAt: effectiveCatalog.find(
        (product) => product.id === "skin_hoa_long_dien",
      )?.newbieFreeExpiresAt,
      testPrice:
        effectiveCatalog.find((product) => product.id === "skin_hoa_long_dien")
          ?.testPrice ?? false,
      desc: "Điện thờ rồng lửa đỏ rực bùng cháy ngọn lửa dung nham thiêu rụi mọi đạo quân xâm lược.",
      themeColor: "#d06b50",
      variant: "fire" as SkinVariant,
      perks: [
        "Hiệu ứng khói bụi dung nham phun trào",
        "Hỏa Long tuần tra quanh lăng lũy",
        "Vết nứt Magma phát sáng trong đêm",
      ],
    },
    {
      id: "skin_phong_long_cac",
      name: "Phong Long Các",
      price:
        effectiveCatalog.find((product) => product.id === "skin_phong_long_cac")
          ?.priceGems ?? 2500,
      isNewbieFree: Boolean(
        effectiveCatalog.find((product) => product.id === "skin_phong_long_cac")
          ?.isNewbieFree,
      ),
      newbieFreeExpiresAt: effectiveCatalog.find(
        (product) => product.id === "skin_phong_long_cac",
      )?.newbieFreeExpiresAt,
      testPrice:
        effectiveCatalog.find((product) => product.id === "skin_phong_long_cac")
          ?.testPrice ?? false,
      desc: "Tòa lâu đài ngự trên đỉnh mây ngàn, hội tụ phong lôi bão tố & tinh thể linh thiêng.",
      themeColor: "#73aeb8",
      variant: "wind" as SkinVariant,
      perks: [
        "Vòng xoáy Phong Lôi cuồn cuộn bao bọc",
        "Tinh thể lơ lửng tỏa cực quang huyền ảo",
        "Mây bão bồng bềnh vương quanh chân tháp",
      ],
    },
  ];

  const liveOfferResourcePacks = resourcePacks.filter(
    (pack) => pack.isNewbiePrice,
  );
  const visibleResourcePacks =
    activeTab === "offers" && liveOfferResourcePacks.length > 0
      ? liveOfferResourcePacks
      : resourcePacks;
  const visibleSkinPacks =
    activeTab === "collection"
      ? skinPacks.filter(
          (skin) =>
            inventory.equippedCapitalSkin === skin.id ||
            (inventory.ownedSkins || []).includes(skin.id),
        )
      : skinPacks;
  const showingSkinCatalog =
    activeTab === "skins" || activeTab === "collection" || activeTab === "vip";

  const handleBuy = async (productId: string) => {
    setBusyProductId(productId);
    try {
      await buyProduct(productId);
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
      className="shop-modal-v2"
    >
      <div className="euro-shop-modal-body euro-shop-split-layout medieval-wood-panel shop-modal-v2__body">
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
            {SHOP_TABS.map((tab) => (
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
                  <h2 className="euro-hero-title">CỬA HÀNG</h2>
                  <p className="euro-hero-subtitle">
                    Mở rương quân nhu • trang bị ngoại trang thành trì
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

          {newbieOfferDate && (
            <div className="shop-newbie-offer-strip" role="status">
              <span className="shop-newbie-offer-mark">TÂN THỦ</span>
              <span className="shop-newbie-offer-copy">
                Gói quân nhu chỉ <strong>1 ngọc</strong>; chọn một ngoại trang
                để dùng thử miễn phí.
              </span>
              <span className="shop-newbie-offer-expiry">
                Đến {newbieOfferDate}
              </span>
            </div>
          )}

          {/* Independent scrollable body container */}
          <div className="shop-scrollable-content parchment-bg-scroll shop-modal-v2__content">
            {!showingSkinCatalog ? (
              <div className="euro-cards-grid">
                {visibleResourcePacks.map((pack, packIndex) => {
                  const isStarter = packIndex % 2 === 0;
                  const isBought = purchasedProductIds.includes(pack.id);
                  const isNewbiePrice = Boolean(
                    pack.isNewbiePrice && !isBought,
                  );

                  return (
                    <div
                      className={`rk-card ${isStarter ? "rk-card--blue" : "rk-card--gold"} ${isBought ? "rk-card--sold" : ""}`}
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
                        <p className="rk-limit">Giới hạn: 1 lần</p>
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
            ) : visibleSkinPacks.length > 0 ? (
              <div className="sk-grid">
                {visibleSkinPacks.map((skin) => {
                  const isEquipped = inventory.equippedCapitalSkin === skin.id;
                  const isOwned = (inventory.ownedSkins || []).includes(
                    skin.id,
                  );
                  const isNewbieFree = Boolean(
                    skin.isNewbieFree && !inventory.newbieSkinClaimedAt,
                  );
                  const isLegendary = skin.variant === "gold";
                  const isMythic = skin.variant === "fire";
                  const badgeText = isLegendary
                    ? "GIỚI HẠN"
                    : isMythic
                      ? "SALE -15%"
                      : "MỚI";

                  return (
                    <div
                      className={`sk-card sk-card--${skin.variant} ${isEquipped ? "sk-card--equipped" : ""}`}
                      key={skin.id}
                    >
                      {/* Ribbon badge */}
                      <span className={`sk-badge sk-badge--${skin.variant}`}>
                        {isNewbieFree ? "TẶNG TÂN THỦ" : badgeText}
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
                          skinId={skin.id}
                          variant={skin.variant}
                        />
                        <div className="sk-preview-vignette" />
                        <div className="sk-preview-zoom">🔍 PHÓNG TO</div>
                      </div>

                      {/* Info & Perks below */}
                      <div className="sk-info">
                        <div className="sk-rarity-row">
                          <span className="sk-rarity-tag">
                            {isLegendary ? "TRUYỀN THUYẾT" : "HUYỀN THOẠI"}
                          </span>
                        </div>
                        <h4
                          className="sk-title"
                          style={{ color: skin.themeColor }}
                        >
                          {skin.name}
                        </h4>
                        <p className="sk-desc">{skin.desc}</p>

                        <ul className="sk-perks">
                          {skin.perks.map((perk, pIdx) => (
                            <li key={pIdx}>
                              <EuroBullet color={skin.themeColor} />
                              <span>{perk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Bottom Button */}
                      <div className="sk-btn-wrap">
                        {isEquipped ? (
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
                            onClick={() => equipSkin(skin.id)}
                          >
                            {busyProductId === skin.id ? "..." : "⚔ TRANG BỊ"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`sk-btn sk-btn--buy sk-btn--buy-${skin.variant}`}
                            disabled={busyProductId !== null}
                            onClick={() => buyProduct(skin.id)}
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
                  src="/assets/icons/icon_shop.webp"
                  alt=""
                  aria-hidden="true"
                />
                <strong>CHƯA CÓ NGOẠI TRANG</strong>
                <span>Hãy mua một ngoại trang để mở bộ sưu tập của bạn.</span>
              </div>
            )}
          </div>

          {/* Footer Info Bar */}
          <footer className="euro-shop-footer shop-modal-v2__footer">
            <div className="euro-footer-info">
              <EuroInfoIcon size={18} />
              <span>
                Các vật phẩm mua trong Cửa Hàng Hoàng Gia sẽ được gửi vào kho
                quốc gia của bạn.
              </span>
            </div>
            <div className="euro-footer-refresh">
              <EuroClockIcon size={18} />
              <span>
                Làm mới sau: <strong>11:42:33</strong>
              </span>
              <button
                type="button"
                className="euro-refresh-btn"
                title="Làm mới cửa hàng"
              >
                <EuroRefreshIcon size={16} />
              </button>
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
                  skinId={previewSkin.id}
                  variant={previewSkin.variant}
                  large
                />
                <div className="skin-modal-vignette" />
              </div>

              <div className="skin-modal-info">
                <span className="skin-rarity-tag">NGOẠI TRANG HOÀNG GIA</span>
                <h3
                  className="skin-modal-title"
                  style={{ color: previewSkin.themeColor }}
                >
                  {previewSkin.name}
                </h3>
                <p className="skin-modal-desc">{previewSkin.desc}</p>

                <div className="skin-modal-perks-heading">
                  ĐẶC QUYỀN & HIỆU ỨNG THÀNH TRÌ:
                </div>
                <ul className="skin-perks-list skin-modal-perks-list">
                  {previewSkin.perks.map((perk: string, idx: number) => (
                    <li key={idx}>
                      <EuroBullet color={previewSkin.themeColor} />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                <div className="skin-modal-actions">
                  {inventory.equippedCapitalSkin === previewSkin.id ? (
                    <button
                      type="button"
                      className="euro-btn-equipped btn-3d-grey"
                      disabled
                    >
                      ✓ ĐANG TRANG BỊ
                    </button>
                  ) : (inventory.ownedSkins || []).includes(previewSkin.id) ? (
                    <button
                      type="button"
                      className="euro-btn-equip btn-3d btn-3d-blue"
                      disabled={busyProductId !== null}
                      onClick={async () => {
                        await equipSkin(previewSkin.id);
                        setPreviewSkin(null);
                      }}
                    >
                      {busyProductId === previewSkin.id
                        ? "..."
                        : "TRANG BỊ NGAY"}
                    </button>
                  ) : previewSkin.isNewbieFree &&
                    !inventory.newbieSkinClaimedAt ? (
                    <button
                      type="button"
                      className="euro-emerald-btn btn-3d btn-3d-emerald"
                      disabled={busyProductId !== null}
                      onClick={async () => {
                        await buyProduct(previewSkin.id);
                        setPreviewSkin(null);
                      }}
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
    </MedievalModal>
  );
};
