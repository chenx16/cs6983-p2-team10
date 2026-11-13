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

export const usernameSchema = z.string().trim()
  .min(2, "Username must be at least 2 characters.")
  .max(40, "Username must be at most 40 characters.")
  .regex(/^[A-Za-z0-9]+$/, "Username must contain only English letters and numbers.");

export const registerRequestSchema = z.object({
  username: usernameSchema,
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

export const roleChangeRequestSchema = z.object({
  role: roleSchema,
  reason: z.string().trim().min(1).max(500),
});
export type RoleChangeRequest = z.infer<typeof roleChangeRequestSchema>;

export const questionCancellationRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type QuestionCancellationRequest = z.infer<typeof questionCancellationRequestSchema>;

export const abQuestionRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  categoryId: z.string().trim().min(1),
  answerA: z.string().trim().min(1).max(40),
  answerB: z.string().trim().min(1).max(40),
  startingPriceA: z.number().int().min(10).max(90).default(50),
  deadline: z.string().datetime(),
  eventTime: z.string().datetime(),
  outcomeCriteria: z.string().trim().min(1).max(2000),
  source: z.string().trim().min(1).max(500),
}).superRefine((input, context) => {
  if (input.answerA.toLocaleLowerCase() === input.answerB.toLocaleLowerCase()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["answerB"], message: "Answers must be unique." });
  }
  if (new Date(input.deadline) > new Date(input.eventTime)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["deadline"], message: "Deadline must be at or before event time." });
  }
});
export type AbQuestionRequest = z.infer<typeof abQuestionRequestSchema>;

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

export const questionDetailResponseSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  category: z.string(),
  status: z.string(),
  deadline: z.string().datetime(),
  eventTime: z.string().datetime(),
  outcomeCriteria: z.string(),
  source: z.string(),
  totalCreditsSpent: z.number().int().nonnegative(),
  answers: z.array(z.object({
    id: z.string().min(1),
    text: z.string(),
    price: z.number().int().min(1).max(99),
    creditsSpent: z.number().int().nonnegative(),
  })).length(2),
});
export type QuestionDetailResponse = z.infer<typeof questionDetailResponseSchema>;

export const arenaQuestionResponseSchema = questionDetailResponseSchema.extend({
  status: z.literal("OPEN"),
});
export const arenaQuestionsResponseSchema = z.object({
  questions: z.array(arenaQuestionResponseSchema),
});
export type ArenaQuestionResponse = z.infer<typeof arenaQuestionResponseSchema>;
export type ArenaQuestionsResponse = z.infer<typeof arenaQuestionsResponseSchema>;

export const myQuestionPredictionsResponseSchema = z.object({
  predictions: z.array(z.object({
    answerId: z.string().min(1),
    answerText: z.string(),
    creditsCharged: z.number().int().nonnegative(),
    shares: z.number().int().nonnegative(),
    payoutIfCorrect: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
  })),
});
export type MyQuestionPredictionsResponse = z.infer<typeof myQuestionPredictionsResponseSchema>;

export {
  calculateCost,
  calculatePrices,
  calculatePurchaseForBudget,
  createMarket,
} from "./lmsr.js";
export type {
  LmsrAnswer,
  LmsrMarket,
  LmsrPrices,
  LmsrPurchase,
} from "./lmsr.js";
