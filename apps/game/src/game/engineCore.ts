// @ts-nocheck

export type GameEngineHandle = {
  destroy: () => void;
  getState: () => any;
  getTowns: () => any[];
  getRegions: () => any[];
  getIslets: () => any[];
  mapToScreen: (x: number, y: number) => { x: number; y: number };
  getRegionOwnership: (id: number) => number;
  getSourceTown: () => any;
  getPlayerOwnedTowns: () => any[];
  getTownRegionId: (town: any) => number;
  getRegion: (id: number) => any;
  getRegionCenter: (id: number) => { x: number; y: number } | null;
  getTerritorySpecialResources: (id: number) => string[];
  getActiveBattleForRegion: (id: number) => any;
  canBuildStronghold: (regionId: number) => boolean;
  getExpansionConnectionType: (regionId: number) => "land" | "sea" | null;
  getExpansionSourceRegionsForTarget: (regionId: number) => number[];
  isPlayerOwnedTown: (town: any) => boolean;
  getMarchRouteStatus: (
    sourceTown: any,
    targetRegionId: number,
  ) => { ok: boolean; message: string; requiresShip: boolean };
  sendChat: (msg: string) => void;
  handleAction: (id: string, payload?: any) => any;
  startNewbieOnboarding: (
    flagColor: string,
    emblem: string,
    cityName?: string,
    architectureId?: string,
  ) => void;
  cancelNewbieOnboarding: () => void;
  selectNewbieLand: (regionId: number) => void;
  setHideTerritoryAssets: (hide: boolean) => void;
  isHidingTerritoryAssets: () => boolean;
  toggleHideTerritoryAssets: (forceValue?: boolean) => boolean;
};

export function createNoopEngineHandle(): GameEngineHandle {
  return {
    destroy: () => {},
    getState: () => ({}),
    getTowns: () => [],
    getRegions: () => [],
    getIslets: () => [],
    mapToScreen: (x: number, y: number) => ({ x, y }),
    getRegionOwnership: () => 0,
    getSourceTown: () => null,
    getPlayerOwnedTowns: () => [],
    getTownRegionId: () => -1,
    getRegion: () => null,
    getRegionCenter: () => null,
    getTerritorySpecialResources: () => [],
    getActiveBattleForRegion: () => null,
    canBuildStronghold: () => false,
    getExpansionConnectionType: () => null,
    getExpansionSourceRegionsForTarget: () => [],
    isPlayerOwnedTown: () => false,
    getMarchRouteStatus: () => ({
      ok: false,
      message: "Khong co ban do",
      requiresShip: false,
    }),
    sendChat: () => {},
    handleAction: () => {},
    startNewbieOnboarding: () => {},
    cancelNewbieOnboarding: () => {},
    selectNewbieLand: () => {},
    setHideTerritoryAssets: () => {},
    isHidingTerritoryAssets: () => false,
    toggleHideTerritoryAssets: () => false,
  };
}

export function getViewportSize() {
  if ((window as any).__isRotatedLandscape) {
    return { width: window.innerHeight, height: window.innerWidth };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

export function applyCanvasSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
) {
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
}

export function getRenderDpr() {
  if (typeof window === "undefined") return 1;
  const cssPixels = Math.max(1, window.innerWidth * window.innerHeight);
  const dprCap =
    cssPixels >= 2_800_000 ? 1.25 : cssPixels >= 1_400_000 ? 1.5 : 2;
  return Math.max(1, Math.min(window.devicePixelRatio || 1, dprCap));
}
