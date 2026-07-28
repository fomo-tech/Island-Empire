import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Premium Vector Icons (SVG)
const SwordsIcon = () => (
  <svg className="rt-svg-icon" viewBox="0 0 64 64" width="16" height="16" style={{ marginRight: 6, verticalAlign: "middle" }}>
    <path d="M48 8l8 8-36 36-4 4-4-4 4-36z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
    <path d="M12 48l-4 8 8-4z" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
    <path d="M14 44l6 6" stroke="#d97706" strokeWidth="2" />
    <path d="M16 8l-8 8 36 36 4 4 4-4-4-36z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
    <path d="M52 48l4 8-8-4z" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
    <path d="M50 44l-6 6" stroke="#d97706" strokeWidth="2" />
    <circle cx="32" cy="24" r="5" fill="#fef08a" opacity="0.9" />
  </svg>
);

const PickaxeIcon = () => (
  <svg className="rt-svg-icon" viewBox="0 0 64 64" width="16" height="16" style={{ marginRight: 6, verticalAlign: "middle" }}>
    <path d="M44 8l12 12-4 4-12-12z" fill="#94a3b8" stroke="#334155" strokeWidth="2.5" />
    <path d="M10 54l30-30 4 4-30 30z" fill="#b45309" stroke="#451a03" strokeWidth="2.5" />
    <path d="M42 12c-8 8-16 6-16 6l8 8s2-8 8-14z" fill="#64748b" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="rt-svg-icon" viewBox="0 0 64 64" width="16" height="16" style={{ marginRight: 6, verticalAlign: "middle" }}>
    <path d="M32 6C18 10 12 18 12 32c0 14 12 22 20 26 8-4 20-12 20-26 0-14-6-22-20-26z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2.5" />
    <path d="M32 10v42c6-3 14-9 14-20 0-10-4-16-14-22z" fill="#60a5fa" />
    <path d="M26 22h12v4H26zm0 8h12v4H26z" fill="#ffffff" opacity="0.7" />
  </svg>
);

const CancelIcon = () => (
  <svg className="rt-svg-icon" viewBox="0 0 64 64" width="16" height="16" style={{ marginRight: 6, verticalAlign: "middle" }}>
    <circle cx="32" cy="32" r="26" fill="#ef4444" stroke="#b91c1c" strokeWidth="2.5" />
    <path d="M20 20l24 24M44 20l-24 24" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
  </svg>
);

const CoinIcon = () => (
  <svg className="rt-yield-icon" viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 5, verticalAlign: "middle" }}>
    <circle cx="32" cy="32" r="26" fill="#ffd700" stroke="#b57c1e" strokeWidth="2" />
    <circle cx="32" cy="32" r="16" fill="#ffe066" stroke="#b57c1e" strokeWidth="1" />
    <path d="M32 18v28M26 24h12M26 38h12" stroke="#b57c1e" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const WoodIcon = () => (
  <svg className="rt-yield-icon" viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 5, verticalAlign: "middle" }}>
    <path d="M8 20h48v16H8z" fill="#b45309" stroke="#451a03" strokeWidth="2" />
    <path d="M12 24h40v8H12z" fill="#d97706" />
    <circle cx="56" cy="28" r="8" fill="#f59e0b" stroke="#451a03" strokeWidth="2.5" />
    <circle cx="56" cy="28" r="4" fill="#d97706" />
  </svg>
);

const StoneIcon = () => (
  <svg className="rt-yield-icon" viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 5, verticalAlign: "middle" }}>
    <path d="M12 36l12-24h20l12 24-16 16H24z" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
    <path d="M24 16l14 6-6 26" stroke="#cbd5e1" strokeWidth="2" fill="none" />
    <path d="M14 36h38" stroke="#475569" strokeWidth="2" fill="none" />
  </svg>
);

const GemIcon = () => (
  <svg className="rt-yield-icon" viewBox="0 0 64 64" width="14" height="14" style={{ marginRight: 5, verticalAlign: "middle" }}>
    <path d="M32 6L10 24l22 34 22-34z" fill="#06b6d4" stroke="#0891b2" strokeWidth="2" />
    <path d="M32 6L20 24h24z" fill="#22d3ee" />
    <path d="M32 58L20 24h24z" fill="#0891b2" opacity="0.6" />
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 64 64" width="12" height="12" style={{ marginRight: 5, verticalAlign: "middle", display: "inline-block" }}>
    <path d="M32 6C20 6 12 14 12 26c0 14 20 32 20 32s20-18 20-32c0-12-8-20-20-20z" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
    <circle cx="32" cy="24" r="8" fill="#ffffff" />
  </svg>
);

