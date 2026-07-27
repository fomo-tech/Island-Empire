import type { ServerStatus, SaveSnapshot } from "@island/shared";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";

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

export function loginPlayer(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/player/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function registerPlayer(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/player/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
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
