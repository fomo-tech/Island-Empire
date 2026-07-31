import type {
  AllianceActionResult,
  AllianceStateResult,
  CompleteClearingResult,
  CreateMarchResult,
  GameConfig,
  GameStateResult,
  ServerStatus,
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

type AntiBotChallenge = { token: string; difficulty: number; expiresInSeconds: number };

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

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function solveAntiBotChallenge() {
  const challenge = await request<AntiBotChallenge>("/api/auth/challenge");
  const [payload] = challenge.token.split(".");
  const data = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { nonce: string };
  const prefix = "0".repeat(challenge.difficulty);
  const encoder = new TextEncoder();
  for (let proof = 0; proof <= 2_147_483_647; proof += 1) {
    const digest = toHex(await crypto.subtle.digest("SHA-256", encoder.encode(`${data.nonce}:${proof}`)));
    if (digest.startsWith(prefix)) return { challengeToken: challenge.token, proof };
    if (proof > 0 && proof % 256 === 0) await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  }
  throw new Error("Không thể hoàn tất xác minh chống spam");
}

let cachedConfigPromise: Promise<GameConfig> | null = null;

export function getGameConfig(): Promise<GameConfig> {
  if (!cachedConfigPromise) {
    cachedConfigPromise = request<GameConfig>("/api/config");
  }
  return cachedConfigPromise;
}

export async function loginPlayer(username: string, password: string): Promise<AuthResponse> {
  const antiBot = await solveAntiBotChallenge();
  return request<AuthResponse>("/api/auth/player/login", {
    method: "POST",
    body: JSON.stringify({ username, password, ...antiBot }),
  });
}

export type RegisterProfile = {
  flagColor: string;
  emblem: string;
  starterLandId: string;
};

export async function registerPlayer(username: string, password: string, profile?: RegisterProfile): Promise<AuthResponse> {
  const antiBot = await solveAntiBotChallenge();
  return request<AuthResponse>("/api/auth/player/register", {
    method: "POST",
    body: JSON.stringify({ username, password, ...profile, ...antiBot }),
  });
}

export async function loginGuest(name?: string): Promise<AuthResponse> {
  const antiBot = await solveAntiBotChallenge();
  return request<AuthResponse>("/api/auth/player/guest", {
    method: "POST",
    body: JSON.stringify({ name, ...antiBot }),
  });
}

export function getWorldTerritories(token: string): Promise<WorldTerritoriesResult> {
  return request<WorldTerritoriesResult>("/api/world/territories", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
    // Keep the command alive when the player reloads immediately after clicking.
    keepalive: true,
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

export function updateActiveMap(token: string, activeMap: "world" | "conquest"): Promise<{ ok: true; activeMap: "world" | "conquest" }> {
  return request("/api/player/active-map", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ activeMap }),
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
  populationSpent?: number;
  town?: Record<string, unknown>;
  resources?: Record<string, number>;
  resourceCapacity?: Record<string, number>;
  productionPerSecond?: Record<string, number>;
  resourceUpdatedAt?: string;
  serverTime?: string;
  message?: string;
}

export function recruitTroops(
  token: string,
  payload: {
    unitType: "infantry" | "cavalry" | "artillery";
    territoryId?: number;
    townId?: number;
    count?: number;
    requestId?: string;
  },
): Promise<RecruitTroopsResult> {
  const requestId = payload.requestId || (
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `recruit-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
  );
  return request<RecruitTroopsResult>("/api/game/recruit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...payload, requestId }),
  });
}
