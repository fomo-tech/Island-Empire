// @ts-nocheck

export function createEngineSimulationHelpers(deps: {
  state: any;
  towns: any[];
  factions: any[];
  gameConfig: any;
  clampPan: () => void;
  saveCamera: () => void;
  timingElapsedSeconds: (startedAt: any, arrivesAt: any) => any;
  regionAtCoords: (x: number, y: number) => number;
  hasBattleTargetRegion: (regionId: number) => boolean;
  cancelClearingIfOriginLost: () => void;
  clearSettlerReturn: () => void;
  clearingTimingProgress: (timing: any) => number;
  landById: (id: number) => any;
  toast: (message: string) => void;
  pushLog: (message: string) => void;
  isFastPanning: () => boolean;
  isMinimapDragging: () => boolean;
  applyCameraInertiaStep: () => void;
}) {
  const {
    state,
    towns,
    factions,
    gameConfig,
    clampPan,
    saveCamera,
    timingElapsedSeconds,
    regionAtCoords,
    hasBattleTargetRegion,
    cancelClearingIfOriginLost,
    clearSettlerReturn,
    clearingTimingProgress,
    landById,
    toast,
    pushLog,
    isFastPanning,
    isMinimapDragging,
    applyCameraInertiaStep,
  } = deps;

  function sim(dt: number) {
    state.tick += dt;
    if (
      state.targetZoom !== undefined &&
      state.targetZoom !== null &&
      Math.abs(state.zoom - state.targetZoom) > 0.001
    ) {
      state.zoom = lerp(state.zoom, state.targetZoom, Math.min(1, dt * 32));
    }

    if (state.targetPanX !== null && state.targetPanY !== null) {
      state.panX = lerp(state.panX, state.targetPanX, Math.min(1, dt * 32));
      state.panY = lerp(state.panY, state.targetPanY, Math.min(1, dt * 32));
      if (
        Math.abs(state.panX - state.targetPanX) < 0.5 &&
        Math.abs(state.panY - state.targetPanY) < 0.5
      ) {
        state.panX = state.targetPanX;
        state.panY = state.targetPanY;
        state.targetPanX = null;
        state.targetPanY = null;
        saveCamera();
      }
    }

    clampPan();
    for (let i = state.voyages.length - 1; i >= 0; i--) {
      const v = state.voyages[i];
      if (v.startedAt && v.arrivesAt) {
        const timing = timingElapsedSeconds(v.startedAt, v.arrivesAt);
        v.duration = timing.duration;
        v.targetProgress = Math.min(1, timing.elapsed / timing.duration);
        const current = Number.isFinite(v.displayProgress)
          ? v.displayProgress
          : v.targetProgress;
        const drift = v.targetProgress - current;
        v.displayProgress =
          Math.abs(drift) > 0.2
            ? v.targetProgress
            : current + drift * (1 - Math.exp(-dt * 10));
        v.t = v.displayProgress * v.duration;
      } else {
        v.t += dt;
        v.displayProgress = Math.min(1, v.t / v.duration);
      }
      if (v.t >= v.duration) {
        const targetReg =
          v.targetRegionId ?? (v.to ? regionAtCoords(v.to.x, v.to.y) : -1);
        const isTargetInBattle =
          hasBattleTargetRegion(targetReg) ||
          (targetReg < 0 &&
            (state.activeBattles || []).some((b: any) => {
              if (b.townId === undefined || !v.to) return false;
              const tMatch = towns.find(
                (tw: any) => String(tw.id) === String(b.townId),
              );
              return Boolean(
                tMatch && Math.hypot(tMatch.x - v.to.x, tMatch.y - v.to.y) < 60,
              );
            }));

        if (!isTargetInBattle) {
          state.voyages.splice(i, 1);
          continue;
        } else {
          v.t = v.duration;
          v.displayProgress = 1.0;
        }
      }
    }

    const nextBattles: any[] = [];
    (state.activeBattles || []).forEach((battle: any) => {
      const dur = battle.duration || battle.durationSeconds || 25;

      if (battle.isServerBattle && battle.resolvesAt) {
        const remMs = new Date(battle.resolvesAt).getTime() - Date.now();
        const remSec = Math.max(0, remMs / 1000);
        battle.t = Math.max(0, dur - remSec);
        if (remMs > -10000) {
          nextBattles.push(battle);
        }
      } else {
        battle.t = (battle.t || 0) + dt;
        if (battle.t < dur) {
          nextBattles.push(battle);
        }
      }
    });
    state.activeBattles = nextBattles;

    cancelClearingIfOriginLost();
    if (state.settlerTravel?.returning) {
      const settlerReturnSeconds = Math.max(
        2,
        12 *
          (18 / Math.max(1, gameConfig.settlerSpeed || 18)) *
          ((gameConfig.gameHourSeconds || 60) / 60),
      );
      state.settlerTravel.returnProgress = Math.min(
        1,
        (state.settlerTravel.returnProgress || 0) + dt / settlerReturnSeconds,
      );
      if (state.settlerTravel.returnProgress >= 1) {
        clearSettlerReturn();
      }
    }

    Object.entries(state.activeClearingTimings || {}).forEach(
      ([key, timing]: any) => {
        const regionId = Number(key);
        if (!Number.isFinite(regionId)) return;
        state.regionClearing[regionId] = clearingTimingProgress(timing);
        if (
          state.regionClearing[regionId] >= 1 &&
          timing.playerId !== state.localPlayerId
        ) {
          delete state.activeClearingTimings[regionId];
          state.regionClearing[regionId] = 0;
        }
      },
    );
    const ip = state.regionInProgress;
    if (ip >= 0) {
      const r = landById(ip);
      if (r) {
        const serverTiming = state.activeClearingTimings[ip];
        if (serverTiming) {
          state.regionClearing[ip] = clearingTimingProgress(serverTiming);
          if (
            state.regionClearing[ip] >= 1 &&
            serverTiming.playerId === state.localPlayerId &&
            !state.pendingBackendClaims.includes(ip)
          ) {
            state.pendingBackendClaims.push(ip);
            toast("XÃ‚Y THÃ€NH HOÃ€N Táº¤T, ÄANG XÃC NHáº¬N SERVER");
          }
        } else {
          state.regionClearing[ip] = Math.max(0, state.regionClearing[ip] || 0);
        }
      }
    }

    if (Math.floor(state.tick) % 17 === 0 && Math.random() < dt * 0.08) {
      const f = factions[1 + Math.floor(Math.random() * (factions.length - 1))];
      pushLog(`${f.name}: ${f.chat}`);
    }

    applyCameraInertiaStep();
  }

  function hasActiveAnimations() {
    return (
      Boolean(state.drag) ||
      (state.voyages && state.voyages.length > 0) ||
      (state.activeBattles && state.activeBattles.length > 0) ||
      (state.regionClearing &&
        state.regionClearing.some((v: any) => v > 0 && v < 1)) ||
      (state.activeClearingTimings &&
        Object.keys(state.activeClearingTimings).length > 0) ||
      isFastPanning() ||
      isMinimapDragging()
    );
  }

  return {
    sim,
    hasActiveAnimations,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
