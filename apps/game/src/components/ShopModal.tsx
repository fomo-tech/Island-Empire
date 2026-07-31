import React, { useEffect, useState } from "react";
import { getGameConfig } from "../game/api";
import { GameConfig } from "@island/shared";

// ─── 3D CASTLE SVG SCHEMES (Premium Game Assets) ──────────────────────────

const GoldenCastleSVG = () => (
  <svg viewBox="0 0 100 100" className="castle-svg">
    <defs>
      <linearGradient id="goldCastGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="40" fill="url(#goldCastGrad)" opacity="0.15" filter="blur(4px)" />
    <rect x="25" y="55" width="50" height="25" fill="url(#goldCastGrad)" rx="2" />
    <rect x="28" y="47" width="8" height="12" fill="url(#goldCastGrad)" />
    <rect x="42" y="47" width="8" height="12" fill="url(#goldCastGrad)" />
    <rect x="56" y="47" width="8" height="12" fill="url(#goldCastGrad)" />
    <rect x="70" y="47" width="8" height="12" fill="url(#goldCastGrad)" />
    <rect x="18" y="40" width="12" height="42" fill="url(#goldCastGrad)" rx="1" />
    <polygon points="15,40 24,20 33,40" fill="#d97706" />
    <rect x="22" y="48" width="4" height="8" fill="#78350f" rx="1" />
    <rect x="70" y="40" width="12" height="42" fill="url(#goldCastGrad)" rx="1" />
    <polygon points="67,40 76,20 85,40" fill="#d97706" />
    <rect x="74" y="48" width="4" height="8" fill="#78350f" rx="1" />
    <path d="M 38,55 C 38,35 62,35 62,55 Z" fill="#d97706" />
    <path d="M 44,80 C 44,70 56,70 56,80 Z" fill="#451a03" />
    <line x1="24" y1="20" x2="24" y2="12" stroke="#b45309" strokeWidth="1" />
    <polygon points="24,12 34,15 24,18" fill="#ef4444" />
    <line x1="76" y1="20" x2="76" y2="12" stroke="#b45309" strokeWidth="1" />
    <polygon points="76,12 86,15 76,18" fill="#ef4444" />
  </svg>
);

const FireCastleSVG = () => (
  <svg viewBox="0 0 100 100" className="castle-svg">
    <defs>
      <linearGradient id="fireCastGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="60%" stopColor="#b91c1c" />
        <stop offset="100%" stopColor="#450a0a" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="40" fill="url(#fireCastGrad)" opacity="0.2" filter="blur(6px)" />
    <rect x="25" y="58" width="50" height="22" fill="#1c1917" rx="1" stroke="#dc2626" strokeWidth="1" />
    <path d="M 16,80 L 22,35 L 28,80 Z" fill="url(#fireCastGrad)" />
    <polygon points="22,35 22,20 18,30" fill="#f87171" />
    <path d="M 72,80 L 78,35 L 84,80 Z" fill="url(#fireCastGrad)" />
    <polygon points="78,35 78,20 82,30" fill="#f87171" />
    <circle cx="50" cy="52" r="14" fill="#f97316" stroke="#b91c1c" strokeWidth="2" />
    <polygon points="50,30 44,48 56,48" fill="#ef4444" />
    <path d="M 32,70 L 38,74 L 42,68 M 68,70 L 62,74 L 58,68" stroke="#f97316" strokeWidth="1.5" fill="none" />
    <path d="M 45,80 C 45,72 55,72 55,80 Z" fill="#0c0a09" stroke="#ea580c" strokeWidth="1" />
  </svg>
);

const WindCastleSVG = () => (
  <svg viewBox="0 0 100 100" className="castle-svg">
    <defs>
      <linearGradient id="windCastGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="50%" stopColor="#0891b2" />
        <stop offset="100%" stopColor="#083344" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="38" fill="none" stroke="url(#windCastGrad)" strokeWidth="2" opacity="0.3" strokeDasharray="5 5" />
    <path d="M 28,68 L 32,60 L 68,60 L 72,68 L 50,84 Z" fill="url(#windCastGrad)" />
    <rect x="35" y="42" width="30" height="18" fill="#0e7490" rx="1" />
    <path d="M 31,42 L 69,42 L 50,35 Z" fill="#22d3ee" />
    <rect x="42" y="24" width="16" height="18" fill="url(#windCastGrad)" />
    <polygon points="38,24 62,24 50,8" fill="#0891b2" />
    <circle cx="50" cy="5" r="3" fill="#e0f7fa" />
    <path d="M 20,55 Q 26,50 30,58 M 80,55 Q 74,50 70,58" stroke="#22d3ee" strokeWidth="1" fill="none" opacity="0.6" />
    <rect x="46" y="50" width="8" height="10" fill="#02141a" rx="1" />
  </svg>
);

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
}

