import React, { useState } from "react";
import type { ArmyStateSnapshot } from "@island/shared";
import { MedievalModal } from "./MedievalModal";
import { AssetIcon } from "./AssetIcon";

interface Town {
  id: number;
  x: number;
  y: number;
  lvl: number;
  owner: number;
  troops: number;
}

interface ArmyModalProps {
  army: ArmyStateSnapshot | null;
  onCenterCamera: (town: Town) => void;
  onClose: () => void;
}

// Vector SVGs (Zero Emojis)
const ShieldCrestSVG = () => {
  return <AssetIcon asset="defender" size={28} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} />;
  return (
  <svg viewBox="0 0 64 64" width="28" height="28" style={{ flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}>
    <path d="M32 4C18 8 10 18 10 34c0 16 14 24 22 28 8-4 22-12 22-28 0-16-8-26-22-30z" fill="#991b1b" stroke="#ca8a04" strokeWidth="2.5" />
    <path d="M32 8v48c6-3 16-10 16-22 0-12-4-20-16-26z" fill="#dc2626" />
    <rect x="29" y="16" width="6" height="32" fill="#ffd34d" />
    <rect x="16" y="29" width="32" height="6" fill="#ffd34d" />
  </svg>
  );
};

const CastleIconSVG = () => {
  return <AssetIcon asset="castle" size={22} />;
  return (
  <svg viewBox="0 0 64 64" width="22" height="22" style={{ flexShrink: 0 }}>
    <path d="M12 20h8v8h8v-8h8v8h8v-8h8v36H12z" fill="#cbd5e1" stroke="#334155" strokeWidth="2.5" />
    <path d="M26 40h12v16H26z" fill="#1e293b" />
  </svg>
  );
};

const HelmetIconSVG = () => {
  return <AssetIcon asset="troopTotal" size={22} />;
  return (
  <svg viewBox="0 0 64 64" width="22" height="22" style={{ flexShrink: 0 }}>
    <path d="M32 8C18 8 12 18 12 32v16h8v8h24v-8h8V32c0-14-6-24-20-24z" fill="#d97706" stroke="#78350f" strokeWidth="2" />
    <rect x="20" y="28" width="24" height="4" rx="1" fill="#fef08a" />
  </svg>
  );
};

const TentIconSVG = () => {
  return <AssetIcon asset="castle" size={22} />;
  return (
  <svg viewBox="0 0 64 64" width="22" height="22" style={{ flexShrink: 0 }}>
    <path d="M32 8L6 52h52z" fill="#b45309" stroke="#451a03" strokeWidth="2.5" />
    <polygon points="32,8 20,52 32,52" fill="#d97706" />
    <polygon points="32,32 26,52 38,52" fill="#1e293b" />
  </svg>
  );
};

const CityIconSVG = () => {
  return <AssetIcon asset="city" size={22} />;
  return (
  <svg viewBox="0 0 64 64" width="22" height="22" style={{ flexShrink: 0 }}>
    <path d="M8 24h14v32H8zm17-10h14v42H25zm17 14h14v28H42z" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
  </svg>
  );
};

const SwordsIconSVG = () => {
  return <AssetIcon asset="army" size={22} />;
  return (
  <svg viewBox="0 0 64 64" width="22" height="22" style={{ flexShrink: 0 }}>
    <path d="M48 8l8 8-36 36-4 4-4-4 4-36z" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
    <path d="M16 8l-8 8 36 36 4 4 4-4-4-36z" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
    <circle cx="32" cy="24" r="5" fill="#fef08a" />
  </svg>
  );
};

const SearchIconSVG = () => {
  return <AssetIcon asset="search" size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />;
  return (
  <svg viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 4, verticalAlign: "middle" }}>
    <circle cx="26" cy="26" r="16" fill="none" stroke="#cbd5e1" strokeWidth="3" />
    <path d="M38 38l16 16" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
  </svg>
  );
};

const FilterIconSVG = () => {
  return <AssetIcon asset="filter" size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />;
  return (
  <svg viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 4, verticalAlign: "middle" }}>
    <path d="M8 12h48L36 34v18l-8 4V34z" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
  </svg>
  );
};

const SoldierIconSVG = () => {
  return <AssetIcon asset="troopInfantry" size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />;
  return (
  <svg viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 4, verticalAlign: "middle" }}>
    <circle cx="32" cy="18" r="10" fill="#4ade80" />
    <path d="M14 54c0-12 8-20 18-20s18 8 18 20z" fill="#4ade80" />
  </svg>
  );
};

const ChartIconSVG = () => {
  return <AssetIcon asset="chart" size={18} style={{ marginRight: 6, verticalAlign: "middle" }} />;
  return (
  <svg viewBox="0 0 64 64" width="18" height="18" style={{ marginRight: 6, verticalAlign: "middle" }}>
    <rect x="10" y="34" width="10" height="20" rx="2" fill="#4ade80" />
    <rect x="27" y="22" width="10" height="32" rx="2" fill="#4ade80" />
    <rect x="44" y="10" width="10" height="44" rx="2" fill="#4ade80" />
  </svg>
  );
};

