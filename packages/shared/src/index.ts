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

export const questionStatusSchema = z.enum([
  "OPEN",
  "CLOSING_SOON",
  "CLOSED",
  "RESOLVED",
  "CANCELLED",
]);
export type QuestionStatus = z.infer<typeof questionStatusSchema>;

export const QUESTION_STATUS_VALUES: readonly QuestionStatus[] = questionStatusSchema.options;

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  OPEN: "Open",
  CLOSING_SOON: "Closing soon",
  CLOSED: "Closed",
  RESOLVED: "Resolved",
  CANCELLED: "Cancelled",
};

const QUESTION_STATUS_BY_LABEL: Record<string, QuestionStatus> = {
  open: "OPEN",
  "closing soon": "CLOSING_SOON",
  closing_soon: "CLOSING_SOON",
  closed: "CLOSED",
  resolved: "RESOLVED",
  cancelled: "CANCELLED",
};

export const questionVisibilitySchema = z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]);
export type QuestionVisibility = z.infer<typeof questionVisibilitySchema>;

const splitQueryParam = (value: unknown): string[] => {
  if (value === undefined || value === null || value === "") {
    return [];
  }
  const items = Array.isArray(value) ? value : [value];
  return items
    .flatMap((entry) => (typeof entry === "string" ? entry.split(",") : [String(entry)]))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const statusTokenSchema = z.string().transform((raw, ctx): QuestionStatus => {
  const normalized = raw.trim().toLowerCase();
  const mapped = QUESTION_STATUS_BY_LABEL[normalized];
  if (!mapped) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid status "${raw}". Expected one of: OPEN, CLOSING_SOON, CLOSED, RESOLVED, CANCELLED.`,
    });
    return z.NEVER;
  }
  return mapped;
});

export const arenaQuestionsQuerySchema = z.object({
  category: z
    .unknown()
    .optional()
    .transform((value) => splitQueryParam(value)),
  status: z
    .unknown()
    .optional()
    .transform((value, ctx): QuestionStatus[] => {
      const tokens = splitQueryParam(value);
      if (tokens.length === 0) {
        return ["OPEN"];
      }
      const parsed: QuestionStatus[] = [];
      for (const token of tokens) {
        const result = statusTokenSchema.safeParse(token);
        if (!result.success) {
          for (const issue of result.error.issues) {
            ctx.addIssue({
              code: "custom",
              message: issue.message,
            });
          }
          return z.NEVER;
        }
        if (!parsed.includes(result.data)) {
          parsed.push(result.data);
        }
      }
      return parsed;
    }),
  type: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(questionTypeSchema)
    .optional(),
});
export type ArenaQuestionsQuery = z.infer<typeof arenaQuestionsQuerySchema>;

export const abAnswerItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(40),
  price: z.number().int().min(1).max(99),
});
export type AbAnswerItem = z.infer<typeof abAnswerItemSchema>;

export const multiAnswerItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(40),
  credits: z.number().int().min(0),
  sharePercent: z.number().int().min(0).max(100),
});
export type MultiAnswerItem = z.infer<typeof multiAnswerItemSchema>;

const baseArenaQuestionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: z.string().min(1),
  status: questionStatusSchema,
  isHot: z.boolean(),
  deadline: z.string(),
  deadlinePt: z.string(),
  closingLabelPt: z.string(),
  totalCredits: z.number().int().min(0),
  criteria: z.string().min(1),
  source: z.string().min(1),
  correctAnswerId: z.string().nullable(),
});

export const abArenaQuestionSchema = baseArenaQuestionSchema.extend({
  type: z.literal("AB"),
  answers: z
    .tuple([abAnswerItemSchema, abAnswerItemSchema])
    .refine(([first, second]) => first.price + second.price === 100, {
      message: "Displayed A and B prices must add up to 100.",
    }),
});
export type AbArenaQuestion = z.infer<typeof abArenaQuestionSchema>;

export const multiArenaQuestionSchema = baseArenaQuestionSchema.extend({
  type: z.literal("MULTI"),
  topAnswers: z.array(multiAnswerItemSchema).min(1).max(3),
  answers: z.array(multiAnswerItemSchema).min(3).max(10),
  totalAnswerCount: z.number().int().min(3).max(10),
});
export type MultiArenaQuestion = z.infer<typeof multiArenaQuestionSchema>;

export const arenaQuestionSchema = z.discriminatedUnion("type", [
  abArenaQuestionSchema,
  multiArenaQuestionSchema,
]);
export type ArenaQuestion = z.infer<typeof arenaQuestionSchema>;

export const arenaStatusCountsSchema = z.object({
  OPEN: z.number().int().min(0),
  CLOSING_SOON: z.number().int().min(0),
  CLOSED: z.number().int().min(0),
  RESOLVED: z.number().int().min(0),
  CANCELLED: z.number().int().min(0),
});
export type ArenaStatusCounts = z.infer<typeof arenaStatusCountsSchema>;

export const arenaQuestionsResponseSchema = z.object({
  questions: z.array(arenaQuestionSchema),
  categories: z.array(z.string().min(1)),
  statusCounts: arenaStatusCountsSchema,
});
export type ArenaQuestionsResponse = z.infer<typeof arenaQuestionsResponseSchema>;
