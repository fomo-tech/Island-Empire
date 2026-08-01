import type {
  AllianceActionResult,
  AllianceStateResult,
  CompleteClearingResult,
  CreateMarchResult,
  GameConfig,
  GameStateResult,
  PlayerSyncResult,
  ResourceBag,
  ShopInventory,
  ShopProduct,
  ShopPurchase,
  BattleReport,
  PlayerMail,
  ServerStatus,
  StartClearingResult,
  WorldTerritoriesResult,
  MarchSourceOptionsResult,
  ChatHistoryResult,
} from "@island/shared";

function getApiUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  // Keep requests on the page origin. In production Nginx forwards /api;
  // in local development Vite proxies it to the API process. This also avoids
  // HTTPS mixed-content failures and unreachable :4000 URLs on mobile.
  return "";
}

const API_URL = getApiUrl();

export interface AuthResponse {
  token: string;
  playerId: string;
}

type AntiBotChallenge = {
  token: string;
  difficulty: number;
  expiresInSeconds: number;
};

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

export function getChatHistory(token: string) {
  return request<ChatHistoryResult>("/api/chat/history", {
    headers: { authorization: `Bearer ${token}` },
  });
}

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function solveAntiBotChallenge() {
  const challenge = await request<AntiBotChallenge>("/api/auth/challenge");
  const [payload] = challenge.token.split(".");
  const data = JSON.parse(
    atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
  ) as { nonce: string };
  const prefix = "0".repeat(challenge.difficulty);
  const encoder = new TextEncoder();
  for (let proof = 0; proof <= 2_147_483_647; proof += 1) {
    const digest = toHex(
      await crypto.subtle.digest(
        "SHA-256",
        encoder.encode(`${data.nonce}:${proof}`),
      ),
    );
    if (digest.startsWith(prefix))
      return { challengeToken: challenge.token, proof };
    if (proof > 0 && proof % 256 === 0)
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
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

export async function loginPlayer(
  username: string,
  password: string,
): Promise<AuthResponse> {
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

export async function registerPlayer(
  username: string,
  password: string,
  profile?: RegisterProfile,
): Promise<AuthResponse> {
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

export function getWorldTerritories(
  token: string,
): Promise<WorldTerritoriesResult> {
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

export function getPlayerSync(token: string): Promise<PlayerSyncResult> {
  return request<PlayerSyncResult>("/api/player/sync", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getBattleReports(
  token: string,
): Promise<{ ok: true; reports: BattleReport[]; unreadCount: number }> {
  return request("/api/reports", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function markBattleReportRead(
  token: string,
  reportId: string,
): Promise<{ ok: true; unreadCount: number }> {
  return request(`/api/reports/${encodeURIComponent(reportId)}/read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
}

export function markAllBattleReportsRead(
  token: string,
): Promise<{ ok: true; unreadCount: number }> {
  return request("/api/reports/read-all", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
}

export function sendPlayerMail(
  token: string,
  input: {
    recipientId: string;
    title: string;
    body: string;
    requestId: string;
  },
): Promise<{ ok: true; mail: PlayerMail; duplicate?: boolean }> {
  return request("/api/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

export function markPlayerMailRead(
  token: string,
  mailId: string,
): Promise<{ ok: true; unreadCount: number; readAt: string }> {
  return request(`/api/mail/${encodeURIComponent(mailId)}/read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
}

export function deletePlayerMail(
  token: string,
  mailId: string,
): Promise<{ ok: true }> {
  return request(`/api/mail/${encodeURIComponent(mailId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function clearPlayerMail(
  token: string,
  folder: "inbox" | "sent",
): Promise<{ ok: true; folder: string; unreadCount?: number }> {
  return request("/api/mail/clear", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ folder }),
  });
}

export function getShopCatalog(
  token: string,
): Promise<{ ok: true; products: ShopProduct[]; testMode: boolean }> {
  return request("/api/shop/catalog", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function purchaseShopProduct(
  token: string,
  productId: string,
  requestId: string,
  equipTarget?: "capital" | "military_district",
): Promise<{
  ok: true;
  duplicate?: boolean;
  purchase: ShopPurchase;
  inventory: ShopInventory;
  resources: ResourceBag;
}> {
  return request("/api/shop/purchase", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId, requestId, equipTarget }),
  });
}

export function equipShopSkin(
  token: string,
  skinId: string,
  target: "capital" | "military_district",
): Promise<{
  ok: true;
  inventory: ShopInventory;
}> {
  return request("/api/shop/equip", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ skinId, target }),
  });
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  cityName: string;
  flagColor: string;
  emblem: string;
  townCount: number;
  capitalLevel: number;
  totalTroops: number;
  prestige: number;
  isCurrentPlayer: boolean;
}

export function getMilitaryLeaderboard(
  token: string,
): Promise<{ ok: true; leaderboard: LeaderboardEntry[]; currentPlayer: LeaderboardEntry | null }> {
  return request("/api/leaderboard/military", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function startClearing(
  token: string,
  territoryId: number,
): Promise<StartClearingResult> {
  return request<StartClearingResult>("/api/game/clearings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ territoryId }),
  });
}

export function completeClearing(
  token: string,
  territoryId: number,
): Promise<CompleteClearingResult> {
  return request<CompleteClearingResult>(
    `/api/game/clearings/${territoryId}/complete`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    },
  );
}

export function cancelClearing(
  token: string,
  territoryId: number,
): Promise<{ ok: true; resources?: any; refund?: any }> {
  return request<{ ok: true; resources?: any; refund?: any }>(
    `/api/game/clearings/${territoryId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function createMarch(
  token: string,
  payload: {
    requestId?: string;
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

export function getMarchSourceOptions(
  token: string,
  toTerritoryId: number,
  kind: "attack" | "reinforce" | "move" = "attack",
): Promise<MarchSourceOptionsResult> {
  return request<MarchSourceOptionsResult>("/api/game/marches/sources", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ toTerritoryId, kind }),
  });
}

export function updatePlayerProfile(
  token: string,
  flagColor: string,
  emblem: string,
  cityName?: string,
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/player/profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ flagColor, emblem, cityName }),
  });
}

export function checkCityName(token: string, cityName: string) {
  return request<{ available: boolean; normalizedName: string; message: string }>("/api/player/city-name/check", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ cityName }),
  });
}

export function updateActiveMap(
  token: string,
  activeMap: "world" | "conquest",
): Promise<{ ok: true; activeMap: "world" | "conquest" }> {
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

export function createAlliance(
  token: string,
  name: string,
  tag: string,
  emblem: string,
): Promise<AllianceActionResult> {
  return request<AllianceActionResult>("/api/alliance/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, tag, emblem }),
  });
}

export function joinAlliance(
  token: string,
  allianceId: string,
): Promise<AllianceActionResult> {
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

export function claimAllianceAid(
  token: string,
  aidId: string,
): Promise<AllianceStateResult> {
  return request<AllianceStateResult>(
    `/api/alliance/aid/${encodeURIComponent(aidId)}/claim`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    },
  );
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
  const requestId =
    payload.requestId ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `recruit-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);
  return request<RecruitTroopsResult>("/api/game/recruit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...payload, requestId }),
  });
}
