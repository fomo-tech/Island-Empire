// @ts-nocheck

export function createBackendSyncHelpers(deps: {
  state: any;
  towns: any[];
  reactToCanvasRegionId: (id: number) => number;
  landById: (id: number) => any;
  clearingTimingProgress: (timing: any) => number;
  settlerOriginForRegion: (regionId: number) => {
    originTownId: number | null;
    originX: number;
    originY: number;
  };
  timingElapsedSeconds: (
    startedAt: any,
    arrivesAt: any,
  ) => { elapsed: number; duration: number };
  ensureTownForRegion: (regionId: number, ownerCode: number) => any;
  territoryStartingPopulation: (regionId: number, ownerCode?: number) => number;
  defaultBuildings: () => any;
  defaultStorage: () => any;
  derivedRegionOwnership: (regionId: number) => number;
  launchVoyage: (...args: any[]) => boolean;
}) {
  const {
    state,
    towns,
    reactToCanvasRegionId,
    landById,
    clearingTimingProgress,
    settlerOriginForRegion,
    timingElapsedSeconds,
    ensureTownForRegion,
    territoryStartingPopulation,
    defaultBuildings,
    defaultStorage,
    derivedRegionOwnership,
    launchVoyage,
  } = deps;

  function applyBackendClearing(clearing: any) {
    const regionId = reactToCanvasRegionId(clearing?.territoryId);
    const r = landById(regionId);
    if (!r) return;
    const isMine =
      clearing.playerId && clearing.playerId === state.localPlayerId;
    state.regionOwnership[regionId] = 0;
    state.regionOwnerIds[regionId] = clearing.playerId || null;
    state.regionOwnerNames[regionId] = "ÄANG KHAI HOANG";
    state.activeClearingTimings[regionId] = {
      playerId: clearing.playerId,
      startedAt: clearing.startedAt,
      arrivesAt: clearing.arrivesAt,
      completesAt: clearing.completesAt,
      sourceTownId: clearing.sourceTownId,
      settlers: clearing.settlers,
      sourceX: clearing.sourceX,
      sourceY: clearing.sourceY,
      connectionType: clearing.connectionType,
      isStarterClaim: Boolean(clearing.isStarterClaim),
    };
    state.regionClearing[regionId] = clearingTimingProgress(clearing);
    if (isMine) {
      const sourceTown =
        clearing.sourceTownId !== undefined
          ? towns.find((town: any) => town.id === clearing.sourceTownId)
          : null;
      const origin =
        Number.isFinite(clearing.sourceX) && Number.isFinite(clearing.sourceY)
          ? {
              originTownId: clearing.sourceTownId ?? null,
              originX: clearing.sourceX,
              originY: clearing.sourceY,
            }
          : sourceTown
            ? {
                originTownId: sourceTown.id,
                originX: sourceTown.x,
                originY: sourceTown.y,
              }
            : settlerOriginForRegion(regionId);
      state.regionInProgress = regionId;
      state.newbieSelectedRegion = regionId;
      state.newbiePhase = "clearing";
      state.settlerTravel = {
        active: true,
        targetRegionId: regionId,
        originTownId: origin.originTownId,
        originX: origin.originX,
        originY: origin.originY,
      };
    }
  }

  function applyBackendMarch(march: any, unitMix: any = {}) {
    const marchId = march?._id || march?.id || march?.marchId;
    if (!marchId) return false;
    const existingVoyage = state.voyages.find(
      (v) => v.backendMarchId === marchId,
    );
    if (existingVoyage) {
      const timing = timingElapsedSeconds(march.startedAt, march.arrivesAt);
      existingVoyage.startedAt = march.startedAt;
      existingVoyage.arrivesAt = march.arrivesAt;
      existingVoyage.duration = timing.duration;
      existingVoyage.targetProgress = Math.min(
        1,
        timing.elapsed / timing.duration,
      );
      existingVoyage.infantry =
        unitMix.infantry ?? march.infantry ?? existingVoyage.infantry;
      existingVoyage.cavalry =
        unitMix.cavalry ?? march.cavalry ?? existingVoyage.cavalry;
      existingVoyage.artillery =
        unitMix.artillery ?? march.artillery ?? existingVoyage.artillery;
      return true;
    }

    const normalizeWorldTerritoryId = (value: any) => {
      const id = Number(value);
      return Number.isInteger(id) && id >= 9000 ? id - 9000 : id;
    };
    const sourceRegionId = reactToCanvasRegionId(
      normalizeWorldTerritoryId(march.fromTerritoryId),
    );
    const targetRegionId = reactToCanvasRegionId(
      normalizeWorldTerritoryId(march.toTerritoryId),
    );
    const ownerCode = march.ownerId === state.localPlayerId ? 1 : 2;
    const sourceLand = landById(sourceRegionId);
    const source =
      ensureTownForRegion(sourceRegionId, ownerCode) ||
      (sourceLand
        ? {
            id: 9000 + sourceRegionId,
            regionId: sourceRegionId,
            x: sourceLand.x,
            y: sourceLand.y,
            owner: ownerCode === 1 ? 0 : Math.max(1, ownerCode || 2),
            troops: 0,
            infantryCount: 0,
            cavalryCount: 0,
            artilleryCount: 0,
            population: territoryStartingPopulation(sourceRegionId, ownerCode),
            buildings: defaultBuildings(),
            storage: defaultStorage(),
            virtual: true,
          }
        : null);
    const targetOwner =
      derivedRegionOwnership(targetRegionId) ||
      (march.kind === "reinforce" ? ownerCode : 2);
    const targetLand = landById(targetRegionId);
    const target =
      ensureTownForRegion(targetRegionId, targetOwner) ||
      (targetLand
        ? {
            id: 9000 + targetRegionId,
            regionId: targetRegionId,
            x: targetLand.x,
            y: targetLand.y,
            owner: targetOwner === 1 ? 0 : Math.max(1, targetOwner || 2),
            troops: 0,
            infantryCount: 0,
            cavalryCount: 0,
            artilleryCount: 0,
            population: territoryStartingPopulation(
              targetRegionId,
              targetOwner,
            ),
            buildings: defaultBuildings(),
            storage: defaultStorage(),
            virtual: true,
          }
        : null);
    const timing = timingElapsedSeconds(march.startedAt, march.arrivesAt);
    const elapsed = Math.min(timing.duration - 0.05, timing.elapsed);
    if (!source || !target) return false;
    const isAttack =
      march.kind === "attack" ||
      march.battleSide === "attacker" ||
      unitMix.battleSide === "attacker";
    const inf = unitMix.infantry ?? march.infantry ?? 0;
    const cav = unitMix.cavalry ?? march.cavalry ?? 0;
    const art = unitMix.artillery ?? march.artillery ?? 0;

    return launchVoyage(
      source,
      target,
      march.troops,
      targetRegionId,
      isAttack,
      inf,
      cav,
      art,
      march.battleSide ||
        unitMix.battleSide ||
        (isAttack ? "attacker" : "defender"),
      {
        ...timing,
        elapsed: Math.max(0, elapsed),
        startedAt: march.startedAt,
        arrivesAt: march.arrivesAt,
        marchId: marchId,
        noTroopDebit: true,
        usesShip:
          typeof march.usesShip === "boolean" ? march.usesShip : undefined,
      },
    );
  }

  function mapBackendBattle(battle: any) {
    const regId = reactToCanvasRegionId(battle.regionId);
    const fromRegId =
      battle.fromTerritoryId === undefined
        ? undefined
        : reactToCanvasRegionId(battle.fromTerritoryId);
    const toRegId =
      battle.toTerritoryId === undefined
        ? regId
        : reactToCanvasRegionId(battle.toTerritoryId);
    const fromRegion = fromRegId === undefined ? null : landById(fromRegId);
    const targetRegion = landById(toRegId >= 0 ? toRegId : regId);
    const dur = Math.max(
      1,
      battle.durationSeconds ||
        (battle.startedAt && battle.resolvesAt
          ? (new Date(battle.resolvesAt).getTime() -
              new Date(battle.startedAt).getTime()) /
            1000
          : 25),
    );
    const remMs = battle.resolvesAt
      ? new Date(battle.resolvesAt).getTime() - Date.now()
      : dur * 1000;
    const remSec = Math.max(0, remMs / 1000);
    return {
      ...battle,
      id: battle.id || battle._id,
      regionId: regId,
      fromTerritoryId: fromRegId,
      toTerritoryId: toRegId,
      from: fromRegion ? { x: fromRegion.x, y: fromRegion.y } : battle.from,
      target: targetRegion
        ? { x: targetRegion.x, y: targetRegion.y }
        : battle.target,
      attackerOwner: battle.attackerId === state.localPlayerId ? 0 : 1,
      townId: battle.townId ?? 9000 + regId,
      startedAt: battle.startedAt,
      resolvesAt: battle.resolvesAt,
      duration: dur,
      durationSeconds: dur,
      t: Math.max(0, dur - remSec),
      isServerBattle: true,
      attPower: battle.attackerPower ?? battle.attPower ?? 0,
      defPower: battle.defenderPower ?? battle.defPower ?? 0,
      attackerSources: Array.isArray(battle.attackerSources)
        ? battle.attackerSources.map((source: any) => ({
            ...source,
            fromTerritoryId: reactToCanvasRegionId(source.fromTerritoryId),
          }))
        : [],
      participants: Array.isArray(battle.participants)
        ? battle.participants.map((participant: any) => ({
            ...participant,
            sourceTerritoryId: reactToCanvasRegionId(
              participant.sourceTerritoryId,
            ),
          }))
        : [],
    };
  }

  function applyBackendBattles(battles: any[] = [], merge = true) {
    const mapped = battles.map(mapBackendBattle);
    const isNewerBattle = (next: any, current: any) => {
      if (!current) return true;
      const nextVersion = Number(next?.battleVersion || 0);
      const currentVersion = Number(current?.battleVersion || 0);
      if (nextVersion !== currentVersion) return nextVersion > currentVersion;
      return (
        new Date(next?.hpUpdatedAt || 0).getTime() >=
        new Date(current?.hpUpdatedAt || 0).getTime()
      );
    };
    if (!merge) {
      const currentById = new Map(
        (state.activeBattles || []).map((battle: any) => [
          battle.id || battle._id,
          battle,
        ]),
      );
      state.activeBattles = mapped.map((battle) => {
        const current = currentById.get(battle.id || battle._id);
        return isNewerBattle(battle, current) ? battle : current;
      });
      return;
    }
    mapped.forEach((battle) => {
      const current = (state.activeBattles || []).find(
        (item: any) => item.id === battle.id || item._id === battle.id,
      );
      if (!isNewerBattle(battle, current)) return;
      state.activeBattles = [
        ...(state.activeBattles || []).filter(
          (item: any) => item.id !== battle.id && item._id !== battle.id,
        ),
        battle,
      ];
    });
  }

  return {
    applyBackendClearing,
    applyBackendMarch,
    mapBackendBattle,
    applyBackendBattles,
  };
}
