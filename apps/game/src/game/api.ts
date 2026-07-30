import type {
  AllianceActionResult,
  AllianceStateResult,
  ClaimTerritoryResult,
  CompleteClearingResult,
  CreateMarchResult,
  GameConfig,
  GameStateResult,
  ServerStatus,
  SaveSnapshot,
  StartClearingResult,
  WorldTerritoriesResult,
} from "@island/shared";

function getApiUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:4000`;
  }
  return "http://127.0.0.1:4000";
}

const API_URL = getApiUrl();

export interface AuthResponse {
  token: string;
  playerId: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || `API ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getServerStatus() {
  return request<ServerStatus>("/api/health");
}

let cachedConfigPromise: Promise<GameConfig> | null = null;

export function getGameConfig(): Promise<GameConfig> {
  if (!cachedConfigPromise) {
    cachedConfigPromise = request<GameConfig>("/api/config");
  }
  return cachedConfigPromise;
}

export function loginPlayer(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/player/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export type RegisterProfile = {
  flagColor: string;
  emblem: string;
  starterLandId: string;
};

export function registerPlayer(username: string, password: string, profile?: RegisterProfile): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/player/register", {
    method: "POST",
    body: JSON.stringify({ username, password, ...profile }),
  });
}

export function loginGuest(name?: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/player/guest", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getSave(token: string): Promise<SaveSnapshot | null> {
  return request<SaveSnapshot | null>("/api/save/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function putSave(token: string, data: any): Promise<{ ok: boolean; updatedAt: string }> {
  return request<{ ok: boolean; updatedAt: string }>("/api/save/me", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

export function getWorldTerritories(token: string): Promise<WorldTerritoriesResult> {
  return request<WorldTerritoriesResult>("/api/world/territories", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function claimTerritory(token: string, territoryId: number): Promise<ClaimTerritoryResult> {
  return request<ClaimTerritoryResult>(`/api/world/territories/${territoryId}/claim`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
}

export function conquerTerritory(token: string, territoryId: number): Promise<ClaimTerritoryResult> {
  return request<ClaimTerritoryResult>(`/api/world/territories/${territoryId}/conquer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
}

export function getGameState(token: string): Promise<GameStateResult> {
  return request<GameStateResult>("/api/game/state", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function startClearing(token: string, territoryId: number): Promise<StartClearingResult> {
  return request<StartClearingResult>("/api/game/clearings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ territoryId }),
  });
}

export function completeClearing(token: string, territoryId: number): Promise<CompleteClearingResult> {
  return request<CompleteClearingResult>(`/api/game/clearings/${territoryId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
}

export function cancelClearing(token: string, territoryId: number): Promise<{ ok: true; resources?: any; refund?: any }> {
  return request<{ ok: true; resources?: any; refund?: any }>(`/api/game/clearings/${territoryId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function createMarch(
  token: string,
  payload: {
    fromTerritoryId: number;
    toTerritoryId: number;
    troops: number;
    infantry?: number;
    cavalry?: number;
    artillery?: number;
    battleSide?: "attacker" | "defender";
    kind?: "attack" | "reinforce" | "move";
  },
): Promise<CreateMarchResult> {
  return request<CreateMarchResult>("/api/game/marches", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function updatePlayerProfile(token: string, flagColor: string, emblem: string, cityName?: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/player/profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ flagColor, emblem, cityName }),
  });
}

export function getAllianceState(token: string): Promise<AllianceStateResult> {
  return request<AllianceStateResult>("/api/alliance/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function createAlliance(token: string, name: string, tag: string, emblem: string): Promise<AllianceActionResult> {
  return request<AllianceActionResult>("/api/alliance/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, tag, emblem }),
  });
}

export function joinAlliance(token: string, allianceId: string): Promise<AllianceActionResult> {
  return request<AllianceActionResult>("/api/alliance/join", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ allianceId }),
  });
}

export function leaveAlliance(token: string): Promise<AllianceActionResult> {
  return request<AllianceActionResult>("/api/alliance/leave", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
}

export function sendAllianceAid(
  token: string,
  payload: {
    toPlayerId: string;
    resources: Record<string, number>;
    troops: number;
  },
): Promise<AllianceStateResult> {
  return request<AllianceStateResult>("/api/alliance/aid", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function claimAllianceAid(token: string, aidId: string): Promise<AllianceStateResult> {
  return request<AllianceStateResult>(`/api/alliance/aid/${encodeURIComponent(aidId)}/claim`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
}

export interface RecruitTroopsResult {
  ok: boolean;
  townId?: number;
  territoryId?: number;
  unitType: "infantry" | "cavalry" | "artillery";
  count: number;
  unitCountAdded?: number;
  troopsAdded?: number;
  town?: Record<string, unknown>;
  resources?: Record<string, number>;
  message?: string;
}

export function recruitTroops(
  token: string,
  payload: {
    unitType: "infantry" | "cavalry" | "artillery";
    territoryId?: number;
    townId?: number;
    count?: number;
  },
): Promise<RecruitTroopsResult> {
  return request<RecruitTroopsResult>("/api/game/recruit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
