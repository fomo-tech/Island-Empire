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

export type CachedRegion = {
  canvas: HTMLCanvasElement;
  assetsCanvas?: HTMLCanvasElement | null;
  minX: number;
  minY: number;
  width: number;
  height: number;
  hasTown: boolean;
  hasOwner: boolean;
  zoomTier: number;
  assetsEnabled?: boolean;
};
