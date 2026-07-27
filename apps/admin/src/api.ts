import type { AdminOverview } from "@island/shared";

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
