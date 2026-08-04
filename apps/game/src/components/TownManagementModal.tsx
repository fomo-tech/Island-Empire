import React from "react";
import type { ResourceBag } from "@island/shared";

type TrainingSpecialty = "infantry" | "cavalry" | "artillery";

interface TownManagementModalProps {
  town: {
    id: number;
    lvl: number;
    owner: number;
    troops: number;
    population: number;
    buildings?: Record<string, number | undefined>;
    storage?: Partial<ResourceBag>;
    storageCapacity?: number | ResourceBag;
    populationCapacity?: number;
    populationPerSecond?: number;
    maxTroops?: number;
    troopCapacity?: number;
    reservedTroops?: number;
    infantryCount?: number;
    cavalryCount?: number;
    artilleryCount?: number;
    trainingSpecialty?: TrainingSpecialty;
    nextTroopRecoveryAt?: string;
    troopRecoverySeconds?: number;
    troopRecoveryBlockedReason?: "full" | "resources" | "battle" | "isolated" | null;
    recoveryCost?: Partial<ResourceBag>;
    kind?: "capital" | "sub_capital" | "military_district" | "flag" | "stronghold";
  };
  resources: ResourceBag;
  gameConfig?: any;
  specialResources?: string[];
  playerColor?: string;
  onClose: () => void;
}

const SPECIALTY_META: Record<TrainingSpecialty, {
  title: string;
  detail: string;
  icon: string;
  countKey: "infantryCount" | "cavalryCount" | "artilleryCount";
}> = {
  infantry: {
    title: "BỘ BINH THIẾT GIÁP",
    detail: "Thành trì này chỉ bổ sung Bộ binh.",
    icon: "/assets/icons/icon_troop_infantry_shield.png",
    countKey: "infantryCount",
  },
  cavalry: {
    title: "KỴ SĨ THIẾT GIÁP",
    detail: "Thành trì này chỉ bổ sung Kỵ binh.",
    icon: "/assets/icons/icon_troop_cavalry_horse.png",
    countKey: "cavalryCount",
  },
  artillery: {
    title: "PHÁO BINH DÃ CHIẾN",
    detail: "Thành trì này chỉ bổ sung Pháo binh.",
    icon: "/assets/icons/icon_troop_artillery_cannon.png",
    countKey: "artilleryCount",
  },
};

function AssetIcon({ src, alt = "" }: { src: string; alt?: string }) {
  return <img src={src} alt={alt} className="town-png-icon" />;
}

function ResourceCost({ label, value, enough }: { label: string; value: number; enough: boolean }) {
  const dotClass: Record<string, string> = {
    Vàng: "gold",
    Gỗ: "wood",
    Đá: "stone",
    Lương: "food",
  };
  return (
    <span className={`cost-pill ${enough ? "" : "insufficient"}`}>
      <span className={`res-dot res-dot-${dotClass[label] || "gold"}`} />
      {value} {label}
    </span>
  );
}

