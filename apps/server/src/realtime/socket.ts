import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { WebSocketServer, type WebSocket } from "ws";
import type { RealtimeEnvelope, RealtimeEvent } from "@island/shared";
import { config, isAllowedCorsOrigin } from "../config.js";
import type { AuthUser } from "../security/auth.js";
import { collections } from "../db/collections.js";

type Client = {
  id: string;
  user: AuthUser;
  socket: WebSocket;
  alive: boolean;
  rooms: Set<string>;
  queue: RealtimeEvent[];
  lastMessageAt: number;
  messageCount: number;
  worldChatCount: number;
  worldChatWindowAt: number;
  nextSeq: number;
};

let clients = new Set<Client>();
const ipConnectionCounts = new Map<string, number>();
const userConnectionCounts = new Map<string, number>();
const handshakeBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_WS_CONNECTIONS_PER_IP = 8;
const MAX_WS_CONNECTIONS_PER_USER = 3;
const MAX_WS_HANDSHAKES_PER_IP_PER_MINUTE = 20;
const MAX_WORLD_CHAT_MESSAGES_PER_WINDOW = 3;
const WORLD_CHAT_WINDOW_MS = 12_000;

function clientIp(req: { headers: Record<string, any>; socket: { remoteAddress?: string } }) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0]?.trim();
  return (config.TRUST_PROXY ? forwarded : undefined) || req.socket.remoteAddress || "unknown";
}

function isLoopback(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

function allowHandshake(ip: string) {
  if (isLoopback(ip)) return true;
  const now = Date.now();
  if (handshakeBuckets.size > 10_000) {
    handshakeBuckets.forEach((bucket, key) => {
      if (bucket.resetAt <= now) handshakeBuckets.delete(key);
    });
  }
  const bucket = handshakeBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    handshakeBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= MAX_WS_HANDSHAKES_PER_IP_PER_MINUTE) return false;
  bucket.count += 1;
  return true;
}

function incrementConnection(map: Map<string, number>, key: string, limit: number) {
  if (map === ipConnectionCounts && isLoopback(key)) return true;
  const next = (map.get(key) || 0) + 1;
  if (next > limit) return false;
  map.set(key, next);
  return true;
}

function decrementConnection(map: Map<string, number>, key: string) {
  if (map === ipConnectionCounts && isLoopback(key)) return;
  const next = Math.max(0, (map.get(key) || 0) - 1);
  if (next <= 0) map.delete(key);
  else map.set(key, next);
}

function send(client: Client, events: RealtimeEvent[]) {
  if (client.socket.readyState !== client.socket.OPEN) return;
  if (client.socket.bufferedAmount > 256_000) {
    client.socket.close(1013, "slow_client");
    return;
  }
  const envelope: RealtimeEnvelope = { seq: client.nextSeq++, events };
  client.socket.send(JSON.stringify(envelope));
}

function flushQueues() {
  clients.forEach((client) => {
    if (client.queue.length === 0) return;
    const batch = client.queue.splice(0, 40);
    send(client, batch);
  });
}

setInterval(flushQueues, 100).unref();

setInterval(() => {
  clients.forEach((client) => {
    if (!client.alive) {
      client.socket.terminate();
      clients.delete(client);
      return;
    }
    client.alive = false;
    client.socket.ping();
  });
}, 25_000).unref();

function authenticate(url: URL): AuthUser | null {
  const token = url.searchParams.get("token");
  if (!token) return null;
  try {
    return jwt.verify(token, config.JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export function attachRealtime(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 4096,
    perMessageDeflate: false,
  });

  wss.on("connection", (socket, req) => {
    const origin = req.headers.origin;
    if (origin && !isAllowedCorsOrigin(origin)) {
      socket.close(1008, "bad_origin");
      return;
    }
    const ip = clientIp(req as any);
    if (!allowHandshake(ip)) {
      socket.close(1013, "handshake_rate_limited");
      return;
    }
    const url = new URL(req.url ?? "/ws", `http://${req.headers.host ?? "127.0.0.1"}`);
    const user = authenticate(url);
    if (!user) {
      socket.close(1008, "unauthorized");
      return;
    }
    if (!incrementConnection(ipConnectionCounts, ip, MAX_WS_CONNECTIONS_PER_IP)) {
      socket.close(1013, "too_many_connections");
      return;
    }
    if (!incrementConnection(userConnectionCounts, user.id, MAX_WS_CONNECTIONS_PER_USER)) {
      decrementConnection(ipConnectionCounts, ip);
      socket.close(1013, "too_many_user_connections");
      return;
    }

    const client: Client = {
      id: `${user.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      user,
      socket,
      alive: true,
      rooms: new Set(["world", `player:${user.id}`]),
      queue: [],
      lastMessageAt: Date.now(),
      messageCount: 0,
      worldChatCount: 0,
      worldChatWindowAt: Date.now(),
      nextSeq: 1,
    };
    clients.add(client);

    send(client, [{ type: "hello", playerId: user.id, serverTime: new Date().toISOString() }]);

    socket.on("pong", () => {
      client.alive = true;
    });

    socket.on("message", async (raw) => {
      const now = Date.now();
      if (now - client.lastMessageAt > 1000) {
        client.lastMessageAt = now;
        client.messageCount = 0;
      }
      client.messageCount += 1;
      if (client.messageCount > 8) {
        socket.close(1008, "rate_limited");
        return;
      }

      try {
        const message = JSON.parse(String(raw));
        if (message?.type === "ping") {
          send(client, [{ type: "world_state_hint", reason: "reconnect" }]);
          return;
        }
        if (message?.type === "world_chat") {
          const text = typeof message.text === "string" ? message.text.trim().replace(/\s+/g, " ") : "";
          if (!text || text.length > 140 || client.user.role !== "player") return;
          if (now - client.worldChatWindowAt >= WORLD_CHAT_WINDOW_MS) {
            client.worldChatWindowAt = now;
            client.worldChatCount = 0;
          }
          if (client.worldChatCount >= MAX_WORLD_CHAT_MESSAGES_PER_WINDOW) return;
          client.worldChatCount += 1;
          const { players } = await collections();
          const player = await players.findOne({ _id: client.user.id }, { projection: { name: 1 } });
          publishRealtime({
            type: "world_chat",
            playerId: client.user.id,
            playerName: player?.name || "Người chơi",
            message: text,
            sentAt: new Date().toISOString(),
          });
        }
      } catch {
        socket.close(1003, "bad_message");
      }
    });

    socket.on("close", () => {
      clients.delete(client);
      decrementConnection(ipConnectionCounts, ip);
      decrementConnection(userConnectionCounts, user.id);
    });
  });

  return wss;
}

export function publishRealtime(event: RealtimeEvent, room = "world") {
  clients.forEach((client) => {
    if (!client.rooms.has(room)) return;
    if (client.queue.length >= 120) {
      // Dropping individual events leaves client state subtly incorrect. Force a
      // canonical HTTP snapshot instead of continuing with a partial event stream.
      client.queue.splice(0, client.queue.length);
      client.queue.push({ type: "resync_required", reason: "event_backlog" });
      return;
    }
    client.queue.push(event);
  });
}

export function realtimeStats() {
  return { clients: clients.size, ipBuckets: ipConnectionCounts.size, userBuckets: userConnectionCounts.size };
}

export function connectedPlayerIds() {
  return [...new Set([...clients].map((client) => client.user.id))];
}
