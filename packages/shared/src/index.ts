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
  password: z.string().min(8).regex(/[A-Z]/, "Password must include an uppercase letter.").regex(/[a-z]/, "Password must include a lowercase letter.").regex(/[0-9]/, "Password must include a number."),
}).superRefine((input, context) => {
  if (input.password === input.username || input.password === input.email) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Password must differ from username and email." });
  }
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  identifier: z.string().trim().min(2),
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

export const predictionPreviewRequestSchema = z.object({
  answerId: z.string().trim().min(1),
  budget: z.number().int().min(10),
});
export type PredictionPreviewRequest = z.infer<typeof predictionPreviewRequestSchema>;

export const placePredictionRequestSchema = z.object({
  answerId: z.string().trim().min(1),
  budget: z.number().int().min(10),
  minShares: z.number().int().nonnegative(),
  idempotencyKey: z.string().trim().min(1).max(255),
});
export type PlacePredictionRequest = z.infer<typeof placePredictionRequestSchema>;

export const predictionPreviewResponseSchema = z.object({
  questionId: z.string().min(1),
  answerId: z.string().min(1),
  shares: z.number().int().nonnegative(),
  charge: z.number().int().min(10),
  averagePrice: z.number().nonnegative(),
  prices: z.object({
    a: z.number().int().min(1).max(99),
    b: z.number().int().min(1).max(99),
  }),
  payoutIfCorrect: z.number().int().nonnegative(),
  balance: z.number().int(),
  marketVersion: z.number().int().nonnegative(),
});
export type PredictionPreviewResponse = z.infer<typeof predictionPreviewResponseSchema>;

export {
  calculateCost,
  calculatePrices,
  calculatePurchaseForBudget,
  createMarket,
} from "./lmsr";
export type {
  LmsrAnswer,
  LmsrMarket,
  LmsrPrices,
  LmsrPurchase,
} from "./lmsr";
