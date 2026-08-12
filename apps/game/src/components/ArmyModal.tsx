import React, { useState } from "react";
import type { ArmyStateSnapshot } from "@island/shared";
import { MedievalModal } from "./MedievalModal";
import { AssetIcon } from "./AssetIcon";
import { settlementHasLevel } from "../game/settlementClassification";

interface Town {
  id: number;
  x: number;
  y: number;
  lvl: number;
  kind: "capital" | "sub_capital" | "military_district" | "flag";
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
  return <AssetIcon asset="crown" size={18} />;
};

const CastleIconSVG = () => {
  return <AssetIcon asset="castle" size={22} />;
};

const HelmetIconSVG = () => {
  return <AssetIcon asset="military" size={22} />;
};

const TentIconSVG = () => {
  return <AssetIcon asset="garrison" size={22} />;
};

const CityIconSVG = () => {
  return <AssetIcon asset="city" size={22} />;
};

const SwordsIconSVG = () => {
  return <AssetIcon asset="march" size={22} />;
};

const SearchIconSVG = () => {
  return (
    <AssetIcon
      asset="search"
      size={14}
      style={{ marginRight: 4, verticalAlign: "middle" }}
    />
  );
};

const FilterIconSVG = () => {
  return (
    <AssetIcon
      asset="filter"
      size={14}
      style={{ marginRight: 4, verticalAlign: "middle" }}
    />
  );
};

const SoldierIconSVG = () => {
  return (
    <AssetIcon
      asset="troopInfantry"
      size={14}
      style={{ marginRight: 4, verticalAlign: "middle" }}
    />
  );
};

const ChartIconSVG = () => {
  return (
    <AssetIcon
      asset="chart"
      size={18}
      style={{ marginRight: 6, verticalAlign: "middle" }}
    />
  );
};

const CastleThumbnailSmall = () => {
  return (
    <span className="ka-city-emblem" aria-hidden="true">
      <AssetIcon asset="city" size={42} />
    </span>
  );
};

export const ArmyModal: React.FC<ArmyModalProps> = ({
  army,
  onCenterCamera,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "cities" | "garrisons">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const playerTowns: Town[] = (army?.towns || []).map((town) => ({
    id: town.townId,
    x: town.x,
    y: town.y,
    lvl: town.level,
    kind: town.kind,
    owner: 0,
    troops: town.troops,
  }));
  const totalTroops = army?.totalTroops || 0;
  const garrisonTroops = army?.garrisonTroops || 0;
  const marchingCount = army?.marches.length || 0;

  const filteredTowns = playerTowns.filter((town) => {
    if (searchQuery.trim() === "") return true;
    return `thành phố #${town.id}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  });

  return (
    <MedievalModal
      title="QUÂN LỰC VƯƠNG QUỐC"
      subtitle="Trung tâm điều binh và phòng thủ lãnh thổ"
      onClose={onClose}
      width="980px"
      maxWidth="96vw"
      className="kingdom-army-modal army-command-center"
    >
      <div className="ka-command-layout">
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
              <span className="val">
                {totalTroops.toLocaleString("vi-VN")} <small>binh sĩ</small>
              </span>
            </div>
          </div>
          <div className="ka-stat-card">
            <TentIconSVG />
            <div className="info">
              <span className="label">TỔNG ĐỒN TRÚ</span>
              <span className="val">
                {garrisonTroops.toLocaleString("vi-VN")} <small>binh sĩ</small>
              </span>
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
              <span className="val">
                {marchingCount} <small>đoàn</small>
              </span>
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
                    <td data-label="Thành phố">
                      <div className="ka-city-cell">
                        <CastleThumbnailSmall />
                        <div className="ka-city-details">
                          <div className="title-row">
                            <ShieldCrestSVG />
                            <span className="city-title">
                              Thành phố #{town.id}
                            </span>
                            {settlementHasLevel(town.kind) && (
                              <span className="level">(Cấp {town.lvl})</span>
                            )}
                          </div>
                          <div className="owner-row">
                            <AssetIcon asset="crown" size={12} /> Chủ thành
                          </div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Tọa độ">
                      <div className="ka-coords-cell">
                        <span>X:{Math.round(town.x)}</span>
                        <span>Y:{Math.round(town.y)}</span>
                      </div>
                    </td>
                    <td data-label="Loại">
                      <div className="ka-type-cell">
                        <CastleIconSVG />
                        <span>Thành phố</span>
                      </div>
                    </td>
                    <td data-label="Đồn trú">
                      <div className="ka-garrison-cell">
                        <span className="count green">
                          <SoldierIconSVG />{" "}
                          {town.troops.toLocaleString("vi-VN")}
                        </span>
                        <span className="sub">Đồn trú</span>
                      </div>
                    </td>
                    <td data-label="Quân số">
                      <div className="ka-troops-cell">
                        <span className="count white">
                          <HelmetIconSVG />{" "}
                          {town.troops.toLocaleString("vi-VN")}
                        </span>
                        <span className="sub">Tổng quân</span>
                      </div>
                    </td>
                    <td data-label="Trạng thái">
                      <div className="ka-status-cell">
                        <span className="status-dot green">
                          <i className="ka-status-orb" aria-hidden="true" />
                          Bình thường
                        </span>
                        <span className="sub-status">Không bị tấn công</span>
                      </div>
                    </td>
                    <td data-label="Hành động" style={{ textAlign: "center" }}>
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
              Cập nhật lần cuối:{" "}
              {army?.serverTime
                ? new Date(army.serverTime).toLocaleString("vi-VN")
                : "Đang đồng bộ"}
            </span>
          </div>

          <div className="ka-footer-stats">
            <div className="stat">
              <HelmetIconSVG />
              <div className="info">
                <span className="label">SỨC MẠNH QUÂN SỰ</span>
                <span className="val gold">
                  {totalTroops.toLocaleString("vi-VN")}
                </span>
              </div>
            </div>
            <div className="stat">
              <AssetIcon asset="capacity" size={22} />
              <div className="info">
                <span className="label">SỨC CHỨA TỐI ĐA</span>
                <span className="val white">
                  {playerTowns
                    .reduce(
                      (sum, town) =>
                        sum +
                        (army?.towns.find((item) => item.townId === town.id)
                          ?.maxTroops || 0),
                      0,
                    )
                    .toLocaleString("vi-VN")}
                </span>
              </div>
            </div>
            <div className="stat">
              <ChartIconSVG />
              <div className="info">
                <span className="label">TỈ LỆ SỬ DỤNG</span>
                <span className="val green">
                  {Math.round(
                    (totalTroops /
                      Math.max(
                        1,
                        playerTowns.reduce(
                          (sum, town) =>
                            sum +
                            (army?.towns.find((item) => item.townId === town.id)
                              ?.maxTroops || 0),
                          0,
                        ),
                      )) *
                      100,
                  )}
                  %
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ka-action-banner-btn"
          >
            <AssetIcon asset="manageButton" size={28} />{" "}
            <span>QUẢN LÝ QUÂN SỰ</span>
          </button>
        </div>
      </div>
    </MedievalModal>
  );
};
