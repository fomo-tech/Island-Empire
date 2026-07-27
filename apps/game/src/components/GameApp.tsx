import { useEffect, useRef, useState } from "react";
import { createIslandEmpireGame, type GameEngineHandle } from "../game/engine";
import { getServerStatus, getSave, putSave } from "../game/api";
import { LoginScreen } from "./LoginScreen";

const SAVE_KEY = "island_empire_pixel_v1";
const TOKEN_KEY = "island_empire_token";
const PLAYER_ID_KEY = "island_empire_playerId";

// Helper to format numbers with dot separators, e.g. 13.718
const formatNum = (num: number) => Math.floor(num).toLocaleString("vi-VN");

// Parse log lines into formatted chat objects
function parseChatLine(line: string) {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    return { channel: "THẾ GIỚI", name: "Hệ thống", message: line };
  }
  const namePart = line.substring(0, colonIndex).trim();
  const msgPart = line.substring(colonIndex + 1).trim();
  
  let channel = "LIÊN MINH";
  let name = namePart;
  
  if (namePart.startsWith("[LIÊN MINH]")) {
    channel = "LIÊN MINH";
    name = namePart.replace("[LIÊN MINH]", "").trim();
  } else if (namePart.startsWith("[THẾ GIỚI]")) {
    channel = "THẾ GIỚI";
    name = namePart.replace("[THẾ GIỚI]", "").trim();
  } else {
    const numMatch = namePart.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0]) : 1;
    channel = num % 2 === 0 ? "THẾ GIỚI" : "LIÊN MINH";
  }
  
  return { channel, name, message: msgPart };
}

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngineHandle | null>(null);
  const lastUpdateRef = useRef<number>(0);
  
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [playerId, setPlayerId] = useState<string | null>(() => localStorage.getItem(PLAYER_ID_KEY));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loadingSave, setLoadingSave] = useState<boolean>(false);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  
  // Game states captured from Engine Loop
  const [resources, setResources] = useState({ gold: 1250, wood: 830, stone: 670, gems: 420 });
  const [missions, setMissions] = useState<Array<{ text: string; value: number; goal: number }>>([
    { text: "CHIẾM 3 THÀNH PHỐ", value: 0, goal: 3 },
    { text: "XÂY 5 NHÀ QUÂN SỰ", value: 2, goal: 5 },
    { text: "NÂNG THÀNH LV.3", value: 1, goal: 3 }
  ]);
  const [chatLog, setChatLog] = useState<string[]>([
    "PLAYER1: CÙNG NHAU CHIẾN THẮNG!",
    "PLAYER2: TÔI ĐÃ CHIẾM ĐƯỢC THÀNH PHỐ A",
    "PLAYER3: CẦN THĂM DÒ PHÍA BẮC.",
    "PLAYER4: TẤN CÔNG KẺ ĐỊCH!"
  ]);
  const [xp, setXp] = useState(68);
  const [level, setLevel] = useState(25);
  const [toastMessage, setToastMessage] = useState("CHỌN THÀNH CỦA BẠN ĐỂ RA LỆNH");
  const [selectedTown, setSelectedTown] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");

  const lastSyncedRef = useRef<string | null>(null);

  // 1. Fetch API Health
  useEffect(() => {
    let cancelled = false;
    getServerStatus()
      .then(() => {
        if (!cancelled) setApiOnline(true);
      })
      .catch(() => {
        if (!cancelled) setApiOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Fetch cloud save if token exists on startup
  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoadingSave(true);

    getSave(token)
      .then((cloudSave) => {
        if (cancelled) return;
        if (cloudSave) {
          const localSave = {
            resources: cloudSave.resources,
            towns: cloudSave.towns.map((t: any) => ({
              id: t.id,
              lvl: t.level,
              owner: isNaN(Number(t.ownerId)) ? 0 : Number(t.ownerId),
              troops: t.troops,
            })),
          };
          const rawLocal = JSON.stringify(localSave);
          localStorage.setItem(SAVE_KEY, rawLocal);
          lastSyncedRef.current = rawLocal;
        }
        setIsAuthenticated(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Could not load cloud save, falling back to local:", err);
        if (err.message && err.message.includes("401")) {
          handleLogout();
        } else {
          setIsAuthenticated(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSave(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // 3. Initialize Game Canvas Engine
  useEffect(() => {
    if (!isAuthenticated) return;
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;

    // Start engine with update callback
    engineRef.current = createIslandEmpireGame(canvas, (engineState, engineTowns) => {
      const now = Date.now();
      // Throttle React state updates to ~100ms to preserve performance
      if (now - lastUpdateRef.current < 100) return;
      lastUpdateRef.current = now;

      setResources({ ...engineState.resources });
      setMissions([...engineState.missions]);
      setChatLog([...engineState.log]);
      setXp(engineState.xp || 68);
      setLevel(engineState.level || 25);
      setToastMessage(engineState.toast || "");

      const selected = engineTowns.find((t: any) => t.id === engineState.selected);
      setSelectedTown(selected ? { ...selected } : null);
    }, minimapCanvasRef.current);

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, [isAuthenticated]);

  // 4. Periodically auto-sync client localsave to server
  useEffect(() => {
    if (!isAuthenticated || offlineMode || !token) return;

    const intervalId = setInterval(async () => {
      const localRaw = localStorage.getItem(SAVE_KEY);
      if (!localRaw) return;
      if (localRaw === lastSyncedRef.current) return;

      try {
        const localData = JSON.parse(localRaw);
        if (!localData.resources || !Array.isArray(localData.towns)) return;

        const mappedSave = {
          resources: localData.resources,
          towns: localData.towns.map((t: any) => ({
            id: t.id,
            level: t.lvl,
            ownerId: String(t.owner),
            troops: t.troops,
          })),
        };

        await putSave(token, mappedSave);
        lastSyncedRef.current = localRaw;
        console.log("Cloud save synced successfully");
      } catch (e) {
        console.error("Failed to sync cloud save:", e);
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, offlineMode, token]);

  const handleLoginSuccess = (newToken: string, newPlayerId: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(PLAYER_ID_KEY, newPlayerId);
    setToken(newToken);
    setPlayerId(newPlayerId);
    setOfflineMode(false);
  };

  const handlePlayOffline = () => {
    setOfflineMode(true);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);
    setToken(null);
    setPlayerId(null);
    setIsAuthenticated(false);
    setOfflineMode(false);
    lastSyncedRef.current = null;
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
  };

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

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    engineRef.current?.sendChat(chatInput.trim());
    setChatInput("");
  };

  if (!isAuthenticated && !offlineMode && !token) {
    return <LoginScreen onSuccess={handleLoginSuccess} onPlayOffline={handlePlayOffline} />;
  }

  if (loadingSave) {
    return (
      <div className="login-bg">
        <div className="crt-overlay" />
        <div className="stars-container" />
        <div className="pixel-loading blink">ĐANG TẢI DỮ LIỆU ĐÁM MÂY...</div>
      </div>
    );
  }

  return (
    <main className="game-shell">
      {/* Background Interactive Game Canvas */}
      <canvas 
        ref={canvasRef} 
        id="game" 
        style={{ width: "100vw", height: "100vh", position: "absolute", inset: 0, zIndex: 1 }} 
        aria-label="Đế Chế Đảo Pixel" 
      />
      
      {/* High Fidelity HTML Overlay HUD */}
      <div className="hud-wrapper">
        
        {/* TOP BAR */}
        <div className="hud-topbar hud-interactive">
          {/* Profile Badge */}
          <div className="hud-profile">
            <div className="hud-avatar">
              <svg viewBox="0 0 24 24">
                <path d="M19,4H5A2,2 0 0,0 3,6V18A2,2 0 0,0 5,20H19A2,2 0 0,0 21,18V6A2,2 0 0,0 19,4M19,7.5C19,7.5 16,9 12,9C8,9 5,7.5 5,7.5V6C5,6 8,7.5 12,7.5C16,7.5 19,6 19,6V7.5M19,12C19,12 16,13.5 12,13.5C8,13.5 5,12 5,12V10.5C5,10.5 8,12 12,12C16,12 19,10.5 19,10.5V12M19,16.5C19,16.5 16,18 12,18C8,18 5,16.5 5,16.5V15C5,15 8,16.5 12,16.5C16,16.5 19,15 19,15V16.5Z" />
              </svg>
            </div>
            <div className="hud-profile-info">
              <div className="hud-level-line">
                <span className="hud-lvl-text">LV. {level}</span>
                <span className="hud-pct-text">{xp}%</span>
              </div>
              <div className="hud-xp-bg">
                <div className="hud-xp-fill" style={{ width: `${xp}%` }} />
              </div>
            </div>
          </div>

          {/* Resources capsule row */}
          <div className="hud-resources">
            <div className="hud-res-item">
              <span className="hud-res-icon">🪙</span>
              <span className="hud-res-val">{formatNum(resources.gold)}</span>
            </div>
            <div className="hud-res-item">
              <span className="hud-res-icon">🪵</span>
              <span className="hud-res-val">{formatNum(resources.wood)}</span>
            </div>
            <div className="hud-res-item">
              <span className="hud-res-icon">🪨</span>
              <span className="hud-res-val">{formatNum(resources.stone)}</span>
            </div>
            <div className="hud-res-item">
              <span className="hud-res-icon">💎</span>
              <span className="hud-res-val">{formatNum(resources.gems)}</span>
            </div>
          </div>

          {/* Settings Control Row */}
          <div className="hud-controls">
            <div className="hud-ctrl-btn" title="Hòm Thư">✉️</div>
            <div className="hud-ctrl-btn" title="Thông báo">🔔</div>
            <div className="hud-ctrl-btn" onClick={handleFullscreenToggle} title="Cài đặt">⚙️</div>
            <div className="hud-ctrl-btn" title="Menu">☰</div>
          </div>
        </div>

        {/* MAIN HUD BODY */}
        <div className="hud-main">
          {/* LEFT PANELS */}
          <div className="hud-left-side hud-interactive">
            {/* Missions Card */}
            <div className="hud-card">
              <h2 className="hud-card-title">📜 NHIỆM VỤ</h2>
              {missions.map((m, i) => (
                <div key={i} className="hud-mission-item">
                  <span>
                    <span className="hud-mission-bullet">•</span>
                    {m.text.charAt(0).toUpperCase() + m.text.slice(1).toLowerCase()}
                  </span>
                  <span style={{ color: "#ffd34d", fontWeight: "bold" }}>
                    {m.value}/{m.goal}
                  </span>
                </div>
              ))}
            </div>

            {/* Information Card */}
            <div className="hud-card">
              <h2 className="hud-card-title">📊 THÔNG TIN</h2>
              <div className="hud-info-row">
                <span>LÃNH THỔ</span>
                <span className="hud-info-val">{townsCountText()}</span>
              </div>
              <div className="hud-info-row">
                <span>QUÂN ĐỘI</span>
                <span className="hud-info-val">{troopsCountText()}</span>
              </div>
              <div className="hud-info-row">
                <span>CHIẾN LỰC</span>
                <span className="hud-info-val">{battlePower()}</span>
              </div>
            </div>

            {/* Left Vertical Actions list */}
            <div className="hud-menu-group">
              <button type="button" className="hud-menu-btn" onClick={() => handleAction("army")}>
                🛡️ QUÂN ĐỘI (TUYỂN QUÂN)
              </button>
              <button type="button" className="hud-menu-btn" onClick={() => handleAction("build")}>
                🔨 XÂY DỰNG (NÂNG CẤP THÀNH)
              </button>
              <button type="button" className="hud-menu-btn" onClick={() => handleAction("research")}>
                📖 NGHIÊN CỨU (KHOA HỌC)
              </button>
              <button type="button" className="hud-menu-btn">
                🌍 BẢN ĐỒ THẾ GIỚI
              </button>
              <button type="button" className="hud-menu-btn">
                🏆 XẾP HẠNG THÀNH TÍCH
              </button>
            </div>
          </div>

          {/* RIGHT PANELS */}
          <div className="hud-right-side hud-interactive">
            {/* Widescreen square action buttons */}
            <div className="hud-right-btn-grid">
              <div className="hud-sq-btn" onClick={() => handleAction("treasure")}>
                <span className="hud-sq-btn-icon">📦</span>
                <span className="hud-sq-btn-lbl">BẢO VẬT</span>
              </div>
              <div className="hud-sq-btn" onClick={() => handleAction("ally")}>
                <span className="hud-sq-btn-icon">🏪</span>
                <span className="hud-sq-btn-lbl">TIỆM SHOP</span>
              </div>
              <div className="hud-sq-btn" onClick={() => handleAction("map")}>
                <span className="hud-sq-btn-icon">🗺️</span>
                <span className="hud-sq-btn-lbl">BẢN ĐỒ</span>
              </div>
              <div className="hud-sq-btn" onClick={() => handleAction("event")}>
                <span className="hud-sq-btn-icon">⭐</span>
                <span className="hud-sq-btn-lbl">SỰ KIỆN</span>
              </div>
            </div>

            {/* Premium Minimap component */}
            <div className="hud-minimap-card">
              <canvas 
                ref={minimapCanvasRef} 
                width={160} 
                height={120} 
                className="hud-minimap-canvas" 
                style={{ width: "100%", height: "90px", display: "block", background: "#11364a", border: "1px solid rgba(184, 141, 48, 0.2)", borderRadius: "4px" }} 
              />
              <div className="hud-minimap-zoom">
                <button type="button" className="hud-zoom-ctrl" onClick={() => handleAction("zoomOut")}>−</button>
                <span style={{ fontSize: "10px", color: "#aebfd4" }}>🔍 BẢN ĐỒ</span>
                <button type="button" className="hud-zoom-ctrl" onClick={() => handleAction("zoomIn")}>+</button>
              </div>
            </div>

            {/* Cloud sync Action Buttons */}
            <div className="hud-action-group">
              {token ? (
                <>
                  <button type="button" className="hud-btn blue" style={{ cursor: "default" }}>
                    👤 ĐÃ ĐĂNG NHẬP
                  </button>
                  <button type="button" className="hud-btn green" onClick={handleLogout}>
                    🔗 ĐĂNG XUẤT CLOUD
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="hud-btn blue" onClick={handleLogout}>
                    🔑 ĐĂNG NHẬP
                  </button>
                  <button type="button" className="hud-btn green" onClick={handlePlayOffline}>
                    🔌 KẾT NỐI GAME
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="hud-bottombar">
          {/* Chat box bottom left */}
          <div className="hud-chat-box hud-interactive">
            <div className="hud-chat-header">💬 TRÒ CHUYỆN</div>
            <div className="hud-chat-lines">
              {chatLog.map((line, i) => {
                const chat = parseChatLine(line);
                return (
                  <div key={i} className="hud-chat-line">
                    <span className={`hud-chat-channel ${chat.channel === "LIÊN MINH" ? "alliance" : "world"}`}>
                      [{chat.channel}]
                    </span>
                    <span className="hud-chat-name">{chat.name}: </span>
                    <span className="hud-chat-msg">{chat.message}</span>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleChatSubmit} className="hud-chat-input-bar">
              <input
                type="text"
                className="hud-chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhập tin nhắn..."
                maxLength={100}
              />
              <button type="submit" className="hud-chat-send">
                ▶
              </button>
            </form>
          </div>

          {/* Toast Message or Selected Town HUD Panel (Bottom Center) */}
          {selectedTown ? (
            <div className="hud-selected-town-panel hud-card hud-interactive">
              <div className="hud-town-title" style={{ color: selectedTown.owner === 0 ? "#73e05e" : "#ff7675" }}>
                THÀNH {selectedTown.id} - {selectedTown.owner === 0 ? "BẠN SỞ HỮU" : `ĐỐI THỦ ${selectedTown.owner}`}
              </div>
              <div className="hud-town-subtitle">
                CẤP {selectedTown.lvl}  |  QUÂN LỰC: {selectedTown.troops}
              </div>
              <div style={{ fontSize: "11px", color: "#b5c7d8", marginTop: "4px" }}>
                {toastMessage}
              </div>
            </div>
          ) : (
            <div className="hud-selected-town-panel hud-card" style={{ padding: "8px 16px" }}>
              <div style={{ fontSize: "11.5px", color: "#ffd34d", fontWeight: "bold" }}>
                📢 {toastMessage}
              </div>
            </div>
          )}

          {/* Connection Pill bottom right */}
          <div 
            className="connection-pill hud-interactive" 
            data-online={apiOnline === true} 
            style={{ position: "static", pointerEvents: "none" }}
          >
            {apiOnline === null ? "ĐANG KIỂM TRA API" : apiOnline ? "API ONLINE" : "CHƠI OFFLINE"}
          </div>
        </div>

      </div>
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


