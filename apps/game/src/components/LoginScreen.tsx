import { useState } from "react";
import { loginGuest, loginPlayer, registerPlayer } from "../game/api";
import { detectDeviceLanguage, translate } from "../game/i18n";

interface LoginScreenProps {
  onSuccess: (token: string, playerId: string) => void;
}

type TabType = "login" | "register" | "guest";

const CAMERA_KEY = "island_empire_camera_v1";
const CLAIM_KEY = "island_empire_onboarding_claim";
const ONBOARDING_KEY = "island_empire_onboarding_pending";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [language] = useState(() => detectDeviceLanguage());
  const [tab, setTab] = useState<TabType>("guest");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [trailerMsg, setTrailerMsg] = useState<string | null>(null);
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  const switchTab = (nextTab: TabType) => {
    setTab(nextTab);
    setError(null);
    setLoading(false);
  };

  const validateAccount = () => {
    if (!username || !password) throw new Error(t("missingAccount"));
    if (username.length < 3) throw new Error(t("usernameTooShort"));
    if (password.length < 8) throw new Error(t("passwordTooShort"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "login") {
        validateAccount();
        const res = await loginPlayer(username, password);
        onSuccess(res.token, res.playerId);
        return;
      }

      if (tab === "guest") {
        const name = guestName.trim() || `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
        if (name.length < 2) throw new Error(t("guestTooShort"));
        const res = await loginGuest(name);
        localStorage.removeItem(CAMERA_KEY);
        localStorage.removeItem(CLAIM_KEY);
        localStorage.setItem(ONBOARDING_KEY, "1");
        onSuccess(res.token, res.playerId);
        return;
      }

      validateAccount();
      const res = await registerPlayer(username, password);
      localStorage.removeItem(CAMERA_KEY);
      localStorage.removeItem(CLAIM_KEY);
      localStorage.setItem(ONBOARDING_KEY, "1");
      onSuccess(res.token, res.playerId);
    } catch (err: any) {
      setError(err.message || t("unknownError"));
      setLoading(false);
    }
  };

  return (
    <div className="l3-root">
      {/* Background with user artwork */}
      <div className="l3-bg" />
      <div className="l3-overlay" />

      {/* Trailer Toast */}
      {trailerMsg && (
        <div className="l3-toast" onClick={() => setTrailerMsg(null)}>
          <span>🎬 {trailerMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="l3-container">

        {/* ── LEFT SECTION: BRANDING & TRAILER ── */}
        <div className="l3-left">
          <div className="l3-title-wrap">
            <h1 className="l3-game-title">
              {language === "vi" ? "ĐẾ CHẾ" : "PIXEL"}
              <br />
              {language === "vi" ? "ĐẢO PIXEL" : "ISLAND EMPIRE"}
            </h1>
            <p className="l3-subtitle">{t("loginSubtitle")}</p>

            <button
              type="button"
              className="l3-trailer-btn"
              onClick={() => {
                setTrailerMsg(t("trailerSoon"));
                setTimeout(() => setTrailerMsg(null), 3000);
              }}
            >
              <span className="l3-play-icon">▶</span> {t("watchTrailer")}
            </button>
          </div>

          {/* Bottom feature badges bar */}
          <div className="l3-features-bar">
            <div className="l3-feature-item">
              <span className="l3-feat-icon">🏰</span>
              <span>{t("buildCastleFeature")}</span>
            </div>
            <div className="l3-feature-item">
              <span className="l3-feat-icon">🛡️</span>
              <span>{t("recruitFeature")}</span>
            </div>
            <div className="l3-feature-item">
              <span className="l3-feat-icon">🤝</span>
              <span>{t("allianceFeature")}</span>
            </div>
            <div className="l3-feature-item">
              <span className="l3-feat-icon">🎁</span>
              <span>{t("eventFeature")}</span>
            </div>
            <div className="l3-feature-item">
              <span className="l3-feat-icon">🌐</span>
              <span>{t("conquerFeature")}</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT SECTION: LOGIN FORM CARD ── */}
        <div className="l3-right">
          <div className="l3-card">

            {/* Crest badge header on top */}
            <div className="l3-card-crest">
              <div className="l3-crest-shield">👑</div>
              <div className="l3-plaque-title">
                {tab === "login" ? t("loginTitle") : tab === "register" ? t("registerTitle") : t("guestTitle")}
              </div>
            </div>

            {/* Tabs (Đăng Nhập | Đăng Ký | Chơi Nhanh) */}
            <div className="l3-tabs">
              <button
                type="button"
                className={`l3-tab ${tab === "login" ? "l3-tab--active" : ""}`}
                onClick={() => switchTab("login")}
                disabled={loading}
              >
                <span className="l3-tab-icon">⚔️</span>
                <span>{t("loginTab")}</span>
              </button>

              <button
                type="button"
                className={`l3-tab ${tab === "register" ? "l3-tab--active" : ""}`}
                onClick={() => switchTab("register")}
                disabled={loading}
              >
                <span className="l3-tab-icon">📜</span>
                <span>{t("registerTab")}</span>
              </button>

              <button
                type="button"
                className={`l3-tab ${tab === "guest" ? "l3-tab--active" : ""}`}
                onClick={() => switchTab("guest")}
                disabled={loading}
              >
                <span className="l3-tab-icon">⚡</span>
                <span>{t("guestTab")}</span>
              </button>
            </div>

            {/* Error box */}
            {error && (
              <div className="l3-error-box">
                <span>⚠️ {error}</span>
              </div>
            )}

            {/* Loading state */}
            {loading ? (
              <div className="l3-loading-state">
                <div className="l3-spin-sword">⚔️</div>
                <span>{t("connectingWorld")}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="l3-form">

                {/* Form fields for Login / Register */}
                {(tab === "login" || tab === "register") && (
                  <>
                    <div className="l3-field">
                      <label className="l3-label">
                        {tab === "register" ? t("newbieUsername") : t("username")}
                      </label>
                      <div className="l3-input-wrap">
                        <span className="l3-input-icon">👤</span>
                        <input
                          className="l3-input"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder={t("usernamePlaceholder")}
                          maxLength={40}
                          autoComplete="username"
                          spellCheck={false}
                        />
                      </div>
                    </div>

                    <div className="l3-field">
                      <label className="l3-label">{t("password")}</label>
                      <div className="l3-input-wrap">
                        <span className="l3-input-icon">🔑</span>
                        <input
                          type={showPass ? "text" : "password"}
                          className="l3-input"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t("passwordPlaceholder")}
                          maxLength={200}
                          autoComplete={tab === "register" ? "new-password" : "current-password"}
                        />
                        <button
                          type="button"
                          className="l3-eye-toggle"
                          onClick={() => setShowPass((v) => !v)}
                        >
                          {showPass ? "🙈" : "👁"}
                        </button>
                      </div>
                    </div>

                    {tab === "register" && (
                      <div className="l3-callout-blue">
                        <span className="l3-callout-icon">🗺️</span>
                        <span>{t("registerHint")}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Form field for Guest Mode */}
                {tab === "guest" && (
                  <>
                    <div className="l3-field">
                      <label className="l3-label">
                        {t("lordName")} <span className="l3-label-sub">({t("optional")})</span>
                      </label>
                      <div className="l3-input-wrap">
                        <span className="l3-input-icon">👑</span>
                        <input
                          className="l3-input"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder={t("guestPlaceholder")}
                          maxLength={24}
                        />
                      </div>
                    </div>

                    <div className="l3-callout-blue">
                      <span className="l3-callout-icon">⚡</span>
                      <span>{t("guestHint")}</span>
                    </div>
                  </>
                )}

                {/* Big Shiny Gold Primary CTA Button */}
                <button type="submit" className="l3-gold-cta">
                  <span className="l3-cta-swords">⚔️</span>
                  <span className="l3-cta-label">
                    {tab === "login" ? t("enterBattle") : tab === "register" ? t("createDynasty") : t("startNow")}
                  </span>
                  <span className="l3-cta-swords">⚔️</span>
                </button>

                {/* Divider */}
                <div className="l3-divider">
                  <span className="l3-div-line" />
                  <span className="l3-div-text">{t("continueWith")}</span>
                  <span className="l3-div-line" />
                </div>

                {/* Google Login Button */}
                <button
                  type="button"
                  className="l3-google-btn"
                  onClick={() => {
                    setError(t("googleSoon"));
                  }}
                >
                  <GoogleIcon />
                  <span>{t("googleLogin")}</span>
                </button>
              </form>
            )}

            {/* Footer */}
            <div className="l3-footer">
              👑 Island Empire Beta &nbsp;•&nbsp; v0.1.0
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
