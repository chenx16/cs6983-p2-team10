import { describe, expect, it } from "vitest";
import {
  buildArenaQueryString,
  fetchArenaQuestions,
  formatBreadcrumbLabel,
  getQuestionCrowdSummary,
  isQuestionOpenForPredictions,
  toggleCategorySelection,
  toggleStatusSelection,
  type ArenaQuestion,
} from "./arena-helpers";

describe("Arena UI helpers", () => {
  it("toggles statuses while preserving at least OPEN when the last status is deselected", () => {
    expect(toggleStatusSelection(["OPEN"], "CLOSING_SOON")).toEqual([
      "OPEN",
      "CLOSING_SOON",
    ]);
    expect(toggleStatusSelection(["OPEN", "CLOSING_SOON"], "OPEN")).toEqual([
      "CLOSING_SOON",
    ]);
    expect(toggleStatusSelection(["OPEN"], "OPEN")).toEqual(["OPEN"]);
  });

  it("toggles multiple categories cleanly", () => {
    const step1 = toggleCategorySelection([], "Sports");
    expect(step1).toEqual(["Sports"]);
    const step2 = toggleCategorySelection(step1, "Economics");
    expect(step2).toEqual(["Sports", "Economics"]);
    const step3 = toggleCategorySelection(step2, "Sports");
    expect(step3).toEqual(["Economics"]);
  });

  it("builds versioned query strings and breadcrumb labels", () => {
    expect(
      buildArenaQueryString({
        categories: ["Sports", "Campus Events"],
        statuses: ["OPEN", "RESOLVED"],
      }),
    ).toBe("category=Sports%2CCampus+Events&status=OPEN%2CRESOLVED");

    expect(formatBreadcrumbLabel(["OPEN", "CLOSING_SOON"])).toBe("Open, Closing soon");
  });

  it("formats crowd summary lines for A/B and multi-answer questions", () => {
    const abQuestion: ArenaQuestion = {
      id: "q-ab",
      title: "Dodgers or Yankees: who will win Game 1?",
      category: "Sports",
      type: "AB",
      status: "OPEN",
      isHot: true,
      deadline: "2026-10-31T01:00:00.000Z",
      deadlinePt: "Oct 30, 6:00 PM PT",
      closingLabelPt: "Closes Oct 30, 6:00 PM PT",
      totalCredits: 5480,
      criteria: "Official MLB box score",
      source: "MLB.com",
      correctAnswerId: null,
      answers: [
        { id: "a", label: "Dodgers", price: 67 },
        { id: "b", label: "Yankees", price: 33 },
      ],
    };

    expect(getQuestionCrowdSummary(abQuestion)).toBe(
      "The crowd thinks Dodgers is about 67% likely.",
    );
    expect(isQuestionOpenForPredictions(abQuestion)).toBe(true);

    const multiQuestion: ArenaQuestion = {
      id: "q-multi",
      title: "Which country will win the next World Cup?",
      category: "Sports",
      type: "MULTI",
      status: "CLOSED",
      isHot: false,
      deadline: "2026-10-20T01:00:00.000Z",
      deadlinePt: "Oct 19, 6:00 PM PT",
      closingLabelPt: "Closed Oct 19, 6:00 PM PT",
      totalCredits: 1000,
      criteria: "FIFA final",
      source: "FIFA.com",
      correctAnswerId: null,
      topAnswers: [
        { id: "br", label: "Brazil", credits: 420, sharePercent: 42 },
        { id: "fr", label: "France", credits: 250, sharePercent: 25 },
        { id: "ar", label: "Argentina", credits: 180, sharePercent: 18 },
      ],
      answers: [
        { id: "br", label: "Brazil", credits: 420, sharePercent: 42 },
        { id: "fr", label: "France", credits: 250, sharePercent: 25 },
        { id: "ar", label: "Argentina", credits: 180, sharePercent: 18 },
        { id: "en", label: "England", credits: 70, sharePercent: 7 },
        { id: "es", label: "Spain", credits: 80, sharePercent: 8 },
      ],
      totalAnswerCount: 5,
    };

    expect(getQuestionCrowdSummary(multiQuestion)).toBe("+2 more answers");
    expect(isQuestionOpenForPredictions(multiQuestion)).toBe(false);
  });

  it("fetches and validates Arena questions from the public API endpoint", async () => {
    let requestedUrl = "";
    const mockFetch: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          questions: [],
          categories: ["Sports", "Economics"],
          statusCounts: {
            OPEN: 0,
            CLOSING_SOON: 0,
            CLOSED: 0,
            RESOLVED: 0,
            CANCELLED: 0,
          },
        }),
      } as Response;
    };

    const data = await fetchArenaQuestions({
      apiBaseUrl: "http://localhost:4000",
      categories: ["Sports"],
      statuses: ["OPEN"],
      fetchImpl: mockFetch,
    });

    expect(requestedUrl).toBe(
      "http://localhost:4000/api/v1/public/questions?category=Sports&status=OPEN",
    );
    expect(data.categories).toEqual(["Sports", "Economics"]);
  });
});
