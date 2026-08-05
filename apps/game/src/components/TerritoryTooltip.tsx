import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ActiveBattle,
  ActiveClearing,
  TerritoryInfo,
  TownSnapshot,
} from "@island/shared";
import { RESOURCE_META, ResourceIcon } from "./ResourceDisplay";
import {
  SPECIAL_RESOURCE_META,
  SpecialResourceIcon,
  getSpecialResourceMeta,
} from "./SpecialResourceDisplay";
import { AssetIcon } from "./AssetIcon";
import { ConfirmModal } from "./ConfirmModal";

// --- PREMIUM MEDIEVAL SPRITE ICON HELPER ---
interface SpriteIconProps {
  src: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const SpriteIcon = ({
  src,
  size = 16,
  className = "",
  style = {},
}: SpriteIconProps) => {
  return (
    <img
      src={src}
      alt=""
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "contain",
        verticalAlign: "middle",
        flexShrink: 0,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
        ...style,
      }}
      className={className}
    />
  );
};

const BannerFlagIcon = ({ color }: { color?: string }) => {
  const flagColor = color || "#8c2a1e";
  return (
    <span
      className="rt-banner-flag-raster"
      style={{ backgroundColor: flagColor }}
      aria-hidden="true"
    >
      <AssetIcon asset="crown" size={24} />
    </span>
  );
  return (
    <svg
      viewBox="0 0 40 60"
      width="32"
      height="48"
      style={{
        flexShrink: 0,
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))",
      }}
    >
      <path
        d="M4 2h32v44l-16-10-16 10V2z"
        fill={flagColor}
        stroke="#ca8a04"
        strokeWidth="2"
      />
      <rect x="2" y="0" width="36" height="5" fill="#ffd34d" rx="1" />
      <path
        d="M14 14h12v14h-12z"
        fill="#ffd34d"
        stroke="#ca8a04"
        strokeWidth="1"
      />
    </svg>
  );
};

const CSSDiamond = ({
  color = "#e5bd5a",
  size = 6,
  style = {},
}: {
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}) => (
  <span
    style={{
      display: "inline-block",
      width: `${size}px`,
      height: `${size}px`,
      border: `1.5px solid ${color}`,
      backgroundColor: "transparent",
      transform: "rotate(45deg)",
      margin: "0 6px",
      verticalAlign: "middle",
      boxSizing: "border-box",
      ...style,
    }}
  />
);

const BIOME_CRESTS = [
  "/assets/ui/hud_lion_crest.png", // Green grass
  "/assets/ui/hud_globe_emblem.png", // Desert
  "/assets/ui/hud_profile_crest.png", // Snow
  "/assets/ui/hud_capital_emblem.png", // Volcano
  "/assets/ui/hud_globe_emblem.png", // Blue-green
  "/assets/ui/hud_lion_crest.png", // Orange-gold
  "/assets/ui/hud_profile_crest.png", // Pine forest
  "/assets/ui/hud_capital_emblem.png", // Swamp
];

