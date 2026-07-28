import React from "react";

interface Town {
  id: number;
  x: number;
  y: number;
  lvl: number;
  owner: number;
  troops: number;
}

interface TreasureModalProps {
  towns: Town[];
  regionOwnership: number[];
  onClose: () => void;
}

export const TreasureModal: React.FC<TreasureModalProps> = ({ towns, regionOwnership, onClose }) => {
  const playerTowns = towns.filter((t) => t.owner === 0);
  const clearedCount = regionOwnership.filter((o) => o === 1).length;

  const islandOfTown = (t: Town) => {
    if (t.x > 1180 && t.y < 660) return "EAST_CONTINENT";
    if (t.x > 1180 && t.y < 1240) return "MIDDLE_SEA_CONTINENT";
    if (t.x > 1040 && t.y >= 1240) return "SOUTH_WORLD_CONTINENT";
    if (t.x > 880 && t.y < 620) return "EAST_NORTH";
    if (t.x > 840 && t.y >= 620 && t.y < 1030) return "EAST_MID";
    if (t.y < 520) return "NORTH";
    if (t.y < 900) return "CENTER";
    if (t.y < 1200) return "SOUTH";
    return "FAR_SOUTH";
  };

  // Kiếm Bão Biển (At least 1 town in EAST_NORTH, EAST_MID, or SOUTH is seaside / islands)
  const isSeaActive = playerTowns.some(t => ["EAST_NORTH", "EAST_MID", "SOUTH", "MIDDLE_SEA_CONTINENT"].includes(islandOfTown(t)));
  const isShieldActive = playerTowns.length >= 3;
  const isMapActive = clearedCount >= 5;

  const treasures = [
    {
      id: "sea_sword",
      name: "Kiếm Bão Biển",
      effect: "🗡️ Tăng +10% sức mạnh tấn công vượt biển cho toàn đạo quân.",
      condition: "Sở hữu ít nhất 1 thành phố giáp biển / vùng vịnh đảo khơi.",
      active: isSeaActive,
      icon: "⚔️"
    },
    {
      id: "sun_shield",
      name: "Khiên Thái Dương",
      effect: "🛡️ Giảm -15% tổn thất binh sĩ khi đồn trú phòng thủ thành trì.",
      condition: "Sở hữu từ 3 thành phố trở lên trên toàn thế giới.",
      active: isShieldActive,
      icon: "☀️"
    },
    {
      id: "lost_map",
      name: "Bản Đồ Thất Lạc",
      effect: "⛵ Tăng +20% tốc độ di chuyển của Thuyền chở quân vượt biển.",
      condition: "Xây thành thành công ít nhất 5 vùng đất hoang dã.",
      active: isMapActive,
      icon: "🗺️"
    }
  ];

  return (
    <div className="modal-overlay" style={styles.overlay}>
      <div className="modal-container" style={styles.container}>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
        <h2 style={styles.title}>👑 KHO BẢO VẬT HOÀNG GIA</h2>

        <div style={styles.listContainer}>
          {treasures.map((t) => (
            <div key={t.id} style={{ ...styles.card, opacity: t.active ? 1 : 0.55 }}>
              <div style={{ ...styles.iconBox, color: t.active ? "#ffd34d" : "#8196a3", borderColor: t.active ? "#b38f4f" : "#2b3b45" }}>{t.icon}</div>
              <div style={styles.details}>
                <div style={styles.header}>
                  <span style={{ ...styles.name, color: t.active ? "#ffd34d" : "#f6e7bd" }}>{t.name}</span>
                  <span style={{ ...styles.statusBadge, color: t.active ? "#73e05e" : "#ff3b30", borderColor: t.active ? "#73e05e" : "#ff3b30" }}>
                    {t.active ? "Đang kích hoạt" : "Chưa mở khóa"}
                  </span>
                </div>
                <div style={styles.effect}>{t.effect}</div>
                <div style={styles.condition}>Điều kiện: {t.condition}</div>
              </div>
            </div>
          ))}
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
    border: "1px solid #ffd34d",
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
    fontSize: "15px",
  },
  statusBadge: {
    fontSize: "11px",
    padding: "1px 6px",
    borderRadius: "3px",
    border: "1px solid",
  },
  effect: {
    fontSize: "13px",
    color: "#fff3d2",
    margin: "4px 0",
  },
  condition: {
    fontSize: "12px",
    color: "#8196a3",
  },
};
