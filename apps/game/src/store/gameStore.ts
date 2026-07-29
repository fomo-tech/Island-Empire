import { create } from "zustand";
import type { ResourceBag, TownSnapshot } from "@island/shared";

type Updater<T> = T | ((prev: T) => T);

export type WorldActivityState = {
  marches: any[];
  clearings: any[];
  battles: any[];
  territoryById: Record<number, any>;
};

export type ServerHudState = {
  ownedTerritories: number;
  totalTerritories: number;
  enemyTerritories: number;
  activeMarches: number;
  ownMarches: number;
  activeClearings: number;
  ownClearings: number;
  outboundTroops: number;
  ownedTroops: number;
  strategicPower: number;
  lastSync: number;
};

export type PendingGameAction = {
  id: string;
  type: string;
  status: "pending" | "confirmed" | "rolled_back";
  createdAt: number;
  rollback?: () => void;
};

const initialResources: ResourceBag = {
  gold: 1250,
  wood: 830,
  stone: 670,
  food: 0,
  iron: 0,
  coal: 0,
  sulfur: 0,
  gems: 420,
};

const initialWorldActivity: WorldActivityState = {
  marches: [],
  clearings: [],
  battles: [],
  territoryById: {},
};

const initialServerHud: ServerHudState = {
  ownedTerritories: 0,
  totalTerritories: 0,
  enemyTerritories: 0,
  activeMarches: 0,
  ownMarches: 0,
  activeClearings: 0,
  ownClearings: 0,
  outboundTroops: 0,
  ownedTroops: 0,
  strategicPower: 0,
  lastSync: 0,
};

function normalizeTownSnapshot(town: any) {
  const level = Math.max(1, Math.floor(Number(town?.lvl ?? town?.level ?? 1) || 1));
  return {
    ...town,
    level,
    lvl: level,
  };
}

function indexTowns(towns: any[]) {
  return Object.fromEntries(towns.map((town) => [Number(town.id), town]).filter(([id]) => Number.isFinite(id)));
}

function resolve<T>(next: Updater<T>, prev: T): T {
  return typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
}

type GameStore = {
  resources: ResourceBag;
  worldActivity: WorldActivityState;
  serverHud: ServerHudState;
  towns: Array<TownSnapshot & { lvl?: number; owner?: number }>;
  townsById: Record<number, TownSnapshot & { lvl?: number; owner?: number }>;
  pendingActions: PendingGameAction[];
  setResources: (next: Updater<ResourceBag>) => void;
  setWorldActivity: (next: Updater<WorldActivityState>) => void;
  setServerHud: (next: Updater<ServerHudState>) => void;
  setTowns: (next: Updater<any[]>) => void;
  upsertTown: (town: any) => void;
  enqueueAction: (action: Omit<PendingGameAction, "createdAt" | "status">) => void;
  confirmAction: (id: string) => void;
  rollbackAction: (id: string) => void;
  resetGameStore: () => void;
};

export const useGameStore = create<GameStore>()((set, get) => ({
  resources: initialResources,
  worldActivity: initialWorldActivity,
  serverHud: initialServerHud,
  towns: [],
  townsById: {},
  pendingActions: [],
  setResources: (next) => set((state) => ({ resources: resolve(next, state.resources) })),
  setWorldActivity: (next) => set((state) => ({ worldActivity: resolve(next, state.worldActivity) })),
  setServerHud: (next) => set((state) => ({ serverHud: resolve(next, state.serverHud) })),
  setTowns: (next) => set((state) => {
    const towns = resolve(next, state.towns).map(normalizeTownSnapshot);
    return { towns, townsById: indexTowns(towns) };
  }),
  upsertTown: (town) => set((state) => {
    if (!town || !Number.isFinite(Number(town.id))) return state;
    const normalized = normalizeTownSnapshot(town);
    const towns = [
      ...state.towns.filter((item) => Number(item.id) !== Number(normalized.id)),
      normalized,
    ];
    return { towns, townsById: indexTowns(towns) };
  }),
  enqueueAction: (action) => set((state) => ({
    pendingActions: [
      ...state.pendingActions.filter((item) => item.id !== action.id),
      { ...action, status: "pending", createdAt: Date.now() },
    ],
  })),
  confirmAction: (id) => set((state) => ({
    pendingActions: state.pendingActions.map((item) => item.id === id ? { ...item, status: "confirmed" } : item),
  })),
  rollbackAction: (id) => {
    const action = get().pendingActions.find((item) => item.id === id);
    action?.rollback?.();
    set((state) => ({
      pendingActions: state.pendingActions.map((item) => item.id === id ? { ...item, status: "rolled_back" } : item),
    }));
  },
  resetGameStore: () => set({
    resources: initialResources,
    worldActivity: initialWorldActivity,
    serverHud: initialServerHud,
    towns: [],
    townsById: {},
    pendingActions: [],
  }),
}));
