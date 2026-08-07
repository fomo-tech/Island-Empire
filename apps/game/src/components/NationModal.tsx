import { useMemo, useState } from "react";
import type { NationStatusSnapshot, NationTownStatus } from "@island/shared";
import { MedievalModal } from "./MedievalModal";
import { AssetIcon, type IconAssetId } from "./AssetIcon";

type Props = {
  nation: NationStatusSnapshot | null;
  townsById: Record<number, any>;
  onCenterCamera: (town: NationTownStatus, sourceTown?: any) => void;
  onManageTown: (town: NationTownStatus, sourceTown?: any) => void;
  onClose: () => void;
};

function NationIcon({
  name,
}: {
  name: "crown" | "land" | "people" | "store" | "build" | "pin" | "manage";
}) {
  const assets: Record<typeof name, IconAssetId> = {
    crown: "crown",
    land: "map",
    people: "guild",
    store: "shop",
    build: "army",
    pin: "map",
    manage: "settings",
  };
  return (
    <AssetIcon asset={assets[name]} size={20} className="nation-icon-raster" />
  );
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const path = {
    crown: (
      <>
        <path {...common} d="M4 18h16L19 8l-5 4-2-7-2 7-5-4-1 10Z" />
        <path {...common} d="M5 21h14" />
      </>
    ),
    land: (
      <>
        <path {...common} d="M4 5l5-2 6 2 5-2v16l-5 2-6-2-5 2V5Z" />
        <path {...common} d="M9 3v16M15 5v16" />
      </>
    ),
    people: (
      <>
        <circle {...common} cx="9" cy="8" r="3" />
        <circle {...common} cx="17" cy="9" r="2.5" />
        <path {...common} d="M3 20c0-5 2-8 6-8s6 3 6 8M14 14c4-1 7 1 7 6" />
      </>
    ),
    store: (
      <>
        <path {...common} d="M4 8h16v12H4zM3 8l2-5h14l2 5" />
        <path {...common} d="M8 20v-7h8v7" />
      </>
    ),
    build: (
      <>
        <path {...common} d="m5 19 10-10M13 5l6 6M4 20l4-1-3-3-1 4Z" />
        <path {...common} d="m14 4 6 6" />
      </>
    ),
    pin: (
      <>
        <path {...common} d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle {...common} cx="12" cy="10" r="2.5" />
      </>
    ),
    manage: (
      <>
        <path {...common} d="M4 6h16M7 12h10M9 18h6" />
        <circle {...common} cx="8" cy="6" r="1.5" />
        <circle {...common} cx="15" cy="12" r="1.5" />
        <circle {...common} cx="12" cy="18" r="1.5" />
      </>
    ),
  }[name];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {path}
    </svg>
  );
}

function townName(town: NationTownStatus) {
  if (town.kind === "capital") return "Hoàng Thành";
  if (town.kind === "sub_capital") return "Phó Đô";
  if (town.kind === "flag") return `Trụ Cờ #${town.territoryId}`;
  return `Quân Khu #${town.territoryId}`;
}

function townKind(town: NationTownStatus) {
  if (town.kind === "capital") return "Kinh đô";
  if (town.kind === "sub_capital") return "Phó đô";
  if (town.kind === "flag") return "Trụ cờ";
  return "Quân khu";
}

function statusLabel(status: NationTownStatus["status"]) {
  if (status === "under_attack") return "Đang bị công";
  if (status === "building") return "Đang kiến thiết";
  return "Ổn định";
}

