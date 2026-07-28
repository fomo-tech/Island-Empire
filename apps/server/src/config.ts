import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  MONGO_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/island_empire"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://localhost:5173,http://localhost:5174,http://localhost:5175"),
  JWT_SECRET: z.string().min(24).default("dev-only-change-this-long-random-secret"),
  ADMIN_USER: z.string().min(3).default("admin"),
  ADMIN_PASSWORD: z.string().min(8).default("change-me"),
  REDIS_URL: z.string().optional().default(""),
});

export const config = EnvSchema.parse(process.env);

export const corsOrigins = config.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export function isAllowedCorsOrigin(origin: string) {
  if (corsOrigins.includes(origin)) return true;
  // Allow any localhost / 127.0.0.1 port in the Vite dev range (5173-5199)
  return /^http:\/\/(127\.0\.0\.1|localhost):(51[7-9]\d)$/.test(origin);
}
