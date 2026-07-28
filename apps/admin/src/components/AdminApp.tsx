import { FormEvent, useEffect, useState, useCallback } from "react";
import type { AdminOverview, AdminPlayer, TerritoryInfo, SaveSnapshot } from "@island/shared";
import {
  loginAdmin, getOverview, getPlayers, getPlayerSave,
  resetPlayerSave, deletePlayer, getTerritories, resetTerritory, resetAllTerritories, claimTerritory,
  getGameConfig, updateGameConfig,
} from "../api";

const TOKEN_KEY = "island_admin_token";

type Tab = "overview" | "players" | "territories" | "config";

const BIOME_COLORS: Record<number, string> = {
  0: "#4a9e38",  // Grass
  1: "#d4a84b",  // Desert
  2: "#aaccdd",  // Snow
  3: "#c44c20",  // Ember
  4: "#8840c0",  // Violet
  5: "#e0609a",  // Rose
  6: "#2a6e28",  // Pine
  7: "#3a7d50",  // Swamp
};

const BIOME_BADGE_TEXT: Record<number, string> = {
  0: "CỎ", 1: "SA MẠC", 2: "TUYẾT", 3: "LỬA",
  4: "MA THUẬT", 5: "HỒNG", 6: "RỪNG", 7: "ĐẦM",
};

