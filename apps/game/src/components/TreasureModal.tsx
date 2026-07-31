import React from "react";
import { MedievalModal } from "./MedievalModal";

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

const SeaSwordSVG = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" width="30" height="30" fill="none" stroke={active ? "#9a3412" : "#64748b"} strokeWidth="3" strokeLinecap="round">
    <line x1="16" y1="48" x2="48" y2="16" />
    <line x1="14" y1="50" x2="22" y2="42" />
    <path d="M12 52 L10 54 L6 50 L8 48 Z" fill={active ? "#9a3412" : "#64748b"} />
    <line x1="20" y1="44" x2="24" y2="48" />
  </svg>
);

const SunShieldSVG = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" width="30" height="30" fill="none" stroke={active ? "#9a3412" : "#64748b"} strokeWidth="3" strokeLinejoin="round">
    <path d="M32 6 C42 10 50 11 54 12 V28 C54 42 42 50 32 58 C22 50 10 42 10 28 V12 C14 11 22 10 32 6 Z" />
    <circle cx="32" cy="26" r="8" />
    <path d="M32 14 L32 18 M32 34 L32 38 M20 26 L24 26 M38 26 L42 26" />
  </svg>
);

const LostMapSVG = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 64 64" width="30" height="30" fill="none" stroke={active ? "#9a3412" : "#64748b"} strokeWidth="3">
    <path d="M12 14 L24 8 L40 14 L52 8 V48 L40 54 L24 48 L12 54 Z" strokeLinejoin="round" />
    <line x1="24" y1="8" x2="24" y2="48" />
    <line x1="40" y1="14" x2="40" y2="54" />
    <circle cx="32" cy="30" r="4" fill={active ? "#9a3412" : "#64748b"} />
  </svg>
);

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

  const isSeaActive = playerTowns.some(t => ["EAST_NORTH", "EAST_MID", "SOUTH", "MIDDLE_SEA_CONTINENT"].includes(islandOfTown(t)));
  const isShieldActive = playerTowns.length >= 3;
  const isMapActive = clearedCount >= 5;

  const treasures = [
    {
      id: "sea_sword",
      name: "Kiếm Bão Biển",
      effect: "Tăng +10% sức mạnh tấn công vượt biển cho toàn đạo quân.",
      condition: "Sở hữu ít nhất 1 thành phố giáp biển / vùng vịnh đảo khơi.",
      active: isSeaActive,
      icon: <SeaSwordSVG active={isSeaActive} />
    },
    {
      id: "sun_shield",
      name: "Khiên Thái Dương",
      effect: "Giảm -15% tổn thất binh sĩ khi đồn trú phòng thủ thành trì.",
      condition: "Sở hữu từ 3 thành phố trở lên trên toàn thế giới.",
      active: isShieldActive,
      icon: <SunShieldSVG active={isShieldActive} />
    },
    {
      id: "lost_map",
      name: "Bản Đồ Thất Lạc",
      effect: "Tăng +20% tốc độ di chuyển của Thuyền chở quân vượt biển.",
      condition: "Xây thành thành công ít nhất 5 vùng đất hoang dã.",
      active: isMapActive,
      icon: <LostMapSVG active={isMapActive} />
    }
  ];

  return (
    <MedievalModal title="👑 KHO BẢO VẬT HOÀNG GIA" onClose={onClose} maxWidth="560px">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {treasures.map((t) => (
          <div 
            key={t.id} 
            className="guide-step-card" 
            style={{ 
              opacity: t.active ? 1 : 0.55, 
              display: "flex", 
              gap: 16, 
              padding: 16,
              alignItems: "center"
            }}
          >
            <div 
              style={{ 
                background: "rgba(0,0,0,0.06)", 
                border: `2px solid ${t.active ? "#9a3412" : "#94a3b8"}`, 
                borderRadius: 8, 
                padding: 10,
                display: "grid",
                placeItems: "center",
                minWidth: 54,
                height: 54
              }}
            >
              {t.icon}
            </div>
            
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 16, color: "#1c1816" }}>{t.name}</strong>
                <span className={t.active ? "coming-soon-badge" : "coming-soon-badge disabled"} style={{ fontSize: 10, padding: "2px 8px", background: t.active ? undefined : "#64748b" }}>
                  {t.active ? "KÍCH HOẠT" : "KHÓA"}
                </span>
              </div>
              <p style={{ fontSize: 13, margin: "4px 0", lineHeight: 1.4, fontWeight: 600 }}>🌟 Hiệu ứng: {t.effect}</p>
              <small style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", fontStyle: "italic" }}>Điều kiện: {t.condition}</small>
            </div>
          </div>
        ))}
      </div>
    </MedievalModal>
  );
};