export const ShopModal: React.FC<ShopModalProps> = ({ onClose, resources }) => {
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
      dragonClass: "golden-dragon",
      castleSVG: <GoldenCastleSVG />,
      perks: ["Hào quang Long Vương hộ thể (+5% phòng thủ)", "Hiệu ứng rồng bay quanh thành trên bản đồ", "Cờ phướn hoàng gia phất phơ"]
    },
    {
      id: "skin_hoa_long_dien",
      name: "Hỏa Long Điện",
      price: config?.shopSkinHoaLongDienPrice ?? 2000,
      desc: "Điện thờ rồng lửa đỏ rực bùng cháy ngọn lửa dung nham thiêu rụi mọi đạo quân xâm lược.",
      themeColor: "#ff4500",
      dragonClass: "fire-dragon",
      castleSVG: <FireCastleSVG />,
      perks: ["Hiệu ứng khói bụi dung nham xung quanh", "Hỏa long hộ vệ tuần tra quanh lăng lũy", "Vết nứt magma rực sáng trong đêm"]
    },
    {
      id: "skin_phong_long_cac",
      name: "Phong Long Các",
      price: config?.shopSkinPhongLongCacPrice ?? 1800,
      desc: "Lầu gác rồng phong lôi thanh tao, phiêu dật giữa những luồng lốc xoáy lấp lánh.",
      themeColor: "#00ffff",
      dragonClass: "wind-dragon",
      castleSVG: <WindCastleSVG />,
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
                  <div className="shop-skin-card" key={skin.id} style={{ borderColor: skin.themeColor }}>
                    
                    {/* Dragon Flight Loop */}
                    <div className={`dragon-flight-wrapper ${skin.dragonClass}`}>
                      <svg className="dragon-flyer" viewBox="0 0 100 100">
                        <g className="dragon-body-group">
                          <path className="wing-flap-l" d="M35,45 Q15,30 30,55 Z" fill={skin.themeColor} />
                          <path className="wing-flap-r" d="M65,45 Q85,30 70,55 Z" fill={skin.themeColor} />
                          <path d="M42,50 Q50,38 58,50 Q50,62 42,50 Z" fill={skin.themeColor} />
                          <circle cx="50" cy="40" r="5" fill={skin.themeColor} />
                          <path d="M50,56 L50,68 L47,72 L50,68 L53,72 Z" stroke={skin.themeColor} strokeWidth="1.5" fill="none" />
                        </g>
                      </svg>
                    </div>

                    <div className="skin-card-header">
                      <h4 className="skin-name" style={{ color: skin.themeColor }}>{skin.name}</h4>
                      <span className="coming-soon-badge">Coming Soon</span>
                    </div>
                    
                    <div className="skin-visual-box">
                      {skin.castleSVG}
                      <div className="dragon-glow-ring" style={{ boxShadow: `0 0 18px ${skin.themeColor}` }} />
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

                {/* Right Side 3D Sa Ban Grid */}
                <div className="preview-sandbox-panel">
                  <div className="sandbox-environment">
                    {/* Simulated 3D Grass Plot */}
                    <div className="sandbox-grass-plot">
                      <div className="grid-line-x" />
                      <div className="grid-line-y" />
                      
                      {/* Ambient trees surrounding */}
                      <div className="sandbox-prop tree-1">🌲</div>
                      <div className="sandbox-prop tree-2">🌲</div>
                      <div className="sandbox-prop tree-3">🌲</div>
                      
                      {/* Castle at center */}
                      <div className="sandbox-castle-wrapper">
                        {previewSkin.castleSVG}
                        {/* Glow floor light ring */}
                        <div className="sandbox-glow-ring" style={{ border: `2.5px solid ${previewSkin.themeColor}`, boxShadow: `0 0 25px ${previewSkin.themeColor}` }} />
                      </div>

                      {/* Giant Dragon flying above sa ban */}
                      <div className={`sandbox-dragon-orbit ${previewSkin.dragonClass}`}>
                        <svg className="sandbox-dragon-flyer" viewBox="0 0 100 100">
                          <g className="dragon-body-group">
                            <path className="wing-flap-l" d="M35,45 Q15,30 30,55 Z" fill={previewSkin.themeColor} />
                            <path className="wing-flap-r" d="M65,45 Q85,30 70,55 Z" fill={previewSkin.themeColor} />
                            <path d="M42,50 Q50,38 58,50 Q50,62 42,50 Z" fill={previewSkin.themeColor} />
                            <circle cx="50" cy="40" r="5" fill={previewSkin.themeColor} />
                            <path d="M50,56 L50,68 L47,72 L50,68 L53,72 Z" stroke={previewSkin.themeColor} strokeWidth="1.5" fill="none" />
                          </g>
                        </svg>
                      </div>
                    </div>

                    <div className="sandbox-watermark">SA BÀN XEM TRƯỚC 3D</div>
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
