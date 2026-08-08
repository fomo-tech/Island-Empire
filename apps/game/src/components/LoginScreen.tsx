import React, { useState } from "react";
import { loginGuest, loginPlayer, registerPlayer } from "../game/api";
import { detectDeviceLanguage, translate } from "../game/i18n";
import { AssetIcon } from "./AssetIcon";
import { TurnstileWidget } from "./TurnstileWidget";

interface LoginScreenProps {
  onSuccess: (token: string, playerId: string) => void;
}

type AuthMode = "login" | "register";

const CAMERA_KEY = "island_empire_camera_v1";
const CLAIM_KEY = "island_empire_onboarding_claim";
const ONBOARDING_KEY = "island_empire_onboarding_pending";

// --- 100% VECTOR SVGS (ZERO EMOJIS) ---
function GlobeIcon() {
  return <AssetIcon asset="map" size={15} style={{ marginRight: 6 }} />;
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d7e3ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 6 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function HeadsetHelpIcon() {
  return <AssetIcon asset="info" size={15} style={{ marginRight: 6 }} />;
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d7e3ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 6 }}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function GearSettingsIcon() {
  return <AssetIcon asset="settings" size={15} style={{ marginRight: 6 }} />;
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d7e3ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 6 }}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function UserIcon() {
  return <AssetIcon asset="settingsAccount" size={18} />;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b89344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function LockIcon() {
  return <AssetIcon asset="settingsAccount" size={18} />;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b89344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return <AssetIcon asset="info" size={18} />;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return <AssetIcon asset="info" size={18} active={false} />;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function GoogleIcon() {
  return <span className="login-google-mark" aria-hidden="true">G</span>;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0, marginRight: 8 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function CastleFeatureArt() {
  return <AssetIcon asset="castle" size={40} />;
  return (
    <svg viewBox="0 0 80 80" width="40" height="40" style={{ flexShrink: 0 }}>
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
  return <AssetIcon asset="battleVs" size={40} />;
  return (
    <svg viewBox="0 0 80 80" width="40" height="40" style={{ flexShrink: 0 }}>
      <line x1="16" y1="16" x2="64" y2="64" stroke="url(#goldShieldArt)" strokeWidth="4" strokeLinecap="round" />
      <polygon points="16,16 26,20 20,26" fill="#fff" />
      <line x1="64" y1="16" x2="16" y2="64" stroke="url(#goldShieldArt)" strokeWidth="4" strokeLinecap="round" />
      <polygon points="64,16 58,26 54,20" fill="#fff" />
      <circle cx="40" cy="40" r="6" fill="#ffd34d" />
    </svg>
  );
}

function AllianceFeatureArt() {
  return <AssetIcon asset="guild" size={40} />;
  return (
    <svg viewBox="0 0 80 80" width="40" height="40" style={{ flexShrink: 0 }}>
      <path d="M40 8L12 20v24c0 18 16 26 28 28 12-2 28-10 28-28V20L40 8z" fill="#0f172a" stroke="url(#goldShieldArt)" strokeWidth="2.5" />
      <path d="M22 38 Q 32 28 40 38 Q 48 28 58 38 Q 46 54 40 46 Q 34 54 22 38 Z" fill="url(#goldShieldArt)" />
    </svg>
  );
}

function CrownFeatureArt() {
  return <AssetIcon asset="crown" size={40} />;
  return (
    <svg viewBox="0 0 80 80" width="40" height="40" style={{ flexShrink: 0 }}>
      <path d="M40 8L12 20v24c0 18 16 26 28 28 12-2 28-10 28-28V20L40 8z" fill="#0f172a" stroke="url(#goldShieldArt)" strokeWidth="2.5" />
      <polygon points="22,46 18,26 31,34 40,20 49,34 62,26 58,46" fill="url(#goldShieldArt)" stroke="#78350f" strokeWidth="1" />
      <circle cx="40" cy="18" r="3" fill="#fff" />
      <circle cx="18" cy="24" r="2.5" fill="#fff" />
      <circle cx="62" cy="24" r="2.5" fill="#fff" />
    </svg>
  );
}

function MedievalCornerDecorations() {
  return <span className="decor-corners-css" aria-hidden="true" />;
  return (
    <>
      <svg className="decor-corner tl" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 0H24V2H2V24H0V0Z" fill="url(#goldGrad)" />
        <path d="M4 4H18V6H6V18H4V4Z" fill="url(#goldGrad)" />
        <circle cx="9" cy="9" r="1.5" fill="url(#goldGrad)" />
      </svg>
      <svg className="decor-corner tr" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 0H0V2H22V24H24V0Z" fill="url(#goldGrad)" />
        <path d="M20 4H6V6H18V18H20V4Z" fill="url(#goldGrad)" />
        <circle cx="15" cy="9" r="1.5" fill="url(#goldGrad)" />
      </svg>
      <svg className="decor-corner bl" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 24H24V22H2V0H0V24Z" fill="url(#goldGrad)" />
        <path d="M4 20H18V18H6V6H4V20Z" fill="url(#goldGrad)" />
        <circle cx="9" cy="15" r="1.5" fill="url(#goldGrad)" />
      </svg>
      <svg className="decor-corner br" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 24H0V22H22V0H24V24Z" fill="url(#goldGrad)" />
        <path d="M20 20H6V18H18V6H20V20Z" fill="url(#goldGrad)" />
        <circle cx="15" cy="15" r="1.5" fill="url(#goldGrad)" />
      </svg>
      
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff2a3" />
            <stop offset="50%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
}

function CrestHeaderEmblem() {
  return (
    <img
      src="/assets/ui/logo.png"
      alt="Hex Rivals Logo"
      style={{
        width: 130,
        height: 130,
        objectFit: "contain",
        flexShrink: 0,
        filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.8))",
        marginBottom: 8,
      }}
    />
  );
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [language, setLanguage] = useState(() => detectDeviceLanguage());
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  const requireTurnstileToken = () => {
    if (!turnstileToken) {
      throw new Error("Vui lòng hoàn tất xác minh bảo mật");
    }
    return turnstileToken;
  };

  const resetTurnstile = () => {
    setTurnstileToken(null);
    setTurnstileResetKey((value) => value + 1);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    resetTurnstile();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const captchaToken = requireTurnstileToken();
      if (!username || !password) {
        throw new Error(
          mode === "login"
            ? "Vui lòng nhập tên đăng nhập và mật khẩu"
            : "Vui lòng điền đầy đủ thông tin đăng ký"
        );
      }
      if (username.length < 3) throw new Error("Tên tài khoản tối thiểu 3 ký tự");
      
      if (mode === "login") {
        if (password.length < 6) throw new Error("Mật khẩu tối thiểu từ 6 ký tự");
        const res = await loginPlayer(username, password, captchaToken);
        onSuccess(res.token, res.playerId);
      } else {
        if (password.length < 8) throw new Error("Mật khẩu đăng ký tối thiểu từ 8 ký tự");
        
        // Randomize initial profile features under the hood for faster signups
        const colors = ["#b4232f", "#2459a9", "#d39216", "#26724f", "#6d3ca0", "#147f91"];
        const emblems = ["shield", "tree", "mountain", "anchor"];
        const lands = ["south-river", "north-forest", "west-hills", "east-coast"];
        
        const randomFlagColor = colors[Math.floor(Math.random() * colors.length)];
        const randomEmblem = emblems[Math.floor(Math.random() * emblems.length)];
        const randomLand = lands[Math.floor(Math.random() * lands.length)];

        const res = await registerPlayer(
          username,
          password,
          {
            flagColor: randomFlagColor,
            emblem: randomEmblem,
            starterLandId: randomLand,
          },
          captchaToken,
        );
        localStorage.removeItem(CAMERA_KEY);
        localStorage.removeItem(CLAIM_KEY);
        localStorage.setItem(ONBOARDING_KEY, "1");
        onSuccess(res.token, res.playerId);
      }
    } catch (err: any) {
      setError(err.message || t("unknownError"));
      setLoading(false);
      resetTurnstile();
    }
  };

  const handleGuestPlay = async () => {
    setError(null);
    setLoading(true);
    try {
      const captchaToken = requireTurnstileToken();
      const name = `Lord-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await loginGuest(name, captchaToken);
      localStorage.removeItem(CAMERA_KEY);
      localStorage.removeItem(CLAIM_KEY);
      localStorage.setItem(ONBOARDING_KEY, "1");
      onSuccess(res.token, res.playerId);
    } catch (err: any) {
      setError(err.message || "Đăng nhập chơi nhanh thất bại");
      setLoading(false);
      resetTurnstile();
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const captchaToken = requireTurnstileToken();
      const name = `GoogleUser-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await loginGuest(name, captchaToken);
      localStorage.removeItem(CAMERA_KEY);
      localStorage.removeItem(CLAIM_KEY);
      localStorage.setItem(ONBOARDING_KEY, "1");
      onSuccess(res.token, res.playerId);
    } catch (err: any) {
      setError(err.message || "Đăng nhập Google thất bại");
      setLoading(false);
      resetTurnstile();
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

      {/* Center Stacked Form Section */}
      <div className="l4-center-section">
        <div className="l4-login-card">
          <MedievalCornerDecorations />
          
          {/* Top Crest Emblem Header */}
          <div className="l4-card-header">
            <CrestHeaderEmblem />
            <h2 className="title">
              {mode === "login" ? "ĐĂNG NHẬP" : "ĐĂNG KÝ TÀI KHOẢN"}
            </h2>
            <p className="subtitle">
              {mode === "login" ? "Chào mừng Chúa công trở lại!" : "Khai mở triều đại vương quốc mới"}
            </p>
          </div>

          {error && (
            <div className="l4-error-banner">
              {error}
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="l4-form">
            <div className="l4-input-group">
              <span className="icon"><UserIcon /></span>
              <input
                type="text"
                placeholder={mode === "register" ? "Tên tài khoản mới (từ 3 ký tự)" : "Tên đăng nhập / Email"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                spellCheck={false}
              />
            </div>

            <div className="l4-input-group">
              <span className="icon"><LockIcon /></span>
              <input
                type={showPass ? "text" : "password"}
                placeholder={mode === "register" ? "Mật khẩu bảo mật (từ 8 ký tự)" : "Mật khẩu"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {mode === "login" && (
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

            <TurnstileWidget
              onToken={setTurnstileToken}
              resetKey={turnstileResetKey}
            />

            {/* Primary Actions Area */}
            <div className="l4-action-buttons">
              <button type="submit" className="l4-gold-submit-btn" disabled={loading}>
                {loading
                  ? "ĐANG XỬ LÝ..."
                  : mode === "login"
                  ? "VÀO GAME"
                  : "TẠO TÀI KHOẢN"}
              </button>

              {mode === "login" && (
                <button type="button" className="l4-guest-play-btn" onClick={handleGuestPlay} disabled={loading}>
                  CHƠI NGAY
                </button>
              )}
            </div>

            {/* Bottom Register Switch & Google OAuth */}
            <div className="l4-bottom-switch">
              <div className="l4-divider">
                <span className="line" />
                <span className="text">{mode === "login" ? "LIÊN KẾT & ĐĂNG KÝ" : "HOẶC ĐĂNG NHẬP"}</span>
                <span className="line" />
              </div>

              {/* Google Login Button */}
              <button type="button" className="l4-google-login-btn" onClick={handleGoogleLogin} disabled={loading}>
                <GoogleIcon />
                <span>Đăng nhập bằng Google</span>
              </button>

              <div className="l4-switch-prompt">
                {mode === "login" ? (
                  <>
                    <span>Chưa có tài khoản thế lực?</span>
                    <button type="button" className="l4-toggle-mode-btn" onClick={() => switchMode("register")}>
                      ĐĂNG KÝ NGAY
                    </button>
                  </>
                ) : (
                  <>
                    <span>Đã có tài khoản tân thủ?</span>
                    <button type="button" className="l4-toggle-mode-btn" onClick={() => switchMode("login")}>
                      QUAY LẠI ĐĂNG NHẬP
                    </button>
                  </>
                )}
              </div>
            </div>

          </form>

        </div>
      </div>

  

      {/* Footer Copyright */}
      <div className="l4-footer-copyright">
        ✧ © 2025 All Rights Reserved. ✧
      </div>
    </div>
  );
}
