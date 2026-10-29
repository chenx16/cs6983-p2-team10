import { describe, expect, it } from "vitest";
import {
  arenaQuestionsQuerySchema,
  arenaQuestionsResponseSchema,
  clampDisplayedPriceA,
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

  it("parses Arena question filter queries with multiple categories and statuses", () => {
    const parsed = arenaQuestionsQuerySchema.parse({
      category: ["Sports,Economics", "Campus Events"],
      status: ["Open", "Closing soon"],
      type: "A/B",
    });

    expect(parsed.categories).toEqual(["Sports", "Economics", "Campus Events"]);
    expect(parsed.statuses).toEqual(["OPEN", "CLOSING_SOON"]);
    expect(parsed.type).toBe("AB");
  });

  it("rejects invalid status and type filters", () => {
    expect(
      arenaQuestionsQuerySchema.safeParse({ status: "UNKNOWN_STATUS" }).success,
    ).toBe(false);
    expect(
      arenaQuestionsQuerySchema.safeParse({ type: "ORDER_BOOK" }).success,
    ).toBe(false);
  });

  it("clamps displayed A/B prices to 1..99 so A and B always sum to 100", () => {
    expect(clampDisplayedPriceA(0.001)).toBe(1);
    expect(clampDisplayedPriceA(0.999)).toBe(99);
    expect(clampDisplayedPriceA(0.674)).toBe(67);
    expect(100 - clampDisplayedPriceA(0.674)).toBe(33);
  });

  it("validates ArenaQuestionsResponse payloads", () => {
    const payload = {
      questions: [
        {
          id: "q1",
          title: "Dodgers or Yankees: who will win Game 1?",
          category: "Sports",
          type: "AB" as const,
          status: "OPEN" as const,
          deadline: new Date().toISOString(),
          totalCredits: 5480,
          isHot: true,
          answers: [
            { id: "q1-a", label: "Dodgers", price: 67 },
            { id: "q1-b", label: "Yankees", price: 33 },
          ],
          totalAnswerCount: 2,
          correctAnswerId: null,
          correctAnswerLabel: null,
          criteria: "Resolves to the team that wins Game 1.",
          source: "MLB.com official box score",
        },
      ],
      categories: ["Sports", "Economics"],
      countsByStatus: {
        OPEN: 1,
        CLOSING_SOON: 0,
        CLOSED: 0,
        RESOLVED: 0,
        CANCELLED: 0,
      },
    };

    expect(arenaQuestionsResponseSchema.parse(payload).questions).toHaveLength(1);
  });
});