export function NationModal({
  nation,
  townsById,
  onCenterCamera,
  onManageTown,
  onClose,
}: Props) {
  const [filter, setFilter] = useState<"all" | "capital" | "alert">("all");
  const [query, setQuery] = useState("");
  const towns = useMemo(() => {
    let result = nation?.towns || [];
    if (filter === "capital")
      result = result.filter(
        (town) => town.kind === "capital" || town.kind === "sub_capital",
      );
    if (filter === "alert")
      result = result.filter(
        (town) => town.status !== "normal" || town.storageUsagePercent >= 90,
      );
    const normalized = query.trim().toLocaleLowerCase("vi");
    if (normalized)
      result = result.filter(
        (town) =>
          townName(town).toLocaleLowerCase("vi").includes(normalized) ||
          String(town.territoryId).includes(normalized),
      );
    return result;
  }, [filter, nation, query]);

  const storageUsed =
    nation?.towns.reduce((sum, town) => sum + town.storageUsed, 0) || 0;
  const storageCapacity =
    nation?.towns.reduce((sum, town) => sum + town.storageCapacity, 0) || 0;
  const productionHour = nation
    ? Object.values(nation.productionPerSecond).reduce(
        (sum, value) => sum + Number(value || 0),
        0,
      ) * 3600
    : 0;

  return (
    <MedievalModal
      title="QUỐC GIA VÀ LÃNH THỔ"
      subtitle={
        nation
          ? `${nation.playerName} · ${nation.rank}`
          : "Đang đồng bộ từ máy chủ"
      }
      onClose={onClose}
      width="980px"
      maxWidth="96vw"
    >
      <div className="nation-command-modal">
        <div className="ka-top-stats-grid nation-command-stats">
          <div className="ka-stat-card">
            <span className="nation-command-icon">
              <NationIcon name="land" />
            </span>
            <div className="info">
              <span className="label">LÃNH THỔ</span>
              <span className="val">{nation?.ownedTerritories || 0}</span>
            </div>
          </div>
          <div className="ka-stat-card">
            <span className="nation-command-icon">
              <NationIcon name="crown" />
            </span>
            <div className="info">
              <span className="label">THÀNH TRÌ</span>
              <span className="val">{nation?.townCount || 0}</span>
            </div>
          </div>
          <div className="ka-stat-card">
            <span className="nation-command-icon">
              <NationIcon name="people" />
            </span>
            <div className="info">
              <span className="label">QUÂN ĐỘI</span>
              <span className="val">
                {Math.floor(nation?.ownedTroops || 0).toLocaleString("vi-VN")}
              </span>
            </div>
          </div>
          <div className="ka-stat-card">
            <span className="nation-command-icon">
              <NationIcon name="store" />
            </span>
            <div className="info">
              <span className="label">KHO QUỐC GIA</span>
              <span className="val">
                {Math.round((storageUsed / Math.max(1, storageCapacity)) * 100)}
                %
              </span>
            </div>
          </div>
          <div className="ka-stat-card">
            <span className="nation-command-icon">
              <NationIcon name="build" />
            </span>
            <div className="info">
              <span className="label">ĐANG XÂY</span>
              <span className="val">{nation?.ownClearings || 0}</span>
            </div>
          </div>
        </div>

        <div className="ka-filter-bar">
          <div className="ka-tabs-group">
            <button
              type="button"
              className={`ka-tab-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              TẤT CẢ ({nation?.townCount || 0})
            </button>
            <button
              type="button"
              className={`ka-tab-btn ${filter === "capital" ? "active" : ""}`}
              onClick={() => setFilter("capital")}
            >
              KINH ĐÔ
            </button>
            <button
              type="button"
              className={`ka-tab-btn ${filter === "alert" ? "active" : ""}`}
              onClick={() => setFilter("alert")}
            >
              CẦN CHÚ Ý (
              {nation?.alerts.reduce((sum, alert) => sum + alert.count, 0) || 0}
              )
            </button>
          </div>
          <div className="ka-search-controls">
            <div className="ka-search-input-box">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm thành trì hoặc lãnh thổ..."
              />
            </div>
          </div>
        </div>

        <div className="ka-table-container">
          <table className="ka-table nation-command-table">
            <thead>
              <tr>
                <th>THÀNH TRÌ</th>
                <th>TỌA ĐỘ</th>
                <th>LOẠI</th>
                <th>QUÂN / GIỚI HẠN</th>
                <th>KHO</th>
                <th>TRẠNG THÁI</th>
                <th>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {towns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">
                    Chưa có thành trì phù hợp.
                  </td>
                </tr>
              ) : (
                towns.map((town) => {
                  const sourceTown = townsById[town.townId];
                  return (
                    <tr key={`${town.townId}:${town.territoryId}`}>
                      <td>
                        <div className="ka-city-cell">
                          <span className="nation-table-sigil">
                            <NationIcon
                              name={town.kind === "capital" ? "crown" : "land"}
                            />
                          </span>
                          <div className="ka-city-details">
                            <div className="title-row">
                              <span className="city-title">
                                {townName(town)}
                              </span>
                              <span className="level">Cấp {town.level}</span>
                            </div>
                            <div className="owner-row">
                              Lãnh thổ #{town.territoryId}
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
                          <span>{townKind(town)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="ka-garrison-cell">
                          <span className="count green">
                            {Math.floor(town.troops).toLocaleString("vi-VN")}
                          </span>
                          <span className="sub">
                            /
                            {Math.floor(town.maxTroops).toLocaleString(
                              "vi-VN",
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="nation-table-storage">
                          <strong>{town.storageUsagePercent}%</strong>
                          <span>
                            <i
                              style={{ width: `${town.storageUsagePercent}%` }}
                            />
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="ka-status-cell">
                          <span
                            className={`nation-table-status status-${town.status}`}
                          >
                            {statusLabel(town.status)}
                          </span>
                          <span className="sub-status">
                            Quân {town.troops.toLocaleString("vi-VN")}/
                            {town.maxTroops.toLocaleString("vi-VN")}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="nation-table-actions">
                          <button
                            type="button"
                            title="Định vị"
                            onClick={() => {
                              onCenterCamera(town, sourceTown);
                              onClose();
                            }}
                          >
                            <NationIcon name="pin" />
                          </button>
                          <button
                            type="button"
                            title="Quản lý"
                            onClick={() => onManageTown(town, sourceTown)}
                          >
                            <AssetIcon
                              asset="manageButton"
                              size={20}
                              className="nation-icon-raster"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="ka-footer-bar nation-command-footer">
          <div className="ka-footer-left">
            <span className="title">TỔNG QUAN QUỐC GIA</span>
            <span className="date">
              Cập nhật:{" "}
              {nation?.serverTime
                ? new Date(nation.serverTime).toLocaleString("vi-VN")
                : "Đang đồng bộ"}
            </span>
          </div>
          <div className="ka-footer-stats">
            <div className="stat">
              <div className="info">
                <span className="label">UY THẾ</span>
                <span className="val gold">
                  {(nation?.strategicPower || 0).toLocaleString("vi-VN")}
                </span>
              </div>
            </div>
            <div className="stat">
              <div className="info">
                <span className="label">SẢN LƯỢNG/GIỜ</span>
                <span className="val green">
                  +{Math.floor(productionHour).toLocaleString("vi-VN")}
                </span>
              </div>
            </div>
            <div className="stat">
              <div className="info">
                <span className="label">CẢNH BÁO</span>
                <span className="val white">{nation?.alerts.length || 0}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="ka-action-banner-btn"
            onClick={onClose}
          >
            <NationIcon name="crown" />
            <span>ĐÓNG QUỐC VỤ</span>
          </button>
        </div>
      </div>
    </MedievalModal>
  );
}
