import React from "react";
import { EuroFlourishLeft, EuroFlourishRight } from "./EuroIcons";
import {
  iconLionShield,
  iconDragonShield,
  iconVsBadge,
  iconInfantry,
  iconCavalry,
  iconArtillery,
  iconHelmet
} from "./BattleReportAssets";

export interface BattleReportData {
  _id?: string;
  regionId: number;
  territoryName?: string;
  attackerId: string;
  attackerName: string;
  defenderId: string | null;
  defenderName: string;
  winnerId: string;
  isAttackerWin: boolean;
  attacker: {
    initial: { infantry: number; cavalry: number; artillery: number; power: number };
    casualty: { infantry: number; cavalry: number; artillery: number; power: number };
    survivors: { infantry: number; cavalry: number; artillery: number; power: number };
  };
  defender: {
    initial: { infantry: number; cavalry: number; artillery: number; power: number };
    casualty: { infantry: number; cavalry: number; artillery: number; power: number };
    survivors: { infantry: number; cavalry: number; artillery: number; power: number };
  };
  lootedResources?: { gold?: number; wood?: number; stone?: number; gems?: number };
  createdAt?: string | Date;
}

interface BattleReportModalProps {
  report: BattleReportData;
  currentUserId?: string;
  onClose: () => void;
}

