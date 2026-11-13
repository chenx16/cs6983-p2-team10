import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  PUBLIC_QUESTION_DETAIL_RATE_LIMIT: z.coerce.number().int().positive().default(600),
  PREDICTION_PREAUTH_RATE_LIMIT: z.coerce.number().int().positive().default(600),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
});

export const env = envSchema.parse({
  API_PORT: process.env.API_PORT,
  PUBLIC_QUESTION_DETAIL_RATE_LIMIT: process.env.PUBLIC_QUESTION_DETAIL_RATE_LIMIT,
  PREDICTION_PREAUTH_RATE_LIMIT: process.env.PREDICTION_PREAUTH_RATE_LIMIT,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
  JWT_SECRET: process.env.JWT_SECRET,
});
