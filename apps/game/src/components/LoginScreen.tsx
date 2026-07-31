import React, { useState } from "react";
import { loginGuest, loginPlayer, registerPlayer } from "../game/api";
import { detectDeviceLanguage, translate } from "../game/i18n";

interface LoginScreenProps {
  onSuccess: (token: string, playerId: string) => void;
}

type AuthTab = "login" | "register" | "guest";

const CAMERA_KEY = "island_empire_camera_v1";
const CLAIM_KEY = "island_empire_onboarding_claim";
const ONBOARDING_KEY = "island_empire_onboarding_pending";

// --- 100% VECTOR SVGS (ZERO EMOJIS) ---
function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d7e3ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 6 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function HeadsetHelpIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d7e3ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 6 }}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function GearSettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d7e3ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 6 }}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ flexShrink: 0, marginRight: 8 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

/* Header Crest Shield with 2 Crossed Broadswords on top of Login Card */
function CrestHeaderEmblem() {
  return (
    <img
      src="/assets/ui/logo.png"
      alt="Hex Rivals Logo"
      style={{
        width: 140,
        height: 140,
        objectFit: "contain",
        flexShrink: 0,
        filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.8))",
        marginBottom: 10,
      }}
    />
  );
}

/* 4 Bottom Feature Vector Art SVGs */
function CastleFeatureArt() {
  return (
    <svg viewBox="0 0 80 80" width="46" height="46" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="goldShieldArt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff099" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
      </defs>
      <path d="M40 8L12 20v24c0 18 16 26 28 28 12-2 28-10 28-28V20L40 8z" fill="#0f172a" stroke="url(#goldShieldArt)" strokeWidth="2.5" />
      <rect x="26" y="34" width="28" height="24" fill="#64748b" stroke="url(#goldShieldArt)" strokeWidth="1.5" />
      <polygon points="26,34 33,24 40,34" fill="#ef4444" />
      <polygon points="40,34 47,24 54,34" fill="#ef4444" />
      <path d="M35,58 v-10 a5,5 0 0,1 10,0 v10 z" fill="#1e293b" />
    </svg>
  );
}

function BattleFeatureArt() {
  return (
    <svg viewBox="0 0 80 80" width="46" height="46" style={{ flexShrink: 0 }}>
      <line x1="16" y1="16" x2="64" y2="64" stroke="url(#goldShieldArt)" strokeWidth="4" strokeLinecap="round" />
      <polygon points="16,16 26,20 20,26" fill="#fff" />
      <line x1="64" y1="16" x2="16" y2="64" stroke="url(#goldShieldArt)" strokeWidth="4" strokeLinecap="round" />
      <polygon points="64,16 58,26 54,20" fill="#fff" />
      <circle cx="40" cy="40" r="6" fill="#ffd34d" />
    </svg>
  );
}

function AllianceFeatureArt() {
  return (
    <svg viewBox="0 0 80 80" width="46" height="46" style={{ flexShrink: 0 }}>
      <path d="M40 8L12 20v24c0 18 16 26 28 28 12-2 28-10 28-28V20L40 8z" fill="#0f172a" stroke="url(#goldShieldArt)" strokeWidth="2.5" />
      <path d="M22 38 Q 32 28 40 38 Q 48 28 58 38 Q 46 54 40 46 Q 34 54 22 38 Z" fill="url(#goldShieldArt)" />
    </svg>
  );
}