export function BattleReportModal({ report, currentUserId, onClose }: BattleReportModalProps) {
  const isAttacker = currentUserId ? report.attackerId === currentUserId : true;
  const isWinner = isAttacker ? report.isAttackerWin : !report.isAttackerWin;

  const loot = report.lootedResources || {};
  const hasLoot = (loot.gold || 0) + (loot.wood || 0) + (loot.stone || 0) + (loot.gems || 0) > 0;

  // Calculate exact total soldier counts
  const attInitialTotal =
    (report.attacker?.initial?.infantry || 0) +
    (report.attacker?.initial?.cavalry || 0) +
    (report.attacker?.initial?.artillery || 0);
  const attCasualtyTotal =
    (report.attacker?.casualty?.infantry || 0) +
    (report.attacker?.casualty?.cavalry || 0) +
    (report.attacker?.casualty?.artillery || 0);
  const attSurvivorsTotal =
    (report.attacker?.survivors?.infantry || 0) +
    (report.attacker?.survivors?.cavalry || 0) +
    (report.attacker?.survivors?.artillery || 0);

  const defInitialTotal =
    (report.defender?.initial?.infantry || 0) +
    (report.defender?.initial?.cavalry || 0) +
    (report.defender?.initial?.artillery || 0);
  const defCasualtyTotal =
    (report.defender?.casualty?.infantry || 0) +
    (report.defender?.casualty?.cavalry || 0) +
    (report.defender?.casualty?.artillery || 0);
  const defSurvivorsTotal =
    (report.defender?.survivors?.infantry || 0) +
    (report.defender?.survivors?.cavalry || 0) +
    (report.defender?.survivors?.artillery || 0);

  const formattedDate = report.createdAt
    ? typeof report.createdAt === "string"
      ? report.createdAt
      : new Date(report.createdAt).toISOString().replace("T", " ").substring(0, 19)
    : new Date().toISOString().replace("T", " ").substring(0, 19);

  return (
    <div className="br-modal-overlay" onMouseDown={onClose}>
      <div className="br-modal-container" onMouseDown={(e) => e.stopPropagation()}>
        {/* Top-Right Circular Close Button (X) */}
        <button type="button" className="br-modal-close-circle" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {/* Top Header Title */}
        <div className="br-header-title-box">
          <div className="br-header-main-title">
            <EuroFlourishLeft color="#ffd700" />
            <span>{isWinner ? "CHIẾN THẮNG HOÀNG GIA" : "THẤT THỦ CHIẾN TRẬN"}</span>
            <EuroFlourishRight color="#ffd700" />
          </div>
          <div className="br-header-sub">
            Trận chiến tại {report.territoryName || `LÃNH THỔ #${report.regionId + 1}`}
          </div>
          <div className="br-header-date">{formattedDate}</div>
        </div>

        {/* Hero Versus Card Section */}
        <div className="br-versus-banner">
          {/* Attacker Side (Blue Theme with Cut Angle) */}
          <div className="br-side-card-cut br-side-card--attacker">
            <img src={iconLionShield} alt="Attacker Lion Crest" className="br-crest-png" />
            <div className="br-side-info">
              <span className="br-role-tag">PHE TẤN CÔNG</span>
              <span className="br-power-val">{attSurvivorsTotal.toLocaleString()}</span>
              <span className={`br-status-tag ${report.isAttackerWin ? "win" : "lose"}`}>
                {report.isAttackerWin ? "THẮNG LỢI" : "THẤT THỦ"}
              </span>
            </div>
          </div>

          {/* Center 3D VS Emblem Badge */}
          <div className="br-vs-center">
            <img src={iconVsBadge} alt="VS Badge" className="br-vs-png" />
          </div>

          {/* Defender Side (Red Theme with Cut Angle) */}
          <div className="br-side-card-cut br-side-card--defender">
            <div className="br-side-info text-right">
              <span className="br-role-tag">PHE PHÒNG THỦ</span>
              <span className="br-power-val">{defSurvivorsTotal.toLocaleString()}</span>
              <span className={`br-status-tag ${!report.isAttackerWin ? "win" : "lose"}`}>
                {!report.isAttackerWin ? "THẮNG LỢI" : "THẤT THỦ"}
              </span>
            </div>
            <img src={iconDragonShield} alt="Defender Dragon Crest" className="br-crest-png" />
          </div>
        </div>

        {/* Section Divider Title */}
        <div className="br-table-section-title">
          <span className="br-diamond">◇</span>
          <span className="br-line"></span>
          <span className="br-title-text">THỐNG KÊ TỔN THẤT VÀ QUÂN CÒN LẠI</span>
          <span className="br-line"></span>
          <span className="br-diamond">◇</span>
        </div>

        {/* Main Stats Table */}
        <div className="br-table-frame">
          <table className="br-design-table">
            <thead>
              <tr>
                <th className="th-type">LOẠI BINH CHỦNG</th>
                <th className="th-side">PHE TẤN CÔNG ({report.attackerName || "Tấn Công"})</th>
                <th className="th-side">PHE PHÒNG THỦ ({report.defenderName || "Phòng Thủ"})</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Bộ Binh */}
              <tr>
                <td className="td-type-cell">
                  <div className="br-troop-badge-wrapper">
                    <img src={iconInfantry} alt="Bộ Binh" className="br-troop-png" />
                    <span className="br-troop-name">BỘ BINH</span>
                  </div>
                </td>
                <td className="td-stats-cell">
                  <div className="br-stat-line"><span>Ban đầu</span><strong>{(report.attacker?.initial?.infantry || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line casualty"><span>Tổn thất</span><strong className="val-red">-{(report.attacker?.casualty?.infantry || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line survivor"><span>Còn lại</span><strong className="val-green">{(report.attacker?.survivors?.infantry || 0).toLocaleString()}</strong></div>
                </td>
                <td className="td-stats-cell">
                  <div className="br-stat-line"><span>Ban đầu</span><strong>{(report.defender?.initial?.infantry || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line casualty"><span>Tổn thất</span><strong className="val-red">-{(report.defender?.casualty?.infantry || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line survivor"><span>Còn lại</span><strong className="val-green">{(report.defender?.survivors?.infantry || 0).toLocaleString()}</strong></div>
                </td>
              </tr>

              {/* Row 2: Kỵ Binh */}
              <tr>
                <td className="td-type-cell">
                  <div className="br-troop-badge-wrapper">
                    <img src={iconCavalry} alt="Kỵ Binh" className="br-troop-png" />
                    <span className="br-troop-name">KỴ BINH</span>
                  </div>
                </td>
                <td className="td-stats-cell">
                  <div className="br-stat-line"><span>Ban đầu</span><strong>{(report.attacker?.initial?.cavalry || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line casualty"><span>Tổn thất</span><strong className="val-red">-{(report.attacker?.casualty?.cavalry || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line survivor"><span>Còn lại</span><strong className="val-green">{(report.attacker?.survivors?.cavalry || 0).toLocaleString()}</strong></div>
                </td>
                <td className="td-stats-cell">
                  <div className="br-stat-line"><span>Ban đầu</span><strong>{(report.defender?.initial?.cavalry || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line casualty"><span>Tổn thất</span><strong className="val-red">-{(report.defender?.casualty?.cavalry || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line survivor"><span>Còn lại</span><strong className="val-green">{(report.defender?.survivors?.cavalry || 0).toLocaleString()}</strong></div>
                </td>
              </tr>

              {/* Row 3: Pháo Binh */}
              <tr>
                <td className="td-type-cell">
                  <div className="br-troop-badge-wrapper">
                    <img src={iconArtillery} alt="Pháo Binh" className="br-troop-png" />
                    <span className="br-troop-name">PHÁO BINH</span>
                  </div>
                </td>
                <td className="td-stats-cell">
                  <div className="br-stat-line"><span>Ban đầu</span><strong>{(report.attacker?.initial?.artillery || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line casualty"><span>Tổn thất</span><strong className="val-red">-{(report.attacker?.casualty?.artillery || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line survivor"><span>Còn lại</span><strong className="val-green">{(report.attacker?.survivors?.artillery || 0).toLocaleString()}</strong></div>
                </td>
                <td className="td-stats-cell">
                  <div className="br-stat-line"><span>Ban đầu</span><strong>{(report.defender?.initial?.artillery || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line casualty"><span>Tổn thất</span><strong className="val-red">-{(report.defender?.casualty?.artillery || 0).toLocaleString()}</strong></div>
                  <div className="br-stat-line survivor"><span>Còn lại</span><strong className="val-green">{(report.defender?.survivors?.artillery || 0).toLocaleString()}</strong></div>
                </td>
              </tr>

              {/* Row 4: Summary Highlighted Gold Row */}
              <tr className="tr-summary-gold-row">
                <td className="td-type-cell">
                  <div className="br-troop-badge-wrapper">
                    <img src={iconHelmet} alt="Tổng Quân" className="br-troop-png" />
                    <span className="br-troop-name gold">TỔNG SỐ LƯỢNG QUÂN LÍNH</span>
                  </div>
                </td>
                <td className="td-stats-cell">
                  <div className="br-stat-line"><span>Tổng ban đầu</span><strong>{attInitialTotal.toLocaleString()}</strong></div>
                  <div className="br-stat-line casualty"><span>Tổng tổn thất</span><strong className="val-red">-{attCasualtyTotal.toLocaleString()}</strong></div>
                  <div className="br-stat-line survivor"><span>Còn lại</span><strong className="val-green">{attSurvivorsTotal.toLocaleString()}</strong></div>
                </td>
                <td className="td-stats-cell">
                  <div className="br-stat-line"><span>Tổng ban đầu</span><strong>{defInitialTotal.toLocaleString()}</strong></div>
                  <div className="br-stat-line casualty"><span>Tổng tổn thất</span><strong className="val-red">-{defCasualtyTotal.toLocaleString()}</strong></div>
                  <div className="br-stat-line survivor"><span>Còn lại</span><strong className="val-green">{defSurvivorsTotal.toLocaleString()}</strong></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Looted Resources Section */}
        {hasLoot && (
          <div className="br-loot-section">
            <div className="br-loot-title">
              {isWinner ? "CHIẾN LỢI PHẨM CƯỚP ĐƯỢC" : "TÀI NGUYÊN BỊ TẤN CÔNG CHIẾM ĐOẠT"}
            </div>
            <div className="br-loot-grid">
              {(loot.gold || 0) > 0 && (
                <div className="br-loot-card">
                  <span>🌾 Lúa mì</span>
                  <strong>+{(loot.gold || 0).toLocaleString()}</strong>
                </div>
              )}
              {(loot.wood || 0) > 0 && (
                <div className="br-loot-card">
                  <span>🪵 Gỗ sồi</span>
                  <strong>+{(loot.wood || 0).toLocaleString()}</strong>
                </div>
              )}
              {(loot.stone || 0) > 0 && (
                <div className="br-loot-card">
                  <span>🪨 Đá tảng</span>
                  <strong>+{(loot.stone || 0).toLocaleString()}</strong>
                </div>
              )}
              {(loot.gems || 0) > 0 && (
                <div className="br-loot-card">
                  <span>💎 Ngọc đỏ</span>
                  <strong>+{(loot.gems || 0).toLocaleString()}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Action Button */}
        <div className="br-footer-action">
          <button type="button" className="br-confirm-amber-btn" onClick={onClose}>
            XÁC NHẬN ĐÃ ĐỌC CHIẾN BÁO
          </button>
        </div>
      </div>
    </div>
  );
}
