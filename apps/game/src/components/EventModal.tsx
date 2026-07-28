import React from "react";

interface ResourceBag {
  gold: number;
  wood: number;
  stone: number;
  gems: number;
}

interface EventState {
  goldRush: number;
  harvestRush: number;
}

interface EventModalProps {
  resources: ResourceBag;
  events: EventState;
  onTriggerEvent: (eventType: string, costGems: number, name: string) => void;
  onClose: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ resources, events, onTriggerEvent, onClose }) => {
  const ev = events || { goldRush: 0, harvestRush: 0 };

  const eventList = [
    {
      type: "goldRush",
      name: "Cơn Lốc Vàng",
      desc: "Kêu gọi toàn bộ thương nhân tập trung buôn bán tại chợ trung tâm. Nhân đôi sản lượng Vàng trong 60 giây tiếp theo.",
      costGems: 60,
      activeTime: ev.goldRush || 0,
      icon: "🪙"
    },
    {
      type: "harvestRush",
      name: "Hội Chợ Mùa Màng",
      desc: "Trực tiếp thúc đẩy tiều phu và thợ khai mỏ làm việc gấp đôi công suất. Nhân đôi sản lượng Gỗ và Đá trong 60 giây tiếp theo.",
      costGems: 40,
      activeTime: ev.harvestRush || 0,
      icon: "🪵"
    }
  ];

  return (
    <div className="modal-overlay" style={styles.overlay}>
      <div className="modal-container" style={styles.container}>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
        <h2 style={styles.title}>📢 SỰ KIỆN VƯƠNG QUỐC</h2>

        <div style={styles.listContainer}>
          {eventList.map((item) => {
            const afford = resources.gems >= item.costGems;
            const isActive = item.activeTime > 0;
            return (
              <div key={item.type} style={styles.card}>
                <div style={styles.iconBox}>{item.icon}</div>
                <div style={styles.details}>
                  <div style={styles.header}>
                    <span style={styles.name}>{item.name}</span>
                    {isActive ? (
                      <span style={styles.activeBadge}>Còn: {Math.ceil(item.activeTime)}s</span>
                    ) : (
                      <span style={styles.inactiveBadge}>Chưa kích hoạt</span>
                    )}
                  </div>
                  <p style={styles.desc}>{item.desc}</p>
                  <div style={styles.costLine}>
                    Tốn:{" "}
                    <span style={afford ? styles.enoughRes : styles.lackingRes}>
                      {item.costGems} KIM CƯƠNG
                    </span>
                  </div>
                </div>
                <button
                  disabled={!afford || isActive}
                  onClick={() => onTriggerEvent(item.type, item.costGems, item.name)}
                  style={{
                    ...styles.actionBtn,
                    opacity: (!afford || isActive) ? 0.45 : 1,
                    cursor: (!afford || isActive) ? "not-allowed" : "pointer"
                  }}
                >
                  {isActive ? "Đang chạy" : "Kích hoạt"}
                </button>
              </div>
            );
          })}
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
    maxWidth: "540px",
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
    fontSize: "18px",
    textShadow: "2px 2px 0 #000",
  },
  listContainer: {
    maxHeight: "380px",
    overflowY: "auto" as const,
    paddingRight: "4px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  card: {
    background: "rgba(24, 38, 51, 0.8)",
    border: "1px solid #2b3b45",
    borderRadius: "4px",
    padding: "14px",
    display: "flex",
    gap: "14px",
    alignItems: "center",
  },
  iconBox: {
    fontSize: "30px",
    background: "rgba(7, 16, 24, 0.5)",
    border: "1px solid #513922",
    borderRadius: "4px",
    padding: "10px",
    display: "grid",
    placeItems: "center",
    minWidth: "50px",
    height: "50px",
  },
  details: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontWeight: "bold" as const,
    color: "#fff3d2",
    fontSize: "15px",
  },
  activeBadge: {
    background: "#1e3a24",
    color: "#73e05e",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "3px",
    border: "1px solid #73e05e",
    fontWeight: "bold" as const,
  },
  inactiveBadge: {
    background: "#2b3b45",
    color: "#8196a3",
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "3px",
    border: "1px solid #513922",
  },
  desc: {
    margin: 0,
    fontSize: "12px",
    color: "#8196a3",
    lineHeight: "1.4",
  },
  costLine: {
    fontSize: "12px",
    color: "#8196a3",
    marginTop: "2px",
  },
  enoughRes: {
    color: "#06b6d4",
    fontWeight: "bold" as const,
  },
  lackingRes: {
    color: "#ff3b30",
    fontWeight: "bold" as const,
  },
  actionBtn: {
    background: "#2b3b45",
    color: "#fff3d2",
    border: "2px solid #513922",
    padding: "8px 14px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold" as const,
    fontFamily: "Courier New, monospace",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap" as const,
  },
};
