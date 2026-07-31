import { useEffect, useState } from "react";
import { MedievalModal } from "./MedievalModal";
import { getMilitaryLeaderboard, type LeaderboardEntry } from "../game/api";

type Props = {
  token: string;
  onClose: () => void;
};

export function RankingModal({ token, onClose }: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMilitaryLeaderboard(token)
      .then((res) => {
        if (res.ok) {
          setLeaderboard(res.leaderboard);
        } else {
          setError("Không thể tải bảng xếp hạng");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Lỗi kết nối máy chủ");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <MedievalModal
      title="BẢNG XẾP HẠNG QUÂN SỰ"
      subtitle="Thứ hạng dựa trên tổng quân số đồn trú và viễn chinh"
      onClose={onClose}
      width="800px"
      maxWidth="94vw"
    >
      <div className="nation-command-modal">
        {loading ? (
          <div className="war-report-loading" style={{ padding: "40px 0", textAlign: "center", fontSize: "16px", color: "#5c4033" }}>
            Đang tải dữ liệu từ phủ quốc sư...
          </div>
        ) : error ? (
          <div className="war-report-empty" style={{ color: "#ef4444", padding: "40px 0", textAlign: "center" }}>
            {error}
          </div>
        ) : (
          <>
            <div className="ka-table-container" style={{ maxHeight: "480px", overflowY: "auto" }}>
              <table className="ka-table">
                <thead>
                  <tr>
                    <th style={{ width: "80px", textAlign: "center" }}>HẠNG</th>
                    <th>VƯƠNG QUỐC</th>
                    <th style={{ width: "120px", textAlign: "center" }}>THÀNH TRÌ</th>
                    <th style={{ width: "180px", textAlign: "right" }}>SỨC MẠNH QUÂN SỰ</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="no-data">
                        Chưa có dữ liệu xếp hạng quân sự.
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((entry) => {
                      const isTop3 = entry.rank <= 3;
                      const rankColor =
                        entry.rank === 1
                          ? "#d4af37" // Gold
                          : entry.rank === 2
                          ? "#c0c0c0" // Silver
                          : entry.rank === 3
                          ? "#cd7f32" // Bronze
                          : "#8b7355";

                      return (
                        <tr key={entry.playerId} style={{ backgroundColor: isTop3 ? "rgba(212, 175, 55, 0.05)" : "transparent" }}>
                          <td style={{ textAlign: "center" }}>
                            {isTop3 ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "50%",
                                  backgroundColor: rankColor,
                                  color: "#ffffff",
                                  fontWeight: "bold",
                                  fontSize: "14px",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                  border: "1px solid rgba(255,255,255,0.4)"
                                }}
                              >
                                {entry.rank}
                              </span>
                            ) : (
                              <span style={{ fontWeight: "600", color: "#5c4033" }}>{entry.rank}</span>
                            )}
                          </td>
                          <td>
                            <div className="ka-city-cell" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "4px",
                                  backgroundColor: entry.flagColor,
                                  border: "2px solid #5c4033",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "12px",
                                  color: "#ffffff",
                                  boxShadow: "inset 0 0 4px rgba(0,0,0,0.4)",
                                  fontWeight: "bold",
                                  textShadow: "1px 1px 2px rgba(0,0,0,0.8)"
                                }}
                                title={`Flag color: ${entry.flagColor}`}
                              >
                                {entry.emblem?.slice(0, 1).toUpperCase() || "S"}
                              </div>
                              <div className="ka-city-details">
                                <span className="city-title" style={{ fontSize: "15px", fontWeight: "bold", color: "#2c1c0c" }}>
                                  {entry.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span style={{ fontSize: "14px", fontWeight: "600", color: "#5c4033" }}>
                              {entry.townCount}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", paddingRight: "20px" }}>
                            <span className="count green" style={{ fontSize: "15px", fontWeight: "bold" }}>
                              {entry.totalTroops.toLocaleString("vi-VN")}
                            </span>
                            <span style={{ fontSize: "11px", color: "#8b7355", marginLeft: "4px" }}>
                              Vệ binh
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="ka-footer-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="ka-footer-left">
                <span className="title">BẢNG PHONG THẦN HEX RIVALS</span>
              </div>
              <button type="button" className="ka-action-banner-btn" onClick={onClose} style={{ padding: "8px 16px" }}>
                <span>ĐỒNG Ý</span>
              </button>
            </div>
          </>
        )}
      </div>
    </MedievalModal>
  );
}