const HourglassIcon = () => (
  <svg viewBox="0 0 64 64" width="12" height="12" style={{ marginRight: 5, verticalAlign: "middle", display: "inline-block" }}>
    <path d="M14 10h36v6c0 10-10 14-16 16 6 2 16 6 16 16v6H14v-6c0-10 10-14 16-16-6-2-16-6-16-16z" fill="#e2e8f0" stroke="#475569" strokeWidth="2.5" />
    <path d="M20 14h24v2L32 28 20 16zm0 34h24v-2L32 34 20 46z" fill="#94a3b8" />
    <path d="M28 42h8v2h-8z" fill="#ffffff" />
  </svg>
);

const CrownIcon = () => (
  <svg viewBox="0 0 64 64" width="12" height="12" style={{ marginRight: 5, verticalAlign: "middle", display: "inline-block" }}>
    <path d="M8 50l4-32 12 14 8-18 8 18 12-14 4 32z" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
    <rect x="8" y="50" width="48" height="6" fill="#d97706" rx="2" />
    <circle cx="32" cy="10" r="3" fill="#ef4444" />
    <circle cx="12" cy="18" r="3" fill="#3b82f6" />
    <circle cx="52" cy="18" r="3" fill="#3b82f6" />
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 64 64" width="12" height="12" style={{ marginRight: 5, verticalAlign: "middle", display: "inline-block" }}>
    <circle cx="32" cy="32" r="26" fill="#10b981" stroke="#047857" strokeWidth="2" />
    <path d="M12 32c0 6 8 10 20 10s20-4 20-10-8-10-20-10-20 4-20 10zm20-20c-6 0-10 8-10 20s4 20 10 20 10-8 10-20-4-20-10-20z" stroke="#047857" strokeWidth="2" fill="none" />
  </svg>
);

