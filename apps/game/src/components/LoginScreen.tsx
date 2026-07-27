import { useState } from "react";
import { loginPlayer, registerPlayer, loginGuest } from "../game/api";

interface LoginScreenProps {
  onSuccess: (token: string, playerId: string) => void;
  onPlayOffline: () => void;
}

type TabType = "login" | "register" | "guest";

export function LoginScreen({ onSuccess, onPlayOffline }: LoginScreenProps) {
  const [tab, setTab] = useState<TabType>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "login") {
        if (!username || !password) {
          throw new Error("Vui lòng điền đầy đủ tài khoản và mật khẩu");
        }
        const res = await loginPlayer(username, password);
        onSuccess(res.token, res.playerId);
      } else if (tab === "register") {
        if (!username || !password) {
          throw new Error("Vui lòng điền đầy đủ thông tin đăng ký");
        }
        if (username.length < 3) {
          throw new Error("Tên tài khoản phải dài ít nhất 3 ký tự");
        }
        if (password.length < 8) {
          throw new Error("Mật khẩu phải dài ít nhất 8 ký tự");
        }
        const res = await registerPlayer(username, password);
        onSuccess(res.token, res.playerId);
      } else if (tab === "guest") {
        const nameToUse = guestName.trim() || `Khách-${Math.floor(1000 + Math.random() * 9000)}`;
        if (nameToUse.length < 2) {
          throw new Error("Tên khách phải dài ít nhất 2 ký tự");
        }
        const res = await loginGuest(nameToUse);
        onSuccess(res.token, res.playerId);
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="crt-overlay" />
      <div className="stars-container" />
      
      <div className="pixel-box">
        <h1 className="retro-title">
          ĐẾ CHẾ ĐẢO PIXEL
          <br />
          <span className="blink" style={{ fontSize: "8px", color: "#aebfd4", textShadow: "none", marginTop: "8px", display: "inline-block" }}>
            - CHỌN CHẾ ĐỘ CHƠI -
          </span>
        </h1>

        <div className="retro-tab-container">
          <button
            type="button"
            className={`retro-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => { setTab("login"); setError(null); }}
            disabled={loading}
          >
            ĐĂNG NHẬP
          </button>
          <button
            type="button"
            className={`retro-tab ${tab === "register" ? "active" : ""}`}
            onClick={() => { setTab("register"); setError(null); }}
            disabled={loading}
          >
            ĐĂNG KÝ
          </button>
          <button
            type="button"
            className={`retro-tab ${tab === "guest" ? "active" : ""}`}
            onClick={() => { setTab("guest"); setError(null); }}
            disabled={loading}
          >
            CHƠI NHANH
          </button>
        </div>

        {error && <div className="error-box">LỖI: {error.toUpperCase()}</div>}

        {loading ? (
          <div className="pixel-loading blink">ĐANG TẢI...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {tab !== "guest" ? (
              <>
                <div className="retro-form-group">
                  <label className="retro-label">TÀI KHOẢN:</label>
                  <input
                    type="text"
                    className="retro-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="USERNAME"
                    maxLength={40}
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
                <div className="retro-form-group">
                  <label className="retro-label">MẬT KHẨU:</label>
                  <input
                    type="password"
                    className="retro-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="PASSWORD"
                    maxLength={200}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </>
            ) : (
              <div className="retro-form-group">
                <label className="retro-label">TÊN NGƯỜI CHƠI (TÙY CHỌN):</label>
                <input
                  type="text"
                  className="retro-input"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="GUEST NAME"
                  maxLength={24}
                  disabled={loading}
                />
              </div>
            )}

            <button type="submit" className="retro-btn">
              {tab === "login" ? "VÀO GAME" : tab === "register" ? "TẠO TÀI KHOẢN" : "BẮT ĐẦU CHƠI"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: "14px", borderTop: "2px solid #000", paddingTop: "14px" }}>
          <button
            type="button"
            className="retro-btn muted"
            style={{ margin: 0 }}
            onClick={onPlayOffline}
            disabled={loading}
          >
            CHƠI OFFLINE (LOCAL SAVE)
          </button>
        </div>
      </div>
    </div>
  );
}
