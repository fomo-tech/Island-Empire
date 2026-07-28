import React from "react";

interface Town {
  id: number;
  x: number;
  y: number;
  lvl: number;
  owner: number;
  troops: number;
}

interface ArmyModalProps {
  towns: Town[];
  onCenterCamera: (town: Town) => void;
  onClose: () => void;
}

export const ArmyModal: React.FC<ArmyModalProps> = ({ towns, onCenterCamera, onClose }) => {
  const playerTowns = towns.filter((t) => t.owner === 0);
  const totalTroops = playerTowns.reduce((sum, t) => sum + t.troops, 0);

  return (
    <div className="modal-overlay" style={styles.overlay}>
      <div className="modal-container" style={styles.container}>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
        <h2 style={styles.title}>🛡️ QUÂN LỰC VƯƠNG QUỐC</h2>
        
        <div style={styles.summaryBox}>
          <div>Tổng số thành: <span style={styles.goldText}>{playerTowns.length}</span></div>
          <div>Tổng quân số đồn trú: <span style={styles.goldText}>{totalTroops} binh sĩ</span></div>
        </div>

        <div style={styles.listContainer}>
          {playerTowns.length === 0 ? (
            <div style={styles.noCity}>Bạn chưa có thành phố nào! Hãy xây thành trên lãnh thổ mới.</div>
          ) : (
            playerTowns.map((town) => (
              <div key={town.id} style={styles.card}>
                <div style={styles.cardInfo}>
                  <div style={styles.cityName}>Thành phố #{town.id} (Cấp {town.lvl})</div>
                  <div style={styles.coords}>Tọa độ: X:{Math.round(town.x)}, Y:{Math.round(town.y)}</div>
                  <div style={styles.troops}>Đồn trú: {town.troops} lính</div>
                </div>
                <button 
                  onClick={() => {
                    onCenterCamera(town);
                    onClose();
                  }} 
                  style={styles.panBtn}
                >
                  🔍 Ống nhòm
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0, 0, 0, 0.72)",
    display: "grid",
    placeItems: "center",
    zIndex: 1000,
    fontFamily: "Courier New, monospace",
  },
  container: {
    background: "rgba(11, 22, 33, 0.96)",
    backdropFilter: "blur(12px)",
    border: "2px solid #b38f4f",
    borderRadius: "8px",
    padding: "24px",
    width: "90%",
    maxWidth: "500px",
    color: "#f6e7bd",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.9), inset 0 0 15px rgba(179, 143, 79, 0.2)",
    position: "relative" as const,
  },
  closeBtn: {
    position: "absolute" as const,
    right: "16px",
    top: "16px",
    background: "transparent",
    border: "none",
    color: "#8196a3",
    fontSize: "24px",
    cursor: "pointer",
    lineHeight: "1",
  },
  title: {
    color: "#ffd34d",
    marginTop: 0,
    borderBottom: "2px solid #513922",
    paddingBottom: "12px",
    fontSize: "20px",
    textShadow: "2px 2px 0 #000",
  },
  summaryBox: {
    background: "rgba(7, 16, 24, 0.65)",
    border: "1px dashed #513922",
    padding: "12px 16px",
    borderRadius: "4px",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
  },
  goldText: {
    color: "#ffd34d",
    fontWeight: "bold" as const,
  },
  listContainer: {
    maxHeight: "300px",
    overflowY: "auto" as const,
    paddingRight: "4px",
  },
  noCity: {
    textAlign: "center" as const,
    padding: "24px 0",
    color: "#8196a3",
    fontStyle: "italic",
  },
  card: {
    background: "rgba(24, 38, 51, 0.8)",
    border: "1px solid #2b3b45",
    borderRadius: "4px",
    padding: "12px 16px",
    marginBottom: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardInfo: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  cityName: {
    fontWeight: "bold" as const,
    color: "#fff3d2",
    fontSize: "15px",
  },
  coords: {
    fontSize: "12px",
    color: "#8196a3",
  },
  troops: {
    fontSize: "13px",
    color: "#73e05e",
  },
  panBtn: {
    background: "#2b3b45",
    color: "#fff3d2",
    border: "2px solid #513922",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontFamily: "Courier New, monospace",
    transition: "all 0.15s ease",
  },
};
