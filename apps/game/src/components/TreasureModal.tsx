import React from "react";
import { MedievalModal } from "./MedievalModal";
import { AssetIcon } from "./AssetIcon";

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

const SeaSwordIcon = ({ active }: { active: boolean }) => <AssetIcon asset="army" size={30} active={active} />;

const SunShieldIcon = ({ active }: { active: boolean }) => <AssetIcon asset="defender" size={30} active={active} />;

const LostMapIcon = ({ active }: { active: boolean }) => <AssetIcon asset="map" size={30} active={active} />;

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
      icon: <SeaSwordIcon active={isSeaActive} />
    },
    {
      id: "sun_shield",
      name: "Khiên Thái Dương",
      effect: "Giảm -15% tổn thất binh sĩ khi đồn trú phòng thủ thành trì.",
      condition: "Sở hữu từ 3 thành phố trở lên trên toàn thế giới.",
      active: isShieldActive,
      icon: <SunShieldIcon active={isShieldActive} />
    },
    {
      id: "lost_map",
      name: "Bản Đồ Thất Lạc",
      effect: "Tăng +20% tốc độ di chuyển của Thuyền chở quân vượt biển.",
      condition: "Xây thành thành công ít nhất 5 vùng đất hoang dã.",
      active: isMapActive,
      icon: <LostMapIcon active={isMapActive} />
    }
  ];

  return (
    <MedievalModal title="👑 SỰ KIỆN HOÀNG GIA" onClose={onClose} maxWidth="560px">
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
