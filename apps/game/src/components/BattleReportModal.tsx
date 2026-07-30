import React from "react";

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
  const attInitialTotal = (report.attacker?.initial?.infantry || 0) + (report.attacker?.initial?.cavalry || 0) + (report.attacker?.initial?.artillery || 0);
  const attCasualtyTotal = (report.attacker?.casualty?.infantry || 0) + (report.attacker?.casualty?.cavalry || 0) + (report.attacker?.casualty?.artillery || 0);
  const attSurvivorsTotal = (report.attacker?.survivors?.infantry || 0) + (report.attacker?.survivors?.cavalry || 0) + (report.attacker?.survivors?.artillery || 0);

  const defInitialTotal = (report.defender?.initial?.infantry || 0) + (report.defender?.initial?.cavalry || 0) + (report.defender?.initial?.artillery || 0);
  const defCasualtyTotal = (report.defender?.casualty?.infantry || 0) + (report.defender?.casualty?.cavalry || 0) + (report.defender?.casualty?.artillery || 0);
  const defSurvivorsTotal = (report.defender?.survivors?.infantry || 0) + (report.defender?.survivors?.cavalry || 0) + (report.defender?.survivors?.artillery || 0);

  return (
    <div className="ob-modal-overlay" onMouseDown={onClose}>
      <div className="ob-modal-container town-modal battle-report-detail-modal" onMouseDown={(e) => e.stopPropagation()}>
        
        {/* Top Header Banner */}
        <div className={`rt-attack-header ${isWinner ? "winner-bg" : "loser-bg"}`}>
          <div className="rt-attack-header-title-box">
            <h2 className={`title ${isWinner ? "text-gold" : "text-red"}`}>
              {isWinner ? "CHIẾN THẮNG HOÀNG GIA" : "THẤT THỦ - BỊ TẤN CÔNG"}
            </h2>
          </div>
          <p className="subtitle">
            Trận chiến tại {report.territoryName || `LÃNH THỔ #${report.regionId + 1}`}
          </p>
          <button type="button" onClick={onClose} className="rt-close-btn pos-top-right">✕</button>
        </div>

        {/* Players Versus Row */}
        <div className="br-vs-row">
          <div className={`br-side-card attacker ${report.isAttackerWin ? "win" : "lose"}`}>
            <span className="role-tag">PHE TẤN CÔNG</span>
            <div className="player-name">{report.attackerName || "Bá Vương"}</div>
            <div className="result-tag">{report.isAttackerWin ? "THẮNG LỢI" : "THẤT THỦ"}</div>
          </div>
          <div className="br-vs-badge">VS</div>
          <div className={`br-side-card defender ${!report.isAttackerWin ? "win" : "lose"}`}>
            <span className="role-tag">PHE PHÒNG THỦ</span>
            <div className="player-name">{report.defenderName || "Thủ Thành"}</div>
            <div className="result-tag">{!report.isAttackerWin ? "THẮNG LỢI" : "THẤT THỦ"}</div>
          </div>
        </div>

        {/* Detailed Stats Comparison Grid */}
        <div className="br-comparison-section">
          <div className="rt-dispatch-section-title">THỐNG KÊ TỔN THẤT VÀ QUÂN CÒN LẠI</div>
          
          <table className="br-stats-table">
            <thead>
              <tr>
                <th className="col-type">LOẠI BINH CHỦNG</th>
                <th className="col-side attacker">PHE TẤN CÔNG ({report.attackerName || "Tấn Công"})</th>
                <th className="col-side defender">PHE PHÒNG THỦ ({report.defenderName || "Phòng Thủ"})</th>
              </tr>
            </thead>
            <tbody>
              {/* Infantry Row */}
              <tr>
                <td className="unit-label"><span className="unit-pill infantry-pill">Bộ binh</span></td>
                <td>
                  <div className="stat-line"><span>Ban đầu:</span> <strong>{(report.attacker?.initial?.infantry || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line casualty"><span>Tổn thất:</span> <strong className="text-red">-{(report.attacker?.casualty?.infantry || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line survivor"><span>Còn lại:</span> <strong className="text-green">{(report.attacker?.survivors?.infantry || 0).toLocaleString("vi-VN")} quân</strong></div>
                </td>
                <td>
                  <div className="stat-line"><span>Ban đầu:</span> <strong>{(report.defender?.initial?.infantry || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line casualty"><span>Tổn thất:</span> <strong className="text-red">-{(report.defender?.casualty?.infantry || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line survivor"><span>Còn lại:</span> <strong className="text-green">{(report.defender?.survivors?.infantry || 0).toLocaleString("vi-VN")} quân</strong></div>
                </td>
              </tr>

              {/* Cavalry Row */}
              <tr>
                <td className="unit-label"><span className="unit-pill cavalry-pill">Kỵ binh</span></td>
                <td>
                  <div className="stat-line"><span>Ban đầu:</span> <strong>{(report.attacker?.initial?.cavalry || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line casualty"><span>Tổn thất:</span> <strong className="text-red">-{(report.attacker?.casualty?.cavalry || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line survivor"><span>Còn lại:</span> <strong className="text-green">{(report.attacker?.survivors?.cavalry || 0).toLocaleString("vi-VN")} quân</strong></div>
                </td>
                <td>
                  <div className="stat-line"><span>Ban đầu:</span> <strong>{(report.defender?.initial?.cavalry || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line casualty"><span>Tổn thất:</span> <strong className="text-red">-{(report.defender?.casualty?.cavalry || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line survivor"><span>Còn lại:</span> <strong className="text-green">{(report.defender?.survivors?.cavalry || 0).toLocaleString("vi-VN")} quân</strong></div>
                </td>
              </tr>

              {/* Artillery Row */}
              <tr>
                <td className="unit-label"><span className="unit-pill artillery-pill">Pháo binh</span></td>
                <td>
                  <div className="stat-line"><span>Ban đầu:</span> <strong>{(report.attacker?.initial?.artillery || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line casualty"><span>Tổn thất:</span> <strong className="text-red">-{(report.attacker?.casualty?.artillery || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line survivor"><span>Còn lại:</span> <strong className="text-green">{(report.attacker?.survivors?.artillery || 0).toLocaleString("vi-VN")} quân</strong></div>
                </td>
                <td>
                  <div className="stat-line"><span>Ban đầu:</span> <strong>{(report.defender?.initial?.artillery || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line casualty"><span>Tổn thất:</span> <strong className="text-red">-{(report.defender?.casualty?.artillery || 0).toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line survivor"><span>Còn lại:</span> <strong className="text-green">{(report.defender?.survivors?.artillery || 0).toLocaleString("vi-VN")} quân</strong></div>
                </td>
              </tr>

              {/* Total Troops Summary Row */}
              <tr className="total-row">
                <td className="unit-label"><span className="unit-pill total-pill">TỔNG SỐ LƯỢNG QUÂN LÍNH</span></td>
                <td>
                  <div className="stat-line"><span>Tổng ban đầu:</span> <strong className="text-white">{attInitialTotal.toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line casualty"><span>Tổng tổn thất:</span> <strong className="text-red">-{attCasualtyTotal.toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line survivor"><span>Còn lại:</span> <strong className="text-gold">{attSurvivorsTotal.toLocaleString("vi-VN")} quân</strong></div>
                </td>
                <td>
                  <div className="stat-line"><span>Tổng ban đầu:</span> <strong className="text-white">{defInitialTotal.toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line casualty"><span>Tổng tổn thất:</span> <strong className="text-red">-{defCasualtyTotal.toLocaleString("vi-VN")} quân</strong></div>
                  <div className="stat-line survivor"><span>Còn lại:</span> <strong className="text-gold">{defSurvivorsTotal.toLocaleString("vi-VN")} quân</strong></div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 4: Looted Resources */}
        {hasLoot && (
          <div className="rt-dispatch-section margin-top">
            <div className="rt-dispatch-section-title">
              {isWinner ? "CHIẾN LỢI PHẨM CƯỚP ĐƯỢC" : "TÀI NGUYÊN BỊ TẤN CÔNG CHIẾM ĐẠT"}
            </div>
            <div className="br-loot-grid">
              <div className="br-loot-card gold-card">
                <span className="loot-label">VÀNG HOÀNG GIA</span>
                <span className="loot-val text-gold">+{(loot.gold || 0).toLocaleString("vi-VN")}</span>
              </div>
              <div className="br-loot-card wood-card">
                <span className="loot-label">GỖ XÂY DỰNG</span>
                <span className="loot-val text-amber">+{(loot.wood || 0).toLocaleString("vi-VN")}</span>
              </div>
              <div className="br-loot-card stone-card">
                <span className="loot-label">ĐÁ KHAI THÁC</span>
                <span className="loot-val text-blue">+{(loot.stone || 0).toLocaleString("vi-VN")}</span>
              </div>
              <div className="br-loot-card gem-card">
                <span className="loot-label">NGỌC BẢO BẢO</span>
                <span className="loot-val text-cyan">+{(loot.gems || 0).toLocaleString("vi-VN")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Button */}
        <div className="rt-attack-footer margin-top">
          <button type="button" onClick={onClose} className="rt-gold-banner-btn">
            <span>XÁC NHẬN ĐÃ ĐỌC CHIẾN BÁO</span>
          </button>
        </div>

      </div>
    </div>
  );
}