export function AdminApp() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [territories, setTerritories] = useState<TerritoryInfo[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [biomeFilter, setBiomeFilter] = useState<number | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "wild" | "owned">("all");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [viewSave, setViewSave] = useState<{ playerId: string; save: SaveSnapshot | null } | null>(null);
  const [claimDialog, setClaimDialog] = useState<{ territoryId: number } | null>(null);
  const [claimTarget, setClaimTarget] = useState("");
  const [configData, setConfigData] = useState<any>({
    maxBattleDuration: 15,
    infantryCostGold: 100,
    infantryCostWood: 30,
    infantryTroopsValue: 15,
    cavalryCostGold: 200,
    cavalryCostWood: 60,
    cavalryCostStone: 30,
    cavalryTroopsValue: 40,
    artilleryCostGold: 350,
    artilleryCostStone: 150,
    artilleryTroopsValue: 80,
    settlerSpeed: 350,
    infantrySpeed: 200,
    cavalrySpeed: 350,
    artillerySpeed: 100,
    shipSpeed: 150,
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  useEffect(() => {
    if (!token) return;
    getOverview(token).then(setOverview).catch(() => setError("Không tải được dashboard."));
  }, [token]);

  useEffect(() => {
    if (!token || tab !== "players") return;
    getPlayers(token).then((r) => setPlayers(r.players)).catch(() => setError("Lỗi tải danh sách người chơi."));
  }, [token, tab]);

  useEffect(() => {
    if (!token || tab !== "territories") return;
    getTerritories(token).then((r) => setTerritories(r.territories)).catch(() => setError("Lỗi tải lãnh thổ."));
  }, [token, tab]);

  useEffect(() => {
    if (!token || tab !== "config") return;
    getGameConfig().then(setConfigData).catch(() => setError("Lỗi tải cấu hình game."));
  }, [token, tab]);

  async function handleConfigSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const updated = {
      maxBattleDuration: Number(form.get("maxBattleDuration")),
      infantryCostGold: Number(form.get("infantryCostGold")),
      infantryCostWood: Number(form.get("infantryCostWood")),
      infantryTroopsValue: Number(form.get("infantryTroopsValue")),
      cavalryCostGold: Number(form.get("cavalryCostGold")),
      cavalryCostWood: Number(form.get("cavalryCostWood")),
      cavalryCostStone: Number(form.get("cavalryCostStone")),
      cavalryTroopsValue: Number(form.get("cavalryTroopsValue")),
      artilleryCostGold: Number(form.get("artilleryCostGold")),
      artilleryCostStone: Number(form.get("artilleryCostStone")),
      artilleryTroopsValue: Number(form.get("artilleryTroopsValue")),
      settlerSpeed: Number(form.get("settlerSpeed")),
      infantrySpeed: Number(form.get("infantrySpeed")),
      cavalrySpeed: Number(form.get("cavalrySpeed")),
      artillerySpeed: Number(form.get("artillerySpeed")),
      shipSpeed: Number(form.get("shipSpeed")),
    };

    setLoadingId("config-save");
    try {
      const r = await updateGameConfig(token, updated);
      if (r.ok) {
        showToast("Cập nhật cấu hình game thành công!");
        setConfigData(r.config);
      }
    } catch {
      setError("Không thể lưu cấu hình game.");
    }
    setLoadingId(null);
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await loginAdmin(String(form.get("username")), String(form.get("password")));
      localStorage.setItem(TOKEN_KEY, result.token);
      setToken(result.token);
    } catch {
      setError("Sai tài khoản hoặc mật khẩu admin.");
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setOverview(null);
    setPlayers([]);
    setTerritories([]);
  }

  async function handleResetSave(playerId: string) {
    if (!confirm(`Reset save của ${playerId}?`)) return;
    setLoadingId(`reset-${playerId}`);
    try {
      const r = await resetPlayerSave(token, playerId);
      showToast(r.message);
    } catch { showToast("Lỗi reset save."); }
    setLoadingId(null);
  }

  async function handleDeletePlayer(playerId: string) {
    if (!confirm(`XÓA HOÀN TOÀN tài khoản ${playerId}? Hành động không thể hoàn tác!`)) return;
    setLoadingId(`del-${playerId}`);
    try {
      const r = await deletePlayer(token, playerId);
      showToast(r.message);
      setPlayers((p) => p.filter((x) => x.id !== playerId));
    } catch { showToast("Lỗi xóa tài khoản."); }
    setLoadingId(null);
  }

  async function handleViewSave(playerId: string) {
    setLoadingId(`view-${playerId}`);
    try {
      const save = await getPlayerSave(token, playerId);
      setViewSave({ playerId, save });
    } catch { showToast("Lỗi tải save."); }
    setLoadingId(null);
  }

  async function handleResetTerritory(id: number) {
    setLoadingId(`terr-${id}`);
    try {
      const r = await resetTerritory(token, id);
      showToast(r.message);
      setTerritories((prev) => prev.map((t) => t.id === id ? { ...t, ownerId: null } : t));
    } catch { showToast("Lỗi reset lãnh thổ."); }
    setLoadingId(null);
  }

  async function handleResetAllTerritories() {
    if (!window.confirm("Reset sạch toàn bộ lãnh thổ, khai hoang, hành quân và save thành trì?")) return;
    setLoadingId("territories-reset-all");
    try {
      const r = await resetAllTerritories(token);
      showToast(r.message);
      const refreshed = await getTerritories(token);
      setTerritories(refreshed.territories);
    } catch { showToast("Lỗi reset toàn bộ lãnh thổ."); }
    setLoadingId(null);
  }

  async function handleClaimTerritory() {
    if (!claimDialog || !claimTarget.trim()) return;
    setLoadingId(`claim-${claimDialog.territoryId}`);
    try {
      const r = await claimTerritory(token, claimDialog.territoryId, claimTarget.trim());
      showToast(r.message);
      setTerritories((prev) => prev.map((t) => t.id === claimDialog.territoryId ? { ...t, ownerId: claimTarget.trim() } : t));
      setClaimDialog(null);
      setClaimTarget("");
    } catch { showToast("Lỗi giao lãnh thổ."); }
    setLoadingId(null);
  }

  const filteredPlayers = players.filter((p) =>
    playerSearch === "" || p.id.toLowerCase().includes(playerSearch.toLowerCase()) || p.name.toLowerCase().includes(playerSearch.toLowerCase())
  );

  const filteredTerritories = territories.filter((t) => {
    if (biomeFilter !== "all" && t.biome !== biomeFilter) return false;
    if (ownerFilter === "wild" && t.ownerId !== null) return false;
    if (ownerFilter === "owned" && t.ownerId === null) return false;
    return true;
  });

  if (!token) {
    return (
      <main className="admin-shell">
        <form className="login-panel" onSubmit={onLogin}>
          <div className="login-logo">
            <svg width="48" height="48" viewBox="0 0 48 48">
              <polygon points="24,3 44,18 37,42 11,42 4,18" fill="#1a3a5a" stroke="#f0c030" strokeWidth="2"/>
              <polygon points="24,8 40,20 34,40 14,40 8,20" fill="#0d2035"/>
              <rect x="18" y="22" width="12" height="14" fill="#f0c030" opacity="0.85"/>
              <rect x="21" y="16" width="6" height="8" fill="#ffd34d"/>
              <rect x="23" y="12" width="2" height="6" fill="#fff"/>
            </svg>
          </div>
          <h1>Island Empire</h1>
          <p className="login-sub">ADMIN PANEL</p>
          <label>
            Tài khoản
            <input id="admin-username" name="username" autoComplete="username" required minLength={3} placeholder="admin" />
          </label>
          <label>
            Mật khẩu
            <input id="admin-password" name="password" type="password" autoComplete="current-password" required minLength={8} placeholder="••••••••" />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button id="admin-login-btn" type="submit">ĐĂNG NHẬP</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      {/* Toast */}
      {toast && <div className="admin-toast">{toast}</div>}

      {/* Save Modal */}
      {viewSave && (
        <div className="modal-overlay" onClick={() => setViewSave(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Save của {viewSave.playerId}</div>
            {viewSave.save ? (
              <div className="save-detail">
                <div className="save-row"><span>Vàng</span><strong>{viewSave.save.resources.gold.toFixed(0)}</strong></div>
                <div className="save-row"><span>Gỗ</span><strong>{viewSave.save.resources.wood.toFixed(0)}</strong></div>
                <div className="save-row"><span>Đá</span><strong>{viewSave.save.resources.stone.toFixed(0)}</strong></div>
                <div className="save-row"><span>Gems</span><strong>{viewSave.save.resources.gems.toFixed(0)}</strong></div>
                <div className="save-row"><span>Số thành</span><strong>{viewSave.save.towns?.length ?? 0}</strong></div>
                <div className="save-row"><span>Cập nhật</span><strong>{viewSave.save.updatedAt ? new Date(viewSave.save.updatedAt).toLocaleString("vi-VN") : "—"}</strong></div>
              </div>
            ) : <p style={{ color: "#aaa" }}>Chưa có bản lưu.</p>}
            <button className="btn-close" onClick={() => setViewSave(null)}>ĐÓNG</button>
          </div>
        </div>
      )}

      {/* Claim Territory Modal */}
      {claimDialog && (
        <div className="modal-overlay" onClick={() => setClaimDialog(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Giao lãnh thổ #{claimDialog.territoryId}</div>
            <label style={{ display:"grid", gap:8, marginTop:16 }}>
              Player ID
              <input value={claimTarget} onChange={(e) => setClaimTarget(e.target.value)} placeholder="player:ten-nguoi-dung" />
            </label>
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button className="btn-action btn-success" onClick={handleClaimTerritory}>XÁC NHẬN</button>
              <button className="btn-action btn-neutral" onClick={() => setClaimDialog(null)}>HỦY</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="sidebar-brand">
            <svg width="28" height="28" viewBox="0 0 28 28">
              <polygon points="14,2 26,10 22,26 6,26 2,10" fill="#1a3a5a" stroke="#f0c030" strokeWidth="1.5"/>
              <rect x="10" y="14" width="8" height="9" fill="#f0c030" opacity="0.85"/>
              <rect x="12" y="9" width="4" height="6" fill="#ffd34d"/>
            </svg>
            <span>ADMIN</span>
          </div>
          <nav className="sidebar-nav">
            <button id="tab-overview" className={`sidebar-btn ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>
              <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="8" width="4" height="7" rx="0.5" fill="currentColor"/><rect x="6" y="5" width="4" height="10" rx="0.5" fill="currentColor"/><rect x="11" y="1" width="4" height="14" rx="0.5" fill="currentColor"/></svg>
              Tổng quan
            </button>
            <button id="tab-players" className={`sidebar-btn ${tab === "players" ? "active" : ""}`} onClick={() => setTab("players")}>
              <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="5" r="3" fill="currentColor"/><path d="M2 14 C2 10 14 10 14 14" fill="currentColor"/></svg>
              Người chơi
              {players.length > 0 && <span className="badge">{players.length}</span>}
            </button>
            <button id="tab-territories" className={`sidebar-btn ${tab === "territories" ? "active" : ""}`} onClick={() => setTab("territories")}>
              <svg width="16" height="16" viewBox="0 0 16 16"><polygon points="2,2 6,4 10,2 14,4 14,14 10,12 6,14 2,12" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
              Lãnh thổ
              {territories.length > 0 && <span className="badge">{territories.length}</span>}
            </button>
            <button id="tab-config" className={`sidebar-btn ${tab === "config" ? "active" : ""}`} onClick={() => setTab("config")}>
              <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="1" x2="8" y2="4" stroke="currentColor" strokeWidth="1.5"/><line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5"/><line x1="1" y1="8" x2="4" y2="8" stroke="currentColor" strokeWidth="1.5"/><line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5"/></svg>
              Cấu hình game
            </button>
          </nav>
          <div className="sidebar-footer">
            <button id="admin-logout-btn" className="sidebar-btn danger" onClick={logout}>
              <svg width="14" height="14" viewBox="0 0 14 14"><path d="M5 2 L2 2 L2 12 L5 12" fill="none" stroke="currentColor" strokeWidth="1.3"/><line x1="5" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.3"/><polyline points="10,5 12,7 10,9" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>
              Đăng xuất
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="admin-content">
          {error && <div className="error-bar">{error}<button onClick={() => setError("")}>✕</button></div>}

          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <section className="tab-section">
              <h2 className="section-title">Tổng quan hệ thống</h2>
              <div className="metric-grid">
                <MetricCard
                  label="Người chơi" value={overview?.players ?? "..."}
                  icon={<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="7" r="4.5" fill="#4ac8ff"/><path d="M3 20 C3 14 19 14 19 20" fill="#4ac8ff"/></svg>}
                  color="#4ac8ff"
                />
                <MetricCard
                  label="Bản lưu" value={overview?.saves ?? "..."}
                  icon={<svg width="22" height="22" viewBox="0 0 22 22"><rect x="3" y="4" width="16" height="14" rx="2" fill="none" stroke="#f0c030" strokeWidth="1.5"/><rect x="7" y="4" width="8" height="5" rx="1" fill="#f0c030"/><rect x="6" y="12" width="10" height="1.5" rx="0.5" fill="#f0c030" opacity="0.5"/></svg>}
                  color="#f0c030"
                />
                <MetricCard
                  label="Online 24h" value={overview?.activeToday ?? "..."}
                  icon={<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" fill="none" stroke="#4ade80" strokeWidth="1.5"/><circle cx="11" cy="11" r="3.5" fill="#4ade80"/></svg>}
                  color="#4ade80"
                />
              </div>
              <div className="info-box">
                <p>Hệ thống Island Empire đang chạy bình thường. Chọn tab <strong>Người chơi</strong> hoặc <strong>Lãnh thổ</strong> để quản lý.</p>
              </div>
            </section>
          )}

          {/* ── PLAYERS TAB ── */}
          {tab === "players" && (
            <section className="tab-section">
              <div className="section-header">
                <h2 className="section-title">Quản lý người chơi</h2>
                <div className="search-bar">
                  <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="5.5" cy="5.5" r="4" fill="none" stroke="#aaa" strokeWidth="1.3"/><line x1="8.5" y1="8.5" x2="13" y2="13" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <input
                    id="player-search"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc ID..."
                  />
                </div>
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên</th>
                      <th>Role</th>
                      <th>Ngày tạo</th>
                      <th>Lần online cuối</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: "center", color: "#666", padding: "32px" }}>Chưa có người chơi nào.</td></tr>
                    )}
                    {filteredPlayers.map((p) => (
                      <tr key={p.id}>
                        <td><code className="id-cell">{p.id}</code></td>
                        <td><strong>{p.name}</strong></td>
                        <td><span className={`role-badge ${p.role}`}>{p.role.toUpperCase()}</span></td>
                        <td className="date-cell">{p.createdAt ? new Date(p.createdAt).toLocaleDateString("vi-VN") : "—"}</td>
                        <td className="date-cell">{p.lastSeenAt ? new Date(p.lastSeenAt).toLocaleString("vi-VN") : "—"}</td>
                        <td>
                          <div className="action-group">
                            <button
                              className="btn-action btn-info"
                              disabled={loadingId === `view-${p.id}`}
                              onClick={() => handleViewSave(p.id)}
                              title="Xem Save"
                            >
                              {loadingId === `view-${p.id}` ? "..." : "XEM SAVE"}
                            </button>
                            <button
                              className="btn-action btn-warning"
                              disabled={loadingId === `reset-${p.id}`}
                              onClick={() => handleResetSave(p.id)}
                              title="Reset Save"
                            >
                              {loadingId === `reset-${p.id}` ? "..." : "RESET"}
                            </button>
                            <button
                              className="btn-action btn-danger"
                              disabled={loadingId === `del-${p.id}`}
                              onClick={() => handleDeletePlayer(p.id)}
                              title="Xóa tài khoản"
                            >
                              {loadingId === `del-${p.id}` ? "..." : "XÓA"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── TERRITORIES TAB ── */}
          {tab === "territories" && (
            <section className="tab-section">
              <div className="section-header">
                <h2 className="section-title">Quản lý lãnh thổ ({filteredTerritories.length}/{territories.length})</h2>
                <div className="filter-bar">
                  <button
                    type="button"
                    className="quick-filter-btn danger"
                    disabled={loadingId === "territories-reset-all"}
                    onClick={handleResetAllTerritories}
                  >
                    RESET SẠCH TẤT CẢ LÃNH THỔ
                  </button>
                  <select id="biome-filter" value={biomeFilter} onChange={(e) => setBiomeFilter(e.target.value === "all" ? "all" : Number(e.target.value))}>
                    <option value="all">Tất cả Biome</option>
                    <option value={0}>Cỏ xanh</option>
                    <option value={1}>Sa mạc</option>
                    <option value={2}>Tuyết</option>
                    <option value={3}>Lửa/Ember</option>
                    <option value={4}>Ma thuật tím</option>
                    <option value={5}>Hoa hồng</option>
                    <option value={6}>Rừng thông</option>
                    <option value={7}>Đầm lầy</option>
                  </select>
                  <select id="owner-filter" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value as "all"|"wild"|"owned")}>
                    <option value="all">Tất cả trạng thái</option>
                    <option value="wild">Hoang dã</option>
                    <option value="owned">Đã chiếm</option>
                  </select>
                </div>
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Loại</th>
                      <th>Biome</th>
                      <th>Tọa độ</th>
                      <th>Khai hoang</th>
                      <th>Tài nguyên chính</th>
                      <th>Tốc độ (per giây)</th>
                      <th>Chủ sở hữu</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTerritories.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign:"center", color:"#666", padding:"32px" }}>Không có lãnh thổ nào.</td></tr>
                    )}
                    {filteredTerritories.map((t) => (
                      <tr key={t.id}>
                        <td><code className="id-cell">#{t.id}</code></td>
                        <td><span className={`type-badge ${t.isIslet ? "islet" : "mainland"}`}>{t.isIslet ? "ĐẢO NHỎ" : "LỤC ĐỊA"}</span></td>
                        <td>
                          <span className="biome-badge" style={{ background: BIOME_COLORS[t.biome] + "33", color: BIOME_COLORS[t.biome], border: `1px solid ${BIOME_COLORS[t.biome]}66` }}>
                            {BIOME_BADGE_TEXT[t.biome] ?? t.biome}
                          </span>
                        </td>
                        <td className="coord-cell">
                          <span className="coord-x">X:{t.x}</span>
                          <span className="coord-y">Y:{t.y}</span>
                        </td>
                        <td>
                          <span className="clearing-badge">
                            ⏱ {t.clearingSeconds ?? "?"}s
                          </span>
                        </td>
                        <td className="primary-res-cell">{t.primaryResource ?? "—"}</td>
                        <td>
                          <div className="yield-chips">
                            {(t.yieldGold ?? 0) > 0    && <span className="yield-chip gold">🟡 {t.yieldGold}/s</span>}
                            {(t.yieldWood ?? 0) > 0    && <span className="yield-chip wood">🟤 {t.yieldWood}/s</span>}
                            {(t.yieldStone ?? 0) > 0   && <span className="yield-chip stone">⬜ {t.yieldStone}/s</span>}
                            {(t.yieldGems ?? 0) > 0    && <span className="yield-chip gems">💠 {t.yieldGems}/s</span>}
                          </div>
                        </td>
                        <td>
                          {t.ownerId
                            ? <code className="id-cell owner">{t.ownerId}</code>
                            : <span className="wild-badge">HOANG DÃ</span>
                          }
                        </td>
                        <td>
                          <div className="action-group">
                            <button
                              className="btn-action btn-warning"
                              disabled={loadingId === `terr-${t.id}`}
                              onClick={() => handleResetTerritory(t.id)}
                            >
                              RESET
                            </button>
                            <button
                              className="btn-action btn-success"
                              onClick={() => { setClaimDialog({ territoryId: t.id }); setClaimTarget(""); }}
                            >
                              GIAO
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === "config" && (
            <section className="tab-section">
              <header className="tab-header">
                <h2>Cấu hình tham số Game</h2>
                <p>Điều chỉnh các thông số cân bằng, tài nguyên và tốc độ trong game</p>
              </header>

              {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

              <form onSubmit={handleConfigSubmit} style={{ maxWidth: 600, display: "grid", gap: 16, background: "rgba(13, 20, 31, 0.4)", padding: 24, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 6, margin: 0 }}>⚔️ CHIẾN ĐẤU & GIAO TRANH</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    Thời gian giao tranh tối đa (giây)
                    <input type="number" name="maxBattleDuration" defaultValue={configData.maxBattleDuration} min={5} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    Tốc độ di chuyển Nông dân
                    <input type="number" name="settlerSpeed" defaultValue={configData.settlerSpeed} min={50} max={1500} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                </div>

                <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 6, margin: "12px 0 0 0" }}>🗡️ CHIÊU MỘ BỘ BINH</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    Giá Vàng (Bộ binh)
                    <input type="number" name="infantryCostGold" defaultValue={configData.infantryCostGold} min={0} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    Giá Gỗ (Bộ binh)
                    <input type="number" name="infantryCostWood" defaultValue={configData.infantryCostWood} min={0} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    Lực lượng cộng thêm
                    <input type="number" name="infantryTroopsValue" defaultValue={configData.infantryTroopsValue} min={1} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                </div>

                <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 6, margin: "12px 0 0 0" }}>🏇 CHIÊU MỘ KỊ BÌNH</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    Giá Vàng (Kị binh)
                    <input type="number" name="cavalryCostGold" defaultValue={configData.cavalryCostGold} min={0} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    Giá Gỗ (Kị binh)
                    <input type="number" name="cavalryCostWood" defaultValue={configData.cavalryCostWood} min={0} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    Giá Đá (Kị binh)
                    <input type="number" name="cavalryCostStone" defaultValue={configData.cavalryCostStone} min={0} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    Lực lượng cộng thêm
                    <input type="number" name="cavalryTroopsValue" defaultValue={configData.cavalryTroopsValue} min={1} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                </div>

                <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 6, margin: "12px 0 0 0" }}>💣 CHIÊU MỘ PHÁO BINH</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    Giá Vàng (Pháo binh)
                    <input type="number" name="artilleryCostGold" defaultValue={configData.artilleryCostGold} min={0} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    Giá Đá (Pháo binh)
                    <input type="number" name="artilleryCostStone" defaultValue={configData.artilleryCostStone} min={0} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    Lực lượng cộng thêm
                    <input type="number" name="artilleryTroopsValue" defaultValue={configData.artilleryTroopsValue} min={1} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                </div>

                <h3 style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 6, margin: "12px 0 0 0" }}>⚡ TỐC ĐỘ DI CHUYỂN QUÂN</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    Tốc độ Bộ binh
                    <input type="number" name="infantrySpeed" defaultValue={configData.infantrySpeed} min={10} max={1500} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    Tốc độ Kị binh
                    <input type="number" name="cavalrySpeed" defaultValue={configData.cavalrySpeed} min={10} max={1500} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    Tốc độ Pháo binh
                    <input type="number" name="artillerySpeed" defaultValue={configData.artillerySpeed} min={10} max={1500} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    Tốc độ Thuyền
                    <input type="number" name="shipSpeed" defaultValue={configData.shipSpeed} min={10} max={1500} required style={{ padding: 8, background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff" }} />
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button type="submit" disabled={loadingId === "config-save"} style={{ padding: "10px 24px", background: "linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)", color: "#fff", border: "none", borderRadius: 4, fontWeight: "bold", cursor: "pointer" }}>
                    {loadingId === "config-save" ? "ĐANG LƯU..." : "LƯU CẤU HÌNH"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <article className="metric-card">
      <div className="metric-icon" style={{ color }}>{icon}</div>
      <div>
        <span className="metric-label">{label}</span>
        <strong className="metric-value" style={{ color }}>{value}</strong>
      </div>
    </article>
  );
}