export function TownManagementModal({
  town,
  resources,
  gameConfig,
  specialResources = [],
  onClose,
}: TownManagementModalProps) {
  const config = gameConfig || {};
  const specialty: TrainingSpecialty = town.trainingSpecialty || "infantry";
  const specialtyMeta = SPECIALTY_META[specialty];
  const specialtyCount = Math.max(0, Number(town[specialtyMeta.countKey] || 0));
  const reservedTroops = Math.max(0, Number(town.reservedTroops || 0));
  const troopCapacity = Math.max(1, Number(town.troopCapacity ?? town.maxTroops ?? specialtyCount));
  const population = Math.max(0, Number(town.population || 0));
  const storage = town.storage || {};
  const storedTotal = Object.values(storage).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  const storageCap = typeof town.storageCapacity === "number"
    ? town.storageCapacity
    : Math.max(1, Object.values(town.storageCapacity || {}).reduce(
      (sum, value) => sum + Math.max(0, Number(value) || 0),
      0,
    ));
  const recoveryCost = town.recoveryCost || (specialty === "infantry"
    ? { gold: config.infantryCostGold || 0, wood: config.infantryCostWood || 0, food: config.infantryCostFood || 0 }
    : specialty === "cavalry"
      ? { gold: config.cavalryCostGold || 0, wood: config.cavalryCostWood || 0, food: config.cavalryCostFood || 0 }
      : { gold: config.artilleryCostGold || 0, stone: config.artilleryCostStone || 0 });
  const secondsLeft = town.nextTroopRecoveryAt
    ? Math.max(0, Math.ceil((new Date(town.nextTroopRecoveryAt).getTime() - Date.now()) / 1000))
    : Math.max(0, town.troopRecoverySeconds || config.troopRecoverySeconds || 600);
  const recoveryClock = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const blockedLabels: Record<string, string> = {
    full: "ĐÃ ĐẦY SỨC CHỨA",
    resources: "THIẾU TÀI NGUYÊN",
    battle: "TẠM DỪNG KHI GIAO TRANH",
    isolated: "THÀNH TRÌ ĐANG BỊ CÔ LẬP",
  };
  const blockedText = blockedLabels[town.troopRecoveryBlockedReason || ""] || `BỔ SUNG SAU ${recoveryClock}`;
  const costLabels: Record<string, string> = {
    gold: "Vàng",
    wood: "Gỗ",
    stone: "Đá",
    food: "Lương",
    gems: "Ngọc",
  };

  return (
    <div className="ob-modal-overlay town-modal-overlay" onClick={onClose}>
      <div className="ob-modal-container town-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="town-close-btn" onClick={onClose} aria-label="Đóng quản lý">✕</button>

        <div className="town-modal-crest" aria-hidden="true">
          <AssetIcon src="/assets/ui/hud_lion_crest.png" />
        </div>

        <div className="ob-modal-header town-modal-header">
          <h2 className="ob-modal-title town-title">QUẢN LÝ THÀNH TRÌ #{town.id}</h2>
          <p className="ob-modal-subtitle town-subtitle">MỖI THÀNH TRÌ CHỈ BỔ SUNG MỘT BINH CHỦNG</p>
        </div>

        <div className="town-divider" />

        <div className="town-stats-grid">
          <div className="town-stat-card">
            <div className="stat-icon-wrapper"><AssetIcon src="/assets/icons/icon_tower.png" /></div>
            <div className="stat-info">
              <span className="stat-label">CẤP ĐỘ / DÂN SỐ</span>
              <span className="stat-val text-gold">Lv. {town.lvl} · {Math.floor(population)}/{Math.floor(town.populationCapacity || population)}</span>
            </div>
          </div>

          <div className="town-stat-card">
            <div className="stat-icon-wrapper"><AssetIcon src="/assets/icons/icon_troop_total_helmet.png" /></div>
            <div className="stat-info">
              <span className="stat-label">{specialtyMeta.title}</span>
              <span className="stat-val">{specialtyCount} / {troopCapacity} quân</span>
              <span className="stat-subline">Hành quân {reservedTroops}</span>
            </div>
          </div>

          <div className="town-stat-card">
            <div className="stat-icon-wrapper"><AssetIcon src="/assets/icons/icon_map.png" /></div>
            <div className="stat-info">
              <span className="stat-label">ĐẶC BIỆT LÃNH THỔ</span>
              <span className="stat-val text-gold">{specialResources.length ? specialResources.join(" · ") : "Chưa có"}</span>
            </div>
          </div>

          <div className="town-stat-card">
            <div className="stat-icon-wrapper"><AssetIcon src="/assets/icons/icon_chest.png" /></div>
            <div className="stat-info">
              <span className="stat-label">KHO TÀI NGUYÊN</span>
              <span className="stat-val">{Math.floor(storedTotal)} / {Math.floor(storageCap)}</span>
            </div>
          </div>
        </div>

        <div className="recruitment-section">
          <div className="section-header-line">
            <h3 className="section-title">BỔ SUNG QUÂN TỰ ĐỘNG</h3>
            <span className="line-fill" />
          </div>
          <div className={`recruit-option auto-recovery-option ${town.troopRecoveryBlockedReason ? "is-blocked" : ""}`}>
            <div className="unit-art-box">
              <img src={specialtyMeta.icon} alt={specialtyMeta.title} className="town-specialty-image" />
            </div>
            <div className="option-info">
              <span className="option-name">{specialtyMeta.title}</span>
              <span className="option-desc">{specialtyMeta.detail}</span>
              <div className="cost-row">
                {(Object.entries(recoveryCost) as Array<[keyof ResourceBag, number]>)
                  .filter(([, value]) => value > 0)
                  .map(([key, value]) => (
                    <ResourceCost key={key} label={costLabels[key]} value={value} enough={(resources[key] || 0) >= value} />
                  ))}
              </div>
            </div>
            <div className="recruit-action-col auto-recovery-status">
              <strong>{blockedText}</strong>
              <span className="owned-count">{specialtyMeta.title}: {specialtyCount}</span>
            </div>
          </div>
          <p className="auto-recovery-note">
            Máy chủ chỉ bổ sung {specialtyMeta.title.toLocaleLowerCase("vi-VN")} cho thành trì này.
          </p>
        </div>

        <div className="ob-modal-actions town-modal-actions">
          <button type="button" className="ob-action-btn secondary town-footer-btn" onClick={onClose}>ĐÓNG QUẢN LÝ</button>
        </div>
      </div>
    </div>
  );
}
