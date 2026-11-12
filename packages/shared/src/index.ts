import { z } from "zod";

export const roleSchema = z.enum(["USER", "ORGANIZER", "ADMINISTRATOR"]);
export type Role = z.infer<typeof roleSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const registerRequestSchema = z.object({
  username: z.string().trim().min(2).max(40),
  email: z.string().trim().email(),
  password: z.string().min(8),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authUserResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  role: roleSchema,
  balance: z.number().int(),
});
export type AuthUserResponse = z.infer<typeof authUserResponseSchema>;
