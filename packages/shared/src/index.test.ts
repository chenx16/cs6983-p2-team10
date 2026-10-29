import { describe, expect, it } from "vitest";
import {
  arenaQuestionSchema,
  arenaQuestionsQuerySchema,
  arenaQuestionsResponseSchema,
  healthResponseSchema,
  roleSchema,
} from "./index";

describe("shared contracts", () => {
  it("accepts the API health response", () => {
    expect(
      healthResponseSchema.parse({
        status: "ok",
        service: "api",
        timestamp: new Date().toISOString(),
      }).status,
    ).toBe("ok");
  });

  it("limits roles to the PRD roles", () => {
    expect(roleSchema.safeParse("ADMINISTRATOR").success).toBe(true);
    expect(roleSchema.safeParse("MODERATOR").success).toBe(false);
  });

  it("defaults Arena query status to OPEN and parses multi-category and multi-status values", () => {
    const defaultParsed = arenaQuestionsQuerySchema.parse({});
    expect(defaultParsed.status).toEqual(["OPEN"]);
    expect(defaultParsed.category).toEqual([]);
    expect(defaultParsed.type).toBeUndefined();

    const filteredParsed = arenaQuestionsQuerySchema.parse({
      category: ["Sports,Economics", "Campus Events"],
      status: "Open,Closing soon,RESOLVED",
      type: "ab",
    });
    expect(filteredParsed.category).toEqual(["Sports", "Economics", "Campus Events"]);
    expect(filteredParsed.status).toEqual(["OPEN", "CLOSING_SOON", "RESOLVED"]);
    expect(filteredParsed.type).toBe("AB");
  });

  it("rejects unknown status or question type in Arena query", () => {
    expect(arenaQuestionsQuerySchema.safeParse({ status: "ARCHIVED" }).success).toBe(false);
    expect(arenaQuestionsQuerySchema.safeParse({ type: "ORDER_BOOK" }).success).toBe(false);
  });

  it("enforces A/B price bounds (1..99) and sum-to-100 rule on Arena questions", () => {
    const validAb = {
      id: "q-1",
      title: "Dodgers or Yankees: who will win Game 1?",
      category: "Sports",
      type: "AB" as const,
      status: "OPEN" as const,
      isHot: true,
      deadline: "2026-10-31T01:00:00.000Z",
      deadlinePt: "Oct 30, 6:00 PM PT",
      closingLabelPt: "Closes Oct 30, 6:00 PM PT",
      totalCredits: 5480,
      criteria: "Resolves to the team that wins Game 1.",
      source: "MLB.com official box score",
      correctAnswerId: null,
      answers: [
        { id: "a", label: "Dodgers", price: 67 },
        { id: "b", label: "Yankees", price: 33 },
      ],
    };

    expect(arenaQuestionSchema.safeParse(validAb).success).toBe(true);

    const invalidSum = {
      ...validAb,
      answers: [
        { id: "a", label: "Dodgers", price: 67 },
        { id: "b", label: "Yankees", price: 32 },
      ],
    };
    expect(arenaQuestionSchema.safeParse(invalidSum).success).toBe(false);

    const invalidBounds = {
      ...validAb,
      answers: [
        { id: "a", label: "Dodgers", price: 100 },
        { id: "b", label: "Yankees", price: 0 },
      ],
    };
    expect(arenaQuestionSchema.safeParse(invalidBounds).success).toBe(false);
  });

  it("validates a complete ArenaQuestionsResponse payload", () => {
    const payload = {
      questions: [
        {
          id: "q-multi",
          title: "Which country will win the next World Cup?",
          category: "Sports",
          type: "MULTI" as const,
          status: "OPEN" as const,
          isHot: false,
          deadline: "2027-05-01T19:00:00.000Z",
          deadlinePt: "May 1, 2027, 12:00 PM PT",
          closingLabelPt: "Closes May 1, 2027, 12:00 PM PT",
          totalCredits: 1000,
          criteria: "Resolves to the country that wins the final.",
          source: "FIFA.com",
          correctAnswerId: null,
          topAnswers: [
            { id: "br", label: "Brazil", credits: 420, sharePercent: 42 },
            { id: "fr", label: "France", credits: 250, sharePercent: 25 },
            { id: "ar", label: "Argentina", credits: 160, sharePercent: 16 },
          ],
          answers: [
            { id: "br", label: "Brazil", credits: 420, sharePercent: 42 },
            { id: "fr", label: "France", credits: 250, sharePercent: 25 },
            { id: "ar", label: "Argentina", credits: 160, sharePercent: 16 },
            { id: "en", label: "England", credits: 170, sharePercent: 17 },
          ],
          totalAnswerCount: 4,
        },
      ],
      categories: ["Sports", "Economics"],
      statusCounts: {
        OPEN: 1,
        CLOSING_SOON: 0,
        CLOSED: 0,
        RESOLVED: 0,
        CANCELLED: 0,
      },
    };

    expect(arenaQuestionsResponseSchema.safeParse(payload).success).toBe(true);
  });
});
