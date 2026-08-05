import { useMemo, useState } from "react";
import type { BattleReport } from "@island/shared";

type ReportFilter = "all" | "win" | "loss" | "unread";

export type ActiveWarReportRow = { title: string; meta: string };

type WarReportListModalProps = {
  reports: BattleReport[];
  currentPlayerId?: string | null;
  unreadCount: number;
  activeRows: ActiveWarReportRow[];
  onOpenReport: (report: BattleReport) => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
  onClose: () => void;
};

function formatNumber(value: number | undefined) {
  return Math.max(0, Number(value) || 0).toLocaleString("vi-VN");
}

export function WarReportListModal({
  reports,
  currentPlayerId,
  unreadCount,
  activeRows,
  onOpenReport,
  onMarkAllRead,
  onClose,
}: WarReportListModalProps) {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const filteredReports = useMemo(
    () =>
      reports.filter((report) => {
        const won = report.winnerId === currentPlayerId;
        if (filter === "win") return won;
        if (filter === "loss") return !won;
        if (filter === "unread") return !report.read;
        return true;
      }),
    [reports, filter, currentPlayerId],
  );

  const winCount = reports.filter(
    (report) => report.winnerId === currentPlayerId,
  ).length;

  return (
    <div className="war-report-v2__overlay" onMouseDown={onClose}>
      <section
        className="war-report-v2"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="war-report-v2__header">
          <img src="/assets/icons/menu/report.png" alt="" />
          <span>
            <strong>CHIẾN BÁO VƯƠNG QUỐC</strong>
            <small>Lịch sử giao tranh và hoạt động đang diễn ra</small>
          </span>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <img
              src="/assets/icons/menu/close.png"
              width="22"
              height="22"
              alt=""
            />
          </button>
        </header>

        <div className="war-report-v2__summary">
          <div>
            <span>Tổng báo cáo</span>
            <strong>{reports.length}</strong>
          </div>
          <div>
            <span>Chiến thắng</span>
            <strong className="win">{winCount}</strong>
          </div>
          <div>
            <span>Thất bại</span>
            <strong className="loss">{reports.length - winCount}</strong>
          </div>
          <div>
            <span>Chưa đọc</span>
            <strong>{unreadCount}</strong>
          </div>
        </div>

        <nav className="war-report-v2__filters" aria-label="Lọc chiến báo">
          {(["all", "win", "loss", "unread"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item === "all"
                ? "Tất cả"
                : item === "win"
                  ? "Chiến thắng"
                  : item === "loss"
                    ? "Thất bại"
                    : `Chưa đọc (${unreadCount})`}
            </button>
          ))}
          <button
            type="button"
            className="mark-all"
            disabled={unreadCount === 0}
            onClick={() => void onMarkAllRead()}
          >
            Đánh dấu đã đọc
          </button>
        </nav>

        <div className="war-report-v2__body">
          <div className="war-report-v2__history">
            <h3>BÁO CÁO GẦN ĐÂY</h3>
            <div className="war-report-v2__list">
              {filteredReports.map((report) => {
                const won = report.winnerId === currentPlayerId;
                const isAttacker = report.attackerId === currentPlayerId;
                const ownSide = isAttacker ? report.attacker : report.defender;
                const opponent = isAttacker
                  ? report.defenderName
                  : report.attackerName;
                return (
                  <button
                    type="button"
                    className={`war-report-v2__row ${won ? "is-win" : "is-loss"} ${report.read ? "" : "is-unread"}`}
                    key={report.id}
                    onClick={() => void onOpenReport(report)}
                  >
                    <span className="war-report-v2__result">
                      <img
                        src={
                          won
                            ? "/assets/report/win.png"
                            : "/assets/report/lose.png"
                        }
                        alt=""
                        className="war-report-v2__result-icon"
                      />
                      <span>{won ? "THẮNG" : "THUA"}</span>
                    </span>
                    <span className="war-report-v2__row-copy">
                      <strong>
                        {report.territoryName ||
                          `Lãnh thổ #${report.regionId + 1}`}
                      </strong>
                      <small>Đối thủ: {opponent || "Không xác định"}</small>
                      <em>
                        Tổn thất: {formatNumber(ownSide?.casualty?.power)}
                      </em>
                    </span>
                    <time>
                      {new Date(report.createdAt).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </time>
                    {!report.read && <i aria-label="Chưa đọc" />}
                  </button>
                );
              })}
              {filteredReports.length === 0 && (
                <div className="war-report-v2__empty">
                  Không có chiến báo phù hợp.
                </div>
              )}
            </div>
          </div>

          <aside className="war-report-v2__active">
            <h3>ĐANG DIỄN RA</h3>
            {activeRows.map((row, index) => (
              <article key={`${row.title}-${index}`}>
                <strong>{row.title}</strong>
                <span>{row.meta}</span>
              </article>
            ))}
            {activeRows.length === 0 && (
              <div className="war-report-v2__empty">
                Biên cương đang yên ổn.
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
