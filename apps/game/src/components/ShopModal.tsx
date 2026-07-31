import React, { useEffect, useId, useRef, useState } from "react";
import { getGameConfig } from "../game/api";
import { GameConfig } from "@island/shared";

type SkinVariant = "gold" | "fire" | "wind";

function CastleSkinArt({ variant }: { variant: SkinVariant }) {
  const uid = useId().replace(/:/g, "");
  const wallId = `skin-wall-${variant}-${uid}`;
  const roofId = `skin-roof-${variant}-${uid}`;
  const auraId = `skin-aura-${variant}-${uid}`;
  const glowId = `skin-glow-${variant}-${uid}`;
  const palettes = {
    gold: {
      wallA: "#5d4824", wallB: "#c99c42", roofA: "#7b3d12", roofB: "#ffd76a",
      auraA: "#fff4a8", auraB: "#d89616",
    },
    fire: {
      wallA: "#161419", wallB: "#51414a", roofA: "#5f100d", roofB: "#f04a1d",
      auraA: "#ffb02e", auraB: "#9f1610",
    },
    wind: {
      wallA: "#35535c", wallB: "#b4d1cf", roofA: "#075b70", roofB: "#3dd9e8",
      auraA: "#b9fbff", auraB: "#158ca4",
    },
  } as const;
  const palette = palettes[variant];

  return (
    <svg viewBox="0 0 320 260" className={`castle-skin-art castle-skin-art--${variant}`} aria-hidden="true">
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
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <ellipse className="skin-aura-pulse" cx="160" cy="190" rx="135" ry="83" fill={`url(#${auraId})`} />
      <ellipse cx="160" cy="226" rx="119" ry="22" fill="rgba(0,0,0,.58)" />

      {variant === "gold" && (
        <>
          <g className="skin-orbit-runes" fill="none" stroke="#ffd867">
            <ellipse cx="160" cy="200" rx="124" ry="28" strokeWidth="2" strokeDasharray="9 8" />
            <path d="M45 198l9-8 9 8-9 8zm202 0l9-8 9 8-9 8zM151 224l9-8 9 8-9 8z" fill="#ffd867" />
          </g>
          <g className="skin-castle-body">
            <path d="M42 205l118 27 118-27-118-31z" fill="#47361e" stroke="#e9bc55" strokeWidth="2" />
            <path d="M54 147l106 24 106-24v61l-106 24-106-24z" fill={`url(#${wallId})`} stroke="#f2c55e" strokeWidth="2" />
            <path d="M54 147l106 24 106-24-106-27z" fill="#d1a44c" />
            <path d="M73 102h42v108H73zM205 102h42v108h-42z" fill={`url(#${wallId})`} stroke="#f3c85f" strokeWidth="2" />
            <path d="M65 104l29-45 29 45zm132 0l29-45 29 45z" fill={`url(#${roofId})`} stroke="#ffe58a" strokeWidth="2" />
            <path d="M119 119h82v99h-82z" fill={`url(#${wallId})`} stroke="#f3c85f" strokeWidth="2" />
            <path d="M108 121l52-61 52 61z" fill={`url(#${roofId})`} stroke="#ffe58a" strokeWidth="2" />
            <path d="M137 79h46v42h-46z" fill="#8d641f" stroke="#ffd867" strokeWidth="2" />
            <path d="M128 80l32-35 32 35z" fill={`url(#${roofId})`} stroke="#fff0a5" strokeWidth="2" />
            <path d="M143 218v-33c0-24 34-24 34 0v33z" fill="#24170f" stroke="#eebd54" strokeWidth="2" />
            <g className="skin-lit-windows" fill="#fff1a1" filter={`url(#${glowId})`}>
              <rect x="86" y="125" width="13" height="22" rx="6" /><rect x="221" y="125" width="13" height="22" rx="6" />
              <rect x="146" y="139" width="12" height="23" rx="6" /><rect x="166" y="139" width="12" height="23" rx="6" />
            </g>
            <path className="skin-banner" d="M159 45V18m2 2l31 8-31 11z" stroke="#ffe98e" strokeWidth="3" fill="#b4232f" />
            <path d="M148 96l12-9 12 9-4 16h-16z" fill="#f8d66e" stroke="#fff2ae" strokeWidth="2" />
          </g>
          <g className="skin-guardian skin-guardian--gold" fill="#ffd867" filter={`url(#${glowId})`}>
            <path className="skin-dragon-wing skin-dragon-wing--left" d="M43 67c-22-15-30-3-34 10 17-8 30 4 43 14z" />
            <path className="skin-dragon-wing skin-dragon-wing--right" d="M69 67c22-15 30-3 34 10-17-8-30 4-43 14z" />
            <path d="M48 66c7-13 17-13 24 0l-5 24-9 12-8-13z" />
            <circle cx="60" cy="57" r="8" /><path d="M64 51l11-7-5 12zM55 50l-8-8 2 13z" />
          </g>
          {[44, 76, 111, 214, 248, 276].map((x, index) => (
            <circle key={x} className="skin-particle skin-particle--gold" cx={x} cy={190 - (index % 3) * 35} r={index % 2 ? 3 : 2} style={{ animationDelay: `${index * -0.45}s` }} />
          ))}
        </>
      )}

      {variant === "fire" && (
        <>
          <g className="skin-castle-body">
            <path d="M38 207l122 27 122-27-122-35z" fill="#170f11" stroke="#9f2819" strokeWidth="2" />
            <path d="M51 147l109 26 109-26v62l-109 25-109-25z" fill={`url(#${wallId})`} stroke="#9d2b1d" strokeWidth="2" />
            <path d="M66 96h46v116H66zM208 96h46v116h-46z" fill={`url(#${wallId})`} stroke="#c83a22" strokeWidth="2" />
            <path d="M59 98l30-55 30 55zm142 0l30-55 30 55z" fill={`url(#${roofId})`} />
            <path d="M112 122h96v101h-96z" fill="#211b20" stroke="#d33d23" strokeWidth="2" />
            <path d="M102 124l58-69 58 69z" fill={`url(#${roofId})`} />
            <path d="M137 92h46v35h-46z" fill="#35191b" stroke="#df4928" strokeWidth="2" />
            <path d="M128 94l32-51 32 51z" fill="#8e1e14" />
            <path d="M141 222v-34c0-26 38-26 38 0v34z" fill="#090708" stroke="#f15a26" strokeWidth="2" />
            <g className="skin-lava-cracks" fill="none" stroke="#ff6b26" strokeWidth="3" filter={`url(#${glowId})`}>
              <path d="M67 160l18 12-9 14 20 17M237 151l-17 17 10 12-18 20M136 143l14 16-7 17m40-35l-14 18 8 15" />
            </g>
            <g className="skin-lit-windows" fill="#ffad37" filter={`url(#${glowId})`}>
              <rect x="82" y="120" width="13" height="25" rx="6" /><rect x="225" y="120" width="13" height="25" rx="6" />
              <rect x="144" y="138" width="12" height="25" rx="6" /><rect x="166" y="138" width="12" height="25" rx="6" />
            </g>
            <path className="skin-banner" d="M159 43V16m2 2l31 8-31 12z" stroke="#ff9a3c" strokeWidth="3" fill="#6f0c0c" />
          </g>
          <g className="skin-flames" fill="#ff6a21" filter={`url(#${glowId})`}>
            <path className="skin-flame skin-flame--one" d="M69 100c-9-16 5-22 1-37 18 17 22 28 12 42z" />
            <path className="skin-flame skin-flame--two" d="M226 99c-9-17 8-24 3-39 18 18 20 30 10 44z" />
            <path className="skin-flame skin-flame--three" d="M151 95c-8-18 7-26 4-44 19 20 20 34 9 48z" />
          </g>
          <g className="skin-smoke" fill="#66545b">
            <circle cx="72" cy="53" r="12" /><circle cx="81" cy="40" r="9" /><circle cx="228" cy="48" r="13" /><circle cx="238" cy="33" r="8" />
          </g>
          {[43, 69, 101, 215, 247, 280].map((x, index) => (
            <circle key={x} className="skin-particle skin-particle--fire" cx={x} cy={205 - (index % 3) * 28} r={index % 2 ? 3 : 2} style={{ animationDelay: `${index * -0.38}s` }} />
          ))}
        </>
      )}

      {variant === "wind" && (
        <>
          <g className="skin-wind-rings" fill="none" stroke="#69f4ff">
            <ellipse cx="160" cy="184" rx="130" ry="34" strokeWidth="3" strokeDasharray="34 16" />
            <ellipse cx="160" cy="164" rx="105" ry="25" strokeWidth="2" strokeDasharray="17 12" opacity=".7" />
          </g>
          <g className="skin-clouds" fill="#d8fbff">
            <path d="M28 199c9-18 28-14 33-2 13-13 35-3 34 12H28zM224 194c8-16 26-13 31-2 13-11 33-2 32 12h-63z" />
          </g>
          <g className="skin-castle-body">
            <path d="M53 207l107 26 107-26-107-29z" fill="#244850" stroke="#7ceef4" strokeWidth="2" />
            <path d="M67 148l93 23 93-23v61l-93 24-93-24z" fill={`url(#${wallId})`} stroke="#86edf1" strokeWidth="2" />
            <path d="M80 106h40v105H80zM200 106h40v105h-40z" fill={`url(#${wallId})`} stroke="#8ff4f5" strokeWidth="2" />
            <path d="M72 108l28-46 28 46zm120 0l28-46 28 46z" fill={`url(#${roofId})`} stroke="#a6fbff" strokeWidth="2" />
            <path d="M119 119h82v103h-82z" fill={`url(#${wallId})`} stroke="#91f0f1" strokeWidth="2" />
            <path d="M108 121l52-64 52 64z" fill={`url(#${roofId})`} stroke="#b7fdff" strokeWidth="2" />
            <path d="M140 83h40v39h-40z" fill="#2c727d" stroke="#8ef5f6" strokeWidth="2" />
            <path d="M131 85l29-42 29 42z" fill="#0d8498" stroke="#abfbff" strokeWidth="2" />
            <path d="M143 222v-33c0-24 34-24 34 0v33z" fill="#102f36" stroke="#83e7e9" strokeWidth="2" />
            <g className="skin-lit-windows" fill="#b8ffff" filter={`url(#${glowId})`}>
              <rect x="94" y="130" width="12" height="22" rx="6" /><rect x="214" y="130" width="12" height="22" rx="6" />
              <rect x="145" y="143" width="11" height="23" rx="6" /><rect x="165" y="143" width="11" height="23" rx="6" />
            </g>
            <path className="skin-banner" d="M159 43V17m2 2l30 8-30 11z" stroke="#c6ffff" strokeWidth="3" fill="#147f91" />
          </g>
          <g className="skin-crystal" filter={`url(#${glowId})`}>
            <path d="M160 24l10 18-10 17-10-17z" fill="#baffff" stroke="#54e5f2" strokeWidth="2" />
          </g>
          {[39, 70, 109, 212, 250, 282].map((x, index) => (
            <circle key={x} className="skin-particle skin-particle--wind" cx={x} cy={202 - (index % 3) * 31} r={index % 2 ? 3 : 2} style={{ animationDelay: `${index * -0.5}s` }} />
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
    <div className={`premium-castle-preview premium-castle-preview--${variant} ${large ? "is-large" : ""}`}>
      <div className="premium-castle-aura" />
      <canvas ref={canvasRef} width={320} height={320} aria-label={`Xem trước skin ${skinId}`} />
      <div className="premium-castle-fx" aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </div>
      {variant === "gold" && <div className="premium-gold-runes" aria-hidden="true" />}
      {variant === "fire" && <><div className="premium-fire-flame flame-left" /><div className="premium-fire-flame flame-right" /></>}
      {variant === "wind" && <><div className="premium-wind-ring ring-one" /><div className="premium-wind-ring ring-two" /></>}
    </div>
  );
}

// ─── 3D VECTOR RESOURCE SVGS (No Emojis) ──────────────────────────────────

const ResFoodIcon = () => (
  <svg viewBox="0 0 64 64" width="20" height="20">
    <path d="M32 6v52M32 16q10-8 20 0M32 30q10-8 20 0M32 44q10-8 20 0M32 16q-10-8-20 0M32 30q-10-8-20 0M32 44q-10-8-20 0" stroke="#facc15" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const ResWoodIcon = () => (
  <svg viewBox="0 0 64 64" width="20" height="20">
    <path d="M12 16h40M8 32h48M14 48h36" stroke="#ca8a04" strokeWidth="5.5" strokeLinecap="round" fill="none" />
    <circle cx="12" cy="16" r="3" fill="#854d0e" />
    <circle cx="52" cy="16" r="3" fill="#854d0e" />
    <circle cx="8" cy="32" r="3" fill="#854d0e" />
    <circle cx="56" cy="32" r="3" fill="#854d0e" />
  </svg>
);

const ResStoneIcon = () => (
  <svg viewBox="0 0 64 64" width="20" height="20">
    <polygon points="32,8 54,22 54,48 32,58 10,48 10,22" fill="#94a3b8" stroke="#475569" strokeWidth="3" />
    <polygon points="32,8 32,58 10,48" fill="#cbd5e1" />
    <polygon points="32,8 54,22 32,58" fill="#64748b" opacity="0.6" />
  </svg>
);

const ResIronIcon = () => (
  <svg viewBox="0 0 64 64" width="20" height="20">
    <polygon points="8,26 32,8 56,26 56,48 8,48" fill="#e2e8f0" stroke="#475569" strokeWidth="2.5" />
    <polygon points="8,26 32,26 32,48 8,48" fill="#94a3b8" />
    <polygon points="32,8 56,26 32,26" fill="#ffffff" opacity="0.75" />
  </svg>
);

const ResGoldIcon = () => (
  <svg viewBox="0 0 64 64" width="20" height="20">
    <circle cx="24" cy="40" r="16" fill="#eab308" stroke="#ca8a04" strokeWidth="2.5" />
    <circle cx="24" cy="40" r="10" fill="#facc15" />
    <circle cx="40" cy="24" r="16" fill="#facc15" stroke="#eab308" strokeWidth="2.5" />
    <circle cx="40" cy="24" r="10" fill="#fef08a" />
    <text x="36" y="29" fill="#ca8a04" fontSize="15" fontWeight="900" fontFamily="sans-serif">$</text>
  </svg>
);

// ─── MAIN MODAL INTERACTION ───────────────────────────────────────────────

interface ShopModalProps {
  onClose: () => void;
  resources: { gems: number; gold: number };
  getSkinSprite?: (skinId: string) => HTMLCanvasElement | undefined;
}

export const ShopModal: React.FC<ShopModalProps> = ({ onClose, resources, getSkinSprite }) => {
  const [activeTab, setActiveTab] = useState<"resources" | "skins">("resources");
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewSkin, setPreviewSkin] = useState<any | null>(null);

  useEffect(() => {
    getGameConfig()
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  const resPackAmount = config?.shopResourcePackAmount ?? 50000;
  const resPackPrice = config?.shopResourcePackPriceGems ?? 100;

  // Resource Packs now contain ALL 5 resources in a single bundle
  const resourcePacks = [
    {
      id: "pack_basic_all",
      name: "Rương Tài Nguyên Khởi Đầu",
      desc: "Gói tổng hợp cung cấp đầy đủ các loại quân nhu thiết yếu để kiến thiết quốc gia giai đoạn đầu.",
      price: resPackPrice,
      badge: "Phổ Biến",
      color: "#f59e0b",
      contents: [
        { name: "Lúa mì", amount: resPackAmount, icon: <ResFoodIcon /> },
        { name: "Gỗ sồi", amount: resPackAmount, icon: <ResWoodIcon /> },
        { name: "Đá tảng", amount: resPackAmount, icon: <ResStoneIcon /> },
        { name: "Sắt đúc", amount: resPackAmount, icon: <ResIronIcon /> },
        { name: "Vàng ròng", amount: Math.floor(resPackAmount * 0.8), icon: <ResGoldIcon /> }
      ]
    },
    {
      id: "pack_royal_all",
      name: "Rương Tài Nguyên Hoàng Gia",
      desc: "Đại lượng lương thực và khoáng sản khổng lồ từ kho bạc hoàng gia phục vụ chiến tranh quy mô lớn.",
      price: Math.floor(resPackPrice * 2.5),
      badge: "Kinh Tế nhất",
      color: "#ffd700",
      contents: [
        { name: "Lúa mì", amount: resPackAmount * 3, icon: <ResFoodIcon /> },
        { name: "Gỗ sồi", amount: resPackAmount * 3, icon: <ResWoodIcon /> },
        { name: "Đá tảng", amount: resPackAmount * 3, icon: <ResStoneIcon /> },
        { name: "Sắt đúc", amount: resPackAmount * 3, icon: <ResIronIcon /> },
        { name: "Vàng ròng", amount: Math.floor(resPackAmount * 3 * 0.8), icon: <ResGoldIcon /> }
      ]
    }
  ];

  const skinPacks = [
    {
      id: "skin_long_bao_thanh",
      name: "Long Bảo Thành",
      price: config?.shopSkinLongBaoThanhPrice ?? 1500,
      desc: "Thành trì rồng vàng hoàng kim tối thượng với vầng hào quang rực rỡ hộ vệ.",
      themeColor: "#ffd700",
      variant: "gold" as SkinVariant,
      perks: ["Hào quang Long Vương hộ thể (+5% phòng thủ)", "Hiệu ứng rồng bay quanh thành trên bản đồ", "Cờ phướn hoàng gia phất phơ"]
    },
    {
      id: "skin_hoa_long_dien",
      name: "Hỏa Long Điện",
      price: config?.shopSkinHoaLongDienPrice ?? 2000,
      desc: "Điện thờ rồng lửa đỏ rực bùng cháy ngọn lửa dung nham thiêu rụi mọi đạo quân xâm lược.",
      themeColor: "#ff4500",
      variant: "fire" as SkinVariant,
      perks: ["Hiệu ứng khói bụi dung nham xung quanh", "Hỏa long hộ vệ tuần tra quanh lăng lũy", "Vết nứt magma rực sáng trong đêm"]
    },
    {
      id: "skin_phong_long_cac",
      name: "Phong Long Các",
      price: config?.shopSkinPhongLongCacPrice ?? 1800,
      desc: "Lầu gác rồng phong lôi thanh tao, phiêu dật giữa những luồng lốc xoáy lấp lánh.",
      themeColor: "#00ffff",
      variant: "wind" as SkinVariant,
      perks: ["Vòng tròn gió lốc mờ ảo bao phủ tháp", "Phong long bay dạo thảnh thơi giữa mây gió", "Pha lê đỉnh spire phát sáng xanh thanh tao"]
    }
  ];

  return (
    <div className="modal-overlay shop-modal-overlay">
      <div className="modal-container shop-modal-container">
        <button onClick={onClose} className="shop-close-btn">×</button>
        
        <header className="shop-header">
          <h2 className="shop-title">🏛️ CỬA HÀNG HOÀNG GIA</h2>
          <p className="shop-subtitle">Mua sắm các gói tài nguyên tổng hợp quân nhu và skin ngoại trang thành trì độc quyền</p>
          <div className="shop-gems-balance">
            <span>Ngọc của bạn:</span>
            <strong className="gems-val">💎 {resources.gems}</strong>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="shop-tabs">
          <button 
            type="button" 
            className={`shop-tab-btn ${activeTab === "resources" ? "active" : ""}`}
            onClick={() => setActiveTab("resources")}
          >
            📦 GÓI TÀI NGUYÊN TỔNG HỢP
          </button>
          <button 
            type="button" 
            className={`shop-tab-btn ${activeTab === "skins" ? "active" : ""}`}
            onClick={() => setActiveTab("skins")}
          >
            🏰 SKIN THÀNH TRÌ RỒNG
          </button>
        </nav>

        {loading ? (
          <div className="shop-loading">Đang tải cấu hình cửa hàng...</div>
        ) : (
          <div className="shop-content-scroll">
            {activeTab === "resources" ? (
              <div className="shop-resources-grid">
                {resourcePacks.map((pack) => (
                  <div className="shop-pack-card" key={pack.id} style={{ borderLeft: `4px solid ${pack.color}` }}>
                    <div className="pack-details">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h4 className="pack-name">{pack.name}</h4>
                        <span className="coming-soon-badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: pack.color, borderColor: pack.color }}>{pack.badge}</span>
                      </div>
                      <p className="pack-desc">{pack.desc}</p>
                      
                      {/* Unified Resource Contents Display */}
                      <div className="pack-contents-row" style={{ display: "flex", gap: 12, marginTop: 10, background: "rgba(0,0,0,0.2)", padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)" }}>
                        {pack.contents.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                            {item.icon}
                            <span>{item.name}: <strong>+{item.amount.toLocaleString()}</strong></span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pack-buy-action" style={{ alignSelf: "center" }}>
                      <div className="pack-price">💎 {pack.price}</div>
                      <button type="button" className="shop-buy-btn disabled" disabled>
                        COMING SOON
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="shop-skins-grid">
                {skinPacks.map((skin) => (
                  <div className={`shop-skin-card shop-skin-card--${skin.variant}`} key={skin.id} style={{ borderColor: skin.themeColor }}>
                    <div className="skin-card-header">
                      <div>
                        <span className="skin-rarity">HUYỀN THOẠI</span>
                        <h4 className="skin-name" style={{ color: skin.themeColor }}>{skin.name}</h4>
                      </div>
                      <span className="coming-soon-badge">SẮP RA MẮT</span>
                    </div>
                    
                    <div className={`skin-visual-box skin-visual-box--${skin.variant}`}>
                      <PremiumCastleCanvas skinId={skin.id} variant={skin.variant} getSkinSprite={getSkinSprite} />
                      <div className="skin-visual-vignette" />
                    </div>

                    <p className="skin-desc" style={{ minHeight: 46 }}>{skin.desc}</p>
                    
                    <div className="skin-buy-row">
                      <div className="skin-price">
                        <span>Giá:</span>
                        <strong>💎 {skin.price.toLocaleString()}</strong>
                      </div>
                      <button 
                        type="button" 
                        className="shop-buy-btn" 
                        style={{ background: `linear-gradient(180deg, ${skin.themeColor} 0%, #1e293b 100%)`, border: "1px solid " + skin.themeColor, color: "#fff", cursor: "pointer" }}
                        onClick={() => setPreviewSkin(skin)}
                      >
                        XEM TRƯỚC
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── INTERACTIVE 3D SA BAN PREVIEW OVERLAY ────────────────────────── */}
        {previewSkin && (
          <div className="shop-preview-overlay">
            <div className="shop-preview-container" style={{ border: `2px solid ${previewSkin.themeColor}`, boxShadow: `0 16px 60px rgba(0,0,0,0.95), 0 0 20px ${previewSkin.themeColor}40` }}>
              <button className="preview-close-btn" onClick={() => setPreviewSkin(null)}>×</button>
              
              <div className="preview-layout">
                {/* Left Side Info */}
                <div className="preview-info-panel">
                  <span className="preview-label" style={{ color: previewSkin.themeColor, borderColor: previewSkin.themeColor }}>Ngoại trang Huyền Thoại</span>
                  <h3 className="preview-skin-name" style={{ color: previewSkin.themeColor }}>{previewSkin.name}</h3>
                  <p className="preview-skin-desc">{previewSkin.desc}</p>
                  
                  <div className="preview-perks">
                    <h5 style={{ color: "#fff", margin: "12px 0 6px 0", fontSize: 13 }}>ĐẶC TÍNH SKIN:</h5>
                    <ul>
                      {previewSkin.perks.map((perk: string, idx: number) => (
                        <li key={idx}>✨ {perk}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="preview-buy-box" style={{ marginTop: 24, borderTop: "1.5px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Giá ngọc cấu hình:</span>
                      <strong style={{ color: "#38bdf8", fontSize: 18 }}>💎 {previewSkin.price.toLocaleString()}</strong>
                    </div>
                    <button className="shop-buy-btn disabled" disabled style={{ width: "100%", padding: 12, fontSize: 13 }}>
                      SẮP RA MẮT (COMING SOON)
                    </button>
                  </div>
                </div>

                {/* Right Side animated skin showcase */}
                <div className="preview-sandbox-panel">
                  <div className={`skin-preview-stage skin-preview-stage--${previewSkin.variant}`}>
                    <div className="skin-preview-sky-lines" />
                    <PremiumCastleCanvas
                      skinId={previewSkin.id}
                      variant={previewSkin.variant}
                      getSkinSprite={getSkinSprite}
                      large
                    />
                    <div className="skin-preview-ground" />
                    <div className="sandbox-watermark">MÔ PHỎNG NGOẠI TRANG TRÊN BẢN ĐỒ</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
