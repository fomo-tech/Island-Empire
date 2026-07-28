import React from "react";

interface ResearchState {
  sword: number;
  stirrups: number;
  cannon: number;
  travel: number;
}

interface ResourceBag {
  gold: number;
  wood: number;
  stone: number;
  gems: number;
}

interface ResearchModalProps {
  research: ResearchState;
  resources: ResourceBag;
  onUpgrade: (techType: string, cost: Partial<ResourceBag>, name: string) => void;
  onClose: () => void;
}

export const ResearchModal: React.FC<ResearchModalProps> = ({ research, resources, onUpgrade, onClose }) => {
  const r = research || { sword: 0, stirrups: 0, cannon: 0, travel: 0 };

  const techList = [
    {
      type: "sword",
      name: "Rèn Kiếm Cương",
      desc: "Nâng cao chất lượng thép tôi luyện cho vũ khí bộ binh. Tăng +15% lực chiến Bộ Binh mỗi cấp.",
      baseCost: { gold: 120, gems: 40 },
      lvl: r.sword || 0,
      icon: "🗡️"
    },
    {
      type: "stirrups",
      name: "Yên Ngựa Bọc Thép",
      desc: "Chế tạo bàn đạp ngựa và yên bọc giáp bền bỉ. Tăng +20% tốc độ hành quân của Kị Binh mỗi cấp.",
      baseCost: { gold: 180, gems: 60 },
      lvl: r.stirrups || 0,
      icon: "🏇"
    },
    {
      type: "cannon",
      name: "Đúc Pháo Đồng",
      desc: "Cải tiến công nghệ làm nòng pháo và đạn pháo nổ. Tăng +25% tốc độ hành quân của Pháo Binh mỗi cấp.",
      baseCost: { gold: 280, gems: 100 },
      lvl: r.cannon || 0,
      icon: "💣"
    },
    {
      type: "travel",
      name: "Bản Đồ Viễn Chinh",
      desc: "Vẽ lại hải đồ thế giới để tối ưu hóa lộ trình. Tăng +15% tốc độ di chuyển của đạo quân vượt biển mỗi cấp.",
      baseCost: { gold: 220, gems: 90 },
      lvl: r.travel || 0,
      icon: "🗺️"
    }
  ];

  const getCost = (baseCost: { gold: number; gems: number }, lvl: number) => {
    const scale = lvl + 1;
    return {
      gold: baseCost.gold * scale,
      gems: baseCost.gems * scale
    };
  };

  const canAfford = (cost: { gold: number; gems: number }) => {
    return resources.gold >= cost.gold && resources.gems >= cost.gems;
  };

  return (
    <div className="modal-overlay" style={styles.overlay}>
      <div className="modal-container" style={styles.container}>
        <button onClick={onClose} style={styles.closeBtn}>×</button>
        <h2 style={styles.title}>🔬 HỌC VIỆN NGHIÊN CỨU</h2>

        <div style={styles.listContainer}>
          {techList.map((item) => {
            const cost = getCost(item.baseCost, item.lvl);
            const afford = canAfford(cost);
            return (
              <div key={item.type} style={styles.card}>
                <div style={styles.iconBox}>{item.icon}</div>
                <div style={styles.details}>
                  <div style={styles.header}>
                    <span style={styles.name}>{item.name}</span>
                    <span style={styles.countBadge}>Cấp: {item.lvl}</span>
                  </div>
                  <p style={styles.desc}>{item.desc}</p>
                  <div style={styles.costLine}>
                    Tốn:{" "}
                    <span style={resources.gold >= cost.gold ? styles.enoughRes : styles.lackingRes}>
                      {cost.gold} VÀNG
                    </span>{" "}
                    |{" "}
                    <span style={resources.gems >= cost.gems ? styles.enoughRes : styles.lackingRes}>
                      {cost.gems} GEMS
                    </span>
                  </div>
                </div>
                <button
                  disabled={!afford}
                  onClick={() => onUpgrade(item.type, cost, item.name)}
                  style={{
                    ...styles.upgradeBtn,
                    opacity: afford ? 1 : 0.45,
                    cursor: afford ? "pointer" : "not-allowed"
                  }}
                >
                  Nghiên cứu
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
  upgradeBtn: {
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
