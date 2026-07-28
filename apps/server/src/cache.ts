import net from "node:net";
import { config } from "./config.js";

type CacheEntry = { value: string; expiresAt: number };

const memoryCache = new Map<string, CacheEntry>();
let memoryWorldVersion = 1;
let redisDisabled = false;

function encodeCommand(parts: Array<string | number>) {
  return `*${parts.length}\r\n${parts.map((part) => {
    const value = String(part);
    return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
  }).join("")}`;
}

function parseRedisReplies(buffer: Buffer): Array<string | number | null> {
  const replies: Array<string | number | null> = [];
  let offset = 0;
  const lineEnd = () => buffer.indexOf("\r\n", offset, "utf8");
  while (offset < buffer.length) {
    const type = String.fromCharCode(buffer[offset]);
    const end = lineEnd();
    if (end < 0) break;
    const line = buffer.toString("utf8", offset + 1, end);
    offset = end + 2;
    if (type === "$") {
      const length = Number(line);
      if (length < 0) {
        replies.push(null);
        continue;
      }
      replies.push(buffer.toString("utf8", offset, offset + length));
      offset += length + 2;
      continue;
    }
    if (type === ":") {
      replies.push(Number(line));
      continue;
    }
    if (type === "+") {
      replies.push(line);
      continue;
    }
    if (type === "-") throw new Error(line);
    break;
  }
  return replies;
}

function parseRedisReply(buffer: Buffer): string | number | null {
  const replies = parseRedisReplies(buffer);
  return replies.length > 0 ? replies[replies.length - 1] : null;
}

async function redisCommand(parts: Array<string | number>): Promise<string | number | null> {
  if (!config.REDIS_URL || redisDisabled) return null;
  const url = new URL(config.REDIS_URL);
  const port = Number(url.port || 6379);
  const host = url.hostname || "127.0.0.1";
  const password = url.password ? decodeURIComponent(url.password) : "";
  const username = url.username ? decodeURIComponent(url.username) : "";
  const db = url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : 0;
  const commands: Array<Array<string | number>> = [];
  if (password) commands.push(username ? ["AUTH", username, password] : ["AUTH", password]);
  if (db > 0) commands.push(["SELECT", db]);
  commands.push(parts);

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const chunks: Buffer[] = [];
    let settled = false;
    let idleTimer: NodeJS.Timeout | null = null;
    const finish = (value: string | number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (idleTimer) clearTimeout(idleTimer);
      socket.destroy();
      resolve(value);
    };
    const timer = setTimeout(() => {
      redisDisabled = true;
      finish(null);
    }, 450);

    socket.on("connect", () => {
      socket.write(commands.map(encodeCommand).join(""));
    });
    socket.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        try {
          finish(parseRedisReply(Buffer.concat(chunks)));
        } catch {
          finish(null);
        }
      }, 12);
    });
    socket.on("error", () => {
      redisDisabled = true;
      finish(null);
    });
    socket.on("end", () => {
      try {
        finish(parseRedisReply(Buffer.concat(chunks)));
      } catch {
        finish(null);
      }
    });
    socket.on("close", () => {
      if (chunks.length === 0) finish(null);
    });
  });
}

export async function getWorldCacheVersion() {
  const redisValue = await redisCommand(["GET", "island:world:version"]);
  const parsed = typeof redisValue === "string" ? Number(redisValue) : Number(redisValue);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return memoryWorldVersion;
}

export async function bumpWorldCacheVersion() {
  memoryWorldVersion += 1;
  const redisValue = await redisCommand(["INCR", "island:world:version"]);
  const parsed = Number(redisValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : memoryWorldVersion;
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const redisValue = await redisCommand(["GET", key]);
  if (typeof redisValue === "string") {
    try {
      return JSON.parse(redisValue) as T;
    } catch {
      return null;
    }
  }
  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  try {
    return JSON.parse(entry.value) as T;
  } catch {
    memoryCache.delete(key);
    return null;
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSeconds: number) {
  const payload = JSON.stringify(value);
  memoryCache.set(key, { value: payload, expiresAt: Date.now() + ttlSeconds * 1000 });
  await redisCommand(["SETEX", key, ttlSeconds, payload]);
}