const BannerFlagIcon = () => (
  <svg viewBox="0 0 40 60" width="28" height="42" style={{ flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
    <path d="M5 2h30v38l-15-8-15 8V2z" fill="#8c2a1e" stroke="#b38f4f" strokeWidth="1.5" />
    <rect x="2" y="0" width="36" height="4" fill="#ffd34d" rx="1" />
    <path d="M14 14h12v12h-12z" fill="#ffd34d" />
    <path d="M12 14l3-4h10l3 4z" fill="#b38f4f" />
    <path d="M16 26v-6h8v6z" fill="#8c2a1e" />
    <circle cx="20" cy="18" r="2" fill="#ffd34d" />
  </svg>
);

interface TerritoryTooltipProps {
  region: {
    id: number;
    isIslet: boolean;
    ownership: number;
  };
  engine: any;
  onClose?: () => void;
  onKhaiHoang: (regionId: number) => void;
  onHuyKhaiHoang: (regionId: number) => void;
  onAttack: (regionId: number) => void;
  onReinforce: (regionId: number, side?: "attacker" | "defender") => void;
}

export function TerritoryTooltip({
  region,
  engine,
  onClose,
  onKhaiHoang,
  onHuyKhaiHoang,
  onAttack,
  onReinforce
}: TerritoryTooltipProps) {
  const { id, isIslet, ownership } = region;
  const engineState = engine.getState();
  const effectiveOwnership = engine.getRegionOwnership?.(id) ?? ownership;

  const r = engine.getRegion?.(id) || (isIslet ? engine.getIslets()?.[id - 1000] : engine.getRegions()?.[id]);
  const specialResources = engine.getTerritorySpecialResources?.(id) || [];

  if (!r) return null;

  const coords = engine.mapToScreen(r.x, r.y);

  const biome = r.biome ?? 0;
  const biomeNames = ["Cỏ Xanh", "Sa Mạc", "Băng Tuyết", "Hỏa Sơn", "Lục Lam", "Vàng Cam", "Rừng Thông", "Đầm Lầy"];
  const biomeColors = ["#7fbd45", "#d8ad36", "#ece5d3", "#cf6337", "#3cc5f0", "#ff9736", "#66aa42", "#a4d28b"];
  const biomeDescriptions = [
    "Vùng đồng cỏ xanh tươi trù phú, thời tiết ôn hòa, thích hợp định cư lâu dài.",
    "Vùng đất khô cằn rộng lớn, giàu tài nguyên nhưng luôn tiềm ẩn nguy cơ xung đột.",
    "Vùng lãnh nguyên giá buốt, tuyết phủ quanh năm, địa hình khó di chuyển.",
    "Vùng đất lửa đầy khoáng sản quý hiếm, nhiệt độ cực cao vô cùng nguy hiểm.",
    "Đảo ngọc lục lam tuyệt đẹp giữa đại dương, dồi dào tài nguyên biển quý giá.",
    "Vũng vịnh vàng cam tráng lệ, giao thương thuận lợi, đất đai màu mỡ.",
    "Cánh rừng thông bạt ngàn hoang dã, nguồn gỗ dồi dào và nguyên liệu dã chiến.",
    "Vùng nước sâu đầm lầy u ám, ẩn giấu nhiều cạm bẫy và kho báu cổ xưa."
  ];

  const bName = biomeNames[biome] || "Hoang Dã";
  const bColor = biomeColors[biome] || "#3cc5f0";
  const bDesc = biomeDescriptions[biome] || "Vùng đất hoang dã chưa được khai phá.";

  const rx = r.rx || r.r || 100;
  const ry = r.ry || r.r || 80;
  const area = rx * ry;

  // Balancing yields
  const areaFactor = area / 10000;
  const BIOME_BASE_YIELDS = [
    { gold: 0.005, wood: 0.008, stone: 0.002, food: 0.014, iron: 0.002, coal: 0.000, sulfur: 0.000, gems: 0.0003 },
    { gold: 0.012, wood: 0.001, stone: 0.007, food: 0.003, iron: 0.003, coal: 0.001, sulfur: 0.001, gems: 0.0030 },
    { gold: 0.002, wood: 0.002, stone: 0.011, food: 0.002, iron: 0.008, coal: 0.005, sulfur: 0.0005, gems: 0.0022 },
    { gold: 0.003, wood: 0.000, stone: 0.012, food: 0.001, iron: 0.011, coal: 0.009, sulfur: 0.008, gems: 0.0012 },
    { gold: 0.003, wood: 0.002, stone: 0.004, food: 0.003, iron: 0.003, coal: 0.001, sulfur: 0.002, gems: 0.0075 },
    { gold: 0.006, wood: 0.005, stone: 0.002, food: 0.011, iron: 0.002, coal: 0.000, sulfur: 0.000, gems: 0.0030 },
    { gold: 0.002, wood: 0.016, stone: 0.004, food: 0.008, iron: 0.002, coal: 0.002, sulfur: 0.000, gems: 0.0000 },
    { gold: 0.004, wood: 0.012, stone: 0.001, food: 0.010, iron: 0.001, coal: 0.003, sulfur: 0.002, gems: 0.0012 },
  ];
  const bYield = BIOME_BASE_YIELDS[biome] || BIOME_BASE_YIELDS[0];

  let g = bYield.gold * areaFactor;
  let w = bYield.wood * areaFactor;
  let s = bYield.stone * areaFactor;
  let food = bYield.food * areaFactor;
  let iron = bYield.iron * areaFactor;
  let coal = bYield.coal * areaFactor;
  let sulfur = bYield.sulfur * areaFactor;
  let gem = bYield.gems * areaFactor;

  if (r.isIslet) {
    g *= 1.25;
    w *= 0.3;
    s *= 0.5;
    food *= 0.45;
    iron *= 0.55;
    coal *= 0.35;
    sulfur *= 1.25;
    gem *= 2.8;
  }

  const buildCost = {
    gold: Math.round(180 + Math.max(0.85, areaFactor) * 32 + g * 92 + gem * 70),
    wood: Math.round(130 + Math.max(0.85, areaFactor) * 28 + w * 66),
    stone: Math.round(125 + Math.max(0.85, areaFactor) * 34 + s * 76 + iron * 28),
    food: Math.round(80 + Math.max(0.85, areaFactor) * 18 + food * 42),
    iron: Math.round(20 + iron * 95 + sulfur * 30),
    gems: Math.round(Math.max(0, gem - 0.28) * 22),
  };
  const buildCostText = [
    `${buildCost.gold} vàng`,
    `${buildCost.wood} gỗ`,
    `${buildCost.stone} đá`,
    `${buildCost.food} lương`,
    buildCost.iron > 0 ? `${buildCost.iron} sắt` : "",
    buildCost.gems > 0 ? `${buildCost.gems} kim cương` : "",
  ].filter(Boolean).join(" · ");

  const clearingDuration = () => {
    const rxVal = r.rx || r.r || 100;
    const ryVal = r.ry || (r.r || 100) * 0.78;
    const biomeMult = [1.0, 1.25, 1.55, 1.75, 1.45, 1.1, 1.25, 1.65][biome] || 1;
    return Math.max(8, Math.min(180, Math.round((rxVal * ryVal / 650) * biomeMult)));
  };
  const dur = clearingDuration();

  const mainTown = engineState.towns?.find((t: any) => t.owner === 0);
  const distanceKm = mainTown && r ? Math.round(Math.hypot(r.x - mainTown.x, r.y - mainTown.y)) : 100;
  const marchMinutes = Math.max(1, Math.round(distanceKm / 10));

  const isClearingInProgress = engineState.regionInProgress === id;
  const isSettlerTraveling = engineState.settlerTravel?.active && engineState.settlerTravel.targetRegionId === id;
  const isNewbieSelecting = engineState.newbieMode && engineState.newbiePhase === "select_land";
  const ownerId = engineState.regionOwnerIds?.[id] || "";
  const rawOwnerName = engineState.regionOwnerNames?.[id] || "";
  const isLocalOwner = Boolean(ownerId && ownerId === engineState.localPlayerId);
  const isRemoteClearing = effectiveOwnership === 0 && rawOwnerName === "ĐANG KHAI HOANG";
  const displayOwnerName = isLocalOwner ? "Bạn" : rawOwnerName && rawOwnerName !== "ĐANG KHAI HOANG" ? rawOwnerName : ownerId || "Không rõ";

  const isUnderBattle = engineState.activeBattles?.some((b: any) => b.regionId === id);

  const statusText = isUnderBattle 
    ? "Đang Giao Tranh ⚔️"
    : isRemoteClearing
      ? "Đang Xây Thành"
    : effectiveOwnership === 1 
      ? "Đã Chiếm" 
      : effectiveOwnership > 1 
        ? "Địch Chiếm" 
        : "Hoang Dã";

  const statusClass = isUnderBattle
    ? "battle"
    : isRemoteClearing
      ? "wild"
    : effectiveOwnership === 1 
      ? "owned" 
      : effectiveOwnership > 1 
        ? "enemy" 
        : "wild";

  // Position relative to screen (placed to the right of the selected region)
  const zoom = engineState.zoom || 1;
  const cardW = 275;
  const cardH = 290;

  let left = coords.x + rx * zoom + 16;
  let top = coords.y - cardH / 2;

  // Smart Clamping to Viewport Bounds
  const winW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;

  // If tooltip goes off right side, flip it to the left side of the region
  let positionClass = "pointer-left";
  if (left + cardW > winW - 16) {
    left = coords.x - rx * zoom - cardW - 16;
    positionClass = "pointer-right";
  }

  if (left < 16) left = 16;
  if (top < 16) top = 16;
  if (top + cardH > winH - 16) top = winH - cardH - 16;

  const runAndClose = (action: () => void) => {
    action();
    onClose?.();
  };

  // Render proper action buttons & warning notes
  const renderActionButtons = () => {
    if (isUnderBattle) {
      const isPlayerOwned = effectiveOwnership === 1;
      if (isPlayerOwned) {
        return (
          <>
            <button
              type="button"
              className="rt-action-btn primary"
              onClick={() => runAndClose(() => onReinforce(id, "defender"))}
            >
              <ShieldIcon /> TIẾP VIỆN PHÒNG THỦ
            </button>
            <div className="rt-warning-note">⚠️ Quân tới nơi sẽ cộng vào phe phòng thủ của thành trì</div>
          </>
        );
      }
      return (
        <>
          <button
            type="button"
            className="rt-action-btn danger"
            onClick={() => runAndClose(() => onReinforce(id, "attacker"))}
          >
            <SwordsIcon /> TIẾP VIỆN TẤN CÔNG
          </button>
          <div className="rt-warning-note">⚠️ Quân tới nơi sẽ cộng vào phe tấn công đang giao tranh</div>
        </>
      );
    }

    if (effectiveOwnership === 1) {
      return (
        <>
          <button
            type="button"
            className="rt-action-btn success"
            onClick={() => {
              engine.handleAction("selectTown", { regionId: id });
            }}
          >
            🏰 QUẢN LÝ THÀNH PHỐ
          </button>
          <div className="rt-warning-note">⚠️ Quản lý quân đội, tài nguyên và nâng cấp công trình của thành phố</div>
        </>
      );
    }

    if (effectiveOwnership === 0) {
      if (isClearingInProgress || isSettlerTraveling) {
        const timing = engineState.activeClearingTimings?.[id];
        const p = Math.min(1, engineState.regionClearing?.[id] || 0);
        let remSec = Math.max(0, Math.ceil((1 - p) * dur));
        if (timing?.completesAt) {
          const completesMs = typeof timing.completesAt === "number" ? timing.completesAt : new Date(timing.completesAt).getTime();
          if (Number.isFinite(completesMs)) {
            remSec = Math.max(0, Math.ceil((completesMs - Date.now()) / 1000));
          }
        }
        const m = Math.floor(remSec / 60);
        const s = remSec % 60;
        const countdownStr = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        const pctVal = Math.round(p * 100);

        return (
          <>
            <div style={{
              background: "rgba(16, 28, 40, 0.85)",
              border: "1px solid #ffd34d",
              borderRadius: "8px",
              padding: "8px 12px",
              marginBottom: "10px",
              textAlign: "center",
              boxShadow: "inset 0 0 10px rgba(255, 211, 77, 0.2)"
            }}>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#ffd34d", marginBottom: "4px" }}>
                ĐANG XÂY THÀNH: {countdownStr} ({pctVal}%)
              </div>
              <div style={{
                height: "6px",
                background: "rgba(0,0,0,0.6)",
                borderRadius: "4px",
                overflow: "hidden",
                border: "1px solid rgba(255, 211, 77, 0.3)"
              }}>
                <div style={{
                  height: "100%",
                  width: `${pctVal}%`,
                  background: "linear-gradient(90deg, #10b981, #ffd34d)",
                  boxShadow: "0 0 8px rgba(16, 185, 129, 0.8)",
                  transition: "width 0.3s ease"
                }} />
              </div>
            </div>

            <button
              type="button"
              className="rt-action-btn danger"
              onClick={() => runAndClose(() => onHuyKhaiHoang(id))}
            >
              <CancelIcon /> HỦY XÂY THÀNH
            </button>
            <div className="rt-warning-note">Hủy xây thành sẽ thu hồi đội thợ và hoàn tài nguyên</div>
          </>
        );
      }
      if (engineState.regionInProgress >= 0) {
        return (
          <>
            <button
              type="button"
              className="rt-action-btn success"
              disabled
              style={{ opacity: 0.65, cursor: "not-allowed", filter: "grayscale(30%)" }}
              title="Mỗi người chơi chỉ có 1 đội thợ xây thành tại một thời điểm!"
            >
              <HourglassIcon /> ĐỘI THỢ ĐANG BẬN
            </button>
            <div className="rt-warning-note">Mỗi người chơi chỉ có 1 đội thợ xây thành tại một thời điểm</div>
          </>
        );
      }
      return (
        <>
          <button
            type="button"
            className={`rt-action-btn success ${isNewbieSelecting ? "pulse" : ""}`}
            onClick={() => runAndClose(() => onKhaiHoang(id))}
          >
            <PickaxeIcon /> {isNewbieSelecting ? "XÂY THÀNH TÂN THỦ" : "XÂY THÀNH"}
          </button>
          <div className="rt-warning-note">Chi phí: {buildCostText}</div>
          <div className="rt-warning-note">Xây xong sẽ lập thành trì mới. Vùng càng giàu tài nguyên càng tốn nhiều chi phí.</div>
        </>
      );
    }

    if (effectiveOwnership > 1) {
      return (
        <>
          <button
            type="button"
            className="rt-action-btn danger"
            onClick={() => runAndClose(() => onAttack(id))}
          >
            <SwordsIcon /> PHÁT ĐỘNG TẤN CÔNG
          </button>
          <div className="rt-warning-note">⚠️ Tấn công thành công sẽ chiếm quyền kiểm soát lãnh thổ</div>
        </>
      );
    }

    return null;
  };

  const tooltipElement = (
    <div
      className={`rt-tooltip-container ${positionClass}`}
      style={{
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        width: `${cardW}px`,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      <div 
        className="rt-tooltip-card" 
        style={{ pointerEvents: "auto" }}
      >
        {/* Header */}
        <div className="rt-tooltip-header">
          <div style={{ display: "flex", gap: 10, width: "100%", position: "relative" }}>
            <BannerFlagIcon />
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <div className="rt-zone-id">{isIslet ? `ĐẢO NHỎ #${id - 1000 + 1}` : `LÃNH THỔ #${id + 1}`}</div>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rt-close-btn"
                    title="Đóng bảng thông tin"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="rt-biome-badge" style={{ color: bColor, backgroundColor: `${bColor}15`, border: `1.2px solid ${bColor}50` }}>
                  {bName}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Biome Description Lore */}
        <div className="rt-biome-desc">
          {bDesc}
        </div>

        {/* Diamond Divider */}
        <div className="rt-tooltip-divider">
          <div className="rt-divider-line" />
          <div className="rt-divider-diamond">♦</div>
          <div className="rt-divider-line" />
        </div>

        {/* Stats List */}
        <div className="rt-tooltip-body">
          <div className="rt-info-row">
            <span className="rt-label"><GlobeIcon /> Loại đất:</span>
            <span className="rt-val">{isIslet ? "Đảo nhỏ" : "Lục địa lớn"}</span>
          </div>
          {effectiveOwnership === 0 && (
            <>
              <div className="rt-info-row">
                <span className="rt-label"><MapPinIcon /> Khoảng cách:</span>
                <span className="rt-val">{distanceKm} km</span>
              </div>
              <div className="rt-info-row">
                <span className="rt-label"><HourglassIcon /> Thời gian:</span>
                <span className="rt-val highlighted">{marchMinutes} phút ({dur}s game)</span>
              </div>
            </>
          )}
          <div className="rt-info-row">
            <span className="rt-label"><ShieldIcon /> Trạng thái:</span>
            <span className={`rt-val rt-status ${statusClass}`}>{statusText}</span>
          </div>
          {(effectiveOwnership > 0 || isRemoteClearing) && (
            <div className="rt-info-row">
              <span className="rt-label"><CrownIcon /> {isRemoteClearing ? "Xây thành:" : "Chủ:"}</span>
              <span className="rt-val">{displayOwnerName}</span>
            </div>
          )}
        </div>

        {/* Resources Yield Section */}
        <div className="rt-yield-title-container">
          <div className="rt-yield-line" />
          <div className="rt-yield-title">TÀI NGUYÊN / GIÂY</div>
          <div className="rt-yield-line" />
        </div>
        
        <div className="rt-yield-grid">
          {g > 0.05 && (
            <div className="rt-yield-pill gold">
              <CoinIcon /> {g.toFixed(1)}/s
          </div>
          )}
          {w > 0.05 && (
            <div className="rt-yield-pill wood">
              <WoodIcon /> {w.toFixed(1)}/s
            </div>
          )}
          {s > 0.05 && (
            <div className="rt-yield-pill stone">
              <StoneIcon /> {s.toFixed(1)}/s
            </div>
          )}
          {food > 0.05 && (
            <div className="rt-yield-pill food">
              <span className="rt-yield-emoji">🌾</span> {food.toFixed(1)}/s
            </div>
          )}
          {iron > 0.05 && (
            <div className="rt-yield-pill iron">
              <span className="rt-yield-emoji">▣</span> {iron.toFixed(1)}/s
            </div>
          )}
          {coal > 0.05 && (
            <div className="rt-yield-pill coal">
              <span className="rt-yield-emoji">◆</span> {coal.toFixed(1)}/s
            </div>
          )}
          {sulfur > 0.05 && (
            <div className="rt-yield-pill sulfur">
              <span className="rt-yield-emoji">✹</span> {sulfur.toFixed(1)}/s
            </div>
          )}
          {gem > 0.01 && (
            <div className="rt-yield-pill gems">
              <GemIcon /> {gem.toFixed(1)}/s
            </div>
          )}
        </div>

        {specialResources.length > 0 && (
          <>
            <div className="rt-yield-title-container">
              <div className="rt-yield-line" />
              <div className="rt-yield-title">ĐẶC BIỆT</div>
              <div className="rt-yield-line" />
            </div>
            <div className="rt-special-grid">
              {specialResources.map((item: string) => (
                <div key={item} className="rt-special-pill">
                  <span className="rt-yield-emoji">{item.includes("ngựa") ? "♞" : item.includes("tàu") ? "⚓" : item.includes("sắt") ? "▣" : "✹"}</span>
                  {item}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Action Button Section */}
        <div style={{ marginTop: "12px", width: "100%" }}>
          {renderActionButtons()}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(tooltipElement, document.body) : tooltipElement;
}
