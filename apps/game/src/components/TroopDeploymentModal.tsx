import React, { useEffect, useMemo, useState } from "react";

interface TroopDeploymentModalProps {
  sourceTown: {
    id: number;
    lvl: number;
    troops: number;
    x?: number;
    y?: number;
    population?: number;
    infantryCount?: number;
    cavalryCount?: number;
    artilleryCount?: number;
  };
  sourceTowns?: Array<{
    id: number;
    lvl: number;
    troops: number;
    x?: number;
    y?: number;
    population?: number;
    infantryCount?: number;
    cavalryCount?: number;
    artilleryCount?: number;
  }>;
  selectedSourceTownId?: number;
  targetTownId: number;
  isAttack: boolean;
  battleSide?: "attacker" | "defender";
  gameConfig?: any;
  errorMessage?: string | null;
  getTownRegionId?: (town: any) => number;
  getRegionCenter?: (id: number) => { x: number; y: number } | null;
  getRouteStatus?: (town: any, targetRegionId: number) => { ok: boolean; message: string; requiresShip: boolean };
  onSelectSourceTown?: (townId: number) => void;
  onConfirm: (infantryCount: number, cavalryCount: number, artilleryCount: number) => void;
  onClose: () => void;
}

export function TroopDeploymentModal({
  sourceTown,
  sourceTowns,
  selectedSourceTownId,
  targetTownId,
  isAttack,
  battleSide,
  gameConfig,
  errorMessage,
  getTownRegionId,
  getRegionCenter,
  onSelectSourceTown,
  onConfirm,
  onClose
}: TroopDeploymentModalProps) {
  const config = gameConfig || {
    infantryTroopsValue: 18,
    cavalryTroopsValue: 34,
    artilleryTroopsValue: 58,
    infantrySpeed: 200,
    cavalrySpeed: 350,
    artillerySpeed: 100,
    shipSpeed: 150,
  };
  const infantryPower = config.infantryTroopsValue || 18;
  const cavalryPower = config.cavalryTroopsValue || 34;
  const artilleryPower = config.artilleryTroopsValue || 58;
  const actionLabel = isAttack
    ? "PHÁT ĐỘNG TẤN CÔNG"
    : battleSide === "attacker"
      ? "TIẾP VIỆN TẤN CÔNG"
      : "TIẾP VIỆN PHÒNG THỦ";
  const availableSourceTowns = useMemo(() => {
    const byId = new Map<number, any>();
    [...(sourceTowns || []), sourceTown].forEach((town) => {
      if (town?.id !== undefined && town?.id !== null) byId.set(town.id, town);
    });
    const selected = byId.get(selectedSourceTownId ?? sourceTown.id);
    const top = Array.from(byId.values()).sort((a, b) => (b.troops || 0) - (a.troops || 0)).slice(0, 120);
    if (selected && !top.some((town) => town.id === selected.id)) top.unshift(selected);
    return top;
  }, [sourceTowns, sourceTown]);
  const targetCenter = useMemo(() => getRegionCenter?.(targetTownId) || null, [getRegionCenter, targetTownId]);
  const sourceRegionId = useMemo(() => getTownRegionId?.(sourceTown) ?? -1, [getTownRegionId, sourceTown]);
  const distanceKm = useMemo(() => (
    targetCenter && sourceTown.x !== undefined && sourceTown.y !== undefined
      ? Math.max(1, Math.round(Math.hypot(sourceTown.x - targetCenter.x, sourceTown.y - targetCenter.y) * 0.18))
      : null
  ), [sourceTown.x, sourceTown.y, targetCenter]);
  const townOptions = useMemo(() => availableSourceTowns.map((town) => {
    const townUnitCount = Math.max(0,
      Math.floor((town.infantryCount ?? town.troops ?? 0) + (town.cavalryCount ?? 0) + (town.artilleryCount ?? 0))
    );
    return {
      id: town.id,
      label: `Thành #${town.id} - ${townUnitCount} quân`,
    };
  }), [availableSourceTowns]);

  const infantryAvailable = Math.max(0, Math.floor(sourceTown.infantryCount ?? sourceTown.troops ?? 0));
  const cavalryAvailable = Math.max(0, Math.floor(sourceTown.cavalryCount ?? 0));
  const artilleryAvailable = Math.max(0, Math.floor(sourceTown.artilleryCount ?? 0));
  const totalUnitsAvailable = Math.max(0, infantryAvailable + cavalryAvailable + artilleryAvailable);
  const maxDeployUnits = Math.max(0, totalUnitsAvailable - 1);

  const maxInfantry = Math.min(infantryAvailable, maxDeployUnits);
  const maxCavalry = Math.min(cavalryAvailable, maxDeployUnits);
  const maxArtillery = Math.min(artilleryAvailable, maxDeployUnits);

  const [infantry, setInfantry] = useState(() => Math.min(1, maxInfantry));
  const [cavalry, setCavalry] = useState(0);
  const [artillery, setArtillery] = useState(0);

  useEffect(() => {
    setInfantry(Math.min(1, maxInfantry));
    setCavalry(0);
    setArtillery(0);
  }, [sourceTown.id, maxInfantry]);

  const currentPowerSent = infantry * infantryPower + cavalry * cavalryPower + artillery * artilleryPower;
  const currentUnitsSent = infantry + cavalry + artillery;
  const unitsRemaining = Math.max(0, totalUnitsAvailable - currentUnitsSent);

  const handleInfantryChange = (val: number) => {
    const cleanVal = Math.max(0, Math.min(maxInfantry, val));
    const selectedUnits = cleanVal + cavalry + artillery;
    if (selectedUnits <= maxDeployUnits) {
      setInfantry(cleanVal);
    } else {
      setInfantry(Math.max(0, maxDeployUnits - cavalry - artillery));
    }
  };

  const handleCavalryChange = (val: number) => {
    const cleanVal = Math.max(0, Math.min(maxCavalry, val));
    const selectedUnits = infantry + cleanVal + artillery;
    if (selectedUnits <= maxDeployUnits) {
      setCavalry(cleanVal);
    } else {
      setCavalry(Math.max(0, maxDeployUnits - infantry - artillery));
    }
  };

  const handleArtilleryChange = (val: number) => {
    const cleanVal = Math.max(0, Math.min(maxArtillery, val));
    const selectedUnits = infantry + cavalry + cleanVal;
    if (selectedUnits <= maxDeployUnits) {
      setArtillery(cleanVal);
    } else {
      setArtillery(Math.max(0, maxDeployUnits - infantry - cavalry));
    }
  };

  const handleConfirm = () => {
    if (currentPowerSent <= 0) {
      alert("Vui lòng chọn ít nhất 1 binh sĩ để xuất binh!");
      return;
    }
    if (currentUnitsSent >= totalUnitsAvailable) {
      alert("Phải để lại ít nhất 1 quân phòng thủ trong thành!");
      return;
    }
    onConfirm(infantry, cavalry, artillery);
  };

  // Determine march speed (slowest of selected units)
  const selectedSpeeds: number[] = [];
  if (infantry > 0) selectedSpeeds.push(config.infantrySpeed);
  if (cavalry > 0) selectedSpeeds.push(config.cavalrySpeed);
  if (artillery > 0) selectedSpeeds.push(config.artillerySpeed);
  const usesShip = false;
  const marchSpeed = usesShip ? config.shipSpeed : (selectedSpeeds.length > 0 ? Math.min(...selectedSpeeds) : 0);
  const slowestUnit = usesShip
    ? "Thuyền vận tải"
    : artillery > 0 && marchSpeed === config.artillerySpeed
      ? "Pháo binh"
      : infantry > 0 && marchSpeed === config.infantrySpeed
        ? "Bộ binh"
        : cavalry > 0 && marchSpeed === config.cavalrySpeed
          ? "Kị binh"
          : "Chưa chọn quân";
  const travelSeconds = distanceKm !== null && marchSpeed > 0 ? Math.max(6, Math.round((distanceKm / marchSpeed) * 60)) : null;
  const travelText = travelSeconds === null
    ? "?"
    : travelSeconds >= 60
      ? `${Math.floor(travelSeconds / 60)}p ${travelSeconds % 60}s`
      : `${travelSeconds}s`;

  return (
    <div className="ob-modal-overlay" onMouseDown={onClose}>
      <div className="ob-modal-container town-modal deployment-modal" onMouseDown={(event) => event.stopPropagation()}>
        {/* Glow accent */}
        <div className="ob-modal-glow" style={{ background: isAttack ? "linear-gradient(90deg, transparent, #ef4444, transparent)" : "linear-gradient(90deg, transparent, #34d399, transparent)" }} />

        {/* Header */}
        <div className="ob-modal-header">
          <h2 className="ob-modal-title">
            {isAttack ? "⚔️" : battleSide === "attacker" ? "⚔️" : "🛡️"} {actionLabel}
          </h2>
          <p className="ob-modal-subtitle">
            Từ Thành trì #{sourceTown.id} đến Lãnh thổ #{targetTownId}
          </p>
        </div>

        <div style={{
          marginBottom: 14,
          padding: "12px",
          border: "1px solid rgba(255,211,77,0.25)",
          background: "rgba(7,12,20,0.62)",
          borderRadius: 6
        }}>
          <label style={{
            display: "block",
            marginBottom: 8,
            color: "#ffd34d",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0,
            textShadow: "1px 1px 0 #000"
          }}>
            CHỌN THÀNH XUẤT QUÂN
          </label>
          <select
            value={selectedSourceTownId ?? sourceTown.id}
            onChange={(event) => onSelectSourceTown?.(Number(event.target.value))}
            style={{
              width: "100%",
              height: 40,
              background: "#070c14",
              border: "1px solid rgba(255,211,77,0.45)",
              borderRadius: 4,
              color: "#fff",
              padding: "0 10px",
              fontWeight: 800,
              outline: "none"
            }}
          >
            {townOptions.map((town) => (
              <option key={town.id} value={town.id}>
                {town.label}
              </option>
            ))}
          </select>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 8,
            marginTop: 10
          }}>
            <div className="town-stat-card" style={{ padding: 8 }}>
              <span className="stat-label">KHOẢNG CÁCH</span>
              <span className="stat-val text-gold">{distanceKm !== null ? `${distanceKm} km` : "?"}</span>
            </div>
            <div className="town-stat-card" style={{ padding: 8 }}>
              <span className="stat-label">ĐƯỜNG ĐI</span>
              <span className="stat-val text-blue">Kiểm tra khi xuất</span>
            </div>
            <div className="town-stat-card" style={{ padding: 8 }}>
              <span className="stat-label">THÀNH NGUỒN</span>
              <span className="stat-val text-gold">#{sourceTown.id} / LT #{sourceRegionId >= 0 ? sourceRegionId + 1 : "?"}</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div style={{
            marginBottom: 14,
            padding: "10px 12px",
            border: "1px solid rgba(239,68,68,0.55)",
            background: "rgba(127,29,29,0.42)",
            color: "#fecaca",
            borderRadius: 6,
            fontWeight: 800,
            fontSize: 13,
            lineHeight: 1.35,
            textAlign: "center",
            textShadow: "1px 1px 0 #000"
          }}>
            {errorMessage}
          </div>
        )}

        {/* Power Status */}
        <div className="town-stats-grid">
          <div className="town-stat-card">
            <span className="stat-label">QUÂN TRONG THÀNH</span>
            <span className="stat-val text-gold">{totalUnitsAvailable} quân</span>
          </div>
          <div className="town-stat-card">
            <span className="stat-label">LỰC LƯỢNG XUẤT CHINH</span>
            <span className="stat-val text-gold">{currentUnitsSent} quân</span>
          </div>
          <div className="town-stat-card">
            <span className="stat-label">BINH LÍNH Ở LẠI THỦ THÀNH</span>
            <span className="stat-val text-blue">{unitsRemaining} quân</span>
          </div>
          <div className="town-stat-card">
            <span className="stat-label">SỨC MẠNH XUẤT CHIẾN</span>
            <span className="stat-val text-gold">{currentPowerSent}</span>
          </div>
        </div>

        {/* Sliders / Inputs */}
        <div className="recruitment-section">
          <h3 className="section-title">CHỈNH ĐỊNH LỰC LƯỢNG</h3>

          {/* Infantry Slider */}
          <div className="recruit-option flex-column" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="option-name">Bộ binh ({config.infantrySpeed} km/h)</span>
              <span className="stat-val text-gold" style={{ fontFamily: "monospace" }}>{infantry} / {maxInfantry} sĩ</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="range"
                min="0"
                max={maxInfantry}
                value={infantry}
                onChange={(e) => handleInfantryChange(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#38bdf8" }}
              />
              <input
                type="number"
                min="0"
                max={maxInfantry}
                value={infantry}
                onChange={(e) => handleInfantryChange(Number(e.target.value))}
                style={{ width: 60, padding: "4px 8px", background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff", textAlign: "center" }}
              />
            </div>
          </div>

          {/* Cavalry Slider */}
          <div className="recruit-option flex-column" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="option-name">Kị binh ({config.cavalrySpeed} km/h)</span>
              <span className="stat-val text-gold" style={{ fontFamily: "monospace" }}>{cavalry} / {maxCavalry} sĩ</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="range"
                min="0"
                max={maxCavalry}
                value={cavalry}
                onChange={(e) => handleCavalryChange(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#ffd34d" }}
              />
              <input
                type="number"
                min="0"
                max={maxCavalry}
                value={cavalry}
                onChange={(e) => handleCavalryChange(Number(e.target.value))}
                style={{ width: 60, padding: "4px 8px", background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff", textAlign: "center" }}
              />
            </div>
          </div>

          {/* Artillery Slider */}
          <div className="recruit-option flex-column" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 8, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="option-name">Pháo binh ({config.artillerySpeed} km/h)</span>
              <span className="stat-val text-gold" style={{ fontFamily: "monospace" }}>{artillery} / {maxArtillery} sĩ</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="range"
                min="0"
                max={maxArtillery}
                value={artillery}
                onChange={(e) => handleArtilleryChange(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#f43f5e" }}
              />
              <input
                type="number"
                min="0"
                max={maxArtillery}
                value={artillery}
                onChange={(e) => handleArtilleryChange(Number(e.target.value))}
                style={{ width: 60, padding: "4px 8px", background: "#070c14", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, color: "#fff", textAlign: "center" }}
              />
            </div>
          </div>
        </div>

        {/* Speed Information Badge */}
        {marchSpeed > 0 && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "10px 14px", marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Thời gian hành quân:</span>
              <span style={{ color: "#ffd34d", fontWeight: "bold" }}>{travelText}</span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: 10, color: "#64748b", lineHeight: 1.45 }}>
              Khoảng cách: {distanceKm ?? "?"} km | Tốc độ hiệu dụng: {marchSpeed} km/h | Chậm nhất: {slowestUnit}.
              {isAttack && <span style={{ display: "block", marginTop: 2 }}>* Nếu vượt biển sẽ dùng thuyền ({config.shipSpeed} km/h), 1 giờ game = 60 giây thật.</span>}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="ob-modal-actions" style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button
            type="button"
            className={`ob-action-btn ${isAttack ? "danger" : "primary"}`}
            style={{ flex: 1, background: isAttack ? "linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)" : "linear-gradient(180deg, #34d399 0%, #059669 100%)", color: "#fff" }}
            onClick={handleConfirm}
          >
            {isAttack ? "XUẤT BINH CHIẾM THÀNH" : battleSide === "attacker" ? "GỬI VIỆN BINH TẤN CÔNG" : "GỬI VIỆN BINH PHÒNG THỦ"}
          </button>
          <button
            type="button"
            className="ob-action-btn secondary"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            HỦY LỆNH
          </button>
        </div>
      </div>
    </div>
  );
}