const BiomeMedievalCard = ({
  biome,
  color,
}: {
  biome: number;
  color: string;
}) => {
  const crestSrc = BIOME_CRESTS[biome] || "/assets/ui/hud_lion_crest.png";
  return (
    <div
      className="rt-biome-medieval-card"
      style={{
        width: "90px",
        height: "90px",
        borderRadius: "12px",
        border: "2px solid #b38f4f",
        background: `radial-gradient(circle, ${color}30 0%, #0a1118 100%)`,
        boxShadow: "inset 0 0 15px rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "3px",
          border: "1px solid rgba(229, 189, 90, 0.25)",
          borderRadius: "9px",
          pointerEvents: "none",
        }}
      />
      <img
        src={crestSrc}
        alt=""
        style={{
          width: "56px",
          height: "56px",
          objectFit: "contain",
          filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.8))",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
};

interface TerritoryTooltipProps {
  region: {
    id: number;
    isIslet: boolean;
    ownership: number;
  };
  engine: any;
  territory?: TerritoryInfo;
  town?: TownSnapshot;
  clearing?: ActiveClearing;
  battle?: ActiveBattle;
  playerId?: string | null;
  ownedTowns?: TownSnapshot[];
  onClose?: () => void;
  onKhaiHoang: (regionId: number) => void;
  onHuyKhaiHoang: (regionId: number) => void;
  onAttack: (regionId: number) => void;
  onReinforce: (regionId: number, side?: "attacker" | "defender") => void;
}

function cleanSpecialResourceName(name: string): string {
  if (!name) return "";
  return name.replace(/^[^\w\s\u00C0-\u024F\u1EA0-\u1EFF]+/g, "").trim();
}

function getSpecialResourceIcon(rawName: string) {
  return <SpecialResourceIcon name={rawName} className="rt-special-png-icon" />;
}

export function TerritoryTooltip({
  region,
  engine,
  territory,
  town,
  clearing,
  battle,
  playerId,
  ownedTowns = [],
  onClose,
  onKhaiHoang,
  onHuyKhaiHoang,
  onAttack,
  onReinforce,
}: TerritoryTooltipProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [selectedYield, setSelectedYield] = useState<string | null>(null);
  const [confirmCancelClearing, setConfirmCancelClearing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [hudBottomInset, setHudBottomInset] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dock = document.querySelector<HTMLElement>(".hud-command-dock");

    const measureDock = () => {
      if (!dock || getComputedStyle(dock).display === "none") {
        setHudBottomInset(0);
        return;
      }
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const dockTop = dock.getBoundingClientRect().top;
      setHudBottomInset(Math.max(0, Math.ceil(viewportHeight - dockTop + 8)));
    };

    measureDock();
    const resizeObserver = dock ? new ResizeObserver(measureDock) : null;
    if (dock) resizeObserver?.observe(dock);
    const mutationObserver = dock ? new MutationObserver(measureDock) : null;
    if (dock)
      mutationObserver?.observe(dock, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    window.addEventListener("resize", measureDock);
    window.visualViewport?.addEventListener("resize", measureDock);

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", measureDock);
      window.visualViewport?.removeEventListener("resize", measureDock);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: PointerEvent) {
      if (confirmCancelClearing) return;
      const cardElement = cardRef.current;
      const arrowPointer = document.querySelector(".rt-tooltip-arrow-pointer");

      // If clicking outside the tooltip box, close it smoothly
      if (
        cardElement &&
        !cardElement.contains(event.target as Node) &&
        (!arrowPointer || !arrowPointer.contains(event.target as Node))
      ) {
        onClose?.();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }

    // Register listener after a micro delay to avoid capturing the activation click
    const registerTimer = setTimeout(() => {
      document.addEventListener("pointerdown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 100);

    return () => {
      clearTimeout(registerTimer);
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmCancelClearing, onClose]);

  const { id, ownership } = region;
  const engineState = engine.getState();
  const isIslet = territory?.isIslet ?? region.isIslet;
  const effectiveOwnership = territory
    ? territory.ownerId === null
      ? 0
      : territory.ownerId === playerId
        ? 1
        : 2
    : (engine.getRegionOwnership?.(id) ?? ownership);

  const r = engine.getRegion?.(id);
  const specialResources =
    territory?.specialResources ||
    engine.getTerritorySpecialResources?.(id) ||
    [];

  if (!r) return null;

  const coords = engine.mapToScreen(r.x, r.y);

  const biome = territory?.biome ?? r.biome ?? 0;
  const biomeNames = [
    "Cỏ Xanh",
    "Sa Mạc",
    "Băng Tuyết",
    "Hỏa Sơn",
    "Lục Lam",
    "Vàng Cam",
    "Rừng Thông",
    "Đầm Lầy",
  ];
  const biomeDescriptions = [
    "Vùng đồng cỏ xanh tươi trù phú, thời tiết ôn hòa, thích hợp định cư lâu dài.",
    "Vùng đất khô cằn rộng lớn, giàu tài nguyên nhưng luôn tiềm ẩn nguy cơ xung đột.",
    "Vùng lãnh nguyên giá buốt, tuyết phủ quanh năm, địa hình khó di chuyển.",
    "Vùng đất lửa đầy khoáng sản quý hiếm, nhiệt độ cực cao vô cùng nguy hiểm.",
    "Đảo ngọc lục lam tuyệt đẹp giữa đại dương, dồi dào tài nguyên biển quý giá.",
    "Vũng vịnh vàng cam tráng lệ, giao thương thuận lợi, đất đai màu mỡ.",
    "Cánh rừng thông bạt ngàn hoang dã, nguồn gỗ dồi dào và nguyên liệu dã chiến.",
    "Vùng nước sâu đầm lầy u ám, ẩn giấu nhiều cạm bẫy và kho báu cổ xưa.",
  ];

  const bName = territory?.biomeName || biomeNames[biome] || "Hoang Dã";
  const bColor =
    [
      "#689f38",
      "#ddaa55",
      "#ccd7db",
      "#5a6065",
      "#4db6ac",
      "#cf7a57",
      "#2e7d32",
      "#809e52",
    ][biome] || "#4db6ac";
  const bDesc =
    biomeDescriptions[biome] || "Vùng đất hoang dã chưa được khai phá.";

  const clientYield = engine.territoryYield
    ? engine.territoryYield(id)
    : { gold: 0, wood: 0, stone: 0, food: 0, gems: 0 };
  const y = territory
    ? {
        gold: territory.yieldGold * 2.5,
        wood: territory.yieldWood * 2.5,
        stone: territory.yieldStone * 2.5,
        food: territory.yieldFood * 2.5,
        gems: territory.yieldGems * 2.5,
      }
    : clientYield;
  const dur =
    territory?.clearingSeconds ??
    (engine.clearingDuration ? engine.clearingDuration(id) : 45);
  const buildCost = engine.territoryBuildCost
    ? engine.territoryBuildCost(id)
    : { gold: 0, wood: 0, stone: 0, food: 0 };
  const currentResources = engineState.resources || {};
  const costRows = (["gold", "wood", "stone", "food"] as const).map((key) => ({
    key,
    cost: Number(buildCost[key] || 0),
    available: Number(currentResources[key] || 0),
    insufficient:
      Number(currentResources[key] || 0) < Number(buildCost[key] || 0),
  }));

  const formatYield = (value: number) =>
    value >= 1
      ? value.toFixed(1)
      : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  const formatRate = (value: number) => {
    const safe = Math.max(0, value || 0);
    if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)}M`;
    if (safe >= 1_000)
      return `${(safe / 1_000).toFixed(safe >= 100_000 ? 0 : 1)}K`;
    if (safe >= 10) return Math.round(safe).toLocaleString("vi-VN");
    return safe
      .toFixed(safe >= 1 ? 1 : 2)
      .replace(/0+$/, "")
      .replace(/\.$/, "");
  };
  const totalYield = (
    ["food", "wood", "stone", "gold", "gems"] as const
  ).reduce((sum, key) => sum + Math.max(0, Number(y[key]) || 0), 0);
  const resourceRows = (["food", "wood", "stone", "gold", "gems"] as const)
    .map((key) => ({
      key,
      label: RESOURCE_META[key].label,
      value: y[key],
      hourly: y[key] * 3600,
      daily: y[key] * 86400,
      share:
        totalYield > 0
          ? Math.round((Math.max(0, Number(y[key]) || 0) / totalYield) * 100)
          : 0,
      className: key,
      icon: <ResourceIcon resource={key} />,
    }))
    .filter((row) => row.value > 0.00001);

  const localTowns =
    ownedTowns.length > 0
      ? ownedTowns
      : engine.getTowns
        ? engine.getTowns().filter((item: any) => item.owner === 0)
        : [];
  const nearestTown = localTowns
    .filter(
      (item: any) =>
        Number.isFinite(Number(item?.x)) && Number.isFinite(Number(item?.y)),
    )
    .sort(
      (a: any, b: any) =>
        Math.hypot(Number(a.x) - r.x, Number(a.y) - r.y) -
        Math.hypot(Number(b.x) - r.x, Number(b.y) - r.y),
    )[0];
  const distanceKm = nearestTown
    ? Math.max(
        0,
        Math.round(
          Math.hypot(Number(nearestTown.x) - r.x, Number(nearestTown.y) - r.y) *
            0.18,
        ),
      )
    : null;

  const isClearingInProgress = engineState.regionInProgress === id;
  const isSettlerTraveling =
    engineState.settlerTravel?.active &&
    engineState.settlerTravel.targetRegionId === id;
  const isNewbieSelecting =
    engineState.newbieMode && engineState.newbiePhase === "select_land";
  const playerTerritoriesCount = Object.keys(
    engineState.regionOwnership || {},
  ).filter(
    (regionId) =>
      engineState.regionOwnership[Number(regionId)] === 1 ||
      engineState.regionOwnerIds?.[Number(regionId)] ===
        engineState.localPlayerId,
  ).length;
  const isStarterClaim = isNewbieSelecting || playerTerritoriesCount === 0;
  const canBuildStronghold =
    isStarterClaim || Boolean(engine.canBuildStronghold?.(id));

  const rawOwnerName = engineState.regionOwnerNames?.[id] || "";
  const isOwnClearing =
    Boolean(clearing?.playerId === playerId) ||
    isClearingInProgress ||
    isSettlerTraveling;
  const isRemoteClearing =
    (effectiveOwnership === 0 &&
      Boolean(clearing && clearing.playerId !== playerId)) ||
    (effectiveOwnership === 0 && rawOwnerName === "ĐANG KHAI HOANG");

  const isCurrentlyClearing =
    Boolean(clearing) ||
    isClearingInProgress ||
    isSettlerTraveling ||
    isRemoteClearing;
  const timing = clearing || engineState.activeClearingTimings?.[id];

  const formatTime = (secs: number) => {
    if (secs >= 60) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}ph ${s}s`;
    }
    return `${secs}s`;
  };

  const isUnderBattle =
    Boolean(battle) ||
    engineState.activeBattles?.some((b: any) => b.regionId === id);
  const settlementKind =
    territory?.settlementKind ?? engineState.regionSettlementKinds?.[id];
  const territoryConnectionType =
    territory?.connectionType ?? engineState.regionConnectionTypes?.[id];
  const isCapital =
    id >= 0 &&
    (engineState.capitalTerritoryIds?.has(id) || settlementKind === "capital");
  const isSubCapital = settlementKind === "sub_capital";
  const isHarbor = Boolean(
    territory?.isIslet ||
    territory?.specialResources?.includes("Bến tàu tự nhiên") ||
    territoryConnectionType === "sea",
  );
  const isMilitaryDistrict = !isCapital && !isSubCapital && isHarbor;
  const isTerritoryFlag = !isCapital && !isSubCapital && !isMilitaryDistrict;
  const settlementKindLabel = isSubCapital
    ? "Trung Tâm Thành Trì"
    : isMilitaryDistrict
      ? "Quân Khu"
      : isTerritoryFlag
        ? "Trụ Cờ"
        : "Thủ Đô";

  const trainingSpecialty = town?.trainingSpecialty || "infantry";
  const specialtyMeta = {
    infantry: {
      name: "Bộ binh",
      icon: "/assets/icon-troops/sprite_01.webp",
      count: town?.infantryCount ?? town?.troops ?? 0,
    },
    cavalry: {
      name: "Kỵ binh",
      icon: "/assets/icon-troops/sprite_03.webp",
      count: town?.cavalryCount ?? 0,
    },
    artillery: {
      name: "Pháo binh",
      icon: "/assets/icon-troops/sprite_04.webp",
      count: town?.artilleryCount ?? 0,
    },
  }[trainingSpecialty];

  const isHarborBuilding = isHarbor || timing?.connectionType === "sea";

  const statusText = isUnderBattle
    ? "Đang Giao Tranh"
    : isOwnClearing
      ? `Bạn đang ${isHarborBuilding ? "lập Quân Khu" : "dựng Trụ Cờ"}`
      : isRemoteClearing
        ? `Đối thủ đang ${isHarborBuilding ? "lập Quân Khu" : "dựng Trụ Cờ"}`
        : effectiveOwnership === 1
          ? `Đã Chiếm (${settlementKindLabel})`
          : effectiveOwnership > 1
            ? `Địch Chiếm (${settlementKindLabel})`
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
  const ownerName =
    effectiveOwnership === 0
      ? "Chưa có chủ"
      : effectiveOwnership === 1
        ? "Bạn"
        : territory?.ownerName || rawOwnerName || "Đối thủ";
  const storage =
    town?.storage && typeof town.storage === "object"
      ? Object.values(town.storage).reduce(
          (sum, value) => sum + Math.max(0, Number(value) || 0),
          0,
        )
      : 0;
  const storageCapacity =
    typeof town?.storageCapacity === "number"
      ? town.storageCapacity
      : town?.storageCapacity && typeof town.storageCapacity === "object"
        ? Object.values(town.storageCapacity).reduce(
            (sum, value) => sum + Math.max(0, Number(value) || 0),
            0,
          )
        : 0;

  const rx = r.rx || r.r || 100;
  const zoom = engineState.zoom || 1;
  // Keep the active-territory card compact enough to fit beside the map and
  // above the mobile action dock; it must be fully visible without scrolling.
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1280;
  const isMobileViewport = viewportWidth <= 640;
  const cardW = isMobileViewport ? Math.min(350, viewportWidth - 16) : 360;
  const estimatedH = showGuide ? 430 : 390;

  let left = coords.x + rx * zoom + 16;
  let top = coords.y - estimatedH / 2;

  const winW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;

  let positionClass = "pointer-left";
  if (left + cardW > winW - 16) {
    left = coords.x - rx * zoom - cardW - 16;
    positionClass = "pointer-right";
  }

  if (left < 16) left = 16;
  if (top < 16) top = 16;
  const safeBottom = isMobileViewport ? 92 : 16;
  if (top + estimatedH > winH - safeBottom)
    top = Math.max(8, winH - estimatedH - safeBottom);

  const arrowOffsetY = Math.max(32, Math.min(estimatedH - 38, coords.y - top));

  const runAndClose = (action: () => void) => {
    action();
    onClose?.();
  };

  const renderActionButtons = () => {
    if (isUnderBattle) {
      const isPlayerOwned = effectiveOwnership === 1;
      const activeBattle =
        battle ||
        engineState.activeBattles?.find((b: any) => b.regionId === id);
      const remSec = battle?.resolvesAt
        ? Math.max(
            0,
            Math.ceil((new Date(battle.resolvesAt).getTime() - now) / 1000),
          )
        : activeBattle
          ? Math.max(
              0,
              Math.ceil(
                (activeBattle.duration || activeBattle.durationSeconds || 25) -
                  (activeBattle.t || 0),
              ),
            )
          : 15;
      const attackerMaxHp = Math.max(
        1,
        Number(
          activeBattle?.attackerMaxHp ||
            activeBattle?.attackerPower ||
            activeBattle?.attPower ||
            1,
        ),
      );
      const defenderMaxHp = Math.max(
        1,
        Number(
          activeBattle?.defenderMaxHp ||
            activeBattle?.defenderPower ||
            activeBattle?.defPower ||
            1,
        ),
      );
      const attackerHp = Math.max(
        0,
        Math.min(
          attackerMaxHp,
          Number(activeBattle?.attackerCurrentHp ?? attackerMaxHp),
        ),
      );
      const defenderHp = Math.max(
        0,
        Math.min(
          defenderMaxHp,
          Number(activeBattle?.defenderCurrentHp ?? defenderMaxHp),
        ),
      );
      const attackerLabel =
        activeBattle?.attackerId === playerId
          ? "QUÂN CỦA BẠN"
          : "QUÂN TẤN CÔNG";
      const defenderLabel =
        activeBattle?.defenderId === playerId
          ? "QUÂN CỦA BẠN"
          : "QUÂN PHÒNG THỦ";
      const participantCount = Array.isArray(activeBattle?.participants)
        ? activeBattle.participants.filter(
            (item: any) => item?.status === "engaged",
          ).length
        : Math.max(1, activeBattle?.attackerSources?.length || 1);
      const hpRow = (
        label: string,
        hp: number,
        maxHp: number,
        tone: "attack" | "defend",
      ) => (
        <div className={`rt-siege-hp-row ${tone}`}>
          <span className="rt-siege-hp-label">{label}</span>
          <span
            className="rt-siege-hp-track"
            aria-label={`${label} ${Math.ceil(hp)} trên ${Math.ceil(maxHp)}`}
          >
            <span
              className="rt-siege-hp-fill"
              style={{ width: `${Math.round((hp / maxHp) * 100)}%` }}
            />
          </span>
          <strong>
            {Math.ceil(hp)}/{Math.ceil(maxHp)}
          </strong>
        </div>
      );

      return (
        <>
          <div className="rt-siege-summary-v2">
            <div className="rt-siege-summary-head">
              <span>VÂY THÀNH</span>
              <small>
                {participantCount} đạo quân · còn {formatTime(remSec)}
              </small>
            </div>
            {hpRow(attackerLabel, attackerHp, attackerMaxHp, "attack")}
            {hpRow(defenderLabel, defenderHp, defenderMaxHp, "defend")}
          </div>
          {isPlayerOwned ? (
            <>
              <button
                type="button"
                className="rt-main-action-btn defender"
                onClick={() => runAndClose(() => onReinforce(id, "defender"))}
              >
                <SpriteIcon
                  src="/assets/icons/icon_defender_dragon_shield.png"
                  size={18}
                  style={{ marginRight: 6 }}
                />{" "}
                <span className="text-gold-serif">VIỆN TRỢ THỦ THÀNH</span>
              </button>
              <button
                type="button"
                className="rt-main-action-btn build"
                onClick={() =>
                  engine.handleAction("selectTown", { regionId: id })
                }
              >
                <AssetIcon
                  asset="manageButton"
                  size={18}
                  style={{ marginRight: 6 }}
                />{" "}
                <span className="text-gold-serif">QUẢN LÝ VÀ XUẤT QUÂN</span>
              </button>
              <div className="rt-warning-note">
                Quân tới nơi sẽ cộng vào phe phòng thủ của thành trì
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="rt-main-action-btn attacker"
                onClick={() => runAndClose(() => onReinforce(id, "attacker"))}
              >
                <SpriteIcon
                  src="/assets/icons/icon_attacker_lion_shield.png"
                  size={20}
                  style={{ marginRight: 6 }}
                />{" "}
                <span className="text-gold-serif">GỬI QUÂN TIẾP VIỆN</span>
              </button>
              <div className="rt-warning-note">
                Quân tới nơi sẽ cộng vào phe tấn công đang giao tranh
              </div>
            </>
          )}
        </>
      );
    }
    if (effectiveOwnership === 1) {
      return (
        <>
          <button
            type="button"
            className="rt-main-action-btn build"
            onClick={() => engine.handleAction("selectTown", { regionId: id })}
          >
            <AssetIcon
              asset="manageButton"
              size={18}
              style={{ marginRight: 6 }}
            />{" "}
            <span className="text-gold-serif">QUẢN LÝ THÀNH PHỐ</span>
          </button>
          <div className="rt-warning-note">
            Quản lý quân đội, tài nguyên và nâng cấp công trình của thành phố
          </div>
        </>
      );
    }
    if (effectiveOwnership === 0) {
      if (isCurrentlyClearing) {
        const startMs = timing?.startedAt
          ? new Date(timing.startedAt).getTime()
          : now;
        const arrivesMs = timing?.arrivesAt
          ? new Date(timing.arrivesAt).getTime()
          : startMs;
        const completesMs = timing?.completesAt
          ? new Date(timing.completesAt).getTime()
          : now + 30000;

        const inTravel = timing?.arrivesAt ? now < arrivesMs : false;
        let pctVal = 0;
        let remSecs = 0;

        if (inTravel) {
          const totalTravel = Math.max(1000, arrivesMs - startMs);
          pctVal = Math.round(
            Math.max(0, Math.min(1, (now - startMs) / totalTravel)) * 100,
          );
          remSecs = Math.max(0, Math.round((arrivesMs - now) / 1000));
        } else {
          const totalClearing = Math.max(1000, completesMs - arrivesMs);
          const elapsed = Math.max(0, now - arrivesMs);
          const dynamicPct = Math.min(1, elapsed / totalClearing);
          const p = Math.max(dynamicPct, engineState.regionClearing?.[id] || 0);
          pctVal = Math.round(Math.min(1, p) * 100);
          remSecs = timing?.completesAt
            ? Math.max(0, Math.round((completesMs - now) / 1000))
            : 0;
        }

        const isLocal =
          isClearingInProgress ||
          isSettlerTraveling ||
          timing?.playerId === engineState.localPlayerId;

        return (
          <>
            <div className={`rt-clearing-box ${isLocal ? "local" : "remote"}`}>
              <div className="rt-clearing-header">
                <span className="rt-clearing-title-text">
                  {isLocal ? (
                    inTravel ? (
                      <>
                        <SpriteIcon
                          src="/assets/icons/icon_tech.png"
                          size={16}
                          style={{ marginRight: 6 }}
                        />{" "}
                        ĐANG DI CHUYỂN THỢ XÂY
                      </>
                    ) : (
                      <>
                        <SpriteIcon
                          src="/assets/icons/icon_tech.png"
                          size={16}
                          style={{ marginRight: 6 }}
                        />{" "}
                        ĐANG XÂY THÀNH CỦA BẠN
                      </>
                    )
                  ) : inTravel ? (
                    <>
                      <SpriteIcon
                        src="/assets/icons/icon_attacker_lion_shield.png"
                        size={16}
                        style={{ marginRight: 6 }}
                      />{" "}
                      ĐỊCH ĐANG DI CHUYỂN THỢ XÂY
                    </>
                  ) : (
                    <>
                      <SpriteIcon
                        src="/assets/icons/icon_attacker_lion_shield.png"
                        size={16}
                        style={{ marginRight: 6 }}
                      />{" "}
                      ĐỊCH ĐANG XÂY THÀNH
                    </>
                  )}
                </span>
                <span className="rt-clearing-pct-text">{pctVal}%</span>
              </div>
              <div className="rt-clearing-bar-track">
                <div
                  className="rt-clearing-bar-fill"
                  style={{
                    width: `${pctVal}%`,
                    backgroundColor: inTravel ? "#f59e0b" : "#10b981",
                  }}
                />
              </div>
              {remSecs > 0 && (
                <div className="rt-clearing-timer">
                  <SpriteIcon
                    src="/assets/icons/icon_scroll.png"
                    size={14}
                    style={{ marginRight: 4 }}
                  />{" "}
                  {inTravel ? "Đến nơi sau:" : "Thời gian còn lại:"}{" "}
                  <span className="time-val">{formatTime(remSecs)}</span>
                </div>
              )}
            </div>

            {isLocal && (
              <button
                type="button"
                className="rt-main-action-btn attacker"
                onClick={() => setConfirmCancelClearing(true)}
              >
                <SpriteIcon
                  src="/assets/icons/icon_collapse_european.png"
                  size={16}
                  style={{ marginRight: 6 }}
                />{" "}
                <span className="text-gold-serif">HỦY XÂY THÀNH</span>
              </button>
            )}
          </>
        );
      }

      if (isStarterClaim) {
        return (
          <>
            <button
              type="button"
              className="rt-main-action-btn build pulse"
              onClick={() => onKhaiHoang(id)}
            >
              <AssetIcon
                asset="buildButton"
                size={18}
                style={{ marginRight: 6 }}
              />{" "}
              <span className="text-gold-serif">DỰNG HOÀNG THÀNH</span>
            </button>
            <div
              className="rt-note-info"
              style={{ color: "#4ade80", fontWeight: 700 }}
            >
              <SpriteIcon
                src="/assets/icons/icon_settings_info.png"
                size={14}
                style={{
                  marginRight: 4,
                  filter: "brightness(120%) saturate(150%)",
                }}
              />{" "}
              Xây dựng miễn phí dành cho tân thủ!
            </div>
          </>
        );
      }
      if (!canBuildStronghold) {
        return (
          <div
            className="rt-busy-builder-notice disconnected"
            style={{
              background: "rgba(30, 15, 15, 0.9)",
              borderColor: "#ef4444",
              border: "1px solid #ef4444",
              borderRadius: 8,
              padding: "7px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <SpriteIcon
              src="/assets/icons/icon_settings_info.png"
              size={14}
              style={{
                marginRight: 2,
                filter:
                  "drop-shadow(0 0 2px #ef4444) hue-rotate(140deg) saturate(300%)",
              }}
            />
            <span
              className="text"
              style={{
                color: "#fca5a5",
                fontSize: 10,
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              CHƯA THỂ MỞ RỘNG: CẦN XÂY LIỀN KỀ, HOẶC DÙNG BẾN TÀU ĐỂ DỰNG ĐIỂM
              ĐỔ BỘ Ở VEN BIỂN
            </span>
          </div>
        );
      }
      return (
        <>
          {(() => {
            const overseas = engine.getExpansionConnectionType?.(id) === "sea";
            const label = overseas ? "LẬP QUÂN KHU" : "DỰNG TRỤ CỜ";
            return (
              <button
                type="button"
                className="rt-main-action-btn build"
                onClick={() => runAndClose(() => onKhaiHoang(id))}
              >
                <AssetIcon
                  asset="buildButton"
                  size={18}
                  style={{ marginRight: 6 }}
                />{" "}
                <span className="text-gold-serif">{label}</span>
              </button>
            );
          })()}
          <div className="rt-cost-card">
            <div className="rt-cost-title-header">
              <span className="line" />
              <span className="title">CHI PHÍ MỞ RỘNG LÃNH THỔ</span>
              <span className="line" />
            </div>
            <div className="rt-cost-chips-grid">
              <div
                className={`rt-cost-chip-item${costRows[0].insufficient ? " insufficient" : ""}`}
              >
                <SpriteIcon
                  src="/assets/icons/resource_gold_european.png"
                  size={18}
                />{" "}
                <b>{buildCost.gold}</b>
              </div>
              <div
                className={`rt-cost-chip-item${costRows[1].insufficient ? " insufficient" : ""}`}
              >
                <SpriteIcon
                  src="/assets/icons/resource_wood_european.png"
                  size={18}
                />{" "}
                <b>{buildCost.wood}</b>
              </div>
              <div
                className={`rt-cost-chip-item${costRows[2].insufficient ? " insufficient" : ""}`}
              >
                <SpriteIcon
                  src="/assets/icons/resource_stone_european.png"
                  size={18}
                />{" "}
                <b>{buildCost.stone}</b>
              </div>
              <div
                className={`rt-cost-chip-item${costRows[3].insufficient ? " insufficient" : ""}`}
              >
                <SpriteIcon
                  src="/assets/icons/resource_food_european.png"
                  size={18}
                />{" "}
                <b>{buildCost.food}</b>
              </div>
            </div>
          </div>
          <div className="rt-note-info">
            <SpriteIcon
              src="/assets/icons/icon_settings_info.png"
              size={12}
              style={{ marginRight: 4, opacity: 0.8 }}
            />{" "}
            Đường bộ dựng Trụ Cờ; vượt biển lập Quân Khu làm gốc cho nhánh mới.
          </div>
        </>
      );
    }
    if (effectiveOwnership > 1) {
      return (
        <button
          type="button"
          className="rt-main-action-btn attacker"
          onClick={() => runAndClose(() => onAttack(id))}
        >
          <AssetIcon
            asset="attackButton"
            size={20}
            style={{ marginRight: 6 }}
          />{" "}
          <span className="text-gold-serif">PHÁT ĐỘNG TẤN CÔNG</span>
        </button>
      );
    }
    return null;
  };

  const territoryFlagColor =
    territory?.ownerFlagColor ||
    engineState.regionOwnerFlagColors?.[id] ||
    (effectiveOwnership === 1
      ? engineState.newbieFlagColor || "#2563eb"
      : undefined);

  const tooltipElement = (
    <div
      className={`rt-tooltip-container ${positionClass}`}
      style={
        {
          position: "fixed",
          left: `${left}px`,
          top: `${top}px`,
          width: `${cardW}px`,
          zIndex: 99999,
          pointerEvents: "none",
          overflow: "visible",
          "--rt-hud-bottom-inset": `${hudBottomInset}px`,
        } as React.CSSProperties
      }
    >
      {/* Dynamic 3D Golden Pointer Arrow pointing to Active Territory */}
      <div
        className={`rt-tooltip-arrow-pointer ${positionClass}`}
        style={{ top: `${arrowOffsetY}px` }}
        aria-hidden="true"
      >
        <span className="rt-tooltip-arrow-css" />
      </div>
      <div
        ref={cardRef}
        className="rt-tooltip-card rt-territory-active"
        role="dialog"
        aria-modal="false"
        aria-label={
          isIslet
            ? `Thông tin đảo nhỏ ${id + 1}`
            : `Thông tin lãnh thổ ${id + 1}`
        }
        style={{ pointerEvents: "auto" }}
      >
        {/* Header */}
        <div className="rt-tooltip-header">
          <div className="rt-header-top-row">
            <BannerFlagIcon color={territoryFlagColor} />
            <div className="rt-header-info">
              <div className="rt-header-title-bar">
                <div className="rt-zone-id">
                  {isIslet ? `ĐẢO NHỎ #${id + 1}` : `LÃNH THỔ #${id + 1}`}
                </div>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rt-close-btn"
                    aria-label="Đóng thông tin lãnh thổ"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                )}
              </div>
              <div className="rt-badges-group">
                <div
                  className="rt-biome-pill"
                  style={{ color: bColor, borderColor: `${bColor}60` }}
                >
                  <SpriteIcon
                    src="/assets/icons/icon_map.png"
                    size={14}
                    style={{ marginRight: 6 }}
                  />{" "}
                  {bName}
                </div>
                <button
                  type="button"
                  className="rt-guide-pill-btn"
                  onClick={() => setShowGuide(!showGuide)}
                >
                  <SpriteIcon
                    src="/assets/icons/icon_scroll.png"
                    size={14}
                    style={{ marginRight: 5 }}
                  />{" "}
                  {showGuide ? "Đóng" : "HƯỚNG DẪN"}
                </button>
              </div>
            </div>
          </div>
          <div className="rt-header-body-row">
            <div className="rt-biome-desc-text">{bDesc}</div>
            <BiomeMedievalCard biome={biome} color={bColor} />
          </div>
        </div>

        <div className="rt-tooltip-scroll">
          {/* Section Divider */}
          <div className="rt-section-divider">
            <CSSDiamond />
            <span className="line" />
            <span className="title">
              {showGuide ? "HƯỚNG DẪN & BIỂU TƯỢNG" : "THÔNG TIN LÃNH THỔ"}
            </span>
            <span className="line" />
            <CSSDiamond />
          </div>

          {showGuide ? (
            <div className="rt-guide-content-box">
              <div className="rt-guide-section-title">SỔ TAY QUÂN NHU</div>
              <div className="rt-guide-legend-grid">
                {(["food", "wood", "stone", "gold", "gems"] as const).map(
                  (key) => (
                    <div className="rt-guide-legend-cell" key={key}>
                      <ResourceIcon resource={key} />
                      <span className="rt-guide-copy">
                        <span className="res-name">
                          {RESOURCE_META[key].label}
                        </span>
                        <span className="res-use">
                          {RESOURCE_META[key].purpose}
                        </span>
                      </span>
                    </div>
                  ),
                )}
              </div>
              <div className="rt-guide-section-title rt-guide-subtitle">
                ĐẶC ĐIỂM CHIẾN LƯỢC
              </div>
              <div className="rt-guide-special-grid">
                {Object.values(SPECIAL_RESOURCE_META).map((meta) => (
                  <div
                    className={`rt-guide-special-item tone-${meta.tone}`}
                    key={meta.label}
                  >
                    <img src={meta.icon} alt="" aria-hidden="true" />
                    <span>
                      <strong>{meta.label}</strong>
                      <small>{meta.guide}</small>
                    </span>
                  </div>
                ))}
              </div>
              <p className="rt-guide-note">
                Chất lượng đất quyết định sản lượng. Kho đầy sẽ ngừng nhận tài
                nguyên thường; Ngọc không bị chiếm theo kho lãnh thổ.
              </p>
            </div>
          ) : (
            <>
              {/* Territory General Info Grid */}
              <div className="rt-stats-container">
                <div className="rt-stat-item">
                  <span className="label">
                    <SpriteIcon
                      src="/assets/icons/icon_map.png"
                      size={14}
                      style={{ marginRight: 6 }}
                    />{" "}
                    Loại đất:
                  </span>
                  <span className="val">
                    {isIslet ? "Đảo nhỏ" : "Lục địa lớn"}
                  </span>
                </div>
                <div className="rt-stat-item">
                  <span className="label">
                    <SpriteIcon
                      src="/assets/icons/icon_gold_crown.png"
                      size={14}
                      style={{ marginRight: 6 }}
                    />{" "}
                    Chủ quyền:
                  </span>
                  <span className="val">{ownerName}</span>
                </div>
                {effectiveOwnership === 0 && (
                  <>
                    {distanceKm !== null && (
                      <div className="rt-stat-item">
                        <span className="label">
                          <SpriteIcon
                            src="/assets/icons/icon_map.png"
                            size={15}
                            style={{ marginRight: 6 }}
                          />{" "}
                          Từ thành gần nhất:
                        </span>
                        <span className="val">{distanceKm} km</span>
                      </div>
                    )}
                    <div className="rt-stat-item">
                      <span className="label">
                        <SpriteIcon
                          src="/assets/icons/icon_tech.png"
                          size={15}
                          style={{ marginRight: 6 }}
                        />{" "}
                        Thời gian xây:
                      </span>
                      <span className="val highlighted">{formatTime(dur)}</span>
                    </div>
                  </>
                )}
                {town && (
                  <>
                    <div className="rt-stat-item">
                      <span className="label">
                        <SpriteIcon
                          src="/assets/icons/icon_tower.png"
                          size={16}
                          style={{ marginRight: 6 }}
                        />{" "}
                        Công trình:
                      </span>
                      <span className="val">
                        {settlementKindLabel} cấp {town.level ?? 1}
                      </span>
                    </div>
                    <div className="rt-stat-item">
                      <span className="label">
                        <SpriteIcon
                          src="/assets/icon-troops/sprite_02.webp"
                          size={16}
                          style={{ marginRight: 6 }}
                        />{" "}
                        Quân đồn trú:
                      </span>
                      <span className="val">
                        {Math.floor(
                          (town.troops || 0) + (town.reservedTroops || 0),
                        ).toLocaleString("vi-VN")}{" "}
                        /{" "}
                        {Math.floor(
                          town.troopCapacity || town.maxTroops || 0,
                        ).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="rt-stat-item rt-specialty-stat">
                      <span className="label">
                        <SpriteIcon src={specialtyMeta.icon} size={22} />{" "}
                        {specialtyMeta.name}:
                      </span>
                      <span className="val highlighted">
                        {Math.floor(specialtyMeta.count).toLocaleString(
                          "vi-VN",
                        )}
                      </span>
                    </div>
                    <div className="rt-stat-item">
                      <span className="label">
                        <SpriteIcon
                          src="/assets/icons/menu/troop.png"
                          size={14}
                          style={{ marginRight: 6 }}
                        />{" "}
                        Dân số:
                      </span>
                      <span className="val">
                        {Math.floor(town.population || 0).toLocaleString(
                          "vi-VN",
                        )}{" "}
                        /{" "}
                        {Math.floor(
                          town.populationCapacity || 0,
                        ).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="rt-stat-item">
                      <span className="label">
                        <SpriteIcon
                          src="/assets/icons/icon_chest.png"
                          size={14}
                          style={{ marginRight: 6 }}
                        />{" "}
                        Kho lãnh thổ:
                      </span>
                      <span className="val">
                        {Math.floor(storage).toLocaleString("vi-VN")} /{" "}
                        {Math.floor(storageCapacity).toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </>
                )}
                <div className="rt-stat-item">
                  <span className="label">
                    <SpriteIcon
                      src="/assets/icons/menu/setting.png"
                      size={14}
                      style={{ marginRight: 6 }}
                    />{" "}
                    Trạng thái:
                  </span>
                  <span className={`val ${statusClass}`}>{statusText}</span>
                </div>
                <div className="rt-stat-item">
                  <span className="label">
                    <SpriteIcon
                      src="/assets/icons/icon_tech.png"
                      size={14}
                      style={{ marginRight: 6 }}
                    />{" "}
                    Chất lượng đất:
                  </span>
                  <span className="val">
                    {Math.round(Number(territory?.resourceQuality || 100))}%
                  </span>
                </div>
              </div>

              {/* Compact server-authoritative yield ledger */}
              <div className="rt-section-divider margin-top">
                <CSSDiamond />
                <span className="line" />
                <span className="title">SẢN LƯỢNG LÃNH THỔ</span>
                <span className="line" />
                <CSSDiamond />
              </div>

              {/* Server-authoritative territory yields */}
              <div className="rt-yield-ledger">
                {resourceRows.map((row) => (
                  <button
                    type="button"
                    key={row.key}
                    className={`rt-yield-ledger-item ${row.className}${selectedYield === row.key ? " is-open" : ""}`}
                    onClick={() =>
                      setSelectedYield((current) =>
                        current === row.key ? null : row.key,
                      )
                    }
                    aria-expanded={selectedYield === row.key}
                  >
                    <span className="rt-yield-main">
                      {row.icon}
                      <span className="name">{row.label}</span>
                    </span>
                    <span className="rate">
                      +{formatRate(row.hourly)}/giờ{" "}
                      <em className="share">{row.share}%</em>
                    </span>
                    <span className="rt-yield-popover">
                      <strong>{row.label}</strong>
                      <span>
                        <b>Trong giờ</b>
                        <em>+{formatRate(row.hourly)}</em>
                      </span>
                      <span>
                        <b>Trong ngày</b>
                        <em>+{formatRate(row.daily)}</em>
                      </span>
                      <small>{RESOURCE_META[row.key].purpose}</small>
                    </span>
                  </button>
                ))}
              </div>

              {/* Special Features / Deposits Section */}
              {specialResources.length > 0 && (
                <>
                  <div className="rt-section-divider margin-top">
                    <CSSDiamond />
                    <span className="line" />
                    <span className="title">ĐẶC ĐIỂM CHIẾN LƯỢC</span>
                    <span className="line" />
                    <CSSDiamond />
                  </div>
                  <div className="rt-special-list-container">
                    {specialResources.map((item: string, idx: number) => {
                      const meta = getSpecialResourceMeta(item);
                      const cleanedName =
                        meta?.label || cleanSpecialResourceName(item);
                      return (
                        <div
                          key={idx}
                          className={`rt-special-list-item${meta ? ` tone-${meta.tone}` : ""}`}
                          title={meta?.guide || cleanedName}
                        >
                          {getSpecialResourceIcon(item)}
                          <span className="rt-special-copy">
                            <span className="item-name">{cleanedName}</span>
                            {meta && <small>{meta.effect}</small>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Action Button Section */}
        <div className="rt-tooltip-action-section">{renderActionButtons()}</div>
      </div>
    </div>
  );

  const tooltipContent = (
    <>
      {tooltipElement}
      {confirmCancelClearing && (
        <ConfirmModal
          title="HỦY LỆNH XÂY THÀNH"
          subtitle="SẮC LỆNH XÂY DỰNG · CẦN XÁC NHẬN"
          message="Đội thợ sẽ dừng thi công tại lãnh thổ này. Bạn có chắc chắn muốn hủy lệnh xây thành không?"
          confirmLabel="HỦY LỆNH"
          icon="buildButton"
          tone="danger"
          onClose={() => setConfirmCancelClearing(false)}
          onConfirm={() => {
            setConfirmCancelClearing(false);
            runAndClose(() => onHuyKhaiHoang(id));
          }}
        />
      )}
    </>
  );

  return typeof document !== "undefined"
    ? createPortal(tooltipContent, document.body)
    : tooltipContent;
}
