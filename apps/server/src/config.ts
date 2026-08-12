import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGO_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/island_empire"),
  PORT: z.coerce.number().int().positive().default(4001),
  HOST: z.string().trim().optional(),
  CORS_ORIGIN: z.string().default("http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://localhost:5173,http://localhost:5174,http://localhost:5175"),
  JWT_SECRET: z.string().min(24).default("dev-only-change-this-long-random-secret"),
  ADMIN_USER: z.string().min(3).default("admin"),
  ADMIN_PASSWORD: z.string().min(8).default("change-me"),
  REDIS_URL: z.string().optional().default(""),
  TRUST_PROXY: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  ANTI_BOT_SECRET: z.string().min(24).default("dev-only-change-this-long-random-secret"),
  TURNSTILE_SECRET_KEY: z.string().trim().default(""),
  TURNSTILE_EXPECTED_HOSTNAME: z.string().trim().default(""),
  SHOP_TEST_MODE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
});

const parsedConfig = EnvSchema.parse(process.env);

export const config = {
  ...parsedConfig,
  // Production traffic must enter through Nginx, not directly through Node.
  HOST:
    parsedConfig.HOST ||
    (parsedConfig.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0"),
};

export const corsOrigins = config.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export function isAllowedCorsOrigin(origin: string) {
  if (!origin) return true;
  if (corsOrigins.includes(origin)) return true;
  // Allow any localhost, 127.0.0.1, or local LAN IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on dev ports
  return /^http:\/\/(127\.0\.0\.1|localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
}