function CrownFeatureArt() {
  return (
    <svg viewBox="0 0 80 80" width="46" height="46" style={{ flexShrink: 0 }}>
      <path d="M40 8L12 20v24c0 18 16 26 28 28 12-2 28-10 28-28V20L40 8z" fill="#0f172a" stroke="url(#goldShieldArt)" strokeWidth="2.5" />
      <polygon points="22,46 18,26 31,34 40,20 49,34 62,26 58,46" fill="url(#goldShieldArt)" stroke="#78350f" strokeWidth="1" />
      <circle cx="40" cy="18" r="3" fill="#fff" />
      <circle cx="18" cy="24" r="2.5" fill="#fff" />
      <circle cx="62" cy="24" r="2.5" fill="#fff" />
    </svg>
  );
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [language, setLanguage] = useState(() => detectDeviceLanguage());
  const [tab, setTab] = useState<AuthTab>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [flagColor, setFlagColor] = useState("#2f70d7");
  const [emblem, setEmblem] = useState<"shield" | "tree" | "mountain" | "anchor">("shield");
  const [starterLand, setStarterLand] = useState<"north-forest" | "west-hills" | "east-coast" | "south-river">("south-river");

  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "login") {
        if (!username || !password) throw new Error("Vui lòng nhập tên đăng nhập và mật khẩu");
        if (username.length < 3) throw new Error("Tên đăng nhập quá ngắn");
        if (password.length < 6) throw new Error("Mật khẩu quá ngắn");

        const res = await loginPlayer(username, password);
        onSuccess(res.token, res.playerId);
        return;
      }

      if (tab === "register") {
        if (!username || !password) throw new Error("Vui lòng điền đầy đủ thông tin đăng ký");
        if (username.length < 3) throw new Error("Tên tài khoản tối thiểu 3 ký tự");
        if (password.length < 8) throw new Error("Mật khẩu tối thiểu 8 ký tự");

        const res = await registerPlayer(username, password, {
          flagColor,
          emblem,
          starterLandId: starterLand,
        });
        localStorage.removeItem(CAMERA_KEY);
        localStorage.removeItem(CLAIM_KEY);
        localStorage.setItem(ONBOARDING_KEY, "1");
        onSuccess(res.token, res.playerId);
        return;
      }

      // Guest / Fast Play Mode
      const name = guestName.trim() || `Lord-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await loginGuest(name);
      localStorage.removeItem(CAMERA_KEY);
      localStorage.removeItem(CLAIM_KEY);
      localStorage.setItem(ONBOARDING_KEY, "1");
      onSuccess(res.token, res.playerId);
    } catch (err: any) {
      setError(err.message || t("unknownError"));
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const name = `GoogleUser-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await loginGuest(name);
      localStorage.removeItem(CAMERA_KEY);
      localStorage.removeItem(CLAIM_KEY);
      localStorage.setItem(ONBOARDING_KEY, "1");
      onSuccess(res.token, res.playerId);
    } catch (err: any) {
      setError(err.message || "Đăng nhập Google thất bại");
      setLoading(false);
    }
  };

  return (
    <div className="l4-root">
      {/* Background Atmosphere Wallpaper */}
      <div className="l4-bg-image" />
      <div className="l4-bg-overlay" />

      {/* Top Header Controls Bar */}
      <div className="l4-top-bar">
        <div className="l4-brand-empty-spacer" />

        <div className="l4-top-actions">
          <button type="button" className="l4-lang-btn" onClick={() => setLanguage(language === "vi" ? "en" : "vi")}>
            <GlobeIcon /> {language === "vi" ? "Tiếng Việt" : "English"} ▾
          </button>
          <button type="button" className="l4-top-action-pill" onClick={() => setError("Vui lòng gửi email đến support@hexrivals.com")}>
            <HeadsetHelpIcon /> Hỗ trợ
          </button>
          <button type="button" className="l4-top-action-pill" onClick={() => setError("Bản quyền game Hex Rivals v1.0.0")}>
            <GearSettingsIcon /> Cài đặt
          </button>
        </div>
      </div>

      {/* Center Form Section */}
      <div className="l4-center-section">
        <div className="l4-login-card">
          
          {/* Top Crest Emblem Header */}
          <div className="l4-card-header">
            <CrestHeaderEmblem />
            <h2 className="title">
              {tab === "login" ? "ĐĂNG NHẬP" : tab === "register" ? "ĐĂNG KÝ TÀI KHOẢN" : "CHƠI NHANH GUEST"}
            </h2>
            <p className="subtitle">
              {tab === "login" ? "Chào mừng Vua trở lại!" : tab === "register" ? "Khai mở triều đại vương quốc mới" : "Tham chiến ngay lập tức không cần tạo tài khoản"}
            </p>
          </div>

          {/* Mode Switcher Tabs (ĐĂNG NHẬP | ĐĂNG KÝ | CHƠI NHANH) */}
          <div className="l4-mode-tabs">
            <button
              type="button"
              className={`l4-mode-tab ${tab === "login" ? "active" : ""}`}
              onClick={() => { setTab("login"); setError(null); }}
            >
              ĐĂNG NHẬP
            </button>
            <button
              type="button"
              className={`l4-mode-tab ${tab === "register" ? "active" : ""}`}
              onClick={() => { setTab("register"); setError(null); }}
            >
              ĐĂNG KÝ
            </button>
            <button
              type="button"
              className={`l4-mode-tab ${tab === "guest" ? "active" : ""}`}
              onClick={() => { setTab("guest"); setError(null); }}
            >
              CHƠI NHANH
            </button>
          </div>

          {error && (
            <div className="l4-error-banner">
              {error}
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="l4-form">
            
            {(tab === "login" || tab === "register") && (
              <>
                <div className="l4-input-group">
                  <span className="icon"><UserIcon /></span>
                  <input
                    type="text"
                    placeholder={tab === "register" ? "Tên tài khoản mới (từ 3 ký tự)" : "Tên đăng nhập / Email"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    spellCheck={false}
                  />
                </div>

                <div className="l4-input-group">
                  <span className="icon"><LockIcon /></span>
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder={tab === "register" ? "Mật khẩu bảo mật (từ 8 ký tự)" : "Mật khẩu"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>

                {tab === "login" && (
                  <div className="l4-options-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Ghi nhớ đăng nhập</span>
                    </label>

                    <button type="button" className="forgot-link" onClick={() => setError("Vui lòng liên hệ CSKH để khôi phục mật khẩu")}>
                      Quên mật khẩu?
                    </button>
                  </div>
                )}

                {tab === "register" && (
                  <div className="register-customization-section">
                    <div className="custom-section-title">✧ THIẾT LẬP THẾ LỰC TÂN THỦ ✧</div>
                    
                    {/* Flag Color Selection */}
                    <div className="custom-row">
                      <label className="custom-label">Màu cờ thế lực:</label>
                      <div className="color-palette">
                        {["#2f70d7", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"].map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`color-dot ${flagColor === color ? "active" : ""}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setFlagColor(color)}
                          />
                        ))}
                        <input
                          type="color"
                          value={flagColor}
                          onChange={(e) => setFlagColor(e.target.value)}
                          className="custom-color-picker"
                          title="Chọn màu tự do"
                        />
                      </div>
                    </div>
 
                    {/* Emblem Selection */}
                    <div className="custom-row">
                      <label className="custom-label">Biểu tượng gia huy:</label>
                      <div className="emblem-options">
                        {([
                          { id: "shield", label: "Khiên Thép", icon: "🛡️" },
                          { id: "tree", label: "Cổ Thụ", icon: "🌲" },
                          { id: "mountain", label: "Đỉnh Núi", icon: "⛰️" },
                          { id: "anchor", label: "Mỏ Neo", icon: "⚓" },
                        ] as const).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={`emblem-chip ${emblem === opt.id ? "active" : ""}`}
                            onClick={() => setEmblem(opt.id)}
                          >
                            <span className="icon">{opt.icon}</span>
                            <span className="text">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
 
                    {/* Starter Land Selection */}
                    <div className="custom-row">
                      <label className="custom-label">Vị trí khởi đầu:</label>
                      <div className="land-options">
                        {([
                          { id: "south-river", label: "Đồng Bằng Nam Lục Địa", desc: "Đất trù phú & ôn hòa", color: "#22c55e" },
                          { id: "north-forest", label: "Lục Địa Băng Tuyết Bắc", desc: "Giá buốt & giàu tài nguyên", color: "#ccd7db" },
                          { id: "west-hills", label: "Lục Địa Hỏa Sơn Tây", desc: "Nhiều khoáng sản & quặng sắt", color: "#ef4444" },
                          { id: "east-coast", label: "Sa Mạc Cát Vàng Đông", desc: "Đất rộng & mỏ đá dồi dào", color: "#f59e0b" },
                        ] as const).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={`land-card ${starterLand === opt.id ? "active" : ""}`}
                            onClick={() => setStarterLand(opt.id)}
                          >
                            <div className="land-header" style={{ color: opt.color }}>
                              <span className="dot" style={{ backgroundColor: opt.color }} />
                              <b>{opt.label}</b>
                            </div>
                            <div className="land-desc">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === "guest" && (
              <div className="l4-input-group">
                <span className="icon"><UserIcon /></span>
                <input
                  type="text"
                  placeholder="Tên Chúa công (tùy chọn, để trống sẽ tự tạo)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  spellCheck={false}
                />
              </div>
            )}

            {/* Primary Action Button */}
            <button type="submit" className="l4-gold-submit-btn" disabled={loading}>
              {loading
                ? "ĐANG XỬ LÝ..."
                : tab === "login"
                ? "ĐĂNG NHẬP"
                : tab === "register"
                ? "TẠO TÀI KHOẢN MỚI"
                : "BẮT ĐẦU CHƠI NHANH"}
            </button>

            {/* Social Login Divider */}
            <div className="l4-divider">
              <span className="line" />
              <span className="text">HOẶC ĐĂNG NHẬP BẰNG</span>
              <span className="line" />
            </div>

            {/* Google Login Button ONLY */}
            <div className="l4-social-single">
              <button type="button" className="l4-google-login-btn" onClick={handleGoogleLogin}>
                <GoogleIcon />
                <span>Đăng nhập bằng Google</span>
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* Bottom Feature Showcase Bar (100% Match Reference Art) */}
      <div className="l4-bottom-features-bar">
        <div className="feature-item">
          <CastleFeatureArt />
          <div className="info">
            <span className="title">XÂY DỰNG</span>
            <span className="desc">Phát triển thành trì vững chắc</span>
          </div>
        </div>

        <div className="feature-item">
          <BattleFeatureArt />
          <div className="info">
            <span className="title">CHIẾN ĐẤU</span>
            <span className="desc">Chinh phục kẻ thù mạnh mẽ</span>
          </div>
        </div>

        <div className="feature-item">
          <AllianceFeatureArt />
          <div className="info">
            <span className="title">LIÊN MINH</span>
            <span className="desc">Kết giao bằng hữu khắp bốn phương</span>
          </div>
        </div>

        <div className="feature-item">
          <CrownFeatureArt />
          <div className="info">
            <span className="title">THỐNG TRỊ</span>
            <span className="desc">Trở thành bá chủ vương quốc</span>
          </div>
        </div>
      </div>

      {/* Footer Copyright */}
      <div className="l4-footer-copyright">
        ✧ © 2025 All Rights Reserved. ✧
      </div>
    </div>
  );
}
