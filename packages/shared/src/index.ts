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

export const DEFAULT_CATEGORIES = [
  "Sports",
  "Economics",
  "Financials",
  "Crypto",
  "Weather & Climate",
  "Politics",
  "Culture & Entertainment",
  "Tech & Science",
  "Companies",
  "Campus Events",
] as const;

export const questionTypeSchema = z.enum(["AB", "MULTI"]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const QUESTION_STATUSES = [
  "OPEN",
  "CLOSING_SOON",
  "CLOSED",
  "RESOLVED",
  "CANCELLED",
] as const;

export const questionStatusSchema = z.enum(QUESTION_STATUSES);
export type QuestionStatus = z.infer<typeof questionStatusSchema>;

export const questionLifecycleSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "RESOLVED",
  "CANCELLED",
  "HIDDEN",
]);
export type QuestionLifecycle = z.infer<typeof questionLifecycleSchema>;

export const questionAnswerSummarySchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(40),
  price: z.number().int().min(1).max(99).optional(),
  credits: z.number().int().nonnegative().optional(),
  sharePct: z.number().int().min(0).max(100).optional(),
  isCorrect: z.boolean().optional(),
});
export type QuestionAnswerSummary = z.infer<typeof questionAnswerSummarySchema>;

export const arenaQuestionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: z.string().min(1),
  type: questionTypeSchema,
  status: questionStatusSchema,
  deadline: z.string(),
  totalCredits: z.number().int().nonnegative(),
  isHot: z.boolean(),
  answers: z.array(questionAnswerSummarySchema).min(2).max(10),
  totalAnswerCount: z.number().int().min(2).max(10),
  correctAnswerId: z.string().nullable().optional(),
  correctAnswerLabel: z.string().nullable().optional(),
  criteria: z.string(),
  source: z.string(),
});
export type ArenaQuestion = z.infer<typeof arenaQuestionSchema>;

export const statusCountsSchema = z.object({
  OPEN: z.number().int().nonnegative(),
  CLOSING_SOON: z.number().int().nonnegative(),
  CLOSED: z.number().int().nonnegative(),
  RESOLVED: z.number().int().nonnegative(),
  CANCELLED: z.number().int().nonnegative(),
});
export type StatusCounts = z.infer<typeof statusCountsSchema>;

export const arenaQuestionsResponseSchema = z.object({
  questions: z.array(arenaQuestionSchema),
  categories: z.array(z.string()),
  countsByStatus: statusCountsSchema,
});
export type ArenaQuestionsResponse = z.infer<typeof arenaQuestionsResponseSchema>;

const STATUS_LOOKUP: Record<string, QuestionStatus> = {
  OPEN: "OPEN",
  CLOSING_SOON: "CLOSING_SOON",
  "CLOSING SOON": "CLOSING_SOON",
  "CLOSING-SOON": "CLOSING_SOON",
  CLOSED: "CLOSED",
  RESOLVED: "RESOLVED",
  CANCELLED: "CANCELLED",
};

const TYPE_LOOKUP: Record<string, QuestionType> = {
  AB: "AB",
  "A/B": "AB",
  MULTI: "MULTI",
};

function splitQueryValues(input: unknown): string[] {
  if (input === undefined || input === null || input === "") {
    return [];
  }
  const rawList = Array.isArray(input) ? input : [input];
  const values: string[] = [];
  for (const item of rawList) {
    if (typeof item !== "string") {
      throw new Error("Query parameter must be a string.");
    }
    for (const part of item.split(",")) {
      const trimmed = part.trim();
      if (trimmed.length > 0) {
        values.push(trimmed);
      }
    }
  }
  return values;
}

export const arenaQuestionsQuerySchema = z
  .object({
    category: z.union([z.string(), z.array(z.string())]).optional(),
    status: z.union([z.string(), z.array(z.string())]).optional(),
    type: z.string().optional(),
  })
  .transform((raw, ctx) => {
    const categories = splitQueryValues(raw.category);
    const rawStatuses = splitQueryValues(raw.status);
    const statuses: QuestionStatus[] = [];
    let includeAllStatuses = false;

    for (const value of rawStatuses) {
      const upper = value.toUpperCase();
      if (upper === "ALL") {
        includeAllStatuses = true;
        continue;
      }
      const mapped = STATUS_LOOKUP[upper];
      if (!mapped) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["status"],
          message: `Invalid status filter "${value}". Allowed values: Open, Closing soon, Closed, Resolved, Cancelled.`,
        });
      } else if (!statuses.includes(mapped)) {
        statuses.push(mapped);
      }
    }

    let type: QuestionType | undefined;
    if (raw.type !== undefined && raw.type.trim() !== "") {
      const mappedType = TYPE_LOOKUP[raw.type.trim().toUpperCase()];
      if (!mappedType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["type"],
          message: `Invalid question type "${raw.type}". Allowed values: AB, MULTI.`,
        });
      } else {
        type = mappedType;
      }
    }

    return {
      categories,
      statuses: includeAllStatuses
        ? ([...QUESTION_STATUSES] as QuestionStatus[])
        : statuses,
      type,
    };
  });

export type ArenaQuestionsQuery = z.infer<typeof arenaQuestionsQuerySchema>;

export function clampDisplayedPriceA(probabilityA: number): number {
  return Math.min(99, Math.max(1, Math.round(probabilityA * 100)));
}
