export type ResourceKey = "gold" | "wood" | "stone" | "gems";

export type ResourceBag = Record<ResourceKey, number>;

export type PlayerRole = "player" | "admin";

export type PublicPlayer = {
  id: string;
  name: string;
  role: PlayerRole;
  createdAt: string;
  lastSeenAt: string;
};

export type TownSnapshot = {
  id: number;
  level: number;
  ownerId: string;
  troops: number;
};

export type SaveSnapshot = {
  id: string;
  playerId: string;
  resources: ResourceBag;
  towns: TownSnapshot[];
  updatedAt: string;
};

export type ServerStatus = {
  ok: true;
  service: "island-empire-api";
  time: string;
};

export type AdminOverview = {
  players: number;
  saves: number;
  activeToday: number;
};

export type ApiError = {
  error: string;
  message: string;
};
