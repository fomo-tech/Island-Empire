import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  MONGO_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/island_empire"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://127.0.0.1:5173,http://127.0.0.1:5174"),
  JWT_SECRET: z.string().min(24).default("dev-only-change-this-long-random-secret"),
  ADMIN_USER: z.string().min(3).default("admin"),
  ADMIN_PASSWORD: z.string().min(8).default("change-me"),
});

export const config = EnvSchema.parse(process.env);

export const corsOrigins = config.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
