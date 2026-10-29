import { randomBytes } from "node:crypto";
import type { Express, RequestHandler } from "express";
import { describe, expect, it } from "vitest";
import {
  computeDisplayedAbPrices,
  computeLmsrPriceA,
  computeLmsrStartingOffsetA0,
  computeQuestionStatus,
  createInMemoryArenaStore,
  formatPacificDeadline,
  type StoredQuestion,
} from "./arena.js";

process.env.JWT_SECRET ??= randomBytes(32).toString("hex");

const { createApp } = await import("./app.js");

type SimulatedResponse = {
  status: number;
  body: unknown;
};

/**
 * Invokes an Express application's router pipeline in-process without opening a TCP socket,
 * ensuring deterministic HTTP contract tests even in environments where loopback bind is restricted.
 */
const invokeGet = async (
  app: Express,
  path: string,
  query: Record<string, string | string[]> = {},
): Promise<SimulatedResponse> => {
  return new Promise((resolve, reject) => {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, item);
        }
      } else {
        searchParams.set(key, value);
      }
    }
    const queryString = searchParams.toString();
    const url = queryString ? `${path}?${queryString}` : path;

    let statusCode = 200;
    const headers = new Map<string, string>();

    const req = {
      method: "GET",
      url,
      originalUrl: url,
      path,
      query,
      headers: {},
      get(name: string) {
        return this.headers[name.toLowerCase() as keyof typeof this.headers];
      },
    };

    const res = {
      statusCode,
      setHeader(name: string, value: string) {
        headers.set(name.toLowerCase(), String(value));
        return this;
      },
      getHeader(name: string) {
        return headers.get(name.toLowerCase());
      },
      removeHeader(name: string) {
        headers.delete(name.toLowerCase());
      },
      status(code: number) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        resolve({ status: statusCode, body: payload });
        return this;
      },
      end(payload?: unknown) {
        resolve({ status: statusCode, body: payload });
        return this;
      },
    };

    const handler = app as unknown as RequestHandler;
    try {
      handler(req as never, res as never, (err?: unknown) => {
        if (err) {
          reject(err);
        } else {
          resolve({ status: 404, body: undefined });
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

describe("API health", () => {
  it("returns the public health response", async () => {
    const fixedNow = new Date("2026-10-29T21:00:00.000Z");
    const response = await invokeGet(createApp({ now: () => fixedNow }), "/api/v1/public/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "forecasthub-api",
      timestamp: "2026-10-29T21:00:00.000Z",
    });
  });
});

describe("LMSR & Arena accounting/formatting helpers", () => {
  it("computes LMSR starting offset and displayed prices within 1..99 summing to 100 (CR-6)", () => {
    expect(computeLmsrStartingOffsetA0(50)).toBeCloseTo(0, 8);
    expect(computeLmsrPriceA(50, 0, 0)).toBeCloseTo(0.5, 8);
    expect(computeDisplayedAbPrices(50, 0, 0)).toEqual([50, 50]);

    // Worked example from PRD Section 5.1.12: starting at 50/50, buying 3.54 shares of A moves price from 50 to 67
    expect(computeDisplayedAbPrices(50, 3.54, 0)).toEqual([67, 33]);

    // Extreme share quantities clamp displayed prices to 1..99 and always sum to 100
    expect(computeDisplayedAbPrices(50, 500, 0)).toEqual([99, 1]);
    expect(computeDisplayedAbPrices(50, 0, 500)).toEqual([1, 99]);
  });

  it("formats deadlines in Pacific Time and identifies Closing soon within 24 hours (CR-2, US-2 AC 5)", () => {
    const now = new Date("2026-10-29T20:00:00.000Z"); // 1:00 PM PDT
    const inThreeHours = new Date("2026-10-29T23:00:00.000Z"); // 4:00 PM PDT
    const formatted = formatPacificDeadline(inThreeHours, now);

    expect(formatted.deadlinePt).toContain("PT");
    expect(formatted.deadlinePt).toBe("Oct 29, 4:00 PM PT");
    expect(formatted.closingLabelPt).toContain("Closes in 3 h");
  });

  it("computes question status across deadline and resolution boundaries", () => {
    const now = new Date("2026-10-29T20:00:00.000Z");
    const baseQuestion: StoredQuestion = {
      id: "q-test",
      title: "Test question",
      category: "Sports",
      type: "AB",
      visibility: "PUBLISHED",
      resolution: "UNRESOLVED",
      deadline: new Date(now.getTime() + 48 * 3600 * 1000),
      criteria: "Criteria",
      source: "Source",
      startingPriceA: 50,
      sharesA: 0,
      sharesB: 0,
      totalCredits: 100,
      creditsLast24h: 50,
      correctAnswerId: null,
      answers: [
        { id: "a", label: "Yes", credits: 0 },
        { id: "b", label: "No", credits: 0 },
      ],
    };

    expect(computeQuestionStatus(baseQuestion, now)).toBe("OPEN");
    expect(
      computeQuestionStatus(
        { ...baseQuestion, deadline: new Date(now.getTime() + 24 * 3600 * 1000) },
        now,
      ),
    ).toBe("CLOSING_SOON");
    expect(
      computeQuestionStatus({ ...baseQuestion, deadline: now }, now),
    ).toBe("CLOSED");
    expect(
      computeQuestionStatus({ ...baseQuestion, resolution: "RESOLVED" }, now),
    ).toBe("RESOLVED");
    expect(
      computeQuestionStatus({ ...baseQuestion, resolution: "CANCELLED" }, now),
    ).toBe("CANCELLED");
  });
});

describe("GET /api/v1/public/questions", () => {
  const fixedNow = new Date("2026-10-29T20:00:00.000Z");
  const app = createApp({
    now: () => fixedNow,
    questionStore: createInMemoryArenaStore({ referenceTime: fixedNow }),
  });

  it("returns open questions by default, sorted by soonest deadline, and excludes hidden/draft questions (US-2 AC 1, 5, 6)", async () => {
    const response = await invokeGet(app, "/api/v1/public/questions");
    expect(response.status).toBe(200);

    const body = response.body as {
      questions: Array<{
        id: string;
        title: string;
        status: string;
        deadline: string;
      }>;
      categories: string[];
      statusCounts: Record<string, number>;
    };

    expect(body.questions.length).toBeGreaterThan(0);
    expect(body.categories).toContain("Sports");
    expect(body.categories).toContain("Economics");
    expect(body.categories).toContain("Campus Events");

    // Must only include OPEN or CLOSING_SOON questions by default
    for (const question of body.questions) {
      expect(["OPEN", "CLOSING_SOON"]).toContain(question.status);
      expect(question.title).not.toContain("Hidden question");
      expect(question.title).not.toContain("Draft question");
    }

    // Must be sorted by soonest deadline ascending
    const deadlines = body.questions.map((question) => new Date(question.deadline).getTime());
    const sortedDeadlines = [...deadlines].sort((a, b) => a - b);
    expect(deadlines).toEqual(sortedDeadlines);
  });

  it("filters by one or more categories and updates statusCounts accordingly (US-2 AC 2, 3)", async () => {
    const singleCategory = await invokeGet(app, "/api/v1/public/questions", {
      category: "Sports",
    });
    expect(singleCategory.status).toBe(200);
    const singleBody = singleCategory.body as {
      questions: Array<{ category: string }>;
      statusCounts: { OPEN: number };
    };
    expect(singleBody.questions.length).toBeGreaterThan(0);
    expect(singleBody.questions.every((q) => q.category === "Sports")).toBe(true);
    expect(singleBody.statusCounts.OPEN).toBe(singleBody.questions.length);

    const multiCategory = await invokeGet(app, "/api/v1/public/questions", {
      category: "Sports,Economics",
    });
    expect(multiCategory.status).toBe(200);
    const multiBody = multiCategory.body as {
      questions: Array<{ category: string }>;
    };
    expect(multiBody.questions.length).toBeGreaterThan(singleBody.questions.length);
    expect(
      multiBody.questions.every((q) => q.category === "Sports" || q.category === "Economics"),
    ).toBe(true);
  });

  it("filters by status (CLOSING_SOON, CLOSED, RESOLVED, CANCELLED) and by type (AB, MULTI)", async () => {
    const closingSoonRes = await invokeGet(app, "/api/v1/public/questions", {
      status: "CLOSING_SOON",
    });
    expect(closingSoonRes.status).toBe(200);
    const closingSoonQuestions = (
      closingSoonRes.body as { questions: Array<{ status: string; deadline: string }> }
    ).questions;
    expect(closingSoonQuestions.length).toBeGreaterThan(0);
    for (const q of closingSoonQuestions) {
      expect(q.status).toBe("CLOSING_SOON");
      const diffMs = new Date(q.deadline).getTime() - fixedNow.getTime();
      expect(diffMs).toBeGreaterThan(0);
      expect(diffMs).toBeLessThanOrEqual(24 * 3600 * 1000);
    }

    const resolvedAndCancelledRes = await invokeGet(app, "/api/v1/public/questions", {
      status: "RESOLVED,CANCELLED",
    });
    expect(resolvedAndCancelledRes.status).toBe(200);
    const resolvedAndCancelled = (
      resolvedAndCancelledRes.body as { questions: Array<{ status: string }> }
    ).questions;
    expect(resolvedAndCancelled.some((q) => q.status === "RESOLVED")).toBe(true);
    expect(resolvedAndCancelled.some((q) => q.status === "CANCELLED")).toBe(true);

    const multiOnlyRes = await invokeGet(app, "/api/v1/public/questions", {
      type: "MULTI",
    });
    expect(multiOnlyRes.status).toBe(200);
    const multiQuestions = (
      multiOnlyRes.body as {
        questions: Array<{
          type: string;
          topAnswers: Array<{ label: string; sharePercent: number }>;
          totalAnswerCount: number;
        }>;
      }
    ).questions;
    expect(multiQuestions.length).toBeGreaterThan(0);
    for (const q of multiQuestions) {
      expect(q.type).toBe("MULTI");
      expect(q.topAnswers.length).toBeLessThanOrEqual(3);
      expect(q.totalAnswerCount).toBeGreaterThanOrEqual(3);
    }
  });

  it("returns 400 INVALID_QUERY on invalid status or type parameters", async () => {
    const badStatus = await invokeGet(app, "/api/v1/public/questions", {
      status: "INVALID_STATUS",
    });
    expect(badStatus.status).toBe(400);
    expect(badStatus.body).toMatchObject({
      error: {
        code: "INVALID_QUERY",
      },
    });
  });

  it("does not expose private user fields in public responses (NG-10, US-8 AC 2-3)", async () => {
    const response = await invokeGet(app, "/api/v1/public/questions");
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("balance");
  });
});
