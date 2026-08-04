import type { AdminOverview, AdminPlayersResult, AdminTerritoriesResult, SaveSnapshot } from "@island/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json() as Promise<T>;
}

export async function loginAdmin(username: string, password: string) {
  return request<{ token: string }>("/api/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getOverview(token: string) {
  return request<AdminOverview>("/api/admin/overview", {
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function getPlayers(token: string) {
  return request<AdminPlayersResult>("/api/admin/players", {
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function getPlayerSave(token: string, playerId: string) {
  return request<SaveSnapshot | null>(`/api/admin/players/${encodeURIComponent(playerId)}/save`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function resetPlayerSave(token: string, playerId: string) {
  return request<{ ok: boolean; message: string }>(`/api/admin/players/${encodeURIComponent(playerId)}/save`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function deletePlayer(token: string, playerId: string) {
  return request<{ ok: boolean; message: string }>(`/api/admin/players/${encodeURIComponent(playerId)}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function getTerritories(token: string) {
  return request<AdminTerritoriesResult>("/api/admin/territories", {
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function resetTerritory(token: string, id: number) {
  return request<{ ok: boolean; message: string }>(`/api/admin/territories/${id}/reset`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function resetAllTerritories(token: string) {
  return request<{ ok: boolean; message: string }>("/api/admin/territories/reset-all", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function claimTerritory(token: string, id: number, playerId: string) {
  return request<{ ok: boolean; message: string }>(`/api/admin/territories/${id}/claim`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ playerId }),
  });
}

export async function getGameConfig() {
  return request<any>("/api/config");
}

export async function updateGameConfig(token: string, config: any) {
  return request<{ ok: boolean; config: any }>("/api/config", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(config),
  });
}
