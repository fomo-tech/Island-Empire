import React from "react";

interface Town {
  id: number;
  x: number;
  y: number;
  lvl: number;
  owner: number;
  troops: number;
  buildings?: {
    barracks: number;
    lumberCamp: number;
    quarry: number;
    goldMine: number;
    gemCutter: number;
    fort?: number;
    siegeWorkshop?: number;
    warehouse?: number;
  };
  storage?: Partial<ResourceBag>;
}

interface ResourceBag {
  gold: number;
  wood: number;
  stone: number;
  food: number;
  iron: number;
  coal: number;
  sulfur: number;
  gems: number;
}

interface BuildModalProps {
  town: Town;
  resources: ResourceBag;
  onBuild: (structureType: string, cost: Partial<ResourceBag>, name: string) => void;
  onClose: () => void;
}

export const BuildModal: React.FC<BuildModalProps> = ({ town, resources, onBuild, onClose }) => {
  const b = { barracks: 0, lumberCamp: 0, quarry: 0, goldMine: 0, gemCutter: 0, fort: 0, siegeWorkshop: 0, warehouse: 0, ...(town.buildings || {}) };

  const buildingList = [
    {
      type: "barracks",
      name: "Nhà Quân Sự",
      desc: "Học viện huấn luyện binh sĩ đồn trú đắc lực. Tích lũy đồn trú quốc gia.",
      cost: { wood: 160, stone: 120 },
      count: b.barracks || 0,
      icon: "⚔️"
    },
    {
      type: "lumberCamp",
      name: "Trại Cưa Gỗ",
      desc: "Trang bị xưởng cưa hơi nước, tăng mạnh sản lượng gỗ tại lãnh thổ này (+2.0 Gỗ/giây).",
      cost: { wood: 100, stone: 50 },
      count: b.lumberCamp || 0,
      icon: "🪓"
    },
    {
      type: "quarry",
      name: "Xưởng Khai Thác Đá",
      desc: "Mỏ khai thác đá tảng kiên cố, tăng mạnh sản lượng đá tại lãnh thổ này (+2.0 Đá/giây).",
      cost: { wood: 120, stone: 80 },
      count: b.quarry || 0,
      icon: "⛏️"
    },
    {
      type: "goldMine",
      name: "Hầm Mỏ Vàng",
      desc: "Lọc quặng vàng tự động bằng cơ chế rây, tăng mạnh sản lượng vàng tại lãnh thổ này (+3.0 Vàng/giây).",
      cost: { wood: 200, stone: 150 },
      count: b.goldMine || 0,
      icon: "🪙"
    },
    {
      type: "gemCutter",
      name: "Nhà Cắt Đá Quý",
      desc: "Mài dũa hồng ngọc và thạch anh, tăng sản lượng kim cương quý giá (+0.5 Gems/giây).",
      cost: { stone: 300, gems: 100 },
      count: b.gemCutter || 0,
      icon: "💎"
    },
    {
      type: "fort",
      name: "Pháo Đài",
      desc: "Tường đá, tháp canh và ụ bắn. Tăng mạnh phòng thủ khi bị công thành, đồng thời tăng sức chứa kho.",
      cost: { stone: 420, wood: 180, iron: 120 },
      count: b.fort || 0,
      icon: "🏯"
    },
    {
      type: "siegeWorkshop",
      name: "Xưởng Chiến Xa",
      desc: "Xưởng chế tạo pháo binh/xe công thành. Cần có công trình này mới huấn luyện được pháo binh.",
      cost: { wood: 260, stone: 220, iron: 160, coal: 80 },
      count: b.siegeWorkshop || 0,
      icon: "🛠️"
    },
    {
      type: "warehouse",
      name: "Kho Thành",
      desc: "Tăng giới hạn tài nguyên cất trong thành. Khi thành bị chiếm, phần lớn tài nguyên trong kho sẽ rơi vào tay người thắng.",
      cost: { wood: 240, stone: 160, food: 120 },
      count: b.warehouse || 0,
      icon: "📦"
    }
  ];

  const canAfford = (cost: Partial<ResourceBag>) => {
    return Object.entries(cost).every(([key, val]) => resources[key as keyof ResourceBag] >= val);
  };

  return (
    <div className="modal-overlay" style={styles.overlay}>
      <div className="modal-container" style={styles.container}>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
        <h2 style={styles.title}>🔨 XÂY DỰNG CÔNG TRÌNH - THÀNH PHỐ #{town.id}</h2>

        <div style={styles.listContainer}>
          {buildingList.map((item) => {
            const afford = canAfford(item.cost);
            return (
              <div key={item.type} style={styles.card}>
                <div style={styles.iconBox}>{item.icon}</div>
                <div style={styles.details}>
                  <div style={styles.header}>
                    <span style={styles.name}>{item.name}</span>
                    <span style={styles.countBadge}>Đã có: {item.count}</span>
                  </div>
                  <p style={styles.desc}>{item.desc}</p>
                  <div style={styles.costLine}>
                    Tốn:{" "}
                    {Object.entries(item.cost).map(([res, amount]) => (
                      <span key={res} style={resources[res as keyof ResourceBag] >= amount ? styles.enoughRes : styles.lackingRes}>
                        {amount} {res.toUpperCase()}{" "}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  disabled={!afford}
                  onClick={() => onBuild(item.type, item.cost, item.name)}
                  style={{
                    ...styles.buildBtn,
                    opacity: afford ? 1 : 0.45,
                    cursor: afford ? "pointer" : "not-allowed"
                  }}
                >
                  Xây dựng
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
    maxWidth: "580px",
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
    maxHeight: "420px",
    overflowY: "auto" as const,
    paddingRight: "6px",
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
    fontSize: "32px",
    background: "rgba(7, 16, 24, 0.5)",
    border: "1px solid #513922",
    borderRadius: "4px",
    padding: "10px",
    display: "grid",
    placeItems: "center",
    minWidth: "52px",
    height: "52px",
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
  countBadge: {
    background: "#2b3b45",
    color: "#ffd34d",
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
    color: "#73e05e",
  },
  lackingRes: {
    color: "#ff3b30",
  },
  buildBtn: {
    background: "#2b3b45",
    color: "#fff3d2",
    border: "2px solid #513922",
    padding: "8px 14px",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "bold" as const,
    fontFamily: "Courier New, monospace",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap" as const,
  },
};
