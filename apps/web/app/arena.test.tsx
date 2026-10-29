import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ArenaView,
  buildQuestionsQueryString,
  formatCardDeadline,
  toggleCategorySelection,
  toggleStatusSelection,
} from "./arena";
import type { ArenaQuestion, StatusCounts } from "@forecasthub/shared";

const sampleNow = new Date("2026-10-29T18:00:00.000Z");

const sampleCounts: StatusCounts = {
  OPEN: 16,
  CLOSING_SOON: 4,
  CLOSED: 2,
  RESOLVED: 2,
  CANCELLED: 1,
};

const sampleQuestions: ArenaQuestion[] = [
  {
    id: "q5",
    title: "Dodgers or Yankees: who will win Game 1?",
    category: "Sports",
    type: "AB",
    status: "OPEN",
    deadline: "2026-10-31T00:00:00.000Z",
    totalCredits: 5480,
    isHot: true,
    answers: [
      { id: "q5-a", label: "Dodgers", price: 67 },
      { id: "q5-b", label: "Yankees", price: 33 },
    ],
    totalAnswerCount: 2,
    correctAnswerId: null,
    correctAnswerLabel: null,
    criteria: "Resolves to the team that wins Game 1.",
    source: "MLB.com official box score",
  },
  {
    id: "q16",
    title: "Which country will win the next World Cup?",
    category: "Sports",
    type: "MULTI",
    status: "OPEN",
    deadline: "2027-05-17T18:00:00.000Z",
    totalCredits: 1000,
    isHot: false,
    answers: [
      { id: "q16-1", label: "Brazil", credits: 420, sharePct: 42 },
      { id: "q16-2", label: "France", credits: 250, sharePct: 25 },
      { id: "q16-3", label: "Argentina", credits: 160, sharePct: 16 },
    ],
    totalAnswerCount: 6,
    correctAnswerId: null,
    correctAnswerLabel: null,
    criteria: "Resolves to the country that wins the FIFA World Cup final.",
    source: "FIFA.com",
  },
];

describe("Arena filter and formatting helpers", () => {
  it("toggles multi-select status and category filters", () => {
    expect(toggleStatusSelection(["OPEN"], "CLOSING_SOON")).toEqual([
      "OPEN",
      "CLOSING_SOON",
    ]);
    expect(toggleStatusSelection(["OPEN", "CLOSING_SOON"], "OPEN")).toEqual([
      "CLOSING_SOON",
    ]);

    expect(toggleCategorySelection([], "Sports")).toEqual(["Sports"]);
    expect(toggleCategorySelection(["Sports"], "Economics")).toEqual([
      "Sports",
      "Economics",
    ]);
    expect(toggleCategorySelection(["Sports", "Economics"], "Sports")).toEqual([
      "Economics",
    ]);
  });

  it("builds query strings for selected categories and statuses", () => {
    expect(
      buildQuestionsQueryString({
        categories: ["Sports", "Economics"],
        statuses: ["OPEN", "CLOSING_SOON"],
      }),
    ).toBe("category=Sports&category=Economics&status=OPEN&status=CLOSING_SOON");

    expect(
      buildQuestionsQueryString({
        categories: [],
        statuses: [],
      }),
    ).toBe("status=ALL");
  });

  it("formats deadlines in Pacific Time and flags questions closing within 24 hours", () => {
    const soon = formatCardDeadline("2026-10-29T21:00:00.000Z", sampleNow);
    expect(soon.isSoon).toBe(true);
    expect(soon.text).toContain("Closes in 3 h");
    expect(soon.text).toContain("PT");

    const later = formatCardDeadline("2026-11-05T18:00:00.000Z", sampleNow);
    expect(later.isSoon).toBe(false);
    expect(later.text).toContain("Closes Nov 5");
    expect(later.text).toContain("PT");
  });
});

describe("ArenaView rendering", () => {
  it("renders status filter pills, category tabs, A/B prices, and top-3 Multi pool shares", () => {
    const html = renderToStaticMarkup(
      <ArenaView
        countsByStatus={sampleCounts}
        errorMessage={null}
        isLoading={false}
        now={sampleNow}
        onClearCategories={vi.fn()}
        onOpenQuestion={vi.fn()}
        onResetFilters={vi.fn()}
        onRetry={vi.fn()}
        onToggleCategory={vi.fn()}
        onToggleStatus={vi.fn()}
        questions={sampleQuestions}
        selectedCategories={["Sports"]}
        selectedStatuses={["OPEN"]}
      />,
    );

    expect(html).toContain("Dodgers or Yankees: who will win Game 1?");
    expect(html).toContain("Dodgers");
    expect(html).toContain("67");
    expect(html).toContain("Yankees");
    expect(html).toContain("33");
    expect(html).toContain("The crowd thinks Dodgers is about 67% likely.");
    expect(html).toContain("5,480");

    expect(html).toContain("Which country will win the next World Cup?");
    expect(html).toContain("Brazil");
    expect(html).toContain("42%");
    expect(html).toContain("France");
    expect(html).toContain("25%");
    expect(html).toContain("Argentina");
    expect(html).toContain("16%");
    expect(html).toContain("+3 more answers");
  });

  it("renders the empty state with Reset filters when no questions match", () => {
    const html = renderToStaticMarkup(
      <ArenaView
        countsByStatus={sampleCounts}
        errorMessage={null}
        isLoading={false}
        now={sampleNow}
        onClearCategories={vi.fn()}
        onOpenQuestion={vi.fn()}
        onResetFilters={vi.fn()}
        onRetry={vi.fn()}
        onToggleCategory={vi.fn()}
        onToggleStatus={vi.fn()}
        questions={[]}
        selectedCategories={["Companies"]}
        selectedStatuses={["CANCELLED"]}
      />,
    );

    expect(html).toContain("No questions match these filters");
    expect(html).toContain("Reset filters");
  });

  it("renders an accessible error alert when fetching fails", () => {
    const html = renderToStaticMarkup(
      <ArenaView
        countsByStatus={sampleCounts}
        errorMessage="Server unavailable"
        isLoading={false}
        now={sampleNow}
        onClearCategories={vi.fn()}
        onOpenQuestion={vi.fn()}
        onResetFilters={vi.fn()}
        onRetry={vi.fn()}
        onToggleCategory={vi.fn()}
        onToggleStatus={vi.fn()}
        questions={[]}
        selectedCategories={[]}
        selectedStatuses={["OPEN"]}
      />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Unable to load questions");
    expect(html).toContain("Server unavailable");
  });
});