const CastleThumbnailSmall = () => {
  return <img src="/assets/kingdoms/kingdom_base.webp" alt="" width={60} height={44} style={{ borderRadius: 6, border: "1px solid rgba(254,240,138,0.4)", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.6)", objectFit: "cover" }} />;
  return (
  <svg viewBox="0 0 160 110" width="60" height="44" style={{ borderRadius: 6, border: "1px solid rgba(254,240,138,0.4)", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>
    <defs>
      <linearGradient id="skyGradCastle" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0f172a" />
        <stop offset="60%" stopColor="#1e3a5f" />
        <stop offset="100%" stopColor="#0b1320" />
      </linearGradient>
      <linearGradient id="wallGradCastle" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="50%" stopColor="#334155" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
      <linearGradient id="roofGradCastle" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
    </defs>
    <rect width="160" height="110" fill="url(#skyGradCastle)" />
    
    <rect x="24" y="44" width="22" height="50" fill="url(#wallGradCastle)" stroke="#0f172a" strokeWidth="1" />
    <polygon points="22,44 35,22 48,44" fill="url(#roofGradCastle)" stroke="#ca8a04" strokeWidth="1" />
    <rect x="33" y="14" width="2" height="10" fill="#ca8a04" />
    <polygon points="35,14 43,17 35,20" fill="#ef4444" />

    <rect x="114" y="44" width="22" height="50" fill="url(#wallGradCastle)" stroke="#0f172a" strokeWidth="1" />
    <polygon points="112,44 125,22 138,44" fill="url(#roofGradCastle)" stroke="#ca8a04" strokeWidth="1" />
    <rect x="123" y="14" width="2" height="10" fill="#ca8a04" />
    <polygon points="125,14 133,17 125,20" fill="#ef4444" />

    <rect x="46" y="52" width="68" height="42" fill="url(#wallGradCastle)" stroke="#0f172a" strokeWidth="1" />
    <rect x="46" y="46" width="10" height="8" fill="#475569" />
    <rect x="62" y="46" width="10" height="8" fill="#475569" />
    <rect x="78" y="46" width="10" height="8" fill="#475569" />
    <rect x="94" y="46" width="10" height="8" fill="#475569" />
    <rect x="104" y="46" width="10" height="8" fill="#475569" />

    <path d="M 70,94 L 70,72 A 10 10 0 0 1 90 72 L 90,94 Z" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
    <circle cx="80" cy="80" r="1.5" fill="#fef08a" />
  </svg>
  );
};

export const ArmyModal: React.FC<ArmyModalProps> = ({ army, onCenterCamera, onClose }) => {
  const [activeTab, setActiveTab] = useState<"all" | "cities" | "garrisons">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const playerTowns: Town[] = (army?.towns || []).map((town) => ({
    id: town.townId,
    x: town.x,
    y: town.y,
    lvl: town.level,
    owner: 0,
    troops: town.troops,
  }));
  const totalTroops = army?.totalTroops || 0;
  const garrisonTroops = army?.garrisonTroops || 0;
  const marchingCount = army?.marches.length || 0;

  const filteredTowns = playerTowns.filter((town) => {
    if (searchQuery.trim() === "") return true;
    return `thành phố #${town.id}`.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <MedievalModal title="QUÂN LỰC VƯƠNG QUỐC" onClose={onClose} width="980px" maxWidth="96vw">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Top 5 Stat Cards Overview Bar */}
        <div className="ka-top-stats-grid">
          <div className="ka-stat-card">
            <CastleIconSVG />
            <div className="info">
              <span className="label">TỔNG SỐ THÀNH</span>
              <span className="val">{playerTowns.length}</span>
            </div>
          </div>
          <div className="ka-stat-card">
            <HelmetIconSVG />
            <div className="info">
              <span className="label">TỔNG QUÂN SỐ</span>
              <span className="val">{garrisonTroops.toLocaleString("vi-VN")} <small>binh sĩ</small></span>
            </div>
          </div>
          <div className="ka-stat-card">
            <TentIconSVG />
            <div className="info">
              <span className="label">TỔNG ĐỒN TRÚ</span>
              <span className="val">{totalTroops.toLocaleString("vi-VN")} <small>binh sĩ</small></span>
            </div>
          </div>
          <div className="ka-stat-card">
            <CityIconSVG />
            <div className="info">
              <span className="label">THÀNH PHỐ</span>
              <span className="val">{playerTowns.length}</span>
            </div>
          </div>
          <div className="ka-stat-card">
            <SwordsIconSVG />
            <div className="info">
              <span className="label">ĐANG HÀNH QUÂN</span>
              <span className="val">{marchingCount} <small>đoàn</small></span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="ka-filter-bar">
          <div className="ka-tabs-group">
            <button
              type="button"
              className={`ka-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              TẤT CẢ ({playerTowns.length})
            </button>
            <button
              type="button"
              className={`ka-tab-btn ${activeTab === "cities" ? "active" : ""}`}
              onClick={() => setActiveTab("cities")}
            >
              THÀNH PHỐ ({playerTowns.length})
            </button>
            <button
              type="button"
              className={`ka-tab-btn ${activeTab === "garrisons" ? "active" : ""}`}
              onClick={() => setActiveTab("garrisons")}
            >
              ĐỒN TRÚ ({playerTowns.length})
            </button>
          </div>

          <div className="ka-search-controls">
            <div className="ka-search-input-box">
              <SearchIconSVG />
              <input
                type="text"
                placeholder="Tìm kiếm thành phố..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="button" className="ka-filter-dropdown-btn">
              <FilterIconSVG /> Lọc ▾
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="ka-table-container">
          <table className="ka-table">
            <thead>
              <tr>
                <th style={{ width: "24%" }}>THÀNH PHỐ</th>
                <th style={{ width: "12%" }}>TỌA ĐỘ</th>
                <th style={{ width: "11%" }}>LOẠI</th>
                <th style={{ width: "13%" }}>ĐỒN TRÚ</th>
                <th style={{ width: "13%" }}>QUÂN SỐ</th>
                <th style={{ width: "15%" }}>TRẠNG THÁI</th>
                <th style={{ width: "12%", textAlign: "center" }}>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {filteredTowns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">
                    Bạn chưa có thành phố nào! Hãy xây thành trên lãnh thổ mới.
                  </td>
                </tr>
              ) : (
                filteredTowns.map((town) => (
                  <tr key={town.id}>
                    <td>
                      <div className="ka-city-cell">
                        <CastleThumbnailSmall />
                        <div className="ka-city-details">
                          <div className="title-row">
                            <ShieldCrestSVG />
                            <span className="city-title">Thành phố #{town.id}</span>
                            <span className="level">(Cấp {town.lvl})</span>
                          </div>
                          <div className="owner-row">
                            ⭐ Chủ thành
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="ka-coords-cell">
                        <span>X:{Math.round(town.x)}</span>
                        <span>Y:{Math.round(town.y)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="ka-type-cell">
                        <CastleIconSVG />
                        <span>Thành phố</span>
                      </div>
                    </td>
                    <td>
                      <div className="ka-garrison-cell">
                        <span className="count green"><SoldierIconSVG /> {town.troops.toLocaleString("vi-VN")}</span>
                        <span className="sub">Đồn trú</span>
                      </div>
                    </td>
                    <td>
                      <div className="ka-troops-cell">
                        <span className="count white"><SwordsIconSVG /> {town.troops.toLocaleString("vi-VN")}</span>
                        <span className="sub">Tổng quân</span>
                      </div>
                    </td>
                    <td>
                      <div className="ka-status-cell">
                        <span className="status-dot green">🟢 Bình thường</span>
                        <span className="sub-status">Không bị tấn công</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="ka-detail-btn"
                        onClick={() => {
                          onCenterCamera(town);
                          onClose();
                        }}
                      >
                        <SearchIconSVG /> Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info Bar (100% Match Reference Art) */}
        <div className="ka-footer-bar">
          <div className="ka-footer-left">
            <span className="title">THÔNG TIN TỔNG QUAN</span>
            <span className="date">
              Cập nhật lần cuối: {army?.serverTime ? new Date(army.serverTime).toLocaleString("vi-VN") : "Đang đồng bộ"}
            </span>
          </div>

          <div className="ka-footer-stats">
            <div className="stat">
              <SwordsIconSVG />
              <div className="info">
                <span className="label">SỨC MẠNH QUÂN SỰ</span>
                <span className="val gold">{totalTroops.toLocaleString("vi-VN")}</span>
              </div>
            </div>
            <div className="stat">
              <HelmetIconSVG />
              <div className="info">
                <span className="label">SỨC CHỨA TỐI ĐA</span>
                <span className="val white">{playerTowns.reduce((sum, town) => sum + (army?.towns.find((item) => item.townId === town.id)?.maxTroops || 0), 0).toLocaleString("vi-VN")}</span>
              </div>
            </div>
            <div className="stat">
              <ChartIconSVG />
              <div className="info">
                <span className="label">TỈ LỆ SỬ DỤNG</span>
                <span className="val green">{Math.round((totalTroops / Math.max(1, playerTowns.reduce((sum, town) => sum + (army?.towns.find((item) => item.townId === town.id)?.maxTroops || 0), 0))) * 100)}%</span>
              </div>
            </div>
          </div>

          <button type="button" onClick={onClose} className="ka-action-banner-btn">
            <ShieldCrestSVG /> <span>QUẢN LÝ QUÂN SỰ</span>
          </button>
        </div>
      </div>
    </MedievalModal>
  );
};
